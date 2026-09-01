"use client";

import { useEffect, useState } from "react";

import { formatCountdown } from "@/lib/format";

/** Live "locks in 1h 23m" text. Re-renders every 30s. Hidden once elapsed. */
export function Countdown({
  target,
  prefix = "Next game locks in",
}: {
  target: string;
  prefix?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const remaining = new Date(target).getTime() - now;
  if (remaining <= 0) return null;

  return (
    <span>
      {prefix} <span className="font-semibold tabular-nums">{formatCountdown(remaining)}</span>
    </span>
  );
}
