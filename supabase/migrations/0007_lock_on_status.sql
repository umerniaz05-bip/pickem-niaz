-- A game also counts as "locked" once it has actually started or finished, not
-- only once its stored kickoff_time has passed. This keeps pick-locking and
-- pick-visibility correct when provider data marks a game in_progress/final
-- slightly before our kickoff_time, or when finals are backfilled.

create or replace function public.is_game_locked(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select g.kickoff_time <= now()
          or g.status in ('in_progress', 'halftime', 'final')
      from public.games g
      where g.id = p_game_id
    ),
    true  -- unknown game -> treat as locked (fail safe)
  );
$$;

-- Same rule inside the picks write guard.
create or replace function public.picks_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  g record;
begin
  select home_team_id, away_team_id, kickoff_time, status
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
    if g.kickoff_time <= now()
       or g.status in ('in_progress', 'halftime', 'final') then
      raise exception 'Game % is locked', new.game_id;
    end if;

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
