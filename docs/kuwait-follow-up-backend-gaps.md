# Kuwait Applicant Follow-up Workflow — Backend Gaps & Limitations Report

**Date**: November 19, 2026  
**Repository Branch**: `az/go-frontend-integration`  
**Active Production Backend**: `https://goagency-production.up.railway.app`  
**Authoritative Contracts**: `src/Assets/01-applicant-contract.md` through `03-clearance-and-corridor-contract.md`, `src/Assets/openapi 3.1.0.txt`

---

## Executive Summary

This report documents the architectural findings, verified backend limitations, and integration status for the **Kuwait Applicant Follow-up Workflow** across the frontend and the Go backend.

The Kuwait corridor follows the sequence:
$$\text{Applicant} \longrightarrow \text{Placement} \longrightarrow \text{Kuwait LMIS (with Police Ashara)} \longrightarrow \text{Telesign} \longrightarrow \text{Kuwait Embassy / eVisa} \longrightarrow \text{Ticketing} \longrightarrow \text{Departure}$$

All frontend components, workspaces, column renderers, and detail views have been updated to ensure full compliance with this pipeline, while isolating Saudi-specific requirements (such as Wakala authorization, Taeshir intermediate statuses, and Musaned contract numbers) from the Kuwait experience.

---

## 1. Verified Backend Limitations & Gaps

### 1.1 Document Generation & Paperwork
- **Status**: Limited to Applicant CV PDF.
- **Backend Limitation**: The Go backend supports binary PDF streaming for candidate CVs via `GET /v1/applicants/{name}/cv.pdf` (`cv.render_cv_pdf`). For clearance steps, the backend only provides `GET /v1/clearance-steps/{name}/injaz-paper.pdf` (`clearance.render_injaz_pdf`), which is strictly Saudi-specific (Enjaz payment slips and Ministry of Foreign Affairs application papers).
- **Gap**: There is no Kuwait-specific document generation endpoint (e.g., Kuwait Visa Application PDF, bilateral employment contract form generator, or Police Ashara appointment slip generator).
- **Frontend Handling**:
  - The single candidate CV download action is surfaced in the workspace header (`Download CV`).
  - Redundant CV download buttons across LMIS, Telesign, and Departure cards have been removed.
  - The Saudi-specific `Injaz PDF` button is strictly hidden for Kuwait candidates (`!isKuwait`).

### 1.2 Telesign Clearance Step Transitions
- **Status**: Direct completion supported (`Pending` $\rightarrow$ `Complete`).
- **Backend Limitation**: Unlike Saudi Taeshir which has intermediate status updates via `clearance_api.set_taeshir_status` (`INFORMED`, `RECEIVED`, `READY TO EMBASSY`), the Go backend defines no `set_telesign_status` RPC for Kuwait.
- **Canonical Vocabulary**: The backend clearance state machine (`clearance_step.py` and Go equivalent) dictates that Telesign steps complete to the canonical status `"Complete"`.
- **Frontend Handling**:
  - The frontend Telesign selector provides `{ value: "Complete", label: "Complete" }`.
  - Normalization logic handles both `"Complete"` and `"Completed"` gracefully in `ExcelSelect` and `FollowUpWorkspace` to prevent defaulting to `"Pending"`.
  - Finishing Telesign invokes `completeClearanceStepV2(injazStepName)` with an optional reference number passed as a remark.

### 1.3 Police Ashara Sub-check & Financial Decoupling
- **Status**: Conforming to `clearance_api.record_police_ashara`.
- **Backend Limitation**: The backend contract exposes:
  - `police_ashara_status`: `"Pending" | "Scheduled" | "Completed" | "Failed"`
  - `police_ashara_appointment_date`: ISO Date string (`YYYY-MM-DD`)
  - `police_ashara_remark`: String (mandatory if `status === "Failed"`)
- **Architectural Policy**: In alignment with the clearance fee hiding architecture (`TODO-OPERATIONAL-CONFORMANCE-01` and `MASTER_SYSTEM_STATUS.md`), manual fee collection inputs (`police_ashara_amount`, `police_ashara_payment_status`) are hidden from standard operational workspaces. Fees are automatically recorded by the corridor engine or managed in the Finance workspace.
- **Frontend Handling**:
  - The Follow-up dialog exposes `police_ashara_status`, `police_ashara_appointment_date`, and `police_ashara_remark`.
  - If status is `Failed`, `police_ashara_remark` is strictly enforced before submission.
  - The input for `Amount (ETB / Fee)` has been removed from the Follow-up dialog.

