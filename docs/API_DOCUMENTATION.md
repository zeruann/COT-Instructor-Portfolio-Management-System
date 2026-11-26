# API Documentation

**Version:** 1.0  
**Last Updated:** November 24, 2026

---

## I. Overview

### 1.1 Project Name
COT Instructor Portfolio Management System

### 1.2 Client / Respondents of the System
Bukidnon State University – College of Technologies (COT), Malaybalay City, Bukidnon

### 1.3 Description
The **COT Instructor Portfolio Management System** is a web-based platform designed to streamline and standardize the submission, review, monitoring, and archiving of faculty and class portfolio requirements in the College of Technologies. It enables instructors to organize their teaching and professional credentials by academic period and class, while providing administrators with centralized oversight for onboarding, compliance tracking, document review, and reporting.

The system enforces **Role-Based Access Control (RBAC)** with dual-mode support (`instructor` and `admin`) and granular administrative permissions (`instructors`, `academic_period`, `api_settings`, etc.), ensuring that users can only access and modify authorized resources. To protect data integrity during concurrent operations, the backend applies MongoDB **Multi-Version Concurrency Control (MVCC)** alongside application-level **Resource Locks** (`ResourceLock`), **SHA-256 OTP/token hashing**, **AES-256-GCM credential encryption**, **rate limiting** (`429 Too Many Requests`), and **audit logging**.

### 1.4 Key Features
- **Authentication, Session & Mode Switching** – Supports email/password login, Google OAuth 2.0 Sign-In, reCAPTCHA verification, password recovery via OTP, session heartbeat tracking, and password-verified switching between Instructor and Administrator modes.
- **Instructor Onboarding & Access Management** – Allows administrators to invite faculty members via tokenized email links, manage account statuses, and assign granular administrative permissions.
- **Class & Portfolio Requirement Management** – Enables instructors to create and manage classes per academic period and track required faculty and class portfolio deliverables.
- **Document Upload, Streaming & Review** – Integrates with Google Drive for private document storage, supports metadata updates, administrative approval/revision review workflows, and compliance summaries.
- **Academic Period Lifecycle** – Manages active, closed, and archived school years/semesters with full period details and faculty compliance visibility.
- **Reporting & Analytics** – Generates institutional compliance data previews, downloadable Excel workbooks (`ExcelJS`), and exported Google Sheets checklists.
- **Notifications, Resource Locks & System Security Settings** – Provides real-time user notifications, concurrency edit locks, audit logs, and OTP-protected API configuration management.

### 1.5 Version
- `1.0` – Current Release

### 1.6 Base URL
`http://localhost:5000/`

### 1.7 Authentication
Authentication in the COT Instructor Portfolio Management System is implemented using **JSON Web Tokens (JWT)**. Upon successful login, the server issues a signed JWT containing the user's ID and active account mode (`accountType`). Protected endpoints validate the token via the `Authorization: Bearer <token>` header (or `?token=<token>` query parameter for file streaming/downloads) through the `auth` middleware, and administrative routes additionally enforce `requireAdminAccess` permission checks.

### 1.8 Master HTTP Response Codes
The following HTTP status codes are used consistently across all backend modules:

| Code | Message | Description |
| :--- | :--- | :--- |
| `200` | OK | Request succeeded (default response for successful reads, updates, logins, and actions). |
| `201` | Created | New resource successfully created (e.g., class, academic period, invitation, profile). |
| `400` | Bad Request | Validation error, missing required field, invalid ID/token format, or invalid state transition. |
| `401` | Unauthorized | Missing, invalid, or expired JWT token, or invalid password/OTP credentials. |
| `403` | Forbidden | User lacks required role or granular admin permission, or account is inactive/restricted. |
| `404` | Not Found | Requested route, user, document, class, or record does not exist. |
| `409` | Conflict | Resource edit lock is currently held by another user, or conflicting duplicate/active state. |
| `410` | Gone | Invitation or recovery token has expired or is no longer valid. |
| `429` | Too Many Requests | Rate limit exceeded; response includes `Retry-After` header and `retryAfterSeconds`. |
| `500` | Internal Server Error | Unhandled server-side, database, or external integration exception. |
| `503` | Service Unavailable | Required external integration or service is currently disabled or unavailable. |

---

## II. Endpoints

The following sections document all **78 backend endpoints** (`77` functional module endpoints plus `GET /api/hello`), grouped into **Shared / Common APIs**, **Instructor-Specific APIs**, and **Administrator-Specific APIs**.

---

## A. Shared / Common Module APIs (Instructor & Administrator)

### 2.1 Authentication & Session API

#### Module Description
Handles user sign-in (email/password and Google OAuth 2.0), logout, session heartbeat tracking, password-verified role switching (`instructor` ↔ `admin`), and OTP-based password recovery.

**Endpoints:**
- `POST http://localhost:5000/api/auth/login`
- `POST http://localhost:5000/api/auth/google`
- `POST http://localhost:5000/api/auth/logout`
- `POST http://localhost:5000/api/auth/heartbeat`
- `POST http://localhost:5000/api/auth/switch-mode`
- `POST http://localhost:5000/api/auth/forgot-password`
- `POST http://localhost:5000/api/auth/verify-reset-otp`
- `POST http://localhost:5000/api/auth/reset-password/:token`

**Module Response Codes:** `200`, `400`, `401`, `403`, `404`, `429`, `500`

---

#### 2.1.1 User Login
- **Endpoint:** `http://localhost:5000/api/auth/login`
- **Method:** `POST`
- **Description:** Authenticates an Administrator or Instructor using email and password, verifies reCAPTCHA (when enabled), marks the user `Online`, logs an audit entry, and returns a signed JWT.
- **Configurations:** Public route protected by `loginLimiter` (5 failed attempts per 5 minutes per IP; successful logins do not count toward the limit). Password is verified with `bcryptjs`.
- **Parameters:**
  - `email` *(string, required)*: Registered institutional email address (normalized to lowercase).
  - `password` *(string, required)*: Account password.
  - `captchaToken` *(string, conditional)*: Google reCAPTCHA token (required when `recaptchaEnabled` is true).
- **Response (`application/json`):**
  - **Success (`200 OK`):**
    ```json
    {
      "token": "<jwt_token>",
      "instructor": {
        "id": "67...",
        "fullName": "Juan Dela Cruz",
        "email": "jdelacruz@buksu.edu.ph",
        "accountType": "Instructor",
        "activeRole": "instructor",
        "accountStatus": "Active",
        "onlineStatus": "Online"
      }
    }
    ```
    > *[Screenshot Placeholder — **Figure 1.** User Login — Valid Request]*
  - **Error Responses:** `400 Bad Request` (reCAPTCHA failed), `401 Unauthorized` (`"Invalid email or password"`), `403 Forbidden` (account inactive or invalid account type), `429 Too Many Requests` (`{ "message": "...", "retryAfterSeconds": 300 }`), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 2.** User Login — Error Response]*

#### 2.1.2 Google OAuth Login
- **Endpoint:** `http://localhost:5000/api/auth/google`
- **Method:** `POST`
- **Description:** Verifies a Google ID token via `google-auth-library` and signs in an existing, active, and accepted user.
- **Configurations:** Does not auto-register unknown accounts. Administrators remain exempt if `googleAuthEnabled` is turned off for general users.
- **Parameters:**
  - `credential` *(string, required)*: Google Identity Services ID token.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Returns `{ "token": "<jwt_token>", "instructor": { ... } }`.
    > *[Screenshot Placeholder — **Figure 3.** Google OAuth Login — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (missing credential), `401 Unauthorized` (`"Google authentication failed"`), `403 Forbidden` (unverified email, unregistered account, or Google Sign-In disabled).
    > *[Screenshot Placeholder — **Figure 4.** Google OAuth Login — Error Response]*

#### 2.1.3 User Logout
- **Endpoint:** `http://localhost:5000/api/auth/logout`
- **Method:** `POST`
- **Description:** Marks the authenticated user `Offline`, clears `lastSeenAt`, and records a `LOGOUT` audit entry.
- **Configurations:** Uses `optionalAuth` (accepts expired JWTs so stale sessions can still be marked Offline cleanly).
- **Parameters:** `Authorization: Bearer <token>` header or `?token=<token>` query *(optional)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Logged out successfully" }`
    > *[Screenshot Placeholder — **Figure 5.** User Logout — Valid Request (200 OK)]*

#### 2.1.4 Session Heartbeat
- **Endpoint:** `http://localhost:5000/api/auth/heartbeat`
- **Method:** `POST`
- **Description:** Updates the authenticated user's `onlineStatus` to `Online` and refreshes `lastSeenAt`.
- **Configurations:** Protected by `auth` middleware.
- **Parameters:** `Authorization: Bearer <token>` header *(required)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "ok": true }`
    > *[Screenshot Placeholder — **Figure 6.** Session Heartbeat — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 7.** Session Heartbeat — Error Response]*

#### 2.1.5 Switch Active Role Mode
- **Endpoint:** `http://localhost:5000/api/auth/switch-mode`
- **Method:** `POST`
- **Description:** Re-verifies the user's password and issues a new JWT with the requested `activeRole` (`"admin"` or `"instructor"`), while logging audit and notification events.
- **Configurations:** Protected by `auth` and `switchModeLimiter` (5 failed attempts per 5 minutes per user/IP). Requires `canUseAdminMode(user)` when switching to `"admin"`.
- **Parameters:**
  - `targetRole` *(string, required)*: `"admin"` or `"instructor"`.
  - `password` *(string, required)*: Current account password.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "token": "<new_jwt_token>", "activeRole": "admin", "instructor": { ... } }`
    > *[Screenshot Placeholder — **Figure 8.** Switch Active Role Mode — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (invalid role, missing password, or no password set), `401 Unauthorized` (incorrect password), `403 Forbidden` (inactive account or lacks admin access), `429 Too Many Requests`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 9.** Switch Active Role Mode — Error Response]*

#### 2.1.6 Forgot Password (Send OTP)
- **Endpoint:** `http://localhost:5000/api/auth/forgot-password`
- **Method:** `POST`
- **Description:** Generates a 6-digit numeric OTP, stores its SHA-256 hash (5-minute expiry), and emails it via Nodemailer.
- **Configurations:** Protected by `forgotPasswordLimiter` (3 requests per 5 minutes per IP).
- **Parameters:**
  - `email` *(string, required)*: Registered account email.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "Verification code sent to your email.", "email": "..." }`
    > *[Screenshot Placeholder — **Figure 10.** Forgot Password (Send OTP) — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (missing email), `404 Not Found` (account not found), `429 Too Many Requests`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 11.** Forgot Password (Send OTP) — Error Response]*

#### 2.1.7 Verify Password Reset OTP
- **Endpoint:** `http://localhost:5000/api/auth/verify-reset-otp`
- **Method:** `POST`
- **Description:** Validates the 6-digit OTP against its SHA-256 hash and issues a single-use `resetToken` valid for 15 minutes.
- **Configurations:** Clears the OTP after verification so it cannot be reused.
- **Parameters:**
  - `email` *(string, required)*: Account email.
  - `otp` *(string, required)*: 6-digit verification code.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "Code verified successfully.", "resetToken": "<hex_token>" }`
    > *[Screenshot Placeholder — **Figure 12.** Verify Password Reset OTP — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (missing/malformed/expired OTP), `401 Unauthorized` (incorrect OTP), `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 13.** Verify Password Reset OTP — Error Response]*

