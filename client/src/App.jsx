import { BrowserRouter, Routes, Route } from "react-router-dom";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
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
        <Route path="/invitation/:token?" element={<AcceptInvitation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;














