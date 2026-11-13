# Project Index

> **Canonical map of every important file in the repo.**
> Auto-loaded reference for the assistant — look here first instead of guessing or searching.
> **Update rule:** any time a file is added, moved, renamed, or changes scope, update this index in the same task.

---

## Quick "Where do I look for…" lookup

| If you need… | Go to |
|---|---|
| Project rules / workflow | `CLAUDE.md` (root) |
| Cross-tool assistant rules / Read Aloud | `AGENTS.md` (root) |
| Current project state (stage, sprint, stack) | `.context/current.md` |
| Active sprint + goal | `tasks/active.md` → `tasks/sprints/sprint-NN-*.md` |
| AI self-correction lessons | `tasks/lessons.md` → `## Active` |
| Tech stack / folder structure / patterns | `docs/architecture.md` |
| Roadmap / timeline / feature list | `docs/roadmap.md` |
| Architectural decision history (ADR) | `docs/decisions.md` |
| Docs-only routing | `docs/INDEX.md` |
| Sprint-log hook scripts | `scripts/sprint-log/` |
| Env variable template | `.env.example` |
| Agent definition / tools | `src/student_agent/agent.py`, `src/student_agent/tools.py` |
| APU campus data (offices, FAQ, events) | `src/web/data.js` (source) -> `src/student_agent/data/campus.json` (generated) |
| Web portal (Campus Compass UI) | `src/web/` - see `docs/web-portal.md` |
| Tests | `tests/test_tools.py` (pytest), `tests/web/compass.test.mjs` (node:test) |
| Python deps | `requirements.txt` (runtime), `requirements-dev.txt` (+ pytest) |
| CI pipeline | `.github/workflows/ci.yml` |

---

## Root

| File | What's inside |
|---|---|
| `CLAUDE.md` | Auto-loaded session rules: session-start sequence, lookup rule, workflow, sprint-log rule, folder ownership, code rules, testing protocol, Read Aloud. |
| `AGENTS.md` | Cross-tool instructions for any AI coding assistant (Codex, Cursor, Aider, etc.). Defers to `CLAUDE.md`; carries the Read Aloud rule. |
| `INDEX.md` | This file. Master TOC. |
| `README.md` | GitHub landing page: what the project is, how to run and test it, pointers into `docs/`. Replaced the teammates' Node-server README. |
| `.env.example` | Documented template for every env var the app needs. No real values ever — copy to `.env` (gitignored). |
| `package.json` | Node scripts for the web portal only: `npm run test:web`, `npm run build:demo`. No dependencies. |
| `requirements.txt` | Python runtime deps (Google ADK). |
| `requirements-dev.txt` | Runtime deps plus pytest (CI installs this). |
| `pytest.ini` | Puts `src/` on the import path; tests live in `tests/`. |
| `.gitignore` | Version-control exclusions (multi-stack: Node, Python, Java/Kotlin, Dart, Rust) + `.claude/sprint-sessions/`. |

---

## `src/` — application source

| File | What's inside |
|---|---|
| `student_agent/agent.py` | ADK `root_agent`: instruction + the five tools. |
| `student_agent/tools.py` | `find_campus_service`, `search_campus_faq`, `plan_student_pass_renewal`, `list_campus_events`, `plan_study_time`. |
| `student_agent/campus_data.py` | Loads/normalizes the read-only campus records from `data/campus.json`. |
| `student_agent/data/campus.json` | **Generated** from `src/web/data.js` by `scripts/export-campus-data.mjs`; never hand-edit. |
| `web/index.html`, `app.js`, `styles.css` | Campus Compass portal UI (dependency-free, runs offline in the browser). |
| `web/data.js`, `domain.js`, `icons.js` | Portal data (source of truth for campus records), logic (renewal, reminders, calendar import, FAQ ranking) and icons. |
| `web/sample-moodle.ics` | Sample coursework calendar for the import demo. |

---

## `tests/`

| File | What's inside |
|---|---|
| `test_tools.py` | pytest for the agent tools, plus a check that `campus.json` matches `data.js`. |
| `web/compass.test.mjs` | node:test for portal logic, DOM render smoke test and contrast check. |

---

## `.context/` — project state

| File | What's inside |
|---|---|
| `current.md` | ≤ 40 lines. Project name, stage, active sprint, tech stack, last decision, status flags. **Read first after this index.** |

---

## `tasks/` — sprint + lessons tracking

| File | What's inside |
|---|---|
| `active.md` | Routing table — which sprint files are running. **Read after `current.md`.** |
| `lessons.md` | AI self-improvement lessons. `## Active` (enforce now) + `## Internalized` (graduated). |
| `sprints/sprint-01-init.md` | Scaffold + unblock Gemini. Sprint files carry a `## Session Log` (hook-enforced — see `CLAUDE.md`). |
| `sprints/sprint-02-core-agent.md` | Feature tools F1–F4 with real data and tests. |
| `sprints/sprint-03-ship.md` | Cloud Run deploy, chat page, deck, submission. |
| `archive/` | Closed sprints (audit trail). Empty until the first sprint closes. |

---

## `docs/` — documentation

| File | What's inside |
|---|---|
| `INDEX.md` | Docs-only sub-index. Routes within `docs/`; the master map is this root `INDEX.md`. |
| `architecture.md` | Stack table, system diagram, folder structure, key patterns, external services. |
| `roadmap.md` | Hackathon roadmap: features, timeline, milestones, team split, risks. |
| `web-portal.md` | Campus Compass portal: how to run it, data flow to the agent, 3-minute showcase script, pre-demo checks. |
| `decisions.md` | Append-only Architecture Decision Record (ADR) log. |

---

## `scripts/` — build & automation

| File | What's inside |
|---|---|
| `sprint-log/record-edit.mjs` | PostToolUse hook — records which file kinds were edited this session (observe only, never blocks). |
| `sprint-log/check-sprint-log.mjs` | Stop hook — blocks session end if source code was edited but no sprint file was updated. |
| `export-campus-data.mjs` | Exports `src/web/data.js` to `src/student_agent/data/campus.json`. `--check` fails if stale (CI). |
| `build-demo.mjs` | Bundles `src/web/` into one offline HTML file at `build/Campus-Compass-Demo.html` (gitignored). |

---

## `.claude/` — Claude Code config

| File | What's inside |
|---|---|
| `settings.json` | Permission allowlist + the PostToolUse/Stop hooks that enforce the sprint-log rule. |

---

## `.github/` — CI

| File | What's inside |
|---|---|
| `workflows/ci.yml` | Runs `pytest` and `npm run test:web` on push/PR. Add the Cloud Run deploy job in Sprint 3. |

---

## Maintenance rule

When a file is **created**, **moved**, **renamed**, or **changes scope** — update this index in the same task. If you can't find what you need above, the index is stale: search, then update the index before finishing the task.
