# 07 — Architectural Design Decisions & Engineering Trade-offs

This document analyzes the primary architectural patterns and engineering choices in this application. It provides senior engineering rationale, evaluates trade-offs, compares practical alternatives, and establishes criteria for evaluating future changes.

---

## Decision 1: Backend-For-Frontend (BFF) Server Proxy Architecture

### Observed Implementation
All browser requests target local Next.js route handlers (`/api/method/[...slug]` and `/files/[...slug]`), which proxy requests upstream to the Frappe backend.

### Evidence
- [`src/app/api/method/[...slug]/route.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/api/method/%5B...slug%5D/route.ts#L183-L252)
- [`src/app/files/[...slug]/route.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/files/%5B...slug%5D/route.ts)

### Likely Benefits
- **Eliminates CORS & Cookie Blocking:** Completely sidesteps cross-origin cookie restrictions and Safari ITP blocking.
- **Header Injection & Retries:** Allows transparent injection of tunnel bypass headers (`ngrok-skip-browser-warning`) and automated retries on transient network disconnects.
- **Binary Streaming:** Pipes file downloads (PDF/Excel) cleanly with client-side filename decoding.

### Trade-offs
- **Additional Hop:** Adds a few milliseconds of latency as requests pass through Next.js server before reaching Frappe.
- **Payload Limits:** Node.js server body-parser limits must be accounted for during large file uploads (mitigated via streaming form data).

### Alternatives
- *Direct Browser-to-Backend Calls:* Browser calls `https://backend.railway.app` directly.
- *Why Alternative Might Be Better:* Reduces server CPU usage on the Next.js host and reduces latency by a few milliseconds.
- *Why Alternative Was Rejected:* Requires complex CORS configuration on Frappe, risks cookie drops across third-party domains, and prevents centralized retry logic.

### Assessment & Recommendation
**Sound and resilient.** Keep the proxy architecture. It dramatically stabilizes cookie-based sessions across diverse development and production environments. *(Confidence: Confirmed)*

---

## Decision 2: Backend-Owned State Machine Transitions

### Observed Implementation
The frontend never mutates status fields directly (`doc.status = "..."` is prohibited). All transitions occur via explicit backend RPCs (`register_applicant`, `advance_placement`, `start_clearance_step`, `complete_clearance_step`).

### Evidence
- `src/lib/api/v2/placements.ts`
- `src/lib/api/v2/clearance.ts`
- `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md` (§1)

### Likely Benefits
- **Single Source of Truth:** Legal transitions (DAG topology), stage gates (e.g. mandatory medical FIT), and audit logging (`Process Event`) are strictly enforced by Python `state_machine.py`.
- **Eliminates Client Desynchronization:** Impossible for a frontend bug to advance an unqualified candidate to Visa Issued without clearing government prerequisites.

### Trade-offs
- The frontend cannot perform optimistic status updates without risking rollback if a backend gate fails.

### Alternatives
- *Generic CRUD REST Updates (`PUT /api/resource/Applicant/APP-001`):* Frontend modifies status field and saves document.
- *Why Alternative Was Rejected:* Catastrophic for an audited legal pipeline. It bypasses stage gates, skips transition event logs, and introduces data corruption.

### Assessment & Recommendation
**Mandatory architectural rule.** Must never be altered. All future workflow features must trigger backend RPCs rather than mutating status fields directly. *(Confidence: Confirmed)*

---

## Decision 3: Dynamic Corridor Step Engine

### Observed Implementation
Clearance steps (LMIS, Injaz, Wakala, Embassy, Telesign) are fetched dynamically from `agency_tracking.corridor_engine.get_corridor_steps` based on `destination_country`, rather than hardcoding steps in UI templates.

### Evidence
- [`src/lib/api/v2/corridor.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/api/v2/corridor.ts#L36-L53)
- [`src/components/operational/RoleWorkspaceContainer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/RoleWorkspaceContainer.tsx)

