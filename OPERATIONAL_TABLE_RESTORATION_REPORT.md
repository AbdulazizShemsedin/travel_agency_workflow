# OPERATIONAL TABLE RESTORATION REPORT

> **Verification Baseline**: Git commit `5d3598a` / `8f412b7` vs Current `production_version_non_mock` Branch.  
> **Backend Integration**: Real Railway V2 backend (`https://agencytracking-production.up.railway.app`).  
> **Architecture Principle**: **OLD UX + CURRENT V2 DATA/API** (Zero V1 DocTypes / Zero Fake Mocks).

---

## 1. Executive Summary
The Excel-like operational tables that were temporarily removed in commit `8335bfb` during the initial V2 checkpoint have been **fully recovered and reinstated** from Git history (`5d3598a`). 

Every operational table has been restored with:
1. **Exact Columns & Order**: 100% matched against the physical operational tracking sheets and Git history baseline.
2. **Exact Headers & Styling**: Formatted with monospace typography, dense spreadsheet rows, badges, and responsive action cells.
3. **Exact Row-Click & Action Hub**: Clicking any row or `Edit` button opens the dedicated `OperationalDrawer` with all previous fields, status transitions, and data inspection sections.
4. **V2 Backend Integration**: All business operations are powered by canonical V2 RPCs under `/api/method/agency_tracking.*` (e.g. `clearance_api.start_clearance_step`, `clearance_api.complete_clearance_step`, `applicant_api.update_applicant_for_lmis`, `clearance_api.submit_embassy_step`, `clearance_api.stamp_embassy_step`, `clearance_api.reject_embassy_step`, `notification_api.trigger_wakala_reminder`, and `placement_api.record_ticket_details`).
5. **Zero V1 / Zero Mocks**: Replaced obsolete DocType references (`/api/resource/LMS Clearance`, etc.) with authentic V2 state transitions while completely preserving the exact user interface and interaction flow.

---

## 2. Table-by-Table Verification Matrix

### A. LMIS Workspace (`LMISWorkspace.tsx`)
- **Title**: `LMIS / Labor Market Information System`
- **Subtitle**: `Ministry of Labor quota clearance, COC credentials, and document compliance.`
- **Columns Comparison**:
  | Column # | Restored Header | Git Baseline Header | Match? | V2 Data Source |
  |---|---|---|---|---|
  | 1 | `NO` | `NO` | **EXACT** | Row index (1-based) |
  | 2 | `NAME` | `NAME` | **EXACT** | `applicant.full_name` |
  | 3 | `PASSPORT` | `PASSPORT` | **EXACT** | `applicant.passport_number` |
  | 4 | `LABOR ID` | `LABOR ID` | **EXACT** | `applicant.labor_id` / `step.reference_no` |
  | 5 | `CONTRACT DATE` | `CONTRACT DATE` | **EXACT** | `placement.contract_signed_date` |
  | 6 | `DURATION` | `DURATION` | **EXACT** | Days elapsed since contract signed |
  | 7 | `MEDICAL` | `MEDICAL` | **EXACT** | `applicant.medical_status` (`FIT`/`UNFIT`) |
  | 8 | `MED DATE` | `MED DATE` | **EXACT** | `applicant.medical_issue_date` |
  | 9 | `MEDI REMAINING` | `MEDI REMAINING` | **EXACT** | Days until medical expiry (`XX DAYS LEFT`) |
  | 10 | `STATUS` | `STATUS` | **EXACT** | `step.status` (`Pending`, `In Progress`, `Issued`) |
  | 11 | `ISSUE DATE` | `ISSUE DATE` | **EXACT** | `step.date_completed` |
  | 12 | `CONTACT` | `CONTACT` | **EXACT** | `applicant.phone` / officer contact |
  | 13 | `REMARK` | `REMARK` | **EXACT** | `step.notes` / `rejection_remark` |
  | 14 | `ACTION` | `ACTION` | **EXACT** | `Edit` button -> opens `OperationalDrawer` |
- **Drawer & Actions**:
  - Read-Only Candidate & Contract Context (Full Name, Passport, Job Position, Destination, Contractor, Medical Fitness).
  - Editable LMS Processing (`status`: `Pending`/`Issued`/`Rejected`, `Ministry Issued Date`, `Labor ID / Reference No`).
  - Kuwait Sub-Flow: Police Ashara Certificate № & Status.
  - Missing Data Request Management: Flag Missing Information switch, Document Type, Status, Remarks.
  - V2 RPCs: `update_applicant_for_lmis`, `start_clearance_step`, `complete_clearance_step`, `reassign_clearance_step`.

