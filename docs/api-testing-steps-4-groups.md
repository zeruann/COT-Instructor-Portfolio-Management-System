# Thunder Client Testing Guide — All 153 Figures (4 Groups, Isolated Test DB)

> **Prerequisites & Test Environment (`cotportfolio_test`):**
> 1. Make sure you are on branch `feat/apiDocu-testing-temp-db`, then start the test server inside `server\`:
>    ```bash
>    npm run dev:test
>    ```
>    *(Your live `cotportfolio` DB is untouched. Re-seed anytime with `npm run seed:test`, or wipe test data when done with `npm run drop:test`.)*
> 2. **`recaptchaEnabled` is pre-set to `false`** in `cotportfolio_test`, so login requests work directly in Thunder Client without browser reCAPTCHA.
> 3. **Generate Fresh Local Bearer Tokens (never stored in Git):**
>    Inside `server\`, run the following command (reads `cotportfolio_test` without modifying any data, and writes local tokens to gitignored `server/scripts/test-session-info.txt`):
>    ```bash
>    npm run tokens:test
>    ```
>    That gives you fresh 24h JWT tokens for all 4 test accounts:
>    * **`INSTRUCTOR_TOKEN`** — `instructor.test@buksu.edu.ph` (id: `6b08458d4b2f5c4df8c22c34`, has limited `adminAccess`)
>    * **`ADMIN_TOKEN`** — `admin.test@buksu.edu.ph` (id: `6b08458d4b2f5c4df8c22c33`)
>    * **`REGULAR_INSTRUCTOR_TOKEN`** — `regular.test@buksu.edu.ph` (id: `6b08458d4b2f5c4df8c22c36`, `adminAccess` disabled)
>    * **`EMPTY_PROFILE_TOKEN`** — `emptyprofile.test@buksu.edu.ph` (id: `6b08458d4b2f5c4df8c22c37`, for `POST /api/profile/`)
> 4. **Test Password for all seeded accounts:** `TestPass@123`
> 5. In Thunder Client, set **Auth → Bearer** and paste the required token. Switch **Auth → None** (or clear the header) whenever a step says **Clear Auth header** to trigger `401 Unauthorized` (`{ "message": "Not authenticated." }`).

---

## Group 1: Figures `2.1.1-1` to `2.4.5-2` (39 Figures)

### 2.1 Authentication & Session API

#### 2.1.1 User Login — `POST http://localhost:5000/api/auth/login`
* **Figure 2.1.1-1 (200 OK):**
  ```json
  {
    "email": "instructor.test@buksu.edu.ph",
    "password": "TestPass@123"
  }
  ```
  **Expected Result (`200 OK`):**
  ```json
  {
    "token": "<jwt_token>",
    "instructor": {
      "id": "6b08458d4b2f5c4df8c22c34",
      "fullName": "Test Instructor Account",
      "email": "instructor.test@buksu.edu.ph",
      "accountType": "Instructor",
      "activeRole": "instructor",
      "accountStatus": "Active",
      "onlineStatus": "Online"
    }
  }
  ```
* **Figure 2.1.1-2 (Error 401):**
  ```json
  {
    "email": "instructor.test@buksu.edu.ph",
    "password": "wrongpassword"
  }
  ```
  **Expected Result (`401 Unauthorized`):**
  ```json
  { "message": "Invalid email or password" }
  ```

#### 2.1.2 Google OAuth Login — `POST http://localhost:5000/api/auth/google`
* **Figure 2.1.2-1 (200 OK):** *(Copy Google `credential` from browser Network tab)*
  ```json
  {
    "credential": "<google_id_token_from_browser_network_tab>"
  }
  ```
  **Expected Result (`200 OK`):** `{ "token": "<jwt_token>", "instructor": { ... } }`
* **Figure 2.1.2-2 (Error 401):**
  ```json
  {
    "credential": "invalid-google-token"
  }
  ```
  **Expected Result (`401 Unauthorized`):** `{ "message": "Google authentication failed" }` (or error `message`)

#### 2.1.3 User Logout — `POST http://localhost:5000/api/auth/logout`
* **Figure 2.1.3-1 (200 OK):** Auth: Bearer `REGULAR_INSTRUCTOR_TOKEN`, Body: none.
  **Expected Result (`200 OK`):** `{ "message": "Logged out successfully" }`

#### 2.1.4 Session Heartbeat — `POST http://localhost:5000/api/auth/heartbeat`
* **Figure 2.1.4-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`, Body: none.
  **Expected Result (`200 OK`):** `{ "ok": true }`
* **Figure 2.1.4-2 (Error 401):** Clear Auth header and click **Send**.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.1.5 Switch Active Role Mode — `POST http://localhost:5000/api/auth/switch-mode`
* **Figure 2.1.5-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "targetRole": "admin",
    "password": "TestPass@123"
  }
  ```
  **Expected Result (`200 OK`):** `{ "token": "<new_jwt_token>", "activeRole": "admin", "instructor": { ... } }`
* **Figure 2.1.5-2 (Error 401 / 403):** *(Wrong password with `INSTRUCTOR_TOKEN` → `401`; using `REGULAR_INSTRUCTOR_TOKEN` → `403`)*
  ```json
  {
    "targetRole": "admin",
    "password": "wrongpassword"
  }
  ```
  **Expected Result (`401` or `403`):** JSON `{ "message": "..." }`

#### 2.1.6 Forgot Password (Send OTP) — `POST http://localhost:5000/api/auth/forgot-password`
* **Figure 2.1.6-1 (200 OK):**
  ```json
  {
    "email": "instructor.test@buksu.edu.ph"
  }
  ```
  **Expected Result (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Verification code sent to your email.",
    "email": "instructor.test@buksu.edu.ph"
  }
  ```
* **Figure 2.1.6-2 (Error 404):**
  ```json
  {
    "email": "notregistered@buksu.edu.ph"
  }
  ```
  **Expected Result (`404 Not Found`):** `{ "message": "No account found with this email address." }`

#### 2.1.7 Verify Password Reset OTP — `POST http://localhost:5000/api/auth/verify-reset-otp`
* **Figure 2.1.7-1 (200 OK):** *(Use an account whose real inbox received the 6-digit OTP from `2.1.6`; copy `resetToken`)*
  ```json
  {
    "email": "<email_with_real_inbox>",
    "otp": "<6_digit_otp_from_email>"
  }
  ```
  **Expected Result (`200 OK`):** `{ "success": true, "message": "Code verified successfully.", "resetToken": "<hex_token>" }`
