# Keeping scores up to date

`/api/sync` pulls the NFL schedule/scores and runs scoring. Something has to
call it on a timer.

`vercel.json` runs it **once a day** (a safety net — the max Vercel Hobby
allows). For live game-day updates, pick one:

## Option A — cron-job.org (free, easiest)

1. Sign up at <https://cron-job.org>.
2. Create a cron job:
   - **URL:** `https://<your-app>.vercel.app/api/sync`
   - **Method:** POST
   - **Schedule:** every 1–5 minutes (or only Thu/Sun/Mon)
   - **Headers:** `Authorization: Bearer <CRON_SECRET>`
3. Save. Done.

## Option B — GitHub Actions (in-repo, game-day only)

Copy `docs/github-actions-sync.yml.example` to `.github/workflows/sync.yml`
(via the GitHub web UI, or a git client with `workflow` token scope), then add
two repo secrets under **Settings → Secrets and variables → Actions**:

- `SYNC_URL` = `https://<your-app>.vercel.app/api/sync`
- `CRON_SECRET` = same value as in Vercel

It runs every 5 min during NFL windows and has a manual "Run workflow" button.

## Option C — Vercel Pro

Start the free trial, then set `vercel.json` `schedule` back to `* * * * *`.

## Manual

```bash
node --env-file=.env.local scripts/sync.mjs --week 1 --url https://<your-app>.vercel.app
```
