import { Skeleton, SkeletonCard, SkeletonStats, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-72 mt-2" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <SkeletonStats />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonTable rows={5} />
        </div>
        <div className="space-y-4">
          <SkeletonCard className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-32" />
          </SkeletonCard>
          <SkeletonCard className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-28" />
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}
