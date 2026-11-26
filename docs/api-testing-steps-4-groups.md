# Thunder Client Testing Guide — All 153 Figures (4 Groups)

> **Prerequisites (All Groups):**
> 1. Start the backend server: `cd server && npm run dev` (running on `http://localhost:5000`).
> 2. **`recaptchaEnabled` is currently `true`** in MongoDB. (For `2.1.1` Valid Login, get a real `captchaToken` from your browser's Network tab or temporarily toggle reCAPTCHA off in Admin → API Settings after screenshotting `2.1.1-2`.)
> 3. Save two tokens after logging in:
>    * `<INSTRUCTOR_TOKEN>` (from an Instructor login)
>    * `<ADMIN_TOKEN>` (from an Administrator login)
> 4. In Thunder Client, set **Auth → Bearer** for protected routes. Clear/alter the token to trigger `401 Unauthorized` on any protected route.

---

## Group 1: Figures `2.1.1-1` to `2.4.5-2` (39 Figures)

### 2.1 Authentication & Session API

#### 2.1.1 User Login — `POST http://localhost:5000/api/auth/login`
* **Figure 2.1.1-1 (200 OK):**
  ```json
  {
    "email": "<valid_email>",
    "password": "<valid_password>",
    "captchaToken": "<valid_recaptcha_token>"
  }
  ```
* **Figure 2.1.1-2 (Error 400 / 401):** *(Returns `400` if reCAPTCHA is missing/failed, or `401` on wrong password)*
  ```json
  {
    "email": "<valid_email>",
    "password": "wrongpassword"
  }
  ```

#### 2.1.2 Google OAuth Login — `POST http://localhost:5000/api/auth/google`
* **Figure 2.1.2-1 (200 OK):**
  ```json
  {
    "credential": "<google_id_token_from_browser_network_tab>"
  }
  ```
* **Figure 2.1.2-2 (Error 401 / 400):** *(Use `{}` for `400`)*
  ```json
  {
    "credential": "invalid-google-token"
  }
  ```

#### 2.1.3 User Logout — `POST http://localhost:5000/api/auth/logout`
* **Figure 2.1.3-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, Body: none.

#### 2.1.4 Session Heartbeat — `POST http://localhost:5000/api/auth/heartbeat`
* **Figure 2.1.4-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, Body: none.
* **Figure 2.1.4-2 (Error 401):** Clear Auth header and click **Send**.

#### 2.1.5 Switch Active Role Mode — `POST http://localhost:5000/api/auth/switch-mode`
*(Use an Instructor account with `adminAccess.enabled = true`)*
* **Figure 2.1.5-1 (200 OK):** Auth: Bearer `<TOKEN>`
  ```json
  {
    "targetRole": "admin",
    "password": "<valid_password>"
  }
  ```
* **Figure 2.1.5-2 (Error 401 / 403):** *(Wrong password → `401`; instructor without admin access → `403`)*
  ```json
  {
    "targetRole": "admin",
    "password": "wrongpassword"
  }
  ```

#### 2.1.6 Forgot Password (Send OTP) — `POST http://localhost:5000/api/auth/forgot-password`
* **Figure 2.1.6-1 (200 OK):**
  ```json
  {
    "email": "<registered_email>"
  }
  ```
* **Figure 2.1.6-2 (Error 404):**
  ```json
  {
    "email": "notregistered@buksu.edu.ph"
  }
  ```

#### 2.1.7 Verify Password Reset OTP — `POST http://localhost:5000/api/auth/verify-reset-otp`
* **Figure 2.1.7-1 (200 OK):** *(Copy `resetToken` from response)*
  ```json
  {
    "email": "<registered_email>",
    "otp": "<6_digit_otp_from_email>"
  }
  ```
* **Figure 2.1.7-2 (Error 401):**
  ```json
  {
    "email": "<registered_email>",
    "otp": "000000"
  }
  ```

#### 2.1.8 Reset Password — `POST http://localhost:5000/api/auth/reset-password/:token`
* **Figure 2.1.8-1 (200 OK):** Replace `:token` with `<resetToken>` from `2.1.7-1`
  ```json
  {
    "newPassword": "NewPassword@123"
  }
  ```
* **Figure 2.1.8-2 (Error 400):**
  ```json
  {
    "newPassword": "weak"
  }
  ```

---

### 2.2 Profile Management API

#### 2.2.1 Get Own Profile — `GET http://localhost:5000/api/profile/me`
* **Figure 2.2.1-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.2.1-2 (Error 401):** Clear Auth header.

#### 2.2.2 Get Profile by ID — `GET http://localhost:5000/api/profile/:id`
* **Figure 2.2.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid instructor ObjectId.
* **Figure 2.2.2-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.2.3 Create Initial Profile — `POST http://localhost:5000/api/profile/`
* **Figure 2.2.3-1 (201 Created):** Auth: Bearer `<TOKEN_OF_USER_WITH_EMPTY_PROFILE>`
  ```json
  {
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "contactNumber": "09171234567"
  }
  ```
* **Figure 2.2.3-2 (Error 409):** Send the same request again for a user whose profile already exists.

#### 2.2.4 Update Own Profile — `PUT http://localhost:5000/api/profile/me`
* **Figure 2.2.4-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`
  ```json
  {
    "contactNumber": "09179998888",
    "address": "Malaybalay City"
  }
  ```
* **Figure 2.2.4-2 (Error 400):**
  ```json
  {
    "photoUrl": "not-a-valid-url"
  }
  ```

#### 2.2.5 Change Password — `PUT http://localhost:5000/api/profile/change-password`
* **Figure 2.2.5-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`
  ```json
  {
    "currentPassword": "<current_password>",
    "newPassword": "Password@1234"
  }
  ```
* **Figure 2.2.5-2 (Error 400):**
  ```json
  {
    "currentPassword": "wrongpassword",
    "newPassword": "Password@1234"
  }
  ```

---

### 2.3 Requirements API

#### 2.3.1 List Active Requirements — `GET http://localhost:5000/api/requirements/?scope=faculty`
* **Figure 2.3.1-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.3.1-2 (Error 401):** Clear Auth header.

#### 2.3.2 Get Requirement by Key — `GET http://localhost:5000/api/requirements/:key`
* **Figure 2.3.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:key` = `CLASS_A_LOAD_REPORT`.
* **Figure 2.3.2-2 (Error 404):** `:key` = `NON_EXISTENT_KEY`.

---

### 2.4 Documents & Portfolios API (Shared View, Stream & Edit)

#### 2.4.1 Get Faculty Portfolio Summary — `GET http://localhost:5000/api/documents/summary/faculty`
* **Figure 2.4.1-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.4.1-2 (Error 401):** Clear Auth header.

#### 2.4.2 List Documents — `GET http://localhost:5000/api/documents/`
* **Figure 2.4.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.4.2-2 (Error 401):** Clear Auth header.

#### 2.4.3 Get Document Metadata by ID — `GET http://localhost:5000/api/documents/:id`
* **Figure 2.4.3-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid document ID.
* **Figure 2.4.3-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.4.4 Stream Document File — `GET http://localhost:5000/api/documents/:id/file`
* **Figure 2.4.4-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid document ID.
* **Figure 2.4.4-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.4.5 Update Document Metadata — `PATCH http://localhost:5000/api/documents/:id`
* **Figure 2.4.5-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid document ID
  ```json
  {
    "meta": {
      "title": "Updated Title"
    }
  }
  ```
* **Figure 2.4.5-2 (Error 404 / 403):** Use `:id` = `650000000000000000000000` (`404`) or another user's document ID (`403`).

---

## Group 2: Figures `2.4.6-1` to `2.10.1-2` (38 Figures)

### 2.4 Documents (Continued)

#### 2.4.6 Delete Document — `DELETE http://localhost:5000/api/documents/:id`
* **Figure 2.4.6-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = non-approved test document ID.
* **Figure 2.4.6-2 (Error 403 / 404):** Try deleting an `approved` document as Instructor (`403`) or `650000000000000000000000` (`404`).

---

### 2.5 Classes API (Shared View & Archive)

#### 2.5.1 List Classes — `GET http://localhost:5000/api/classes/`
* **Figure 2.5.1-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.5.1-2 (Error 401):** Clear Auth header.

#### 2.5.2 Get Class by ID — `GET http://localhost:5000/api/classes/:id`
* **Figure 2.5.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid class ID.
* **Figure 2.5.2-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.5.3 Archive Class — `POST http://localhost:5000/api/classes/:id/archive`
* **Figure 2.5.3-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid class ID.
* **Figure 2.5.3-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.5.4 Unarchive Class — `POST http://localhost:5000/api/classes/:id/unarchive`
* **Figure 2.5.4-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = archived class ID from `2.5.3-1`.
* **Figure 2.5.4-2 (Error 404):** `:id` = `650000000000000000000000`.

---

### 2.6 Academic Periods API (Shared Read)

#### 2.6.1 Get Current Academic Period — `GET http://localhost:5000/api/academic-periods/current`
* **Figure 2.6.1-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.6.1-2 (Error 401):** Clear Auth header.

#### 2.6.2 List Academic Periods — `GET http://localhost:5000/api/academic-periods/`
* **Figure 2.6.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.6.2-2 (Error 401):** Clear Auth header.

#### 2.6.3 Get Academic Period Details — `GET http://localhost:5000/api/academic-periods/:id/details`
* **Figure 2.6.3-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid period ID from `2.6.2-1`.
* **Figure 2.6.3-2 (Error 404):** `:id` = `650000000000000000000000`.

---

### 2.7 Notifications API

#### 2.7.1 List Notifications — `GET http://localhost:5000/api/notifications/`
* **Figure 2.7.1-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.7.1-2 (Error 401):** Clear Auth header.

#### 2.7.2 Mark All Notifications as Read — `PATCH http://localhost:5000/api/notifications/mark-all-read`
* **Figure 2.7.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.7.2-2 (Error 401):** Clear Auth header.

#### 2.7.3 Mark Notification as Read — `PATCH http://localhost:5000/api/notifications/:id/read`
* **Figure 2.7.3-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid notification ID from `2.7.1-1`.
* **Figure 2.7.3-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.7.4 Clear All Notifications — `DELETE http://localhost:5000/api/notifications/clear-all`
* **Figure 2.7.4-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.7.4-2 (Error 401):** Clear Auth header.

#### 2.7.5 Delete Single Notification — `DELETE http://localhost:5000/api/notifications/:id`
* **Figure 2.7.5-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = valid notification ID.
* **Figure 2.7.5-2 (Error 404):** `:id` = `650000000000000000000000`.

---

### 2.8 Reports API

#### 2.8.1 Get Compliance Report Data — `GET http://localhost:5000/api/reports/compliance/data`
* **Figure 2.8.1-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.8.1-2 (Error 401):** Clear Auth header.

#### 2.8.2 Download Compliance Excel Workbook — `GET http://localhost:5000/api/reports/compliance/excel`
* **Figure 2.8.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`.
* **Figure 2.8.2-2 (Error 401):** Clear Auth header.

#### 2.8.3 Export Compliance Report to Google Sheets — `POST http://localhost:5000/api/reports/compliance/sheets`
* **Figure 2.8.3-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`
  ```json
  {}
  ```
* **Figure 2.8.3-2 (Error 503):** Disable Google Sheets in Admin → API Settings, then click **Send** (`503`). *(Re-enable afterwards!)*

---

### 2.9 Public Settings & Audit Logs API

#### 2.9.1 Get Public Settings — `GET http://localhost:5000/api/settings/public`
* **Figure 2.9.1-1 (200 OK):** No Auth needed.

#### 2.9.2 Get Audit Logs — `GET http://localhost:5000/api/settings/audit-logs?page=1&limit=20`
* **Figure 2.9.2-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.9.2-2 (Error 401):** Clear Auth header.

---

### 2.10 Resource Locks API (First Endpoint)

#### 2.10.1 Acquire Resource Lock — `POST http://localhost:5000/api/locks/acquire`
* **Figure 2.10.1-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "resourceKey": "document:test-lock-1"
  }
  ```
* **Figure 2.10.1-2 (Error 400):**
  ```json
  {}
  ```

---

## Group 3: Figures `2.10.2-1` to `2.16.4-2` (38 Figures)

### 2.10 Resource Locks & 2.11 Health Check

#### 2.10.2 Release Resource Lock — `POST http://localhost:5000/api/locks/release`
* **Figure 2.10.2-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "resourceKey": "document:test-lock-1"
  }
  ```
* **Figure 2.10.2-2 (Error 400):**
  ```json
  {}
  ```

#### 2.10.3 Check Resource Lock Status — `GET http://localhost:5000/api/locks/status?resourceKey=document:test-lock-1`
* **Figure 2.10.3-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.10.3-2 (Error 400):** Remove `?resourceKey=...` query parameter and click **Send**.

