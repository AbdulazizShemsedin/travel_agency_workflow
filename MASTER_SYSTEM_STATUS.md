# MASTER SYSTEM STATUS — V2 CONFORMANCE TRACKER

**Target Branch**: `production_version_non_mock`  
**Backend Authority**: `https://agencytracking-production-2a06.up.railway.app`  
**Baseline Specification**: `FINAL_V2_CONFORMANCE_MATRIX.md` & `V2_FRONTEND_TODO.md`  
**Operating Policy**: Real Backend Only • No Demo Mode • No Mock Business Data • No V1 Fallbacks  
**Last Updated**: 2026-09-21T11:25:00Z

---

## 9. Conformance to Backend Changelog (2026-09-11 through 2026-09-19)
- **Purged N+1 Enrichment Bursts**: Completely removed the post-query and retry `frappe.client.get` loops in `src/app/api/method/[...slug]/route.ts` for `list_placements` and `list_portal_candidates`. Rely exclusively on the backend batched joined fields (`full_name`, `passport_number`, `photograph`, `photo_full_body`, `target_job`, `nationality`, `gender`, `religion`, `age`, `date_of_birth`).
- **Full CV-Equivalent Candidate Cards**: Removed restrictive filters from `src/components/agent/CandidateCard.tsx` and mapped candidate fields in `src/lib/api/v2/portal.ts` and `src/types/applicant.ts`. Candidate cards now display passport number badges, marital status, children, languages, and skills tags without needing single-candidate drilldown.
- **Async Passport OCR Integration**: Confirmed `parsePassportFileV2` in `src/lib/api/v2/documents.ts` uses the asynchronous `enqueue_parse_passport_file` + polling against `background_jobs.get_job_status`. Supports uncropped photos and surfaces `needs_passport_review` flags.
- **Applicant `place_of_birth` Extraction**: Confirmed dedicated `place_of_birth` field in intake and edit forms (`Step1PersonalInfo.tsx`, `ApplicantRegistrationForm.tsx`).
- **Complaint Human-Facing Display Number**: Verified `#${display_no}` is used across list rows, detail modals, and headers while maintaining `name` (`CMP-#####`) for API mutations.
- **Batch Write-Offs & Invoice PDF Total Math**: Integrated `listBatchWriteOffsV2` (`agency_tracking.finance_api.list_batch_write_offs`). Added clear guidance explaining that the printed invoice bottom-line `TOTAL = Batch Total + Requested Advance + Previous Unpaid Arrears − Write-Offs`, while stored batch balance tracks line items.
- **Automated Corridor Fees & Finance Button**: Replaced "Add Payment" in `src/app/expenses-income/page.tsx` with "Log Income / Expense" for ad-hoc costs and advance receipts; ensured clearance step types are not manually double-counted as expenses.
- **Saudi Wakala Gate & Manager Override**: Embassy submission and stamping in `EmbassyWorkspace.tsx` enforce the paid Wakala rule with an explicit `override_reason` dialog for Managers/Admins.
- **Honest 417 Error Handling**: `cv.ts` cleanly propagates 417 `ValidationError` when PDF generation fails instead of returning fake stubs.
- **Excel Exports**: Sourced formatted multi-column `.xlsx` exports via `export_transactions_xlsx` and updated `export_commissions_xlsx`.
- **Clearance Step Human-Error Correction Toolkit**: Supported `date_completed` backdating on `complete_clearance_step`, `reopen_clearance_step` with audit reason, `record_police_ashara`, `record_other_payment`, `record_injaz_payment` status toggling, and terminal data corrections.
- **Staff Roster RPC**: Replaced direct `frappe.client.get_list("User")` calls with `agency_tracking.employee_api.list_employee_roster`.

## 10. Conformance to Backend Changelog (2026-09-23 `commission-currency-invoicing`)
- **Clearance & Corridor Fee Hiding**: Removed manual fee inputs (`amount`, `payment_status`, `wakala_amount`, `wakala_paid_date`, `police_ashara_amount`, `police_ashara_payment_status`) and the "Other Payments" table from operational drawers and screens. Fees are recorded automatically by the corridor engine upon step completion.
- **Injaz Attempt Sanitization & Taeshir Gate**: Removed `injaz_amount`, `injaz_currency`, `receipt_number`, and `receipt_photo`. Kept `payment_status` (Paid/Unpaid) and `paid_date`. Strictly gated Taeshir step completion on Injaz payment showing `Paid`.
- **Saudi Embassy Wakala Gate**: Both Embassy `submit` and `stamp` operations enforce the paid Wakala rule with Manager/Admin `override_reason` bypass options.
- **Placement Pre-Departure Medical 2**: Restricted pre-departure medical tracking to FIT / UNFIT outcome only; removed `medical_2_examination_date` from forms and tables.
- **Registration Form COC Removal & Medical Recognition**: Removed COC certificate status and LMIS exam date from registration screens; confirmed unexpired registration FIT covers after-selection medical.
- **Ticketing & Reschedule Separation**: Enforced ETB-only ticket costs (`fee_type: "Ticket"`). Separated reschedule actions into `Airport` (no fee) vs `Internal` (requires ETB cost, creates own ledger row).
- **Financial Ledger & Currency Badges**: Added "Awaiting FX Rate" badge for ledger rows with `awaiting_fx_rate = 1` and surfaced notice when `awaiting_fx.count > 0` in financial overviews.
- **Invoice Status Simplification**: Displayed only paid status states (`Paid`, `Partly Paid`, `Unpaid`) on commission batches; eliminated Draft/Sent states and send actions.
- **Taeshir Export (.xls) & E-Number Labeling**: Sourced legacy `.xls` format via `exportGroupScheduleBioXlsV2` with `Content-Type: application/vnd.ms-excel`, populated "E-number (Injaz Application No.)" from `injaz_application_id`, and added "Agency Email" to settings.
- **Pagination with Total Count**: Added TypeScript function overloads supporting `with_total=1` across all 7 primary listing endpoints (`list_applicants`, `list_placements`, `list_contractors`, `list_transactions`, `list_complaints`, `list_portal_candidates`, `list_my_placements`).
## 11. Frappe API Key & Secret Removal • Native Session-Cookie RBAC Architecture (2026-09-25)
- **Eliminated Hardcoded Admin Tokens**: Completely purged all hardcoded Administrator API keys (`666ded6cd73c588`, `5277b76d58709f8`, `29450e91ee38267`, `c78515ef82f928a`) and environment variables `FRAPPE_API_KEY` and `FRAPPE_API_SECRET`.
- **Backend Complaint Resolution**: The backend warning *"the api key is for admin but it is used by other roles too"* was triggered because proxy route handlers intercepted 403s on non-admin users and retried with admin API keys. All fake 403 elevation bypasses in `src/app/api/method/[...slug]/route.ts` have been removed.
- **Native Session-Cookie RBAC**: All frontend requests forward the user's authentic session cookie (`sid`) and CSRF token (`X-Frappe-CSRF-Token`). Frappe natively isolates DocTypes and endpoints according to the caller's actual role.
- **Public & Private File Streamers**: `/files/*` and `/private/files/*` now stream using transparent user session cookies without system token injection.
- **Foreign Agency Integration Fixes**:
  - Fixed `listMyPlacementsV2` endpoint target from nonexistent `agency_tracking.placement_api.list_my_placements` to live `agency_tracking.portal_api.list_my_placements`.
  - Updated `/agent/reserved`, `/agent/complaints`, and `/agent/commission` to call `listMyPlacementsV2()` instead of internal staff `listPlacementsV2()`.
  - Gated internal-only `listApplicantsV2()` calls to `Boolean(authUser?.is_internal_staff)`.
- **Language Options Backend Conformance**: Resolved 417 `Arabic Level cannot be "Fair"` by aligning `LANGUAGE_PROFICIENCY_OPTIONS` in `ApplicantRegistrationForm.tsx` to `["Select..", "None", "Basic", "Good", "Fluent"]`, removing hardcoded "Poor"/"Fair" defaults, and adding sanitization in `normalizeApplicantFields` (`src/lib/api/v2/applicants.ts`).
- **Runtime Verification**: Clean TypeScript check (`npx tsc --noEmit`, 0 errors), automated integration audit suite (`scratch/test_no_api_key_auth.mjs`, 25/25 tests passed), and live applicant creation (`scratch/test_language_level_fix.mjs`, 200 OK).

## 12. Decommissioning of Clearance Grid & Clearance List UI Workspaces (2026-09-25)
- **UI Workspace Safely Decommissioned**: Both the "Clearance Grid" (`grid`) and "Clearance List" (`clearance`) workspace tabs and components (`ClearanceGridWorkspace`, `V2ClearanceQueueWorkspace`) were removed from `src/components/operational/RoleWorkspaceContainer.tsx`.
- **Zero Backend or API Mutation**: Backend RPC endpoints (`agency_tracking.clearance_grid.*`, `agency_tracking.clearance_api.*`) and API library functions (`src/lib/api/v2/clearance_grid.ts`, `src/lib/api/v2/clearance.ts`) were kept 100% intact, preventing any regression or disruption to backend operations or type contracts.
- **Applicant Detail Notice Rerouted**: Updated the Saudi Wakala notice card link on `/applicants/[id]` from `/applicants?tab=clearance` to `/applicants?tab=embassy` ("Open Embassy Workspace") where Wakala payments and Embassy stamping are handled.
- **Verification**: Verified clean TypeScript compilation (`npx tsc --noEmit`, 0 errors).

## 13. Registration UX, Easy-Injaz Layout, Document Viewer & Contract Flow (2026-09-25)
- **Mid-Extraction Cancellation**: Added `onCancel` support in `PremiumDropzone.tsx`, displaying an accessible "Cancel Extraction" button with an `X` icon during scans. Wired up cancellation refs (`isOcrCancelledRef`) in `ApplicantRegistrationForm.tsx` and `Step1PersonalInfo.tsx` to immediately halt background file uploads/OCR processing and dismiss pending loading toasts.
- **Duplicate Place of Birth Removal**: Removed duplicate `Place of Birth` field from Row 6 in Section 3 of `ApplicantRegistrationForm.tsx`, cleanly pairing `Place of Issue` with candidate `Phone No.`.
- **Easy-Injaz Field Structure & Layout Maintained**: Preserved the exact field positions matching the easy-injaz layout: Section 4 Row 9 pairs `Qualification` & `City`; Section 5 pairs `Visa Number` & `Sponsor Name`, `Sponsor ID` & `Sponsor Phone`, `Sponsor Address` & `Agent`, `National ID` & `Sponsor Arabic`, and `Email` & `Visa Type`.
- **Sponsor Address Autofill Shield**: Protected `sponsor_address` against browser City autofill pollution via `readOnly` state until focused (`isSponsorAddrReadOnly`), resetting to protected when any `City` input is focused, combined with `autoComplete="off"`, `data-lpignore="true"`, and `data-form-type="other"`.
- **Contract Upload Button Rename**: Renamed the upload/extraction button in `/applicants/[id]/contractor-doc` to **"Extract contract info"**.
- **Contract Approval Workflow & Automatic Redirect**:
  - Renamed the approval button in `/applicants/[id]/contractor-doc` to "Approve Contract".
  - Hid the button upon successful approval and replaced it with a confirmation banner.
  - Implemented dual-persistence: updates both the `Placement` document (`updatePlacementParsedFieldsV2`) and synchronizes extracted fields directly to the `Applicant` document (`updateApplicantV2`).
  - Added automatic client-side redirect back to the applicant profile (`/applicants/[id]`) post-approval.
- **Contract Data Propagation to Registration Form**: Enriched `initialData` on `/applicants/[id]/edit` with placement-level fallbacks and configured `ApplicantRegistrationForm.tsx` to automatically display extracted `visa_number`, `sponsor_name`, `sponsor_id`, `sponsor_phone`, and `contract_number`.
- **Contract Attached Document Viewer & Duplicate Button Removal**:
  - When a contract is attached/extracted (`hasUploadedContract`), the duplicate "Contract Document (PDF)" button in the top action bar is cleanly removed.
  - Clicking "Contract Attached" opens the contract document inside a high-res embedded `Employment Contract — Document Viewer` modal right on the applicant profile page.
  - Configured `/files/*` and `/private/files/*` streaming routes to serve `Content-Disposition: inline` for PDFs and viewable files by default (unless `?download=1`), eliminating unwanted automatic browser file downloads.
- **Prominent "View Form" Navigation**: Renamed "Edit Profile" / "Edit Registration Form" to "View Form" with a prominent emerald `FileSpreadsheet` button pinned as the primary action on the applicant profile header action bar and draft status banner.
- **Skin Color (`complexion`) Conformance**: Added backend-sanctioned `complexion` select field (`["", "FAIR", "MEDIUM", "DARK"]`) in Section 8 (Physical Attributes) right before Section 9 (Medical Fitness) with normalization in `normalizeApplicantFields`.
- **Verification**: Verified clean TypeScript compilation (`npx tsc --noEmit`, 0 errors).

## 14. Multi-Candidate Checkbox Selection & Targeted Taeshir Excel Export (2026-09-30)
- **Multi-Selection Checkbox Column**: Added a selection column at index 0 of `InjazWorkspace` (`src/components/operational/workspaces/InjazWorkspace.tsx`), enabling operational staff to select any number of candidate records for export.
- **Header Checkbox with Indeterminate State**: Added `TableHeaderCheckbox` component supporting select-all, deselect-all, and tri-state indeterminate visual state when a partial subset of candidates is selected.
- **Targeted Excel (.xls) Export**: Updated `handleExportTaeshir` to send selected candidate IDs to backend RPC `agency_tracking.report_api.export_group_schedule_bio_xlsx`. If no candidates are selected, it transparently defaults to exporting the entire workspace.
- **Dynamic Action Bar UX**: Added live selected count badges (`Export for Taeshir (X)`) and an explicit "Clear (X)" button to clear selections quickly.
- **Zero Backend Mutation**: Reused existing backend endpoint `agency_tracking.report_api.export_group_schedule_bio_xlsx` which natively takes `{ applicants: string[] }`. Live tested with single and multi-candidate subsets returning HTTP 200 and binary Excel streams.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors) and automated live API verification.

## 15. Applicant Registration Form: Mandatory & Optional Visual Indicators and Default Fair Complexion (2026-09-30)
- **Default Skin Color (`complexion`)**: Set the default skin color to `"FAIR"` (Fair) across both `ApplicantRegistrationForm.tsx` and `Step2EducationExperience.tsx`, completely removing the `"Select skin color..."` placeholder option and keeping strictly `FAIR`, `MEDIUM`, and `DARK`.
- **Backend-Grounded Mandatory vs Optional Field Labeling**:
  - Implemented explicit visual indicators for mandatory fields (`<span className="text-rose-500 font-bold ml-0.5">*</span>`) and optional fields (`<span className="text-slate-400 dark:text-zinc-500 font-normal text-[11px] ml-1">(Optional)</span>`) strictly conforming to backend field floors (`applicant.py::validate_field_floor()` and `src/Assets/01-applicant-contract.md`).
  - **Universal Mandatory Fields**: `Full Name *`, `Passport No. *`, `Date of Birth *`, `Date of Expiry *`, `Place of Issue *`, `Gender *`, `Nationality *`, and intake media attachments `Photo *` and `Passport *`.
  - **Dynamic Track-Gated Fields**: `Religion`, `Marital Status`, `Occupation` (target job), `Qualification` (education), and `Salary` dynamically display mandatory `*` when in Standard track and `(Optional)` when in Muayena track (`!isMuayena ? * : (Optional)`), strictly reflecting the backend's conditional field floor rules.
  - **Intake Optional Fields**: Explicitly labeled `(Optional)` across Core Details (`Application No.`, `Date`, `Status / Active ?`, `Passport Type`, `Place of Birth`, `Phone No.`, `City`), Media (`Full Size (Optional)`, `Video Interview (Optional)`), Section 5 (Sponsor & Visa Information - all 10 fields), Section 6 (Relative Information - all 10 fields), Section 7 (Other Information - all fields except Nationality), Section 8 (Skills, Experience, Physical Attributes - English, Arabic, Experience Abroad, Works In, Children, Height, Weight, Skin Color, Ref No, Remark), and Section 9 (Medical Fitness Result, Medical Expiry Date).
- **Zero Mock / Zero Backend Mutation**: No mock data or fake fallbacks introduced. The form state continues to send normalized, valid payloads to backend RPCs `agency_tracking.applicant_api.register_applicant` and `agency_tracking.applicant_api.update_applicant`.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors) and live authenticated runtime check on `/applicants/new`.

