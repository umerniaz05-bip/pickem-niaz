import type { NflGame } from "@/lib/types";
import { normalizeEspnScoreboard, type EspnEvent } from "@/lib/nfl/normalize";
import type { NflDataProvider } from "@/lib/nfl/types";

const DEFAULT_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

/**
 * Adapter for ESPN's public (unofficial) scoreboard endpoint. This file is the
 * ONLY place that knows ESPN's response structure.
 */
export class EspnProvider implements NflDataProvider {
  private readonly base: string;

  constructor(base = process.env.NFL_API_BASE_URL || DEFAULT_BASE) {
    this.base = base.replace(/\/$/, "");
  }

  private async fetchScoreboard(params: URLSearchParams): Promise<EspnEvent[]> {
    const url = `${this.base}/scoreboard?${params.toString()}`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // never serve stale scores from a CDN cache
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`ESPN ${res.status} ${res.statusText} for ${url}`);
    }
    const json = (await res.json()) as { events?: EspnEvent[] };
    return json.events ?? [];
  }

  async getSchedule(season: number, week: number): Promise<NflGame[]> {
    const params = new URLSearchParams({
      dates: String(season),
      seasontype: "2", // regular season
      week: String(week),
    });
    const events = await this.fetchScoreboard(params);
    return normalizeEspnScoreboard({ events }, { season, week });
  }

  async getGame(externalGameId: string): Promise<NflGame | null> {
    // The scoreboard endpoint also accepts a single event id via `event`.
    const events = await this.fetchScoreboard(
      new URLSearchParams({ event: externalGameId }),
    );
    const games = normalizeEspnScoreboard(
      { events },
      { season: new Date().getUTCFullYear(), week: 1 },
    );
    return games.find((g) => g.externalGameId === externalGameId) ?? games[0] ?? null;
  }

  async getLiveGames(): Promise<NflGame[]> {
    // No params -> ESPN returns the current scoreboard (today's / this week's).
    const events = await this.fetchScoreboard(new URLSearchParams());
    const now = new Date();
    return normalizeEspnScoreboard(
      { events },
      { season: now.getUTCFullYear(), week: 1 },
    );
  }
}
