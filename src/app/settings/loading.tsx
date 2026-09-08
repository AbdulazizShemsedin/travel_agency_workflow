import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}