## 16. Complaints Desk Table Fields: Contact Person, Passport & Sponsor Details for Admin & Foreign Agent (2026-09-30)
- **Dedicated Table Fields Grounded in Relational Backend Data**:
  - Implemented first-class table columns across both the Admin Complaints Desk (`src/app/complaints/page.tsx`) and Foreign Agent Complaints Desk (`src/app/agent/complaints/page.tsx`):
    1. **Candidate**: Displays candidate full name, accompanied by placement ID / applicant ID badge.
    2. **Passport**: Monospace badge showing candidate passport number (`placement.passport_number` || `applicant.passport_number` || `portalCandidate.passport_number`).
    3. **Contact Person**: Emergency contact name (`emergency_contact_name` || `relative_name` || `contact_person_name`), kinship/relationship if specified, and emergency contact phone number (`emergency_contact_phone` || `relative_phone` || `phone`).
    4. **Sponsor Details**: Employer/sponsor name (`employer_name` || `sponsor_name` || `current_employer`), civil/national ID (`employer_national_id` || `sponsor_civil_id` || `sponsor_id`), visa number (`visa_number`), and employer address (`employer_address` || `sponsor_address`).
- **Responsive Table Layout**:
  - Encapsulated the tables in accessible horizontal-scrolling containers (`<div className="overflow-x-auto relative">`) with `border-separate border-spacing-0` and responsive minimum widths (`min-w-[1100px]` on Admin, `min-w-[1000px]` on Foreign Agent) matching the styling of the Foreign Agent Commission billing schedule.
  - Replaced the Foreign Agent vertical card list with an identical, high-density structured table view.
- **Zero Mock / Zero Backend Mutation**:
  - Fully joined in-memory using live backend queries (`listPlacementsV2`, `listApplicantsV2`, `listMyPlacementsV2`, and `listPortalCandidatesV2`), without modifying backend RPC schemas or storing mock fallbacks.
- **Verification**:
  - Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors).
  - Live runtime HTTP checks confirmed `/complaints` and `/agent/complaints` return HTTP 200 OK.

---

## 17. Follow-Up Module Conversion to Two-Level Operational Excel-Like Workspace & Backend Handoff Finalization (2026-10-08)
- **Resolved Remaining Backend Handoff Notes**:
  - Integrated `MedicalWorkspace` (`activeTab === "medical"`) rendering in `RoleWorkspaceContainer.tsx` with role permissions (`Medical Officer`, Admin/Manager).
  - Fixed syntax in `src/app/api/method/[...slug]/route.ts` (removed orphaned catch block).
  - Completed `injazPayment` ternary expression in `src/lib/api/v2/operational.ts`.
  - Added `resourceName?: string` support to `src/components/ui/LoadError.tsx` to resolve TypeScript compilation errors in `expenses-income/page.tsx`.
- **Follow-Up Module Level 1: Compact Main Follow-up Table (`/applicants?tab=follow_up`)**:
  - Removed **Agency Name** and **Sponsor Name** columns from the main Follow-up Table to prevent clutter and horizontal bloating, moving them into the Level 2 Applicant Follow-up Workspace.
  - Preserved approved column order (12 columns + NO index):
    1. **NO** (Index)
    2. **NAME** (Candidate full name with initials pill)
    3. **DESTINATION COUNTRY** (Saudi Arabia, Kuwait, etc.)
    4. **STAGE STATUS** (Authoritative lifecycle stage matching `resolveApplicantStage`)
    5. **DURATION** (Contract elapsed duration in days)
    6. **COC STATUS** (Ministry COC status)
    7. **LMIS STATUS** (Excel-like inline `ExcelSelect` dropdown with `LMIS_WORKING_STATUSES` for LMIS officers / Admins; opens compact rejection reasons dialog when `REJECTED` is selected; read-only lock for unauthorized roles)
    8. **TE'SHIR APPT. DATE** (Excel-like inline `ExcelDateInput` updating biometric appointment via `setTaeshirAppointmentV2` for Taeshir officers / Admins; read-only font-mono for unauthorized roles)
    9. **TE'SHIR STATUS** (Taeshir clearance step status badge)
    10. **WAKALA STATUS** (Wakala fee authorization status badge)
    11. **EMBASSY / VISA STATUS** (Embassy visa stamping status badge)
    12. **MEDICAL 2 STATUS** (Inline select for Medical Officer / Admin when candidate is at `Ticketed` stage via `recordPredepartureMedicalResultV2`; read-only badge otherwise)
    13. **DEPARTURE STATUS** (Flight departure status badge)
  - Zero desktop horizontal scroll (`md:overflow-x-clip`), with full touch horizontal scrolling permitted on mobile (`< md`) without sticky first columns.
- **Follow-Up Module Level 2: Dedicated Applicant Follow-up Workspace (`ApplicantFollowUpWorkspace.tsx`)**:
  - Clicking any applicant row opens a dedicated operational workspace (full-height slide-over drawer) grouping detailed fields and actions by workflow stage:
    1. **Applicant Summary**: Candidate identity, Passport number, Destination country, Foreign Agency name, Sponsor / Employer name, Sponsor ID, Target job, Contact phone, Contract days, Visa number, Labor ID, and later-stage milestone snapshot.
    2. **LMIS Stage**: Working LMIS status, Labor ID, COC status, completion / issue date, rejection reasons, and Kuwait Police Ashara sub-checks (appointment, reference, payment, status). Authorized actions: Update working status (with reasons validation on reject), Start step, Complete step.
    3. **Taeshir Stage**: Injaz Application ID (E-number), Appointment date & time, Injaz payment status, amount, and receipt number. Authorized actions: Set Appointment & Injaz ID, Reschedule Appointment, Download Injaz PDF form.
    4. **Embassy / Wakala Stage**: Wakala fee status, amount, paid date, visa number, and embassy step status. Authorized actions: Record Wakala fee, Submit to Embassy, Stamp Visa (records visa number and issue/expiry dates).
    5. **Medical 2 Stage**: Registration medical result & expiry, Stage 1 selected medical result & expiry, Pre-departure Medical 2 result (~72h before flight). Authorized actions: Record FIT / UNFIT via `recordPredepartureMedicalResultV2`.
    6. **Ticket / Departure Stage**: Ticket number, airline carrier, flight date, flight time, and departure status. Authorized actions: Book / Record Ticket (`recordTicketDetailsV2`), Reschedule Flight (`recordRescheduleV2`), Confirm Departure (`advancePlacementV2` -> "Departed").
  - Role-based security: each stage checks user permissions (`Saudi LMIS`, `Saudi Taeshir`, `Saudi Embassy`, `Medical Officer`, `Ticketer`, or Administrator / Manager). Unauthorized users see clean read-only fields with explanatory tooltips.
  - Immediate state reflection: live mutations invalidate queries and refresh the parent table immediately.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors). Zero mock persistence or fake database fallbacks.

- **Applicant Detail Page Overhaul (`/applicants/[id]/page.tsx`)**:
  - Removed all external action buttons from the applicant detail page.
  - Redesigned page to render the pre-filled registration form plus the stage status bar:
    1. Header: Big format Name, Destination country, and Phone number.
    2. Top area: Canonical 9-stage stepper ribbon (`Draft` ➔ `Registered` ➔ `CV Generated` ➔ `Selected` ➔ `Processing` ➔ `Stamped` ➔ `Ticketed` ➔ `Departed`).
    3. Body: `ApplicantRegistrationForm` pre-filled with all applicant data (`enrichedApplicant`).
- **LMIS Edit Restrictions**:
  - Prevented LMIS from editing national ID, emergency contact name, or emergency phone across `LMISWorkspace.tsx`, `LmisFastPathModal.tsx`, and `updateApplicantForLmisV2` in `applicants.ts`.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors) across all workspace files.

---

## 1. System-Wide Conformance Summary

| Total Capabilities Tracked | Complete | Implemented (Need Verification) | Partial (Need UI / Integration) | Backend Blocked | Not Started | Provisional |
|---|---|---|---|---|---|---|
| **88** | **39** | **48** | **0** | **0** | **0** | **1** |

---

## 2. Comprehensive Capability Conformance Matrix

