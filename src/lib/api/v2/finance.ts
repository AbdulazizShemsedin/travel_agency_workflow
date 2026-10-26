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
  fee_type?: string;
  clearance_step?: string;
  awaiting_fx_rate?: number;
  amount_birr?: number;
  creation?: string;
  modified?: string;
  [key: string]: any;
}

export interface V2OwedCommissionItem {
  name: string;
  transaction?: string;
  transaction_name?: string;
  placement?: string;
  applicant?: string;
  applicant_name?: string;
  full_name?: string;
  passport_number?: string;
  target_job?: string;
  contractor?: string;
  contractor_name?: string;
  amount: number;
  amount_original?: number;
  currency: V2SupportedCurrency;
  currency_original?: V2SupportedCurrency;
  write_off_original?: number;
  net_amount_original?: number;
  accrual_date?: string;
  creation?: string;
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
  full_name?: string;
  passport_number?: string;
  amount: number;
  amount_original?: number;
  amount_birr?: number;
  currency: string;
  status?: "Pending" | "Paid" | "Released" | string;
  payment_reference?: string;
  settled?: number | boolean;
  settlement_date?: string;
  bank_statement_line?: string;
  write_off_original?: number;
  net_amount_original?: number;
  [key: string]: any;
}

export interface V2CommissionWriteOffRow {
  name: string;
  amount_original: number;
  currency_original: string;
  reason: string;
  write_off_date?: string;
  status: "Approved" | "Voided" | string;
  commission_batch_request?: string | null;
  commission_transaction?: string;
  [key: string]: any;
}

export interface V2CommissionBatchWriteOff {
  name?: string;
  parent?: string;
  amount_original?: number;
  amount_birr?: number;
  reason?: string;
  transaction?: string;
  commission_transaction?: string;
  write_off_date?: string;
  write_off_amount?: number;
  write_off_amount_original?: number;
  write_off_amount_birr?: number;
  write_off_reason?: string;
  write_off_transaction?: string;
  status?: string;
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
  advance_undo_available?: boolean;
  advance_undo_to?: number;
  owner?: string;
  creation?: string;
  [key: string]: any;
}

// Prohibited clearance step types for manual expense/income logging
// (Known corridor fees are auto-calculated into one expense transaction upon ticketing)
const PROHIBITED_CLEARANCE_STAGES = new Set([
  "LMIS Clearance",
  "Kuwait LMIS",
  "Telesign",
  "Taeshir",
  "Embassy",
  "Kuwait Embassy",
  "Taeshir / Biometrics",
  "Embassy Clearance",
]);

/**
 * Logs an expense entry into the finance pipeline.
 * Note: Never passes standard clearance step types to prevent double-counting corridor fees.
 */
export async function logStageExpenseV2(
  amount: number,
  currency: V2SupportedCurrency,
  description: string,
  placement?: string,
  stageLoggedAt?: string,
  applicant?: string
): Promise<{ name?: string; message?: string }> {
  const safeStage = stageLoggedAt && !PROHIBITED_CLEARANCE_STAGES.has(stageLoggedAt)
    ? stageLoggedAt
    : undefined;

  return requestV2(
    "/api/method/agency_tracking.finance_api.log_stage_expense",
    {
      method: "POST",
      body: {
        amount,
        currency,
        description,
        ...(placement ? { placement } : {}),
        ...(safeStage ? { stage_logged_at: safeStage } : {}),
        ...(applicant ? { applicant } : {}),
      },
    }
  );
}

/**
 * Logs an income entry into the finance pipeline.
 * Note: Never passes standard clearance step types to prevent double-counting corridor fees.
 */
