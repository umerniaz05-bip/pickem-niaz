"use client";

import type { ReactNode } from "react";

import { GameStatusPill } from "@/components/GameStatusPill";
import { TeamOption } from "@/components/TeamOption";
import type { Game, Team } from "@/lib/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

function outcomeFor(
  game: Game,
  teamId: string,
): "correct" | "incorrect" | null {
  if (game.status !== "final") return null;
  if (game.isTie) return "correct"; // tie: both selections treated as correct
  if (!game.winnerTeamId) return null;
  return teamId === game.winnerTeamId ? "correct" : "incorrect";
}

export function GameCard({
  game,
  teams,
  pickedTeamId,
  locked,
  saveState,
  onSelect,
}: {
  game: Game;
  teams: Record<string, Team>;
  pickedTeamId: string | null;
  locked: boolean;
  saveState: SaveState;
  onSelect: (teamId: string) => void;
}) {
  const away = game.awayTeamId ? teams[game.awayTeamId] : undefined;
  const home = game.homeTeamId ? teams[game.homeTeamId] : undefined;
  if (!away || !home) return null;

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-center justify-between px-1">
        <GameStatusPill game={game} locked={locked} />
        <SaveIndicator locked={locked} hasPick={!!pickedTeamId} state={saveState} />
      </div>

      <div className="flex flex-col gap-2">
        <TeamOption
          team={away}
          selected={pickedTeamId === away.id}
          disabled={locked}
          outcome={pickedTeamId === away.id ? outcomeFor(game, away.id) : null}
          onSelect={() => onSelect(away.id)}
        />
        <div className="px-1 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          at
        </div>
        <TeamOption
          team={home}
          selected={pickedTeamId === home.id}
          disabled={locked}
          outcome={pickedTeamId === home.id ? outcomeFor(game, home.id) : null}
          onSelect={() => onSelect(home.id)}
        />
      </div>
    </li>
  );
}

function SaveIndicator({
  locked,
  hasPick,
  state,
}: {
  locked: boolean;
  hasPick: boolean;
  state: SaveState;
}) {
  const cls = "text-xs font-medium";
  let content: ReactNode = null;
  if (state === "saving")
    content = <span className="text-xs text-zinc-400">Saving…</span>;
  else if (state === "saved")
    content = (
      <span className={`${cls} text-green-600 dark:text-green-400`}>Saved ✓</span>
    );
  else if (state === "error")
    content = (
      <span className={`${cls} text-red-600 dark:text-red-400`}>
        Not saved — tap to retry
      </span>
    );
  else if (locked && !hasPick)
    content = <span className="text-xs text-zinc-400">No pick</span>;

  return (
    <span role="status" aria-live="polite">
      {content}
    </span>
  );
}
