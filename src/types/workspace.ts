import * as React from "react";

export interface OperationalColumn<T = any> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  cell: (row: T, index?: number) => React.ReactNode;
}

export interface WorkspaceFilterOption {
  label: string;
  value: string;
}

export interface V2ClearanceQueueRow {
  name: string; // CLR-00001
  step_type: string; // "LMIS Clearance" | "Taeshir" | "Embassy" | "Kuwait LMIS" | "Telesign" | "Kuwait Embassy"
  sequence_order: number;
  is_mandatory: number; // 1 or 0
  status: string; // "Pending" | "In Progress" | "Issued" | "Complete" | "Submitted" | "Stamped" | "Rejected" | "Cancelled"
  date_started?: string | null;
  date_completed?: string | null;
  completed_by?: string | null;
  reference_no?: string | null;
  amount?: number | null;
  payment_status?: string | null;
  rejection_remark?: string | null;

  // Placement context
  placement: string; // PLM-00006
  destination_country?: string; // "Saudi Arabia" | "Kuwait"
  contractor?: string;
  contractor_name?: string;

  // Applicant context
  applicant?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  passport_number?: string;
  phone?: string;
  gender?: string;
  [key: string]: any;
}

export type OperationalStreamType = "lms" | "injaz" | "wakala" | "embassy" | "departure";

export interface WorkspaceApplicantRow {
  applicantId: string;
  applicant: any;
  dossier?: any | null;
  dsrName?: string;
  destinationCountry: string;
  fullName: string;
  passportNumber: string;
  phone?: string;
  medicalStatus?: string;
  medicalDate?: string;
  medicalExpiryDate?: string;
  jobApplied?: string;
  lockedContractor?: string;
  sponsorName?: string;
  sponsorId?: string;
  visaNumber?: string;
  contractNumber?: string;
  contractIssueDate?: string;
  salary?: number | string;
  contractPeriod?: string;

  // Normalized / Sheet Computed Fields
  laborId?: string;
  contractDate?: string;
  duration?: number;
  medicalRemaining?: string;
  medicalRemainingDays?: number;
  examRemainingDays?: number;
  injazPayment?: string;
  appointmentDate?: string;
  contact?: string;
  remark?: string;
  wakalaStatus?: string;
  wakalaAmount?: number;
  wakalaPaidDate?: string;
  embassyStatus?: string;
  telephone?: string;
  company?: string;
  lmisStatus?: string;
  issueDate?: string;
  ticketStatus?: string;
  ticketNumber?: string;

  // Stream-specific records
  lms?: any | null;
  injaz?: any | null;
  wakala?: any | null;
  embassy?: any | null;
  telesign?: any | null;
  stamp?: any | null;
  ticket?: any | null;
  departure?: any | null;

  // V2 linkage
  placementId?: string;
  clearanceStepName?: string;
  [key: string]: any;
}