#### 2.11.1 Server Greeting / Health Check — `GET http://localhost:5000/api/hello`
* **Figure 2.11.1-1 (200 OK):** No Auth needed.

---

### 2.12 Invitation Onboarding API (Invitee Actions)
*(Create two test invitations via `2.16.1` first so you have fresh `:token` values.)*

#### 2.12.1 Get Invitation by Token — `GET http://localhost:5000/api/invitations/token/:token`
* **Figure 2.12.1-1 (200 OK):** `:token` = valid pending invitation token.
* **Figure 2.12.1-2 (Error 404):** `:token` = `invalid-token-000`.

#### 2.12.2 Accept Invitation — `PATCH http://localhost:5000/api/invitations/:token/accept`
* **Figure 2.12.2-1 (200 OK):** `:token` = valid pending invitation token
  ```json
  {
    "privacyNoticeVersion": "1.0"
  }
  ```
* **Figure 2.12.2-2 (Error 409):** Click **Send** a second time on the same token.

#### 2.12.3 Reject Invitation — `PATCH http://localhost:5000/api/invitations/:token/reject`
* **Figure 2.12.3-1 (200 OK):** `:token` = second valid pending invitation token.
* **Figure 2.12.3-2 (Error 410):** Click **Send** again on the rejected token.

#### 2.12.4 Complete Account Setup — `POST http://localhost:5000/api/invitations/token/:token/setup`
* **Figure 2.12.4-1 (200 OK):** `:token` = accepted token from `2.12.2-1`
  ```json
  {
    "password": "Password@123"
  }
  ```
