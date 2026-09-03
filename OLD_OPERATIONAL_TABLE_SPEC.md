# OLD OPERATIONAL TABLE SPECIFICATION (GIT BASELINE)

> **Source Baseline**: Git Commit `5d3598a` (`origin/backend-v2-integration`) and `8f412b7` (`production_version_non_mock` pre-wipe).  
> **Source Components**:  
> - `src/components/operational/RoleWorkspaceContainer.tsx`  
> - `src/components/operational/OperationalTable.tsx`  
> - `src/components/operational/OperationalDrawer.tsx`  
> - `src/components/operational/workspaces/LMISWorkspace.tsx`  
> - `src/components/operational/workspaces/InjazWorkspace.tsx`  
> - `src/components/operational/workspaces/EmbassyWorkspace.tsx`  
> - `src/components/operational/workspaces/WakalaWorkspace.tsx`  
> - `src/components/operational/workspaces/DepartureWorkspace.tsx`

---

## 1. Top-Level RoleWorkspaceContainer UX & Tabs

### Workspace Tab Configuration
The workspace container provides 5 primary operational workspaces:

| Tab ID | Tab Label | Icon | Subtitle / Header Info | Component |
|---|---|---|---|---|
| `directory` | **Directory** | `Users` | Candidate Directory & Registration | `ApplicantTable` |
| `lms` | **LMIS Clearance** | `FileCheck2` | LMIS / Labor Market Information System — Ministry & COC compliance | `LMISWorkspace` |
| `injaz` | **Te'shir / Injaz** | `CreditCard` | Te'shir / Injaz MOFA Processing — Saudi MOFA & Biometrics | `InjazWorkspace` |
| `embassy` | **Embassy & Stamping** | `Building2` | Embassy Clearance & Visa Stamping — Diplomatic mission submission & visa sticker | `EmbassyWorkspace` |
| `departure` | **Ticket & Departure** | `Plane` | Flight Ticketing & Airport Departure — Airline booking & Bole Airport dispatch | `DepartureWorkspace` |

*(Note: `WakalaWorkspace` is also available as a specialized view or embedded within Embassy tab per V2 rules)*.

---

## 2. LMIS Workspace Specification (`LMISWorkspace.tsx`)

### Table Metadata
- **Exact Title**: `LMIS / Labor Market Information System`
- **Exact Subtitle**: `Ministry of Labor quota clearance, COC credentials, and document compliance.`
- **Corridors Supported**: `All`, `Saudi Arabia`, `Kuwait`

### Exact Columns & Order (14 Columns)
| # | Header | ID | AccessorKey | Width | Align | Sortable | Visual Cell Content |
|---|---|---|---|---|---|---|---|
| 1 | **NO** | `no` | — | `50px` | Center | No | 1-based row index in mono font |
| 2 | **NAME** | `name` | `fullName` | `200px` | Left | Yes | 2-letter avatar badge + uppercase full candidate name |
| 3 | **PASSPORT** | `passport` | `passportNumber` | `120px` | Left | Yes | Passport number in mono font |
| 4 | **LABOR ID** | `laborId` | `laborId` | `130px` | Left | Yes | Ministry Labor ID / NID or `—` |
| 5 | **CONTRACT DATE** | `contractDate` | `contractDate` | `120px` | Left | Yes | Contract sign date (`YYYY-MM-DD`) or `—` |
| 6 | **DURATION** | `duration` | `duration` | `90px` | Center | Yes | Duration elapsed in days (bold mono) |
| 7 | **MEDICAL** | `medical` | `medicalStatus` | `90px` | Center | Yes | `FIT` (emerald) or `UNFIT` (rose) badge |
| 8 | **MED DATE** | `medDate` | `medicalDate` | `110px` | Left | Yes | GAMCA / clinic exam date or `—` |
| 9 | **MEDI REMAINING** | `mediRemaining` | `medicalRemaining` | `130px` | Center | Yes | `XX DAYS LEFT` with rose highlight if `<= 15` days |
| 10 | **STATUS** | `status` | `lmisStatus` | `110px` | Center | Yes | Badge: `Issued`/`Approved` (emerald), `Rejected` (rose), `Pending` (amber) |
| 11 | **ISSUE DATE** | `issueDate` | `issueDate` | `110px` | Left | Yes | Ministry issuance date or `—` |
| 12 | **CONTACT** | `contact` | `contact` | `150px` | Left | Yes | Candidate / officer phone contact |
| 13 | **REMARK** | `remark` | `remark` | `160px` | Left | Yes | Ministry notes / missing document remarks |
| 14 | **ACTION** | `action` | — | `80px` | Center | No | Outline `Edit` button opening inspection drawer |

