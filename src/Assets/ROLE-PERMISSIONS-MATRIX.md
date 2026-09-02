# Role / Action Matrix

Sourced directly from the permission checks in each `*_api.py` file (explicit role-set checks,
`doc.has_permission()`, and the doctype `permissions` arrays) — not from a separate design doc.
`System Manager` and `Admin` can do everything below unless noted otherwise (both are full-access
roles); they're omitted from most rows to keep the table readable.

## Quick answers to the specific questions asked

- **Who can read Applicants?** Registrar, Manager, Admin, System Manager (full read+write) — plus
  **read-only**: Finance Manager, Clearance Officer, Complaint Manager, Communication Manager,
  Saudi LMIS, Saudi Taeshir, Saudi Embassy, Kuwait LMIS, Kuwait Telesign, Kuwait Embassy.
- **Who can edit Applicants?** Registrar, Manager, Admin, System Manager only (via
  `update_applicant`). Saudi LMIS/Kuwait LMIS additionally get a **narrow** edit surface via
  `update_applicant_for_lmis` — only `exam_date, coc_status, labor_id, national_id,
  emergency_contact_name, emergency_contact_phone, emergency_contact_address`, nothing else.
- **Who can operate each Clearance Step?** Manager/Admin always; the officer currently
  ToDo-assigned to that exact row (Clearance Officer/Ticketer's per-row model); or anyone holding
  the role mapped to that step's `step_type` (Saudi LMIS↔LMIS Clearance, Saudi Taeshir↔Taeshir,
  Saudi Embassy↔Embassy, Kuwait LMIS↔Kuwait LMIS, Kuwait Telesign↔Telesign, Kuwait
  Embassy↔Kuwait Embassy). Cross-corridor/cross-step-type is always denied.
- **Who can reassign a step?** Manager, Admin only.
- **Who can approve finance transactions?** Finance Manager, Admin only (approve/reject/void, FX
  rates, commission batching/settlement all gated the same way). Logging an expense/income is
  open to **any internal staff role** (write-side is deliberately permissive; approval is the real
  gate).
- **Who can use Reports?** Manager + Admin for most (`get_daily_work_report`,
  `get_staff_performance_report`, `get_complaint_aging_report`, `get_placement_aging_report`,
  `get_operations_summary`, `export_commissions_xlsx`). **Admin only** for the financially
  sensitive ones: `get_financial_overview`, `get_pending_approval_queue`,
  `get_cost_breakdown_report`, `get_employee_financial_report`.
- **Who can ticket?** Anyone with Placement write access can call `record_ticket_details` — in
  practice that's Manager, Admin, System Manager, Contract Parser, Ticketer (the doctype's write
  grant). Ticketer is the intended day-to-day role.
- **Who can mark Departed?** Anyone with Placement write access, via
  `advance_placement(new_status="Departed")` — gated by `state_machine.medical_2_gate`
  (`medical_2_status` must be `FIT`, set via `record_predeparture_medical_result`) regardless of
  role. A Manager/Admin can override a blocked gate with a written `override_reason`; no one else
  can.
- **Who can access Placement data?** Read: Manager, Admin, System Manager, Contract Parser,
  Ticketer (full read+write) — plus **read-only**: Finance Manager, Clearance Officer, Complaint
  Manager, Communication Manager, the same six country+step roles as Applicant. **Registrar has NO
  access to Placement** (by design — Registrar's job ends before a Placement exists; confirmed
  live in `cc2/02-rbac-results.md`, flagged there as worth reconfirming with product if that's
  actually intended).
- **Who can access Commission data?** Finance Manager, Admin only for every finance_api.py
  function. Reports layer adds Manager for `get_operations_summary`'s funnel data (aggregate
  counts, not row-level Applicant Transaction access).

## Full matrix, by module

