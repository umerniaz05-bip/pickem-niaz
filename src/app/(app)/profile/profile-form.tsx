"use client";

import { useActionState } from "react";

import { updateProfile, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function ProfileForm({
  username,
  displayName,
}: {
  username: string;
  displayName: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Username
        <input
          name="username"
          defaultValue={username}
          required
          minLength={2}
          maxLength={24}
          pattern="[A-Za-z0-9_]+"
          className="h-12 rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          Letters, numbers and underscores. This does not change your login.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Display name
        <input
          name="display_name"
          defaultValue={displayName ?? ""}
          maxLength={40}
          placeholder="Shown on the leaderboard"
          className="h-12 rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
        />
      </label>

      {state.error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-green-600 dark:text-green-400" role="status">
          Saved ✓
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-12 rounded-xl bg-zinc-900 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
