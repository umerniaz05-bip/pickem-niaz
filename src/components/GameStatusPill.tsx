import type { Game } from "@/lib/types";
import { formatKickoff } from "@/lib/format";

/**
 * Compact status for a game card.
 *  - scheduled & open  -> kickoff time
 *  - scheduled & locked -> "LOCKED"
 *  - live              -> "LIVE" + score
 *  - final             -> "FINAL" + score
 */
export function GameStatusPill({
  game,
  locked,
}: {
  game: Game;
  locked: boolean;
}) {
  const live =
    game.status === "in_progress" || game.status === "halftime";
  const final = game.status === "final";
  const scoreline =
    game.awayScore != null && game.homeScore != null
      ? `${game.awayScore}–${game.homeScore}`
      : null;

  if (final) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Final{scoreline ? <span className="tabular-nums">{scoreline}</span> : null}
      </span>
    );
  }

  if (live) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600 dark:bg-red-400"
        />
        Live{scoreline ? <span className="tabular-nums">{scoreline}</span> : null}
      </span>
    );
  }

  if (game.status === "postponed" || game.status === "canceled") {
    return (
      <span className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
        {game.status}
      </span>
    );
  }

  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        <LockIcon className="h-3 w-3" />
        Locked
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
      {formatKickoff(game.kickoffTime)}
    </span>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
