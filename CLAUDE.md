@AGENTS.md

# Family NFL Pick'em — Claude Code Project Spec

## 1. Project Overview

Build a private, mobile-first NFL Pick'em web app for a small family group (approximately 5 users).

The app should feel similar to ESPN Pick'em, but much simpler and focused only on the features this family needs.

Primary usage will be on phones, but the app must also work well on laptops/desktops.

### Core Game

Each NFL week:

1. Every user picks the winner of every NFL game.
2. A correct game pick earns **1 correct-pick point**.
3. A wrong game pick earns **0 correct-pick points**.
4. Picks lock automatically when that game's kickoff time arrives.
5. Correct-pick totals update automatically as games become final.
6. After every NFL game for that week is final:
   - The user with the most correct picks receives **1 weekly point**.
   - If multiple users tie for the best weekly correct-pick total, each tied user receives **0.5 weekly points**.
7. The season champion is the user with the most **weekly points** at the end of the season.

Also track season-long total correct picks as a secondary statistic.

---

## 2. Tech Stack

Use:

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **Supabase Postgres**
- **Supabase Auth**
- **Supabase Realtime**
- **Vercel** for hosting
- NFL game data from a server-side sports data provider / ESPN-style unofficial endpoint behind an abstraction layer

Do not expose sports-data fetching logic directly to the browser.

Keep the NFL provider implementation replaceable so we can change APIs later without rewriting the rest of the app.

---

## 3. Product Priorities

Prioritize, in this order:

1. Extremely easy to use on a phone
2. Reliable pick locking
3. Accurate automatic scoring
4. Automatic leaderboard updates
5. Clean, polished UI
6. Minimal setup for family members
7. Security and server-side validation
8. Maintainable code

Do not overengineer this application. There will probably only be around 5 users.

---

## 4. Authentication

Use **Supabase Auth**.

- Login screen
- No public registration/sign-up screen
- Accounts manually created by the app owner/admin
- Persistent sessions so users normally stay logged in

Users log in using credentials assigned to them. Do NOT hardcode passwords in frontend code.

---

## 5. User Profiles

`profiles` table linked 1:1 with Supabase Auth users.

```sql
profiles
--------
id uuid primary key references auth.users(id)
username text unique not null
display_name text
avatar_url text null
created_at timestamptz default now()
updated_at timestamptz default now()
```

Users must be able to change their visible username/display name from a Profile/Settings screen. Changing a username must NOT change the user's authentication identity or password. Enforce unique usernames.

---

## 6. NFL Teams

Normalized `teams` table.

```sql
teams
-----
id text primary key
name text not null
city text
abbreviation text unique not null
logo_url text
conference text
division text
```

The picks UI should prominently show team logos.

---

## 7. Games Table

```sql
games
-----
id uuid primary key default gen_random_uuid()
external_game_id text unique not null
season int not null
season_type text not null
week int not null
home_team_id text references teams(id)
away_team_id text references teams(id)
home_score int
away_score int
kickoff_time timestamptz not null
status text not null
winner_team_id text null references teams(id)
is_tie boolean default false
created_at timestamptz default now()
updated_at timestamptz default now()
```

Statuses: scheduled, pregame, in_progress, halftime, final, postponed, canceled.

Only regular-season games count toward the normal family competition unless explicitly configured otherwise.

---

## 8. Picks Table

```sql
picks
-----
id uuid primary key default gen_random_uuid()
user_id uuid references profiles(id) not null
game_id uuid references games(id) not null
picked_team_id text references teams(id) not null
points_earned numeric(4,2) default 0
is_correct boolean null
created_at timestamptz default now()
updated_at timestamptz default now()

unique(user_id, game_id)
```

For ordinary NFL games: correct pick = 1, incorrect = 0.

If an actual NFL game ends tied, both team selections may be treated as correct or handled via a clearly documented rule — separate from the weekly-user tie rule.

> If multiple users tie for the best correct-pick total for an NFL week, each tied weekly winner receives 0.5 weekly points.

---

## 9. Weekly Results

`weekly_results` table OR a reliable database view/materialized calculation.

```sql
weekly_results
--------------
id uuid primary key default gen_random_uuid()
user_id uuid references profiles(id)
season int not null
week int not null
correct_picks numeric(6,2) default 0
weekly_points numeric(4,2) default 0
is_week_complete boolean default false
updated_at timestamptz default now()

unique(user_id, season, week)
```

Rules:

- Before the week is complete, `weekly_points` should remain 0.
- Correct-pick totals update throughout the week as games finish.
- Weekly points are awarded ONLY when every game in that NFL week is final.

### Weekly Winner Logic

