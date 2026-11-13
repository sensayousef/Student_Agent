# Sprint 02 — Core agent

**Goal:** F1–F4 working in `adk web` with real APU data and passing tests (milestone M1)
**Start:** 2026-11-11
**End:** 2026-11-11 (night)
**Plan:** `docs/roadmap.md`, `docs/architecture.md`

---

## In Progress
- [ ]

## Todo
- [ ] Restructure into `src/student_agent/features/{domain}/` + `config.py` + `shared/` (move `find_campus_service`, `plan_study_time`)
- [ ] `shared/`: tool result envelope + input validation helpers
- [ ] Data team: real APU `services.json` (name, location, hours, contact, keywords)
- [ ] Data team: `faq.md` — attendance, exams, resits, fees, IT/Wi-Fi, visa/international office
- [ ] Data team: study-space list (room id, building, capacity)
- [ ] F1 `find_campus_service` reads `services.json`, keyword + synonym matching
- [ ] F2 `search_campus_faq` returns the best-matching FAQ sections
- [ ] F3 `sensor_feed.py` (simulated occupancy) + `find_free_study_space`
- [ ] F4 `plan_study_time` — move into feature folder, add date-based input
- [ ] Agent instruction: grounding rules, tool routing, APU tone, admit `not_found`
- [ ] pytest per feature (tests/), GitHub Actions runs pytest
- [ ] Manual check in `adk web`: 3 questions per feature

## Done

---

## Session Log

> Append one dated entry per implementation session (hook-enforced — see CLAUDE.md).

<!-- Add session entries below -->

---

> When done: move this file to `tasks/archive/`, remove from `tasks/active.md`.
