import type { Metadata } from "next";

import { clampWeek } from "@/lib/games";

import { PicksScreen } from "../PicksScreen";

export const metadata: Metadata = {
  title: "Picks · Niaz Family Pick'em",
};

export default async function PicksWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  return <PicksScreen week={clampWeek(Number(week))} />;
}