### 1.4 Kuwait Placement Contract and eVisa Persistence
- **Status**: Fully integrated via Native File-ID API (`/v1/files`).
- **Backend Architecture**:
  - Kuwait bilateral paper contracts are uploaded via `upload_contract` (`/v1/placements/{name}/contract`).
  - Kuwait eVisas are uploaded via `upload_visa` (`/v1/placements/{name}/visa`).
  - Both endpoints accept clean UUIDs (`file_id`) produced by the file upload endpoint.
  - Contract and visa attributes (`contract_file`, `visa_file`, `visa_number`, `visa_issue_date`, `visa_expiry_date`) reside on the **Placement** record (`PLM-xxxxx`), not the Applicant record (`APP-xxxxx`).
- **Frontend Handling**:
  - Operational workspaces correctly read these fields from `currentRow.plc` and placement records.
  - Saudi Musaned contract numbers are not required for Kuwait candidates (`hasContract` resolves via `contract_file` and `employment_site`).

### 1.5 Strict Wakala and COC Exclusion for Kuwait
- **Status**: Completely eliminated from JSX rendering (no `— N/A (Kuwait)` placeholders).
- **Context**: Wakala (electronic power of attorney) and COC (Council of Chambers / Chamber of Commerce verification) are exclusive to the Saudi Arabia corridor. Kuwait does not use either system.
- **Frontend Handling**:
  - In `FollowUpWorkspace`, the desktop table replaces the `WAKALA STATUS` column with a dedicated `POLICE ASHARA` column when viewing Kuwait candidates or filtering to Kuwait.
  - In `ApplicantFollowUpWorkspace`, the Wakala dropdown is completely removed for Kuwait (`{!isKuwait && ...}`), replaced by Kuwait eVisa Reference Number and Visa Type fields.
  - In `ApplicantFollowUpWorkspace`, the COC Status dropdown is completely removed for Kuwait (`{!isKuwait && ...}`).
  - Wakala payment checks do not gate Kuwait Embassy stamping or stage transitions.

### 1.6 Kuwait Placement LMIS and eVisa Attribute Persistence
- **Status**: Fully exposed and editable via backend RPCs.
- **Backend Architecture**:
  - Placement LMIS fields (`employer_city`, `employer_house_number`, `employer_phone`, `employer_alt_phone`, `contract_start_date`, `contract_end_date`) are persisted via `/api/method/agency_tracking.api.placement.write?op=update_placement_for_lmis` (`updatePlacementForLmisV2`).
  - Validation requires `contract_end_date >= contract_start_date`.
  - Kuwait eVisa attributes (`visa_reference_number`, `visa_type`, `sponsor_name`, `sponsor_civil_id`, `kuwait_agency_name`, `kuwait_agency_license`) are persisted via `/api/method/agency_tracking.api.placement.write?op=update_placement_parsed_fields` (`updatePlacementParsedFieldsV2`).
  - Bilateral paper contracts (`contract_file`) and Kuwait eVisas (`visa_file`) are surfaced with attachment status (`Attached` vs `Missing`), downloadable via `getFileDownloadUrl`, and linked directly to the Placement Document Center (`/applicants/[id]/contractor-doc`).

### 1.7 Departure Card Conformance & Terminal Record Locking
- **Status**: Conforming to backend state machine.
- **Audit Findings**:
  - Unapproved `Airline Carrier` input has been completely removed from the Flight Ticket & Departure Card.
  - Terminal records for Departed candidates (`isPlacementDeparted`) lock Ticket Number, Flight Date, Flight Time, and Departure Status into read-only badges with a Lock icon, preventing accidental post-departure mutation or regressing departed records.

### 1.8 Kuwait eVisa Document Extraction (`parse_visa_file` / `/v1/parse/visa`) & Backend Limitations
- **Status**: Backend parser integrated with frontend Excel-like manual fallback and error notification.
- **Backend Architecture**:
  - Kuwait eVisa parsing is called via `parseVisaFileV2` -> `POST /api/method/agency_tracking.api.document.write?op=parse_visa_file` (or `/v1/parse/visa`).
  - The Go backend uses OCR/text extraction to detect fields (`visa_number`, `visa_type`, `visa_issue_date`, `visa_expiry_date`, `sponsor_name`, `sponsor_id`, `kuwait_agency_name`, `kuwait_agency_license`).
