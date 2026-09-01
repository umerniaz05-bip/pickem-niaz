import { NextResponse } from "next/server";

import { CURRENT_SEASON } from "@/lib/config";
import { syncCurrentWeeks, syncWeek } from "@/lib/nfl/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * NFL sync endpoint. Called by Vercel Cron (GET with
 * `Authorization: Bearer $CRON_SECRET`) and usable manually with `?key=$CRON_SECRET`.
 *
 *   /api/sync                -> current open week + previous week
 *   /api/sync?week=3         -> just that week
 *   /api/sync?season=2026&week=3
 *
 * Fails closed: if CRON_SECRET is unset, every request is rejected.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season")) || CURRENT_SEASON;
  const weekParam = url.searchParams.get("week");

  const sb = createAdminClient();
  const results = weekParam
    ? [await syncWeek(sb, season, Number(weekParam))]
    : await syncCurrentWeeks(sb, season);

  const ok = results.every((r) => r.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 502 });
}

export const GET = handle;
export const POST = handle;
