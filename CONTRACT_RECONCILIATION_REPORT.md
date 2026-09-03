# V2 Contract Reconciliation Report: Hardening & Feature Changes (2026-09)

**Date**: 2026-09-03  
**Active Production Backend**: `https://agencytracking-production.up.railway.app`  
**Active Git Branch**: `production_version_non_mock`  
**Audit Baseline**: `CHANGES_HARDENING_AND_FEATURES.md` vs `src/Assets/openapi 3.1.0.txt` vs Live Deployed Railway Backend Runtime Probes.

---

## Executive Summary & Source Hierarchy

Per our strict project rules, the sources of truth were evaluated in this authoritative order:
1. **Actual deployed Railway backend behavior** (verified via direct live HTTPS runtime probes)
2. **Backend change specification**: `src/Assets/CHANGES_HARDENING_AND_FEATURES.md`
3. **OpenAPI / Swagger specifications**: `src/Assets/openapi 3.1.0.txt`, `src/Assets/new swagger.json`
4. **Existing frontend V2 wrappers**: `src/lib/api/v2/*`

### Discrepancy Findings:
- **`openapi 3.1.0.txt` and `new swagger.json` are historical baselines**: They were generated prior to the 2026-09 hardening and feature additions (`storage_engine`, `list_new_complaints`, `list_complaints`, `record_batch_advance`, `get_vapid_public_key`, `regenerate_vapid_keys`).
- **`CHANGES_HARDENING_AND_FEATURES.md` reflects the active deployed backend code**: All 6 new endpoints are fully deployed, operational, and responding on Railway (`https://agencytracking-production.up.railway.app`).
- **Database Schema on Railway is live and verified**: The `Commission Batch Request` DocType has the 4 new columns (`advance_amount`, `advance_reference`, `advance_received_on`, `balance_due_birr`), verified via live schema query returning HTTP 200.

---

## Reconciled Endpoint Inventory

### 1. `get_vapid_public_key`
- **Path**: `/api/method/agency_tracking.notification_api.get_vapid_public_key`
- **HTTP Method**: `GET`
- **OperationId**: `agency_tracking.notification_api.get_vapid_public_key`
- **Auth / RBAC**: Any authenticated user session (`login` required).
- **Request Parameters**: None.
- **Live Response**:
  ```json
  {
    "message": {
      "vapid_public_key": "BK7wD9w5..."
    }
  }
  ```
- **Discrepancy Resolution**: Replaces the frontend hardcoded dummy VAPID key in `PushNotificationToggle.tsx`.
- **Frontend Action**: Implement `getVapidPublicKeyV2()` in `src/lib/api/v2/notifications.ts` and use it dynamically in `PushNotificationToggle.tsx`.

---

### 2. `regenerate_vapid_keys`
- **Path**: `/api/method/agency_tracking.notification_api.regenerate_vapid_keys`
- **HTTP Method**: `POST`
- **OperationId**: `agency_tracking.notification_api.regenerate_vapid_keys`
- **Auth / RBAC**: `System Manager`, `Administrator`, `Admin`.
- **Request Parameters**: None (`{}`).
- **Behavior**: Invalidates all existing web push subscriptions and generates a new keypair in `Notification Config`.
- **Frontend Action**: Implement `regenerateVapidKeysV2()` in `src/lib/api/v2/notifications.ts` with admin confirmation dialog.

---

### 3. `test_storage_connection`
- **Path**: `/api/method/agency_tracking.storage_engine.test_storage_connection`
- **HTTP Method**: `POST`
- **OperationId**: `agency_tracking.storage_engine.test_storage_connection`
- **Auth / RBAC**: `System Manager`, `Administrator`, `Admin`.
- **Request Parameters**: None (`{}`).
- **Live Response**:
  ```json
  {
    "message": {
      "status": "success",
      "bucket": "tracking-agency",
      "public_url_base": "https://pub-100c69c1933247f4a2508a05854c85d5.r2.dev",
      "message": "Connected to R2 bucket 'tracking-agency' and verified read/write access."
    }
  }
  ```
- **Frontend Action**: Create `src/lib/api/v2/storage.ts` with `testStorageConnectionV2()` and expose a diagnostic health check UI for administrators.

---

