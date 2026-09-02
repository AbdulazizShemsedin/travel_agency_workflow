/**
 * V2 Management & Admin Reports API
 * 
 * Authoritative Backend Endpoints:
 * - POST /api/method/agency_tracking.report_api.get_daily_work_report
 * - POST /api/method/agency_tracking.report_api.get_staff_performance_report
 * - POST /api/method/agency_tracking.report_api.get_operations_summary
 * - POST /api/method/agency_tracking.report_api.get_placement_aging_report
 * - POST /api/method/agency_tracking.report_api.get_financial_overview
 * - POST /api/method/agency_tracking.report_api.get_cost_breakdown_report
 * - POST /api/method/agency_tracking.report_api.get_employee_financial_report
 * - POST /api/method/agency_tracking.report_api.get_pending_approval_queue
 * - POST /api/method/agency_tracking.report_api.get_complaint_aging_report
 * - POST /api/method/agency_tracking.report_api.export_commissions_xlsx
 */

import { requestV2 } from "./client";

export interface V2DailyWorkReport {
  from_date: string;
  to_date: string;
  cvs_created: number;
  medicals_processed: number;
  clearances_issued: number;
  embassies_cleared: number;
  tickets_booked: number;
  departures_confirmed: number;
  [key: string]: any;
}

export interface V2StaffPerformanceItem {
  user: string;
  full_name?: string;
  cvs_created: number;
  clearances_completed: number;
  tickets_booked: number;
  departures_confirmed: number;
  [key: string]: any;
}

export interface V2OperationsSummary {
  from_date: string;
  to_date: string;
  funnel?: {
    draft: number;
    registered: number;
    cv_generated: number;
    selected: number;
    processing: number;
    stamped: number;
    ticketed: number;
    departed: number;
    cancelled: number;
  };
  turnaround_sla?: {
    avg_registration_days: number;
    avg_clearance_days: number;
    avg_embassy_days: number;
    avg_ticketing_days: number;
  };
  overdue_clearance_steps?: number;
  [key: string]: any;
}

export interface V2PlacementAgingReport {
  approaching_ticket_deadline: Array<{
    name: string;
    applicant: string;
    full_name?: string;
    contractor: string;
    contractor_name?: string;
    destination_country?: string;
    stamped_date?: string;
    days_since_stamp?: number;
    age_days?: number;
    status?: string;
    [key: string]: any;
  }>;
  critical_not_departed: Array<{
    name: string;
    applicant: string;
    full_name?: string;
    contractor: string;
    contractor_name?: string;
    destination_country?: string;
    ticketed_date?: string;
    days_since_stamp?: number;
    age_days?: number;
    status?: string;
    [key: string]: any;
  }>;
}

export interface V2FinancialOverviewReport {
  from_date?: string;
  to_date?: string;
  total_expenses_etb?: number;
  total_income_etb?: number;
  net_balance_etb?: number;
  total_commissions_owed?: number;
  total_commissions_settled?: number;
  pending_approval_count?: number;
  totals_birr?: {
    income?: number;
    expense?: number;
    commission?: number;
    refund?: number;
  };
  outstanding_owed_birr?: number;
  settled_in_period_birr?: number;
  [key: string]: any;
}

export interface V2CostBreakdownReport {
  from_date?: string;
  to_date?: string;
  by_destination?: Record<string, {
    total_expense: number;
    count: number;
    avg_cost_per_placement: number;
  }>;
  by_stage?: Record<string, number>;
  [key: string]: any;
}

export interface V2EmployeeFinancialItem {
  employee?: string;
  employee_name?: string;
  user?: string;
  full_name?: string;
  total_expenses_logged?: number;
  total_income_logged?: number;
  net_etb?: number;
  approved_count?: number;
  rejected_count?: number;
  pending_count?: number;
  approved_transactions_count?: number;
  rejected_transactions_count?: number;
  net_expense_handled_birr?: number;
  [key: string]: any;
}

export interface V2PendingApprovalItem {
  name: string;
  transaction_type: "Expense" | "Income";
  amount: number;
  currency: string;
  description: string;
  placement?: string;
  applicant?: string;
  full_name?: string;
  logged_by: string;
  stage_logged_at?: string;
  creation: string;
  [key: string]: any;
}

export interface V2ComplaintAgingItem {
  complaint_name?: string;
  applicant?: string;
  full_name?: string;
  contractor?: string;
  contractor_name?: string;
  days_unresolved?: number;
  status?: string;
  days_bucket?: string;
  count?: number;
  [key: string]: any;
}

export interface V2ComplaintAgingSummary {
  new_count?: number;
  unresolved_count?: number;
  resolved_count?: number;
  aging_breakdown?: V2ComplaintAgingItem[];
  [key: string]: any;
}

