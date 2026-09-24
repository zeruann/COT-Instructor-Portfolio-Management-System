import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AcceptInvitation from "./pages/auth/AcceptInvitation";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/invitation/test123" />} />
        <Route path="/invitation/:token" element={<AcceptInvitation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;