* **Figure 2.1.7-2 (Error 401):**
  ```json
  {
    "email": "instructor.test@buksu.edu.ph",
    "otp": "000000"
  }
  ```
  **Expected Result (`401 Unauthorized`):** JSON `{ "message": "..." }`

#### 2.1.8 Reset Password — `POST http://localhost:5000/api/auth/reset-password/:token`
* **Figure 2.1.8-1 (200 OK):** Replace `:token` with `<resetToken>` from `2.1.7-1`
  ```json
  {
    "newPassword": "NewPassword@123"
  }
  ```
  **Expected Result (`200 OK`):** `{ "message": "Password reset successful" }`
* **Figure 2.1.8-2 (Error 400):** Replace `:token` with `<resetToken>` (or any token string)
  ```json
  {
    "newPassword": "weak"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

---

### 2.2 Profile Management API

#### 2.2.1 Get Own Profile — `GET http://localhost:5000/api/profile/me`
* **Figure 2.2.1-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):**
  ```json
  {
    "_id": "6b08458d4b2f5c4df8c22c34",
    "fullName": "Test Instructor Account",
    "email": "instructor.test@buksu.edu.ph",
    "department": "Information Technology",
    "profile": { ... },
    "accountType": "Instructor",
    "adminAccess": { "enabled": true, "scope": "limited", ... }
  }
  ```
* **Figure 2.2.1-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.2.2 Get Profile by ID
* **Figure 2.2.2-1 (200 OK):** `GET http://localhost:5000/api/profile/6b08458d4b2f5c4df8c22c34` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):**
  ```json
  {
    "_id": "6b08458d4b2f5c4df8c22c34",
    "fullName": "Test Instructor Account",
    "email": "instructor.test@buksu.edu.ph",
    "department": "Information Technology",
    "profile": { ... },
    "accountStatus": "Active",
    "onlineStatus": "Online",
    "createdAt": "..."
  }
  ```
* **Figure 2.2.2-2 (Error 404):** `GET http://localhost:5000/api/profile/650000000000000000000000` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** `{ "message": "Instructor not found." }`

#### 2.2.3 Create Initial Profile — `POST http://localhost:5000/api/profile/`
* **Figure 2.2.3-1 (201 Created):** Auth: Bearer `EMPTY_PROFILE_TOKEN`
  ```json
  {
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "contactNumber": "09171234567"
  }
  ```
  **Expected Result (`201 Created`):**
  ```json
  {
    "message": "Profile created successfully.",
    "profile": {
      "firstName": "Juan",
      "lastName": "Dela Cruz",
      "contactNumber": "09171234567"
    }
  }
  ```
* **Figure 2.2.3-2 (Error 409):** Send the exact same request a second time with `EMPTY_PROFILE_TOKEN` (or `INSTRUCTOR_TOKEN`).
  **Expected Result (`409 Conflict`):** `{ "message": "Profile already exists. Use the update function instead." }`

#### 2.2.4 Update Own Profile — `PUT http://localhost:5000/api/profile/me`
* **Figure 2.2.4-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "contactNumber": "09179998888",
    "address": "Malaybalay City, Bukidnon"
  }
  ```
  **Expected Result (`200 OK`):** Updated `{ "_id", "fullName", "email", "department", "profile", ... }` with `"contactNumber": "09179998888"` and `"address": "Malaybalay City, Bukidnon"`.
* **Figure 2.2.4-2 (Error 400):** Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "photoUrl": "not-a-valid-url"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

#### 2.2.5 Change Password — `PUT http://localhost:5000/api/profile/change-password`
* **Figure 2.2.5-1 (200 OK):** Auth: Bearer `REGULAR_INSTRUCTOR_TOKEN`
  ```json
  {
    "currentPassword": "TestPass@123",
    "newPassword": "Password@1234"
  }
  ```
  **Expected Result (`200 OK`):** `{ "message": "Password changed successfully." }`
* **Figure 2.2.5-2 (Error 400):** Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "currentPassword": "wrongpassword",
    "newPassword": "Password@1234"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

---

### 2.3 Requirements API

