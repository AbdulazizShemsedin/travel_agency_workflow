# PHASE 2: V1 → V2 FRONTEND MIGRATION BLUEPRINT

**Document Version**: 1.0.0  
**Target Backend**: `https://agencytracking-production.up.railway.app`  
**Execution Mode**: READ-ONLY ARCHITECTURAL SPECIFICATION — NO SOURCE CODE MODIFIED  
**Authoritative Backend Contract**: `swagger.json` (agency_tracking v1.0.0) + Live Railway Runtime Responses  

---

## 1. EXECUTIVE SUMMARY

The Travel Agency Workflow frontend is transitioning from an obsolete legacy Frappe V1 architecture (`applicant_processing` module, direct `/api/resource/*` table mutations, and joined DocTypes) to the new **Backend V2 architecture (`agency_tracking` module)**.

### Core Principles of This Blueprint:
1. **Preserve Good UI/UX**: The rich layout, dark mode styling, responsive full-width data grid ([`OperationalTable.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/OperationalTable.tsx)), and operational flyout ([`OperationalDrawer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/OperationalDrawer.tsx)) are retained 100%.
2. **Replace Obsolete V1 Business Logic**: Completely eliminate legacy joined models (`Applicant Dossier`, `DSR`, hardcoded discrete clearance tables `LMS Clearance`, `Injaz Clearance`, `Wakala Clearance`).
3. **Use Live V2 Contracts**: Integrate directly with the verified RPC functions in [`src/lib/api/v2/`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/).
4. **Zero Guesswork / Zero Mocks**: Do NOT fabricate endpoints or response fields. Blocked features are explicitly identified and staged for backend completion.

---

## 2. INVENTORY OF THE CURRENT FRONTEND

