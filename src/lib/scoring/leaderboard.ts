import type { SupabaseClient } from "@supabase/supabase-js";

import { CURRENT_SEASON } from "@/lib/config";

export interface SeasonStandingRow {
  userId: string;
  username: string;
  displayName: string | null;
  label: string;
  thisWeekCorrect: number;
  seasonCorrect: number;
  weeklyPoints: number;
}

export interface WeeklyStandingRow {
  userId: string;
  label: string;
  correctPicks: number;
  weeklyPoints: number;
  isWinner: boolean;
  isWeekComplete: boolean;
}

type ProfileRow = { id: string; username: string; display_name: string | null };
type WrRow = {
  user_id: string;
  week: number;
  correct_picks: number | string;
  weekly_points: number | string;
  is_week_complete: boolean;
};

async function loadProfiles(sb: SupabaseClient): Promise<Map<string, ProfileRow>> {
  const { data, error } = await sb
    .from("profiles")
    .select("id, username, display_name");
  if (error) throw error;
  const map = new Map<string, ProfileRow>();
  for (const p of (data ?? []) as ProfileRow[]) map.set(p.id, p);
  return map;
}

const labelOf = (p: ProfileRow | undefined) =>
  p ? p.display_name || p.username : "Unknown";

/**
 * Season leaderboard. Sort: weekly points desc, then season correct picks desc
 * (CLAUDE.md section 10 — no other tiebreakers).
 */
export async function getSeasonStandings(
  sb: SupabaseClient,
  currentWeek: number,
  season: number = CURRENT_SEASON,
): Promise<SeasonStandingRow[]> {
  const [profiles, wr] = await Promise.all([
    loadProfiles(sb),
    sb
      .from("weekly_results")
      .select("user_id, week, correct_picks, weekly_points, is_week_complete")
      .eq("season", season),
  ]);
  if (wr.error) throw wr.error;

  const rows = new Map<string, SeasonStandingRow>();
  const ensure = (userId: string): SeasonStandingRow => {
    let r = rows.get(userId);
    if (!r) {
      const p = profiles.get(userId);
      r = {
        userId,
        username: p?.username ?? "unknown",
        displayName: p?.display_name ?? null,
        label: labelOf(p),
        thisWeekCorrect: 0,
        seasonCorrect: 0,
        weeklyPoints: 0,
      };
      rows.set(userId, r);
    }
    return r;
  };

  // Seed every known profile so the board shows all players from day one.
  for (const [id] of profiles) ensure(id);

  for (const row of (wr.data ?? []) as WrRow[]) {
    const r = ensure(row.user_id);
    r.seasonCorrect += Number(row.correct_picks);
    r.weeklyPoints += Number(row.weekly_points);
    if (row.week === currentWeek) r.thisWeekCorrect = Number(row.correct_picks);
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.weeklyPoints - a.weeklyPoints || b.seasonCorrect - a.seasonCorrect,
  );
}

/** One week's standings, sorted by correct picks desc. */
export async function getWeeklyStandings(
  sb: SupabaseClient,
  week: number,
  season: number = CURRENT_SEASON,
): Promise<WeeklyStandingRow[]> {
  const [profiles, wr] = await Promise.all([
    loadProfiles(sb),
    sb
      .from("weekly_results")
      .select("user_id, week, correct_picks, weekly_points, is_week_complete")
      .eq("season", season)
      .eq("week", week),
  ]);
  if (wr.error) throw wr.error;

  const out: WeeklyStandingRow[] = ((wr.data ?? []) as WrRow[]).map((row) => ({
    userId: row.user_id,
    label: labelOf(profiles.get(row.user_id)),
    correctPicks: Number(row.correct_picks),
    weeklyPoints: Number(row.weekly_points),
    isWinner: Number(row.weekly_points) > 0,
    isWeekComplete: row.is_week_complete,
  }));

  return out.sort(
    (a, b) => b.correctPicks - a.correctPicks || a.label.localeCompare(b.label),
  );
}
