import { Skeleton, SkeletonStats, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3 w-60 mt-2" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <SkeletonStats count={3} />
      <SkeletonTable rows={6} />
    </div>
  );
}