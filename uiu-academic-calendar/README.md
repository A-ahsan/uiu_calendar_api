# UIU Academic Calendar

Monorepo with backend (Express) and frontend (Vite + React + TypeScript + Tailwind).

Quick start (from repository root `c:\uiu_calendar_api`):

1. Install dependencies for both packages:

```
npm install
npm run install-all
```

2. Start backend and frontend (in separate shells):

Backend:
```
node uiu-academic-calendar/backend/index.js
```

Frontend:
```
npm --prefix uiu-academic-calendar/frontend run dev
```

Backend endpoints:
- GET /api/calendars -> serves `web/calendars.json`
- GET /api/health

Notes
- This initial scaffold uses Express for the backend to keep setup fast. If you prefer Nest.js, I can replace the backend with a Nest project.
