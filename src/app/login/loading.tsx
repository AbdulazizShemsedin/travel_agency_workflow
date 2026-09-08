import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#090d16] px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Skeleton className="h-14 w-14 rounded-2xl" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-7 w-48 mx-auto" />
          <Skeleton className="h-3 w-64 mx-auto" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#222228] bg-white dark:bg-[#121216] p-6 space-y-4 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-3 w-56 mx-auto" />
      </div>
    </div>
  );
}