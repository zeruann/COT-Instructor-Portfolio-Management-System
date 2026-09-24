import { BrowserRouter, Routes, Route } from "react-router-dom";
import AcceptInvitation from "./pages/auth/AcceptInvitation";
import Login from "./pages/ins_login/login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/invitation/:token" element={<AcceptInvitation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;