Sole leader → +1 weekly point. Two or more tied at the max → each tied user +0.5. The 0.5 is NOT split further based on number of tied users. If 3 users all tie for first, each gets 0.5.

---

## 10. Season Standings

Primary ranking: `SUM(weekly_points)` descending. Secondary: season correct picks descending. Track season correct picks as a secondary statistic. Do not silently invent other tiebreakers.

Leaderboard columns: Player | This Week | Season Correct | Weekly Points

---

## 11. Picks Screen

The most important screen. Mobile-first and extremely simple.

Top: current NFL week, picks completed / total games, next game kickoff / lock time if useful.

Each matchup is a large touch-friendly card. Tap the team card/logo/name to select. Selected picks must be visually obvious. Large tap targets.

---

## 12. Saving Picks

Prefer **autosave**. When a user taps a team:

1. Validate the game has not kicked off.
2. Save/update the pick in Supabase.
3. Give immediate visual confirmation.
4. Handle failure gracefully.

Avoid requiring users to press a Save button. Optionally show a subtle "Saved ✓" status.

---

## 13. Pick Locking

Picks lock at the scheduled kickoff time of each individual game. Enforced on the **server/database side**, not only by disabling frontend buttons. A malicious or accidental browser request must not be able to update a pick after kickoff. Use the server's trusted timestamp / database timestamp. Do not trust the user's device clock.

---

## 14. Viewing Other Users' Picks

Before a game starts, other users' picks must be hidden. After kickoff, everyone's picks for that game become visible. This prevents copying picks before lock. Create a "Family Picks" / "Everyone's Picks" screen.

---

## 15. Automatic NFL Game Data

The browser should NOT directly own game-score syncing. Create a server-side NFL provider abstraction.

```ts
interface NflDataProvider {
  getSchedule(season: number, week: number): Promise<NflGame[]>
  getGame(externalGameId: string): Promise<NflGame>
  getLiveGames(): Promise<NflGame[]>
}
```

The rest of the app depends on this interface, not on an ESPN-specific response structure. Normalize external data into our own `games` table.

---

## 16. Score Syncing

During active NFL game windows, a server-side scheduled process periodically fetches game statuses and scores. Fetch more frequently while games are live, much less frequently when no games are active. When a game transitions to `final`, process its picks immediately. ~once per minute during live windows is sufficient. Goal: leaderboard updates within roughly a minute of the provider marking a game final.

---

## 17. Game Finalization Flow

provider reports final → server sync job → update games row → determine winner → score every pick for that game → recalculate weekly totals → Supabase Realtime pushes update → open phones/laptops update automatically.

---

## 18. Idempotent Scoring

DO NOT implement scoring by blindly incrementing a user's total. Each pick stores its result: `points_earned = 0 or 1`. Processing the same game again writes the same result. Totals are derived using `SUM(points_earned)`.

---

## 19. Weekly Finalization

After every update that causes a game to become final, check whether **all counting games for that season/week are final**.

If not: update correct-pick totals, do NOT award weekly points yet.

If yes:

1. Calculate every user's correct-pick total for the week
2. Find the maximum
3. Determine how many users are tied at the maximum
4. Award: one leader → 1 weekly point; two or more tied → 0.5 each
5. Mark the week complete
6. Idempotent — cannot award points twice

---

## 20. Realtime UI Updates

Subscribe to changes involving games, picks/results as appropriate, and weekly results / leaderboard state. When a game becomes final and scoring finishes, open apps see final score, correct/incorrect result, weekly correct-pick total, and leaderboard position update without manual refresh.

---

## 21. Leaderboard Screen

Clean, phone-optimized. Show rank, username/display name, current week's correct picks, season correct picks, season weekly points. Allow viewing previous weeks (Season | Week 1 | Week 2 …). Primary sort weekly_points DESC, secondary season_correct_picks DESC.

---

## 22. Game Status UX

Scheduled: `Sun 1:00 PM`. Live: `LIVE • Q3 4:21 / MIA 20 - BUF 17`. Final: `FINAL / MIA 27 - BUF 24`. Locked pick: `Pick Locked`. Correct: `Correct ✓`. Incorrect: `Incorrect`. Keep it uncluttered.

---

## 23. Navigation

Mobile-first bottom navigation: `Picks | Family | Standings | Profile`. Desktop adapts into a header/wider nav without changing information architecture.

---

## 24. Profile Screen

Current username/display name, edit username, optional avatar later, logout. No unnecessary account-management complexity.

---

## 25. Responsive / PWA

Work well on iPhone, Android, tablets, laptops, desktop. Build mobile-first. Configure as a PWA if practical (add to home screen). PWA is desired but core game functionality is higher priority.

