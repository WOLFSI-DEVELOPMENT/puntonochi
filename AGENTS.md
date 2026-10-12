# PuntoNochi — Base44 Dev Environment

## Overview
Vite + React frontend with an Express backend (`server.js` on port 3001). Vite dev server runs on port 3005 and proxies `/api` to the Express server. Both run concurrently in a single container.

## Setup
- `docker compose -f docker-compose.base44.yml up -d` starts the app
- Host port 3000 maps to the Vite dev server (port 3005 inside the container)
- Dependencies install on container startup via `npm install`
- Source is bind-mounted; edits hot-reload via Vite HMR

## External Credentials (optional — app boots without them)
- `GEMINI_API_KEY` — Google Gemini API key for AI chat features. Without it, AI endpoints return 503.
- `DATABASE_URL` — Neon Postgres connection string. Without it, all `/api/*` data endpoints return 503 and the frontend shows fallback categories only (no places/colonias data).
- Other optional keys: `GNEWS_API_KEY`, `YOUTUBE_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_APP_ID/SECRET`, `VAPID_*`, `CRON_SECRET`
- Add credentials from the Base44 Secrets page; they're delivered via `/run/base44/app.env`

## Architecture Notes
- `src/data.ts` fetches `/api/categories`, `/api/colonias`, `/api/places` on module load. Falls back to a static category catalog if the API is unavailable.
- `server.js` handles all API routes, OAuth, S3 storage, web push, and Gemini AI.
- `vercel.json` contains rewrites/crons for production deployment (not used in dev).
- `init_db.ts` is a standalone SQLite seed script (not used by the running app).

## Verification
- `curl http://localhost:3000/` returns 200 with the Vite-served HTML
- `curl http://localhost:3000/api/places` returns 503 without DATABASE_URL (expected)
- Preview iframe shows the app UI with fallback categories