export async function logStageIncomeV2(
  amount: number,
  currency: V2SupportedCurrency,
  description: string,
  placement?: string,
  stageLoggedAt?: string,
  applicant?: string
): Promise<{ name?: string; message?: string }> {
  const safeStage = stageLoggedAt && !PROHIBITED_CLEARANCE_STAGES.has(stageLoggedAt)
    ? stageLoggedAt
    : undefined;

  return requestV2(
    "/api/method/agency_tracking.finance_api.log_stage_income",
    {
      method: "POST",
      body: {
        amount,
        currency,
        description,
        ...(placement ? { placement } : {}),
        ...(safeStage ? { stage_logged_at: safeStage } : {}),
        ...(applicant ? { applicant } : {}),
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
  currency?: V2SupportedCurrency,
  requestedAdvanceAmount?: number,
  includeUnpaidFromPrevious?: boolean
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
        ...(typeof requestedAdvanceAmount === "number" ? { requested_advance_amount: requestedAdvanceAmount } : {}),
        ...(typeof includeUnpaidFromPrevious === "boolean" ? { include_unpaid_from_previous: includeUnpaidFromPrevious } : {}),
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
    limitStart?: number;
    limitPageLength?: number;
    withTotal?: 0;
  }
): Promise<V2TransactionRecord[]>;
export async function listTransactionsV2(
  filters: {
    status?: string;
    transactionType?: string;
    placement?: string;
    applicant?: string;
    fromDate?: string;
    toDate?: string;
    orderBy?: string;
    limitStart?: number;
    limitPageLength?: number;
    withTotal: 1;
  }
): Promise<{ data: V2TransactionRecord[]; total_count: number }>;
export async function listTransactionsV2(
  filters?: {
    status?: string;
    transactionType?: string;
    placement?: string;
    applicant?: string;
    fromDate?: string;
    toDate?: string;
    orderBy?: string;
    limitStart?: number;
    limitPageLength?: number;
    withTotal?: number;
  }
): Promise<V2TransactionRecord[] | { data: V2TransactionRecord[]; total_count: number }> {
  const body: Record<string, any> = {};
  if (filters?.status) body.status = filters.status;
  if (filters?.transactionType) body.transaction_type = filters.transactionType;
  if (filters?.placement) body.placement = filters.placement;
  if (filters?.applicant) body.applicant = filters.applicant;
  if (filters?.fromDate) body.from_date = filters.fromDate;
  if (filters?.toDate) body.to_date = filters.toDate;
  if (filters?.orderBy) body.order_by = filters.orderBy;
  if (filters?.limitStart !== undefined) body.limit_start = filters.limitStart;
  if (filters?.limitPageLength) body.limit_page_length = filters.limitPageLength;
  if (filters?.withTotal) body.with_total = filters.withTotal;

  const result = await requestV2<any>(
    "/api/method/agency_tracking.finance_api.list_transactions",
    {
      method: "POST",
      body,
    }
  );

  let list: V2TransactionRecord[] = [];
  if (Array.isArray(result)) list = result;
  else if (result && Array.isArray((result as any).transactions)) list = (result as any).transactions;
  else if (result && Array.isArray((result as any).data)) list = (result as any).data;
  else if (result && Array.isArray((result as any).message)) list = (result as any).message;

  if (filters?.withTotal) {
    return {
      data: list,
      total_count: Number(result?.total_count ?? list.length),
    };
  }

  return list;
}

/**
 * Lists Commission Batches from the system using authoritative endpoint.
 * Authoritative Backend Endpoint: finance_api.list_commission_batches (New October 2026)
 * Roles: Finance Manager / Admin
 */
export async function listCommissionBatchesV2(
  filters?: {
    contractor?: string;
    status?: string;
    destination_country?: string;
    [key: string]: any;
  }
): Promise<V2CommissionBatch[]> {
  try {
    const res = await requestV2<any>(
      "/api/method/agency_tracking.finance_api.list_commission_batches",
      {
        method: "POST",
        body: {
          ...(filters?.contractor ? { contractor: filters.contractor } : {}),
          ...(filters?.status ? { status: filters.status } : {}),
          ...(filters?.destination_country ? { destination_country: filters.destination_country } : {}),
        },
      }
    );
    const payload = (res && "message" in res && (res as any).message) ? (res as any).message : res;
    const rawList = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.batches)) ? payload.batches : [];
    return rawList.map((b: any) => ({
      ...b,
      contractor_name: b.contractor_name || b.contractor,
      total_amount: b.total_amount_birr ?? b.total_amount ?? 0,
      currency: b.currency || "ETB",
    }));
  } catch (err: any) {
    // Honest error propagation
    throw err;
  }
}

/**
 * Fetches a single Commission Batch Request by name with child items.
 */