---

## 26. Supabase Security

Use Row Level Security.

Users may: read their own profile; update their own profile username/display name; create/update only their own picks; read public/shared leaderboard data; read other users' picks only once the relevant game's kickoff time has passed.

Users must NOT: edit another user's picks; edit game scores; edit game statuses; edit weekly points; directly award themselves points; change a pick after kickoff.

Server-side/admin service-role processes may: sync NFL games; update scores/status; calculate pick results; finalize weeks.

Never expose the Supabase service-role key to the browser.

---

## 27. Data Integrity Constraints

One pick per user per game; username unique; external game ID unique; picked team must belong to that matchup; weekly result unique per user/season/week; no direct client write access to calculated scoring fields. Use transactions or RPC/functions for finalization.

---

## 28. Timezones

Store NFL kickoff timestamps in UTC using `timestamptz`. Display times in the user's browser timezone. Pick locking relies on authoritative server/database time. No hardcoded Eastern-time comparisons in client-side business logic.

---

## 29. Admin / Maintenance

No full admin dashboard for V1. Make it easy for the owner/developer to: create users in Supabase; inspect games; inspect picks; manually trigger game sync; re-run idempotent scoring if provider data was delayed or corrected. Optional later: basic protected admin page.

---

## 30. Error Handling

- **NFL provider unavailable:** don't crash; show previously stored Supabase game data; log server-side; retry next scheduled sync.
- **Score correction:** re-running scoring must correctly update affected picks.
- **Missing game:** log it, let next schedule sync repair it.
- **Autosave failed:** tell the user the pick was not saved and allow retry. Do not visually claim success before the database confirms it.

---

## 31. Suggested App Routes

```
/login
/            -> redirects to /picks or current week
/picks
/picks/[week]
/family
/standings
/standings/[week]
/profile
```

Protected routes require authentication.

---

## 32. Suggested Code Structure

```
src/
  app/
    login/  picks/  family/  standings/  profile/
    api/ nfl/  sync/
  components/
    GameCard.tsx  TeamOption.tsx  WeekSelector.tsx  Leaderboard.tsx  BottomNav.tsx  GameStatus.tsx
  lib/
    supabase/ client.ts  server.ts
    nfl/ provider.ts  types.ts  espn-provider.ts  normalize.ts
    scoring/ score-game.ts  finalize-week.ts  leaderboard.ts
  types/
```

Guidance only; keep it simple and idiomatic for the chosen Next.js version.

---

## 33. Core Types

```ts
type GameStatus =
  | "scheduled" | "pregame" | "in_progress" | "halftime"
  | "final" | "postponed" | "canceled";

type Pick = {
  id: string; userId: string; gameId: string;
  pickedTeamId: string; pointsEarned: number;
};

type WeeklyStanding = {
  userId: string; username: string;
  correctPicks: number; weeklyPoints: number;
};
```

---

## 34. UX Requirements

Avoid: tiny buttons, dense mobile tables, unnecessary confirmation dialogs, excessive text, complicated setup, desktop-first layouts, manual refreshes.

Prefer: cards, large logos, clear selections, simple typography, clear lock status, automatic saves, subtle animations, skeleton loading states, optimistic UX only where it cannot misrepresent whether a pick was actually saved.

---

## 35. Visual Direction

Modern sports app; ESPN Fantasy / Pick'em simplicity; clean cards; strong hierarchy; readable on phones; polished but not overdesigned. Do not copy ESPN branding. Use our own neutral design system. Team logos may use publicly accessible team logo assets from the chosen data source if practical.

---

## 36. V1 Feature Checklist

Supabase integration; Supabase Auth; manually created users; login; persistent session; editable username/display name; NFL teams; team logos; NFL weekly schedule; weekly picks screen; one pick per game; autosave picks; server-side kickoff lock; hide other users' picks before kickoff; reveal after kickoff; automatic score syncing; live/final game status; automatic correct-pick scoring; current-week correct-pick leaderboard; season correct-pick total; weekly-point scoring; 1 weekly point for sole winner; 0.5 for EACH user tied for best; weekly points only finalized after all week's games final; season leaderboard; Supabase Realtime updates; responsive mobile UI; desktop support; safe RLS policies; deployment-ready on Vercel.

---

## 37. Nice-to-Have After V1

Pick percentages; push notifications before an unpicked game starts; weekly champion banner; previous-week history; detailed accuracy stats; user avatars; dark mode; PWA installability; admin dashboard; playoffs mode; separate leagues; invitations; multiple seasons; chat. Do NOT block V1 on these.

---

