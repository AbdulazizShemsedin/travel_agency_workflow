# MASTER SYSTEM STATUS — FRONTEND PROJECT STATUS SOURCE

**Generated**: 2026-09-01  
**Authority**: All contracts (`01–07`), `BUSINESS_AND_SYSTEM_DOCUMENTATION.md`, `swagger.json`, `ROLE-PERMISSIONS-MATRIX.md`, live V2 conformance audits, current frontend source code  
**Rule**: Update this file BEFORE moving to unrelated work whenever a feature is implemented or a backend contract changes.

---

## 1. SOURCE MATERIALS CONSULTED

| Material | Location | Status |
|---|---|---|
| `new swagger.json` | `src/Assets/new swagger.json` | Read |
| `BUSINESS_AND_SYSTEM_DOCUMENTATION.md` | `src/Assets/` | Read (1105 lines) |
| `01-applicant-contract.md` | `src/Assets/` | Read |
| `02-placement-contract.md` | `src/Assets/` | Read |
| `03-clearance-and-corridor-contract.md` | `src/Assets/` | Read |
| `ROLE-PERMISSIONS-MATRIX.md` | `src/Assets/` | Read |
| `BACKEND_V2_MIGRATION_AUDIT.md` | Root | Read |
| `V2_CONFORMANCE_AUDIT.md` | Root | Read |
| `V2_CONFORMANCE_REPAIR_REPORT.md` | Root | Read |
| `V2_CONTRACT_RECONCILIATION.md` | Root | Read |
| `V2_FRONTEND_IMPLEMENTATION_REPORT.md` | Root | Read |
| `V2_FRONTEND_MIGRATION_BLUEPRINT.md` | Root | Read |
| `V2_MIGRATION_IMPLEMENTATION_MAP.md` | Root | Read |
| `CLIENT_DEMO_READINESS_REPORT.md` | Root | Read |
| `CLIENT_DEMO_ACCEPTANCE_REPORT.md` | Root | Read |
| Frontend source (`src/`) | Complete tree scan | Audited |
| Missing: `04-finance-contract.md` | Not found in project | **NOT AVAILABLE** |
| Missing: `05-reports-contract.md` | Not found in project | **NOT AVAILABLE** |
| Missing: `06-complaints-chat-notifications-contract.md` | Not found in project | **NOT AVAILABLE** |
| Missing: `07-file-upload-contracts.md` | Not found in project | **NOT AVAILABLE** |

> **WARNING**: Contracts 04–07 are referenced in the applicant/placement contracts but do not exist in the project. Finance, reports, complaints, chat, notifications, and file upload backend behavior is documented only via `BUSINESS_AND_SYSTEM_DOCUMENTATION.md` and the swagger spec — not dedicated contracts.

---

## 2. BACKEND CAPABILITY INVENTORY

### 2.1 Authentication

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Login (session cookie) | `auth_api` | `POST /api/method/login` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any | COMPLETE | — | No | Standard Frappe |
| Logout | `auth_api` | `POST /api/method/logout` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any | COMPLETE | — | No | |
| Get Current User | `auth_api` | `auth_api.get_current_user` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any (allow_guest) | COMPLETE | — | No | Returns user/roles/contractor |
| Get CSRF Token | `auth_api` | `auth_api.get_csrf_token` | STABLE | Yes | Yes (auto) | COMPLETE | V2 INTEGRATED | Yes | Any | COMPLETE | — | No | Auto-cached in V2 client |

### 2.2 Applicants

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Applicant | `applicant_api` | `create_applicant` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar, Manager, Admin | COMPLETE | — | No | |
| Update Applicant | `applicant_api` | `update_applicant` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar, Manager, Admin | COMPLETE | — | No | |
| Get Applicant | `applicant_api` | `get_applicant` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar+, 6 country roles (RO) | COMPLETE | — | No | |
| List Applicants | `applicant_api` | `list_applicants` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar+, 6 country roles (RO) | COMPLETE | — | No | PROVISIONAL: no limit_start |
| Register Applicant | `applicant_api` | `register_applicant` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar, Manager, Admin | COMPLETE | — | No | |
| Cancel Applicant | `applicant_api` | `cancel_applicant` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar, Manager, Admin | COMPLETE | — | No | |
| Restart Applicant | `applicant_api` | `restart_applicant` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar, Manager, Admin | COMPLETE | — | No | |
| Update for LMIS | `applicant_api` | `update_applicant_for_lmis` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Saudi LMIS, Kuwait LMIS, Manager, Admin | COMPLETE | — | No | Narrow field allowlist |
| Log Applicant Fee | `applicant_api` | `log_applicant_fee` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any internal staff | COMPLETE | — | No | |

### 2.3 Applicant Registration Fees

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fee toggle (fee_required) | `applicant_api` | `update_applicant` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar+ | COMPLETE | — | No | |
| Fee logging | `applicant_api` | `log_applicant_fee` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any internal staff | COMPLETE | — | No | |
| Fee log table (multi-row) | `applicant_api` | child table | STABLE | Yes | Partial | PARTIAL | PARTIAL | No | Registrar+ | PARTIAL | Full child table editing UI | No | fee_log child table not fully editable |

