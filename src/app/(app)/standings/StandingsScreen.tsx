import { redirect } from "next/navigation";

import { AutoRefresh } from "@/components/AutoRefresh";
import { StandingsTabs } from "@/components/StandingsTabs";
import { resolveCurrentWeek } from "@/lib/games";
import {
  getSeasonStandings,
  getWeeklyStandings,
} from "@/lib/scoring/leaderboard";
import { createClient } from "@/lib/supabase/server";

export async function StandingsScreen({ week }: { week?: number }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentWeek = await resolveCurrentWeek(supabase);
  const mode: "season" | number = week ?? "season";

  return (
    <main className="flex flex-1 flex-col gap-4 py-2">
      <AutoRefresh />
      <StandingsTabs mode={mode} />
      {mode === "season" ? (
        <SeasonTable supabase={supabase} currentWeek={currentWeek} youId={user.id} />
      ) : (
        <WeekTable supabase={supabase} week={mode} youId={user.id} />
      )}
    </main>
  );
}

async function SeasonTable({
  supabase,
  currentWeek,
  youId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  currentWeek: number;
  youId: string;
}) {
  const rows = await getSeasonStandings(supabase, currentWeek);
  const anyPoints = rows.some((r) => r.weeklyPoints > 0 || r.seasonCorrect > 0);

  return (
    <section>
      <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Season standings
      </h1>
      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
        Ranked by weekly points, then season correct picks. &ldquo;This
        week&rdquo; is Week {currentWeek}.
      </p>

      {!anyPoints ? (
        <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No scored games yet. Standings fill in as games go final.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
                <th className="py-2 pr-2 font-medium">#</th>
                <th className="py-2 pr-2 font-medium">Player</th>
                <th className="py-2 pr-2 text-right font-medium">Wk</th>
                <th className="py-2 pr-2 text-right font-medium">Season</th>
                <th className="py-2 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.userId}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="py-2.5 pr-2 tabular-nums text-zinc-400">
                    {i + 1}
                  </td>
                  <td
                    className={`py-2.5 pr-2 ${
                      r.userId === youId
                        ? "font-semibold text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {r.label}
                    {r.userId === youId ? " (you)" : ""}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                    {r.thisWeekCorrect}
                  </td>
                  <td className="py-2.5 pr-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                    {r.seasonCorrect}
                  </td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {r.weeklyPoints.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

async function WeekTable({
  supabase,
  week,
  youId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  week: number;
  youId: string;
}) {
  const rows = await getWeeklyStandings(supabase, week);
  const complete = rows.length > 0 && rows.every((r) => r.isWeekComplete);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Week {week}
        </h1>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {rows.length === 0
            ? "no picks"
            : complete
              ? "final"
              : "in progress"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No picks recorded for this week.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
          {rows.map((r, i) => (
            <li
              key={r.userId}
              className="flex items-center justify-between py-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="w-5 tabular-nums text-zinc-400">{i + 1}</span>
                <span
                  className={
                    r.userId === youId
                      ? "font-semibold text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-700 dark:text-zinc-300"
                  }
                >
                  {r.label}
                  {r.userId === youId ? " (you)" : ""}
                </span>
                {r.isWinner ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    +{r.weeklyPoints.toFixed(1)}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {r.correctPicks}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
