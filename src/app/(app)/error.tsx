"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong
      </h1>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        We couldn&apos;t load this screen. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-11 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:focus-visible:outline-zinc-50"
      >
        Try again
      </button>
    </main>
  );
}
