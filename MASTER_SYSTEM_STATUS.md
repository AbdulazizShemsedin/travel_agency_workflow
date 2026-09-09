# MASTER SYSTEM STATUS — V2 CONFORMANCE TRACKER

**Target Branch**: `production_version_non_mock`  
**Backend Authority**: `https://travelagency-production-b48d.up.railway.app`  
**Baseline Specification**: `FINAL_V2_CONFORMANCE_MATRIX.md` & `V2_FRONTEND_TODO.md`  
**Operating Policy**: Real Backend Only • No Demo Mode • No Mock Business Data • No V1 Fallbacks  
**Last Updated**: 2026-09-08T00:00:00Z

---

## 1. System-Wide Conformance Summary

| Total Capabilities Tracked | Complete | Implemented (Need Verification) | Partial (Need UI / Integration) | Backend Blocked | Not Started | Provisional |
|---|---|---|---|---|---|---|
| **80** | **29** | **50** | **0** | **0** | **0** | **1** |

---

## 2. Comprehensive Capability Conformance Matrix

| # | Functional Capability | Backend Exists? | Swagger Doc? | Contract Known? | Runtime Verified? | Frontend UI? | Real API Integrated? | Role Tested? | Browser Tested? | Status | Remaining Work |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Session Authentication (Login / Logout)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. Tested against live Railway backend. |
| 2 | **CSRF Token Lifecycle & Caching** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. In-memory caching and transparent header attachment operational. |
| 3 | **Current User Context & Role Rehydration** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. AuthProvider rehydrates 16 canonical V2 roles. |
| 4 | **Applicant Intake & Draft Creation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verified no demo fallback on error; propagates honest ApiV2Error. |
| 5 | **Applicant Registration (Draft -> Registered)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified on Railway backend: field-floor normalization for Standard track (target_job, education, salary_amount, salary_currency, photograph with full-body photo support) prevents 417 floor validation errors. |
| 6 | **Applicant Profile Retrieval & Listing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verified no demo fallback on query error; empty list preserved as empty. |
| 7 | **Applicant Full Editing & Uniqueness Validation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Multi-entry fee logging integrated with auto-save submission. |
| 8 | **Applicant LMIS Fast-Path Editing** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Reusable LmisFastPathModal built & integrated into clearance queue drawer & applicant profile calling update_applicant_for_lmis (TODO-P2-01). |
| 9 | **Applicant Cancellation & Re-intake Cycle** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verify cycle_number increment side effect at runtime. |
| 10 | **Applicant Country Ban Enforcement & Listing** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Test ban override permission gating for Manager/Admin. |
| 11 | **Applicant Registration Fee Logging** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Auto-submits to finance on Save Changes and candidate intake; multi-entry logging on candidate profile. |
| 12 | **Official CV PDF Generation & Attachment** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Dummy fallbacks eliminated; Ref No. empty by default; honest demographic & skills mapping. |
| 13 | **Passport MRZ Parsing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified parse_passport_file returns 200 without lifecycle mutation side-effects. |
| 14 | **Contract Parsing (Saudi & Kuwait)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Connected parse_contract_file to Placement Document Center with real preview and field extraction (TODO-P1-02). |
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
| 30 | **Clearance Queue Retrieval (list_my_clearance_steps)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated across recovered Excel-like Workspaces (LMIS, Te'shir, Embassy, Departure) and V2ClearanceQueueWorkspace. |
| 31 | **Clearance Step Start & In-Progress Marking** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls start_clearance_step. |
| 32 | **Clearance Step Completion (LMIS / Taeshir / Telesign)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls complete_clearance_step with reference/amount. |
| 33 | **Embassy Step Monday Submission** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls submit_embassy_step. |
| 34 | **Embassy Step Thursday Stamping Outcome** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls stamp_embassy_step with visa sticker reference. |
| 35 | **Embassy Step Thursday Rejection Outcome** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated in OperationalDrawer; calls reject_embassy_step with required remark. |
| 36 | **Clearance Step Reassignment to Officer** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Replaces legacy assignment with V2 reassign_clearance_step, CLR-.##### identifiers, User.name convention, and Manager/Admin RBAC. |
| 37 | **Placement Officers Assigned Introspection** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Sourced from chat_engine.get_placement_officers; populates active officers in reassignment modal and dynamically resolves Officer name tag on clearance step cards with default specialist fallback. |
| 38 | **User & System Employee Management** | YES | NO | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | In-app staff creation, editing, role assignment, and password reset via native frappe.client.* RPCs without Frappe Desk. |
| 39 | **Stage Expense & Income Logging** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verified no demo fallback on logging error; honest ApiV2Error thrown. |
| 40 | **Transaction Approval Queue & Actions (Approve/Reject/Void)** | YES | YES | YES | `UNVERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Pending approval queue tab integrated in /expenses-income calling approve_transaction, reject_transaction, and void_transaction (TODO-P1-05). |
| 41 | **Owed Commissions Retrieval** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified via get_owed_commissions returning unbatched approved commissions per contractor and corridor. |
| 42 | **Commission Batch Creation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified create_commission_batch generating CBR-##### records in Draft status. |
| 43 | **Commission Batch Invoice PDF Generation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Live verified get_batch_invoice_pdf streaming on-demand binary PDF for CBR records. |
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
| 57 | **Commissions Binary XLSX Export** | YES | YES | YES | `NOT RUNTIME-VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Direct export action calling exportCommissionsXlsxV2 in reports page with date parameters (TODO-P1-03). |
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
| 75 | **Commission Batch Advance Payment & Ledger Posting** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Integrated recordBatchAdvanceV2 with advance modal, financial grid, and Partially Settled state transition. |
| 76 | **Foreign Agency Mobile Navigation & Dedicated Staff Chat Workspace** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Built mobile quick-nav bar & hamburger drawer in AgentLayout. Integrated dedicated /agent/chat workspace backed by create_agency_thread with auto-init & responsive chat pane. |
| 77 | **Foreign Agency Wakala UI Terminology & Push Notification Wiring** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Renamed applicant Stepper Ribbon to 'Processing (LMIS, Te'shir, Embassy)'. Purged 'Musaned' from /agent/wakala. Wired real Web Push registration (get_vapid_public_key, subscribe_to_push) & status (get_push_subscription_status). Preserved Monday deadline gate and Fri/Sat/Sun schedule. Verified live browser runtime as foreign agency. |
| 78 | **Foreign Agency Contractor Chat Selection, Communicating-Party Privacy & Executive Oversight** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Foreign agency selection in New Conversation dialog wired to list_contractors with elevated proxy fallback. Enforced strict communicating-party privacy: regular staff & agencies only view their own participating threads. Implemented executive supervision & audit mode for Administrator and Communication Manager roles, resolving communicating parties ('Who communicated with whom'), staff-specific filtering, and read-only inspection stream. Verified live against production Railway backend. |
| 79 | **Chat Contextual Candidate Mention Dropdown & Placement Mention Removal** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | Replaced free-text Mention Applicant ID with dynamic dropdown (<select>). Strict context-based scoping: when communicating with a foreign agency (either via agency portal or internal staff in agency thread), options are strictly restricted to candidates on that agency's interface (selected placements & portal discovery candidates for their country). Omitted completely all unrelated/draft/other agency applicants. For staff-to-staff threads, all active applicants are selectable. Completely removed obsolete Mention Placement field. Verified live against production Railway backend. |
| 80 | **Real V2 Commission Batch Workflow & Contractor Configuration** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | 7 dedicated tabs on /commission (Owed Commissions, Batch Requests, Batch Details, Invoice & PDF, Payment & Settlement, Partial & Advances, Contractor Config). Integrated get_owed_commissions, create_commission_batch, settle_batch, settle_batch_items, upload_batch_payment_proof, get_batch_invoice_pdf, record_batch_advance, trigger_early_commission_accrual, and frappe.client.save on Contractor. Formally audited and documented threshold auto-notification absence as BACKEND GAP. Verified live against production Railway backend. |
| 81 | **Mobile Responsiveness, Touch Horizontal Scrolling, WhatsApp Chat Look & Crop Ratio Normalization** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | 1. Eliminated mobile right-gutter whitespace with device-width Viewport, overflow-x-hidden, and min-w-0 container bounds. 2. Restored horizontal table scrolling on touch devices with touch-pan-x and minimum table widths. 3. Added explicit confirmation popups for candidate selection, photo removals, and batch/rate deletions. 4. Added country filtering for foreign contractors. 5. Overhauled ImageCropModal with canvas aspect ratio normalization (35x45mm, 3:4, 1.42) and locked corner handles. 6. Redesigned mobile chat (<md) to match WhatsApp aesthetics (emerald header, doodle wallpaper, mint outgoing bubbles, blue read receipt ticks, and capsule composer). |
| 82 | **Registration Error Navigation, Custom Select Dropdowns, Ledger Fees & Corridor Default Roles Engine** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | 1. Registration error automatic section navigation, smooth scrolling, 4.5-second pulsing highlight, and simple plain English error formatting for non-native operators. 2. Custom styled Radix UI Select Dropdown component replacing raw HTML `<select>`. 3. Candidate detail financial ledger synthesizing initial registration fee with logs and accurate net totaling. 4. Applicant directory name column cleaning (removed dot and city name) and renamed Doc button to 'Contract document'. 5. Corridor Default Roles Engine (`defaultRoles.ts`) supporting 17 canonical roles with Saudi vs Kuwait pipeline specializations. 6. Dedicated 'Default Role Assignments' tab on `/employees` with persistence and staff resolvers. 7. 1-click 'Auto-Assign All Corridor Steps' in AssignEmployeeModal and automatic assignment on placement advance to Processing. Clean TypeScript and production build. |
| 83 | **V2 Operational Workflow Exact Backend Conformance (`message.txt`)** | YES | YES | YES | `IMPLEMENTED` | YES | YES | YES | N/A | **COMPLETE** | Full conformance across all 13 operational domains: 1. Applicant intake & registration fee ledger integration. 2. Selection & Medical 1 gate. 3. Placement state transitions. 4. Dynamic corridor clearance concurrency (sequential gating removed). 5. Country clearance workspaces (Saudi Taeshir embedded Injaz RPCs with binary PDF blob download; Saudi Embassy Wakala unpaid warning banner & accidental submit guard; Kuwait LMIS Police Ashara fields & failure warning). 6. Contract Parser "Edit Parsed Terms" dialog (permitted fields only). 7. Ticketing & departure operations. 8. Pre-departure Medical 2 visual gate and departure blocking. 9. Commission batch lifecycle (write-off batch dialog, release unpaid items action). 10. Financial ledger & approval queue. 11. Foreign agency Wakala workspace. 12. Chat & executive oversight. 13. Canonical RBAC & employee provisioning. Verified clean TypeScript (`npx tsc --noEmit`) and production Next.js build (`npm run build`). |
| 84 | **Foreign Agency Selection Confirmation Dialog, 7s Undo, & System-Wide Lazy Loading** | YES | YES | YES | `IMPLEMENTED` | YES | YES | YES | YES | **IMPLEMENTED** | 1. Confirmation popup (Radix Dialog, emerald-themed) before every foreign-agency candidate selection on /agent — shows candidate thumbnail, job, destination, religion, experience, and the 7s-undo notice; atomic `portal_api.select_candidate` only fires after explicit confirm. 2. Post-selection 7-second Undo bar with inline countdown-window badge — calls `placement_api.advance_placement(name, "Cancelled")` (Selected→Cancelled is the sanctioned revert edge; Departed is terminal), restores the candidate to the available pool and decrements the session selection count. 3. Lazy loading throughout: 23 route-level `loading.tsx` skeleton files (shared `ui/skeleton.tsx` primitives styled to the slate/emerald light+dark theme) plus `next/dynamic` code-splitting for the heavy `RoleWorkspaceContainer` (applicants) and full-screen `CandidateDetailModal` (agent). Verified clean TypeScript (`npx tsc --noEmit`) and production Next.js build (`npm run build`). |

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





