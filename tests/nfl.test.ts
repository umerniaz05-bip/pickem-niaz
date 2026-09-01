import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { normalizeEspnEvent } from "@/lib/nfl/normalize";
import { syncWeek } from "@/lib/nfl/sync";
import type { NflDataProvider } from "@/lib/nfl/types";
import type { NflGame } from "@/lib/types";

import {
  AWAY,
  HOME,
  TEST_SEASON,
  admin,
  cleanupTestSeason,
  deleteUsers,
  ensureTestTeams,
  getPick,
  makeUsers,
  setPick,
} from "./helpers";

// --- normalize (pure, no network) ----------------------------------------

const fallback = { season: 2026, week: 1 };

describe("normalizeEspnEvent", () => {
  test("maps a scheduled game and applies team-id overrides (WSH -> WAS)", () => {
    const g = normalizeEspnEvent(
      {
        id: "401",
        date: "2026-09-10T17:00Z",
        season: { year: 2026, type: 2 },
        week: { number: 2 },
        competitions: [
          {
            date: "2026-09-10T17:00Z",
            status: { type: { name: "STATUS_SCHEDULED", state: "pre" } },
            competitors: [
              { homeAway: "home", team: { abbreviation: "WSH" }, score: "0" },
              { homeAway: "away", team: { abbreviation: "DAL" }, score: "0" },
            ],
          },
        ],
      },
      fallback,
    );
    expect(g).toMatchObject({
      externalGameId: "401",
      season: 2026,
      week: 2,
      homeTeamId: "WAS",
      awayTeamId: "DAL",
      status: "scheduled",
      winnerTeamId: null,
      isTie: false,
    });
  });

  test("final game records the winner", () => {
    const g = normalizeEspnEvent(
      {
        id: "402",
        competitions: [
          {
            date: "2026-09-10T17:00Z",
            status: { type: { name: "STATUS_FINAL", state: "post", completed: true } },
            competitors: [
              { homeAway: "home", team: { abbreviation: "KC" }, score: "27", winner: true },
              { homeAway: "away", team: { abbreviation: "BUF" }, score: "24", winner: false },
            ],
          },
        ],
      },
      fallback,
    );
    expect(g).toMatchObject({ status: "final", winnerTeamId: "KC", isTie: false, homeScore: 27, awayScore: 24 });
  });

  test("final game with equal scores and no winner flag is a tie", () => {
    const g = normalizeEspnEvent(
      {
        id: "403",
        competitions: [
          {
            date: "2026-09-10T17:00Z",
            status: { type: { name: "STATUS_FINAL", completed: true } },
            competitors: [
              { homeAway: "home", team: { abbreviation: "NYG" }, score: "20" },
              { homeAway: "away", team: { abbreviation: "PHI" }, score: "20" },
            ],
          },
        ],
      },
      fallback,
    );
    expect(g).toMatchObject({ status: "final", isTie: true, winnerTeamId: null });
  });

  test("unusable events (no id / no teams) normalize to null", () => {
    expect(normalizeEspnEvent({ competitions: [{}] }, fallback)).toBeNull();
    expect(
      normalizeEspnEvent(
        {
          id: "404",
          competitions: [
            { date: "2026-09-10T17:00Z", competitors: [{ homeAway: "home" }] },
          ],
        },
        fallback,
      ),
    ).toBeNull();
  });
});

// --- syncWeek (integration, sandbox season) -----------------------------

class FakeProvider implements NflDataProvider {
  constructor(private games: NflGame[]) {}
  async getSchedule() {
    return this.games;
  }
  async getGame() {
    return null;
  }
  async getLiveGames() {
    return [];
  }
}

class ThrowingProvider implements NflDataProvider {
  async getSchedule(): Promise<NflGame[]> {
    throw new Error("provider boom");
  }
  async getGame() {
    return null;
  }
  async getLiveGames() {
    return [];
  }
}

function nflGame(
  o: Partial<NflGame> & { externalGameId: string; week: number },
): NflGame {
  return {
    season: TEST_SEASON,
    seasonType: "regular",
    homeTeamId: HOME,
    awayTeamId: AWAY,
    homeScore: null,
    awayScore: null,
    kickoffTime: new Date(Date.now() + 3_600_000).toISOString(),
    status: "scheduled",
    winnerTeamId: null,
    isTie: false,
    ...o,
  };
}

async function gameIdFor(externalGameId: string): Promise<string> {
  const { data } = await admin
    .from("games")
    .select("id")
    .eq("external_game_id", externalGameId)
    .single();
  return data!.id as string;
}

let users: string[] = [];

describe("syncWeek", () => {
  beforeAll(async () => {
    await cleanupTestSeason();
    await ensureTestTeams();
    users = await makeUsers(1);
  }, 30_000);

  afterAll(async () => {
    await cleanupTestSeason();
    await deleteUsers(users);
  });

  test("inserts new games, and is a no-op on an unchanged re-run", async () => {
    const week = 300;
    const provider = new FakeProvider([
      nflGame({ externalGameId: "SW-1", week }),
      nflGame({ externalGameId: "SW-2", week }),
    ]);

    const first = await syncWeek(admin, TEST_SEASON, week, provider);
    expect(first).toMatchObject({ ok: true, inserted: 2, updated: 0, scored: 0 });

    const second = await syncWeek(admin, TEST_SEASON, week, provider);
    expect(second).toMatchObject({ ok: true, inserted: 0, updated: 0, scored: 0 });
  });

  test("scores picks when a game transitions to final", async () => {
    const week = 301;
    await syncWeek(
      admin,
      TEST_SEASON,
      week,
      new FakeProvider([nflGame({ externalGameId: "SW-F", week })]),
    );

    const gid = await gameIdFor("SW-F");
    await setPick(users[0], gid, HOME);

    const res = await syncWeek(
      admin,
      TEST_SEASON,
      week,
      new FakeProvider([
        nflGame({
          externalGameId: "SW-F",
          week,
          status: "final",
          winnerTeamId: HOME,
          homeScore: 21,
          awayScore: 10,
          kickoffTime: new Date(Date.now() - 3_600_000).toISOString(),
        }),
      ]),
    );

    expect(res).toMatchObject({ ok: true, updated: 1, scored: 1 });
    expect((await getPick(users[0], gid)).pointsEarned).toBe(1);
  });

  test("provider failure returns ok:false without throwing", async () => {
    const res = await syncWeek(
      admin,
      TEST_SEASON,
      302,
      new ThrowingProvider(),
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("boom");
    expect(res.inserted).toBe(0);
  });

  test("games referencing unknown teams are skipped, not inserted", async () => {
    const week = 303;
    const res = await syncWeek(
      admin,
      TEST_SEASON,
      week,
      new FakeProvider([
        nflGame({ externalGameId: "SW-OK", week }),
        nflGame({ externalGameId: "SW-BAD", week, homeTeamId: "ZZZ" }),
      ]),
    );
    expect(res.inserted).toBe(1);
    expect(res.skipped.some((s) => s.includes("SW-BAD"))).toBe(true);

    const { count } = await admin
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("external_game_id", "SW-BAD");
    expect(count).toBe(0);
  });
});
