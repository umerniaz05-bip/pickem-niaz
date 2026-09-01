import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Thin wrappers over the scoring RPCs (supabase/migrations/0005_scoring.sql).
 * All are idempotent and require a service-role client — RLS/grants block
 * anon and authenticated callers.
 */

export async function scoreGame(sb: SupabaseClient, gameId: string) {
  const { error } = await sb.rpc("score_game", { p_game_id: gameId });
  if (error) throw new Error(`score_game(${gameId}): ${error.message}`);
}

export async function finalizeWeek(
  sb: SupabaseClient,
  season: number,
  week: number,
) {
  const { error } = await sb.rpc("finalize_week", {
    p_season: season,
    p_week: week,
  });
  if (error) throw new Error(`finalize_week(${season}, ${week}): ${error.message}`);
}

export async function rescoreWeek(
  sb: SupabaseClient,
  season: number,
  week: number,
) {
  const { error } = await sb.rpc("rescore_week", {
    p_season: season,
    p_week: week,
  });
  if (error) throw new Error(`rescore_week(${season}, ${week}): ${error.message}`);
}
