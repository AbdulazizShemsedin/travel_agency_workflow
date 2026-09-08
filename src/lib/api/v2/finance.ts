/**
 * V2 Finance & Commission Lifecycle API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.finance_api.log_stage_expense
 * - POST /api/method/agency_tracking.finance_api.log_stage_income
 * - POST /api/method/agency_tracking.finance_api.approve_transaction
 * - POST /api/method/agency_tracking.finance_api.reject_transaction
 * - POST /api/method/agency_tracking.finance_api.void_transaction
 * - POST /api/method/agency_tracking.finance_api.get_fx_rate
 * - POST /api/method/agency_tracking.finance_api.set_fx_rate
 * - POST /api/method/agency_tracking.finance_api.get_owed_commissions
 * - POST /api/method/agency_tracking.finance_api.create_commission_batch
 * - POST /api/method/agency_tracking.finance_api.get_batch_invoice_pdf
 * - POST /api/method/agency_tracking.finance_api.upload_batch_payment_proof
 * - POST /api/method/agency_tracking.finance_api.settle_batch_items
 * - POST /api/method/agency_tracking.finance_api.settle_batch
 * - POST /api/method/agency_tracking.finance_api.trigger_early_commission_accrual
 * - POST /api/method/agency_tracking.reconciliation_api.upload_bank_statement
 * - POST /api/method/agency_tracking.reconciliation_api.manually_match_line
 * - POST /api/method/agency_tracking.report_api.get_employee_financial_report
 * - POST /api/method/agency_tracking.report_api.get_pending_approval_queue
 */

import { requestV2 } from "./client";

export type V2SupportedCurrency = "SAR" | "KWD" | "USD" | "ETB" | "AED" | "QAR";

export interface V2TransactionRecord {
  name: string;
  transaction_type: "Expense" | "Income";
  amount: number;
  currency: V2SupportedCurrency;
  status: "Pending" | "Approved" | "Rejected" | "Voided";
  description: string;
  placement?: string;
  stage_logged_at?: string;
  creation?: string;
  modified?: string;
  [key: string]: any;
}

export interface V2OwedCommissionItem {
  name: string;
  transaction_name?: string;
  applicant?: string;
  applicant_name?: string;
  full_name?: string;
  contractor?: string;
  contractor_name?: string;
  amount: number;
  currency: V2SupportedCurrency;
  accrual_date?: string;
  destination_country?: string;
  status?: string;
  [key: string]: any;
}

export interface V2CommissionBatchItem {
  name?: string;
  transaction?: string;
  transaction_name?: string;
  placement?: string;
  applicant?: string;
  applicant_name?: string;
  amount: number;
  amount_original?: number;
  amount_birr?: number;
  currency: string;
  payment_reference?: string;
  settled?: number | boolean;
  settlement_date?: string;
  [key: string]: any;
}

export interface V2CommissionBatchWriteOff {
  name?: string;
  parent?: string;
  write_off_amount?: number;
  write_off_amount_original?: number;
  write_off_amount_birr?: number;
  write_off_reason?: string;
  write_off_transaction?: string;
  [key: string]: any;
}

export interface V2CommissionBatch {
  name: string;
  title?: string;
  contractor: string;
  contractor_name?: string;
  destination_country?: string;
  currency: V2SupportedCurrency;
  status: "Draft" | "Sent" | "Invoiced" | "Partially Settled" | "Settled" | "Cancelled" | string;
  items?: V2CommissionBatchItem[];
  write_offs?: V2CommissionBatchWriteOff[];
  payment_proof?: string;
  total_amount?: number;
  total_amount_original?: number;
  total_amount_birr?: number;
  advance_amount_original?: number;
  advance_amount_birr?: number;
  advance_amount?: number;
  advance_reference?: string;
  advance_received_on?: string;
  write_off_total_original?: number;
  write_off_total_birr?: number;
  paid_amount_original?: number;
  paid_amount_birr?: number;
  balance_due_original?: number;
  balance_due_birr?: number;
  owner?: string;
  creation?: string;
  [key: string]: any;
}

/**
 * Logs an expense entry into the finance pipeline.
 */
export async function logStageExpenseV2(
  amount: number,
  currency: V2SupportedCurrency,
  description: string,
  placement?: string,
  stageLoggedAt?: string
): Promise<{ name?: string; message?: string }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.log_stage_expense",
    {
      method: "POST",
      body: {
        amount,
        currency,
        description,
        ...(placement ? { placement } : {}),
        ...(stageLoggedAt ? { stage_logged_at: stageLoggedAt } : {}),
      },
    }
  );
}

/**
 * Logs an income entry into the finance pipeline.
 */
