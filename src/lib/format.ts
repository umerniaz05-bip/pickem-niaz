/** Format a UTC ISO kickoff for display in the viewer's local timezone. */
export function formatKickoff(
  iso: string,
  opts: { withDate?: boolean } = {},
): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  if (opts.withDate) {
    const date = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${weekday} ${date} · ${time}`;
  }
  return `${weekday} ${time}`;
}

/** "1h 23m", "0h 44m", "12m" — compact remaining time until `iso`. */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "0m";
  const totalMin = Math.floor(msRemaining / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
