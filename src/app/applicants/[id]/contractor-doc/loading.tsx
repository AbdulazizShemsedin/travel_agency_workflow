import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard className="space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-40 w-full" />
        </SkeletonCard>
        <SkeletonCard className="space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-40 w-full" />
        </SkeletonCard>
      </div>
      <SkeletonCard className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </SkeletonCard>
    </div>
  );
}
