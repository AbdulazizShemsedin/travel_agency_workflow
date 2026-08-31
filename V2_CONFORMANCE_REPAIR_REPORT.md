# V2 FRONTEND CONFORMANCE REPAIR REPORT

**Branch**: `backend-v2-integration`  
**API Baseline**: V2 Whitelisted API Surface (`https://agencytracking-production.up.railway.app`)  
**Audit Document**: [**`V2_CONFORMANCE_AUDIT.md`**](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/V2_CONFORMANCE_AUDIT.md)  
**Report Date**: 2026-08-31T11:25:00Z  

---

## 1. Executive Summary

A full frontend architectural audit and repair was performed across the codebase. Every frontend API call, business state transition, operational clearance action, and role permission was audited against the **85 authoritative V2 backend endpoints** and the backend documentation suite (`01-applicant-contract.md` through `07-file-upload-contracts.md`).

All legacy V1 concepts (*"Processing Streams", "LMS Employee", "Injaz Employee", "Wakala Employee", "DSR Ticket", "DSR Departure", "Applicant Dossier"*) have been eliminated. Staff assignment at the Selected stage has been rebuilt around **Clearance Steps** and **Placements** within dynamic corridors.

---

## 2. Inconsistencies Discovered & Repaired

### 1. User Creation Error (`POST ...create_system_user 400`)
- **Root Cause**: The frontend called legacy endpoint `/api/method/applicant_processing.applicant_processing.api.create_system_user`, which does not exist in V2.
- **Files Changed**:
  - `src/lib/api/applicantApi.ts`
  - `src/lib/demo/store.ts`
  - `src/app/employees/page.tsx`
- **V2 Action**:
  - In **Demo Mode** (`NEXT_PUBLIC_DEMO_MODE=true`): Centralized in `demoStore.createUser` and `demoStore.getUsers()`, persisting into local storage for presentation personas.
  - In **Real Mode** (`NEXT_PUBLIC_DEMO_MODE=false`): Strictly throws `BACKEND BLOCKED`, preventing silent errors and explaining that user provisioning is performed in Frappe Core / Desk Administration.

### 2. Selected-Stage Staff Assignment Form (`AssignEmployeeModal.tsx`)
- **Root Cause**: The assignment modal used obsolete V1 fields (*streamAssignments, LMS staff, Injaz staff, Wakala staff*) and called legacy `assignEmployeeApi`.
- **Files Changed**:
  - `src/components/applicant/AssignEmployeeModal.tsx`
  - `src/app/applicants/[id]/page.tsx`
- **V2 Action**:
  - Rebuilt `AssignEmployeeModal.tsx` as a pure V2 component that dynamically fetches corridor steps via `getCorridorStepsV2(targetCountry)` (*Saudi: LMIS Clearance ➔ Taeshir ➔ Embassy | Kuwait: Kuwait LMIS ➔ Telesign ➔ Kuwait Embassy*).
  - Enables assigning primary corridor leads or dedicated step specialists using `reassignClearanceStepV2(stepIdentifier, officerEmail)`.
  - Updated stage 4 action bar on `/applicants/[id]` to display: *"Stage: Selected (Placement Created — Corridor Clearance Setup)"* and *"Assign Clearance Officers"*.

### 3. Removal of Obsolete V1 `ProcessingStreamsModal`
- **Root Cause**: Legacy modal attempted to mutate obsolete DocTypes (*LMSClearance, InjazClearance, WakalaClearance, DSRStamp, DSRTicket, DSRDeparture*).
- **Files Changed**:
  - `src/app/applicants/[id]/page.tsx`
- **V2 Action**:
  - Removed all invocations of `ProcessingStreamsModal`. All operational clearance steps and placement lifecycle transitions are handled directly by the V2 `CorridorClearanceManager` and `PlacementActionDrawer`.

### 4. Commission Report Export Endpoints
- **Root Cause**: Export links in `/reports`, `/commission`, and `/agent/commission` called obsolete V1 export RPCs.
- **Files Changed**:
  - `src/app/reports/page.tsx`
  - `src/app/commission/page.tsx`
  - `src/app/agent/commission/page.tsx`
- **V2 Action**:
  - Replaced all 5 occurrences with the canonical V2 endpoint: `/api/method/agency_tracking.report_api.export_commissions_xlsx`.

### 5. Candidate Discovery & Portal Selection Modernization
- **Root Cause**: `getPortalAvailableCandidates` and `portalSelectCandidateApi` in `applicantApi.ts` attempted fallback calls to legacy `applicant_processing.` endpoints.
- **Files Changed**:
  - `src/lib/api/applicantApi.ts`
- **V2 Action**:
  - Modernized `getPortalAvailableCandidates` to delegate to `listPortalCandidatesV2()`.
  - Modernized `portalSelectCandidateApi` to delegate to `selectCandidateV2()`.

### 6. Complaints & Push Notifications Modernization
- **Root Cause**: `submitAgencyComplaintApi`, `resolveAgencyComplaintApi`, `dispatchWakalaReminderApi`, `getVapidPublicKeyApi`, and `saveWebPushSubscriptionApi` called obsolete V1 paths.
- **Files Changed**:
  - `src/lib/api/applicantApi.ts`
- **V2 Action**:
  - Modernized to delegate directly to `createComplaintV2`, `resolveComplaintV2`, `triggerWakalaReminderV2`, `getPushSubscriptionStatusV2`, and `subscribeToPushV2`.

---

## 3. Verification & Test Results

### Automated Test Runs:
- **`npx tsc --noEmit`**: **0 errors (Exit code 0)**
- **`npm run build`**: **21/21 static & dynamic routes compiled successfully (Exit code 0)**
- **App Router Route Health**: **21/21 routes returning HTTP 200**

### Real Backend Connectivity:
- Target Host: `https://agencytracking-production.up.railway.app`
- Live V2 Auth endpoints reachable: `GET /api/method/agency_tracking.auth_api.get_csrf_token` (HTTP 200)

---

## 4. Conformance Conclusion

The frontend codebase is now fully aligned with the V2 backend contract:
- **0** obsolete V1 RPC requests remain unhandled or misrouted.
- **100%** of corridor clearance actions operate via dynamic `Clearance Step` architecture.
- **All** demo adapters are centralized in `src/lib/demo/store.ts` and gated by `isDemoMode()`.
- Real mode (`NEXT_PUBLIC_DEMO_MODE=false`) reaches the live Railway backend without silent mock fallback.
