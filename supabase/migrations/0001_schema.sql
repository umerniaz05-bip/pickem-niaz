-- Family NFL Pick'em - core schema
-- Phase 1: profiles, teams, games, picks, weekly_results + supporting triggers/functions.
-- Business rules live in CLAUDE.md; keep this file the single source of truth for structure.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_len check (char_length(username) between 2 and 24),
  constraint profiles_username_fmt check (username ~ '^[A-Za-z0-9_]+$')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever an auth user is created (admin-provisioned).
-- username defaults to the local-part of the email; the user can change it later.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := coalesce(
    nullif(regexp_replace(split_part(new.email, '@', 1), '[^A-Za-z0-9_]', '', 'g'), ''),
    'player'
  );
  base_username := left(base_username, 20);
  candidate := base_username;

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(new.raw_user_meta_data ->> 'display_name', candidate));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id text primary key,
  name text not null,
  city text,
  abbreviation text unique not null,
  logo_url text,
  conference text,
  division text
);

-- ---------------------------------------------------------------------------
-- games
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  external_game_id text unique not null,
  season int not null,
  season_type text not null default 'regular',
  week int not null,
  home_team_id text references public.teams (id),
  away_team_id text references public.teams (id),
  home_score int,
  away_score int,
  kickoff_time timestamptz not null,
  status text not null default 'scheduled',
  winner_team_id text references public.teams (id),
  is_tie boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_status_check check (status in (
    'scheduled', 'pregame', 'in_progress', 'halftime', 'final', 'postponed', 'canceled'
  )),
  constraint games_season_type_check check (season_type in ('preseason', 'regular', 'postseason')),
  constraint games_distinct_teams check (home_team_id is distinct from away_team_id)
);

create index if not exists games_season_week_idx on public.games (season, week);
create index if not exists games_kickoff_idx on public.games (kickoff_time);
create index if not exists games_status_idx on public.games (status);

create trigger games_set_updated_at
  before update on public.games
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- picks
-- ---------------------------------------------------------------------------
create table if not exists public.picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  picked_team_id text not null references public.teams (id),
  points_earned numeric(4, 2) not null default 0,
  is_correct boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create index if not exists picks_game_idx on public.picks (game_id);
create index if not exists picks_user_idx on public.picks (user_id);

create trigger picks_set_updated_at
  before update on public.picks
  for each row execute function public.set_updated_at();

-- Server-trusted lock check: a game is locked once its kickoff time has passed.
-- SECURITY DEFINER so RLS policies on picks can call it without needing a
-- direct SELECT grant on games. Uses database time (never the client's clock).
create or replace function public.is_game_locked(p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select g.kickoff_time <= now() from public.games g where g.id = p_game_id),
    true  -- unknown game -> treat as locked (fail safe)
  );
$$;

-- Validate that the picked team actually plays in that game, and stop clients
-- from writing calculated scoring fields. Service-role sync/scoring jobs are
-- allowed to set points_earned / is_correct; everyone else is forced to neutral.
-- SECURITY INVOKER (default) so current_user is the real caller role.
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

create trigger picks_guard_biu
  before insert or update on public.picks
  for each row execute function public.picks_guard();

-- ---------------------------------------------------------------------------
-- weekly_results (stored aggregation; filled in Phase 3)
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  season int not null,
  week int not null,
  correct_picks numeric(6, 2) not null default 0,
  weekly_points numeric(4, 2) not null default 0,
  is_week_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, season, week)
);

create index if not exists weekly_results_season_week_idx on public.weekly_results (season, week);

create trigger weekly_results_set_updated_at
  before update on public.weekly_results
  for each row execute function public.set_updated_at();
