# 08 — Developer Field Guide: Debugging & Safe Modifications

This guide is your daily operational handbook. It provides step-by-step recipes to investigate bugs, trace user interactions, diagnose network errors, and safely modify features in this repository without breaking existing functionality.

---

## 1. How to Find Which File Renders a Page

When you are looking at a screen in your browser and need to find the underlying code:

1. **Inspect the URL Path:**
   - In Next.js App Router, the URL path directly matches the folder structure under `src/app/`.
   - `/applicants` ➔ `src/app/applicants/page.tsx`
   - `/applicants/new` ➔ `src/app/applicants/new/page.tsx`
   - `/applicants/APP-2026-0001` ➔ `src/app/applicants/[id]/page.tsx`
   - `/agent/chat` ➔ `src/app/agent/chat/page.tsx`
   - `/reports` ➔ `src/app/reports/page.tsx`
2. **Find the Layout Shell:**
   - Check if there is a `layout.tsx` in that folder or any parent folder.
   - Internal staff pages are wrapped by [`src/components/layout/AppLayoutClient.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppLayoutClient.tsx).
   - Partner agency pages (`/agent/*`) are wrapped by [`src/components/agent/AgentLayout.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/agent/AgentLayout.tsx).
3. **Trace Child Components:**
   - Open the `page.tsx` file and look at the imported components.
   - For example, `src/app/applicants/page.tsx` imports [`RoleWorkspaceContainer`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/RoleWorkspaceContainer.tsx), which dynamically renders specific workspace tabs (`LMISWorkspace`, `InjazWorkspace`, `EmbassyWorkspace`).

---

## 2. How to Trace a Button Click to its Handler & API Call

1. **Locate the Button in JSX:**
   - Search the workspace for the button's visible text (e.g. search for `"Complete Step"` or `"Submit Registration"`).
2. **Find the `onClick` or `onSubmit` Prop:**
   - In `InjazWorkspace.tsx`, find `<Button onClick={handleSaveStep}>Complete Step</Button>`.
3. **Inspect the Handler Function:**
   - Search upward in that same file for `const handleSaveStep = async () => { ... }`.
4. **Follow the Service Call:**
   - Inside `handleSaveStep`, see what function is called (e.g. `await completeClearanceStepV2(payload)`).
   - Hold `Ctrl` (or right-click) and select **Go to Definition** to open `src/lib/api/v2/clearance.ts`.
5. **Inspect the Backend Endpoint:**
   - Inside `completeClearanceStepV2`, you will see the exact RPC called:
     `POST /api/method/agency_tracking.clearance_api.complete_clearance_step`.

---

## 3. Diagnosing API & HTTP Error Codes

When an API call fails, the client logs errors to the browser console and displays a notification toast. Use this table to diagnose the cause:

| HTTP Status | What it Means in this App | How to Investigate & Fix |
| :--- | :--- | :--- |
| **0 / NetworkError** | Browser cannot reach Next.js server, or Wi-Fi dropped. | Verify your network connection and verify `npm run dev` is running in your terminal. |
| **401 Unauthorized** | The `sid` session cookie has expired or was cleared. | Log in again at `/login`. Inspect browser Application > Cookies to see if `sid` is present. |
| **403 Forbidden** | Role permission failure. | Check the user's assigned roles in `AuthProvider`. The user's role does not have authorization for this backend RPC. |
| **404 Not Found** | Record does not exist, or wrong endpoint path. | Verify that the applicant/placement name (`APP-YYYY-NNNNN`) exists in the database. |
| **413 Too Large** | Uploaded passport image or PDF exceeds size limit. | The file exceeds 20MB. Compress the image before uploading. |
| **417 Expectation Failed** | **Business Rule or Gate Violation.** | **Read the error message carefully!** Examples:<br>• `"medical_status must be FIT before generating CV"`<br>• `"year_type must be one of: Ethiopian Fiscal, Gregorian..."`. You sent a payload that violated backend state machine rules. |
| **502 Bad Gateway** | Upstream Frappe backend is offline or unreachable. | Check your `.env.local` setting for `FRAPPE_BASE_URL`. Verify the Railway or local backend server is running. |

---

## 4. Diagnosing Why a Table is Empty

If an operational workspace table or candidate directory displays "No candidates found":

1. **Check Role Permissions:**
   - Does the logged-in user have the role required to view that workspace? (e.g. an officer without `Saudi LMIS` will not see candidates in the LMIS workspace).
2. **Check the Active Corridor Filter:**
   - In [`RoleWorkspaceContainer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/RoleWorkspaceContainer.tsx), look at the country filter selector (`All`, `Saudi Arabia`, `Kuwait`). If set to `Kuwait`, all Saudi candidates are filtered out!
3. **Inspect the Network Response in DevTools:**
   - Open Browser DevTools > Network tab.
   - Filter by `Fetch/XHR` and inspect `get_workspace_data`.
   - Check the `queue` array in the response. If `queue: []`, there are genuinely no candidates currently waiting at that stage in the database.

---

## 5. Diagnosing CSS Overflow & Viewport Clipping

If page content is clipped or cut off behind a header:

1. **Inspect Parent Containers for `overflow: hidden`:**
   - Open DevTools Elements tab, select the clipped element, and check its ancestor containers.
   - Never place `overflow: hidden` on a main page wrapper that holds dynamic content.
2. **Check for Missing `min-h-0` on Flex Children:**
   - In CSS Flexbox, a flex item inside a vertical column cannot shrink below its content height unless you set `min-h-0`.
   - Add `min-h-0` and `overflow-y-auto` to the scrollable container.
3. **Verify the Layout Structure:**
   - The established standard in this codebase is:
     `<main className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto p-3 lg:p-4">`.

---

## 6. Practical "Change Impact" Guide: Where to Go First

Use this roadmap before modifying any feature:

### Scenario A: "I need to add a new field to Candidate Intake (e.g. Blood Type)"
1. **Inspect Schema:** [`src/lib/validations/applicant.schema.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/validations/applicant.schema.ts) ➔ Add the field to Zod validation.
2. **Inspect Types:** [`src/types/applicant.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/types/applicant.ts) ➔ Add property to `Applicant` interface.
3. **Inspect Form UI:** [`src/components/applicant/steps/Step1PersonalInfo.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/applicant/steps/Step1PersonalInfo.tsx) ➔ Add `<Input>` component.
4. **Inspect Review Step:** [`src/components/applicant/steps/Step5Review.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/applicant/steps/Step5Review.tsx) ➔ Display field in confirmation table.
5. **Inspect API Payload:** [`src/lib/api/v2/applicants.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/applicants.ts) ➔ Ensure `registerApplicantV2` includes the field.

### Scenario B: "I need to modify who can access a Sidebar page"
1. **Inspect Role Taxonomy:** [`src/lib/auth/v2Roles.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/v2Roles.ts) ➔ Verify canonical role name.
2. **Inspect Capability Mapping:** [`src/lib/auth/permissions.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/permissions.ts#L168-L314) ➔ Add the role to `ACTION_ROLE_MAP`.
3. **Inspect Route Guard:** [`ROUTE_PERMISSION_MAP`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/permissions.ts#L335-L347) ➔ Verify route mapping matches the capability.

### Scenario C: "I need to change an Operational Clearance Form (e.g. LMIS)"
1. **Inspect Workspace View:** [`src/components/operational/workspaces/LMISWorkspace.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/workspaces/LMISWorkspace.tsx).
2. **Inspect Drawer & Modal:** [`src/components/operational/OperationalDrawer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/OperationalDrawer.tsx).
3. **Inspect Clearance API:** [`src/lib/api/v2/clearance.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/clearance.ts) ➔ Update `completeClearanceStepV2` parameters.

---

## 7. Quality Checks Before Committing Any Work

Always run these verification commands before declaring a task finished:

1. **TypeScript Static Verification:**
   ```powershell
   npx tsc --noEmit
   ```
   *Expected Result:* Must exit cleanly with 0 errors. If errors exist, resolve all type mismatches first.
2. **Inspect Unstaged Changes:**
   ```powershell
   git status -s
   ```
   *Expected Result:* Review the list of modified files. Confirm that no unintended files or temporary debug scripts were touched.
3. **Review Git Diff:**
   ```powershell
   git diff <filename>
   ```
   *Expected Result:* Confirm every modified line is directly necessary for your intended change.
