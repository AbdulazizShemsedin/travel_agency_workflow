/**
 * V2 Finance, Commissions & Reconciliation API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.finance_api.log_stage_expense
 * - POST /api/method/agency_tracking.finance_api.log_stage_income
 * - POST /api/method/agency_tracking.finance_api.approve_transaction
 * - POST /api/method/agency_tracking.finance_api.reject_transaction
 * - POST /api/method/agency_tracking.finance_api.void_transaction
 * - POST /api/method/agency_tracking.finance_api.get_fx_rate
 * - POST /api/method/agency_tracking.finance_api.set_fx_rate
 * - POST /api/method/agency_tracking.finance_api.get_owed_commissions
 * - POST /api/method/agency_tracking.finance_api.create_commission_batch
 * - POST /api/method/agency_tracking.finance_api.settle_batch
 * - POST /api/method/agency_tracking.finance_api.trigger_early_commission_accrual
 * - POST /api/method/agency_tracking.reconciliation_api.upload_bank_statement
 * - POST /api/method/agency_tracking.reconciliation_api.manually_match_line
 * - POST /api/method/agency_tracking.report_api.export_commissions_xlsx
 * - POST /api/method/agency_tracking.report_api.get_cost_breakdown_report
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
  contractor: string;
  destination_country: string;
  amount: number;
  currency: string;
  departure_date?: string;
  flight_number?: string;
  [key: string]: any;
}

export interface V2CommissionBatch {
  name: string;
  contractor: string;
  destination_country: string;
  total_amount: number;
  currency: string;
  status: "Draft" | "Settled" | "Unmatched" | string;
  settlement_reference?: string;
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
 * Approves a Pending transaction (Finance Manager / Admin).
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
 * Rejects a Pending transaction.
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
  contractor: string,
  destinationCountry: string,
  order: "oldest" | "newest" = "oldest"
): Promise<V2OwedCommissionItem[]> {
  const result = await requestV2<V2OwedCommissionItem[] | { items?: V2OwedCommissionItem[] }>(
    "/api/method/agency_tracking.finance_api.get_owed_commissions",
    {
      method: "POST",
      body: {
        contractor,
        destination_country: destinationCountry,
        order,
      },
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
  return requestV2<V2CommissionBatch>(
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
  return requestV2(
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
  return requestV2(
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
 * Exports commission records as a binary .xlsx / CSV file.
 */
export async function exportCommissionsXlsxV2(params?: {
  contractor?: string;
  destination_country?: string;
  from_date?: string;
  to_date?: string;
}): Promise<Blob> {
  return requestV2<Blob>(
    "/api/method/agency_tracking.report_api.export_commissions_xlsx",
    {
      method: "POST",
      body: params || {},
    }
  );
}

/**
 * Approved transaction totals grouped by destination country.
 */
export async function getCostBreakdownReportV2(
  fromDate: string,
  toDate: string
): Promise<any> {
  return requestV2(
    "/api/method/agency_tracking.report_api.get_cost_breakdown_report",
    {
      method: "POST",
      body: { from_date: fromDate, to_date: toDate },
    }
  );
}

/**
 * Per-employee net expense + approval/rejection rates.
 */
export async function getEmployeeFinancialReportV2(
  fromDate: string,
  toDate: string
): Promise<any> {
  return requestV2(
    "/api/method/agency_tracking.report_api.get_employee_financial_report",
    {
      method: "POST",
      body: { from_date: fromDate, to_date: toDate },
    }
  );
}

/**
 * Lists every Pending Applicant Transaction, oldest-first.
 */
export async function getPendingApprovalQueueV2(): Promise<V2TransactionRecord[]> {
  const result = await requestV2<V2TransactionRecord[] | { transactions?: V2TransactionRecord[] }>(
    "/api/method/agency_tracking.report_api.get_pending_approval_queue",
    { method: "POST" }
  );

  if (Array.isArray(result)) return result;
  if (result && Array.isArray((result as any).transactions)) return (result as any).transactions;
  return [];
}
