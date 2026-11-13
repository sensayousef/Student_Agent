# Architecture

> Immutable reference. Describes what was chosen and why.
> Update only when the stack fundamentally changes — add, don't rewrite.
> Roadmap and day-by-day plan: `docs/roadmap.md`. Reasons for each choice: `docs/decisions.md`.

## Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Agent framework | Google ADK 2.14 (Python 3.14) | Agent loop, tool calling, sessions, dev UI and evals built in |
| Model | Gemini Flash (`GEMINI_MODEL`, default `gemini-2.5-flash`) | Fast and cheap; tool calling works well |
| Model access | AI Studio key now; Vertex AI if hackathon credits arrive | One env flag switches them (`GOOGLE_GENAI_USE_VERTEXAI`) |
| Backend | ADK FastAPI app (`get_fast_api_app`) + our own routes | One Python service serves the agent API and the chat page |
| Frontend | One static chat page (HTML/CSS/JS) served by the backend | No build step, no second deploy |
| Data | JSON / Markdown seed files in the repo | Two days to deadline; no database to set up or migrate |
| Sessions | ADK in-memory session service | Fine for a demo; lost on restart (accepted) |
| Testing | pytest for tools; ADK evals for agent behaviour | Tools are plain functions; evals prove the agent picks the right tool |
| CI/CD | GitHub Actions: pytest on push | Already scaffolded in `.github/workflows/ci.yml` |
| Deploy | Google Cloud Run (`asia-southeast1`) | Public HTTPS demo link; fits the "Cloud" theme; free tier |

## System diagram

```
Student (browser)
   │  HTTPS
   ▼
Cloud Run service ── src/main.py (FastAPI)
   ├── GET  /            → static chat page (src/web/)
   ├── POST /run_sse     → ADK runner  ──►  root_agent (Gemini)
   │                                         │ calls tools
   │                                         ▼
   │                      features/*/tools.py  ──► data/*.json, data/*.md
   │                      features/study_spaces ──► simulated IoT occupancy feed
   └── Gemini API (AI Studio key)  or  Vertex AI (Cloud project + credits)
```

## Folder Structure

```
src/
├── main.py                       # FastAPI entry: ADK app + static chat page (Cloud Run runs this)
├── student_agent/                # ADK agent package (adk web discovers this folder)
│   ├── __init__.py
│   ├── agent.py                  # root_agent: instruction + list of tools from features/
│   ├── config.py                 # env vars and constants (model name, data paths)
│   ├── .env                      # local secrets — gitignored
│   ├── features/
│   │   ├── campus_services/      # tools.py + data/services.json
│   │   ├── campus_faq/           # tools.py + data/faq.md  (policies, exams, fees)
│   │   ├── study_spaces/         # tools.py + sensor_feed.py (simulated IoT occupancy)
│   │   ├── study_planner/        # tools.py (deadline → study schedule)
│   │   └── requests/             # stretch: draft a ticket/email to a department
│   └── shared/                   # tool result envelope, input validation helpers
└── web/                          # index.html, app.js, styles.css
tests/                            # pytest per feature + ADK eval sets
Dockerfile                        # Cloud Run image
requirements.txt
```

## Key Patterns

- **One tool = one plain Python function** with a docstring; Gemini reads the docstring to decide when to call it.
- **Tool result envelope:** every tool returns `{"status": "ok" | "not_found" | "error", ...}`; the agent instruction says to admit `not_found` instead of guessing.
- **Data is read-only:** seed files load once at import into immutable tuples/dicts; tools never mutate them.
- **Validation:** tools check their own arguments (Gemini output is external input) and return `status: error` with a message.
- **Grounding:** FAQ answers must come from `campus_faq` tool output, not model memory — stated in the agent instruction.
- **Config:** model name, data paths and ports come from `config.py` / env vars, never inline.

## External Services

| Service | Purpose | Docs URL |
|---------|---------|----------|
| Gemini API (AI Studio) | LLM for the agent | https://ai.google.dev/gemini-api/docs |
| Vertex AI (optional) | Same model billed to hackathon credits | https://cloud.google.com/vertex-ai/generative-ai/docs |
| Google ADK | Agent framework | https://google.github.io/adk-docs/ |
| Cloud Run | Hosting / demo link | https://cloud.google.com/run/docs |

## Addendum (2026-11-13): merged Campus Compass portal

- `src/web/` holds the teammates' dependency-free portal (see `docs/web-portal.md`) and is the static chat/dashboard page in the diagram above.
- Campus records have one source, `src/web/data.js`; `src/student_agent/data/campus.json` is generated from it and read by `student_agent/campus_data.py`. Tools remain flat in `tools.py` until Sprint 2 restructures into `features/`.
- Node is used only for web tests, the offline-HTML build and the data export; it is not part of the Cloud Run runtime.
