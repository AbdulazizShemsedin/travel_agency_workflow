# AGENT INSTRUCTION & PROJECT-RULE AUDIT REPORT
**Repository**: `Travel Agency Workflow — Frontend`  
**Current Branch**: `production_version_non_mock`  
**Production Target Backend**: `https://agencytracking-production.up.railway.app`  
**Authoritative Specification**: `src/Assets/openapi 3.1.0.txt` + `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md` + Live Railway Runtime  
**Audit Date**: September 2, 2026  
**Execution Mode**: READ-ONLY AUDIT — ZERO SOURCE CODE MODIFICATIONS PERFORMED  

---

## TABLE OF CONTENTS
1. [Executive Summary & High-Risk Hazards](#1-executive-summary--high-risk-hazards)
2. [Instruction Inventory](#2-instruction-inventory)
3. [Active Instruction Chain & Precedence Analysis](#3-active-instruction-chain--precedence-analysis)
4. [Agent-Specific Instructions Analysis](#4-agent-specific-instructions-analysis)
5. [Documentation Classification (A through E)](#5-documentation-classification)
6. [Identification of Obsolete V1 Concepts & Hazardous Guidance](#6-identification-of-obsolete-v1-concepts--hazardous-guidance)
7. [Conflicts with Current V2 Architecture & Project Rules](#7-conflicts-with-current-v2-architecture--project-rules)
8. [Categorized Remediation Lists](#8-categorized-remediation-lists)
   - 8.1 [Automatically Discoverable Instruction Files](#81-automatically-discoverable-instruction-files)
   - 8.2 [Agent-Specific Instruction Files](#82-agent-specific-instruction-files)
   - 8.3 [Historical Instruction Files](#83-historical-instruction-files)
   - 8.4 [V1 / Conflicting Instructions](#84-v1--conflicting-instructions)
   - 8.5 [Current Valid Instructions](#85-current-valid-instructions)
   - 8.6 [Files Recommended for Archival](#86-files-recommended-for-archival)
   - 8.7 [Files Recommended for Removal](#87-files-recommended-for-removal)
   - 8.8 [Files Recommended for Update](#88-files-recommended-for-update)
9. [Recommended Final Instruction Hierarchy](#9-recommended-final-instruction-hierarchy)
10. [Proposed Canonical Root AGENTS.md (Proposal Only — Not Created)](#10-proposed-canonical-root-agentsmd-proposal-only--not-created)

---

## 1. EXECUTIVE SUMMARY & HIGH-RISK HAZARDS

This repository contains multiple generations of developer documentation, architecture migration blueprints, client presentation reports, legacy test suites, and configuration files created across different project phases and git branches (`feat/backend-frappe-integration`, `backend-v2-integration`, and now `production_version_non_mock`).

Because modern coding agents (such as Claude Code, Gemini/Antigravity, Cursor, and GitHub Copilot) automatically ingest root markdown files, environment configs, and repository guides, **several critical contradictions exist that could mislead an AI agent into corrupting the V2 integration**:

### The Top 5 Critical Hazards Discovered

1. **Stale Root `AGENTS.md` and `CLAUDE.md` Contain Zero Project Guidance**:
   - `AGENTS.md` in the repository root currently contains *only* the auto-generated Next.js 16 compiler warning block (`<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->`).
   - `CLAUDE.md` contains only `@AGENTS.md`.
   - **Hazard**: Any coding agent opening the project has **no root-level rules** directing it to the V2 Railway backend (`https://agencytracking-production.up.railway.app`), the `production_version_non_mock` branch, or forbidding mock fallbacks.

2. **Poisoned Stale URLs in `.env.example` and Root Test Scripts**:
   - `.env.example` directs developers and agents to the obsolete V1 Railway backend:  
     `FRAPPE_BASE_URL=https://applicantprocessing-production.up.railway.app`
   - 8 root test scripts (`test_all_stages.mjs`, `test_phase1_verification.mjs`, `test_live_full_flow.mjs`, etc.) and 45+ scripts in `scratch/` hardcode the old `applicantprocessing-production.up.railway.app` URL and obsolete Frappe auth tokens.
   - **Hazard**: An agent attempting to run or inspect tests will target a dead or incompatible V1 backend.

3. **Conflicting "Demo Mode" Reports Framing Mock Fallbacks as Approved Architecture**:
   - `CLIENT_DEMO_READINESS_REPORT.md` and `CLIENT_DEMO_ACCEPTANCE_REPORT.md` (dated August 31, 2026) celebrate `NEXT_PUBLIC_DEMO_MODE=true` and document an adapter architecture where API client failures silently fall back to `src/lib/demo/store.ts`.
   - In stark contrast, the current project policy on `production_version_non_mock` demands **Strict Real Backend Only (zero demo mode, zero mock business data, zero silent fallbacks)**.
   - **Hazard**: An agent reviewing "readiness reports" would believe mock fallback adapters are a valid architectural feature rather than forbidden technical debt.

4. **Premature "100% Complete" Migration Report**:
   - `V2_FRONTEND_IMPLEMENTATION_REPORT.md` asserts that the V2 migration is *"100% Complete & Verified"*.
   - However, the authoritative `FINAL_V2_CONFORMANCE_MATRIX.md` and `MASTER_SYSTEM_STATUS.md` (dated September 1, 2026) establish that out of 69 capabilities, only 3 are complete, 23 are implemented awaiting live verification, and 31 require UI implementation (including Chat workspace, Placement Document Center, and Commission Batches).
   - **Hazard**: An agent reading `V2_FRONTEND_IMPLEMENTATION_REPORT.md` would assume required features already exist and skip implementing them.

5. **Entrenched Legacy Artifacts and Proxy Mutators**:
   - `src/lib/api/applicantApi.ts` (115 KB, 3,138 lines) defines dozens of dead `applicant_processing.*` RPCs and raw `/api/resource/*` queries. 18 active frontend components still import it.
   - `src/app/api/resource/[...slug]/route.ts` contains custom mutation hacks for legacy DocTypes (`Applicant`, `LMS Clearance`, `DSR`, `financials`).
   - **Hazard**: An agent modifying clearance steps or applicant editing might be tempted to call or repair `applicantApi.ts` or raw `/api/resource/` rather than migrating cleanly to `@/lib/api/v2/*`.

---

## 2. INSTRUCTION INVENTORY

Below is the complete, exhaustive inventory of all 32 instruction-bearing, rule-defining, architectural, and workflow-guiding files in the repository.

| # | File Path | File Type | Scope | Likely Audience | Auto-Discovered by Agents? | Summary of Instructions / Content | V1 / V2 Relevance | Current Validity | Conflicts with Current V2 Architecture & Project Rules | Conflicts with Latest Swagger / Backend Contract | Recommended Action |
|:---:|:---|:---|:---|:---|:---:|:---|:---:|:---:|:---|:---|:---:|
| 1 | `AGENTS.md` | Markdown | Root repository | AI Coding Agents (Codex, Antigravity, Copilot, Cursor) | **YES** (Standard agent discovery) | Contains auto-generated Next.js 16 breaking change notice (`node_modules/next/dist/docs/`). Re-added by `next dev`. | Neutral / Framework | **VALID (Technical only)** | Contains **NO project rules**, backend URL, branch info, or V2 constraints. Agents receive zero project context. | None | **UPDATE** (Retain Next.js block and prepend authoritative project rules) |
| 2 | `CLAUDE.md` | Markdown | Root repository | Claude Code / Anthropic Agents | **YES** (Claude standard discovery) | Contains single directive: `@AGENTS.md`. Delegates all instructions to `AGENTS.md`. | Neutral / Agent config | **VALID** | Inherits whatever is in `AGENTS.md`. | None | **KEEP** |
| 3 | `README.md` | Markdown | Root repository | Developers / Agents | **YES** (Universal discovery) | Standard `create-next-app` boilerplate instructions (`npm run dev`, Next.js links). | Neutral / Boilerplate | **STALE BOILERPLATE** | Does not mention Travel Agency Workflow, Railway backend, Frappe, or V2 architecture. | None | **UPDATE** (Document system architecture and runbook) |
| 4 | `.env.example` | Config / Env | Root repository | Developers / Agents | **YES** (Environment onboarding) | Environment variables template. Directs connections to `https://applicantprocessing-production.up.railway.app` with API key/secret. | **V1 Only** | **STALE & HARMFUL** | Points to **DEAD V1 Railway URL** (`applicantprocessing-production`). Directs using API key/secret instead of V2 session cookies. | Violates V2 backend URL rule | **UPDATE** (Set to `agencytracking-production` and document session auth) |
| 5 | `.env.local` | Config / Env | Root repository | Local Runtime / Agents | **YES** (Environment variables) | Sets `FRAPPE_BASE_URL=https://agencytracking-production.up.railway.app` and `NEXT_PUBLIC_DEMO_MODE=false`. | **V2 Only** | **CURRENT VALID** | None. Correctly configured for non-mock production integration. | Conforms with live backend | **KEEP** |
| 6 | `MASTER_SYSTEM_STATUS.md` | Markdown | Root repository | Project Managers, Developers, Agents | **YES** (Markdown in root) | Master capability conformance tracker (69 capabilities). Categorizes status (`COMPLETE`, `IMPLEMENTED`, `PARTIAL`, `BACKEND BLOCKED`). | **V2 Only** | **CURRENT VALID (Authoritative)** | None. Aligned with `production_version_non_mock` and live Railway backend. Updated 2026-09-01. | 100% aligned with Swagger and runtime | **KEEP** (Must be maintained after every milestone) |
| 7 | `V2_FRONTEND_TODO.md` | Markdown | Root repository | Developers, AI Agents | **YES** (Markdown in root) | Prioritized implementation plan (P0, P1, P2, P3) with exact endpoint mappings, dependency graphs, and status flags. | **V2 Only** | **CURRENT VALID (Authoritative)** | None. Explicitly mandates Real Backend Only, zero demo mode, zero mock data, zero V1 fallbacks. | 100% aligned with Swagger and runtime | **KEEP** (Authoritative execution guide) |
| 8 | `FINAL_V2_CONFORMANCE_MATRIX.md` | Markdown | Root repository | Developers, AI Agents | **YES** (Markdown in root) | 105 KB comprehensive audit of all 86 endpoints in `openapi 3.1.0.txt`, live runtime responses, and frontend caller mapping. | **V2 Only** | **CURRENT VALID (Authoritative Baseline)** | None. Documents exact parameter signatures, response schemas, and gaps. | Baseline match across all 86 operations | **KEEP** |
| 9 | `BACKEND_V2_MIGRATION_AUDIT.md` | Markdown | Root repository | Architects, Developers | **YES** (Markdown in root) | Read-only audit from Aug 30, 2026 comparing old V1 architecture (`applicant_processing`) against `agency_tracking`. | V1 ➔ V2 Transition | **HISTORICAL REFERENCE** | Reports `list_applicants` as a "CRITICAL BLOCKER (Backend Gap)", which was subsequently resolved in the backend on Aug 31. | Outdated regarding `list_applicants` availability | **ARCHIVE** (Move to `docs/archive/` or tag as historical) |
| 10 | `CLIENT_DEMO_ACCEPTANCE_REPORT.md` | Markdown | Root repository | Stakeholders, Presenters | **YES** (Markdown in root) | Demo acceptance evaluation (Aug 31, 2026) declaring system "PASS (SAFE FOR CLIENT DEMO)" using `NEXT_PUBLIC_DEMO_MODE=true`. | Demo Mode / V2 hybrid | **STALE & CONFLICTING** | Promotes `NEXT_PUBLIC_DEMO_MODE=true` and validates simulated local storage flows, directly conflicting with `production_version_non_mock`. | Treats simulated data as acceptable | **ARCHIVE** (Move to `docs/archive/`) |
| 11 | `CLIENT_DEMO_READINESS_REPORT.md` | Markdown | Root repository | Stakeholders, Presenters | **YES** (Markdown in root) | Demo readiness report (Aug 31, 2026) detailing the "Centralized Demo Switch & Adapter Architecture" in `src/lib/demo/store.ts`. | Demo Mode / V2 hybrid | **STALE & CONFLICTING** | Details and encourages the demo adapter fallback pattern that is now strictly forbidden on the production branch. | Misrepresents mock data as canonical | **ARCHIVE** (Move to `docs/archive/`) |
| 12 | `V2_CONFORMANCE_AUDIT.md` | Markdown | Root repository | Developers, Agents | **YES** (Markdown in root) | Early conformance audit (Aug 31, 2026, 11:20Z) targeting branch `backend-v2-integration`. | V2 Initial | **SUPERSEDED** | Targets branch `backend-v2-integration` rather than `production_version_non_mock`. Includes classification G (Demo-Only Adapter). | Superseded by `FINAL_V2_CONFORMANCE_MATRIX.md` | **ARCHIVE** (Move to `docs/archive/`) |
| 13 | `V2_CONFORMANCE_REPAIR_REPORT.md` | Markdown | Root repository | Developers, Agents | **YES** (Markdown in root) | Repair log (Aug 31, 2026, 11:25Z) detailing fixes on `backend-v2-integration`. | V2 Initial | **SUPERSEDED** | Mentions keeping user creation in `demoStore.createUser` for Demo Mode. Superseded by full audit. | Superseded by `FINAL_V2_CONFORMANCE_MATRIX.md` | **ARCHIVE** (Move to `docs/archive/`) |
| 14 | `V2_CONTRACT_RECONCILIATION.md` | Markdown | Root repository | Developers, Agents | **YES** (Markdown in root) | Field-by-field reconciliation of live Railway backend responses (`APP-00001`, `PLM-00001`, `CLR-00001`) vs Swagger vs Frontend types. | **V2 Only** | **CURRENT VALID (Valuable Reference)** | None. Verified dynamic corridor sequences (Taeshir instead of Injaz; Wakala merged into Embassy). | Reconciled live against Railway | **KEEP** |
| 15 | `V2_FRONTEND_IMPLEMENTATION_REPORT.md` | Markdown | Root repository | Developers, Agents | **YES** (Markdown in root) | Premature migration report (Aug 31, 2026) claiming frontend is "100% Complete & Verified". | V2 Initial | **MISLEADING / INACCURATE** | Falsely claims 100% completion when 31 capabilities in `MASTER_SYSTEM_STATUS.md` are incomplete and proxy binary bug was present. | Misstates implementation reality | **ARCHIVE** (Move to `docs/archive/`) |
| 16 | `V2_FRONTEND_MIGRATION_BLUEPRINT.md` | Markdown | Root repository | Developers, Agents | **YES** (Markdown in root) | Phase 2 architectural blueprint for migrating V1 to V2 on `backend-v2-integration`. | V2 Architecture | **VALUABLE REFERENCE** | Mostly sound principles (preserve UI, replace business logic), but references older branch name. | Generally aligned with Swagger | **KEEP** (Informational reference) |
| 17 | `V2_MIGRATION_IMPLEMENTATION_MAP.md` | Markdown | Root repository | Developers, Agents | **YES** (Markdown in root) | Module-by-module breakdown of reusable UI vs V1 APIs to retire. | V2 Architecture | **VALUABLE REFERENCE** | Sound UI preservation vs logic replacement mapping. References branch `backend-v2-integration`. | Aligned with Swagger | **KEEP** (Informational reference) |
| 18 | `src/Assets/01-applicant-contract.md` | Markdown | Contract directory | Backend & Frontend Devs | **YES** (Assets reference) | Complete field definitions, live captured responses, and state machine transitions for `Applicant` doctype. | **V2 Only** | **CURRENT VALID (Authoritative Contract)** | Explicitly warns of derived `passport_issue_date` and mock MRZ caveat when OCR settings are disabled. | 100% aligned with doctype schema | **KEEP** |
| 19 | `src/Assets/02-placement-contract.md` | Markdown | Contract directory | Backend & Frontend Devs | **YES** (Assets reference) | Complete field definitions, live captured responses, terminal state guards, and state machine transitions for `Placement` doctype. | **V2 Only** | **CURRENT VALID (Authoritative Contract)** | None. Explains mandatory medical gates, ticketing costs, and free replacement complaint linkage. | 100% aligned with doctype schema | **KEEP** |
| 20 | `src/Assets/03-clearance-and-corridor-contract.md` | Markdown | Contract directory | Backend & Frontend Devs | **YES** (Assets reference) | Corridor engine data, dynamic corridor rendering guidance, step status enums, and Clearance Step fields. | **V2 Only** | **CURRENT VALID (Authoritative Contract)** | Explicitly instructs: *"Do not hardcode '3 steps' or step names anywhere in the frontend"*. | 100% aligned with doctype schema | **KEEP** |
| 21 | `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md` | Markdown | Contract directory | Full Team, Agents | **YES** (Assets reference) | 61 KB master business and system documentation. Documents every status edge, gate override, role, and doctype schema. | **V2 Only** | **CURRENT VALID (Authoritative System Spec)** | Prohibits client-side state mutation (`doc.status = X`). Establishes `state_machine.transition()` authority and 16 custom roles. | Primary business logic authority | **KEEP** |
| 22 | `src/Assets/README.md` | Markdown | Contract directory | Developers, Agents | **YES** (Assets reference) | Explains how the V2 integration contracts were generated (commit `720b51d`, 2026-08-31) and defines the user identifier rule (`email` = `name`). | **V2 Only** | **CURRENT VALID (Authoritative Meta-Spec)** | None. Confirms all user identifier arguments expect email strings. | Aligned with backend conventions | **KEEP** |
| 23 | `src/Assets/ROLE-PERMISSIONS-MATRIX.md` | Markdown | Contract directory | Developers, Agents | **YES** (Assets reference) | Action-by-action RBAC matrix across all 16 canonical roles, sourced directly from backend permission checks. | **V2 Only** | **CURRENT VALID (Authoritative RBAC)** | Prohibits client-side role invention or bypassing backend permission gates. | 100% aligned with `roles.py` | **KEEP** |
| 24 | `src/Assets/The Actual Current MethodWorkflow for Creating Internal Users.txt` | Text (Empty) | Contract directory | Developers, Agents | **YES** (Assets reference) | **0-byte empty file.** | Unknown | **INVALID / EMPTY** | Contains no content. | None | **REMOVE** or **UPDATE** (Document Frappe Desk workflow) |
| 25 | `src/Assets/openapi 3.1.0.txt` / `new swagger.json` | OpenAPI / JSON | Contract directory | Developers, Agents, Codegen | **YES** (Assets reference) | Complete OpenAPI 3.1.0 machine-readable schema for all 86 whitelisted endpoints. | **V2 Only** | **CURRENT VALID (Authoritative API Contract)** | None. Authoritative source of endpoint paths and parameter structures. | Canonical contract | **KEEP** |
| 26 | `travel-agency-extension/ARCHITECTURE.md` | Markdown | Extension sub-package | Extension Devs, Agents | NO (Inside extension subfolder) | Architecture for Chrome/Safari extension companion. Documents `window.postMessage` bridge with web app. | Extension | **VALID (Scoped to Extension)** | Relies on `src/lib/extensionBridge.ts`. Does not affect core Next.js web application routing. | Scoped to browser companion | **KEEP** |
| 27 | `travel-agency-extension/README.md` | Markdown | Extension sub-package | Extension Devs, Agents | NO (Inside extension subfolder) | Installation and build guide for the browser extension. | Extension | **VALID (Scoped to Extension)** | Scoped to extension manifest V3 build. | Scoped to browser companion | **KEEP** |
| 28 | `package.json` | JSON Config | Root repository | Build Tools, Agents | **YES** (Universal) | Project scripts (`dev`, `build`, `start`, `lint`) and dependencies. | Modern Next.js 16 | **CURRENT VALID** | Scripts are standard. Dependencies contain no mock libraries. | Standard | **KEEP** |
| 29 | `src/lib/config/env.ts` | TypeScript | Core Config | Application Runtime | NO (Source code) | Defines runtime configuration. Enforces `isDemoMode(): false` and purges `DEMO_MODE_OVERRIDE` in `localStorage`. | **V2 Only** | **CURRENT VALID** | Code comments explicitly mandate Strict Production Policy. | Enforces real backend | **KEEP** |
| 30 | `src/app/api/resource/[...slug]/route.ts` | TypeScript Route | Next.js API Proxy | Application Runtime | NO (API Proxy) | Proxies raw `/api/resource/*` requests to Frappe backend with custom body mutation for `Applicant` skills, `LMS Clearance`, and `DSR`. | **V1 Legacy Hack** | **HAZARDOUS TECHNICAL DEBT** | Facilitates and encourages illegal raw REST mutations on obsolete DocTypes. Contains hardcoded V1 fields (`dsr`, `financials`). | Directly violates the "No raw /api/resource/*" rule | **UPDATE / DEPRECATE** (Plan retirement in TODO-P3-02) |
| 31 | `src/lib/api/applicantApi.ts` | TypeScript Lib | Legacy API Layer | 18 Frontend Components | NO (API Library) | 3,138 lines containing 25 `applicant_processing.*` calls, raw `/api/resource/*` queries, and legacy V1 data structures. | **V1 Only** | **HAZARDOUS TECHNICAL DEBT** | Source of V1 architectural drift. Bypasses V2 state machine and calls deleted RPCs. | Conflicts with V2 API surface | **REMOVE / MIGRATE** (Tracked in TODO-P3-02) |
| 32 | Root Test Scripts (`test_*.mjs`) | Node/MJS Scripts | Root repository | QA / Developers | **YES** (Root scripts) | 8 scripts testing live flows. 7 out of 8 hardcode `https://applicantprocessing-production.up.railway.app`, old API keys, and V1 `/api/resource/Applicant`. | **V1 Only** | **STALE & HARMFUL** | Agents running these scripts will hit the dead V1 backend and assert obsolete V1 DocType schemas (`applicant_state`, `DSR`). | Conflicts with V2 endpoints and URL | **ARCHIVE** (Move to `scratch/v1_tests/` or deprecate) |

---

## 3. ACTIVE INSTRUCTION CHAIN & PRECEDENCE ANALYSIS

When an AI coding agent opens this repository, it traverses files hierarchically from the root downward. The table below illustrates the **Active Instruction Chain**, what the agent inherits at each level, and where contradictions occur:

```
[Level 1: System / IDE Agent Instructions]
   │
   ▼
[Level 2: Repository Root Agent Files: AGENTS.md / CLAUDE.md]
   │
   ▼
[Level 3: Environment & Configuration: .env.local, .env.example, package.json]
   │
   ▼
[Level 4: Root Project Documentation & Trackers: MASTER_SYSTEM_STATUS.md, V2_FRONTEND_TODO.md, FINAL_V2_CONFORMANCE_MATRIX.md]
   │
   ▼
[Level 5: Historical & Demo Reports in Root: CLIENT_DEMO_*, BACKEND_V2_*, V2_FRONTEND_IMPLEMENTATION_REPORT.md]
   │
   ▼
[Level 6: Contract & Specification Directory: src/Assets/*]
   │
   ▼
[Level 7: Application Code & Legacy API Layer: src/lib/api/applicantApi.ts, src/app/api/resource/*]
```

### Detailed Chain & Conflict Mapping

1. **Level 1: IDE / Agent System Prompts**:
   - The agent is instructed to read local rules and follow strict engineering standards.
   - *Status*: Clean.

2. **Level 2: Repository Root Agent Files (`AGENTS.md`, `CLAUDE.md`)**:
   - `AGENTS.md` contains only Next.js 16 compiler notes.
   - `CLAUDE.md` delegates to `AGENTS.md`.
   - *Result*: The agent receives **no guidance** regarding the project's backend, branch direction, or prohibited behaviors.
   - *Precedence Impact*: **CRITICAL GAP**. Because root agent files are silent, the agent looks downward to ordinary markdown files and configs.

3. **Level 3: Environment Configuration (`.env.local` vs `.env.example`)**:
   - `.env.local` specifies `https://agencytracking-production.up.railway.app` and `NEXT_PUBLIC_DEMO_MODE=false`.
   - `.env.example` specifies `https://applicantprocessing-production.up.railway.app` and API key/secret.
   - *Conflict*: If an agent inspects `.env.example` to understand backend connectivity, it gets the **wrong URL** and obsolete auth mechanism.

4. **Level 4: Current Authoritative Status & Action Trackers (`MASTER_SYSTEM_STATUS.md`, `V2_FRONTEND_TODO.md`)**:
   - Mandates: Real Backend Only, zero demo mode, zero mock business data, zero V1 fallbacks, 69 capability breakdown, P0-P3 priority queue.
   - *Precedence Impact*: **AUTHORITATIVE**. These documents represent the true active project requirements.

5. **Level 5: Historical Reports in Root (`CLIENT_DEMO_*`, `V2_FRONTEND_IMPLEMENTATION_REPORT.md`)**:
   - Contradiction A: `CLIENT_DEMO_READINESS_REPORT.md` claims demo mode and mock adapters in `src/lib/demo/store.ts` are approved architecture.
   - Contradiction B: `V2_FRONTEND_IMPLEMENTATION_REPORT.md` claims the migration is 100% complete and verified.
   - *Conflict*: If an agent reads Level 5 before Level 4, it will conclude that work is finished and that mock fallbacks are permitted.

6. **Level 6: Contract Specifications (`src/Assets/*`)**:
   - `BUSINESS_AND_SYSTEM_DOCUMENTATION.md`, `01-applicant-contract.md` through `03-clearance-and-corridor-contract.md`, and `ROLE-PERMISSIONS-MATRIX.md`.
   - *Precedence Impact*: **AUTHORITATIVE FOR BACKEND BEHAVIOR**. Explains the exact data models, status transitions, and role checks.

7. **Level 7: Legacy Source Code (`src/lib/api/applicantApi.ts`, `src/app/api/resource/*`)**:
   - Still imports and invokes V1 DocTypes and methods.
   - *Conflict*: If an agent looks at existing code examples in `applicantApi.ts` for inspiration, it will duplicate obsolete V1 patterns.

---

## 4. AGENT-SPECIFIC INSTRUCTIONS ANALYSIS

| Agent / Tool | Associated Files | Current Status & Behavior | Risk Assessment & Findings | Recommended Fix |
|:---|:---|:---|:---|:---|
| **Claude Code** | `CLAUDE.md` | Contains `@AGENTS.md`. | Inherits everything from `AGENTS.md`. Currently receives only Next.js agent notes. | Keep `CLAUDE.md`, update `AGENTS.md`. |
| **Gemini / Antigravity** | System prompt, `AGENTS.md`, `.gemini/` | Global config in user profile. No repo-local `.gemini` folder. Reads `AGENTS.md`. | Without explicit root rules, Antigravity may synthesize instructions from stale historical markdown files. | Prepend explicit project rules in `AGENTS.md`. |
| **Cursor** | `.cursor/` (absent), `.cursorrules` (absent), `AGENTS.md` | Not present in repo. Cursor falls back to `AGENTS.md` or `.cursorrules`. | If Cursor is used, it will read `AGENTS.md` and find no instructions. | Place authoritative rules in root `AGENTS.md`. |
| **GitHub Copilot** | `.github/copilot-instructions.md` (absent), `AGENTS.md` | Not present in repo. | Copilot relies on surrounding workspace context and open tabs, easily picking up V1 patterns from `applicantApi.ts`. | Consolidate instructions in `AGENTS.md`. |
| **Codex / OpenAI** | `AGENTS.md` | Reads `AGENTS.md` natively. | Will read only Next.js notes. | Provide clear constraints in `AGENTS.md`. |

---

## 5. DOCUMENTATION CLASSIFICATION

Every documentation and specification file in the repository has been evaluated and assigned to one of the five prompt-defined categories (A through E):

### Category A: Authoritative Current Contract
*Files that define the true, binding intended behavior of the current V2 system.*
1. `src/Assets/openapi 3.1.0.txt` / `src/Assets/new swagger.json` (Machine-readable API contract)
2. `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md` (System rules, state machines, 16 roles)
3. `src/Assets/01-applicant-contract.md` (Applicant doctype schema, endpoints, transition gates)
4. `src/Assets/02-placement-contract.md` (Placement doctype schema, endpoints, terminal guards)
5. `src/Assets/03-clearance-and-corridor-contract.md` (Clearance Step schema, dynamic corridor data)
6. `src/Assets/ROLE-PERMISSIONS-MATRIX.md` (16-role permission matrix from backend code)
7. `src/Assets/README.md` (Contract generation methodology and User `name`=email rule)
8. `FINAL_V2_CONFORMANCE_MATRIX.md` (Baseline conformance audit of all 86 endpoints)
9. `MASTER_SYSTEM_STATUS.md` (Current system capability tracker)
10. `V2_FRONTEND_TODO.md` (Itemized implementation and repair plan)

### Category B: Historical Reference
*Files documenting past architectural phases or migration milestones; useful for context but not to be followed as current instructions.*
1. `BACKEND_V2_MIGRATION_AUDIT.md` (Audit from Aug 30, 2026; obsolete regarding `list_applicants`)
2. `V2_CONTRACT_RECONCILIATION.md` (Live response reconciliation from Aug 30, 2026)
3. `V2_FRONTEND_MIGRATION_BLUEPRINT.md` (Migration blueprint targeting older branch)
4. `V2_MIGRATION_IMPLEMENTATION_MAP.md` (UI preservation mapping targeting older branch)
5. `V2_CONFORMANCE_AUDIT.md` (Audit from Aug 31, 2026 targeting `backend-v2-integration`)
6. `V2_CONFORMANCE_REPAIR_REPORT.md` (Repair report from Aug 31, 2026)

### Category C: Agent Instruction
*Files whose primary function is to direct the behavior of an AI coding agent.*
1. `AGENTS.md` (Root agent rules; currently only contains Next.js compiler block)
2. `CLAUDE.md` (Claude Code configuration; points to `@AGENTS.md`)

### Category D: Obsolete V1 Guidance
*Files or scripts containing dead V1 instructions, outdated URLs, deleted DocTypes, or conflicting mock requirements.*
1. `.env.example` (Contains old V1 Railway URL: `applicantprocessing-production`)
2. `CLIENT_DEMO_READINESS_REPORT.md` (Promotes `NEXT_PUBLIC_DEMO_MODE=true` and mock store)
3. `CLIENT_DEMO_ACCEPTANCE_REPORT.md` (Promotes demo presentation mode over real backend)
4. `V2_FRONTEND_IMPLEMENTATION_REPORT.md` (Inaccurately claims migration is 100% complete)
5. `test_all_stages.mjs` (Hardcodes dead V1 URL and raw `/api/resource/Applicant`)
6. `test_phase1_verification.mjs` (Hardcodes dead V1 URL and V1 auth tokens)
7. `test_live_full_flow.mjs` (Hardcodes dead V1 URL and V1 auth tokens)
8. `test_e2e.mjs` (Asserts obsolete V1 `applicant_state` and 9-stage model)
9. `test_frappe_e2e.mjs` (Asserts obsolete V1 9-stage model and raw resource CRUD)
10. `test_contract_request_whatsapp_e2e.mjs` (Directly mutates `applicant_state` to "CV Generated")
11. `test_cv_generation_backend.mjs` (Mutates raw `/api/resource/Applicant` with obsolete fields)
12. `test_verify_user_flow.mjs` (Mutates raw `/api/resource/Applicant` with obsolete fields)
13. `src/lib/api/applicantApi.ts` (Contains 25 `applicant_processing.*` calls and mock fallbacks)
14. `src/app/api/resource/[...slug]/route.ts` (Proxy containing hardcoded V1 mutation hacks)
15. `scratch/*.js` (45+ one-off scripts hardcoding dead V1 Railway hosts)

### Category E: Useful Documentation but Not Instructions
*Documentation of standalone modules or tools that do not dictate main application workflow.*
1. `travel-agency-extension/ARCHITECTURE.md` (Browser companion extension architecture)
2. `travel-agency-extension/README.md` (Browser companion extension installation instructions)
3. `package.json` (Project metadata and dependencies)
4. `README.md` (Generic Next.js project README)

---

## 6. IDENTIFICATION OF OBSOLETE V1 CONCEPTS & HAZARDOUS GUIDANCE

The audit conducted a comprehensive text search across all instruction-bearing files, documentation, and scripts for obsolete V1 terms. Here is the evaluation of each concept:

| Obsolete V1 Concept / Term | Where Discovered | Historical Context | Danger in Current V2 Branch (`production_version_non_mock`) | Current V2 Replacement |
|:---|:---|:---|:---|:---|
| **`applicant_processing`** | `applicantApi.ts`, `BACKEND_V2_MIGRATION_AUDIT.md`, `test_*.mjs`, `scratch/*.js` | Name of the legacy Frappe backend custom app/module. | **FATAL ERROR**: Calling `applicant_processing.*` throws 404/417 on Railway production because the app has been replaced by `agency_tracking`. | All endpoints are under `agency_tracking.*`. |
| **`Applicant Dossier`** | `applicantApi.ts`, `contractor-doc/page.tsx`, `BACKEND_V2_MIGRATION_AUDIT.md` | Legacy intermediate DocType linking an applicant to an agency contract. | **FATAL ERROR**: DocType was completely deleted in V2 backend. Direct queries throw 404. | Replaced by `Placement` (`PLM-.#####`) created via `portal_api.select_candidate` or `placement_api.create_muayena_placement`. |
| **`DSR` (Deployment Status Record)** | `applicantApi.ts`, `BACKEND_V2_MIGRATION_AUDIT.md`, `test_e2e.mjs`, `route.ts` | Legacy tracking DocType holding clearance sub-records and stamps. | **FATAL ERROR**: DocType deleted in V2 backend. | Replaced by direct `Clearance Step` child records linked directly to `Placement`. |
| **`LMS Clearance` / `Injaz Clearance` / `Wakala Clearance`** | `applicantApi.ts`, `RoleWorkspaceContainer.tsx`, `workspaces/*`, `BACKEND_V2_MIGRATION_AUDIT.md`, `route.ts` | Discrete standalone DocTypes queried in parallel for operational workspaces. | **FATAL ERROR**: DocTypes deleted in V2 backend. Attempting to query `/api/resource/LMS Clearance` throws 404. | Single generic `Clearance Step` (`CLR-.#####`) with `step_type: "LMIS Clearance"` / `"Taeshir"` / etc. |
| **Old Assignment Modal (`streamAssignments`)** | `AssignEmployeeModal.tsx`, `V2_CONFORMANCE_REPAIR_REPORT.md` | Assignment modal assigning staff to `LMS Employee`, `Injaz Employee`, `Wakala Employee`. | **CORRUPTS DATA**: Mutates non-existent fields on deleted doctypes. | `agency_tracking.clearance_api.reassign_clearance_step(clearance_step_name, new_officer)`. |
| **Old Role Names** (`Recruiter`, `LMS Employee`, `Injaz Officer`, `Wakala Officer`, etc.) | `permissions.ts`, `applicantApi.ts`, `BACKEND_V2_MIGRATION_AUDIT.md` | 8 legacy role names from V1 Frappe configuration. | **RBAC FAILURE**: Legacy role names are not recognized by V2 permission checks. | 16 canonical V2 roles (`Registrar`, `Saudi LMIS`, `Saudi Taeshir`, `Saudi Embassy`, `Kuwait LMIS`, etc.) in `v2Roles.ts`. |
| **Raw REST Paths (`/api/resource/*`)** | `applicantApi.ts`, `route.ts`, `test_e2e.mjs`, `test_frappe_e2e.mjs`, `ApplicantTable.tsx` | Direct Frappe REST API queries for CRUD operations. | **SECURITY REJECTION**: V2 backend enforces zero raw `/api/resource/*` access for business operations. | Whitelisted RPC methods under `/api/method/agency_tracking.*`. |
| **Hardcoded Corridor Logic** (Saudi vs Kuwait conditionals) | `RoleWorkspaceContainer.tsx`, `ApplicantStepper.tsx`, `V2_CONTRACT_RECONCILIATION.md` | Static TypeScript boolean checks (`isSaudi ? ... : ...`). | **ARCHITECTURAL DRIFT**: Hardcoded steps cannot adapt if the backend corridor configuration changes. | Dynamic corridor engine: `agency_tracking.corridor_engine.get_corridor_steps(destination_country)`. |
| **Direct State Mutation (`applicant_state`)** | `applicantApi.ts`, `test_contract_request_whatsapp_e2e.mjs`, `test_e2e.mjs` | Client updating `applicant_state` or `status` directly via PUT requests. | **VALIDATION FAULT (417)**: Direct writes to `status` or `applicant_state` are blocked by backend. | Explicit transition methods (`register_applicant`, `advance_placement`, etc.) validated by `state_machine.py`. |
| **Mock / Demo Fallbacks** | `src/lib/demo/*`, `CLIENT_DEMO_*`, catch blocks in `src/lib/api/v2/*` | Silent fallbacks to mock data on network/permission error. | **HIDES PRODUCTION FAULTS**: Operators and developers cannot see real backend validation messages. | Strict error propagation via `ApiV2Error` with parsed `_server_messages`. |
| **Old Railway Backend URL** (`applicantprocessing-production`) | `.env.example`, `test_*.mjs`, `scratch/*.js` | V1 Railway deployment host. | **DEAD CONNECTION**: Points to legacy V1 deployment. | `https://agencytracking-production.up.railway.app`. |
| **Old User Management RPC** (`create_system_user`) | `employees/page.tsx`, `applicantApi.ts`, `BACKEND_V2_MIGRATION_AUDIT.md` | V1 RPC for creating internal system users. | **404 NOT FOUND**: Endpoint does not exist in V2. | Classified as **BACKEND-BLOCKED**. User provisioning must be performed directly in Frappe Desk. |

---

## 7. CONFLICTS WITH CURRENT V2 ARCHITECTURE & PROJECT RULES

The current project rules established for the `production_version_non_mock` branch are:
1. **Target Branch**: `production_version_non_mock`
2. **Authoritative Backend**: `https://agencytracking-production.up.railway.app`
3. **Core Architecture**: `Applicant` ➔ `Placement` ➔ `Corridor` ➔ `Clearance Step` ➔ `Ticket` ➔ `Departure`
4. **API Architecture**: Strict Whitelisted RPCs (`agency_tracking.*`)
5. **No Silent Fallbacks**: No mock data, no demo mode, no V1 fallbacks
6. **Backend State Authority**: All state transitions owned by Frappe `state_machine.py`
7. **Backend-Driven Corridors**: Corridors rendered dynamically from `get_corridor_steps`
8. **Authoritative RBAC**: Backend permission enforcement across 16 canonical roles

### Detailed Rule Conflict Analysis

| File | Specific Conflicting Text or Behavior | Why It Violates Project Rules | Threat Severity |
|:---|:---|:---|:---:|
| `.env.example` | `FRAPPE_BASE_URL=https://applicantprocessing-production.up.railway.app` | Points to dead V1 backend URL. Violates Rule #2. | **HIGH** |
| `CLIENT_DEMO_READINESS_REPORT.md` | §2: *"Centralized Demo Switch & Adapter Architecture... isDemoMode() == true -> Reactive Demo Store"* | Encourages using demo mode and mock adapters. Violates Rule #5. | **HIGH** |
| `CLIENT_DEMO_ACCEPTANCE_REPORT.md` | §A: *"Demo Mode Result PASS... Activated via NEXT_PUBLIC_DEMO_MODE=true in .env.local"* | Documents demo mode as an active, acceptable production state. Violates Rule #5. | **HIGH** |
| `V2_FRONTEND_IMPLEMENTATION_REPORT.md` | §1: *"Status: 100% Complete & Verified"* | Premature claim; contradicts `MASTER_SYSTEM_STATUS.md` and hides 31 partial features. Violates verification discipline. | **HIGH** |
| `src/lib/api/applicantApi.ts` | Contains calls to `/api/resource/Applicant`, `/api/resource/LMS Clearance`, `applicant_processing.*`, and `demoStore` fallbacks | Directly violates Rules #4, #5, and #6. | **CRITICAL** |
| `src/app/api/resource/[...slug]/route.ts` | Lines 71-118: Custom sanitization for `Applicant` skills, `LMS Clearance` financials, and `body.dsr` | Facilitates illegal raw REST access and hacks around deleted DocTypes. Violates Rule #4. | **HIGH** |
| `test_all_stages.mjs` | Line 1: `const BASE_URL = "https://applicantprocessing-production.up.railway.app";` | Targets obsolete V1 backend with hardcoded auth tokens. Violates Rule #2. | **MEDIUM** |
| `test_e2e.mjs` | Lines 9, 40: `fetch(base + "/api/resource/Applicant", ...)` and asserts `applicant_state` | Directly bypasses V2 API and tests obsolete state field. Violates Rules #3, #4, and #6. | **HIGH** |
| `test_frappe_e2e.mjs` | Lines 20, 27: *"CANONICAL 9-STAGE E2E TEST SUITE"* and calls `/api/resource/Applicant` | Asserts deleted 9-stage model and raw resource CRUD. Violates Rules #3 and #4. | **HIGH** |
| `test_contract_request_whatsapp_e2e.mjs` | Line 14: `applicant_state: "CV Generated"` via `PUT /api/resource/Applicant` | Directly mutates business state on deleted field. Violates Rule #6. | **HIGH** |
| `src/Assets/The Actual Current MethodWorkflow for Creating Internal Users.txt` | 0-byte empty file | Leaves user creation mechanism undocumented and ambiguous. | **LOW** |

---

## 8. CATEGORIZED REMEDIATION LISTS

### 8.1 Automatically Discoverable Instruction Files
*Files located in standard discovery paths that an AI agent reads automatically upon project initialization.*
- `AGENTS.md` (Root) — Must be updated with authoritative project rules.
- `CLAUDE.md` (Root) — Keep as-is (delegates to `AGENTS.md`).
- `README.md` (Root) — Must be updated with system overview and runbook.
- `.env.example` (Root) — Must be updated with correct Railway backend URL.

### 8.2 Agent-Specific Instruction Files
- `CLAUDE.md` — Scoped to Claude Code. Retain `@AGENTS.md`.

### 8.3 Historical Instruction Files
*Files created during earlier audit phases that should be preserved for historical context but isolated from active instructions.*
- `BACKEND_V2_MIGRATION_AUDIT.md` (August 30, 2026)
- `V2_CONTRACT_RECONCILIATION.md` (August 30, 2026)
- `V2_FRONTEND_MIGRATION_BLUEPRINT.md` (August 30, 2026)
- `V2_MIGRATION_IMPLEMENTATION_MAP.md` (August 31, 2026)
- `V2_CONFORMANCE_AUDIT.md` (August 31, 2026)
- `V2_CONFORMANCE_REPAIR_REPORT.md` (August 31, 2026)

### 8.4 V1 / Conflicting Instructions
*Files containing guidance or configurations that directly contradict the current V2 branch policy.*
- `CLIENT_DEMO_READINESS_REPORT.md` (Conflicting: promotes demo mode & mock store)
- `CLIENT_DEMO_ACCEPTANCE_REPORT.md` (Conflicting: promotes demo mode & mock store)
- `V2_FRONTEND_IMPLEMENTATION_REPORT.md` (Misleading: premature 100% complete claim)
- `.env.example` (Stale: points to old V1 URL)
- All root `test_*.mjs` files (Stale: target old V1 URL and obsolete DocTypes)

### 8.5 Current Valid Instructions
*Files that accurately represent the system contract, active tasks, and operational rules.*
- `FINAL_V2_CONFORMANCE_MATRIX.md` (Authoritative baseline audit of all 86 endpoints)
- `MASTER_SYSTEM_STATUS.md` (Active capability tracker)
- `V2_FRONTEND_TODO.md` (Itemized P0-P3 implementation plan)
- `src/Assets/01-applicant-contract.md` (Authoritative Applicant contract)
- `src/Assets/02-placement-contract.md` (Authoritative Placement contract)
- `src/Assets/03-clearance-and-corridor-contract.md` (Authoritative Clearance & Corridor contract)
- `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md` (Authoritative system documentation)
- `src/Assets/ROLE-PERMISSIONS-MATRIX.md` (Authoritative RBAC matrix)
- `src/Assets/README.md` (Authoritative meta-spec and user identifier convention)
- `src/Assets/openapi 3.1.0.txt` / `src/Assets/new swagger.json` (Authoritative API schema)
- `.env.local` (Authoritative local environment settings)
- `src/lib/config/env.ts` (Authoritative runtime environment policy)

### 8.6 Files Recommended for Archival
*Recommended to move into `docs/archive/` or tag with a prominent archival header so agents do not mistake them for current tasks:*
1. `CLIENT_DEMO_ACCEPTANCE_REPORT.md` ➔ `docs/archive/CLIENT_DEMO_ACCEPTANCE_REPORT.md`
2. `CLIENT_DEMO_READINESS_REPORT.md` ➔ `docs/archive/CLIENT_DEMO_READINESS_REPORT.md`
3. `V2_FRONTEND_IMPLEMENTATION_REPORT.md` ➔ `docs/archive/V2_FRONTEND_IMPLEMENTATION_REPORT.md`
4. `BACKEND_V2_MIGRATION_AUDIT.md` ➔ `docs/archive/BACKEND_V2_MIGRATION_AUDIT.md`
5. `V2_CONFORMANCE_AUDIT.md` ➔ `docs/archive/V2_CONFORMANCE_AUDIT.md`
6. `V2_CONFORMANCE_REPAIR_REPORT.md` ➔ `docs/archive/V2_CONFORMANCE_REPAIR_REPORT.md`
7. Root test scripts (`test_all_stages.mjs`, `test_contract_request_whatsapp_e2e.mjs`, `test_cv_generation_backend.mjs`, `test_e2e.mjs`, `test_frappe_e2e.mjs`, `test_live_full_flow.mjs`, `test_phase1_verification.mjs`, `test_verify_user_flow.mjs`) ➔ `scratch/legacy_v1_tests/`

### 8.7 Files Recommended for Removal
*Files that serve no operational purpose and introduce ambiguity:*
1. `src/Assets/The Actual Current MethodWorkflow for Creating Internal Users.txt` (0-byte empty file)

### 8.8 Files Recommended for Update
*Files requiring specific text or configuration adjustments:*
1. `AGENTS.md` — Prepend authoritative V2 project rules before the Next.js compiler block (see proposed content in Section 10).
2. `.env.example` — Replace `applicantprocessing-production.up.railway.app` with `agencytracking-production.up.railway.app` and document session auth.
3. `README.md` — Replace generic Next.js boilerplate with project architecture, backend connection guidelines, and runbook.
4. `src/lib/api/applicantApi.ts` — Migrate all 18 callers to `@/lib/api/v2/*` and safely delete (tracked in TODO-P3-02).
5. `src/app/api/resource/[...slug]/route.ts` — Deprecate and remove custom V1 mutation hacks (tracked in TODO-P3-02).

---

## 9. RECOMMENDED FINAL INSTRUCTION HIERARCHY

To guarantee that any AI coding agent or human developer always receives clear, unambiguous, non-conflicting direction, the following **three-tier instruction hierarchy** is established:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: AUTHORITATIVE ROOT INSTRUCTION                                      │
│ File: AGENTS.md (referenced by CLAUDE.md)                                   │
│ Purpose: Establishes global constraints, target backend, active branch,     │
│          forbidden behaviors, and working discipline.                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: ACTIVE STATUS & TASK TRACKERS                                       │
│ Files: MASTER_SYSTEM_STATUS.md & V2_FRONTEND_TODO.md                        │
│ Baseline: FINAL_V2_CONFORMANCE_MATRIX.md                                    │
│ Purpose: Defines current capability completion states and itemized P0-P3    │
│          repair tasks with strict execution order.                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: TECHNICAL BACKEND SPECIFICATIONS & CONTRACTS                         │
│ Files: src/Assets/openapi 3.1.0.txt                                         │
│        src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md                      │
│        src/Assets/01-applicant-contract.md through 03-*.md                  │
│        src/Assets/ROLE-PERMISSIONS-MATRIX.md                                │
│ Purpose: Provides exact field schemas, transition gates, corridor sequences, │
│          and RBAC rules verified against Frappe doctypes.                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Rule
If any text in a historical report, old test script, or legacy component conflicts with Tier 1, 2, or 3, **the Tier 1–3 instruction takes absolute precedence**. All legacy references must be brought into conformance with Tiers 1–3.

---

## 10. PROPOSED CANONICAL ROOT AGENTS.md (PROPOSAL ONLY — NOT CREATED)

Per Section 12 of the audit instructions, below is the proposed content for the single, concise root-level instruction file (`AGENTS.md`). **This proposal is documented here for review and has NOT been written to `AGENTS.md`.**

```markdown
# AI AGENT CODING RULES & ARCHITECTURAL CONTRACT
## Project: Travel Agency Workflow Management System (Frontend)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## MANDATORY PROJECT RULES (STRICT ENFORCEMENT)

### 1. Current Branch & Project Direction
- Active development is strictly on branch: `production_version_non_mock`.
- Never switch to or resurrect legacy branches (`feat/backend-frappe-integration`, `backend-v2-integration`).
- All work targets the real enterprise V2 architecture.

### 2. Authoritative Backend URL & Authentication
- Production Backend URL: `https://agencytracking-production.up.railway.app`
- Never use the obsolete V1 URL (`applicantprocessing-production.up.railway.app`).
- Authentication relies strictly on standard Frappe session cookies (`sid`) managed by `POST /api/method/login` and forwarded transparently by the Next.js proxy.
- Every state-changing POST request requires `X-Frappe-CSRF-Token` acquired via `agency_tracking.auth_api.get_csrf_token`.

### 3. Source of Truth Hierarchy
- **Intended Behavior**: `src/Assets/openapi 3.1.0.txt`, `src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md`, and `src/Assets/01-applicant-contract.md` through `03-clearance-and-corridor-contract.md`.
- **Deployed Truth**: Runtime responses from `https://agencytracking-production.up.railway.app`.
- **Task Tracking**: `MASTER_SYSTEM_STATUS.md` and `V2_FRONTEND_TODO.md` based on `FINAL_V2_CONFORMANCE_MATRIX.md`.

### 4. Zero V1 APIs & Zero Raw Resource Access
- All business operations MUST call whitelisted RPCs under `/api/method/agency_tracking.*` (plus `/api/method/upload_file`, `/api/method/login`, `/api/method/logout`).
- Never use `applicant_processing.*` endpoints (they do not exist).
- Never use direct `/api/resource/*` queries for business data.
- Never resurrect deleted DocTypes (`Applicant Dossier`, `DSR`, `LMS Clearance`, `Injaz Clearance`, `Wakala Clearance`, `Embassy Clearance`).

### 5. Zero Mock Fallback & Zero Demo Mode
- `NEXT_PUBLIC_DEMO_MODE` is strictly `false`. Never enable demo mode or create fake mock fixtures.
- API clients in `src/lib/api/v2/*` must never catch errors and silently return fallback data.
- Always propagate honest `ApiV2Error` exceptions with server error messages (`_server_messages`) to the UI.
- Never persist business domain data into browser `localStorage`.

### 6. Backend-Owned State Transitions
- Frontend components must NEVER directly mutate `status` or business state fields.
- All state transitions are governed exclusively by the backend state machine via sanctioned RPCs:
  - Applicant: `register_applicant`, `cv_api.generate_cv`, `cancel_applicant`, `restart_applicant`.
  - Placement: `advance_placement`, `portal_api.select_candidate`, `create_muayena_placement`.
  - Clearance: `start_clearance_step`, `complete_clearance_step`, `submit_embassy_step`, `stamp_embassy_step`, `reject_embassy_step`.
  - Finance: `log_stage_expense`, `log_stage_income`, `approve_transaction`, `reject_transaction`, `void_transaction`.

### 7. Dynamic Data-Driven Corridors
- Never hardcode clearance steps or step counts in UI components.
- Corridors are configuration data fetched dynamically via `agency_tracking.corridor_engine.get_corridor_steps(destination_country)`.
- Operational queues feed from `agency_tracking.clearance_api.list_my_clearance_steps`.

### 8. Authoritative Backend RBAC
- Role permissions are enforced across 16 canonical roles: `Registrar`, `Manager`, `Admin`, `Clearance Officer`, `Ticketer`, `Complaint Manager`, `Finance Manager`, `Foreign Agency`, `Communication Manager`, `Contract Parser`, `Saudi LMIS`, `Saudi Taeshir`, `Saudi Embassy`, `Kuwait LMIS`, `Kuwait Telesign`, `Kuwait Embassy`.
- Never invent client-side roles or bypass role checks defined in `src/Assets/ROLE-PERMISSIONS-MATRIX.md`.
- User identifier convention: Every API parameter representing a user expects the user's email address (`email` = `name`).

### 9. User Management Classification (Backend-Blocked)
- There is no V2 endpoint for user creation or password resets. User management is **BACKEND-BLOCKED**.
- Staff must be directed to Frappe Desk for user provisioning.

### 10. Working Discipline & Verification
- Preserve reusable UI layouts, design systems, and components (`OperationalTable`, `OperationalDrawer`, sidebar, cards) while gutting obsolete V1 logic.
- Update `MASTER_SYSTEM_STATUS.md` and `V2_FRONTEND_TODO.md` after completing meaningful work.
- Never claim a task is complete without live runtime verification against Railway and clean typecheck (`npx tsc --noEmit`).
```

---

## 11. CONCLUSION & AUDIT SIGN-OFF

The audit is complete. All 32 instruction-bearing files, historical reports, test scripts, and configurations have been inspected, categorized, and reconciled.

**No source code or configuration files were modified during this audit.**

**Next Action**: Await user review of this audit report. Implementation of P0/P1 items from `V2_FRONTEND_TODO.md` must not commence until this report is approved and the proposed `AGENTS.md` root instruction is established.
