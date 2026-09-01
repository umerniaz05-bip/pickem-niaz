import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AWAY,
  HOME,
  admin,
  anonClient,
  cleanupTestSeason,
  createGame,
  deleteUsers,
  ensureTestTeams,
  makeUserClient,
} from "./helpers";

let u1: { id: string; client: SupabaseClient };
let u2: { id: string; client: SupabaseClient };
let gameId: string;
const createdUserIds: string[] = [];

beforeAll(async () => {
  await cleanupTestSeason();
  await ensureTestTeams();
  u1 = await makeUserClient();
  u2 = await makeUserClient();
  createdUserIds.push(u1.id, u2.id);
  gameId = await createGame({ week: 900, kickoffOffsetMs: 60 * 60 * 1000 });
}, 40_000);

afterAll(async () => {
  await cleanupTestSeason();
  await deleteUsers(createdUserIds);
});

describe("logged-out access", () => {
  test("anon cannot read games, profiles or weekly_results", async () => {
    const anon = anonClient();
    for (const table of ["games", "profiles", "weekly_results", "picks"]) {
      const { data } = await anon.from(table).select("*").limit(5);
      expect(data ?? []).toHaveLength(0);
    }
  });

  test("anon cannot insert a pick", async () => {
    const anon = anonClient();
    const { error } = await anon
      .from("picks")
      .insert({ user_id: u1.id, game_id: gameId, picked_team_id: HOME });
    expect(error).not.toBeNull();
  });
});

describe("profiles", () => {
  test("a user can update their own username", async () => {
    const name = `u1_${Date.now().toString().slice(-6)}`;
    const { error } = await u1.client
      .from("profiles")
      .update({ username: name })
      .eq("id", u1.id);
    expect(error).toBeNull();

    const { data } = await admin
      .from("profiles")
      .select("username")
      .eq("id", u1.id)
      .single();
    expect(data?.username).toBe(name);
  });

  test("a user cannot edit another user's profile", async () => {
    const { data: before } = await admin
      .from("profiles")
      .select("username")
      .eq("id", u2.id)
      .single();

    await u1.client
      .from("profiles")
      .update({ username: "hijacked" })
      .eq("id", u2.id);

    const { data: after } = await admin
      .from("profiles")
      .select("username")
      .eq("id", u2.id)
      .single();
    expect(after?.username).toBe(before?.username);
  });
});

describe("games & scoring are read-only to the browser", () => {
  test("a user cannot change a game score", async () => {
    await u1.client
      .from("games")
      .update({ home_score: 99, status: "final", winner_team_id: HOME })
      .eq("id", gameId);

    const { data } = await admin
      .from("games")
      .select("home_score, status")
      .eq("id", gameId)
      .single();
    expect(data?.home_score).toBeNull();
    expect(data?.status).toBe("scheduled");
  });

  test("a user cannot award themselves weekly points", async () => {
    const { error } = await u1.client
      .from("weekly_results")
      .insert({ user_id: u1.id, season: 9999, week: 900, weekly_points: 99 });
    expect(error).not.toBeNull();
  });

  test("a user cannot call the scoring RPCs", async () => {
    const a = await u1.client.rpc("score_game", { p_game_id: gameId });
    expect(a.error).not.toBeNull();
    const b = await u1.client.rpc("finalize_week", {
      p_season: 9999,
      p_week: 900,
    });
    expect(b.error).not.toBeNull();
  });
});

describe("picks", () => {
  test("a user cannot create a pick for someone else", async () => {
    const { error } = await u1.client
      .from("picks")
      .insert({ user_id: u2.id, game_id: gameId, picked_team_id: HOME });
    expect(error).not.toBeNull();
  });

  test("a user cannot pick a team that is not in the matchup", async () => {
    const { error } = await u1.client
      .from("picks")
      .insert({ user_id: u1.id, game_id: gameId, picked_team_id: "KC" });
    expect(error).not.toBeNull();
  });

  test("only one pick per user per game", async () => {
    await u2.client
      .from("picks")
      .insert({ user_id: u2.id, game_id: gameId, picked_team_id: HOME });
    const { error } = await u2.client
      .from("picks")
      .insert({ user_id: u2.id, game_id: gameId, picked_team_id: AWAY });
    expect(error).not.toBeNull();
  });

  test("client-set points_earned is ignored (forced to 0)", async () => {
    await u1.client.from("picks").insert({
      user_id: u1.id,
      game_id: gameId,
      picked_team_id: HOME,
      points_earned: 5,
      is_correct: true,
    });
    const { data } = await admin
      .from("picks")
      .select("points_earned, is_correct")
      .eq("user_id", u1.id)
      .eq("game_id", gameId)
      .single();
    expect(Number(data?.points_earned)).toBe(0);
    expect(data?.is_correct).toBeNull();
  });
});
