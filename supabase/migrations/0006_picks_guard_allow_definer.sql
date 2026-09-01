-- Fix: picks_guard() must also bypass its client-only rules when running as
-- `postgres`. SECURITY DEFINER functions (score_game, rescore_week, migrations)
-- execute as the function owner `postgres`, so `current_user` there is
-- `postgres`, not `service_role`. Without this, scoring a final game fails with
-- "Game is locked" because the game is (correctly) past kickoff.
--
-- Untrusted code never runs as `postgres` or `service_role`; only PostgREST's
-- `authenticated` / `anon` roles reach the enforced branch.

create or replace function public.picks_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  g record;
begin
  select home_team_id, away_team_id, kickoff_time
    into g
  from public.games
  where id = new.game_id;

  if not found then
    raise exception 'Unknown game %', new.game_id;
  end if;

  if new.picked_team_id is distinct from g.home_team_id
     and new.picked_team_id is distinct from g.away_team_id then
    raise exception 'Picked team % is not part of game %', new.picked_team_id, new.game_id;
  end if;

  if current_user not in ('service_role', 'postgres') then
    -- Enforce kickoff lock on the server side regardless of client behaviour.
    if g.kickoff_time <= now() then
      raise exception 'Game % is locked (kickoff has passed)', new.game_id;
    end if;

    -- Clients may never award themselves points.
    new.points_earned := 0;
    new.is_correct := null;

    if tg_op = 'UPDATE' then
      if new.user_id is distinct from old.user_id or new.game_id is distinct from old.game_id then
        raise exception 'Cannot move a pick to a different user or game';
      end if;
    end if;
  end if;

  return new;
end;
$$;