* **Figure 2.12.4-2 (Error 400):**
  ```json
  {
    "password": "123"
  }
  ```

---

### 2.13 Class Management API

#### 2.13.1 Create Class — `POST http://localhost:5000/api/classes/`
* **Figure 2.13.1-1 (201 Created):** Auth: Bearer `<INSTRUCTOR_TOKEN>`
  ```json
  {
    "subjectCode": "IT999",
    "subjectName": "Test Subject",
    "sectionCode": "T1"
  }
  ```
* **Figure 2.13.1-2 (Error 409):** Click **Send** again with the exact same payload (`409` duplicate class).

#### 2.13.2 Update Class — `PATCH http://localhost:5000/api/classes/:id`
* **Figure 2.13.2-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = class ID from `2.13.1-1`
  ```json
  {
    "sectionName": "Updated Section"
  }
  ```
* **Figure 2.13.2-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.13.3 Delete Class — `DELETE http://localhost:5000/api/classes/:id`
* **Figure 2.13.3-1 (200 OK):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, `:id` = class ID from `2.13.1-1`.
* **Figure 2.13.3-2 (Error 404):** Click **Send** again on the deleted ID.

---

### 2.14 Portfolio Document Upload API

#### 2.14.1 Upload Portfolio Document — `POST http://localhost:5000/api/documents/upload`
* **Figure 2.14.1-1 (201 Created):** Auth: Bearer `<INSTRUCTOR_TOKEN>`, **Body → Form**:
  * `file` (File): attach a small PDF
  * `requirementKey` (Text): `FAC_A_PDS`