function parseDates(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): { from_date?: string; to_date?: string } {
  if (typeof fromDate === "object" && fromDate !== null) {
    return {
      ...(fromDate.from_date ? { from_date: fromDate.from_date } : {}),
      ...(fromDate.to_date ? { to_date: fromDate.to_date } : {}),
    };
  }
  return {
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  };
}

/**
 * CVs created, medicals processed, clearances issued, embassies cleared, tickets booked, departures.
 */
export async function getDailyWorkReportV2(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): Promise<V2DailyWorkReport> {
  const dates = parseDates(fromDate, toDate);
  return requestV2<V2DailyWorkReport>(
    "/api/method/agency_tracking.report_api.get_daily_work_report",
    {
      method: "POST",
      body: dates,
    }
  );
}

/**
 * Breakdown of activity per individual staff member.
 */
export async function getStaffPerformanceReportV2(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): Promise<V2StaffPerformanceItem[]> {
  const dates = parseDates(fromDate, toDate);
  const result = await requestV2<V2StaffPerformanceItem[]>(
    "/api/method/agency_tracking.report_api.get_staff_performance_report",
    {
      method: "POST",
      body: dates,
    }
  );

  return Array.isArray(result) ? result : [];
}

/**
 * Recruitment funnel, SLA turnaround times, and pending overdue dashboard metrics.
 */
export async function getOperationsSummaryV2(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): Promise<V2OperationsSummary> {
  const dates = parseDates(fromDate, toDate);
  return await requestV2<V2OperationsSummary>(
    "/api/method/agency_tracking.report_api.get_operations_summary",
    {
      method: "POST",
      body: dates,
    }
  );
}

/**
 * Placements approaching the ticket deadline (25-29 days), and critical ones not yet Departed (30+ days).
 */
export async function getPlacementAgingReportV2(): Promise<V2PlacementAgingReport> {
  const result = await requestV2<V2PlacementAgingReport>(
    "/api/method/agency_tracking.report_api.get_placement_aging_report",
    {
      method: "POST",
      body: {},
    }
  );

  return {
    approaching_ticket_deadline: result?.approaching_ticket_deadline || [],
    critical_not_departed: result?.critical_not_departed || [],
  };
}

/**
 * Income/expense/commission/refund totals + outstanding/settled (Admin only).
 */
export async function getFinancialOverviewV2(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): Promise<V2FinancialOverviewReport> {
  const dates = parseDates(fromDate, toDate);
  return await requestV2<V2FinancialOverviewReport>(
    "/api/method/agency_tracking.report_api.get_financial_overview",
    {
      method: "POST",
      body: dates,
    }
  );
}

/**
 * Approved transaction totals grouped by destination country (Admin only).
 */
export async function getCostBreakdownReportV2(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): Promise<V2CostBreakdownReport> {
  const dates = parseDates(fromDate, toDate);
  return requestV2<V2CostBreakdownReport>(
    "/api/method/agency_tracking.report_api.get_cost_breakdown_report",
    {
      method: "POST",
      body: dates,
    }
  );
}

/**
 * Per-employee net expense + approval/rejection rate (Admin only).
 */
export async function getEmployeeFinancialReportV2(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): Promise<V2EmployeeFinancialItem[]> {
  const dates = parseDates(fromDate, toDate);
  const result = await requestV2<V2EmployeeFinancialItem[]>(
    "/api/method/agency_tracking.report_api.get_employee_financial_report",
    {
      method: "POST",
      body: dates,
    }
  );

  return Array.isArray(result) ? result : [];
}

/**
 * Lists every Pending Applicant Transaction, oldest-first (Admin / Finance Manager review queue).
 */
export async function getPendingApprovalQueueV2(): Promise<V2PendingApprovalItem[]> {
  const result = await requestV2<V2PendingApprovalItem[]>(
    "/api/method/agency_tracking.report_api.get_pending_approval_queue",
    {
      method: "POST",
      body: {},
    }
  );

  return Array.isArray(result) ? result : [];
}

/**
 * New/Unresolved (with age in days)/Resolved complaint counts.
 */
export async function getComplaintAgingReportV2(): Promise<V2ComplaintAgingSummary> {
  return requestV2<V2ComplaintAgingSummary>(
    "/api/method/agency_tracking.report_api.get_complaint_aging_report",
    {
      method: "POST",
      body: {},
    }
  );
}

/**
 * Exports commission records as a binary .xlsx / .csv stream.
 */
export async function exportCommissionsXlsxV2(
  contractor?: string,
  destinationCountry?: string,
  fromDate?: string,
  toDate?: string
): Promise<Blob> {
  return requestV2<Blob>(
    "/api/method/agency_tracking.report_api.export_commissions_xlsx",
    {
      method: "POST",
      body: {
        ...(contractor ? { contractor } : {}),
        ...(destinationCountry ? { destination_country: destinationCountry } : {}),
        ...(fromDate ? { from_date: fromDate } : {}),
        ...(toDate ? { to_date: toDate } : {}),
      },
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, application/json, */*",
      },
    }
  );
}
