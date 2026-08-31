/**
 * Demo Complaints Fixture (V2 90-Day Warranty Dispute Management)
 * Follows V2 Complaint contract and resolution statuses.
 */

import { V2ComplaintRecord } from "@/lib/api/v2/complaints";

export const DEMO_COMPLAINTS: V2ComplaintRecord[] = [
  {
    name: "COMP-2026-0001",
    placement: "PLC-2026-0006",
    applicant: "APP-2026-00106",
    full_name: "Genet Tesfaye Desta",
    contractor: "CON-001",
    contractor_name: "Al-Riyadh International Manpower",
    status: "Unresolved",
    description: "Sponsor requested Arabic language communication coaching and minor dietary adjustments.",
    worker_status_at_complaint: "Active with Sponsor",
    days_unresolved: 4,
    creation: "2026-02-24 10:30:00",
    modified: "2026-02-25 12:00:00",
  },
  {
    name: "COMP-2026-0002",
    placement: "PLC-2026-0005",
    applicant: "APP-2026-00105",
    full_name: "Dawit Yohannes Gebre",
    contractor: "CON-002",
    contractor_name: "Gulf Horizon Recruitment Bureau",
    status: "Resolved",
    description: "Flight schedule arrival coordination inquiry.",
    worker_status_at_complaint: "Pre-Departure",
    days_unresolved: 1,
    resolution_notes: "Updated flight arrival itinerary shared with agency dispatch team.",
    creation: "2026-02-26 14:00:00",
    modified: "2026-02-27 09:30:00",
  },
];