export async function logStageIncomeV2(
  amount: number,
  currency: V2SupportedCurrency,
  description: string,
  placement?: string,
  stageLoggedAt?: string
): Promise<{ name?: string; message?: string }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.log_stage_income",
    {
      method: "POST",
      body: {
        amount,
        currency,
        description,
        ...(placement ? { placement } : {}),
        ...(stageLoggedAt ? { stage_logged_at: stageLoggedAt } : {}),
      },
    }
  );
}

/**
 * Approves a Pending transaction (Finance Manager / Admin only).
 */
export async function approveTransactionV2(
  transactionName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.approve_transaction",
    {
      method: "POST",
      body: { transaction_name: transactionName },
    }
  );
}

/**
 * Rejects a Pending transaction with mandatory remark.
 */
export async function rejectTransactionV2(
  transactionName: string,
  rejectionReason: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.reject_transaction",
    {
      method: "POST",
      body: {
        transaction_name: transactionName,
        rejection_reason: rejectionReason,
      },
    }
  );
}

/**
 * Voids an Approved transaction (immutable audit trail).
 */
export async function voidTransactionV2(
  transactionName: string,
  voidReason: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.void_transaction",
    {
      method: "POST",
      body: {
        transaction_name: transactionName,
        void_reason: voidReason,
      },
    }
  );
}

/**
 * Queries cached FX rate against ETB.
 */
export async function getFxRateV2(
  currency: V2SupportedCurrency,
  asOfDate?: string
): Promise<{ rate?: number; currency: string; message?: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.get_fx_rate",
    {
      method: "POST",
      body: {
        currency,
        ...(asOfDate ? { as_of_date: asOfDate } : {}),
      },
    }
  );
}

/**
 * Manually records an FX rate against ETB.
 */
export async function setFxRateV2(
  currency: Exclude<V2SupportedCurrency, "ETB">,
  rateToBirr: number,
  rateDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.set_fx_rate",
    {
      method: "POST",
      body: {
        currency,
        rate_to_birr: rateToBirr,
        ...(rateDate ? { rate_date: rateDate } : {}),
      },
    }
  );
}

/**
 * Lists a contractor's owed (unbatched, Approved) commissions.
 */
export async function getOwedCommissionsV2(
  contractor?: string,
  destinationCountry?: string,
  order: "oldest" | "newest" = "oldest",
  currency?: V2SupportedCurrency
): Promise<V2OwedCommissionItem[]> {
  const body: Record<string, any> = { order };
  if (contractor) body.contractor = contractor;
  if (destinationCountry) body.destination_country = destinationCountry;
  if (currency) body.currency = currency;

  const result = await requestV2<V2OwedCommissionItem[] | { items?: V2OwedCommissionItem[] }>(
    "/api/method/agency_tracking.finance_api.get_owed_commissions",
    {
      method: "POST",
      body,
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).items)) return (result as any).items;
  return [];
}

/**
 * Batches a contractor's owed commissions for settlement.
 */
export async function createCommissionBatchV2(
  contractor: string,
  destinationCountry: string,
  transactionNames?: string[],
  currency?: V2SupportedCurrency
): Promise<V2CommissionBatch> {
  const result = await requestV2<V2CommissionBatch | { message: V2CommissionBatch }>(
    "/api/method/agency_tracking.finance_api.create_commission_batch",
    {
      method: "POST",
      body: {
        contractor,
        destination_country: destinationCountry,
        ...(transactionNames && transactionNames.length > 0
          ? { transaction_names: JSON.stringify(transactionNames) }
          : {}),
        ...(currency ? { currency } : {}),
      },
    }
  );

  if (result && "message" in result && result.message) {
    return result.message as V2CommissionBatch;
  }
  return result as V2CommissionBatch;
}

/**
 * Lists a contractor's owed commissions grouped by currency (for create-batch screen).
 */
export async function getOwedCommissionsByCurrencyV2(
  contractor?: string,
  destinationCountry?: string
): Promise<Record<string, V2OwedCommissionItem[]>> {
  const body: Record<string, any> = {};
  if (contractor) body.contractor = contractor;
  if (destinationCountry) body.destination_country = destinationCountry;

  const result = await requestV2<any>(
    "/api/method/agency_tracking.finance_api.get_owed_commissions_by_currency",
    {
      method: "POST",
      body,
    }
  );

  if (result && typeof result === "object") return result;
  return {};
}

/**
 * Lists finance transactions across every status (Pending/Approved/Rejected/Voided) —
 * a real transaction-history view (Finance Manager/Admin/System Manager only).
 */
