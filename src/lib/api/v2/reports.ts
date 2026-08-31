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
import { isDemoMode } from "@/lib/config/env";
import { demoStore } from "@/lib/demo/store";
import { DEMO_COST_BREAKDOWN, DEMO_EMPLOYEE_FINANCIAL } from "@/lib/demo/reports";

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
  applicant_funnel: {
    Draft?: number;
    Registered?: number;
    "CV Generated"?: number;
    Selected?: number;
    Processing?: number;
    Stamped?: number;
    Ticketed?: number;
    Departed?: number;
    Cancelled?: number;
    [key: string]: number | undefined;
  };
  placement_funnel: {
    Selected?: number;
    Processing?: number;
    Stamped?: number;
    Ticketed?: number;
    Departed?: number;
    Cancelled?: number;
    [key: string]: number | undefined;
  };
  conversion_rates: {
    registered_to_cv_generated?: number | null;
    stamped_to_ticketed?: number | null;
    ticketed_to_departed?: number | null;
  };
  turnaround_days: {
    selected_to_ticketed?: number | null;
    selected_to_departed?: number | null;
  };
  pending_overdue: {
    placements_approaching_ticket_deadline: number;
    placements_critical_not_departed: number;
    complaints_unresolved: number;
    transactions_pending_approval: number;
  };
}

export interface V2PlacementAgingReport {
  approaching_ticket_deadline: Array<{
    name: string;
    age_days: number;
    status: string;
    applicant?: string;
    full_name?: string;
    contractor?: string;
    destination_country?: string;
    [key: string]: any;
  }>;
  critical_not_departed: Array<{
    name: string;
    age_days: number;
    status: string;
    applicant?: string;
    full_name?: string;
    contractor?: string;
    destination_country?: string;
    [key: string]: any;
  }>;
}

export interface V2FinancialOverviewReport {
  from_date: string;
  to_date: string;
  totals_birr: {
    commission: number;
    refund: number;
    income: number;
    expense: number;
  };
  outstanding_owed_birr: number;
  settled_in_period_birr: number;
}

export interface V2CostBreakdownReport {
  from_date: string;
  to_date: string;
  by_country_birr?: Record<string, number>;
  [key: string]: any;
}

export interface V2EmployeeFinancialItem {
  user: string;
  full_name?: string;
  approved_transactions_count?: number;
  rejected_transactions_count?: number;
  net_expense_handled_birr?: number;
  [key: string]: any;
}

export interface V2PendingApprovalItem {
  name: string;
  transaction_type: "Income" | "Expense";
  amount: number;
  currency: string;
  description: string;
  creation: string;
  owner: string;
  owner_name?: string;
  [key: string]: any;
}

export interface V2ComplaintAgingSummary {
  new_count: number;
  unresolved_count: number;
  aging_breakdown: Array<{
    complaint_name: string;
    contractor: string;
    contractor_name?: string;
    applicant: string;
    full_name?: string;
    days_unresolved: number;
    status: string;
    creation: string;
  }>;
  resolved_count: number;
}

function parseDates(
  arg1?: string | { from_date?: string; to_date?: string },
  arg2?: string
): { from_date: string; to_date: string } {
  const today = new Date().toISOString().split("T")[0];
  if (typeof arg1 === "object" && arg1 !== null) {
    return {
      from_date: arg1.from_date || "2020-01-01",
      to_date: arg1.to_date || today,
    };
  }
  return {
    from_date: typeof arg1 === "string" && arg1 ? arg1 : "2020-01-01",
    to_date: arg2 || today,
  };
}

/**
 * CVs created, medicals processed, clearances issued, embassies cleared, tickets booked, departures.
 */
export async function getDailyWorkReportV2(
  fromDate?: string | { from_date?: string; to_date?: string },
  toDate?: string
): Promise<V2DailyWorkReport> {
  if (isDemoMode()) {
    return demoStore.getDailyWorkReport();
  }

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
  if (isDemoMode()) {
    return demoStore.getStaffPerformance();
  }

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
  if (isDemoMode()) {
    return demoStore.getOperationsSummary();
  }

  const dates = parseDates(fromDate, toDate);
  return requestV2<V2OperationsSummary>(
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
  if (isDemoMode()) {
    return demoStore.getPlacementAging();
  }

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
  if (isDemoMode()) {
    return demoStore.getFinancialOverview();
  }

  const dates = parseDates(fromDate, toDate);
  return requestV2<V2FinancialOverviewReport>(
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
  if (isDemoMode()) {
    return DEMO_COST_BREAKDOWN;
  }

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
  if (isDemoMode()) {
    return DEMO_EMPLOYEE_FINANCIAL;
  }

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
    }
  );
}
