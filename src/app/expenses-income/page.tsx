"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CheckCircle2,
  DollarSign,
  Inbox,
  ShieldCheck,
  Check,
  Ban,
  AlertOctagon,
  RefreshCw,
  Lock,
  Calendar,
  Layers,
  FileText,
  User,
  Filter,
  FileSpreadsheet,
  Upload,
  Link2,
  HelpCircle,
  AlertCircle,
  FileCheck2,
  CheckSquare,
  Square,
  Users,
} from "lucide-react";
import {
  logStageExpenseV2,
  logStageIncomeV2,
  approveTransactionV2,
  rejectTransactionV2,
  voidTransactionV2,
  uploadBankStatementV2,
  manuallyMatchLineV2,
  listCommissionBatchesV2,
  getCommissionBatchV2,
  settleBatchItemsV2,
  V2CommissionBatch,
  V2SupportedCurrency,
} from "@/lib/api/v2/finance";
import { getFinancialOverviewV2, getPendingApprovalQueueV2, V2PendingApprovalItem } from "@/lib/api/v2/reports";
import { uploadFileV2 } from "@/lib/api/v2/documents";
import { FxRateModal } from "@/components/finance/FxRateModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ActiveTab = "ledger" | "approval_queue" | "reconciliation";

export default function ExpensesIncomePage() {
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map(String) : [];
  const isFinanceManagerOrAdmin = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin", "Finance Manager"].includes(r)
  );

  // Active View Tab
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("ledger");

  // Record Transaction Modal State
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    transaction_type: "Income" as "Income" | "Expense",
    amount: "",
    description: "",
    placement: "",
    currency: "ETB" as V2SupportedCurrency,
    stageLoggedAt: "",
  });

  // Rejection & Void Dialog States
  const [rejectingTx, setRejectingTx] = React.useState<V2PendingApprovalItem | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState<string>("");
  const [isRejecting, setIsRejecting] = React.useState<boolean>(false);

  const [voidingTxName, setVoidingTxName] = React.useState<string | null>(null);
  const [voidReason, setVoidReason] = React.useState<string>("");
  const [isVoiding, setIsVoiding] = React.useState<boolean>(false);

  // Reconciliation State
  const [statementFile, setStatementFile] = React.useState<File | null>(null);
  const [isUploadingStatement, setIsUploadingStatement] = React.useState<boolean>(false);
  const [reconciliationResult, setReconciliationResult] = React.useState<{
    message?: string;
    matched?: number;
    unmatched?: number;
    [key: string]: any;
  } | null>(null);

  // Manual Matching State
  const [manualLineName, setManualLineName] = React.useState<string>("");
  const [manualBatchName, setManualBatchName] = React.useState<string>("");
  const [isManualMatching, setIsManualMatching] = React.useState<boolean>(false);

  // Batch Candidates Multi-Select & Settlement State
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>("");
  const [loadedBatch, setLoadedBatch] = React.useState<V2CommissionBatch | null>(null);
  const [isLoadingBatch, setIsLoadingBatch] = React.useState<boolean>(false);
  const [selectedApplicantItemNames, setSelectedApplicantItemNames] = React.useState<string[]>([]);
  const [depositedAmount, setDepositedAmount] = React.useState<string>("");
  const [agencyExpense, setAgencyExpense] = React.useState<string>("");
  const [settlementCurrency, setSettlementCurrency] = React.useState<V2SupportedCurrency>("ETB");
  const [settlementReference, setSettlementReference] = React.useState<string>("");
  const [statementLineRef, setStatementLineRef] = React.useState<string>("");
  const [settlementNotes, setSettlementNotes] = React.useState<string>("");
  const [isSettlingBatchItems, setIsSettlingBatchItems] = React.useState<boolean>(false);

  // FX Rate Management Modal State
  const [isFxModalOpen, setIsFxModalOpen] = React.useState<boolean>(false);

  // Fetch Available Commission Batches for Matching
  const { data: availableBatches = [] } = useQuery({
    queryKey: ["v2_available_batches_for_reconciliation"],
    queryFn: () => listCommissionBatchesV2(),
    staleTime: 30000,
    enabled: isFinanceManagerOrAdmin,
  });

  // 1. Fetch Financial Overview Ledger
  const {
    data: rawSummary,
    isLoading: isLedgerLoading,
    refetch: refetchLedger,
  } = useQuery({
    queryKey: ["v2_financial_overview_expenses_income"],
    queryFn: () => getFinancialOverviewV2(),
    staleTime: 30000,
  });

  // 2. Fetch Pending Approvals Queue
  const {
    data: pendingQueue = [],
    isLoading: isQueueLoading,
    refetch: refetchQueue,
  } = useQuery<V2PendingApprovalItem[]>({
    queryKey: ["v2_pending_approval_queue"],
    queryFn: () => getPendingApprovalQueueV2(),
    staleTime: 15000,
  });

  const summary = rawSummary as any;
  const totalIncome = summary?.totals_birr?.income ?? 0;
  const totalExpense = summary?.totals_birr?.expense ?? 0;
  const netBalance = totalIncome - totalExpense;

  // Mutation: Log Stage Income or Expense
  const recordTxnMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const amt = parseFloat(data.amount) || 0;
      if (data.transaction_type === "Expense") {
        return await logStageExpenseV2(
          amt,
          data.currency,
          data.description,
          data.placement || undefined,
          data.stageLoggedAt || undefined
        );
      } else {
        return await logStageIncomeV2(
          amt,
          data.currency,
          data.description,
          data.placement || undefined,
          data.stageLoggedAt || undefined
        );
      }
    },
    onSuccess: (res) => {
      toast.success("Transaction Logged Successfully", {
        description: `Logged transaction ${res?.name || ""} in Pending status for approval.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_financial_overview_expenses_income"] });
      queryClient.invalidateQueries({ queryKey: ["v2_pending_approval_queue"] });
      setIsAddModalOpen(false);
      setFormData({
        transaction_type: "Income",
        amount: "",
        description: "",
        placement: "",
        currency: "ETB",
        stageLoggedAt: "",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to Log Transaction", {
        description: err?.message || "Backend rejected transaction entry.",
      });
    },
  });

  // ACTION: Approve Transaction
  const handleApprove = async (txName: string) => {
    try {
      await approveTransactionV2(txName);
      toast.success("Transaction Approved", {
        description: `${txName} moved to Approved and applied to ledger totals.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_pending_approval_queue"] });
      queryClient.invalidateQueries({ queryKey: ["v2_financial_overview_expenses_income"] });
    } catch (err: any) {
      toast.error("Approval Failed", {
        description: err?.message || "Backend rejected transaction approval.",
      });
    }
  };

  // ACTION: Reject Transaction
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTx) return;
    if (!rejectionReason.trim()) {
      toast.error("Rejection Reason Required", {
        description: "Please provide an explicit remark explaining this rejection.",
      });
      return;
    }

    setIsRejecting(true);
    try {
      await rejectTransactionV2(rejectingTx.name, rejectionReason.trim());
      toast.success("Transaction Rejected", {
        description: `${rejectingTx.name} moved to Rejected status.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_pending_approval_queue"] });
      queryClient.invalidateQueries({ queryKey: ["v2_financial_overview_expenses_income"] });
      setRejectingTx(null);
      setRejectionReason("");
    } catch (err: any) {
      toast.error("Rejection Failed", {
        description: err?.message || "Backend rejected transaction rejection.",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  // ACTION: Void Transaction
  const handleVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingTxName) return;
    if (!voidReason.trim()) {
      toast.error("Void Reason Required", {
        description: "Please provide an audit remark explaining this void action.",
      });
      return;
    }

    setIsVoiding(true);
    try {
      await voidTransactionV2(voidingTxName, voidReason.trim());
      toast.success("Transaction Voided", {
        description: `${voidingTxName} voided and excluded from ledger totals.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_pending_approval_queue"] });
      queryClient.invalidateQueries({ queryKey: ["v2_financial_overview_expenses_income"] });
      setVoidingTxName(null);
      setVoidReason("");
    } catch (err: any) {
      toast.error("Void Failed", {
        description: err?.message || "Backend rejected transaction void request.",
      });
    } finally {
      setIsVoiding(false);
    }
  };

  // ACTION: Upload Bank Statement CSV
  const handleUploadBankStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementFile) {
      toast.error("Please select a bank statement CSV file.");
      return;
    }

    setIsUploadingStatement(true);
    try {
      // 1. Upload file via multipart upload
      const uploadRes = await uploadFileV2(statementFile, false);
      const fileUrl = uploadRes.file_url;
      if (!fileUrl) {
        throw new Error("File upload failed to return a valid URL.");
      }

      // 2. Invoke reconciliation endpoint
      const reconRes = await uploadBankStatementV2(fileUrl);
      setReconciliationResult(reconRes);
      toast.success("Bank Statement Processed", {
        description: `Reconciliation complete: ${reconRes.matched ?? 0} lines matched, ${reconRes.unmatched ?? 0} lines unmatched.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_financial_overview_expenses_income"] });
      queryClient.invalidateQueries({ queryKey: ["v2_pending_approval_queue"] });
      setStatementFile(null);
    } catch (err: any) {
      toast.error("Reconciliation Failed", {
        description: err?.message || "Backend rejected bank statement file.",
      });
    } finally {
      setIsUploadingStatement(false);
    }
  };

  // ACTION: Manually Match Line
  const handleManualMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLineName.trim() || !manualBatchName.trim()) {
      toast.error("Statement Line ID and Batch ID are required.");
      return;
    }

    setIsManualMatching(true);
    try {
      const matchRes = await manuallyMatchLineV2(manualLineName.trim(), manualBatchName.trim());
      toast.success("Line Matched Successfully", {
        description: matchRes.message || `Matched line ${manualLineName} to batch ${manualBatchName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["v2_financial_overview_expenses_income"] });
      setManualLineName("");
      setManualBatchName("");
    } catch (err: any) {
      toast.error("Manual Match Failed", {
        description: err?.message || "Backend rejected manual match request.",
      });
    } finally {
      setIsManualMatching(false);
    }
  };

  // ACTION: Load Commission Batch with Items
  const handleLoadBatch = async (batchId: string) => {
    if (!batchId.trim()) return;
    setIsLoadingBatch(true);
    try {
      const batchDoc = await getCommissionBatchV2(batchId.trim());
      if (!batchDoc) {
        toast.error("Batch Not Found", { description: `Commission batch ${batchId} was not found.` });
        setLoadedBatch(null);
      } else {
        setLoadedBatch(batchDoc);
        setSelectedBatchId(batchDoc.name);
        if (batchDoc.currency) {
          setSettlementCurrency(batchDoc.currency as V2SupportedCurrency);
        }
        // Auto-select unsettled items by default
        const unsettled = (batchDoc.items || [])
          .filter((it: any) => it.status !== "Paid" && it.settled !== 1 && it.settled !== true)
          .map((it: any) => it.name)
          .filter(Boolean);
        setSelectedApplicantItemNames(unsettled);
        toast.success("Batch Loaded", {
          description: `Loaded ${batchDoc.name} with ${batchDoc.items?.length || 0} candidate(s).`,
        });
      }
    } catch (err: any) {
      toast.error("Failed to Load Batch", {
        description: err?.message || "Could not retrieve batch details.",
      });
      setLoadedBatch(null);
    } finally {
      setIsLoadingBatch(false);
    }
  };

  // ACTION: Settle Selected Batch Candidates & Record Financial Entries
  const handleSettleAndRecordFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadedBatch) {
      toast.error("Please load a commission batch first.");
      return;
    }
    if (selectedApplicantItemNames.length === 0) {
      toast.error("No candidates selected", {
        description: "Please select one or more candidates from the batch to settle.",
      });
      return;
    }

    setIsSettlingBatchItems(true);
    try {
      // 1. Settle selected batch items
      await settleBatchItemsV2(selectedApplicantItemNames);

      // 2. If deposited amount entered, log income
      const depAmt = parseFloat(depositedAmount);
      if (!isNaN(depAmt) && depAmt > 0) {
        await logStageIncomeV2(
          depAmt,
          settlementCurrency,
          `Commission deposit matched: ${loadedBatch.name} (${selectedApplicantItemNames.length} candidates${settlementReference ? ` - Ref: ${settlementReference}` : ""})`,
          undefined,
          "Settlement"
        );
      }

      // 3. If agency expense entered, log expense
      const expAmt = parseFloat(agencyExpense);
      if (!isNaN(expAmt) && expAmt > 0) {
        await logStageExpenseV2(
          expAmt,
          settlementCurrency,
          `Agency expense for batch: ${loadedBatch.name} (${selectedApplicantItemNames.length} candidates${settlementNotes ? ` - ${settlementNotes}` : ""})`,
          undefined,
          "Settlement"
        );
      }

      // 4. If statement line specified, match line
      if (statementLineRef.trim()) {
        try {
          await manuallyMatchLineV2(statementLineRef.trim(), loadedBatch.name);
        } catch (matchErr: any) {
          console.warn("Statement line match notice:", matchErr?.message);
        }
      }

      toast.success("Settlement & Financials Recorded", {
        description: `Successfully settled ${selectedApplicantItemNames.length} candidate(s). Financial records submitted for review.`,
      });

      // Clear inputs & refresh
      setDepositedAmount("");
      setAgencyExpense("");
      setSettlementReference("");
      setStatementLineRef("");
      setSettlementNotes("");
      setSelectedApplicantItemNames([]);

      queryClient.invalidateQueries({ queryKey: ["v2_financial_overview_expenses_income"] });
      queryClient.invalidateQueries({ queryKey: ["v2_pending_approval_queue"] });
      queryClient.invalidateQueries({ queryKey: ["v2_available_batches_for_reconciliation"] });

      // Refresh loaded batch
      await handleLoadBatch(loadedBatch.name);
    } catch (err: any) {
      toast.error("Settlement Failed", {
        description: err?.message || "Backend rejected batch settlement request.",
      });
    } finally {
      setIsSettlingBatchItems(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* Header & Main Actions                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Expenses & Income Management
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            >
              V2 FINANCE WORKFLOW
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Log disbursements, audit ledger entries, execute Finance Manager approvals, and reconcile bank statements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetchLedger();
              refetchQueue();
            }}
            className="text-xs h-8"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFxModalOpen(true)}
            className="text-xs h-8 border-slate-300 dark:border-[#2a2a35]"
            title="View active foreign exchange conversion rates or set manual rates"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Manage FX Rates
          </Button>

          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white font-semibold text-xs h-8 shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Transaction
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Primary Navigation Tabs                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#202028] pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "ledger"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Financial Ledger & Summary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("approval_queue")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "approval_queue"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <Inbox className="h-3.5 w-3.5" />
          Pending Approvals Queue
          {pendingQueue.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingQueue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reconciliation")}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === "reconciliation"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-[#181820]"
          )}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Bank Statement Reconciliation
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: FINANCIAL LEDGER & SUMMARY                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Total Approved Income
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  ETB {totalIncome.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Verified candidate fees & incoming settlements
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Total Approved Expenses
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  ETB {totalExpense.toLocaleString()}
                </div>
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  Approved medical, visa, ticket, and logistics disbursements
                </p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                  Net Operating Margin
                </CardDescription>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  <DollarSign className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-200 font-mono">
                  ETB {netBalance.toLocaleString()}
                </div>
                <p className="mt-1 flex items-center text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                  Current operational cash flow balance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Overview Info Card */}
          <Card className="border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Financial Audit & Ledger Rules
              </CardTitle>
              <CardDescription className="text-xs">
                In compliance with V2 accounting rules, newly logged transactions begin in <strong>Pending</strong> state. They only impact ledger totals after formal approval by a <strong>Finance Manager</strong> or <strong>Administrator</strong>.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PENDING APPROVALS QUEUE                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "approval_queue" && (
        <div className="space-y-4">
          {!isFinanceManagerOrAdmin ? (
            <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold">Approval Controls are Restricted</h3>
              </div>
              <p className="leading-relaxed">
                Reviewing, approving, rejecting, or voiding transactions requires <strong>Finance Manager</strong> or <strong>Administrator</strong> privileges.
              </p>
            </div>
          ) : (
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                      <Inbox className="h-4 w-4 text-emerald-600" />
                      Pending Transaction Approval Queue
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Review oldest-first pending disbursements and fees. Approve to commit to ledger, or reject with a formal reason.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]">
                    {pendingQueue.length} Pending Actions
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-b border-slate-100 dark:border-[#202028]">
                      <tr>
                        <th className="py-2.5 px-3">Transaction</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Candidate / Placement</th>
                        <th className="py-2.5 px-3">Logged By</th>
                        <th className="py-2.5 px-3">Logged At</th>
                        <th className="py-2.5 px-3 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                      {isQueueLoading ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />
                            Loading pending approval queue...
                          </td>
                        </tr>
                      ) : pendingQueue.length > 0 ? (
                        pendingQueue.map((tx) => (
                          <tr key={tx.name} className="hover:bg-slate-50 dark:hover:bg-[#15151c]">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {tx.name}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  tx.transaction_type === "Income"
                                    ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                                    : "border-rose-300 text-rose-800 bg-rose-50"
                                )}
                              >
                                {tx.transaction_type}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono">
                              {(tx.amount_birr ?? tx.amount ?? 0).toLocaleString()} {tx.currency || "ETB"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300 max-w-xs truncate">
                              {tx.description}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {tx.placement || tx.applicant || "General"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {tx.logged_by || tx.owner || "System"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400">
                              {new Date(tx.creation).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleApprove(tx.name)}
                                  className="h-7 text-xs bg-emerald-900 hover:bg-emerald-950 text-white px-2.5 shadow-xs"
                                  title="Approve transaction into ledger"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRejectingTx(tx);
                                    setRejectionReason("");
                                  }}
                                  className="h-7 text-xs border-rose-300 text-rose-800 hover:bg-rose-50 px-2"
                                  title="Reject pending transaction with remark"
                                >
                                  <Ban className="h-3.5 w-3.5 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            Zero pending transactions in queue. All records are approved or rejected.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BANK STATEMENT RECONCILIATION (P2-02 CORE)              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          {!isFinanceManagerOrAdmin ? (
            <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold">Reconciliation Access Restricted</h3>
              </div>
              <p className="leading-relaxed">
                Uploading bank statements and manually matching statement lines requires <strong>Finance Manager</strong> or <strong>Administrator</strong> privileges.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reconciliation Upload & Overview Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Panel 1: CSV Upload Dropzone */}
                <Card className="lg:col-span-2 border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                          Bank Statement Auto-Matching
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Upload banking CSV (date, reference, amount in ETB). Automatically matches unsettled commission batches.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <form onSubmit={handleUploadBankStatement} className="space-y-4">
                      <div className="border-2 border-dashed border-slate-200 dark:border-[#2a2a35] rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/40 dark:bg-[#16161f]">
                        <input
                          id="bank_statement_csv"
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setStatementFile(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="bank_statement_csv"
                          className="cursor-pointer flex flex-col items-center justify-center gap-2"
                        >
                          <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                            <Upload className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            {statementFile ? statementFile.name : "Choose Bank Statement CSV File"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {statementFile
                              ? `${(statementFile.size / 1024).toFixed(1)} KB selected`
                              : "Plain CSV format: date, reference, amount in Birr"}
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />
                          Matches lines by total amount & disambiguates via reference
                        </span>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!statementFile || isUploadingStatement}
                          className="bg-emerald-900 hover:bg-emerald-950 text-white font-semibold text-xs h-8 shadow-xs"
                        >
                          {isUploadingStatement ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Process & Auto-Match
                        </Button>
                      </div>
                    </form>

                    {/* Server Outcome Banner */}
                    {reconciliationResult && (
                      <div className="mt-4 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Auto-Match Processed Successfully
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-700 text-white text-[10px]">
                              {reconciliationResult.matched ?? 0} Matched
                            </Badge>
                            <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-50 text-[10px]">
                              {reconciliationResult.unmatched ?? 0} Unmatched
                            </Badge>
                          </div>
                        </div>
                        {reconciliationResult.message && (
                          <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed font-mono">
                            {reconciliationResult.message}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Panel 2: Direct Line Matching Form */}
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-emerald-600" />
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                          Direct Line Matching
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Quick link an ambiguous statement line to a batch.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3.5">
                    <form onSubmit={handleManualMatch} className="space-y-3.5">
                      <div className="space-y-1">
                        <Label htmlFor="line_id" className="text-xs font-semibold">
                          Statement Line Identifier <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="line_id"
                          placeholder="e.g. STMT-LINE-00014"
                          value={manualLineName}
                          onChange={(e) => setManualLineName(e.target.value)}
                          required
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="batch_id" className="text-xs font-semibold">
                          Target Commission Batch ID <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="batch_id"
                          placeholder="e.g. CBR-00007"
                          value={manualBatchName}
                          onChange={(e) => setManualBatchName(e.target.value)}
                          required
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Matches the selected statement line directly to the target batch, updating settlement and ledger records.
                      </p>

                      <Button
                        type="submit"
                        size="sm"
                        disabled={!manualLineName.trim() || !manualBatchName.trim() || isManualMatching}
                        className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white font-semibold text-xs h-8 shadow-xs"
                      >
                        {isManualMatching ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Confirm Manual Match
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Panel 3: Multi-Applicant Batch Settlement & Expense Entry */}
              <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                          Manual Matching: Select Applicants from Batch & Settle
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Multi-select applicants from a batch, enter deposited bank amount and agency expense, and submit for settlement.
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {availableBatches.length > 0 && (
                        <select
                          value={selectedBatchId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedBatchId(val);
                            if (val) handleLoadBatch(val);
                          }}
                          className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-transparent text-xs font-mono max-w-xs"
                        >
                          <option value="">-- Select Active Batch --</option>
                          {availableBatches.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name} • {b.contractor_name || b.contractor} ({b.status})
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Batch ID (CBR-00007)"
                          value={selectedBatchId}
                          onChange={(e) => setSelectedBatchId(e.target.value)}
                          className="h-8 w-40 text-xs font-mono"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadBatch(selectedBatchId)}
                          disabled={!selectedBatchId.trim() || isLoadingBatch}
                          className="h-8 text-xs font-semibold px-2.5"
                        >
                          {isLoadingBatch ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : null}
                          Load Batch
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {loadedBatch ? (
                    <div className="space-y-4">
                      {/* Batch Header Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#16161e] border border-slate-200 dark:border-[#262632] text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                            {loadedBatch.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {loadedBatch.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-zinc-300 text-xs">
                          <div>
                            <span className="text-slate-400">Foreign Agent:</span>{" "}
                            <strong>{loadedBatch.contractor_name || loadedBatch.contractor}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Destination:</span>{" "}
                            <strong>{loadedBatch.destination_country || "Saudi Arabia"}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Batch Total:</span>{" "}
                            <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                              {Number(loadedBatch.total_amount).toLocaleString()} {loadedBatch.currency}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Total Applicants:</span>{" "}
                            <strong>{loadedBatch.items?.length || 0}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Applicants Multi-select Table */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                            Applicants in Batch ({selectedApplicantItemNames.length} of {loadedBatch.items?.length || 0} selected)
                          </Label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allIds = (loadedBatch.items || []).map((it: any) => it.name).filter(Boolean);
                                setSelectedApplicantItemNames(allIds);
                              }}
                              className="text-[11px] text-emerald-800 dark:text-emerald-300 hover:underline font-semibold"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300 dark:text-zinc-600">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedApplicantItemNames([])}
                              className="text-[11px] text-slate-500 hover:underline font-semibold"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>

                        <div className="border border-slate-200 dark:border-[#262632] rounded-xl overflow-hidden">
                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-[#22222b]">
                            {(!loadedBatch.items || loadedBatch.items.length === 0) ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                No applicant items found in this commission batch.
                              </div>
                            ) : (
                              loadedBatch.items.map((it: any) => {
                                const isSelected = selectedApplicantItemNames.includes(it.name);
                                const isPaid = it.status === "Paid" || it.settled === 1 || it.settled === true;
                                return (
                                  <div
                                    key={it.name || it.applicant}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedApplicantItemNames(selectedApplicantItemNames.filter((id) => id !== it.name));
                                      } else {
                                        setSelectedApplicantItemNames([...selectedApplicantItemNames, it.name]);
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center justify-between px-3.5 py-2.5 text-xs cursor-pointer transition-colors",
                                      isSelected
                                        ? "bg-emerald-50/60 dark:bg-emerald-950/25"
                                        : "hover:bg-slate-50 dark:hover:bg-[#1a1a22]"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <button type="button" className="text-emerald-800 dark:text-emerald-300">
                                        {isSelected ? (
                                          <CheckSquare className="h-4 w-4" />
                                        ) : (
                                          <Square className="h-4 w-4 text-slate-400" />
                                        )}
                                      </button>
                                      <div>
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                          {it.applicant_name || it.full_name || it.applicant || "Applicant"}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                                          {it.applicant} • Placement: {it.placement || "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">
                                        {Number(it.amount).toLocaleString()} {it.currency || loadedBatch.currency}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px]",
                                          isPaid
                                            ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
                                            : "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
                                        )}
                                      >
                                        {isPaid ? "Settled / Paid" : "Unsettled"}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Financial Settlement Form */}
                      <form onSubmit={handleSettleAndRecordFinancials} className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-[#22222b]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="deposited_amount" className="text-xs font-semibold">
                              Deposited Amount
                            </Label>
                            <Input
                              id="deposited_amount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={depositedAmount}
                              onChange={(e) => setDepositedAmount(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400">Incoming wire from foreign agent</span>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="agency_expense" className="text-xs font-semibold">
                              Agency Expense
                            </Label>
                            <Input
                              id="agency_expense"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={agencyExpense}
                              onChange={(e) => setAgencyExpense(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400">Operational costs from agency</span>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="settlement_currency" className="text-xs font-semibold">
                              Currency
                            </Label>
                            <select
                              id="settlement_currency"
                              value={settlementCurrency}
                              onChange={(e) => setSettlementCurrency(e.target.value as V2SupportedCurrency)}
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-transparent text-xs"
                            >
                              <option value="ETB">ETB (Ethiopian Birr)</option>
                              <option value="SAR">SAR (Saudi Riyal)</option>
                              <option value="USD">USD (US Dollar)</option>
                              <option value="KWD">KWD (Kuwaiti Dinar)</option>
                              <option value="AED">AED (UAE Dirham)</option>
                              <option value="QAR">QAR (Qatari Riyal)</option>
                            </select>
                            <span className="text-[10px] text-slate-400">Ledger posting currency</span>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="statement_line_ref" className="text-xs font-semibold">
                              Statement / Wire Ref
                            </Label>
                            <Input
                              id="statement_line_ref"
                              placeholder="e.g. WIRE-89472 or CBE-TRANS"
                              value={statementLineRef}
                              onChange={(e) => setStatementLineRef(e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400">Statement line or bank reference</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="settlement_notes" className="text-xs font-semibold">
                            Settlement Remarks & Notes (Optional)
                          </Label>
                          <Input
                            id="settlement_notes"
                            placeholder="e.g. Reconciled via CBE wire statement, deducting agency logistical expenses"
                            value={settlementNotes}
                            onChange={(e) => setSettlementNotes(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            Settles selected applicants and routes deposit/expense records to Finance for approval.
                          </p>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={selectedApplicantItemNames.length === 0 || isSettlingBatchItems}
                            className="w-full sm:w-auto bg-emerald-900 hover:bg-emerald-950 text-white font-semibold text-xs h-8 px-4 shadow-xs"
                          >
                            {isSettlingBatchItems ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Settle {selectedApplicantItemNames.length} Applicant(s) & Record Financials
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-[#262632] rounded-xl space-y-2">
                      <Users className="h-8 w-8 text-slate-300 dark:text-zinc-600 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        No Commission Batch Loaded
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                        Select a batch from the dropdown above or enter a Batch ID (e.g. CBR-00007) and click Load Batch to view applicant items, select multiple applicants, and record bank deposits or agency expenses.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Format Guide & System Compliance Card */}
              <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Reconciliation Specifications & CSV Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 dark:text-zinc-300 space-y-2">
                  <p>
                    <strong>CSV Columns:</strong> Date (YYYY-MM-DD), Reference (wire code or transaction detail), Amount (number in ETB).
                  </p>
                  <p>
                    <strong>Matching Logic:</strong> The auto-matcher scans all unsettled Commission Batches. It matches statement rows by exact amount. If equal-amount collisions exist, it resolves ambiguity by inspecting if the reference text contains the batch name or foreign agent name. Ambiguous collisions remain in <strong>Unmatched</strong> state for manual resolution.
                  </p>
                  <p>
                    <strong>Financial Auditability:</strong> Manual matches and settlements are permanently recorded in the audit trail without hard deletions.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 1: Record Transaction                                   */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Record Transaction</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Submits in Pending status for approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!formData.amount || !formData.description) return;
                recordTxnMutation.mutate(formData);
              }}
              className="space-y-3.5"
            >
              <div className="space-y-1">
                <Label htmlFor="txn_type" className="text-xs font-semibold">
                  Transaction Type <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="txn_type"
                  value={formData.transaction_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transaction_type: e.target.value as "Income" | "Expense",
                    })
                  }
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs"
                >
                  <option value="Income">Income (Deposit, Fee, Reimbursement)</option>
                  <option value="Expense">Expense (Medical, Visa, Ticket, Logistics)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="amount" className="text-xs font-semibold">
                    Amount <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="currency" className="text-xs font-semibold">
                    Currency
                  </Label>
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value as V2SupportedCurrency })
                    }
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs"
                  >
                    <option value="ETB">ETB (Ethiopian Birr)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="KWD">KWD (Kuwaiti Dinar)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Description <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="description"
                  placeholder="e.g. GAMCA medical fee disbursement"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="placement" className="text-xs font-semibold">
                  Linked Placement ID (Optional)
                </Label>
                <Input
                  id="placement"
                  placeholder="e.g. PLM-00013"
                  value={formData.placement}
                  onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={recordTxnMutation.isPending}
                  className="text-xs h-8 bg-emerald-900 hover:bg-emerald-950 text-white font-semibold"
                >
                  {recordTxnMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Submit for Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Rejection Reason Dialog                              */}
      {/* ------------------------------------------------------------- */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-rose-200 dark:border-rose-950/60 bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reject Transaction ({rejectingTx.name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectingTx(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-3.5">
              <p className="text-xs text-slate-500">
                Rejecting transaction of <strong>{(rejectingTx.amount_birr ?? rejectingTx.amount ?? 0).toLocaleString()} {rejectingTx.currency || "ETB"}</strong> ({rejectingTx.description}). Please state the audit reason for this rejection.
              </p>

              <div className="space-y-1">
                <Label htmlFor="rejection_reason" className="text-xs font-semibold">
                  Rejection Reason <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="rejection_reason"
                  placeholder="e.g. Disputed receipt / unauthorized expense"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingTx(null)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!rejectionReason.trim() || isRejecting}
                  className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {isRejecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FX Rate Management Modal */}
      <FxRateModal
        isOpen={isFxModalOpen}
        onClose={() => setIsFxModalOpen(false)}
        canMutate={isFinanceManagerOrAdmin}
        onSuccess={() => {
          refetchLedger();
          refetchQueue();
        }}
      />
    </div>
  );
}
