"use client";

import Link from "next/link";
import { useRef, useEffect } from "react";

import { FIRST_WEEK, LAST_WEEK } from "@/lib/config";

/** Horizontal scrollable week picker. `basePath` is "/picks" or "/family". */
export function WeekSelector({
  basePath,
  currentWeek,
}: {
  basePath: string;
  currentWeek: number;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
  }, []);

  const weeks = Array.from(
    { length: LAST_WEEK - FIRST_WEEK + 1 },
    (_, i) => FIRST_WEEK + i,
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-2 pb-1">
        {weeks.map((w) => {
          const active = w === currentWeek;
          return (
            <Link
              key={w}
              ref={active ? activeRef : undefined}
              href={`${basePath}/${w}`}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              Wk {w}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
