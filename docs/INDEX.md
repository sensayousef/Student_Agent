# Docs Index

> Docs-only sub-index. The master file map for the whole repo is the root `INDEX.md`;
> this file routes within `docs/` only.
> Claude reads this to route to the right file without scanning all docs.
> Update this table whenever a doc is added, removed, or changes scope.

| Topic | File | What's inside |
|-------|------|---------------|
| Tech stack, folder structure, patterns | `architecture.md` | Framework choices, src/ layout, key patterns |
| Roadmap, timeline, features, risks | `roadmap.md` | Hackathon plan to the 13 Nov deadline: features F1–F5, milestones, team split |
| Web portal (Campus Compass) | `web-portal.md` | Run instructions, source-of-truth data flow to the agent, showcase script, pre-demo checks |
| Decision log (ADR) | `decisions.md` | Append-only record of architectural decisions and their rationale |

---

> To add a new doc:
> 1. Create the file in `docs/`
> 2. Add a row to this table with topic, filename, and one-line description
> 3. This keeps Claude from having to guess which file covers what
