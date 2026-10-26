# 03 — Frontend Engineering Fundamentals Grounded in this Codebase

This guide teaches the essential **JavaScript, TypeScript, React, Next.js, and CSS layout** concepts you need to read, debug, and confidently modify this repository.

Instead of generic programming tutorials, every concept is introduced in plain English, demonstrated with a minimal code example, and then **directly connected to real source code from this application**.

---

## 1. JavaScript Concepts You Encounter in this Project

### A. Object Destructuring & Spread Syntax (`...`)

#### Plain-English Explanation
- **Destructuring** is a convenient shortcut to unpack properties from an object (or items from an array) into distinct variables in a single line.
- **Spread Syntax (`...`)** allows you to copy all properties of an existing object into a new object, or append items to an array without mutating the original.

#### Real Code Example: `src/lib/api/v2/reports.ts`
```typescript
function parseDates(
  fromDate?: V2ReportPeriodInput,
  toDate?: string
): { from_date?: string; to_date?: string; period?: string } {
  if (typeof fromDate === "object" && fromDate !== null) {
    if (fromDate.period === "all") {
      return { period: "all" };
    }
    return {
      ...(fromDate.from_date ? { from_date: fromDate.from_date } : {}),
      ...(fromDate.to_date ? { to_date: fromDate.to_date } : {}),
      ...(fromDate.period ? { period: fromDate.period } : {}),
    };
  }
  // ...
}
```

#### Line-by-Line Walkthrough
1. `if (typeof fromDate === "object" && fromDate !== null)`: In JavaScript, `null` has a type of `"object"`, so we check both to ensure `fromDate` is a real object dictionary.
2. `...(fromDate.from_date ? { from_date: fromDate.from_date } : {})`:
   - If `fromDate.from_date` is a non-empty string, it creates a small object `{ from_date: "2026-01-01" }`.
   - The `...` spreads those keys into the parent return object.
   - If falsy, it spreads `{}` (empty object), meaning no key is added. This prevents sending `undefined` or empty strings to the backend!

#### Failure Mode
If you write `{ from_date: fromDate.from_date }` directly without the ternary spread, you will send `{ from_date: undefined }`, which converts to JSON as `{"from_date": null}` and causes a backend validation crash!

---

### B. Promises & Asynchronous Execution (`async` / `await`)

#### Plain-English Explanation
JavaScript runs on a single thread. When fetching data across the network, the browser cannot freeze and wait. A **Promise** is a receipt for an operation that will complete in the future. `async` functions return promises, and `await` pauses execution of that specific function until the promise settles, without freezing the browser interface.

#### Real Code Example: `src/lib/api/v2/client.ts`
```typescript
let response: Response;
try {
  response = await fetch(endpoint, {
    method,
    headers,
    credentials: "include",
    body: bodyData,
  });
} catch (err: any) {
  const isAbort = err?.name === "AbortError";
  throw new ApiV2Error(
    isAbort ? "Server took too long to respond." : "Unable to reach server.",
    isAbort ? 504 : 0
  );
}
```

#### Line-by-Line Walkthrough
1. `await fetch(...)`: Pauses this function until the network request returns headers and status.
2. `credentials: "include"`: Crucial parameter! Instructs the browser to attach the `sid` session cookie with the outgoing HTTP request.
3. `catch (err: any)`: Catches network-level drops, DNS failures, or client timeouts.
4. `throw new ApiV2Error(...)`: Replaces the opaque browser `TypeError: Failed to fetch` with an honest, formatted error object that our UI components can understand.

---

### C. Array Methods: `map`, `filter`, and `some`

#### Plain-English Explanation
Modern JavaScript uses functional array methods rather than `for` loops:
- `.map()` transforms every element of an array into something new (e.g. converting a list of candidate records into HTML table rows).
- `.filter()` creates a new array containing only elements that pass a true/false condition.
- `.some()` checks if at least one item satisfies a condition, returning a boolean.

#### Real Code Example: `src/lib/auth/permissions.ts`
```typescript
export function hasRole(user: AuthUser | null | undefined, targetRole: string): boolean {
  if (!user || !Array.isArray(user.roles)) return false;
  const normalizedTarget = targetRole.trim().toLowerCase();
  
  return user.roles.some((r) => {
    const norm = extractRoleName(r);
    return (
      norm === "system manager" ||
      norm === "administrator" ||
      norm === "admin" ||
      norm === normalizedTarget
    );
  });
}
```

