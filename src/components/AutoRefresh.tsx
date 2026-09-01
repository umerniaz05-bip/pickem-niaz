"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Lightweight polling: re-runs the server components for the current route on
 * an interval so game status, scores, locks and standings stay fresh without a
 * manual refresh. Pauses while the tab is hidden and catches up on return.
 *
 * (CLAUDE.md section 16 — the app does not need true realtime.)
 */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => {
        if (!document.hidden) router.refresh();
      }, intervalMs);
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