| Layer / Area | File Paths / Locations | Current V1 Implementation & Technology | Current State / Gotchas |
| :--- | :--- | :--- | :--- |
| **Pages & Routes** | `src/app/` (21 routes) | Next.js App Router (`/applicants`, `/agent/*`, `/dashboard`, `/reports`, `/commission`, `/complaints`, `/contractors`, `/employees`, `/expenses-income`, `/settings`, `/notifications`, `/login`) | Functional UI shell; data loaders fail due to V1 API calls. |
| **Layout & Shell** | `src/components/layout/AppLayoutClient.tsx`, `AppSidebar.tsx`, `AppNavbar.tsx` | Full-width responsive sidebar + top navbar with notification bells and profile flyout | **Preserve 100%**. Clean, modern design system. |
| **Dashboard** | `src/app/dashboard/page.tsx` | Metric cards and quick status counters calling `applicant_processing.api.get_operations_summary` | Throws 417 error because old method does not exist. |
| **Applicant Directory** | `src/app/applicants/page.tsx`, `ApplicantTable.tsx` | TanStack-driven data table querying `GET /api/resource/Applicant` | Throws 417 error due to obsolete field names (`applicant_state`, `job_applied`). |
| **Registration** | `src/app/applicants/new/page.tsx`, `ApplicantRegistrationForm.tsx` | 5-step wizard (Personal Info, Passport, Medical, Skills, Review) | Valid UI structure; needs field name alignment with V2. |
| **Applicant Detail** | `src/app/applicants/[id]/page.tsx` | Comprehensive candidate dossier view with lifecycle timeline tabs | Reconfigure tabs to read from `Placement` & `Clearance Step`. |
| **Processing Workspaces** | `src/components/operational/workspaces/` (5 files) | `LMISWorkspace.tsx`, `InjazWorkspace.tsx`, `WakalaWorkspace.tsx`, `EmbassyWorkspace.tsx`, `DepartureWorkspace.tsx` | Hardcoded around 5 separate V1 DocTypes. Must be rewired to generic `Clearance Step` RPCs. |
| **Operational Table** | `src/components/operational/OperationalTable.tsx` | Virtualized excel-like data grid with column selector, status filtering, and urgency alerts | **Preserve 100%**. Reconfigure data adapter to accept `V2ClearanceStepItem[]`. |
| **Operational Drawer** | `src/components/operational/OperationalDrawer.tsx` | Action flyout for step assignments, document uploads, and phase completions | **Preserve 100%**. Reconfigure button actions to call V2 RPC transitions. |
| **Finance & Ledger** | `src/app/expenses-income/page.tsx` | Stage income/expense ledger calling `/api/resource/Income Expense Log` | Wire to `agency_tracking.finance_api.*` and approval queue. |
| **Commissions** | `src/app/commission/page.tsx`, `src/app/agent/commission/page.tsx` | Contractor commission tracking calling `/api/resource/Applicant Departure` | Wire to `agency_tracking.finance_api.get_owed_commissions`. |
| **Complaints Desk** | `src/app/complaints/page.tsx`, `src/app/agent/complaints/page.tsx` | Incident logging and resolution table calling `/api/resource/Agency Complaint` | Wire to `agency_tracking.complaint_api.*`. |
| **Notifications & Push**| `src/app/notifications/page.tsx`, `PushNotificationToggle.tsx` | Bell flyout + Web Push toggle calling `/api/resource/Notification Config` | Wire to `agency_tracking.notification_api.*`. |
| **Chat & Threads** | `src/components/agent/` | Internal and foreign agency communication channels | Wire to `agency_tracking.chat_api.*`. |
| **User Admin** | `src/app/employees/page.tsx` | Employee list & role assignment calling `get_system_users` and `/api/resource/User` | **BLOCKED** — No documented user creation/role assignment RPC in Swagger. |
| **Auth & Proxy** | `src/lib/api/auth.ts`, `src/app/api/method/[...slug]/route.ts` | Next.js API Route handler with cookie and CSRF token transparent forwarding | **Verified & Working**. Session cookie auth active. |
| **State Management** | `src/lib/store/systemStore.ts` | Static mock applicants and fallback records | **Retire mocks**. Replace with live React Query / SWR / RPC fetch hooks. |
| **Permissions** | `src/lib/auth/permissions.ts` | Role guard checks based on 7 legacy V1 role names | Update to canonical 16 custom roles in [`v2Roles.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/v2Roles.ts). |

---

## 3. FEATURE CLASSIFICATION TABLE

| Feature / Subsystem | Current Implementation | V1 Dependency | V2 Replacement | Classification | Reason |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **App Layout & Navbar** | `AppLayoutClient.tsx`, `AppNavbar.tsx` | Client session context | `agency_tracking.auth_api.get_current_user` | **KEEP** | Clean, responsive, full-width UI structure is completely valid. |
| **Authentication Flow** | `login/page.tsx`, `auth.ts` | `POST /api/method/login` | Session cookie `sid` + CSRF header | **KEEP** | Already verified working 100% end-to-end against Railway. |
| **Corridor Step Flow** | Static boolean country checks | Hardcoded client checks | `agency_tracking.corridor_engine.get_corridor_steps` | **REPLACE** | Dynamic data-driven engine replaces hardcoded frontend assumptions. |
| **Applicant Directory** | `ApplicantTable.tsx` | `GET /api/resource/Applicant` | `listApplicantsV2Adapter()` / `get_applicant` | **KEEP + REWIRE** | TanStack table UI is retained; data source rewired to V2 field schema. |
| **Applicant Registration**| `ApplicantRegistrationForm.tsx` | `POST /api/resource/Applicant` | `agency_tracking.applicant_api.register_applicant` | **RECONFIGURE** | Form steps remain; field payload aligns with V2 schema (`target_job`, `photograph`). |
| **Applicant Profile** | `applicants/[id]/page.tsx` | `GET /api/resource/Applicant` | `agency_tracking.applicant_api.get_applicant` | **KEEP + REWIRE** | Detail view retained; lifecycle tabs rewired to `Placement` and `ClearanceStep`. |
| **Candidate CV View** | `applicants/[id]/cv/page.tsx` | `generate_cv` RPC | `agency_tracking.applicant_api.generate_cv` | **KEEP + REWIRE** | PDF renderer retained; RPC endpoint path updated. |
| **Agent Marketplace** | `src/app/agent/page.tsx`, `CandidateCard.tsx` | `GET /api/resource/Applicant` | `agency_tracking.portal_api.list_portal_candidates` | **KEEP + REWIRE** | Foreign agency candidate browsing rewired to standard-track catalog RPC. |
| **Candidate Selection** | `ContractRequestModal.tsx` | `Applicant Dossier` creation | `agency_tracking.portal_api.select_candidate` | **REPLACE** | Atomic selection RPC directly creates `Placement` and initializes clearance steps. |
| **Muayena Placement** | *(None in V1)* | *(None)* | `agency_tracking.placement_api.create_muayena_placement` | **NEW FEATURE** | Direct direct-hire pipeline for Muayena track applicants. |
| **Operational Grid** | `OperationalTable.tsx` | Joined 9 DocType queries | `agency_tracking.clearance_api.list_my_clearance_steps` | **KEEP + REWIRE** | Powerful excel grid retained; row data feeds from live clearance steps. |
| **Clearance Action Flyout**| `OperationalDrawer.tsx` | Discrete sub-table PUTs | `start_clearance_step`, `complete_clearance_step`, `submit/stamp` | **KEEP + REWIRE** | Action drawer retained; submit actions trigger canonical V2 transitions. |
| **LMIS Workspace** | `LMISWorkspace.tsx` | `LMS Clearance` DocType | Generic clearance queue filtered by `step_type: "LMIS Clearance"` / `"Kuwait LMIS"` | **RECONFIGURE** | Retain workspace UI; feed data from generic clearance API. |
| **Taeshir Workspace** | `InjazWorkspace.tsx` | `Injaz Clearance` DocType | Generic clearance queue filtered by `step_type: "Taeshir"` | **RECONFIGURE** | Rename Injaz ➔ Taeshir; feed data from generic clearance API. |
| **Wakala Workspace** | `WakalaWorkspace.tsx` | `Wakala Clearance` DocType | Wakala payment reminders on Placement / Portal | **REMOVE / MERGE** | Retired as standalone clearance step queue; merged into Embassy view & reminders. |
| **Embassy Workspace** | `EmbassyWorkspace.tsx` | `Embassy Clearance` DocType | `agency_tracking.clearance_api.submit_embassy_step` & `stamp_embassy_step` | **RECONFIGURE** | Retain Monday submission / Thursday stamping batch actions. |
| **Ticketing & Departure**| `DepartureWorkspace.tsx` | `DSR Departure` DocType | `placement_api.record_ticket_details` & `record_reschedule` | **RECONFIGURE** | Retain flight management UI; wire to Placement ticketing RPCs. |
| **Expenses & Income** | `expenses-income/page.tsx` | `/api/resource/Income Expense Log`| `finance_api.log_stage_expense` & `log_stage_income` | **KEEP + REWIRE** | Retain ledger UI; wire to V2 finance RPCs and approval queue. |
| **Commission Ledger** | `commission/page.tsx` | `/api/resource/Applicant Departure`| `finance_api.get_owed_commissions` & `create_commission_batch` | **KEEP + REWIRE** | Retain contractor commission UI; wire to V2 batching engine. |
| **Complaints Desk** | `complaints/page.tsx` | `Agency Complaint` DocType | `complaint_api.list_unresolved_complaints` & `resolve_complaint` | **KEEP + REWIRE** | Retain complaint triage UI; wire to V2 complaint engine. |
| **Web Push & Alerts** | `PushNotificationToggle.tsx` | `Notification Config` DocType | `notification_api.subscribe_push` & `get_push_subscription_status` | **KEEP + REWIRE** | Retain toggle component; wire to V2 Web Push endpoints. |
| **Internal & Agent Chat**| `src/app/agent/` | Local storage / mock | `chat_api.list_threads`, `send_message`, `get_thread_messages` | **KEEP + REWIRE** | Wire chat drawers directly to V2 RPCs. |
| **Reports Engine** | `reports/page.tsx` | `get_operations_summary` | `report_api.get_cost_breakdown_report` & `get_employee_financial_report` | **RECONFIGURE** | Reconfigure report widgets to live V2 aggregation endpoints. |
| **User Administration** | `employees/page.tsx` | `get_system_users` & DocPerm | *None in Swagger* | **BLOCKED** | Swagger v1.0.0 has no user management RPCs. |
| **System Mock Store** | `src/lib/store/systemStore.ts` | Hardcoded mock records | Direct React Query / API calls | **REMOVE** | Prohibit all mock/fake fallbacks in production. |

---

## 4. APPLICANT MIGRATION & SCHEMA MAPPING

### 4.1 Field Mapping: V1 Assumption vs. Live V2 Backend Reality

| V1 Legacy Assumption (`Applicant`) | Live V2 Backend Schema (`Applicant`) | Data Type | Notes & Transformation Rule |
| :--- | :--- | :---: | :--- |
| `name` | `name` | `string` | **Exact Match** (`APP-00001`). |
| `applicant_state` | **`status`** | `string` | **Renamed**: Values are `"Draft"`, `"Registered"`, `"CV Generated"`, `"Cancelled"`. |
| *(Missing in V1)* | **`entry_track`** | `"Standard" \| "Muayena"` | **New**: Determines whether candidate goes to Agent Portal or direct Muayena Placement. |
| `job_applied` | **`target_job`** | `string` | **Renamed**: e.g., `"Housemaid"`, `"Driver"`. |
| `photo_passport` | **`photograph`** | `string` (URL) | **Renamed**: `/private/files/...` path to passport-size photo. |
| `photo_full_body` | `photo_full_body` | `string` (URL) | **Exact Match**. |
| `passport_scan` | `passport_scan` | `string` (URL) | **Exact Match**. |
| `monthly_salary` | **`salary_amount`** | `number` | **Renamed**: Numeric salary value (e.g. `1500`). |
| *(Implicit SAR)* | **`salary_currency`** | `string` | **New**: e.g. `"SAR"`, `"KWD"`, `"USD"`, `"ETB"`. |
| `destination_country`| `destination_country` | `string` | **Exact Match**: `"Saudi Arabia"`, `"Kuwait"`. |
| `medical_status` | `medical_status` | `string` | **Exact Match**: `"FIT"`, `"UNFIT"`, `"Pending"`. |
| `medical_expiry_date`| `medical_expiry_date` | `string` (Date) | **Exact Match**. |
| `medical_date` | `medical_issue_date` | `string` (Date) | **Renamed**: Issue date of GAMCA/FIT certificate. |
| `coc_status` | `coc_status` | `string` | **Exact Match**. |
| `skill_*` (8 booleans)| `skill_*` (8 integers) | `0 \| 1` | **Type Note**: Backend returns `0` or `1` integer flags. |
| `emergency_contact_*`| `emergency_contact_*` | `string` | **Exact Match** (name, phone, address). |
| *(Missing in V1)* | **`fee_required`** | `0 \| 1` | **New**: Indicates whether registration fee is required. |
| *(Missing in V1)* | **`fee_status`** | `"Pending" \| "Paid"` | **New**: Registration fee payment status. |
| *(Missing in V1)* | **`registration_fee_amount`**| `number` | **New**: Amount charged for registration. |
| *(Missing in V1)* | **`active_placement`** | `string \| null` | **New**: Link to active `Placement` document (`PLM-00001`). |
| *(Missing in V1)* | **`cycle_number`** | `number` | **New**: Increments if candidate is restarted after cancellation. |

---

## 5. APPLICANT ➔ PLACEMENT ➔ CLEARANCE ARCHITECTURE

```
                               ┌───────────────────────────┐
                               │     Applicant (V2)        │
                               │  - status: CV Generated   │
                               │  - entry_track: Standard  │
                               └─────────────┬─────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
         [Standard Track Selection]                       [Muayena Track]
                       │                                           │
         POST portal_api.select_candidate            POST placement_api.create_muayena_placement
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │      Placement (V2)       │
                               │  - name: PLM-00001        │
                               │  - applicant: APP-00001   │
                               │  - destination_country    │
                               │  - status: Active         │
                               └─────────────┬─────────────┘
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             │ Auto-generates Corridor Steps from `get_corridor_steps`        │
             ▼                                                               ▼
   [Saudi Arabia Corridor]                                         [Kuwait Corridor]
   ├── Step 1: LMIS Clearance                                      ├── Step 1: Kuwait LMIS
   ├── Step 2: Taeshir                                             ├── Step 2: Telesign
   └── Step 3: Embassy                                             └── Step 3: Kuwait Embassy
             │                                                               │
             └───────────────────────────────┬───────────────────────────────┘
                                             │ (All Steps Completed)
                                             ▼
                               ┌───────────────────────────┐
                               │    Placement Ticketing    │
                               │  - record_ticket_details  │
                               │  - record_reschedule      │
                               │  - status: Departed       │
                               └───────────────────────────┘
```

### Architectural Key Rules:
1. **Applicant is Independent of Contract**: An Applicant represents the candidate's personal and credential profile.
2. **Placement Represents Deployment**: A single applicant can have multiple placement cycles across their lifetime (tracked by `cycle_number`), but only **one** `active_placement` at any given moment.
3. **Clearance Steps Belong to Placement**: All clearance steps point to `placement: "PLM-00001"`. Completing all mandatory steps advances the Placement to ticketing.

---

## 6. CORRIDOR & WORKSPACE MIGRATION

### 6.1 Country Corridors Reconciled

* **Saudi Arabia Corridor**:
  1. `LMIS Clearance` (Labor Ministry approval)
  2. `Taeshir` (Visa biometrics & processing)
  3. `Embassy` (Visa stamping & passport clearance)
* **Kuwait Corridor**:
  1. `Kuwait LMIS` (Labor clearance)
  2. `Telesign` (Digital clearance & attestation)
  3. `Kuwait Embassy` (Embassy endorsement & stamping)

### 6.2 Workspace Component Strategy

```
src/components/operational/
├── OperationalTable.tsx        ──> Unified Data Grid (Reused 100%)
├── OperationalDrawer.tsx       ──> Unified Action Flyout (Reused 100%)
└── DynamicCorridorWorkspace.tsx──> Single Generic Workspace Component
    ├── Mode: "lmis"     (Filters: "LMIS Clearance" | "Kuwait LMIS")
    ├── Mode: "taeshir"  (Filters: "Taeshir" | "Telesign")
    ├── Mode: "embassy"  (Filters: "Embassy" | "Kuwait Embassy" + Monday/Thursday Actions)
    └── Mode: "departure"(Filters: Placement Ticketing & Flight Queues)
```

---

## 7. OPERATIONAL UI REUSE SPECIFICATION

### 7.1 [`OperationalTable.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/OperationalTable.tsx)
* **Preservation**: Retain full virtualized grid, TanStack column filtering, column visibility dropdown, urgency date highlighting (remaining medical days), and action trigger buttons.
* **Adapter Transformation**: Map each `V2ClearanceStepItem` (`name`, `placement`, `step_type`, `status`, `sequence_order`, `is_mandatory`) into the row data model.

