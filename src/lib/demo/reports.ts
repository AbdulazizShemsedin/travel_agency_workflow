/**
 * Demo Reports Fixture (V2 Analytics & Management Reports)
 * Authoritative V2 reporting structures for recruitment funnel, turnaround SLAs, and aging alerts.
 */

import {
  V2DailyWorkReport,
  V2StaffPerformanceItem,
  V2OperationsSummary,
  V2PlacementAgingReport,
  V2CostBreakdownReport,
  V2EmployeeFinancialItem,
} from "@/lib/api/v2/reports";

export const DEMO_DAILY_WORK_REPORT: V2DailyWorkReport = {
  from_date: "2026-02-01",
  to_date: "2026-02-28",
  cvs_created: 48,
  medicals_processed: 42,
  clearances_issued: 35,
  embassies_cleared: 29,
  tickets_booked: 24,
  departures_confirmed: 21,
};

export const DEMO_STAFF_PERFORMANCE: V2StaffPerformanceItem[] = [
  {
    user: "officer_saudi_lmis@agency.com",
    full_name: "Yonas Mengistu (Saudi LMIS Officer)",
    cvs_created: 0,
    clearances_completed: 18,
    tickets_booked: 0,
    departures_confirmed: 0,
  },
  {
    user: "officer_taeshir@agency.com",
    full_name: "Hanan Seid (Taeshir Specialist)",
    cvs_created: 0,
    clearances_completed: 16,
    tickets_booked: 0,
    departures_confirmed: 0,
  },
  {
    user: "officer_ticketer@agency.com",
    full_name: "Solomon Getachew (Ticketing Lead)",
    cvs_created: 0,
    clearances_completed: 0,
    tickets_booked: 24,
    departures_confirmed: 21,
  },
  {
    user: "registrar_abebe@agency.com",
    full_name: "Bethlehem Tadesse (Senior Registrar)",
    cvs_created: 48,
    clearances_completed: 0,
    tickets_booked: 0,
    departures_confirmed: 0,
  },
];

export const DEMO_OPERATIONS_SUMMARY: V2OperationsSummary = {
  from_date: "2026-02-01",
  to_date: "2026-02-28",
  applicant_funnel: {
    Draft: 3,
    Registered: 8,
    "CV Generated": 14,
    Selected: 6,
    Processing: 9,
    Stamped: 5,
    Ticketed: 4,
    Departed: 21,
    Cancelled: 1,
  },
  placement_funnel: {
    Selected: 6,
    Processing: 9,
    Stamped: 5,
    Ticketed: 4,
    Departed: 21,
    Cancelled: 1,
  },
  conversion_rates: {
    registered_to_cv_generated: 92.5,
    stamped_to_ticketed: 94.0,
    ticketed_to_departed: 98.2,
  },
  turnaround_days: {
    selected_to_ticketed: 14.5,
    selected_to_departed: 18.2,
  },
  pending_overdue: {
    placements_approaching_ticket_deadline: 2,
    placements_critical_not_departed: 0,
    complaints_unresolved: 1,
    transactions_pending_approval: 0,
  },
};

export const DEMO_PLACEMENT_AGING: V2PlacementAgingReport = {
  approaching_ticket_deadline: [
    {
      name: "PLC-2026-0004",
      age_days: 7,
      status: "Stamped",
      applicant: "APP-2026-00104",
      full_name: "Tigist Alemu Worku",
      contractor: "CON-001",
      destination_country: "Saudi Arabia",
    },
  ],
  critical_not_departed: [],
};

export const DEMO_COST_BREAKDOWN: V2CostBreakdownReport = {
  from_date: "2026-02-01",
  to_date: "2026-02-28",
  by_country_birr: {
    "Saudi Arabia": 1280000,
    Kuwait: 640000,
  },
};

export const DEMO_EMPLOYEE_FINANCIAL: V2EmployeeFinancialItem[] = [
  {
    user: "finance_lead@agency.com",
    full_name: "Elias Worku",
    approved_transactions_count: 54,
    rejected_transactions_count: 2,
    net_expense_handled_birr: 1920000,
  },
];
