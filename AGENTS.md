<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TRAVEL AGENCY WORKFLOW (FRONTEND) — AGENT OPERATING INSTRUCTIONS

## 1. Core Operating Context
- **Active Git Branch**: `production_version_non_mock`
- **Active Production Backend**: `https://travelagency-production-b48d.up.railway.app`
- **Authoritative Pipeline**: `Applicant` ➔ `Placement` ➔ `Corridor` ➔ `Clearance Step` ➔ `Ticket` ➔ `Departure`
- **Authoritative API Namespace**: Whitelisted RPCs under `/api/method/agency_tracking.*` (plus `/api/method/upload_file`, `/api/method/login`, `/api/method/logout`)

## 2. Strict Project Rules (Mandatory)
1. **Source of Truth Hierarchy**:
   - Specifications: `src/Assets/openapi 3.1.0.txt`, `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md`, and `src/Assets/01-applicant-contract.md` through `03-clearance-and-corridor-contract.md`.
   - Deployed Truth: Real responses from `https://travelagency-production-b48d.up.railway.app`.
   - Active Tasks: `V2_FRONTEND_TODO.md` and `MASTER_SYSTEM_STATUS.md` (audit baseline: `FINAL_V2_CONFORMANCE_MATRIX.md`).
2. **Zero V1 Business APIs & DocTypes**:
   - Never call `applicant_processing.*` or raw `/api/resource/*` for business data.
   - Never query or create deleted DocTypes (`Applicant Dossier`, `DSR`, `LMS Clearance`, `Injaz Clearance`, `Wakala Clearance`, `Embassy Clearance`).
3. **Zero Mock / Demo Fallbacks**:
   - Production mode is enforced (`NEXT_PUBLIC_DEMO_MODE=false`).
   - Never return fake demo fixtures or catch backend errors to substitute mock data. Propagate honest `ApiV2Error` exceptions to the UI.
   - Never persist business domain records in browser `localStorage`.
4. **Backend-Owned State Transitions**:
   - Frontend must never mutate `status` directly. Transitions are executed exclusively through sanctioned backend RPCs (`register_applicant`, `advance_placement`, `start_clearance_step`, `complete_clearance_step`, etc.) validated by `state_machine.py`.
5. **Backend-Driven Dynamic Corridors**:
   - Corridors are configuration data fetched dynamically from `agency_tracking.corridor_engine.get_corridor_steps(destination_country)`. Never hardcode corridor step counts or step names.
6. **Authoritative Backend RBAC**:
   - Role permissions are enforced across 16 canonical roles (`roles.py`, `src/Assets/ROLE-PERMISSIONS-MATRIX.md`).
   - User identifier convention: All parameters expecting a user identifier require the User `name`, which is the user's email address (`email` = `name`).
7. **Frontend Employee & Staff Management**:
   - Staff user accounts, security roles, activation status, and password resets are managed directly within the frontend portal via native `/api/method/frappe.client.*` RPCs (`src/lib/api/v2/employees.ts`).
   - Clients must never be directed to Frappe Desk or external administrative consoles.
8. **Engineering & Verification Discipline**:
   - Preserve reusable UI layouts and design systems (`OperationalTable`, `OperationalDrawer`, styling) while replacing obsolete V1 logic.
   - Maintain and update `MASTER_SYSTEM_STATUS.md` and `V2_FRONTEND_TODO.md` after completing meaningful work.
   - Never claim completion without verification (clean TypeScript check via `npx tsc --noEmit` and live runtime evidence).
