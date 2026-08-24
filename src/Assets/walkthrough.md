# Walkthrough: Admin User, Role & Permission Management Wrapper APIs

Implemented a secure, atomic, and comprehensive suite of administrative wrapper endpoints designed specifically for the Custom Frontend Admin Dashboard.

## Summary of Completed Endpoints

The endpoints are defined in [user_admin.py](file:///c:/Users/fdv/frappe-bench/apps/applicant_processing/applicant_processing/applicant_processing/utils/user_admin.py) and re-exported in [api.py](file:///c:/Users/fdv/frappe-bench/apps/applicant_processing/applicant_processing/applicant_processing/api.py).

### 1. `create_system_user`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.create_system_user`
- **Method:** `POST`
- **Description:** 1-call atomic creation of a user profile, immediate password hashing, role assignment, and automatic `User Permission` linking for Partner Agencies (`Contractor`).
- **Payload:**
  ```json
  {
    "email": "officer@example.com",
    "first_name": "Ahmed",
    "last_name": "Ali",
    "phone": "+966500000001",
    "roles": ["LMS Employee"],
    "password": "InitialPassword123!",
    "contractor": null,
    "user_type": "System User",
    "send_welcome_email": false
  }
  ```

### 2. `update_system_user`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.update_system_user`
- **Method:** `POST`
- **Description:** Updates profile fields, enables/disables accounts (`enabled: 0/1`), updates roles, or updates contractor bindings.

### 3. `set_user_password`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.set_user_password`
- **Method:** `POST`
- **Description:** Admin password reset with optional session termination (`logout_all_sessions`).

### 4. `assign_user_roles`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.assign_user_roles`
- **Method:** `POST`
- **Description:** Appends or synchronizes (`replace: true`) system roles for a user.

### 5. `manage_user_permission`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.manage_user_permission`
- **Method:** `POST`
- **Description:** Manages granular data restrictions (`list`, `add`, `remove` permissions e.g., restricting a user to a specific `Contractor`).

### 6. `get_system_users`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.get_system_users`
- **Method:** `GET` / `POST`
- **Description:** Returns paginated user records with active status, assigned roles, linked contractor, and search keyword support.

### 7. `get_available_roles`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.get_available_roles`
- **Method:** `GET` / `POST`
- **Description:** Returns curated system roles with UI labels and descriptions (`System Manager`, `LMS Employee`, `Accounts Manager`, `Foreign Agency`, `Wakala Officer`, `Injaz Officer`, `Embassy Officer`).

### 8. `get_user_detail`
- **Path:** `/api/method/applicant_processing.applicant_processing.api.get_user_detail`
- **Method:** `GET` / `POST`
- **Description:** Fetches comprehensive single-user profile, roles, active sessions, and data restrictions.

---

## Verification & Test Results

An automated end-to-end test script was executed against the database:
- **Test File:** [`test_user_admin_api.py`](file:///c:/Users/fdv/frappe-bench/apps/applicant_processing/applicant_processing/applicant_processing/scratch/test_user_admin_api.py)
- **Output:**
  ```text
  === STARTING USER ADMIN API TESTS ===
  1. Testing get_available_roles...
     Roles found: 7
  2. Testing create_system_user for internal staff...
     Created user: test_staff_auto_001@example.com, roles: ['LMS Employee']
     Password authentication verified successfully!
  3. Testing update_system_user...
     Updated profile and roles successfully.
  4. Testing set_user_password...
     Password update verified successfully!
  5. Testing Foreign Agency creation with Contractor link...
     Created agency user: test_agency_auto_001@example.com, contractor: Tutu
  6. Testing manage_user_permission...
     Permissions found for agency user: 1
  7. Testing get_system_users...
     Search matched 1 users.
  8. Testing get_user_detail...
     User details retrieved: test_agency_auto_001@example.com, roles: ['Foreign Agency']
  9. Cleaning up test accounts...
  === ALL TESTS PASSED SUCCESSFULLY! ===
  ```