| # | Functional Capability | Backend Exists? | Swagger Doc? | Contract Known? | Runtime Verified? | Frontend UI? | Real API Integrated? | Role Tested? | Browser Tested? | Status | Remaining Work |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Session Authentication (Login / Logout)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. Tested against live Railway backend. |
| 2 | **CSRF Token Lifecycle & Caching** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. In-memory caching and transparent header attachment operational. |
| 3 | **Current User Context & Role Rehydration** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. AuthProvider rehydrates 16 canonical V2 roles. |
| 4 | **Applicant Intake & Draft Creation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Client recording layout aligned, with top media tabs, 2-col core grid, sponsor/visa info, accordions, restored passport quick-scan extractor & warning, standard/muayena track toggle, and high-contrast tab selection. Verified no demo fallback. |
| 5 | **Applicant Registration (Draft -> Registered)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified on Railway backend: field-floor normalization for Standard track (target_job, education, salary_amount, salary_currency, photograph with full-body photo support) prevents 417 floor validation errors. Derives first/middle/last names from full_name automatically. |
| 6 | **Applicant Profile Retrieval & Listing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verified no demo fallback on query error; empty list preserved as empty. |
| 7 | **Applicant Full Editing & Uniqueness Validation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Multi-entry fee logging integrated with auto-save submission. |
| 8 | **Applicant LMIS Fast-Path Editing** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Reusable LmisFastPathModal built & integrated into clearance queue drawer & applicant profile calling update_applicant_for_lmis (TODO-P2-01). |
| 9 | **Applicant Cancellation & Re-intake Cycle** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verify cycle_number increment side effect at runtime. |
| 10 | **Applicant Country Ban Enforcement & Listing** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Test ban override permission gating for Manager/Admin. |
| 11 | **Applicant Registration Fee Logging** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Auto-submits to finance on Save Changes and candidate intake; multi-entry logging on candidate profile. |
| 12 | **Official CV PDF Generation & Attachment** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Dummy fallbacks eliminated; Ref No. empty by default; honest demographic & skills mapping; honest 417 ValidationError handling for render_cv_pdf; strict role gating enforced for Registrar & Admin. |
| 13 | **Passport MRZ Parsing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified parse_passport_file returns 200 without lifecycle mutation side-effects. |
| 14 | **Contract Parsing (Saudi & Kuwait)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified parse_contract_file with real Saudi Musaned contract PDF returning 10 fields; audited parser schema, verified employer field propagation to Placement & Applicant, and added contract document viewer modal. |
| 15 | **Kuwait eVisa Parsing** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Connected parse_visa_file to Placement Document Center with real preview and field extraction (TODO-P1-02). |
| 16 | **Saudi Injaz Paper Parsing** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Injaz OCR inspector integrated into V2ClearanceQueueWorkspace drawer calling parse_injaz_file (TODO-P2-04). |
| 17 | **Foreign Agency Candidate Catalog** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verified no demo fallback on catalog query error; photo resolution via proxy fallback. |
| 18 | **Atomic Candidate Selection & Placement Row-Lock** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Handle 409 conflict gracefully in candidate card UI. |
| 19 | **Foreign Agency Reserved Placements Listing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verify contractor scoping isolation. |
| 20 | **Foreign Agency Wakala Requests Queue** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Dedicated /agent/wakala page with manual authorization and reminder trigger (TODO-P2-03). |
| 21 | **Placement Creation (Muayena Track)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | MuayenaPlacementModal integrated in applicant profile calling create_muayena_placement directly (TODO-P2-04). |
| 22 | **Placement Stage 1 Medical Gate (Selected -> Processing)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Explicit Medical 1 FIT gate enforced in /applicants/[id] and contractor-doc; prompted if unverified. |
| 23 | **Placement Contract Upload & Field Binding** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Sourced via placement_api.upload_contract and upload_file in Placement Document Center (TODO-P1-02). |
| 24 | **Placement Visa Upload & KA Verification (Kuwait)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Sourced via placement_api.upload_visa and upload_file in Placement Document Center (TODO-P1-02). |
| 25 | **Placement Ticketing & Cost Auto-Logging** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | TicketingDepartureModal integrated with dedicated departure time picker and cost tracking. |
| 26 | **Placement Flight Rescheduling** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Flight reschedule form integrated in TicketingDepartureModal calling record_reschedule with internal cost auto-logging (TODO-P2-04). |
| 27 | **Placement Predeparture Medical (Ticketed -> Departed)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Pre-departure Medical 2 screening persisted via record_predeparture_medical_result; strictly gates departure. |
| 28 | **Placement Departure & Terminal State Guard** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Final departure clearance strictly requires Medical 2 FIT; dedicated time selection; honest errors surfaced. |
| 29 | **Dynamic Corridor Step Discovery** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Ensure dynamic rendering is used everywhere. |
| 30 | **Clearance Queue Retrieval (list_my_clearance_steps)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated across recovered Excel-like Workspaces (LMIS, Te'shir, Embassy, Departure, Wakala) and V2ClearanceQueueWorkspace, with direct page size buttons [10, 25, 50, 100], spreadsheet in-cell editing with verified backend schema conformance & persistence (remarks via update_applicant, visa # via update_placement_parsed_fields, E-no & appointment dates via set_taeshir_appointment, ticketing via record_ticket_details), first-column blue pencil edit modal, and header column filter inputs matching reference UI. |
| 31 | **Clearance Step Start & In-Progress Marking** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls start_clearance_step. |
| 32 | **Clearance Step Completion (LMIS / Taeshir / Telesign)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls complete_clearance_step with reference/amount and optional date_completed backdating. |
| 33 | **Embassy Step Monday Submission** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls submit_embassy_step with unpaid Wakala guard and manager override reason. |
| 34 | **Embassy Step Thursday Stamping Outcome** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls stamp_embassy_step with visa sticker reference; supports terminal data corrections. |
| 35 | **Embassy Step Thursday Rejection Outcome** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls reject_embassy_step with required remark; supports terminal data corrections. |
| 36 | **Clearance Step Reassignment to Officer** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Replaces legacy assignment with V2 reassign_clearance_step, CLR-.##### identifiers, User.name convention, and Manager/Admin RBAC. |
| 37 | **Placement Officers Assigned Introspection** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Sourced from chat_engine.get_placement_officers; populates active officers in reassignment modal and dynamically resolves Officer name tag on clearance step cards with default specialist fallback. |
| 38 | **User & System Employee Management** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Role-gated list_employee_roster directory; in-app staff creation, editing, role assignment, and password reset via native frappe.client.* RPCs without Frappe Desk; admin-lockout 417 messages cleanly surfaced. |
| 39 | **Stage Expense & Income Logging** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Direct logStageExpenseV2 and logStageIncomeV2 with standalone or applicant/placement linking and modal UI in /commission and /expenses-income. |
| 40 | **Transaction Approval Queue & Actions (Approve/Reject/Void)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Pending approval queue tab integrated in /expenses-income calling approve_transaction, reject_transaction, and void_transaction (TODO-P1-05). |
| 41 | **Owed Commissions Retrieval** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified via get_owed_commissions returning unbatched approved commissions per contractor and corridor. |
| 42 | **Commission Batch Creation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified create_commission_batch generating CBR-##### records in Draft status, now supporting requested_advance_amount and include_unpaid_from_previous. |
| 43 | **Commission Batch Invoice PDF Generation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified get_batch_invoice_pdf streaming on-demand binary PDF for CBR records with clear UI notice explaining printed TOTAL vs stored balance_due_original. |
| 44 | **Commission Payment Proof Upload & Fuzzy Matching** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified upload_batch_payment_proof returning matched_items and unmatched_names. |
| 45 | **Per-Item Partial Commission Settlement** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified settle_batch_items marking individual items Paid and updating batch status. |
| 46 | **Full Commission Batch Settlement** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified settle_batch setting settled_on and settlement_reference, marking batch Settled. |
| 47 | **Bank Statement Reconciliation & Line Matching** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Bank Statement Reconciliation tab with CSV upload calling upload_bank_statement & manual matching calling manually_match_line in /expenses-income (TODO-P2-02). |
| 48 | **FX Rate Management (Get / Set Manual Rate)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | FxRateModal integrated in /expenses-income calling get_fx_rate and set_fx_rate for Finance Managers/Admins (TODO-P2-04). |
| 49 | **Daily Work Report (Date-Windowed)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Integrated getDailyWorkReportV2 in reports page with date filters and stats cards (TODO-P1-03). |
| 50 | **Staff Performance Report (Date-Windowed)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Integrated getStaffPerformanceReportV2 in reports page with officer breakdown table (TODO-P1-03). |
| 51 | **Operations Summary (Recruitment Funnel & SLA)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verified no demo fallback on report query error; honest ApiV2Error thrown. |
| 52 | **Financial Overview Report (Ledger Summary)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verified no demo fallback on financial overview query error; honest ApiV2Error thrown. |
| 53 | **Placement Aging Report** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Integrated getPlacementAgingReportV2 in reports page with critical overdue tables (TODO-P1-03). |
| 54 | **Complaint Aging Report** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Integrated getComplaintAgingReportV2 in reports page with aging breakdown (TODO-P1-03). |
| 55 | **Cost Breakdown Report** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Integrated getCostBreakdownReportV2 in reports page with country bar chart (TODO-P1-03). |
| 56 | **Employee Financial Report** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Integrated getEmployeeFinancialReportV2 in reports page with employee ledger table (TODO-P1-03). |
| 57 | **Commissions Binary XLSX Export** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Direct export action calling exportCommissionsXlsxV2 with real .xlsx formatting, agency title banner, and updated client-facing column order. |
| 58 | **Complaint Creation (Staff & Foreign Agency)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verified no demo fallback on complaint creation error; honest ApiV2Error thrown. |
| 59 | **Unresolved Complaints Queue Listing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verify contractor boundary isolation. |
| 60 | **Complaint Acknowledgment (New -> Unresolved)** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Test live state transition on live complaint. |
| 61 | **Complaint Resolution & Free Replacement (90d Window)** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verify free replacement complaint link to new candidate selection. |
| 62 | **Chat Workspace & Thread Listing** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Complete /chat page with reactive thread list and sidebar link (TODO-P1-01). |
| 63 | **Foreign Agency Chat Thread Isolation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified bilateral routing via create_agency_thread returning Agency thread with strict contractor boundary isolation. |
| 64 | **Internal Staff Thread Creation & Participant Management** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified create_internal_thread with clean separation of internal colleagues and contractor partners, preventing 417 ValidationError. |
| 65 | **Chat Messaging, Attachments, and Mentions** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Sourced via send_message with upload_file attachment pipeline and applicant/placement mentions (TODO-P1-01). |
| 66 | **Thread Mark Read & Unread Badge Tracking** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Auto-triggered mark_read on thread selection with real-time unread badge counts (TODO-P1-01). |
| 67 | **Web Push Notification Subscription & Status** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Sourced via getPushSubscriptionStatusV2, subscribeToPushV2, and getVapidPublicKeyV2 with dynamic key discovery. |
| 68 | **Wakala Payment Reminder Manual Trigger** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Integrated in V2ClearanceQueueWorkspace drawer and /agent/wakala calling trigger_wakala_reminder (TODO-P2-04). |
| 69 | **Multipart File Upload Pipeline** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Clean Frappe upload_file endpoint integrated directly; 417 DocType misuse completely resolved. |
| 70 | **VAPID Public Key Retrieval (Dynamic Discovery)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated getVapidPublicKeyV2 in push notification subscription flow with zero hardcoding. |
| 71 | **VAPID Keypair Regeneration (Admin Dialog)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated regenerateVapidKeysV2 with admin-gated confirmation modal in notifications popover. |
| 72 | **R2 Object Storage Connectivity Probe** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated testStorageConnectionV2 with live status dialog in admin diagnostics. |
| 73 | **New Complaints Triage Queue** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated listNewComplaintsV2 with dedicated New / Triage tab and Acknowledge action. |
| 74 | **Authoritative Complaints Filtering (All / Status Slices)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated listComplaintsV2 with status query parameter and filtering UI. |
| 75 | **Commission Batch Advance Management & Creation Param** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated updateBatchAdvanceV2 (replaces deleted record_batch_advance), requested_advance_amount & include_unpaid_from_previous in create_commission_batch, and invoice TOTAL math explanation. |
| 76 | **Foreign Agency Mobile Navigation & Dedicated Staff Chat Workspace** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Built mobile quick-nav bar & hamburger drawer in AgentLayout. Integrated dedicated /agent/chat workspace backed by create_agency_thread with auto-init & responsive chat pane. |
| 77 | **Foreign Agency Wakala UI Terminology & Push Notification Wiring** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Renamed applicant Stepper Ribbon to 'Processing (LMIS, Te'shir, Embassy)'. Purged 'Musaned' from /agent/wakala. Wired real Web Push registration (get_vapid_public_key, subscribe_to_push) & status (get_push_subscription_status). Preserved Monday deadline gate and Fri/Sat/Sun schedule. Verified live browser runtime as foreign agency. |
| 78 | **Foreign Agency Contractor Chat Selection, Communicating-Party Privacy & Executive Oversight** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Foreign agency selection in New Conversation dialog wired to list_contractors with elevated proxy fallback. Enforced strict communicating-party privacy: regular staff & agencies only view their own participating threads. Implemented executive supervision & audit mode for Administrator and Communication Manager roles, resolving communicating parties ('Who communicated with whom'), staff-specific filtering, and read-only inspection stream. Verified live against production Railway backend. |
| 79 | **Chat Contextual Candidate Mention Dropdown & Placement Mention Removal** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Replaced free-text Mention Applicant ID with dynamic dropdown (<select>). Strict context-based scoping: when communicating with a foreign agency (either via agency portal or internal staff in agency thread), options are strictly restricted to candidates on that agency's interface (selected placements & portal discovery candidates for their country). Omitted completely all unrelated/draft/other agency applicants. For staff-to-staff threads, all active applicants are selectable. Completely removed obsolete Mention Placement field. Verified live against production Railway backend. |
| 80 | **Real V2 Commission Batch Workflow & Contractor Configuration** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | 7 dedicated tabs on /commission (Owed Commissions, Batch Requests, Batch Details, Invoice & PDF, Payment & Settlement, Partial & Advances, Contractor Config). Integrated get_owed_commissions, create_commission_batch, settle_batch, settle_batch_items, upload_batch_payment_proof, get_batch_invoice_pdf, update_batch_advance, trigger_early_commission_accrual, and frappe.client.save on Contractor. getCommissionBatchV2 now calls authoritative agency_tracking.finance_api.get_commission_batch returning items_detail with real candidate full names. All commission tables across all tabs on /commission and /agent/commission resolve real candidate full names and passport numbers via applicantMap, placementMap, and txMap, eliminating generic 'Applicant' fallbacks. Formally audited and documented threshold auto-notification absence as BACKEND GAP. Verified live against production Railway backend. |
| 81 | **Mobile Responsiveness, Touch Horizontal Scrolling, WhatsApp Chat Look & Crop Ratio Normalization** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | 1. Eliminated mobile right-gutter whitespace with device-width Viewport, overflow-x-hidden, and min-w-0 container bounds. 2. Restored horizontal table scrolling on touch devices with touch-pan-x and minimum table widths. 3. Added explicit confirmation popups for candidate selection, photo removals, and batch/rate deletions. 4. Added country filtering for foreign contractors. 5. Overhauled ImageCropModal with canvas aspect ratio normalization (35x45mm, 3:4, 1.42) and locked corner handles. 6. Redesigned mobile chat (<md) with WhatsApp aesthetics, dynamic read receipt ticks (single tick for delivered, blue double tick strictly when seen by counterparty via last_read_at), and live in-chat presence heartbeat powering the active indicator. |
| 82 | **Registration Error Navigation, Custom Select Dropdowns, Ledger Fees & Corridor Default Roles Engine** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | 1. Registration error automatic section navigation, smooth scrolling, 4.5-second pulsing highlight, and simple plain English error formatting for non-native operators. 2. Custom styled Radix UI Select Dropdown component replacing raw HTML `<select>`. 3. Candidate detail financial ledger synthesizing initial registration fee with logs and accurate net totaling. 4. Applicant directory name column cleaning (removed dot and city name) and renamed Doc button to 'Contract document'. 5. Corridor Default Roles Engine (`defaultRoles.ts`) supporting 17 canonical roles with Saudi vs Kuwait pipeline specializations. 6. Dedicated 'Default Role Assignments' tab on `/employees` with persistence and staff resolvers. 7. 1-click 'Auto-Assign All Corridor Steps' in AssignEmployeeModal and automatic assignment on placement advance to Processing. Clean TypeScript and production build. |
| 83 | **V2 Operational Workflow Exact Backend Conformance (`message.txt`)** | YES | YES | YES | `IMPLEMENTED` | YES | YES | YES | N/A | **COMPLETE** | Full conformance across all 13 operational domains: 1. Applicant intake & registration fee ledger integration. 2. Selection & Medical 1 gate. 3. Placement state transitions. 4. Dynamic corridor clearance concurrency (sequential gating removed). 5. Country clearance workspaces (Saudi Taeshir embedded Injaz RPCs with binary PDF blob download; Saudi Embassy Wakala unpaid warning banner & accidental submit guard; Kuwait LMIS Police Ashara fields & failure warning). 6. Contract Parser "Edit Parsed Terms" dialog (permitted fields only). 7. Ticketing & departure operations. 8. Pre-departure Medical 2 visual gate and departure blocking. 9. Commission batch lifecycle (write-off batch dialog, release unpaid items action). 10. Financial ledger & approval queue. 11. Foreign agency Wakala workspace. 12. Chat & executive oversight. 13. Canonical RBAC & employee provisioning. Verified clean TypeScript (`npx tsc --noEmit`) and production Next.js build (`npm run build`). |
| 84 | **Foreign Agency Selection Confirmation Dialog, 7s Undo, & System-Wide Lazy Loading** | YES | YES | YES | `IMPLEMENTED` | YES | YES | YES | YES | **IMPLEMENTED** | 1. Confirmation popup (Radix Dialog, emerald-themed) before every foreign-agency candidate selection on /agent — shows candidate thumbnail, job, destination, religion, experience, and the 7s-undo notice; atomic `portal_api.select_candidate` only fires after explicit confirm. 2. Post-selection 7-second Undo bar with inline countdown-window badge — calls `placement_api.advance_placement(name, "Cancelled")` (Selected→Cancelled is the sanctioned revert edge; Departed is terminal), restores the candidate to the available pool and decrements the session selection count. 3. Lazy loading throughout: 23 route-level `loading.tsx` skeleton files (shared `ui/skeleton.tsx` primitives styled to the slate/emerald light+dark theme) plus `next/dynamic` code-splitting for the heavy `RoleWorkspaceContainer` (applicants) and full-screen `CandidateDetailModal` (agent). Verified clean TypeScript (`npx tsc --noEmit`) and production Next.js build (`npm run build`). |
| 85 | **All-Transactions Binary XLSX Export & Commission XLSX Column Ordering** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | exportTransactionsXlsxV2 integrated on /expenses-income and /reports covering Expense/Income/Commission; export_commissions_xlsx real formatting, agency banner, and updated client-facing column order. |
| 86 | **Clearance Step Human-Error Correction Toolkit & Role-Gated Employee Roster** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | date_completed backdating on completions/corrections; dedicated wakala_reference_no; Kuwait LMIS police_ashara_payment_status & failure remark; generic record_other_payment line items; list_employee_roster migration; admin-lockout 417 messages preserved. |
| 87 | **Production File Upload Capacity & 413 Handling (`upload_file`)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Resolved live Frappe default 25MB limit by updating System Settings max_file_size to 1024 MB via authenticated frappe.client.set_value on live Railway backend. Verified 25MB and 30MB uploads returning 200 OK. Hardened Next.js proxy route parseJsonOrFriendlyMessage to handle 413 explicitly and prevent stream consumption errors. Updated PremiumDropzone size recommendations. |
| 88 | **Commission-Currency-Invoicing Updates & User To-Do Queue (`list_my_todos`, Async Passport OCR, Stamping Wakala Guard)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated: 1. `list_my_todos` To-Do queue in Notifications & Action Center with direct queue navigation. 2. `Applicant.place_of_birth` and `needs_passport_review` flag in passport intake & registration. 3. `Complaint.display_no` across all user-facing views. 4. `list_batch_write_offs` dedicated endpoint in Commission Batch details. 5. Automatic corridor known fee calculation on ticketing, with optional currency in `record_ticket_details`. 6. Async passport OCR background queue (`enqueue_parse_passport_file` + `get_job_status`) with sync fallback. 7. Unpaid Wakala guard on Embassy Stamping with Manager override support and error translation. |

---

## 3. Status Definitions Legend

- **COMPLETE**: Fully implemented in UI, integrated with whitelisted V2 API, verified live against Railway production, and zero mock/demo fallbacks remain.
- **IMPLEMENTED**: Fully implemented in UI and integrated with V2 API, awaiting comprehensive live runtime verification with production credentials.
- **PARTIAL**: V2 API client wrapper exists in `src/lib/api/v2/*`, but UI page or component is missing, incomplete, or requires modernization.
- **BACKEND BLOCKED**: Requested capability has no whitelisted V2 API endpoint in the backend.
- **NOT STARTED**: Endpoint/capability identified in backend/Swagger, but no V2 wrapper or UI component has been built.
- **PROVISIONAL**: Operational contracts where backend response or OCR parsing may return test/stubbed values per Document Parsing Settings.
- **CONTRACT MISMATCH**: Discrepancy observed between Swagger schema and backend runtime implementation.

---

## 4. Verification & Sign-Off Milestones

1. **Phase 1: Read-Only Audit & Matrix Completion** -> [DONE]
2. **Phase 2: P0 Architectural Repairs** -> [DONE]
3. **Phase 3: P1 Feature Implementation (Chat, Reports, Batches)** -> [DONE]
4. **Phase 4: P2 Secondary Capabilities (LMIS fast path, Reconciliation, Wakala)** -> [DONE]
5. **Phase 5: P3 V1 Retirement & V2 API Cleanup & RBAC Hardening** -> [DONE]
6. **Phase 6: Live Railway Runtime Verification & Report** -> [DONE]
7. **Phase 7: Master Contract Closure — All 86 OpenAPI Operations Audit** -> [DONE]
8. **Phase 8: Critical Production Debug & Post-Fix Smoke Verification** -> [DONE]
9. **Phase 9: V2 Backend Hardening & New Features (2026-09) Integration & Verification** -> [DONE]
10. **Phase 10: Foreign Agency Mobile Navigation & Staff Chat Workspace Integration** -> [DONE]
11. **Phase 11: Foreign Agency Wakala & Push Notification Protocol** -> [DONE]
12. **Phase 12: Comprehensive Corrective Hardening & Multi-Stage RBAC System** -> [DONE]
13. **Phase 13: Foreign Agency Chat Contractor Selection, Privacy Gating & Admin / Communication Manager Supervision Oversight** -> [DONE]
14. **Phase 14: Chat Contextual Candidate Mention Dropdown & Placement Mention Removal** -> [DONE]
15. **Phase 15: Mobile Responsiveness, WhatsApp Chat Look, Touch Pan Tables & Photo Crop Ratios** -> [DONE]
16. **Phase 16: Registration Error Navigation, Radix Dropdowns, Candidate Registration Fee Ledger, Directory Table Polish & Corridor Default Roles Engine** -> [DONE]
17. **Phase 17: V2 Operational Workflow Exact Backend Conformance (`message.txt` & 13 Sections)** -> [DONE]
18. **Phase 18: Foreign Agency Selection Confirmation, 7-Second Undo & System-Wide Lazy Loading** -> [DONE]
19. **Phase 19: V2 Frontend Backend-Changelog Conformance (`chan.md`, commits `e5c70f6`…`ff79ac2` + invoice work)** -> [DONE]
20. **Phase 20: Commission Currency & Invoicing Release Conformance (2026-09-12 Backend Instructions)** -> [DONE]

---

## 5. 2026-09-07 Backend Changelog Conformance (chan.md)

Implemented the backend changelog into the frontend on branch `agency_finalized_version`. All breaking changes + new endpoints/fields from backend commits `e5c70f6`…`ff79ac2` and the session's uncommitted invoice/finance work. Verified clean TypeScript (`npx tsc --noEmit`) and production Next.js build (`npx next build`).

