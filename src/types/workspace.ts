import { Applicant, ApplicantDossier } from "@/types/applicant";
import {
  LMSClearanceRecord,
  InjazClearanceRecord,
  WakalaClearanceRecord,
  EmbassyClearanceRecord,
  TelesignClearanceRecord,
  DSRStampRecord,
  DSRTicketRecord,
  DSRDepartureRecord,
} from "@/types/processing";

export type OperationalStreamType = "lms" | "injaz" | "wakala" | "embassy" | "departure";

export interface WorkspaceApplicantRow {
  applicantId: string;
  applicant: Applicant;
  dossier?: ApplicantDossier | null;
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
  embassyStatus?: string;
  telephone?: string;
  company?: string;
  lmisStatus?: string;
  issueDate?: string;
  ticketStatus?: string;
  ticketNumber?: string;

  // Stream-specific records
  lms?: LMSClearanceRecord | null;
  injaz?: InjazClearanceRecord | null;
  wakala?: WakalaClearanceRecord | null;
  embassy?: EmbassyClearanceRecord | null;
  telesign?: TelesignClearanceRecord | null;
  stamp?: DSRStampRecord | null;
  ticket?: DSRTicketRecord | null;
  departure?: DSRDepartureRecord | null;
}

export interface OperationalColumn<T = WorkspaceApplicantRow> {
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

