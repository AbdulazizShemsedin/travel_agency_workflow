# V2 FRONTEND MIGRATION IMPLEMENTATION MAP
## Comprehensive Frontend Audit & Migration Architecture

**Target Backend**: `https://agencytracking-production.up.railway.app`  
**Authoritative Documents**: `src/Assets/new swagger.json`, `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md`, `V2_CONTRACT_RECONCILIATION.md`  
**Branch**: `backend-v2-integration`

---

## 1. EXECUTIVE CLASSIFICATION SUMMARY

| Classification Category | Scope & Identified Artifacts |
|---|---|
| **A. Reusable UI (Preserved 100%)** | `OperationalTable.tsx`, `OperationalDrawer.tsx`, `AppSidebar.tsx`, `AppNavbar.tsx`, `CandidateCard.tsx`, `CandidateFilters.tsx`, `CandidateDetailModal.tsx`, `PushNotificationToggle.tsx`, UI components (`button`, `card`, `dialog`, `badge`, `input`, `select`, `table`, `popover`), design system tokens, typography, dark/light theme styling. |
| **B. V1 API Integration (To Retire & Replace)** | `src/lib/api/applicantApi.ts` (130KB monolith with raw `/api/resource/*` queries, legacy DocType schemas), old fallback fake data, legacy endpoints. |
| **C. V1 Business Logic (To Replace with V2 State Machine)** | Client-side status progression mutations, client-side Dossier/DSR joins, client-side commission calculation formulas, Musaned hard gate on CV generation, local storage notification dismissal. |
| **D. V1 Workflow Assumptions (To Replace with V2 Pipeline)** | `Applicant → Dossier → DSR → 6 Clearance DocTypes` flow replaced with `Applicant (Draft/Registered/CV Generated) → Placement (Selected → Processing → Stamped → Ticketed → Departed) → Clearance Steps (Corridor-driven)`. |
| **E. V1 Role Assumptions (To Replace with 16 V2 Roles)** | `Recruiter`, `LMS Employee`, `Injaz Officer`, `Wakala Officer`, `Embassy Officer`, `Accounts Officer`, `Ticket Officer` replaced by canonical 16 roles: `Registrar`, `Manager`, `Admin`, `Clearance Officer`, `Ticketer`, `Complaint Manager`, `Finance Manager`, `Foreign Agency`, `Communication Manager`, `Contract Parser`, `Saudi LMIS`, `Saudi Taeshir`, `Saudi Embassy`, `Kuwait LMIS`, `Kuwait Telesign`, `Kuwait Embassy`. |
| **F. V1 Data Models (To Replace with V2 DocTypes)** | `Applicant Dossier`, `DSR`, `LMS Clearance`, `Injaz Clearance`, `Wakala Clearance`, `Embassy Clearance`, `Telesign Clearance`, `DSR Stamp`, `DSR Ticket`, `DSR Departure` replaced by `Applicant`, `Placement`, `Clearance Step`, `Applicant Transaction`, `Commission Batch Request`, `Agency Complaint`, `Chat Thread`, `Chat Message`, `Contractor`. |
| **G. Already-Created V2 Code (To Enhance & Complete)** | `src/lib/api/v2/client.ts`, `applicants.ts`, `placements.ts`, `clearance.ts`, `finance.ts`, `portal.ts`, `corridor.ts`, `cv.ts`, `documents.ts`, `complaints.ts`, `communication.ts`, `notifications.ts`. |

---

## 2. DETAILED MODULE-BY-MODULE AUDIT & MIGRATION MATRIX

### Module 1: Auth & RBAC Permissions
* **Current Implementation**: `src/lib/auth/permissions.ts`, `src/components/providers/AuthProvider.tsx`, `src/lib/api/auth.ts`. Maps permissions to old roles (`Recruiter`, `LMS Employee`, `Injaz Officer`, `Wakala Officer`, `Embassy Officer`, `Accounts Officer`).
* **V2 Replacement**: Update `permissions.ts` and `AuthProvider.tsx` to consume the 16 canonical V2 roles returned by `agency_tracking.auth_api.get_current_user`.
* **Reusable UI**: Auth context provider, session state listeners, role badge rendering.
* **Needs API Migration**: `get_current_user`, `get_csrf_token`, `login`, `logout` through `src/lib/api/v2/auth.ts`.
* **Classification**: Needs API migration & RBAC configuration.