#### 2.3.1 List Active Requirements — `GET http://localhost:5000/api/requirements/?scope=faculty`
* **Figure 2.3.1-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** JSON array `[ { "key": "FAC_A_PDS", "checklistRef": "A 1.0", "scope": "faculty", ... }, ... ]`
* **Figure 2.3.1-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.3.2 Get Requirement by Key
* **Figure 2.3.2-1 (200 OK):** `GET http://localhost:5000/api/requirements/CLASS_A_LOAD_REPORT` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** JSON object `{ "key": "CLASS_A_LOAD_REPORT", "checklistRef": "A 1.0", "scope": "class", ... }`
* **Figure 2.3.2-2 (Error 404):** `GET http://localhost:5000/api/requirements/NON_EXISTENT_KEY` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

---

### 2.4 Documents & Portfolios API (Shared View, Stream & Edit)

#### 2.4.1 Get Faculty Portfolio Summary — `GET http://localhost:5000/api/documents/summary/faculty`
* **Figure 2.4.1-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** JSON object keyed by card slug (e.g., `"faculty-profile": { "approved": 1, ... }`, `"educational-attainment": { "pendingReview": 1, ... }`)
* **Figure 2.4.1-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.4.2 List Documents — `GET http://localhost:5000/api/documents/`
* **Figure 2.4.2-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** JSON array `[ { "_id": "6b08458e4b2f5c4df8c22c44", "requirementKey": "FAC_B_BACHELORS_TOR", "status": "pending_review", ... }, ... ]`
* **Figure 2.4.2-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.4.3 Get Document Metadata by ID
* **Figure 2.4.3-1 (200 OK):** `GET http://localhost:5000/api/documents/6b08458e4b2f5c4df8c22c44` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** JSON object with `"_id": "6b08458e4b2f5c4df8c22c44"`, `"requirementKey": "FAC_B_BACHELORS_TOR"`, `"status": "pending_review"`, `"versions": [ ... ]`.
* **Figure 2.4.3-2 (Error 404):** `GET http://localhost:5000/api/documents/650000000000000000000000` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.4.4 Stream Document File
*(Tip: Run `2.14.1` first with `FAC_C_SERVICE_RECORD` and a small PDF, then copy the returned `document._id` here so Google Drive streams a real file!)*
* **Figure 2.4.4-1 (200 OK):** `GET http://localhost:5000/api/documents/<doc_id_from_2.14.1>/file` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** Binary PDF stream previewed/downloaded in Thunder Client (`Content-Type: application/pdf`).
* **Figure 2.4.4-2 (Error 404):** `GET http://localhost:5000/api/documents/650000000000000000000000/file` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.4.5 Update Document Metadata
* **Figure 2.4.5-1 (200 OK):** `PATCH http://localhost:5000/api/documents/6b08458e4b2f5c4df8c22c44` — Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "meta": {
      "title": "Updated Bachelor's Transcript of Records (Test)"
    }
  }
  ```
  **Expected Result (`200 OK`):** `{ "message": "Document updated successfully.", "document": { "_id": "6b08458e4b2f5c4df8c22c44", "meta": { "title": "Updated Bachelor's Transcript of Records (Test)" }, ... } }`
* **Figure 2.4.5-2 (Error 404):** `PATCH http://localhost:5000/api/documents/650000000000000000000000` — Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "meta": {
      "title": "Updated Title"
    }
  }
  ```
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

---

## Group 2: Figures `2.4.6-1` to `2.10.1-2` (38 Figures)

### 2.4 Documents (Continued)

#### 2.4.6 Delete Document
* **Figure 2.4.6-1 (200 OK):** `DELETE http://localhost:5000/api/documents/6b08458e4b2f5c4df8c22c46` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "Document deleted successfully." }`
* **Figure 2.4.6-2 (Error 403 / 404):** `DELETE http://localhost:5000/api/documents/6b08458e4b2f5c4df8c22c45` (`approved` doc as Instructor → `403`), or `650000000000000000000000` (`404`).
  **Expected Result (`403` or `404`):** JSON `{ "message": "..." }`

---

### 2.5 Classes API (Shared View & Archive)

#### 2.5.1 List Classes — `GET http://localhost:5000/api/classes/`
* **Figure 2.5.1-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "classes": [ { "_id": "6b08458d4b2f5c4df8c22c42", "subject": { "code": "IT 345", ... }, ... } ], "summary": { "needsAction": ..., "awaitingReview": ..., "approved": ..., "completion": ... } }`
* **Figure 2.5.1-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.5.2 Get Class by ID
* **Figure 2.5.2-1 (200 OK):** `GET http://localhost:5000/api/classes/6b08458d4b2f5c4df8c22c42` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "class": { "_id": "6b08458d4b2f5c4df8c22c42", ... }, "counts": { "approved": ..., "pendingReview": ..., "rejected": ..., "notSubmitted": ..., "totalRequired": ... }, "completionPercent": ..., "requirementSummary": { ... } }`
* **Figure 2.5.2-2 (Error 404):** `GET http://localhost:5000/api/classes/650000000000000000000000` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.5.3 Archive Class
* **Figure 2.5.3-1 (200 OK):** `POST http://localhost:5000/api/classes/6b08458d4b2f5c4df8c22c42/archive` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "message": "Class archived successfully." }`
* **Figure 2.5.3-2 (Error 404):** `POST http://localhost:5000/api/classes/650000000000000000000000/archive` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.5.4 Unarchive Class
* **Figure 2.5.4-1 (200 OK):** `POST http://localhost:5000/api/classes/6b08458d4b2f5c4df8c22c43/unarchive` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "message": "Class unarchived successfully." }`
* **Figure 2.5.4-2 (Error 404):** `POST http://localhost:5000/api/classes/650000000000000000000000/unarchive` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

