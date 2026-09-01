import { redirect } from "next/navigation";

export default function RootPage() {
  // proxy.ts sends unauthenticated users to /login before this runs.
  redirect("/picks");
}
