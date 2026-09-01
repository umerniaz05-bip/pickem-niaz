import type { Metadata } from "next";

import { PicksScreen } from "./PicksScreen";

export const metadata: Metadata = {
  title: "Picks · Niaz Family Pick'em",
};

export default function PicksPage() {
  return <PicksScreen />;
}
