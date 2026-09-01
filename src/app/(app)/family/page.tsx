import type { Metadata } from "next";

import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = {
  title: "Family · Family Pick'em",
};

export default function FamilyPage() {
  return (
    <Placeholder
      title="Family Picks"
      note="Everyone's picks per game — hidden before kickoff, revealed after. Built in Phase 2."
    />
  );
}
