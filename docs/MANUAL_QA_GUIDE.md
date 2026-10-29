# Manual QA & UI Verification Guide
**Agency Tracking & Travel Agency Workflow System**  
*Document Version: October 29, 2026 Audit Baseline*

---

## Guide Overview & Operating Instructions
This document is a practical, step-by-step manual testing guide for verifying the frontend features, access control permissions, data mapping, and backend RPC integrations.

### Testing Principles & Safety:
1. **Safety First on Production**: The active backend is `https://agencytracking-production-de71.up.railway.app`. Avoid mutating or cancelling real candidate files. Use safe test records where indicated.
2. **Distinguishing Frontend vs. Backend Status**:
   - Some backend endpoints from the October 27–29 handoff are **committed in the backend repository but not yet deployed on the live Railway backend** (e.g., `medical_current`, `medical_status.get_medical_status`, and backend acceptance of raw client COC strings without mapping).
   - This guide explicitly notes which behavior is live now versus what will automatically activate once the backend deployment is pushed.
3. **Roles Used**:
   - `Admin` / `System Manager`: Unrestricted administrative access.
   - `Manager`: Operations and administrative supervisor.
   - `Registrar`: Applicant intake, registration, and dossier editing.
   - `Clearance Officer` / Stage Officers (`Saudi LMIS`, `Kuwait LMIS`, `Saudi Taeshir`, `Saudi Embassy`, `Kuwait Embassy`): Clearance processing.
   - `Ticketer`: Flight reservation, ticketing, and departure.
   - `Finance Manager`: Ledgers, commission batches, transactions, write-offs.
   - `Foreign Agency`: Overseas recruiter portal (`/agent/*`).
   - Read-Only variants (e.g. `Registrar (View)`, `Clearance Officer (View)`): Viewing rights without write/action buttons.

---

## 1. Login, Navigation, Roles, and Basic Page Loading

### Test AUTH-01: Standard Staff Login & Role Redirection
- **Where:** Route `/login`
- **Role Required:** Any authorized staff account (e.g., Administrator / Manager / Registrar).
- **Preconditions:** Valid username/email and password.
- **Steps:**
  1. Open browser to `/login`.
  2. Enter credentials and click **Sign In**.
  3. Observe the initial redirect and landing page.
- **Expected:** Internal staff is directed to `/dashboard` or `/applicants`. User full name and role badge display in the top navigation bar.
- **Failure:** Redirection loops, blank white screen, or 401 Unauthorized toast.
- **Backend Dependency:** Live on production backend.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test AUTH-02: Foreign Agency Isolation Guard
- **Where:** Route `/login` followed by `/applicants` or `/commission`
- **Role Required:** Foreign Agency user account (e.g. linked to an active contractor).
- **Preconditions:** Foreign Agency login credentials.
- **Steps:**
  1. Sign in with a Foreign Agency account.
  2. Observe default landing route (should be `/agent`).
  3. Attempt to manually navigate in browser address bar to `/applicants`, `/commission`, or `/employees`.
- **Expected:** Foreign Agency is restricted to `/agent/*` and `/chat`. Attempting to load staff routes redirects cleanly to `/agent` or displays an access denied barrier.
- **Failure:** Agency user can see internal pipeline tables, employee rosters, or staff financial ledgers.
- **Backend Dependency:** Live on production backend.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 2. Applicant Registration & Passport Parsing

### Test REG-POB-01: Place of Birth Extraction from Passport Scan
- **Where:** Sidebar **Applicants** $\rightarrow$ Click **+ New Applicant** (or URL `/applicants/new`).
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Preconditions:** A clear image/PDF of an Ethiopian passport scan that contains a printed Place of Birth (visual zone).
- **Steps:**
  1. Navigate to `/applicants/new`.
  2. In Card 2 (**Passport OCR Scanner**), drag and drop or select the test passport scan.
  3. Observe OCR processing toast: "Uploading and analyzing passport scan...".
  4. Wait for processing to complete.
  5. Scroll to Card 4 (**Personal Details**) $\rightarrow$ inspect the **Place of Birth** field.