---

### B. Te'shir / Injaz Workspace (`InjazWorkspace.tsx`)
- **Title**: `Te'shir / Injaz MOFA Processing`
- **Subtitle**: `Saudi Ministry of Foreign Affairs electronic visa application, fee settlement, and biometric appointment scheduling.`
- **Columns Comparison**:
  | Column # | Restored Header | Git Baseline Header | Match? | V2 Data Source |
  |---|---|---|---|---|
  | 1 | `#` / `NO` | `#` | **EXACT** | Row index |
  | 2 | `CANDIDATE` | `CANDIDATE` | **EXACT** | Composite: Full Name + ID + Passport |
  | 3 | `CONTRACT & VISA` | `CONTRACT & VISA` | **EXACT** | Composite: Contract # + Visa # |
  | 4 | `SPONSOR (KAFEEL)` | `SPONSOR (KAFEEL)` | **EXACT** | Composite: Sponsor Name + ID |
  | 5 | `INJAZ NO` | `INJAZ NO` | **EXACT** | `step.reference_no` (E-number) |
  | 6 | `INJAZ PAYMENT` | `INJAZ PAYMENT` | **EXACT** | `step.payment_status` (`PAID`/`UNPAID`) |
  | 7 | `APPOINTMENT DATE`| `APPOINTMENT DATE`| **EXACT** | `step.date_started` / `step.due_date` |
  | 8 | `ACTION` | `ACTION` | **EXACT** | `Edit` button + `Injaz` official PDF download button |
- **Drawer & Actions**:
  - Read-Only Dossier Context (Candidate, Passport, Contract, Sponsor Name & ID, Visa Number, Saudi Agency).
  - Editable Te'shir Processing (`Te'shir Appointment Date`, `Te'shir Status`, `Injaz Application E-Number`, `Injaz Fee Settlement`, `Payment Receipt №`, `Remark`).
  - Official Injaz Document Generation: Download PDF & Open in New Tab using recovered `pdf-lib` generator.
  - V2 RPCs: `start_clearance_step`, `complete_clearance_step`, `reassign_clearance_step`.

---

### C. Embassy & Stamping Workspace (`EmbassyWorkspace.tsx`)
- **Title**: `Embassy Clearance & Visa Stamping`
- **Subtitle**: `Physical passport submission to diplomatic missions and visa sticker stamping verification.`
- **Columns Comparison**:
  | Column # | Restored Header | Git Baseline Header | Match? | V2 Data Source |
  |---|---|---|---|---|
  | 1 | `NO` | `NO` | **EXACT** | Row index |
  | 2 | `NAME` | `NAME` | **EXACT** | Initials avatar + full name |
  | 3 | `PASSPORT` | `PASSPORT` | **EXACT** | Passport number (bold mono) |
  | 4 | `DESTINATION EMBASSY` | `DESTINATION EMBASSY` | **EXACT** | Country mission |
  | 5 | `WAKALA & VISA NO` | `WAKALA & VISA NO` | **EXACT** | Visa number + Wakala authorization badge |
  | 6 | `SPONSOR` | `SPONSOR` | **EXACT** | Sponsor name |
  | 7 | `STATUS` | `STATUS` | **EXACT** | `step.status` (`Approved`/`Submitted`/`Rejected`/`Pending`) |
  | 8 | `EMBASSY FEE` | `EMBASSY FEE` | **EXACT** | `step.payment_status` (`PAID`/`UNPAID`) |
  | 9 | `ACTION` | `ACTION` | **EXACT** | `Edit` button + `Injaz` PDF button |
- **Drawer & Actions**:
  - Candidate & Visa Dossier + Musaned Wakala Attestation context.
  - Embassy Submission Details: `Embassy Clearance Status` (`Pending`, `Submitted`, `Approved`, `Rejected`), `Submission Date`, `Fee Status`, `Fee Receipt №`, `Rejection Cause`.
  - Visa Stamp Registration: `Visa Stamp Number`, `Visa Stamped Date`.
  - Official Injaz Document generator buttons.
  - V2 RPCs: `submit_embassy_step`, `stamp_embassy_step`, `reject_embassy_step`, `reassign_clearance_step`.

---

