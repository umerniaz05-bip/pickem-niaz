export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

/** A skeleton stand-in for one game card (Picks / Family). */
export function GameCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between px-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mx-auto h-3 w-6" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export function WeekStripSkeleton() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-14 shrink-0 rounded-full" />
      ))}
    </div>
  );
}