---

### 2.6 Academic Periods API (Shared Read)

#### 2.6.1 Get Current Academic Period — `GET http://localhost:5000/api/academic-periods/current`
* **Figure 2.6.1-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "currentPeriod": { "_id": "6b08458d4b2f5c4df8c22c40", "schoolYear": "2026-2027", "semester": "1st", ... }, "formatted": "AY 2026-2027 · 1st Semester" }`
* **Figure 2.6.1-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.6.2 List Academic Periods — `GET http://localhost:5000/api/academic-periods/`
* **Figure 2.6.2-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "periods": [ ... ], "count": 2 }`
* **Figure 2.6.2-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.6.3 Get Academic Period Details
* **Figure 2.6.3-1 (200 OK):** `GET http://localhost:5000/api/academic-periods/6b08458d4b2f5c4df8c22c40/details` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "period": { ... }, "formatted": "...", "summary": { ... }, "subjects": [ ... ], "sections": [ ... ], "instructors": [ ... ] }`
* **Figure 2.6.3-2 (Error 404):** `GET http://localhost:5000/api/academic-periods/650000000000000000000000/details` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

---

### 2.7 Notifications API

#### 2.7.1 List Notifications — `GET http://localhost:5000/api/notifications/`
* **Figure 2.7.1-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** JSON array `[ { "_id": "6b08458e4b2f5c4df8c22c48", ... }, { "_id": "6b08458e4b2f5c4df8c22c47", ... } ]`
* **Figure 2.7.1-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.7.2 Mark All Notifications as Read — `PATCH http://localhost:5000/api/notifications/mark-all-read`
* **Figure 2.7.2-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "message": "All notifications marked as read." }`
* **Figure 2.7.2-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.7.3 Mark Notification as Read
* **Figure 2.7.3-1 (200 OK):** `PATCH http://localhost:5000/api/notifications/6b08458e4b2f5c4df8c22c47/read` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** Updated notification JSON object with `"_id": "6b08458e4b2f5c4df8c22c47"` and non-null `"readAt"`.
* **Figure 2.7.3-2 (Error 404):** `PATCH http://localhost:5000/api/notifications/650000000000000000000000/read` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.7.4 Clear All Notifications — `DELETE http://localhost:5000/api/notifications/clear-all`
*(Run `2.7.5` first before clearing all notifications!)*
* **Figure 2.7.4-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "message": "All notifications deleted.", "deletedCount": 1 }` *(or remaining count)*
* **Figure 2.7.4-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.7.5 Delete Single Notification
* **Figure 2.7.5-1 (200 OK):** `DELETE http://localhost:5000/api/notifications/6b08458e4b2f5c4df8c22c48` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "message": "Notification deleted.", "id": "6b08458e4b2f5c4df8c22c48" }`
* **Figure 2.7.5-2 (Error 404):** `DELETE http://localhost:5000/api/notifications/650000000000000000000000` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

---

### 2.8 Reports API

#### 2.8.1 Get Compliance Report Data — `GET http://localhost:5000/api/reports/compliance/data`
* **Figure 2.8.1-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "instructor": { ... }, "facultyChecklist": [ ... ], "classChecklist": { ... }, "documents": [ ... ] }`
* **Figure 2.8.1-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.8.2 Download Compliance Excel Workbook — `GET http://localhost:5000/api/reports/compliance/excel`
* **Figure 2.8.2-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** Binary `.xlsx` download (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
* **Figure 2.8.2-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.8.3 Export Compliance Report to Google Sheets — `POST http://localhost:5000/api/reports/compliance/sheets`
* **Figure 2.8.3-1 (200 OK):** Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {}
  ```
  **Expected Result (`200 OK`):** `{ "success": true, "message": "Google Sheet exported successfully.", "spreadsheetUrl": "https://docs.google.com/spreadsheets/...", "spreadsheetId": "..." }`
* **Figure 2.8.3-2 (Error 503):** Disable `googleSheetsEnabled` via `2.19.2`, then click **Send** (`503`). *(Re-enable afterwards!)*
  **Expected Result (`503 Service Unavailable`):** JSON `{ "message": "..." }`

---

### 2.9 Public Settings & Audit Logs API

#### 2.9.1 Get Public Settings — `GET http://localhost:5000/api/settings/public`
* **Figure 2.9.1-1 (200 OK):** No Auth needed.
  **Expected Result (`200 OK`):** `{ "recaptchaEnabled": false, "googleAuthEnabled": true, "recaptchaSiteKey": "...", "googleClientId": "..." }`

#### 2.9.2 Get Audit Logs — `GET http://localhost:5000/api/settings/audit-logs?page=1&limit=20`
* **Figure 2.9.2-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** JSON object containing paginated `logs` array (`2` seeded logs + any actions performed during testing) and pagination metadata.
* **Figure 2.9.2-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

---

### 2.10 Resource Locks API (First Endpoint)

#### 2.10.1 Acquire Resource Lock — `POST http://localhost:5000/api/locks/acquire`
* **Figure 2.10.1-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "resourceKey": "document:test-lock-1"
  }
  ```
  **Expected Result (`200 OK`):** `{ "acquired": true, "locked": true, "isOwner": true, "lockedBy": "6b08458d4b2f5c4df8c22c33", "lockedByName": "Test Admin Account", "expiresAt": "..." }`
* **Figure 2.10.1-2 (Error 400):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {}
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

---

## Group 3: Figures `2.10.2-1` to `2.16.4-2` (38 Figures)

### 2.10 Resource Locks & 2.11 Health Check

#### 2.10.2 Release Resource Lock — `POST http://localhost:5000/api/locks/release`
* **Figure 2.10.2-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "resourceKey": "document:test-lock-1"
  }
  ```
  **Expected Result (`200 OK`):** `{ "released": true }`
* **Figure 2.10.2-2 (Error 400):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {}
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

#### 2.10.3 Check Resource Lock Status — `GET http://localhost:5000/api/locks/status?resourceKey=document:test-lock-1`
* **Figure 2.10.3-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "locked": false, ... }` (or `"locked": true` if acquired in `2.10.1`)
* **Figure 2.10.3-2 (Error 400):** `GET http://localhost:5000/api/locks/status` (no `?resourceKey`) — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

