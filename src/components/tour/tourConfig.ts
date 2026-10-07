import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  FileCheck2,
  CreditCard,
  Building2,
  Plane,
  MessageSquare,
  DollarSign,
  Receipt,
  BarChart3,
  Briefcase,
  HelpCircle,
  Keyboard,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { PermissionAction } from "@/lib/auth/permissions";

export type TourMode = "idle" | "onboarding" | "presentation";

export interface TourStep {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  route: string;
  targetSelector: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  requiredRole?: PermissionAction;
  highlightPadding?: number;
  tip?: string;
}

export interface TourSection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  route: string;
  requiredRole?: PermissionAction;
  steps: TourStep[];
}

export interface KeyboardShortcutItem {
  key: string;
  label: string;
  description: string;
  category: "Navigation" | "Tour & Presentation" | "Quick Actions" | "General";
}

export const SHORTCUTS_LIST: KeyboardShortcutItem[] = [
  // Tour & Presentation Controls
  {
    key: "→",
    label: "Right Arrow / Enter",
    description: "Advance to the next step or section in the active tour",
    category: "Tour & Presentation",
  },
  {
    key: "←",
    label: "Left Arrow",
    description: "Go back to the previous step or section in the tour",
    category: "Tour & Presentation",
  },
  {
    key: "Space",
    label: "Spacebar",
    description: "Pause or resume the presentation tour for live demonstration",
    category: "Tour & Presentation",
  },
  {
    key: "m",
    label: "m / t",
    description: "Open the Presentation Table of Contents / Section Menu",
    category: "Tour & Presentation",
  },
  {
    key: "Esc",
    label: "Escape",
    description: "Exit the active tour or close any open dialog window",
    category: "Tour & Presentation",
  },

  // General & Tour Launches
  {
    key: "?",
    label: "? / Shift + /",
    description: "Display this Keyboard Shortcuts cheat sheet",
    category: "General",
  },
  {
    key: "Alt + T",
    label: "Alt + T",
    description: "Open the Guided Tour selector (Choose Onboarding or Presentation)",
    category: "General",
  },
  {
    key: "Alt + P",
    label: "Alt + P",
    description: "Directly launch the Client Presentation Mode",
    category: "General",
  },
  {
    key: "Alt + O",
    label: "Alt + O",
    description: "Directly launch the User Onboarding Tour",
    category: "General",
  },

  // Sequential Navigation (g then key)
  {
    key: "g d",
    label: "g then d",
    description: "Navigate to Operations Dashboard",
    category: "Navigation",
  },
  {
    key: "g a",
    label: "g then a",
    description: "Navigate to Applicants & Operational Workspaces",
    category: "Navigation",
  },
  {
    key: "g c",
    label: "g then c",
    description: "Navigate to Messages & Real-Time Chat Desk",
    category: "Navigation",
  },
  {
    key: "g e",
    label: "g then e",
    description: "Navigate to Employee Roster & Default Corridor Roles",
    category: "Navigation",
  },
  {
    key: "g p",
    label: "g then p",
    description: "Navigate to Foreign Partner Agencies & Rate Matrix",
    category: "Navigation",
  },
  {
    key: "g m",
    label: "g then m",
    description: "Navigate to Commission Invoicing & Settlement",
    category: "Navigation",
  },
  {
    key: "g f",
    label: "g then f",
    description: "Navigate to Financial Accounting & Approvals",
    category: "Navigation",
  },
  {
    key: "g r",
    label: "g then r",
    description: "Navigate to Management Analytics & Reports",
    category: "Navigation",
  },

  // Quick Actions
  {
    key: "n a",
    label: "n then a",
    description: "Open New Candidate Intake & Registration Form",
    category: "Quick Actions",
  },
];

