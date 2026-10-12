import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// INSTRUCTORS
import AcceptInvitation from "./pages/auth/AcceptInvitation";
import SetupProfile from './pages/instructors/SetupProfile';
import InstructorDashboard from "./pages/instructors/dashboard";
import ViewInstructors from "./pages/admin/ViewInstructors";
import Profile from "./pages/instructors/Profile";

// ADMIN
import AdminDashboard from "./pages/admin/AdminDashboard";
import InviteInstructor from "./pages/admin/InviteInstructor";
import AdminInstructorProfile from "./pages/admin/AdminInstructorProfile";

import Login from "./pages/instructors/login";
import ResetPassword from "./pages/instructors/ResetPassword";
import SetNewPassword from "./pages/instructors/SetNew_Password";

import ProtectedRoute from "./components/ProtectedRoute";

// SHARED LAYOUT (sidebar + top bar + breadcrumb) FOR EVERY SIGNED-IN PAGE
import AppLayout from "./components/layout/AppLayout";

// INSTRUCTOR PLACEHOLDER PAGES
import FacultyPortfolio from "./pages/instructors/FacultyPortfolio";
import ClassPortfolio from "./pages/instructors/ClassPortfolio";
import InstructorArchive from "./pages/instructors/InstructorArchive";
import InstructorNotifications from "./pages/instructors/InstructorNotifications";
import InstructorSecurity from "./pages/instructors/InstructorSecurity";

// ADMIN PLACEHOLDER PAGES
import ReviewFacultyPortfolio from "./pages/admin/ReviewFacultyPortfolio";
import ReviewClassPortfolio from "./pages/admin/ReviewClassPortfolio";
import AdminArchive from "./pages/admin/AdminArchive";
import AcademicPeriod from "./pages/admin/AcademicPeriod";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminSecurity from "./pages/admin/AdminSecurity";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Navigate to="/login" />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Password Reset */}
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/set-new-password/:token"
          element={<SetNewPassword />}
        />

        {/* Instructor onboarding (its own full-page layout) */}
        <Route
          path="/profile-setup"
          element={<SetupProfile />}
        />

        {/* Invitations */}
        <Route
          path="/invitation/:token"
          element={<AcceptInvitation />}
        />

        <Route
          path="/accept-invitation/:token"
          element={<AcceptInvitation />}
        />

        {/* ADMIN: every page below shows inside the shared layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/admin/invite-instructor" element={<InviteInstructor />} />
          <Route path="/admin/instructors" element={<ViewInstructors />} />
          {/* Individual Instructor Profile */}
          <Route path="/admin/instructors/:id" element={<AdminInstructorProfile />} />

          {/* placeholder pages */}
          <Route path="/admin/review/faculty-portfolio" element={<ReviewFacultyPortfolio />} />
          <Route path="/admin/review/class-portfolio" element={<ReviewClassPortfolio />} />
          <Route path="/admin/archive" element={<AdminArchive />} />
          <Route path="/admin/academic-period" element={<AcademicPeriod />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
        </Route>

        {/* INSTRUCTOR: every page below shows inside the shared layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout role="instructor" />
            </ProtectedRoute>
          }
        >
          <Route path="/instructors/dashboard" element={<InstructorDashboard />} />
          <Route path="/instructors/profile" element={<Profile />} />

          {/* placeholder pages */}
          <Route path="/instructors/faculty-portfolio" element={<FacultyPortfolio />} />
          <Route path="/instructors/class-portfolio" element={<ClassPortfolio />} />
          <Route path="/instructors/archive" element={<InstructorArchive />} />
          <Route path="/instructors/notifications" element={<InstructorNotifications />} />
          <Route path="/instructors/security" element={<InstructorSecurity />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
