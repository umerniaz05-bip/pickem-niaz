import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { CURRENT_SEASON } from "@/lib/config";
import { resolveCurrentWeek } from "@/lib/games";
import { getNflProvider, type NflDataProvider } from "@/lib/nfl/provider";
import { scoreGame, finalizeWeek } from "@/lib/scoring";
import type { NflGame } from "@/lib/types";

export interface SyncResult {
  ok: boolean;
  season: number;
  week: number;
  inserted: number;
  updated: number;
  scored: number;
  skipped: string[];
  error?: string;
}

type GameRow = {
  id: string;
  external_game_id: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  is_tie: boolean;
  kickoff_time: string;
};

const iso = (s: string) => new Date(s).toISOString();

/** A change that must trigger (re)scoring of that game's picks. */
function needsScoring(prev: GameRow | undefined, next: NflGame): boolean {
  if (next.status !== "final") {
    // transitioned OUT of final (correction) -> rescore to clear points
    return prev?.status === "final";
  }
  if (!prev || prev.status !== "final") return true; // just went final
  // already final: rescore only if the outcome changed
  return (
    prev.winner_team_id !== next.winnerTeamId ||
    prev.is_tie !== next.isTie ||
    prev.home_score !== next.homeScore ||
    prev.away_score !== next.awayScore
  );
}

function rowDiffers(prev: GameRow, next: NflGame): boolean {
  return (
    prev.status !== next.status ||
    prev.home_score !== next.homeScore ||
    prev.away_score !== next.awayScore ||
    prev.winner_team_id !== next.winnerTeamId ||
    prev.is_tie !== next.isTie ||
    iso(prev.kickoff_time) !== iso(next.kickoffTime)
  );
}

/**
 * Pull one season/week from the provider, upsert only changed `games` rows,
 * (re)score newly-final games, then refresh the week. Never throws on provider
 * failure — logs and returns ok:false so the caller/cron can retry later.
 */
export async function syncWeek(
  sb: SupabaseClient,
  season: number,
  week: number,
  provider: NflDataProvider = getNflProvider(),
): Promise<SyncResult> {
  const base: SyncResult = {
    ok: false,
    season,
    week,
    inserted: 0,
    updated: 0,
    scored: 0,
    skipped: [],
  };

  let games: NflGame[];
  try {
    games = await provider.getSchedule(season, week);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[nfl-sync] provider failed for ${season} wk ${week}: ${message}`);
    return { ...base, error: message };
  }

  if (games.length === 0) {
    return { ...base, ok: true };
  }

  // Known team ids — skip games referencing anything we haven't seeded.
  const { data: teamRows, error: teamErr } = await sb.from("teams").select("id");
  if (teamErr) return { ...base, error: teamErr.message };
  const knownTeams = new Set((teamRows ?? []).map((t) => t.id as string));

  const { data: existingRows, error: exErr } = await sb
    .from("games")
    .select(
      "id, external_game_id, status, home_score, away_score, winner_team_id, is_tie, kickoff_time",
    )
    .eq("season", season)
    .eq("week", week);
  if (exErr) return { ...base, error: exErr.message };
  const existing = new Map<string, GameRow>(
    (existingRows ?? []).map((r) => [r.external_game_id as string, r as GameRow]),
  );

  const toUpsert: Record<string, unknown>[] = [];
  const scoreExternalIds: string[] = [];
  const skipped: string[] = [];

  for (const g of games) {
    if (!knownTeams.has(g.homeTeamId) || !knownTeams.has(g.awayTeamId)) {
      skipped.push(`${g.awayTeamId}@${g.homeTeamId} (${g.externalGameId})`);
      continue;
    }
    const prev = existing.get(g.externalGameId);
    const changed = !prev || rowDiffers(prev, g);
    if (changed) {
      toUpsert.push({
        external_game_id: g.externalGameId,
        season: g.season,
        season_type: g.seasonType,
        week: g.week,
        home_team_id: g.homeTeamId,
        away_team_id: g.awayTeamId,
        home_score: g.homeScore,
        away_score: g.awayScore,
        kickoff_time: iso(g.kickoffTime),
        status: g.status,
        winner_team_id: g.winnerTeamId,
        is_tie: g.isTie,
      });
      if (prev) base.updated++;
      else base.inserted++;
    }
    if (needsScoring(prev, g)) scoreExternalIds.push(g.externalGameId);
  }

  if (toUpsert.length > 0) {
    const { error } = await sb
      .from("games")
      .upsert(toUpsert, { onConflict: "external_game_id" });
    if (error) return { ...base, skipped, error: error.message };
  }

  // Resolve our uuids for games that need scoring.
  if (scoreExternalIds.length > 0) {
    const { data: idRows, error } = await sb
      .from("games")
      .select("id, external_game_id")
      .in("external_game_id", scoreExternalIds);
    if (error) return { ...base, skipped, error: error.message };
    for (const row of idRows ?? []) {
      try {
        await scoreGame(sb, row.id as string);
        base.scored++;
      } catch (err) {
        console.error(
          `[nfl-sync] score_game failed for ${row.external_game_id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }

  // Always refresh the week (idempotent): keeps correct-pick totals current and
  // awards weekly points once every counting game is final.
  try {
    await finalizeWeek(sb, season, week);
  } catch (err) {
    console.error(
      `[nfl-sync] finalize_week failed for ${season} wk ${week}:`,
      err instanceof Error ? err.message : err,
    );
  }

  return { ...base, ok: true, skipped };
}

/**
 * Cron entry: sync the current open week plus the previous week (catches late
 * Monday-night finals and score corrections).
 */
export async function syncCurrentWeeks(
  sb: SupabaseClient,
  season: number = CURRENT_SEASON,
): Promise<SyncResult[]> {
  const current = await resolveCurrentWeek(sb, season);
  const weeks = current > 1 ? [current - 1, current] : [current];
  const results: SyncResult[] = [];
  for (const w of weeks) {
    results.push(await syncWeek(sb, season, w));
  }
  return results;
}
