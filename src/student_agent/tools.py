"""Agent tools backed by the APU records in campus_data (shared with the web portal)."""
import calendar
from datetime import date, datetime

from .campus_data import contains_phrase, load_campus_data, normalize

_DIRECTORY_PREFIX = "directory/"
_FEE_TIERS = ("12 weeks or more", "8 to under 12 weeks", "7 to under 8 weeks", "6 to under 7 weeks")
_FEE_TIER_MIN_DAYS = (84, 56, 49, 42)
_FEES_LONG_PASS = (1240, 1320, 1410, 1580)  # renewal of 7+ months
_FEES_SHORT_PASS = (1000, 1080, 1170, 1340)
_MIN_RENEWAL_MONTHS, _MAX_RENEWAL_MONTHS = 3, 12
_EVENT_FILTERS = ("upcoming", "now", "all")


def _office_terms(office: dict, topics: list[dict]) -> set[str]:
    """Phrases that point at an office: its name and id, plus FAQ keywords routed to it."""
    terms = {normalize(office["name"]), normalize(office["id"])}
    target = _DIRECTORY_PREFIX + office["id"]
    for topic in topics:
        if topic["action"][1] == target:
            terms.update(normalize(keyword) for keyword in topic["keywords"])
    return terms


def _office_result(office: dict) -> dict:
    keys = ("name", "category", "location", "hours", "contact", "description", "directions", "source")
    return {key: office[key] for key in keys if key in office}


def find_campus_service(query: str) -> dict:
    """Find an APU campus office or service (immigration, IT help, bursary, library...) by keyword.

    Args:
        query: What the student is looking for, e.g. "wifi problem" or "where is immigration".
    """
    text = normalize(query)
    if not text:
        return {"status": "error", "message": "Query must not be empty."}
    data = load_campus_data()
    matches = [
        _office_result(office)
        for office in data["offices"]
        if any(contains_phrase(text, term) for term in _office_terms(office, data["topics"]))
    ]
    if not matches:
        return {"status": "not_found", "available": [office["name"] for office in data["offices"]]}
    return {"status": "ok", "results": matches}


def _rank_topics(text: str, topics: list[dict]) -> list[dict]:
    """Best-matching FAQ topics first. Longer keyword phrases outrank several short ones."""
    ranked = []
    for index, topic in enumerate(topics):
        matched = [kw for kw in topic["keywords"] if contains_phrase(text, kw)]
        if not matched:
            continue
        longest = max(len(normalize(kw).split()) for kw in matched)
        penalty = 10 if topic["id"] == "directions" else 0  # generic catch-all topic
        score = longest * 12 + min(4, len(matched)) - penalty
        if score > 0:
            ranked.append((score, index, topic))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [topic for _, _, topic in ranked]


def search_campus_faq(question: str) -> dict:
    """Answer a campus question (Student Pass renewal, Wi-Fi, fees, coursework, events...) from approved APU guidance.

    Args:
        question: The student's question in plain language.
    """
    text = normalize(question)
    if not text:
        return {"status": "error", "message": "Question must not be empty."}
    data = load_campus_data()
    ranked = _rank_topics(text, data["topics"])
    if not ranked:
        return {
            "status": "not_found",
            "handoff": {"label": "APU Virtual Help Centre", "url": data["links"]["help"]},
        }
    topic = ranked[0]
    route = topic["action"][1]
    return {
        "status": "ok",
        "title": topic["title"],
        "answer": topic["answer"],
        "sources": [{"label": label, "url": url} for label, url in topic["sources"]],
        "related_office": route.removeprefix(_DIRECTORY_PREFIX) if route.startswith(_DIRECTORY_PREFIX) else None,
    }


def _parse_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _renewal_start(expiry: date) -> date:
    """Three calendar months before expiry, clamped to the month's last day."""
    month_index = expiry.year * 12 + expiry.month - 1 - 3
    year, month = divmod(month_index, 12)
    month += 1
    return date(year, month, min(expiry.day, calendar.monthrange(year, month)[1]))


