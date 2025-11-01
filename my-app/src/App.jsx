import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";
import Navbar from "./components/Navbar.jsx";
import Home from "./pages/home.jsx";
import RoleSelect from "./pages/RoleSelect.jsx";
import RegisterPlayer from "./pages/RegisterPlayer.jsx";
import RegisterReferee from "./pages/RegisterReferee.jsx";
import RegisterOrganizer from "./pages/RegisterOrganizer.jsx";
import Thankyou from "./pages/Thankyou.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />   {/* 🔹 Pastikan Navbar ADA DI DALAM BrowserRouter */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/roles" element={<RoleSelect />} />
        <Route path="/register/player" element={<RegisterPlayer />} />
        <Route path="/register/referee" element={<RegisterReferee />} />
        <Route path="/register/organizer" element={<RegisterOrganizer />} />
        <Route path="/thanks" element={<Thankyou />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