- **Observed Limitation**:
  - Certain Kuwait eVisa document templates (especially low-resolution scans, photo captures, or newer Kuwait Ministry of Interior layout variants) yield 0 extracted fields (`fields_found: []` or empty properties).
- **Frontend Handling**:
  - Added primary **"Extract Visa Info"** button to the Kuwait eVisa attachment card and a dedicated **"Extract Visa Info"** action button in the card header.
  - Added real-time gap detection: when the backend extractor returns 0 structured fields, the frontend displays an informational warning banner:
    *"Backend Extractor Notice: The backend parser did not extract visa fields (Visa Number, Issue Date, Expiry Date, Sponsor) from this file. You can enter all fields manually below (excel-like), and notify the backend team to update the eVisa extraction parser."*
  - Added direct, excel-like inline editable cells for all 9 visa fields (`visa_number`, `visa_reference_number`, `visa_type`, `visa_issue_date`, `visa_expiry_date`, `sponsor_name`, `sponsor_id`, `kuwait_agency_name`, `kuwait_agency_license`) with native HTML5 calendar date pickers, so staff can input and correct data instantly without opening a modal.
  - Added a dedicated **"Save & Confirm Visa Details"** button that persists edits to the Placement via `updatePlacementParsedFieldsV2` and syncs them to the Applicant record.

### 1.9 Foreign Agency Credentials Architecture & Password Persistence
- **Status**: Architectural limitation of one-way salted password hashing.
- **Backend Architecture**:
  - Password management uses `agency_tracking.api.employee.write?op=reset_employee_password` (`resetEmployeePasswordV2`).
  - In modern web security, Frappe and Go backends hash passwords using one-way cryptographic algorithms (`bcrypt` / `argon2` / `tabUser`).
  - The backend database **never** stores or returns plain-text passwords in `get_contractor` or `list_contractors` queries.
- **Why Passwords Disappear on Reopening**:
  - Previously, `handleOpenCredentials` cleared the temporary password (`setJustResetPassword(null)`), causing the modal to appear as if the password was lost immediately after closing and reopening.
  - Furthermore, after a page reload or from another browser, the backend cannot return the password because it only possesses the one-way cryptographic hash.
- **Frontend Solution & What the Backend Needs to Fix (If Plain-text Retrieval is Intended)**:
  - **Frontend Fix**: Added an in-memory session password cache (`sessionPasswords`) in `src/app/contractors/page.tsx`. When an administrator sets or resets an agency's password, it is cached for the current session. Reopening the Credentials modal for that agency restores the active password with a Copy button and guidance text.
  - **Editable Login Email**: Added an editable `Portal Login Email` input to the Edit Agency modal so administrators can view and update the agency's login account without being locked out.
  - **Backend Recommendation (If Persistent Plaintext Recall Is Required)**: If business requirements demand that foreign agency passwords remain readable across hard browser reloads and different devices, the backend team must add an encrypted credentials vault field on the `Contractor` DocType (e.g., `encrypted_portal_password` using AES-256-GCM decrypted only on authorized admin requests), as standard Frappe/Go user auth will never return plain-text passwords.

### 1.10 Placement Document Center Auto-Download Circumvention
- **Root Cause**:
  - In `src/app/applicants/[id]/contractor-doc/page.tsx`, the document viewer previously passed `getFileDownloadUrl(url)` directly as the `src` attribute of an `<iframe>`.
  - The backend proxy (`/api/method/agency_tracking.api.file.read?op=download_file&file_id=...`) responds with `Content-Disposition: attachment; filename="..."`.
  - Under RFC 6266, when a browser loads an `<iframe>` whose response has `Content-Disposition: attachment` (or when loading binary `.docx` files), the browser automatically downloads the file to the user's Downloads directory upon page visit or tab switch.
