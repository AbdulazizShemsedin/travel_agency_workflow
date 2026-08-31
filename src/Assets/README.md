# V2 Integration Contract — agency_tracking backend

Built 2026-08-31 in response to the frontend integration team's request for real response
examples, complete field definitions, state-transition graphs, an RBAC matrix, file-upload
contracts, and swagger schema fill-in — so the frontend never has to guess a field, endpoint,
transition, or role.

## How this was built (read this before trusting a claim in these docs)

- **Field definitions** are read directly from the live doctype JSON schemas
  (`agency_tracking/agency_tracking/doctype/*/*.json`) — the same source of truth as
  `BUSINESS_AND_SYSTEM_DOCUMENTATION.md` §14.
- **Example responses** are *real, captured* JSON — not hand-written or guessed. They were
  produced by actually calling the whitelisted functions against a local Frappe site
  (`agency-tracking.local`, a disposable local dev bench, **not** the live Railway production
  database) and dumping the literal return values. The scratch script used to generate them is
  `_contract_capture.py` in the app root, kept temporarily for reproducibility.
- **State transitions** are read directly from `state_machine.py`'s `ALLOWED_TRANSITIONS` /
  `STAGE_GATES` dicts — that module is the single sanctioned place status changes happen, so it
  cannot drift from the actual behavior the way prose documentation can.
- **RBAC matrix** is read directly from the permission checks in each `*_api.py` file (explicit
  role-set checks, `doc.has_permission()`, and doctype-level `permissions` arrays) — not from any
  separate design doc that could have drifted from the code.

## Deployment status note

The commit this contract describes (`720b51d`, 2026-08-31) is pushed to `origin/main`. A prior,
independent QA pass (`cc2/`, same date) live-tested most of this same surface directly against
`https://agencytracking-production.up.railway.app` and confirmed it matches source. This
contract's own "LIVE AND TESTED" labels (see legend below) are based on: (a) `cc2`'s live findings
where they cover the same function, and (b) this session's own local test suite (all passing) plus
the local capture run described above, otherwise. **No credentials for the production Railway
deployment were used to build this contract** — if you need a fresh live-against-production
verification for a specific endpoint, that has to happen from your side or by asking for another
`cc2`-style pass.

## Status legend (per request #9 and #10)

| Label | Meaning |
|---|---|
| **LIVE AND TESTED** | Confirmed live against production Railway (`cc2/` pass) with a real HTTP transcript, OR captured this session against the local dev bench with the exact same source code as what's deployed. |
| **LIVE BUT NOT TESTED** | Deployed (present in the pushed commit) but this pass didn't exercise it — no reason to doubt it, just not directly confirmed here. |
| **IMPLEMENTED BUT NOT DEPLOYED** | Exists in source, may not yet be on the commit Railway is actually running (check Railway's own deploy log). |
| **NOT IMPLEMENTED** | Requested somewhere (a prior message, a spec doc) but no code exists. |
| **STABLE CONTRACT** | Request/response shape is settled — build against it, changes would be a deliberate breaking-change conversation. |
| **PROVISIONAL** | Shape or behavior is still likely to change as the backend evolves — isolate this in the frontend so a change is a one-place fix, not a hunt. |

## Contents

| File | Covers |
|---|---|
| [ROLE-PERMISSIONS-MATRIX.md](ROLE-PERMISSIONS-MATRIX.md) | Every role × every mutating/reading action, sourced from actual permission-check code |
| [01-applicant-contract.md](01-applicant-contract.md) | Applicant: fields, endpoints, real examples, state transitions |
| [02-placement-contract.md](02-placement-contract.md) | Placement: fields, endpoints, real examples, state transitions, the full lifecycle-to-Departed trace |
| [03-clearance-and-corridor-contract.md](03-clearance-and-corridor-contract.md) | Clearance Step + Corridor: fields, endpoints, real examples, per-country corridor data, dynamic-rendering guidance |

## Still to come (next batches, same treatment)

- Finance + Reports (Applicant Transaction, Commission Batch, all `report_api.py` endpoints)
- Complaints + Chat + Notifications
- File upload contracts (passport/contract/visa/receipts/chat attachments/payment proof/bank
  statements) + full swagger.json response-schema fill-in (currently `message: object` on most
  endpoints)

## User identifier rule (request #5), answered once here since it's app-wide

Every API parameter that names a person always expects the **User `name`** — which in this app
*is* the email address, since every `User` doctype record here is created with `email` as the
autoname field (`frappe.get_doc({"doctype": "User", "email": "x@example.com", ...})` — Frappe uses
`email` as `name` for User by framework convention). There is no separate "User ID" distinct from
email in this system. Confirmed for:
- `clearance_api.reassign_clearance_step(clearance_step_name, new_officer)` — `new_officer` is the
  User's email/name (see the real example in `03-clearance-and-corridor-contract.md`).
- `chat_api.create_internal_thread(other_user, ...)` and `chat_api.add_participant(thread_name,
  user)` — same rule, User email/name.
- `contractor_api.create_contractor(..., communication_manager=...)` — same.