#### Line-by-Line Walkthrough
1. `user.roles.some(...)`: Loops through the user's role strings. The moment it encounters `"admin"` or a match for `normalizedTarget`, it immediately stops looping and returns `true`.
2. This ensures that any user with an admin role passes every operational check without writing repetitive if-else blocks.

---

## 2. TypeScript Concepts You Need in this Codebase

### A. Interfaces vs. Type Aliases & Union Types

#### Plain-English Explanation
- **Interfaces** define the shape of objects (e.g. what fields an `Applicant` has).
- **Union Types (`|`)** declare that a value can be one of several specific options. This replaces ambiguous strings with strict, compiler-enforced choices.

#### Real Code Example: `src/lib/auth/permissions.ts` & `src/types/applicant.ts`
```typescript
// Union Type: A PermissionAction CANNOT be any arbitrary string!
export type PermissionAction =
  | "manageUsers"
  | "viewDashboard"
  | "viewApplicants"
  | "registerApplicant"
  | "generateCv"
  | "manageClearances"
  | "viewFinance";

// Interface: Defines the shape of the authenticated user
export interface AuthUser {
  email: string;
  full_name: string;
  roles: string[];
  read_only_roles?: string[]; // The '?' means this property is optional
  is_internal_staff?: boolean;
}
```

#### Why it Matters Here
If you mistype `can("registerApplicants")` (with an extra 's'), TypeScript will immediately underline your code in red with a compilation error before you even open your browser:
```text
Argument of type '"registerApplicants"' is not assignable to parameter of type 'PermissionAction'.
```

---

### B. Generics (`<T>`)

#### Plain-English Explanation
A **Generic** is a placeholder type. Instead of writing separate fetch functions for applicants, placements, and finance transactions, we write one function that accepts a type variable `<T>` and promises to return data matching that type.

#### Real Code Example: `src/lib/api/v2/client.ts`
```typescript
export async function requestV2<T = any>(
  endpoint: string,
  options: RequestV2Options = {}
): Promise<T> {
  // ... network logic ...
  return jsonResponse.message as T;
}
```

#### How it is used in a caller (`src/lib/api/v2/applicants.ts`):
```typescript
export async function getApplicantV2(name: string): Promise<Applicant> {
  return requestV2<Applicant>(`/api/method/agency_tracking.applicant_api.get_applicant`, {
    method: "POST",
    body: { name },
  });
}
```
Because the caller specified `<Applicant>`, `getApplicantV2` automatically knows that the returned object contains `full_name`, `passport_number`, and `status`.

---

## 3. React 19 Core Patterns Used in this Application

### A. Component State with `useState` & Controlled Inputs

#### Plain-English Explanation
In React, when a variable changes, the component re-renders to update the screen. `useState` gives a component a memory. A **controlled input** is a form field whose visible value is bound directly to React state.

#### Real Code Example: `src/app/login/page.tsx`
```typescript
export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <input
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />
  );
}
```

#### Execution Flow
1. User types the letter `"a"` into the password field.
2. The browser fires the `onChange` event.
3. `e.target.value` contains `"a"`.
4. `setPassword("a")` is called.
5. React updates `password` state and re-renders the input with `value="a"`.
6. Clicking the eye icon toggles `setShowPassword((prev) => !prev)`, changing the HTML `type` attribute from `"password"` to `"text"` without reloading the page.

---

### B. Effects & Lifecycle with `useEffect`

#### Plain-English Explanation
`useEffect` lets a component run side-effects (such as loading data from the network, reading `localStorage`, or setting up timers) after the component renders on the screen. The **dependency array `[]`** tells React when to re-run the effect.

#### Real Code Example: `src/components/providers/AuthProvider.tsx`
```typescript
// Runs once when the application boots up
React.useEffect(() => {
  loadUserContext();
}, [loadUserContext]);

// RBAC Route Guard: Runs whenever authUser or the URL pathname changes
React.useEffect(() => {
  if (isLoading || !authUser || !pathname) return;
  if (pathname === "/login" || pathname.startsWith("/agent")) return;

  const requiredAction = ROUTE_PERMISSION_MAP[pathname];
  if (requiredAction && !can(authUser, requiredAction)) {
    toast.error("Access Denied", {
      description: "You do not have permission to access this section.",
    });
    router.replace("/dashboard");
  }
}, [isLoading, authUser, pathname, router]);
```

