"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DollarSign,
  Receipt,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Plane,
  CreditCard,
  X,
  Sparkles,
  Layers,
  FileCheck2,
  UploadCloud,
  FileUp,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getOwedCommissionsV2,
  createCommissionBatchV2,
  getBatchInvoicePdfV2,
  uploadBatchPaymentProofV2,
  settleBatchItemsV2,
  settleBatchV2,
  V2OwedCommissionItem,
  V2CommissionBatch,
} from "@/lib/api/v2/finance";
import { exportCommissionsXlsxV2 } from "@/lib/api/v2/reports";
import { listContractorsV2 } from "@/lib/api/v2/contractors";
import { uploadFileV2 } from "@/lib/api/v2/documents";
import { cn } from "@/lib/utils";

export default function AdminCommissionPage() {
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map(String) : [];
  const isFinanceManagerOrAdmin = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin", "Finance Manager"].includes(r)
  );

  // Filters State
  const [selectedContractor, setSelectedContractor] = React.useState<string>("");
  const [selectedCountry, setSelectedCountry] = React.useState<string>("Saudi Arabia");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Multi-select for Batch Creation (Unbatched Owed Commissions)
  const [selectedTxNames, setSelectedTxNames] = React.useState<string[]>([]);
  const [isCreatingBatch, setIsCreatingBatch] = React.useState<boolean>(false);

  // Active Batch Workspace (either freshly created or inspected)
  const [activeBatch, setActiveBatch] = React.useState<V2CommissionBatch | null>(null);

  // Partial Settlement: Multi-select batch item names
  const [selectedItemRowNames, setSelectedItemRowNames] = React.useState<string[]>([]);
  const [isSettlingItems, setIsSettlingItems] = React.useState<boolean>(false);

  // Whole Batch Settlement
  const [settlementReference, setSettlementReference] = React.useState<string>("");
  const [isSettlingWholeBatch, setIsSettlingWholeBatch] = React.useState<boolean>(false);

  // Payment Proof File Upload & Fuzzy Match
  const [paymentProofFile, setPaymentProofFile] = React.useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = React.useState<boolean>(false);
  const [proofMatchResult, setProofMatchResult] = React.useState<{
    matched_items: string[];
    unmatched_names: string[];
  } | null>(null);

  // Binary PDF and XLSX export loading states
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState<boolean>(false);
  const [isExportingXlsx, setIsExportingXlsx] = React.useState<boolean>(false);

  // 1. Fetch Contractors List
  const { data: contractors = [], isLoading: isContractorsLoading } = useQuery({
    queryKey: ["v2_contractors_for_commission"],
    queryFn: () => listContractorsV2(),
    staleTime: 60000,
  });

  // Set default contractor when list loads
  React.useEffect(() => {
    if (!selectedContractor && contractors.length > 0) {
      setSelectedContractor(contractors[0].name || contractors[0].contractor_name);
    }
  }, [contractors, selectedContractor]);

  // 2. Fetch Owed (Unbatched, Approved) Commissions
  const {
    data: owedCommissions = [],
    isLoading: isOwedLoading,
    refetch: refetchOwed,
  } = useQuery<V2OwedCommissionItem[]>({
    queryKey: ["v2_owed_commissions", selectedContractor, selectedCountry],
    queryFn: () =>
      getOwedCommissionsV2(
        selectedContractor || undefined,
        selectedCountry || undefined,
        "oldest"
      ),
    staleTime: 20000,
  });

  // Filter owed commissions by search term
  const filteredOwed = React.useMemo(() => {
    if (!searchQuery.trim()) return owedCommissions;
    const q = searchQuery.toLowerCase();
    return owedCommissions.filter(
      (item) =>
        (item.applicant && item.applicant.toLowerCase().includes(q)) ||
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.transaction_name && item.transaction_name.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q))
    );
  }, [owedCommissions, searchQuery]);

  // Toggle selection for batching
  const toggleSelectTx = (txName: string) => {
    setSelectedTxNames((prev) =>
      prev.includes(txName) ? prev.filter((id) => id !== txName) : [...prev, txName]
    );
  };

  const handleSelectAll = () => {
    if (selectedTxNames.length === filteredOwed.length) {
      setSelectedTxNames([]);
    } else {
      setSelectedTxNames(
        filteredOwed.map((item) => item.transaction_name || item.name).filter(Boolean)
      );
    }
  };

  // Selected Owed Totals
  const selectedTotalAmount = React.useMemo(() => {
    return filteredOwed
      .filter((item) => selectedTxNames.includes(item.transaction_name || item.name))
      .reduce((sum, item) => sum + (Number(item.commission_amount || item.amount) || 0), 0);
  }, [filteredOwed, selectedTxNames]);

  // ACTION 1: Create Commission Batch
  const handleCreateBatch = async () => {
    if (!selectedContractor) {
      toast.error("Contractor Required", { description: "Please select an agency contractor." });
      return;
    }
    if (!selectedCountry) {
      toast.error("Destination Country Required", { description: "Please specify destination country." });
      return;
    }

    setIsCreatingBatch(true);
    try {
      const batch = await createCommissionBatchV2(
        selectedContractor,
        selectedCountry,
        selectedTxNames.length > 0 ? selectedTxNames : undefined
      );

      setActiveBatch(batch);
      setSelectedTxNames([]);
      toast.success("Commission Batch Created", {
        description: `Generated ${batch.name} with ${batch.items?.length || selectedTxNames.length} items.`,
      });
      refetchOwed();
    } catch (err: any) {
      toast.error("Batch Creation Failed", {
        description: err?.message || "Backend rejected commission batch creation.",
      });
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // ACTION 2: Download Fresh Invoice PDF via Binary Proxy
  const handleDownloadInvoicePdf = async () => {
    if (!activeBatch?.name) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await getBatchInvoicePdfV2(activeBatch.name);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${activeBatch.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Invoice PDF Downloaded", {
        description: `Rendered on-demand invoice for ${activeBatch.name}.`,
      });
    } catch (err: any) {
      toast.error("PDF Download Failed", {
        description: err?.message || "Backend could not render invoice PDF.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // ACTION 3: Upload Payment Proof & Fuzzy Match
  const handleUploadPaymentProof = async () => {
    if (!activeBatch?.name || !paymentProofFile) {
      toast.error("No file selected", { description: "Select a payment proof CSV or PDF first." });
      return;
    }

    setIsUploadingProof(true);
    try {
      // 1. Upload via /api/method/upload_file
      const uploadRes = await uploadFileV2(
        paymentProofFile,
        false,
        "Commission Batch Request",
        activeBatch.name
      );

      // 2. Fuzzy match against batch items
      const result = await uploadBatchPaymentProofV2(activeBatch.name, uploadRes.file_url);
      setProofMatchResult(result);
      setPaymentProofFile(null);

      toast.success("Payment Proof Analyzed", {
        description: `Matched ${result.matched_items.length} items. ${result.unmatched_names.length} unmatched.`,
      });
    } catch (err: any) {
      toast.error("Payment Proof Upload Failed", {
        description: err?.message || "Backend could not process payment proof.",
      });
    } finally {
      setIsUploadingProof(false);
    }
  };

  // ACTION 4: Partial Settlement (Settle Selected Items)
  const handleSettleBatchItems = async () => {
    if (selectedItemRowNames.length === 0) {
      toast.error("No items selected", { description: "Select batch items to mark as Paid." });
      return;
    }

    setIsSettlingItems(true);
    try {
      await settleBatchItemsV2(selectedItemRowNames);
      toast.success("Partial Settlement Complete", {
        description: `Marked ${selectedItemRowNames.length} batch items as Paid.`,
      });
      setSelectedItemRowNames([]);

      // Update active batch item statuses locally
      if (activeBatch && activeBatch.items) {
        const updatedItems = activeBatch.items.map((it: any) =>
          selectedItemRowNames.includes(it.name) ? { ...it, status: "Paid" } : it
        );
        const allPaid = updatedItems.every((it: any) => it.status === "Paid");
        setActiveBatch({
          ...activeBatch,
          status: allPaid ? "Settled" : "Partially Settled",
          items: updatedItems,
        });
      }
      refetchOwed();
    } catch (err: any) {
      toast.error("Partial Settlement Failed", {
        description: err?.message || "Backend rejected item settlement.",
      });
    } finally {
      setIsSettlingItems(false);
    }
  };

  // ACTION 5: Full Batch Settlement
  const handleSettleEntireBatch = async () => {
    if (!activeBatch?.name) return;
    if (!settlementReference.trim()) {
      toast.error("Reference Required", {
        description: "Please enter a wire transfer or bank transaction reference.",
      });
      return;
    }

    setIsSettlingWholeBatch(true);
    try {
      await settleBatchV2(activeBatch.name, settlementReference.trim());
      toast.success("Batch Settled Successfully", {
        description: `${activeBatch.name} marked Settled with ref ${settlementReference}.`,
      });
      setActiveBatch({
        ...activeBatch,
        status: "Settled",
        settlement_reference: settlementReference.trim(),
      });
      setSettlementReference("");
      refetchOwed();
    } catch (err: any) {
      toast.error("Settlement Failed", {
        description: err?.message || "Backend rejected batch settlement.",
      });
    } finally {
      setIsSettlingWholeBatch(false);
    }
  };

  // ACTION 6: Export Commissions XLSX
  const handleExportCommissionsXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await exportCommissionsXlsxV2(
        selectedContractor || undefined,
        selectedCountry || undefined
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Commissions_${selectedContractor || "All"}_${selectedCountry}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Commissions XLSX Exported", {
        description: "Spreadsheet downloaded successfully.",
      });
    } catch (err: any) {
      toast.error("Export Failed", {
        description: err?.message || "Backend rejected spreadsheet export.",
      });
    } finally {
      setIsExportingXlsx(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Overview Bar                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Commission Batches & Foreign Agency Settlement
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            >
              V2 FINANCE ARCHITECTURE
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Batch owed commissions, render on-demand invoice PDFs, process payment proof fuzzy-matching, and execute partial or full settlements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchOwed()}
            className="text-xs h-8"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isExportingXlsx}
            onClick={handleExportCommissionsXlsx}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            {isExportingXlsx ? "Exporting..." : "Export .xlsx"}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Contractor & Corridor Scope Filter Bar                        */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-[#262632] bg-white dark:bg-[#121217] shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Foreign Contractor / Partner
            </label>
            <select
              value={selectedContractor}
              onChange={(e) => {
                setSelectedContractor(e.target.value);
                setSelectedTxNames([]);
              }}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs text-slate-900 dark:text-white"
            >
              {contractors.map((c: any) => (
                <option key={c.name} value={c.name}>
                  {c.contractor_name || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Destination Corridor
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedTxNames([]);
              }}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs text-slate-900 dark:text-white"
            >
              <option value="Saudi Arabia">Saudi Arabia (SAR)</option>
              <option value="Kuwait">Kuwait (KWD)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Search Candidates / Transactions
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Candidate name, ID..."
                className="h-8 pl-8 text-xs bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-[11px] text-emerald-900 dark:text-emerald-300">
              <span className="font-bold">{filteredOwed.length}</span> unbatched commissions owed
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: ACTIVE COMMISSION BATCH WORKSPACE                  */}
      {/* ------------------------------------------------------------- */}
      {activeBatch && (
        <Card className="border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/30">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Active Batch: <span className="font-mono text-emerald-800 dark:text-emerald-400">{activeBatch.name}</span>
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      activeBatch.status === "Settled"
                        ? "border-emerald-400 text-emerald-800 bg-emerald-100 dark:bg-emerald-900"
                        : activeBatch.status === "Partially Settled"
                        ? "border-amber-400 text-amber-800 bg-amber-100 dark:bg-amber-900"
                        : "border-slate-300 text-slate-600 bg-slate-100"
                    )}
                  >
                    {activeBatch.status}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  Contractor: <strong>{activeBatch.contractor}</strong> • Corridor: <strong>{activeBatch.destination_country || selectedCountry}</strong> • Total: <strong>{activeBatch.total_amount_birr || activeBatch.total_amount} {activeBatch.currency || "ETB"}</strong>
                </CardDescription>
              </div>

              {/* Top Batch Actions */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDownloadingPdf}
                  onClick={handleDownloadInvoicePdf}
                  className="text-xs h-8 bg-white dark:bg-[#121217]"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  {isDownloadingPdf ? "Rendering PDF..." : "Download Invoice PDF"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveBatch(null)}
                  className="text-xs h-8 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Batch Item Child Rows Table */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                  Batch Items ({activeBatch.items?.length || 0})
                </span>
                {selectedItemRowNames.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSettlingItems}
                    onClick={handleSettleBatchItems}
                    className="h-7 text-xs bg-emerald-900 hover:bg-emerald-950 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Settle {selectedItemRowNames.length} Selected Items
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#22222a] bg-white dark:bg-[#121216]">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#181820] border-b border-slate-100 dark:border-[#202028]">
                    <tr>
                      <th className="py-2 px-3 w-8"></th>
                      <th className="py-2 px-3">Item Row</th>
                      <th className="py-2 px-3">Candidate</th>
                      <th className="py-2 px-3">Transaction</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                    {(activeBatch.items || []).length > 0 ? (
                      activeBatch.items!.map((it: any) => {
                        const isPending = it.status !== "Paid";
                        const isSelected = selectedItemRowNames.includes(it.name);
                        return (
                          <tr key={it.name || it.transaction} className="hover:bg-slate-50 dark:hover:bg-[#15151c]">
                            <td className="py-2 px-3">
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedItemRowNames((prev) =>
                                      prev.includes(it.name)
                                        ? prev.filter((id) => id !== it.name)
                                        : [...prev, it.name]
                                    )
                                  }
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Square className="h-4 w-4 text-slate-300" />
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono">{it.name || "Row"}</td>
                            <td className="py-2 px-3 font-semibold">{it.applicant || it.applicant_name || "Candidate"}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{it.transaction || it.transaction_name}</td>
                            <td className="py-2 px-3 font-bold">{it.amount || "—"}</td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  it.status === "Paid"
                                    ? "border-emerald-300 text-emerald-800 bg-emerald-50"
                                    : "border-amber-300 text-amber-800 bg-amber-50"
                                )}
                              >
                                {it.status || "Pending"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Batch items awaiting server hydration.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sub-Panels: Payment Proof Upload & Whole Batch Settlement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Payment Proof Fuzzy Match Dropzone */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileUp className="h-3.5 w-3.5 text-emerald-600" />
                    Upload Agency Payment Proof (CSV / PDF)
                  </span>
                  <span className="text-[10px] text-slate-400">Fuzzy Match Engine</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv,.pdf"
                    onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 dark:file:bg-[#1e1e28] file:text-slate-800 dark:file:text-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!paymentProofFile || isUploadingProof}
                    onClick={handleUploadPaymentProof}
                    className="text-xs h-7 bg-emerald-900 hover:bg-emerald-950 text-white"
                  >
                    {isUploadingProof ? <Loader2 className="h-3 w-3 animate-spin" /> : "Fuzzy Match"}
                  </Button>
                </div>

                {proofMatchResult && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#171720] text-xs space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-800 font-bold">
                        ✓ {proofMatchResult.matched_items.length} Matched
                      </span>
                      <span className="text-amber-800 font-bold">
                        • {proofMatchResult.unmatched_names.length} Unmatched
                      </span>
                    </div>
                    {proofMatchResult.unmatched_names.length > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Unmatched names from proof: {proofMatchResult.unmatched_names.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Settle Entire Batch Form */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Settle Entire Batch
                  </span>
                  <span className="text-[10px] text-slate-400">Full Settlement</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={settlementReference}
                    onChange={(e) => setSettlementReference(e.target.value)}
                    placeholder="Wire reference, bank transfer ID..."
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!settlementReference.trim() || isSettlingWholeBatch}
                    onClick={handleSettleEntireBatch}
                    className="text-xs h-7 bg-slate-900 text-white dark:bg-white dark:text-slate-900 whitespace-nowrap"
                  >
                    {isSettlingWholeBatch ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Settled"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: OWED UNBATCHED COMMISSIONS QUEUE                   */}
      {/* ------------------------------------------------------------- */}
      <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Layers className="h-4 w-4 text-emerald-600" />
                Owed Commissions Queue (get_owed_commissions)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Approved, unbatched commissions awaiting foreign agency billing and batch generation.
              </CardDescription>
            </div>

            {/* Batch Creation Action Bar */}
            <div className="flex items-center gap-2">
              {selectedTxNames.length > 0 && (
                <div className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Selected: <span className="text-emerald-800 dark:text-emerald-400 font-bold">{selectedTxNames.length}</span> ({selectedTotalAmount.toLocaleString()} {filteredOwed[0]?.currency || "SAR"})
                </div>
              )}

              <Button
                type="button"
                size="sm"
                disabled={filteredOwed.length === 0 || isCreatingBatch}
                onClick={handleCreateBatch}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
              >
                {isCreatingBatch ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Receipt className="h-3.5 w-3.5 mr-1.5" />
                )}
                {selectedTxNames.length > 0
                  ? `Create Batch (${selectedTxNames.length} items)`
                  : "Batch All Owed"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#171720] border-b border-slate-100 dark:border-[#202028]">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <button type="button" onClick={handleSelectAll} title="Select All">
                      {selectedTxNames.length > 0 && selectedTxNames.length === filteredOwed.length ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Transaction Name</th>
                  <th className="py-2.5 px-3">Candidate</th>
                  <th className="py-2.5 px-3">Agency Partner</th>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">Departure Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Batch Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                {isOwedLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />
                      Loading owed commissions...
                    </td>
                  </tr>
                ) : filteredOwed.length > 0 ? (
                  filteredOwed.map((item) => {
                    const txId = item.transaction_name || item.name;
                    const isSelected = selectedTxNames.includes(txId);
                    return (
                      <tr
                        key={txId}
                        className={cn(
                          "hover:bg-slate-50 dark:hover:bg-[#15151c] transition-colors",
                          isSelected && "bg-emerald-50/40 dark:bg-emerald-950/20"
                        )}
                      >
                        <td className="py-2.5 px-3">
                          <button type="button" onClick={() => toggleSelectTx(txId)}>
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {txId}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {item.full_name || item.applicant || "Candidate"}
                        </td>
                        <td className="py-2.5 px-3">{item.contractor_name || item.contractor}</td>
                        <td className="py-2.5 px-3">{item.destination_country || selectedCountry}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {item.departure_date ? new Date(item.departure_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                          {(Number(item.commission_amount || item.amount) || 0).toLocaleString()} {item.currency || "SAR"}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.batch ? (
                            <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 text-emerald-800">
                              {item.batch}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                              Unbatched
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Zero unbatched owed commissions found for selected contractor and corridor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
