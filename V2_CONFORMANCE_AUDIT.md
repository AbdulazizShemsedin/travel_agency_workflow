> [!WARNING]
> **HISTORICAL AUDIT — SUPERSEDED BY FINAL_V2_CONFORMANCE_MATRIX.MD**  
> This early audit targeted branch `backend-v2-integration`.  
> Refer to [AGENTS.md](AGENTS.md), [FINAL_V2_CONFORMANCE_MATRIX.md](FINAL_V2_CONFORMANCE_MATRIX.md), and [MASTER_SYSTEM_STATUS.md](MASTER_SYSTEM_STATUS.md) for current authoritative instructions.

# V2 FRONTEND CONFORMANCE AUDIT

**Target Environment**: `backend-v2-integration`  

**Backend API Authority**: `https://agencytracking-production.up.railway.app`  
**Contract Baseline**: `BUSINESS_AND_SYSTEM_DOCUMENTATION.md`, `01-applicant-contract.md` - `07-file-upload-contracts.md`, `new swagger.json`  
**Audit Timestamp**: 2026-08-31T11:20:00Z  

---

## 1. Executive Summary

This document presents a comprehensive, line-by-line audit of all API calls, business state models, corridor clearance operations, role permissions, and UI components across the Travel Agency Frontend.

Every frontend operation was audited against the **85 authoritative V2 backend endpoints** exposed under `/api/method/agency_tracking.*` (plus `/api/method/login`, `/api/method/logout`, `/api/method/upload_file`). All obsolete V1 RPCs (`/api/method/applicant_processing.*`) and direct `/api/resource/*` DocType queries have been inventoried, classified, and repaired.

---

## 2. API Request Classification Matrix

**Classification Codes**:
- **A**: V2 Correct (Sanctioned V2 endpoint, correct payload & response handling)
- **B**: V2 endpoint but modified/wrong request shape (Repaired)
- **C**: V2 endpoint but wrong response handling (Repaired)
- **D**: Obsolete V1 endpoint (Migrated to V2 or routed via central demo adapter)
- **E**: Raw `/api/resource/*` DocType access (Replaced with V2 whitelisted method)
- **F**: Undocumented/Unknown endpoint (Removed)
- **G**: Demo-Only Centralized Adapter (`isDemoMode()` guarded)

| Frontend Operation / Caller | Endpoint / Request | Classification | V2 Target Method & Contract Status | Conformance Status |
| :--- | :--- | :---: | :--- | :---: |
| **Auth** — CSRF Token | `agency_tracking.auth_api.get_csrf_token` | **A** | Whitelisted GET method | **CONFORMANT** |
| **Auth** — Current User Profile | `agency_tracking.auth_api.get_current_user` | **A** | Whitelisted GET method | **CONFORMANT** |
| **Applicant** — List | `agency_tracking.applicant_api.list_applicants` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Applicant** — Get Detail | `agency_tracking.applicant_api.get_applicant` | **A** | Whitelisted POST method (`applicant_name`) | **CONFORMANT** |
| **Applicant** — Create Intake | `agency_tracking.applicant_api.create_applicant` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Applicant** — Register (Draft ➔ Registered) | `agency_tracking.applicant_api.register_applicant` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Applicant** — Cancel | `agency_tracking.applicant_api.cancel_applicant` | **A** | Whitelisted POST method (`reason`) | **CONFORMANT** |
| **Applicant** — Update LMIS data | `agency_tracking.applicant_api.update_applicant_for_lmis` | **A** | Whitelisted POST method | **CONFORMANT** |
| **CV Generation** — Compile CV | `agency_tracking.cv_api.generate_cv` | **A** | Whitelisted POST method (`applicant_name`) | **CONFORMANT** |
| **Placement** — List Placements | `agency_tracking.placement_api.list_placements` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Placement** — Advance to Processing | `agency_tracking.placement_api.advance_placement` | **A** | Requires `medical_selected_status: "FIT"` | **CONFORMANT** |
| **Placement** — Upload Contract | `agency_tracking.placement_api.upload_contract` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Placement** — Upload Visa | `agency_tracking.placement_api.upload_visa` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Placement** — Ticketing | `agency_tracking.placement_api.record_ticket_details` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Placement** — Predeparture Medical | `agency_tracking.placement_api.record_predeparture_medical_result` | **A** | Whitelisted POST method (`result`) | **CONFORMANT** |
| **Clearance** — Corridor Steps Definition | `agency_tracking.corridor_engine.get_corridor_steps` | **A** | Dynamic per corridor (`destination_country`) | **CONFORMANT** |
| **Clearance** — List Queue Steps | `agency_tracking.clearance_api.list_my_clearance_steps` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Clearance** — Start Step | `agency_tracking.clearance_api.start_clearance_step` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Clearance** — Complete Step | `agency_tracking.clearance_api.complete_clearance_step` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Clearance** — Reassign Officer | `agency_tracking.clearance_api.reassign_clearance_step` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Clearance** — Stamp Embassy Visa | `agency_tracking.clearance_api.stamp_embassy_step` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Clearance** — Reject Embassy Step | `agency_tracking.clearance_api.reject_embassy_step` | **A** | Whitelisted POST method (`reason`) | **CONFORMANT** |
| **Contractors** — List Foreign Agencies | `agency_tracking.contractor_api.list_contractors` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Contractors** — Create Foreign Agency | `agency_tracking.contractor_api.create_contractor` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Portal** — List Available Candidates | `agency_tracking.portal_api.list_portal_candidates` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Portal** — Select Candidate | `agency_tracking.portal_api.select_candidate` | **A** | Atomic row-lock placement generator | **CONFORMANT** |
| **Finance** — Log Stage Expense | `agency_tracking.finance_api.log_stage_expense` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — Log Stage Income | `agency_tracking.finance_api.log_stage_income` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — Approve Transaction | `agency_tracking.finance_api.approve_transaction` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — Reject Transaction | `agency_tracking.finance_api.reject_transaction` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — Void Transaction | `agency_tracking.finance_api.void_transaction` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — Owed Commissions | `agency_tracking.finance_api.get_owed_commissions` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — Create Commission Batch | `agency_tracking.finance_api.create_commission_batch` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — Settle Batch | `agency_tracking.finance_api.settle_batch` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Finance** — FX Rates | `agency_tracking.finance_api.get_fx_rate` / `set_fx_rate` | **A** | Whitelisted POST methods | **CONFORMANT** |
| **Complaints** — Create Complaint | `agency_tracking.complaint_api.create_complaint` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Complaints** — List Complaints | `agency_tracking.complaint_api.list_unresolved_complaints` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Complaints** — Resolve Complaint | `agency_tracking.complaint_api.resolve_complaint` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Chat** — List Threads | `agency_tracking.chat_api.list_threads` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Chat** — Send Message | `agency_tracking.chat_api.send_message` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Chat** — Placement Officers | `agency_tracking.chat_engine.get_placement_officers` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Reports** — Daily Work Report | `agency_tracking.report_api.get_daily_work_report` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Reports** — Staff Performance | `agency_tracking.report_api.get_staff_performance_report` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Reports** — Operations Summary | `agency_tracking.report_api.get_operations_summary` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Reports** — Financial Overview | `agency_tracking.report_api.get_financial_overview` | **A** | Whitelisted POST method | **CONFORMANT** |
| **Reports** — Commission XLSX Export | `agency_tracking.report_api.export_commissions_xlsx` | **A** | Whitelisted GET export stream | **CONFORMANT** |
| **Document OCR** — Passport OCR | `agency_tracking.passport_parser.parse_passport_file` | **A** | Whitelisted POST method (`file_url`) | **CONFORMANT** |
| **Document OCR** — Contract Parser | `agency_tracking.contract_parser.parse_contract_file` | **A** | Whitelisted POST method (`file_url`) | **CONFORMANT** |
| **Document OCR** — Visa Parser | `agency_tracking.contract_parser.parse_visa_file` | **A** | Whitelisted POST method (`file_url`) | **CONFORMANT** |
| **Document OCR** — Injaz Parser | `agency_tracking.contract_parser.parse_injaz_file` | **A** | Whitelisted POST method (`file_url`) | **CONFORMANT** |
| **User Provisioning** — Create User | `applicant_processing.api.create_system_user` (V1) | **D / G** | Not in V2 whitelisted contract. Guarded: DemoStore in demo mode; descriptive `BACKEND BLOCKED` error in real mode. | **REPAIRED** |
| **Staff Assignment** — Selected Stage | Legacy `AssignEmployeeModal` (V1 streams) | **D ➔ A** | Rebuilt as `ClearanceStepAssignmentModal` calling `getCorridorStepsV2` & `reassignClearanceStepV2`. | **REPAIRED** |