export async function listTransactionsV2(
  filters?: {
    status?: string;
    transactionType?: string;
    placement?: string;
    applicant?: string;
    fromDate?: string;
    toDate?: string;
    orderBy?: string;
    limitPageLength?: number;
  }
): Promise<V2TransactionRecord[]> {
  const body: Record<string, any> = {};
  if (filters?.status) body.status = filters.status;
  if (filters?.transactionType) body.transaction_type = filters.transactionType;
  if (filters?.placement) body.placement = filters.placement;
  if (filters?.applicant) body.applicant = filters.applicant;
  if (filters?.fromDate) body.from_date = filters.fromDate;
  if (filters?.toDate) body.to_date = filters.toDate;
  if (filters?.orderBy) body.order_by = filters.orderBy;
  if (filters?.limitPageLength) body.limit_page_length = filters.limitPageLength;

  const result = await requestV2<V2TransactionRecord[] | { transactions?: V2TransactionRecord[] }>(
    "/api/method/agency_tracking.finance_api.list_transactions",
    {
      method: "POST",
      body,
    }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).transactions)) return (result as any).transactions;
  return [];
}

/**
 * Lists Commission Batch Requests from the system.
 */
export async function listCommissionBatchesV2(
  filters?: Record<string, any>
): Promise<V2CommissionBatch[]> {
  const result = await requestV2<any[]>("/api/method/frappe.client.get_list", {
    method: "POST",
    body: {
      doctype: "Commission Batch Request",
      fields: JSON.stringify([
        "name",
        "title",
        "contractor",
        "destination_country",
        "currency",
        "total_amount",
        "total_amount_original",
        "total_amount_birr",
        "status",
        "advance_amount_original",
        "advance_amount_birr",
        "advance_amount",
        "advance_reference",
        "advance_received_on",
        "write_off_total_original",
        "write_off_total_birr",
        "paid_amount_original",
        "paid_amount_birr",
        "balance_due_original",
        "balance_due_birr",
        "settled_on",
        "settlement_reference",
        "owner",
        "creation",
        "modified",
      ]),
      filters: filters ? JSON.stringify(filters) : undefined,
      order_by: "creation desc",
      limit_page_length: 50,
    },
  });
  if (!Array.isArray(result)) return [];
  return result.map((b: any) => ({
    ...b,
    contractor_name: b.contractor_name || b.contractor,
    total_amount: b.total_amount_original ?? b.total_amount ?? b.total_amount_birr ?? 0,
    currency: b.currency || "ETB",
  }));
}

/**
 * Fetches a single Commission Batch Request by name with child items.
 */
export async function getCommissionBatchV2(
  batchName: string
): Promise<V2CommissionBatch | null> {
  const result = await requestV2<any>("/api/method/frappe.client.get", {
    method: "POST",
    body: {
      doctype: "Commission Batch Request",
      name: batchName,
    },
  });
  return result || null;
}

/**
 * Renders a Commission Batch invoice PDF on demand.
 */
export async function getBatchInvoicePdfV2(batchName: string): Promise<Blob> {
  return requestV2<Blob>(
    "/api/method/agency_tracking.finance_api.get_batch_invoice_pdf",
    {
      method: "POST",
      body: { batch_name: batchName },
      headers: {
        Accept: "application/pdf, application/json, */*",
      },
    }
  );
}

/**
 * Uploads a paid-applicants list (CSV or PDF) and fuzzy-matches against a batch.
 */
export async function uploadBatchPaymentProofV2(
  batchName: string,
  fileUrl: string
): Promise<{ matched_items: string[]; unmatched_names: string[]; [key: string]: any }> {
  const result = await requestV2<{
    message?: {
      matched_items?: string[];
      unmatched_names?: string[];
    };
    matched_items?: string[];
    unmatched_names?: string[];
    [key: string]: any;
  }>(
    "/api/method/agency_tracking.finance_api.upload_batch_payment_proof",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        file_url: fileUrl,
      },
    }
  );

  const payload = result.message || result;
  return {
    matched_items: Array.isArray(payload.matched_items) ? payload.matched_items : [],
    unmatched_names: Array.isArray(payload.unmatched_names) ? payload.unmatched_names : [],
    ...payload,
  };
}

/**
 * Marks specific Commission Batch Items paid (partial settlement).
 */
export async function settleBatchItemsV2(
  itemNames: string[]
): Promise<{ message?: any; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.settle_batch_items",
    {
      method: "POST",
      body: {
        item_names: JSON.stringify(itemNames),
      },
    }
  );
}

/**
 * Marks a Commission Batch settled.
 */
export async function settleBatchV2(
  batchName: string,
  settlementReference: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.settle_batch",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        settlement_reference: settlementReference,
      },
    }
  );
}

