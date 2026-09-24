import { BrowserRouter, Routes, Route } from "react-router-dom";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
import InviteInstructor from "./pages/admin/InviteInstructor";
import Login from "./pages/instructors/login";
import ResetPassword from "./pages/instructors/ResetPassword";
import SetNewPassword from "./pages/instructors/SetNew_Password";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-new-password/:token" element={<SetNewPassword />} />

        {/* <Route path="/admin/login" element={<AdminLogin />} /> */}
        <Route path="/admin/invite-instructor" element={<InviteInstructor />} />

        <Route path="/invitation/:token" element={<AcceptInvitation />} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