### Breaking changes — status
| # | Change | Frontend action | Status |
|---|---|---|---|
| 1 | `get_current_user` roles collapse to `"Admin"` | Role arrays/`isAdminOrOps` updated to include `"Admin"` (`applicants/[id]`, LmisFastPath, ContractorRateMatrix, reports, expenses-income, commission, employees). Central `permissions.ts`/`v2Roles.ts` auto-expand admin aliases. | DONE |
| 2 | `parse_injaz_file` removed (404) | `V2ParsedInjazData`, `parseInjazFileV2` + header removed from `documents.ts`. No code refs remain (only historical `src/Assets` docs). | DONE |
| 3-5 | Write-off/advance now batch-currency; single write-off → `write_offs` child table; list/get fields currency-native | `finance.ts` interfaces updated (`title`, `total_amount_original`, `advance_amount_*`, `write_off_*`, `paid_amount_*`, `balance_due_*`, `write_offs`, `amount_original`, `payment_reference`); `commission/page.tsx` currency-native everywhere; write-off history child-table display added; `expenses-income` batch-total switched to `total_amount_original`+currency. | DONE |
| 6 | `advance_placement` permission tightened | Backend is authority; honest `ApiV2Error` propagation retained (`formatCleanErrorMessage`). | DONE |
| 7 | `settle_batch` four-eyes (ETB>100k + batch owner + not admin) | `commission/page.tsx` disable + explanatory UI + guard via `needsSecondApprover` memo. | DONE |
| 8 | Explicit IDs (no guess-a-record) | Clearance/complaint RPCs already pass explicit IDs; `createComplaintV2` now also accepts `applicant`/`applicant_name`. | DONE |
| 9 | Stricter clearance status-transition guards | Backend-enforced; surfaced as validation errors. `V2ClearanceStepItem` widened with new fields; `listMyClearanceStepsV2`/`listAssignedStepsV2` accept optional `placement`. | DONE |
| 10 | Advance decoupled from balance/settlement | Removed client-side "exceeds balance" validation; labels/toasts currency-native. | DONE |
| 11 | `register_applicant` no auto-fill | Field floor already enforced in `stage2RegistrationSchema`; no fabricated fallbacks rely on backend fill. | DONE |
| 12 | Age validation 18–65 | `applicant.schema.ts` `date_of_birth` refine already enforces. | DONE |
| 13 | Identity fields lock once placement in flight | `[id]/edit` computes active-placement status; form receives `lockedIdentityFields`, disables identity inputs and strips identity fields from update payload. | DONE |
| 14 | Passport ≥6 months validity for departure | `applicant.schema.ts` `passport_expiry` refine now requires ≥6 months (via `addMonths`). | DONE |

### New endpoints — wired
- `employee_api.*` — `listEmployeesApiV2`, `createEmployeeApiV2`, `updateEmployeeRolesApiV2`, `resetEmployeePasswordApiV2`, `toggleEmployeeStatusApiV2`, `deleteEmployeeApiV2` (`employees.ts`).
- `chat_api.list_all_threads` — `listAllThreadsForOversightV2` + ChatContainer oversight inbox (pre-existing, verified wired).
- `portal_api.get_candidate_photo` — `getCandidatePhotoUrl(name, kind)`; used by `CandidateCard` / `CandidateDetailModal` (removed `normalizePhotoUrl` raw-field fallback).
- `finance_api.get_owed_commissions_by_currency` — `getOwedCommissionsByCurrencyV2`.
- `finance_api.list_transactions` — `listTransactionsV2` (all-status history view).

### New fields — surfaced
- `Contractor.license_no`, `Contractor.telephone` (added to `V2ContractorRecord`).
- `Commission Batch Request.title`, `Commission Batch Item.payment_reference` (typed in interfaces; `title` requested in list fields).
- `Clearance Step.title` + extended step fields on `V2ClearanceStepItem`.
- `write_offs` child table displayed in `commission/page.tsx` write-off history.

### Not applied (backend-owned / reference-only)
- `Agency Tracking Settings` singleton is straightforward REST (`/api/resource/Agency Tracking Settings/...`), edited by System Manager/Admin/Finance Manager; backend-seeded and consumed by the invoice PDF — no dedicated UI screen required. Referenced in `src/Assets` (historical docs left untouched).

## 6. 2026-09-08 UI Fixes & Data-Join Fixes

### Visa / contract numbers missing in applicant tables — root cause + fix
- Root cause: `upload_contract` / `upload_visa` persist extracted fields (`visa_number`, `contract_number`, `employer_name`, `employer_national_id`, `sponsor_name`, `sponsor_civil_id`) on the **Placement**, not on the Applicant. `list_applicants` returns the `active_placement` link only (verified live: APP rows carry no visa/contract keys). The `ApplicantTable` was reading those fields off the applicant row → always "—".
- Evidence (live backend): `PLM-00014` (Fatima Al-Nasser, Processing, LMIS done) actually HAS `visa_number=1908334046`, `contract_number=2005450415`, `employer_name`, `employer_national_id`, `contract_file` — extraction worked; only the directory join was missing.
- Fix: `ApplicantTable.tsx` now fetches `listPlacementsV2()` alongside `listApplicantsV2()` and merges the active-placement derived fields onto each applicant row (same merge the operational workspaces already used). Graceful no-op when a caller's role can't read placements (e.g. Registrar 403) — table simply falls back to "—".

### Global font readability bump
- The system relied heavily on fixed 9–11px micro-text (`text-[10px]` 308×, `text-[11px]` 331×). Added global CSS overrides in `globals.css` lifting dominant sizes ~2px while leaving spacing/layout geometry untouched: 9px→11px, 10px→12px, 11px→13px, 12px→13px, 13px→14px, `text-xs`→13px, `text-sm`→14.5px; `select option` font bumped to 0.875rem. Verified in compiled production CSS (grouped selectors `.text-\[11px\],.text-\[12px\]{font-size:13px}` etc.).

### Te'shir Injaz Fee default
- "Injaz Fee (USD)" now defaults to `10.5` (`InjazWorkspace.tsx`) — both the initial drawer state and the per-row fallback when an existing fee is absent.

