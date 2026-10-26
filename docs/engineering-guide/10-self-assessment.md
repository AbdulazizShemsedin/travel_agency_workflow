# 10 — Self-Assessment, Practical Exercises, & Teach-Back Checkpoints

Use this assessment to test your understanding of the **Travel Agency Workflow** codebase. 

Attempt the questions and exercises first before checking the answer keys in Section 3.

---

## 1. Comprehension Questions

### Beginner Tier: Repository & File Fundamentals
1. Which directory and file defines the primary Next.js proxy route handler for backend API calls?
2. What is the role of `src/components/providers/AuthProvider.tsx` when a user refreshes the page?
3. Where are the 16 canonical V2 backend roles defined in the frontend?
4. What happens if you try to call `/api/resource/Applicant/APP-001` using `requestV2()`?

### Intermediate Tier: Data Flow, State, & Components
5. Why does the candidate registration form (`ApplicantRegistrationForm.tsx`) use React Hook Form and Zod instead of standard React `useState` for all 40+ candidate inputs?
6. When a user clicks `"Complete Step"` in the Saudi Injaz clearance workspace, what HTTP method is sent, to which endpoint, and what must be attached in the request headers?
7. How does the frontend handle file downloads (e.g. exporting the Workers by Year report as an `.xlsx` file)?
8. What is the purpose of `min-h-0` on a flex child container in `AppLayoutClient.tsx`?

### Advanced Tier: Architecture, Security, & Engineering Judgment
9. If an officer with only the `Registrar` role modifies the HTML/DOM in DevTools to make the "Approve Transaction" button visible on the Finance page and clicks it, will the transaction be approved? Explain why or why not.
10. In earlier versions of the application, navigating to Reports or Messages resulted in clipped content and overlapping footers. Explain the root cause and why `overflow-y-auto min-h-0` on `<main>` permanently resolves it.
11. Why does `requestV2` implement an automatic retry on `CSRFTokenError`?

---

## 2. Practical Exercises (Safe & Read-Only)

### Exercise 1: Tracing a Route to its API Service
- **Objective:** Trace where the candidate directory table fetches its data.
- **Task:** 
  1. Open `src/app/applicants/page.tsx`.
  2. Locate where `RoleWorkspaceContainer` is imported and rendered.
  3. Open `src/components/operational/RoleWorkspaceContainer.tsx`.
  4. Find the `"directory"` tab and see what component renders the table (`ApplicantTable`).
  5. Open `src/components/applicant/ApplicantTable.tsx`.
  6. Locate the TanStack Query hook `useQuery({ queryKey: ["applicants", ...] })`.
  7. Identify which service function is passed as the `queryFn` (`listApplicantsV2`).
  8. Open `src/lib/api/v2/applicants.ts` and write down the backend RPC method called (`agency_tracking.applicant_api.get_applicants`).

### Exercise 2: Tracing the Country Ban Flag
- **Objective:** Find where an applicant is flagged as banned ("Ashara Teyezuwal").
- **Task:**
  1. Open `src/lib/api/v2/applicants.ts`.
  2. Locate `setApplicantCountryBanV2`.
  3. Write down what parameters it accepts (`applicant_name`, `banned`, `reason`).
  4. Find which workspace component calls this function (`CountryBansTab.tsx` or `ApplicantTable.tsx`).

---

## 3. Answer Guidance & Evaluation Criteria

### Answers to Comprehension Questions

1. **Proxy Route:** `src/app/api/method/[...slug]/route.ts`. It acts as the BFF gateway forwarding requests to Frappe.
2. **AuthProvider on Refresh:** It calls `loadUserContext()` which executes `agency_tracking.auth_api.get_current_user`. If the browser has a valid `sid` cookie, it restores the user's email, name, and roles into React Context.
3. **Canonical Roles Location:** `src/lib/auth/v2Roles.ts` (the `V2_CUSTOM_ROLES` constant array).
4. **Direct DocType Prohibition:** `requestV2()` in `src/lib/api/v2/client.ts` will immediately throw an `ApiV2Error` with HTTP 400: `"Direct DocType REST access is prohibited in V2. Use whitelisted agency_tracking.* RPC methods."`
5. **Form Performance Rationale:** React Hook Form uses uncontrolled inputs under the hood. Typing into one input does not cause the entire 40-field form and 5 child step components to re-render on every keystroke. Zod guarantees schema validation matching backend requirements before sending a network request.
6. **Injaz Clearance Request:**
   - **Method:** `POST`
   - **Endpoint:** `/api/method/agency_tracking.clearance_api.complete_clearance_step`
   - **Headers:** `X-Frappe-CSRF-Token`, `Content-Type: application/json`, and `Cookie: sid=...` (attached via `credentials: "include"`).
7. **Binary Stream Handling:** `requestV2()` detects `Content-Type: application/vnd.openxmlformats...` or `Content-Disposition: attachment`. Instead of calling `response.json()`, it calls `response.blob()`, extracts the filename from `Content-Disposition`, and returns a browser `Blob` that triggers a direct file download.
8. **Purpose of `min-h-0`:** In CSS Flexbox, flex items default to `min-height: auto`, which prevents containers from shrinking below their content size. Adding `min-h-0` allows the container to shrink to fit the viewport and triggers `overflow-y-auto` scrolling.
9. **Security Enforcement:** **No, it will fail.** The backend Python function `agency_tracking.finance_api.approve_transaction` checks `frappe.get_roles()`. Because the caller only has `Registrar`, the backend immediately throws `frappe.PermissionError` (HTTP 403 Forbidden). UI visibility never overrides backend security.
10. **Clipping Root Cause & Fix:** Earlier versions placed `overflow: hidden` and fixed `h-screen` on parent layout shells. Content taller than the screen was truncated. Setting `<main className="flex-1 min-h-0 overflow-y-auto">` allows the content container to expand to fill available space and scroll vertically whenever rows exceed viewport height.
11. **CSRF Auto-Heal:** When a session cookie is renewed or a user switches accounts, the in-memory CSRF token becomes invalid. Instead of crashing the user's action with an error toast, `requestV2` catches `CSRFTokenError`, fetches a fresh token from `auth_api.get_csrf_token`, and transparently replays the request.

---

## 4. Teach-Back Checkpoints

Explain these 3 prompts in your own words (or write them down in your notes):

### Checkpoint A: The Pipeline Journey
*"Explain the life of a candidate from the moment they walk into the agency until they board the airplane. What are the major stages, which roles handle them, and what stops an unfit candidate from flying?"*

### Checkpoint B: The API Proxy
*"Why does our Next.js server have an `api/method/[...slug]` folder? What three jobs does it perform between the browser and the Python backend?"*

### Checkpoint C: Making Safe Changes
*"If a manager asks you to add a new required checkbox to the candidate registration form, what 4 files would you open, in what order, and how would you verify your work before committing?"*
