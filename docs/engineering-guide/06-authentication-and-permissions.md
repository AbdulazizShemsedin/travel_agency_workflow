# 06 — Authentication, Authorization, & User Roles

This document details how user identity is established, maintained, and verified across the application. It covers session cookies, the 16 canonical roles, route guarding, and the critical distinction between frontend UI visibility and backend security enforcement.

---

## 1. Authentication Architecture & Session Lifecycle

The platform uses **stateful session cookies** issued by the Frappe backend.

```mermaid
sequenceDiagram
    actor User as Staff / Partner User
    participant LoginUI as /login (LoginPage.tsx)
    participant AuthContext as AuthProvider.tsx
    participant Proxy as /api/method/login
    participant Backend as Frappe Authentication

    User->>LoginUI: Enters email and password
    LoginUI->>AuthContext: login(email, password)
    AuthContext->>Proxy: POST /api/method/login { usr, pwd }
    Proxy->>Backend: Forward credentials
    Backend-->>Proxy: 200 OK + Set-Cookie: sid=abc123xyz; Path=/; HttpOnly
    Proxy-->>AuthContext: Sets sanitized cookie in browser
    AuthContext->>Proxy: GET /api/method/agency_tracking.auth_api.get_current_user
    Proxy->>Backend: Forward sid cookie
    Backend-->>Proxy: { email, full_name, roles: ["Registrar"] }
    Proxy-->>AuthContext: User context loaded
    AuthContext->>LoginUI: Redirect to /dashboard (or /agent)
```

### Detailed Lifecycle Steps

### A. The Login Page (`src/app/login/page.tsx`)
- **Brute-Force Protection:** The client maintains a failed-attempt counter in `sessionStorage`. If a user enters invalid credentials 5 times in succession, the interface initiates an automatic **60-second lockout timer**, disabling the submit button and inputs to mitigate automated dictionary attacks.
- **Form Submission:** Calls `login(email.trim(), password)` from `useAuth()`.
- **Theme Persistence:** Checks `localStorage.getItem("theme")` on mount to apply light/dark modes before rendering.

