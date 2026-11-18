# COT Instructor E-Portfolio Management System

> **Bukidnon State University — College of Technologies (BukSU COT)**  
> A web-based platform for instructors and administrators to manage, monitor, verify, and archive faculty and class portfolio compliance requirements.

---

## 📌 Overview

The **COT Instructor E-Portfolio Management System** streamlines academic and faculty compliance by transitioning physical documentation into an organized, cloud-integrated digital workspace. 

The system provides dedicated portals for:
- **Instructors**: Track deliverables, upload Course Outcome (CO) evidence, manage class requirements, maintain personal faculty credentials (PDS, certificates, research, service records), view reviewer remarks, and generate compliance checklists.
- **Administrators / Department Chairs / Deans**: Invite instructors, review and approve/reject submissions with granular remarks, track live submission progress across departments, manage academic periods (semesters & school years), manage system API integrations, and access archived records.

---

## 🚀 Key Features

### 👨‍🏫 Instructor Portal
- **Dashboard & Metric Overview**: Live completion counters, pending reviews, approval statuses, and recent notification feeds.
- **Faculty Portfolio**: Upload and organize requirements across 10 statutory categories (Educational Attainment, Service Records, Seminars & Workshops, Grants/Awards, Research, Extension Involvement, Production, Professional Memberships, PRC Licensure, IPCR).
- **Class Portfolio**: Manage courses and assigned sections per semester, upload course syllabi, Table of Specifications (TOS), student assessment samples, consultation forms, and grades.
- **Reports & Exporting**: Generate official Faculty Compliance Checklists, print summary sheets, or export directly to Microsoft Excel (`.xlsx`) or Google Sheets.
- **System & Document Audit Logs**: Complete history of account actions, logins, document uploads, and profile revisions.
- **Archived Records**: Browse historical, read-only class portfolios from past semesters with restore capabilities.

### 🛡️ Administrator Portal
- **Faculty & Onboarding Management**: Send system access email invitations, track onboarding acceptance rates, and activate/deactivate accounts.
- **Portfolio Review Workflow**: Interactive verification interface to review submitted PDF/document files, approve items, request resubmissions, and provide actionable feedback.
- **Academic Period Control**: Configure academic years and semesters, switch active terms, and archive past academic periods.
- **Security & API Settings**: In-app management of 6 integrated services (Google Mail SMTP, Google Drive Storage, Google Sign-In, reCAPTCHA v2, Google Sheets, and ExcelJS) protected by step-up 2FA email OTP verification.
- **System-Wide Audit Trails**: Filterable logs categorized by Authentication, Documents, Settings, Invitations, Account, and Academic Period.

---

## 🛠️ Tech Stack

### Client (Frontend)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4 + Lucide React icons
- **Routing**: React Router v7
- **Authentication**: JWT, Google OAuth 2.0 (`google-auth-library` / Google Identity Services), Google reCAPTCHA v2
- **Document Previews & Export**: `xlsx`, `exceljs`, `jspdf`, `mammoth`

### Server (Backend)
- **Runtime**: Node.js + Express 5
- **Database**: MongoDB + Mongoose ODM
- **File Storage**: Google Drive API (OAuth 2.0 Service Integration / Shared Drives)
- **Mailing**: Nodemailer (SMTP / Gmail App Password)
- **Spreadsheet Generation**: ExcelJS & Google Sheets API

---

## 📂 Project Structure

```text
COT-Instructor-Portfolio-Management-System/
├── client/                     # Frontend Vite + React application
│   ├── public/                 # Static assets, logos, and icons
│   ├── src/
│   │   ├── api/                # API service wrappers (classes, docs, reports)
│   │   ├── assets/             # Branding and vendor SVGs
│   │   ├── components/         # Shared UI components (TopBar, Sidebar, Modals)
│   │   ├── config/             # Navigation configurations and privacy notice
│   │   ├── context/            # React context providers (PortfolioContext)
│   │   ├── hooks/              # Custom React hooks (useLogout, etc.)
│   │   ├── pages/              # Route pages
│   │   │   ├── admin/          # Administrator portal views
│   │   │   ├── auth/           # Login, invitation acceptance, password reset
│   │   │   ├── instructors/    # Instructor portal views
│   │   │   └── portfolioRequirements/ # Individual requirement components
│   │   ├── App.jsx             # Route definitions
│   │   └── index.css           # Tailwind CSS directives
│   └── package.json
│
├── server/                     # Backend Express REST API
│   ├── constants/              # System constants and default requirements
│   ├── controllers/            # Route business logic (auth, invitation, class, etc.)
│   ├── middleware/             # Auth token verification & role enforcement
│   ├── models/                 # Mongoose schemas (Instructor, Document, Class, etc.)
│   ├── reports/                # Excel/Sheets templates and generator engines
│   ├── routes/                 # Express API routes
│   ├── scripts/                # Database seeders and Google Drive setup scripts
│   ├── utils/                  # Storage services, emailer, audit logging
│   ├── index.js                # Server entry point
│   └── package.json
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection string
- **Google Cloud Console Project** (optional for local testing, required for Drive storage and Google Login)

---

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/zeruann/COT-Instructor-Portfolio-Management-System.git
   cd COT-Instructor-Portfolio-Management-System
   ```

2. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

---

### Environment Setup

#### 1. Backend (`server/.env`)
Create a `.env` file inside the `server/` folder:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cot_portfolio?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173

# Google Mail (SMTP for invitations & OTPs)
EMAIL_USER=your_email@buksu.edu.ph
EMAIL_PASS=your_google_app_password

# Google Sign-In & Security
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
RECAPTCHA_SECRET=your_recaptcha_v2_secret_key

# Google Drive Storage Integration (Optional for local file testing)
GOOGLE_DRIVE_CLIENT_ID=your_drive_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_drive_client_secret
GOOGLE_DRIVE_REFRESH_TOKEN=your_drive_refresh_token
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_drive_folder_id
GOOGLE_DRIVE_ROOT_FOLDER_NAME=COT_Portfolio_Storage
```

#### 2. Frontend (`client/.env`)
Create a `.env` file inside the `client/` folder:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_v2_site_key
```

---

### Running the Application

1. **Start the Backend Server:**
   ```bash
   cd server
   npm run dev
   ```
   *The Express server will start on [http://localhost:5000](http://localhost:5000).*

2. **Start the Frontend Application:**
   ```bash
   cd client
   npm run dev
   ```
   *The Vite development server will start on [http://localhost:5173](http://localhost:5173).*

---

## 🔒 Privacy & Compliance

This system complies with the provisions of the **Data Privacy Act of 2012 (Republic Act No. 10173)** of the Philippines. 
- All faculty data, personal data sheets (PDS), and service records are protected via role-based access control (RBAC).
- Transparent Privacy Notices and consent acknowledgements (`/privacy`) are required prior to onboarding.

---

## 📄 License & Attribution

Developed for the **College of Technologies**, **Bukidnon State University (BukSU)**.  
All rights reserved © 2026.
