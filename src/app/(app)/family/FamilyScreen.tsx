import { redirect } from "next/navigation";

import { GameStatusPill } from "@/components/GameStatusPill";
import { WeekSelector } from "@/components/WeekSelector";
import {
  getTeams,
  getVisiblePicksForGames,
  getWeekGames,
  isGameLocked,
  resolveCurrentWeek,
} from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import type { Game, Team } from "@/lib/types";

type Member = { id: string; label: string };

export async function FamilyScreen({ week }: { week?: number }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resolvedWeek = week ?? (await resolveCurrentWeek(supabase));

  const [teams, games, profilesRes] = await Promise.all([
    getTeams(supabase),
    getWeekGames(supabase, resolvedWeek),
    supabase.from("profiles").select("id, username, display_name"),
  ]);

  const members: Member[] = (profilesRes.data ?? [])
    .map((p) => ({
      id: p.id as string,
      label: (p.display_name as string | null) || (p.username as string),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const picks = await getVisiblePicksForGames(
    supabase,
    games.map((g) => g.id),
  );
  // gameId -> userId -> teamId
  const byGameUser: Record<string, Record<string, string>> = {};
  for (const p of picks) {
    (byGameUser[p.gameId] ??= {})[p.userId] = p.pickedTeamId;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 py-2">
      <WeekSelector basePath="/family" currentWeek={resolvedWeek} />
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Family Picks · Week {resolvedWeek}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Everyone&apos;s picks appear once each game kicks off.
        </p>
      </div>

      {games.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No games scheduled for this week yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {games.map((game) => (
            <FamilyGameCard
              key={game.id}
              game={game}
              teams={teams}
              members={members}
              picksByUser={byGameUser[game.id] ?? {}}
              currentUserId={user.id}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

function FamilyGameCard({
  game,
  teams,
  members,
  picksByUser,
  currentUserId,
}: {
  game: Game;
  teams: Record<string, Team>;
  members: Member[];
  picksByUser: Record<string, string>;
  currentUserId: string;
}) {
  const away = game.awayTeamId ? teams[game.awayTeamId] : undefined;
  const home = game.homeTeamId ? teams[game.homeTeamId] : undefined;
  if (!away || !home) return null;

  const revealed = isGameLocked(game);
  const isFinal = game.status === "final";

  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {away.abbreviation}{" "}
          <span className="text-zinc-400">at</span> {home.abbreviation}
        </span>
        <GameStatusPill game={game} locked={revealed} />
      </div>

      {!revealed ? (
        <p className="px-1 py-2 text-sm text-zinc-400 dark:text-zinc-500">
          Picks hidden until kickoff
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
          {members.map((m) => {
            const teamId = picksByUser[m.id];
            const team = teamId ? teams[teamId] : undefined;
            const correct =
              isFinal && teamId
                ? game.isTie || teamId === game.winnerTeamId
                : null;
            return (
              <li
                key={m.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span
                  className={
                    m.id === currentUserId
                      ? "font-semibold text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-600 dark:text-zinc-300"
                  }
                >
                  {m.label}
                  {m.id === currentUserId ? " (you)" : ""}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {team ? team.abbreviation : "—"}
                  </span>
                  {correct === true ? (
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  ) : correct === false ? (
                    <span className="text-red-600 dark:text-red-400">✗</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