- **Expected:** The field is automatically populated with the uppercase Place of Birth extracted from the passport scan (e.g. `ADDIS ABABA`, `LOMA`, `JIMMA`). The amber warning *"Not read from the passport. Please type it."* does not show.
- **Failure:** Place of Birth remains empty despite clear visual text on the passport, or displays an unhandled error.
- **Backend Dependency:** Live on backend `parse_passport_file` / `enqueue_parse_passport_file`. (Note: visual zone OCR depends on image clarity).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test REG-POB-02: User Manual Override Protection
- **Where:** `/applicants/new`
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Preconditions:** A test passport image.
- **Steps:**
  1. Open `/applicants/new`.
  2. Before uploading any scan, type `HAWASSA` directly into the **Place of Birth** input.
  3. Upload the passport scan that has a different place of birth (e.g. `ADDIS ABABA`).
  4. Wait for the scan to finish and observe the **Place of Birth** input.
- **Expected:** The user-entered value `HAWASSA` is preserved and NOT overwritten by the scanner.
- **Failure:** The manual entry is erased or overwritten by the scan parser.
- **Backend Dependency:** Live frontend logic.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test REG-POB-03: Missing Place of Birth Handling (No Fallback)
- **Where:** `/applicants/new`
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Preconditions:** A passport scan or MRZ-only code where Place of Birth is unreadable.
- **Steps:**
  1. Open `/applicants/new`.
  2. Fill in **City** with `Bishoftu` and **Leaving Town** with `Adama`.
  3. Leave **Place of Birth** empty.
  4. Upload an image where visual zone POB cannot be read.
  5. Check **Place of Birth** input.
- **Expected:** Place of Birth remains blank. The amber text *"Not read from the passport. Please type it."* is displayed. Under no circumstances should `Bishoftu`, `Adama`, or `Ethiopia` be silently inserted into Place of Birth.
- **Failure:** Field is auto-filled with City, Leaving Town, or "Ethiopia".
- **Backend Dependency:** Live frontend logic.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 3. COC Status, Religion, Optional City/Phone, and Uploads

### Test REG-COC-01: Three Exact Client COC Choices & Mapping
- **Where:** `/applicants/new` $\rightarrow$ Card 9 (under Medical Details) $\rightarrow$ **COC Status** dropdown.
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Preconditions:** None.
- **Steps:**
  1. Open `/applicants/new`.
  2. Scroll down to the **COC Status** dropdown.
  3. Click the dropdown to expand its options.
- **Expected:**
  - Options visible to the user are:
    1. `Select COC Status (Optional)...` (empty)
    2. `No COC`
    3. `On process`
    4. `Have COC`
  - No legacy values (`Not Started`, `Pending`, `Issued`) appear in the dropdown.
  - The field is optional; leaving it empty allows registration without blocking errors.
- **Failure:** Dropdown contains `Issued`, `Pending`, or `Not Started`. Saving with empty value causes a validation error.
- **Backend Dependency:** Fully supported. The frontend transparently maps:
  - `Have COC` $\rightarrow$ `Issued`
  - `No COC` $\rightarrow$ `Not Started`
  - `On process` $\rightarrow$ `Pending`
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test REG-REL-01: Non-Muslim Religion Selection
- **Where:** `/applicants/new` $\rightarrow$ Card 4 $\rightarrow$ **Religion** dropdown.
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Steps:**
  1. Open `/applicants/new`.
  2. Click the **Religion** dropdown.
  3. Select **Non-Muslim**.
  4. Fill out the minimum required fields for a draft applicant and click **Save as Draft**.
