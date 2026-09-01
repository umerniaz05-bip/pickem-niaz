import { Skeleton } from "@/components/Skeleton";

export default function ProfileLoading() {
  return (
    <main className="flex flex-1 flex-col gap-8 py-2">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </main>
  );
}