* **Figure 2.14.1-2 (Error 400):** Uncheck `file` or `requirementKey` and click **Send**.

---

### 2.15 Instructor Management & Access Control API

#### 2.15.1 List Instructors — `GET http://localhost:5000/api/instructors/`
* **Figure 2.15.1-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.15.1-2 (Error 500):** Temporarily set an invalid `MONGO_URI` in `server/.env` (restore right after!) and click **Send**.

#### 2.15.2 Get Admin Permissions Metadata — `GET http://localhost:5000/api/instructors/permissions/meta`
* **Figure 2.15.2-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.15.2-2 (Error 401):** Clear Auth header.

#### 2.15.3 Get Instructor by ID — `GET http://localhost:5000/api/instructors/:id`
* **Figure 2.15.3-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = valid instructor ID.
* **Figure 2.15.3-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.15.4 Update Instructor Account Status — `PATCH http://localhost:5000/api/instructors/:id/status`
* **Figure 2.15.4-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = another instructor ID *(set back to `"Active"` afterwards)*
  ```json
  {
    "accountStatus": "Deactivated"
  }
  ```
* **Figure 2.15.4-2 (Error 400):**
  ```json
  {
    "accountStatus": "InvalidStatus"
  }
  ```

#### 2.15.5 Update Instructor Admin Access — `PATCH http://localhost:5000/api/instructors/:id/admin-access`
* **Figure 2.15.5-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = instructor ID
  ```json
  {
    "enabled": true,
    "scope": "limited",
    "pages": [
      "review_faculty"
    ]
  }
  ```
