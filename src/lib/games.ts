import type { SupabaseClient } from "@supabase/supabase-js";

import { CURRENT_SEASON, FIRST_WEEK, LAST_WEEK } from "@/lib/config";
import type { Game, GameStatus, Pick, SeasonType, Team } from "@/lib/types";

// --- row -> app-type mappers -------------------------------------------------

type TeamRow = {
  id: string;
  name: string;
  city: string | null;
  abbreviation: string;
  logo_url: string | null;
  conference: string | null;
  division: string | null;
};

type GameRow = {
  id: string;
  external_game_id: string;
  season: number;
  season_type: string;
  week: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  kickoff_time: string;
  status: string;
  winner_team_id: string | null;
  is_tie: boolean;
};

type PickRow = {
  id: string;
  user_id: string;
  game_id: string;
  picked_team_id: string;
  points_earned: number | string;
  is_correct: boolean | null;
};

export function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    abbreviation: row.abbreviation,
    logoUrl: row.logo_url,
    conference: row.conference,
    division: row.division,
  };
}

export function mapGame(row: GameRow): Game {
  return {
    id: row.id,
    externalGameId: row.external_game_id,
    season: row.season,
    seasonType: row.season_type as SeasonType,
    week: row.week,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    kickoffTime: row.kickoff_time,
    status: row.status as GameStatus,
    winnerTeamId: row.winner_team_id,
    isTie: row.is_tie,
  };
}

export function mapPick(row: PickRow): Pick {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    pickedTeamId: row.picked_team_id,
    pointsEarned: Number(row.points_earned),
    isCorrect: row.is_correct,
  };
}

// --- queries ---------------------------------------------------------------

export async function getTeams(
  sb: SupabaseClient,
): Promise<Record<string, Team>> {
  const { data, error } = await sb.from("teams").select("*");
  if (error) throw error;
  const byId: Record<string, Team> = {};
  for (const row of (data ?? []) as TeamRow[]) byId[row.id] = mapTeam(row);
  return byId;
}

export async function getWeekGames(
  sb: SupabaseClient,
  week: number,
  season: number = CURRENT_SEASON,
): Promise<Game[]> {
  const { data, error } = await sb
    .from("games")
    .select("*")
    .eq("season", season)
    .eq("week", week)
    .order("kickoff_time", { ascending: true })
    .order("external_game_id", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as GameRow[]).map(mapGame);
}

/** Current user's picks for the given games, keyed by game_id. */
export async function getUserPicksByGame(
  sb: SupabaseClient,
  userId: string,
  gameIds: string[],
): Promise<Record<string, Pick>> {
  if (gameIds.length === 0) return {};
  const { data, error } = await sb
    .from("picks")
    .select("*")
    .eq("user_id", userId)
    .in("game_id", gameIds);
  if (error) throw error;
  const byGame: Record<string, Pick> = {};
  for (const row of (data ?? []) as PickRow[]) byGame[row.game_id] = mapPick(row);
  return byGame;
}

/**
 * All picks for the given games that the caller is allowed to see. RLS returns
 * the caller's own picks always, plus everyone's picks for games past kickoff.
 */
export async function getVisiblePicksForGames(
  sb: SupabaseClient,
  gameIds: string[],
): Promise<Pick[]> {
  if (gameIds.length === 0) return [];
  const { data, error } = await sb
    .from("picks")
    .select("*")
    .in("game_id", gameIds);
  if (error) throw error;
  return ((data ?? []) as PickRow[]).map(mapPick);
}

/**
 * Which week to show by default: the earliest week that still has a game that
 * is not final. Falls back to the last week that has games, then week 1.
 */
export async function resolveCurrentWeek(
  sb: SupabaseClient,
  season: number = CURRENT_SEASON,
): Promise<number> {
  const { data, error } = await sb
    .from("games")
    .select("week, status")
    .eq("season", season);
  if (error) throw error;

  const rows = (data ?? []) as { week: number; status: string }[];
  if (rows.length === 0) return FIRST_WEEK;

  const openWeeks = rows
    .filter((r) => r.status !== "final" && r.status !== "canceled")
    .map((r) => r.week);
  if (openWeeks.length > 0) return Math.min(...openWeeks);

  return Math.max(...rows.map((r) => r.week));
}

// --- display helpers -----------------------------------------------------

/** Client-side lock hint for UI only. The DB is the authority (picks_guard). */
export function isKickoffPassed(kickoffTime: string): boolean {
  return new Date(kickoffTime).getTime() <= Date.now();
}

const STARTED_STATUSES = ["in_progress", "halftime", "final"];

/**
 * Mirrors the DB's is_game_locked(): locked once kickoff has passed OR the game
 * has actually started/finished (covers backfilled finals with a future
 * kickoff_time). The server still enforces this authoritatively.
 */
export function isGameLocked(game: {
  kickoffTime: string;
  status: GameStatus;
}): boolean {
  return (
    isKickoffPassed(game.kickoffTime) || STARTED_STATUSES.includes(game.status)
  );
}

export function isPlayable(game: Game): boolean {
  return (
    !isGameLocked(game) &&
    game.status !== "canceled" &&
    game.status !== "postponed"
  );
}

export function clampWeek(week: number): number {
  if (Number.isNaN(week)) return FIRST_WEEK;
  return Math.min(LAST_WEEK, Math.max(FIRST_WEEK, Math.trunc(week)));
}