#### 2.11.1 Server Greeting / Health Check — `GET http://localhost:5000/api/hello`
* **Figure 2.11.1-1 (200 OK):** No Auth needed.
  **Expected Result (`200 OK`):** `{ "message": "Hello from the server" }`

---

### 2.12 Invitation Onboarding API (Invitee Actions)

#### 2.12.1 Get Invitation by Token
* **Figure 2.12.1-1 (200 OK):** `GET http://localhost:5000/api/invitations/token/07aca995c1afd7bcc5d1b845b6e9476b6a298ce86677363d7107e06c8aab81b8`
  **Expected Result (`200 OK`):** `{ "fullName": "Juan Pending One", "email": "pending1.test@buksu.edu.ph", "department": "Information Technology", "invitedBy": "Test Admin Account", "needsSetup": false }`
* **Figure 2.12.1-2 (Error 404):** `GET http://localhost:5000/api/invitations/token/invalid-token-000`
  **Expected Result (`404 Not Found`):** JSON `{ "message": "...", "code": "INVITATION_NOT_FOUND" }`

#### 2.12.2 Accept Invitation
* **Figure 2.12.2-1 (200 OK):** `PATCH http://localhost:5000/api/invitations/07aca995c1afd7bcc5d1b845b6e9476b6a298ce86677363d7107e06c8aab81b8/accept`
  ```json
  {
    "privacyNoticeVersion": "1.0"
  }
  ```
  **Expected Result (`200 OK`):** `{ "message": "Invitation accepted.", "needsSetup": true }`
* **Figure 2.12.2-2 (Error 409):** Click **Send** a second time on the same token.
  **Expected Result (`409 Conflict`):** JSON `{ "message": "...", "code": "INVITATION_ALREADY_ACCEPTED" }`

#### 2.12.3 Reject Invitation
* **Figure 2.12.3-1 (200 OK):** `PATCH http://localhost:5000/api/invitations/79446550075d6635e86e9c190ed78cfd32cf67f2fb34148b891674debe5c64fc/reject`
  **Expected Result (`200 OK`):** `{ "message": "Invitation rejected.", "needsSetup": false }`
* **Figure 2.12.3-2 (Error 410):** Click **Send** a second time on the rejected token.
  **Expected Result (`410 Gone`):** JSON `{ "message": "..." }`

#### 2.12.4 Complete Account Setup
* **Figure 2.12.4-1 (200 OK):** `POST http://localhost:5000/api/invitations/token/07aca995c1afd7bcc5d1b845b6e9476b6a298ce86677363d7107e06c8aab81b8/setup` *(Run **after** `2.12.4-2` if testing weak password first, or test `2.12.4-2` before consuming token!)*
  ```json
  {
    "password": "Password@123"
  }
  ```
  **Expected Result (`200 OK`):** `{ "message": "Account created. You can now log in." }`
* **Figure 2.12.4-2 (Error 400):** Send **before** `2.12.4-1` with weak password:
  ```json
  {
    "password": "123"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

---

### 2.13 Class Management API

#### 2.13.1 Create Class — `POST http://localhost:5000/api/classes/`
* **Figure 2.13.1-1 (201 Created):** Auth: Bearer `INSTRUCTOR_TOKEN` *(Copy the returned `_id` for `2.13.2` and `2.13.3`)*
  ```json
  {
    "subjectCode": "IT 999",
    "subjectName": "Test Capstone Subject",
    "sectionCode": "T1",
    "sectionName": "BSIT Test Section"
  }
  ```
  **Expected Result (`201 Created`):** Created class JSON object with `"subject": { "code": "IT 999", ... }` and `"_id"`.
* **Figure 2.13.1-2 (Error 409):** Click **Send** again with the exact same payload.
  **Expected Result (`409 Conflict`):** JSON `{ "message": "..." }`

#### 2.13.2 Update Class — `PATCH http://localhost:5000/api/classes/:id`
* **Figure 2.13.2-1 (200 OK):** Replace `:id` with the class ID from `2.13.1-1` — Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "sectionName": "Updated Test Section"
  }
  ```
  **Expected Result (`200 OK`):** Updated class object with `"section.name": "Updated Test Section"`.
* **Figure 2.13.2-2 (Error 404):** `PATCH http://localhost:5000/api/classes/650000000000000000000000` — Auth: Bearer `INSTRUCTOR_TOKEN`
  ```json
  {
    "sectionName": "Updated Test Section"
  }
  ```
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.13.3 Delete Class — `DELETE http://localhost:5000/api/classes/:id`
* **Figure 2.13.3-1 (200 OK):** Replace `:id` with the class ID created in `2.13.1-1` — Auth: Bearer `INSTRUCTOR_TOKEN`.
  **Expected Result (`200 OK`):** `{ "message": "Class deleted completely." }`