### 7.2 [`OperationalDrawer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/OperationalDrawer.tsx)
* **Preservation**: Retain side flyout panel with applicant photo, metadata summary, document previewers, and action button container.
* **Action Handlers**:
  * Step Status `"Pending"` ➔ Button: **"Start Step"** ➔ calls `agency_tracking.clearance_api.start_clearance_step({ step_name })`.
  * Step Status `"In Progress"` ➔ Button: **"Complete Step"** ➔ calls `agency_tracking.clearance_api.complete_clearance_step({ step_name })`.
  * Step Type `"Embassy"` ➔ Buttons: **"Submit to Embassy (Monday)"** & **"Record Stamped (Thursday)"** ➔ calls `submit_embassy_step` / `stamp_embassy_step`.
  * Reassign ➔ Form: **"Reassign Officer"** ➔ calls `agency_tracking.clearance_api.reassign_clearance_step({ step_name, new_employee })`.

---

## 8. ROLES AND PERMISSIONS MIGRATION

### 8.1 16 Canonical V2 Roles Taxonomy

```
[System & Executive]
├── Admin                (Full administrative platform control)
└── Manager              (Cross-department operational oversight & overrides)

[Intake & Identity]
├── Registrar            (Candidate registration, document intake, CV generation)
└── Contract Parser      (OCR contract, visa, and passport document parsing)

[Clearance Operations]
├── Clearance Officer    (Cross-corridor clearance management)
├── Saudi LMIS           (Saudi LMIS clearance execution)
├── Saudi Taeshir        (Saudi Taeshir biometric processing)
├── Saudi Embassy        (Saudi embassy batch submissions & stamping)
├── Kuwait LMIS          (Kuwait labor clearance execution)
├── Kuwait Telesign      (Kuwait digital attestation)
└── Kuwait Embassy       (Kuwait embassy batch submissions & stamping)

[Logistics & Departure]
└── Ticketer             (Flight booking, ticketing, reschedule logging)

[Finance & Governance]
├── Finance Manager      (Expense approvals, income receipts, FX rates, commission batches)
├── Complaint Manager    (Incident intake, escalation, resolution)
├── Communication Manager(Agency & internal messaging)
└── Foreign Agency       (External portal: candidate selection & Wakala requests)
```

