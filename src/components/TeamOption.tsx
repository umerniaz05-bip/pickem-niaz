"use client";

import type { Team } from "@/lib/types";

type Outcome = "correct" | "incorrect" | null;

export function TeamOption({
  team,
  selected,
  disabled,
  outcome = null,
  onSelect,
}: {
  team: Team;
  selected: boolean;
  disabled: boolean;
  outcome?: Outcome;
  onSelect: () => void;
}) {
  const base =
    "group relative flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-colors touch-manipulation min-h-16";

  const state = selected
    ? outcome === "correct"
      ? "border-green-500 bg-green-50 dark:bg-green-950/40"
      : outcome === "incorrect"
        ? "border-red-500 bg-red-50 dark:bg-red-950/40"
        : "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`${base} ${state} ${disabled ? "cursor-default opacity-60" : "cursor-pointer active:scale-[0.99]"}`}
    >
      {team.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logoUrl}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 object-contain"
          loading="lazy"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold dark:bg-zinc-700">
          {team.abbreviation}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
          {team.city}
        </span>
        <span className="block truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {team.name}
        </span>
      </span>

      {selected ? (
        <span
          className={`shrink-0 text-sm font-bold ${
            outcome === "correct"
              ? "text-green-600 dark:text-green-400"
              : outcome === "incorrect"
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-900 dark:text-zinc-100"
          }`}
          aria-hidden="true"
        >
          {outcome === "correct" ? "✓" : outcome === "incorrect" ? "✗" : "●"}
        </span>
      ) : null}
    </button>
  );
}
