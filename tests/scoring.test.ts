import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
  AWAY,
  HOME,
  cleanupTestSeason,
  createGame,
  deleteUsers,
  ensureTestTeams,
  finalizeGame,
  finalizeWeek,
  getPick,
  getWeekly,
  makeUsers,
  setPick,
  unfinalizeGame,
} from "./helpers";

let users: string[] = [];
let weekCounter = 100;
const nextWeek = () => ++weekCounter;

beforeAll(async () => {
  await cleanupTestSeason();
  await ensureTestTeams();
  users = await makeUsers(3);
}, 30_000);

afterAll(async () => {
  await cleanupTestSeason();
  await deleteUsers(users);
});

describe("per-game scoring", () => {
  test("correct pick earns 1, wrong pick earns 0", async () => {
    const week = nextWeek();
    const g = await createGame({ week, kickoffOffsetMs: -1000 });
    await setPick(users[0], g, HOME);
    await setPick(users[1], g, AWAY);
    await finalizeGame(g, { winner: HOME });

    expect((await getPick(users[0], g)).pointsEarned).toBe(1);
    expect((await getPick(users[0], g)).isCorrect).toBe(true);
    expect((await getPick(users[1], g)).pointsEarned).toBe(0);
    expect((await getPick(users[1], g)).isCorrect).toBe(false);
  });

  test("reprocessing the same final game does not duplicate points", async () => {
    const week = nextWeek();
    const g = await createGame({ week, kickoffOffsetMs: -1000 });
    await setPick(users[0], g, HOME);
    await finalizeGame(g, { winner: HOME });
    await finalizeGame(g, { winner: HOME });
    await finalizeGame(g, { winner: HOME });

    expect((await getPick(users[0], g)).pointsEarned).toBe(1);
    expect((await getWeekly(users[0], week))?.correctPicks).toBe(1);
  });

  test("score correction flips affected picks", async () => {
    const week = nextWeek();
    const g = await createGame({ week, kickoffOffsetMs: -1000 });
    await setPick(users[0], g, HOME);
    await setPick(users[1], g, AWAY);

    await finalizeGame(g, { winner: HOME });
    expect((await getPick(users[0], g)).pointsEarned).toBe(1);
    expect((await getPick(users[1], g)).pointsEarned).toBe(0);

    // provider corrects the result
    await finalizeGame(g, { winner: AWAY });
    expect((await getPick(users[0], g)).pointsEarned).toBe(0);
    expect((await getPick(users[1], g)).pointsEarned).toBe(1);
    expect((await getWeekly(users[0], week))?.correctPicks).toBe(0);
    expect((await getWeekly(users[1], week))?.correctPicks).toBe(1);
  });

  test("a final game whose kickoff_time is still in the future still scores", async () => {
    // Backfill scenario: provider marks a game final before our kickoff_time.
    const week = nextWeek();
    const g = await createGame({ week, kickoffOffsetMs: 60 * 60 * 1000 });
    await setPick(users[0], g, HOME);
    await setPick(users[1], g, AWAY);
    await finalizeGame(g, { winner: HOME });

    expect((await getPick(users[0], g)).pointsEarned).toBe(1);
    expect((await getPick(users[1], g)).pointsEarned).toBe(0);
    expect(await getWeekly(users[0], week)).toMatchObject({
      correctPicks: 1,
      weeklyPoints: 1,
      isWeekComplete: true,
    });
  });

  test("actual tied NFL game: both selections count as correct", async () => {
    const week = nextWeek();
    const g = await createGame({ week, kickoffOffsetMs: -1000 });
    await setPick(users[0], g, HOME);
    await setPick(users[1], g, AWAY);
    await finalizeGame(g, { winner: null, isTie: true, homeScore: 20, awayScore: 20 });

    expect((await getPick(users[0], g)).pointsEarned).toBe(1);
    expect((await getPick(users[1], g)).pointsEarned).toBe(1);
  });
});