### 8.2 Authorization Strategy
* **Backend is Authoritative**: Every RPC endpoint strictly validates permissions on Frappe session cookies.
* **Frontend Guards**: [`src/lib/auth/permissions.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/permissions.ts) checks `user.roles` against [`src/lib/auth/v2Roles.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/v2Roles.ts) to conditionally render navigation links, action buttons, and financial inputs.

---

## 9. API CLIENT MIGRATION & ENDPOINT MAP

| Frontend Area | API Module | Authoritative V2 Method | Method Type | CSRF Required? | V2 Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Authentication** | `src/lib/api/v2/auth.ts` | `POST /api/method/login` | RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.auth_api.get_current_user` | RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.auth_api.get_csrf_token` | RPC | No | **LIVE VERIFIED** |
| | | `POST /api/method/logout` | RPC | Yes | **DOCUMENTED** |
| **Applicants** | `src/lib/api/v2/applicants.ts` | `agency_tracking.applicant_api.register_applicant` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.applicant_api.get_applicant` | RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.applicant_api.generate_cv` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.applicant_api.cancel_applicant` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.applicant_api.restart_applicant` | RPC | Yes | **DOCUMENTED** |
| **Foreign Agency** | `src/lib/api/v2/portal.ts` | `agency_tracking.portal_api.list_portal_candidates`| RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.portal_api.select_candidate` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.portal_api.list_my_wakala_requests`| RPC | No | **LIVE VERIFIED** |
| **Placements** | `src/lib/api/v2/placements.ts` | `agency_tracking.placement_api.create_muayena_placement`| RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.placement_api.upload_contract` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.placement_api.upload_visa` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.placement_api.record_ticket_details` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.placement_api.record_reschedule` | RPC | Yes | **DOCUMENTED** |
| **Corridors** | `src/lib/api/v2/corridor.ts` | `agency_tracking.corridor_engine.get_corridor_steps`| RPC | No | **LIVE VERIFIED** |
| **Clearance Steps** | `src/lib/api/v2/clearance.ts` | `agency_tracking.clearance_api.list_my_clearance_steps`| RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.clearance_api.start_clearance_step` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.clearance_api.complete_clearance_step`| RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.clearance_api.submit_embassy_step` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.clearance_api.stamp_embassy_step` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.clearance_api.reassign_clearance_step`| RPC | Yes | **DOCUMENTED** |
| **Finance** | `src/lib/api/v2/finance.ts` | `agency_tracking.finance_api.get_fx_rate` | RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.finance_api.log_stage_expense` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.finance_api.log_stage_income` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.finance_api.approve_expense` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.finance_api.get_owed_commissions` | RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.finance_api.create_commission_batch` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.finance_api.settle_batch` | RPC | Yes | **DOCUMENTED** |
| **Reports** | `src/lib/api/v2/finance.ts` | `agency_tracking.report_api.get_pending_approval_queue`| RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.report_api.get_employee_financial_report`| RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.report_api.get_cost_breakdown_report` | RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.report_api.get_complaint_aging_report` | RPC | No | **LIVE VERIFIED** |
| **Complaints** | `src/lib/api/v2/complaints.ts` | `agency_tracking.complaint_api.list_unresolved_complaints`| RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.complaint_api.log_complaint` | RPC | Yes | **DOCUMENTED** |
| | | `agency_tracking.complaint_api.resolve_complaint` | RPC | Yes | **DOCUMENTED** |
| **Messaging** | `src/lib/api/v2/communication.ts`| `agency_tracking.chat_api.list_threads` | RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.chat_api.send_message` | RPC | Yes | **DOCUMENTED** |
| **Notifications** | `src/lib/api/v2/notifications.ts`| `agency_tracking.notification_api.get_push_subscription_status`| RPC | No | **LIVE VERIFIED** |
| | | `agency_tracking.notification_api.subscribe_push` | RPC | Yes | **DOCUMENTED** |
| **Documents** | `src/lib/api/v2/documents.ts` | `agency_tracking.document_api.parse_passport_file` | Multipart | Yes | **DOCUMENTED** |
| | | `agency_tracking.document_api.parse_contract_file` | Multipart | Yes | **DOCUMENTED** |
| | | `agency_tracking.document_api.parse_visa_file` | Multipart | Yes | **DOCUMENTED** |