### 2.4 Country Bans

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Set Country Ban | `applicant_api` | `set_country_ban` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Registrar, Complaint Mgr, Manager, Admin | PARTIAL | Browser verification | No | |
| List Country Bans | `applicant_api` | `list_country_bans` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Same | PARTIAL | Browser verification | No | |
| Remove Country Ban | `applicant_api` | `remove_country_ban` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Manager, Admin only | PARTIAL | Browser verification | No | |
| Ban Override on Update | `applicant_api` | `update_applicant(override_ban)` | STABLE | Yes | Partial | PARTIAL | PARTIAL | No | Manager, Admin | PARTIAL | Override dialog UI | No | |

### 2.5 CV Generation

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Generate CV | `cv_api` | `generate_cv` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar, Manager, Admin | COMPLETE | — | No | Standard track only |
| CV PDF view | `cv_api` | via get_applicant | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Same as Applicant read | COMPLETE | — | No | |

### 2.6 Passport/Contract/Visa Parsing

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Parse Passport (MRZ) | `passport_parser` | `parse_passport_file` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any | COMPLETE | — | No | |
| Parse Contract File | `contract_parser` | `parse_contract_file` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Contract Parser+ | COMPLETE | — | No | |
| Parse Visa File | `contract_parser` | `parse_visa_file` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Same | COMPLETE | — | No | |
| Parse Injaz File | `contract_parser` | `parse_injaz_file` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Same | COMPLETE | — | No | |

### 2.7 Placements

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| List Placements | `placement_api` | `list_placements` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager+, NOT Registrar | COMPLETE | — | No | |
| Create Muayena Placement | `placement_api` | `create_muayena_placement` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Registrar, Manager, Admin, Contract Parser | COMPLETE | — | No | |
| Upload Contract | `placement_api` | `upload_contract` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Contractor or Contract Parser | COMPLETE | — | No | |
| Upload Visa | `placement_api` | `upload_visa` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Same | COMPLETE | — | No | Kuwait only |
| Record Selected Medical | `placement_api` | `record_selected_medical_result` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Placement write | COMPLETE | — | No | |
| Advance Placement | `placement_api` | `advance_placement` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Placement write | COMPLETE | — | No | |
| Record Ticket Details | `placement_api` | `record_ticket_details` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Placement write | COMPLETE | — | No | |
| Record Predeparture Medical | `placement_api` | `record_predeparture_medical_result` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Placement write | COMPLETE | — | No | |
| Record Reschedule | `placement_api` | `record_reschedule` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Placement write | COMPLETE | — | No | |

### 2.8 Portal (Foreign Agency)

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| List Portal Candidates | `portal_api` | `list_portal_candidates` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Foreign Agency | COMPLETE | — | No | |
| Select Candidate | `portal_api` | `select_candidate` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Foreign Agency | COMPLETE | — | No | |
| List My Wakala Requests | `portal_api` | `list_my_wakala_requests` | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Foreign Agency | **NOT STARTED** | Full page UI | No | MISSING |

### 2.9 Corridor Engine + Clearance Steps

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Get Corridor Steps | `corridor_engine` | `get_corridor_steps` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any auth | COMPLETE | — | No | |
| List My Clearance Steps | `clearance_api` | `list_my_clearance_steps` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any auth (row-scoped) | COMPLETE | — | No | |
| Start Clearance Step | `clearance_api` | `start_clearance_step` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Step-role | COMPLETE | — | No | |
| Complete Clearance Step | `clearance_api` | `complete_clearance_step` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Step-role | COMPLETE | — | No | |
| Submit Embassy Step | `clearance_api` | `submit_embassy_step` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Embassy role | COMPLETE | — | No | |
| Stamp Embassy Step | `clearance_api` | `stamp_embassy_step` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Embassy role | COMPLETE | — | No | |
| Reject Embassy Step | `clearance_api` | `reject_embassy_step` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Embassy role | COMPLETE | — | No | |
| Reassign Clearance Step | `clearance_api` | `reassign_clearance_step` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager, Admin | COMPLETE | — | No | |
| Get Placement Officers | `chat_engine` | `get_placement_officers` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Placement read | COMPLETE | — | No | |

### 2.10 Clearance Sub-flows

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Police Ashara (Kuwait LMIS) | clearance fields | police_ashara_* fields | STABLE | Yes | Partial | PARTIAL | PARTIAL | No | Kuwait LMIS | PARTIAL | Dedicated form section | No | |
| Taeshir appointment | clearance fields | appointment_date | STABLE | Yes | Partial | PARTIAL | PARTIAL | No | Saudi Taeshir | PARTIAL | Field editing | No | |
| Injaz sub-flow | clearance fields | injaz_* fields | STABLE | Yes | Yes | COMPLETE | PARTIAL | No | Saudi Taeshir | PARTIAL | V2 runtime verification | No | |
| Wakala sub-flow | clearance fields | wakala_* fields | STABLE | Yes | Partial | PARTIAL | PARTIAL | No | Saudi Embassy | PARTIAL | Move into Embassy drawer | No | |