### 4. `list_new_complaints`
- **Path**: `/api/method/agency_tracking.complaint_api.list_new_complaints`
- **HTTP Method**: `GET`
- **OperationId**: `agency_tracking.complaint_api.list_new_complaints`
- **Auth / RBAC**: `Complaint Manager`, `Manager`, `System Manager`, `Administrator`, `Admin`.
- **Request Parameters**: None.
- **Live Response**:
  ```json
  {
    "message": [
      {
        "name": "CMP-00003",
        "placement": "PLM-00003",
        "contractor": "QA Test Contractor KW",
        "raised_by": "Foreign Agency",
        "worker_status_at_complaint": "Deployed",
        "description": "bad behavioir",
        "status": "New",
        "creation": "2026-08-31 12:53:34.742252"
      }
    ]
  }
  ```
- **Behavior**: Returns all complaints with status `New`, ordered oldest-first for triage.
- **Frontend Action**: Add `listNewComplaintsV2()` in `src/lib/api/v2/complaints.ts` and add a "New / Triage" inbox tab in `src/app/complaints/page.tsx`.

---

### 5. `list_complaints`
- **Path**: `/api/method/agency_tracking.complaint_api.list_complaints`
- **HTTP Method**: `GET`
- **OperationId**: `agency_tracking.complaint_api.list_complaints`
- **Auth / RBAC**: `Complaint Manager`, `Manager`, `System Manager`, `Administrator`, `Admin`.
- **Request Parameters**:
  - `status` (query param, string, optional): e.g. `New`, `Unresolved`, `Resolved`, `Dismissed`.
- **Live Response**:
  ```json
  {
    "message": [
      {
        "name": "CMP-00001",
        "placement": "PLM-00001",
        "contractor": "QA Test Contractor KW",
        "raised_by": "Foreign Agency",
        "worker_status_at_complaint": "Deployed",
        "description": "QA test complaint",
        "status": "Resolved",
        "resolution_notes": null,
        "resolved_by": "Administrator",
        "resolved_on": "2026-08-30",
        "creation": "2026-08-30 21:41:00.204144"
      }
    ]
  }
  ```
- **Frontend Action**: Add `listComplaintsV2(status?: string)` in `src/lib/api/v2/complaints.ts` and connect it to status filter buttons in `src/app/complaints/page.tsx`.

---

### 6. `record_batch_advance`
- **Path**: `/api/method/agency_tracking.finance_api.record_batch_advance`
- **HTTP Method**: `POST`
- **OperationId**: `agency_tracking.finance_api.record_batch_advance`
- **Auth / RBAC**: `Finance Manager`, `System Manager`, `Administrator`, `Admin`.
- **Request Parameters**:
  - `batch_name` (string, required): e.g. `"CBR-00001"`
  - `advance_amount` (number, required): must be > 0 and <= batch `total_amount_birr`
  - `advance_reference` (string, optional): bank or wire reference
- **Live Validation Evidence**:
  - Sending `{ batch_name: "NON_EXISTENT_PROBE", advance_amount: 100 }` returned HTTP 417 `ValidationError: A valid batch_name is required.` (from `agency_tracking/finance_api.py:243`).
- **Database Fields Confirmed**:
  - `advance_amount`: Currency
  - `advance_reference`: Data
  - `advance_received_on`: Date
  - `balance_due_birr`: Currency
  - `status`: Select (controller transitions `Draft`/`Sent` -> `Partially Settled`)
- **Frontend Action**: Implement `recordBatchAdvanceV2()` in `src/lib/api/v2/finance.ts` and update `src/app/commission/page.tsx` to include an "Advance Payment" modal, display advance fields, and honor server state transitions.

---

## Verification of Hardening & Bugfixes

| Area | Observed Runtime Issue | Reconciled Root Cause | Fixed Architecture |
|---|---|---|---|
| **upload_file 417** | `Attached To DocType: Agency Complaint` | `src/app/agent/complaints/page.tsx` passed non-existent DocType string `"Agency Complaint"` to `uploadFileV2`. | Call `uploadFileV2(file, true)` without dummy doctypes; associate returned `file_url` via `create_complaint`. |
| **Passport Autoscan** | OCR review and autofill | Backend parser endpoint `/api/method/agency_tracking.passport_parser.parse_passport_file` returned HTTP 200 `{ message: {} }`. | Frontend correctly uploads file, passes `file_url` to backend parser, and populates form fields with confirmation review modal. |
| **Pre-auth 400s** | Protected query cascades | React Query hooks previously triggered before user authentication resolved. | Guarded with `enabled: Boolean(authUser)` across tables, queues, and headers. |
| **Sidebar Display** | Role parsing | Foreign Agency role was present on Administrator account in DB. | Auth role normalizer checks `is_internal_staff` properly; internal staff with multiple roles are never locked out of operational links. |
