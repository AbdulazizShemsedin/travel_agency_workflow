import { Skeleton, SkeletonStats, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-3 w-68 mt-2" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#222227] pb-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <SkeletonStats count={3} />
      <SkeletonTable rows={7} />
    </div>
  );
}