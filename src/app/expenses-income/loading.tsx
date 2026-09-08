import { Skeleton, SkeletonCard, SkeletonTable, SkeletonStats } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-72 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>
      <SkeletonStats />
      <SkeletonTable rows={9} />
    </div>
  );
}