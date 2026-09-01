"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface ProfileState {
  error?: string;
  ok?: boolean;
}

const USERNAME_RE = /^[A-Za-z0-9_]+$/;

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const username = String(formData.get("username") ?? "").trim();
  const displayNameRaw = String(formData.get("display_name") ?? "").trim();
  const displayName = displayNameRaw === "" ? null : displayNameRaw;

  if (username.length < 2 || username.length > 24) {
    return { error: "Username must be 2–24 characters." };
  }
  if (!USERNAME_RE.test(username)) {
    return { error: "Username can only use letters, numbers and underscores." };
  }
  if (displayName && displayName.length > 40) {
    return { error: "Display name must be 40 characters or fewer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ username, display_name: displayName })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: "Could not save changes. Try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
