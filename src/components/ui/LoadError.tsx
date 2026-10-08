"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { cn } from "@/lib/utils";

export interface LoadErrorProps {
  title?: string;
  resourceName?: string;
  error?: any;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function LoadError({
  title,
  resourceName,
  error,
  onRetry,
  className,
  compact = false,
}: LoadErrorProps) {
  const displayTitle = title || (resourceName ? `Failed to load ${resourceName}` : "Failed to load data");

  const reason = React.useMemo(() => {
    if (!error) return "The server did not respond. Please try again.";
    return formatCleanErrorMessage(error);
  }, [error]);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
          className
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="truncate font-medium">{reason}</span>
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="h-7 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-900 dark:text-rose-300 dark:hover:bg-rose-900/40 shrink-0"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Try again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-rose-200 bg-rose-50/60 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20",
        className
      )}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
        {displayTitle}
      </h4>
      <p className="mt-1 text-xs text-rose-700 dark:text-rose-400 max-w-md mx-auto">
        {reason}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="border-rose-300 bg-white text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-zinc-900 dark:text-rose-200 dark:hover:bg-rose-950/50"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