- **Expected:** `Non-Muslim` is accepted, saved, and displays as `Non-Muslim` upon reopening the applicant record.
- **Failure:** `Non-Muslim` is missing from choices or backend rejects with a validation error.
- **Backend Dependency:** Live on Railway backend (`0.-18`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test REG-OPT-01: Optional City and Phone Number
- **Where:** `/applicants/new`
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Steps:**
  1. Open `/applicants/new`.
  2. Observe the labels for **Phone No.** and **City**.
  3. Verify they display `(Optional)`.
  4. Fill out remaining mandatory fields (Full Name, Gender, Country, DOB, Passport No, POB, Religion, Marital Status) leaving Phone and City blank.
  5. Click **Register Applicant**.
- **Expected:** Registration succeeds without requiring Phone or City. If a phone number is entered (e.g. `+251911223344`), it validates the phone format.
- **Failure:** Form prevents submission and highlights Phone or City as required.
- **Backend Dependency:** Live frontend validation (`0.-19`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test REG-VID-01: Video Upload on New Unsaved Applicant (Staged video_key)
- **Where:** `/applicants/new` $\rightarrow$ Card 3 (**Media Tabs**) $\rightarrow$ Click **Video** tab.
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Preconditions:** An MP4 or WebM test video file under 500 MB.
- **Steps:**
  1. Open `/applicants/new` (do not save draft first).
  2. Click the **Video** tab in Card 3.
  3. Select the test video file.
  4. Observe progress toast: "Uploading candidate video...".
  5. Wait for the upload to complete.
- **Expected:** Toast indicates *"Candidate video staged successfully! Will be attached upon saving."*. The form preview displays the video player. Saving the applicant transmits `video_key` to `create_applicant` without creating a draft first.
- **Failure:** Error *"Applicant must be saved as draft first"* or upload failure.
- **Backend Dependency:** Live on Railway backend with Cloudflare R2 (`0.-17`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 4. Applicant Details, Video Playback, and Medicals

### Test APP-MED-01: Single Authoritative Medical Badge (`medical_current`)
- **Where:**
  - Candidates Directory: Sidebar **Applicants** (`/applicants`) $\rightarrow$ **Medical Status** column.
  - Candidate Detail: Click an applicant $\rightarrow$ `/applicants/[id]` $\rightarrow$ Header metadata bar.
- **Role Required:** Any staff role with applicant viewing rights.
- **Steps:**
  1. Open `/applicants`.
  2. Inspect the **Medical Status** column for candidate rows.
  3. Click on a candidate to open their detail view `/applicants/[id]`.
  4. Inspect the **Medical:** badge in the top header info bar.
- **Expected:**
  - When `medical_current` is returned by the backend, the badge renders with both status and stage (e.g., `FIT · Selection`, `UNFIT · Pre-departure`, or `FIT (expired) · Registration`).
  - When `medical_current` is not yet deployed on the backend, the badge safely falls back to standard `FIT`, `UNFIT`, or `Pending` without breaking or crashing.
- **Failure:** Badge crashes the page with a TypeError, renders `undefined`, or fails to show fallback status.
- **Backend Dependency:** Frontend fallback is active now. Full `status · stage` will activate once backend deploys `medical_current` (`0.-22`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test APP-VID-01: Video Playback via Signed Storage URL
- **Where:** `/applicants/[id]`
- **Role Required:** Any authenticated staff or authorized Foreign Agency.
- **Preconditions:** An applicant that has an uploaded interview video.
- **Steps:**
  1. Navigate to `/applicants/[id]` for the candidate with a video.
  2. Look for the button **Play Interview Video** in the top action bar.
  3. Click **Play Interview Video**.
- **Expected:** A modal dialog opens and plays the video using the pre-authenticated signed storage URL.
- **Failure:** Button is missing, modal is blank, or video player reports 403 Forbidden.
- **Backend Dependency:** Live on production Railway.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 5. Muayena Workflow

### Test MUA-REG-01: Agency Picker Filtered by Destination Country
- **Where:** `/applicants/new`
- **Role Required:** `Registrar`, `Manager`, or `Admin`.
- **Steps:**
  1. In Card 1, select **Track:** `Muayena`.
  2. Observe the **Destination Country** dropdown (e.g., `Saudi Arabia`).
  3. Click the **Recruitment Agency** dropdown.
  4. Change Destination Country to `Kuwait` and inspect the Agency dropdown again.
- **Expected:** Agency dropdown only lists active agencies registered for the selected destination country. Recruitment Agency is required when Track is Muayena.
- **Failure:** Unfiltered agencies from all countries appear, or agency selection is not validated.
- **Backend Dependency:** Live on production backend (`0.-16`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test MUA-AGT-01: Agency Portal "Waiting for Contract" Tab
- **Where:** Route `/agent/reserved`
- **Role Required:** `Foreign Agency` (or `Manager`/`Admin` using agency context switcher).
- **Preconditions:** At least one Muayena worker registered with the current agency.
- **Steps:**
  1. Navigate to `/agent/reserved`.
  2. Observe the tabs: **Selected Applicants** and **Waiting for Contract**.
  3. Click **Waiting for Contract**.
- **Expected:** The list displays all Muayena workers registered for this agency that have not yet had a Case created. Columns show Worker Name, Passport, Job, Destination, and Registered On date.
- **Failure:** Tab is missing, fails to load, or Muayena workers appear in normal pool.
- **Backend Dependency:** Live on production backend (`0.-16`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test MUA-CASE-01: Make Case (Muayena) with Agency Prefill
- **Where:** Candidate Detail `/applicants/[id]`
- **Role Required:** `Registrar`, `Contract Parser`, `Manager`, or `Admin`.
- **Preconditions:** A Muayena applicant without an active placement.
- **Steps:**
  1. Open the Muayena candidate's detail page `/applicants/[id]`.
  2. Locate the button **Make Case (Muayena)** in the header action bar.
  3. Click **Make Case (Muayena)**.
- **Expected:**
  - A modal opens titled *"Create Muayena Case & Attach Contract"*.
  - The Agency field is prefilled with the agency chosen during registration.
  - User can upload the contract document (PDF/image) and confirm case creation.
- **Failure:** Button is missing, agency is blank, or submission fails with an unhandled exception.
- **Backend Dependency:** Live on production backend (`0.-16`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 6. Selection Requests & Direct Staff Selection

### Test SEL-STF-01: Direct Selection for an Agency by Staff (0.-23)
- **Where:** Candidate Detail `/applicants/[id]` or Candidate Directory `/applicants` $\rightarrow$ Row Action Popover.
- **Role Required:** `Manager` or `Admin`.
- **Preconditions:** A standard-track candidate at stage `CV Generated` without an active placement.
- **Steps:**
  1. Open the candidate's page `/applicants/[id]`.
  2. Click the blue button **Select for an Agency** in the top action bar.
  3. In the modal, select a target Foreign Agency from the dropdown.
  4. Click **Confirm Direct Selection**.
- **Expected:**
  - Toast displays: *"Candidate selected directly for [Agency] without request step. Case is now Selected."*
  - The candidate transitions immediately to **Selected** stage (skipping `Requested` status).
  - The agency gains exclusivity on the candidate.
- **Failure:** Button is missing for Manager/Admin, or case enters `Requested` instead of `Selected`.
- **Backend Dependency:** Live on production backend (`0.-23`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test SEL-DENY-01: Staff Selection Requests Page Approval / Denial
- **Where:** Sidebar **Selection Requests** (route `/selection-requests`).
- **Role Required:** `Manager` or `Admin`.
- **Preconditions:** A pending candidate selection request submitted by a Foreign Agency.
- **Steps:**
  1. Navigate to `/selection-requests`.
  2. Locate a pending candidate request row.
  3. Test **Approve**: Click **Approve** $\rightarrow$ confirm. The case moves to **Selected**.
  4. Test **Deny**: Click **Deny** $\rightarrow$ enter a private staff note $\rightarrow$ confirm.
- **Expected:** Denied candidate is removed from pending requests. On the agency's `/agent/reserved` view, the candidate displays an option to browse other candidates, without leaking the private staff denial reason.
- **Failure:** Agency user sees private staff notes, or approval fails.
- **Backend Dependency:** Live on production backend.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 7. Operational Workspaces & Undo Behavior

### Test UNDO-01: Active vs. Blocked vs. Hidden Undo Button (0.-24)
- **Where:**
  - Candidate Detail `/applicants/[id]`
  - Workspaces: `/applicants/[id]/follow-up`, `/operational` (LMIS, Injaz, Embassy, Departure tables)
- **Role Required:** Relevant stage officer, `Manager`, or `Admin` (NOT view-only).
- **Preconditions:**
  - Record A: A placement or applicant with a valid, reversible prior step (e.g. freshly transitioned from CV Generated $\rightarrow$ Selected, or Processing $\rightarrow$ Selected).
  - Record B: A record where step reversal is blocked (e.g. Injaz fee already paid on a subsequent step).
  - Record C: A record with no prior transition history (e.g. Draft).
- **Steps:**
  1. Open Record A: Check the **Undo** button.
  2. Open Record B: Check the **Undo** button.
  3. Open Record C: Check the **Undo** button.
- **Expected:**
  - **Record A (Available, Unblocked)**: Active, clickable Undo button is displayed.
  - **Record B (Available, Blocked)**: Button is visible but **greyed out (disabled)** with `opacity-50`, cursor-not-allowed, and hovering shows the exact backend blocking message in the tooltip.
  - **Record C (Unavailable)**: Button is completely hidden (`null`).
- **Failure:** Blocked button is completely hidden (preventing operators from seeing why it cannot be undone), or an error blanks the page.
- **Backend Dependency:** Live on production backend via `reversal.get_undoable_step`.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test UNDO-02: View-Only Role Suppression (0.-24)
- **Where:** Any operational workspace or applicant detail page.
- **Role Required:** Any user with only read-only roles (e.g., `Registrar (View)` or `Clearance Officer (View)`).
- **Steps:**
  1. Log in as a view-only user.
  2. Navigate to an applicant record that would otherwise have an active Undo step.
- **Expected:** The Undo button is completely hidden for view-only users.
- **Failure:** View-only user sees an active or clickable Undo button.
- **Backend Dependency:** Live frontend role guard (`0.-24`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test UNDO-03: Safe Reversal & Full API Reload (0.-24)
- **Where:** Candidate Detail `/applicants/[id]`
- **Role Required:** `Manager` or `Admin`.
- **Preconditions:** A safe test placement that can be reversed back one step.
- **Steps:**
  1. Click an active **Undo** button.
  2. Confirmation modal opens showing: *"This will safely reverse Placement from [current status] back to [previous status]"*.
  3. Enter an optional reason and click **Confirm Reversal**.
- **Expected:**
  - Reversal succeeds with a success toast.
  - Sends `from_status` to `reversal.reverse_last_step`.
  - The page re-queries `getApplicantV2` and `listPlacementsV2` fresh from the server and updates all UI elements without a page crash.
- **Failure:** Screen goes white/blank, or stale status remains on screen until manual browser refresh.
- **Backend Dependency:** Live on production backend via `reversal.reverse_last_step`.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 8. Agency Details & Role-Restriction Checks

### Test SEC-AGY-01: Role-Based Contractor Information Exposure
- **Where:** Sidebar **Contractors** (route `/contractors`).
- **Role Required:** Compare logins: `Contract Parser` vs. `Communication Manager` vs. `Finance Manager` vs. `Admin`.
- **Steps:**
  1. Log in as `Contract Parser`: Open `/contractors`.
  2. Log in as `Communication Manager`: Open `/contractors`.
  3. Log in as `Finance Manager`: Open `/contractors`.
- **Expected:**
  - `Contract Parser`: Sees only Agency Name and Country. Financial rates, commission batch settings, and bank details are hidden.
  - `Communication Manager`: Sees Agency Name, Country, and Contact details (phone, email). Commission rates remain hidden.
  - `Finance Manager` / `Admin`: Full access to Commission rates, batches, and ledger settings.
- **Failure:** Contract Parser or Communication Manager can view commission fees or batch invoicing tools.
- **Backend Dependency:** Live on production backend.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 9. Employee & Role Management

### Test EMP-01: Frontend In-App Staff Management
- **Where:** Sidebar **Employees** (route `/employees`).
- **Role Required:** `Admin` / `System Manager`.
- **Steps:**
  1. Navigate to `/employees`.
  2. Inspect the employee list.
  3. Click **Add Employee**. Fill in email, full name, select role(s), and set access mode to Read-Write or Read-Only.
  4. Submit.
- **Expected:** New staff account is created directly via `frappe.client.*` without directing the user to Frappe Desk or external administrative consoles.
- **Failure:** Any redirect or external link pointing outside the Next.js application.
- **Backend Dependency:** Live on production backend.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 10. Finance & Commissions

### Test FIN-BATCH-01: Cancel Commission Batch & Undo Cancel (0.-12)
- **Where:** Sidebar **Commission** (route `/commission`).
- **Role Required:** `Finance Manager`, `Manager`, or `Admin`.
- **Preconditions:** A test commission batch in `Draft` or `Issued` status.
- **Steps:**
  1. Open `/commission` $\rightarrow$ click on the test batch to view its detail page.
  2. In the batch action bar, click **Cancel Invoice**.
  3. Enter a mandatory cancellation reason (e.g. *"Test cancellation"*) $\rightarrow$ confirm.
  4. Observe the batch status badge $\rightarrow$ should be **Cancelled**.
  5. Locate and click **Undo Cancel**.
- **Expected:** Batch cancels cleanly, recorded with reason. Clicking **Undo Cancel** restores the batch back to its prior status.
- **Failure:** Cancellation fails, or Cancelled batch lacks an Undo Cancel option.
- **Backend Dependency:** Live on production backend (`0.-12`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test FIN-BATCH-02: Add & Remove Workers on Existing Batch (0.-10)
- **Where:** `/commission` $\rightarrow$ Batch detail view.
- **Role Required:** `Finance Manager`, `Manager`, or `Admin`.
- **Preconditions:** An existing batch that has available candidates not yet invoiced.
- **Steps:**
  1. Open the batch detail view.
  2. Click the button **Add Workers** in the worker table header.
  3. In the modal, check 1 or more available candidates and click **Add Selected Workers**.
  4. Observe the batch total updating.
  5. Next, click **Remove** on one of the newly added worker rows.
- **Expected:** Workers are added and removed dynamically; batch totals recalculate. Available on `Settled` batches as well.
- **Failure:** Button missing or API returns unhandled error.
- **Backend Dependency:** Live on production backend (`0.-10`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test FIN-WO-01: Worker Commission Write-Off (0.-7)
- **Where:** `/commission` $\rightarrow$ Batch detail view $\rightarrow$ Worker row.
- **Role Required:** `Finance Manager`, `Manager`, or `Admin`.
- **Steps:**
  1. On a batch item row, locate the **Write off** button.
  2. Click **Write off**.
  3. Enter write-off amount and reason (e.g. *"Negotiated agency discount"*).
  4. Confirm.
- **Expected:** The write-off is recorded, subtracted from the worker's balance, and displayed in the batch write-off history list.
- **Failure:** Write-off fails to apply or does not subtract from the total.
- **Backend Dependency:** Live on production backend (`0.-7`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 11. Reports & File Downloads

### Test REP-WBY-01: Workers by Year Period "All Time" & Binary Downloads (0.-9)
- **Where:** Sidebar **Reports** (route `/reports`) $\rightarrow$ Tab **Workers by Year**.
- **Role Required:** `Manager`, `Finance Manager`, or `Admin`.
- **Steps:**
  1. Navigate to `/reports` $\rightarrow$ click the **Workers by Year** tab.
  2. In the period filter, select **All Time**.
  3. Verify the table loads overall counts across all years.
  4. Click **Export PDF**.
  5. Check the downloaded file on your computer.
  6. Click **Export Excel (XLSX)**.
  7. Check the downloaded file on your computer.
- **Expected:**
  - Selecting "All Time" sends `period: "all"` and omits date constraints.
  - The downloaded PDF opens as a legitimate binary PDF document in Acrobat/browser (NOT a CSV file).
  - The downloaded Excel opens as a formatted spreadsheet without corruption.
- **Failure:** PDF export downloads as a CSV, or "All Time" fails to return records.
- **Backend Dependency:** Live on production backend (`0.-9`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 12. Notifications & Settings

### Test SET-R2-01: Cloudflare R2 Connection Test (0.-14)
- **Where:** Sidebar **Settings** (route `/settings`) $\rightarrow$ Tab **Cloudflare R2**.
- **Role Required:** `Admin` / `System Manager`.
- **Steps:**
  1. Open `/settings` $\rightarrow$ click **Cloudflare R2**.
  2. Inspect the configured Bucket Name, Account ID, Access Key ID, and Secret Access Key.
  3. Click **Test Storage Connection**.
- **Expected:** Toast confirms *"Cloudflare R2 connection verified successfully."*
- **Failure:** Error toast reporting authentication failure or missing credentials.
- **Backend Dependency:** Live on production backend (`0.-14`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

### Test SET-COR-01: Corridor Fee Configuration (0.-14)
- **Where:** `/settings` $\rightarrow$ Tab **Corridor Fees**.
- **Role Required:** `Admin` / `Manager`.
- **Steps:**
  1. Open `/settings` $\rightarrow$ click **Corridor Fees**.
  2. Select destination country `Saudi Arabia`.
  3. Inspect known fee lines (LMIS, Insurance, Taeshir, Injaz, Wakala).
  4. Adjust a test amount and click **Save Fee Schedule**.
- **Expected:** Fee schedule updates cleanly and returns success toast.
- **Failure:** Fees cannot be saved, or unauthorized role can mutate fees.
- **Backend Dependency:** Live on production backend (`0.-14`).
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## 13. Desktop Layout, Pagination, & Cross-Page Reliability

### Test LAY-01: Desktop Document Scroll Lock & Sticky Toolbars
- **Where:** Operational Workspaces (`/operational`), Applicant Directory (`/applicants`), Commission (`/commission`).
- **Role Required:** Any.
- **Steps:**
  1. Open the application on a desktop monitor ($>1024$px wide).
  2. Navigate through the table views.
  3. Scroll with mouse wheel or trackpad.
- **Expected:**
  - The main page/document does not scroll as an unbounded whole. Tables feature contained, internal vertical scrolling with sticky headers and pagination footers.
  - Mobile/tablet views and `/applicants/new` remain natural full-page scrollable forms.
- **Failure:** Double scrollbars, footer clipped offscreen, or pagination buttons hidden below screen bottom.
- **Backend Dependency:** Pure frontend CSS layout.
- **Result:** `[ ] Pass  [ ] Fail  [ ] Blocked  [ ] Not tested`
- **Notes:** __________________________________________________

---

## Testing Summary & Sign-Off Sheet

| Test ID | Category | Status (`Pass` / `Fail` / `Blocked`) | Verified By | Date |
|---|---|---|---|---|
| **AUTH-01** | Login & Redirect | | | |
| **AUTH-02** | Foreign Agency Isolation | | | |
| **REG-POB-01** | POB Extraction from Scan | | | |
| **REG-POB-02** | POB Manual Override Protection | | | |
| **REG-POB-03** | POB Zero-Fallback Guard | | | |
| **REG-COC-01** | Three COC Choices & Mapping | | | |
| **REG-REL-01** | Non-Muslim Religion | | | |
| **REG-OPT-01** | Optional City & Phone | | | |
| **REG-VID-01** | Staged Video Upload (`video_key`) | | | |
| **APP-MED-01** | Single Medical Badge (`medical_current`) | | | |
| **APP-VID-01** | Signed URL Video Playback | | | |
| **MUA-REG-01** | Muayena Agency Picker | | | |
| **MUA-AGT-01** | Agency "Waiting for Contract" | | | |
| **MUA-CASE-01** | Make Case (Muayena) Prefill | | | |
| **SEL-STF-01** | Direct Staff Agency Selection | | | |
| **SEL-DENY-01** | Selection Approval & Denial | | | |
| **UNDO-01** | Active / Blocked / Hidden Undo | | | |
| **UNDO-02** | View-Only Undo Suppression | | | |
| **UNDO-03** | Safe Reversal & API Reload | | | |
| **SEC-AGY-01** | Contractor Info RBAC Exposure | | | |
| **EMP-01** | In-App Staff Management | | | |
| **FIN-BATCH-01**| Cancel Batch & Undo Cancel | | | |
| **FIN-BATCH-02**| Add/Remove Workers on Batch | | | |
| **FIN-WO-01** | Commission Write-Off | | | |
| **REP-WBY-01** | Workers by Year All-Time & PDF | | | |
| **SET-R2-01** | Cloudflare R2 Connection Test | | | |
| **SET-COR-01** | Corridor Fee Settings | | | |
| **LAY-01** | Desktop Layout Scroll Contained | | | |