---

## 10. DASHBOARD MIGRATION

| Dashboard Metric / Widget | V2 Backend Data Source | Classification | Action |
| :--- | :--- | :---: | :--- |
| **Active Clearance Queue Count** | `agency_tracking.clearance_api.list_my_clearance_steps` | **VERIFIED DATA** | Display count of steps in queue. |
| **Pending Expense Approvals** | `agency_tracking.report_api.get_pending_approval_queue` | **VERIFIED DATA** | Display count and total Birr pending manager approval. |
| **Open Complaints Count** | `agency_tracking.complaint_api.list_unresolved_complaints` | **VERIFIED DATA** | Display count of unresolved complaints. |
| **Foreign Agency Candidates** | `agency_tracking.portal_api.list_portal_candidates` | **VERIFIED DATA** | Display count of available pool candidates. |
| **Total Expenses by Corridor** | `agency_tracking.report_api.get_cost_breakdown_report` | **VERIFIED DATA** | Render bar chart by country Birr total. |
| **Employee Activity Summary** | `agency_tracking.report_api.get_employee_financial_report`| **VERIFIED DATA** | Render leaderboard of submitted/approved amounts. |
| **Funnel SLA & Turnaround Times**| *None in Swagger* | **BACKEND GAP** | Omit until backend publishes analytics RPC. |