### Likely Benefits
- **Zero Frontend Code Changes for New Countries:** Adding a deployment corridor for Qatar, UAE, or Jordan requires only configuring data in the backend database.
- **Corridor Differences Handled Gracefully:** Handles differences between Saudi Arabia (Te'shir/Injaz) and Kuwait (Telesign/Police Ashara) dynamically.

### Trade-offs
- Requires an initial network fetch to resolve steps before rendering candidate progress bars.

### Assessment & Recommendation
**Excellent design.** Highly extensible. Leave intact. *(Confidence: Confirmed)*

---

## Decision 4: Client-Side PDF Generation (`jsPDF` / `html2canvas-pro`)

### Observed Implementation
Standard Ethiopian candidate CV documents are rendered into DOM elements and converted directly to PDF on the client machine using `html2canvas-pro` and `jsPDF`.

### Evidence
- [`src/lib/utils/cvPdfGenerator.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/utils/cvPdfGenerator.ts)
- [`src/app/applicants/[id]/cv/page.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/applicants/[id]/cv/page.tsx)

### Likely Benefits
- **Zero Backend Server Load:** Generating 500 candidate CVs consumes client CPU and memory rather than overloading the backend application server.
- **Instant Visual Fidelity:** What the user previews in the browser is pixel-for-pixel what prints onto the generated PDF.

### Trade-offs
- Heavy JavaScript bundles (`jspdf`, `pdf-lib`, `html2canvas-pro` add ~350KB to the client bundle).
- Client devices with low memory may take a few seconds to render complex canvas elements.

### Alternatives
- *Server-Side Weasyprint / Puppeteer:* Backend renders HTML to PDF via headless browser.
- *Why Alternative Might Be Better:* Faster downloads on slow mobile phones; consistent server fonts.
- *Why Client Generation Was Chosen:* Avoids hosting expensive headless Chromium containers on server infrastructure.

### Assessment & Recommendation
**Practical and cost-effective.** Keep client-side generation for individual CV downloads, while using backend streaming for multi-row tabular Excel exports. *(Confidence: Inferred)*

---

## Decision 5: TanStack Query (React Query) for Server State

### Observed Implementation
All asynchronous server queries (candidates, placements, workspaces, reports) are managed by `@tanstack/react-query` with a 5-minute stale-time window.

### Evidence
- [`src/components/providers/QueryProvider.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/providers/QueryProvider.tsx)
- [`RoleWorkspaceContainer.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/operational/RoleWorkspaceContainer.tsx)

### Likely Benefits
- **Eliminates Duplicate Network Calls:** If two components request the candidate list simultaneously, TanStack Query executes only one HTTP call and shares the cached result.
- **Targeted Cache Invalidation:** When a user registers an applicant or completes a clearance step, calling `queryClient.invalidateQueries({ queryKey: ["applicants"] })` automatically refetches fresh data in the background without reloading the page.

### Trade-offs
- Requires developers to understand query keys and cache lifecycle.

### Assessment & Recommendation
**Industry best practice.** Dramatically outperforms manual `useEffect` fetching. *(Confidence: Confirmed)*

---

## Decision 6: Responsive Layout & Natural Viewport Scrolling

### Observed Implementation
The master layout shell ([`AppLayoutClient.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppLayoutClient.tsx)) employs `flex-1 min-h-0 min-w-0 overflow-y-auto` on the main container.

### Evidence
- `src/components/layout/AppLayoutClient.tsx`
- `src/components/agent/AgentLayout.tsx`
- `src/components/chat/ChatContainer.tsx`

### Likely Benefits
- **No Content Clipping:** Data-heavy pages like Reports & Operational Analytics scroll vertically when rows exceed the screen height.
- **Sticky Navigation:** Sidebars and navbars remain locked in position while only the active content region scrolls.
- **Chat Adaptability:** The chat interface uses `flex-1 min-h-0 h-full`, expanding naturally to fit between navbar and footer without hardcoded pixel offsets.

### Trade-offs
- Developers must remember to place `min-h-0` on flex children to allow scrolling to trigger properly.

### Assessment & Recommendation
**Permanent structural fix.** Never reintroduce `overflow: hidden` on `<main>` or parent page containers. *(Confidence: Confirmed)*