### Applicant (`applicant_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `create_applicant` | Registrar, Manager, Admin, System Manager | Doctype-level `create` permission (`frappe.has_permission("Applicant", "create")`). |
| `get_applicant` / `list_applicants` | Registrar, Manager, Admin, System Manager (full) + Finance Manager, Clearance Officer, Complaint Manager, Communication Manager, 6 country+step roles (read-only) | Doctype-level `read` permission via `frappe.get_list`/`doc.has_permission("read")`. |
| `update_applicant` | Registrar, Manager, Admin, System Manager | Doctype-level `write`. Country-ban override additionally requires Manager/Admin + written reason. |
| `update_applicant_for_lmis` | Saudi LMIS, Kuwait LMIS, Manager, Admin | Narrow field allowlist regardless of caller's role. |
| `register_applicant` / `cancel_applicant` / `restart_applicant` | Registrar, Manager, Admin, System Manager | Doctype-level `write`. |
| `log_applicant_fee` | Any internal staff role (`agency_tracking.roles.INTERNAL_STAFF_ROLES`) | See that constant for the exact set — broader than the edit roles above. |
| `set_country_ban` | Registrar, Complaint Manager, Manager, Admin, System Manager | Doctype-level `create` on Applicant Country Ban. |
| `list_country_bans` | Registrar, Complaint Manager, Manager, Admin, System Manager (read); everyone else denied | Doctype-level `read`. |
| `remove_country_ban` | Manager, Admin, System Manager only | Doctype-level `delete` — Registrar/Complaint Manager can set a ban but not lift one. |