* **Figure 2.13.3-2 (Error 404):** Click **Send** again on that deleted ID.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

---

### 2.14 Portfolio Document Upload API

#### 2.14.1 Upload Portfolio Document — `POST http://localhost:5000/api/documents/upload`
* **Figure 2.14.1-1 (201 Created):** Auth: Bearer `INSTRUCTOR_TOKEN`, **Body → Form**:
  * `file` (File): attach a small PDF
  * `requirementKey` (Text): `FAC_C_SERVICE_RECORD`
  **Expected Result (`201 Created`):** `{ "message": "File uploaded successfully.", "document": { "_id": "...", "requirementKey": "FAC_C_SERVICE_RECORD", "status": "pending_review", ... } }`
* **Figure 2.14.1-2 (Error 400):** Uncheck `file` or `requirementKey` and click **Send**.
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

---

### 2.15 Instructor Management & Access Control API

#### 2.15.1 List Instructors — `GET http://localhost:5000/api/instructors/`
* **Figure 2.15.1-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** JSON array of active/accepted instructors (without passwords/tokens).
* **Figure 2.15.1-2 (Error 500):** Temporarily trigger a DB failure (e.g., disconnect network / invalid DB), click **Send** (`500`), then restore.
  **Expected Result (`500 Internal Server Error`):** JSON `{ "message": "..." }`

#### 2.15.2 Get Admin Permissions Metadata — `GET http://localhost:5000/api/instructors/permissions/meta`
* **Figure 2.15.2-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "pages": [ ... ], "facultyDocuments": [ ... ], "classDocuments": [ ... ] }`
* **Figure 2.15.2-2 (Error 401):** Clear Auth header.
  **Expected Result (`401 Unauthorized`):** `{ "message": "Not authenticated." }`

#### 2.15.3 Get Instructor by ID
* **Figure 2.15.3-1 (200 OK):** `GET http://localhost:5000/api/instructors/6b08458d4b2f5c4df8c22c34` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** Instructor JSON object `{ "_id": "6b08458d4b2f5c4df8c22c34", "fullName": "Test Instructor Account", ... }`.
* **Figure 2.15.3-2 (Error 404):** `GET http://localhost:5000/api/instructors/650000000000000000000000` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`404 Not Found`):** `{ "message": "Instructor not found." }`

#### 2.15.4 Update Instructor Account Status
* **Figure 2.15.4-1 (200 OK):** `PATCH http://localhost:5000/api/instructors/6b08458d4b2f5c4df8c22c36/status` — Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "accountStatus": "Deactivated"
  }
  ```
  **Expected Result (`200 OK`):** Updated instructor object with `"accountStatus": "Deactivated"` and `"onlineStatus": "Offline"`. *(Set back to `"Active"` afterwards if still testing `REGULAR_INSTRUCTOR_TOKEN`!)*
* **Figure 2.15.4-2 (Error 400):** Same URL — Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "accountStatus": "InvalidStatus"
  }
  ```
  **Expected Result (`400 Bad Request`):** `{ "message": "Invalid account status." }`

#### 2.15.5 Update Instructor Admin Access
* **Figure 2.15.5-1 (200 OK):** `PATCH http://localhost:5000/api/instructors/6b08458d4b2f5c4df8c22c36/admin-access` — Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "enabled": true,
    "scope": "limited",
    "pages": [
      "review_faculty"
    ]
  }
  ```
  **Expected Result (`200 OK`):** `{ "instructor": { ... }, "emailSent": true, "summary": "..." }`
* **Figure 2.15.5-2 (Error 403):** `PATCH http://localhost:5000/api/instructors/6b08458d4b2f5c4df8c22c33/admin-access` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`403 Forbidden`):** JSON `{ "message": "..." }` (self-modification blocked)

---

### 2.16 Invitation Management API (First 4 Endpoints)

#### 2.16.1 Send Instructor Invitation — `POST http://localhost:5000/api/invitations/`
* **Figure 2.16.1-1 (201 Created):** Auth: Bearer `ADMIN_TOKEN` *(Replace with a real `@buksu.edu.ph` / `@student.buksu.edu.ph` email if SMTP validates recipient delivery)*
  ```json
  {
    "firstName": "New",
    "lastName": "Faculty",
    "email": "newfaculty.test@buksu.edu.ph",
    "department": "Information Technology"
  }
  ```
  **Expected Result (`201 Created`):** Invitation object with `"fullName": "New Faculty"`, `"status": "Pending"`, private fields stripped.
* **Figure 2.16.1-2 (Error 400 / 409):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "firstName": "New",
    "lastName": "Faculty",
    "email": "not-institutional@gmail.com",
    "department": "Information Technology"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "Invitations can only be sent to institutional email addresses (@buksu.edu.ph or @student.buksu.edu.ph)." }`

#### 2.16.2 List Invitations — `GET http://localhost:5000/api/invitations/`
* **Figure 2.16.2-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** JSON array of invitation objects sorted by `dateSent` descending.
* **Figure 2.16.2-2 (Error 500):** Same DB-error test as `2.15.1-2`.
  **Expected Result (`500 Internal Server Error`):** JSON `{ "message": "..." }`

