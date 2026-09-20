"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Receipt,
  DollarSign,
  Layers,
  FileText,
  CheckCircle2,
  CreditCard,
  Settings,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  RefreshCw,
  X,
  CheckSquare,
  Square,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  ArrowRight,
  Trash2,
  HelpCircle,
  Info,
  ChevronRight,
  Check,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getOwedCommissionsV2,
  createCommissionBatchV2,
  listCommissionBatchesV2,
  getCommissionBatchV2,
  getBatchInvoicePdfV2,
  settleBatchItemsV2,
  settleBatchV2,
  updateBatchAdvanceV2,
  writeOffBatchV2,
  listBatchWriteOffsV2,
  releaseUnpaidItemsV2,
  V2OwedCommissionItem,
  V2CommissionBatch,
  V2CommissionBatchItem,
  V2SupportedCurrency,
} from "@/lib/api/v2/finance";
import {
  listContractorsV2,
  getContractorV2,
  updateContractorBatchConfigV2,
  getCommissionRatesV2,
  setCommissionRatesV2,
  V2ContractorRecord,
  V2ContractorCommissionRate,
} from "@/lib/api/v2/contractors";
import { exportCommissionsXlsxV2 } from "@/lib/api/v2/reports";
import { downloadBackendSpreadsheet } from "@/lib/utils/reportExport";
import { uploadFileV2 } from "@/lib/api/v2/documents";
import { listApplicantsV2 } from "@/lib/api/v2/applicants";
import { listPlacementsV2 } from "@/lib/api/v2/placements";
import { requestV2 } from "@/lib/api/v2/client";
import { ContractorRateMatrixModal } from "@/components/contractors/ContractorRateMatrixModal";
import { FxRateModal } from "@/components/finance/FxRateModal";
import { Coins, TrendingUp } from "lucide-react";

type CommissionTab =
  | "owed"
  | "batch_management"
  | "config";