#### 2.1.8 Reset Password
- **Endpoint:** `http://localhost:5000/api/auth/reset-password/:token`
- **Method:** `POST`
- **Description:** Resets the user's password using the verified `resetToken` and logs a `PASSWORD_RESET` audit event.
- **Configurations:** Enforces `isPasswordValid` (min 8 chars, uppercase, lowercase, number, special character) and hashes with `bcryptjs`.
- **Parameters:**
  - `token` *(path, required)*: Plaintext reset token returned by `verify-reset-otp`.
  - `newPassword` *(string, required)*: New password meeting complexity rules.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Password reset successful" }`
    > *[Screenshot Placeholder — **Figure 14.** Reset Password — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (weak password or invalid/expired token), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 15.** Reset Password — Error Response]*

### 2.2 Profile Management API

#### Module Description
Allows authenticated users to view, initialize, and update their personal/academic profile and change their account password.

**Endpoints:**
- `GET http://localhost:5000/api/profile/me`
- `GET http://localhost:5000/api/profile/:id`
- `POST http://localhost:5000/api/profile/`
- `PUT http://localhost:5000/api/profile/me`
- `PUT http://localhost:5000/api/profile/change-password`

**Module Response Codes:** `200`, `201`, `400`, `401`, `404`, `409`, `500`

---

#### 2.2.1 Get Own Profile
- **Endpoint:** `http://localhost:5000/api/profile/me`
- **Method:** `GET`
- **Description:** Retrieves the authenticated user's profile, role, department, and `adminAccess` metadata.
- **Configurations:** Protected by `auth` middleware.
- **Parameters:** `Authorization: Bearer <token>` header *(required)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Returns `{ "_id", "fullName", "email", "department", "profile", "googlePhotoUrl", "accountType", "adminAccess" }`.
    > *[Screenshot Placeholder — **Figure 16.** Get Own Profile — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 17.** Get Own Profile — Error Response]*

#### 2.2.2 Get Profile by ID
- **Endpoint:** `http://localhost:5000/api/profile/:id`
- **Method:** `GET`
- **Description:** Refreshes stale online statuses and returns a specific instructor's public profile details.
- **Configurations:** Protected by `auth` middleware.
- **Parameters:**
  - `id` *(path, required)*: Instructor MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Returns `{ "_id", "fullName", "email", "department", "profile", "accountStatus", "onlineStatus", "createdAt", "googlePhotoUrl" }`.
    > *[Screenshot Placeholder — **Figure 18.** Get Profile by ID — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 19.** Get Profile by ID — Error Response]*

#### 2.2.3 Create Initial Profile
- **Endpoint:** `http://localhost:5000/api/profile/`
- **Method:** `POST`
- **Description:** Creates initial personal information for a user who has not yet populated profile fields, and logs `PROFILE_CREATE`.
- **Configurations:** Protected by `auth`. Rejects with `409 Conflict` if profile fields already exist; validates against `profilePolicy`.
- **Parameters:** Editable profile fields *(optional)*: `firstName`, `middleName`, `lastName`, `gender`, `civilStatus`, `birthdate`, `contactNumber`, `alternateEmail`, `address`, `education`, `position`, `rank`, `photoUrl`.
- **Response (`application/json`):**
  - **Success (`201 Created`):** `{ "message": "Profile created successfully.", "profile": { ... } }`
    > *[Screenshot Placeholder — **Figure 20.** Create Initial Profile — Valid Request (201 Created)]*
  - **Error Responses:** `400 Bad Request` (validation error), `401 Unauthorized`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 21.** Create Initial Profile — Error Response]*

#### 2.2.4 Update Own Profile
- **Endpoint:** `http://localhost:5000/api/profile/me`
- **Method:** `PUT`
- **Description:** Updates editable profile fields, automatically syncs `fullName` when name parts change, and logs `PROFILE_UPDATE`.
- **Configurations:** Protected by `auth`. Validates `photoUrl` (valid base64 data URI or `https://`, max `750000` chars) and `profilePolicy` rules.
- **Parameters:** Any editable profile fields *(optional)* from `firstName`, `middleName`, `lastName`, `gender`, `civilStatus`, `birthdate`, `contactNumber`, `alternateEmail`, `address`, `education`, `position`, `rank`, `photoUrl`.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Returns updated `{ "_id", "fullName", "email", "department", "profile", "googlePhotoUrl" }`.
    > *[Screenshot Placeholder — **Figure 22.** Update Own Profile — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 23.** Update Own Profile — Error Response]*

