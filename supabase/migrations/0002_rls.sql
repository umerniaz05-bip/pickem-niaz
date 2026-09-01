-- Family NFL Pick'em - Row Level Security
-- See CLAUDE.md section 26. Service-role (server sync/scoring) bypasses RLS entirely.

alter table public.profiles       enable row level security;
alter table public.teams          enable row level security;
alter table public.games          enable row level security;
alter table public.picks          enable row level security;
alter table public.weekly_results enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- Everyone signed in can read every profile (needed for the leaderboard / family view).
create policy "profiles: read for authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- A user may edit only their own row, and may not reassign it to another id.
create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No client INSERT/DELETE: rows are created by the on_auth_user_created trigger
-- and removed via auth.users cascade.

-- ---------------------------------------------------------------------------
-- teams  (read-only reference data)
-- ---------------------------------------------------------------------------
create policy "teams: read for authenticated"
  on public.teams for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- games  (read-only for clients; written by service-role sync)
-- ---------------------------------------------------------------------------
create policy "games: read for authenticated"
  on public.games for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- picks
-- ---------------------------------------------------------------------------
-- A user can always read their own picks. Other users' picks become readable
-- only once that game's kickoff has passed (prevents copying before lock).
create policy "picks: read own or after kickoff"
  on public.picks for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_game_locked(game_id)
  );

-- Create own pick, only before kickoff. Team-in-matchup + no self-scoring are
-- additionally enforced by the picks_guard() trigger.
create policy "picks: insert own before kickoff"
  on public.picks for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.is_game_locked(game_id)
  );

-- Change own pick, only before kickoff.
create policy "picks: update own before kickoff"
  on public.picks for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and not public.is_game_locked(game_id)
  );

-- Delete own pick, only before kickoff.
create policy "picks: delete own before kickoff"
  on public.picks for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and not public.is_game_locked(game_id)
  );

-- ---------------------------------------------------------------------------
-- weekly_results  (read-only for clients; written by service-role scoring)
-- ---------------------------------------------------------------------------
create policy "weekly_results: read for authenticated"
  on public.weekly_results for select
  to authenticated
  using (true);
