"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchOperationalWorkspaceDataV2 } from "@/lib/api/v2/operational";
import { listEmployeesV2 } from "@/lib/api/v2/employees";
import { ApplicantFollowUpWorkspace } from "@/components/operational/workspaces/ApplicantFollowUpWorkspace";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import type { WorkspaceApplicantRow } from "@/types/workspace";

export default function ApplicantFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const decodedId = decodeURIComponent(id || "");

  // 1. Fetch Follow-up operational dataset
  const {
    data: followUpRows = [],
    isLoading,
    refetch,
    error,
  } = useQuery<WorkspaceApplicantRow[]>({
    queryKey: ["operational_workspace_v2", "follow_up"],
    queryFn: () => fetchOperationalWorkspaceDataV2("follow_up"),
  });

  // 2. Fetch Employees for assignment dropdowns
  const { data: employees = [] } = useQuery({
    queryKey: ["v2_employees_list"],
    queryFn: listEmployeesV2,
  });

  // Find candidate row matching this ID
  const applicantRow = React.useMemo(() => {
    return (followUpRows as WorkspaceApplicantRow[]).find(
      (r: WorkspaceApplicantRow) =>
        r.applicantId?.toLowerCase() === decodedId.toLowerCase() ||
        r.applicant?.name?.toLowerCase() === decodedId.toLowerCase() ||
        r.passportNumber?.toLowerCase() === decodedId.toLowerCase()
    );
  }, [followUpRows, decodedId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          Loading candidate follow-up workspace...
        </p>
      </div>
    );
  }

  if (error || !applicantRow) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 rounded-2xl border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#121217] text-center space-y-4">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Candidate Record Not Found
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          We could not locate an active operational pipeline record for ID{" "}
          <code className="font-mono bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
            {decodedId}
          </code>{" "}
          in the follow-up workspace.
        </p>
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/applicants?tab=follow_up")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Follow-Up Tracking</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <ApplicantFollowUpWorkspace
        isOpen={true}
        isFullPage={true}
        onClose={() => router.push("/applicants?tab=follow_up")}
        row={applicantRow}
        onRefresh={() => refetch()}
        employees={employees}
      />
    </div>
  );
}