#### 2.2.5 Change Password
- **Endpoint:** `http://localhost:5000/api/profile/change-password`
- **Method:** `PUT`
- **Description:** Verifies the user's current password, enforces password complexity, updates the bcrypt hash, and logs `PASSWORD_CHANGE`.
- **Configurations:** Protected by `auth`. Rejects Google-only accounts that have no password set.
- **Parameters:**
  - `currentPassword` *(string, required)*: Existing password.
  - `newPassword` *(string, required)*: New password (min 8 chars with uppercase, lowercase, number, and special character).
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Password changed successfully." }`
    > *[Screenshot Placeholder — **Figure 24.** Change Password — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (missing fields, wrong current password, or weak password), `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 25.** Change Password — Error Response]*

### 2.3 Requirements API

#### Module Description
Exposes active faculty-level and class-level portfolio requirement definitions.

**Endpoints:**
- `GET http://localhost:5000/api/requirements/`
- `GET http://localhost:5000/api/requirements/:key`

**Module Response Codes:** `200`, `401`, `404`, `500`

---

#### 2.3.1 List Active Requirements
- **Endpoint:** `http://localhost:5000/api/requirements/`
- **Method:** `GET`
- **Description:** Returns active portfolio requirements sorted by `cardOrder` and `order`.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `scope` *(query, optional)*: `"faculty"` (default) or `"class"`.
  - `card` *(query, optional)*: Filter by requirement card/category name.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Array of requirement definition objects.
    > *[Screenshot Placeholder — **Figure 26.** List Active Requirements — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 27.** List Active Requirements — Error Response]*

#### 2.3.2 Get Requirement by Key
- **Endpoint:** `http://localhost:5000/api/requirements/:key`
- **Method:** `GET`
- **Description:** Retrieves a single active requirement definition by its unique `key`.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `key` *(path, required)*: Requirement key (e.g., `CLASS_A_LOAD_REPORT`).
- **Response (`application/json`):**
  - **Success (`200 OK`):** Requirement object.
    > *[Screenshot Placeholder — **Figure 28.** Get Requirement by Key — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 29.** Get Requirement by Key — Error Response]*

### 2.4 Documents & Portfolios API (Shared View, Stream & Edit)

#### Module Description
Allows document owners and administrators to list documents, view faculty summaries, inspect metadata, stream files from Google Drive, edit metadata, and delete eligible entries.

**Endpoints:**
- `GET http://localhost:5000/api/documents/summary/faculty`
- `GET http://localhost:5000/api/documents/`
- `GET http://localhost:5000/api/documents/:id`
- `GET http://localhost:5000/api/documents/:id/file`
- `PATCH http://localhost:5000/api/documents/:id`
- `DELETE http://localhost:5000/api/documents/:id`

**Module Response Codes:** `200`, `401`, `403`, `404`, `500`

---

#### 2.4.1 Get Faculty Portfolio Summary
- **Endpoint:** `http://localhost:5000/api/documents/summary/faculty`
- **Method:** `GET`
- **Description:** Aggregates per-card document status counts (`approved`, `pendingReview`, `rejected`, `draft`, `totalFiles`, `commentCount`) for an instructor's Faculty Portfolio.
- **Configurations:** Protected by `auth`. Admins can pass `instructorId`.
- **Parameters:**
  - `instructorId` *(query, optional)*: Target instructor ID (Admin mode).
- **Response (`application/json`):**
  - **Success (`200 OK`):** Object keyed by card slug (e.g., `"educational-attainment"`, `"service-records"`).
    > *[Screenshot Placeholder — **Figure 30.** Get Faculty Portfolio Summary — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 31.** Get Faculty Portfolio Summary — Error Response]*

#### 2.4.2 List Documents
- **Endpoint:** `http://localhost:5000/api/documents/`
- **Method:** `GET`
- **Description:** Lists non-archived documents filtered by requirement, owner, period, status, or class. Automatically handles shared `CLASS_A_LOAD_REPORT` visibility across classes.
- **Configurations:** Protected by `auth`. Non-admin users are restricted to their own documents.
- **Parameters:**
  - `requirementKey` *(query, optional)*: Requirement key filter.
  - `instructorId` / `ownerId` *(query, optional)*: Owner ID (Admin mode).
  - `academicPeriodId` *(query, optional)*: Academic period ID.
  - `status` *(query, optional)*: Document status filter.
  - `classId` *(query, optional)*: Class ID filter.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Array of document objects.
    > *[Screenshot Placeholder — **Figure 32.** List Documents — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 33.** List Documents — Error Response]*

#### 2.4.3 Get Document Metadata by ID
- **Endpoint:** `http://localhost:5000/api/documents/:id`
- **Method:** `GET`
- **Description:** Retrieves a single document's metadata and version history.
- **Configurations:** Protected by `auth`. Accessible only by the owner or an administrator.
- **Parameters:**
  - `id` *(path, required)*: Document MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Document object.
    > *[Screenshot Placeholder — **Figure 34.** Get Document Metadata by ID — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 35.** Get Document Metadata by ID — Error Response]*

#### 2.4.4 Stream Document File
- **Endpoint:** `http://localhost:5000/api/documents/:id/file`
- **Method:** `GET`
- **Description:** Streams the binary file content from Google Drive inline to the browser with appropriate `Content-Type` and `Content-Disposition` headers.
- **Configurations:** Protected by `auth` (supports `Authorization: Bearer` or `?token=`). Accessible only by owner or administrator.
- **Parameters:**
  - `id` *(path, required)*: Document MongoDB ObjectId.
  - `version` *(query, optional)*: Specific version number `n` (defaults to `currentVersion`).
- **Response:** Binary file stream (`200 OK`) or JSON error (`401`, `403`, `404`, `500`).
    > *[Screenshot Placeholder — **Figure 36.** Stream Document File — Valid Request (200 OK)]*
    > *[Screenshot Placeholder — **Figure 37.** Stream Document File — Error Response]*

#### 2.4.5 Update Document Metadata
- **Endpoint:** `http://localhost:5000/api/documents/:id`
- **Method:** `PATCH`
- **Description:** Updates the `meta` object of an existing document and logs a `DOC_EDIT` audit entry.
- **Configurations:** Protected by `auth`. Blocks edits on class documents belonging to `Closed`/`Archived` academic periods.
- **Parameters:**
  - `id` *(path, required)*: Document MongoDB ObjectId.
  - `meta` *(object, optional)*: Key-value metadata fields to merge.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Document updated successfully.", "document": { ... } }`
    > *[Screenshot Placeholder — **Figure 38.** Update Document Metadata — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 39.** Update Document Metadata — Error Response]*

#### 2.4.6 Delete Document
- **Endpoint:** `http://localhost:5000/api/documents/:id`
- **Method:** `DELETE`
- **Description:** Deletes the associated file(s) from Google Drive, removes the MongoDB document record, and logs `DOC_DELETE`.
- **Configurations:** Protected by `auth`. Non-admin owners cannot delete `Approved` documents, and class documents in `Closed`/`Archived` periods cannot be deleted.
- **Parameters:**
  - `id` *(path, required)*: Document MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "Document deleted successfully." }`
    > *[Screenshot Placeholder — **Figure 40.** Delete Document — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 41.** Delete Document — Error Response]*

### 2.5 Classes API (Shared View & Archive)

#### Module Description
Allows instructors and administrators to view class compliance summaries and archive or unarchive classes.

**Endpoints:**
- `GET http://localhost:5000/api/classes/`
- `GET http://localhost:5000/api/classes/:id`
- `POST http://localhost:5000/api/classes/:id/archive`
- `POST http://localhost:5000/api/classes/:id/unarchive`

**Module Response Codes:** `200`, `401`, `404`, `500`

---

#### 2.5.1 List Classes
- **Endpoint:** `http://localhost:5000/api/classes/`
- **Method:** `GET`
- **Description:** Returns classes with per-class and overall compliance counts (`approvedCount`, `pendingCount`, `rejectedCount`, `completionPercent`), including shared `CLASS_A_LOAD_REPORT` documents.
- **Configurations:** Protected by `auth`. Admins can filter by `instructorId` or view all classes.
- **Parameters:**
  - `instructorId` *(query, optional)*: Filter classes by instructor (Admin mode only).
  - `academicPeriodId` *(query, optional)*: Filter by academic period ID.
  - `archived` *(query, optional)*: `"true"` to return only archived classes.
  - `includeArchived` *(query, optional)*: `"true"` to include both active and archived classes.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "classes": [...], "summary": { "needsAction": 0, "awaitingReview": 0, "approved": 0, "completion": 0 } }`
    > *[Screenshot Placeholder — **Figure 42.** List Classes — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 43.** List Classes — Error Response]*

#### 2.5.2 Get Class by ID
- **Endpoint:** `http://localhost:5000/api/classes/:id`
- **Method:** `GET`
- **Description:** Returns a single class along with requirement-level document status breakdown and completion percentage.
- **Configurations:** Protected by `auth`. Non-admin users can only access their own non-archived classes unless `includeArchived=true`.
- **Parameters:**
  - `id` *(path, required)*: Class MongoDB ObjectId.
  - `includeArchived` *(query, optional)*: `"true"` to allow viewing archived class records.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "class": { ... }, "counts": { "approved", "pendingReview", "rejected", "notSubmitted", "totalRequired" }, "completionPercent": 0, "requirementSummary": { ... } }`
    > *[Screenshot Placeholder — **Figure 44.** Get Class by ID — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 45.** Get Class by ID — Error Response]*

#### 2.5.3 Archive Class
- **Endpoint:** `http://localhost:5000/api/classes/:id/archive`
- **Method:** `POST`
- **Description:** Soft-archives a class by setting `archivedAt` to the current timestamp.
- **Configurations:** Protected by `auth`. Owners or admins can archive.
- **Parameters:**
  - `id` *(path, required)*: Class ID.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Class archived successfully." }`
    > *[Screenshot Placeholder — **Figure 46.** Archive Class — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 47.** Archive Class — Error Response]*

#### 2.5.4 Unarchive Class
- **Endpoint:** `http://localhost:5000/api/classes/:id/unarchive`
- **Method:** `POST`
- **Description:** Restores an archived class by clearing `archivedAt`.
- **Configurations:** Protected by `auth`. Owners or admins can unarchive.
- **Parameters:**
  - `id` *(path, required)*: Class ID.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Class unarchived successfully." }`
    > *[Screenshot Placeholder — **Figure 48.** Unarchive Class — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 49.** Unarchive Class — Error Response]*

### 2.6 Academic Periods API (Shared Read)

#### Module Description
Provides read-only access to the current active period, period list, and period compliance details for both Instructors and Administrators.

**Endpoints:**
- `GET http://localhost:5000/api/academic-periods/current`
- `GET http://localhost:5000/api/academic-periods/`
- `GET http://localhost:5000/api/academic-periods/:id/details`

**Module Response Codes:** `200`, `401`, `404`, `500`

---