export async function getCommissionBatchV2(
  batchName: string
): Promise<V2CommissionBatch | null> {
  try {
    const res = await requestV2<any>(
      "/api/method/agency_tracking.finance_api.get_commission_batch",
      {
        method: "POST",
        body: { batch_name: batchName },
      }
    );
    const batch = res && "name" in res ? res : res?.message;
    if (batch) {
      if (Array.isArray(batch.items_detail) && batch.items_detail.length > 0) {
        const detailByItem = new Map<string, any>(
          batch.items_detail.map((d: any) => [String(d.item || d.transaction), d])
        );
        batch.items = (batch.items || []).map((it: any) => {
          const key = String(it.name || it.transaction || "");
          const d = detailByItem.get(key) || detailByItem.get(String(it.transaction || "")) || {};
          return {
            ...it,
            applicant: d.applicant || it.applicant,
            applicant_name: d.full_name || it.applicant_name,
            full_name: d.full_name || it.full_name,
            placement: d.placement || it.placement,
            amount_original: d.amount_original ?? it.amount_original,
            amount_birr: d.amount_birr ?? it.amount_birr,
          };
        });
      }
      return batch as V2CommissionBatch;
    }
  } catch (err) {
    console.warn("[finance_api.get_commission_batch] failed, falling back to frappe.client.get:", err);
  }

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
 * Unmarks specific Commission Batch Items paid (undo settlement).
 * Authoritative Backend Endpoint: finance_api.unsettle_batch_items (New 2026-10-12)
 * Roles: Finance Manager, Admin
 */
export async function unsettleBatchItemsV2(
  itemNames: string[],
  reason?: string
): Promise<{ message?: any; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.unsettle_batch_items",
    {
      method: "POST",
      body: {
        item_names: JSON.stringify(itemNames),
        ...(reason ? { reason } : {}),
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
 * Undoes the last advance change on a Commission Batch.
 * Endpoint: finance_api.undo_batch_advance
 * Repeatable; returns the restored advance amount.
 */
export async function undoBatchAdvanceV2(
  batchName: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.undo_batch_advance",
    {
      method: "POST",
      body: { batch_name: batchName },
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
  writeOffReason: string,
  writeOffDate?: string
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.write_off_batch",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        write_off_amount: writeOffAmount,
        write_off_reason: writeOffReason,
        ...(writeOffDate ? { write_off_date: writeOffDate } : {}),
      },
    }
  );
}

export interface V2MoneySettings {
  birr_conversion: boolean;
  [key: string]: any;
}

/**
 * Fetches the system-wide money configuration (whether Birr conversion is enabled).
 * Endpoint: POST /api/method/agency_tracking.finance_api.get_money_settings
 */
export async function getMoneySettingsV2(): Promise<V2MoneySettings> {
  try {
    const res = await requestV2<V2MoneySettings | { message?: V2MoneySettings }>(
      "/api/method/agency_tracking.finance_api.get_money_settings",
      { method: "POST" }
    );
    const data = res && "birr_conversion" in res ? res : (res as any)?.message;
    return {
      birr_conversion: Boolean(data?.birr_conversion),
      ...data,
    };
  } catch (err) {
    console.warn("[finance_api.get_money_settings] failed or unavailable, defaulting to false:", err);
    return { birr_conversion: false };
  }
}

/**
 * Dedicated endpoint to retrieve a batch's write-off history.
 * Method: POST /api/method/agency_tracking.finance_api.list_batch_write_offs
 * Param: batch_name
 * Returns: [{ amount_original, amount_birr, reason, transaction, write_off_date }, ...]
 */
export async function listBatchWriteOffsV2(
  batchName: string
): Promise<V2CommissionBatchWriteOff[]> {
  const res = await requestV2<V2CommissionBatchWriteOff[] | { message?: V2CommissionBatchWriteOff[] }>(
    "/api/method/agency_tracking.finance_api.list_batch_write_offs",
    {
      method: "POST",
      body: { batch_name: batchName },
    }
  );

  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as any).message)) return (res as any).message;
  return [];
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
 * Adds workers' commissions to an existing Commission Batch Request.
 * Authoritative Backend Endpoint: finance_api.add_workers_to_batch (New October 2026)
 * Roles: Finance Manager, Admin
 * Accepts workers who are owed, not on any batch, in the batch's currency, and not waiting for an exchange rate.
 * Write-offs come with them, and batch total, balance, and invoice update.
 */
export async function addWorkersToBatchV2(
  batchName: string,
  commissionNames: string[]
): Promise<V2CommissionBatch> {
  const result = await requestV2<V2CommissionBatch | { message?: V2CommissionBatch }>(
    "/api/method/agency_tracking.finance_api.add_workers_to_batch",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        commission_names: Array.isArray(commissionNames) ? JSON.stringify(commissionNames) : commissionNames,
      },
    }
  );
  const batch = (result && "name" in result) ? result : (result as any)?.message || result;
  return batch as V2CommissionBatch;
}

/**
 * Takes workers off an existing Commission Batch Request.
 * Authoritative Backend Endpoint: finance_api.remove_workers_from_batch (New October 2026)
 * Roles: Finance Manager, Admin
 * Removed worker returns to owed list with their write-offs. A paid worker cannot be removed.
 * Returns { released_items, affected_batches }.
 */
