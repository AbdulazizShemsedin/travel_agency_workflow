# 02 — Repository Structure & File-by-File Catalog

This document is an exhaustive structural inventory and reference catalog for every meaningful first-party file in the **Travel Agency Workflow Frontend** repository.

---

## 1. Directory Tree & Architectural Responsibilities

```text
travel_agency_workflow/
├── .env.example                         # Template for local environment configuration
├── .env.local                           # Active local environment variables (Git-ignored)
├── next.config.ts                       # Next.js framework configuration (proxy rewrites, domains)
├── package.json                         # Project dependencies, scripts, and engine specifications
├── tsconfig.json                        # TypeScript strict compiler options & path aliases (@/*)
├── public/                              # Static public assets served at root (logos, icons)
├── src/
│   ├── Assets/                          # System documentation, OpenAPI specs, and contract baselines
│   ├── app/                             # Next.js App Router (Routes, Layouts, API Handlers)
│   │   ├── (shared layouts)             # Root layout.tsx, globals.css, favicon.ico
│   │   ├── agent/                       # Foreign Agency Portal (external partner candidate views)
│   │   ├── api/                         # Server-side API & File proxy route handlers
│   │   ├── applicants/                  # Internal staff applicant directory & registration
│   │   ├── chat/                        # Internal & cross-agency communication interface
│   │   ├── commission/                  # Contractor commission settlement & history
│   │   ├── complaints/                  # Post-deployment dispute tracking
│   │   ├── contractors/                 # Foreign agency partner management & rate matrix
│   │   ├── dashboard/                   # Executive & operational pipeline overview
│   │   ├── employees/                   # Staff user management & role administration
│   │   ├── expenses-income/             # Financial accounting (transactions, refunds, FX rates)
│   │   ├── login/                       # User authentication & lockout countdown
│   │   ├── notifications/               # Push & in-app event notification center
│   │   ├── permissions/                 # Role permission review & auditing
│   │   ├── reports/                     # Operational analytics, exports, and staff metrics
│   │   └── settings/                    # User preferences & agency profile configuration
│   ├── components/                      # Reusable React UI Component Library
│   │   ├── agent/                       # Components exclusive to the Foreign Agency Portal
│   │   ├── applicant/                   # Candidate registration forms, modals & tables
│   │   ├── chat/                        # Split-pane messaging container, thread lists, chat bubbles
│   │   ├── contractors/                 # Rate matrix modals & partner configuration forms
│   │   ├── demo/                        # Development role switchers & demo indicators
│   │   ├── finance/                     # FX rate modals & multi-currency display badges
│   │   ├── layout/                      # Global application navigation (Sidebar, Navbar, Main Shell)
│   │   ├── notifications/               # Push notification toggle switches
│   │   ├── operational/                 # Clearance workspaces, drawers, and spreadsheet-style tables
│   │   ├── providers/                   # React Context Providers (Auth, TanStack Query, Tour)
│   │   ├── tour/                        # Interactive onboarding step modals
│   │   └── ui/                          # Headless Radix UI styled primitives (buttons, inputs, dialogs)
│   ├── lib/                             # Core Business Logic, API Clients, & Utilities
│   │   ├── api/                         # Authoritative V2 backend RPC client modules
│   │   ├── auth/                        # RBAC rules, canonical role taxonomy, and route permission maps
│   │   ├── config/                      # Environment variable validation & feature flag resolution
│   │   ├── demo/                        # Static demo fixtures for offline fallback
│   │   ├── pdf/                         # Document generation helpers
│   │   ├── store/                       # Client-side transient stores
│   │   ├── utils/                       # OCR scanners, error formatters, PDF builders, and export tools
│   │   └── validations/                 # Zod validation schemas for candidate intake
│   └── types/                           # Shared TypeScript type definitions and backend contracts
│       ├── applicant.ts                 # Full candidate and placement data model interfaces
│       └── workspace.ts                 # Operational clearance workspace data models
└── docs/                                # Developer Guides & Onboarding Manuals
    └── engineering-guide/               # This comprehensive master documentation suite
```

---

## 2. Root Configuration & Project Files

### `package.json`
- **Path:** [`package.json`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/package.json)
- **Purpose:** Defines project metadata, npm scripts, and third-party dependencies.
- **Key Contents:**
  - `scripts.dev`: Runs `next dev` (development server).
  - `scripts.build`: Runs `next build` (compiles production bundle).
  - `scripts.lint`: Runs `eslint` across the codebase.