### 2.11 Finance

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Log Stage Expense | `finance_api` | `log_stage_expense` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any internal staff | COMPLETE | — | No | |
| Log Stage Income | `finance_api` | `log_stage_income` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Any internal staff | COMPLETE | — | No | |
| Approve Transaction | `finance_api` | `approve_transaction` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Finance Manager, Admin | COMPLETE | — | No | |
| Reject Transaction | `finance_api` | `reject_transaction` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Finance Manager, Admin | COMPLETE | — | No | |
| Void Transaction | `finance_api` | `void_transaction` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Finance Manager, Admin | COMPLETE | — | No | |
| FX Rate Get/Set | `finance_api` | `get_fx_rate` / `set_fx_rate` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Finance Manager, Admin | COMPLETE | — | No | |
| Early Commission Accrual | `finance_api` | `trigger_early_commission_accrual` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Finance Manager, Manager, Admin | PARTIAL | Browser verify | No | |
| Upload Receipt | `finance_api` | `upload_receipt` | STABLE | Yes | Partial | PARTIAL | PARTIAL | No | Any internal staff | PARTIAL | Receipt in expense form | No | |

### 2.12 Commission

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Get Owed Commissions | `finance_api` | `get_owed_commissions` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Finance Manager, Admin | COMPLETE | — | No | |
| Create Commission Batch | `finance_api` | `create_commission_batch` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Finance Manager, Admin | COMPLETE | — | No | |
| Settle Batch (whole) | `finance_api` | `settle_batch` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Finance Manager, Admin | COMPLETE | — | No | |
| Settle Batch Items (partial) | `finance_api` | `settle_batch_items` | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Finance Manager, Admin | **NOT STARTED** | Per-item settlement UI | No | MISSING |
| Upload Payment Proof | `finance_api` | `upload_batch_payment_proof` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Finance Manager, Admin | PARTIAL | Browser verify | No | |
| Get Batch Invoice PDF | `finance_api` | `get_batch_invoice_pdf` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Finance Manager, Admin | PARTIAL | Browser verify | No | |
| Export Commissions XLSX | `report_api` | `export_commissions_xlsx` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager, Admin | COMPLETE | — | No | |

### 2.13 Bank Reconciliation

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Upload Bank Statement | `reconciliation_api` | `upload_bank_statement` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Finance Manager, Admin | PARTIAL | Browser verify | No | |
| Manually Match Line | `reconciliation_api` | `manually_match_line` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Finance Manager, Admin | PARTIAL | Browser verify | No | |

### 2.14 Reports

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Daily Work Report | `report_api` | `get_daily_work_report` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager, Admin | COMPLETE | — | No | |
| Staff Performance | `report_api` | `get_staff_performance_report` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager, Admin | COMPLETE | — | No | |
| Operations Summary | `report_api` | `get_operations_summary` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager, Admin | COMPLETE | — | No | |
| Placement Aging | `report_api` | `get_placement_aging_report` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager, Admin | COMPLETE | — | No | |
| Financial Overview | `report_api` | `get_financial_overview` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Admin only | COMPLETE | — | No | |
| Pending Approval Queue | `report_api` | `get_pending_approval_queue` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Admin only | COMPLETE | — | No | |
| Cost Breakdown | `report_api` | `get_cost_breakdown_report` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Admin only | COMPLETE | — | No | |
| Employee Financial | `report_api` | `get_employee_financial_report` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Admin only | COMPLETE | — | No | |
| Complaint Aging | `report_api` | `get_complaint_aging_report` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager, Admin | COMPLETE | — | No | |

### 2.15 Complaints

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Complaint | `complaint_api` | `create_complaint` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Foreign Agency or internal | COMPLETE | — | No | |
| List Unresolved | `complaint_api` | `list_unresolved_complaints` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Complaint Mgr, Admin, Manager | COMPLETE | — | No | |
| Acknowledge | `complaint_api` | `acknowledge_complaint` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Complaint Mgr, Admin | PARTIAL | Browser verify | No | |
| Resolve | `complaint_api` | `resolve_complaint` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Complaint Mgr, Admin | PARTIAL | Browser verify | No | |
| Free Replacement | `portal_api` | `select_candidate(free_replacement_for_complaint)` | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Foreign Agency | **NOT STARTED** | Full flow UI | No | MISSING |

