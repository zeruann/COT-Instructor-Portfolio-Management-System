import { BrowserRouter, Routes, Route } from "react-router-dom";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
import InviteInstructor from './pages/admin/InviteInstructor';
import Login from "./pages/instructors/login";
// import AdminLogin from "./pages/admin_login/AdminLogin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/login" element={<Login />} />
        {/* <Route path="/admin/login" element={<AdminLogin />} /> */}
        <Route path="/admin/invite-instructor" element={<InviteInstructor />} />
        <Route path="/invitation/:token?" element={<AcceptInvitation />} />
        <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;