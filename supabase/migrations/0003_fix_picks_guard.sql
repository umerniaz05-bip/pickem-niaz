-- Fix: picks_guard() must run SECURITY INVOKER so current_user reflects the real
-- caller role ('authenticated' vs 'service_role'). As SECURITY DEFINER it always
-- resolved to the owner ('postgres'), which would have forced the service-role
-- scoring job's points_earned/is_correct back to neutral.
--
-- The authenticated role already has a permissive SELECT policy on games, so the
-- trigger can read the matchup without elevated privileges.

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

  if current_user <> 'service_role' then
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
