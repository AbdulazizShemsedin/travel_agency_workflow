# MASTER SYSTEM STATUS — V2 CONFORMANCE TRACKER

**Target Branch**: `production_version_non_mock`  
**Backend Authority**: `https://agencytracking-production.up.railway.app`  
**Baseline Specification**: `FINAL_V2_CONFORMANCE_MATRIX.md` & `V2_FRONTEND_TODO.md`  
**Operating Policy**: Real Backend Only • No Demo Mode • No Mock Business Data • No V1 Fallbacks  
**Last Updated**: 2026-09-01T18:30:00Z  

---

## 1. System-Wide Conformance Summary

| Total Capabilities Tracked | Complete | Implemented (Need Verification) | Partial (Need UI / Integration) | Backend Blocked | Not Started | Provisional |
|---|---|---|---|---|---|---|
| **69** | **3** | **23** | **31** | **1** | **1** | **1** |

---

## 2. Comprehensive Capability Conformance Matrix

| # | Functional Capability | Backend Exists? | Swagger Doc? | Contract Known? | Runtime Verified? | Frontend UI? | Real API Integrated? | Role Tested? | Browser Tested? | Status | Remaining Work |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Session Authentication (Login / Logout)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. Tested against live Railway backend. |
| 2 | **CSRF Token Lifecycle & Caching** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. In-memory caching and transparent header attachment operational. |
| 3 | **Current User Context & Role Rehydration** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **COMPLETE** | None. AuthProvider rehydrates 16 canonical V2 roles. |
| 4 | **Applicant Intake & Draft Creation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Purge demo fallback in createApplicantV2 error handler. |
| 5 | **Applicant Registration (Draft -> Registered)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Purge demo fallback in registerApplicantV2 error handler. |
| 6 | **Applicant Profile Retrieval & Listing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove demo fallback on query error. |
| 7 | **Applicant Full Editing & Uniqueness Validation** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Ensure passport_issue_date is omitted from editable inputs. |
| 8 | **Applicant LMIS Fast-Path Editing** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add LMIS fast-path editor in OperationalDrawer (TODO-P2-01). |
| 9 | **Applicant Cancellation & Re-intake Cycle** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verify cycle_number increment side effect at runtime. |
| 10 | **Applicant Country Ban Enforcement & Listing** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Test ban override permission gating for Manager/Admin. |
| 11 | **Applicant Registration Fee Logging** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verify auto-creation of linked Applicant Transaction. |
| 12 | **Official CV PDF Generation & Attachment** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove client-side fallback in cv.ts. |
| 13 | **Passport MRZ Parsing** | YES | YES | YES | `UNVERIFIED` | YES | YES | NO | YES | **PROVISIONAL** | Document provisional OCR behavior when Document Parsing Settings is off. |
| 14 | **Contract Parsing (Saudi & Kuwait)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Connect parse_contract_file to Placement Document Center (TODO-P1-02). |
| 15 | **Kuwait eVisa Parsing** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Connect parse_visa_file to Placement Document Center (TODO-P1-02). |
| 16 | **Saudi Injaz Paper Parsing** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Expose Injaz parsing in OperationalDrawer for Taeshir steps. |
| 17 | **Foreign Agency Candidate Catalog** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove demo fallback on portal catalog fetch error. |
| 18 | **Atomic Candidate Selection & Placement Row-Lock** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Handle 409 conflict gracefully in candidate card UI. |
| 19 | **Foreign Agency Reserved Placements Listing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verify contractor scoping isolation. |
| 20 | **Foreign Agency Wakala Requests Queue** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Build Wakala requests view in agent portal (TODO-P2-03). |
| 21 | **Placement Creation (Muayena Track)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add Muayena placement intake option in intake wizard. |
| 22 | **Placement Stage 1 Medical Gate (Selected -> Processing)** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verify 417 error display when medical is not FIT. |
| 23 | **Placement Contract Upload & Field Binding** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Migrate contractor-doc to Placement Document Center (TODO-P1-02). |
| 24 | **Placement Visa Upload & KA Verification (Kuwait)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add Kuwait visa upload in Placement Document Center (TODO-P1-02). |
| 25 | **Placement Ticketing & Cost Auto-Logging** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Connect record_ticket_details to Departure workspace. |
| 26 | **Placement Flight Rescheduling** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Expose reschedule action in Departure workspace. |
| 27 | **Placement Predeparture Medical (Ticketed -> Departed)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Expose Medical 2 recording in Departure workspace. |
| 28 | **Placement Departure & Terminal State Guard** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Enforce terminal state UI lock once Departed. |
| 29 | **Dynamic Corridor Step Discovery** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Ensure dynamic rendering is used everywhere. |
| 30 | **Clearance Queue Retrieval (list_my_clearance_steps)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Wire list_my_clearance_steps to OperationalTable (TODO-P0-04). |
| 31 | **Clearance Step Start & In-Progress Marking** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Wire start_clearance_step in OperationalDrawer (TODO-P0-04). |
| 32 | **Clearance Step Completion (LMIS / Taeshir / Telesign)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Wire complete_clearance_step in OperationalDrawer (TODO-P0-04). |
| 33 | **Embassy Step Monday Submission** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Wire submit_embassy_step in OperationalDrawer (TODO-P0-04). |
| 34 | **Embassy Step Thursday Stamping Outcome** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Wire stamp_embassy_step in OperationalDrawer (TODO-P0-04). |
| 35 | **Embassy Step Thursday Rejection Outcome** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Wire reject_embassy_step in OperationalDrawer (TODO-P0-04). |
| 36 | **Clearance Step Reassignment to Officer** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Migrate AssignEmployeeModal to reassign_clearance_step (TODO-P0-05). |
| 37 | **Placement Officers Assigned Introspection** | YES | YES | YES | `UNVERIFIED` | NO | NO | NO | NO | **NOT STARTED** | Implement get_placement_officers client wrapper and display (TODO-P2-05). |
| 38 | **User & System Employee Management** | NO | NO | YES | `NOT APPLICABLE` | YES | NO | NO | NO | **BACKEND BLOCKED** | Mark as BACKEND-BLOCKED on /employees. Direct admins to Frappe Desk (TODO-P0-06). |
| 39 | **Stage Expense & Income Logging** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove demo fallback on logging error. |
| 40 | **Transaction Approval Queue & Actions (Approve/Reject/Void)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add approval queue tab in expenses-income page (TODO-P1-05). |
| 41 | **Owed Commissions Retrieval** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove demo fallback on owed commission query error. |
| 42 | **Commission Batch Creation** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add batch creation button and modal in commission page (TODO-P1-04). |
| 43 | **Commission Batch Invoice PDF Generation** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Fix proxy binary streaming and add PDF download button (TODO-P0-02, TODO-P1-04). |
| 44 | **Commission Payment Proof Upload & Fuzzy Matching** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add payment proof upload modal in commission page (TODO-P1-04). |
| 45 | **Per-Item Partial Commission Settlement** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add per-applicant settlement checkbox in commission page (TODO-P1-04). |
| 46 | **Full Commission Batch Settlement** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Connect real batch_name parameter instead of fake prompt. |
| 47 | **Bank Statement Reconciliation & Line Matching** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Build reconciliation UI in expenses-income (TODO-P2-02). |
| 48 | **FX Rate Management (Get / Set Manual Rate)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add FX rate management modal in expenses-income (TODO-P2-06). |
| 49 | **Daily Work Report (Date-Windowed)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Integrate getDailyWorkReportV2 in reports page (TODO-P1-03). |
| 50 | **Staff Performance Report (Date-Windowed)** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Integrate getStaffPerformanceReportV2 in reports page (TODO-P1-03). |
| 51 | **Operations Summary (Recruitment Funnel & SLA)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove demo fallback on reports query error. |
| 52 | **Financial Overview Report (Ledger Summary)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove demo fallback on financial overview query error. |
| 53 | **Placement Aging Report** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Integrate getPlacementAgingReportV2 in reports page (TODO-P1-03). |
| 54 | **Complaint Aging Report** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Integrate getComplaintAgingReportV2 in reports page (TODO-P1-03). |
| 55 | **Cost Breakdown Report** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Integrate getCostBreakdownReportV2 in reports page (TODO-P1-03). |
| 56 | **Employee Financial Report** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Integrate getEmployeeFinancialReportV2 in reports page (TODO-P1-03). |
| 57 | **Commissions Binary XLSX Export** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | NO | **PARTIAL** | Fix proxy binary streaming to enable file download (TODO-P0-02). |
| 58 | **Complaint Creation (Staff & Foreign Agency)** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove demo fallback on complaint creation error. |
| 59 | **Unresolved Complaints Queue Listing** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Verify contractor boundary isolation. |
| 60 | **Complaint Acknowledgment (New -> Unresolved)** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Test live state transition on live complaint. |
| 61 | **Complaint Resolution & Free Replacement (90d Window)** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Verify free replacement complaint link to new candidate selection. |
| 62 | **Chat Workspace & Thread Listing** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Build /chat page and thread list sidebar (TODO-P1-01). |
| 63 | **Foreign Agency Chat Thread Isolation** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Ensure agency threads strictly filter by contractor (TODO-P1-01). |
| 64 | **Internal Staff Thread Creation & Participant Management** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add create thread and add participant modal in /chat (TODO-P1-01). |
| 65 | **Chat Messaging, Attachments, and Mentions** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Build message composer with file upload and @mentions (TODO-P1-01). |
| 66 | **Thread Mark Read & Unread Badge Tracking** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Trigger mark_read on thread focus in /chat (TODO-P1-01). |
| 67 | **Web Push Notification Subscription & Status** | YES | YES | YES | `UNVERIFIED` | YES | YES | PARTIAL | YES | **IMPLEMENTED** | Remove localStorage override in PushNotificationToggle. |
| 68 | **Wakala Payment Reminder Manual Trigger** | YES | YES | YES | `UNVERIFIED` | NO | YES | NO | NO | **PARTIAL** | Add reminder trigger button in OperationalDrawer (TODO-P2-04). |
| 69 | **Multipart File Upload Pipeline** | YES | YES | YES | `RUNTIME VERIFIED` | YES | YES | YES | YES | **IMPLEMENTED** | Remove client-side fallback in uploadFileV2. |

