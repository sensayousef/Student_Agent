# Current State

> Keep this under 40 lines. Claude reads this first — be precise, not comprehensive.
> Update whenever: sprint changes, major decision is made, stack is finalized.

## Project
**Name:** Student Agent
**Description:** AI agent that helps APU students with campus life (APU Cloud Innovation Hackathon 2026). Prototype due Fri 13 Nov 2026, 12:00 PM MYT.
**Stage:** [x] Scaffolding  [ ] MVP  [ ] Feature-complete  [ ] Production

## Active Sprint
**Sprint:** Sprint 1 (`tasks/sprints/sprint-01-init.md`)
**Goal:** Unblock Gemini, then Sprint 2 (core agent) — plan in `docs/roadmap.md`
**Blocking:** AI Studio spend cap (429 RESOURCE_EXHAUSTED); team to confirm feature set

## Tech Stack
Python + Google ADK + Gemini Flash (AI Studio key, Vertex AI if credits) + static portal in `src/web/` (merged from teammates' Campus Compass), deployed on Cloud Run

## Last Decision
Merged teammates' Campus Compass: portal UI kept, Node server dropped, `data.js` is the data source of truth (2026-11-13)

## Status Flags
- [x] Tests configured (pytest + node:test)
- [x] CI/CD active (tests only; no deploy yet)
- [ ] Auth implemented
- [ ] First deploy done
- [ ] Database migrations tracked
