import type { GameStatus, NflGame, SeasonType } from "@/lib/types";

export type { NflGame };

/**
 * The only surface the rest of the app depends on for NFL data. Swap the
 * implementation (ESPN, a paid feed, a fixture) without touching callers.
 */
export interface NflDataProvider {
  /** Full schedule for one season + week, normalised to our shape. */
  getSchedule(season: number, week: number): Promise<NflGame[]>;
  /** A single game by its provider id. */
  getGame(externalGameId: string): Promise<NflGame | null>;
  /** Games currently in progress / recently final across the league. */
  getLiveGames(): Promise<NflGame[]>;
}

/** Raw-ish status hint a provider can hand the normaliser. */
export interface ProviderStatusInput {
  name?: string; // e.g. "STATUS_FINAL"
  state?: string; // "pre" | "in" | "post"
  completed?: boolean;
}

export const REGULAR: SeasonType = "regular";

export function statusFromProvider(s: ProviderStatusInput): GameStatus {
  switch (s.name) {
    case "STATUS_SCHEDULED":
      return "scheduled";
    case "STATUS_IN_PROGRESS":
    case "STATUS_END_PERIOD":
    case "STATUS_DELAYED":
      return "in_progress";
    case "STATUS_HALFTIME":
      return "halftime";
    case "STATUS_FINAL":
    case "STATUS_FINAL_OVERTIME":
    case "STATUS_FINAL_PEN":
      return "final";
    case "STATUS_POSTPONED":
      return "postponed";
    case "STATUS_CANCELED":
    case "STATUS_CANCELLED":
      return "canceled";
  }
  if (s.completed) return "final";
  if (s.state === "in") return "in_progress";
  if (s.state === "post") return "final";
  return "scheduled";
}
