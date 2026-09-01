import type { Metadata } from "next";

import { FamilyScreen } from "./FamilyScreen";

export const metadata: Metadata = {
  title: "Family · Niaz Family Pick'em",
};

export default function FamilyPage() {
  return <FamilyScreen />;
}
