import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

function RedirectToFacultyReview() {
  const { id } = useParams();
  return <Navigate to={`/admin/review/faculty-portfolio?instructorId=${id}`} replace />;
}

// INSTRUCTORS

import AcceptInvitation from "./pages/auth/AcceptInvitation";
import SetupProfile from "./pages/instructors/SetupProfile";
import InstructorDashboard from "./pages/instructors/dashboard";
import Profile from "./pages/instructors/Profile";
import Login from "./pages/instructors/login";
import ResetPassword from "./pages/instructors/ResetPassword";
import SetNewPassword from "./pages/instructors/SetNew_Password";
import FacultyPortfolio from "./pages/instructors/FacultyPortfolio";
import ClassPortfolio from "./pages/instructors/ClassPortfolio";
import ViewClassPortfolio from "./pages/instructors/ViewClassPortfolio";
import ClassRequirementDetail from "./pages/instructors/ClassRequirementDetail";
import InstructorArchive from "./pages/instructors/InstructorArchive";
import InstructorNotifications from "./pages/instructors/InstructorNotifications";
import InstructorSecurity from "./pages/instructors/InstructorSecurity";
import InstructorActivityLogs from "./pages/instructors/InstructorActivityLogs";
import InstructorReports from "./pages/instructors/InstructorReports";

// ADMIN

import AdminDashboard from "./pages/admin/AdminDashboard";
import InviteInstructor from "./pages/admin/InviteInstructor";
import ViewInstructors from "./pages/admin/ViewInstructors";
import AdminInstructorProfile from "./pages/admin/AdminInstructorProfile";
import ReviewFacultyPortfolio from "./pages/admin/ReviewFacultyPortfolio";
import ReviewClassPortfolio from "./pages/admin/ReviewClassPortfolio";
import AdminViewClassPortfolio from "./pages/admin/AdminViewClassPortfolio";
import AdminArchive from "./pages/admin/AdminArchive";
import AcademicPeriod from "./pages/admin/AcademicPeriod";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminActivityLogs from "./pages/admin/AdminActivityLogs";
import AdminReports from "./pages/admin/AdminReports";

// SHARED LAYOUT (sidebar + top bar + breadcrumb) FOR EVERY SIGNED-IN PAGE

import LandingPage from "./pages/LandingPage";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// SHARED PORTFOLIO REQUIREMENTS - FACULTY AND ADMINISTRATOR

import EducationalAttainment from "./pages/portfolioRequirements/FacultyPortfolioRequirements/EducationalAttainment";
import ServiceRecords from "./pages/portfolioRequirements/FacultyPortfolioRequirements/ServiceRecords";
import SeminarsAndWorkshops from "./pages/portfolioRequirements/FacultyPortfolioRequirements/Seminars&Workshops";
import Achievements from "./pages/portfolioRequirements/FacultyPortfolioRequirements/Achievements";
import Research from "./pages/portfolioRequirements/FacultyPortfolioRequirements/Research";
import ExtensionInvolvement from "./pages/portfolioRequirements/FacultyPortfolioRequirements/ExtensionInvolvement";
import Production from "./pages/portfolioRequirements/FacultyPortfolioRequirements/Production";
import OtherRequirements from "./pages/portfolioRequirements/FacultyPortfolioRequirements/otherRequirements/OtherRequirements";
import ProfessionalOrgs from "./pages/portfolioRequirements/FacultyPortfolioRequirements/otherRequirements/ProfessionalOrgs";
import PassedLicensureExams from "./pages/portfolioRequirements/FacultyPortfolioRequirements/otherRequirements/PassedLicensureExams";
import IPCR from "./pages/portfolioRequirements/FacultyPortfolioRequirements/otherRequirements/IPCR";

import { PortfolioProvider } from "./context/PortfolioContext";

