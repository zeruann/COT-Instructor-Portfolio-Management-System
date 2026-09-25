import { BrowserRouter, Routes, Route } from "react-router-dom";

import AcceptInvitation from "./pages/auth/AcceptInvitation";
import InviteInstructor from "./pages/admin/InviteInstructor";
import AdminDashboard from "./pages/admin/AdminDashboard";

import Login from "./pages/instructors/login";
import ResetPassword from "./pages/instructors/ResetPassword";
import SetNewPassword from "./pages/instructors/SetNew_Password";
import ProtectedRoute from "./components/ProtectedRoute"; //for logout


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Password Reset */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/set-new-password/:token" element={<SetNewPassword />}
        />

        {/* Dashboards */}

        <Route
          path="/admin/invite-instructor"
          element={<ProtectedRoute> <InviteInstructor /> </ProtectedRoute>}
        />

        <Route
          path="/admin/AdminDashboard"  
          element= {<ProtectedRoute> <AdminDashboard /> </ProtectedRoute>}
        />

        <Route
          path="/instructor/dashboard"element={<h1>Instructor Dashboard</h1>}
        />


        {/* Invitations */}
        <Route
          path="/invitation/:token"element={<AcceptInvitation />}
        />

        <Route
          path="/accept-invitation/:token" element={<AcceptInvitation />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

