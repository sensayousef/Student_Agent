# Sprint 01 — Init

**Goal:** Initialize project and scaffold core structure  
**Start:** 2026-11-10  
**End:** 2026-11-13 (hackathon prototype deadline, 12:00 PM MYT)

---

## In Progress
- [ ] Unblock Gemini: raise AI Studio spend cap, new-project key, or Vertex AI with credits (milestone M0)
- [ ] Team confirms track and feature set in `docs/roadmap.md`

## Todo
- [ ]

## Done
- [x] Initialize project from starter template

---

## Session Log

> Append one dated entry per implementation session (hook-enforced — see CLAUDE.md).
> Newest entries at the bottom. Format:
>
> ```markdown
> ### YYYY-MM-DD — <one-line summary>
> - What changed: <files/components modified>
> - Why: <reason or test failure that prompted the work>
> - Status: <what's now working / what's still open>
> ```

<!-- Add session entries below -->

### 2026-11-10 — Adopt the project starter template
- What changed: copied every tracked file from the Project Starter Template (CLAUDE.md, AGENTS.md, INDEX.md, .context/, tasks/, docs/, scripts/sprint-log/, .claude/settings.json, .github/workflows/ci.yml, .env.example, .gitignore); filled in .context/current.md and this sprint's dates; added Gemini variables to .env.example
- Why: Student_Agent was an empty repo; the template brings the sprint-log hooks, file index and Read Aloud rule
- Status: scaffold in place, nothing committed yet; app source (src/) and the final stack are still open

### 2026-11-10 — Scaffold the ADK student agent
- What changed: added src/student_agent/ (agent.py, tools.py, __init__.py, gitignored .env), requirements.txt, and a local .venv with google-adk 2.14.0
- Why: start building the hackathon agent on Google ADK + Gemini
- Status: imports and both placeholder tools work; GOOGLE_API_KEY still to be pasted into src/student_agent/.env; tool data is placeholder; Vertex AI path depends on whether the organisers issued credits

### 2026-11-11 — Architecture and roadmap
- What changed: docs/architecture.md (stack, diagram, folders, patterns), new docs/roadmap.md, docs/decisions.md ADRs, new sprint-02 and sprint-03 files, tasks/active.md, .context/current.md, INDEX.md, docs/INDEX.md
- Why: plan the build from now to the Fri 13 Nov noon deadline
- Status: plan written; feature set is a proposal awaiting team confirmation; Gemini still blocked by the AI Studio spend cap

### 2026-11-13 — Merge the teammates' Campus Compass build
- What changed: copied their browser portal to src/web/ (app, data, domain, icons, styles, index, sample ics); real APU offices/FAQ/events now feed Python tools (find_campus_service rewritten on real data, plus search_campus_faq, plan_student_pass_renewal, list_campus_events) via generated src/student_agent/data/campus.json and campus_data.py; agent.py instruction and tool list updated; their domain tests moved to tests/web/ (server/API test dropped), new tests/test_tools.py (33 pytest cases incl. a data-sync check); scripts/export-campus-data.mjs and scripts/build-demo.mjs; package.json, pytest.ini, requirements-dev.txt; CI now runs pytest and node tests; docs (web-portal.md, ADR, architecture addendum, indexes, current.md)
- Why: the teammates had no GitHub access and built in parallel; merge without a second backend runtime, duplicated data or conflicting files
- Status: 33 pytest and 7 node tests pass; the rebuilt offline HTML is identical to theirs; the agent imports and all tool schemas build. Verified by running pytest, npm run test:web, the campus.json sync check and a static-server fetch of the portal files. NOT verified: a live Gemini reply (still blocked by the spend cap) and a real browser pass of the portal. Dropped on purpose: server.ts (SQLite sessions, OpenAI rewrite) and the committed offline HTML (rebuild with npm run build:demo). The portal's own chat is still rule-based, not wired to the agent.

### 2026-11-13 — Publish to GitHub
- What changed: first commit of the merged project; merged origin/main (Mohammed's "Prepare Campus Compass hackathon demo", identical to the zip) with --allow-unrelated-histories so his commit stays in history; resolved .gitignore and package.json (kept ours), removed his root-level copies (dist/, server.ts, build-demo.mjs, compass.test.mjs, Campus-Compass-Demo.html) now living in src/web/, scripts/, tests/web/; replaced README.md; .gitignore gains .adk/ and .coverage; tests/test_tools.py passes check=False to subprocess.run (ruff)
- Why: user asked to push everything to GitHub; remote main already had one commit
- Status: ruff clean, 33 pytest (100% coverage of src/student_agent) and 7 node tests pass; no secrets, .env or ADK session DB committed. Pushed without force.

---

> When done: move this file to `tasks/archive/sprint-01-init.md`, remove from `tasks/active.md`.