def _fee_tier(days_left: int) -> int | None:
    return next((i for i, minimum in enumerate(_FEE_TIER_MIN_DAYS) if days_left >= minimum), None)


def plan_student_pass_renewal(expiry_date: str, renewal_months: int, today: str = "") -> dict:
    """Plan an APU Student Pass renewal: when to start, the published fee tier and the document checklist.

    Args:
        expiry_date: Current pass expiry as YYYY-MM-DD.
        renewal_months: Length of the renewal in months (3 to 12).
        today: Optional YYYY-MM-DD to plan from. Defaults to the demo date used by the portal.
    """
    data = load_campus_data()
    expiry = _parse_date(expiry_date)
    start_from = _parse_date(today) if today else _parse_date(data["campus"]["clock"][:10])
    if expiry is None or start_from is None:
        return {"status": "error", "message": "Dates must be valid and written as YYYY-MM-DD."}
    if not _MIN_RENEWAL_MONTHS <= renewal_months <= _MAX_RENEWAL_MONTHS:
        return {"status": "error", "message": "renewal_months must be from 3 to 12."}
    days_left = (expiry - start_from).days
    tier = _fee_tier(days_left)
    fees = _FEES_LONG_PASS if renewal_months >= 7 else _FEES_SHORT_PASS
    return {
        "status": "ok",
        "as_of": start_from.isoformat(),
        "suggested_start": _renewal_start(expiry).isoformat(),
        "days_until_expiry": days_left,
        "fee_rm": None if tier is None else fees[tier],
        "fee_tier": None if tier is None else _FEE_TIERS[tier],
        "checklist": [{"step": title, "detail": detail} for _, title, detail in data["checklist"]],
        "source_url": data["links"]["renewal"],
        "note": "Confirm the fee with Immigration Services before paying. "
        "No fee is listed when fewer than 6 weeks remain: contact Immigration Services.",
    }


def _event_phase(event: dict, clock: str) -> str:
    if clock < event["start"]:
        return "upcoming"
    return "now" if clock < event["end"] else "ended"


def list_campus_events(when: str = "upcoming", as_of: str = "") -> dict:
    """List sample APU campus events (all event data is simulated for the demo).

    Args:
        when: "upcoming", "now" or "all".
        as_of: Optional YYYY-MM-DDTHH:MM Malaysia time. Defaults to the demo clock used by the portal.
    """
    if when not in _EVENT_FILTERS:
        return {"status": "error", "message": 'when must be "upcoming", "now" or "all".'}
    data = load_campus_data()
    clock = as_of or data["campus"]["clock"]
    try:
        datetime.strptime(clock, "%Y-%m-%dT%H:%M")
    except ValueError:
        return {"status": "error", "message": "as_of must be written as YYYY-MM-DDTHH:MM."}
    keys = ("title", "category", "start", "end", "venue", "organizer", "description")
    events = [
        {**{key: event[key] for key in keys}, "phase": _event_phase(event, clock)}
        for event in data["events"]
    ]
    shown = [event for event in events if when == "all" or event["phase"] == when]
    return {"status": "ok" if shown else "not_found", "as_of": clock, "simulated": True, "events": shown}


def plan_study_time(days_left: int, hours_per_day: float, topics: list[str]) -> dict:
    """Split available study time evenly across topics before a deadline or exam.

    Args:
        days_left: Number of days until the exam or deadline.
        hours_per_day: Hours the student can study each day.
        topics: Topics or chapters to cover.
    """
    if days_left < 1 or hours_per_day <= 0 or not topics:
        return {"status": "error", "message": "Need days_left >= 1, hours_per_day > 0 and at least one topic."}
    total = days_left * hours_per_day
    each = round(total / len(topics), 1)
    return {"status": "ok", "total_hours": total, "hours_per_topic": each, "topics": topics}