#### 2.6.1 Get Current Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/current`
- **Method:** `GET`
- **Description:** Returns the currently active (`isCurrent: true` or latest `Active`) academic period and its formatted display label.
- **Configurations:** Protected by `auth` (accessible to both Instructors and Administrators).
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "currentPeriod": { ... }, "formatted": "AY 2026-2027 · 1st Semester" }`
    > *[Screenshot Placeholder — **Figure 50.** Get Current Academic Period — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 51.** Get Current Academic Period — Error Response]*

#### 2.6.2 List Academic Periods
- **Endpoint:** `http://localhost:5000/api/academic-periods/`
- **Method:** `GET`
- **Description:** Returns all academic periods enriched with class counts, document counts, and compliance rates.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `status` *(query, optional)*: Filter by period status (`Active`, `Closed`, `Upcoming`, `Archived`, or `all`).
  - `search` *(query, optional)*: Case-insensitive search on `schoolYear` or `semester`.
  - `includeArchived` *(query, optional)*: `"true"` to include archived periods.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "periods": [...], "count": 4 }`
    > *[Screenshot Placeholder — **Figure 52.** List Academic Periods — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 53.** List Academic Periods — Error Response]*

#### 2.6.3 Get Academic Period Details
- **Endpoint:** `http://localhost:5000/api/academic-periods/:id/details`
- **Method:** `GET`
- **Description:** Returns a detailed overview of a specific academic period including summary metrics, subjects, sections, and participating instructors.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `id` *(path, required)*: Academic period MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "period": { ... }, "formatted": "...", "summary": { ... }, "subjects": [...], "sections": [...], "instructors": [...] }`
    > *[Screenshot Placeholder — **Figure 54.** Get Academic Period Details — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 55.** Get Academic Period Details — Error Response]*

### 2.7 Notifications API

#### Module Description
Delivers role-scoped (`admin` vs `instructor`) in-app notifications and allows users to mark notifications as read or delete them.

**Endpoints:**
- `GET http://localhost:5000/api/notifications/`
- `PATCH http://localhost:5000/api/notifications/mark-all-read`
- `PATCH http://localhost:5000/api/notifications/:id/read`
- `DELETE http://localhost:5000/api/notifications/clear-all`
- `DELETE http://localhost:5000/api/notifications/:id`

**Module Response Codes:** `200`, `401`, `404`, `500`

---

#### 2.7.1 List Notifications
- **Endpoint:** `http://localhost:5000/api/notifications/`
- **Method:** `GET`
- **Description:** Returns up to 100 latest notifications for the authenticated user, scoped to their active role (`admin` or `instructor`).
- **Configurations:** Protected by `auth`. Populates `senderId` profile metadata.
- **Parameters:**
  - `category` *(query, optional)*: `"all"`, `"unread"`, `"pending"`, or `"system"`.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Array of notification objects.
    > *[Screenshot Placeholder — **Figure 56.** List Notifications — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 57.** List Notifications — Error Response]*

#### 2.7.2 Mark All Notifications as Read
- **Endpoint:** `http://localhost:5000/api/notifications/mark-all-read`
- **Method:** `PATCH`
- **Description:** Marks all unread notifications belonging to the user's current active role audience as read.
- **Configurations:** Protected by `auth`.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "All notifications marked as read." }`
    > *[Screenshot Placeholder — **Figure 58.** Mark All Notifications as Read — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 59.** Mark All Notifications as Read — Error Response]*

#### 2.7.3 Mark Notification as Read
- **Endpoint:** `http://localhost:5000/api/notifications/:id/read`
- **Method:** `PATCH`
- **Description:** Marks a single notification owned by the authenticated user as read (`readAt`).
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `id` *(path, required)*: Notification MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Updated notification object.
    > *[Screenshot Placeholder — **Figure 60.** Mark Notification as Read — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 61.** Mark Notification as Read — Error Response]*

#### 2.7.4 Clear All Notifications
- **Endpoint:** `http://localhost:5000/api/notifications/clear-all`
- **Method:** `DELETE`
- **Description:** Deletes all notifications belonging to the authenticated user.
- **Configurations:** Protected by `auth`.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "All notifications deleted.", "deletedCount": 12 }`
    > *[Screenshot Placeholder — **Figure 62.** Clear All Notifications — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 63.** Clear All Notifications — Error Response]*

#### 2.7.5 Delete Single Notification
- **Endpoint:** `http://localhost:5000/api/notifications/:id`
- **Method:** `DELETE`
- **Description:** Deletes a single notification owned by the authenticated user.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `id` *(path, required)*: Notification MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Notification deleted.", "id": "..." }`
    > *[Screenshot Placeholder — **Figure 64.** Delete Single Notification — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 65.** Delete Single Notification — Error Response]*

### 2.8 Reports API

#### Module Description
Assembles faculty and class compliance checklist data for previewing, downloading `.xlsx` workbooks, and exporting to Google Sheets.

**Endpoints:**
- `GET http://localhost:5000/api/reports/compliance/data`
- `GET http://localhost:5000/api/reports/compliance/excel`
- `POST http://localhost:5000/api/reports/compliance/sheets`

**Module Response Codes:** `200`, `401`, `500`, `503`

---

#### 2.8.1 Get Compliance Report Data
- **Endpoint:** `http://localhost:5000/api/reports/compliance/data`
- **Method:** `GET`
- **Description:** Assembles and returns live faculty & class compliance checklist data for the specified instructor and academic period.
- **Configurations:** Protected by `auth`. Admins can pass `instructorId`; instructors receive their own report.
- **Parameters:**
  - `instructorId` *(query, optional)*: Target instructor ID (Admin mode).
  - `periodId` *(query, optional)*: Academic period ID.
  - `schoolYear` *(query, optional)*: School year string (e.g., `"2026-2027"`).
  - `semester` *(query, optional)*: Semester string (`"1st"`, `"2nd"`, `"Summer"`).
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "instructor": { ... }, "facultyChecklist": [...], "classChecklist": { ... }, "documents": [...] }`
    > *[Screenshot Placeholder — **Figure 66.** Get Compliance Report Data — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 67.** Get Compliance Report Data — Error Response]*

#### 2.8.2 Download Compliance Excel Workbook
- **Endpoint:** `http://localhost:5000/api/reports/compliance/excel`
- **Method:** `GET`
- **Description:** Builds and downloads a formatted two-sheet BukSU COT Faculty Compliance Checklist `.xlsx` file using `ExcelJS`.
- **Configurations:** Protected by `auth`. Sets `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment`.
- **Parameters:**
  - `instructorId`, `periodId`, `schoolYear`, `semester` *(query, optional)*.
- **Response:** Binary `.xlsx` file download (`200 OK`) or JSON error (`401`, `500`).
    > *[Screenshot Placeholder — **Figure 68.** Download Compliance Excel Workbook — Valid Request (200 OK)]*
    > *[Screenshot Placeholder — **Figure 69.** Download Compliance Excel Workbook — Error Response]*

#### 2.8.3 Export Compliance Report to Google Sheets
- **Endpoint:** `http://localhost:5000/api/reports/compliance/sheets`
- **Method:** `POST`
- **Description:** Generates the compliance workbook and uploads/converts it into a Google Sheet inside the instructor's Drive Reports folder.
- **Configurations:** Protected by `auth`. Returns `503 Service Unavailable` if `googleSheetsEnabled` is disabled.
- **Parameters:**
  - `instructorId` *(body, optional)*: Target instructor ID (Admin mode).
  - `periodId`, `schoolYear`, `semester` *(body, optional)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "Google Sheet exported successfully.", "spreadsheetUrl": "...", "spreadsheetId": "..." }`
    > *[Screenshot Placeholder — **Figure 70.** Export Compliance Report to Google Sheets — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `503 Service Unavailable` (Google Sheets disabled), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 71.** Export Compliance Report to Google Sheets — Error Response]*

### 2.9 Public Settings & Audit Logs API (Shared)

#### Module Description
Provides public login-page flags (`recaptchaEnabled`, `googleAuthEnabled`) and role-scoped activity audit logs.

**Endpoints:**
- `GET http://localhost:5000/api/settings/public`
- `GET http://localhost:5000/api/settings/audit-logs`

**Module Response Codes:** `200`, `401`, `500`

---

#### 2.9.1 Get Public Settings
- **Endpoint:** `http://localhost:5000/api/settings/public`
- **Method:** `GET`
- **Description:** Returns public login configuration (`recaptchaEnabled`, `googleAuthEnabled`, `recaptchaSiteKey`, `googleClientId`).
- **Configurations:** Public route (no JWT required).
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "recaptchaEnabled": true, "googleAuthEnabled": true, "recaptchaSiteKey": "...", "googleClientId": "..." }`
    > *[Screenshot Placeholder — **Figure 72.** Get Public Settings — Valid Request (200 OK)]*

#### 2.9.2 Get Audit Logs
- **Endpoint:** `http://localhost:5000/api/settings/audit-logs`
- **Method:** `GET`
- **Description:** Returns paginated, filterable system audit logs. Administrators see all logs; users in Instructor mode see only their own activity logs.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `page` *(query, optional)*: Page number (default `1`).
  - `limit` *(query, optional)*: Items per page (default `20`).
  - `category`, `action`, `actorRole`, `search`, `startDate`, `endDate` *(query, optional)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Paginated audit log list and metadata.
    > *[Screenshot Placeholder — **Figure 73.** Get Audit Logs — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 74.** Get Audit Logs — Error Response]*

### 2.10 Resource Locks API

#### Module Description
Provides application-level pessimistic locking (`ResourceLock`) to prevent conflicting concurrent edits.

**Endpoints:**
- `POST http://localhost:5000/api/locks/acquire`
- `POST http://localhost:5000/api/locks/release`
- `GET http://localhost:5000/api/locks/status`

**Module Response Codes:** `200`, `400`, `401`, `500`

---

