"use client";

import { useCallback, useMemo, useState } from "react";

import { Countdown } from "@/components/Countdown";
import { GameCard, type SaveState } from "@/components/GameCard";
import { createClient } from "@/lib/supabase/client";
import { isGameLocked } from "@/lib/games";
import type { Game, Team } from "@/lib/types";

export function PicksBoard({
  week,
  games,
  teams,
  userId,
  initialPicks,
}: {
  week: number;
  games: Game[];
  teams: Record<string, Team>;
  userId: string;
  initialPicks: Record<string, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [picks, setPicks] = useState<Record<string, string>>(initialPicks);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});

  const setState = (gameId: string, s: SaveState) =>
    setSaveState((prev) => ({ ...prev, [gameId]: s }));

  const select = useCallback(
    async (game: Game, teamId: string) => {
      // Client-side lock guard; the DB enforces it authoritatively too.
      if (isGameLocked(game)) return;
      if (picks[game.id] === teamId && saveState[game.id] !== "error") return;

      const previous = picks[game.id];
      setPicks((prev) => ({ ...prev, [game.id]: teamId }));
      setState(game.id, "saving");

      const { error } = await supabase.from("picks").upsert(
        {
          user_id: userId,
          game_id: game.id,
          picked_team_id: teamId,
        },
        { onConflict: "user_id,game_id" },
      );

      if (error) {
        // Roll back the optimistic change — never leave a pick looking saved.
        setPicks((prev) => {
          const next = { ...prev };
          if (previous) next[game.id] = previous;
          else delete next[game.id];
          return next;
        });
        setState(game.id, "error");
        return;
      }

      setState(game.id, "saved");
      setTimeout(() => setState(game.id, "idle"), 2000);
    },
    [picks, saveState, supabase, userId],
  );

  const madeCount = games.filter((g) => picks[g.id]).length;

  const nextLock = useMemo(() => {
    const upcoming = games
      .filter(
        (g) =>
          !isGameLocked(g) &&
          g.status !== "canceled" &&
          g.status !== "postponed",
      )
      .sort(
        (a, b) =>
          new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime(),
      );
    return upcoming[0]?.kickoffTime ?? null;
  }, [games]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Week {week}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {madeCount} / {games.length}
          </span>{" "}
          picks complete
          {nextLock ? (
            <>
              {" · "}
              <Countdown target={nextLock} />
            </>
          ) : null}
        </p>
      </header>

      {games.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No games scheduled for this week yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              teams={teams}
              pickedTeamId={picks[game.id] ?? null}
              locked={isGameLocked(game)}
              saveState={saveState[game.id] ?? "idle"}
              onSelect={(teamId) => select(game, teamId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
