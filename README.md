# 🛡️ safeComms

Autonomous community safeguard for X (Twitter) Communities. Monitors opt-in communities, detects scams, impersonation, and malicious FUD. Publicly calls out bad behavior via bot account @Safe_Coms.

## Identity (locked)

- **Product**: safeComms
- **Bot handle**: @Safe_Coms
- **Tone**: Authoritative, sharp, dismissive of bad behavior. Never abusive toward protected traits or poverty.
- **Persona**: "Unamused security authority. Dry, sarcastic, confident."

## Stack

- Node.js (TypeScript)
- Next.js (dashboard)
- Serverless functions + cron (Vercel)
- SQLite (events, learning) — local dev; use Vercel Postgres or Turso for production (Vercel serverless filesystem is ephemeral)
- Redis/KV for rate limits (in-memory fallback for dev)

## Environment variables

```bash
# X (Twitter) API — OAuth 1.0a user context
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=

# OpenAI (optional — for reply polish)
OPENAI_API_KEY=

# Cron protection
CRON_SECRET=

# Database (optional — defaults to ./data/safecomms.db)
DATABASE_PATH=
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create database**
   ```bash
   npm run db:push
   ```

3. **Configure env**
   ```bash
   cp .env.example .env
   # Edit .env with your keys
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Deploy to Vercel**
   ```bash
   vercel
   ```
   Set env vars in Vercel project settings.

## Architecture

| Service              | Purpose                                           |
|----------------------|---------------------------------------------------|
| Ingestion            | Monitor X Community timelines (activated only)    |
| Activation           | Mod-only activate/deactivate                      |
| Risk Engine          | Rule-based: scam_link, impersonation, FUD         |
| LLM Layer            | Bounded reply generation (optional)               |
| Bot Engine           | Reply to risky posts, post transparency reports   |
| Metrics              | Flags, response time, communities protected       |
| Abuse Protection     | Rate limits, circuit breaker, cooldowns           |
| Learning Loop        | Mod confirmations, overturned flags (no drift)    |

## Activation (critical)

The bot **never auto-activates**.

1. Bot is added to a community → **inactive**
2. Mod posts: `@Safe_Coms activate`
3. System verifies mod/admin → stores activation → replies confirmation
4. Monitoring starts **only** for that community

Deactivate: `@Safe_Coms deactivate`

## FUD detection

Seed phrases: dev is selling, team dumped, large bundle, liquidity pulled, to zero, dead coin, sell this, rotate into, buy the og, new contract is legit.

Scoring: phrase match (+0.25), no evidence (+0.20), urgency (+0.15), redirect (+0.25), coordination (+0.30). Cap 1.0.

Thresholds: ≥0.75 → public flag; 0.6–0.74 → mod-only alert; &lt;0.6 → log only.

## X API notes

X Communities API requires elevated or Pro API access. The client in `lib/x-api/client.ts` is structured for:

- `GET /2/communities/:id/tweets` — community timeline
- `GET /2/communities/:id/members` — mod check (for activation)

If your API tier lacks community endpoints, you may need to use alternative data sources (e.g. user timeline, lists) and adapt the ingestion layer.

## Cron jobs (Vercel)

| Path                       | Schedule    |
|----------------------------|-------------|
| `/api/cron/metrics-report` | Every 6h    |
| `/api/cron/daily-summary`  | Daily 00:00 UTC |

Set `CRON_SECRET` — Vercel sends `Authorization: Bearer <CRON_SECRET>`.

## Dashboard

- `/` — Landing
- `/dashboard` — Communities list, alert feed, flag status

## Compliance

- Account marked as automated
- Transparent behavior
- No harassment
- No protected class targeting
- All actions logged
