-- Family NFL Pick'em - idempotent scoring + weekly finalization
-- See CLAUDE.md sections 8, 17, 18, 19, 38. Service-role only.
--
-- Design: every function writes COMPUTED values (never x = x + 1), so running
-- it again on the same data produces the same result. Totals are always
-- SUM(points_earned); weekly points are recomputed from scratch each call.
--
-- Documented rule for an actual tied NFL game (is_tie): both team selections
-- are treated as correct (points_earned = 1). This is separate from the
-- weekly-user tie rule (the 0.5 rule).

-- ---------------------------------------------------------------------------
-- refresh_week_totals: recompute correct-pick totals for a season/week, and
-- award weekly points iff every counting game that week is final.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_week_totals(p_season int, p_week int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counting_total int;
  v_counting_final int;
  v_complete boolean;
  v_max numeric;
  v_leaders int;
begin
  select
    count(*) filter (
      where season_type = 'regular' and status not in ('canceled', 'postponed')
    ),
    count(*) filter (
      where season_type = 'regular' and status = 'final'
    )
  into v_counting_total, v_counting_final
  from public.games
  where season = p_season and week = p_week;

  v_complete := (v_counting_total > 0 and v_counting_final = v_counting_total);

  -- Upsert a row for every user who picked a regular-season game this week.
  insert into public.weekly_results
    (user_id, season, week, correct_picks, weekly_points, is_week_complete)
  select
    pk.user_id,
    p_season,
    p_week,
    coalesce(sum(pk.points_earned), 0),
    0,
    v_complete
  from public.picks pk
  join public.games g on g.id = pk.game_id
  where g.season = p_season
    and g.week = p_week
    and g.season_type = 'regular'
  group by pk.user_id
  on conflict (user_id, season, week) do update set
    correct_picks = excluded.correct_picks,
    is_week_complete = excluded.is_week_complete,
    updated_at = now();

  if not v_complete then
    -- Not done yet: correct-pick totals update live, weekly points stay 0.
    update public.weekly_results
       set weekly_points = 0, updated_at = now()
     where season = p_season and week = p_week and weekly_points <> 0;
    return;
  end if;

  -- Week complete: award weekly points from the final correct-pick totals.
  select max(correct_picks) into v_max
  from public.weekly_results
  where season = p_season and week = p_week;

  if v_max is null then
    return; -- nobody made a pick this week
  end if;

  select count(*) into v_leaders
  from public.weekly_results
  where season = p_season and week = p_week and correct_picks = v_max;

  -- Sole leader -> 1.0 ; two or more tied at the max -> 0.5 each (NOT split
  -- further by how many are tied). Everyone else -> 0.
  update public.weekly_results
     set weekly_points = case
           when correct_picks = v_max and v_leaders = 1 then 1
           when correct_picks = v_max then 0.5
           else 0
         end,
         updated_at = now()
   where season = p_season and week = p_week;
end;
$$;

-- ---------------------------------------------------------------------------
-- score_game: score every pick for one game from its current final/winner
-- state, then refresh that week's aggregates.
-- ---------------------------------------------------------------------------
create or replace function public.score_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
begin
  select * into g from public.games where id = p_game_id;
  if not found then
    raise exception 'score_game: unknown game %', p_game_id;
  end if;

  if g.status = 'final' then
    update public.picks p
       set is_correct = case
             when g.is_tie then true
             when g.winner_team_id is null then null
             else (p.picked_team_id = g.winner_team_id)
           end,
           points_earned = case
             when g.is_tie then 1
             when g.winner_team_id is not null and p.picked_team_id = g.winner_team_id then 1
             else 0
           end,
           updated_at = now()
     where p.game_id = p_game_id;
  else
    -- Not final: make sure picks are pending (handles un-finalized corrections).
    update public.picks p
       set is_correct = null, points_earned = 0, updated_at = now()
     where p.game_id = p_game_id
       and (p.is_correct is not null or p.points_earned <> 0);
  end if;

  perform public.refresh_week_totals(g.season, g.week);
end;
$$;

-- ---------------------------------------------------------------------------
-- finalize_week: explicit weekly finalization entry point (cron / manual).
-- ---------------------------------------------------------------------------
create or replace function public.finalize_week(p_season int, p_week int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_week_totals(p_season, p_week);
end;
$$;

-- ---------------------------------------------------------------------------
-- rescore_week: re-run scoring for every game in a season/week. Use after
-- delayed or corrected provider data.
-- ---------------------------------------------------------------------------
create or replace function public.rescore_week(p_season int, p_week int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  for gid in
    select id from public.games where season = p_season and week = p_week
  loop
    perform public.score_game(gid);
  end loop;
  perform public.refresh_week_totals(p_season, p_week);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: these are trusted server operations only.
-- ---------------------------------------------------------------------------
-- `from public` alone is not enough: Supabase's default privileges also grant
-- EXECUTE to anon + authenticated explicitly. Revoke all three.
revoke all on function public.refresh_week_totals(int, int) from public, anon, authenticated;
revoke all on function public.score_game(uuid) from public, anon, authenticated;
revoke all on function public.finalize_week(int, int) from public, anon, authenticated;
revoke all on function public.rescore_week(int, int) from public, anon, authenticated;

grant execute on function public.score_game(uuid) to service_role;
grant execute on function public.finalize_week(int, int) to service_role;
grant execute on function public.rescore_week(int, int) to service_role;
