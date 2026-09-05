# Changes — Commission Defaults & Newly-Exposed Endpoints

_Last updated: 2026-09-04_

This document lists the new / changed API surface for frontend integration. Every endpoint is a
whitelisted Frappe method reached via **`POST /api/method/<dotted.path>`** with a JSON body, a
session cookie (+ `X-Frappe-CSRF-Token`) or an API token. Success responses are wrapped by Frappe as
`{ "message": <payload> }`. Errors come back as HTTP `403` (role/permission), `417`/`400`
(validation), each with `exc`/`_server_messages`.

All of the endpoints below are now documented in both `openapi.yaml` (OpenAPI 3) and `swagger.json`
(Swagger 2.0, served by `agency_tracking.api_docs.get_swagger_spec`).

---

## 1. Agency default commission rates (headline feature)

An agency (**Contractor**) now carries a table of **default commission rates** keyed by
**destination country × entry track × gender**. This lets you configure the four defaults per
country: Muayena Female, Muayena Male, Standard Female, Standard Male. When a placement accrues
commission and has no manual override, the engine looks up the matching row.

### Data model — one rate row

| Field | Type | Values | Notes |
|---|---|---|---|
| `destination_country` | string (Link → Country) | e.g. `Saudi Arabia`, `Kuwait` | required |
| `entry_track` | enum | `Standard` \| `Muayena` | required |
| `gender` | enum | `Male` \| `Female` | required |
| `rate` | number | e.g. `40000` | required |
| `currency` | enum | `Country Currency` \| `SAR` \| `KWD` \| `USD` \| `ETB` \| `AED` \| `QAR` | required |

**`Country Currency`** is a convenience option: instead of hard-coding a currency, store this and the
engine resolves it to the destination country's own currency at accrual time — **`SAR` for Saudi
Arabia, `KWD` for Kuwait**. It's the default for new rows, so one row Just Works for whichever
corridor the placement lands in, and you can't mismatch (e.g. a KWD amount on a Saudi rate). If a
destination country has no known local currency, accrual throws asking for an explicit currency.
Reads (`get_commission_rates`) return the raw stored value (`Country Currency`); the resolution to
SAR/KWD happens only when commission is computed.

### `contractor_api.get_commission_rates`
Read an agency's configured default rate table.

- **Roles:** Manager, Admin, Finance Manager, Registrar, System Manager
- **Request:** `{ "contractor": "<Contractor name>" }` (aliases accepted: `name`, `contractor_name`)
- **Response (`message`):** array of rate rows (fields above), ordered by
  `destination_country, entry_track, gender`.

### `contractor_api.set_commission_rates`
Replace (full overwrite) an agency's default rate table.

- **Roles:** Manager, Admin, Finance Manager, Registrar, System Manager
- **Request:**
  ```json
  {
    "contractor": "<Contractor name>",
    "rates": [
      {"destination_country": "Saudi Arabia", "entry_track": "Standard", "gender": "Female", "rate": 5000, "currency": "Country Currency"},
      {"destination_country": "Saudi Arabia", "entry_track": "Standard", "gender": "Male",   "rate": 5500, "currency": "Country Currency"},
      {"destination_country": "Kuwait",       "entry_track": "Muayena",  "gender": "Female", "rate": 600,  "currency": "Country Currency"},
      {"destination_country": "Saudi Arabia", "entry_track": "Muayena",  "gender": "Male",   "rate": 45000, "currency": "ETB"}
    ]
  }
  ```
  `rates` may also be sent as a JSON-encoded string. Every row is validated (track / gender /
  currency against the allowed sets; `destination_country` and `rate` required) — one bad row
  rejects the whole call.
- **Response (`message`):** the stored rows (same shape as `get_commission_rates`).
- **Frontend note:** this is a **replace**, not a merge. Always send the complete desired table
  (typically 4 rows per destination country the agency serves).

### Behavioral change — commission resolution at accrual
`finance_engine.get_commission_rate(placement)` now resolves in this order:

1. If the placement has **both** `manual_commission_amount` and `manual_commission_currency`, that
   wins (one-off / negotiated deals) — for **any** track.
2. Otherwise it falls back to the agency default row matching the applicant's
   `destination_country` + `entry_track` + `gender`.

> 🛠 **Deploy note:** the `Contractor Commission Rate` child doctype changed (new `currency`
> option + default), so run **`bench --site <site> migrate`** after deploying — the Select
> validation rejects `Country Currency` until the doctype meta is synced.

> ⚠️ **Muayena is no longer forced to be manual.** Previously a Muayena placement with no manual
> amount threw an error. Now it falls back to the Muayena default rows just like Standard. If no
> matching default row exists, accrual throws
> `No default commission rate configured for <contractor> / <country> / <track> / <gender>.`