// ============================================================================
// MODE 1: ONBOARDING TOUR (Concise, for normal operational staff)
// ============================================================================
export const ONBOARDING_STEPS: TourStep[] = [
  {
    id: "onboard-welcome",
    title: "Welcome to Travel Agency ERP",
    subtitle: "Enterprise Overseas Placement System",
    description:
      "This system coordinates the full lifecycle of overseas employment candidates—from passport OCR intake and bilateral CV generation to corridor clearance (LMIS, Te'shir, Embassy) and flight departure.",
    route: "/dashboard",
    targetSelector: '[data-tour="sidebar-brand"]',
    placement: "bottom",
    tip: "You can navigate using the sidebar links or press '?' anytime to view keyboard shortcuts.",
  },
  {
    id: "onboard-kpis",
    title: "Live Operational Dashboard",
    subtitle: "Real-Time Pipeline Visibility",
    description:
      "View live KPI metrics across the agency: Total Registered Applicants, Candidates in Clearance Processing, Ready for Flight, and Active Partner Placements.",
    route: "/dashboard",
    targetSelector: '[data-tour="dashboard-kpis"]',
    placement: "bottom",
    tip: "All statistics update dynamically from live database records without demo fallbacks.",
  },
  {
    id: "onboard-pipeline",
    title: "The 8-Stage Lifecycle Pipeline",
    subtitle: "Authoritative Milestone Tracking",
    description:
      "Candidates progress through 8 distinct stages: Draft ➔ Registered ➔ CV Generated ➔ Selected ➔ Processing ➔ Stamped ➔ Ticketed ➔ Departed. Click any stage card to inspect filtered candidates.",
    route: "/dashboard",
    targetSelector: '[data-tour="dashboard-pipeline"]',
    placement: "bottom",
  },
  {
    id: "onboard-add-applicant",
    title: "Intake & Registration Form",
    subtitle: "High-Speed Candidate Onboarding",
    description:
      "Click here to register new candidates. Features instant passport OCR extraction, camera capture, drag-and-drop media dropzones, and smart error navigation.",
    route: "/dashboard",
    targetSelector: '[data-tour="add-applicant-button"]',
    placement: "right",
    tip: "Shortcut: Press 'n' then 'a' from anywhere to quickly open the intake form.",
  },
  {
    id: "onboard-applicants-directory",
    title: "Applicant Master Directory",
    subtitle: "Search, Filter & Profile Drilldown",
    description:
      "Explore all registered candidates. Filter by corridor (Saudi Arabia / Kuwait), stage, or status. Click any candidate name to access their comprehensive profile and documents.",
    route: "/applicants",
    targetSelector: '[data-tour="applicants-table"]',
    placement: "top",
  },
  {
    id: "onboard-cv-database",
    title: "Candidate CV Database",
    subtitle: "Bilateral Employment Roster",
    description:
      "View candidate contact details, medical fitness, religion, age, and in-cell editable remarks. Compile official recruitment CVs and export standard Excel rosters with one click.",
    route: "/applicants?tab=cv",
    targetSelector: '[data-tour="applicants-tab-cv"]',
    placement: "bottom",
  },
  {
    id: "onboard-clearance-tabs",
    title: "Corridor Clearance Pipeline",
    subtitle: "Specialized Operational Workspaces",
    description:
      "Specialists execute milestone requirements across concurrent corridor tabs: LMIS clearance, Te'shir / Injaz biometrics, Embassy stamping, and ticketing with Medical 2 gate checks.",
    route: "/applicants?tab=lms",
    targetSelector: '[data-tour="applicants-workspace-tabs"]',
    placement: "bottom",
  },
  {
    id: "onboard-chat",
    title: "Real-Time Collaboration Desk",
    subtitle: "Staff & Foreign Agency Messaging",
    description:
      "Communicate with colleagues and partner agencies in real time. Features read receipts, active presence indicators, file sharing, and candidate reference linking.",
    route: "/chat",
    targetSelector: '[data-tour="sidebar-nav-chat"]',
    placement: "right",
  },
  {
    id: "onboard-help-shortcuts",
    title: "Keyboard Shortcuts & System Tour",
    subtitle: "Built for Daily Productivity",
    description:
      "You're ready to get started! You can reopen this onboarding guide, launch the Client Presentation mode, or view all keyboard shortcuts anytime from the navigation bar.",
    route: "/dashboard",
    targetSelector: '[data-tour="navbar-tour-trigger"]',
    placement: "bottom",
    tip: "Press '?' on your keyboard anytime to open the shortcut cheat sheet.",
  },
];

