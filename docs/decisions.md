# Decision Log

> Append-only. Each entry is an Architecture Decision Record (ADR).
> Never edit past entries — add new ones when decisions change.

## Format
```
### [YYYY-MM-DD] Decision title
**Context:** Why this choice was needed  
**Decision:** What was chosen  
**Alternatives:** What was ruled out and why  
**Consequences:** What this enables or constrains
```

---

### [Project Start] Feature-based folder structure
**Context:** Type-based folders (components/, hooks/, utils/) become unnavigable past ~20 files  
**Decision:** Organize by domain: `src/features/{domain}/`, shared code in `src/shared/`  
**Alternatives:** Type-based flat folders — ruled out because they scatter one feature across many folders  
**Consequences:** Each feature is self-contained; new developers find everything for a domain in one place

### [2026-11-11] Google ADK + Gemini instead of a hand-built agent or Agent Builder
**Context:** Two days to build a working agent; the hackathon is Gemini/Google Cloud themed
**Decision:** Python Google ADK with Gemini Flash; AI Studio key now, Vertex AI via one env flag if credits arrive
**Alternatives:** Hand-written tool loop (more code, no dev UI or evals); Vertex AI Agent Builder (console-built, harder to show in a repo, needs billing)
**Consequences:** Tools are plain Python functions; `adk web` gives a dev UI on day one

### [2026-11-11] Seed data in repo files, no database
**Context:** Campus info is small and read-only; a database adds setup and deploy risk
**Decision:** JSON/Markdown files under each feature's `data/`; in-memory ADK sessions
**Alternatives:** Firestore (persistence not needed for the demo); vector search (overkill for a few pages of FAQ)
**Consequences:** Restart loses chat history; data edits need a redeploy

### [2026-11-11] One Cloud Run service serves agent API and chat page
**Context:** Need a public demo link without a second frontend deploy
**Decision:** FastAPI from ADK `get_fast_api_app` plus a static HTML/JS chat page in `src/web/`
**Alternatives:** Using `adk web` as the demo UI (looks like a dev tool); React/Next frontend (build step, second deploy)
**Consequences:** Plain JS UI; single Dockerfile and one deploy command

### [2026-11-11] Simulated IoT occupancy feed for the study-space feature
**Context:** Theme is "Cloud, IoT and Network converge"; no real sensors available
**Decision:** `sensor_feed.py` produces believable room occupancy; the tool reads it as if it were a live feed
**Alternatives:** Skip IoT (weaker theme fit); real hardware (no time)
**Consequences:** Deck must say clearly that the feed is simulated and show the real integration path

### [2026-11-13] Merge the teammates' Campus Compass build: UI kept, Node server dropped, data shared
**Context:** Teammates without GitHub access built a standalone Node/TypeScript app (browser portal + SQLite API + optional OpenAI rewrite) with real APU offices, FAQ guidance, Student Pass fee logic and events
**Decision:** Portal UI moved to `src/web/` (the planned chat-page location); `src/web/data.js` stays the single source of truth and is exported to `src/student_agent/data/campus.json` for the Python tools (`find_campus_service`, `search_campus_faq`, `plan_student_pass_renewal`, `list_campus_events`); their domain tests kept in `tests/web/`, with Python tests mirroring the same expected values
**Alternatives:** Keep `server.ts` (second runtime to deploy, SQLite on Cloud Run is ephemeral, OpenAI key where we use Gemini); rewrite the UI in Python (large, no gain); hand-copy the data into Python (two copies drift)
**Consequences:** One Python backend; portal runs from any static server or as one offline HTML file and falls back to browser storage; edits to campus data happen in `data.js` then `node scripts/export-campus-data.mjs` (CI fails if forgotten); coursework state is per-browser so the agent has no coursework tool; the portal's own chat still uses its rule-based answers, not Gemini
