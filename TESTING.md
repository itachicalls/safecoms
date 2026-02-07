# How to Test safeComms

## Quick start (no X API needed)

You can run the app and use the dashboard **without** X API credentials. The UI, API routes, and database all work locally.

### 1. Install and set up

```powershell
cd c:\Users\smyde\cursor\safecomms
npm install
npm run db:push
```

### 2. Run the dev server

```powershell
npm run dev
```

Open **http://localhost:3000** in your browser.

### 3. What to test

| What | Where | Notes |
|------|--------|--------|
| **Home page** | http://localhost:3000 | Logo, hero, info panels, HOW_IT_WORKS |
| **Dashboard** | http://localhost:3000/dashboard | All 8 tabs (Overview, **Test Bot**, Communities, Flags, etc.) |
| **Test Bot** | Dashboard → TEST BOT tab | Run sample text through risk engine + LLM reply. Verifies OpenAI key works. No X needed. |
| **Communities API** | http://localhost:3000/api/communities | Returns `[]` until you add communities |
| **Flags API** | http://localhost:3000/api/flags | Returns `[]` until pipeline runs |
| **Test API** | http://localhost:3000/api/test?text=dev+is+selling | Risk + reply for sample text |
| **Pipeline run** | POST http://localhost:3000/api/pipeline/run | Runs ingest + risk + flags (no X creds = empty ingest) |

### 4. Optional: seed a community (for dashboard data)

To see something in the dashboard without X API:

1. Create a small script or use a DB browser to insert one row into `communities`:
   - `id`: any string (e.g. `test-community-1`)
   - `name`: `Test Community`
   - `status`: `active`
   - `activated_at`: `2025-01-30T00:00:00.000Z`
   - `activated_by`: `test-user`

2. Or call the pipeline once; with no X credentials it will just return `{ ingested: 0, commandsProcessed: 0, flagsCreated: 0 }` and the dashboard will still load.

### 5. Test pipeline API (optional)

```powershell
# GET (e.g. for cron) or POST
Invoke-WebRequest -Uri "http://localhost:3000/api/pipeline/run" -Method POST
```

Without X API keys, ingestion returns no posts, so you’ll get zero flags. The response is still valid: `{ ingested: 0, commandsProcessed: 0, flagsCreated: 0 }`.

---

## Full testing (with X API)

1. Copy `.env.example` to `.env` and add:
   - `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
   - Optionally `OPENAI_API_KEY` for reply polish

2. Run `npm run dev` and trigger the pipeline (cron or POST to `/api/pipeline/run`).

3. Activate a community from X by having a mod post `@Safe_Coms activate` in that community (ingestion must be able to read that community’s timeline via your API tier).

---

## Summary

- **UI + dashboard**: Works with `npm run dev` and no env vars.
- **APIs**: Work; return empty data until DB has rows or X API is configured.
- **Pipeline**: Runs without X API; with X API it will ingest and flag according to your credentials and API access.