// ============================================================================
// MODE 2: PRESENTATION / DEMO TOUR (Structured, Section-Based for Client)
// ============================================================================
export const PRESENTATION_SECTIONS: TourSection[] = [
  {
    id: "sec-overview",
    title: "Executive Overview & Intelligence",
    subtitle: "Section 1 of 11 • System Purpose & Live Metrics",
    description:
      "Explore the agency's executive dashboard, real-time KPI metrics, the 8-stage candidate lifecycle pipeline, and urgent operational expiry watchdogs.",
    icon: LayoutDashboard,
    route: "/dashboard",
    steps: [
      {
        id: "pres-dash-welcome",
        title: "Enterprise Overseas Placement Architecture",
        subtitle: "Unified Agency ERP",
        description:
          "Welcome to the Agency Tracking & Placement ERP. This system replaces fragmented spreadsheets with an authoritative pipeline: Candidate Intake ➔ CV Generation ➔ Foreign Agency Selection ➔ Clearance Workspaces ➔ Ticketing ➔ Departure.",
        route: "/dashboard",
        targetSelector: '[data-tour="sidebar-brand"]',
        placement: "bottom",
      },
      {
        id: "pres-dash-kpis",
        title: "Real-Time KPI Operations Cards",
        subtitle: "Live Backend Aggregations",
        description:
          "These top cards provide immediate oversight into key agency operations: Total Registered Applicants, Placements in Clearance Streams, Candidates Cleared for Departure, and Active Corridors.",
        route: "/dashboard",
        targetSelector: '[data-tour="dashboard-kpis"]',
        placement: "bottom",
        tip: "Data updates directly from production database records without mock data.",
      },
      {
        id: "pres-dash-pipeline",
        title: "The 8-Stage Candidate Lifecycle Pipeline",
        subtitle: "Strict Milestone Governance",
        description:
          "Every applicant progresses through verified milestones: Draft ➔ Registered ➔ CV Generated ➔ Selected ➔ Processing (LMIS & Te'shir) ➔ Stamped ➔ Ticketed ➔ Departed. Visual count badges update live.",
        route: "/dashboard",
        targetSelector: '[data-tour="dashboard-pipeline"]',
        placement: "bottom",
      },
      {
        id: "pres-dash-alerts",
        title: "Operational Alerts & Expiry Watchdog",
        subtitle: "Compliance & SLA Protection",
        description:
          "Automated watchdogs monitor pre-departure medical check expirations, contract aging, and pending assignments so staff can prevent flight cancellations or visa forfeitures.",
        route: "/dashboard",
        targetSelector: '[data-tour="dashboard-operational-tasks"]',
        placement: "top",
      },
    ],
  },
  {
    id: "sec-intake",
    title: "Candidate Intake & Smart Registration",
    subtitle: "Section 2 of 11 • Fast-Path Onboarding & OCR",
    description:
      "Demonstrate high-speed passport OCR extraction, drag-and-drop media dropzones, Easy-Injaz layout conformance, and smart error validation.",
    icon: UserPlus,
    route: "/applicants/new",
    requiredRole: "registerApplicant",
    steps: [
      {
        id: "pres-intake-form",
        title: "Smart Intake & Registration Form",
        subtitle: "Dual-Track Registration (Standard & Muayena)",
        description:
          "Supports both Standard pool candidates and Muayena direct contractor assignments. Grounded strictly in Frappe field floors with clear mandatory (*) indicators.",
        route: "/applicants/new",
        targetSelector: '[data-tour="registration-form-container"]',
        placement: "top",
      },
      {
        id: "pres-intake-ocr",
        title: "High-Speed Passport OCR Dropzone",
        subtitle: "Automated Data Extraction",
        description:
          "Staff can drag-and-drop or paste (Ctrl+V) passport scans. The asynchronous OCR engine parses full name, passport number, birth date, gender, and nationality in seconds with mid-extraction cancel support.",
        route: "/applicants/new",
        targetSelector: '[data-tour="passport-dropzone"]',
        placement: "bottom",
      },
      {
        id: "pres-intake-steps",
        title: "Easy-Injaz Alignment & Error Navigation",
        subtitle: "Zero-Friction Operator Experience",
        description:
          "Layout mirrors the official Saudi easy-injaz input arrangement. If any validation fails, the form automatically navigates to the section, smoothly scrolls to the field, and highlights it with simple English guidance.",
        route: "/applicants/new",
        targetSelector: '[data-tour="registration-step-nav"]',
        placement: "bottom",
      },
    ],
  },
  {
    id: "sec-cv-database",
    title: "Candidate CV Database & Verification",
    subtitle: "Section 3 of 11 • Official Bilateral CV Management",
    description:
      "Inspect the dedicated 12-column Candidate CV table, Excel-like in-cell remark editing, PDF generation, and official CSV exports.",
    icon: FileSpreadsheet,
    route: "/applicants?tab=cv",
    steps: [
      {
        id: "pres-cv-table",
        title: "12-Column Candidate CV Roster",
        subtitle: "Client Spreadsheet Parity",
        description:
          "Displays NO, CONTACT, NAME, PASSPORT, LABOUR ID, MEDICAL, RELIGION, REGION, AGE, MARRIED/NOT, # OF CHILDREN, and REMARK. Column 'Musaned' is strictly omitted per client specification.",
        route: "/applicants?tab=cv",
        targetSelector: '[data-tour="cv-workspace-table"]',
        placement: "top",
      },
      {
        id: "pres-cv-actions",
        title: "Dynamic Actions: Generate & View CV",
        subtitle: "Bilateral CV Compilation",
        description:
          "For candidates without a compiled CV, a green 'Generate CV' button is displayed. Once generated, the Eye icon ('View CV') triggers the full visual dossier and the 'PDF' button downloads the official file.",
        route: "/applicants?tab=cv",
        targetSelector: '[data-tour="cv-actions-header"]',
        placement: "bottom",
      },
      {
        id: "pres-cv-export",
        title: "Formatted CSV / Excel Export",
        subtitle: "1-Click Client Roster Download",
        description:
          "Export the filtered candidate database directly to a clean CSV/Excel file matching the exact column order and headers required by international partner agencies.",
        route: "/applicants?tab=cv",
        targetSelector: '[data-tour="cv-export-button"]',
        placement: "left",
      },
    ],
  },
  {
    id: "sec-applicant-directory",
    title: "Applicant Master Directory & Profiles",
    subtitle: "Section 4 of 11 • Lifecycle Drilldown & Records",
    description:
      "Review the master candidate table, filtering capabilities, candidate profile view, contract attachments, and document previewers.",
    icon: Users,
    route: "/applicants",
    steps: [
      {
        id: "pres-app-table",
        title: "Master Candidate Directory",
        subtitle: "Compact, High-Density Information Layout",
        description:
          "View candidates with pinned name columns, responsive badges, medical fitness status, and destination corridor indicators. Search by passport, name, or phone number in real time.",
        route: "/applicants",
        targetSelector: '[data-tour="applicants-table"]',
        placement: "top",
      },
      {
        id: "pres-app-filters",
        title: "Corridor & Status Filtering",
        subtitle: "Saudi Arabia vs Kuwait",
        description:
          "Quickly narrow down candidates by destination country, operational stage (Draft, Registered, Processing, Stamped, Ticketed, Departed), or medical result.",
        route: "/applicants",
        targetSelector: '[data-tour="applicants-filter-bar"]',
        placement: "bottom",
      },
    ],
  },
  {
    id: "sec-clearance-pipeline",
    title: "Corridor Clearance & Embassy Operations",
    subtitle: "Section 5 of 11 • LMIS, Te'shir, Embassy & Ticketing",
    description:
      "Demonstrate the operational clearance workspaces: LMIS clearance, Te'shir MOFA Injaz visa processing, Embassy stamping with Wakala payment gating, and ticket departure.",
    icon: Building2,
    route: "/applicants?tab=lms",
    steps: [
      {
        id: "pres-clearance-tabs",
        title: "Specialized Operational Workspaces",
        subtitle: "Role-Gated Operational Desks",
        description:
          "The top tabs organize the operational clearance pipeline: LMIS Clearance, Te'shir / Injaz MOFA, Embassy Stamping, and Ticket & Departure. Only authorized corridor specialists can execute steps.",
        route: "/applicants?tab=lms",
        targetSelector: '[data-tour="applicants-workspace-tabs"]',
        placement: "bottom",
      },
      {
        id: "pres-lmis-desk",
        title: "LMIS & Ministry Clearance Desk",
        subtitle: "Labor ID, COC & Police Ashara",
        description:
          "Manage ministry labor approvals, insurance tracking, COC status, exam dates, and Kuwait Police Ashara records with direct in-cell edits and Fast-Path intake.",
        route: "/applicants?tab=lms",
        targetSelector: '[data-tour="lmis-workspace-table"]',
        placement: "top",
      },
      {
        id: "pres-injaz-desk",
        title: "Te'shir / MOFA Visa Processing Desk",
        subtitle: "Multi-Candidate Taeshir .xls Export",
        description:
          "Manage Injaz application numbers, appointment dates, and visa status. Checkboxes allow selective candidate export formatted for Taeshir biometrics, plus real MOFA application PDF generation.",
        route: "/applicants?tab=injaz",
        targetSelector: '[data-tour="injaz-workspace-table"]',
        placement: "top",
      },
      {
        id: "pres-embassy-desk",
        title: "Embassy Stamping & Wakala Verification",
        subtitle: "Strict Submission & Stamping Gates",
        description:
          "Track visa numbers and stamping outcomes. The Saudi corridor enforces the verified Wakala paid rule before submission, with a manager override audit log for exceptions.",
        route: "/applicants?tab=embassy",
        targetSelector: '[data-tour="embassy-workspace-table"]',
        placement: "top",
      },
      {
        id: "pres-ticket-desk",
        title: "Ticketing & Departure Workspace",
        subtitle: "Medical 2 Gate & Reschedule Rules",
        description:
          "Record ticket numbers, flight dates, and departure times. Ticket costs are enforced strictly in ETB. Advancing to departure is strictly blocked unless Pre-Departure Medical 2 is certified FIT.",
        route: "/applicants?tab=departure",
        targetSelector: '[data-tour="departure-workspace-table"]',
        placement: "top",
      },
    ],
  },
  {
    id: "sec-chat",
    title: "Real-Time Communication & Messaging",
    subtitle: "Section 6 of 11 • Staff & Foreign Agency Chat",
    description:
      "Explore real-time messaging, internal colleague threads, partner agency communication, read receipts (ticks), presence tracking, and supervisor oversight.",
    icon: MessageSquare,
    route: "/chat",
    requiredRole: "manageCommunication",
    steps: [
      {
        id: "pres-chat-threads",
        title: "Unified Communication Channels",
        subtitle: "Strict Party Isolation",
        description:
          "Maintains separate channels for internal staff discussions and external foreign agency partner communications. Fast search locates threads by colleague name or agency contractor.",
        route: "/chat",
        targetSelector: '[data-tour="chat-thread-list"]',
        placement: "right",
      },
      {
        id: "pres-chat-window",
        title: "Real-Time Chat & WhatsApp-Style Ticks",
        subtitle: "Presence Detection & Read Receipts",
        description:
          "Live message stream with single-tick (delivered) and blue double-tick (seen) read receipts based on participant read timestamps. In-chat heartbeats detect active presence within 60 seconds.",
        route: "/chat",
        targetSelector: '[data-tour="chat-active-window"]',
        placement: "left",
      },
    ],
  },
  {
    id: "sec-foreign-agencies",
    title: "Foreign Agencies & Partner Portal",
    subtitle: "Section 7 of 11 • Rate Matrix & International Access",
    description:
      "Review the registered foreign agency directory, multi-dimensional commission rate matrix, and dedicated foreign partner portal.",
    icon: Building2,
    route: "/contractors",
    requiredRole: "manageContractors",
    steps: [
      {
        id: "pres-contractors-table",
        title: "Foreign Agency Directory",
        subtitle: "International Partner Network",
        description:
          "Manage overseas partner agencies in Saudi Arabia and Kuwait. Displays active placements, owed commissions, batch thresholds, and linked user accounts.",
        route: "/contractors",
        targetSelector: '[data-tour="contractors-table"]',
        placement: "top",
      },
      {
        id: "pres-rate-matrix",
        title: "5-Dimension Commission Rate Matrix",
        subtitle: "Country × Entry Track × Gender × Rate × Currency",
        description:
          "Admins can configure bilateral commission rates per agency across Destination Country, Entry Track (Standard vs Muayena), Gender, and Currency, replacing ad-hoc manual rate entry.",
        route: "/contractors",
        targetSelector: '[data-tour="contractors-rate-matrix-button"]',
        placement: "bottom",
      },
    ],
  },
  {
    id: "sec-commission",
    title: "Commission Billing & Settlement",
    subtitle: "Section 8 of 11 • End-to-End Batch Invoicing",
    description:
      "Demonstrate the 7-tab commission lifecycle: Owed Commissions, Batch Requests, On-Demand PDF Invoices, Advance Wires, and Settlement.",
    icon: DollarSign,
    route: "/commission",
    requiredRole: "manageCommission",
    steps: [
      {
        id: "pres-commission-owed",
        title: "Accumulated Owed Commissions",
        subtitle: "Unbatched Candidate Earnings",
        description:
          "Displays all candidate placements ready for agency billing. Staff can trigger early accrual, inspect currency breakdowns, and multi-select items to create a unified Commission Batch.",
        route: "/commission",
        targetSelector: '[data-tour="commission-owed-table"]',
        placement: "top",
      },
      {
        id: "pres-commission-batches",
        title: "Batch Requests & Invoicing",
        subtitle: "CBR-##### Batch Management",
        description:
          "Track commission batches across statuses (Unpaid, Partly Paid, Paid). Generate binary PDF invoices on demand, record advance wires, and apply write-offs with audited justification reasons.",
        route: "/commission",
        targetSelector: '[data-tour="commission-batches-table"]',
        placement: "top",
      },
    ],
  },
  {
    id: "sec-finance",
    title: "Agency Finance & Accounting",
    subtitle: "Section 9 of 11 • Ledgers, Approvals & Reconciliation",
    description:
      "Review the financial transaction ledger, manager approval queue, bank statement CSV reconciliation, and live FX rate synchronization.",
    icon: Receipt,
    route: "/expenses-income",
    requiredRole: "viewFinance",
    steps: [
      {
        id: "pres-finance-ledger",
        title: "Embedded Financial Ledger",
        subtitle: "Multi-Currency Expense & Income Tracking",
        description:
          "Records registration fees, candidate expenses, and agency operating income. Supports optional candidate/placement linking and displays live currency conversion against ETB.",
        route: "/expenses-income",
        targetSelector: '[data-tour="finance-ledger-table"]',
        placement: "top",
      },
      {
        id: "pres-finance-approvals",
        title: "Transaction Approval Queue",
        subtitle: "Four-Eyes Governance",
        description:
          "Finance Managers and Admins review pending stage transactions with explicit Approve, Reject (with reason), and Void controls, ensuring full accounting compliance.",
        route: "/expenses-income",
        targetSelector: '[data-tour="finance-tabs"]',
        placement: "bottom",
      },
    ],
  },
  {
    id: "sec-reports",
    title: "Management Analytics & Reports",
    subtitle: "Section 10 of 11 • Performance & Excel Exports",
    description:
      "Inspect operations summaries, staff performance KPIs, placement aging, and multi-column binary Excel exports.",
    icon: BarChart3,
    route: "/reports",
    requiredRole: "viewReports",
    steps: [
      {
        id: "pres-reports-views",
        title: "10 Sanctioned Management Reports",
        subtitle: "Daily Work, Staff Performance & Aging",
        description:
          "Access real-time analytics covering Daily Operations, Staff Clearance Throughput, Complaint Aging, Cost Breakdowns, and Placements pending departure for 30+ days.",
        route: "/reports",
        targetSelector: '[data-tour="reports-tabs"]',
        placement: "bottom",
      },
      {
        id: "pres-reports-exports",
        title: "Binary Excel (.xlsx) Downloads",
        subtitle: "Live Streamed Spreadsheets",
        description:
          "Download comprehensive Excel spreadsheets for transactions and commissions with custom number formatting, headers, and zero proxy corruption.",
        route: "/reports",
        targetSelector: '[data-tour="reports-export-xlsx"]',
        placement: "left",
      },
    ],
  },
  {
    id: "sec-admin",
    title: "System Administration & Role Governance",
    subtitle: "Section 11 of 11 • RBAC Security & Default Roles",
    description:
      "Examine system employee accounts, canonical 16-role V2 RBAC, default corridor specialist assignments, and cloud storage diagnostics.",
    icon: Briefcase,
    route: "/employees",
    requiredRole: "manageUsers",
    steps: [
      {
        id: "pres-employees-roster",
        title: "Employee Roster & Role Mapping",
        subtitle: "Canonical 16-Role V2 RBAC",
        description:
          "Manage internal staff accounts, user activation status, and role assignments. Administrative permissions are consolidated strictly to 'Admin' with zero external Frappe Desk dependency.",
        route: "/employees",
        targetSelector: '[data-tour="employees-roster-table"]',
        placement: "top",
      },
      {
        id: "pres-employees-corridor",
        title: "Default Corridor Role Assignments",
        subtitle: "Automated Specialist Routing",
        description:
          "Configure default specialists for Saudi LMIS, Te'shir, Embassy and Kuwait LMIS, Telesign, Embassy. When candidates advance to Processing, corridor clearance steps auto-assign instantly.",
        route: "/employees",
        targetSelector: '[data-tour="employees-default-roles-tab"]',
        placement: "bottom",
      },
    ],
  },
];