---

## 11. FINANCE & REPORTS MIGRATION

### 11.1 Expense & Income Workflow
1. Employee logs stage expense (`log_stage_expense`) or income (`log_stage_income`) referencing `placement` (`PLM-00001`).
2. Amounts in non-ETB currencies are converted using current FX rates (`get_fx_rate`).
3. If amount exceeds employee limit, transaction is queued in `get_pending_approval_queue`.
4. Finance Manager approves transaction via `approve_expense({ transaction_name })`.

### 11.2 Commission Batching Workflow
1. Agency Admin queries owed contractor commissions via `get_owed_commissions({ contractor, destination_country })`.
2. Admin bundles records into a batch via `create_commission_batch({ contractor, placement_names })`.
3. Payment is executed and settled via `settle_batch({ batch_name, payment_reference })`.
4. Ledger can be exported to Excel via `export_commissions_xlsx`.

---

## 12. COMMUNICATION, COMPLAINTS & NOTIFICATIONS

1. **Complaints Desk**:
   - `list_unresolved_complaints` feeds the `/complaints` triage table.
   - Manager assigns or resolves tickets via `resolve_complaint({ complaint_name, resolution_notes })`.
   - SLA health is tracked via `get_complaint_aging_report` (`new_count`, `unresolved`, `resolved_count`).