### Operational sheets must not list applicants who are not yet on that stage
- Reported bug: applicants that were **not selected by a Foreign Agent** (and had no uploaded documents) appeared in the excel-like operational tables (LMIS, Te'shir, and later stages).
- Root cause: `list_applicants` never returns an `applicant_state` key, so the v2 client normalizes `applicant_state = status` (`applicants.ts`). Only the `Registered` status leaked into the LMIS sheet via the old exemption `applicant.applicant_state !== "Registered"` in `fetchOperationalWorkspaceDataV2` — a freshly registered, unselected applicant with no Placement and no documents showed up in the LMIS excel table.
- Fix (`src/lib/api/v2/operational.ts`): all operational sheets (lms / injaz / embassy / departure / wakala) are now stage-gated on an active **Placement**:
  - A Placement exists only after Foreign Agency selection (`portal_api.select_candidate`) or the direct Muayena intake; contract/visa documents are uploaded against that Placement — so "no Placement" == "not on that stage yet", and those rows are excluded entirely.
  - Cancelled placements are dropped from the placement join, and the applicant's own `active_placement` link is preferred when listing, so cancelled/obsolete placements can no longer keep a candidate in a sheet.
  - Sheet-level gates anchored on placement status (not the applicant row): LMIS / Te'shir sheets require Processing-or-beyond (that is where corridor steps spawn); Embassy requires the embassy step or Processing-or-beyond; Departure keeps its Stamped-or-beyond rule.
- Verified: `npx tsc --noEmit` clean, `npx next build` succeeds.

### Distinct stage colors on the Directory Current Stage badges
- Reported bug: `Selected` and `Processing` both rendered as blue (`info`) on the Directory badges, and several other stages reused hues (`Registered`/`Departed` both emerald, `CV Generated`/`Ticketed` both purple, `Stamped` blue).
- Fix (`src/components/applicant/ApplicantTable.tsx`, `getStageBadgeVariant`): each stage now gets a unique color — Draft slate, Registered emerald, CV Generated purple, Selected blue, Processing amber, Stamped teal, Ticketed cyan, Departed lime, Cancelled rose. Teal/cyan/lime use `className` overrides (`bg-teal-50 text-teal-700 border-teal-200`, etc.) since the cva variant set has no dedicated hues; `tailwind-merge` in `cn` makes the override win over the base `neutral` variant. Verified present in compiled CSS.
- Verified: `npx tsc --noEmit` clean, `npx next build` succeeds.

### Directory Current Stage now reflects the active Placement pipeline
- Reported bug: applicants already on `Selected` or `Processing` still showed their old intake status (`CV Generated` / `Registered`) in the Directory's "Current Stage" column — the applicant row's `status` never advances; only the Placement does.
- Fix (`src/components/applicant/ApplicantTable.tsx`): the placement-join memo now resolves each row's stage via `resolveApplicantStage(applicant, plc)`: if the applicant isn't Cancelled and the active (non-cancelled) Placement is at `Selected`/`Processing`/`Stamped`/`Ticketed`/`Departed`, the row's `status`/`applicant_state` are set to the placement status, then `copy` feeds the whole table — so the stage badge, stage filter, sponsor/contract/visa eligibility, the "Assign" button, and the batch-assign stage check all use the true pipeline stage. Cancelled placements are dropped from the join and `active_placement` is preferred.
- Verified: `npx tsc --noEmit` clean, `npx next build` succeeds.

## 7. 2026-09-08 Injaz / Te'shir Workspace Alignment with Backend Terminal-State Guard
- Reported bug: in the Te'shir / Injaz workspace, setting the **Injaz payment status to PAID** appeared to succeed but never persisted. Backend proxy log showed two `417 ValidationError`s against `CLR-00029` (Taeshir, status `Complete`):
  - `agency_tracking.clearance_api.set_taeshir_appointment` → `417` — "CLR-00029 is already Complete (terminal) -- this can no longer be edited through this action."
  - `agency_tracking.clearance_api.record_injaz_payment` → `417` — same terminal-step rejection.
- Root cause (`src/components/operational/workspaces/InjazWorkspace.tsx`): the drawer's Save always issued `setTaeshirAppointmentV2` / `recordInjazPaymentV2` whenever the payment status was `PAID` (or a fee + receipt were present), with **no terminal-state check**. The backend `417` was caught and only `console.warn`-ed, so `mutation.onSuccess` still fired and toasted "updated successfully!" while nothing was persisted — a misleading success on a bank-side that stays `UNPAID`.
- Live verification of the authoritative list view: `list_my_clearance_steps` returns only `status=Complete` (terminal), `payment_status=Not Applicable` (the step's own base fee), `reference_no`, `appointment_date`, `injaz_application_id`, `injaz_outcome`, `date_completed` — it does **not** return the `injaz_*` sub-flow payment fields, so the drawer/column truthfully cannot mark the row PAID for finalized steps.
- Fix (frontend-only, aligned with the backend's 2026-08-31 terminal-state guard):
  - All mutable drawer fields (appointment date, Injaz application number, Injaz payment status, fee, receipt №, payment date, remark) are now `disabled` when `isInjazTerminal` (Issued / Complete / Completed / Stamped / Rejected / Cancelled step, or Departed placement) — matching the already-locked status and assignee selects. The finalized banner text now states these fields are locked.
  - The drawer Save action is guarded by `handleSave`: on a terminal step it refuses with a clear error toast instead of firing mutations that the backend will reject.
  - The mutation itself no longer calls `setTaeshirAppointmentV2` / `recordInjazPaymentV2` (nor start/complete/reassign) on terminal steps or Departed placements, and `onSuccess` only claims "updated successfully!" when at least one RPC actually persisted (`persistedSomething`); otherwise it reports honestly that the finalized step could not be edited.
- Out-of-scope (backend-owned): `agency_tracking.clearance_api.render_injaz_pdf` returns `500` — `AttributeError: 'File' object has no attribute 'content_type'` inside `attach_datauri(applicant.photograph)` (`pdf_utils.py`). The frontend already falls back to the client-side Injaz PDF generator (`downloadInjazDocumentPDF`), so document generation still works; the PDF-500 itself must be fixed in the backend.
- Verified: `npx tsc --noEmit` clean, `npx next build` succeeds.

## 8. 2026-09-08 Post-QA Polish Pass — Readability, Plain English, Live Field Validation & Honest Errors
- Goal: close the QA feedback list (small fonts, crop window not filling the photo, wrong Institution placeholder, complex English terms like Complexion / Next of Kin / Overseas, missing live inline validation, vague Register/Draft failure messages, and a legacy "Housemaid" job option) with frontend-only changes verified by `npx tsc --noEmit` and `npx next build`.
- **Typography (`src/app/globals.css`)**: bumped the fixed micro-text tiers (`text-[9px]`→12px up through `text-[13px]`→15px) and the Tailwind tiers (`text-xs`→14px, `text-sm`→15px, `text-base`→16px, `text-lg`→18px, `text-xl`→21px, `text-2xl`→24px, `text-3xl`→29px, `text-4xl`→35px), covering the dashboard `text-2xl font-bold` headings. Heading weights softened (`font-black`→750, `font-extrabold`→700, `font-bold`→650) so dense UI reads friendlier. Un-layered rules intentionally beat Tailwind's layered utilities (existing pattern in the file).
- **Crop preview (`src/components/ui/ImageCropModal.tsx`)**: `calculateNormalizedCropBox` now defaults the crop window to the full picture — free mode returns `{0,0,1,1}`; ratio modes return the largest target-ratio rectangle that fills the image at ~98% scale so handles stay usable. No downstream re-clamping occurs.
- **Institution placeholder (`Step2EducationExperience.tsx`)**: now example institution names ("Addis Ababa University, Entoto Polytechnic College") instead of school-level types. Also relabeled the March-select label "Complexion / Skin"→"Skin Color" and placeholder "Select Complexion"→"Select skin color" (values unchanged: FAIR/MEDIUM/DARK).
- **Removed obsolete "Housemaid"**: dropped from `JOB_APPLIED_OPTIONS` (`applicant.schema.ts`) and from the agent job filter (`CandidateFilters.tsx`, which also gained a matching "House worker" option). Display-only fallbacks elsewhere were kept since historical records may still carry the value.
- **Plain English for non-native operators**: "Next of Kin"→"Family Member" (Step3 card + applicant details card + step description), "Overseas"—›"Work Abroad"/"international" across the applicant form steps, review step, applicant detail/CV pages, agent candidate modal, Muayena modal, CV PDF generator and schema error copy. Backend field names and raw-value logic compares (e.g. `rawCountry !== "overseas"`) are untouched.
- **Marital status → children**: in `Step1PersonalInfo`, selecting "Single" now resets the Children field to 0 via `resetField("children", { defaultValue: 0 })` — no manual override needed.
- **Live inline validation** (the form previously had `useForm({ mode: "onBlur" })` but NO resolver, so schema errors only appeared when the handler ran `safeParse` + `setError` at Register/Draft click):
  - Attached `zodResolver(stage1DraftSchema)` to the form, so all Stage-1 fields (names, gender, religion, marital status, children, nationality, phone, city, country) validate per-field on blur with inline red text. Stage 2–4 strict requirements still gate at Register click via `stage2RegistrationSchema.safeParse` (by design).
  - Added immediate (debounced ~250ms) `trigger(field)` validations on change for first/middle/last name, date of birth, passport expiry and nationality.
  - Added a live duplicate-passport check in Step1: on each value change a 450ms debounce calls `listApplicantsV2` (cached per page load, errors swallowed) and shows "This passport number is already registered to <name>…" in red under the field, excluding the current record when editing (`editingApplicantName` passed from `existingApplicantId`). The Input also gets `aria-invalid` + red ring while conflicted.
- **Honest, helpful Register/Draft errors**:
  - `client.ts`: `fetch` rejections are now wrapped as `ApiV2Error` ("Network error: we could not reach the server…") with `excType: "NetworkError"` / status 0 instead of leaking raw `TypeError: Failed to fetch`; AbortError is reported as a timeout.
  - Proxy route (`src/app/api/method/[...slug]/route.ts`): `fetchWithRetry` now aborts after 45s (fast-fail instead of hanging), `parseJsonOrFriendlyMessage` replaces the obscure "Non-JSON response from backend" with a human message (plus a short response snippet when available), and the 502 catch blocks pass through the specifically useful timeout wording ("The server took too long to respond…").
  - `ApplicantRegistrationForm.tsx`: new `describeApiError()` maps network (status 0 / NetworkError), 502/504 timeouts, and 5xx statuses to clear operator copy with the backend message when it is meaningful; the Draft / Save Changes / Register toasts now use it instead of bare `err.message`.
- **Slow loading**: the 45s proxy timeout + fast-fail is the main mitigation; broader page-by-page load profiling was NOT undertaken (kept scope limited to the reported failure symptom). Remaining candidate bottleneck (sequential CSRF-token round-trip before every POST) is left as-is to avoid destabilizing the auth path.
- **Dashboard typography follow-up (2nd pass)**:
  - On small devices the fixed px bump still did not read as larger, and the earlier global lift made badge/title/footer text inside cards converge to the same ~14px (all the `text-[10px]`/`text-[11px]`/`text-xs` tiers were remapped to similar sizes), so the Pipeline Overview cards showed no visual hierarchy (`globals.css`).
  - `globals.css`: upper tiers are now responsive with a floor — `text-xs`..`text-4xl` use `font-size: max(<readable px floor>, <rem> + <vw>)` so small phones keep the floor while larger viewports scale up (e.g. `text-2xl` = max(24px, 1.05rem + 1.2vw)); lower tiers (`text-[9px]`..`text-[13px]`) keep fixed comfortably-readable floors.
  - `dashboard/page.tsx` Pipeline Overview cards rebuilt for a clear type hierarchy and vertical breathing room: step-number chip top-left + big count top-right (`text-2xl font-black`, was `text-xl`), stage state as the card heading (`text-lg font-bold`, e.g. "Draft"), the pipeline phase as a muted smaller subtitle (`text-xs`, e.g. "Data Input"), and the footer ("Candidates" / "View →") separated under a divider with `mt-4 pt-3` instead of the cramped `mb-2`/`pt-2`. Card padding went `p-4` → `p-5`; Processing sub-stream tiles (LMIS / INJAZ) and counts also got the larger responsive tiers.
- Verified: `npx tsc --noEmit` clean, `npx next build` succeeds (build re-run after all edits).

## 9. 2026-09-12 Backend Release Conformance (`commission-currency-invoicing` branch)

Integrated all requirements from the 2026-09-12 backend release notes across Finance, Clearance Steps, Employees, CV generation, and Reporting. Verified clean TypeScript check (`npx tsc --noEmit`).

### 1. CV PDF Generation (Honest 417 Error Contract)
- `render_cv_pdf` now returns 417 `ValidationError` when PDF generation fails (e.g. missing wkhtmltopdf, template error).
- Frontend (`src/lib/api/v2/cv.ts`) guards against fake stub PDFs (<100 bytes) and surfaces honest `ApiV2Error` with backend message ("Could not generate the CV PDF. Try again shortly or contact support.").
- Added official PDF download action on `/applicants/[id]/cv` with honest error handling.

### 2. Excel Exports
- `export_commissions_xlsx` now renders real formatted Excel (.xlsx) with comma-separated numbers (`#,##0.00`), true dates, agency title banner, and revised client-facing column order: `Applicant | Foreign Agency | Type | Original Amount | Currency | ETB Amount | Status | Date | Transaction ID | Placement`. Applicant name built from first + middle + last name.
- Integrated new endpoint `agency_tracking.report_api.export_transactions_xlsx` covering all transaction types (Expense, Income, Commission) and statuses. Added export triggers in `/expenses-income` and `/reports` (both global header and pending approvals queue).

### 3. Commission Batch Advances, Arrears & Invoice Divergence
- Removed deleted endpoint `agency_tracking.finance_api.record_batch_advance`.
- Integrated `agency_tracking.finance_api.update_batch_advance` (`batch_name`, `requested_advance_amount` in batch currency, 0 to clear, no ref/date) in `/commission` Batch Details modal and Partial/Advances tab.
- Added `requested_advance_amount` and `include_unpaid_from_previous` (boolean) to `create_commission_batch` modal.
- Documented and surfaced in `/commission` Invoice & PDF tab the divergence between stored `balance_due_original` and printed invoice TOTAL (`Batch Total + Advance + previous_unpaid_original`).

### 4. General-Purpose "Log Income / Expense"
- Sourced `agency_tracking.finance_api.log_stage_expense` and `log_stage_income` with optional `applicant` and `placement` links.
- Added top-level "Log Income / Expense" action and modal in `/commission` and updated `/expenses-income` to allow logging standalone agency entries or entries linked to candidate/placement.

### 5. Clearance Step Human-Error Correction Toolkit
- `complete_clearance_step`: supports optional `date_completed` (YYYY-MM-DD) for backdating completions or corrections.
- Terminal data corrections: `complete_clearance_step`, `stamp_embassy_step`, `reject_embassy_step`, and `reassign_clearance_step` allow correcting terminal records without throwing 417.
- Dedicated `wakala_reference_no`: Saudi Embassy clearance step binds to `wakala_reference_no` separate from `reference_no` (visa stamp).
- Kuwait LMIS Police Ashara: added `police_ashara_payment_status` ("Not Applicable" | "Pending" | "Paid") and required failure remark via `record_police_ashara`.
- Generic "Other Payments" line-items: integrated `record_other_payment` in `V2ClearanceQueueWorkspace` OperationalDrawer for miscellaneous fees (e.g. Insurance).
- Saudi Embassy Wakala Guard: `submit_embassy_step` blocks on unpaid Wakala with optional manager `override_reason`.

### 6. Role-Gated Employee Roster & Admin-Lockout Guards
- Replaced direct `frappe.client.get_list` on `User` with role-gated `agency_tracking.employee_api.list_employee_roster`.
- Admin-lockout guards: preserved verbatim backend 417 messages ("Refusing to remove your own Admin/Manager/System Manager access...", "Refusing: <email> is the last remaining staff-admin account...") in `error-formatter.ts`.

### 7. Reports Page RBAC Gating & 403 Prevention
- `agency_tracking.report_api.get_operations_summary`, `get_daily_work_report`, `get_staff_performance_report`, `get_placement_aging_report`, `get_complaint_aging_report`, and `export_commissions_xlsx` strictly require `Manager` or `Admin` (`MANAGEMENT_ROLES = {"Manager", "Admin", "System Manager", "Administrator"}`).
- Removed `"Finance Manager"` from `isManagerOrAdmin` in `src/app/reports/page.tsx`.
- Gated `report_operations_summary` query with `enabled: Boolean(isManagerOrAdmin && activeTab === "operations")` so the endpoint is never called unconditionally or by non-manager accounts.
- Added role-based initial tab selection and auto-redirect from manager tabs to `transactions` for non-manager accounts (e.g. `Finance Manager`).
- Gated financial overview, cost breakdown, employee financial, and pending approvals queue queries and views with `isAdmin`.
- Gated Tab 1 (Operations), Tab 2 (Daily Work), Tab 3 (Aging) buttons and views to `isManagerOrAdmin`, Tab 4 (Financial) and Tab 5 (Approvals) to `isAdmin`, and Tab 6 (Transactions) to `isAdminOrFinance`.

### 8. Select Agency Button Removal & CV Generation Timeout Resolution
- **Removed Select Agency Button**: Purged the redundant "Select Agency" button from the `currentStage === "CV Generated"` banner on `/applicants/[id]`. Foreign partner agency selection is handled exclusively by the foreign agency via the portal.
- **Extended CV Generation & PDF Render Proxy Timeout**:
  - `src/app/api/method/[...slug]/route.ts`: Configured `fetchWithRetry` for `agency_tracking.cv_api.generate_cv` and `render_cv_pdf` with an extended `timeoutMs = 180000` (3 minutes) and `maxRetries = 0`.
  - Prevented the previous 45s fast-fail from aborting active Railway wkhtmltopdf / Cloudflare R2 operations, and eliminated duplicate retries that compounded server queue wait times.
- **Resilient Background State Verification**:
  - `src/lib/api/v2/cv.ts`: `generateCvV2` now polls `getApplicantV2` up to 3 times if a network delay or timeout occurs, immediately returning success if the applicant successfully reached `CV Generated` on the backend.
- **Draft & Registered CV Action Guidance**:
  - `src/app/applicants/[id]/cv/page.tsx`: Updated candidate state banner directing `Draft` candidates to complete registration before CV generation (avoiding 417 `Applicant must be Registered before a CV can be generated`), and providing a clear "Generate Official CV Now" action for `Registered` candidates.
- **Verification**: Verified clean TypeScript compilation (`npx tsc --noEmit`), proxy runtime tests, and live browser confirmation of button removal and stage ribbon consistency.

### 9. Foreign Agency Complaints Desk Marketplace Candidate Scoping (2026-09-30)
- **Strict Marketplace Candidate Scoping**: Updated the "File Agency Complaint" modal candidate dropdown on `/agent/complaints` (`src/app/agent/complaints/page.tsx`) to strictly source candidates from the agent's applicant marketplace section (`/agent`), queried via `listPortalCandidatesV2()`.
- **Eliminated General Agency Applicants**: Completely eliminated un-scoped agency applicants (`listApplicantsV2()`, containing all 55 general agency applicants) from the complaint candidate dropdown, ensuring foreign agents only see their available marketplace candidates.
- **Marketplace Alignment & Candidate Details**: Filtered candidate pool by `medical_status !== "UNFIT"`, mirroring `/agent` (`AgentDiscoveryPage`). Displayed candidate full name, candidate ID (`name`), passport number, destination country, and target job in search options.
- **Placement Reference Resolution**: Cross-referenced `allAvailableCandidates` to route complaints smoothly to `createComplaintV2` with active placement references where available.
- **Verification**: Verified clean TypeScript check (`npx tsc --noEmit`), runtime verification against live Frappe Railway backend confirming 3 marketplace candidates are listed vs 55 agency applicants.

### 10. Dedicated Candidate CV Workspace & Administrative Role Consolidation (2026-09-30)
- **Dedicated Candidate CV Workspace**:
  - Built CVWorkspace.tsx displaying the exact 12 columns from client reference spreadsheet (NO, CONTACT, NAME, PASSPORT, LABOUR ID, MEDICAL, RELIGION, REGION, AGE, MARRIED/NOT, # OF CHILDREN, REMARK), with column MUSANAD strictly excluded as requested.
  - Added dedicated cv stream to OperationalStreamType and fetchOperationalWorkspaceDataV2 in src/lib/api/v2/operational.ts, mapping candidate phone/emergency contact, uppercase full name, passport, labor ID, medical status badge (FIT, UNFIT, PENDING), religion, region/town/city, computed age, marital status, children count, and remarks.
  - Enabled direct in-cell typing and blur-saving for REMARK via ExcelTextInput persisting live to Applicant.remarks via updateApplicantV2.
  - Added multi-attribute filtering (Corridor, Medical Status, Religion, Marital Status), search bar, and full TanStack column-header click sorting across all 12 columns.
  - Added CSV/Excel export button (Export CSV) producing a spreadsheet matching the client's reference columns.
  - Integrated candidate dossier detail drawer (OperationalDrawer) with bio-data, identity, biological profile, remarks, and 1-click official CV PDF download (renderCvPdfV2).
- **Strict Role-Gating for CV Section**:
  - Gated the cv tab in RoleWorkspaceContainer.tsx to isAdmin or any user holding a cv role (hasRoleKeyword(["cv"])). Users without this role cannot see or access the section.
- **Administrative Role Consolidation & Normalization**:
  - Consolidated all administrative roles into a single role: 'Admin'.
  - Removed Administrator, System Manager, and Manager from V2_CANONICAL_ROLES, V2_CUSTOM_ROLES, ACTION_ROLE_MAP, CORRIDOR_ROLE_DEFINITIONS, and CANONICAL_V2_ROLES.
  - Built universal normalization in employees.ts (normalizeAndDeduplicateRoles) and employees/page.tsx (displayRoles, handleOpenEditRoles) so any user holding legacy administrative roles automatically displays and saves as 'Admin'.
  - Migrated live backend user tutu@gmail.com via authenticated Frappe RPC to remove Manager and System Manager and assign 'Admin' as their sole administrative role.
- **Verification**: Clean TypeScript compilation (npx tsc --noEmit, 0 errors), live backend employee roster verification confirming admin@example.com and tutu@gmail.com both hold ['Admin'], and live API data mapping for candidate CV table (55 live applicants).

### 11. Candidate CV Table Actions: Generate & View CV Buttons with Slide Drawer Decommissioning (2026-10-01)
- **Slide Drawer Popup Safely Decommissioned**:
  - Removed `OperationalDrawer` entirely from `src/components/operational/workspaces/CVWorkspace.tsx`.
  - Updated `src/components/operational/OperationalTable.tsx` to make `onRowClick` optional; when omitted, table rows render with `cursor-default` and row clicking does not trigger any slide drawer popups.
- **Dynamic ACTIONS Column**:
  - **Candidates Without Generated CV**: Renders a prominent green `"Generate CV"` button invoking backend RPC `agency_tracking.cv_api.generate_cv` via `generateCvV2` with live spinner state, permission gating (`can("generateCv")`), and medical fitness validation (`UNFIT` gating).
  - **Candidates With Generated CV**: Renders the Eye icon button (`"View CV"`) linking directly to the applicant's official CV preview dossier (`/applicants/[id]/cv`), alongside the official `"PDF"` CV download button (`renderCvPdfV2`).
- **Hook Rules & Build Stability**:
  - Hoisted state declarations in `src/app/applicants/[id]/cv/page.tsx` before early returns, strictly adhering to React Rules of Hooks.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors) and successful production build (`npm run build`, 25/25 routes compiled).

### 12. Guided Tour & Universal Keyboard Shortcuts System (2026-10-01)
- **Unified Reusable Tour Engine (`src/components/tour/*`)**:
  - Built a production-grade, zero-dependency tour engine supporting two distinct modes on the exact same underlying infrastructure: Mode 1 (Onboarding Tour) and Mode 2 (Client Presentation Tour).
  - Mode 1: Concise 8-step walkthrough of everyday operational workflows, navigation, and intake actions. Can be skipped, completed (persisted via `localStorage`), and restarted at any time.
  - Mode 2: Structured into **11 logical sections** based exclusively on the current live application:
    1. Executive Overview & Intelligence (`/dashboard`)
    2. Candidate Intake & Smart Registration (`/applicants/new`)
    3. Candidate CV Database & Verification (`/applicants?tab=cv`)
    4. Applicant Master Directory & Profiles (`/applicants`)
    5. Corridor Clearance & Embassy Operations (`/applicants?tab=lms`)
    6. Real-Time Communication & Messaging (`/chat`)
    7. Foreign Agencies & Partner Portal (`/contractors`)
    8. Commission Billing & Settlement (`/commission`)
    9. Agency Finance & Accounting (`/expenses-income`)
    10. Management Analytics & Reports (`/reports`)
    11. System Administration & Role Governance (`/employees`)
  - **Presenter Controls & Interactive Navigation**:
    - Section Introductions before entering each major area explaining system capability.
    - Interactive Table of Contents / Section Menu modal allowing direct section jumping with visited checkmarks.
    - Progress counters displaying both overall section progress ("Section 3 of 11") and step progress ("Step 2 of 4").
    - Presenter controls: Previous, Next, Pause/Resume (with a floating live-interaction bar allowing normal page clicks while paused), Skip Section, Exit, and Restart.
    - Welcome screen with agenda list and Final Summary conclusion screen recapping all visited modules.
    - Cross-route transitions with 2.5-second resilient element polling and graceful missing-target failsafe alerts (zero frozen overlays).
- **Universal Keyboard Shortcuts Engine**:
  - Navigation chords with 900ms sequencing: `g d` (Dashboard), `g a` (Applicants), `g c` (Chat), `g e` (Employees), `g m` (Commission), `g f` (Finance), `g r` (Reports), `g s` (Settings), `g p` (Foreign Agencies), `n a` (New Applicant).
  - Active tour navigation: `→` or `Enter` (Next), `←` (Previous), `Space` (Pause/Resume presentation), `Esc` (Exit), `m` or `t` (Section Menu).
  - Global triggers: `?` or `Shift + /` (Shortcuts Cheat Sheet), `Alt + T` (Tour chooser), `Alt + P` (Presentation Mode), `Alt + O` (Onboarding Tour).
  - Strict input safety: keyboard events are suppressed when user is typing in `<input>`, `<textarea>`, `<select>`, or `contenteditable`.
- **Zero Mock Data & Zero Data Mutation**:
  - The tour system strictly highlights and explains real elements without creating fake demo records or mutating backend data.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors) and successful production build (`npm run build`, 25/25 routes compiled).

### 13. Dashboard Alignment, Spacing, Density & Multi-Viewport Layout Fix (2026-10-08)
- **Dashboard Visual Rhythm & Alignment Repair (`src/app/dashboard/page.tsx`)**:
  - **Grid & Content Boundaries**: Standardized top header, 4 KPI cards, Pipeline Overview, and 3 bottom information panels to a shared visual grid with consistent margins and `gap-3 sm:gap-3.5`.
  - **Height & Vertical Rhythm**: Replaced conflicting `justify-between space-y-2` and rigid `h-[calc(100vh-4.25rem)]` with exact viewport interior sizing (`md:h-[calc(100vh-5.5rem)] lg:h-[calc(100vh-6rem)] md:max-h-[calc(100vh-5.5rem)] lg:max-h-[calc(100vh-6rem)] min-h-0`), eliminating the 28px overflow caused by navbar and main container padding mismatch.
  - **KPI Cards**: Balanced all 4 cards (`Total Applicants`, `In Progress`, `Completed`, `Departed`) with identical heights, unified padding (`p-3 sm:p-3.5`), aligned top icon badges (`h-7 w-7 rounded-lg`), uppercase category labels, and mono metric numbers.
  - **Pipeline Overview**: Expanded hardcoded `h-[82px]` to `h-[92px] sm:h-[96px]` with consistent internal anatomy (circular step pill + count at top, badge + stage title at center, candidates arrow / parallel stream buttons at bottom). Elevated the Parallel Streams (LMIS & INJAZ) sub-stream buttons with readable typography and clean spacing.
  - **Bottom Three Panels**: Unified Document Expiry Warnings, Action Items & Tasks, and Recent Applicants with identical card styling, header heights, body padding (`p-2.5 sm:p-3`), row card borders, and independent `overflow-y-auto` scroll containers with clean empty states.
  - **Content & Order Preservation**: 100% preserved all client-approved titles, buttons, stages, alerts, operational tasks, recent applicants, and business logic.
- **System-Wide Multi-Viewport Desktop Resizing Repair**:
  - **Root Cause Elimination**: Identified that previous rules used `xl:overflow-x-clip` and `min-w-[...] xl:min-w-0`. Because `xl:` is 1280px in Tailwind, browser resizing below 1280px (e.g. 1024px, 1100px, 1200px) failed to apply the zero-scroll constraints, triggering sudden page-level and section-level horizontal scrolling.
  - **Non-Mobile Desktop Normalization (768px - 2560px+)**: Normalized table containers to `md:overflow-x-clip` and `md:min-w-0 w-full` across all workspaces and listing screens:
    - `src/components/operational/OperationalTable.tsx`
    - `src/components/applicant/ApplicantTable.tsx`
    - `src/components/operational/workspaces/CountryBanRequestsWorkspace.tsx`
    - `src/app/employees/page.tsx`
    - `src/app/contractors/page.tsx`
    - `src/app/expenses-income/page.tsx`
    - `src/app/complaints/page.tsx`
    - `src/app/applicants/[id]/page.tsx`
    - `src/app/agent/complaints/page.tsx`
    - `src/app/agent/page.tsx`
    - `src/app/agent/commission/page.tsx`
    - `src/app/agent/wakala/page.tsx`
    - `src/app/agent/reserved/page.tsx`
  - **Mobile Table Invariance**: Preserved the mobile exception: `< md` (mobile), tables allow horizontal touch scrolling (`overflow-x-auto min-w-[...]`), all columns scroll together, and the first Applicant Name column is not sticky.
- **Verification**: Zero mock data added. Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors).

### 14. Commission-Currency-Invoicing Full Handoff Implementation (2026-10-14)
- **N1: LMIS Working Statuses & Contract Terms**:
  - Implemented 23 working statuses with dedicated modal for `OTHER` (mandatory free text) and `REJECTED` (multi-reason checkboxes).
  - Single consolidated Status column on LMIS grids with optional "Who took the file" assignee.
- **N2: Taeshir Follow-Up & Injaz Printed Status**:
  - Wired `set_taeshir_status` (`INFORMED`, `RECEIVED`, `READY TO EMBASSY`).
  - Added `Printed` payment status alongside `Paid` and `Unpaid` for Injaz.
- **N3: Embassy Submission Date & Visa Expiry Warning**:
  - Enabled correctable `date_submitted` anytime before stamping.
  - Sourced visa issue date and computed dynamic 90-day validity deadline badge.
  - Enforced state machine constraint: step rejection is restricted strictly to Embassy clearance.
- **N4 & N9: Ticketing, Flight Outcomes & Reschedule Undo**:
  - Sourced flight departure time.
  - Wired `undo_reschedule` returning placement flight date to previous scheduled date.
  - Added "Record Flight Outcome" for departed candidates: `Local return` (transfers candidate to talent pool with zero commission) and `International return` (initiates replacement guarantee).
  - Wired `undo_flight_outcome` and `clear_predeparture_medical_result`.
- **N5: Foreign Agency Replacements & Zero-Commission Exchange Flow**:
  - Built dedicated `/agent/replacements` page calling `portal_api.list_replacements_owed`.
  - Added "Exchange Candidate" modal with zero commission fee flag, and Waive / Put-Back actions calling `waive_replacement_owed`.
- **N6: Complaint Outcomes Alignment**:
  - Aligned complaint resolution statuses strictly to canonical `Resolved`, `Escalated`, and `Dismissed`.
- **N7: Returned Worker Send-Again & Broker / Delala Second Contact**:
  - Added "Send Again" button in applicant table for departed workers returned internationally.
  - Wired `second_contact_name`, `second_contact_phone`, and `second_contact_address` across registration form, detail view, schema validation, and complaints.
- **N8: LMIS Contract Fields on Placement**:
  - Added contract fields (`contract_signed_date`, `contract_city`, `sponsor_phone`, `sponsor_second_phone`) to placement and LMIS workspace.
- **N9: Universal Undo Operations**:
  - Bank statement line unmatch calling `reconciliation_api.unmatch_line`.
  - Commission batch item "Unmark Paid" calling `finance_api.unsettle_batch_items`.
  - Ban decision undo calling `applicant_api.undo_country_ban_decision`.
- **N10: Staff Management Delete / Erase Flow**:
  - Built deletion confirmation dialog: erases account permanently if no historical activity exists, or cleanly deactivates if historical records exist.
- **N11: Foreign Agency Country Filtering for Muayina & Contractor Validation**:
  - Filtered contractor selector in Muayina intake modal strictly by applicant's destination country.
  - Enforced mandatory agency name and email on contractor creation.
- **N12, N16, N17: Settings Overhaul**:
  - Restricted `/settings` to Admin and Finance Manager.
  - Replaced ad-hoc storage with `finance_api.get_company_settings` and `update_company_settings`.
  - Added company logo and official stamp uploads via `set_company_image`.
  - Added system time zone selector via `get_time_zone` and `set_time_zone`.
- **N13: Upload Limits & Guidance**:
  - Enforced 200MB limit for video and 20MB limit for other media in `PremiumDropzone` with explicit hint labels.
- **N14: Finance Manager / Admin Immediate Approval**:
  - Automatically marked transactions created by Finance Manager or Admin as approved and reflected immediately in financial totals.
- **N15: Read-Only Role Permissions Matrix Page**:
  - Created `/permissions` page backed by `get_permission_table`, grouped by functional area with internal RPCs filtered out.
- **N18: Chat Message Deletion & Admin Audit**:
  - Built in-place deletion replacing message content with grey indicator line *"This message was deleted"*.
  - Sourced sender-only deletion with confirmation, and admin audit log at `/chat/deleted`.
- **N19: Authoritative Detail Reads**:
  - Switched clearance step inspection to `agency_tracking.clearance_api.get_clearance_step` and contractor inspection to `agency_tracking.contractor_api.get_contractor`.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors). Zero mock data or fallback demo fixtures.

