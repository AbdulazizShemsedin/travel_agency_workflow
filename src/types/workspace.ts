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