## 38. Important Business Rules Summary

- **Per-game scoring:** correct = 1, wrong = 0.
- **Pick deadline:** a game locks at that game's kickoff time.
- **Weekly leaderboard:** current-week score = sum of correct game picks for that week.
- **Weekly point:** sole most-correct user → 1; 2+ tied for most correct → each tied user gets 0.5. Do NOT divide 1 point among tied users.
- **Weekly finalization timing:** do not award weekly points until all counting games for that NFL week are final.
- **Season champion:** highest sum of weekly points. Total correct picks is a secondary statistic.

---

## 39. Automatic Update Requirement

> When an NFL game becomes final, the app should automatically update the game result, score everyone's picks, update their correct-pick totals, and push the changes to users with the app open without requiring a page refresh.

External NFL data → scheduled server sync → Supabase games → idempotent scoring → weekly aggregation → Supabase Realtime → phone/laptop UI.

---

## 40. Implementation Order

**Phase 1 — Foundation:** init Next.js + TS + Tailwind; configure Supabase; env var setup; schema/migrations; RLS policies; Auth; profile creation/editing.

**Phase 2 — Static NFL Experience:** teams; team logos; game types; responsive GameCard; picks screen with seeded test games; autosave; pick locking; Family Picks visibility logic.

**Phase 3 — Scoring:** game-finalization logic; idempotent pick scoring; weekly correct-pick aggregation; weekly finalization; 1 / 0.5 weekly-point rule; season aggregation; tests for scoring rules.

**Phase 4 — NFL Data Integration:** implement `NflDataProvider`; first provider adapter; normalize schedule data; sync games into Supabase; sync live scores/status; detect final games; trigger scoring; handle provider failures/retries.

**Phase 5 — Realtime:** subscribe to game changes; subscribe to leaderboard-related updates; verify open devices update without refresh.

**Phase 6 — Polish:** mobile navigation; loading/error/empty states; responsive desktop styling; accessibility; PWA if practical; deploy to Vercel.

---

## 41. Testing Requirements

**Picks:** can pick before kickoff; can change before kickoff; cannot change after kickoff; cannot create multiple picks for same user/game; cannot edit another user's pick; cannot pick a team not in the matchup.

**Scoring:** correct pick earns 1; wrong earns 0; reprocessing same final game does not duplicate points; score correction updates results properly.

**Weekly result:** sole first-place → 1 weekly point; 2-way tie → each 0.5; 3-way tie → each 0.5; non-winners → 0; weekly point not awarded before all games final; re-running finalization does not duplicate.

**Visibility:** other users' picks hidden before kickoff; visible after.

**Auth/RLS:** logged-out user cannot access private routes; user can edit own username; user cannot edit another profile; browser cannot edit game scores; browser cannot award points.

---

## 42. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NFL_API_BASE_URL=
NFL_API_KEY=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.

---

## 43. Cron / Scheduled Sync

Server-side scheduled job (Vercel Cron / Supabase scheduled function / other). It should: determine whether there are relevant games today/live; fetch current NFL game data; update changed rows only; process newly-final games; finalize a week if necessary. Must work even when no family member has the site open.

---

## 44. Provider Independence

Do not scatter ESPN-specific field names throughout the app. Only the provider adapter should know the external API structure. Everything else uses the normalized shape: `{ externalGameId, homeTeamId, awayTeamId, homeScore, awayScore, kickoffTime, status }`.

---

## 45. Definition of Done for V1

End-to-end: Umer logs in on iPhone; another family member on another device; both see the same current week's games; each selects winners; picks autosave; family cannot see each other's selections before kickoff; at kickoff the game locks; after kickoff picks become visible; NFL scores/results update automatically; when a game is final correct picks earn 1; both devices update without manual refresh; weekly correct-pick standings update throughout the week; after the week's final NFL game one best user gets 1 weekly point OR all tied best users get 0.5 each; season standings update automatically; users can change their display username; nobody can manipulate scores or locked picks through the browser.

---

## 46. Claude Code Instructions

- Read this entire file before making architectural decisions.
- Follow the business rules exactly. Do not silently change scoring rules.
- Keep the solution simple enough for a ~5-user family app.
- Prefer secure server/database enforcement over client-only checks.
- Use migrations/schema files instead of undocumented manual database changes.
- Keep NFL provider code isolated. Make scoring idempotent. Build mobile-first.
- Do not add unnecessary dependencies. Do not prematurely add multi-league complexity.
- Do not build public registration unless explicitly requested.
- Before any large architectural deviation from this document, explain why.
- When a requirement is ambiguous, prefer the simplest implementation consistent with this spec.