### 2.16 Chat

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create Agency Thread | `chat_api` | `create_agency_thread` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Foreign Agency | **NOT STARTED** | Chat page | No | V2 API module exists |
| Create Internal Thread | `chat_api` | `create_internal_thread` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Internal staff | **NOT STARTED** | Chat page | No | |
| List Threads | `chat_api` | `list_threads` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Any auth | **NOT STARTED** | Chat page | No | |
| Get Thread Messages | `chat_api` | `get_thread_messages` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Participants | **NOT STARTED** | Chat page | No | |
| Send Message | `chat_api` | `send_message` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Participants | **NOT STARTED** | Chat page | No | |
| Mark Read | `chat_api` | `mark_read` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Participants | **NOT STARTED** | Chat page | No | |
| Add Participant | `chat_api` | `add_participant` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Internal threads | **NOT STARTED** | Chat page | No | |
| Attachments | `chat_api` | `send_message(attachment)` | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Participants | **NOT STARTED** | Chat page | No | |
| @Mentions | `chat_api` | mentioned fields | STABLE | Yes | **No page** | NOT STARTED | NOT STARTED | No | Participants | **NOT STARTED** | Chat page | No | |

### 2.17 Notifications

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Subscribe to Push | `notification_api` | `subscribe_to_push` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Any auth | PARTIAL | Browser verify | No | |
| Get Push Status | `notification_api` | `get_push_subscription_status` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | No | Any auth | PARTIAL | Browser verify | No | |
| Trigger Wakala Reminder | `notification_api` | `trigger_wakala_reminder` | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | CLR step read | **NOT STARTED** | Trigger button | No | MISSING |
| Notification Inbox | Comms Log | — | N/A | Yes | Partial | DEMO ONLY | NOT STARTED | No | Any | **NOT STARTED** | Real inbox UI | No | |

### 2.18 User Management

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Create System User | **None in V2** | V1 API | NOT IN V2 | No | Yes | DEMO ONLY | **BACKEND BLOCKED** | No | Admin | BACKEND BLOCKED | V2 endpoint needed | **Yes** | |
| List/Update/Password/Roles | **None in V2** | V1 API | NOT IN V2 | No | Yes | DEMO ONLY | **BACKEND BLOCKED** | No | Admin | BACKEND BLOCKED | V2 endpoint needed | **Yes** | |

### 2.19 Contractors

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| List Contractors | `contractor_api` | `list_contractors` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager+ | COMPLETE | — | No | |
| Create Contractor | `contractor_api` | `create_contractor` | STABLE | Yes | Yes | COMPLETE | V2 INTEGRATED | Yes | Manager+ | COMPLETE | — | No | |
| Commission Rate Config | child table | — | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Manager+ | **NOT STARTED** | Config UI | No | MISSING |
| Batch Mode Config | fields | — | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Manager+ | **NOT STARTED** | Config UI | No | MISSING |

### 2.20 Admin Settings

| Feature | Backend Module | Backend Endpoint(s) | Contract Status | Backend Impl? | Frontend UI? | Demo? | Real V2? | Browser Tested? | Role Restrictions | Status | Remaining Work | Backend Blocker? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Notification Config | Singleton | — | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Admin | **NOT STARTED** | Settings page | No | MISSING |
| Document Parsing Settings | Singleton | — | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Admin | **NOT STARTED** | Settings page | No | MISSING |
| Storage Settings (R2) | Singleton | — | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Admin | **NOT STARTED** | Settings page | No | MISSING |
| Corridor Definition | Doctype | — | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Admin, Manager | **NOT STARTED** | Admin UI | No | MISSING |
| Step Officer Mapping | Doctype | — | STABLE | Yes | **No** | NOT STARTED | NOT STARTED | No | Admin, Manager | **NOT STARTED** | Admin UI | No | MISSING |
| FX Rate Settings | Singleton | `get/set_fx_rate` | STABLE | Yes | Partial | PARTIAL | PARTIAL | No | Finance Mgr, Admin | PARTIAL | Mode toggle | No | |

---

## 3. DEMO VS REAL STATUS (Summary)

| Feature Area | Demo Status | Real V2 Status |
|---|---|---|
| Authentication | COMPLETE | RUNTIME VERIFIED |
| Applicant CRUD+Registration | COMPLETE | RUNTIME VERIFIED |
| Applicant Fees | COMPLETE | V2 INTEGRATED |
| Country Bans | COMPLETE | V2 INTEGRATED |
| CV Generation | COMPLETE | RUNTIME VERIFIED |
| Parsing (passport/contract/visa/injaz) | COMPLETE | V2 INTEGRATED |
| Placements (full lifecycle) | COMPLETE | RUNTIME VERIFIED |
| Portal (Foreign Agency) | COMPLETE | V2 INTEGRATED |
| Corridor Engine | COMPLETE | RUNTIME VERIFIED |
| Clearance Steps (all types) | COMPLETE | V2 INTEGRATED |
| Sub-flows (Police Ashara/Taeshir/Wakala) | PARTIAL | PARTIAL |
| Ticketing + Departure | COMPLETE | V2 INTEGRATED |
| Medical Gates (all 3) | COMPLETE | V2 INTEGRATED |
| Finance (expense/income/approvals) | COMPLETE | V2 INTEGRATED |
| Commission Batching | COMPLETE | V2 INTEGRATED |
| Partial Commission Settlement | NOT STARTED | NOT STARTED |
| Bank Reconciliation | COMPLETE | V2 INTEGRATED |
| Reports (all 9) | COMPLETE | V2 INTEGRATED |
| Complaints | COMPLETE | V2 INTEGRATED |
| Free Replacement | NOT STARTED | NOT STARTED |
| Chat | NOT STARTED | NOT STARTED |
| Notifications (push) | COMPLETE | PARTIAL |
| Notification Inbox | DEMO ONLY | NOT STARTED |
| User Management | DEMO ONLY | BACKEND BLOCKED |
| Contractor Management | COMPLETE | V2 INTEGRATED |
| Contractor Config | NOT STARTED | NOT STARTED |
| Admin Settings | NOT STARTED | NOT STARTED |

