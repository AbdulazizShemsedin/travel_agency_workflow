import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#222227] pb-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="hidden md:flex flex-col gap-1.5 w-56">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} className="py-3 flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-2 w-64" />
              </div>
              <Skeleton className="h-6 w-20 rounded-lg" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}