---

### Module 2: Applicant Intake & Lifecycle (`/applicants/new`, `/applicants/[id]/edit`)
* **Current Implementation**: `src/components/applicant/ApplicantRegistrationForm.tsx` & sub-steps (`Step1PersonalInfo`, `Step2EducationExperience`, `Step3IdentificationContact`, `Step4CocMedical`). Validates with old schemas and uses `applicantApi.ts` draft/register endpoints.
* **V2 Replacement**: Wire directly to `agency_tracking.applicant_api.create_applicant`, `get_applicant`, `update_applicant`, `register_applicant`, `update_applicant_for_lmis`, `set_country_ban`, `list_country_bans`, `remove_country_ban`, `log_applicant_fee`. Field names mapped to backend: `target_job`, `photograph`, `salary_amount`, `salary_currency`, `entry_track` ("Standard" | "Muayena").
* **Reusable UI**: 4-step wizard form layout, field inputs, MRZ passport auto-fill trigger, responsive grid, validation styling.
* **Needs Redesign**: Update field name bindings (`job_applied` → `target_job`, `photo_passport` → `photograph`, `monthly_salary` → `salary_amount`), respect entry track rules (Standard vs Muayena floor).
* **Needs API Migration**: Full integration with `src/lib/api/v2/applicants.ts`.

---

### Module 3: Applicant Directory & Profile (`/applicants`, `/applicants/[id]`)
* **Current Implementation**: `src/components/applicant/ApplicantTable.tsx`, `src/app/applicants/[id]/page.tsx`. Reads applicants list via V1 `getApplicantsList`. Detail page has tabs for old Dossier, DSR, and old clearance forms.
* **V2 Replacement**:
  - `/applicants` Directory tab: Feeds from `agency_tracking.applicant_api.list_applicants(filters, limit_page_length, order_by)`.
  - `/applicants/[id]`: Renders V2 Applicant profile (`Draft`, `Registered`, `CV Generated`, `Cancelled`), active `Placement` summary, linked country ban history (`list_country_bans`), and action buttons (`register_applicant`, `cv_api.generate_cv`, `cancel_applicant`, `restart_applicant`, `log_applicant_fee`).
* **Reusable UI**: Profile hero card, tab navigation, badge styling, status timeline, action modals.
* **Needs Redesign**: Remove V1 Dossier/DSR tabs from applicant view; replace with V2 Placement and Clearance Steps cards.
* **Needs API Migration**: Full migration to `src/lib/api/v2/applicants.ts` and `src/lib/api/v2/cv.ts`.

---

### Module 4: CV Generation (`/applicants/[id]/cv`)
* **Current Implementation**: `src/app/applicants/[id]/cv/page.tsx` with client-side CV template preview and old Musaned gate check.
* **V2 Replacement**: `agency_tracking.cv_api.generate_cv`. Respect backend rule: Musaned is tracked data but NOT a gate. Renders backend-generated official CV PDF.
* **Reusable UI**: PDF viewer embed, download button, back navigation.
* **Needs API Migration**: Integrate `generateCvV2` from `src/lib/api/v2/cv.ts`.

---

### Module 5: Corridor Engine & Dynamic Operational Workspaces (`/applicants`)
* **Current Implementation**: `src/components/operational/RoleWorkspaceContainer.tsx` with 5 hardcoded V1 tabs (`lms`, `injaz`, `wakala`, `embassy`, `departure`) and subcomponents (`LMISWorkspace.tsx`, `InjazWorkspace.tsx`, `WakalaWorkspace.tsx`, `EmbassyWorkspace.tsx`, `DepartureWorkspace.tsx`).
* **V2 Replacement**: Generic data-driven operational workspace:
  - Fetches corridor step definitions dynamically from `agency_tracking.corridor_engine.get_corridor_steps` (Saudi: `LMIS Clearance`, `Taeshir`, `Embassy`; Kuwait: `Kuwait LMIS`, `Telesign`, `Kuwait Embassy`).
  - Feeds `OperationalTable` with `agency_tracking.clearance_api.list_my_clearance_steps`.
  - Renders dynamic columns based on step type.
  - Contextual `OperationalDrawer` triggers sanctioned transitions: `start_clearance_step`, `complete_clearance_step`, `submit_embassy_step`, `stamp_embassy_step`, `reject_embassy_step`, `reassign_clearance_step`, `notification_api.trigger_wakala_reminder`.
