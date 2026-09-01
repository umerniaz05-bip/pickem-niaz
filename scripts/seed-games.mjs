/**
 * Seed a test Week 1 slate so the picks UI is usable before the real NFL
 * provider (Phase 4). Kickoff times are relative to "now" so pick-locking and
 * the "next lock" countdown are demoable.
 *
 *   node --env-file=.env.local scripts/seed-games.mjs [--season 2026] [--week 1]
 *
 * Re-running replaces that week's games (and any picks on them).
 */
import { createClient } from "@supabase/supabase-js";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

const season = Number(arg("season", "2026"));
const week = Number(arg("week", "1"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Run with: node --env-file=.env.local scripts/seed-games.mjs");
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = Date.now();

// away, home, offsetFromNow(ms), status, [awayScore, homeScore]
const SLATE = [
  ["KC", "LAC", -150 * MIN, "in_progress", [17, 13]],
  ["PHI", "DAL", -35 * MIN, "in_progress", [3, 0]],
  ["BUF", "MIA", 25 * MIN, "scheduled", null], // locks very soon
  ["BAL", "CIN", 2 * DAY + 13 * HOUR, "scheduled", null],
  ["DET", "GB", 2 * DAY + 13 * HOUR, "scheduled", null],
  ["HOU", "IND", 2 * DAY + 13 * HOUR, "scheduled", null],
  ["NYJ", "NE", 2 * DAY + 13 * HOUR, "scheduled", null],
  ["JAX", "TEN", 2 * DAY + 13 * HOUR, "scheduled", null],
  ["PIT", "CLE", 2 * DAY + 13 * HOUR, "scheduled", null],
  ["MIN", "CHI", 2 * DAY + 16 * HOUR + 25 * MIN, "scheduled", null],
  ["TB", "NO", 2 * DAY + 16 * HOUR + 25 * MIN, "scheduled", null],
  ["LAR", "ARI", 2 * DAY + 16 * HOUR + 25 * MIN, "scheduled", null],
  ["DEN", "LV", 2 * DAY + 16 * HOUR + 25 * MIN, "scheduled", null],
  ["WAS", "NYG", 2 * DAY + 20 * HOUR + 20 * MIN, "scheduled", null], // SNF
  ["SF", "SEA", 3 * DAY + 20 * HOUR + 15 * MIN, "scheduled", null], // MNF
  ["ATL", "CAR", 3 * DAY + 20 * HOUR + 15 * MIN, "scheduled", null], // MNF
];

// Wipe any existing games for this season/week (picks cascade).
const { data: existing } = await admin
  .from("games")
  .select("id")
  .eq("season", season)
  .eq("week", week);
if (existing?.length) {
  await admin.from("games").delete().eq("season", season).eq("week", week);
  console.log(`Removed ${existing.length} existing game(s) for ${season} wk ${week}`);
}

const rows = SLATE.map(([away, home, offset, status, score]) => {
  const kickoff = new Date(now + offset).toISOString();
  const final = status === "final";
  return {
    external_game_id: `SEED-${season}-W${week}-${away}${home}`,
    season,
    season_type: "regular",
    week,
    away_team_id: away,
    home_team_id: home,
    away_score: score ? score[0] : null,
    home_score: score ? score[1] : null,
    kickoff_time: kickoff,
    status,
    winner_team_id:
      final && score
        ? score[1] > score[0]
          ? home
          : score[0] > score[1]
            ? away
            : null
        : null,
    is_tie: final && score ? score[0] === score[1] : false,
  };
});

const { error } = await admin.from("games").insert(rows);
if (error) {
  console.error("insert failed:", error.message);
  process.exit(1);
}
console.log(`Seeded ${rows.length} games for ${season} week ${week}.`);
console.log(
  `  ${rows.filter((r) => new Date(r.kickoff_time) <= new Date()).length} already locked, ` +
    `${rows.filter((r) => new Date(r.kickoff_time) > new Date()).length} open.`,
);
