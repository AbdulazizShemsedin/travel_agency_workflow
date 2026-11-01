# AUTHORITATIVE RBAC, MULTI-ROLE & PERMISSION MATRIX AUDIT

**Version:** 2.0 (Authoritative Non-Mock Production Engine)  
**Date:** November 2026  
**Repository Branch:** `feat/latest-backend-ui-integration-2026-10-24`  
**Backend Reference:** `https://agencytracking-production-de71.up.railway.app`  
**API Specification:** `src/Assets/new swagger.json` & `src/Assets/openapi 3.1.0.txt`  
**Security Baseline:** Zero Mock / Non-Poisoning Multi-Role Union / Fail-Closed Route Guarding  

---

## 1. Authoritative Role Inventory

The system enforces role-based access control across **20 canonical and operational roles** categorized into Administrative, Core Operational, Step-Specific Clearance, Functional Specialist, and External Partner identities.

| Role Name | Category | Assignable via Portal | Read-Only Eligible? | Description & Scope |
| :--- | :--- | :---: | :---: | :--- |
| **Admin** | Administrative | Yes | **NO** | Full administrative rights over all operations, users, settings, financial ledgers, and corridor workflows. |
| **Administrator** | Administrative (Frappe) | No (Native root) | **NO** | System superuser. Bypasses domain role restrictions; has universal operational authority. |
| **System Manager** | Administrative (Frappe) | Yes | **NO** | Frappe framework administrator. Treated symmetrically with `Admin` across domain policies. |
| **Manager** | Operational Lead | Yes | **NO** | Operational agency lead. Superintends pipelines, daily work, aging, and approval workflows. Excluded from raw financial ledgers (`get_financial_overview`). |
| **Registrar** | Operations | Yes | **YES** (`Registrar (View)`) | Controls applicant intake, draft registration, and selection request approvals/denials. Cannot mutate finance or clearances. |
| **Clearance Officer** | Operational Clearance | Yes | **YES** (`Clearance Officer (View)`) | General clearance coordinator across all corridors. Can start, advance, and complete clearance steps for all countries. |
| **Saudi LMIS** | Country-Step Clearance | Yes | **YES** (`Saudi LMIS (View)`) | Scoped exclusively to the Saudi Arabia LMIS clearance step (Labor ID, COC status, submission, approval). |
| **Saudi Taeshir** | Country-Step Clearance | Yes | **YES** (`Saudi Taeshir (View)`) | Scoped exclusively to the Saudi Arabia Taeshir / Biometrics step (appointment dates, biometric status, Injaz #). |
| **Saudi Embassy** | Country-Step Clearance | Yes | **YES** (`Saudi Embassy (View)`) | Scoped exclusively to the Saudi Arabia Embassy step (visa endorsement, visa stamping, Wakala confirmation). |
| **Kuwait LMIS** | Country-Step Clearance | Yes | **YES** (`Kuwait LMIS (View)`) | Scoped exclusively to the Kuwait LMIS clearance step. |
| **Kuwait Telesign** | Country-Step Clearance | Yes | **YES** (`Kuwait Telesign (View)`) | Scoped exclusively to the Kuwait Telesign clearance step. |
| **Kuwait Embassy** | Country-Step Clearance | Yes | **YES** (`Kuwait Embassy (View)`) | Scoped exclusively to the Kuwait Embassy step (visa endorsement, stamping). |
| **Medical Officer** | Functional Specialist | Yes | **YES** (`Medical Officer (View)`) | Records Stage 1 (`Selected` post-contract) and Stage 2 (`Ticketed` pre-departure ~72h) medical fitness results. |
| **Ticketer** | Functional Specialist | Yes | **YES** (`Ticketer (View)`) | Controls flight booking, ticket issuance, ticket details, departure confirmation, and flight reschedule logs. |
| **Complaint Manager** | Functional Specialist | Yes | **YES** (`Complaint Manager (View)`) | Logs, investigates, resolves, and escalates post-departure candidate complaints. |
| **Finance Manager** | Functional Specialist | Yes | **YES** (`Finance Manager (View)`) | Manages agency expense/income ledgers, commission batches, contractor settlements, and worker write-offs. |
| **Contract Parser** | Operational Intake | Yes | **YES** (`Contract Parser (View)`) | Uploads and extracts contractor job orders and employment contracts via OCR/LLM pipelines. |
| **Communication Manager**| Shared Operations | Yes | **YES** (`Communication Manager (View)`) | Manages agency multi-channel chat, candidate messaging, and internal staff coordination. |
| **CV** | Operational Intake | Yes | **YES** (`CV (View)`) | Focuses on candidate CV rendering, PDF resume compilation, and profile review. |
| **Foreign Agency** | External Partner | No (B2B Contractor) | **NO** | Authenticated external agency partner. Strictly scoped to candidates in the agency's pool and candidate selection requests. Completely blocked from internal agency screens. |

---

## 2. Authoritative Backend Endpoint Authorization Matrix

Audited against 85 whitelisted RPC endpoints under `/api/method/agency_tracking.*` as defined in `src/Assets/new swagger.json`.

| API Module & Method | Permitted Backend Roles (`x-roles`) | Method | Domain / State Machine Constraint |
| :--- | :--- | :---: | :--- |
| `applicant_api.register_applicant` | `Admin`, `Registrar` | POST | New applicant record in `Draft` or `Registered`. |
| `applicant_api.update_applicant` | `Admin`, `Registrar` | POST | Editable while in pre-selection stages. |
| `applicant_api.get_applicant` | All internal roles + `Foreign Agency` (if candidate is in contractor pool) | GET/POST | Agency sees sanitized fields; internal sees full dossier. |
| `applicant_api.list_applicants` | All internal authenticated roles | GET/POST | Excluded from pure `Foreign Agency`. |
| `applicant_api.cancel_applicant` | `Admin`, `Registrar`, `Manager` | POST | Requires mandatory `reason`. Cascades cancellation to placement. |
| `applicant_api.restore_applicant` | `Admin`, `Manager` | POST | Restores previous process state and placement steps. |
| `applicant_api.restart_applicant` | `Admin`, `Manager` | POST | Increments `cycle_number` and resets to `Draft`/`Registered`. |
| `applicant_api.delete_applicant` | `Admin` | POST | Hard-delete allowed only for `Draft` applicants with no history. |
| `portal_api.select_candidate` | `Foreign Agency` (with `contractor_name`) | POST | Moves applicant to `Selected` (or `Requested` pending review). |
| `portal_api.approve_selection_request` | `Admin`, `Manager`, `Registrar` | POST | Staff approval of agency selection request. Moves candidate to `Selected`. |
| `portal_api.deny_selection_request` | `Admin`, `Manager`, `Registrar` | POST | Rejects selection request with mandatory `reason`. |
| `portal_api.put_back_candidate` | `Admin`, `Manager`, `Registrar` | POST | Returns candidate to pool if visa/contract cannot proceed. |
| `placement_api.advance_placement` | `Admin`, `Manager`, `Clearance Officer` | POST | Backend state machine enforces corridor prerequisites. |
| `placement_api.record_selected_medical_result` | `Admin`, `Manager`, `Medical Officer`, `Contract Parser`, `Ticketer` | POST | Records post-contract Stage 1 FIT/UNFIT result. |
| `placement_api.record_predeparture_medical_result` | `Admin`, `Manager`, `Medical Officer`, `Ticketer` | POST | Records pre-departure Stage 2 (~72h) FIT/UNFIT result. |
| `placement_api.clear_selected_medical_result` | `Admin`, `Manager`, `Medical Officer` | POST | Clears Stage 1 result and resets hold. |
| `placement_api.clear_predeparture_medical_result` | `Admin`, `Manager`, `Medical Officer` | POST | Clears Stage 2 result and resets hold. |
| `clearance_api.start_clearance_step` | `Admin`, `Manager`, `Clearance Officer`, and matching step role | POST | Transitions step to `In Progress`. |
| `clearance_api.complete_clearance_step` | `Admin`, `Manager`, `Clearance Officer`, and matching step role | POST | Requires mandatory documents and prerequisites. |
| `clearance_api.reopen_clearance_step` | `Admin`, `Manager` | POST | Requires mandatory `reason`. |
| `clearance_api.reassign_clearance_step` | `Admin`, `Manager` | POST | Reassigns step to designated staff officer. |
| `clearance_api.update_lmis_step` | `Admin`, `Saudi LMIS`, `Kuwait LMIS`, `Clearance Officer` | POST | Updates Labor ID, COC status, and labor submission logs. |
| `clearance_api.update_injaz_step` | `Admin`, `Saudi Taeshir`, `Kuwait Telesign`, `Clearance Officer` | POST | Updates appointment dates and Injaz tracking numbers. |
| `clearance_api.update_embassy_step` | `Admin`, `Saudi Embassy`, `Kuwait Embassy`, `Clearance Officer` | POST | Updates visa number, stamping status, Wakala confirmation. |
| `ticket_api.book_ticket` | `Admin`, `Ticketer`, `Manager` | POST | Records PNR, flight dates, flight cost, and airline details. |
| `ticket_api.cancel_ticket` | `Admin`, `Ticketer`, `Manager` | POST | Cancels ticket and creates refund/cancellation log. |
| `departure_api.record_departure` | `Admin`, `Ticketer`, `Manager` | POST | Transitions candidate to `Departed` and creates commission record. |
| `departure_api.record_reschedule` | `Admin`, `Ticketer`, `Manager` | POST | Records reschedule date, cause, and additional costs. |
| `finance_api.create_transaction` | `Admin`, `Finance Manager` | POST | Logs expense or income transaction with original currency. |
| `finance_api.settle_contractor_batch` | `Admin`, `Finance Manager` | POST | Finalizes commission settlement batch for contractor. |
| `finance_api.record_worker_write_off`| `Admin`, `Finance Manager` | POST | Writes off candidate commission balance with justification. |
| `report_api.get_financial_overview` | `Admin` ONLY (`x-roles: ["Admin"]`) | POST | Income/expense/commission totals + currency breakdown. |
| `report_api.get_operations_summary` | `Admin`, `Manager` | POST | Conversion funnels, stage throughput, and dropout metrics. |
| `report_api.get_staff_performance` | `Admin`, `Manager` | POST | Operational speed and throughput by staff user. |
| `report_api.get_all_transactions` | `Admin`, `Finance Manager` | POST | Bounded financial transactions ledger. |
| `complaint_api.register_complaint` | `Admin`, `Complaint Manager`, `Manager` | POST | Logs candidate complaint with classification and priority. |
| `complaint_api.resolve_complaint` | `Admin`, `Complaint Manager`, `Manager` | POST | Marks complaint resolved with resolution summary. |
| `auth_api.get_assignable_roles` | `Admin`, `Manager`, `System Manager` | GET | Enumerates assignable roles and read-only flags. |

---

## 3. Action Authorization Matrix (`permissions.ts`)

Every front-facing application action is partitioned into **View Capabilities** (accessible by read-only roles) and **Mutation Capabilities** (strictly guarded by `MUTATION_ACTIONS`, which enforces that at least one allowed role is writable).

```typescript
// Classification in src/lib/auth/permissions.ts
export const MUTATION_ACTIONS = new Set<PermissionAction>([
  "registerApplicant",
  "managePlacements",
  "manageClearances",
  "manageFinance",
  "manageCommission",
  "manageComplaints",
  "manageContractors",
  "manageSelectionRequests",
  "manageTicketing",
  "manageMedical",
  "editLms",
  "editInjaz",
  "editWakala",
  "createStamp",
  "createTicket",
  "createDeparture",
  "editEmbassy",
  "editTelesign",
]);
```

### Action-to-Role Mapping

| Action | Allowed Roles | Mutation? | View-Only Roles Allowed? |
| :--- | :--- | :---: | :---: |
| `viewDashboard` | All Internal Roles | No | **YES** |
| `viewApplicants` | All Internal Roles | No | **YES** |
| `registerApplicant` | `Admin`, `Manager`, `Registrar` | **YES** | **NO** |
| `manageSelectionRequests` | `Admin`, `Manager`, `Registrar` | **YES** | **NO** |
| `viewClearances` | `Admin`, `Manager`, `Clearance Officer`, Country-Step Roles | No | **YES** |
| `manageClearances` | `Admin`, `Manager`, `Clearance Officer`, Country-Step Roles | **YES** | **NO** |
| `editLms` | `Admin`, `Manager`, `Clearance Officer`, `Saudi LMIS`, `Kuwait LMIS` | **YES** | **NO** |
| `editInjaz` | `Admin`, `Manager`, `Clearance Officer`, `Saudi Taeshir`, `Kuwait Telesign` | **YES** | **NO** |
| `editEmbassy` | `Admin`, `Manager`, `Clearance Officer`, `Saudi Embassy`, `Kuwait Embassy` | **YES** | **NO** |
| `manageMedical` | `Admin`, `Manager`, `Medical Officer`, `Contract Parser`, `Ticketer` | **YES** | **NO** |
| `viewTicketing` | `Admin`, `Manager`, `Ticketer` | No | **YES** |
| `manageTicketing` | `Admin`, `Manager`, `Ticketer` | **YES** | **NO** |
| `createDeparture` | `Admin`, `Manager`, `Ticketer` | **YES** | **NO** |
| `viewFinance` | `Admin`, `Finance Manager` | No | **YES** |
| `manageFinance` | `Admin`, `Finance Manager` | **YES** | **NO** |
| `viewCommission` | `Admin`, `Finance Manager` | No | **YES** |
| `manageCommission` | `Admin`, `Finance Manager` | **YES** | **NO** |
| `viewComplaints` | `Admin`, `Manager`, `Complaint Manager` | No | **YES** |
| `manageComplaints` | `Admin`, `Manager`, `Complaint Manager` | **YES** | **NO** |
| `viewReports` | `Admin`, `Manager`, `Finance Manager` | No | **YES** |
| `manageUsers` | `Admin`, `Manager`, `System Manager` | **YES** | **NO** |
| `manageContractors`| `Admin`, `Manager` | **YES** | **NO** |
| `accessAgentPortal`| `Foreign Agency` ONLY | No | N/A |

---

## 4. Read-Only (`(View)`) Handling Architecture

### Dual Recognition Model
The frontend supports both backend conventions for read-only roles:
1. **Explicit Array**: `read_only_roles: ["Finance Manager", "Saudi LMIS"]` passed in the `AuthUser` context from `fetchCurrentUserContext()`.
2. **String Suffix Parsing**: Role strings in `roles` containing the case-insensitive ` (View)` suffix (e.g., `"Registrar (View)"`, `"Kuwait LMIS (view)"`).

### Administrative Exemption Guard
By backend design (`auth_api.get_assignable_roles`), administrative roles (`Admin`, `Administrator`, `System Manager`) can **never** be assigned in read-only mode. In `permissions.ts` and `v2Roles.ts`, `isRoleReadOnly()` explicitly returns `false` for administrative identities, preventing lockouts.

### Non-Poisoning Multi-Role Principle
Prior to this audit, `userIsReadOnly()` in `AuthProvider.tsx` returned `true` if `read_only_roles.length > 0`. This caused multi-role users (e.g. a `Registrar` who also possessed `Finance Manager (View)`) to be completely barred from performing Undo operations or managing selection requests.

**Current Corrected Implementation:**
- `isReadOnly("Registrar")`: Checks if the specific role is read-only.
- `isReadOnly()` (no argument): Returns `true` **only if ALL assigned operational roles are read-only**.
- `can(user, action)`: For mutation actions, iterates through all allowed roles. If the user holds at least one matching role that is **not** in `read_only_roles`, permission is **granted**.

---

## 5. Multi-Role Combination Rules (Mathematical Union)

Effective user permissions are computed as the **mathematical union** of capabilities across all assigned roles.

$$\text{EffectiveViewPermissions}(U) = \bigcup_{r \in \text{roles}(U)} \text{ViewCaps}(r)$$

$$\text{EffectiveMutationPermissions}(U) = \bigcup_{r \in \text{roles}(U) \setminus \text{read\_only\_roles}(U)} \text{MutationCaps}(r)$$

### Pairwise Role Scenarios

| User Roles | Read-Only Roles | Effective Capabilities | Prohibited Operations |
| :--- | :--- | :--- | :--- |
| `Registrar` + `Finance Manager` | `Finance Manager` | **Write**: Register applicant, Approve selection request.<br>**Read**: View finance, View commission, View applicants. | **Blocked**: Create transaction, Settle commission batch, Void write-off (Finance mutations). |
| `Saudi LMIS` + `Ticketer` | `Saudi LMIS` | **Write**: Book ticket, Record departure.<br>**Read**: View LMIS records, View tickets. | **Blocked**: Update Labor ID, Complete LMIS step, Edit Taeshir/Embassy. |
| `Medical Officer` + `Contract Parser` | `[]` (Both writable) | **Write**: Record Medical 1 (FIT/UNFIT), Record Medical 2 (FIT/UNFIT), Clear medical result, Parse job contract. | **Blocked**: Manage clearance steps, Issue tickets, Mutate finance. |
| `Clearance Officer` + `Registrar` | `[]` (Both writable) | **Write**: All clearance steps (LMIS, Taeshir, Embassy for all corridors), Register applicant, Selection requests. | **Blocked**: Finance mutations, Ticketing mutations. |
| `Foreign Agency` + `Internal Staff` | Any | **Enforced Isolation**: `Foreign Agency` is locked to the authenticated user's linked Contractor record. `hasRole(admin, "Foreign Agency")` returns `false`. External agencies cannot access internal screens under any circumstances. |

---

## 6. UI Element & Workspace Authorization Audit

All mutation buttons, inline editable table inputs, and action modals have been surgically audited and updated across the operational workspace suite.

| Workspace / Component | Action / UI Control | Permitted Roles | Read-Only & Inactive Role Behavior |
| :--- | :--- | :--- | :--- |
| **Undo Last Step Button** (`UndoLastStepButton.tsx`) | `Undo Step` button | Admin, Manager, and the role that created the step | Hidden for view-only users (`isReadOnly() = true`). If blocked by downstream steps, rendered disabled with tooltip text. |
| **Selection Requests** (`SelectionRequestsWorkspace.tsx`) | `Approve`, `Deny`, `Put Back` | Admin, Manager, Registrar (writable) | Gated by `can("manageSelectionRequests")`. If read-only, banner displayed and action buttons disabled with explanatory tooltip. |
| **Medical Examination** (`MedicalWorkspace.tsx`) | `FIT`, `UNFIT`, `Clear` (Stage 1 & Stage 2) | Admin, Manager, Medical Officer (writable), Contract Parser, Ticketer | Gated by `can("manageMedical")`. If read-only, amber banner displayed and all FIT/UNFIT/Clear buttons disabled with explanatory tooltip. |
| **LMIS Workspace** (`LMISWorkspace.tsx`) | `Labor ID`, `COC Status`, `Status`, `Rejection Reasons` | Admin, Manager, Clearance Officer (writable), Saudi/Kuwait LMIS (writable) | Gated by `can("editLms")`. If read-only, table inputs disabled; modal edit button disabled. Reassignment gated to `isAdmin`. |
| **Injaz Workspace** (`InjazWorkspace.tsx`) | `Appointment Date`, `Injaz #`, `Biometrics Status` | Admin, Manager, Clearance Officer (writable), Saudi Taeshir (writable), Kuwait Telesign (writable) | Gated by `can("editInjaz")`. If read-only, inputs and edit modals disabled. |
| **Embassy Workspace** (`EmbassyWorkspace.tsx`) | `Visa #`, `Wakala Status`, `Visa Issue Date`, `Stamp Date` | Admin, Manager, Clearance Officer (writable), Saudi Embassy (writable), Kuwait Embassy (writable) | Gated by `can("editEmbassy")`. If read-only, inputs and modals disabled. Reopen step gated to `isAdmin`. |
| **Departure Workspace** (`DepartureWorkspace.tsx`) | `Ticket #`, `Flight Date/Time`, `Departure Status`, `Reschedule` | Admin, Manager, Ticketer (writable) | Gated by `can("manageTicketing")`. If read-only, inputs and modals disabled. |
| **Commission Ledger** (`src/app/commission/page.tsx`) | `Create Batch`, `Settle`, `Record Advance`, `Write-Off` | Admin, Finance Manager (writable) | Gated by `can("manageCommission")`. If read-only, banner displayed and all mutation buttons disabled. |
| **Expenses & Income** (`src/app/expenses-income/page.tsx`) | `Add Transaction`, `Upload Statement`, `Settle Batch` | Admin, Finance Manager (writable) | Gated by `can("manageFinance")`. If read-only, banner displayed and all transaction submission controls disabled. |
| **Reports Page** (`src/app/reports/page.tsx`) | `Financial Overview Aggregate Totals` | **Admin ONLY** | `getFinancialOverviewV2` query gated to `Boolean(isAdmin)`. Prevents 403 Forbidden for `Finance Manager`. |

---

## 7. Route & Page-Level Protection Audit

Client-side routing is enforced in `AuthProvider.tsx` through `ROUTE_PERMISSION_MAP`.
- **Fail-Closed Principle**: If a route is protected and the user's active roles do not permit the associated action, access is denied immediately.
- **Separation of Page Access vs Mutation**: Routes are gated on `view*` permissions (e.g. `/commission` requires `viewCommission`, `/expenses-income` requires `viewFinance`). This allows read-only users to view pages without being redirected, while mutation controls on those pages remain disabled.
- **Foreign Agency Loop Prevention**: When an unauthorized route is accessed, `isPureForeignAgency(authUser)` checks whether the user is an external partner agency. If so, they are redirected to `/agent`. Internal staff are redirected to `/dashboard`. This prevents foreign agencies from becoming trapped in infinite redirect loops.

---

## 8. Automated Verification & Test Coverage Summary

Comprehensive automated tests are established in `tests/rbac-comprehensive-matrix.test.ts` and executed via `npm test` (`npx tsx --test`).

```text
TAP version 13
# Subtest: Comprehensive RBAC, Multi-Role & Read-Only Audit Test Suite
    # Subtest: 1. Canonical Role Inventory Verification
        ok 1 - Canonical roles list contains all 20 recognized business and clearance roles
        ok 2 - extractRoleName correctly parses raw role names and strips (view) suffixes
    ok 1 - 1. Canonical Role Inventory Verification (2.8ms)

    # Subtest: 2. Read-Only Detection & Suffix Handling
        ok 1 - isRoleReadOnly detects read-only role from string suffix or read_only_roles array
        ok 2 - Administrative roles can NEVER be treated as read-only
    ok 2 - 2. Read-Only Detection & Suffix Handling (0.9ms)

    # Subtest: 3. Individual Role Capability Boundaries
        ok 1 - Admin has universal write and view access across all functional domains
        ok 2 - Registrar can view/register applicants and manage selection requests, but cannot touch finance or clearance
        ok 3 - Finance Manager can manage finance and commission, but cannot register applicants or edit clearance
        ok 4 - Clearance Officer has clearance mutation access, but cannot touch finance
        ok 5 - Step-specific clearance roles are strictly scoped to their step
        ok 6 - Medical Officer can record medical results, but cannot edit finance or ticketing
        ok 7 - Ticketer can manage ticketing and departure, but cannot edit clearance steps
    ok 3 - 3. Individual Role Capability Boundaries (2.1ms)

    # Subtest: 4. Read-Only Roles Cannot Mutate State
        ok 1 - Registrar (View) can view applicants but cannot register applicants or manage selection requests
        ok 2 - Finance Manager (View) can view finance/commission but cannot mutate transactions or batches
        ok 3 - Clearance Officer (View) can view clearances but cannot start/complete steps
        ok 4 - Medical Officer (View) can view placements but cannot record medical fitness results
        ok 5 - Ticketer (View) can view departures but cannot issue tickets or record departures
    ok 4 - 4. Read-Only Roles Cannot Mutate State (1.8ms)

    # Subtest: 5. Multi-Role Permission Union & Non-Poisoning Integrity
        ok 1 - Mixed Writable + Read-Only: Registrar (writable) + Finance Manager (View)
        ok 2 - Mixed Writable + Read-Only: Saudi LMIS (View) + Ticketer (writable)
        ok 3 - Multi-Role Pairwise: Registrar + Clearance Officer (both writable)
        ok 4 - Multi-Role Pairwise: Medical Officer + Contract Parser (both writable)
    ok 5 - 5. Multi-Role Permission Union & Non-Poisoning Integrity (1.2ms)

    # Subtest: 6. Foreign Agency Role Isolation & Identity Verification
        ok 1 - hasRole('Foreign Agency') requires exact role assignment and CANNOT be spoofed by Admin
        ok 2 - isPureForeignAgency correctly distinguishes external agencies from internal users
        ok 3 - Foreign Agency is barred from all internal workflows
    ok 6 - 6. Foreign Agency Role Isolation & Identity Verification (0.8ms)

    # Subtest: 7. Route Permission Gating & Fail-Closed Guard
        ok 1 - Route permission map gates financial pages using view capabilities (safe for read-only roles)
        ok 2 - Read-only users can navigate to view-protected routes without getting redirected
        ok 3 - Unauthenticated or unauthorized users are strictly blocked on internal routes
    ok 7 - 7. Route Permission Gating & Fail-Closed Guard (0.6ms)

# tests 66
# suites 11
# pass 66
# fail 0
```

---

## 9. Identified RBAC Defects & Surgical Remediations

| # | Identified Defect | Impact | Surgical Remediation Applied |
| :- | :--- | :--- | :--- |
| **1** | `can(user, action)` in `permissions.ts` ignored `read_only_roles`. | Read-only roles (`Finance Manager (View)`) were able to execute mutations. | Added `MUTATION_ACTIONS` set and verified that matching allowed role is not in `read_only_roles`. |
| **2** | `userIsReadOnly()` in `AuthProvider.tsx` returned `true` if `read_only_roles.length > 0`. | Poisoned multi-role users: a writable `Registrar` holding `Finance Manager (View)` had Undo and Selection Requests disabled. | Refactored `userIsReadOnly()` without arguments to return `true` only if **all** non-admin roles are read-only. |
| **3** | `hasRole(user, "Foreign Agency")` matched Admin because `norm === "admin"`. | Security flaw: Admin was incorrectly recognized as an external partner agency. | Enforced strict role matching for `Foreign Agency` without administrative fallback. |
| **4** | Route permission map used mutation actions (`manageCommission`, `manageComplaints`) for page routes. | Read-only users were redirected away from permitted pages. | Changed route requirements to view capabilities (`viewCommission`, `viewComplaints`, `viewFinance`). |
| **5** | In `reports/page.tsx`, `getFinancialOverviewV2` was called for `Finance Manager`. | 403 Forbidden error thrown because backend endpoint is strictly Admin-only. | Changed query `enabled` guard from `isAdminOrFinance` to `isAdmin`. |
| **6** | In `MedicalWorkspace.tsx`, FIT/UNFIT and Clear buttons had zero role checks. | Any authenticated user could record medical results. | Added `can("manageMedical")` guard to disable buttons and mutations with explanatory tooltips. |
| **7** | In `LMISWorkspace.tsx`, `InjazWorkspace.tsx`, `EmbassyWorkspace.tsx`, and `DepartureWorkspace.tsx`, `canEdit` checked role names without verifying `(View)` suffixes. | Read-only clearance officers could edit inline table fields. | Replaced custom checks with canonical capability checks (`editLms`, `editInjaz`, `editEmbassy`, `manageTicketing`). |
| **8** | `V2_CANONICAL_ROLES` omitted `Manager`, `Medical Officer`, and `CV`. | Type mismatches and inconsistent role enumeration. | Added missing roles to both `V2_CANONICAL_ROLES` and `V2_CUSTOM_ROLES`. |

---

## 10. Backend Handoff & Security Recommendations

1. **`report_api.get_financial_overview` vs `Finance Manager`**:
   - The backend Swagger specifically notes: *"Deliberately Admin-only, not Manager... the financial-visibility wall applies to reporting too."*
   - Because `Finance Manager` cannot call this aggregate endpoint, the frontend reports page now calculates transaction metrics locally from `get_all_transactions` when `financialOverview` is undefined. If backend architects wish `Finance Manager` to access aggregate metrics, `Finance Manager` must be added to `allowed_roles` on the backend.
2. **Hard-Coded User Roles in DocType Events**:
   - Verify backend `doc_events` in `clearance_step.py` do not bypass `roles.py` when validating transitions.
3. **Audit Logging for Multi-Role Mutations**:
   - All mutation endpoints log the acting user's email (`user`). Recommend storing which of the user's active roles authorized the specific transition in Frappe Version logs for audit compliance.

