import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
import InviteInstructor from "./pages/admin/InviteInstructor";
import Login from "./pages/instructors/login";
import ResetPassword from "./pages/instructors/ResetPassword";
import SetNewPassword from "./pages/instructors/SetNew_Password";
<<<<<<< HEAD
import Dashboard from "./pages/instructors/dashboard";
=======
import ViewInstructors from "./pages/auth/ViewInstructors";
>>>>>>> 58a43de5fc7539779dc000cdc3a2753954a65b65

function App() {
  return (
    <BrowserRouter>
      <Routes>
<<<<<<< HEAD
        <Route path="/" element={<Navigate to="/login" />} />
=======
        {/* Set ViewInstructors as the main page at http://localhost:5173/ */}
        <Route path="/" element={<ViewInstructors />} />

>>>>>>> 58a43de5fc7539779dc000cdc3a2753954a65b65
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-new-password/:token" element={<SetNewPassword />} />
        <Route path="/admin/invite-instructor" element={<InviteInstructor />} />
        <Route path="/invitation/:token" element={<AcceptInvitation />} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;