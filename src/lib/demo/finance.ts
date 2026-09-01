/**
 * Demo Finance & Commission Fixture (V2 Finance Engine)
 * Authoritative V2 financial schemas and multi-currency support (SAR, KWD, USD, ETB).
 * Dynamically relative dates for seamless Daily, Weekly, and Monthly reports filtering.
 */

import {
  V2OwedCommissionItem,
  V2CommissionBatch,
} from "@/lib/api/v2/finance";
import { V2FinancialOverviewReport } from "@/lib/api/v2/reports";
import { getRelativeDate, getRelativeDateOnly } from "./applicants";

export const DEMO_FINANCIAL_OVERVIEW: V2FinancialOverviewReport = {
  from_date: getRelativeDateOnly(30),
  to_date: getRelativeDateOnly(0),
  totals_birr: {
    income: 4850000,
    expense: 1920000,
    commission: 2450000,
    refund: 85000,
  },
  outstanding_owed_birr: 1250000,
  settled_in_period_birr: 3600000,
};

export const DEMO_OWED_COMMISSIONS: V2OwedCommissionItem[] = [
  {
    name: "COMM-2026-0001",
    placement: "PLC-2026-0001",
    applicant: "APP-2026-00101",
    full_name: "Fatima Zahra Ahmed",
    contractor: "CON-001",
    contractor_name: "Tihamat Asir Recruitment company",
    destination_country: "Saudi Arabia",
    commission_amount: 117250,
    amount: 117250,
    currency: "Birr",
    status: "Approved",
    creation: getRelativeDate(0, "11:00:00"),
  },
  {
    name: "COMM-2026-0002",
    placement: "PLC-2026-0004",
    applicant: "APP-2026-00104",
    full_name: "Tigist Alemu Worku",
    contractor: "CON-001",
    contractor_name: "Tihamat Asir Recruitment company",
    destination_country: "Saudi Arabia",
    commission_amount: 117250,
    amount: 117250,
    currency: "Birr",
    status: "Approved",
    creation: getRelativeDate(2, "16:00:00"),
  },
  {
    name: "COMM-2026-0003",
    placement: "PLC-2026-0005",
    applicant: "APP-2026-00105",
    full_name: "Dawit Yohannes Gebre",
    contractor: "CON-002",
    contractor_name: "Gulf Horizon Recruitment Bureau",
    destination_country: "Kuwait",
    commission_amount: 141750,
    amount: 141750,
    currency: "Birr",
    status: "Approved",
    creation: getRelativeDate(5, "10:00:00"),
  },
  {
    name: "COMM-2026-0004",
    placement: "PLC-2026-0006",
    applicant: "APP-2026-00106",
    full_name: "Genet Tesfaye Desta",
    contractor: "CON-001",
    contractor_name: "Tihamat Asir Recruitment company",
    destination_country: "Saudi Arabia",
    commission_amount: 117250,
    amount: 117250,
    currency: "Birr",
    status: "Settled",
    batch: "BATCH-2026-001",
    creation: getRelativeDate(15, "08:00:00"),
  },
];

export const DEMO_COMMISSION_BATCHES: V2CommissionBatch[] = [
  {
    name: "BATCH-2026-001",
    contractor: "CON-001",
    destination_country: "Saudi Arabia",
    currency: "Birr",
    total_amount: 234500,
    status: "Settled",
    settlement_reference: "CBE-WIRE-ETB-883921",
    items: [
      {
        transaction_name: "COMM-2026-0004",
        amount: 117250,
        currency: "Birr",
        applicant: "APP-2026-00106",
        applicant_name: "Genet Tesfaye Desta",
      },
    ],
    creation: getRelativeDate(15, "10:00:00"),
  },
];

export const DEMO_FX_RATES: Record<string, number> = {
  SAR: 33.5,
  KWD: 405.0,
  USD: 125.8,
  ETB: 1.0,
};