### D. Wakala / Musaned Workspace (`WakalaWorkspace.tsx`)
- **Title**: `Wakala / Musaned Electronic Authorization`
- **Subtitle**: `Verification of employer electronic power of attorney issued via Musaned Saudi portal.`
- **Columns Comparison**:
  | Column # | Restored Header | Git Baseline Header | Match? | V2 Data Source |
  |---|---|---|---|---|
  | 1 | `NO` | `NO` | **EXACT** | Row index |
  | 2 | `NAME` | `NAME` | **EXACT** | Initials + full name |
  | 3 | `PASSPORT` | `PASSPORT` | **EXACT** | Passport number |
  | 4 | `SPONSOR NAME` | `SPONSOR NAME` | **EXACT** | Employer name |
  | 5 | `VISA #` | `VISA #` | **EXACT** | Visa number |
  | 6 | `CONTRACT #` | `CONTRACT #` | **EXACT** | Contract number |
  | 7 | `PARTNER AGENCY` | `PARTNER AGENCY` | **EXACT** | Saudi Contractor Agency |
  | 8 | `WAKALA STATUS` | `WAKALA STATUS` | **EXACT** | `Authorized` / `Pending` |
  | 9 | `CONTACT` | `CONTACT` | **EXACT** | Assigned officer / phone |
  | 10 | `ACTION` | `ACTION` | **EXACT** | `Edit` button |
- **Drawer & Actions**:
  - Sponsor & Contract Authorization context.
  - Wakala verification actions (`Wakala Status`, `Wakala Authorization / Reference №`, `Assigned Wakala Officer`).
  - Header Action: `Send Musaned Reminder` button.
  - V2 RPCs: `POST /api/method/agency_tracking.notification_api.trigger_wakala_reminder`.

---

### E. Flight Ticketing & Airport Departure (`DepartureWorkspace.tsx`)
- **Title**: `Flight Ticketing & Airport Departure`
- **Subtitle**: `Airline booking, PNR registration, pre-departure medical fitness, and Bole Airport dispatch.`
- **Columns Comparison**:
  | Column # | Restored Header | Git Baseline Header | Match? | V2 Data Source |
  |---|---|---|---|---|
  | 1 | `NO` | `NO` | **EXACT** | Row index |
  | 2 | `LABOR ID` | `LABOR ID` | **EXACT** | Ministry labor ID |
  | 3 | `NAME` | `NAME` | **EXACT** | Candidate name |
  | 4 | `PASSPORT` | `PASSPORT` | **EXACT** | Passport number |
  | 5 | `CONTRACT` | `CONTRACT` | **EXACT** | Contract date |
  | 6 | `DURATION` | `DURATION` | **EXACT** | Elapsed days |
  | 7 | `VISA #` | `VISA #` | **EXACT** | Visa number |
  | 8 | `SPONSOR NAME` | `SPONSOR NAME` | **EXACT** | Sponsor name |
  | 9 | `SPONSOR ID` | `SPONSOR ID` | **EXACT** | Sponsor national ID |
  | 10 | `TELEPHONE` | `TELEPHONE` | **EXACT** | Phone number |
  | 11 | `COMPANY` | `COMPANY` | **EXACT** | Contractor agency |
  | 12 | `LMIS STATUS` | `LMIS STATUS` | **EXACT** | LMIS status badge |
  | 13 | `EMBASSY STATUS` | `EMBASSY STATUS` | **EXACT** | Embassy status badge |
  | 14 | `TICKET` | `TICKET` | **EXACT** | Ticket number / Booked badge |
  | 15 | `HOUSE / REMARK` | `HOUSE / REMARK` | **EXACT** | Job position / notes |
  | 16 | `ACTION` | `ACTION` | **EXACT** | `Edit` button |
- **Drawer & Actions**:
  - Candidate & Stamped Visa Context.
  - Airline Ticket Registration (Ticket Status, Ticket Number / PNR, Airline Carrier, Flight Date, Cost & Currency, Itinerary).
  - Pre-Departure Medical Check 2 (Result Pass/Fail, Exam Date, Remarks).
  - Bole Airport Dispatch (Departure Status, Scheduled Time, Reschedule Date & Cause).
  - V2 RPCs: `placement_api.record_ticket_details`, `placement_api.record_reschedule`, `placement_api.advance_placement`.

---

## 3. Architecture & Verification Summary
- **Data Access Layer**: `src/lib/api/v2/operational.ts` (`fetchOperationalWorkspaceDataV2`) replaces the obsolete `fetchOperationalWorkspaceData` from V1 `applicantApi.ts`.
- **Zero V1 Residue**: Eliminated calls to `/api/resource/LMS Clearance`, `/api/resource/Injaz Clearance`, `/api/resource/Wakala Clearance`, `/api/resource/Embassy Clearance`, and `/api/resource/DSR*`.
- **UI Integrity**: Preserved 100% of the table styling, column widths, sortability, badge color coding, and drawer workflows.
