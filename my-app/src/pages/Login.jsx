// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  // State ini sebenarnya sudah tidak dipakai untuk cek ke server,
  // tapi boleh tetap ada supaya form kelihatan realistis.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // LOGIN BYPASS: tidak ada fetch ke backend
  const handleLogin = () => {
    // Dummy user yang akan disimpan ke localStorage
    const dummyUser = {
      id: 1,
      name: "Dummy Committee",
      email: email || "dummy@sporthive.com",
      role: "COMMITTEE", // penting: harus cocok dengan allowedRoles di App.jsx
    };

    // Simpan user ke localStorage (dipakai ProtectedRoute di App.jsx)
    localStorage.setItem("user", JSON.stringify(dummyUser));

    // Arahkan user ke dashboard panitia
    navigate("/committee-dashboard");
  };

  return (
    <div className="main-content">
      <div className="form-card">
        <h2 className="form-title">Login (Bypass Mode)</h2>
        <p className="form-subtitle">
          Untuk sementara, login tidak terhubung ke server. Klik tombol Login
          untuk langsung masuk sebagai <strong>Committee</strong>.
        </p>

        <div className="form-group">
          <label className="form-label">Email (opsional)</label>
          <input
            type="email"
            className="form-input"
            placeholder="example@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="form-helper">
            Ini hanya untuk tampilan saja, tidak dicek ke server.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Password (opsional)</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="form-helper">
            Password juga tidak diverifikasi di mode bypass ini.
          </p>
        </div>

        <button className="btn-primary mt-16" onClick={handleLogin}>
          Login sebagai Committee
        </button>
      </div>
    </div>
  );
}

export default Login;
