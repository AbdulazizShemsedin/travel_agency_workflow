/**
 * Demo Finance & Commission Fixture (V2 Finance Engine)
 * Authoritative V2 financial schemas and multi-currency support (SAR, KWD, USD, ETB).
 */

import {
  V2OwedCommissionItem,
  V2CommissionBatch,
} from "@/lib/api/v2/finance";
import { V2FinancialOverviewReport } from "@/lib/api/v2/reports";

export const DEMO_FINANCIAL_OVERVIEW: V2FinancialOverviewReport = {
  from_date: "2026-02-01",
  to_date: "2026-02-28",
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
    placement: "PLC-2026-0004",
    applicant: "APP-2026-00104",
    full_name: "Tigist Alemu Worku",
    contractor: "CON-001",
    contractor_name: "Al-Riyadh International Manpower",
    destination_country: "Saudi Arabia",
    commission_amount: 3500,
    amount: 3500,
    currency: "SAR",
    status: "Approved",
    creation: "2026-02-20 16:00:00",
  },
  {
    name: "COMM-2026-0002",
    placement: "PLC-2026-0005",
    applicant: "APP-2026-00105",
    full_name: "Dawit Yohannes Gebre",
    contractor: "CON-002",
    contractor_name: "Gulf Horizon Recruitment Bureau",
    destination_country: "Kuwait",
    commission_amount: 350,
    amount: 350,
    currency: "KWD",
    status: "Approved",
    creation: "2026-02-27 10:00:00",
  },
  {
    name: "COMM-2026-0003",
    placement: "PLC-2026-0006",
    applicant: "APP-2026-00106",
    full_name: "Genet Tesfaye Desta",
    contractor: "CON-001",
    contractor_name: "Al-Riyadh International Manpower",
    destination_country: "Saudi Arabia",
    commission_amount: 3500,
    amount: 3500,
    currency: "SAR",
    status: "Settled",
    batch: "BATCH-2026-001",
    creation: "2026-02-14 08:00:00",
  },
];

export const DEMO_COMMISSION_BATCHES: V2CommissionBatch[] = [
  {
    name: "BATCH-2026-001",
    contractor: "CON-001",
    destination_country: "Saudi Arabia",
    currency: "SAR",
    total_amount: 7000,
    status: "Settled",
    settlement_reference: "BANK-WIRE-SAR-883921",
    items: [
      {
        transaction_name: "COMM-2026-0003",
        amount: 3500,
        currency: "SAR",
        applicant: "APP-2026-00106",
        applicant_name: "Genet Tesfaye Desta",
      },
    ],
    creation: "2026-02-15 10:00:00",
  },
];

export const DEMO_FX_RATES: Record<string, number> = {
  SAR: 33.5,
  KWD: 405.0,
  USD: 125.8,
  ETB: 1.0,
};