#### 2.10.1 Acquire Resource Lock
- **Endpoint:** `http://localhost:5000/api/locks/acquire`
- **Method:** `POST`
- **Description:** Attempts to acquire an exclusive, expiring edit lock for a given `resourceKey` (e.g., `document:<id>` or `academic-period:<id>`).
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `resourceKey` *(string, required)*: Unique identifier of the resource being locked.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "acquired": true, "locked": true, "isOwner": true, "lockedBy": "...", "lockedByName": "...", "expiresAt": "..." }`
    > *[Screenshot Placeholder — **Figure 75.** Acquire Resource Lock — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 76.** Acquire Resource Lock — Error Response]*

#### 2.10.2 Release Resource Lock
- **Endpoint:** `http://localhost:5000/api/locks/release`
- **Method:** `POST`
- **Description:** Releases a resource lock currently held by the authenticated user.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `resourceKey` *(string, required)*: Unique identifier of the locked resource.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "released": true }`
    > *[Screenshot Placeholder — **Figure 77.** Release Resource Lock — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 78.** Release Resource Lock — Error Response]*

#### 2.10.3 Check Resource Lock Status
- **Endpoint:** `http://localhost:5000/api/locks/status`
- **Method:** `GET`
- **Description:** Checks whether a resource is currently locked and who holds the lock.
- **Configurations:** Protected by `auth`.
- **Parameters:**
  - `resourceKey` *(query, required)*: Unique identifier of the resource.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Lock status object (`locked`, `isOwner`, `lockedBy`, `lockedByName`, `expiresAt`).
    > *[Screenshot Placeholder — **Figure 79.** Check Resource Lock Status — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 80.** Check Resource Lock Status — Error Response]*

### 2.11 System Health Check

#### Module Description
Verifies that the Express backend server is running and reachable.

**Endpoints:**
- `GET http://localhost:5000/api/hello`

**Module Response Codes:** `200`

---

#### 2.11.1 Server Greeting / Health Check
- **Endpoint:** `http://localhost:5000/api/hello`
- **Method:** `GET`
- **Description:** Basic unauthenticated endpoint to verify that the Express server is running and reachable.
- **Configurations:** Public route in `server/index.js`.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Hello from the server" }`
    > *[Screenshot Placeholder — **Figure 81.** Server Greeting / Health Check — Valid Request (200 OK)]*

---

---

## B. Instructor-Specific Module APIs

### 2.12 Invitation Onboarding API (Invitee Actions)

#### Module Description
Allows invited faculty members to inspect their invitation link, accept or decline the invitation, and complete initial password setup.

**Endpoints:**
- `GET http://localhost:5000/api/invitations/token/:token`
- `PATCH http://localhost:5000/api/invitations/:token/accept`
- `PATCH http://localhost:5000/api/invitations/:token/reject`
- `POST http://localhost:5000/api/invitations/token/:token/setup`

**Module Response Codes:** `200`, `400`, `404`, `409`, `410`, `500`

---

#### 2.12.1 Get Invitation by Token
- **Endpoint:** `http://localhost:5000/api/invitations/token/:token`
- **Method:** `GET`
- **Description:** Validates an invitation or pending account-setup token and returns basic invitee details for the onboarding page.
- **Configurations:** Automatically marks expired `Pending` invitations as `Expired` and returns `410 Gone` for inactive/expired/cancelled links.
- **Parameters:**
  - `token` *(path, required)*: 64-character hex invitation token.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "fullName": "...", "email": "...", "department": "...", "invitedBy": "...", "needsSetup": false }`
    > *[Screenshot Placeholder — **Figure 82.** Get Invitation by Token — Valid Request (200 OK)]*
  - **Error Responses:** `404 Not Found` (`INVITATION_NOT_FOUND`), `410 Gone` (`INVITATION_EXPIRED` / `INVITATION_CANCELLED` / `INVITATION_REJECTED`), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 83.** Get Invitation by Token — Error Response]*

#### 2.12.2 Accept Invitation
- **Endpoint:** `http://localhost:5000/api/invitations/:token/accept`
- **Method:** `PATCH`
- **Description:** Atomically accepts a `Pending`, unexpired invitation, records privacy notice acknowledgment, extends expiry by 7 days for setup, and notifies administrators.
- **Configurations:** Atomic `findOneAndUpdate` ensures an invitation can only be accepted once.
- **Parameters:**
  - `token` *(path, required)*: Invitation token.
  - `privacyNoticeVersion` *(string, optional)*: Acknowledged privacy notice version.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Invitation accepted.", "needsSetup": true }`
    > *[Screenshot Placeholder — **Figure 84.** Accept Invitation — Valid Request (200 OK)]*
  - **Error Responses:** `409 Conflict` (`INVITATION_ALREADY_ACCEPTED`), `410 Gone` (`INVITATION_INVALID`), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 85.** Accept Invitation — Error Response]*

#### 2.12.3 Reject Invitation
- **Endpoint:** `http://localhost:5000/api/invitations/:token/reject`
- **Method:** `PATCH`
- **Description:** Atomically declines a `Pending`, unexpired invitation and notifies administrators.
- **Configurations:** Atomic `findOneAndUpdate`.
- **Parameters:**
  - `token` *(path, required)*: Invitation token.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Invitation rejected.", "needsSetup": false }`
    > *[Screenshot Placeholder — **Figure 86.** Reject Invitation — Valid Request (200 OK)]*
  - **Error Responses:** `409 Conflict`, `410 Gone`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 87.** Reject Invitation — Error Response]*

#### 2.12.4 Complete Account Setup
- **Endpoint:** `http://localhost:5000/api/invitations/token/:token/setup`
- **Method:** `POST`
- **Description:** Sets the instructor's password, activates `accountStatus` to `"Active"`, consumes (`$unset`) the invitation token, and notifies administrators.
- **Configurations:** Atomic update requires `status: "Accepted"`, `accountStatus: "Pending"`, and unexpired `expiresAt`.
- **Parameters:**
  - `token` *(path, required)*: Setup token.
  - `password` *(string, required)*: Password (minimum 8 characters).
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Account created. You can now log in." }`
    > *[Screenshot Placeholder — **Figure 88.** Complete Account Setup — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (password too short), `410 Gone` (invalid/expired setup link), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 89.** Complete Account Setup — Error Response]*

### 2.13 Class Management API (Instructor Owner Actions)

#### Module Description
Allows instructors to create, update, and delete their own classes within an academic period.

**Endpoints:**
- `POST http://localhost:5000/api/classes/`
- `PATCH http://localhost:5000/api/classes/:id`
- `DELETE http://localhost:5000/api/classes/:id`

**Module Response Codes:** `200`, `201`, `400`, `401`, `404`, `409`, `500`

---

#### 2.13.1 Create Class
- **Endpoint:** `http://localhost:5000/api/classes/`
- **Method:** `POST`
- **Description:** Creates a new class for the authenticated instructor in the specified (or current active) academic period and auto-links any existing `CLASS_A_LOAD_REPORT` document.
- **Configurations:** Protected by `auth`. Validates `classPolicy` fields and rejects duplicate `(subjectCode, sectionCode)` in the same period.
- **Parameters:**
  - `subjectCode` *(string, required)*: Subject code (normalized uppercase).
  - `subjectName` *(string, optional)*: Subject title (defaults to `subjectCode`).
  - `sectionCode` *(string, required)*: Section code (normalized uppercase).
  - `sectionName` *(string, optional)*: Section display name.
  - `sectionGroup` *(string, optional)*: Optional section group label.
  - `academicPeriodId` *(string, optional)*: Target period ID (defaults to current/active period).
- **Response (`application/json`):**
  - **Success (`201 Created`):** Created class summary object.
    > *[Screenshot Placeholder — **Figure 90.** Create Class — Valid Request (201 Created)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `409 Conflict` (duplicate class), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 91.** Create Class — Error Response]*

#### 2.13.2 Update Class
- **Endpoint:** `http://localhost:5000/api/classes/:id`
- **Method:** `PATCH`
- **Description:** Updates subject and/or section fields of an active class owned by the authenticated instructor.
- **Configurations:** Protected by `auth`. Prevents duplicate `(subjectCode, sectionCode)` within the same academic period.
- **Parameters:**
  - `id` *(path, required)*: Class ID.
  - `subjectCode`, `subjectName`, `sectionCode`, `sectionName`, `sectionGroup` *(body, optional)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Updated class document.
    > *[Screenshot Placeholder — **Figure 92.** Update Class — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 93.** Update Class — Error Response]*

#### 2.13.3 Delete Class
- **Endpoint:** `http://localhost:5000/api/classes/:id`
- **Method:** `DELETE`
- **Description:** Permanently deletes a class and unlinks it from associated documents, or archives it when `permanent=false`.
- **Configurations:** Protected by `auth`. Restricted to the class owner.
- **Parameters:**
  - `id` *(path, required)*: Class ID.
  - `permanent` *(query, optional)*: Set `"false"` to archive instead of hard-deleting.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Class deleted completely." }` (or `"Class archived successfully."`).
    > *[Screenshot Placeholder — **Figure 94.** Delete Class — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 95.** Delete Class — Error Response]*

### 2.14 Portfolio Document Upload API (Instructor Submissions)

#### Module Description
Allows instructors to upload or replace faculty and class portfolio requirement files into Google Drive.