- **Dependencies:** React 19, Next.js 16, Tailwind CSS 4, Radix UI, TanStack Query, TanStack Table, Zod, React Hook Form, jsPDF, Tesseract.js.
- **Change Impact:** Modifying packages or versions can cause breaking changes across component rendering or API parsing.

### `next.config.ts`
- **Path:** [`next.config.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/next.config.ts)
- **Purpose:** Configures Next.js compilation, image optimization domains, and server behavior.
- **Key Contents:** Defines allowed image remote patterns (allowing candidate passport photos to load from backend hosts).

### `tsconfig.json`
- **Path:** [`tsconfig.json`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/tsconfig.json)
- **Purpose:** TypeScript compiler configuration.
- **Key Contents:** Enforces strict type checking (`"strict": true`) and configures path aliases (`@/*` mapping to `./src/*`).

### `.env.local` / `.env.example`
- **Path:** [`.env.example`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/.env.example)
- **Purpose:** Environment variable specifications.
- **Key Variables:**
  - `FRAPPE_BASE_URL`: Upstream backend URL used by Next.js server-side route proxies.
  - `NEXT_PUBLIC_FRAPPE_URL`: Client-accessible backend URL.
  - `NEXT_PUBLIC_DEMO_MODE`: Boolean flag (`false` in production) to disable demo fixtures.

---

## 3. Core HTTP & API Client Layer (`src/lib/api/`)

### `src/lib/api/v2/client.ts`
- **Path:** [`src/lib/api/v2/client.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/client.ts)
- **Purpose:** The centralized HTTP client engine for all backend interactions.
- **Key Contents:**
  - `ApiV2Error` class: Custom error class wrapping status codes, Frappe exceptions, and user-facing messages.
  - `getCachedOrFetchCsrfToken()`: Resolves and caches the `X-Frappe-CSRF-Token`.
  - `requestV2<T>()`: The foundational fetch wrapper. Prohibits raw `/api/resource/*` calls, attaches credentials, handles binary streams, auto-retries on CSRF mismatch, and unpacks Frappe response envelopes.
- **Dependencies:** [`src/lib/utils/error-formatter.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/utils/error-formatter.ts).
- **Dependents:** All domain service files in `src/lib/api/v2/`.
- **Change Impact:** **Critical.** Any bug introduced here breaks all backend communications application-wide.

### `src/lib/api/v2/applicants.ts`
- **Path:** [`src/lib/api/v2/applicants.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/applicants.ts)
- **Purpose:** Domain service for candidate intake, registration, querying, and updating.
- **Key Functions:**
  - `registerApplicantV2(payload)`: Submits intake form; advances status from Draft to Registered.
  - `listApplicantsV2(params)`: Queries candidate directory with filtering, sorting, and pagination.
  - `getApplicantV2(name)`: Fetches complete candidate profile.
  - `updateApplicantV2(name, fields)`: Updates non-gated candidate details.
  - `setApplicantCountryBanV2(name, banned, reason)`: Flags or removes a country ban.
- **Dependents:** [`ApplicantRegistrationForm.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/applicant/ApplicantRegistrationForm.tsx), [`ApplicantTable.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/applicant/ApplicantTable.tsx), [`[id]/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/applicants/[id]/page.tsx).

### `src/lib/api/v2/placements.ts`
- **Path:** [`src/lib/api/v2/placements.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/placements.ts)
- **Purpose:** Domain service for the Placement pipeline, agency selection, ticketing, and departure.
- **Key Functions:**
  - `createPlacementV2()`: Creates a new placement record linking candidate and contractor.
  - `advancePlacementV2()`: Executes legal pipeline transitions via the State Machine.
  - `saveTicketingV2()`: Saves airline itinerary, ticket number, and flight date.
  - `recordDepartureV2()`: Transitions placement to `Departed` status.
  - `listSelectionRequestsV2()`: Fetches candidate reservation requests from foreign partner agencies.
- **Dependents:** [`RoleWorkspaceContainer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/RoleWorkspaceContainer.tsx), [`TicketingDepartureModal.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/applicant/TicketingDepartureModal.tsx).

### `src/lib/api/v2/clearance.ts`
- **Path:** [`src/lib/api/v2/clearance.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/clearance.ts)
- **Purpose:** Domain service for country-specific clearance steps.
- **Key Functions:**
  - `startClearanceStepV2()`: Marks a clearance step as In Progress.
  - `completeClearanceStepV2()`: Records completion details (e.g. MOFA number, sticker number, biometric date).
  - `updateClearanceDataV2()`: Modifies step-specific metadata (Injaz, Wakala, Police Ashara).
- **Dependents:** Clearance workspaces in `src/components/operational/workspaces/`.

### `src/lib/api/v2/finance.ts`
- **Path:** [`src/lib/api/v2/finance.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/finance.ts)
- **Purpose:** Financial operations, transaction approval, FX rate management, and commissions.
- **Key Functions:**
  - `listTransactionsV2()`: Queries financial ledgers.
  - `createTransactionV2()`: Logs candidate-associated stage expenses or incomes.
  - `approveTransactionV2()`, `rejectTransactionV2()`: Multi-stage financial audit approvals.
  - `getActiveFxRatesV2()`, `setFxRateV2()`: Manages currency conversions to Ethiopian Birr (ETB).
- **Dependents:** [`src/app/expenses-income/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/expenses-income/page.tsx), [`FxRateModal.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/finance/FxRateModal.tsx).

### `src/lib/api/v2/reports.ts`
- **Path:** [`src/lib/api/v2/reports.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/reports.ts)
- **Purpose:** Operational analytics, funnel metrics, and streaming exports.
- **Key Functions:**
  - `getWorkersByYearV2(params)`: Queries historical deployed worker records with Ethiopian/Gregorian date filters.
  - `exportWorkersByYearV2(params, format)`: Streams binary `.xlsx` or `.pdf` reports directly from the backend.
  - `getOperationsSummaryV2()`, `getDailyWorkReportV2()`: Aggregates real-time agency productivity metrics.
- **Dependents:** [`src/app/reports/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/reports/page.tsx).

---

## 4. Authentication & Authorization Layer (`src/lib/auth/`)

### `src/lib/auth/v2Roles.ts`
- **Path:** [`src/lib/auth/v2Roles.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/v2Roles.ts)
- **Purpose:** Authoritative definition of the 16 canonical V2 roles and role helper predicates.
- **Key Constants & Functions:**
  - `V2_CUSTOM_ROLES`: The 16 canonical roles matching backend `swagger.json`.
  - `hasV2Role()`, `hasAnyV2Role()`: Case-insensitive role matching with Administrator overrides.
  - `isRoleReadOnly()`: Evaluates whether a user's role is restricted to read-only viewing.
  - `isV2ForeignAgency()`: Detects external partner agency accounts.

### `src/lib/auth/permissions.ts`
- **Path:** [`src/lib/auth/permissions.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/permissions.ts)
- **Purpose:** Maps granular UI actions and route paths to backend roles.
- **Key Contents:**
  - `PermissionAction`: Union of capabilities (`registerApplicant`, `manageUsers`, `viewFinance`, `editLms`, etc.).
  - `ACTION_ROLE_MAP`: Role assignment table mapping actions to allowed roles.
  - `can(user, action)`: Central permission evaluation function.
  - `ROUTE_PERMISSION_MAP`: Route-to-permission mapping used by the route guard.

---

## 5. Global Layout & Shell Components (`src/components/layout/`)

### `src/components/layout/AppLayoutClient.tsx`
- **Path:** [`src/components/layout/AppLayoutClient.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppLayoutClient.tsx)
- **Purpose:** The primary master shell for all internal staff routes.
- **Structure:**
  - Renders the collapsible [`AppSidebar`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppSidebar.tsx) on the left.
  - Renders the [`AppNavbar`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppNavbar.tsx) at the top.
  - Wraps route children in a `<main>` container configured with `flex-1 min-h-0 overflow-y-auto`, ensuring full vertical accessibility and responsive padding across desktop, tablet, and mobile.

### `src/components/layout/AppSidebar.tsx`
- **Path:** [`src/components/layout/AppSidebar.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppSidebar.tsx)
- **Purpose:** The main collapsible navigation sidebar.
- **Behavior:**
  - Dynamically filters menu items based on `can(item.action)` so staff only see sections permitted by their role.
  - Completely hides internal navigation if the logged-in user is an external partner agency (`isForeignAgency`).
  - Supports collapsible icon mode on desktop (`w-20` vs `w-64`) and slide-over drawer mode on mobile.
  - Integrates the interactive application tour and user logout modal.

### `src/components/agent/AgentLayout.tsx`
- **Path:** [`src/components/agent/AgentLayout.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/agent/AgentLayout.tsx)
- **Purpose:** Specialized portal shell for foreign agency partners (`/agent/*`).
- **Behavior:**
  - Provides partner-specific navigation (Candidate Discovery, Reserved Workers, Replacements, Direct Chat).
  - Enforces isolation from internal staff administrative features.

---

## 6. Core Application Routes (`src/app/`)

### `src/app/dashboard/page.tsx`
- **Path:** [`src/app/dashboard/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/dashboard/page.tsx)
- **Purpose:** Primary operational overview page.
- **Components Rendered:**
  - **Tier 1 (Top Metric Cards):** Total Applicants, In Progress, Completed, Departed.
  - **Tier 2 (Pipeline Overview):** Visual 7-stage interactive candidate progression overview.
  - **Tier 3 (Operational Cards):** Document Expiry alerts, Quick Actions, and Recent Applicants roster.
- **Sizing Strategy:** Sized to fill the viewport height gracefully on desktop without awkward bottom dead space.

### `src/app/applicants/page.tsx` & `src/components/operational/RoleWorkspaceContainer.tsx`
- **Path:** [`src/app/applicants/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/applicants/page.tsx)
- **Purpose:** The central operational engine of the platform.
- **Workspaces Managed:**
  1. `Applicant List` (Full Directory via [`ApplicantTable.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/applicant/ApplicantTable.tsx))
  2. `Follow-up` (Candidate milestones & progress tracking)
  3. `Selection Requests` (Partner agency candidate reservations)
  4. `CV` (Candidate bio-data & CV generation)
  5. `Medical Clearance` (FIT/UNFIT medical determinations)
  6. `LMIS Clearance` (Ministry of Labor & COC clearances)
  7. `Te'shir / Injaz` (Saudi MOFA visa registration & biometrics)
  8. `Embassy & Stamping` (Wakala authorization & Embassy stamping)
  9. `Ticket & Departure` (Flight itinerary recording & departure logging)
  10. `Ban Requests` (Country ban approval queues)

### `src/app/applicants/new/page.tsx` & `ApplicantRegistrationForm.tsx`
- **Path:** [`src/app/applicants/new/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/applicants/new/page.tsx)
- **Purpose:** 5-step applicant intake wizard.
- **Steps:**
  - **Step 1:** Personal Info, Photo, Target Job, Salary, Destination Country.
  - **Step 2:** Education, Languages, Domestic & International Experience.
  - **Step 3:** Passport Details, Local MRZ Scan OCR, Emergency Contacts.
  - **Step 4:** COC Certificate, Initial Medical Exam, Fit Status.
  - **Step 5:** Final Review & Submission (`register_applicant`).

### `src/app/reports/page.tsx`
- **Path:** [`src/app/reports/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/reports/page.tsx)
- **Purpose:** Operational analytics and regulatory reporting portal.
- **Sections:**
  - **Applicant List Report:** Historical worker deployment records with Ethiopian Fiscal, Gregorian, and custom date range filters, with binary Excel/PDF exports.
  - **Daily Work Report:** Day-by-day agency throughput across intake, medicals, clearances, visas, and tickets.
  - **Funnel & Turnaround:** SLA metrics and recruitment bottlenecks.
  - **Placement Aging:** Overdue and delayed candidate monitoring.
  - **Financial Overview:** Revenue, expenses, and gross margins (Admin/Finance only).

### `src/app/agent/chat/page.tsx` & `src/app/chat/page.tsx`
- **Path:** [`src/app/agent/chat/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/agent/chat/page.tsx)
- **Purpose:** Real-time communication interface between foreign agency partners and the internal agency Communication Manager.
- **Component:** Uses [`ChatContainer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/chat/ChatContainer.tsx) to provide split-pane thread selection, message history, read receipts, and file attachments.

---

## 7. Next.js Server-Side Proxy Routes (`src/app/api/`)

### `src/app/api/method/[...slug]/route.ts`
- **Path:** [`src/app/api/method/[...slug]/route.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/api/method/%5B...slug%5D/route.ts)
- **Purpose:** Server-side proxy gateway forwarding all `/api/method/*` requests to the upstream backend.
- **Key Logic:**
  - Intercepts requests, reads `FRAPPE_BASE_URL`, and attaches session cookies.
  - Forwards `X-Frappe-CSRF-Token` headers for state-changing POST operations.
  - Injects `ngrok-skip-browser-warning` when development tunnels are detected.
  - Retries transient upstream network timeouts up to 2 times.
  - Detects binary streams (Excel/PDF) and pipes buffers directly to the client with `Content-Disposition` preserved.
  - Formats HTML upstream error pages into clean JSON error envelopes.

### `src/app/files/[...slug]/route.ts` & `src/app/private/files/[...slug]/route.ts`
- **Path:** [`src/app/files/[...slug]/route.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/files/%5B...slug%5D/route.ts)
- **Purpose:** Proxies public and private candidate file uploads and attachments (e.g. passport scans, contracts, medical reports).
- **Behavior:** Ensures session cookies are attached so private Frappe files cannot be viewed without valid authentication.
