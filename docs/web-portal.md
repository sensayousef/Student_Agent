# Campus Compass web portal

Dependency-free browser portal (merged from the teammates' standalone Campus Compass build): a dashboard for Student Pass renewal, coursework reminders and campus events. All student records, emails and event dates are **simulated**; links open real APU guidance. Lives in `src/web/`.

## Run it

```bash
# Local: any static server works. Progress is kept in the browser (localStorage).
python -m http.server 4173 --directory src/web     # open http://127.0.0.1:4173

# Offline single file (works from file://, e.g. on the presentation laptop):
npm run build:demo                                  # writes build/Campus-Compass-Demo.html (gitignored)
```

Without an API the portal runs entirely in the browser (`domain.js` holds the logic). If something serves `/api/state` and `/api/action`, it switches to that backend automatically.

## How it relates to the agent

| Piece | Location | Note |
|-------|----------|------|
| APU data (offices, FAQ topics, events, checklist, links) | `src/web/data.js` | **Source of truth.** Edit here. |
| Same data for the Python agent | `src/student_agent/data/campus.json` | Generated: `node scripts/export-campus-data.mjs`. CI and pytest fail if stale. |
| Agent tools using it | `src/student_agent/tools.py` | `find_campus_service`, `search_campus_faq`, `plan_student_pass_renewal`, `list_campus_events` |
| Portal logic | `src/web/domain.js` | Renewal fee tiers, FAQ ranking, reminders, calendar import. Python ports in `tools.py` are tested against the same expected values. |

Not carried over from the teammates' build: the Node `server.ts` (SQLite sessions + optional OpenAI rewrite). Our backend is Python/ADK with Gemini, so a second runtime was not added. Coursework state is per browser, so the agent has no coursework tool.

## Tests

`npm run test:web` (domain logic, DOM render smoke test, contrast check) and `pytest` for the agent tools.

## Three-minute showcase

1. **Today** → ask *How do I renew my Student Pass?* → open the renewal planner; point out the APU source links.
2. Show the suggested start and fee tier. Tick **Prepare the payment receipt**. Open **Sample inbox** → **View original sample**.
3. **Coursework** → **Secure Coding lab report** (7/3/1-day reminders). **Demo clock → Jump to next reminder**, click the bell. Mark complete, jump again: future reminders are skipped.
4. **Campus events** → filter **Upcoming** → **Build Your First API** → register in the demo, download the calendar entry.
5. Reset before presenting again: **Demo clock → Reset demo → Reset demo**.

Extras: *Where can I get IT help?* (directory handoff); *When is my next deadline?* (uses the demo student's coursework); **Coursework → Import calendar → Import sample file** twice to show deduplication.

## Pre-demo checks

Open the page on the presentation laptop, confirm it fits a 1280 × 720 projector and a 360 px phone, Tab/Enter/Escape navigation works, reload keeps progress, the calendar file downloads, and reset works. Rehearse with Wi-Fi off if presenting offline (APU links need internet).

A production pilot would need university-approved authentication, Microsoft 365 and Moodle access, verified indoor routes, and organizer-managed live events.