**Endpoints:**
- `POST http://localhost:5000/api/documents/upload`

**Module Response Codes:** `201`, `400`, `401`, `403`, `404`, `500`, `503`

---

#### 2.14.1 Upload Portfolio Document
- **Endpoint:** `http://localhost:5000/api/documents/upload`
- **Method:** `POST`
- **Description:** Uploads a portfolio file (`multipart/form-data`) to Google Drive, creates or replaces the MongoDB `Document` record (`Pending Review`), logs an audit entry, and notifies administrators.
- **Configurations:** Protected by `auth` and `upload.single('file')` (Multer). Blocks class uploads to `Closed`/`Archived` academic periods and returns `503` if `googleDriveEnabled` is disabled.
- **Parameters:**
  - `file` *(form-data file, required)*: File to upload.
  - `requirementKey` *(form-data string, required)*: Target requirement key.
  - `documentId` *(form-data string, optional)*: Existing document ID when replacing.
  - `academicPeriodId` *(form-data string, optional)*: Target period ID (defaults to current period).
  - `meta` *(form-data JSON string, optional)*: Additional requirement metadata.
  - `slot` *(form-data JSON string, optional)*: Slot metadata (e.g., `{ "co": "CO1" }`).
  - `class` / `classIds` *(form-data JSON string, optional)*: Array of linked class IDs.
- **Response (`application/json`):**
  - **Success (`201 Created`):** `{ "message": "File uploaded successfully.", "document": { ... } }`
    > *[Screenshot Placeholder — **Figure 96.** Upload Portfolio Document — Valid Request (201 Created)]*
  - **Error Responses:** `400 Bad Request` (missing file or `requirementKey`), `401 Unauthorized`, `403 Forbidden` (closed/archived period), `404 Not Found`, `503 Service Unavailable` (Drive disabled), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 97.** Upload Portfolio Document — Error Response]*

---

## C. Administrator-Specific Module APIs

### 2.15 Instructor Management & Access Control API

#### Module Description
Allows administrators to list instructors, view permission metadata, toggle account status (`Active` / `Deactivated`), and grant or revoke granular admin access.

**Endpoints:**
- `GET http://localhost:5000/api/instructors/`
- `GET http://localhost:5000/api/instructors/permissions/meta`
- `GET http://localhost:5000/api/instructors/:id`
- `PATCH http://localhost:5000/api/instructors/:id/status`
- `PATCH http://localhost:5000/api/instructors/:id/admin-access`

**Module Response Codes:** `200`, `400`, `401`, `403`, `404`, `500`

---

#### 2.15.1 List Instructors
- **Endpoint:** `http://localhost:5000/api/instructors/`
- **Method:** `GET`
- **Description:** Refreshes stale online statuses and returns all accepted/active instructor records excluding sensitive credential fields.
- **Configurations:** Supports optional `excludeSelf` filtering when a Bearer JWT is provided.
- **Parameters:**
  - `excludeSelf` *(query, optional)*: Set `"true"` or `"1"` to exclude the currently authenticated user.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Array of instructor objects.
    > *[Screenshot Placeholder — **
    *
  - **Error Responses:** `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 99.** List Instructors — Error Response]*

#### 2.15.2 Get Admin Permissions Metadata
- **Endpoint:** `http://localhost:5000/api/instructors/permissions/meta`
- **Method:** `GET`
- **Description:** Returns available admin pages, faculty document permissions, and class document permissions used by the Admin Access modal.
- **Configurations:** Protected by `auth` middleware.
- **Parameters:** `Authorization: Bearer <token>` header *(required)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "pages": [...], "facultyDocuments": [...], "classDocuments": [...] }`
    > *[Screenshot Placeholder — **Figure 100.** Get Admin Permissions Metadata — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`.
    > *[Screenshot Placeholder — **Figure 101.** Get Admin Permissions Metadata — Error Response]*

#### 2.15.3 Get Instructor by ID
- **Endpoint:** `http://localhost:5000/api/instructors/:id`
- **Method:** `GET`
- **Description:** Retrieves a single instructor record without sensitive credential fields.
- **Configurations:** Refreshes stale online statuses before querying.
- **Parameters:**
  - `id` *(path, required)*: Instructor MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Instructor object.
    > *[Screenshot Placeholder — **Figure 102.** Get Instructor by ID — Valid Request (200 OK)]*
  - **Error Responses:** `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 103.** Get Instructor by ID — Error Response]*

#### 2.15.4 Update Instructor Account Status
- **Endpoint:** `http://localhost:5000/api/instructors/:id/status`
- **Method:** `PATCH`
- **Description:** Activates or deactivates an instructor account (`Active` or `Deactivated`). Deactivating also sets `onlineStatus` to `Offline`.
- **Configurations:** Protected by `auth` and `requireAdminAccess('instructors')`. Prevents an administrator from changing their own status.
- **Parameters:**
  - `id` *(path, required)*: Target instructor ID.
  - `accountStatus` *(string, required)*: `"Active"` or `"Deactivated"`.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Updated instructor object.
    > *[Screenshot Placeholder — **Figure 104.** Update Instructor Account Status — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (invalid status), `401 Unauthorized`, `403 Forbidden` (self-modification or insufficient permission), `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 105.** Update Instructor Account Status — Error Response]*

#### 2.15.5 Update Instructor Admin Access
- **Endpoint:** `http://localhost:5000/api/instructors/:id/admin-access`
- **Method:** `PATCH`
- **Description:** Grants, updates, or revokes limited or full administrator permissions for an instructor, writes an audit log, sends in-app notifications, and sends an email notification.
- **Configurations:** Protected by `auth` and `requireAdminAccess('instructors')`. Blocks self-modification and blocks modifying built-in `Administrator` accounts.
- **Parameters:**
  - `id` *(path, required)*: Target instructor ID.
  - `enabled` *(boolean, required)*: Whether admin access is enabled.
  - `scope` *(string, optional)*: `"full"`, `"limited"`, or `"none"`.
  - `pages` *(array, optional)*: Allowed admin page keys.
  - `documents` *(object, optional)*: `{ "faculty": [...], "class": [...] }`.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "instructor": { ... }, "emailSent": true, "summary": "..." }`
    > *[Screenshot Placeholder — **Figure 106.** Update Instructor Admin Access — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 107.** Update Instructor Admin Access — Error Response]*

### 2.16 Invitation Management API (Admin Actions)

#### Module Description
Allows administrators to send faculty invitations, monitor invitation statuses, resend expired/declined links, and cancel pending invitations.

**Endpoints:**
- `POST http://localhost:5000/api/invitations/`
- `GET http://localhost:5000/api/invitations/`
- `GET http://localhost:5000/api/invitations/accepted`
- `GET http://localhost:5000/api/invitations/active`
- `GET http://localhost:5000/api/invitations/:id`
- `PATCH http://localhost:5000/api/invitations/:id/resend`
- `PATCH http://localhost:5000/api/invitations/:id/cancel`

**Module Response Codes:** `200`, `201`, `400`, `404`, `409`, `500`, `502`, `503`

---

#### 2.16.1 Send Instructor Invitation
- **Endpoint:** `http://localhost:5000/api/invitations/`
- **Method:** `POST`
- **Description:** Creates (or re-invites a cancelled) instructor invitation with a 7-day token, optionally assigns `adminAccess`, sends the invitation email via Nodemailer, and logs an audit entry.
- **Configurations:** Uses `optionalAuth` to record the inviter's name. Validates institutional email domain via `invitationPolicy`. Rolls back the record if email delivery fails.
- **Parameters:**
  - `firstName` *(string, required)*: Invitee's given name.
  - `middleName` *(string, optional)*: Invitee's middle name.
  - `lastName` *(string, required)*: Invitee's family name.
  - `email` *(string, required)*: Institutional email address.
  - `department` *(string, required)*: Academic department.
  - `adminAccess` *(object, optional)*: Initial administrator access permissions.
- **Response (`application/json`):**
  - **Success (`201 Created`):** Created invitation/instructor object (private fields stripped).
    > *[Screenshot Placeholder — **Figure 108.** Send Instructor Invitation — Valid Request (201 Created)]*
  - **Error Responses:** `400 Bad Request` (missing fields or non-institutional email), `409 Conflict` (already invited/active), `502 Bad Gateway` / `503 Service Unavailable` (mail error or disabled), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 109.** Send Instructor Invitation — Error Response]*

