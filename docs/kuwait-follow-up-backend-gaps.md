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

