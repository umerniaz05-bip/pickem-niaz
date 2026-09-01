// Application-level types. These are the shapes the app/UI depends on — the NFL
// provider adapter is responsible for normalising external data into these.

export type GameStatus =
  | "scheduled"
  | "pregame"
  | "in_progress"
  | "halftime"
  | "final"
  | "postponed"
  | "canceled";

export type SeasonType = "preseason" | "regular" | "postseason";

export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Team {
  id: string;
  name: string;
  city: string | null;
  abbreviation: string;
  logoUrl: string | null;
  conference: string | null;
  division: string | null;
}

export interface Game {
  id: string;
  externalGameId: string;
  season: number;
  seasonType: SeasonType;
  week: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  kickoffTime: string; // ISO 8601 UTC
  status: GameStatus;
  winnerTeamId: string | null;
  isTie: boolean;
}

export interface Pick {
  id: string;
  userId: string;
  gameId: string;
  pickedTeamId: string;
  pointsEarned: number;
  isCorrect: boolean | null;
}

export interface WeeklyResult {
  userId: string;
  season: number;
  week: number;
  correctPicks: number;
  weeklyPoints: number;
  isWeekComplete: boolean;
}

export interface WeeklyStanding {
  userId: string;
  username: string;
  displayName: string | null;
  correctPicks: number;
  weeklyPoints: number;
}

/** Normalised game as produced by an NflDataProvider adapter (see lib/nfl). */
export interface NflGame {
  externalGameId: string;
  season: number;
  seasonType: SeasonType;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  kickoffTime: string; // ISO 8601 UTC
  status: GameStatus;
  winnerTeamId: string | null;
  isTie: boolean;
}