### B. Session Cookies (`sid`)
- When authentication succeeds, the backend sets an `HttpOnly` cookie named `sid`.
- The Next.js proxy route handler (`route.ts`) inspects the response headers and applies [`forwardSetCookieHeaders()`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/app/api/method/%5B...slug%5D/route.ts#L146-L181). It strips conflicting upstream `Domain` directives and guarantees `SameSite=Lax` and dynamic `Secure` flags when running over HTTPS.

### C. Session Bootstrap & State Restoration (`AuthProvider.tsx`)
- When any page is refreshed or visited directly, [`AuthProvider.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/providers/AuthProvider.tsx) immediately executes `loadUserContext()`.
- It calls `fetchCurrentUserContext()`, hitting `agency_tracking.auth_api.get_current_user`.
- If the browser holds a valid `sid` cookie, the backend returns the authenticated user object:
  ```json
  {
    "email": "officer@agency.com",
    "full_name": "Abebe Kebede",
    "roles": ["Registrar", "Clearance Officer"],
    "is_internal_staff": true,
    "contractor": null
  }
  ```
- If the session has expired or is invalid, `get_current_user` returns `null` or `{ "email": "Guest" }`. The provider clears local state and smoothly redirects the user to `/login`.

### D. Logout & Session Termination
- Clicking Logout opens a confirmation modal in [`AppSidebar.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/layout/AppSidebar.tsx).
- When confirmed, `logout()` calls `POST /api/method/logout`.
- The proxy forwards the request upstream, clearing the session on the Frappe server.
- The proxy appends an expired `Set-Cookie` header (`Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`), instructing the browser to delete the `sid` cookie.
- TanStack Query cache is purged via `queryClient.clear()`, preventing residual candidate data from persisting in memory.

---

## 2. The 16 Canonical Roles & Permissions Taxonomy

The system enforces 16 canonical roles defined in [`src/lib/auth/v2Roles.ts`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/lib/auth/v2Roles.ts#L7-L23) matching the backend specification:

| Role Name | Authority Scope | Key Accessible Pages |
| :--- | :--- | :--- |
| **Admin** | Unrestricted system-wide authority; manages staff, overrides stage gates, views financial summaries. | All routes (`/dashboard`, `/employees`, `/contractors`, `/expenses-income`, etc.) |
| **Registrar** | Candidate intake, biometric bio-data capture, passport OCR, country ban management. | `/applicants`, `/applicants/new`, `/dashboard` |
| **Manager** | Operational supervision, candidate assignments, reports, and stage gate overrides. | `/dashboard`, `/applicants`, `/reports` |
| **Clearance Officer** | Multi-corridor clearance management across all step types. | `/applicants?tab=lmis`, `injaz`, `embassy` |
| **Saudi LMIS** | Specialized Ministry of Labor & COC clearance for the Saudi Arabia corridor. | `/applicants?tab=lmis` |
| **Saudi Taeshir** | Specialized Saudi MOFA visa registration, Injaz fees, and biometric coordination. | `/applicants?tab=injaz` |
| **Saudi Embassy** | Specialized Wakala agency authorization and Saudi Embassy visa stamping. | `/applicants?tab=embassy` |
| **Kuwait LMIS** | Specialized Ministry of Labor clearance and Police Ashara clearance for Kuwait. | `/applicants?tab=lmis` |
| **Kuwait Telesign** | Specialized security clearance and electronic visa verification for Kuwait. | `/applicants?tab=embassy` |
| **Kuwait Embassy** | Kuwait Embassy visa stamping and biometric validation. | `/applicants?tab=embassy` |
| **Ticketer** | Airline itinerary booking, flight number recording, and airport dispatch confirmation. | `/applicants?tab=departure` |
| **Finance Manager** | Transaction logging, audit approval, FX rate configuration, contractor commissions. | `/expenses-income`, `/commission`, `/reports` |
| **Complaint Manager**| Post-deployment candidate welfare tracking and employer dispute resolution. | `/complaints` |
| **Communication Manager**| Internal messaging and cross-portal chat with Foreign Agency partners. | `/chat` |
| **Contract Parser** | Contract and visa document upload and OCR extraction. | `/applicants` |
| **Foreign Agency** | **External Partner Portal Only.** Candidate browsing, reservations, chat with local agency. | `/agent/*` (`/agent/discovery`, `/agent/reserved`, `/agent/chat`) |

---

## 3. Route Guarding & Navigation Visibility

Access control in the application occurs at two independent levels:

### Level 1: Navigation Item Filtering (`AppSidebar.tsx`)
The sidebar maps every navigation destination to a `PermissionAction`:
```typescript
const navItems: NavItemConfig[] = [
  { label: "Dashboard", href: "/dashboard", action: "viewDashboard" },
  { label: "Applicants", href: "/applicants", action: "viewApplicants" },
  { label: "Employees", href: "/employees", action: "manageUsers" },
  { label: "Foreign Agencies", href: "/contractors", action: "manageContractors" },
  { label: "Finance", href: "/expenses-income", action: "viewFinance" },
];
```
Before rendering, the sidebar calls `can(item.action)`. If the logged-in user lacks the required role, the navigation link is completely omitted from the DOM.

### Level 2: Route-Level RBAC Guard (`AuthProvider.tsx`)
Hiding a link in the sidebar does not prevent a user from typing the URL directly into their browser address bar. To stop unauthorized URL access, [`AuthProvider.tsx`](file:///c:/Users/azwis/OneDrive/Desktop/Doc/Pro/Internship/Travel%20Agency%20Workflow/Travel%20Agency%20Frontend/travel_agency_workflow/src/components/providers/AuthProvider.tsx#L191-L217) executes a route-guard effect whenever the pathname changes:

```typescript
// Look up the required capability for this route
const requiredAction = ROUTE_PERMISSION_MAP[pathname];

// If required and user does not have it -> reject!
if (requiredAction && !can(authUser, requiredAction)) {
  toast.error("Access Denied", {
    description: "You do not have permission to access this section.",
  });
  router.replace("/dashboard");
}
```

---

## 4. Foreign Agency Portal Isolation

Foreign recruitment agencies operating in Riyadh, Jeddah, or Kuwait City use a strictly isolated portal interface.

1. **Detection:** When `isV2ForeignAgency(user)` is true (the user holds `Foreign Agency` and is not internal staff):
   - The user is automatically redirected to `/agent` upon login.
   - All internal sidebar links are suppressed.
   - Internal pages (`/dashboard`, `/applicants`, `/employees`, `/reports`) block them immediately.
2. **Context Binding:** Foreign Agency users are linked to a specific `Contractor` record in data (`authUser.contractor`). The backend automatically filters candidate lists to show only candidates permitted for their country corridor and masks sensitive personal candidate identifiers until a formal selection is completed.

---

## 5. UI Visibility vs. Authoritative Backend Security

> [!IMPORTANT]
> **Cardinal Rule of Web Security:** Hiding a button or redirecting a route in React is **NOT** a security guarantee. It is a user-experience convenience.

The real security boundary is enforced on the Frappe server:
1. Every whitelisted Python method (`@frappe.whitelist()`) checks `frappe.get_roles(frappe.session.user)`.
2. If a user attempts to forge a POST request to `agency_tracking.finance_api.approve_transaction` using curl or browser dev tools, the backend independently verifies that the caller holds `Finance Manager` or `Admin`.
3. If unauthorized, the backend throws `frappe.PermissionError`, returning an HTTP 403 Forbidden status that our `ApiV2Error` handler cleanly reports back to the UI.