- **Frontend Fix**:
  - Only local blob URLs (`blob:...`) for PDF files are loaded in `<iframe src={...}>` (which renders natively without attachment headers).
  - For server-stored documents (`file_...` or remote download endpoints) across both Employment Contract and Kuwait eVisa tabs, the viewer now renders a dedicated interactive Document Card showing:
    - File icon and format badge (`Microsoft Word Document` / `PDF Contract` / `Kuwait eVisa`)
    - File name and verified attachment status
    - Explicit **"Download Document"** button (triggers manual download ONLY when clicked)
    - Explicit **"Open in New Tab"** button (opens document in new tab ONLY when clicked)
  - Automatic background downloading is 100% eliminated.

### 1.11 Kuwait Police Ashara Reverting Root Cause & Hydration Fix
- **Problem**:
  - In `ApplicantFollowUpWorkspace`, after setting Police Ashara status to "Completed" and saving an appointment date, the UI reverted back to "Pending" and the date became blank upon query refetch.
- **Backend Root Cause**:
  - Authoritative spec `src/Assets/03-clearance-and-corridor-contract.md` (lines 88-89): `list_my_clearance_steps` deliberately returns a lightweight 6-field projection (`name`, `placement`, `step_type`, `status`, `sequence_order`, `is_mandatory`) and omits all sub-flow fields (`police_ashara_status`, `police_ashara_appointment_date`, `police_ashara_remark`, `wakala_status`, etc.).
  - On refetch (`refreshAll()`), `fetchOperationalWorkspaceDataV2` mapped `policeAsharaStatus` from the unhydrated `lmsStep` list item, which lacked `police_ashara_*` properties and defaulted back to `"Pending"`.
- **Frontend Fix**:
  - In `src/lib/api/v2/operational.ts`, `fetchOperationalWorkspaceDataV2` now calls `getClearanceStepDocV2(stepName)` whenever `single || singleId || isKuwait` is true to hydrate `lmsStep`, `injazStep`, and `embassyStep` with their full Frappe documents.
  - In `ApplicantFollowUpWorkspace.tsx`, optimistic local row updates are retained across incoming prop updates, guaranteeing that saved Police Ashara values persist seamlessly without reverting.

### 1.12 Kuwait Telesign Card Direct Editing & Manual Stage Finish Decoupling
- **Problem**:
  - Telesign card fields were locked/static until "Start Telesign" was clicked, and clicking "Finish stage" automatically injected a synthetic now timestamp for Date Completed.
- **Frontend Fix**:
  - Removed "Start Telesign" edit gating. All Telesign card fields (Telesign Reference Number, Telesign Status, Date Started, Date Completed, and Remarks) are now directly and interactively editable on the card.
  - Telesign Status provides an editable `<select>` allowing users to transition between `Pending`, `In Progress`, and `Complete`, using authoritative RPCs (`startClearanceStepV2`, `completeClearanceStepV2`, `reopenClearanceStepV2`).
  - Date Started and Date Completed are editable date inputs with instant local synchronization and backend persistence.
  - The "Finish stage" modal now exposes Date Completed, Date Started, Ref No, and Remarks, allowing staff to review and adjust their actual data without synthetic date overwrites.

### 1.13 Placement Parsed Fields Empty Payload Guard (Backend 417 "No editable field supplied")
- **Problem**:
  - When focusing and blurring empty eVisa fields or saving fields that evaluated to `undefined`, the Go backend endpoint `PATCH /v1/placements/{name}/parsed-fields` failed with HTTP 417:
    `No editable field supplied. Allowed: visa number, visa type, visa_issue_date, visa_expiry_date, visa_reference_number, contract number, contract signed date, employer name, employer_national_id, employer address, saudi_agency_name, saudi_agency_license, kuwait_agency_name, kuwait_agency_license, employment site, contract duration, contract_salary_amount, contract_salary_currency, sponsor name, sponsor_civil_id, employer city, employer_house_number, employer phone, employer_alt_phone, contract_start_date, contract_end_date.`
- **Backend Root Cause**:
  - The Go backend handler parses the request JSON body and expects at least one valid, non-empty editable key from the whitelist. If the body is `{}` (e.g. because undefined keys were dropped during JSON serialization), the Go backend rejects the call with HTTP 417.
- **Frontend Fix**:
  - In `src/lib/api/v2/placements.ts`, `updatePlacementParsedFieldsV2` now inspects the supplied payload. If no valid field keys are provided, it returns early cleanly without dispatching an empty PATCH request.
  - In `ApplicantFollowUpWorkspace.tsx`, `handleSaveKuwaitEvisaField`, `handleSaveEmbassyVisaNumber`, `handleSaveEmbassyVisaIssueDate`, and `handleSaveEmbassyVisaExpiryDate` verify `val === currentVal` and `!val && !currentVal` before dispatching updates.