#### 2.16.3 List Accepted Invitations — `GET http://localhost:5000/api/invitations/accepted`
* **Figure 2.16.3-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** JSON array of invitations where `"status": "Accepted"`.
* **Figure 2.16.3-2 (Error 500):** Same DB-error test as `2.15.1-2`.
  **Expected Result (`500 Internal Server Error`):** JSON `{ "message": "..." }`

#### 2.16.4 List Active/Inactive Instructors — `GET http://localhost:5000/api/invitations/active`
* **Figure 2.16.4-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** JSON array of instructors whose `accountStatus` is `"Active"` or `"Inactive"`.
* **Figure 2.16.4-2 (Error 500):** Same DB-error test as `2.15.1-2`.
  **Expected Result (`500 Internal Server Error`):** JSON `{ "message": "..." }`

---

## Group 4: Figures `2.16.5-1` to `2.19.8-2` (38 Figures)

### 2.16 Invitation Management (Continued)

#### 2.16.5 Get Invited Instructor by ID
* **Figure 2.16.5-1 (200 OK):** `GET http://localhost:5000/api/invitations/6b08458d4b2f5c4df8c22c38` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** JSON object `{ "_id": "6b08458d4b2f5c4df8c22c38", "fullName": "Juan Pending One", ... }`.
* **Figure 2.16.5-2 (Error 404):** `GET http://localhost:5000/api/invitations/650000000000000000000000` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.16.6 Resend Invitation
* **Figure 2.16.6-1 (200 OK):** `PATCH http://localhost:5000/api/invitations/6b08458d4b2f5c4df8c22c3a/resend` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** Updated invitation object with `"status": "Pending"` and `"resendCount": 1`.
* **Figure 2.16.6-2 (Error 409):** Click **Send** again on `6b08458d4b2f5c4df8c22c3a` (now `Pending`) — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`409 Conflict`):** JSON `{ "message": "..." }`

#### 2.16.7 Cancel Invitation
* **Figure 2.16.7-1 (200 OK):** `PATCH http://localhost:5000/api/invitations/6b08458d4b2f5c4df8c22c39/cancel` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** Updated invitation object with `"status": "Cancelled"`.
* **Figure 2.16.7-2 (Error 409):** Click **Send** again on `6b08458d4b2f5c4df8c22c39` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`409 Conflict`):** JSON `{ "message": "..." }`

---

### 2.17 Document Review API

#### 2.17.1 Review Document (Approve / Reject)
* **Figure 2.17.1-1 (200 OK):** `PATCH http://localhost:5000/api/documents/6b08458e4b2f5c4df8c22c44/review` — Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "decision": "approved"
  }
  ```
  **Expected Result (`200 OK`):** `{ "message": "Document successfully approved.", "document": { "_id": "6b08458e4b2f5c4df8c22c44", "status": "approved", ... } }`
* **Figure 2.17.1-2 (Error 400 / 403):** Same URL — missing `comment` (`400`) or use `INSTRUCTOR_TOKEN` (`403`):
  ```json
  {
    "decision": "rejected"
  }
  ```
  **Expected Result (`400` or `403`):** JSON `{ "message": "..." }`

---

### 2.18 Academic Period Lifecycle API

#### 2.18.1 Create Academic Period — `POST http://localhost:5000/api/academic-periods/`
* **Figure 2.18.1-1 (201 Created):** Auth: Bearer `ADMIN_TOKEN` *(Copy the returned `period._id` for `2.18.2`–`2.18.7`)*
  ```json
  {
    "schoolYear": "2035-2036",
    "semester": "1st",
    "startDate": "2035-08-01",
    "endDate": "2035-12-15",
    "status": "Upcoming"
  }
  ```
  **Expected Result (`201 Created`):** `{ "success": true, "message": "...", "period": { "_id": "...", "schoolYear": "2035-2036", "semester": "1st", "status": "Upcoming" } }`
* **Figure 2.18.1-2 (Error 409):** Click **Send** again with the exact same payload.
  **Expected Result (`409 Conflict`):** JSON `{ "message": "..." }`

#### 2.18.2 Update Academic Period — `PUT http://localhost:5000/api/academic-periods/:id`
* **Figure 2.18.2-1 (200 OK):** Replace `:id` with the period ID from `2.18.1-1` — Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "endDate": "2035-12-20"
  }
  ```
  **Expected Result (`200 OK`):** `{ "success": true, "message": "Academic period updated successfully.", "period": { ... } }`
* **Figure 2.18.2-2 (Error 400):** Same URL — Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "startDate": "2035-12-20",
    "endDate": "2035-08-01"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

#### 2.18.3 Activate Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/activate`
* **Figure 2.18.3-1 (200 OK):** Replace `:id` with the period ID from `2.18.1-1` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "...", "period": { "status": "Active", "isCurrent": true, ... } }`
* **Figure 2.18.3-2 (Error 404):** `PATCH http://localhost:5000/api/academic-periods/650000000000000000000000/activate` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.18.4 Close Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/close`
* **Figure 2.18.4-1 (200 OK):** Replace `:id` with the period ID from `2.18.1-1` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "...", "period": { "status": "Closed", "isCurrent": false, ... } }`
* **Figure 2.18.4-2 (Error 400):** Click **Send** again on the already-closed ID.
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

#### 2.18.5 Archive Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/archive`
* **Figure 2.18.5-1 (200 OK):** Replace `:id` with the closed period ID from `2.18.4-1` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "...", "period": { "status": "Archived", "isArchived": true, ... } }`
* **Figure 2.18.5-2 (Error 404):** `PATCH http://localhost:5000/api/academic-periods/650000000000000000000000/archive` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.18.6 Unarchive Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/unarchive`
* **Figure 2.18.6-1 (200 OK):** Replace `:id` with the archived period ID from `2.18.5-1` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "...", "period": { "status": "Closed", "isArchived": false, ... } }`
* **Figure 2.18.6-2 (Error 404):** `PATCH http://localhost:5000/api/academic-periods/650000000000000000000000/unarchive` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`404 Not Found`):** JSON `{ "message": "..." }`