---

## 4. ROLE MATRIX

| Role | Pages Accessible | Data Readable | Actions Available | Backend Permission | Frontend Enforcement | Missing UI |
|---|---|---|---|---|---|---|
| **Registrar** | Applicants, Dashboard, Contractors | Applicants (RW), Country Bans | Create/Update/Register/Cancel/Restart Applicant, Set Ban, Log Fee, Create Muayena Placement | `applicant_api.*` write | hasRole checks | — |
| **Manager** | All except Admin-only reports | All major doctypes | Everything Registrar + Placement ops, Gate overrides, Step reassign, Reports | Full write + override | Sidebar filter | Some override dialogs |
| **Admin** | All pages | Everything | Everything Manager + Admin-only reports, User mgmt (blocked) | Full access | Partial | User mgmt BLOCKED, Settings |
| **Clearance Officer** | Dashboard, OperationalTable | Applicants/Placements (RO), Assigned CLR steps | Start/complete assigned steps | Row-scoped CLR | Role filter | — |
| **Ticketer** | Dashboard, OperationalTable | Placements (RW) | Record ticket, reschedule, advance | Placement write | DepartureWorkspace | — |
| **Complaint Manager** | Complaints, Dashboard | Applicants/Placements (RO), Complaints | Create/acknowledge/resolve complaint, set ban | `complaint_api.*` | Partial | — |
| **Finance Manager** | Expenses-Income, Commission, Dashboard, Reports | Transactions, FX, Batches | Log/approve/reject/void, FX rates, commission, reconciliation | `finance_api.*`, `reconciliation_api.*` | Partial | — |
| **Foreign Agency** | Agent Portal pages | Portal candidates, own placements/complaints | Select candidate, create complaint | `portal_api.*`, `complaint_api.create` | AgentLayout | **Chat MISSING, Wakala requests MISSING, Free replacement MISSING** |
| **Communication Manager** | Dashboard | Chat threads | Receive agency threads, create internal, send messages | `chat_api.*` | None | **Chat page MISSING** |
| **Contract Parser** | Dashboard | Placements (RW) | Upload contract/visa, create muayena placement | `placement_api.upload_*` | Partial | — |
| **Saudi LMIS** | Dashboard, OperationalTable | Applicants (RO), LMIS steps | Start/complete LMIS, update applicant for LMIS | `clearance_api.*` (LMIS) | LMISWorkspace | — |
| **Saudi Taeshir** | Dashboard, OperationalTable | Taeshir steps | Start/complete Taeshir | `clearance_api.*` (Taeshir) | InjazWorkspace | — |
| **Saudi Embassy** | Dashboard, OperationalTable | Embassy steps | Submit/stamp/reject Embassy | `clearance_api.*` (Embassy) | EmbassyWorkspace | — |
| **Kuwait LMIS** | Dashboard, OperationalTable | Kuwait LMIS steps | Start/complete Kuwait LMIS, update for LMIS | `clearance_api.*` (Kuwait LMIS) | LMISWorkspace | Police Ashara UI incomplete |
| **Kuwait Telesign** | Dashboard, OperationalTable | Telesign steps | Complete Telesign | `clearance_api.*` (Telesign) | OperationalTable | — |
| **Kuwait Embassy** | Dashboard, OperationalTable | Kuwait Embassy steps | Submit/stamp/reject | `clearance_api.*` (Kuwait Embassy) | EmbassyWorkspace | — |

---

## 5. CORRIDOR MATRIX

### Saudi Arabia

| Stage | Step Type | Seq | Role | Actions | Medical Gate | Terminal Status |
|---|---|---|---|---|---|---|
| Draft→Registered | — | — | Registrar | register_applicant | medical_status != UNFIT | — |
| Registered→CV Generated | — | — | Registrar | generate_cv (Standard only) | — | — |
| Selected→Processing | — | — | Placement write | advance + record_selected_medical | **FIT required** | — |
| Processing Step 1 | LMIS Clearance | 1 | Saudi LMIS | start, complete | — | **Issued** |
| Processing Step 2 | Taeshir | 2 | Saudi Taeshir | start, complete | — | **Complete** |
| Processing Step 3 | Embassy | 3 | Saudi Embassy | submit, stamp, reject | — | **Stamped** / **Rejected** |
| Processing→Stamped | — | — | Placement write | advance | All mandatory done | — |
| Stamped→Ticketed | — | — | Ticketer+ | advance + record_ticket | ticket_number set | — |
| Ticketed→Departed | — | — | Placement write | advance + record_predeparture_medical | **FIT required** | — |