---

## 2. Conformance Verification Checklist

| Requirement | Implementation Detail | Status |
| :--- | :--- | :--- |
| **Telesign Status Synchronization** | Canonical status `"Complete"` recognized across table & detail; `kuwaitTelesignOptions` aligned; `ExcelSelect` fuzzy-matches completion variants. | **VERIFIED** |
| **Table Column Rendering** | Table dynamically switches headers: `KUWAIT LMIS`, `POLICE ASHARA`, `TELESIGN`, `KUWAIT EMBASSY / EVISA`, `DEPARTURE`. | **VERIFIED** |
| **Police Ashara Sub-check** | Canonical statuses (`Pending`, `Scheduled`, `Completed`, `Failed`); failure requires remark; amount input removed; color-coded badge on card. | **VERIFIED** |
| **CV Action Consolidation** | Single `Download CV` button in detail header with `isDownloadingCv` spinner; redundant CV buttons removed from LMIS, Telesign, and Departure cards. | **VERIFIED** |
| **Kuwait LMIS Card** | Saudi COC completely removed; exposes editable placement LMIS fields with date validation via `updatePlacementForLmisV2`; surfaces bilateral paper contract status and Document Center link. | **VERIFIED** |
| **Kuwait Embassy Card** | Wakala completely removed; exposes Kuwait eVisa fields (`visa_reference_number`, `visa_type`, `sponsor_name`, `sponsor_civil_id`, `kuwait_agency_name`, `kuwait_agency_license`); surfaces eVisa attachment status and Document Center link. | **VERIFIED** |
| **Ticket & Departure Card** | Read-only locked ticket number when Departed; lock icon rendered; unapproved Airline Carrier input completely removed; terminal departed records protected from mutation. | **VERIFIED** |
| **Document Accessibility** | `contract_file` and `visa_file` surfaced with status, download link via `getFileDownloadUrl`, and direct route to `/applicants/[id]/contractor-doc`. | **VERIFIED** |
| **Saudi Workflow Preservation** | Saudi corridor columns, Injaz payment, Wakala authorization, and COC checks remain intact for Saudi candidates. | **VERIFIED** |

---

## 3. Test Suite Evidence

All automated unit tests in `tests/kuwait-workflow.test.ts` pass cleanly (15/15):
```
ok 1 - 1. Kuwait contracts do not require contract_number (Musaned) and resolve hasContract via contract_file / employment_site
ok 2 - 2. Registration FIT does not block recording Selected medical on placement
ok 3 - 3. checkLmisStageRequirements enforces Kuwait Police Ashara sub-check and skips Saudi COC
ok 4 - 4. checkTaeshirStageRequirements enforces Telesign Reference Number for Kuwait and skips Injaz/Taeshir fees
ok 5 - 5. checkEmbassyStageRequirements enforces Visa Number & Issue Date but skips Wakala for Kuwait
ok 6 - 6. recordPoliceAsharaV2 and completeClearanceStepV2 call authoritative backend endpoints
ok 7 - 7. advancePlacementV2 advances Kuwait placement to Processing stage
ok 8 - 8. Ticketing records ETB cost, Reschedule handles internal/airport causes, and Medical 2 gates Departed
ok 9 - 9. REGISTERED_WORKFLOW_COUNTRIES includes baseline corridors (Saudi Arabia, Kuwait) and scales
ok 10 - 10. Telesign status normalizes canonical Complete/Completed and avoids reverting to Pending
ok 11 - 11. Police Ashara fields map onto operational row and require remark on Failed status
ok 12 - 12. Follow-up Table column headers resolve dynamically based on corridorFilter
ok 13 - 13. Kuwait LMIS placement contract dates validate contract_end_date >= contract_start_date and call updatePlacementForLmisV2
ok 14 - 14. Kuwait Embassy eVisa updates supported fields via updatePlacementParsedFieldsV2
ok 15 - 15. Terminal departed record lock prevents editing departure and ticket inputs
```
Full TypeScript type check passed with 0 errors (`npx tsc --noEmit`).