---

## 3. Audited V1 Inconsistencies & Resolution

### Inconsistency 1: User Creation Error (HTTP 400 "Invalid Request")
- **Cause**: Frontend invoked legacy endpoint `POST /api/method/applicant_processing.applicant_processing.api.create_system_user`.
- **V2 Truth**: The V2 backend contract (`new swagger.json`) defines no whitelisted user creation endpoint. In Frappe architecture, users are managed in Frappe Core / Desk.
- **Resolution**:
  1. In **Demo Mode** (`NEXT_PUBLIC_DEMO_MODE=true`), centralized in `demoStore.createUser` and `demoStore.getUsers()`.
  2. In **Real Mode** (`NEXT_PUBLIC_DEMO_MODE=false`), strictly throws a documented `BACKEND BLOCKED` error explaining that internal user management is handled via Frappe Desk / System Manager core authentication.

### Inconsistency 2: Selected-Stage Staff Assignment UI
- **Cause**: `AssignEmployeeModal.tsx` displayed legacy V1 streams (*LMS Employee, Injaz Employee, Wakala Employee*).
- **V2 Truth**: V2 staffing is organized around **Clearance Steps** linked to **Placements** within a destination **Corridor**.
- **Resolution**: Rebuilt `AssignEmployeeModal.tsx` to dynamically query `getCorridorStepsV2(targetCountry)` and execute reassignments via `reassignClearanceStepV2(stepName, officerEmail)`.

### Inconsistency 3: Obsolete V1 Processing Streams Modal
- **Cause**: `ProcessingStreamsModal.tsx` attempted to edit legacy clearance DocTypes (*LMS Clearance, Injaz Clearance, Wakala Clearance, DSR Stamp, DSR Ticket, DSR Departure*).
- **V2 Truth**: Corridor clearance progression is driven by `CorridorClearanceManager` and `PlacementActionDrawer` using V2 clearance step lifecycle APIs.
- **Resolution**: Removed all invocations of `ProcessingStreamsModal` from `src/app/applicants/[id]/page.tsx`.

### Inconsistency 4: Commission Report Export URL
- **Cause**: Export links in `/reports`, `/commission`, and `/agent/commission` called `applicant_processing.applicant_processing.utils.commission_export.export_unpaid_commission_report`.
- **V2 Truth**: V2 backend provides `/api/method/agency_tracking.report_api.export_commissions_xlsx`.
- **Resolution**: Replaced all 5 instances with the canonical V2 endpoint.