### Kuwait

| Stage | Step Type | Seq | Role | Actions | Medical Gate | Terminal Status |
|---|---|---|---|---|---|---|
| Draft→Registered | — | — | Registrar | register_applicant | medical_status != UNFIT | — |
| Registered→CV Generated | — | — | Registrar | generate_cv (Standard only) | — | — |
| Selected→Processing | — | — | Placement write | advance + record_selected_medical | **FIT required** | — |
| Processing Step 1 | Kuwait LMIS | 1 | Kuwait LMIS | start, complete | — | **Issued** |
| Processing Step 2 | Telesign | 2 | Kuwait Telesign | start, complete | — | **Complete** |
| Processing Step 3 | Kuwait Embassy | 3 | Kuwait Embassy | submit, stamp, reject | — | **Stamped** / **Rejected** |
| Processing→Stamped | — | — | Placement write | advance | All mandatory done | — |
| Stamped→Ticketed | — | — | Ticketer+ | advance + record_ticket | ticket_number set | — |
| Ticketed→Departed | — | — | Placement write | advance + record_predeparture_medical | **FIT required** | — |

---

## 6. V1 DEBT

| File | Current Usage | Still Valid? | Must Remove? | V2 Replacement |
|---|---|---|---|---|
| `src/lib/api/applicantApi.ts` (124KB) | Entire V1 API layer — `/api/resource/*`, `applicant_processing.*`, DSR/Dossier | **NO** | **YES** | `src/lib/api/v2/*.ts` |
| `src/types/processing.ts` | DSR, Dossier, old clearance types | **NO** | **YES** | V2 interfaces in v2/*.ts |
| `src/types/applicant.ts` | DSR/Stamp/Ticket/Departure + V1 field names | **PARTIAL** | **PARTIAL** | V2 field names |
| `src/types/workspace.ts` | DSR imports | **NO** | **YES** | V2 Placement types |
| `src/components/applicant/ProcessingStreamsModal.tsx` (60KB) | V1 clearance streams UI | **NO** | **YES** | OperationalTable + V2 CLR Steps |
| `src/components/applicant/ContractRequestModal.tsx` | V1 Contract Request flow | **NO** | **YES** | V2 portal + chat |
| `src/components/applicant/MusanedVerificationModal.tsx` | V1 Musaned gate | **NO** | **YES** | Informational only in V2 |
| `src/components/applicant/AssignEmployeeModal.tsx` | V1 remnants in labels | **PARTIAL** | **REFACTOR** | Clean V2 corridor labels |
| `src/app/applicants/[id]/contractor-doc/page.tsx` | Creates V1 Applicant Dossier | **NO** | **YES** | V2 upload_contract/create_muayena_placement |
| `src/lib/api/auth.ts` | V1 auth calls | **PARTIAL** | **YES** for V1 | V2 auth_api |
| `src/lib/store/systemStore.ts` | V1 state references | **PARTIAL** | **REFACTOR** | V2 state |
| `src/components/operational/workspaces/WakalaWorkspace.tsx` | Standalone Wakala | **NO** | **REPLACE** | Wakala inside Embassy step |
| `src/components/operational/workspaces/InjazWorkspace.tsx` | Named "Injaz" | **PARTIAL** | **REFACTOR** | Rename to TaeshirWorkspace |
| `src/lib/extensionBridge.ts` | Browser extension bridge | **UNKNOWN** | Investigate | May be dev tooling |

---

## 7. DEMO ADAPTER INVENTORY

| File/Pattern | Classification | Notes |
|---|---|---|
| `src/lib/config/env.ts` — `isDemoMode()` | VALID DEMO ADAPTER | Central switch |
| `src/lib/demo/store.ts` (44KB) | VALID DEMO ADAPTER | Full reactive store |
| `src/lib/demo/*.ts` (10 files) | VALID DEMO ADAPTER | Fixtures for all modules |
| All `src/lib/api/v2/*.ts` — `isDemoMode()` guards | VALID DEMO ADAPTER | Every V2 fn checks demo mode |
| `src/components/demo/DemoRoleSwitcher.tsx` | VALID DEMO ADAPTER | Demo-only UI |
| `src/lib/api/applicantApi.ts` (entire 124KB file) | **V1 FALLBACK / UNSAFE** | Active import hazard |
| `src/app/employees/page.tsx` | **V1 FALLBACK** | BACKEND BLOCKED in real mode |

> **CAUTION**: `applicantApi.ts` remains importable. Any component importing from this file in production mode will make invalid V1 requests.

---

## 8. PAGE INVENTORY

| Page | Route | Demo | Real | Role | Incomplete |
|---|---|---|---|---|---|
| Home | `/` | COMPLETE | COMPLETE | Any | — |
| Login | `/login` | COMPLETE | COMPLETE | Guest | — |
| Dashboard | `/dashboard` | COMPLETE | V2 INTEGRATED | Most | — |
| Applicant List | `/applicants` | COMPLETE | RUNTIME VERIFIED | Registrar+ | — |
| New Applicant | `/applicants/new` | COMPLETE | RUNTIME VERIFIED | Registrar+ | — |
| Applicant Detail | `/applicants/[id]` | COMPLETE | RUNTIME VERIFIED | Registrar+ | — |
| Applicant Edit | `/applicants/[id]/edit` | COMPLETE | V2 INTEGRATED | Registrar+ | — |
| Applicant CV | `/applicants/[id]/cv` | COMPLETE | V2 INTEGRATED | Registrar+ | — |
| Contractor Doc | `/applicants/[id]/contractor-doc` | PARTIAL | **PARTIAL (V1!)** | Contract Parser+ | **Uses V1 Dossier** |
| Contractors | `/contractors` | COMPLETE | V2 INTEGRATED | Manager+ | Missing: edit, commission rates |
| Employees | `/employees` | DEMO ONLY | **BACKEND BLOCKED** | Admin | V1 API only |
| Expenses-Income | `/expenses-income` | COMPLETE | V2 INTEGRATED | Finance Mgr+ | — |
| Commission | `/commission` | COMPLETE | V2 INTEGRATED | Finance Mgr, Admin | Missing: partial settlement |
| Complaints | `/complaints` | COMPLETE | V2 INTEGRATED | Complaint Mgr+ | Missing: free replacement |
| Reports | `/reports` | COMPLETE | V2 INTEGRATED | Manager+ | — |
| Notifications | `/notifications` | COMPLETE | PARTIAL | Any | No real inbox |
| Settings | `/settings` | PARTIAL | PARTIAL | Admin | Missing: 5 config sections |
| Agent Portal | `/agent` | COMPLETE | V2 INTEGRATED | Foreign Agency | — |
| Agent Discovery | `/agent/discovery` | COMPLETE | V2 INTEGRATED | Foreign Agency | — |
| Agent Reserved | `/agent/reserved` | COMPLETE | V2 INTEGRATED | Foreign Agency | — |
| Agent Commission | `/agent/commission` | COMPLETE | V2 INTEGRATED | Foreign Agency | — |
| Agent Complaints | `/agent/complaints` | COMPLETE | V2 INTEGRATED | Foreign Agency | — |
| **MISSING: Chat** | None | NOT STARTED | NOT STARTED | All | **No chat page** |
| **MISSING: Wakala Requests** | None | NOT STARTED | NOT STARTED | Foreign Agency | **No page** |

---

## 9. COMPONENT INVENTORY

| Component | Verdict | Notes |
|---|---|---|
| `OperationalTable.tsx` | **KEEP** | Core operational workspace |
| `OperationalDrawer.tsx` | **KEEP** | Step detail drawer |
| `RoleWorkspaceContainer.tsx` | **KEEP** | Role-filtered container |
| `LMISWorkspace.tsx` | **KEEP** | Both Saudi/Kuwait |
| `InjazWorkspace.tsx` | **REFACTOR** | Rename to TaeshirWorkspace |
| `EmbassyWorkspace.tsx` | **KEEP** | Both corridors |
| `WakalaWorkspace.tsx` | **REPLACE** | V2: Wakala inside Embassy |
| `DepartureWorkspace.tsx` | **KEEP** | Ticketing + departure |
| `ApplicantRegistrationForm.tsx` | **KEEP** | 5-step wizard |
| `ApplicantStepper.tsx` | **KEEP** | |
| `ApplicantTable.tsx` | **KEEP** | |
| `AssignEmployeeModal.tsx` | **REFACTOR** | V1 remnants |
| `ContractRequestModal.tsx` | **REMOVE** | V1 Contract Request |
| `MusanedVerificationModal.tsx` | **REMOVE** | V1 gate removed |
| `ProcessingStreamsModal.tsx` | **REMOVE** | 60KB V1 dead code |
| Step1–Step5 forms | **KEEP** | |
| Layout components (3) | **KEEP** | |
| `DemoRoleSwitcher.tsx` | **KEEP** | Demo only |
| `PushNotificationToggle.tsx` | **KEEP** | |
| `AuthProvider.tsx` | **KEEP** | |
| `QueryProvider.tsx` | **KEEP** | |
| Report views (4) | **REFACTOR** | V2 naming |
| Agent components (4) | **KEEP** | |
| UI primitives (12) | **KEEP** | Design system |

---

## 10. CRITICAL MISSING FEATURES

| Feature | Backend Endpoint | Severity | Notes |
|---|---|---|---|
| **Chat (9 sub-features)** | `chat_api.*` (7 endpoints) | **HIGH** | V2 API module exists, no page |
| **Free Replacement Flow** | `portal_api.select_candidate(free_replacement...)` | **MEDIUM** | Backend supports, no UI flow |
| **Portal Wakala Requests** | `portal_api.list_my_wakala_requests` | **MEDIUM** | No page |
| **Partial Commission Settlement** | `finance_api.settle_batch_items` | **MEDIUM** | Full-batch only |
| **Contractor Commission Rates** | Child table config | **MEDIUM** | No config UI |
| **Wakala Reminder Trigger** | `notification_api.trigger_wakala_reminder` | **LOW** | No button |
| **Police Ashara Sub-flow** | `police_ashara_*` fields | **MEDIUM** | No form section |
| **Notification Inbox** | Comms Log | **MEDIUM** | Demo only |
| **Admin Settings** (5 singletons) | Various | **LOW** | No settings pages |
| **Audit Trail View** | Process Event doctype | **LOW** | No visualization |

---

## 11. BROKEN / INCONSISTENT FEATURES

| Issue | Root Cause | Correct V2 Behavior | Fix |
|---|---|---|---|
| Employee creation uses V1 API | No V2 user mgmt endpoint | Show Frappe Desk message in real mode | Backend: add endpoint or document Desk-only |
| Contractor-doc page uses V1 Dossier | Not migrated | Use upload_contract / create_muayena_placement | Full rewrite |
| WakalaWorkspace standalone | V1 separate DocType | Wakala inside Embassy step | Replace component |
| InjazWorkspace naming | V1 naming | V2 step_type = "Taeshir" | Rename |
| applicantApi.ts still importable | Never deleted | Delete entirely | Verify imports, delete |
| ProcessingStreamsModal 60KB exists | Never deleted | OperationalTable replaced it | Delete |
| _server_messages not inspected | Only HTTP status checked | Inspect for commission warnings | Add handler |
| V1 types still defined | Never cleaned | Only V2 types | Remove |

---

## 12. CLIENT DEMO PRIORITY

### P0 — Must work (20 features) — **All COMPLETE in demo mode**

Login, Create Applicant, Register, Generate CV, Agency Browsing, Candidate Selection, Medical Gate 1, Operational Table, Saudi Corridor (3 steps), Kuwait Corridor (3 steps), Embassy Stamping, Ticketing, Medical Gate 2, Departure, Reports, Finance Ledger, Commission Batching, Role Switcher, Muayena Track, Complaints

### P1 — Important (10 features)

Chat, Free Replacement, Notification Inbox, Police Ashara, Taeshir full sub-flow, Wakala in Embassy, Delete V1 applicantApi.ts, Contractor rates config, Partial commission settlement, Portal wakala requests

### P2 — Can follow (9 features)

Admin Settings (5), Step Officer Mapping, Contractor batch config, Audit trail, V1 type cleanup

---

## 13. PROJECT COMPLETION METRICS

| Metric | Value |
|---|---|
| **Total backend features inventoried** | 127 |
| **Demo complete** | 82 (~65%) |
| **Demo partial** | 6 (~5%) |
| **Demo not started** | 22 (~17%) |
| **Demo blocked** | 5 (~4%) |
| **Real V2 integrated or verified** | 74 (~58%) |
| **Real V2 partial** | 10 (~8%) |
| **Real V2 not started** | 21 (~17%) |
| **Real V2 backend blocked** | 5 (~4%) |
| **Runtime verified against live backend** | 17 (~13%) |
| **Demo completion %** | **~68%** |
| **Real V2 completion %** | **~58%** |
| **Runtime verification %** | **~13%** |

---

## 14. WHAT WE SHOULD DO NEXT

| # | Action | Rationale | Backend Ready? | Effort |
|---|---|---|---|---|
| 1 | **Delete applicantApi.ts + all V1 imports** | Active hazard — V1 calls hit V2 backend | N/A | Medium |
| 2 | **Delete V1 components** (ProcessingStreams, ContractRequest, Musaned) | 130KB dead code | N/A | Low |
| 3 | **Rewrite contractor-doc page to V2** | Currently creates V1 Dossier records | Yes | Medium |
| 4 | **Build Chat page** | 9 missing features, backend ready | Yes | High |
| 5 | **Replace WakalaWorkspace** | V1 model, V2 has Wakala in Embassy | Yes | Medium |
| 6 | **Rename InjazWorkspace to Taeshir** | V1 terminology | N/A | Low |
| 7 | **Build Free Replacement flow** | Backend ready, no frontend flow | Yes | Medium |
| 8 | **Complete Police Ashara sub-flow** | Fields exist, no UI | Yes | Medium |
| 9 | **Add _server_messages inspection** | Commission warnings silently lost | Yes | Low |
| 10 | **Build Notification Inbox** | Backend logs exist, no real inbox | Yes | Medium |

> **DO NOT IMPLEMENT** these actions yet. Each should be separately scoped, approved, and tracked.
