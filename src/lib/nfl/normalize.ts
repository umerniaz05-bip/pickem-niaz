import type { NflGame } from "@/lib/types";
import { REGULAR, statusFromProvider } from "@/lib/nfl/types";

/**
 * ESPN team abbreviation -> our teams.id. Almost 1:1; only a few differ.
 */
const TEAM_ID_OVERRIDES: Record<string, string> = {
  WSH: "WAS",
};

export function teamId(espnAbbr: string | undefined | null): string | null {
  if (!espnAbbr) return null;
  const up = espnAbbr.toUpperCase();
  return TEAM_ID_OVERRIDES[up] ?? up;
}

// --- minimal shape of the ESPN scoreboard payload we rely on ---------------

export interface EspnCompetitor {
  homeAway: "home" | "away";
  team?: { abbreviation?: string };
  score?: string | number;
  winner?: boolean;
}

export interface EspnCompetition {
  date?: string;
  competitors?: EspnCompetitor[];
  status?: {
    type?: { name?: string; state?: string; completed?: boolean };
  };
}

export interface EspnEvent {
  id?: string;
  date?: string;
  season?: { year?: number; type?: number };
  week?: { number?: number };
  competitions?: EspnCompetition[];
}

function toScore(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalise one ESPN event to our NflGame, or null if it is unusable
 * (missing id/teams/kickoff). Never throws on shape drift.
 */
export function normalizeEspnEvent(
  event: EspnEvent,
  fallback: { season: number; week: number },
): NflGame | null {
  const comp = event.competitions?.[0];
  if (!event.id || !comp) return null;

  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  const homeTeamId = teamId(home?.team?.abbreviation);
  const awayTeamId = teamId(away?.team?.abbreviation);
  const kickoffTime = comp.date ?? event.date;
  if (!homeTeamId || !awayTeamId || !kickoffTime) return null;

  const status = statusFromProvider(event.competitions?.[0]?.status?.type ?? {});
  const homeScore = toScore(home?.score);
  const awayScore = toScore(away?.score);

  let winnerTeamId: string | null = null;
  let isTie = false;
  if (status === "final") {
    if (home?.winner) winnerTeamId = homeTeamId;
    else if (away?.winner) winnerTeamId = awayTeamId;
    else if (homeScore !== null && awayScore !== null && homeScore === awayScore)
      isTie = true;
    else if (homeScore !== null && awayScore !== null)
      winnerTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;
  }

  return {
    externalGameId: String(event.id),
    season: event.season?.year ?? fallback.season,
    seasonType: REGULAR,
    week: event.week?.number ?? fallback.week,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    kickoffTime: new Date(kickoffTime).toISOString(),
    status,
    winnerTeamId,
    isTie,
  };
}

export function normalizeEspnScoreboard(
  payload: { events?: EspnEvent[] },
  fallback: { season: number; week: number },
): NflGame[] {
  return (payload.events ?? [])
    .map((e) => normalizeEspnEvent(e, fallback))
    .filter((g): g is NflGame => g !== null);
}
