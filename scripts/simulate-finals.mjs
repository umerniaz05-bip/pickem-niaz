/**
 * Dev helper: mark a week's already-kicked-off games as FINAL with made-up
 * scores, then run idempotent scoring. Lets you see scoring + standings work
 * before the real NFL provider (Phase 4).
 *
 *   node --env-file=.env.local scripts/simulate-finals.mjs [--season 2026] [--week 1] [--all]
 *
 *   --all   also finalize games whose kickoff is still in the future
 *
 * Re-runnable. To undo, re-run scripts/seed-games.mjs (rebuilds the slate).
 */
import { createClient } from "@supabase/supabase-js";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}
const season = Number(arg("season", "2026"));
const week = Number(arg("week", "1"));
const all = process.argv.includes("--all");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: games, error } = await admin
  .from("games")
  .select("*")
  .eq("season", season)
  .eq("week", week)
  .order("kickoff_time");
if (error) throw error;

const now = Date.now();
const targets = games.filter(
  (g) =>
    g.status !== "final" &&
    (all || new Date(g.kickoff_time).getTime() <= now),
);

if (targets.length === 0) {
  console.log("Nothing to finalize.");
  process.exit(0);
}

for (const g of targets) {
  // deterministic-ish winner from the game id so re-runs are stable
  const homeWins = g.id.charCodeAt(0) % 2 === 0;
  const winner = homeWins ? g.home_team_id : g.away_team_id;
  const home = homeWins ? 24 : 17;
  const away = homeWins ? 20 : 27;

  const { error: uErr } = await admin
    .from("games")
    .update({
      status: "final",
      home_score: home,
      away_score: away,
      winner_team_id: winner,
      is_tie: false,
    })
    .eq("id", g.id);
  if (uErr) throw uErr;

  const { error: sErr } = await admin.rpc("score_game", { p_game_id: g.id });
  if (sErr) throw sErr;
  console.log(`  ${g.away_team_id} @ ${g.home_team_id} -> FINAL, winner ${winner}`);
}

await admin.rpc("finalize_week", { p_season: season, p_week: week });

const { count } = await admin
  .from("games")
  .select("id", { count: "exact", head: true })
  .eq("season", season)
  .eq("week", week)
  .neq("status", "final");
console.log(
  `Finalized ${targets.length} game(s). ${count} game(s) still open in week ${week}` +
    (count === 0 ? " — weekly points awarded." : " — weekly points pending."),
);