export default function AdminCommissionPage() {
  const queryClient = useQueryClient();
  const { roles, user: currentUserName } = useAuth();
  const userRoles = Array.isArray(roles) ? roles.map(String) : [];
  const isFinanceManagerOrAdmin = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin", "Finance Manager"].includes(r)
  );
  const isAdminUser = userRoles.some((r) =>
    ["Administrator", "System Manager", "Admin"].includes(r)
  );

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<CommissionTab>("owed");

  // Global Scope Filters
  const [selectedContractor, setSelectedContractor] = React.useState<string>("");
  const [selectedCountry, setSelectedCountry] = React.useState<string>("Saudi Arabia");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Multi-select for Batch Creation (Unbatched Owed Commissions)
  const [selectedTxNames, setSelectedTxNames] = React.useState<string[]>([]);
  const [isCreatingBatch, setIsCreatingBatch] = React.useState<boolean>(false);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = React.useState<boolean>(false);

  // Rate Matrix and FX Modals
  const [isRateMatrixModalOpen, setIsRateMatrixModalOpen] = React.useState<boolean>(false);
  const [isFxModalOpen, setIsFxModalOpen] = React.useState<boolean>(false);

  // Active Selected Batch (CBR-#####) for Detailed Inspection / Settlement / Invoice
  const [selectedBatchName, setSelectedBatchName] = React.useState<string>("");
  const [activeBatch, setActiveBatch] = React.useState<V2CommissionBatch | null>(null);
  const [isLoadingBatchDetail, setIsLoadingBatchDetail] = React.useState<boolean>(false);

  // Four-eyes settlement guard: a batch over 100,000 ETB created by the current (non-Admin)
  // user needs an Admin to approve settlement.
  const batchOwnerLower = (activeBatch?.owner || "").toLowerCase().trim();
  const selfCreatedBatch =
    !!batchOwnerLower &&
    !!currentUserName &&
    batchOwnerLower === currentUserName.toLowerCase().trim();
  const needsSecondApprover =
    !!activeBatch &&
    (Number(activeBatch.total_amount_birr ?? 0) || 0) > 100000 &&
    selfCreatedBatch &&
    !isAdminUser;

  // Batch List Filter (Tab 2)
  const [batchStatusFilter, setBatchStatusFilter] = React.useState<string>("All");

  // Partial Settlement: Multi-select batch item names
  const [selectedItemRowNames, setSelectedItemRowNames] = React.useState<string[]>([]);
  const [isSettlingItems, setIsSettlingItems] = React.useState<boolean>(false);

  // Whole Batch Settlement
  const [settlementReference, setSettlementReference] = React.useState<string>("");
  const [isSettlingWholeBatch, setIsSettlingWholeBatch] = React.useState<boolean>(false);

  // Advance Payment Modal States
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = React.useState<boolean>(false);
  const [advanceAmountInput, setAdvanceAmountInput] = React.useState<string>("");
  const [isSubmittingAdvance, setIsSubmittingAdvance] = React.useState<boolean>(false);
  const [advanceConfirmStep, setAdvanceConfirmStep] = React.useState<boolean>(false);

  // Batch Creation Custom States (Advance & Include Unpaid from Previous)
  const [createBatchAdvance, setCreateBatchAdvance] = React.useState<string>("");
  const [includeUnpaidPrevious, setIncludeUnpaidPrevious] = React.useState<boolean>(false);

  // Write-Off Batch Modal States
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = React.useState<boolean>(false);
  const [writeOffAmountInput, setWriteOffAmountInput] = React.useState<string>("");
  const [writeOffReasonInput, setWriteOffReasonInput] = React.useState<string>("");
  const [isSubmittingWriteOff, setIsSubmittingWriteOff] = React.useState<boolean>(false);

  // Releasing Unpaid Items State
  const [isReleasingItems, setIsReleasingItems] = React.useState<boolean>(false);

  // Unsettled-only filter for batch management sidebar (default to false to show all batches)
  const [showUnsettledOnly, setShowUnsettledOnly] = React.useState<boolean>(false);
  const [batchWorkspaceView, setBatchWorkspaceView] = React.useState<"all" | "items" | "invoice" | "settlement" | "partial">("all");

  // Binary PDF and XLSX export loading states
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState<boolean>(false);
  const [isExportingXlsx, setIsExportingXlsx] = React.useState<boolean>(false);

  // Contractor Batch Config States (Tab 7)
  const [configContractorName, setConfigContractorName] = React.useState<string>("");
  const [configBatchMode, setConfigBatchMode] = React.useState<string>("Manual Only");
  const [configBatchThreshold, setConfigBatchThreshold] = React.useState<number>(10);
  const [configRates, setConfigRates] = React.useState<
    Array<{
      destination_country: string;
      gender?: "Both" | "Male" | "Female" | string;
      rate: number;
      currency: string;
    }>
  >([]);
  const [isSavingConfig, setIsSavingConfig] = React.useState<boolean>(false);

  // Action Confirmation States
  const [rateIndexToRemove, setRateIndexToRemove] = React.useState<number | null>(null);
  const [isSettleBatchConfirmOpen, setIsSettleBatchConfirmOpen] = React.useState<boolean>(false);

  // =========================================================================
  // 1. Fetch Contractors List
  // =========================================================================
  const { data: contractors = [], isLoading: isContractorsLoading } = useQuery({
    queryKey: ["v2_contractors_for_commission"],
    queryFn: () => listContractorsV2(),
    staleTime: 60000,
  });

  // Set default contractor when list loads
  React.useEffect(() => {
    if (!selectedContractor && contractors.length > 0) {
      const initial = contractors[0].name || contractors[0].contractor_name;
      setSelectedContractor(initial);
      setConfigContractorName(initial);
    }
  }, [contractors, selectedContractor]);

  // Keep configContractorName in sync if not initialized
  React.useEffect(() => {
    if (!configContractorName && selectedContractor) {
      setConfigContractorName(selectedContractor);
    }
  }, [selectedContractor, configContractorName]);

  // =========================================================================
  // 2. Fetch Selected Contractor Record (for Batch Mode & Thresholds)
  // =========================================================================
  const {
    data: currentContractorDoc,
    isLoading: isCurrentContractorLoading,
    refetch: refetchContractorDoc,
  } = useQuery<V2ContractorRecord | null>({
    queryKey: ["v2_contractor_detail", configContractorName || selectedContractor],
    queryFn: () => getContractorV2(configContractorName || selectedContractor),
    enabled: Boolean(configContractorName || selectedContractor),
    staleTime: 30000,
  });

  // Hydrate Contractor Config state when contractor doc loads
  React.useEffect(() => {
    if (currentContractorDoc) {
      setConfigBatchMode(currentContractorDoc.batch_mode || "Manual Only");
      setConfigBatchThreshold(Number(currentContractorDoc.batch_threshold) || 10);
    }
  }, [currentContractorDoc]);

  // Fetch Authoritative Contractor Default Commission Rates via contractor_api.get_commission_rates
  const {
    data: contractorRates = [],
    isLoading: isContractorRatesLoading,
    refetch: refetchContractorRates,
  } = useQuery<V2ContractorCommissionRate[]>({
    queryKey: ["v2_contractor_rates", configContractorName || selectedContractor],
    queryFn: () => getCommissionRatesV2(configContractorName || selectedContractor),
    enabled: Boolean(configContractorName || selectedContractor),
    staleTime: 30000,
    retry: false,
  });

  // =========================================================================
  // 3. Fetch Owed (Unbatched, Approved) Commissions
  // =========================================================================
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
    enabled: !!selectedContractor,
    staleTime: 20000,
  });

  // Fetch Applicants list to resolve full names of departed candidates across all commission tables
  const { data: applicants = [] } = useQuery({
    queryKey: ["applicants"],
    queryFn: () => listApplicantsV2(),
    staleTime: 60000,
  });

  // Fetch Placements list to resolve placement -> applicant linkages
  const { data: placements = [] } = useQuery({
    queryKey: ["v2_placements_for_commission"],
    queryFn: () => listPlacementsV2(),
    staleTime: 60000,
  });

  const applicantMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const a of applicants) {
      const name = a.full_name || [a.first_name, a.last_name].filter(Boolean).join(" ") || a.name;
      map.set(String(a.name).toLowerCase().trim(), name);
      if (a.passport_number) {
        map.set(String(a.passport_number).toLowerCase().trim(), name);
      }
    }
    return map;
  }, [applicants]);

  const placementMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of placements) {
      if (p.name && p.applicant) {
        map.set(String(p.name).toLowerCase().trim(), String(p.applicant).toLowerCase().trim());
      }
    }
    return map;
  }, [placements]);

  // Fetch all transactions to link batch requests & transactions to placements & applicants
  const { data: allTransactions = [] } = useQuery({
    queryKey: ["v2_all_applicant_transactions_for_commission"],
    queryFn: async () => {
      try {
        const res = await requestV2<any[]>("/api/method/frappe.client.get_list", {
          method: "POST",
          body: {
            doctype: "Applicant Transaction",
            fields: JSON.stringify([
              "name",
              "placement",
              "applicant",
              "commission_batch_request",
              "transaction_type",
              "amount_original",
              "currency_original",
              "status",
            ]),
            limit_page_length: 500,
          },
        });
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const txMap = React.useMemo(() => {
    const map = new Map<string, { placement?: string; applicant?: string; candidateName?: string }>();
    for (const t of allTransactions) {
      const txId = String(t.name).toLowerCase().trim();
      const plcId = t.placement ? String(t.placement).toLowerCase().trim() : undefined;
      const appId = t.applicant
        ? String(t.applicant).toLowerCase().trim()
        : (plcId ? placementMap.get(plcId) : undefined);
      const candidateName = appId ? applicantMap.get(appId) : undefined;
      map.set(txId, { placement: plcId, applicant: appId, candidateName });
    }
    return map;
  }, [allTransactions, placementMap, applicantMap]);

  const batchApplicantsMap = React.useMemo(() => {
    const map = new Map<string, Array<{ txId: string; appId?: string; name: string }>>();
    for (const t of allTransactions) {
      if (!t.commission_batch_request) continue;
      const bId = String(t.commission_batch_request).trim();
      const plcId = t.placement ? String(t.placement).toLowerCase().trim() : undefined;
      const appId = t.applicant
        ? String(t.applicant).toLowerCase().trim()
        : (plcId ? placementMap.get(plcId) : undefined);
      const candidateName = appId ? applicantMap.get(appId) : undefined;
      const name = candidateName || appId || t.name;
      const list = map.get(bId) || [];
      if (!list.some((item) => item.txId === t.name)) {
        list.push({ txId: t.name, appId: appId ? appId.toUpperCase() : undefined, name });
      }
      map.set(bId, list);
    }
    return map;
  }, [allTransactions, placementMap, applicantMap]);

  const getCandidateName = React.useCallback(
    (itemOrKey: any): string => {
      if (!itemOrKey) return "—";
      if (typeof itemOrKey === "object") {
        if (itemOrKey.full_name && itemOrKey.full_name !== "Applicant" && itemOrKey.full_name !== "Candidate") {
          return itemOrKey.full_name;
        }
        if (itemOrKey.applicant_name && itemOrKey.applicant_name !== "Applicant" && itemOrKey.applicant_name !== "Candidate") {
          return itemOrKey.applicant_name;
        }
        const rawKey =
          itemOrKey.applicant ||
          itemOrKey.placement ||
          itemOrKey.transaction ||
          itemOrKey.transaction_name ||
          itemOrKey.name;
        return getCandidateName(rawKey);
      }

      const str = String(itemOrKey).trim();
      const lower = str.toLowerCase();

      // 1. Direct applicant name / passport match
      if (applicantMap.has(lower)) {
        return applicantMap.get(lower)!;
      }

      // 2. Transaction match
      if (txMap.has(lower)) {
        const resolved = txMap.get(lower);
        if (resolved?.candidateName) return resolved.candidateName;
        if (resolved?.applicant && applicantMap.has(resolved.applicant)) {
          return applicantMap.get(resolved.applicant)!;
        }
        if (resolved?.placement && placementMap.has(resolved.placement)) {
          const aId = placementMap.get(resolved.placement)!;
          if (applicantMap.has(aId)) return applicantMap.get(aId)!;
        }
      }

      // 3. Placement match
      if (placementMap.has(lower)) {
        const aId = placementMap.get(lower)!;
        if (applicantMap.has(aId)) return applicantMap.get(aId)!;
      }

      // 4. If it's already a full person name (not an ID and not "Applicant" / "Candidate")
      if (!/^([A-Z]{3,4}-\d+|Applicant|Candidate)$/i.test(str) && str.length > 2) {
        return str;
      }

      return str;
    },
    [applicantMap, txMap, placementMap]
  );

  // Filter owed commissions by search query
  const filteredOwed = React.useMemo(() => {
    if (!searchQuery.trim()) return owedCommissions;
    const q = searchQuery.toLowerCase();
    return owedCommissions.filter((item) => {
      const candName = getCandidateName(item).toLowerCase();
      return (
        candName.includes(q) ||
        (item.applicant && item.applicant.toLowerCase().includes(q)) ||
        (item.placement && item.placement.toLowerCase().includes(q)) ||
        (item.transaction_name && item.transaction_name.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q))
      );
    });
  }, [owedCommissions, searchQuery, getCandidateName]);

  // Toggle selection for batching
  const toggleSelectTx = (txName: string) => {
    setSelectedTxNames((prev) =>
      prev.includes(txName) ? prev.filter((id) => id !== txName) : [...prev, txName]
    );
  };

  const handleSelectAllOwed = () => {
    if (selectedTxNames.length === filteredOwed.length) {
      setSelectedTxNames([]);
    } else {
      setSelectedTxNames(
        filteredOwed.map((item) => item.transaction_name || item.name).filter(Boolean)
      );
    }
  };

  // Selected Owed Totals
  const selectedOwedTotalAmount = React.useMemo(() => {
    return filteredOwed
      .filter((item) => selectedTxNames.includes(item.transaction_name || item.name))
      .reduce((sum, item) => sum + (Number(item.commission_amount || item.amount) || 0), 0);
  }, [filteredOwed, selectedTxNames]);

  // =========================================================================
  // 4. Fetch All Commission Batch Requests (CBR-#####)
  // =========================================================================
  const {
    data: commissionBatches = [],
    isLoading: isBatchesLoading,
    refetch: refetchBatches,
  } = useQuery<V2CommissionBatch[]>({
    queryKey: ["v2_commission_batches_list"],
    queryFn: () => listCommissionBatchesV2(),
    staleTime: 30000,
  });

  // Filter batches by selected contractor, country, status, and unsettled filter
  const filteredBatches = React.useMemo(() => {
    return commissionBatches.filter((b) => {
      const matchContractor = selectedContractor
        ? b.contractor === selectedContractor || b.contractor_name === selectedContractor
        : true;
      const matchCountry = selectedCountry
        ? !b.destination_country || b.destination_country === selectedCountry
        : true;
      const matchStatus =
        batchStatusFilter === "All" ? true : b.status === batchStatusFilter;
      const matchUnsettled = showUnsettledOnly
        ? b.status !== "Settled" && b.status !== "Written Off"
        : true;
      const matchSearch = searchQuery.trim()
        ? b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (b.contractor && b.contractor.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchContractor && matchCountry && matchStatus && matchUnsettled && matchSearch;
    });
  }, [commissionBatches, selectedContractor, selectedCountry, batchStatusFilter, showUnsettledOnly, searchQuery]);

  const totalUnsettledBatchesCount = React.useMemo(() => {
    return commissionBatches.filter((b) => b.status !== "Settled" && b.status !== "Written Off").length;
  }, [commissionBatches]);

  // =========================================================================
  // 5. Fetch Active Batch Details with Child Items
  // =========================================================================
  const loadBatchDetails = async (batchName: string) => {
    if (!batchName) return;
    setIsLoadingBatchDetail(true);
    try {
      const [doc, writeOffs] = await Promise.all([
        getCommissionBatchV2(batchName),
        listBatchWriteOffsV2(batchName).catch(() => []),
      ]);
      if (doc) {
        if (Array.isArray(writeOffs) && writeOffs.length > 0) {
          doc.write_offs = writeOffs;
        }
        setActiveBatch(doc);
        setSelectedBatchName(doc.name);
        setSelectedItemRowNames([]);
      }
    } catch (err: any) {
      toast.error("Could Not Load Batch Details", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsLoadingBatchDetail(false);
    }
  };

  // If selectedBatchName changes, reload batch details
  React.useEffect(() => {
    if (selectedBatchName) {
      loadBatchDetails(selectedBatchName);
    }
  }, [selectedBatchName]);

  // =========================================================================
  // ACTIONS & HANDLERS
  // =========================================================================

  // ACTION 1: Create Commission Batch
  const handleCreateBatch = async () => {
    if (!selectedContractor) {
      toast.error("Partner Agency Required", {
        description: "Please select a partner agency first.",
      });
      return;
    }
    if (!selectedCountry) {
      toast.error("Destination Country Required", {
        description: "Please specify the destination country.",
      });
      return;
    }

    setIsCreatingBatch(true);
    try {
      const advNum = createBatchAdvance.trim() ? Number(createBatchAdvance) : undefined;
      const batch = await createCommissionBatchV2(
        selectedContractor,
        selectedCountry,
        selectedTxNames.length > 0 ? selectedTxNames : undefined,
        undefined,
        advNum,
        includeUnpaidPrevious
      );

      setSelectedBatchName(batch.name);
      setActiveBatch(batch);
      setSelectedTxNames([]);
      setCreateBatchAdvance("");
      setIncludeUnpaidPrevious(false);
      toast.success("Commission Batch Created", {
        description: `Successfully created batch ${batch.name}.`,
      });
      refetchOwed();
      refetchBatches();
      setActiveTab("batch_management");
    } catch (err: any) {
      toast.error("Batch Creation Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsCreatingBatch(false);
    }
  };



  // ACTION 3: Download Invoice PDF
  const handleDownloadInvoicePdf = async (batchName?: string) => {
    const target = batchName || activeBatch?.name;
    if (!target) {
      toast.error("No Batch Selected", {
        description: "Please select a commission batch to download its invoice.",
      });
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const blob = await getBatchInvoicePdfV2(target);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${target}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Invoice PDF Downloaded", {
        description: `Rendered authoritative invoice for ${target}.`,
      });
    } catch (err: any) {
      toast.error("PDF Download Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };



  // ACTION 5: Settle Matched Items or Selected Items
  const handleSettleBatchItems = async (itemsToSettle?: string[]) => {
    const items = itemsToSettle || selectedItemRowNames;
    if (items.length === 0) {
      toast.error("No Items Selected", {
        description: "Please select one or more items to mark as Paid.",
      });
      return;
    }

    setIsSettlingItems(true);
    try {
      await settleBatchItemsV2(items);
      toast.success("Items Settled Successfully", {
        description: `Marked ${items.length} batch items as Paid.`,
      });
      setSelectedItemRowNames([]);
      if (activeBatch?.name) {
        await loadBatchDetails(activeBatch.name);
      }
      refetchOwed();
      refetchBatches();
    } catch (err: any) {
      toast.error("Item Settlement Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSettlingItems(false);
    }
  };

  // ACTION 6: Full Batch Settlement
  const handleSettleEntireBatch = async () => {
    if (!activeBatch?.name) return;
    if (!settlementReference.trim()) {
      toast.error("Settlement Reference Required", {
        description: "Please enter a wire transfer or bank transaction reference.",
      });
      return;
    }

    // New four-eyes rule: large batches (total_amount_birr > 100,000 ETB) created by the
    // same current user require a second approver (an Admin). Block locally so the backend
    // PermissionError isn't hit.
    const batchBirrTotal = Number(activeBatch.total_amount_birr ?? 0) || 0;
    const batchOwner = activeBatch.owner || "";
    const isSelfCreated =
      batchOwner &&
      currentUserName &&
      batchOwner.toLowerCase() === currentUserName.toLowerCase();
    if (batchBirrTotal > 100000 && isSelfCreated && !isAdminUser) {
      toast.error("Settlement Requires a Second Approver", {
        description:
          "This batch exceeds 100,000 ETB and was created by you. An Admin/System Manager must approve the settlement.",
      });
      return;
    }

    setIsSettlingWholeBatch(true);
    try {
      await settleBatchV2(activeBatch.name, settlementReference.trim());
      toast.success("Batch Settled Successfully", {
        description: `${activeBatch.name} marked as Settled. Reference: ${settlementReference.trim()}.`,
      });
      setSettlementReference("");
      await loadBatchDetails(activeBatch.name);
      refetchOwed();
      refetchBatches();
    } catch (err: any) {
      toast.error("Settlement Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSettlingWholeBatch(false);
    }
  };

  // ACTION 7: Update Batch Advance Amount
  const handleRecordAdvance = async () => {
    if (!activeBatch?.name) return;
    const amount = Number(advanceAmountInput);
    if (isNaN(amount) || amount < 0) {
      toast.error("Invalid Amount", {
        description: "Please enter a valid non-negative advance amount (0 to clear).",
      });
      return;
    }

    setIsSubmittingAdvance(true);
    try {
      await updateBatchAdvanceV2(activeBatch.name, amount);

      setIsAdvanceModalOpen(false);
      setAdvanceConfirmStep(false);
      setAdvanceAmountInput("");
      toast.success("Batch Advance Updated", {
        description: amount === 0
          ? `Cleared advance on batch ${activeBatch.name}.`
          : `Set requested advance to ${amount.toLocaleString()} ${activeBatch.currency || "ETB"} for batch ${activeBatch.name}.`,
      });
      refetchBatches();
      await loadBatchDetails(activeBatch.name);
    } catch (err: any) {
      toast.error("Advance Update Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSubmittingAdvance(false);
    }
  };



  // ACTION: Write-Off Batch
  const handleWriteOffBatch = async () => {
    const batchName = activeBatch?.name || selectedBatchName;
    if (!batchName) {
      toast.error("No Batch Selected", { description: "Please select a commission batch to write off." });
      return;
    }
    const amount = Number(writeOffAmountInput);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error("Invalid Amount", { description: "Please enter a valid positive write-off amount in the batch currency." });
      return;
    }
    if (!writeOffReasonInput.trim()) {
      toast.error("Reason Required", { description: "Please provide a reason or justification for the batch write-off." });
      return;
    }

    setIsSubmittingWriteOff(true);
    try {
      await writeOffBatchV2(batchName, amount, writeOffReasonInput.trim());
      setIsWriteOffModalOpen(false);
      setWriteOffAmountInput("");
      setWriteOffReasonInput("");
      toast.success("Batch Written Off", {
        description: `Wrote off ${amount.toLocaleString()} ${activeBatch?.currency || "ETB"} for batch ${batchName}. Shortfall booked to Expense Applicant Transaction.`,
      });
      refetchBatches();
      await loadBatchDetails(batchName);
    } catch (err: any) {
      toast.error("Write-Off Failed", { description: formatCleanErrorMessage(err) });
    } finally {
      setIsSubmittingWriteOff(false);
    }
  };

  // ACTION: Release Unpaid Items
  const handleReleaseUnpaidItems = async (itemNamesToRelease?: string[]) => {
    const items = itemNamesToRelease || selectedItemRowNames;
    if (items.length === 0) {
      toast.error("No Items Selected", {
        description: "Please select one or more unpaid items to release back to the unbatched pool.",
      });
      return;
    }

    setIsReleasingItems(true);
    try {
      const res = await releaseUnpaidItemsV2(items);
      toast.success("Unpaid Items Released", {
        description: `Released ${res.count || items.length} unpaid items back to unbatched pool.`,
      });
      setSelectedItemRowNames([]);
      if (activeBatch?.name) {
        await loadBatchDetails(activeBatch.name);
      }
      refetchOwed();
      refetchBatches();
    } catch (err: any) {
      toast.error("Failed to Release Items", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsReleasingItems(false);
    }
  };

  // ACTION 8: Export Commissions Spreadsheet (.xlsx or .csv fallback)
  const handleExportCommissionsXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await exportCommissionsXlsxV2(
        selectedContractor || undefined,
        selectedCountry || undefined
      );
      const fallback = `Commissions_${selectedContractor || "All"}_${selectedCountry || "All"}`;
      const res = await downloadBackendSpreadsheet(blob, fallback);
      toast.success("Spreadsheet Downloaded", {
        description: `Exported as ${res.filename} (${res.format.toUpperCase()}).`,
      });
    } catch (err: any) {
      toast.error("Export Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsExportingXlsx(false);
    }
  };

  // ACTION 9: Save Contractor Batch Configuration
  const handleSaveContractorConfig = async () => {
    const targetContractor = configContractorName || selectedContractor;
    if (!targetContractor) {
      toast.error("Contractor Required", {
        description: "Please select a contractor to configure.",
      });
      return;
    }

    setIsSavingConfig(true);
    try {
      await updateContractorBatchConfigV2(targetContractor, {
        batch_mode: configBatchMode as "Manual Only" | "Auto-Threshold",
        batch_threshold: Number(configBatchThreshold) || 10,
      });

      toast.success("Configuration Saved", {
        description: `Updated batch mode and threshold for ${targetContractor}.`,
      });
      refetchContractorDoc();
    } catch (err: any) {
      toast.error("Configuration Save Failed", {
        description: formatCleanErrorMessage(err),
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleAddRateRow = () => {
    setConfigRates((prev) => [
      ...prev,
      {
        destination_country: "Saudi Arabia",
        gender: "Both",
        rate: 0,
        currency: "SAR",
      },
    ]);
  };

  const handleRemoveRateRow = (index: number) => {
    setConfigRates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRateRow = (index: number, field: string, value: any) => {
    setConfigRates((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* Top Header Bar                                                      */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Commission Batches & Foreign Agency Settlement
            </h1>
          </div>

        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeBatch && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <span>Active:</span>
              <strong className="font-mono">{activeBatch.name}</strong>
              <button
                type="button"
                onClick={() => {
                  setActiveBatch(null);
                  setSelectedBatchName("");
                }}
                className="hover:text-red-500 ml-1"
                title="Clear Active Batch"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetchOwed();
              refetchBatches();
              refetchContractorDoc();
              if (selectedBatchName) loadBatchDetails(selectedBatchName);
            }}
            className="text-xs h-8"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          {isFinanceManagerOrAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFxModalOpen(true)}
              className="text-xs h-8 border-slate-300 dark:border-[#2a2a34]"
              title="Foreign Exchange Rate Management"
            >
              <TrendingUp className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              FX Rates
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            disabled={isExportingXlsx}
            onClick={handleExportCommissionsXlsx}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
            title="Export commissions spreadsheet (Excel / CSV)"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            {isExportingXlsx ? "Exporting..." : "Export Excel / CSV"}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Global Filter & Scope Bar                                           */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-[#262632] bg-white dark:bg-[#121217] shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
              Partner Agency / Contractor
            </label>
            <select
              value={selectedContractor}
              onChange={(e) => {
                setSelectedContractor(e.target.value);
                setConfigContractorName(e.target.value);
                setSelectedTxNames([]);
              }}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs text-slate-900 dark:text-white"
            >
              {contractors.map((c: any) => (
                <option key={c.name} value={c.name} className="dark:bg-[#121217]">
                  {c.contractor_name || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
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
              <option value="Saudi Arabia" className="dark:bg-[#121217]">Saudi Arabia (SAR)</option>
              <option value="Kuwait" className="dark:bg-[#121217]">Kuwait (KWD)</option>
              <option value="United Arab Emirates" className="dark:bg-[#121217]">United Arab Emirates (AED)</option>
              <option value="Qatar" className="dark:bg-[#121217]">Qatar (QAR)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
              Search Candidates / Records
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Candidate, Transaction, Batch ID..."
                className="h-8 pl-8 text-xs bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
              <span>
                <strong>{filteredOwed.length}</strong> unbatched owed
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                Mode: <strong>{currentContractorDoc?.batch_mode || "Manual Only"}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Tab Navigation Bar (3 Tabs)                                         */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#262632] overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("owed")}
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-colors whitespace-nowrap",
            activeTab === "owed"
              ? "bg-emerald-900 text-white dark:bg-emerald-800"
              : "text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-[#1e1e26]"
          )}
        >
          <Layers className="h-4 w-4" />
          <span>Owed Commissions</span>
          {filteredOwed.length > 0 && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 font-bold",
                activeTab === "owed"
                  ? "bg-emerald-950 text-white"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              )}
            >
              {filteredOwed.length}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("batch_management")}
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-colors whitespace-nowrap",
            activeTab === "batch_management"
              ? "bg-emerald-900 text-white dark:bg-emerald-800"
              : "text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-[#1e1e26]"
          )}
        >
          <Receipt className="h-4 w-4" />
          <span>Batch Management</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-bold",
              activeTab === "batch_management"
                ? "bg-emerald-950 text-white"
                : "bg-slate-100 text-slate-700 dark:bg-[#1e1e26] dark:text-zinc-300"
            )}
          >
            {filteredBatches.length}
          </Badge>
          {activeBatch && (
            <span className="text-[10px] font-mono opacity-80">• {activeBatch.name}</span>
          )}
        </button>

        {isFinanceManagerOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={cn(
              "flex items-center gap-2 py-2 px-3 rounded-lg font-medium transition-colors whitespace-nowrap",
              activeTab === "config"
                ? "bg-emerald-900 text-white dark:bg-emerald-800"
                : "text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-[#1e1e26]"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Contractor Config</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: OWED COMMISSIONS QUEUE                                       */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "owed" && (
        <div className="space-y-4">
          {/* Threshold & Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Unbatched Owed Commissions
                </span>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {filteredOwed.length} <span className="text-xs font-normal text-slate-400">records</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Scope: {selectedContractor || "All"} • {selectedCountry}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-3.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Contractor Batch Mode
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-bold",
                      currentContractorDoc?.batch_mode === "Auto-Threshold"
                        ? "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300"
                        : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-zinc-300"
                    )}
                  >
                    {currentContractorDoc?.batch_mode || "Manual Only"}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    Threshold: <strong>{currentContractorDoc?.batch_threshold || 10}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {currentContractorDoc?.batch_mode === "Auto-Threshold"
                    ? `${filteredOwed.length} / ${currentContractorDoc?.batch_threshold || 10} accumulated towards auto-batching.`
                    : "Manual creation enabled for finance manager."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-3.5">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                  Selected For Batching
                </span>
                <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                  {selectedTxNames.length} <span className="text-xs font-normal text-slate-400">items</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Subtotal: <strong>{selectedOwedTotalAmount.toLocaleString()}</strong> {filteredOwed[0]?.currency || "SAR"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Owed Table Card */}
          <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    Unbatched Approved Commissions
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Departed candidates awaiting grouping into an invoice batch. Once batched, they move to the Batch Requests tab.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={filteredOwed.length === 0 || isCreatingBatch}
                    onClick={() => setIsBatchConfirmOpen(true)}
                    className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                  >
                    {isCreatingBatch ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Receipt className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {selectedTxNames.length > 0
                      ? `Create Batch (${selectedTxNames.length} items)`
                      : "Batch All"}
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
                        <button type="button" onClick={handleSelectAllOwed} title="Select All">
                          {selectedTxNames.length > 0 &&
                          selectedTxNames.length === filteredOwed.length ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Candidate / Applicant</th>
                      <th className="py-2.5 px-3">Agency Contractor</th>
                      <th className="py-2.5 px-3">Corridor</th>
                      <th className="py-2.5 px-3">Departure Date</th>
                      <th className="py-2.5 px-3">Commission Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                    {isOwedLoading ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />
                          Loading unbatched commissions...
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
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              {getCandidateName(item)}
                            </td>
                            <td className="py-2.5 px-3">{item.contractor_name || item.contractor}</td>
                            <td className="py-2.5 px-3">{item.destination_country || selectedCountry}</td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {item.departure_date
                                ? new Date(item.departure_date).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {(
                                Number(item.commission_amount || item.amount) || 0
                              ).toLocaleString()}{" "}
                              {item.currency || "SAR"}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className="text-[10px] border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                              >
                                {item.status || "Approved"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No unbatched commissions for this agency in {selectedCountry}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: CONSOLIDATED BATCH MANAGEMENT (MASTER-DETAIL)                */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "batch_management" && (
        <div className="flex flex-col lg:flex-row items-start gap-4">
          {/* Left Column: Batch Selection Sidebar */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-3">
            {/* Filter Card */}
            <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
              <CardContent className="p-3 space-y-2.5">
                {/* Unsettled Toggle */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#1f1f26]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Unsettled Batches Only
                    </span>
                    {totalUnsettledBatchesCount > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-bold bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                        {totalUnsettledBatchesCount}
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUnsettledOnly((prev) => !prev)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                      showUnsettledOnly ? "bg-emerald-600" : "bg-slate-300 dark:bg-zinc-700"
                    )}
                    title={showUnsettledOnly ? "Showing unsettled only (Click to show all)" : "Showing all batches (Click to show unsettled only)"}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        showUnsettledOnly ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Status Pills */}
                <div className="flex items-center gap-1 flex-wrap">
                  {["All", "Draft", "Sent", "Partially Settled", "Settled"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBatchStatusFilter(st)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                        batchStatusFilter === st
                          ? "bg-emerald-900 text-white dark:bg-emerald-800"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1a1a22] dark:text-zinc-400"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <span>Showing <strong>{filteredBatches.length}</strong> batches</span>
                  {selectedBatchName && (
                    <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 truncate max-w-[140px]">
                      Selected: {selectedBatchName}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Scrollable Batches List */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {isBatchesLoading ? (
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="py-8 text-center text-slate-400 text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading commission batches...
                  </CardContent>
                </Card>
              ) : filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => {
                  const isCurrentActive = activeBatch?.name === batch.name || selectedBatchName === batch.name;
                  const candidates = batchApplicantsMap.get(batch.name) || [];
                  const balanceDue = batch.balance_due_original !== undefined
                    ? Number(batch.balance_due_original)
                    : Number(batch.balance_due_birr ?? batch.total_amount) || 0;
                  const totalAmt = Number(batch.total_amount_original ?? batch.total_amount) || 0;

                  return (
                    <div
                      key={batch.name}
                      onClick={() => {
                        setSelectedBatchName(batch.name);
                        loadBatchDetails(batch.name);
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-2",
                        isCurrentActive
                          ? "bg-emerald-50/50 border-emerald-500 shadow-xs dark:bg-emerald-950/20 dark:border-emerald-600 ring-1 ring-emerald-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300 dark:bg-[#121216] dark:border-[#222228] dark:hover:border-[#30303a]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "font-mono font-bold text-xs",
                          isCurrentActive ? "text-emerald-900 dark:text-emerald-300" : "text-slate-900 dark:text-white"
                        )}>
                          {batch.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-bold uppercase px-1.5 py-0",
                            batch.status === "Settled"
                              ? "border-emerald-400 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
                              : batch.status === "Partially Settled"
                              ? "border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950/40"
                              : "border-slate-300 text-slate-600 bg-slate-100 dark:bg-[#1f1f26] dark:text-zinc-300"
                          )}
                        >
                          {batch.status}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate">
                        {batch.contractor_name || batch.contractor}
                        {batch.destination_country ? ` • ${batch.destination_country}` : ""}
                      </div>

                      {/* Candidates count & preview */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] font-medium px-1.5 py-0",
                            candidates.length > 1
                              ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                          )}
                        >
                          {candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}
                        </Badge>
                        {candidates.length > 0 && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[170px]" title={candidates.map(c => c.name).join(", ")}>
                            {candidates.slice(0, 2).map(c => c.name).join(", ")}{candidates.length > 2 ? ` +${candidates.length - 2}` : ""}
                          </span>
                        )}
                      </div>

                      {/* Amount & Balance Due */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#1f1f26] text-[11px]">
                        <span className="text-slate-500">
                          Total: <strong>{totalAmt.toLocaleString()} {batch.currency || "ETB"}</strong>
                        </span>
                        <span className={cn(
                          "font-bold",
                          balanceDue > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                        )}>
                          Due: {balanceDue.toLocaleString()} {batch.currency || "ETB"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                  <CardContent className="py-8 text-center text-slate-400 text-xs space-y-2">
                    <p>
                      {showUnsettledOnly
                        ? "No open/unsettled batches for this agency."
                        : "No batches match the current filters."}
                    </p>
                    {showUnsettledOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowUnsettledOnly(false)}
                        className="text-xs h-7 text-slate-700 dark:text-zinc-300"
                      >
                        Show Settled Batches
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column: Selected Batch Workspace */}
          <div className="flex-1 w-full space-y-4 min-w-0">
            {!activeBatch ? (
              <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                <CardContent className="py-16 text-center space-y-3">
                  <FolderOpen className="h-10 w-10 mx-auto text-slate-400" />
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                    Select a Batch to View & Manage
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click any batch from the list on the left to instantly inspect candidate line items, download official invoice PDF, execute settlement, or manage advances in one consolidated workspace.
                  </p>
                  {filteredBatches.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const first = filteredBatches[0];
                        setSelectedBatchName(first.name);
                        loadBatchDetails(first.name);
                      }}
                      className="bg-emerald-900 hover:bg-emerald-950 text-white text-xs h-8 mt-2"
                    >
                      Select First Batch ({filteredBatches[0].name})
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* 1. Header & Summary Card */}
                <Card className="border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
                  <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/30">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-emerald-600" />
                          <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                            Batch: <span className="font-mono text-emerald-800 dark:text-emerald-400">{activeBatch.name}</span>
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
                          Contractor: <strong>{activeBatch.contractor_name || activeBatch.contractor}</strong> • Corridor: <strong>{activeBatch.destination_country || selectedCountry}</strong> • Created: <strong>{activeBatch.creation ? new Date(activeBatch.creation).toLocaleDateString() : "—"}</strong>
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isDownloadingPdf}
                          onClick={() => handleDownloadInvoicePdf(activeBatch.name)}
                          className="text-xs h-8 bg-white dark:bg-[#121217]"
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                          Download Invoice PDF
                        </Button>

                        {isFinanceManagerOrAdmin && activeBatch.status !== "Settled" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setAdvanceAmountInput(activeBatch.requested_advance_amount ? String(activeBatch.requested_advance_amount) : "");
                              setAdvanceConfirmStep(false);
                              setIsAdvanceModalOpen(true);
                            }}
                            className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer shadow-xs"
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                            Update Advance
                          </Button>
                        )}

                        {isFinanceManagerOrAdmin && activeBatch.status !== "Settled" && activeBatch.status !== "Written Off" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const rem =
                                activeBatch.balance_due_original ??
                                activeBatch.balance_due_birr ??
                                (activeBatch.total_amount_original ?? activeBatch.total_amount);
                              setWriteOffAmountInput(String(rem || ""));
                              setIsWriteOffModalOpen(true);
                            }}
                            className="h-8 text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            Write Off
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Financial Status Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-white dark:bg-[#121216] border border-emerald-200/80 dark:border-emerald-900/40 text-xs mt-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Invoice</span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {(Number(activeBatch.total_amount_original ?? activeBatch.total_amount) || 0).toLocaleString()} {activeBatch.currency || "ETB"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Advance Paid</span>
                        <p className="font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                          {(Number(activeBatch.advance_amount_original ?? activeBatch.advance_amount) || 0).toLocaleString()} {activeBatch.currency || "ETB"}
                        </p>
                        {activeBatch.advance_reference && (
                          <p className="text-[10px] text-slate-400 font-mono truncate">Ref: {activeBatch.advance_reference}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Settled On</span>
                        <p className="font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                          {activeBatch.settled_on || "Pending"}
                        </p>
                        {activeBatch.settlement_reference && (
                          <p className="text-[10px] text-slate-400 font-mono truncate">Ref: {activeBatch.settlement_reference}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Remaining Balance</span>
                        <p className="font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                          {(
                            activeBatch.balance_due_original !== undefined
                              ? Number(activeBatch.balance_due_original)
                              : Number(activeBatch.balance_due_birr ?? activeBatch.total_amount) || 0
                          ).toLocaleString()} {activeBatch.currency || "ETB"}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Sub-nav tabs within selected batch */}
                <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-[#22222a] pb-1 text-xs overflow-x-auto">
                  <span className="text-[11px] font-semibold text-slate-400 mr-1 shrink-0">Section:</span>
                  {[
                    { key: "all", label: "All Sections", icon: Layers },
                    { key: "items", label: `Candidates (${activeBatch.items?.length || 0})`, icon: Receipt },
                    { key: "invoice", label: "Invoice & PDF", icon: FileText },
                    { key: "settlement", label: "Payment & Settlement", icon: ShieldCheck },
                    { key: "partial", label: "Partial & Advances", icon: CreditCard },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = batchWorkspaceView === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setBatchWorkspaceView(tab.key as any)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs whitespace-nowrap cursor-pointer",
                          isActive
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1a1a22] dark:text-zinc-400"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* SECTION 1: Candidates & Items */}
                {(batchWorkspaceView === "all" || batchWorkspaceView === "items") && (
                  <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <Receipt className="h-4 w-4 text-emerald-600" />
                          Batch Candidates & Items ({activeBatch.items?.length || 0})
                        </CardTitle>

                        {selectedItemRowNames.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isReleasingItems}
                              onClick={() => handleReleaseUnpaidItems()}
                              className="h-7 text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              {isReleasingItems ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              Release {selectedItemRowNames.length} Unpaid
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={isSettlingItems}
                              onClick={() => handleSettleBatchItems()}
                              className="h-7 text-xs bg-emerald-900 hover:bg-emerald-950 text-white"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Settle {selectedItemRowNames.length} Selected Items
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#181820] border-b border-slate-100 dark:border-[#202028]">
                            <tr>
                              <th className="py-2 px-3 w-8"></th>
                              <th className="py-2 px-3">Item Row</th>
                              <th className="py-2 px-3">Transaction</th>
                              <th className="py-2 px-3">Candidate / Applicant</th>
                              <th className="py-2 px-3">Commission Amount</th>
                              <th className="py-2 px-3">Item Status</th>
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
                                    <td className="py-2 px-3 font-mono text-slate-500">{it.transaction || it.transaction_name}</td>
                                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                                      {getCandidateName(it)}
                                    </td>
                                    <td className="py-2 px-3 font-bold">{it.amount ? `${Number(it.amount_original ?? it.amount).toLocaleString()} ${it.currency || "SAR"}` : "—"}</td>
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
                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                  Batch items list awaiting records.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* SECTION 2: Invoice & PDF */}
                {(batchWorkspaceView === "all" || batchWorkspaceView === "invoice") && (
                  <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                            <FileText className="h-4 w-4 text-emerald-600" />
                            Official Invoice & Billing Breakdown
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Rendered fresh on-demand with official candidate lists and exchange rates.
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isDownloadingPdf}
                          onClick={() => handleDownloadInvoicePdf(activeBatch.name)}
                          className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                        >
                          {isDownloadingPdf ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Download Invoice PDF
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      {/* Explanatory Notice for Printed Invoice TOTAL */}
                      <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>Official PDF Invoice Printed Total Calculation:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-blue-900 dark:text-blue-300">
                          The printed invoice bottom-line <strong>TOTAL</strong> dynamically lists every write-off (date + reason) and computes:{" "}
                          <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-bold">
                            Batch Total + Requested Advance + Previous Unpaid Arrears − Write-Offs
                          </code>
                          . Stored balance due tracks this batch's own line items minus write-offs and settlements.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#171720] border border-slate-200/80 dark:border-[#24242e]">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 font-semibold">Total Invoiced</span>
                          <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                            {(Number(activeBatch.total_amount_original ?? activeBatch.total_amount) || 0).toLocaleString()} {activeBatch.currency || "ETB"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-emerald-600 font-semibold">Advance Requested</span>
                          <p className="text-base font-bold text-emerald-800 dark:text-emerald-400 mt-0.5">
                            {(Number(activeBatch.advance_amount_original ?? activeBatch.advance_amount) || 0).toLocaleString()} {activeBatch.currency || "ETB"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-amber-600 font-semibold">Stored Balance Due</span>
                          <p className="text-base font-bold text-amber-800 dark:text-amber-400 mt-0.5">
                            {(
                              activeBatch.balance_due_original !== undefined
                                ? Number(activeBatch.balance_due_original)
                                : Number(activeBatch.balance_due_birr ?? activeBatch.total_amount) || 0
                            ).toLocaleString()} {activeBatch.currency || "ETB"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* SECTION 3: Whole Batch Payment & Settlement */}
                {(batchWorkspaceView === "all" || batchWorkspaceView === "settlement") && (
                  <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          Whole Batch Settlement
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold uppercase",
                            activeBatch.status === "Settled"
                              ? "border-emerald-400 text-emerald-800 bg-emerald-50"
                              : "border-amber-400 text-amber-800 bg-amber-50"
                          )}
                        >
                          {activeBatch.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3 text-xs">
                      {activeBatch.status === "Settled" ? (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>
                            This batch was fully settled on <strong>{activeBatch.settled_on || "recorded date"}</strong>.
                            {activeBatch.settlement_reference && (
                              <span className="font-mono ml-1.5">Ref: {activeBatch.settlement_reference}</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#171720] border border-slate-200 dark:border-[#24242e] flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount to Settle</span>
                              <p className="text-base font-bold text-slate-900 dark:text-white">
                                {(Number(activeBatch.total_amount_original ?? activeBatch.total_amount) || 0).toLocaleString()} {activeBatch.currency || "ETB"}
                              </p>
                            </div>
                            {activeBatch.settlement_reference && (
                              <p className="text-[11px] text-emerald-700 font-mono">
                                Ref: {activeBatch.settlement_reference}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Bank Wire / Transaction Reference *</Label>
                            <Input
                              type="text"
                              value={settlementReference}
                              onChange={(e) => setSettlementReference(e.target.value)}
                              placeholder="e.g. WIRE-KW-2026-9942 or CBE-TRX-10294"
                              className="h-8 text-xs"
                            />
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={!settlementReference.trim() || isSettlingWholeBatch || needsSecondApprover}
                            onClick={() => setIsSettleBatchConfirmOpen(true)}
                            className="w-full h-8 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white font-semibold text-xs"
                          >
                            {isSettlingWholeBatch ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Mark Entire Batch as Settled
                          </Button>
                          {needsSecondApprover && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                              This batch exceeds 100,000 ETB and was created by you. An Admin must approve the settlement.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* SECTION 4: Partial Payments & Advances */}
                {(batchWorkspaceView === "all" || batchWorkspaceView === "partial") && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Advance Updating Card */}
                    <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                      <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                          <CreditCard className="h-4 w-4 text-amber-600" />
                          Update Requested Advance
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Set requested contractor advance. Pass 0 to clear. Prints as an addition on the batch invoice PDF total.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3 text-xs">
                        {activeBatch.status === "Settled" ? (
                          <div className="p-3 rounded-lg bg-slate-50 text-slate-500 text-xs">
                            This batch is fully Settled.
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">Requested Advance ({activeBatch?.currency || "ETB"}) *</Label>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="e.g. 50000 (0 to clear)"
                                value={advanceAmountInput}
                                onChange={(e) => setAdvanceAmountInput(e.target.value)}
                                className="text-xs h-8"
                              />
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              disabled={isSubmittingAdvance}
                              onClick={() => {
                                const amt = Number(advanceAmountInput);
                                if (isNaN(amt) || amt < 0) {
                                  toast.error("Invalid Amount", {
                                    description: "Please enter a valid non-negative amount (0 to clear).",
                                  });
                                  return;
                                }
                                handleRecordAdvance();
                              }}
                              className="w-full h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs mt-2"
                            >
                              {isSubmittingAdvance ? (
                                <>
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  Updating Advance...
                                </>
                              ) : (
                                "Save Requested Advance"
                              )}
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Settle Specific Candidate Items Card */}
                    <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
                      <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Settle Specific Candidate Items
                          </CardTitle>
                          {selectedItemRowNames.length > 0 && (
                            <span className="text-xs font-bold text-emerald-700">
                              {selectedItemRowNames.length} selected
                            </span>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3 text-xs">
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {(activeBatch.items || [])
                            .filter((it: any) => it.status !== "Paid")
                            .map((it: any) => {
                              const isSelected = selectedItemRowNames.includes(it.name);
                              return (
                                <div
                                  key={it.name}
                                  onClick={() =>
                                    setSelectedItemRowNames((prev) =>
                                      prev.includes(it.name)
                                        ? prev.filter((id) => id !== it.name)
                                        : [...prev, it.name]
                                    )
                                  }
                                  className={cn(
                                    "p-2 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors",
                                    isSelected
                                      ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30"
                                      : "border-slate-200 dark:border-[#222228] hover:bg-slate-50"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    {isSelected ? (
                                      <CheckSquare className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                      <Square className="h-4 w-4 text-slate-300" />
                                    )}
                                    <div>
                                      <p className="font-semibold text-slate-900 dark:text-white">
                                        {getCandidateName(it)}
                                      </p>
                                      <p className="text-[10px] font-mono text-slate-400">
                                        {it.transaction || it.name}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="font-bold text-slate-800 dark:text-zinc-200">
                                    {it.amount ? `${Number(it.amount).toLocaleString()} ${it.currency || "SAR"}` : "—"}
                                  </span>
                                </div>
                              );
                            })}

                          {(activeBatch.items || []).filter((it: any) => it.status !== "Paid").length === 0 && (
                            <p className="text-center py-6 text-slate-400 text-xs">
                              All items in this batch are already marked as Paid.
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={selectedItemRowNames.length === 0 || isSettlingItems}
                          onClick={() => handleSettleBatchItems()}
                          className="w-full h-8 bg-emerald-900 hover:bg-emerald-950 text-white font-semibold text-xs"
                        >
                          {isSettlingItems ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Mark {selectedItemRowNames.length} Items as Paid
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Write-Off Card */}
                    <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216] lg:col-span-2">
                      <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                            Write Off Batch Balance (Bad Debt Discharge)
                          </CardTitle>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={activeBatch.status === "Settled" || activeBatch.status === "Written Off"}
                            onClick={() => {
                              const rem =
                                activeBatch.balance_due_original ??
                                activeBatch.balance_due_birr ??
                                (activeBatch.total_amount_original ?? activeBatch.total_amount);
                              setWriteOffAmountInput(String(rem || ""));
                              setIsWriteOffModalOpen(true);
                            }}
                            className="h-8 text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            Write Off Batch
                          </Button>
                        </div>
                      </CardHeader>
                      {(activeBatch.write_offs && activeBatch.write_offs.length > 0) && (
                        <CardContent className="pt-3 space-y-2 text-xs">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                            Write-Off History
                          </div>
                          {activeBatch.write_offs.map((wo: any, idx: number) => {
                            const woDate = wo?.write_off_date || wo?.creation || wo?.creation_date;
                            const woAmt = Number(wo?.amount_original ?? wo?.write_off_amount_original ?? wo?.write_off_amount ?? 0);
                            const woReason = wo?.reason || wo?.write_off_reason || "Negotiated discount / bad debt write-off";
                            const woTxn = wo?.transaction || wo?.write_off_transaction;
                            return (
                              <div
                                key={wo?.name || idx}
                                className="rounded-lg border border-slate-100 dark:border-[#26262d] bg-slate-50/60 dark:bg-[#16161b] p-2.5 space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                    {woDate ? new Date(woDate).toLocaleDateString() : "Recorded"}
                                    {woTxn && (
                                      <span className="ml-2 font-mono text-[10px] text-slate-400 font-semibold">
                                        ({woTxn})
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                                    -{woAmt.toLocaleString()} {activeBatch.currency}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-zinc-300">{woReason}</p>
                              </div>
                            );
                          })}
                        </CardContent>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 7: CONTRACTOR BATCH CONFIGURATION                               */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "config" && isFinanceManagerOrAdmin && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <Card className="border-slate-200 dark:border-[#222228] bg-white dark:bg-[#121216]">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-[#202028]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="h-4 w-4 text-emerald-600" />
                    Partner Agency Batch & Commission Settings
                  </CardTitle>

                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isSavingConfig}
                  onClick={handleSaveContractorConfig}
                  className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                >
                  {isSavingConfig ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6 text-xs">
              {/* Target Contractor Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Partner Agency to Configure</Label>
                <select
                  value={configContractorName}
                  onChange={(e) => setConfigContractorName(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs text-slate-900 dark:text-white"
                >
                  {contractors.map((c: any) => (
                    <option key={c.name} value={c.name} className="dark:bg-[#121217]">
                      {c.contractor_name || c.name} ({c.country || "Agency"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Mode & Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Batch Generation Mode</Label>
                  <select
                    value={configBatchMode}
                    onChange={(e) => setConfigBatchMode(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-[#2d2d38] bg-transparent text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Manual Only" className="dark:bg-[#121217]">Manual Only (Finance Staff triggers batch creation)</option>
                    <option value="Auto-Threshold" className="dark:bg-[#121217]">Auto-Threshold (Automatically generates CBR on reaching threshold)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Batch Threshold Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={configBatchThreshold}
                    onChange={(e) => setConfigBatchThreshold(Number(e.target.value))}
                    className="h-8 text-xs"
                    placeholder="e.g. 10"
                  />
                  <p className="text-[10px] text-slate-400">
                    Number of unbatched owed commissions required before auto-batching.
                  </p>
                </div>
              </div>

              {/* Default Corridor Commission Rates Child Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Default Corridor Commission Rates</span>
                      <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {contractorRates.length} configured
                      </Badge>
                    </h4>

                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRateMatrixModalOpen(true)}
                    className="text-xs h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    <Coins className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Configure Rate Matrix (5 Dimensions)
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#24242e]">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[11px] text-slate-400 bg-slate-50 dark:bg-[#181820] border-b border-slate-100 dark:border-[#202028]">
                      <tr>
                        <th className="py-2.5 px-3">Destination Country</th>
                        <th className="py-2.5 px-3">Entry Track</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3">Commission Rate</th>
                        <th className="py-2.5 px-3">Currency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1c1c24]">
                      {isContractorRatesLoading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto text-emerald-600 mb-1" />
                            Loading commission rates...
                          </td>
                        </tr>
                      ) : contractorRates.length > 0 ? (
                        contractorRates.map((rateRow, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-[#161620]">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              {rateRow.destination_country}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-medium",
                                  rateRow.entry_track === "Muayena"
                                    ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                )}
                              >
                                {rateRow.entry_track || "Standard"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-medium",
                                  rateRow.gender === "Female"
                                    ? "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300"
                                    : rateRow.gender === "Male"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300"
                                    : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-zinc-300"
                                )}
                              >
                                {rateRow.gender || "Female"}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {Number(rateRow.rate).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                {rateRow.currency}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No default commission rates configured for this contractor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: UPDATE BATCH ADVANCE AMOUNT                                */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
        <DialogContent className="sm:max-w-md dark:bg-[#121216] dark:border-[#26262f]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" />
              Update Batch Requested Advance
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Set or clear the requested advance amount for batch {activeBatch?.name}. Pass 0 to clear.
            </DialogDescription>
          </DialogHeader>

          {activeBatch && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-200/80 dark:border-[#26262f] grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium">Batch Total:</span>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">
                    {(Number(activeBatch.total_amount_original ?? activeBatch.total_amount) || 0).toLocaleString()} {activeBatch.currency || "ETB"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-amber-500 font-medium">Currency:</span>
                  <p className="font-bold text-amber-700 dark:text-amber-400">
                    {activeBatch.currency || "ETB"} (batch currency)
                  </p>
                </div>
              </div>

              {!advanceConfirmStep ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Requested Advance Amount ({activeBatch.currency || "ETB"}) *</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 5000 (0 to clear)"
                      value={advanceAmountInput}
                      onChange={(e) => setAdvanceAmountInput(e.target.value)}
                      className="text-xs h-9"
                    />
                    <p className="text-[10px] text-slate-500">
                      Enter the advance amount to appear on the printed invoice, or enter 0 to clear.
                    </p>
                  </div>

                  <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAdvanceModalOpen(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const amt = Number(advanceAmountInput);
                        if (isNaN(amt) || amt < 0) {
                          toast.error("Invalid Amount", {
                            description: "Please enter a valid non-negative advance amount (0 to clear).",
                          });
                          return;
                        }
                        setAdvanceConfirmStep(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
                    >
                      Review & Confirm
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      Confirm Advance Update:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Requested Advance: <strong>{Number(advanceAmountInput).toLocaleString()} {activeBatch.currency || "ETB"}</strong></li>
                      <li>{Number(advanceAmountInput) === 0 ? "Any previously recorded advance will be cleared." : "This will be included as an advance line on the printed invoice."}</li>
                      <li>Does not modify the batch's stored balance due.</li>
                    </ul>
                  </div>

                  <DialogFooter className="mt-4 flex sm:justify-between items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdvanceConfirmStep(false)}
                      disabled={isSubmittingAdvance}
                      className="text-xs"
                    >
                      Back
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRecordAdvance}
                      disabled={isSubmittingAdvance}
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer"
                    >
                      {isSubmittingAdvance ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Updating Advance...
                        </>
                      ) : (
                        "Save Advance Amount"
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Corridor Rate Confirmation Dialog */}
      <Dialog open={rateIndexToRemove !== null} onOpenChange={(open) => !open && setRateIndexToRemove(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Are you sure you want to remove this corridor rate?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              {rateIndexToRemove !== null && configRates[rateIndexToRemove] ? (
                <span>
                  This will remove the default rate for{" "}
                  <strong>{configRates[rateIndexToRemove].destination_country}</strong> (
                  {configRates[rateIndexToRemove].gender ? `${configRates[rateIndexToRemove].gender} • ` : ""}
                  {configRates[rateIndexToRemove].rate} {configRates[rateIndexToRemove].currency}).
                </span>
              ) : (
                "This will remove the selected corridor commission rate row."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRateIndexToRemove(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (rateIndexToRemove !== null) {
                  setConfigRates((prev) => prev.filter((_, i) => i !== rateIndexToRemove));
                  setRateIndexToRemove(null);
                  toast.success("Corridor rate row removed");
                }
              }}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Yes, Remove Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Batch Settlement Confirmation Dialog */}
      <Dialog open={isSettleBatchConfirmOpen} onOpenChange={setIsSettleBatchConfirmOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Are you sure you want to settle this entire batch?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              {activeBatch ? (
                <span>
                  This will mark all items in batch <strong>{activeBatch.name}</strong> as Paid and
                  finalize settlement with reference <strong>{settlementReference}</strong> for a total
                  of <strong>{(Number(activeBatch.total_amount_original ?? activeBatch.total_amount) || 0).toLocaleString()} {activeBatch.currency || "ETB"}</strong>.
                </span>
              ) : (
                "Please confirm you want to proceed with full settlement."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettleBatchConfirmOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsSettleBatchConfirmOpen(false);
                handleSettleEntireBatch();
              }}
              className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold"
            >
              Yes, Confirm Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Creation Confirmation Dialog */}
      <Dialog open={isBatchConfirmOpen} onOpenChange={setIsBatchConfirmOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              Confirm Commission Batch Creation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
              Review the commission batch details before generating the official Commission Batch Request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-200 dark:border-[#26262f] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Partner Agency:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {contractors.find((c: any) => c.name === selectedContractor)?.contractor_name || selectedContractor}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Destination Corridor:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCountry}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-zinc-400">Commission Items:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {selectedTxNames.length > 0 ? selectedTxNames.length : filteredOwed.length} records
                  {selectedTxNames.length > 0 ? " (Selected)" : " (All Owed)"}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 dark:border-[#2a2a35] pt-2">
                <span className="text-slate-700 dark:text-zinc-300 font-semibold">Subtotal Amount:</span>
                <span className="font-bold text-base text-emerald-800 dark:text-emerald-300">
                  {(selectedTxNames.length > 0
                    ? selectedOwedTotalAmount
                    : filteredOwed.reduce((sum, item) => sum + (Number(item.commission_amount || item.amount) || 0), 0)
                  ).toLocaleString()}{" "}
                  {filteredOwed[0]?.currency || "SAR"}
                </span>
              </div>
            </div>

            {/* Advance Amount & Include Unpaid from Previous Batches */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#2a2a35]">
              <div>
                <Label className="text-[11px] font-semibold">Requested Advance Amount (Optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={`e.g. 1000 (${filteredOwed[0]?.currency || "SAR"})`}
                  value={createBatchAdvance}
                  onChange={(e) => setCreateBatchAdvance(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Added as an advance loan line item into this batch's printed invoice total.
                </p>
              </div>

              <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-200 dark:border-[#26262f]">
                <input
                  type="checkbox"
                  checked={includeUnpaidPrevious}
                  onChange={(e) => setIncludeUnpaidPrevious(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="text-[11px]">
                  <span className="font-semibold text-slate-800 dark:text-zinc-200">
                    Include unpaid items from previous open batches
                  </span>
                  <p className="text-slate-500 dark:text-zinc-400 text-[10px] leading-tight mt-0.5">
                    Pulls still-unpaid items from this contractor's open batches (Sent / Partially Settled) in the same currency into this new batch as trackable line items. (Older batches with zero remaining unpaid balance will flip to Settled).
                  </p>
                </div>
              </label>
            </div>

            <p className="text-[11px] text-slate-500">
              A Commission Batch Request (CBR-#####) will be created with status <strong>Draft</strong>.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBatchConfirmOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isCreatingBatch}
              onClick={async () => {
                setIsBatchConfirmOpen(false);
                await handleCreateBatch();
              }}
              className="text-xs bg-emerald-900 hover:bg-emerald-950 text-white font-bold"
            >
              {isCreatingBatch ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Generating Batch...
                </>
              ) : (
                "Generate Commission Batch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contractor Rate Matrix Modal */}
      {(configContractorName || selectedContractor) && (
        <ContractorRateMatrixModal
          isOpen={isRateMatrixModalOpen}
          onClose={() => {
            setIsRateMatrixModalOpen(false);
            refetchContractorRates();
          }}
          contractor={configContractorName || selectedContractor}
          contractorName={
            contractors.find((c: any) => c.name === (configContractorName || selectedContractor))?.contractor_name ||
            configContractorName ||
            selectedContractor
          }
        />
      )}

      {/* FX Rates Live Management Modal */}
      <FxRateModal
        isOpen={isFxModalOpen}
        onClose={() => setIsFxModalOpen(false)}
      />

      {/* Write-Off Confirmation Modal */}
      <Dialog open={isWriteOffModalOpen} onOpenChange={setIsWriteOffModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Commission Batch Write-Off
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-zinc-400">
              Record an agreed discount on batch <strong>{activeBatch?.name || selectedBatchName}</strong> (or discharge uncollectible partner debt). Books an Expense Applicant Transaction for the shortfall. Amount is in the batch's currency.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Write-Off Amount ({activeBatch?.currency || "ETB"}) *</Label>
              <Input
                type="number"
                step="any"
                min="1"
                placeholder="Enter write off amount"
                value={writeOffAmountInput}
                onChange={(e) => setWriteOffAmountInput(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Write-Off Reason / Justification *</Label>
              <Input
                type="text"
                placeholder="e.g. Uncollectible agency bad debt / contractor dispute settled"
                value={writeOffReasonInput}
                onChange={(e) => setWriteOffReasonInput(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmittingWriteOff}
              onClick={() => setIsWriteOffModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingWriteOff}
              onClick={handleWriteOffBatch}
              className="text-xs h-8 bg-rose-700 hover:bg-rose-800 text-white font-semibold flex items-center gap-1.5"
            >
              {isSubmittingWriteOff && <Loader2 className="h-3 w-3 animate-spin" />}
              Confirm Write-Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