* **Figure 2.15.5-2 (Error 403):** Use your own Admin `:id` (self-modification blocked).

---

### 2.16 Invitation Management API (First 4 Endpoints)

#### 2.16.1 Send Instructor Invitation — `POST http://localhost:5000/api/invitations/`
* **Figure 2.16.1-1 (201 Created):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "firstName": "Test",
    "lastName": "User",
    "email": "<real_test_email@student.buksu.edu.ph>",
    "department": "Information Technology"
  }
  ```
* **Figure 2.16.1-2 (Error 400 / 409):** *(Non-institutional email → `400`; duplicate email → `409`)*
  ```json
  {
    "firstName": "Test",
    "lastName": "User",
    "email": "not-institutional@gmail.com",
    "department": "Information Technology"
  }
  ```

#### 2.16.2 List Invitations — `GET http://localhost:5000/api/invitations/`
* **Figure 2.16.2-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.16.2-2 (Error 500):** Same `MONGO_URI` test as `2.15.1-2`.

#### 2.16.3 List Accepted Invitations — `GET http://localhost:5000/api/invitations/accepted`
* **Figure 2.16.3-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.16.3-2 (Error 500):** Same `MONGO_URI` test as `2.15.1-2`.

#### 2.16.4 List Active/Inactive Instructors — `GET http://localhost:5000/api/invitations/active`
* **Figure 2.16.4-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.16.4-2 (Error 500):** Same `MONGO_URI` test as `2.15.1-2`.

---

## Group 4: Figures `2.16.5-1` to `2.19.8-2` (38 Figures)

### 2.16 Invitation Management (Continued)

#### 2.16.5 Get Invited Instructor by ID — `GET http://localhost:5000/api/invitations/:id`
* **Figure 2.16.5-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = valid invitation/instructor ID.
* **Figure 2.16.5-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.16.6 Resend Invitation — `PATCH http://localhost:5000/api/invitations/:id/resend`
* **Figure 2.16.6-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = `Rejected` or `Expired` invitation ID.
* **Figure 2.16.6-2 (Error 409):** Use an `Accepted` or `Pending` invitation ID.

#### 2.16.7 Cancel Invitation — `PATCH http://localhost:5000/api/invitations/:id/cancel`
* **Figure 2.16.7-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = `Pending` invitation ID.
* **Figure 2.16.7-2 (Error 409):** Click **Send** again on the now-cancelled ID.

---

### 2.17 Document Review API

#### 2.17.1 Review Document (Approve / Reject) — `PATCH http://localhost:5000/api/documents/:id/review`
* **Figure 2.17.1-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = document uploaded by an instructor
  ```json
  {
    "decision": "approved"
  }
  ```
* **Figure 2.17.1-2 (Error 400 / 403):** *(Missing `comment` on rejection → `400`; using `<INSTRUCTOR_TOKEN>` → `403`)*
  ```json
  {
    "decision": "rejected"
  }
  ```

---

### 2.18 Academic Period Lifecycle API

#### 2.18.1 Create Academic Period — `POST http://localhost:5000/api/academic-periods/`
* **Figure 2.18.1-1 (201 Created):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "schoolYear": "2035-2036",
    "semester": "1st",
    "startDate": "2035-08-01",
    "endDate": "2035-12-15",
    "status": "Upcoming"
  }
  ```
* **Figure 2.18.1-2 (Error 409):** Click **Send** again with the exact same payload (`409` duplicate).

#### 2.18.2 Update Academic Period — `PUT http://localhost:5000/api/academic-periods/:id`
* **Figure 2.18.2-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = period ID from `2.18.1-1`
  ```json
  {
    "endDate": "2035-12-20"
  }
  ```
