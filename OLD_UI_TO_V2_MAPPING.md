# OLD UI TO CURRENT V2 BACKEND MAPPING

> **Architecture Rule**:  
> **OLD UX + CURRENT V2 DATA/API**  
> Never call deleted V1 DocTypes (`/api/resource/LMS Clearance`, `/api/resource/Injaz Clearance`, `/api/resource/Wakala Clearance`, `/api/resource/Embassy Clearance`, `/api/resource/DSR*`).  
> All data and state transitions are powered exclusively by canonical V2 endpoints under `/api/method/agency_tracking.*`.

---

## 1. Classification Definitions
- **DIRECT V2 FIELD**: Present directly on V2 `Applicant`, `Placement`, or `ClearanceStep` object.
- **V2 FIELD WITH RENAMING**: Exists in V2 under updated canonical attribute name.
- **V2 NESTED FIELD**: Located within linked `Placement` or sibling `ClearanceStep` context.
- **DERIVED DISPLAY ONLY**: Computed client-side for operational display (e.g. countdown days, formatted badge).
- **ACTION / ENDPOINT**: Triggered via authoritative V2 RPC (state machine mutation).
- **NO LONGER VALID / OBSOLETE V1**: Replaced by V2 unified model (e.g. separate Wakala DocType replaced by Embassy step).

---

## 2. LMIS Workspace Field & Action Mapping

| Old UI Field / Action | Old Backend Field / Route | Current V2 Field / Source | Current V2 Endpoint | Classification | Notes |
|---|---|---|---|---|---|
| `NO` | Row index | Dynamic table index | — | **DERIVED DISPLAY ONLY** | 1-based index |
| `NAME` | `applicant.full_name` | `applicant.full_name` / `placement.full_name` | `agency_tracking.applicant_api.list_applicants` | **DIRECT V2 FIELD** | Uppercase format |
| `PASSPORT` | `applicant.passport_number` | `applicant.passport_number` | `agency_tracking.applicant_api.list_applicants` | **DIRECT V2 FIELD** | Monospace font |
| `LABOR ID` | `applicant.national_id` / `reference_no` | `applicant.labor_id` / `step.reference_no` | `agency_tracking.applicant_api.get_applicant` | **DIRECT V2 FIELD** | Editable via LMIS modal/drawer |
| `CONTRACT DATE` | `dsr.contract_date` | `placement.contract_signed_date` / `creation` | `agency_tracking.placement_api.list_placements` | **V2 NESTED FIELD** | ISO date string |
| `DURATION` | Calculated duration | `Math.floor((now - contractDate)/86400000)` | — | **DERIVED DISPLAY ONLY** | Days elapsed since signing |
| `MEDICAL` | `applicant.medical_status` | `applicant.medical_status` | `agency_tracking.applicant_api.list_applicants` | **DIRECT V2 FIELD** | `FIT` or `UNFIT` badge |
| `MED DATE` | `applicant.medical_date` | `applicant.medical_issue_date` / `medical_date` | `agency_tracking.applicant_api.list_applicants` | **V2 FIELD WITH RENAMING** | Clinic issue date |
| `MEDI REMAINING` | `applicant.medical_expiry_date` | `applicant.medical_expiry_date` | `agency_tracking.applicant_api.list_applicants` | **DERIVED DISPLAY ONLY** | Red highlight if `<= 15` days |
| `STATUS` | `lms.status` | `step.status` (`Pending`, `In Progress`, `Issued`) | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | Terminal state is **Issued** |
| `ISSUE DATE` | `lms.issued_on` | `step.date_completed` | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | Date step completed |
| `CONTACT` | `lms.contact` / phone | `applicant.phone` / `step.assigned_officer` | `agency_tracking.applicant_api.list_applicants` | **DIRECT V2 FIELD** | Phone contact |
| `REMARK` | `lms.notes` | `step.rejection_remark` / `step.notes` | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | Ministry notes / remarks |
| `ACTION: Start Step` | Direct PUT status | `clearance_step_name` | `POST agency_tracking.clearance_api.start_clearance_step` | **ACTION / ENDPOINT** | Advances to In Progress |
| `ACTION: Complete Step` | `/api/resource/LMS Clearance` | `clearance_step_name`, `reference_no` | `POST agency_tracking.clearance_api.complete_clearance_step` | **ACTION / ENDPOINT** | Authoritative transition to Issued |
| `ACTION: Update LMIS Data` | Mixed generic update | `applicant_name`, `labor_id`, `national_id`, `coc_status`, `exam_date` | `POST agency_tracking.applicant_api.update_applicant_for_lmis` | **ACTION / ENDPOINT** | Scoped narrow LMIS fields |
| `ACTION: Reassign Officer` | Manual field mutation | `clearance_step_name`, `new_officer` | `POST agency_tracking.clearance_api.reassign_clearance_step` | **ACTION / ENDPOINT** | Role-based ToDo delegation |

---

## 3. Te'shir / Injaz Workspace Field & Action Mapping

