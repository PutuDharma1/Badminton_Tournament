// src/components/Navbar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/"); // balik ke dashboard utama
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Kiri: Logo */}
        <div
          className="nav-left"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          <div className="logo-circle">S</div>
          <div className="logo-text">
            <span className="logo-title">SportHive</span>
            <span className="logo-subtitle">Badminton Tournament</span>
          </div>
        </div>

        {/* Tengah: Menu */}
        <nav className="nav-links">
          <button
            className={`nav-link ${isActive("/") ? "active" : ""}`}
            onClick={() => navigate("/")}
          >
            Dashboard
          </button>

          <button
            className={`nav-link ${isActive("/matches") ? "active" : ""}`}
            onClick={() => navigate("/matches")}
          >
            Matches
          </button>

          <button
            className={`nav-link ${isActive("/players") ? "active" : ""}`}
            onClick={() => navigate("/players")}
          >
            Players
          </button>

          <button
            className={`nav-link ${isActive("/referee") ? "active" : ""}`}
            onClick={() => navigate("/referee")}
          >
            Wasit
          </button>

          <button
            className={`nav-link ${isActive("/settings") ? "active" : ""}`}
            onClick={() => navigate("/settings")}
          >
            Settings
          </button>
        </nav>

        {/* Kanan: Role + Logout */}
        <div className="nav-right">
          {user ? (
            <>
              <span className="role-pill">
                {user.role || "COMMITTEE"} · {user.name || "User"}
              </span>
              <button className="nav-link" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <span className="role-pill">Committee</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