describe("weekly finalization", () => {
  test("sole first place receives 1 weekly point; others receive 0", async () => {
    const week = nextWeek();
    const games = [];
    for (let i = 0; i < 3; i++)
      games.push(await createGame({ week, kickoffOffsetMs: -1000 }));

    // u0: 3 correct, u1: 2 correct, u2: 1 correct
    await setPick(users[0], games[0], HOME);
    await setPick(users[0], games[1], HOME);
    await setPick(users[0], games[2], HOME);
    await setPick(users[1], games[0], HOME);
    await setPick(users[1], games[1], HOME);
    await setPick(users[1], games[2], AWAY);
    await setPick(users[2], games[0], HOME);
    await setPick(users[2], games[1], AWAY);
    await setPick(users[2], games[2], AWAY);

    for (const g of games) await finalizeGame(g, { winner: HOME });

    expect(await getWeekly(users[0], week)).toMatchObject({
      correctPicks: 3,
      weeklyPoints: 1,
      isWeekComplete: true,
    });
    expect((await getWeekly(users[1], week))?.weeklyPoints).toBe(0);
    expect((await getWeekly(users[2], week))?.weeklyPoints).toBe(0);
  });

  test("2-way first-place tie gives each 0.5", async () => {
    const week = nextWeek();
    const games = [];
    for (let i = 0; i < 3; i++)
      games.push(await createGame({ week, kickoffOffsetMs: -1000 }));

    await setPick(users[0], games[0], HOME);
    await setPick(users[0], games[1], HOME);
    await setPick(users[0], games[2], HOME);
    await setPick(users[1], games[0], HOME);
    await setPick(users[1], games[1], HOME);
    await setPick(users[1], games[2], HOME);
    await setPick(users[2], games[0], HOME);
    await setPick(users[2], games[1], HOME);
    await setPick(users[2], games[2], AWAY);

    for (const g of games) await finalizeGame(g, { winner: HOME });

    expect((await getWeekly(users[0], week))?.weeklyPoints).toBe(0.5);
    expect((await getWeekly(users[1], week))?.weeklyPoints).toBe(0.5);
    expect((await getWeekly(users[2], week))?.weeklyPoints).toBe(0);
  });

  test("3-way first-place tie gives each 0.5 (not split further)", async () => {
    const week = nextWeek();
    const games = [];
    for (let i = 0; i < 2; i++)
      games.push(await createGame({ week, kickoffOffsetMs: -1000 }));

    for (const u of users) {
      await setPick(u, games[0], HOME);
      await setPick(u, games[1], HOME);
    }
    for (const g of games) await finalizeGame(g, { winner: HOME });

    for (const u of users) {
      expect((await getWeekly(u, week))?.weeklyPoints).toBe(0.5);
    }
  });

  test("weekly points are not awarded until every game is final", async () => {
    const week = nextWeek();
    const g1 = await createGame({ week, kickoffOffsetMs: -1000 });
    const g2 = await createGame({ week, kickoffOffsetMs: -1000 });
    const g3 = await createGame({ week, kickoffOffsetMs: 60 * 60 * 1000 });

    await setPick(users[0], g1, HOME);
    await setPick(users[0], g2, HOME);
    await setPick(users[0], g3, HOME);

    await finalizeGame(g1, { winner: HOME });
    await finalizeGame(g2, { winner: HOME });

    let wr = await getWeekly(users[0], week);
    expect(wr?.correctPicks).toBe(2); // live total updates
    expect(wr?.weeklyPoints).toBe(0); // but no weekly point yet
    expect(wr?.isWeekComplete).toBe(false);

    await finalizeGame(g3, { winner: HOME });
    wr = await getWeekly(users[0], week);
    expect(wr?.correctPicks).toBe(3);
    expect(wr?.weeklyPoints).toBe(1);
    expect(wr?.isWeekComplete).toBe(true);
  });

  test("re-running finalization does not duplicate weekly points", async () => {
    const week = nextWeek();
    const g = await createGame({ week, kickoffOffsetMs: -1000 });
    await setPick(users[0], g, HOME);
    await finalizeGame(g, { winner: HOME });

    await finalizeWeek(week);
    await finalizeWeek(week);
    await finalizeWeek(week);

    expect((await getWeekly(users[0], week))?.weeklyPoints).toBe(1);
  });

  test("un-finalizing a game revokes the weekly point until complete again", async () => {
    const week = nextWeek();
    const g = await createGame({ week, kickoffOffsetMs: -1000 });
    await setPick(users[0], g, HOME);
    await finalizeGame(g, { winner: HOME });
    expect((await getWeekly(users[0], week))?.weeklyPoints).toBe(1);

    await unfinalizeGame(g);
    const wr = await getWeekly(users[0], week);
    expect(wr?.weeklyPoints).toBe(0);
    expect(wr?.isWeekComplete).toBe(false);
  });
});