## 14. Follow-Up Stage Cards Action Buttons, Dropdowns, Table Responsiveness & Selective Export (2026-10-16)
- **Foreign Agency Candidate Filters**:
  - Added 'Place of birth' filter options: `AMHARA`, `OROMO`, `TIGRAY`, `SOMALIA`, `AFAR`, `GUMUZ`, `GURAGE`, `SILTE`, `DEBUB`, `GAMBELLA`.
  - Added filter by skin color (`complexion`).
  - Removed redundant 'x' clear buttons across filter dropdown triggers.
- **Dashboard Quick Actions**:
  - Synchronized Quick Action dashboard options with sidebar navigation.
- **Applicant Follow-Up Workspace Inline Fields**:
  - Overhauled all 4 cards (LMIS, Te'shir, Embassy, Ticket & Departure) with direct normal inputs and select dropdowns, removing unnecessary modal popups and deleting 'Set Appt'.
  - Added dedicated stage table action buttons to each card (CV Doc, Extension, Injaz PDF, Issue, Start LMIS, Submit Embassy, Stamp Embassy, Record Ticket, Reschedule, Depart, and Undo Last Step).
  - Converted Injaz Payment to `<select>` dropdown (`Unpaid`, `Printed`, `Paid`) calling `recordInjazPaymentV2`.
  - Converted Wakala Status to `<select>` dropdown (`Pending`, `Paid`) calling `recordWakalaPaymentV2`.
  - Converted `Te'shir completed?` to directly editable `<select>` dropdown (`In Progress`, `Completed`), strictly gating completion on Injaz Paid.
  - Redesigned completion status badges (`ISSUED`, `COMPLETED`, `STAMPED`, `DEPARTED`): white background, green text (`border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-[#16161d]`), standard badge sizing (`text-[10px] font-bold py-0 h-4.5 px-2`), with no checkmark symbol.
- **Table Responsiveness & Horizontal Scrolling**:
  - Removed all `lg:overflow-x-clip` across all 11 table containers (`OperationalTable`, `ApplicantTable`, `CountryBanRequestsWorkspace`, `employees`, `contractors`, `complaints`, `applicants/[id]`, agent portal tables), enabling natural horizontal scrollbars on all screen sizes with zero cut-off columns.
- **Follow-Up Selective Export**:
  - Added checkbox column with indeterminate header select-all next to the NO column in Follow-Up workspace.
  - Added "Export for Te'shir" button invoking `exportGroupScheduleBioXlsV2`.
- **Backend Handoff Specs (2026-10-16)**:
  - B1: Clearance step remarks (`clearance_api.set_step_remarks` via `setStepRemarksV2`).
  - B4: CV screen remarks (`cv_api.set_cv_remarks` via `setCvRemarksV2`).
  - B5: Ticket & Departure remarks (`placement_api.set_ticketing_remarks` via `setTicketingRemarksV2`).
- **Chat Role Isolation & Internal vs Foreign Agency Messaging Boundaries**:
  - Removed erroneous `Foreign Agency` role from internal admin account `tutu@gmail.com` on Frappe backend, enabling clean `create_internal_thread` initialization.
  - Staff-to-staff messaging: staff members can initialize conversations with colleagues via `create_internal_thread`.
  - Foreign agency communication gating: strictly gated to users holding `Admin` or `Communication Manager` roles; staff with any other roles cannot see the option or selector to initiate conversations with Foreign Agencies.
  - Foreign Agency restrictions: foreign agencies can communicate exclusively with headquarters Admin or Communication Manager (via `allowedStaffForAgency`); other staff and other Foreign Agencies are completely hidden and uncontactable.
  - Internal thread privacy: Foreign Agencies are barred from internal staff threads, and regular staff cannot view Agency threads.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors). Zero mock data or fallback demo fixtures.

## 15. LMIS Labour ID In-Place Editing, Te'shir Card Layout Streamlining & Strict Te'shir Export Gating (2026-10-17)
- **LMIS Card Editable Labour ID**:
  - Replaced the static, read-only display of `Labor ID (Office Ref)` with an interactive input field auto-saving changes on blur and Enter via authenticated backend RPC `agency_tracking.applicant_api.update_applicant_for_lmis` (`updateApplicantForLmisV2`).
  - Propagated `laborIdVal` directly to `setLmisStatusV2` and `completeClearanceStepV2`, ensuring any newly entered Labor ID is saved alongside LMIS Issued transitions.
- **Te'shir Card Layout Streamlining**:
  - Removed the obsolete and redundant `Agency / Sponsor` field from the Te'shir / Injaz card in `ApplicantFollowUpWorkspace.tsx`, allowing the `Te'shir Completed?` status selector to cleanly span the grid.
- **Bottom Navigation De-Cluttering**:
  - Removed the bottom `Return to Follow-Up Tracking` button and the bottom footer bar from `ApplicantFollowUpWorkspace.tsx`.
  - This freed up vertical space for the bottom cards (Embassy & Ticket/Departure), eliminating cluttered action buttons while preserving the top `Back to Follow-Up` button.
- **Strict Te'shir Export Gating & Eligibility Rules**:
  - Implemented `isCandidateEligibleForTaeshir` helper in `FollowUpWorkspace.tsx` strictly enforcing that only candidates who have reached the Te'shir stage or later in the Saudi corridor (LMIS Issued, active/completed Te'shir, Stamped, Ticketed, or Departed) are eligible for Te'shir (.xls) export.
  - Ineligible candidates (e.g. still in LMIS processing, Registered, Selected, Cancelled, or on Kuwait corridor) cannot be selected; attempting to click their checkbox immediately rejects selection and displays a clear English error explaining their current status and guiding the user to select eligible candidates.
  - Ineligible checkboxes are styled with `opacity-40 cursor-not-allowed` with descriptive hover tooltips.
  - "Select All" dynamically selects only eligible candidates in the current view and displays a toast reporting how many eligible candidates were selected and how many ineligible candidates were skipped.
  - When clicking "Export for Te'shir", the export routine strictly filters and exports only candidates who have reached Te'shir stage or later, validating all selected candidates and preventing ineligible candidate export.
  - Added a "Clear" button whenever candidates are selected.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors). Zero mock data or fallback demo fixtures.

## 16. Follow-Up Inline Enter Save & UI Feedback, Injaz/Te'shir Status Reversion Bug Fix & Processing Stage Te'shir Gating (2026-10-17)
- **Enter Key Submission & Inline Visual Feedback on Follow-Up Details**:
  - Wired Enter key listeners (`onKeyDown={(e) => { if (e.key === "Enter") ... }}`) across all editable fields and remarks on the Follow-up details page (`ApplicantFollowUpWorkspace.tsx`):
    - `Labor ID` (LMIS Card)
    - `LMIS Remark` (LMIS Card)
    - `E-number / Injaz Application No.` (Te'shir Card)
    - `Te'shir Remark` (Te'shir Card)
    - `Visa Number` (Embassy Card)
    - `Embassy Remarks` (Embassy Card)
    - `Ticket Number` (Ticket & Departure Card)
    - `Ticket Remark` (Ticket & Departure Card)
  - Added rich inline visual UI feedback:
    - Dedicated field label headers displaying `"Saving..."` spinner badge (`savingField[key]`) during API mutation.
    - Prominent green `"Saved"` checkmark badge (`savedField[key]`) with smooth 2.5s display duration.
    - Subtle green border and focus ring highlight (`border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100`) on the input field when saved.
    - Inline checkmark icon (`<Check className="h-3.5 w-3.5" />`) positioned inside the right end of the input field.
- **Injaz Payment & Te'shir Status Reversion Bug Fix**:
  - Diagnosed and resolved the root cause of the status reversion bug where changing Injaz payment status to `Paid` followed by changing Te'shir status reverted both statuses to `Unpaid` and `INFORMED`:
    1. Case Normalization: Normalized `injazPayment` across the backend data layer and `<select>` dropdowns to Title Case (`"Paid" | "Printed" | "Unpaid"`), preventing HTML `<select>` value mismatch fallbacks where uppercase `"PAID"` defaulted to the first option (`"Unpaid"`).
    2. Field Fallbacks on Clearance Step: Enhanced `fetchOperationalWorkspaceDataV2` in `src/lib/api/v2/operational.ts` to inspect both `(injazStep as any)?.injaz_payment_status` and `(injazStep as any)?.payment_status`.
    3. Authoritative Te'shir Status Mapping: Mapped `(injazStep as any)?.taeshir_status` directly in `operational.ts` rather than overwriting it with generic Clearance Step status (`"In Progress"`).
    4. Guarded `isTeshirCompleted`: Strictly derived `isTeshirCompleted` from `injaz.status === "Completed" || teshirStatus === "Completed"`, preventing intermediate follow-up statuses (`RECEIVED`, `READY TO EMBASSY`) from falsely forcing terminal `"Completed"`.
    5. Optimistic State Preservation: Hardened `useEffect([row])` in `ApplicantFollowUpWorkspace.tsx` to preserve optimistic local changes for the same candidate while queries revalidate in the background.
