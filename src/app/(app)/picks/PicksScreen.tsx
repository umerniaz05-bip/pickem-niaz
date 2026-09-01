import { redirect } from "next/navigation";

import { PicksBoard } from "@/components/PicksBoard";
import { WeekSelector } from "@/components/WeekSelector";
import {
  getTeams,
  getUserPicksByGame,
  getWeekGames,
  resolveCurrentWeek,
} from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export async function PicksScreen({ week }: { week?: number }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resolvedWeek = week ?? (await resolveCurrentWeek(supabase));
  const [teams, games] = await Promise.all([
    getTeams(supabase),
    getWeekGames(supabase, resolvedWeek),
  ]);
  const picksByGame = await getUserPicksByGame(
    supabase,
    user.id,
    games.map((g) => g.id),
  );

  const initialPicks: Record<string, string> = {};
  for (const [gameId, pick] of Object.entries(picksByGame)) {
    initialPicks[gameId] = pick.pickedTeamId;
  }

  return (
    <main className="flex flex-1 flex-col gap-4 py-2">
      <WeekSelector basePath="/picks" currentWeek={resolvedWeek} />
      <PicksBoard
        week={resolvedWeek}
        games={games}
        teams={teams}
        userId={user.id}
        initialPicks={initialPicks}
      />
    </main>
  );
}
