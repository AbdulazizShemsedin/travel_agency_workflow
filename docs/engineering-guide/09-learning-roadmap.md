# 09 — 7-Stage Developer Learning Roadmap

This progressive self-study roadmap takes you from a beginner developer to an independent, confident engineer who can navigate, explain, debug, and safely extend the Travel Agency Workflow codebase.

---

## Stage 1: System Orientation & Running the Codebase

### Objective
Understand the business purpose of the system, learn who uses it, run the project locally, and understand the high-level architecture.

### Concepts to Learn First
- What a recruitment agency does (overseas deployment of workers to Saudi Arabia and Kuwait).
- Client vs. Server: What Next.js does vs. what Frappe does.
- Node.js, `npm run dev`, and `.env.local`.

### Source Files & Documents to Read
1. [`docs/engineering-guide/README.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/README.md)
2. [`docs/engineering-guide/01-system-architecture.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/01-system-architecture.md)
3. [`package.json`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/package.json) (Review scripts and dependencies)

### Practical Exercise (Safe & Read-Only)
1. Open PowerShell and run `git status` to see what branch you are on.
2. Inspect `.env.local` to see where `FRAPPE_BASE_URL` points.
3. Open `http://localhost:3000` in your browser. Log in as an administrator. Navigate between Dashboard, Applicants, and Reports.

### Questions You Must Answer Independently
- What are the two primary destination countries supported by this platform?
- Why does the frontend never communicate directly with the Frappe backend URL from the browser?

---

## Stage 2: Reading TypeScript, JSX, & Components

### Objective
Learn to comfortably read TypeScript interfaces, JSX syntax, component props, and array transformations used across the codebase.

### Concepts to Learn First
- JSX elements and HTML attributes.
- TypeScript interfaces vs. union types.
- Array `.map()` for rendering lists.

### Source Files & Documents to Read
1. [`docs/engineering-guide/03-frontend-fundamentals.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/03-frontend-fundamentals.md) (§1 and §2)
2. [`src/types/applicant.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/types/applicant.ts) (Inspect the `Applicant` interface)
3. [`src/components/agent/CandidateCard.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/agent/CandidateCard.tsx) (Read how props are received and rendered)

### Practical Exercise
Open `CandidateCard.tsx`. Find where the candidate's photo is rendered. Identify what fallback is shown if the candidate does not have a photo.

### Questions You Must Answer Independently
- What does `interface CandidateCardProps` define?
- What does `candidate.status === "Selected"` do in JSX?

---

## Stage 3: React State, Hooks, & Forms

### Objective
Understand how state updates the screen, how effects handle side-effects, and how multi-step forms validate user input.

### Concepts to Learn First
- `useState`: Storing user input and active tabs.
- `useEffect`: Running code after render and cleaning up timers.
- React Hook Form + Zod: Validating forms without laggy re-renders.

### Source Files & Documents to Read
1. [`docs/engineering-guide/03-frontend-fundamentals.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/03-frontend-fundamentals.md) (§3)
2. [`src/app/login/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/login/page.tsx)
3. [`src/lib/validations/applicant.schema.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/validations/applicant.schema.ts)

### Practical Exercise
Open `src/app/login/page.tsx`. Locate the lockout timer effect (`lines 51-71`). Trace how `lockoutSeconds` counts down to 0 every second using `setInterval`.

### Questions You Must Answer Independently
- Why do we use controlled inputs (`value` and `onChange`)?
- What happens if a user enters 5 incorrect passwords on the login page?

---

## Stage 4: Backend Communication, API Proxy, & Error Handling

### Objective
Trace an API request from the frontend UI to the Next.js proxy, through the Frappe backend, and back.

### Concepts to Learn First
- HTTP methods (`GET` vs `POST`).
- Session cookies (`credentials: "include"`) and CSRF tokens (`X-Frappe-CSRF-Token`).
- Custom error classes (`ApiV2Error`) and status codes (401, 403, 417, 502).

### Source Files & Documents to Read
1. [`docs/engineering-guide/05-api-and-data-flow.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/05-api-and-data-flow.md)
2. [`src/lib/api/v2/client.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/client.ts)
3. [`src/app/api/method/[...slug]/route.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/api/method/%5B...slug%5D/route.ts)

### Practical Exercise
Open `src/lib/api/v2/client.ts`. Locate the CSRF auto-heal block (`lines 230-252`). Explain to yourself what happens when the backend returns a `CSRFTokenError`.

### Questions You Must Answer Independently
- What is an HTTP 417 error in this application?
- Why are raw `/api/resource/*` requests strictly prohibited in V2?

---

## Stage 5: Cross-Feature Mastery, Roles, & Workspaces

### Objective
Understand how roles, workspaces, and navigation relate to each other across the 16 canonical roles.

### Concepts to Learn First
- Role-Based Access Control (RBAC).
- Dynamic tabs in `RoleWorkspaceContainer.tsx`.
- Foreign Agency portal isolation.

### Source Files & Documents to Read
1. [`docs/engineering-guide/06-authentication-and-permissions.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/06-authentication-and-permissions.md)
2. [`src/components/operational/RoleWorkspaceContainer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/RoleWorkspaceContainer.tsx)
3. [`src/components/layout/AppSidebar.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppSidebar.tsx)

### Practical Exercise
Open `RoleWorkspaceContainer.tsx`. Look at `allTabsConfig` and see how the active user's roles (`roles.includes("Saudi LMIS")`) determine which tabs appear on their screen.

### Questions You Must Answer Independently
- What happens if a user with the `Foreign Agency` role tries to visit `/dashboard`?
- Which roles are permitted to access the `/expenses-income` page?

---

## Stage 6: Evaluating Architecture & Design Trade-offs

### Objective
Develop senior engineering judgment. Understand why patterns were chosen, what trade-offs exist, and how to evaluate code quality.

### Source Files & Documents to Read
1. [`docs/engineering-guide/07-design-decisions-and-tradeoffs.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/07-design-decisions-and-tradeoffs.md)
2. [`src/components/layout/AppLayoutClient.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppLayoutClient.tsx)

### Questions You Must Answer Independently
- Why does this project use TanStack Query instead of storing all candidate data in Redux?
- What caused the viewport clipping bug in earlier versions of this application, and how does `flex-1 min-h-0 overflow-y-auto` permanently solve it?

---

## Stage 7: Independent Debugging & Safe Modifications

### Objective
Confidently diagnose bugs, trace user flows, make surgical code changes, and verify correctness without breaking existing features.

### Source Files & Documents to Read
1. [`docs/engineering-guide/08-developer-field-guide.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/08-developer-field-guide.md)
2. [`docs/engineering-guide/10-self-assessment.md`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/docs/engineering-guide/10-self-assessment.md)

### Practical Exercise
1. Run `npx tsc --noEmit` in PowerShell. Confirm that the codebase compiles with 0 errors.
2. Complete the self-assessment test in Document 10.
