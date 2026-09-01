/** App-wide constants. Kept tiny and explicit for a ~5-user family app. */

/** The NFL season the app is currently running. */
export const CURRENT_SEASON = 2026;

/** Regular season is the only season_type that counts (CLAUDE.md section 7). */
export const COUNTING_SEASON_TYPE = "regular" as const;

/** NFL regular season week range. */
export const FIRST_WEEK = 1;
export const LAST_WEEK = 18;