* **Reusable UI**: `OperationalTable.tsx` (dense Excel-like table, sorting, filters, search, pagination), `OperationalDrawer.tsx` (slide-over panel, candidate initials, status badge).
* **Needs Redesign**: Replace 5 static workspace tabs with dynamic corridor tabs/filters generated from backend step definitions.
* **Needs API Migration**: Full integration with `src/lib/api/v2/corridor.ts` and `src/lib/api/v2/clearance.ts`.

---

### Module 6: Foreign Agency Portal (`/agent`, `/agent/reserved`, `/agent/commission`, `/agent/complaints`)
* **Current Implementation**: `src/app/agent/page.tsx` (Marketplace), `src/app/agent/reserved/page.tsx` (Allocations), `src/components/agent/AgentLayout.tsx`, `CandidateCard.tsx`.
* **V2 Replacement**:
  - Candidate Catalog: `agency_tracking.portal_api.list_portal_candidates`.
  - Selection: `agency_tracking.portal_api.select_candidate(applicant_name, free_replacement_for_complaint)` (atomic, row-locked Placement creation).
  - Reserved Placements: `agency_tracking.placement_api.list_placements` (scoped to agency), `upload_contract`, `upload_visa`.
  - Wakala Requests: `agency_tracking.portal_api.list_my_wakala_requests`.
  - Agency Complaints: `agency_tracking.complaint_api.create_complaint`.
  - Agency Chat: `agency_tracking.chat_api.create_agency_thread`, `get_thread_messages`, `send_message`.
* **Reusable UI**: `AgentLayout.tsx`, `CandidateCard.tsx`, `CandidateFilters.tsx`, `CandidateDetailModal.tsx`.
* **Needs API Migration**: Full integration with `src/lib/api/v2/portal.ts`, `placements.ts`, `complaints.ts`, `communication.ts`.

---

### Module 7: Placement, Ticketing & Departure
* **Current Implementation**: Old V1 `DSR Ticket` and `DSR Departure` tabs in `DepartureWorkspace.tsx` and detail modal.
* **V2 Replacement**: `agency_tracking.placement_api.*`:
  - Selected Stage Gate: `record_selected_medical_result` (FIT/UNFIT).
  - Advance: `advance_placement(placement_name, new_status, override_reason)`.
  - Ticketing: `record_ticket_details(placement_name, ticket_number, flight_date, ticket_cost, currency)`.
  - Reschedule: `record_reschedule(placement_name, reschedule_date, reschedule_cause, reschedule_cost, currency)`.
  - Medical 2 Gate: `record_predeparture_medical_result` (FIT/UNFIT).
  - Muayena Placement: `create_muayena_placement(applicant_name, contractor_name, file_url)`.
* **Reusable UI**: Ticket entry drawer form, flight status badges, reschedule modal.
* **Needs API Migration**: Full integration with `src/lib/api/v2/placements.ts`.

---

### Module 8: Finance & Commission Management (`/expenses-income`, `/commission`)
* **Current Implementation**: `src/app/expenses-income/page.tsx`, `src/app/commission/page.tsx`. Used raw `/api/resource/` or missing endpoints and calculated totals client-side.
* **V2 Replacement**:
  - Transaction Ledger: `agency_tracking.finance_api.log_stage_expense`, `log_stage_income`.
  - Approvals: `report_api.get_pending_approval_queue`, `finance_api.approve_transaction`, `reject_transaction`, `void_transaction`.
  - FX Rates: `finance_api.get_fx_rate`, `set_fx_rate`.
  - Commission Management: `finance_api.get_owed_commissions`, `create_commission_batch`, `settle_batch`, `settle_batch_items`, `upload_batch_payment_proof`, `get_batch_invoice_pdf`, `trigger_early_commission_accrual`, `report_api.export_commissions_xlsx`.
  - Bank Reconciliation: `reconciliation_api.upload_bank_statement`, `manually_match_line`.
  - Financial Overview: `report_api.get_financial_overview`, `get_cost_breakdown_report`, `get_employee_financial_report`.
* **Reusable UI**: Financial summary KPI cards, transaction table, batch creation modal, settlement drawer, file upload dropzone.
* **Needs Redesign**: Replace client-side math with authoritative backend totals; wire approval buttons to V2 transition endpoints.
* **Needs API Migration**: Full integration with `src/lib/api/v2/finance.ts` and reports.