### Placement (`placement_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `list_placements` / read | Manager, Admin, System Manager, Contract Parser, Ticketer (full) + Finance Manager, Clearance Officer, Complaint Manager, Communication Manager, 6 country+step roles (read-only) | **Not** Registrar. |
| `upload_contract` / `upload_visa` | The Contractor who made the selection (session user's linked `Contractor.user`), OR internal staff with Placement write (Contract Parser is the dedicated role) | Keyed off an actual linked Contractor record, not role membership, so Administrator (who has every role) can't spoof "logged in as an agency." |
| `create_muayena_placement` | Registrar, Manager, Admin, Contract Parser | Also requires `Applicant.has_permission("write")`. |
| `record_selected_medical_result` / `record_predeparture_medical_result` / `record_ticket_details` / `record_reschedule` | Anyone with Placement write (Manager, Admin, System Manager, Contract Parser, Ticketer) | All four now blocked once the Placement is Departed/Cancelled (2026-08-31 fix). |
| `advance_placement` | Anyone with Placement write | Gate/override logic is state-machine-level, not role-level (see `02-placement-contract.md`'s transition table) — override itself needs Manager/Admin + reason. |

### Clearance Step (`clearance_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `start_clearance_step` / `complete_clearance_step` / `submit_embassy_step` / `stamp_embassy_step` / `reject_embassy_step` | Manager/Admin always; the ToDo-assigned officer for that row; or anyone holding the step_type-mapped role | See "Quick answers" above for the step_type↔role map. All five now blocked once the step or its parent Placement is terminal (2026-08-31 fix). |
| `reassign_clearance_step` | Manager, Admin only | |
| `list_my_clearance_steps` | Any authenticated user | Row-scoped by `get_permission_query_conditions` — a Clearance Officer/Ticketer sees only their own ToDo-assigned rows; a country+step role sees every row of its step_type; Manager/Admin see everything. |

### Corridor (`corridor_engine.py`)

| Action | Allowed | Notes |
|---|---|---|
| `get_corridor_steps` | Any authenticated user | Pure read of `Corridor Definition`/`Corridor Step` config data — no business-sensitive content. |

### Contractor (`contractor_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `create_contractor` / `list_contractors` | Manager, Admin, Finance Manager, Registrar | `CONTRACTOR_MANAGE_ROLES` constant. |

### Finance (`finance_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `log_stage_expense` / `log_stage_income` | Any internal staff role (`INTERNAL_STAFF_ROLES`) | Write-side deliberately permissive; approval is the real gate. |
| `approve_transaction` / `reject_transaction` / `void_transaction` / `trigger_early_commission_accrual` / `get_fx_rate` / `set_fx_rate` / `get_owed_commissions` / `create_commission_batch` / `settle_batch` / `settle_batch_items` / `upload_batch_payment_proof` / `get_batch_invoice_pdf` | Finance Manager, Admin only | `trigger_early_commission_accrual` also allows Manager. |

### Reconciliation (`reconciliation_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `upload_bank_statement` / `manually_match_line` | Finance Manager, Admin only | |

### Reports (`report_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `get_daily_work_report` / `get_staff_performance_report` / `get_complaint_aging_report` / `get_placement_aging_report` / `get_operations_summary` / `export_commissions_xlsx` | Manager, Admin | `MANAGEMENT_ROLES`. |
| `get_financial_overview` / `get_pending_approval_queue` / `get_cost_breakdown_report` / `get_employee_financial_report` | Admin only | Deliberately narrower — the financial-visibility wall applies to reporting too. |

### Complaints (`complaint_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `create_complaint` | The linked Foreign Agency for that placement's contractor, OR any internal staff role | Cross-contractor create is denied even for a real agency identity. |
| `list_unresolved_complaints` | Complaint Manager, Admin, Manager | |
| `acknowledge_complaint` | Complaint Manager, Admin | |
| `resolve_complaint` | Complaint Manager, Admin, + Manager only for the "Returned - Free Replacement Required" outcome specifically (see source for the exact `allowed_roles` set per outcome) | |

### Chat (`chat_api.py`, `chat_engine.py`)

| Action | Allowed | Notes |
|---|---|---|
| `create_agency_thread` | Foreign Agency (portal, must have a linked Contractor) | No recipient param — routes server-side to the contractor's configured/round-robin Communication Manager. |
| `create_internal_thread` | Internal staff only | Explicitly refuses Foreign Agency with a message pointing at `create_agency_thread`. |
| `send_message` / `get_thread_messages` / `mark_read` | Thread participants only | `is_participant()` check. |
| `add_participant` | Internal threads only, any participant presumably (see source for the exact caller check) | Agency threads are permanently locked to 2 participants. |
| `list_threads` | Any authenticated user | Scoped to threads they participate in. |
| `get_placement_officers` | Anyone with Placement read access | Same role set as Placement read, above. |

### Notifications (`notification_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `subscribe_to_push` / `get_push_subscription_status` | Any authenticated user, for themselves only | |
| `trigger_wakala_reminder` | Anyone with read access to the referenced Clearance Step | |

### Portal / Foreign Agency (`portal_api.py`)

| Action | Allowed | Notes |
|---|---|---|
| `list_portal_candidates` / `select_candidate` / `list_my_wakala_requests` | Foreign Agency role **with** a linked Contractor record | A bare Foreign Agency user with no linked Contractor gets a clear, actionable 403 ("No Contractor record is linked to this user."), not a generic permission error. |

---

## Frontend Security & RBAC Hardening Audit (P3-03)

### 1. Architectural Principles
- **UX Enforcement Only**: Frontend permission checks (`can(user, action)`, `hasRole`, `hasAnyRole`) govern navigation item rendering, button visibility, and tab access. The backend Python API methods (`roles.py`, `doc.has_permission()`, and `state_machine.py`) remain the sole authoritative security enforcement layer.
- **Fail-Closed Permissions**: `can(user, action)` strictly returns `false` if `user` is unauthenticated or null. Unauthenticated callers are never granted default action privileges.
- **User Identifier Standard**: All operations targeting internal staff (e.g. `reassign_clearance_step`, `create_internal_thread`, `add_participant`) require the canonical User `name`, which is the user's registered email address (`email == name`).
- **Session & CSRF**: Session cookies are transmitted via `credentials: "include"`. State-changing POST requests automatically resolve and attach the CSRF token via `X-Frappe-CSRF-Token` using an in-memory cached mutex.
- **Private Files**: `/private/files/[...slug]` proxies directly to the backend with session cookies, returning HTTP 403 Forbidden if the user's role lacks read access to the attached DocType.
- **Portal Isolation**: External Foreign Agency users (`roles.includes("Foreign Agency") && !authUser.is_internal_staff`) are isolated from internal operational links (`/applicants`, `/employees`, `/contractors`, `/expenses-income`, `/commission`, `/reports`), seeing only their dedicated `/agent/*` workspace and `/chat`.

---

### 2. Major Role Family Verification Matrix

| Role Family | Canonical Roles | Read Access | Write / Operational Gating | UI Isolation & Navigation Visibility | Verification Status | Notes |
|:---|:---|:---|:---|:---|:---|:---|
| **Admin** | `Admin`, `Administrator`, `System Manager` | Full access across all 69 capabilities | Full write access to all endpoints, overrides, reassignment, and reports | Sees full internal navigation + settings + employee explorer | `RUNTIME VERIFIED` | Tested against live production Railway backend. |
| **Manager** | `Manager` | Full access to Applicants, Placements, Clearance, Complaints, Contractors, General Reports | Reassign steps, override clearance gates with written reason, resolve complaints. Blocked from Admin-only financial reports (`get_financial_overview`, `get_pending_approval_queue`, `get_cost_breakdown_report`, `get_employee_financial_report`) | Full internal navigation (except Admin-only financial reports) | `VERIFIED VIA CONTRACT / LIVE 403` | Denied financial approval operations at backend level. |
| **Registrar** | `Registrar` | Applicants, Contractors, Internal Threads | `create_applicant`, `update_applicant`, `register_applicant`, `cancel_applicant`, `restart_applicant`, `set_country_ban`, `log_applicant_fee`. **Denied Placement read/write access** | Applicants, Add Applicant button, Contractors | `VERIFIED VIA CONTRACT / LIVE 403` | Placement write/read denied by Frappe DocType permission rules. |
| **Finance** | `Finance Manager` | Read-only Applicants & Placements; Full access to Financial transactions & batches | `approve_transaction`, `reject_transaction`, `void_transaction`, `create_commission_batch`, `settle_batch_items`, `settle_batch`, `set_fx_rate`, `upload_bank_statement`, `manually_match_line` | Expenses/Income, Commissions, Financial tab in Reports | `VERIFIED VIA CONTRACT / LIVE 403` | Approval queue actions gated strictly to Finance Manager & Admin. |
| **Clearance** | `Clearance Officer` | Read-only Applicants & Placements; Assigned Clearance Steps | `start_clearance_step`, `complete_clearance_step`, `log_stage_expense`. Blocked from reassigning steps (Manager/Admin only) or cross-assigned steps | Clearance Queue in `/applicants` | `VERIFIED VIA CONTRACT / LIVE 403` | Step operations row-locked to ToDo assignment. |
| **Ticketer** | `Ticketer` | Read-only Applicants & Placements; Assigned Ticketing Steps | `record_ticket_details`, `record_reschedule`, `record_predeparture_medical_result`, `advance_placement` to Ticketed/Departed. Departed blocked if Medical 2 is UNFIT | Clearance Queue, Ticketing modal in `/applicants/[id]` | `VERIFIED VIA CONTRACT / LIVE 403` | Terminal departure gated by state machine medical 2 check. |
| **Complaint** | `Complaint Manager` | Complaints, Applicants (read-only), Placements (read-only) | `create_complaint`, `acknowledge_complaint`, `resolve_complaint` (Free Replacement requires Manager role), `set_country_ban` | Complaints Desk, Complaints tab in Reports | `VERIFIED VIA CONTRACT / LIVE 403` | Free replacement outcome requires Manager authorization. |
| **Communication** | `Communication Manager` | Threads, Applicants (read-only), Placements (read-only) | Automatic recipient for `create_agency_thread`; manages internal and agency communication | Chat Workspace, Sidebar Chat link | `VERIFIED VIA CONTRACT / LIVE 403` | Agency threads locked to 2 participants by backend engine. |
| **Foreign Agency** | `Foreign Agency` | Available approved candidates (`list_portal_candidates`), own Wakala requests, own reserved candidates | `select_candidate` (atomic row-lock), `create_complaint`, `create_agency_thread`. Requires linked `Contractor` record | **Isolated to `/agent/*` and `/chat`** | `RUNTIME VERIFIED` | Verified live Railway 403 returned when no linked Contractor is associated with session user. |
| **Contract Parser** | `Contract Parser` | Placements, OCR parsing endpoints | `upload_contract`, `upload_visa`, `create_muayena_placement`, `parse_contract_file`, `parse_visa_file`, `parse_passport_file` | Placement Document Center, Intake OCR | `VERIFIED VIA CONTRACT / LIVE 403` | Dedicated intake and document attachment role. |
| **Country-Specific Clearance** | `Saudi LMIS`, `Saudi Taeshir`, `Saudi Embassy`, `Kuwait LMIS`, `Kuwait Telesign`, `Kuwait Embassy` | Assigned corridor clearance steps of matching `step_type` | Operates exact step matching role: LMIS↔`update_applicant_for_lmis`, Taeshir↔`parse_injaz_file`, Embassy↔`submit_embassy_step`, `stamp_embassy_step`, `reject_embassy_step` | Clearance Queue scoped to matching step types | `VERIFIED VIA CONTRACT / LIVE 403` | Cross-corridor or cross-step actions denied with 403 by backend. |

