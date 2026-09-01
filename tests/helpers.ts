import { createClient, type SupabaseClient } from "@supabase/supabase-js";

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  throw new Error(
    "Tests need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and " +
      "SUPABASE_SERVICE_ROLE_KEY. Run via: npm test (uses node --env-file=.env.local)",
  );
}

const SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const admin: SupabaseClient = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** An anon client with no session — represents a logged-out browser. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  });
}

/** Create a user and return a client already signed in as them. */
export async function makeUserClient(): Promise<{
  id: string;
  email: string;
  client: SupabaseClient;
}> {
  const email = `rls-test-${crypto.randomUUID()}@pickem.test`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return { id: data.user.id, email, client };
}

/** Sandbox season — never collides with real data. */
export const TEST_SEASON = 9999;

export const HOME = "TST-HOME";
export const AWAY = "TST-AWAY";

export async function ensureTestTeams() {
  const { error } = await admin.from("teams").upsert([
    { id: HOME, name: "Home", city: "Test", abbreviation: "TSTH" },
    { id: AWAY, name: "Away", city: "Test", abbreviation: "TSTA" },
  ]);
  if (error) throw error;
}

export async function makeUsers(n: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const email = `scoring-test-${crypto.randomUUID()}@pickem.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (error) throw error;
    ids.push(data.user.id);
  }
  return ids;
}

export async function deleteUsers(ids: string[]) {
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id);
  }
}

type GameOpts = {
  week: number;
  status?: string;
  kickoffOffsetMs?: number;
  winner?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  isTie?: boolean;
};

export async function createGame(opts: GameOpts): Promise<string> {
  const {
    week,
    status = "scheduled",
    kickoffOffsetMs = 60 * 60 * 1000,
    winner = null,
    homeScore = null,
    awayScore = null,
    isTie = false,
  } = opts;

  const { data, error } = await admin
    .from("games")
    .insert({
      external_game_id: `TEST-${crypto.randomUUID()}`,
      season: TEST_SEASON,
      season_type: "regular",
      week,
      home_team_id: HOME,
      away_team_id: AWAY,
      home_score: homeScore,
      away_score: awayScore,
      kickoff_time: new Date(Date.now() + kickoffOffsetMs).toISOString(),
      status,
      winner_team_id: winner,
      is_tie: isTie,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function setPick(userId: string, gameId: string, teamId: string) {
  const { error } = await admin
    .from("picks")
    .upsert(
      { user_id: userId, game_id: gameId, picked_team_id: teamId },
      { onConflict: "user_id,game_id" },
    );
  if (error) throw error;
}

export async function finalizeGame(
  gameId: string,
  result: { winner: string | null; isTie?: boolean; homeScore?: number; awayScore?: number },
) {
  const { error } = await admin
    .from("games")
    .update({
      status: "final",
      winner_team_id: result.winner,
      is_tie: result.isTie ?? false,
      home_score: result.homeScore ?? (result.winner === HOME ? 20 : 17),
      away_score: result.awayScore ?? (result.winner === AWAY ? 20 : 17),
    })
    .eq("id", gameId);
  if (error) throw error;
  await scoreGame(gameId);
}

export async function unfinalizeGame(gameId: string) {
  const { error } = await admin
    .from("games")
    .update({ status: "scheduled", winner_team_id: null, is_tie: false })
    .eq("id", gameId);
  if (error) throw error;
  await scoreGame(gameId);
}

export async function scoreGame(gameId: string) {
  const { error } = await admin.rpc("score_game", { p_game_id: gameId });
  if (error) throw error;
}

export async function finalizeWeek(week: number) {
  const { error } = await admin.rpc("finalize_week", {
    p_season: TEST_SEASON,
    p_week: week,
  });
  if (error) throw error;
}

export async function getWeekly(userId: string, week: number) {
  const { data, error } = await admin
    .from("weekly_results")
    .select("correct_picks, weekly_points, is_week_complete")
    .eq("user_id", userId)
    .eq("season", TEST_SEASON)
    .eq("week", week)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        correctPicks: Number(data.correct_picks),
        weeklyPoints: Number(data.weekly_points),
        isWeekComplete: data.is_week_complete as boolean,
      }
    : null;
}

export async function getPick(userId: string, gameId: string) {
  const { data, error } = await admin
    .from("picks")
    .select("points_earned, is_correct")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .single();
  if (error) throw error;
  return {
    pointsEarned: Number(data.points_earned),
    isCorrect: data.is_correct as boolean | null,
  };
}

export async function cleanupTestSeason() {
  // picks cascade from games; weekly_results is keyed by season/week.
  await admin.from("games").delete().eq("season", TEST_SEASON);
  await admin.from("weekly_results").delete().eq("season", TEST_SEASON);
}