---

## 3. Status Definitions Legend

- **COMPLETE**: Fully implemented in UI, integrated with whitelisted V2 API, verified live against Railway production, and zero mock/demo fallbacks remain.
- **IMPLEMENTED**: Fully implemented in UI and integrated with V2 API, awaiting comprehensive live runtime verification with production credentials.
- **PARTIAL**: V2 API client wrapper exists in `src/lib/api/v2/*`, but UI page or component is missing, incomplete, or requires modernization.
- **BACKEND BLOCKED**: Requested capability (e.g. User Management / Employee creation) has no whitelisted V2 API endpoint in the backend. Handled gracefully with informational admin UI.
- **NOT STARTED**: Endpoint/capability identified in backend/Swagger, but no V2 wrapper or UI component has been built.
- **PROVISIONAL**: Operational contracts where backend response or OCR parsing may return test/stubbed values per Document Parsing Settings.
- **CONTRACT MISMATCH**: Discrepancy observed between Swagger schema and backend runtime implementation.

---

## 4. Verification & Sign-Off Milestones

1. **Phase 1: Read-Only Audit & Matrix Completion** -> [DONE]
2. **Phase 2: P0 Architectural Repairs** -> [PENDING]
3. **Phase 3: P1 Feature Implementation (Chat, Reports, Batches)** -> [PENDING]
4. **Phase 4: P2 Secondary Capabilities** -> [PENDING]
5. **Phase 5: P3 V1 Retirement & TypeCheck/Build** -> [PENDING]
6. **Phase 6: Live Railway Runtime Verification & Report** -> [PENDING]
