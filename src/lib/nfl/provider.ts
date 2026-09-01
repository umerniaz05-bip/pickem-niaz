import { EspnProvider } from "@/lib/nfl/espn-provider";
import type { NflDataProvider } from "@/lib/nfl/types";

export type { NflDataProvider };

let cached: NflDataProvider | null = null;

/**
 * Returns the configured NFL data provider. Swap this factory (or branch on an
 * env var) to change feeds without touching sync/scoring/UI code.
 */
export function getNflProvider(): NflDataProvider {
  if (!cached) {
    cached = new EspnProvider();
  }
  return cached;
}

/** For tests: inject a fake provider. */
export function setNflProviderForTest(p: NflDataProvider | null) {
  cached = p;
}
