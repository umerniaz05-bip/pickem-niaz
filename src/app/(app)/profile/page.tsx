import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { signOut } from "./actions";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile · Niaz Family Pick'em",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex flex-1 flex-col gap-8 py-2">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Profile
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {user.email}
        </p>
      </header>

      {profile ? (
        <ProfileForm
          username={profile.username}
          displayName={profile.display_name}
        />
      ) : (
        <p className="text-sm text-red-600 dark:text-red-400">
          Your profile row is missing. Ask the admin to check your account.
        </p>
      )}

      <form action={signOut} className="mt-auto pt-4">
        <button
          type="submit"
          className="h-12 w-full rounded-xl border border-zinc-300 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
