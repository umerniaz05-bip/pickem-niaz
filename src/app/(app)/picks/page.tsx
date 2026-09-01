import type { Metadata } from "next";

import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = {
  title: "Picks · Family Pick'em",
};

export default function PicksPage() {
  return (
    <Placeholder
      title="Picks"
      note="The weekly picks screen lands in Phase 2 (schedule, game cards, autosave, kickoff locking)."
    />
  );
}
