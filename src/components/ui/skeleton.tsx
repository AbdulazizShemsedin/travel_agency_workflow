import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800", className)}
      {...props}
    />
  );
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-5",
        className
      )}
      {...props}
    />
  );
}

function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216]">
      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-[#222227] px-4 py-3.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-slate-100 dark:border-[#1b1b22] px-4 py-4 last:border-0"
        >
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-8 rounded-lg ml-auto" />
        </div>
      ))}
    </div>
  );
}

function SkeletonForm() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      <SkeletonCard className="space-y-5">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </SkeletonCard>
    </div>
  );
}

function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-28" />
        </SkeletonCard>
      ))}
    </div>
  );
}

function SkeletonFilters() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Skeleton className="h-10 w-56 rounded-xl" />
      <Skeleton className="h-10 w-40 rounded-xl" />
      <Skeleton className="h-10 w-40 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-10 rounded-xl" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonForm, SkeletonStats, SkeletonFilters };