* **Figure 2.18.2-2 (Error 400):**
  ```json
  {
    "startDate": "2035-12-20",
    "endDate": "2035-08-01"
  }
  ```

#### 2.18.3 Activate Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/activate`
* **Figure 2.18.3-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = period ID from `2.18.1-1`. *(Re-activate your real current period afterwards!)*
* **Figure 2.18.3-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.18.4 Close Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/close`
* **Figure 2.18.4-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = period ID from `2.18.1-1`.
* **Figure 2.18.4-2 (Error 400):** Click **Send** again on the already-closed ID.

#### 2.18.5 Archive Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/archive`
* **Figure 2.18.5-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = closed period ID from `2.18.4-1`.
* **Figure 2.18.5-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.18.6 Unarchive Academic Period — `PATCH http://localhost:5000/api/academic-periods/:id/unarchive`
* **Figure 2.18.6-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = archived period ID from `2.18.5-1`.
* **Figure 2.18.6-2 (Error 404):** `:id` = `650000000000000000000000`.

#### 2.18.7 Delete Academic Period — `DELETE http://localhost:5000/api/academic-periods/:id`
* **Figure 2.18.7-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`, `:id` = unarchived test period ID from `2.18.6-1`.
* **Figure 2.18.7-2 (Error 400 / 404):** Try deleting the currently `Active` period (`400`) or the deleted ID (`404`).

---

### 2.19 API & System Settings Management API

#### 2.19.1 Get System & API Settings — `GET http://localhost:5000/api/settings/`
* **Figure 2.19.1-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.19.1-2 (Error 403):** Use `<INSTRUCTOR_TOKEN>` → `403`.

#### 2.19.2 Update System & API Settings — `PUT http://localhost:5000/api/settings/`
* **Figure 2.19.2-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "settings": {
      "recaptchaEnabled": true
    }
  }
  ```
* **Figure 2.19.2-2 (Error 403):** Use `<INSTRUCTOR_TOKEN>` → `403`.

#### 2.19.3 Update Active API Modes — `PUT http://localhost:5000/api/settings/modes`
* **Figure 2.19.3-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "group": "googleMail",
    "mode": "default"
  }
  ```
* **Figure 2.19.3-2 (Error 400):**
  ```json
  {
    "group": "googleMail",
    "mode": "invalid"
  }
  ```

#### 2.19.4 Restore Default APIs — `POST http://localhost:5000/api/settings/restore-defaults`
* **Figure 2.19.4-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.19.4-2 (Error 403):** Use `<INSTRUCTOR_TOKEN>` → `403`.

#### 2.19.5 Test External API Connection — `POST http://localhost:5000/api/settings/test-connection`
* **Figure 2.19.5-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "service": "googleDrive"
  }
  ```
* **Figure 2.19.5-2 (Error 400):**
  ```json
  {
    "service": "unknownService"
  }
  ```

#### 2.19.6 Verify Admin Password for Settings — `POST http://localhost:5000/api/settings/verify-password`
* **Figure 2.19.6-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "password": "<admin_password>"
  }
  ```
* **Figure 2.19.6-2 (Error 401):**
  ```json
  {
    "password": "wrongpassword"
  }
  ```

#### 2.19.7 Send Settings Verification OTP — `POST http://localhost:5000/api/settings/send-otp`
* **Figure 2.19.7-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`.
* **Figure 2.19.7-2 (Error 403):** Use `<INSTRUCTOR_TOKEN>` → `403`.

#### 2.19.8 Verify Settings OTP — `POST http://localhost:5000/api/settings/verify-otp`
* **Figure 2.19.8-1 (200 OK):** Auth: Bearer `<ADMIN_TOKEN>`
  ```json
  {
    "otp": "<6_digit_otp_from_2.19.7-1>"
  }
  ```
* **Figure 2.19.8-2 (Error 401):**
  ```json
  {
    "otp": "000000"
  }
  ```