---

### Module 9: Complaints Desk (`/complaints`)
* **Current Implementation**: `src/app/complaints/page.tsx`.
* **V2 Replacement**:
  - `agency_tracking.complaint_api.create_complaint(placement, description, worker_status_at_complaint)`.
  - `agency_tracking.complaint_api.list_unresolved_complaints()`.
  - `agency_tracking.complaint_api.acknowledge_complaint(complaint_name)`.
  - `agency_tracking.complaint_api.resolve_complaint(complaint_name, new_status, resolution_notes, override_reason)`.
  - Aging & resolution report: `report_api.get_complaint_aging_report()`.
* **Reusable UI**: Unresolved/Resolved tabs, complaint cards, resolution modal, severity badges.
* **Needs API Migration**: Full integration with `src/lib/api/v2/complaints.ts`.

---

### Module 10: Reports & Dashboard Analytics (`/reports`, `/dashboard`)
* **Current Implementation**: `src/app/reports/page.tsx` (2874 lines of client-side aggregations), `src/app/dashboard/page.tsx`.
* **V2 Replacement**: Rebuild using authoritative V2 reporting RPCs:
  - Daily Work Report: `report_api.get_daily_work_report(from_date, to_date)`.
  - Staff Performance Report: `report_api.get_staff_performance_report(from_date, to_date)`.
  - Operations Summary: `report_api.get_operations_summary(from_date, to_date)` (applicant funnel, placement funnel, conversion rates, turnaround days, pending overdue).
  - Placement Aging Report: `report_api.get_placement_aging_report()`.
  - Financial Overview: `report_api.get_financial_overview(from_date, to_date)` (Admin only).
  - Cost Breakdown: `report_api.get_cost_breakdown_report(from_date, to_date)`.
  - Employee Financial: `report_api.get_employee_financial_report(from_date, to_date)`.
  - Complaint Aging: `report_api.get_complaint_aging_report()`.
* **Reusable UI**: Chart containers (Recharts BarChart, PieChart), KPI stat cards, date range picker presets, PDF/CSV export triggers.
* **Needs Redesign**: Strip out client-side mathematical derivations and consume backend-calculated totals verbatim.
* **Needs API Migration**: Full integration with `src/lib/api/v2/reports.ts` and `src/lib/api/v2/finance.ts`.

---

### Module 11: Contractors & Employees Management (`/contractors`, `/employees`)
* **Current Implementation**: `src/app/contractors/page.tsx`, `src/app/employees/page.tsx`.
* **V2 Replacement**:
  - Contractors: `agency_tracking.contractor_api.list_contractors`, `create_contractor`.
  - Employees / User Administration: Clearly mark BACKEND CONTRACT GAP for general user admin (Swagger v1.0.0 provides role-based authentication and contractor creation, but no generic internal staff CRUD RPC).
* **Reusable UI**: Contractor table, creation modal, employee directory layout.
* **Needs API Migration**: Integrate `contractor_api` in `src/lib/api/v2/contractors.ts`.

---

### Module 12: Notifications & Communication (`/notifications`, Chat drawer)
* **Current Implementation**: `src/app/notifications/page.tsx` (used localStorage for dismissals), chat components.
* **V2 Replacement**:
  - Push Subscription: `agency_tracking.notification_api.get_push_subscription_status`, `subscribe_to_push`.
  - Wakala Reminder: `agency_tracking.notification_api.trigger_wakala_reminder`.
  - Chat Threads: `agency_tracking.chat_api.create_agency_thread`, `create_internal_thread`, `list_threads`, `get_thread_messages`, `send_message`, `mark_read`, `add_participant`.
  - Placement Officers: `agency_tracking.chat_engine.get_placement_officers`.
* **Reusable UI**: Push toggle button, notification list cards, chat floating widget / drawer, message bubbles.
* **Needs API Migration**: Full integration with `src/lib/api/v2/notifications.ts` and `src/lib/api/v2/communication.ts`.

---

## 3. SUMMARY OF BACKEND CONTRACT GAPS

1. **General Internal Staff CRUD**: No whitelisted `user_api.create_user` or `user_api.list_users` endpoint in Swagger v1.0.0 (internal staff must be created via Frappe User Desk or seeded). `contractor_api.create_contractor` handles foreign agency portal users.
2. **Injaz Paper Print Format**: Backend template not yet supplied; generation deferred on backend.
