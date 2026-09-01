import type { Metadata } from "next";

import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = {
  title: "Standings · Family Pick'em",
};

export default function StandingsPage() {
  return (
    <Placeholder
      title="Standings"
      note="Weekly correct picks, season totals and weekly points. Scoring is Phase 3."
    />
  );
}
