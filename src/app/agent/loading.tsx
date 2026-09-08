import { Skeleton, SkeletonCard, SkeletonFilters } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3 w-80 mt-2" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <SkeletonFilters />
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-3 w-32" />
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] p-0.5">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="overflow-hidden p-0 space-y-0">
            <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-slate-100/70 dark:bg-[#18181e]/60">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            </div>
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 w-full rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 flex-1 rounded-xl" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}