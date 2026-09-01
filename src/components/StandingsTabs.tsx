"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { FIRST_WEEK, LAST_WEEK } from "@/lib/config";

export function StandingsTabs({ mode }: { mode: "season" | number }) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const weeks = Array.from(
    { length: LAST_WEEK - FIRST_WEEK + 1 },
    (_, i) => FIRST_WEEK + i,
  );

  const tab = (key: string, href: string, label: string, active: boolean) => (
    <Link
      key={key}
      ref={active ? activeRef : undefined}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 pb-1">
        {tab("season", "/standings", "Season", mode === "season")}
        {weeks.map((w) =>
          tab(`w${w}`, `/standings/${w}`, `Wk ${w}`, mode === w),
        )}
      </div>
    </div>
  );
}
