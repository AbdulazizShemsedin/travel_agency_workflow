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

// Queries that hold case data. When one of them reloads, the Undo buttons ask again.
const CASE_DATA_KEYS = new Set([
  "operational_workspace_v2",
  "placement_clearance_steps",
  "clearance_steps_for_applicant",
  "applicant",
  "applicants",
  "placement",
  "placements",
  "clearance",
  "clearance_step",
  "v2_clearance_queue",
]);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    patchSonnerToast();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 15, // 15 seconds
            refetchOnWindowFocus: true,
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

  // What can be undone changes whenever a case changes: here, on another screen, or by another user.
  // Each Undo button keeps its own answer, so when case data reloads from the server, every answer
  // is asked again (one burst per reload, not one per query).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      if (!CASE_DATA_KEYS.has(String(event.query.queryKey[0]))) return;
      clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: ["undoable_step"] }), 200);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
