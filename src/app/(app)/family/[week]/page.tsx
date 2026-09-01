import type { Metadata } from "next";

import { clampWeek } from "@/lib/games";

import { FamilyScreen } from "../FamilyScreen";

export const metadata: Metadata = {
  title: "Family · Niaz Family Pick'em",
};

export default async function FamilyWeekPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const { week } = await params;
  return <FamilyScreen week={clampWeek(Number(week))} />;
}
