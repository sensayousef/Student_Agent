# Campus Compass

Campus Compass is an APU hackathon demo for a campus assistant, Student Pass renewal, campus events and coursework reminders. All student records, messages, registrations and event dates are simulated. Links in the portal open university guidance and services.

## Start the demo

Open **Campus-Compass-Demo.html** in a modern browser. It bundles the portal and sample calendar into one file and runs offline. Demo progress is kept in that browser where file storage is supported. Rebuild the HTML with `node build-demo.mjs` after changing the browser code.

To run the API and persist demo sessions in SQLite, extract the source folder, install Node.js 22.18 or later, and run:

```bash
npm start
```

Open **http://127.0.0.1:4173**. Node’s built-in HTTP and SQLite modules handle the API and persistence. There are no npm dependencies to install. The server creates a local database under `data/` by default. You can set `PORT` or `COMPASS_DB` if needed.

## Three-minute showcase

1. Start on **Today**. Ask **How do I renew my Student Pass?** Open the renewal planner from the answer and point out the APU source links.
2. Show the suggested start and published fee tier. Check **Prepare the payment receipt**. Open **Sample inbox** and **View original sample** to demonstrate where the next action came from. APSpace and EMGS are separate links for official tracking.
3. Open **Coursework**, then **Secure Coding lab report** to show its 7-, 3- and 1-day reminders. Open **Demo clock → Jump to next reminder**, then click the notification bell. You can mark the assignment complete and jump again to show that its future reminders are skipped.
4. Open **Campus events**, filter by **Upcoming**, and open **Build Your First API**. Register in the demo and download the calendar entry.
5. Before presenting again, use **Demo clock → Reset demo → Reset demo**.

Other useful paths: ask **Where can I get IT help?** to show the directory handoff, ask **When is my next deadline?** to use the demo student’s coursework, or use **Coursework → Import calendar → Import sample file** twice to show deduplication.

## Implementation

- `dist/` contains the responsive browser interface, APU data and shared workflow logic. The interface uses dependency-free JavaScript so it can run offline in the standalone file.
- `server.ts` serves the UI and TypeScript JSON API. A random cookie identifies a demo session stored in SQLite.
- `npm test` exercises routing, renewal calculations, sample email extraction, calendar import, reminders, event actions and API isolation.
- `node build-demo.mjs` rebuilds the offline HTML.
- Campus directory entries and the knowledge base use public APU guidance. The demo dates are fixed in Malaysia time. The calendar importer supports individual VEVENT and VTODO entries with due/start dates, including UTC and common time zones. Recurrence rules are not expanded.

The assistant works from curated source records. The local server can optionally rewrite a retrieved answer with OpenAI if `OPENAI_API_KEY` is set server-side. `COMPASS_MODEL` overrides the default model. The model path sends the entered question and matched guidance to OpenAI, and falls back to the original answer if the request fails. The offline demo uses the curated answer path.

## Pre-demo rehearsal

On the presentation laptop, open the HTML file in your presentation browser, check that the dashboard fits the projector, and run the showcase above. Reload after checking an item to verify progress, confirm the calendar file downloads, and reset the demo. Rehearse with Wi-Fi off if you plan to present offline. Official university links open separately and require internet access.

### Demo quality scorecard

Score each area after changes. Use 0 for a reproducible failure, 1 for a code or automated check with hands-on verification pending, and 2 when the check passes on the presentation setup. Record the defect and rerun the affected check after fixing it.

| Area | Pass check |
| --- | --- |
| Readability | The date, greeting and subtitle are legible with the browser in light and dark appearance. Status labels and focus rings remain clear. |
| Layout | The dashboard and forms fit a 1280 × 720 projector window and a 360px mobile viewport. Text wraps and controls stay usable. |
| Keyboard | Use Tab and Enter to navigate. Escape closes dialogs and the mobile menu. Focus returns to the right control. |
| Showcase | Ask a question, open the renewal checklist and original sample email, trigger a reminder, register for an event, download its calendar entry, then reset. |
| Offline package | Open the HTML with Wi-Fi off. Import the bundled calendar and refresh after a checklist change. |

A production APU pilot would need university-approved authentication, Microsoft 365 and Moodle access, verified indoor accessibility routes, and organizer-managed live events. The demo stores checklist flags and sample selections and has no passport upload.