/**
 * Writes off a discount or reduction on a Commission Batch and records an Expense transaction.
 * Authoritative Backend Endpoint: finance_api.write_off_batch
 * Roles: Finance Manager, Administrator, System Manager
 * The amount is interpreted in the batch's own currency (batch.currency), not Birr.
 * Callable repeatedly on the same batch (each call adds a row to the `write_offs` child table).
 */
export async function writeOffBatchV2(
  batchName: string,
  writeOffAmount: number,
  writeOffReason: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.write_off_batch",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        write_off_amount: writeOffAmount,
        write_off_reason: writeOffReason,
      },
    }
  );
}

/**
 * Releases unpaid batch items back to the owed commission pool for future batching.
 * Authoritative Backend Endpoint: finance_api.release_unpaid_items
 * Roles: Finance Manager, Administrator, System Manager
 */
export async function releaseUnpaidItemsV2(
  itemNames: string[]
): Promise<{ message?: string; released_count?: number; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.release_unpaid_items",
    {
      method: "POST",
      body: {
        item_names: Array.isArray(itemNames) ? JSON.stringify(itemNames) : itemNames,
      },
    }
  );
}

/**
 * Manually triggers commission accrual early for a placement.
 */
export async function triggerEarlyCommissionAccrualV2(
  placementName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.trigger_early_commission_accrual",
    {
      method: "POST",
      body: { placement_name: placementName },
    }
  );
}

/**
 * Uploads a bank statement CSV for automatic line-to-batch matching.
 */
export async function uploadBankStatementV2(
  fileUrl: string
): Promise<{ message?: string; matched?: number; unmatched?: number; [key: string]: any }> {
  return await requestV2(
    "/api/method/agency_tracking.reconciliation_api.upload_bank_statement",
    {
      method: "POST",
      body: { file_url: fileUrl },
    }
  );
}

/**
 * Manually matches an unmatched statement line to a commission batch.
 */
export async function manuallyMatchLineV2(
  statementLineName: string,
  batchName: string
): Promise<{ message?: string; [key: string]: any }> {
  return await requestV2(
    "/api/method/agency_tracking.reconciliation_api.manually_match_line",
    {
      method: "POST",
      body: {
        statement_line_name: statementLineName,
        batch_name: batchName,
      },
    }
  );
}

/**
 * Records a partial / advance payment against a Commission Batch Request.
 * RBAC: Finance Manager / Admin.
 * The advance amount is interpreted in the batch's own currency (batch.currency),
 * not Birr. It is a separate loan record (advance_amount_original / advance_reference /
 * advance_received_on) and no longer reduces balance_due or flips settlement status.
 */
export async function recordBatchAdvanceV2(
  batchName: string,
  advanceAmount: number,
  advanceReference?: string
): Promise<V2CommissionBatch> {
  const result = await requestV2<V2CommissionBatch | { message: V2CommissionBatch }>(
    "/api/method/agency_tracking.finance_api.record_batch_advance",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        advance_amount: advanceAmount,
        ...(advanceReference && advanceReference.trim()
          ? { advance_reference: advanceReference.trim() }
          : {}),
      },
    }
  );

  if (result && "message" in result && result.message) {
    return result.message as V2CommissionBatch;
  }
  return result as V2CommissionBatch;
}

export interface V2FetchFxRatesNowResponse {
  recorded: Record<string, number>;
  count: number;
}

/**
 * Manually pulls live FX rates now from the backend exchange provider (Global mode).
 * Authoritative Backend Endpoint: finance_api.fetch_fx_rates_now
 * Roles: Finance Manager, Admin, System Manager
 */
export async function fetchFxRatesNowV2(): Promise<V2FetchFxRatesNowResponse> {
  try {
    const result = await requestV2<V2FetchFxRatesNowResponse | { message: V2FetchFxRatesNowResponse }>(
      "/api/method/agency_tracking.finance_api.fetch_fx_rates_now",
      {
        method: "POST",
        body: {},
      }
    );

    const payload = (result && "message" in result && (result as any).message) ? (result as any).message : result;
    return {
      recorded: (payload && typeof payload.recorded === "object" && payload.recorded !== null) ? payload.recorded : {},
      count: Number(payload?.count) || 0,
    };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (
      msg.includes("fetch_fx_rates_now") ||
      msg.includes("has no attribute") ||
      msg.includes("get_method") ||
      err?.status === 417 ||
      err?.status === 404
    ) {
      console.warn("[Finance] finance_api.fetch_fx_rates_now unavailable on server:", msg);
      return {
        recorded: {},
        count: 0,
      };
    }
    throw err;
  }
}
