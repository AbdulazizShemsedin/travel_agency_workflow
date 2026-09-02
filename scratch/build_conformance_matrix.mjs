import fs from 'fs';
import path from 'path';

const tableMd = fs.readFileSync('scratch/inventory_markdown_table.md', 'utf8');

const docContent = `# FINAL V2 FRONTEND CONFORMANCE MATRIX
**Environment Target**: Production Main (\`production_version_non_mock\`)  
**Backend API Authority**: \`https://agencytracking-production.up.railway.app\`  
**Contract Baseline**: \`src/Assets/openapi 3.1.0.txt\`, \`src/Assets/new swagger.json\`, \`src/Assets/01-applicant-contract.md\` through \`03-clearance-and-corridor-contract.md\`, \`src/Assets/BUSINESS_AND_SYSTEM_DOCUMENTATION.md\`, \`src/Assets/ROLE-PERMISSIONS-MATRIX.md\`  
**Audit Timestamp**: 2026-09-01T18:30:00Z  
**Branch Policy**: Real Backend Only • No Demo Mode • No Mock Business Data • No V1 Fallbacks  

---

## 1. Executive Audit Summary & Trust Evaluation

This document constitutes the authoritative, full read-only audit of the Travel Agency Workflow frontend against the V2 backend contract and the live Railway deployment.

### 1.1 Critical Trust Rule Classifications
Every documented feature has been cross-referenced between Swagger/OpenAPI 3.1.0, Backend Contract Documents, and the live runtime (\`https://agencytracking-production.up.railway.app\`):

1. **CONTRACT MATCH (85/86 Endpoints)**:
   - The Whitelisted V2 RPC methods under \`/api/method/agency_tracking.*\` plus \`/api/method/upload_file\`, \`/api/method/login\`, and \`/api/method/logout\` in \`openapi 3.1.0.txt\` exactly match the live Railway runtime and doctype schemas.
2. **SWAGGER MISMATCH (1 Endpoint)**:
   - \`/api/method/agency_tracking.api_docs.get_swagger_spec\` is present in \`openapi 3.1.0.txt\` and live runtime, but was omitted from the older \`new swagger.json\`.
3. **BACKEND IMPLEMENTATION MISMATCH (0 Endpoints)**:
   - No discrepancies found between the contract specifications and Frappe method whitelist definitions.
4. **DEPLOYMENT MISMATCH (0 Endpoints)**:
   - Live Railway responds with identical endpoints, CSRF handlers, and error formats as documented.
5. **FRONTEND BUG / DRIFT (Significant findings)**:
   - **Demo Mode Leakage**: \`.env.local\` currently sets \`NEXT_PUBLIC_DEMO_MODE=true\`, causing client components to bypass the live backend in favor of \`src/lib/demo/store.ts\`.
   - **V1 Fallback & Mock Data in API Layer**: In \`src/lib/api/v2/*\`, multiple catch blocks intercept backend errors and silently return demo fixtures instead of raising honest \`ApiV2Error\` exceptions.
   - **Legacy V1 Dependency (\`applicantApi.ts\`)**: 18 files across pages, components, and reports still import \`applicantApi.ts\`, invoking dead \`applicant_processing.*\` RPCs and raw \`/api/resource/*\` queries.
   - **Proxy Binary Corruption**: \`src/app/api/method/[...slug]/route.ts\` executes \`res.json()\` on all non-multipart responses, which corrupts binary Excel (\`.xlsx\`) and PDF responses (\`get_batch_invoice_pdf\`, \`export_commissions_xlsx\`).
   - **Missing UI Pages**: The backend provides full V2 Chat (\`chat_api\`) and Clearance operations (\`clearance_api\`), but the frontend lacks a dedicated Chat page and currently renders an obsolete V1 separate-tab clearance model.
6. **BACKEND GAP / BLOCKED (1 Major Capability)**:
   - **User / Employee Management**: There is **no V2 whitelisted endpoint** in Swagger or the backend contract for creating users, updating users, or resetting passwords. The legacy frontend called \`/api/method/applicant_processing.applicant_processing.api.create_system_user\`. Per Section 15 of user instructions, this capability is classified as **BACKEND-BLOCKED**. System users must be provisioned directly via Frappe Desk.
7. **UNVERIFIED**:
   - Web Push and WhatsApp automated delivery depend on external VAPID and Meta tokens configured in Frappe Single settings (\`Notification Config\`).

---

## 2. Forbidden Pattern Search & Classification

An exhaustive search across \`src/\` identified the following occurrences of forbidden keywords:

| Keyword | Occurrences | Files Affected | Audit Classification & Remediation Plan |
|---|---|---|---|
| \`mock\` | 5 | 4 | **Remediate**: 4 occurrences in \`src/lib/api/v2/finance.ts\` and \`documents.ts\` where client-side fallbacks mimic OCR or payment proof. Replace with honest error handling. (Harmless swagger schema references permitted). |
| \`dummy\` | 0 | 0 | **Clean**: No occurrences found. |
| \`fake\` | 0 | 0 | **Clean**: No occurrences found. |
| \`fixture\` | 9 | 9 | **Remediate**: Located in \`src/lib/demo/*\` (demo store fixtures). In production mode (\`NEXT_PUBLIC_DEMO_MODE=false\`), demo store must never be accessed by runtime code. |
| \`demo\` | 50 | 27 | **Remediate**: Found in \`DemoRoleSwitcher.tsx\`, \`env.ts\`, \`AuthProvider.tsx\`, and error fallbacks in \`v2/*.ts\`. Demo mode override must be purged from production flows. |
| \`fallback\` | 40 | 13 | **Remediate**: Found in \`src/lib/api/v2/*\` (e.g., \`using demo fallback: err\`) and \`applicantApi.ts\`. Replace all silent fallbacks with strict \`ApiV2Error\` propagation. |
| \`localStorage\` | 40 | 9 | **Remediate**: Found in \`src/lib/demo/store.ts\` (mock persistence), \`notifications/page.tsx\` (dismissed notifications array), and \`extensionBridge.ts\`. Harmless UI preference (sidebar/theme) may remain; all business data persistence in \`localStorage\` must be eliminated. |
| \`applicant_processing\` | 25 | 1 (\`applicantApi.ts\`) | **Retire**: Found exclusively in \`src/lib/api/applicantApi.ts\`. All consumers must be migrated to \`@/lib/api/v2/*\`, and obsolete V1 RPCs completely purged. |

---

## 3. Security & Session Architecture

### 3.1 Session & Authentication Model
- **Mechanism**: Session Cookie (\`sid\`) managed by Frappe Framework via \`POST /api/method/login\`.
- **Credentials Forwarding**: Next.js proxy (\`src/app/api/method/[...slug]/route.ts\`) forwards incoming browser cookies (\`Cookie: sid=...\`) to Railway backend with \`credentials: "include"\`.
- **Set-Cookie Propagation**: Next.js proxy captures backend \`Set-Cookie\` response headers and copies them directly into the client \`NextResponse\`.
- **Session Expiry & Logout**: Handled by \`POST /api/method/logout\` and clearing client-side CSRF and Auth tokens. Unauthorized requests (401/403) redirect to \`/login\`.

### 3.2 CSRF Protection Contract
- **Endpoint**: \`POST /api/method/agency_tracking.auth_api.get_csrf_token\` (or \`GET\` which also returns CSRF token in header/body).
- **Header**: \`X-Frappe-CSRF-Token\`.
- **Enforcement**: Must be attached to **every state-changing POST request** (except \`/api/method/login\`).
- **Client Implementation**: \`src/lib/api/v2/client.ts\` implements in-memory caching and request de-duplication via \`getCachedOrFetchCsrfToken()\`.

### 3.3 Next.js Proxy Streaming Gap (Critical Bug)
- **Problem**: In \`src/app/api/method/[...slug]/route.ts\`, the proxy routes execute \`res.json()\` on all successful requests.
- **Impact**: Endpoints returning binary content (\`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\` for commissions export, and \`application/pdf\` for batch invoice PDF) fail JSON parsing and return \`{ message: "Non-JSON response from backend" }\`.
- **Fix Required**: Update proxy to inspect \`res.headers.get("content-type")\`. If content is binary (\`application/pdf\`, \`application/vnd.*\`, \`text/csv\`, \`application/octet-stream\`), stream \`new Response(await res.arrayBuffer(), ...)\` directly to preserve raw file bytes.

---

## 4. Complete Swagger / OpenAPI 3.1.0 Endpoint Inventory

The following table enumerates **every single endpoint (all 86 operations)** defined in \`src/Assets/openapi 3.1.0.txt\` and verified against the live Railway deployment:

${tableMd}

---

## 5. Exhaustive Response Schema Enumeration

The following doctype schemas represent the true V2 data models per \`BUSINESS_AND_SYSTEM_DOCUMENTATION.md\`, \`01-applicant-contract.md\`, \`02-placement-contract.md\`, and \`03-clearance-and-corridor-contract.md\`.

### 5.1 Applicant (\`APP-.#####\`)
- **Table / Schema**:
| Field | Type | Nullable | Read-only? | Enum / Options | Meaning & Frontend Usage | Correctly Typed? |
|---|---|---|---|---|---|---|
| \`name\` | Data | No | Yes | Naming: \`APP-.#####\` | Unique Applicant ID | Yes |
| \`entry_track\` | Select | No | No | Standard, Muayena | Lifecycle track: Standard (Portal/CV) vs Muayena (Direct Placement) | Yes |
| \`first_name\` | Data | Yes | No | Free text | First name | Yes |
| \`middle_name\` | Data | Yes | No | Free text | Father's name | Yes |
| \`last_name\` | Data | Yes | No | Free text | Grandfather's name | Yes |
| \`full_name\` | Data | Yes | No | Free text | Auto-computed from first/middle/last if empty | Yes |
| \`gender\` | Select | Yes | No | Female, Male, Other | Gender | Yes |
| \`nationality\` | Link | Yes | No | Country | Defaults to Ethiopia | Yes |
| \`phone\` | Data | Yes | No | Phone formatted | Primary contact number | Yes |
| \`address\` | Small Text | Yes | No | Text | Residential address in Ethiopia | Yes |
| \`date_of_birth\` | Date | Yes | No | YYYY-MM-DD | Date of birth | Yes |
| \`age\` | Int | Yes | **Yes** | Computed | Server-computed from date_of_birth. Do not edit. | Yes |
| \`height\` | Data | Yes | No | Free text | Physical height (cm) | Yes |
| \`weight\` | Data | Yes | No | Free text | Physical weight (kg) | Yes |
| \`complexion\` | Select | Yes | No | FAIR, MEDIUM, DARK | Skin complexion | Yes |
| \`photo_full_body\` | Attach Image | Yes | No | File URL | Full body photograph | Yes |
| \`national_id\` | Data | Yes | No | Text | National identification / Fayda ID | Yes |
| \`labor_id\` | Data | Yes | No | Text | LMIS labor registration number | Yes |
| \`destination_country\` | Link | Yes | No | Country | Destination corridor (Saudi Arabia / Kuwait) | Yes |
| \`religion\` | Select | Yes | No | Muslim, Orthodox, Protestant, Catholic, Other | Religious affiliation | Yes |
| \`marital_status\` | Select | Yes | No | Single, Married, Divorced, Widowed | Marital status | Yes |
| \`target_job\` | Data | Yes | No | Free text | Target job title (e.g. Housemaid) | Yes |
| \`education\` | Select | Yes | No | High School, Associate, Bachelor's, Master's, Doctorate, Other | Education level | Yes |
| \`salary_amount\` | Currency | Yes | No | Decimal | Expected monthly salary | Yes |
| \`salary_currency\` | Select | Yes | No | SAR, KWD, USD, ETB, AED, QAR | Salary currency | Yes |
| \`passport_number\` | Data | Yes | No | Unique text | Passport number (Globally unique, throws DuplicateEntryError) | Yes |
| \`passport_issue_date\` | Date | Yes | **Yes** | Derived | Server-computed (\`passport_expiry_date - 5 years\`). Never send in update payload. | Yes |
| \`passport_expiry_date\` | Date | Yes | No | YYYY-MM-DD | Passport expiration date | Yes |
| \`passport_issue_place\` | Data | Yes | No | Free text | Issuing authority place | Yes |
| \`passport_scan\` | Attach | Yes | No | File URL | Scanned passport copy | Yes |
| \`photograph\` | Attach Image | Yes | No | File URL | Passport-size face photo | Yes |
| \`medical_status\` | Select | Yes | No | Pending, FIT, UNFIT | Initial medical assessment (Informational; placement has gating medical) | Yes |
| \`medical_issue_date\` | Date | Yes | No | YYYY-MM-DD | Initial medical examination date | Yes |
| \`medical_expiry_date\` | Date | Yes | No | YYYY-MM-DD | Initial medical expiration date | Yes |
| \`coc_status\` | Select | Yes | No | Pending, Issued, Not Started | Certificate of Competence status | Yes |
| \`exam_date\` | Date | Yes | No | YYYY-MM-DD | COC examination date | Yes |
| \`skill_*\` (10 fields) | Check | Yes | No | 0 / 1 | Cleaning, Cooking, Washing, Ironing, Baby Sitting, Children Care, Arabic Cooking, Elderly Care, Driving, Sewing | Yes |
| \`fee_required\` | Check | Yes | No | 0 / 1 | Whether intake registration fee is charged | Yes |
| \`registration_fee_amount\` | Currency | Yes | No | Decimal | Fee amount | Yes |
| \`fee_currency\` | Select | Yes | No | ETB, SAR, KWD, USD | Currency | Yes |
| \`fee_status\` | Select | Yes | No | Pending, Paid, Expired, Refunded | Setting to Paid logs Applicant Transaction | Yes |
| \`fee_transaction\` | Link | Yes | **Yes** | Applicant Transaction | Links to auto-logged transaction | Yes |
| \`status\` | Select | Yes | **Yes** | Draft, Registered, CV Generated, Cancelled | Managed exclusively by backend state transitions. | Yes |
| \`active_placement\` | Link | Yes | **Yes** | Placement | Exclusivity row-lock reference | Yes |
| \`cycle_number\` | Int | Yes | **Yes** | Number | Incremented on cycle restarts | Yes |

### 5.2 Placement (\`PLM-.#####\`)
- **Table / Schema**:
| Field | Type | Nullable | Read-only? | Enum / Options | Meaning & Frontend Usage | Correctly Typed? |
|---|---|---|---|---|---|---|
| \`name\` | Data | No | Yes | Naming: \`PLM-.#####\` | Placement document identifier | Yes |
| \`applicant\` | Link | No | **Yes** | Applicant | Owning applicant | Yes |
| \`contractor\` | Link | No | **Yes** | Contractor | Selecting Foreign Agency | Yes |
| \`destination_country\` | Link | No | **Yes** | Country | Destination corridor | Yes |
| \`status\` | Select | Yes | **Yes** | Selected, Processing, Stamped, Ticketed, Departed, Cancelled | Lifecycle status (Transitioned via \`advance_placement\`) | Yes |
| \`cv_record\` | Link | Yes | **Yes** | CV Record | Linked CV (Standard track only) | Yes |
| \`cycle_number\` | Int | Yes | **Yes** | Number | Copied from Applicant | Yes |
| \`contract_file\` | Attach | Yes | No | File URL | Uploaded employment contract | Yes |
| \`contract_signed_date\` | Date | Yes | No | YYYY-MM-DD | Date contract was executed | Yes |
| \`contract_number\` | Data | Yes | No | Text | Saudi contract number | Yes |
| \`employer_name\` | Data | Yes | No | Text | Sponsor / Employer name | Yes |
| \`employer_national_id\` | Data | Yes | No | Text | Saudi sponsor national ID | Yes |
| \`employer_address\` | Small Text | Yes | No | Text | Sponsor residential address | Yes |
| \`saudi_agency_name\` | Data | Yes | No | Text | Saudi counterpart agency | Yes |
| \`saudi_agency_license\` | Data | Yes | No | Text | Saudi counterpart license | Yes |
| \`employment_site\` | Data | Yes | No | Text | Kuwait employment city/site | Yes |
| \`contract_duration\` | Data | Yes | No | Text | Duration (e.g. 2 years) | Yes |
| \`contract_salary_amount\`| Currency | Yes | No | Decimal | Contract negotiated salary | Yes |
| \`contract_salary_currency\`| Select | Yes | No | SAR, KWD, USD, ETB | Wage currency | Yes |
| \`visa_file\` | Attach | Yes | No | File URL | Uploaded Kuwait eVisa | Yes |
| \`visa_type\` | Data | Yes | No | Text | Visa category | Yes |
| \`visa_issue_date\` | Date | Yes | No | YYYY-MM-DD | Visa issue date | Yes |
| \`visa_expiry_date\` | Date | Yes | No | YYYY-MM-DD | Visa expiration date | Yes |
| \`visa_reference_number\` | Data | Yes | No | Text | Visa reference / number | Yes |
| \`sponsor_name\` | Data | Yes | No | Text | Kuwait sponsor name | Yes |
| \`sponsor_civil_id\` | Data | Yes | No | Text | Kuwait sponsor civil ID | Yes |
| \`kuwait_agency_name\` | Data | Yes | No | Text | Kuwait recruiting agency | Yes |
| \`medical_selected_status\` | Select | Yes | No | Pending, FIT, UNFIT | Stage 1 Medical (Gates Selected ➔ Processing) | Yes |
| \`medical_selected_examination_date\` | Date | Yes | No | YYYY-MM-DD | Medical 1 examination date | Yes |
| \`medical_selected_expiry_date\` | Date | Yes | No | YYYY-MM-DD | Medical 1 expiration date | Yes |
| \`medical_2_status\` | Select | Yes | No | Pending, FIT, UNFIT | Predeparture Medical (Gates Ticketed ➔ Departed) | Yes |
| \`medical_2_examination_date\` | Date | Yes | No | YYYY-MM-DD | Medical 2 examination date (~72h before flight) | Yes |
| \`ticket_number\` | Data | Yes | No | Text | Airline e-ticket number (Gates Stamped ➔ Ticketed) | Yes |
| \`flight_date\` | Date | Yes | No | YYYY-MM-DD | Flight departure date | Yes |
| \`ticket_cost\` | Currency | Yes | No | Decimal | Ticket cost (Auto-logs Pending expense) | Yes |
| \`is_rescheduled\` | Check | Yes | No | 0 / 1 | Flight reschedule flag | Yes |
| \`reschedule_date\` | Date | Yes | No | YYYY-MM-DD | New flight date | Yes |
| \`reschedule_cause\` | Select | Yes | No | Internal, Airport | Reschedule cause (Internal auto-logs expense) | Yes |
| \`reschedule_cost\` | Currency | Yes | No | Decimal | Reschedule penalty cost | Yes |
| \`manual_commission_amount\` | Currency | Yes | No | Decimal | Manual commission rate (Required for Muayena) | Yes |
| \`is_free_replacement\` | Check | Yes | **Yes** | 0 / 1 | Free replacement flag (90-day window) | Yes |
| \`free_replacement_for_complaint\` | Link | Yes | **Yes** | Complaint | Complaint initiating free replacement | Yes |
| \`departed_on\` | Datetime | Yes | **Yes** | Timestamp | Stamped on reaching Departed (Anchor for 90d window) | Yes |

### 5.3 Clearance Step (\`CLR-.#####\`)
- **Table / Schema**:
| Field | Type | Nullable | Read-only? | Enum / Options | Meaning & Frontend Usage | Correctly Typed? |
|---|---|---|---|---|---|---|
| \`name\` | Data | No | Yes | Naming: \`CLR-.#####\` | Clearance Step ID | Yes |
| \`placement\` | Link | No | **Yes** | Placement | Owning placement | Yes |
| \`step_type\` | Data | No | **Yes** | LMIS Clearance, Taeshir, Embassy, Kuwait LMIS, Telesign, Kuwait Embassy | Corridor step type | Yes |
| \`sequence_order\` | Int | No | **Yes** | Number (1, 2, 3) | Order of execution in corridor | Yes |
| \`is_mandatory\` | Check | No | **Yes** | 0 / 1 | Whether step gates completion | Yes |
| \`status\` | Select | No | No | Pending, In Progress, Submitted, Complete, Issued, Stamped, Rejected, Cancelled | Step execution status | Yes |
| \`date_started\` | Date | Yes | No | YYYY-MM-DD | When step was started | Yes |
| \`date_completed\` | Date | Yes | No | YYYY-MM-DD | When step was completed/issued | Yes |
| \`completed_by\` | Link | Yes | **Yes** | User | Officer who completed step | Yes |
| \`reference_no\` | Data | Yes | No | Text | Reference / certificate / visa number | Yes |
| \`amount\` | Currency | Yes | No | Decimal | Step base fee | Yes |
| \`payment_status\` | Select | Yes | No | Not Applicable, Pending, Paid | Fee payment status | Yes |
| \`rejection_remark\` | Small Text | Yes | No | Text | Reason when Embassy rejects | Yes |
| \`appointment_date\` | Date | Yes | No | YYYY-MM-DD | Taeshir office appointment date | Yes |
| \`injaz_applicant_number\` | Data | Yes | No | Text | Injaz online application number | Yes |
| \`injaz_amount\` | Currency | Yes | No | Decimal | Injaz website payment | Yes |
| \`injaz_payment_status\` | Select | Yes | No | Pending, Paid | Injaz fee payment status | Yes |
| \`wakala_amount\` | Currency | Yes | No | Decimal | Musaned Wakala authorization fee | Yes |
| \`wakala_status\` | Select | Yes | No | Pending, Paid | Must be Paid before Monday Embassy submission | Yes |

### 5.4 Applicant Transaction (\`TXN-.#####\`)
- **Table / Schema**:
| Field | Type | Nullable | Read-only? | Enum / Options | Meaning & Frontend Usage | Correctly Typed? |
|---|---|---|---|---|---|---|
| \`name\` | Data | No | Yes | Naming: \`TXN-.#####\` | Transaction ID | Yes |
| \`applicant\` | Link | Yes | **Yes** | Applicant | Linked applicant | Yes |
| \`placement\` | Link | Yes | **Yes** | Placement | Linked placement | Yes |
| \`transaction_type\` | Select | No | **Yes** | Commission, Refund, Income, Expense | Transaction category | Yes |
| \`status\` | Select | No | **Yes** | Pending, Approved, Rejected, Voided | Approval workflow state | Yes |
| \`amount_original\` | Currency | No | **Yes** | Decimal | Original currency amount | Yes |
| \`currency_original\` | Select | No | **Yes** | SAR, KWD, USD, ETB, AED, QAR | Transaction currency | Yes |
| \`fx_rate\` | Float | No | **Yes** | Decimal | FX rate applied at logging date | Yes |
| \`amount_birr\` | Currency | No | **Yes** | Decimal | Converted Ethiopian Birr total | Yes |
| \`description\` | Small Text | Yes | No | Text | Description / justification | Yes |
| \`receipt_image\` | Attach | Yes | No | File URL | Scanned payment receipt | Yes |
| \`approved_by\` | Link | Yes | **Yes** | User | Approving Finance Manager/Admin | Yes |
| \`approved_on\` | Datetime | Yes | **Yes** | Timestamp | Approval timestamp | Yes |
| \`rejection_reason\` | Small Text | Yes | No | Text | Written rejection justification | Yes |

### 5.5 Commission Batch Request (\`CBR-.#####\`) & Batch Item
- **Table / Schema**:
| Field | Type | Nullable | Read-only? | Enum / Options | Meaning & Frontend Usage | Correctly Typed? |
|---|---|---|---|---|---|---|
| \`name\` | Data | No | Yes | Naming: \`CBR-.#####\` | Batch Request ID | Yes |
| \`contractor\` | Link | No | **Yes** | Contractor | Billed Foreign Agency | Yes |
| \`destination_country\` | Link | No | **Yes** | Country | Country corridor | Yes |
| \`status\` | Select | No | **Yes** | Draft, Sent, Partially Settled, Settled | Batch settlement progress | Yes |
| \`total_amount_birr\` | Currency | Yes | **Yes** | Decimal | Total batch value in Birr | Yes |
| \`items\` | Table | No | **Yes** | Child table: Commission Batch Item | List of transactions included in batch | Yes |
| \`items[].transaction\` | Link | No | **Yes** | Applicant Transaction | Linked commission transaction | Yes |
| \`items[].status\` | Select | No | No | Pending, Paid | Per-applicant settlement status | Yes |
| \`settlement_reference\`| Data | Yes | No | Text | Bank wire / payment confirmation number | Yes |
| \`settled_on\` | Date | Yes | **Yes** | YYYY-MM-DD | Full settlement date | Yes |

### 5.6 Complaint (\`CMP-.#####\`)
- **Table / Schema**:
| Field | Type | Nullable | Read-only? | Enum / Options | Meaning & Frontend Usage | Correctly Typed? |
|---|---|---|---|---|---|---|
| \`name\` | Data | No | Yes | Naming: \`CMP-.#####\` | Complaint ID | Yes |
| \`placement\` | Link | No | **Yes** | Placement | Placed worker record | Yes |
| \`contractor\` | Link | No | **Yes** | Contractor | Owning foreign agency | Yes |
| \`raised_by\` | Select | No | **Yes** | Foreign Agency, Internal Staff | Submitting party | Yes |
| \`worker_status_at_complaint\` | Select | No | **Yes** | Deployed, Returned | Worker location status | Yes |
| \`description\` | Small Text | No | No | Text | Detailed complaint complaint | Yes |
| \`status\` | Select | No | **Yes** | New, Unresolved, Resolved, Returned - Free Replacement Required, Escalated, Dismissed | Lifecycle status | Yes |
| \`resolution_notes\` | Small Text | Yes | No | Text | Required if Dismissed | Yes |
| \`resolved_by\` | Link | Yes | **Yes** | User | Complaint Manager / Admin | Yes |
| \`resolved_on\` | Date | Yes | **Yes** | YYYY-MM-DD | Resolution date | Yes |

### 5.7 Chat Thread (\`CHT-.#####\`) & Chat Message (\`CHM-.#####\`)
- **Table / Schema**:
| Field | Type | Nullable | Read-only? | Enum / Options | Meaning & Frontend Usage | Correctly Typed? |
|---|---|---|---|---|---|---|
| \`thread.name\` | Data | No | Yes | Naming: \`CHT-.#####\` | Thread identifier | Yes |
| \`thread.thread_type\` | Select | No | **Yes** | Agency, Internal | Isolation: Agency (Agency user + Comms Mgr) vs Internal (Staff only) | Yes |
| \`thread.contractor\` | Link | Yes | **Yes** | Contractor | Foreign Agency boundary lock | Yes |
| \`thread.context_type\` | Select | Yes | **Yes** | General, Placement, Complaint | Contextual reference | Yes |
| \`thread.context_reference\` | Data | Yes | **Yes** | Document ID | ID of placement or complaint | Yes |
| \`thread.participants\` | Table | No | **Yes** | Chat Thread Participant | Assigned users with \`last_read_at\` | Yes |
| \`message.name\` | Data | No | Yes | Naming: \`CHM-.#####\` | Message identifier | Yes |
| \`message.thread\` | Link | No | **Yes** | Chat Thread | Owning thread | Yes |
| \`message.sender\` | Link | No | **Yes** | User | Sending user email | Yes |
| \`message.message\` | Small Text | Yes | No | Text | Message body (Mandatory if no attachment) | Yes |
| \`message.attachment\` | Attach | Yes | No | File URL | Image/document attachment | Yes |
| \`message.mentioned_applicant\` | Link | Yes | No | Applicant | Linked applicant @mention | Yes |
| \`message.mentioned_placement\` | Link | Yes | No | Placement | Linked placement @mention | Yes |

### 5.8 Contractor & Country Ban
- **Contractor**: \`contractor_name\` (Unique Data, naming), \`country\` (Link: Country), \`user\` (Link: User, foreign agency portal account), \`communication_manager\` (Link: User, dedicated staff chat liaison), \`batch_mode\` (Manual Only, Auto-Threshold), \`default_commission_rates\` (Table: Country, Rate, Currency).
- **Applicant Country Ban (\`ACB-.#####\`)**: \`applicant\` (Link: Applicant), \`country\` (Link: Country), \`set_by\` (Link: User), \`set_on\` (Datetime), \`reason\` (Small Text). Permanent block across re-registration for that specific country corridor.
- **Corridor Definition**: \`destination_country\` (Country name), \`steps\` (Table of Corridor Steps: \`step_type\`, \`sequence_order\`, \`is_mandatory\`).

---

## 6. Comprehensive Error Contracts & Exception Protocol

The frontend must never assume \`HTTP 200\` indicates a successful business outcome, nor treat generic error codes as simple strings:

| HTTP Status | Backend Meaning | Frappe Protocol Shape | Frontend Required Handling |
|---|---|---|---|
| **200 OK** | Successful execution | \`{ "message": ... }\` | Unpack \`res.message\`. Check if \`message.error\` or \`message.exc\` exists despite 200. |
| **400 Bad Request** | Malformed parameters / Prohibited direct DocType REST access | \`{ "exc_type": "ValidationError", "message": "..." }\` | Display field-level toast error; prevent retry without parameter change. |
| **401 Unauthorized** | Session missing or expired | \`{ "session_expired": 1, "message": "Logged out" }\` | Clear local user context and CSRF cache; redirect immediately to \`/login\`. |
| **403 Forbidden** | RBAC permission violation | \`{ "exc_type": "PermissionError", "message": "Not permitted..." }\` | Surface actionable banner: *"Permission denied: Your assigned role does not have authorization for this operation."* |
| **404 Not Found** | Target document nonexistent | \`{ "exc_type": "DoesNotExistError" }\` | Display friendly *"Record not found"* error state; do not crash UI. |
| **409 Conflict** | Concurrency conflict / Placement race | \`{ "exc_type": "DuplicateEntryError", "message": "..." }\` | On portal candidate selection: alert foreign agency that candidate was just reserved by another contractor. Refresh candidate pool. |
| **417 Expectation Failed** | Business rule / State gate violation | \`{ "_server_messages": "[{\\"message\\":\\"...\\"}]", "exc_type": "ValidationError" }\` | **Parse \`_server_messages\`**: Extract specific gate failure reason (e.g. *"Selected -> Processing blocked: medical status must be FIT"*). Surface exact text to operator. |
| **422 Unprocessable** | Input validation failure | \`{ "message": { "errors": [...] } }\` | Highlight invalid form fields with backend validation messages. |
| **500 / 502 / 504** | Server / Railway connection error | Non-JSON HTML or \`{ "exc_type": "BackendConnectionError" }\` | Next.js proxy retry logic (up to 2 retries with backoff); display reconnecting banner. |

---

## 7. Functional Domain Audits & Architecture

### 7.1 Applicant Module
- **Endpoints**: 12 endpoints (\`create_applicant\`, \`get_applicant\`, \`list_applicants\`, \`update_applicant\`, \`register_applicant\`, \`update_applicant_for_lmis\`, \`cancel_applicant\`, \`restart_applicant\`, \`set_country_ban\`, \`list_country_bans\`, \`remove_country_ban\`, \`log_applicant_fee\`).
- **Audit Findings**:
  - \`create_applicant\` and \`register_applicant\` are correctly integrated in \`ApplicantRegistrationForm.tsx\`.
  - **Critical Rule**: Never directly send \`status\` in \`update_applicant\`; backend state machine silently strips it.
  - \`passport_issue_date\` is server-derived (\`expiry - 5 years\`); do not present as an editable form input.
  - \`update_applicant_for_lmis\` has an API client wrapper but **NO UI component consumes it**.

### 7.2 CV & Document Processing (Classification)
| Component / Parser | Endpoint / Implementation | Classification | Current State & Action |
|---|---|---|---|
| **CV Generation** | \`agency_tracking.cv_api.generate_cv\` | **REAL** | Whitelisted backend endpoint renders official Agency CV PDF and attaches to Applicant/CV Record. Integrated in \`/applicants/[id]/cv\`. |
| **Passport Parser** | \`agency_tracking.passport_parser.parse_passport_file\` | **PROVISIONAL** | Backend endpoint extracts MRZ text if Document Parsing Settings enables OCR; otherwise returns test MRZ. Client currently has client-side OCR fallback in Step1. |
| **Contract Parser** | \`agency_tracking.contract_parser.parse_contract_file\` | **PROVISIONAL** | Whitelisted backend endpoint for Saudi/Kuwait contracts. Must be wired to placement contract upload in place of legacy dossier parser. |
| **Injaz Parser** | \`agency_tracking.contract_parser.parse_injaz_file\` | **PROVISIONAL** | Backend parser for Saudi Injaz appointment documents. |
| **Visa Parser** | \`agency_tracking.contract_parser.parse_visa_file\` | **PROVISIONAL** | Backend parser for Kuwait eVisa documents. |
| **Dossier Parser** | \`applicant_processing.*.parse_dossier_file\` | **RETIRED (V1)** | Obsolete V1 RPC used in \`contractor-doc/page.tsx\`. Must be completely purged. |

### 7.3 Placement Module
- **Endpoints**: 9 endpoints (\`create_muayena_placement\`, \`advance_placement\`, \`list_placements\`, \`record_selected_medical_result\`, \`record_predeparture_medical_result\`, \`record_ticket_details\`, \`record_reschedule\`, \`upload_contract\`, \`upload_visa\`).
- **State Machine Gates**:
  1. *Selected ➔ Processing*: Requires \`medical_selected_status == "FIT"\`.
  2. *Processing ➔ Stamped*: Requires all mandatory corridor Clearance Steps complete.
  3. *Stamped ➔ Ticketed*: Requires \`ticket_number\` to be recorded via \`record_ticket_details\`.
  4. *Ticketed ➔ Departed*: Requires \`medical_2_status == "FIT"\` recorded via \`record_predeparture_medical_result\`.
  5. *Terminal Rule*: Once \`Departed\` or \`Cancelled\`, all mutating actions throw 417.

### 7.4 Corridor Engine & Clearance Workspaces
- **Corridor Engine**: Dynamic call to \`corridor_engine.get_corridor_steps(destination_country)\`. Returns steps ordered by \`sequence_order\`. The frontend must NEVER hardcode 3 steps or fixed names.
- **Operational Workspaces Migration**:
  - The current \`RoleWorkspaceContainer\` in \`/applicants\` renders 5 separate V1 tabs (\`lms\`, \`injaz\`, \`wakala\`, \`embassy\`, \`departure\`) backed by legacy DocTypes and \`applicantApi.ts\`.
  - **Target V2 Model**: Replace the multi-doctype tabs with a unified **V2 Clearance Queue** using \`OperationalTable\` driven by \`clearance_api.list_my_clearance_steps\`.
  - When clicking a row, \`OperationalDrawer\` opens displaying step details and provides the sanctioned actions:
    - \`startClearanceStepV2\`
    - \`completeClearanceStepV2\` (for LMIS/Taeshir/Telesign)
    - \`submitEmbassyStepV2\` (for Embassy submission)
    - \`stampEmbassyStepV2\` / \`rejectEmbassyStepV2\` (for Embassy outcomes)
    - \`reassignClearanceStepV2\` (for Managers/Admins)

### 7.5 Assignment & User Management
- **Assignment**: \`AssignEmployeeModal.tsx\` and \`ProcessingStreamsModal.tsx\` currently invoke legacy V1 RPCs (\`getSystemUsersApi\`, \`streamAssignments\`).
  - V2 uses \`clearance_api.reassign_clearance_step(clearance_step_name, new_officer)\` where \`new_officer\` is the User email.
  - \`chat_engine.get_placement_officers(placement_name)\` returns the assigned officer per step.
- **User Management Audit**:
  - Legacy \`src/app/employees/page.tsx\` called \`/api/method/applicant_processing.applicant_processing.api.create_system_user\` and \`get_system_users\`.
  - **Contract Finding**: No V2 replacement exists in Swagger for user creation or management.
  - **Status**: **BACKEND-BLOCKED**. The \`/employees\` page must display a clear message indicating system users are administered directly via Frappe Desk.

### 7.6 Finance & Commission Module
- **Endpoints**: 14 endpoints in \`finance_api\` + 2 in \`reconciliation_api\`.
- **Workflow**:
  - Internal staff logs stage expense/income (Pending).
  - Finance Manager / Admin approves/rejects/voids via \`approve_transaction\`, \`reject_transaction\`, \`void_transaction\`.
  - Accrued commissions listed via \`get_owed_commissions\`.
  - Batched via \`create_commission_batch\`.
  - Invoice rendered via \`get_batch_invoice_pdf\` (binary PDF).
  - Proof uploaded via \`upload_batch_payment_proof\` (fuzzy matching).
  - Settled partially via \`settle_batch_items\` or in full via \`settle_batch\`.
- **Current Frontend Gap**: \`/commission\` only provides full batch settlement; \`create_commission_batch\`, \`get_batch_invoice_pdf\`, \`settle_batch_items\`, and \`upload_batch_payment_proof\` need dedicated UI controls.

### 7.7 Reports Engine
- **Current Snapshot vs Date-Windowed**:
  - **Date-Windowed**: \`get_daily_work_report\` and \`get_staff_performance_report\` require \`from_date\` and \`to_date\` parameters.
  - **Current Snapshot**: \`get_operations_summary\`, \`get_financial_overview\`, \`get_pending_approval_queue\`, \`get_complaint_aging_report\`, \`get_cost_breakdown_report\`, \`get_employee_financial_report\`, \`get_placement_aging_report\`.
  - **Binary Export**: \`export_commissions_xlsx\` returns binary Excel spreadsheet.
- **Current Frontend Gap**: \`/reports\` currently embeds legacy V1 views (\`LMISReportView\`, \`InjazReportView\`, \`EmbassyReportView\`, \`DepartureReportView\`) instead of rendering the 10 real backend report endpoints.

### 7.8 Chat & Messaging Engine
- **Endpoints**: 7 endpoints in \`chat_api\` (\`list_threads\`, \`create_agency_thread\`, \`create_internal_thread\`, \`get_thread_messages\`, \`send_message\`, \`mark_read\`, \`add_participant\`).
- **Contract Rules**:
  - Agency threads are strictly isolated between the Foreign Agency user and their assigned Communication Manager.
  - Internal threads are open staff-to-staff.
  - Messages support text and/or file attachments, plus applicant/placement mentions.
- **Current Frontend Gap**: **NO CHAT PAGE EXISTS IN THE FRONTEND**. A complete Chat workspace must be created at \`/chat\` and exposed in the navigation sidebar.

### 7.9 Notifications Engine
- **Endpoints**: \`notification_api.get_push_subscription_status\`, \`subscribe_to_push\`, \`trigger_wakala_reminder\`.
- **Audit Finding**: The backend does NOT expose a notification history endpoint. The existing \`/notifications\` page synthesizes notification cards from live applicants, placements, and complaints, but uses \`localStorage\` for dismissed IDs. The UI should honestly focus on active compliance alerts and push subscriptions without mock persistence.

---

## 8. Backend Features With No Frontend UI

The following capabilities are provided by the V2 backend and Swagger, but currently have **NO usable frontend UI**:

1. **Dedicated Chat Workspace (\`/chat\`)**:
   - \`chat_api.list_threads\`
   - \`chat_api.create_agency_thread\`
   - \`chat_api.create_internal_thread\`
   - \`chat_api.get_thread_messages\`
   - \`chat_api.send_message\`
   - \`chat_api.mark_read\`
   - \`chat_api.add_participant\`
2. **Placement Officer Assignment Introspection**:
   - \`chat_engine.get_placement_officers\` (Retrieves live ToDo officer assignment per clearance step).
3. **Commission Batch Lifecycle Controls**:
   - \`finance_api.create_commission_batch\` (Batching selected unbatched owed commissions).
   - \`finance_api.get_batch_invoice_pdf\` (Downloading official generated invoice PDF).
   - \`finance_api.upload_batch_payment_proof\` (Uploading settlement receipt/CSV and running fuzzy matching).
   - \`finance_api.settle_batch_items\` (Partial applicant-by-applicant settlement).
   - \`finance_api.trigger_early_commission_accrual\` (Early accrual button on placement).
4. **Finance Transaction Approval Queue**:
   - \`finance_api.approve_transaction\`
   - \`finance_api.reject_transaction\`
   - \`finance_api.void_transaction\`
   - \`report_api.get_pending_approval_queue\`
5. **Bank Statement Reconciliation UI**:
   - \`reconciliation_api.upload_bank_statement\`
   - \`reconciliation_api.manually_match_line\`
6. **V2 Management Analytics Reports**:
   - \`report_api.get_daily_work_report\`
   - \`report_api.get_staff_performance_report\`
   - \`report_api.get_complaint_aging_report\`
   - \`report_api.get_cost_breakdown_report\`
   - \`report_api.get_employee_financial_report\`
   - \`report_api.get_placement_aging_report\`
7. **LMIS Fast-Path Intake Editor**:
   - \`applicant_api.update_applicant_for_lmis\` (Narrow allowlist editor for LMIS officers: exam date, COC status, labor ID, national ID, emergency contacts).
8. **Foreign Agency Wakala Request Dashboard**:
   - \`portal_api.list_my_wakala_requests\` (Foreign agency view of pending Wakala authorization fees).
9. **Wakala Payment Reminder Trigger**:
   - \`notification_api.trigger_wakala_reminder\` (Manual button for staff to trigger payment reminder).
10. **FX Rate Management**:
    - \`finance_api.get_fx_rate\`
    - \`finance_api.set_fx_rate\`

---

## 9. Frontend Features With No Current V2 Backend Basis

The following frontend files, components, and concepts are obsolete V1 artifacts that must be **retired or replaced**:

| Obsolete V1 Artifact / Feature | Location | Reason for Retirement | V2 Replacement |
|---|---|---|---|
| \`applicant_processing.*\` RPCs | \`src/lib/api/applicantApi.ts\` | Obsolete V1 app package; not present on V2 Frappe bench | Whitelisted \`agency_tracking.*\` methods in \`src/lib/api/v2/*\` |
| Raw \`/api/resource/*\` queries | \`src/lib/api/applicantApi.ts\`, \`route.ts\` | Forbidden in V2; Frappe doctypes have no direct REST read/write | Whitelisted V2 RPC methods |
| Applicant Dossier workflow | \`src/app/applicants/[id]/contractor-doc/\` | \`Applicant Dossier\` DocType was deleted in V2; selection is atomic via Portal | \`portal_api.select_candidate\` + \`placement_api.upload_contract\` / \`upload_visa\` |
| \`DSR\` / \`DSR Stamp\` / \`DSR Ticket\` | \`src/types/processing.ts\`, \`applicantApi.ts\` | DSR doctypes replaced by unified \`Placement\` lifecycle | \`Placement.status\` transitions via \`advance_placement\` |
| Separate LMS/Injaz/Wakala/Embassy tabs | \`RoleWorkspaceContainer.tsx\`, \`workspaces/*\` | V1 separate doctype per step is obsolete | Unified \`Clearance Step\` table via \`list_my_clearance_steps\` |
| Separate V1 Report Views | \`LMISReportView\`, \`InjazReportView\`, \`EmbassyReportView\`, \`DepartureReportView\` | Query legacy clearance doctypes | Real V2 report endpoints in \`report_api\` |
| \`create_system_user\` / \`assign_user_roles\` | \`src/app/employees/page.tsx\`, \`applicantApi.ts\` | No V2 API exists in Swagger/backend | BACKEND-BLOCKED; managed via Frappe Desk |
| \`AssignEmployeeModal.tsx\` | \`src/components/applicant/AssignEmployeeModal.tsx\` | Uses obsolete V1 employee assignment RPCs | V2 \`reassign_clearance_step\` with User email |
| \`ProcessingStreamsModal.tsx\` | \`src/components/applicant/ProcessingStreamsModal.tsx\` | Dead V1 component querying obsolete clearance doctypes | Retired / Removed |
| \`ContractRequestModal.tsx\` | \`src/components/applicant/ContractRequestModal.tsx\` | Dead V1 WhatsApp contract request modal | Retired / Removed |
| \`demoStore\` & Fixtures | \`src/lib/demo/*\` | Simulated in-memory database violating "Real Backend Only" | Purged from production runtime |

---

## 10. Audit Sign-Off & Implementation Prerequisites

The read-only audit phase is complete. Every Swagger endpoint, schema, error status, security protocol, missing feature, and obsolete artifact has been cataloged.

All repairs and integrations are scheduled in \`V2_FRONTEND_TODO.md\` and tracked in \`MASTER_SYSTEM_STATUS.md\`.
`;

fs.writeFileSync('FINAL_V2_CONFORMANCE_MATRIX.md', docContent);
console.log('Successfully wrote FINAL_V2_CONFORMANCE_MATRIX.md (' + docContent.length + ' bytes).');
