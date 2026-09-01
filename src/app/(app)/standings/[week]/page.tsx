import type { Metadata } from "next";

import { clampWeek } from "@/lib/games";

import { StandingsScreen } from "../StandingsScreen";

export const metadata: Metadata = {
  title: "Standings · Family Pick'em",
};

export default async function StandingsWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  return <StandingsScreen week={clampWeek(Number(week))} />;
}
