"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

// Globally patch sonner toast.error and toast.warning so that ALL popups on the frontend
// show clean, simple, human-friendly English with zero technical or code terms.
function patchSonnerToast() {
  if (typeof window === "undefined") return;

  const w = window as any;
  if (w.__has_patched_sonner_toast__) return;
  w.__has_patched_sonner_toast__ = true;

  const originalError = toast.error.bind(toast);
  toast.error = (message: any, data?: any) => {
    const cleanMsg =
      message && typeof message === "object" && !("$$typeof" in message)
        ? formatCleanErrorMessage(message)
        : typeof message === "string"
        ? formatCleanErrorMessage(message)
        : message;

    let cleanData = data;
    if (data && typeof data === "object") {
      cleanData = { ...data };
      if (data.description && typeof data.description === "object" && !("$$typeof" in data.description)) {
        cleanData.description = formatCleanErrorMessage(data.description);
      } else if (typeof data.description === "string") {
        cleanData.description = formatCleanErrorMessage(data.description);
      }
    }
    return originalError(cleanMsg, cleanData);
  };

  const originalWarning = toast.warning.bind(toast);
  toast.warning = (message: any, data?: any) => {
    const cleanMsg =
      message && typeof message === "object" && !("$$typeof" in message)
        ? formatCleanErrorMessage(message)
        : typeof message === "string"
        ? formatCleanErrorMessage(message)
        : message;

    let cleanData = data;
    if (data && typeof data === "object") {
      cleanData = { ...data };
      if (data.description && typeof data.description === "object" && !("$$typeof" in data.description)) {
        cleanData.description = formatCleanErrorMessage(data.description);
      } else if (typeof data.description === "string") {
        cleanData.description = formatCleanErrorMessage(data.description);
      }
    }
    return originalWarning(cleanMsg, cleanData);
  };
}

// Execute patch immediately upon module load
patchSonnerToast();

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    patchSonnerToast();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              if (error?.statusCode === 401 || error?.statusCode === 403 || error?.statusCode === 404) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