### Row Click & Drawer Details
- **Trigger**: Clicking any row or `Edit` button opens `OperationalDrawer`.
- **Drawer Title**: `LMIS / Ministry of Labor Clearance Details`
- **Drawer Header**: Candidate Name, ID, Passport Number, Status Badge, `Save Changes` button.
- **Drawer Sections**:
  1. **Candidate & Contract Context (Read-Only)**:
     - Full Name
     - Passport Number
     - Job Position
     - Destination Country
     - Assigned Contractor
     - Medical Fitness (`FIT` / `UNFIT`)
  2. **LMS Clearance Processing (Editable)**:
     - `LMS Status`: Select dropdown (`Pending`, `Issued`, `Rejected`)
     - `Ministry Issued Date`: Date input (`YYYY-MM-DD`)
     - `Labor ID / Ministry Reference No`: Mono text input (e.g. `LMS-ET-2026-9912`)
     - `Assigned LMIS Officer`: Officer selection dropdown
     - *(Kuwait Corridor / Police Ashara)*: Police Clearance No & Status fields
  3. **Missing Data Request Management**:
     - `Flag Missing Information`: Switch toggle
     - When toggled ON:
       - `Missing Document Type`: Select (`GAMCA Medical`, `Police Clearance`, `Birth Certificate`, `COC Certificate`, `Passport Copy`, `Yellow Card`)
       - `Missing Data Status`: Select (`Pending`, `Received`)
       - `Operational Notes / Ministry Remarks`: Textarea

---

## 3. Te'shir / Injaz Workspace Specification (`InjazWorkspace.tsx`)

### Table Metadata
- **Exact Title**: `Te'shir / Injaz MOFA Processing`
- **Exact Subtitle**: `Saudi Ministry of Foreign Affairs electronic visa application, fee settlement, and biometric appointment scheduling.`
- **Corridors Supported**: `Saudi Arabia` (and Kuwait Telesign equivalent)

### Exact Columns & Order (Git Baseline)
| # | Header | ID | AccessorKey | Width | Align | Sortable | Visual Cell Content |
|---|---|---|---|---|---|---|---|
| 1 | **#** / **NO** | `index` | — | `50px` | Center | No | 1-based row index in mono font |
| 2 | **CANDIDATE** | `candidate` | `fullName` | `220px` | Left | Yes | Full Name + Candidate ID + Passport Number |
| 3 | **CONTRACT & VISA** | `contract` | `contractNumber` | `180px` | Left | Yes | Contract Number (mono) + Visa Number (emerald mono) |
| 4 | **SPONSOR (KAFEEL)** | `sponsor` | `sponsorName` | `220px` | Left | Yes | Sponsor Name (uppercase) + Sponsor National ID |
| 5 | **INJAZ NO** | `injazNumber` | `injaz` | `130px` | Left | Yes | Injaz Application E-Number (bold blue mono) |
| 6 | **INJAZ PAYMENT** | `injazPayment` | `injazPayment` | `120px` | Center | Yes | Badge: `PAID` (emerald) or `UNPAID` (amber) |
| 7 | **APPOINTMENT DATE** | `appointmentDate` | `appointmentDate` | `140px` | Left | Yes | Scheduled biometrics appointment date |
| 8 | **ACTION** | `action` | — | `140px` | Center | No | `Edit` button + `Injaz` official PDF download button |