export async function removeWorkersFromBatchV2(
  batchName: string,
  commissionNames: string[]
): Promise<{ released_items: string[]; affected_batches: string[]; [key: string]: any }> {
  const result = await requestV2<{
    released_items?: string[];
    affected_batches?: string[];
    message?: any;
    [key: string]: any;
  }>(
    "/api/method/agency_tracking.finance_api.remove_workers_from_batch",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        commission_names: Array.isArray(commissionNames) ? JSON.stringify(commissionNames) : commissionNames,
      },
    }
  );
  const payload = result?.message || result;
  return {
    released_items: Array.isArray(payload.released_items) ? payload.released_items : [],
    affected_batches: Array.isArray(payload.affected_batches) ? payload.affected_batches : [],
    ...payload,
  };
}

/**
 * Writes off an agreed expense/discount on one worker's commission.
 * Authoritative Backend Endpoint: finance_api.write_off_commission (New October 2026)
 * Roles: Finance Manager, Admin
 * commission: worker's commission row name (from get_owed_commissions) or batch item transaction.
 * Amount is in the commission's own currency. Reason required. Date today or earlier (never future).
 */
export async function writeOffCommissionV2(
  commission: string,
  writeOffAmount: number,
  writeOffReason: string,
  writeOffDate?: string
): Promise<V2CommissionWriteOffRow> {
  const result = await requestV2<V2CommissionWriteOffRow | { message?: V2CommissionWriteOffRow }>(
    "/api/method/agency_tracking.finance_api.write_off_commission",
    {
      method: "POST",
      body: {
        commission,
        write_off_amount: writeOffAmount,
        write_off_reason: writeOffReason,
        ...(writeOffDate ? { write_off_date: writeOffDate } : {}),
      },
    }
  );
  const row = (result && "name" in result) ? result : (result as any)?.message || result;
  return row as V2CommissionWriteOffRow;
}

/**
 * Lists the write-offs recorded on a single worker's commission.
 * Authoritative Backend Endpoint: finance_api.list_commission_write_offs (New October 2026)
 * Returns rows with: { amount_original, currency_original, reason, write_off_date, status, commission_batch_request, name }
 */
export async function listCommissionWriteOffsV2(
  commission: string
): Promise<V2CommissionWriteOffRow[]> {
  const res = await requestV2<V2CommissionWriteOffRow[] | { message?: V2CommissionWriteOffRow[] }>(
    "/api/method/agency_tracking.finance_api.list_commission_write_offs",
    {
      method: "POST",
      body: { commission },
    }
  );
  if (Array.isArray(res)) return res;
  if (res && Array.isArray((res as any).message)) return (res as any).message;
  return [];
}

/**
 * Uploads a bank statement CSV for automatic line-to-batch matching.
 */