---

## 2. Session bootstrap now returns tenant context

### `auth_api.get_current_user` (aka "get me")
Response (`message`) gained two fields so a Foreign Agency SPA knows its own tenant directly from
the session bootstrap (no more inferring it from an unrelated call):

| Field | Type | Notes |
|---|---|---|
| `user` | string | session email |
| `full_name` | string | |
| `roles` | string[] | |
| `contractor` | string \| null | **new** — linked Contractor for Foreign Agency users; `null` for internal staff / unlinked |
| `is_internal_staff` | boolean | **new** — branch portal vs desk-style views without re-deriving role sets client-side |

Guest (no session) still returns `null` (HTTP 200), so a cold page-load bootstrap check is safe.

---

## 3. Other newly-exposed endpoints (previously undocumented)

### `contractor_api` / auth
- **`auth_api.get_assignable_roles`** — Roles: Manager, Admin, Finance Manager, System Manager.
  No params. Returns `string[]` of the app's own roles (for a role-assignment picker), not Frappe's
  ~30 generic built-ins.

### Placements — `placement_api`
- **`get_placement`** — Request `{ "placement_name": "<name>" }` (optional; falls back to first
  placement). Enforces the doctype's own read permission. Returns the full Placement doc.
- **`update_placement_parsed_fields`** — Roles: Contract Parser, Manager, Admin, System Manager.
  Hand-edit parsed contract/visa identifiers (primarily `visa_number`, the Injaz left barcode).
  Request `{ "placement_name": "<name>", "<field>": "<value>", ... }`. **Only** these fields are
  accepted (everything else, including status/applicant/contractor, is ignored):
  `visa_number, visa_type, visa_issue_date, visa_expiry_date, visa_reference_number,
  contract_number, contract_signed_date, employer_name, employer_national_id, employer_address,
  saudi_agency_name, saudi_agency_license, kuwait_agency_name, kuwait_agency_license,
  employment_site, contract_duration` (+ any additional entries in `PARSED_EDITABLE_FIELDS`).
  Terminal placements are rejected. Returns the updated Placement doc.

### Clearance — `clearance_api`
- **`assign_clearance_step`** — Roles: Manager, Admin, Clearance Officer, System Manager.
  Request `{ "clearance_step_name": "<name>", "user": "<officer email>" }`
  (aliases: `step_name`/`name`, `assigned_to`). Assigns/reassigns the step (creates the officer's
  ToDo). Returns `{ status, clearance_step, assigned_to }`.
- **`list_assigned_steps`** — alias of `list_my_clearance_steps`; the steps assigned to the calling
  officer with placement/applicant context. No params.
- **`render_injaz_pdf`** — Roles: management, the assigned officer, or the step's mapped country
  role. Request `{ "clearance_step_name": "<name>" }`. **Saudi Arabia placements only.**
  Returns a **PDF file download** (`Content-Disposition` attachment), not JSON — request it as a
  blob/binary, not `res.json()`.

### CV — `cv_api`
- **`render_cv_pdf`** — Request `{ "applicant_name": "<name>" }` (optional; falls back to first
  applicant in `CV Generated`). Returns a **PDF file download** (blob), not JSON.

### Finance — `finance_api`
- **`fetch_fx_rates_now`** — Roles: Finance Manager, Admin, System Manager. No params. Manually
  pulls live FX rates now (Global mode). Returns `{ "recorded": { "<CUR>": <rate_to_birr>, ... },
  "count": <n> }` — empty/`0` if the source was unreachable (existing cache stands).
- **`record_batch_advance`** — Roles: Finance Manager, Admin. Record a partial/advance payment on a
  commission batch. Request `{ "batch_name": "<name>", "advance_amount": <number>,
  "advance_reference": "<optional>" }`. Must be `> 0` and `<=` the batch total (use `settle_batch`
  for full settlement). Flips an open batch to **Partially Settled** and recomputes
  `balance_due_birr`.

---

## Handling PDF/file endpoints on the frontend

`render_injaz_pdf`, `render_cv_pdf`, and the existing `get_batch_invoice_pdf` stream a file
(`frappe.response.type = "download"`). Fetch them expecting a binary body:

```js
const res = await fetch("/api/method/agency_tracking.cv_api.render_cv_pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf },
  body: JSON.stringify({ applicant_name }),
});
const blob = await res.blob(); // NOT res.json()
```

---

## Verification

`agency_tracking/_verify_commission.py` (`bench execute agency_tracking._verify_commission.run`)
exercises the full path against the real DB (inside a rolled-back transaction): stores the 4
Standard/Muayena × Male/Female defaults, then confirms `get_commission_rate` resolves each
track/gender to the right rate and that a manual amount overrides the default. All checks pass.
