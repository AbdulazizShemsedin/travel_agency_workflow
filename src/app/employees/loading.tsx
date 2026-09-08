import { Skeleton, SkeletonFilters, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-64 mt-2" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <SkeletonFilters />
      <SkeletonTable rows={8} />
    </div>
  );
}