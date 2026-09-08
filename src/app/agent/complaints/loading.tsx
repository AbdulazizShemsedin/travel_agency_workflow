import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-72 mt-2" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </SkeletonCard>
        <SkeletonCard className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-24 w-full" />
        </SkeletonCard>
      </div>
      <SkeletonTable rows={6} />
    </div>
  );
}