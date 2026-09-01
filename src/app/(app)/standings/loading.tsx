import { Skeleton, WeekStripSkeleton } from "@/components/Skeleton";

export default function StandingsLoading() {
  return (
    <main className="flex flex-1 flex-col gap-4 py-2">
      <WeekStripSkeleton />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-2 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </main>
  );
}