#### 2.16.2 List Invitations
- **Endpoint:** `http://localhost:5000/api/invitations/`
- **Method:** `GET`
- **Description:** Expires stale pending invitations and returns all invited records sorted by `dateSent` descending.
- **Configurations:** Strips `token`, `password`, `googleId`, and reset tokens.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Array of invitation objects.
    > *[Screenshot Placeholder — **Figure 110.** List Invitations — Valid Request (200 OK)]*
  - **Error Responses:** `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 111.** List Invitations — Error Response]*

#### 2.16.3 List Accepted Invitations
- **Endpoint:** `http://localhost:5000/api/invitations/accepted`
- **Method:** `GET`
- **Description:** Expires stale invitations and returns all invitations with `status: "Accepted"`.
- **Configurations:** Strips private/token fields.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Array of accepted invitation objects.
    > *[Screenshot Placeholder — **Figure 112.** List Accepted Invitations — Valid Request (200 OK)]*
  - **Error Responses:** `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 113.** List Accepted Invitations — Error Response]*

#### 2.16.4 List Active/Inactive Instructors
- **Endpoint:** `http://localhost:5000/api/invitations/active`
- **Method:** `GET`
- **Description:** Returns all instructor accounts whose `accountStatus` is `"Active"` or `"Inactive"`.
- **Configurations:** Strips private/token fields.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Array of instructor objects.
    > *[Screenshot Placeholder — **Figure 114.** List Active/Inactive Instructors — Valid Request (200 OK)]*
  - **Error Responses:** `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 115.** List Active/Inactive Instructors — Error Response]*

#### 2.16.5 Get Invited Instructor by ID
- **Endpoint:** `http://localhost:5000/api/invitations/:id`
- **Method:** `GET`
- **Description:** Retrieves an individual instructor/invitation record by MongoDB ObjectId.
- **Configurations:** Validates ObjectId format; strips private fields.
- **Parameters:**
  - `id` *(path, required)*: Instructor MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Instructor object.
    > *[Screenshot Placeholder — **Figure 116.** Get Invited Instructor by ID — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (invalid ID), `404 Not Found`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 117.** Get Invited Instructor by ID — Error Response]*

#### 2.16.6 Resend Invitation
- **Endpoint:** `http://localhost:5000/api/invitations/:id/resend`
- **Method:** `PATCH`
- **Description:** Resends a `Rejected` or `Expired` invitation with a newly rotated 7-day token and increments `resendCount`.
- **Configurations:** Re-validates institutional email policy and rolls back state if email delivery fails.
- **Parameters:**
  - `id` *(path, required)*: Invitation/Instructor MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Updated invitation object (private fields stripped).
    > *[Screenshot Placeholder — **Figure 118.** Resend Invitation — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (invalid ID or email policy), `404 Not Found`, `409 Conflict` (not rejected/expired), `502`/`503` (mail failure), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 119.** Resend Invitation — Error Response]*

#### 2.16.7 Cancel Invitation
- **Endpoint:** `http://localhost:5000/api/invitations/:id/cancel`
- **Method:** `PATCH`
- **Description:** Cancels a `Pending` invitation and rotates its token so the old link can no longer be used.
- **Configurations:** Only `Pending` invitations can be cancelled.
- **Parameters:**
  - `id` *(path, required)*: Invitation MongoDB ObjectId.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Updated cancelled invitation object.
    > *[Screenshot Placeholder — **Figure 120.** Cancel Invitation — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `404 Not Found`, `409 Conflict` (already accepted/rejected/expired/cancelled), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 121.** Cancel Invitation — Error Response]*

### 2.17 Document Review API (Admin Approval / Rejection)

#### Module Description
Allows administrators with document review access to approve or reject submitted portfolio documents with comments and concurrency checks.

**Endpoints:**
- `PATCH http://localhost:5000/api/documents/:id/review`

**Module Response Codes:** `200`, `400`, `401`, `403`, `404`, `409`, `500`

---

#### 2.17.1 Review Document (Approve / Reject)
- **Endpoint:** `http://localhost:5000/api/documents/:id/review`
- **Method:** `PATCH`
- **Description:** Approves or rejects a submitted document, attaches the review record to the current version, notifies the document owner, and logs `DOC_APPROVE` / `DOC_REJECT`.
- **Configurations:** Protected by `auth`. Requires active Admin mode, `hasDocumentReviewAccess`, blocks self-review, checks pessimistic `ResourceLock`, and supports optimistic locking via `expectedVersion` (`__v`). Rejections require a `comment` within `REJECT_COMMENT_MAX_WORDS`.
- **Parameters:**
  - `id` *(path, required)*: Document MongoDB ObjectId.
  - `decision` *(string, required)*: `"approved"` or `"rejected"`.
  - `comment` *(string, conditional)*: Required when `decision` is `"rejected"`.
  - `expectedVersion` *(number, optional)*: Expected `__v` for optimistic concurrency control.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "message": "Document successfully approved.", "document": { ... } }`
    > *[Screenshot Placeholder — **Figure 122.** Review Document (Approve / Reject) — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (lock conflict or `VERSION_CONFLICT`), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 123.** Review Document (Approve / Reject) — Error Response]*

### 2.18 Academic Period Lifecycle API (Admin Management)

#### Module Description
Allows administrators to create, edit, activate, close, archive, reopen, and delete academic periods.

**Endpoints:**
- `POST http://localhost:5000/api/academic-periods/`
- `PUT http://localhost:5000/api/academic-periods/:id`
- `PATCH http://localhost:5000/api/academic-periods/:id/activate`
- `PATCH http://localhost:5000/api/academic-periods/:id/close`
- `PATCH http://localhost:5000/api/academic-periods/:id/archive`
- `PATCH http://localhost:5000/api/academic-periods/:id/unarchive`
- `DELETE http://localhost:5000/api/academic-periods/:id`

**Module Response Codes:** `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`

---

#### 2.18.1 Create Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/`
- **Method:** `POST`
- **Description:** Creates a new academic period, validates consecutive `YYYY-YYYY` format and date ordering, optionally sets it as current, and logs `PERIOD_CREATE`.
- **Configurations:** Protected by `auth` and `requireAdminAccess('academic_period')`.
- **Parameters:**
  - `schoolYear` *(string, required)*: Consecutive year format (e.g., `"2026-2027"`).
  - `semester` *(string, required)*: `"1st"`, `"2nd"`, or `"Summer"`.
  - `startDate` *(string, required)*: ISO date string.
  - `endDate` *(string, required)*: ISO date string (must be later than `startDate`).
  - `status` *(string, optional)*: `"Upcoming"`, `"Active"`, or `"Archived"`.
  - `setActive` *(boolean, optional)*: Set `true` to make this period the active default.
- **Response (`application/json`):**
  - **Success (`201 Created`):** `{ "success": true, "message": "...", "period": { ... } }`
    > *[Screenshot Placeholder — **Figure 124.** Create Academic Period — Valid Request (201 Created)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict` (duplicate period), `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 125.** Create Academic Period — Error Response]*

#### 2.18.2 Update Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/:id`
- **Method:** `PUT`
- **Description:** Updates an unarchived academic period's school year, semester, dates, or status, with pessimistic and optimistic concurrency checks.
- **Configurations:** Protected by `auth` and `requireAdminAccess('academic_period')`. Checks `ResourceLock` (`academic-period:<id>`) and `expectedUpdatedAt`.
- **Parameters:**
  - `id` *(path, required)*: Academic period ID.
  - `schoolYear`, `semester`, `startDate`, `endDate`, `status`, `expectedUpdatedAt` *(body, optional)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "Academic period updated successfully.", "period": { ... } }`
    > *[Screenshot Placeholder — **Figure 126.** Update Academic Period — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 127.** Update Academic Period — Error Response]*

#### 2.18.3 Activate Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/:id/activate`
- **Method:** `PATCH`
- **Description:** Sets the specified non-archived period as `Active` / `isCurrent: true` and closes the previously active period.
- **Configurations:** Protected by `auth` and `requireAdminAccess('academic_period')`. Checks `ResourceLock`.
- **Parameters:**
  - `id` *(path, required)*: Academic period ID.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "...", "period": { ... } }`
    > *[Screenshot Placeholder — **Figure 128.** Activate Academic Period — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 129.** Activate Academic Period — Error Response]*

#### 2.18.4 Close Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/:id/close`
- **Method:** `PATCH`
- **Description:** Closes an academic period (`status: "Closed"`, `isCurrent: false`), locking further class portfolio submissions and modifications.
- **Configurations:** Protected by `auth` and `requireAdminAccess('academic_period')`. Checks `ResourceLock`.
- **Parameters:**
  - `id` *(path, required)*: Academic period ID.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "...", "period": { ... } }`
    > *[Screenshot Placeholder — **Figure 130.** Close Academic Period — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 131.** Close Academic Period — Error Response]*

#### 2.18.5 Archive Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/:id/archive`
- **Method:** `PATCH`
- **Description:** Archives the academic period and marks all unarchived classes belonging to that period as archived.
- **Configurations:** Protected by `auth` and `requireAdminAccess('academic_period')`. Checks `ResourceLock`.
- **Parameters:**
  - `id` *(path, required)*: Academic period ID.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "...", "period": { ... } }`
    > *[Screenshot Placeholder — **Figure 132.** Archive Academic Period — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 133.** Archive Academic Period — Error Response]*

#### 2.18.6 Unarchive Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/:id/unarchive`
- **Method:** `PATCH`
- **Description:** Reopens an archived academic period by setting its status back to `Closed` and clearing `isArchived` / `archivedAt`.
- **Configurations:** Protected by `auth` and `requireAdminAccess('academic_period')`. Checks `ResourceLock`.
- **Parameters:**
  - `id` *(path, required)*: Academic period ID.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "...", "period": { ... } }`
    > *[Screenshot Placeholder — **Figure 134.** Unarchive Academic Period — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 135.** Unarchive Academic Period — Error Response]*

#### 2.18.7 Delete Academic Period
- **Endpoint:** `http://localhost:5000/api/academic-periods/:id`
- **Method:** `DELETE`
- **Description:** Permanently deletes an academic period if it is not currently active and has zero associated classes or documents.
- **Configurations:** Protected by `auth` and `requireAdminAccess('academic_period')`. Checks `ResourceLock`.
- **Parameters:**
  - `id` *(path, required)*: Academic period ID.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "..." }`
    > *[Screenshot Placeholder — **Figure 136.** Delete Academic Period — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request` (active or has linked data), `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 137.** Delete Academic Period — Error Response]*

### 2.19 API & System Settings Management API (Admin Configuration)

#### Module Description
Allows administrators to view/update external API credentials, switch `default`/`custom` modes, test connections, and unlock sensitive settings via password or OTP.

**Endpoints:**
- `GET http://localhost:5000/api/settings/`
- `PUT http://localhost:5000/api/settings/`
- `PUT http://localhost:5000/api/settings/modes`
- `POST http://localhost:5000/api/settings/restore-defaults`
- `POST http://localhost:5000/api/settings/test-connection`
- `POST http://localhost:5000/api/settings/verify-password`
- `POST http://localhost:5000/api/settings/send-otp`
- `POST http://localhost:5000/api/settings/verify-otp`

