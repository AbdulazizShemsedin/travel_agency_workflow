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
  currency: string;
  settled?: number | boolean;
  settlement_date?: string;
  [key: string]: any;
}

export interface V2CommissionBatch {
  name: string;
  contractor: string;
  contractor_name?: string;
  destination_country?: string;
  total_amount: number;
  total_amount_birr?: number;
  currency: V2SupportedCurrency;
  status: "Draft" | "Sent" | "Invoiced" | "Partially Settled" | "Settled" | "Cancelled" | string;
  items?: V2CommissionBatchItem[];
  payment_proof?: string;
  advance_amount?: number;
  advance_reference?: string;
  advance_received_on?: string;
  balance_due_birr?: number;
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
  order: "oldest" | "newest" = "oldest"
): Promise<V2OwedCommissionItem[]> {
  const body: Record<string, any> = { order };
  if (contractor) body.contractor = contractor;
  if (destinationCountry) body.destination_country = destinationCountry;

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
  transactionNames?: string[]
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
      },
    }
  );

  if (result && "message" in result && result.message) {
    return result.message as V2CommissionBatch;
  }
  return result as V2CommissionBatch;
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
        "contractor",
        "destination_country",
        "total_amount_birr",
        "status",
        "advance_amount",
        "advance_reference",
        "advance_received_on",
        "balance_due_birr",
        "settled_on",
        "settlement_reference",
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
    total_amount: b.total_amount || b.total_amount_birr || 0,
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
 * Moves open batch (Draft/Sent) -> Partially Settled.
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