| Old UI Field / Action | Old Backend Field / Route | Current V2 Field / Source | Current V2 Endpoint | Classification | Notes |
|---|---|---|---|---|---|
| `NO` / `#` | Row index | Dynamic table index | — | **DERIVED DISPLAY ONLY** | Mono font index |
| `CANDIDATE` | Full name + ID + Passport | Candidate composite | `list_applicants` / `list_placements` | **DIRECT V2 FIELD** | Multi-line cell |
| `CONTRACT & VISA` | Contract # + Visa # | `placement.contract_number` + `visa_number` | `agency_tracking.placement_api.list_placements` | **V2 NESTED FIELD** | Sourced from active placement |
| `SPONSOR (KAFEEL)` | Sponsor name + ID | `placement.employer_name` + `employer_national_id` | `agency_tracking.placement_api.list_placements` | **V2 NESTED FIELD** | Sourced from placement |
| `INJAZ NO` | `injaz.reference_no` | `step.reference_no` | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | E-Number / MOFA Ref |
| `INJAZ PAYMENT` | `injaz.payment_status` | `step.payment_status` (`Paid` / `Unpaid`) | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | Fee settlement status |
| `APPOINTMENT DATE` | `injaz.appointment_date` | `step.date_started` / `step.due_date` | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | Biometrics schedule |
| `ACTION: Start Step` | Direct PUT | `clearance_step_name` | `POST agency_tracking.clearance_api.start_clearance_step` | **ACTION / ENDPOINT** | Begin processing |
| `ACTION: Complete Step` | `/api/resource/Injaz Clearance` | `clearance_step_name`, `reference_no`, `amount` | `POST agency_tracking.clearance_api.complete_clearance_step` | **ACTION / ENDPOINT** | Completes biometrics |
| `ACTION: OCR Parse Paper` | Custom manual input | `file_url` -> parsed fields | `POST agency_tracking.documents.parse_injaz_file` | **ACTION / ENDPOINT** | Extracts App # & Barcode |
| `ACTION: Download Injaz PDF` | Client-side jsPDF generator | Pre-populated PDF generator | Client-side `downloadInjazDocumentPDF` | **ACTION / ENDPOINT** | Preserved from Git |

---

## 4. Embassy Workspace Field & Action Mapping

| Old UI Field / Action | Old Backend Field / Route | Current V2 Field / Source | Current V2 Endpoint | Classification | Notes |
|---|---|---|---|---|---|
| `NO` | Row index | Dynamic table index | — | **DERIVED DISPLAY ONLY** | Index |
| `NAME` | `fullName` | `applicant.full_name` | `list_applicants` | **DIRECT V2 FIELD** | Initials + Name |
| `PASSPORT` | `passportNumber` | `applicant.passport_number` | `list_applicants` | **DIRECT V2 FIELD** | Mono |
| `DESTINATION EMBASSY` | `destinationCountry` | `placement.destination_country` | `list_placements` | **DIRECT V2 FIELD** | Flag + Embassy |
| `WAKALA & VISA NO` | `visaNumber` + wakala status | `placement.visa_number` + Musaned authorization | `list_placements` | **V2 NESTED FIELD** | Sourced from placement |
| `SPONSOR` | `sponsorName` | `placement.employer_name` | `list_placements` | **V2 NESTED FIELD** | Employer name |
| `STATUS` | `embassy.status` | `step.status` (`Pending`, `In Progress`, `Submitted`, `Stamped`, `Rejected`) | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | Authoritative mission states |
| `EMBASSY FEE` | `embassy.fee_status` | `step.payment_status` (`Paid` / `Unpaid`) | `agency_tracking.clearance_api.list_my_clearance_steps` | **DIRECT V2 FIELD** | Mission fee |
| `ACTION: Submit Dossier` | Manual status mutation | `clearance_step_name` | `POST agency_tracking.clearance_api.submit_embassy_step` | **ACTION / ENDPOINT** | Monday gate |
| `ACTION: Stamp Visa` | `/api/resource/DSR Stamp` | `clearance_step_name`, `reference_no` | `POST agency_tracking.clearance_api.stamp_embassy_step` | **ACTION / ENDPOINT** | Thursday stamp success |
| `ACTION: Reject Visa` | `/api/resource/Embassy Clearance` | `clearance_step_name`, `rejection_remark` | `POST agency_tracking.clearance_api.reject_embassy_step` | **ACTION / ENDPOINT** | Thursday refusal |
| `ACTION: Wakala Reminder` | `/api/method/...dispatch_reminder` | `clearance_step_name` | `POST agency_tracking.notifications.trigger_wakala_reminder` | **ACTION / ENDPOINT** | WhatsApp/Push alert |

---

## 5. Wakala Workspace Field & Action Mapping

| Old UI Field / Action | Old Backend Field / Route | Current V2 Field / Source | Current V2 Endpoint | Classification | Notes |
|---|---|---|---|---|---|
| `WAKALA STATUS` | `wakala.status` | Saudi Embassy step wakala context | Embedded in Saudi Embassy Step | **V2 NESTED FIELD** | Authorized once placement confirmed |
| `ACTION: Dispatch Reminder` | V1 dispatch | `clearance_step_name` | `POST agency_tracking.notifications.trigger_wakala_reminder` | **ACTION / ENDPOINT** | Triggers WhatsApp alert |

---

## 6. Flight Ticketing & Departure Field & Action Mapping

| Old UI Field / Action | Old Backend Field / Route | Current V2 Field / Source | Current V2 Endpoint | Classification | Notes |
|---|---|---|---|---|---|
| `TICKET NUMBER` | `dsr_ticket.ticket_number` | `placement.ticket_number` | `agency_tracking.placement_api.list_placements` | **V2 FIELD WITH RENAMING** | Direct on Placement in V2 |
| `FLIGHT DATE` | `dsr_ticket.flight_date` | `placement.flight_date` | `agency_tracking.placement_api.list_placements` | **V2 FIELD WITH RENAMING** | Date of departure |
| `ACTION: Advance to Ticketed` | `/api/resource/DSR Ticket` | `placement_name`, `target_stage: "Ticketed"` | `POST agency_tracking.placement_api.advance_placement` | **ACTION / ENDPOINT** | V2 state machine |
| `ACTION: Advance to Departed` | `/api/resource/DSR Departure` | `placement_name`, `target_stage: "Departed"` | `POST agency_tracking.placement_api.advance_placement` | **ACTION / ENDPOINT** | Final pipeline milestone |
