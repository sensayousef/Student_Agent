# Student Agent

An AI assistant for Asia Pacific University (APU) students, built for the APU Cloud Innovation Hackathon 2026.

- **Agent:** Python + Google ADK + Gemini. Tools find campus services, answer campus FAQs from approved APU guidance, plan a Student Pass renewal (start date, published fee tier, document checklist), list campus events and split study time.
- **Campus Compass portal:** a dependency-free browser dashboard (`src/web/`) for Student Pass renewal, coursework reminders and campus events. Built by teammates and merged in. It runs offline.

All student records, emails and event dates in the demo are simulated. Links open real APU guidance.

## Run

```bash
# Agent dev UI (needs GOOGLE_API_KEY in src/student_agent/.env, see .env.example)
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt   # Windows; use .venv/bin on macOS/Linux
cd src && adk web

# Portal
python -m http.server 4173 --directory src/web        # http://127.0.0.1:4173
npm run build:demo                                     # one offline file: build/Campus-Compass-Demo.html
```

## Test

```bash
pip install -r requirements-dev.txt && pytest          # agent tools
npm run test:web                                       # portal logic (Node 22+)
```

## Where things are

| Need | Look at |
|------|---------|
| Portal usage, data flow, 3-minute demo script | `docs/web-portal.md` |
| Stack, decisions, roadmap | `docs/architecture.md`, `docs/decisions.md`, `docs/roadmap.md` |
| Full file map | `INDEX.md` |

Campus data lives in `src/web/data.js`. After editing it, run `node scripts/export-campus-data.mjs` to refresh the copy the agent reads (CI fails if you forget).