function App() {
  return (
    <BrowserRouter>
      <PortfolioProvider>
        <Routes>
          {/* DEFAULT ROUTE */}

          <Route path="/" element={<LandingPage />} />

          {/* AUTHENTICATION PAGES */}

          <Route path="/login" element={<Login />} />

          {/* Password Reset */}

          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-new-password/:token" element={<SetNewPassword />} />

          {/* Instructor onboarding (its own full-page layout) */}

          <Route path="/profile-setup" element={<SetupProfile />} />

          {/* Invitations */}

          <Route path="/invitation/:token" element={<AcceptInvitation />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

          {/* =========================================================================================================== */}
          {/* ADMINISTRATOR PAGES */}
          {/* =========================================================================================================== */}

          {/* ADMIN: every page below shows inside the shared layout */}

          <Route element={<ProtectedRoute><AppLayout role="admin" /></ProtectedRoute>}>

            {/* Dashboard */}

            <Route path="/admin/AdminDashboard" element={<AdminDashboard />} />

            {/* Instructor Management */}

            <Route path="/admin/invite-instructor" element={<InviteInstructor />} />
            <Route path="/admin/instructors" element={<ViewInstructors />} />

            {/* Individual Instructor Profile */}

            <Route path="/admin/instructors/:id" element={<AdminInstructorProfile />} />

            {/* Portfolio Review */}

            <Route path="/admin/faculty-portfolio/:id" element={<RedirectToFacultyReview />} />
            <Route path="/admin/review/faculty-portfolio" element={<ReviewFacultyPortfolio />} />
            <Route path="/admin/review/class-portfolio" element={<ReviewClassPortfolio />} />
            <Route path="/admin/class-portfolio/:id" element={<AdminViewClassPortfolio />} />
            <Route path="/admin/class-portfolio/:id/:reqPath" element={<ClassRequirementDetail />} />

            {/* SHARED PORTFOLIO REQUIREMENTS - ADMIN VIEW */}

            <Route path="/admin/portfolio/faculty-portfolio/educational-attainment" element={<EducationalAttainment />} />
            <Route path="/admin/portfolio/faculty-portfolio/service-records" element={<ServiceRecords />} />
            <Route path="/admin/portfolio/faculty-portfolio/seminars-and-workshops" element={<SeminarsAndWorkshops />} />
            <Route path="/admin/portfolio/faculty-portfolio/achievements" element={<Achievements />} />
            <Route path="/admin/portfolio/faculty-portfolio/research" element={<Research />} />
            <Route path="/admin/portfolio/faculty-portfolio/extension-involvement" element={<ExtensionInvolvement />} />
            <Route path="/admin/portfolio/faculty-portfolio/production" element={<Production />} />

            {/* OTHER REQUIREMENTS: parent page with 3 tab pages inside it */}

            <Route path="/admin/portfolio/faculty-portfolio/other-requirements" element={<OtherRequirements />}>
              <Route index element={<Navigate to="professional-organization-membership" replace />} />
              <Route path="professional-organization-membership" element={<ProfessionalOrgs />} />
              <Route path="passed-licensure-examinations" element={<PassedLicensureExams />} />
              <Route path="ipcr" element={<IPCR />} />
            </Route>

            {/* Archive and System Settings */}

            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/archive" element={<AdminArchive />} />
            <Route path="/admin/academic-period" element={<AcademicPeriod />} />
            <Route path="/admin/activity-logs" element={<AdminActivityLogs />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          {/* =========================================================================================================== */}
          {/* INSTRUCTOR PAGES */}
          {/* =========================================================================================================== */}

          {/* INSTRUCTOR: every page below shows inside the shared layout */}

          <Route element={<ProtectedRoute><AppLayout role="instructor" /></ProtectedRoute>}>

            {/* Dashboard and Profile */}

            <Route path="/instructors/dashboard" element={<InstructorDashboard />} />
            <Route path="/instructors/profile" element={<Profile />} />

            {/* =========================================================================================================== */}
            {/* INSTRUCTOR PORTFOLIO PAGES */}
            {/* =========================================================================================================== */}

            {/* 1. FACULTY PORTFOLIO */}

            <Route path="/instructors/faculty-portfolio" element={<FacultyPortfolio />} />

            {/* 2. CLASS PORTFOLIO */}

            <Route path="/instructors/class-portfolio" element={<ClassPortfolio />} />
            <Route path="/instructors/class-portfolio/:id" element={<ViewClassPortfolio />} />
            <Route path="/instructors/class-portfolio/:id/:reqPath" element={<ClassRequirementDetail />} />

            {/* REPORTS */}
            <Route path="/instructors/reports" element={<InstructorReports />} />

            {/* 3. SHARED PORTFOLIO REQUIREMENTS - INSTRUCTOR VIEW */}

            <Route path="/instructors/portfolio/faculty-portfolio/educational-attainment" element={<EducationalAttainment />} />
            <Route path="/instructors/portfolio/faculty-portfolio/service-records" element={<ServiceRecords />} />
            <Route path="/instructors/portfolio/faculty-portfolio/seminars-and-workshops" element={<SeminarsAndWorkshops />} />
            <Route path="/instructors/portfolio/faculty-portfolio/achievements" element={<Achievements />} />
            <Route path="/instructors/portfolio/faculty-portfolio/research" element={<Research />} />
            <Route path="/instructors/portfolio/faculty-portfolio/extension-involvement" element={<ExtensionInvolvement />} />
            <Route path="/instructors/portfolio/faculty-portfolio/production" element={<Production />} />

            {/* OTHER REQUIREMENTS: parent page with 3 tab pages inside it */}

            <Route path="/instructors/portfolio/faculty-portfolio/other-requirements" element={<OtherRequirements />}>
              <Route index element={<Navigate to="professional-organization-membership" replace />} />
              <Route path="professional-organization-membership" element={<ProfessionalOrgs />} />
              <Route path="passed-licensure-examinations" element={<PassedLicensureExams />} />
              <Route path="ipcr" element={<IPCR />} />
            </Route>

            {/* Archive and Account Settings */}

            <Route path="/instructors/archive" element={<InstructorArchive />} />
            <Route path="/instructors/activity-logs" element={<InstructorActivityLogs />} />
            <Route path="/instructors/notifications" element={<InstructorNotifications />} />
            <Route path="/instructors/security" element={<InstructorSecurity />} />
          </Route>
        </Routes>
      </PortfolioProvider>
    </BrowserRouter>
  );
}

export default App;