**Module Response Codes:** `200`, `400`, `401`, `403`, `404`, `429`, `500`

---

#### 2.19.1 Get System & API Settings
- **Endpoint:** `http://localhost:5000/api/settings/`
- **Method:** `GET`
- **Description:** Returns feature toggles, active `apiModes`, and masked API credentials for the Administrator Settings UI.
- **Configurations:** Protected by `auth` and `requireAdminAccess('api_settings')`. Sensitive secrets are masked before returning.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Settings object with toggles, `apiModes`, and masked credentials.
    > *[Screenshot Placeholder — **Figure 138.** Get System & API Settings — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 139.** Get System & API Settings — Error Response]*

#### 2.19.2 Update System & API Settings
- **Endpoint:** `http://localhost:5000/api/settings/`
- **Method:** `PUT`
- **Description:** Updates feature toggles and/or custom API credentials, resets cached Google Drive/SMTP clients when credentials change, and logs an audit entry.
- **Configurations:** Protected by `auth` and `requireAdminAccess('api_settings')`.
- **Parameters:** Feature toggle keys and/or credential key-value pairs *(body, optional)*.
- **Response (`application/json`):**
  - **Success (`200 OK`):** Updated settings summary.
    > *[Screenshot Placeholder — **Figure 140.** Update System & API Settings — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 141.** Update System & API Settings — Error Response]*

#### 2.19.3 Update Active API Modes
- **Endpoint:** `http://localhost:5000/api/settings/modes`
- **Method:** `PUT`
- **Description:** Switches one or more integration groups (`googleMail`, `googleDrive`, `recaptcha`, `googleSheets`, `googleAuth`) between `"default"` and `"custom"` mode.
- **Configurations:** Protected by `auth` and `requireAdminAccess('api_settings')`. Blocks switching to `"custom"` if custom credentials are not configured.
- **Parameters:**
  - `group` *(string, optional)* & `mode` *(string, optional)*: Single service group and `"default"` or `"custom"`.
  - `modes` *(object, optional)*: Map of `{ [group]: "default" | "custom" }`.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "Active API mode updated successfully.", "apiModes": { ... } }`
    > *[Screenshot Placeholder — **Figure 142.** Update Active API Modes — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 143.** Update Active API Modes — Error Response]*

#### 2.19.4 Restore Default APIs
- **Endpoint:** `http://localhost:5000/api/settings/restore-defaults`
- **Method:** `POST`
- **Description:** Sets all external service groups back to `"default"` mode while preserving saved custom configurations.
- **Configurations:** Protected by `auth` and `requireAdminAccess('api_settings')`.
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "...", "apiModes": { ... } }`
    > *[Screenshot Placeholder — **Figure 144.** Restore Default APIs — Valid Request (200 OK)]*
  - **Error Responses:** `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 145.** Restore Default APIs — Error Response]*

#### 2.19.5 Test External API Connection
- **Endpoint:** `http://localhost:5000/api/settings/test-connection`
- **Method:** `POST`
- **Description:** Verifies live connectivity for `googleMail`, `googleDrive`, `recaptcha`, or `googleSheets` using provided or stored credentials and logs the result.
- **Configurations:** Protected by `auth` and `requireAdminAccess('api_settings')`. Enforces a 5-second timeout per check.
- **Parameters:**
  - `service` *(string, required)*: `"googleMail"`, `"googleDrive"`, `"recaptcha"`, or `"googleSheets"`.
  - `credentials` *(object, optional)*: Unsaved credential fields to test.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "..." }`
    > *[Screenshot Placeholder — **Figure 146.** Test External API Connection — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 147.** Test External API Connection — Error Response]*

#### 2.19.6 Verify Admin Password for Settings
- **Endpoint:** `http://localhost:5000/api/settings/verify-password`
- **Method:** `POST`
- **Description:** Re-verifies the administrator's local password and returns unmasked credentials for editing.
- **Configurations:** Protected by `auth`, `requireAdminAccess('api_settings')`, and `settingsOtpVerifyLimiter` (5 failed attempts per 5 minutes per user/IP).
- **Parameters:**
  - `password` *(string, required)*: Administrator account password.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "unmaskedCustomCredentials": { ... }, "unmaskedDefaultCredentials": { ... }, "unmaskedCredentials": { ... } }`
    > *[Screenshot Placeholder — **Figure 148.** Verify Admin Password for Settings — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `429 Too Many Requests`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 149.** Verify Admin Password for Settings — Error Response]*

#### 2.19.7 Send Settings Verification OTP
- **Endpoint:** `http://localhost:5000/api/settings/send-otp`
- **Method:** `POST`
- **Description:** Generates a 6-digit OTP (5-minute expiry, SHA-256 hashed) and emails it to the administrator's email, bypassing `googleMailEnabled` and falling back to `.env` SMTP if needed.
- **Configurations:** Protected by `auth`, `requireAdminAccess('api_settings')`, and `settingsOtpSendLimiter` (3 requests per 5 minutes per user/IP).
- **Parameters:** None.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "message": "Verification code sent to your email.", "email": "...", "adminProfile": { ... } }`
    > *[Screenshot Placeholder — **Figure 150.** Send Settings Verification OTP — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `429 Too Many Requests`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 151.** Send Settings Verification OTP — Error Response]*

#### 2.19.8 Verify Settings OTP
- **Endpoint:** `http://localhost:5000/api/settings/verify-otp`
- **Method:** `POST`
- **Description:** Verifies the 6-digit single-use OTP and returns unmasked credentials to unlock API Settings.
- **Configurations:** Protected by `auth`, `requireAdminAccess('api_settings')`, and `settingsOtpVerifyLimiter` (5 failed attempts per 5 minutes per user/IP).
- **Parameters:**
  - `otp` *(string, required)*: 6-digit numeric verification code.
- **Response (`application/json`):**
  - **Success (`200 OK`):** `{ "success": true, "unmaskedCustomCredentials": { ... }, "unmaskedDefaultCredentials": { ... }, "unmaskedCredentials": { ... } }`
    > *[Screenshot Placeholder — **Figure 152.** Verify Settings OTP — Valid Request (200 OK)]*
  - **Error Responses:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `429 Too Many Requests`, `500 Internal Server Error`.
    > *[Screenshot Placeholder — **Figure 153.** Verify Settings OTP — Error Response]*

---

## III. External API Documentation Table

The following third-party APIs and server-side integration libraries are used by the COT Instructor Portfolio Management System:

| External API / Service | Package / Endpoint | Purpose in System | Key Backend Files |
| :--- | :--- | :--- | :--- |
| **Google OAuth 2.0 API** | `google-auth-library` (`OAuth2Client.verifyIdToken`) | Verifies Google Sign-In ID tokens and retrieves verified email and profile photos for existing users. | `server/controllers/authController.js` |
| **Google Drive API (v3)** | `googleapis` (`google.drive`) | Stores uploaded faculty and class portfolio files privately in structured department/instructor/period folders and streams files back to authorized users. | `server/utils/storageService.js`, `server/utils/driveNaming.js` |
| **Google Sheets API (v4)** | `googleapis` (`google.sheets` + `google.drive`) | Exports live Faculty & Class Compliance Checklists as formatted Google Sheets in the instructor's Drive Reports folder. | `server/utils/sheetsService.js`, `server/reports/complianceWorkbook.js` |
| **Google reCAPTCHA API** | `https://www.google.com/recaptcha/api/siteverify` | Verifies human interaction on login to protect against automated bot and brute-force attacks. | `server/utils/verifyRecaptcha.js` |
| **Nodemailer (Gmail SMTP)** | `nodemailer` (`smtp.gmail.com:465`, SSL) | Sends faculty invitation links, password-reset OTPs, API settings security OTPs, and admin access notifications. | `server/utils/sendEmail.js` |
| **ExcelJS** *(Server Library)* | `exceljs` | Programmatically builds multi-sheet BukSU COT Faculty Compliance Checklist `.xlsx` workbooks for download and Google Sheets export. | `server/utils/excelService.js`, `server/reports/complianceWorkbook.js` |