#### Why it Matters Here
If a logged-in user with only the `Registrar` role manually types `/expenses-income` in their browser bar, this `useEffect` immediately detects that `/expenses-income` requires `"viewFinance"`. It alerts the user with an "Access Denied" toast and safely kicks them back to `/dashboard`.

---

### C. Context API for Global Session State (`AuthProvider`)

#### Plain-English Explanation
Passing props down through 10 layers of components (called "prop drilling") is messy and error-prone. The **Context API** creates a global data bubble. Any child component inside that bubble can read session data directly using a custom hook (`useAuth()`).

#### Visual Diagram:
```text
<AuthProvider>                      <-- Holds user, roles, login(), logout()
  └── <AppLayoutClient>
        ├── <AppSidebar>            <-- Reads useAuth() to hide/show menu items
        └── <AppNavbar>             <-- Reads useAuth() to display user's name
              └── <RoleWorkspaceContainer>
                    └── <LMISWorkspace> <-- Reads useAuth() to check if role can edit
```

#### How you use it in any file:
```typescript
import { useAuth } from "@/components/providers/AuthProvider";

export function MyComponent() {
  const { user, can, isReadOnly } = useAuth();
  
  if (isReadOnly("Saudi LMIS")) {
    return <span>View Only Mode</span>;
  }
  // ...
}
```

---

## 4. Next.js 16 App Router Mechanics

### A. Client Components (`"use client"`) vs. Server Components

#### Plain-English Explanation
- In the Next.js App Router, files are **Server Components** by default. They run on the Node.js server, cannot use React state (`useState`), cannot run `useEffect`, and cannot attach browser event listeners (`onClick`).
- Adding `"use client";` at the very top of a file marks it as a **Client Component**, allowing it to use state, effects, browser APIs, and handle user clicks.

#### Where it is used in this project:
- Almost all operational pages (`dashboard/page.tsx`, `applicants/page.tsx`, `reports/page.tsx`) have `"use client";` at line 1 because they are rich, interactive single-page application interfaces managing tables, tabs, filters, and modals.
- The API route proxies (`src/app/api/method/[...slug]/route.ts`) are **Server-Side Route Handlers** that run strictly on the server to protect cookies and credentials.

---

### B. Catch-All Route Handlers (`[...slug]`)

#### Plain-English Explanation
When you see a folder named `[...slug]`, Next.js treats it as a wildcard catch-all route. Any request matching `/api/method/anything/nested/here` is routed into that single `route.ts` file!

#### Real Code Example: `src/app/api/method/[...slug]/route.ts`
```typescript
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  // If the browser called: POST /api/method/agency_tracking.applicant_api.register_applicant
  // slug is: ["agency_tracking.applicant_api.register_applicant"]
  // methodPath is: "agency_tracking.applicant_api.register_applicant"
  
  // Proxies directly to: ${UPSTREAM_URL}/api/method/${methodPath}
}
```

---

## 5. CSS & Responsive Layout Architecture (Tailwind CSS 4)

### A. Flexbox Vertical Layout & Content Scrolling

#### The Problem That Caused Viewport Clipping
Earlier versions of this project attempted a "no-scroll" desktop layout by adding `overflow: hidden` and `h-screen` to the parent container. This completely broke data-heavy pages like Reports and Tables: any content taller than the monitor was permanently cut off and inaccessible!

#### The Permanent Architectural Solution in `AppLayoutClient.tsx`:
```tsx
<div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#090d16]">
  {/* Sidebar is fixed on the left */}
  <AppSidebar />

  {/* Main content column */}
  <div className="flex flex-1 flex-col min-w-0 min-h-0">
    <AppNavbar />

    {/* The Scrollable Main Container */}
    <main className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto p-3 lg:p-4">
      {children}
    </main>
  </div>
</div>
```

#### Why These Specific Classes Matter:
1. `flex-1`: Tells the container to expand and occupy all remaining vertical space between the navbar and the bottom of the screen.
2. `min-h-0`: **Crucial Flexbox rule!** By default, flex items have `min-height: auto`, which prevents them from shrinking below their content size. `min-h-0` allows the container to shrink to the screen size and trigger scrolling!
3. `overflow-y-auto`: Adds a vertical scrollbar **only when content exceeds the available screen space**. If content fits on the screen, no scrollbar appears!