export async function uploadBankStatementV2(
  fileUrl: string,
  currency?: string
): Promise<{ message?: string; matched?: number; unmatched?: number; [key: string]: any }> {
  return await requestV2(
    "/api/method/agency_tracking.reconciliation_api.upload_bank_statement",
    {
      method: "POST",
      body: {
        file_url: fileUrl,
        ...(currency ? { currency } : {}),
      },
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
 * Unmatches a matched bank statement line (undo matching).
 * Authoritative Backend Endpoint: reconciliation_api.unmatch_line (New 2026-10-12)
 * Roles: Finance Manager, Admin
 */
export async function unmatchLineV2(
  statementLineName: string,
  reason?: string
): Promise<{ message?: string; [key: string]: any }> {
  return await requestV2(
    "/api/method/agency_tracking.reconciliation_api.unmatch_line",
    {
      method: "POST",
      body: {
        statement_line_name: statementLineName,
        ...(reason ? { reason } : {}),
      },
    }
  );
}

/**
 * Bank statement line representing reconciled or unreconciled bank transactions.
 * Supported contract fields:
 * - statement_date, reference, amount, currency, match_status, uploaded_on
 * - contractor and batch_title (when matched)
 * The internal line `name` is only used for programmatic RPC identification, never displayed as raw text.
 */
export interface V2StatementLine {
  name: string;
  statement_date?: string;
  reference?: string;
  amount: number;
  currency: string;
  match_status: "Unmatched" | "Matched" | "Manually Matched" | string;
  uploaded_on?: string;
  contractor?: string;
  batch_title?: string;
}


export interface V2ListStatementLinesParams {
  match_status?: "Unmatched" | "Matched" | "Manually Matched" | string;
  limit_start?: number;
  limit_page_length?: number;
  with_total?: number;
}

/**
 * Lists bank statement lines with status and details.
 * Authoritative Backend Endpoint: reconciliation_api.list_statement_lines (New October 2026, item B1)
 * Roles: Finance Manager / Admin
 */
export async function listStatementLinesV2(
  params?: V2ListStatementLinesParams
): Promise<{ lines: V2StatementLine[]; total_count?: number }> {
  const res = await requestV2<any>(
    "/api/method/agency_tracking.reconciliation_api.list_statement_lines",
    {
      method: "POST",
      body: params || {},
    }
  );
  const payload = (res && "message" in res && (res as any).message) ? (res as any).message : res;
  if (Array.isArray(payload)) {
    return { lines: payload, total_count: payload.length };
  }
  if (payload && Array.isArray(payload.lines)) {
    return {
      lines: payload.lines,
      total_count: payload.total_count ?? payload.lines.length,
    };
  }
  if (payload && Array.isArray(payload.data)) {
    return {
      lines: payload.data,
      total_count: payload.total_count ?? payload.data.length,
    };
  }
  return { lines: [], total_count: 0 };
}

/**
 * Updates or clears the requested advance amount on a Commission Batch Request.
 * Authoritative Backend Endpoint: finance_api.update_batch_advance (New 2026-09-12)
 * RBAC: Finance Manager / Admin / System Manager.
 * requested_advance_amount is in the batch's own currency. Pass 0 to clear.
 */
export async function updateBatchAdvanceV2(
  batchName: string,
  requestedAdvanceAmount: number
): Promise<{ message?: string; [key: string]: any }> {
  return requestV2(
    "/api/method/agency_tracking.finance_api.update_batch_advance",
    {
      method: "POST",
      body: {
        batch_name: batchName,
        requested_advance_amount: requestedAdvanceAmount,
      },
    }
  );
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

/**
 * Gets company and bank details through the authoritative endpoint.
 * Authoritative Backend Endpoint: finance_api.get_company_settings (New 2026-10-12)
 * Roles: Admin, Finance Manager
 */
export async function getCompanySettingsV2(): Promise<any> {
  const res = await requestV2(
    "/api/method/agency_tracking.finance_api.get_company_settings",
    { method: "POST" }
  );
  return (res && "message" in res && (res as any).message) ? (res as any).message : res;
}

/**
 * Updates company and bank details through the authoritative endpoint.
 * Authoritative Backend Endpoint: finance_api.update_company_settings (New 2026-10-12)
 * Roles: Admin, Finance Manager
 */
export async function updateCompanySettingsV2(fields: Record<string, any>): Promise<any> {
  return await requestV2(
    "/api/method/agency_tracking.finance_api.update_company_settings",
    {
      method: "POST",
      body: fields,
    }
  );
}

/**
 * Gets the backend configured time zone and current server time.
 * Authoritative Backend Endpoint: finance_api.get_time_zone (New 2026-10-12)
 */
export async function getTimeZoneV2(): Promise<{ time_zone: string; now: string }> {
  const res = await requestV2(
    "/api/method/agency_tracking.finance_api.get_time_zone",
    { method: "POST" }
  );
  return (res && "message" in res && (res as any).message) ? (res as any).message : res;
}

/**
 * Sets the backend configured time zone (e.g. Africa/Addis_Ababa).
 * Authoritative Backend Endpoint: finance_api.set_time_zone (New 2026-10-12)
 * Roles: Admin
 */
export async function setTimeZoneV2(timeZone: string): Promise<any> {
  return await requestV2(
    "/api/method/agency_tracking.finance_api.set_time_zone",
    {
      method: "POST",
      body: { time_zone: timeZone },
    }
  );
}

/**
 * Uploads company logo or stamp image via multipart/form-data.
 * Authoritative Backend Endpoint: finance_api.set_company_image (New 2026-10-12)
 * Roles: Admin, Finance Manager
 */
export async function setCompanyImageV2(
  file: File,
  kind: "logo" | "stamp"
): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  return await requestV2(
    "/api/method/agency_tracking.finance_api.set_company_image",
    {
      method: "POST",
      body: formData,
      isMultipart: true,
    }
  );
}

export interface V2PermissionTableRow {
  area: string;
  action: string;
  roles: string | string[];
  endpoint?: string;
}

/**
 * Gets the read-only permissions table describing who can do what.
 * Authoritative Backend Endpoint: api_docs.get_permission_table (New 2026-10-12)
 * Roles: Admin, Manager
 */
export async function getPermissionTableV2(): Promise<V2PermissionTableRow[]> {
  const res = await requestV2<any>(
    "/api/method/agency_tracking.api_docs.get_permission_table",
    { method: "POST" }
  );
  const payload = (res && "message" in res && (res as any).message) ? (res as any).message : res;
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}
