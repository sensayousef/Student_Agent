"""Tool tests. Expected values mirror tests/web/compass.test.mjs so the Python port
and the web portal stay in agreement."""
import shutil
import subprocess
from pathlib import Path

import pytest

from student_agent.tools import (
    find_campus_service,
    list_campus_events,
    plan_student_pass_renewal,
    plan_study_time,
    search_campus_faq,
)

REPO_ROOT = Path(__file__).parent.parent


def test_campus_data_matches_web_source():
    node = shutil.which("node")
    if node is None:
        pytest.skip("node is not installed")
    result = subprocess.run(
        [node, "scripts/export-campus-data.mjs", "--check"],
        check=False,  # the assertion below reports the exit code and stderr
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize(
    ("query", "office"),
    [
        ("wifi problem", "TechCentre"),
        ("Where is immigration?", "Immigration Services"),
        ("I need to pay my tuition", "Bursary"),
        ("library", "Campus Library"),
    ],
)
def test_find_campus_service_returns_matching_office(query, office):
    result = find_campus_service(query)
    assert result["status"] == "ok"
    assert office in [item["name"] for item in result["results"]]


def test_find_campus_service_reports_location_for_techcentre():
    result = find_campus_service("it help")
    assert "Opposite Block D" in result["results"][0]["location"]


def test_find_campus_service_not_found_lists_available_offices():
    result = find_campus_service("zebra grooming")
    assert result["status"] == "not_found"
    assert "Bursary" in result["available"]


def test_find_campus_service_rejects_empty_query():
    assert find_campus_service("   ")["status"] == "error"


@pytest.mark.parametrize(
    ("question", "title", "office"),
    [
        ("How do I renew my Student Pass?", "Plan your Student Pass renewal", None),
        ("Where can I get IT help?", "Get campus IT support", "tech"),
        ("Where do I renew my Student Pass?", "Find Immigration Services", "immigration"),
        ("How can I track my visa status?", "Check your official Student Pass progress", None),
    ],
)
def test_search_campus_faq_routes_to_the_right_guidance(question, title, office):
    result = search_campus_faq(question)
    assert result["status"] == "ok"
    assert result["title"] == title
    assert result["related_office"] == office
    assert result["sources"] and result["sources"][0]["url"].startswith("https://")


def test_search_campus_faq_hands_off_unknown_questions():
    result = search_campus_faq("What is the capital of Norway?")
    assert result["status"] == "not_found"
    assert result["handoff"]["label"] == "APU Virtual Help Centre"


def test_search_campus_faq_rejects_empty_question():
    assert search_campus_faq("")["status"] == "error"


def test_renewal_plan_uses_calendar_months_and_demo_date():
    result = plan_student_pass_renewal("2027-02-22", 12)
    assert (result["as_of"], result["suggested_start"]) == ("2026-11-22", "2026-11-22")
    assert (result["days_until_expiry"], result["fee_rm"], result["fee_tier"]) == (92, 1240, "12 weeks or more")
    assert len(result["checklist"]) == 6


def test_renewal_start_clamps_to_last_day_of_month():
    assert plan_student_pass_renewal("2028-05-31", 6, "2028-03-09")["suggested_start"] == "2028-02-29"


@pytest.mark.parametrize(
    ("today", "long_fee", "short_fee"),
    [
        ("2026-12-01", 1240, 1000),
        ("2026-12-02", 1320, 1080),
        ("2026-12-29", 1320, 1080),
        ("2026-12-30", 1410, 1170),
        ("2027-01-05", 1410, 1170),
        ("2027-01-06", 1580, 1340),
        ("2027-01-12", 1580, 1340),
        ("2027-01-13", None, None),
    ],
)
def test_renewal_fee_tier_boundaries(today, long_fee, short_fee):
    assert plan_student_pass_renewal("2027-02-23", 12, today)["fee_rm"] == long_fee
    assert plan_student_pass_renewal("2027-02-23", 6, today)["fee_rm"] == short_fee


@pytest.mark.parametrize(
    ("expiry", "months", "today"),
    [("2027-02-31", 12, ""), ("2027-02-22", 2, ""), ("2027-02-22", 13, ""), ("2027-02-22", 12, "soon")],
)
def test_renewal_plan_rejects_invalid_input(expiry, months, today):
    assert plan_student_pass_renewal(expiry, months, today)["status"] == "error"


def test_events_default_to_upcoming_at_demo_clock():
    titles = [event["title"] for event in list_campus_events()["events"]]
    assert "International Cultural Night" not in titles  # on now at the demo clock
    assert "Build Your First API" in titles


def test_events_now_and_phase_changes_with_clock():
    assert [e["title"] for e in list_campus_events("now")["events"]] == ["International Cultural Night"]
    ended = list_campus_events("all", "2026-11-22T12:00")["events"][0]
    assert ended["phase"] == "ended"


def test_events_report_simulated_and_validate_input():
    assert list_campus_events("all")["simulated"] is True
    assert list_campus_events("someday")["status"] == "error"
    assert list_campus_events("all", "22 Nov")["status"] == "error"
    assert list_campus_events("now", "2030-01-01T00:00")["status"] == "not_found"


def test_plan_study_time_splits_hours_evenly():
    result = plan_study_time(4, 2.5, ["SQL", "Security"])
    assert (result["total_hours"], result["hours_per_topic"]) == (10, 5)


def test_plan_study_time_rejects_bad_input():
    assert plan_study_time(0, 2, ["SQL"])["status"] == "error"
    assert plan_study_time(3, 2, [])["status"] == "error"
