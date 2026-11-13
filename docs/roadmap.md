# Roadmap — APU Cloud Innovation Hackathon 2026

> Deadline: **Fri 13 Nov 2026, 12:00 PM MYT** (submit by 11:00 AM; the portal locks on final submit).
> Track: **Smart Campus & Student Experience** (confirm with team).
> Submission needs: project title, track, summary (≥ 50 chars), HTTPS repo link, PDF pitch deck ≤ 10 MB, demo link (optional — we will have one).
> Architecture: `docs/architecture.md`. Task-level checklists live in the sprint files.

## Product in one line
A Gemini-powered campus assistant that answers APU students' questions from real university info and *does* things for them: finds the service they need, finds a free study space right now, and turns a deadline into a study plan.

## Feature set (proposed — confirm before Sprint 2)

| # | Feature | Tool(s) | Data | Priority |
|---|---------|---------|------|----------|
| F1 | Campus services finder | `find_campus_service` | `services.json` (real APU locations, hours, contacts) | Must |
| F2 | Campus FAQ / policy Q&A | `search_campus_faq` | `faq.md` (attendance, exams, fees, IT, visas) | Must |
| F3 | Free study-space finder (IoT angle) | `find_free_study_space` | simulated sensor feed: room → occupancy, updated each call | Must |
| F4 | Study planner | `plan_study_time` (exists) | none | Must |
| F5 | Draft a request to a department | `draft_department_request` | department contact list | Stretch |

F3 is the pitch's link to the theme "Cloud, IoT and Network converge": the agent reads live occupancy from campus sensors (simulated for the prototype, with the real integration path shown in the deck).

## Timeline

| When (MYT) | Sprint | Outcome |
|------------|--------|---------|
| Wed 11 Nov, morning | Sprint 1 — Init (finish) | Gemini calls work (spend cap fixed or Vertex credits); plan agreed |
| Wed 11 Nov, afternoon → night | Sprint 2 — Core agent | Feature folders, F1–F4 working in `adk web` with real data, pytest green |
| Thu 12 Nov, day | Sprint 3 — Ship | Chat page, Cloud Run deploy with public URL, ADK evals, README |
| Thu 12 Nov, night | Sprint 3 — Ship | Pitch deck draft, demo script, F5 if time |
| Fri 13 Nov, 08:00–11:00 | Sprint 3 — Ship | Code freeze 09:00, record demo video, export deck PDF, submit by 11:00 |

## Milestones (go / no-go checks)

1. **M0 — Model unblocked** (Wed noon): a real Gemini reply in `adk web`. *If missed: the whole plan slips — this is the only hard blocker.*
2. **M1 — Agent feature-complete** (Wed night): F1–F4 answer correctly for 3 test questions each.
3. **M2 — Live URL** (Thu afternoon): Cloud Run link works from a phone.
4. **M3 — Submission ready** (Fri 10:00): deck PDF, repo public, demo link, summary text.

## Suggested team split (2–5 people)

| Role | Owns |
|------|------|
| Data | Collect real APU info for `services.json`, `faq.md`, study-space list. Biggest quality lever — start immediately. |
| Agent | Feature tools, agent instruction, pytest, ADK evals |
| Web + Cloud | Chat page, `main.py`, Dockerfile, Cloud Run deploy |
| Pitch | Deck, demo script, video, submission form |

With fewer people, merge Data+Pitch and Agent+Web.

## Risks

| Risk | Mitigation |
|------|-----------|
| Gemini spend cap / quota (already hit once) | Fix cap or new project key today; Vertex AI with credits as fallback; keep demo questions short |
| Weak or made-up answers | Ground answers in our data files; instruction forbids guessing; evals check it |
| Cloud Run deploy problems on the last day | Deploy a hello-world version Thursday morning, then redeploy |
| Python 3.14 package gaps in the Docker image | Pin `python:3.13-slim` in the Dockerfile |
| Scope creep | F5 and everything else is stretch; freeze at 09:00 Friday |

## Out of scope for the prototype
Student login, real timetable/LMS integration, real sensors, persistent database, mobile app. These go in the deck as "next steps".
