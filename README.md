# Family NFL Pick'em

Private, mobile-first NFL Pick'em for a small family group. Next.js + Supabase.
Full spec in [`CLAUDE.md`](./CLAUDE.md).

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + keys + CRON_SECRET
npm run dev                  # http://localhost:3000
```

### Database

Migrations are plain SQL in [`supabase/migrations/`](./supabase/migrations), applied in order:

```bash
# with psql and your Supabase connection string
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

`0001` schema · `0002` RLS · `0004` team seed · `0005` scoring · `0003/0006/0007` fixes.

### Accounts

No public sign-up. Create accounts with the service-role key:

```bash
node --env-file=.env.local scripts/create-user.mjs \
  --email mom@example.com --password 'pw' --username mom --display "Mom"
```

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/create-user.mjs` | Provision a family login. |
| `scripts/seed-games.mjs` | Insert a **fake** Week 1 slate (kickoffs relative to now) for UI testing. Re-run to reset. |
| `scripts/simulate-finals.mjs --week 1 [--all]` | Mark that week's games final with made-up scores and run scoring. Dev only. |
| `scripts/sync.mjs [--week N] [--url ...]` | Trigger a real NFL sync via `/api/sync` (needs the dev server or a deployment running). |

## NFL data sync

`/api/sync` pulls from the provider ([`src/lib/nfl/`](./src/lib/nfl) — ESPN adapter
behind the `NflDataProvider` interface), upserts only changed `games` rows,
(re)scores newly-final games, and refreshes weekly totals. It is idempotent and
guarded by `CRON_SECRET` (fails closed if unset).

```bash
# manual
curl -X POST -H "authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/sync?week=1"
```

**Switching from seed data to real games:** delete the fake slate, then sync.

```bash
# remove SEED-* games for the season, then:
node --env-file=.env.local scripts/sync.mjs --week 1
```

### Cron

[`vercel.json`](./vercel.json) schedules `/api/sync` every minute. **Sub-daily Vercel
Cron requires a Pro plan**; on Hobby, change the schedule to something daily or
trigger `/api/sync` from an external scheduler. Set `CRON_SECRET` in the Vercel
project env (Vercel Cron sends it as `Authorization: Bearer <value>` automatically).

## Tests

```bash
npm test   # vitest — scoring rules + NFL normalize/sync, against a season-9999 sandbox
```

## Deployment

Vercel. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (and optionally `NFL_API_BASE_URL`).

Project **Framework Preset must be "Next.js"** (Settings → Build and Deployment).
If it's "Other", the build runs but no routes are created and every path 404s
with no function logs. `next build` uses `--webpack` (see `package.json`).