### Row Click & Drawer Details
- **Drawer Title**: `Te'shir / MOFA Visa Processing Details`
- **Drawer Header**: Candidate Name, ID, Passport Number, Status Badge (`Completed` / `Pending`), `Save Changes` button.
- **Drawer Sections**:
  1. **Candidate & Contract Dossier Context (Read-Only)**:
     - Full Name, Passport Number, Contract Number, Sponsor / Kafeel Name, Sponsor National ID, MOFA Visa Number, Saudi Partner Agency.
  2. **Te'shir Appointment & Clearance Actions (Editable)**:
     - `Te'shir Appointment Date`: Date input (`YYYY-MM-DD`)
     - `Te'shir Clearance Status`: Select (`Pending (Biometrics Scheduled)`, `Completed (MOFA Biometrics Endorsed)`)
     - `Injaz Application (E-Number)`: Mono text input (e.g. `E4982104`)
     - `Injaz Fee Settlement`: Select (`UNPAID`, `PAID`)
     - `Injaz Payment № / Receipt`: Text input (e.g. `99281401`)
     - `Processing Remark / Notes`: Text input
     - `Assigned Te'shir Officer`: Employee selector
  3. **Official Injaz Document Generation**:
     - `Injaz document`: Generates and downloads official pre-filled Saudi MOFA PDF.
     - `Open Injaz in New Tab`: Opens generated visa form in new tab.

---

## 4. Embassy Workspace Specification (`EmbassyWorkspace.tsx`)

### Table Metadata
- **Exact Title**: `Embassy Clearance & Visa Stamping`
- **Exact Subtitle**: `Physical passport submission to diplomatic missions and visa sticker stamping verification.`
- **Corridors Supported**: `All`, `Saudi Arabia`, `Kuwait`

### Exact Columns & Order (9 Columns)
| # | Header | ID | AccessorKey | Width | Align | Sortable | Visual Cell Content |
|---|---|---|---|---|---|---|---|
| 1 | **NO** | `no` | — | `50px` | Center | No | 1-based index |
| 2 | **NAME** | `name` | `fullName` | `200px` | Left | Yes | Initials badge + full name |
| 3 | **PASSPORT** | `passport` | `passportNumber` | `120px` | Left | Yes | Passport number (bold mono) |
| 4 | **DESTINATION EMBASSY** | `embassyName` | `destinationCountry` | `160px` | Left | Yes | Flag / Embassy name |
| 5 | **WAKALA & VISA NO** | `visaNumber` | `visaNumber` | `160px` | Left | Yes | Visa Number + Wakala Authorization Badge (`Wakala: Authorized`) |
| 6 | **SPONSOR** | `sponsor` | `sponsorName` | `180px` | Left | Yes | Sponsor / Kafeel name |
| 7 | **STATUS** | `status` | `embassyStatus` | `130px` | Center | Yes | Badge: `Approved` (emerald), `Submitted` (blue), `Rejected` (rose), `Pending` (amber) |
| 8 | **EMBASSY FEE** | `feeStatus` | `feeStatus` | `110px` | Center | Yes | Badge: `PAID` (emerald) or `UNPAID` (amber) |
| 9 | **ACTION** | `action` | — | `140px` | Center | No | `Edit` button + `Injaz` PDF button |

### Row Click & Drawer Details
- **Drawer Title**: `Embassy Submission & Stamping Details`
- **Drawer Sections**:
  1. **Candidate & Visa Dossier (Read-Only)**: Full Name, Passport Number, Destination Embassy, Sponsor Name, MOFA / Visa Number, Contract Number.
  2. **Musaned Wakala & Attestation (Read-Only / Context)**: Wakala Authorization Status, Contract Attestation №, Foreign Agency Partner.
  3. **Embassy Submission Details (Editable / Authoritative Actions)**:
     - `Embassy Clearance Status`: Select (`Pending`, `Submitted`, `Approved`, `Rejected`)
     - `Embassy Submission Date`: Date input
     - `Embassy Fee Status`: Select (`Unpaid`, `Paid`)
     - `Fee Receipt №`: Text input
     - `Rejection Cause / Remark`: Text input (required if Rejected)
     - `Assigned Embassy Officer`: Employee selector
  4. **Visa Stamp Registration (DSR Stamp) (Editable)**:
     - `Visa Stamp Number`: Text input (e.g. `1908334046`)
     - `Visa Stamped Date`: Date input
  5. **Official Injaz Document**: Download / View Injaz visa application form.

---

## 5. Wakala Workspace Specification (`WakalaWorkspace.tsx`)