2. **Internal & Agency Chat**:
   - `list_threads` displays active conversations grouped by applicant/agency context.
   - `send_message` pushes instant message updates to the channel.
3. **Web Push Notifications**:
   - `get_push_subscription_status` reads service worker registration.
   - `subscribe_push` registers the browser subscription with the Frappe push engine.

---

## 13. USER ADMINISTRATION STATUS (CRITICAL BACKEND GAP)

* **Current Frontend**: [`src/app/employees/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/employees/page.tsx) allows creating staff accounts, toggling permissions, and resetting passwords.
* **Backend Audit**: `swagger.json` contains **zero administrative user management RPCs**.
* **Verdict**: **BLOCKED / READ-ONLY**. The `/employees` page should display current session role context and remain in read-only mode until the backend team publishes authoritative `user_admin.*` endpoints.

---

## 14. APPLICANT REGISTRATION AUDIT

Confirmed fields accepted by `agency_tracking.applicant_api.register_applicant`:
* **Personal**: `first_name`, `middle_name`, `last_name`, `gender`, `date_of_birth`, `religion`, `marital_status`, `nationality`, `national_id`, `labor_id`, `phone`, `address`.
* **Passport**: `passport_number`, `passport_issue_date`, `passport_expiry_date`, `passport_issue_place`, `passport_scan`.
* **Photo**: `photograph`, `photo_full_body`.
* **Deployment Target**: `destination_country`, `target_job`, `salary_amount`, `salary_currency`, `entry_track` (`"Standard"` or `"Muayena"`).
* **Medical**: `medical_status`, `medical_issue_date`, `medical_expiry_date`.
* **Skills**: `skill_cleaning`, `skill_cooking`, `skill_washing`, `skill_ironing`, `skill_baby_sitting`, `skill_arabic_cooking`, `skill_elderly_care`, `skill_driving` (0/1 integers).
* **Emergency Contact**: `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_address`.

---

## 15. DOCUMENT HANDLING & PARSING

* **Storage**: Document paths are returned as `/private/files/...` or `/files/...`.
* **Proxy Streaming**: The Next.js file proxy routes ([`src/app/files/[...slug]/route.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/files/%5B...slug%5D/route.ts) and [`src/app/private/files/[...slug]/route.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/private/files/%5B...slug%5D/route.ts)) forward authentication cookies and stream binary buffers directly to `<img />` and `<iframe />` components.
* **OCR Document Parsers**: Multipart uploads to `parse_passport_file`, `parse_contract_file`, `parse_visa_file` extract structured JSON to prefill registration and placement modal forms.

---

## 16. BACKEND GAPS & BLOCKERS SUMMARY

| Blocker ID | Missing Backend Capability | Frontend Impact | Recommended Workaround |
| :--- | :--- | :--- | :--- |
| **Blocker A** | `list_applicants` RPC method | Internal staff `/applicants` table cannot list all registered candidates | Use `listApplicantsV2Adapter` fallback adapter until backend publishes `list_applicants`. |
| **Blocker B** | `user_admin.*` management RPCs | Cannot invite employees or alter roles from `/employees` page | Display current user roles in read-only mode; admin manages users in Frappe desk. |
| **Blocker C** | Recruitment Funnel / SLA metrics | Dashboard turnaround time chart | Display verified queue volume metrics; omit unverified turnaround estimates. |

---

## 17. RECOMMENDED IMPLEMENTATION ROADMAP

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Shared Client Infrastructure & RBAC Alignment                      │
│ - Finalize v2 API client index exports and error interceptors               │
│ - Align permissions.ts to the 16 canonical V2 custom roles                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Operational Clearance Grid & Flyout Drawer                         │
│ - Connect OperationalTable to list_my_clearance_steps                       │
│ - Connect OperationalDrawer action buttons to V2 transition RPCs            │
│ - Configure dynamic corridor step views (LMIS, Taeshir, Embassy, Ticketing) │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Foreign Agency Marketplace & Placement Creation                    │
│ - Wire /agent/discovery to list_portal_candidates                           │
│ - Wire candidate selection modal to select_candidate (Placement creation)   │
│ - Wire Muayena direct-placement modal to create_muayena_placement           │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Applicant Registration & Profile Alignment                         │
│ - Update ApplicantRegistrationForm fields (target_job, photograph, etc.)    │
│ - Wire registration submit to register_applicant                            │
│ - Update applicants/[id] profile view to read V2 Applicant + Placement      │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Finance, Commissions & Ledger Workspaces                           │
│ - Connect /expenses-income to log_stage_expense and approval queue          │
│ - Connect /commission to get_owed_commissions and batch settlement          │
├─────────────────────────────────────────────────────────────────────────────┤
│ PHASE 6: Complaints Desk, Notifications & Reporting                         │
│ - Wire /complaints to list_unresolved_complaints and resolve_complaint      │
│ - Wire /reports to get_cost_breakdown_report and employee financial stats   │
│ - Connect Web Push subscription toggle                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Explicit "DO NOT BUILD YET" List:
1. **DO NOT** build custom user creation / role editing forms on `/employees` (Blocked by missing `user_admin` backend endpoints).
2. **DO NOT** invent speculative recruitment SLA calculation charts (Blocked by missing backend analytics).
3. **DO NOT** use raw `/api/resource/*` queries for new features.
4. **DO NOT** re-introduce `Applicant Dossier` or `DSR` models.