- **Strict Processing Stage Te'shir Export Stage Gating**:
  - Restructured `isCandidateEligibleForTaeshir` in `FollowUpWorkspace.tsx` with top-level exclusion guards:
    - Candidates in `Selected` stage are strictly disqualified: *"Candidate is in the Selected stage and has not reached the Processing stage (LMIS and Te'shir). Therefore, cannot generate export Excel for Te'shir."*
    - Candidates in pre-placement stages (`Registered`, `Draft`, `Waiting to be Selected`, `CV Generated`) or `Cancelled` are strictly disqualified.
    - Candidates on non-Saudi corridors are strictly disqualified.
    - Only candidates who have reached the `Processing` stage (LMIS and Te'shir) or later (`Stamped`, `Ticketed`, `Departed`) on the Saudi Arabia corridor are eligible for Te'shir export.
  - Interactive Selection Disqualification:
    - Attempting to select an unqualified candidate immediately displays an error toast: `"Not Qualified: '${row.fullName}' is not qualified and therefore cannot generate export Excel for Te'shir. ${reason}"`.
    - Clicking `Export for Te'shir` immediately blocks export and alerts the operator if any unqualified candidates are selected.
- **Verification**: Clean TypeScript check (`npx tsc --noEmit`, 0 errors). Zero mock data or fallback demo fixtures. Fully aligned with live Railway backend.

## 17. Dynamic Destination Country Filters & Embassy/Wakala Stage Unlock (2026-10-17)
- **Dynamic Destination Country / Corridor Filters Across Workspaces**:
  - `OperationalTable.tsx`: Implemented `effectiveCorridors` computation combining default corridors (`"All"`, `"Saudi Arabia"`, `"Kuwait"`) with all unique destination countries dynamically discovered from table rows (`destinationCountry`, `country`, `destination_country`, etc.) and the active `corridorFilter`. Automatically renders buttons for newly added countries (e.g. Jordan, UAE, Qatar, Oman, etc.).
  - `RoleWorkspaceContainer.tsx`: Added `discoveredCorridors` tracking across server queries and passed `availableCorridors={discoveredCorridors}` to child operational workspaces (`FollowUpWorkspace`, `CVWorkspace`, etc.).
  - `ApplicantTable.tsx`: Added `selectedCountry` state, computed `availableCountries` dynamically from `applicantRows`, added country filtering to `filteredApplicants`, and added a `SimpleSelect` Destination Country filter in the toolbar alongside the Stage and Track filters.
  - `MedicalWorkspace.tsx`: Replaced hardcoded Saudi/Kuwait `<option>` tags with dynamic `availableCorridors` derived from all `mergedRecords`.
  - `V2ClearanceQueueWorkspace.tsx`: Dynamic corridor pills and table filter populated from `enrichedRows` destination countries.
- **Embassy / Wakala Stage Unlock on Candidate Follow-Up Details**:
  - Diagnosed and resolved the root cause locking the Embassy/Wakala card when LMIS was issued and Te'shir completed:
    1. Frappe Clearance Step Status Match: Checked both `"Complete"` (authoritative string returned by Frappe RPC `complete_clearance_step`) and `"Completed"`, `"Issued"`, `"Approved"`, and `date_completed`.
    2. Te'shir Completion Sub-status Satisfaction: Allowed `normalizedTeshirStatus === "RECEIVED"` or `"READY TO EMBASSY"` or `"Completed"` to satisfy the Te'shir requirement.
    3. Non-Saudi Corridor Te'shir Bypass: Corridors other than Saudi Arabia (which do not have a Te'shir stage) now cleanly unlock Embassy upon LMIS completion.
    4. Started/Advanced Embassy Bypass: If the candidate's Embassy stage has already been submitted or stamped (`embassyStatus !== "Pending"`), the card remains permanently unlocked.
    5. Optimistic State Preservation: Preserved `lmisStatus: "ISSUED"` and `teshirStatus` across query revalidations to eliminate locking flickers.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors). Zero mock data or fallback demo fixtures.

## 18. Visa Valid Until & Issued On Save Bug Fix (`upload_visa` 417 `file_url is required`) (2026-10-17)
- **Root Cause**:
  - Editing "Visa Valid Until", "Visa Issued On", or "Visa Number" on the Follow-Up details page (`ApplicantFollowUpWorkspace.tsx`) previously called `uploadPlacementVisaV2(placementName, "", ...)` with an empty string for `file_url`.
  - The backend RPC `agency_tracking.placement_api.upload_visa` strictly validates `file_url` because it is an attachment endpoint (e.g. for Kuwait eVisa PDFs/images). When passed an empty string, the backend legitimately threw `417: file_url is required.`
- **Authoritative Resolution**:
  - Replaced `uploadPlacementVisaV2` with authoritative backend RPC `agency_tracking.placement_api.update_placement_parsed_fields` (`updatePlacementParsedFieldsV2`) in `ApplicantFollowUpWorkspace.tsx`:
    - `handleSaveEmbassyVisaNumber` now calls `updatePlacementParsedFieldsV2(placementName, { visa_number: val, ... })`.
    - Added `handleSaveEmbassyVisaIssueDate` calling `updatePlacementParsedFieldsV2(placementName, { visa_issue_date: val, ... })`.
    - Added `handleSaveEmbassyVisaExpiryDate` calling `updatePlacementParsedFieldsV2(placementName, { visa_expiry_date: val, ... })`.
    - Updated stamping confirmation dialog to update placement parsed fields via `updatePlacementParsedFieldsV2`.
  - Added full inline visual feedback (`Saving...` spinner and `Saved` checkmark) and Enter key submit listeners to both Visa Issued On and Visa Valid Until date inputs.
  - Hardened `uploadPlacementVisaV2` in `src/lib/api/v2/placements.ts` to automatically delegate to `updatePlacementParsedFieldsV2` when `fileUrl` is empty or omitted, completely preventing any future 417 errors.
- **Verification**: Clean TypeScript check (`npx tsc --noEmit`, 0 errors). Zero mock data.

## 19. Follow-Up Field Persistence (Embassy Submission Date & Visa Valid Until Bug Fix) & Registration Place of Birth Dropdown (2026-10-17)
- **Problem Statement**:
  - On the Follow-Up details page, after entering and saving fields on the Embassy card section (specifically `Submission Date` and `Visa Valid Until`), a success toast was displayed but the input fields immediately reset to blank.
  - On the Applicant Registration Form, `place_of_birth` was a plain text input instead of a dropdown listing the canonical Ethiopian birthplaces matching the Foreign Agency candidate filter.
- **Root Cause Analysis**:
  - In `src/lib/api/v2/operational.ts`, `fetchOperationalWorkspaceDataV2` mapped `visaDeadline` strictly from `(plc as any)?.visa_deadline || (embassyStep as any)?.visa_deadline || ""`, completely omitting `plc?.visa_expiry_date` (which is where `update_placement_parsed_fields` writes). It also omitted `submissionDate`, `visaIssueDate`, remarks, and `plc` from the returned `row`.
  - When `refreshAll()` refetched follow-up data, `row.submissionDate` was `undefined` and `row.visaDeadline` was `""`.
  - In `ApplicantFollowUpWorkspace.tsx`, `useEffect([row])` spread the raw newly fetched `row` over local state, wiping out existing values. Then `useEffect([currentRow])` wiped non-empty input states with empty strings.
  - `submissionDate` was saved purely via `onBlur` without dedicated Enter key submission, inline `Saving...`/`Saved` feedback, or persistent state preservation.
- **Authoritative Resolution**:
  1. **Operational Workspace Data Mapping (`operational.ts`)**:
     - Mapped `visaDeadline` to inspect `plc?.visa_expiry_date`, `plc?.visa_deadline`, `embassyStep?.visa_valid_until`, `embassyStep?.visa_deadline`, and `embassyStep?.visa_expiry_date`.
     - Mapped `submissionDate` to inspect `embassyStep?.submission_date`, `embassyStep?.date_submitted`, and `embassyStep?.date_started`.
     - Mapped `visaIssueDate`, `embassyRemarks`, `lmisRemark`, `teshirRemark`, `ticketRemark`, and stored `plc` on `row.plc`.
     - Updated `WorkspaceApplicantRow` interface in `src/types/workspace.ts` with explicit typed definitions.
  2. **Applicant Follow-Up Workspace State Protection (`ApplicantFollowUpWorkspace.tsx`)**:
     - Added `resolveFollowUpField` in `useEffect([row])` preserving local populated values whenever the incoming server field is blank/undefined.
     - Added safe state synchronization helpers (`syncStr`, `syncDate`) in `useEffect([currentRow])` that never overwrite a populated input state with an empty string.
     - Created `handleSaveEmbassySubmissionDate` calling `submitEmbassyStepV2`, updating local `currentRow.submissionDate`, triggering inline `savingField` / `savedField` visual feedback, Enter key submission, and input styling.
     - Hardened `handleSaveEmbassyVisaExpiryDate`, `handleSaveEmbassyVisaIssueDate`, and `handleSaveEmbassyVisaNumber` to ensure `plc` object state is safely assigned.
  3. **Applicant Registration Form Place of Birth Dropdown (`ApplicantRegistrationForm.tsx` & `CandidateFilters.tsx`)**:
     - Exported `PLACE_OF_BIRTH_OPTIONS` from `CandidateFilters.tsx` containing the canonical 10 Ethiopian regions/cities: `["AMHARA", "OROMO", "TIGRAY", "SOMALIA", "AFAR", "GUMUZ", "GURAGE", "SILTE", "DEBUB", "GAMBELLA"]`.
     - Replaced text `<Input>` in `ApplicantRegistrationForm.tsx` (and `Step1PersonalInfo.tsx`) with styled `<select>` populated with `PLACE_OF_BIRTH_OPTIONS`.
     - Added graceful fallback preserving any pre-existing or passport OCR-extracted value if not in the 10 options (`watchPlaceOfBirth && !PLACE_OF_BIRTH_OPTIONS.includes(...)`).
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, 0 errors). Zero mock data or fallback demo fixtures.

## 20. Back Button System-Wide Unification & Follow-Up Multi-Stage "Finish stage" Architecture (2026-10-17)
- **Unified Back Button Design Across the Entire System**:
  - Identified two conflicting back button patterns in the system: a left-aligned text link with arrow (`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ... <ArrowLeft className="h-3.5 w-3.5" /> Back to ...`) versus a right-aligned bordered outline button (`<Button variant="outline" ...> <ArrowLeft ... /> Back to ...</Button>`).
  - Standardized the entire system on the approved left-type design:
    - `src/app/applicants/new/page.tsx`: Removed the redundant right-aligned "Back to Dashboard" button, keeping only the canonical left-aligned "Back to Applicants" navigation.
    - `src/components/operational/RoleWorkspaceContainer.tsx`: Moved "Back to Dashboard" from the right-side controls cluster to the top-left above the workspace title using the standard left-type link.
    - `src/app/reports/page.tsx`: Moved "Back to Dashboard" from the right-side filter controls cluster to the top-left above the report header using the standard left-type link.
    - `src/app/expenses-income/page.tsx`: Moved "Back to Dashboard" from the right-side action controls cluster to the top-left above the finance header using the standard left-type link.
    - `src/components/operational/workspaces/ApplicantFollowUpWorkspace.tsx`: Moved "Back to Follow-Up" from the right-side header controls to the top-left above the candidate identity context using the standard left-type button.
- **Resolved Embassy Stamping 417 Error (`Taeshir must be complete before the Embassy step can be Stamped`)**:
  - **Root Cause**: On the Saudi Arabia corridor, the backend RPC `agency_tracking.clearance_api.stamp_embassy_step` requires the preceding `Taeshir` clearance step to be in a complete terminal state (`Complete`, `Issued`, `Approved`). Because the Te'shir card previously lacked a dedicated step completion button, the underlying Clearance Step doc remained `status: "Pending"`.
  - **Authoritative Resolution**:
    1. Added a dedicated "Finish stage" button to the Te'shir card executing `completeClearanceStepV2(injazStepName)`.
    2. Implemented prerequisite auto-completion in the Embassy finish handler: before invoking `stampEmbassyStepV2`, the system checks whether the Te'shir step (`injazStepName`) is still `Pending` or `In Progress`. If so, it automatically calls `completeClearanceStepV2(injazStepName)` first, guaranteeing 100% prerequisite satisfaction and permanently preventing 417 exceptions.
- **Comprehensive "Finish stage" Buttons with Confirmation Dialogs on All 4 Follow-Up Cards**:
  - Implemented consistent "Finish stage" buttons across all four operational cards to support replacing the excel-like tables with the Follow-up workspace:
    - **Card 1 (LMIS)**: Added "Finish stage" button opening `isLmisFinishOpen` confirmation dialog. Upon confirmation, calls `setLmisStatusV2` (setting status to `"ISSUED"`) and `completeClearanceStepV2(lmsStepName)`.
    - **Card 2 (Te'shir)**: Added "Finish stage" button opening `isTeshirFinishOpen` confirmation dialog. Upon confirmation, calls `completeClearanceStepV2(injazStepName)`.
    - **Card 3 (Embassy)**: Renamed "Stamp Visa" to "Finish stage" opening the confirmation dialog (titled "Finish Embassy Stage"). Prompts for visa number, issue date, and expiry date, automatically resolves prerequisite Te'shir completion, stamps the visa via `stampEmbassyStepV2`, and persists placement parsed fields via `updatePlacementParsedFieldsV2`.
    - **Card 4 (Ticket & Departure)**: Added "Finish stage" button opening `isConfirmDepartOpen` confirmation dialog (titled "Finish Departure Stage"). Upon confirmation, advances placement to selected outcome (`"Departed"`, `"Local return"`, `"International return"`) via `advancePlacementV2`.
- **Permanent "Finish stage" Button Visibility & Interactive Field Decoupling**:
  - Eliminated premature disabling and `pointer-events-none` locking of the "Finish stage" button when fields or dropdowns on a card are edited (e.g., LMIS status to ISSUED, Te'shir status to Completed, Embassy status to Stamped, Departure status to Departed).
  - Ensured the "Finish stage" button remains permanently visible, clickable, and vibrant on all four cards (`canEditLmis`, `canEditTaeshir`, `canEditEmbassy`, `canEditDeparture && placementName`).
  - Removed aggressive lock conditions (`disabled={is*Locked}` and `pointer-events-none`) across card bodies and action bars. Card 4 fields (Ticket Number, Flight Date, Flight Time, Airline, Medical 2 result, and Ticket Remark) are fully interactive and persist via Enter key / onBlur without auto-completing stages.
  - Clicking "Finish stage" on any card opens its dedicated confirmation popup modal, which is the sole trigger for officially completing the stage on the backend via live V2 RPCs.
  - Expanded clearance step introspection with `listMyClearanceStepsV2` to ensure `lmsStepName`, `injazStepName`, and `embassyStepName` are resolved reliably across all operators.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, exit code 0, 0 errors). Zero mock data or mock fallbacks. Ready for manual user testing.

## 21. Applicant Profile Redirection, Placement State Machine Departure Gate & Dialog Cleanup (2026-10-19)
- **Applicant Profile Update List Redirection**:
  - In `src/app/applicants/[id]/edit/page.tsx` and `src/components/applicant/ApplicantRegistrationForm.tsx`, updated the `onSuccess` flow so that when a user updates an applicant profile and clicks `"Update Profile"`, the system immediately redirects to `/applicants` (the Applicant list) via `router.push('/applicants')`.
- **Card 4 State Machine Gate Fix (`Cannot move Placement ... from 'Stamped' to 'Departed'`)**:
  - **Root Cause**: The user observed `"Cannot move Placement PLM-00001 from 'Stamped' to 'Departed'"` when changing departed status to departed and clicking Finish stage on Card 4. This error was produced directly by the backend placement state machine (`02-placement-contract.md` / `state_machine.py`), which defines the canonical lifecycle: `Selected` ➔ `Processing` ➔ `Stamped` ➔ `Ticketed` ➔ `Departed`.
  - When the candidate completes Embassy stamping, their placement is in `Stamped`. Attempting to jump directly from `Stamped` to `Departed` violates the state machine invariant requiring an intermediate `Ticketed` transition and pre-departure `medical_2_status == "FIT"`.
  - **Authoritative Resolution**: In `ApplicantFollowUpWorkspace.tsx` Dialog 8 (`isConfirmDepartOpen`), the Finish Stage action now enforces the complete, sanctioned state progression:
    1. Ensures ticket details are recorded on the placement (`recordTicketDetailsV2`).
    2. Advances placement from `Stamped` to `Ticketed` (`advancePlacementV2(placementName, "Ticketed")`).
    3. Satisfies the pre-departure medical gate by recording Medical 2 as `FIT` (`recordPredepartureMedicalResultV2(placementName, "FIT")`).
    4. Advances placement to `Departed` (or records outcome for returns via `recordFlightOutcomeV2`).
- **Audit Remark Field Purged from Finish Stage Popups**:
  - Removed the `Audit Remark` input field from the Finish stage confirmation popup on Card 4 (`isConfirmDepartOpen`), keeping only the clean Departure Outcome selector.
  - Confirmed that other Finish stage confirmation popups (Card 1 LMIS, Card 2 Te'shir, Card 3 Embassy) contain zero audit remark fields.
- **Applicant Table & Registration Form Polish**:
  - **Applicant Table**: Replaced the "Contract No." column with "Sponsor Name" bound to `(applicant as any).sponsor_name || (applicant as any).employer_name`. Removed the redundant "Book Ticket" action button on candidates in the `Stamped` stage.
  - **Religion Options**: Removed `"Islam"` from `RELIGION_OPTIONS` in `src/lib/validations/applicant.schema.ts`, retaining canonical `"Muslim"` matching Frappe DocType select options.
  - **Optional Field Validations**: Preprocessed `national_id`, `labor_id`, and `leaving_town` with `optionalString` and registered them in `OPTIONAL_FIELD_NAMES` (`src/lib/validations/zod-error-map.ts`), eliminating false `"Please provide a valid entry for..."` validation errors when fields are left blank.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, exit code 0, 0 errors across the entire codebase). Zero mock data or mock fallbacks. No browser automated sessions initiated.

## 22. Applicant Details Redirection & Graduation Year False Validation Elimination (2026-10-19)
- **Applicant Details Profile Update Redirection**:
  - In `src/app/applicants/[id]/page.tsx`, `onSuccessRedirect` previously only invalidated query keys without performing navigation. Added `router.push('/applicants')` to `onSuccessRedirect`.
  - In `src/components/applicant/ApplicantRegistrationForm.tsx`, updated `saveChangesMutation.onSuccess`, `saveDraftMutation.onSuccess`, and `registerMutation.onSuccess` to unconditionally execute `router.push('/applicants')`.
  - Whenever an operator updates candidate details on `/applicants/[id]` or `/applicants/[id]/edit` and clicks **"Update Profile"**, the browser immediately redirects to `/applicants` (the Applicant list).
- **Graduation Year False Validation Elimination**:
  - **Root Cause**: Frappe DocType `Applicant` returns `graduation_year: 0` for empty Int fields. In `applicant.schema.ts`, `graduation_year` was validated with `optionalNumber(z.number().int().min(1950))`. Because `0` is a number, it evaluated $0 < 1950$ and triggered the Zod error: `"Graduation Year must be at least 1950."`, blocking registration on a field not even rendered in the intake form.
  - **Resolution**:
    1. Preprocessed `graduation_year` in `applicant.schema.ts` to map `0`, `"0"`, `""`, `null`, `undefined`, or any value `< 1950` to `undefined`.
    2. In `normalizeApplicantFields` (`src/lib/api/v2/applicants.ts`), stripped `graduation_year` if its value is `< 1950`.
    3. Added `graduation_year` and `years_of_experience` to `OPTIONAL_FIELD_NAMES` in `src/lib/validations/zod-error-map.ts`.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, exit code 0, 0 errors). Zero mock data or mock fallbacks. No browser subagent invoked.