### Table Metadata
- **Exact Title**: `Wakala / Musaned Electronic Authorization`
- **Exact Subtitle**: `Verification of employer electronic power of attorney issued via Musaned Saudi portal.`

### Exact Columns & Order (10 Columns)
| # | Header | ID | AccessorKey | Width | Align | Sortable | Visual Cell Content |
|---|---|---|---|---|---|---|---|
| 1 | **NO** | `no` | — | `50px` | Center | No | 1-based index |
| 2 | **NAME** | `name` | `fullName` | `200px` | Left | Yes | Initials badge + full name |
| 3 | **PASSPORT** | `passport` | `passportNumber` | `120px` | Left | Yes | Passport number |
| 4 | **SPONSOR NAME** | `sponsor` | `sponsorName` | `160px` | Left | Yes | Sponsor name |
| 5 | **VISA #** | `visa` | `visaNumber` | `120px` | Left | Yes | Visa Number |
| 6 | **CONTRACT #** | `contract` | `contractNumber` | `120px` | Left | Yes | Contract Number |
| 7 | **PARTNER AGENCY** | `contractor` | `lockedContractor` | `150px` | Left | Yes | Saudi Contractor Agency |
| 8 | **WAKALA STATUS** | `status` | `wakalaStatus` | `130px` | Center | Yes | Badge: `Authorized` / `Pending` |
| 9 | **CONTACT** | `employee` | `contact` | `130px` | Left | Yes | Assigned contact |
| 10 | **ACTION** | `action` | — | `80px` | Center | No | `Edit` button |

### Drawer & Actions:
- **Left Action**: `Send Musaned Reminder` button (dispatches Wakala WhatsApp reminder).
- **Drawer Fields**: Read-only Sponsor/Contract/Agency context + editable Wakala Authorization / Reference No, status, officer.

---

## 6. Flight Ticketing & Departure Specification (`DepartureWorkspace.tsx`)

### Table Metadata
- **Exact Title**: `Flight Ticketing & Airport Departure`
- **Exact Subtitle**: `Airline booking, PNR registration, pre-departure medical fitness, and Bole Airport dispatch.`

### Exact Columns & Order (16 Columns)
| # | Header | ID | AccessorKey | Width | Align | Sortable | Visual Cell Content |
|---|---|---|---|---|---|---|---|
| 1 | **NO** | `no` | — | `50px` | Center | No | 1-based index |
| 2 | **LABOR ID** | `laborId` | `laborId` | `120px` | Left | Yes | Ministry Labor ID |
| 3 | **NAME** | `name` | `fullName` | `200px` | Left | Yes | Initials badge + full name |
| 4 | **PASSPORT** | `passport` | `passportNumber` | `120px` | Left | Yes | Passport number |
| 5 | **CONTRACT** | `contract` | `contractDate` | `110px` | Left | Yes | Contract sign date |
| 6 | **DURATION** | `duration` | `duration` | `90px` | Center | Yes | Elapsed days |
| 7 | **VISA #** | `visaNumber` | `visaNumber` | `130px` | Left | Yes | Visa Number |
| 8 | **SPONSOR NAME** | `sponsorName` | `sponsorName` | `160px` | Left | Yes | Sponsor name |
| 9 | **SPONSOR ID** | `sponsorId` | `sponsorId` | `160px` | Left | Yes | Sponsor national ID |
| 10 | **TELEPHONE** | `telephone` | `telephone` | `130px` | Left | Yes | Phone number |
| 11 | **COMPANY** | `company` | `company` | `150px` | Left | Yes | Partner agency |
| 12 | **LMIS STATUS** | `lmisStatus` | `lmisStatus` | `110px` | Center | Yes | LMIS Badge |
| 13 | **EMBASSY STATUS** | `embassyStatus` | `embassyStatus` | `130px` | Center | Yes | Embassy Stamped Badge |
| 14 | **TICKET** | `ticket` | `ticketStatus` | `130px` | Center | Yes | Ticket Number / Booked badge |
| 15 | **HOUSE / REMARK** | `jobRemark` | `jobApplied` | `140px` | Left | Yes | Target job or remark |
| 16 | **ACTION** | `action` | — | `80px` | Center | No | `Edit` button |
