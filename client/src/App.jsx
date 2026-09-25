import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
import InviteInstructor from "./pages/admin/InviteInstructor";
import Login from "./pages/instructors/login";
import ResetPassword from "./pages/instructors/ResetPassword";
import SetNewPassword from "./pages/instructors/SetNew_Password";
import Dashboard from "./pages/instructors/dashboard";
import ViewInstructors from "./pages/auth/ViewInstructors";

function App() {
  return (
    <BrowserRouter>
<Routes>
  <Route path="/" element={<Navigate to="/login" />} />

  <Route path="/login" element={<Login />} />
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/set-new-password/:token" element={<SetNewPassword />} />
  <Route path="/admin/invite-instructor" element={<InviteInstructor />} />
  <Route path="/admin/instructors" element={<ViewInstructors />} />
  <Route path="/invitation/:token" element={<AcceptInvitation />} />
  <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
  <Route path="/dashboard" element={<Dashboard />} />
</Routes>
    </BrowserRouter>
  );
}

export default App;