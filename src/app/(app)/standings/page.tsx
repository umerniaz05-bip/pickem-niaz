import type { Metadata } from "next";

import { StandingsScreen } from "./StandingsScreen";

export const metadata: Metadata = {
  title: "Standings · Family Pick'em",
};

export default function StandingsPage() {
  return <StandingsScreen />;
}
