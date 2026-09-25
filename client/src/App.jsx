import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AcceptInvitation from "./pages/auth/AcceptInvitation";
import InviteInstructor from "./pages/admin/InviteInstructor";
import AdminDashboard from "./pages/admin/AdminDashboard";
import InstructorDashboard from "./pages/instructors/dashboard";
import ViewInstructors from "./pages/auth/ViewInstructors";

import Login from "./pages/instructors/login";
import ResetPassword from "./pages/instructors/ResetPassword";
import SetNewPassword from "./pages/instructors/SetNew_Password";

import ProtectedRoute from "./components/ProtectedRoute";

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

        {/* Admin */}
        <Route
          path="/admin/invite-instructor"
          element={
            <ProtectedRoute>
              <InviteInstructor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/AdminDashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/instructors"
          element={
            <ProtectedRoute>
              <ViewInstructors />
            </ProtectedRoute>
          }
        />

        {/* Instructor */}
        <Route
          path="/instructors/dashboard"
          element={
            <ProtectedRoute>
              <InstructorDashboard />
            </ProtectedRoute>
          }
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

      </Routes>
    </BrowserRouter>
  );
}

export default App;