#### 2.18.7 Delete Academic Period — `DELETE http://localhost:5000/api/academic-periods/:id`
* **Figure 2.18.7-1 (200 OK):** Replace `:id` with the unarchived period ID from `2.18.6-1` — Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "..." }`
* **Figure 2.18.7-2 (Error 400 / 404):** Try deleting `6b08458d4b2f5c4df8c22c40` (active → `400`) or click **Send** again on the deleted ID (`404`).
  **Expected Result (`400` or `404`):** JSON `{ "message": "..." }`

---

### 2.19 API & System Settings Management API

#### 2.19.1 Get System & API Settings — `GET http://localhost:5000/api/settings/`
* **Figure 2.19.1-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** JSON object containing feature toggles (`recaptchaEnabled: false`, `googleDriveEnabled: true`, etc.), `apiModes`, and masked credentials.
* **Figure 2.19.1-2 (Error 403):** Auth: Bearer `REGULAR_INSTRUCTOR_TOKEN` *(or `INSTRUCTOR_TOKEN` after resetting if needed)* → `403`.
  **Expected Result (`403 Forbidden`):** JSON `{ "message": "..." }`

#### 2.19.2 Update System & API Settings — `PUT http://localhost:5000/api/settings/`
* **Figure 2.19.2-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "settings": {
      "recaptchaEnabled": false
    }
  }
  ```
  **Expected Result (`200 OK`):** JSON summary confirming settings updated.
* **Figure 2.19.2-2 (Error 403):** Auth: Bearer `REGULAR_INSTRUCTOR_TOKEN` → `403`.
  **Expected Result (`403 Forbidden`):** JSON `{ "message": "..." }`

#### 2.19.3 Update Active API Modes — `PUT http://localhost:5000/api/settings/modes`
* **Figure 2.19.3-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "group": "googleMail",
    "mode": "default"
  }
  ```
  **Expected Result (`200 OK`):** `{ "success": true, "message": "Active API mode updated successfully.", "apiModes": { ... } }`
* **Figure 2.19.3-2 (Error 400):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "group": "googleMail",
    "mode": "invalid"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

#### 2.19.4 Restore Default APIs — `POST http://localhost:5000/api/settings/restore-defaults`
* **Figure 2.19.4-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "...", "apiModes": { ... } }`
* **Figure 2.19.4-2 (Error 403):** Auth: Bearer `REGULAR_INSTRUCTOR_TOKEN` → `403`.
  **Expected Result (`403 Forbidden`):** JSON `{ "message": "..." }`

#### 2.19.5 Test External API Connection — `POST http://localhost:5000/api/settings/test-connection`
* **Figure 2.19.5-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "service": "googleDrive"
  }
  ```
  **Expected Result (`200 OK`):** `{ "success": true, "message": "..." }`
* **Figure 2.19.5-2 (Error 400):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "service": "unknownService"
  }
  ```
  **Expected Result (`400 Bad Request`):** JSON `{ "message": "..." }`

#### 2.19.6 Verify Admin Password for Settings — `POST http://localhost:5000/api/settings/verify-password`
* **Figure 2.19.6-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "password": "TestPass@123"
  }
  ```
  **Expected Result (`200 OK`):** `{ "success": true, "unmaskedCustomCredentials": { ... }, "unmaskedDefaultCredentials": { ... }, "unmaskedCredentials": { ... } }`
* **Figure 2.19.6-2 (Error 401):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "password": "wrongpassword"
  }
  ```
  **Expected Result (`401 Unauthorized`):** JSON `{ "message": "..." }`

#### 2.19.7 Send Settings Verification OTP — `POST http://localhost:5000/api/settings/send-otp`
* **Figure 2.19.7-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`.
  **Expected Result (`200 OK`):** `{ "success": true, "message": "Verification code sent to your email.", "email": "admin.test@buksu.edu.ph", "adminProfile": { ... } }`
* **Figure 2.19.7-2 (Error 403):** Auth: Bearer `REGULAR_INSTRUCTOR_TOKEN` → `403`.
  **Expected Result (`403 Forbidden`):** JSON `{ "message": "..." }`

#### 2.19.8 Verify Settings OTP — `POST http://localhost:5000/api/settings/verify-otp`
* **Figure 2.19.8-1 (200 OK):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "otp": "<6_digit_otp_from_2.19.7-1>"
  }
  ```
  **Expected Result (`200 OK`):** `{ "success": true, "unmaskedCustomCredentials": { ... }, "unmaskedDefaultCredentials": { ... }, "unmaskedCredentials": { ... } }`
* **Figure 2.19.8-2 (Error 401):** Auth: Bearer `ADMIN_TOKEN`
  ```json
  {
    "otp": "000000"
  }
  ```
  **Expected Result (`401 Unauthorized`):** JSON `{ "message": "..." }`
