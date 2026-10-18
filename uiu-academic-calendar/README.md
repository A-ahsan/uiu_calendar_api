# UIU Academic Calendar

Live: https://uiu-calendar-api.vercel.app

A cleaner view of United International University's official academic calendars
(https://www.uiu.ac.bd/academics/calendar/): pick your program and trimester, see what's next,
add the dates to your phone's calendar, or download a PDF.

## How it works

1. **Scraper** — `scrape_uiu_calendar_html.py` (repo root) reads the UIU calendar page and writes
   `web/calendars.json` (title, events, separate date/day/text items, notes).
2. **Weekly update** — `.github/workflows/update-calendars.yml` runs the scraper every Saturday at 9 AM
   Bangladesh time, checks the result looks sane, and commits `calendars.json` only when something
   changed. It uses GitHub's built-in token, so there is no personal token to renew.
   Run it by hand from GitHub → Actions → "Update calendars" → Run workflow.
3. **Website** — `frontend/` (Vite + React + TypeScript) loads `/calendars.json`.
   Parsing (dates, categories, footnotes) lives in `frontend/src/utils/calendar.ts`.
   Vercel builds only the frontend.

`backend/` is an older Express server that is not used in production.

## Develop

```
cd uiu-academic-calendar/frontend
npm install
npm run dev
```

To refresh the data locally: `pip install requests beautifulsoup4`, then from the repo root
`python scrape_uiu_calendar_html.py` and copy `web/calendars.json` to `frontend/public/`.