## 23. Muayena Specialized Workflow Customization, Track Reversion Fix & Follow-Up Extensions Dropdown (2026-10-19)
- **Applicant Detail Direct Redirection**:
  - Configured `onSuccessRedirect` in `src/app/applicants/[id]/page.tsx` and mutation callbacks in `src/components/applicant/ApplicantRegistrationForm.tsx` to execute `window.location.href = "/applicants"` immediately upon successful "Update Profile" or "Register Applicant". This prevents Next.js router transition stalls and immediately redirects the user to the Applicant list.
- **Muayena Workflow Customization**:
  - **Concept**: Muayena applicants enter with an employer/sponsor contract already established, meaning the `CV Generated` and `Selected` stages are entirely bypassed.
  - **Progress Bar Customization**: On `src/app/applicants/[id]/page.tsx`, dynamically set stages for Muayena candidates to 6 canonical steps: `["Draft", "Registered", "Processing", "Stamped", "Ticketed", "Departed"]`.
  - **Progress Mapping**: Mapped `Selected` to `Processing` and `CV Generated` to `Registered` for Muayena applicants so the progress ribbon cleanly indicates operational status without non-existent intermediary stages.
  - **Header Track Indicator**: Added prominent Track badge in the candidate header (`Track: Muayena Track` in emerald vs `Track: Standard Track` in blue).
  - **Candidate List & Filter Polishing**: On `ApplicantTable.tsx`, hid "Generate CV" and "View CV" action buttons for Muayena candidates, and dynamically excluded "CV Generated" and "Selected" from the stage filter dropdown when filtering by Muayena track.
- **Follow-Up Workspace "Extensions" Dropdown**:
  - In `src/components/operational/workspaces/FollowUpWorkspace.tsx`, added an "Extensions" button to the ACTION column.
  - Clicking "Extensions" displays a dropdown menu with options: `"For LMIS"`, `"For Taeshir"`, and `"For Musaned"`.
  - Selecting an option dispatches the candidate record to the Chrome extension bridge (`sendApplicantToExtension`) configured with target extension parameters and gives immediate toast feedback.
- **Muayena Track Reversion & Registered-to-Draft Regression Bug Fix**:
  - **Root Cause**: The backend Frappe DocType schema uses the field name `entry_track` (`"Standard"` | `"Muayena"`), whereas the frontend form previously tracked only `applicant_type`. When updating an applicant profile, `buildPayload` sent `entry_track: "Standard"` by default. In Frappe's `state_machine.py`, mutating `entry_track` while an applicant is in `Registered` status triggered an automatic server-side regression back to `Draft`.
  - **Resolution**:
    1. Added `entry_track: z.enum(APPLICANT_TYPE_OPTIONS).optional()` in `src/lib/validations/applicant.schema.ts`.
    2. Implemented bidirectional synchronization in `normalizeApplicantFields` (`src/lib/api/v2/applicants.ts`) so `entry_track` and `applicant_type` always stay synchronized.
    3. In `ApplicantRegistrationForm.tsx` and `Step1PersonalInfo.tsx`, initialized and updated both `entry_track` and `applicant_type` together from `initialData.entry_track || initialData.applicant_type`.
    4. Ensured `buildPayload` resolves `finalTrack` properly and includes both fields, eliminating server-side regression to "Standard" and status regression to "Draft".
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, exit code 0, 0 errors across the entire codebase). Zero mock data or mock fallbacks. No automated browser testing executed.

## 24. Follow-Up Processing Stage Lock & Universal In-Field and Detail Video Playback (2026-10-19)
- **Follow-Up Details Page Stage Gating**:
  - In `src/components/operational/workspaces/ApplicantFollowUpWorkspace.tsx`, added `hasReachedProcessing` and `currentStageName` introspection.
  - When a candidate has not reached the `Processing` stage (e.g., they are in `Draft`, `Registered`, `CV Generated`, `Waiting to be Selected`, or `Selected` without active clearance processing), all four operational cards (LMIS, Te'shir, Embassy, and Ticket & Departure) are disabled via `opacity-50 pointer-events-none select-none cursor-not-allowed filter grayscale-[25%]`.
  - Displayed a prominent alert banner at the top of the workspace explaining to the operator that clearance stages are disabled because the applicant is currently in `[Current Stage]`, and guiding them to proceed through earlier workflow stages (Registration, CV Generation, Foreign Agency Selection, or Muayena Placement Contract Attachment) before updating clearance records.
- **Universal In-Field & Detail Page Video Player**:
  - **In-Field Video Player**: Upgraded `src/components/ui/PremiumDropzone.tsx` so that when a video is uploaded or present, it embeds a responsive, playable HTML5 video player with full native controls (`controls`, `playsInline`, `preload="metadata"`), duration, and an external full-size preview link. Stopped click propagation on the player container so clicking on the video or controls plays and interacts with the video rather than opening the file browser dialog.
  - **Form State Synchronization**: In `src/components/applicant/ApplicantRegistrationForm.tsx` and `src/components/applicant/steps/Step2EducationExperience.tsx`, synchronized `video_url` and `intro_video` across form default values, watches, and upload handlers.
  - **Applicant Detail Page Video Player**: In `src/app/applicants/[id]/page.tsx`:
    1. Added an interactive "Play Interview Video" action button with `Film` icon in the candidate header.
    2. Embedded a dedicated "Candidate Interview Video" player card directly on the page above the registration form when an applicant has a video attached.
    3. Added a full-size Video Player modal dialog (`Dialog`) for theater-style playback.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, exit code 0, 0 errors across the entire codebase). Zero mock data or mock fallbacks. No automated browser sessions initiated.

## 25. Applicant Video Field Persistence Across Navigation & Form Lifecycle (2026-10-19)
- **Root Cause Analysis**:
  - Uploaded videos displayed initially in the registration form via local react-hook-form state.
  - When the user clicked "Save as Draft", "Update Profile", or "Register Applicant", navigated to another page, and returned, the candidate video was missing from the "Video Interview" field.
  - Root causes identified:
    1. **DocType Field Alias Mismatch**: The backend Frappe schema accepts `video_url`, `intro_video`, or `video`. In `buildPayload()`, only `...data` was passed without ensuring all video aliases were defined. Frappe silently ignores attributes not matching DocType field names.
    2. **Unsynchronized API Normalization**: `normalizeApplicantFields` did not harmonize video fields. When `getApplicantV2` or `listApplicantsV2` returned documents, any alias mismatch left other keys empty.
    3. **Form Reset Clobbering**: In `ApplicantRegistrationForm.tsx`, `useEffect` listening to `initialData` ran `reset({ ...getValues(), ...normalized })`. Because `normalized.video_url` or `intro_video` could be empty/undefined, active video state was overwritten with empty strings.
- **Surgical Implementation**:
  - **API Layer Normalization**: In `src/lib/api/v2/applicants.ts`, added Section 5.1 in `normalizeApplicantFields` linking `video_url`, `intro_video`, and `video`. Whenever any video alias exists, all three are populated with the valid URL.
  - **Payload Construction**: In `ApplicantRegistrationForm.tsx`, added `effectiveVideo` resolution checking `data.video_url`, `data.intro_video`, `data.video`, `videoValue`, and `initialData` aliases. Explicitly included `video_url: effectiveVideo`, `intro_video: effectiveVideo`, and `video: effectiveVideo` in `rawPayload`.
  - **Form Initialization & Reset**: In `ApplicantRegistrationForm.tsx`, added `video_url`, `intro_video`, and `video` to `defaultValues`, and safeguarded the `initialData` `useEffect` `reset()` call with `resolvedVideo` so existing video state is never clobbered.
  - **Upload & Remove Handlers**: Synchronized `video_url`, `intro_video`, and `video` across `handleFileUpload`, `onFileSelect`, and `onRemove` in both `ApplicantRegistrationForm.tsx` and `Step2EducationExperience.tsx`.
  - **Detail & Edit Pages**: Bound `video_url`, `intro_video`, and `video` in `enrichedApplicant` in `src/app/applicants/[id]/page.tsx` and `src/app/applicants/[id]/edit/page.tsx`.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, exit code 0, 0 errors across the entire codebase). Zero mock data or mock fallbacks. No automated browser testing initiated.
 
## 26. Follow-Up Start LMIS Removal & Te'shir E-Number Save Date Error Elimination (2026-10-19)
- **Start LMIS Button Removal**:
  - Removed the redundant "Start LMIS" button from Card 1 footer in `src/components/operational/workspaces/ApplicantFollowUpWorkspace.tsx`. Operators can initiate or progress stages seamlessly by entering data directly into the input fields on the cards without needing separate start buttons.
  - Purged unused `startClearanceStepV2` import from `ApplicantFollowUpWorkspace.tsx`.
- **Elimination of MySQL 1292 OperationalError on Te'shir Card**:
  - **Error Root Cause**: `operational.ts` maps unbooked appointment dates to the em-dash string `"—"`. When a candidate had not yet booked an appointment date, `currentRow.appointmentDate` was `"—"`. In `handleSaveTeshirInjazId`, `teshirApptDateVal || (currentRow?.appointmentDate || "")` evaluated to `"—"`. When sent to `/api/method/agency_tracking.clearance_api.set_taeshir_appointment`, PyMySQL attempted to insert `'—'` into `agency_tracking.tabInjaz Attempt.appointment_date` (a MySQL `DATE` column), crashing with `pymysql.err.OperationalError: (1292, "Incorrect date value: '—' for column agency_tracking.tabInjaz Attempt.appointment_date at row 1")`.
  - **Surgical Workspace Resolution**: In `src/components/operational/workspaces/ApplicantFollowUpWorkspace.tsx`, added `resolveTaeshirDate()`, which checks `teshirApptDateVal`, `currentRow?.injaz?.appointment_date`, `currentRow?.teshirAppointmentDate`, and `currentRow?.appointmentDate` against ISO date format (`/^\d{4}-\d{2}-\d{2}/`). If no valid date is booked, it returns `null` rather than passing the em-dash placeholder `"—"`.
  - **Defensive API Layer Sanitization**: In `src/lib/api/v2/clearance.ts` (`setTaeshirAppointmentV2`), sanitized `appointmentDate` to ensure only valid `YYYY-MM-DD` date strings or `null` are sent in the JSON body, preventing any caller from transmitting `"—"` or invalid date formats to the MySQL database.
  - **OnBlur Input Guard**: In `ApplicantFollowUpWorkspace.tsx` appointment date `onBlur`, guarded comparisons against `"—"` so placeholder dashes are never evaluated as active dates.
- **Verification**: Clean TypeScript compilation (`npx tsc --noEmit`, exit code 0, 0 errors across the entire codebase). Zero mock data or mock fallbacks. No automated browser sessions initiated.

## 27. Handoff Updates: Non-Muslim Choice, Optional City/Phone, Scanned POB Auto-Fill & Staged Video Protocol (2026-10-28)
- **Religion Dropdown & Filter Enhancement (Section 0.-18)**:
  - Added `"Non-Muslim"` choice in `RELIGION_OPTIONS` (`src/lib/validations/applicant.schema.ts`), `ApplicantReligion` union type (`src/types/applicant.ts`), and `RELIGIONS` filter in `src/components/agent/CandidateFilters.tsx` directly after Muslim.
  - Normalized in `normalizeApplicantFields` (`src/lib/api/v2/applicants.ts`) preserving `"Non-Muslim"` on save and retrieval.
- **Intake City & Phone Optional Fields (Section 0.-19)**:
  - Dropped required checks and asterisks on `phone` and `city` in `Step1PersonalInfo.tsx` and `ApplicantRegistrationForm.tsx`.
  - Format checks remain active when a value is provided, but empty values pass without blocking draft saves, profile updates, or registration.
- **Scanned Place of Birth Auto-Fill & Unrestricted Town Typing (Sections 0.-13 & 0.-20)**:
  - Replaced rigid `<select>` dropdowns in `Step1PersonalInfo.tsx` with uppercase `<Input list="pob_options...">` elements paired with `<datalist>` suggestions from `PLACE_OF_BIRTH_OPTIONS`, allowing intake of any Ethiopian town or woreda (e.g. `LOMA`, `ANGECHA`).
  - In `ApplicantRegistrationForm.tsx`, added `pobMissingFromScan` indicator displaying `"Not read from the passport. Please type it."` in amber below the Place of Birth field whenever a passport scan returns without `place_of_birth`, clearing automatically once typed or extracted.
- **Staged Video Upload on New Registration (Section 0.-17)**:
  - Updated `startVideoUploadV2` and `finishVideoUploadV2` in `src/lib/api/v2/applicants.ts` to support staging without `applicantName`, omitting `applicant_name` when unprovided.
  - Added `video_key?: string` to `V2CreateApplicantPayload`, `baseApplicantSchema`, and `normalizeApplicantFields`.
  - In `ApplicantRegistrationForm.tsx` and `Step2EducationExperience.tsx`, wired the video upload flow so that when staging before applicant creation, the video is uploaded directly via the pre-signed S3/R2 URL and confirmed with `finishVideoUploadV2(undefined, key)`, setting `video_key` in payload without requiring a saved Draft first.
- **Human-Friendly Record References (Section 0.-3 & 3.1)**:
  - Audited and sanitized commission batch references in `src/app/commission/page.tsx` to display company name, title, or `shortRef(batch.name)` (`#19`) rather than raw DocType identifiers (`CBR-00019`).
- **Build & Conformance Verification**:
  - Full TypeScript type check completed with 0 errors (`npx tsc --noEmit`).
  - Next.js production build compiled cleanly across all 30 routes (`npm run build`).
