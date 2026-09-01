import {
  GameCardSkeleton,
  Skeleton,
  WeekStripSkeleton,
} from "@/components/Skeleton";

export default function PicksLoading() {
  return (
    <main className="flex flex-1 flex-col gap-4 py-2">
      <WeekStripSkeleton />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}
