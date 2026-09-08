import { Skeleton, SkeletonCard, SkeletonFilters } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <SkeletonFilters />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-32" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}