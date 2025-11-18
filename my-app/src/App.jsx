// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login"; // optional, tidak kepakai sekarang

// ========= Helper kecil =========
const calculateAge = (dobStr) => {
  const today = new Date();
  const dob = new Date(dobStr);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

const getCategoryForAge = (age) => {
  if (age < 13) return "U13";
  if (age < 15) return "U15";
  if (age < 17) return "U17";
  if (age < 19) return "U19";
  return "OPEN";
};

// ========= Halaman Create Tournament =========

function TournamentSetup({ onCreate }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [courts, setCourts] = useState(4);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!name || !location || !startDate) {
      setError("Name, location, and start date are required.");
      return;
    }

    onCreate({
      name,
      location,
      startDate,
      courts: Number(courts) || 1,
      status: "DRAFT", // belum dimulai
    });
  };

  return (
    <div className="main-content">
      <h1 className="page-title">Create Tournament</h1>
      <p className="page-subtitle">
        Mulai dengan membuat turnamen terlebih dahulu sebelum mendaftarkan
        pemain dan membuat jadwal.
      </p>

      <div className="form-card">
        <h2 className="form-title">New Tournament</h2>
        <p className="form-subtitle">
          Isi detail turnamen, kamu bisa mengubahnya nanti sebelum turnamen
          dimulai.
        </p>

        {error && (
          <p style={{ color: "#fecaca", fontSize: 13, marginBottom: 8 }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tournament Name</label>
            <input
              className="form-input"
              placeholder="SportHive Badminton Championship"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              className="form-input"
              placeholder="GOR Cempaka, Jakarta"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Number of Courts</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={courts}
              onChange={(e) => setCourts(e.target.value)}
            />
          </div>

          <button className="btn-primary mt-16" type="submit">
            Create Tournament
          </button>
        </form>
      </div>
    </div>
  );
}

// ========= Halaman-halaman utama =========

// 1. COMMITTEE DASHBOARD – sekarang pakai tournament asli
function CommitteeDashboard({ tournament, players, matches, onStart }) {
  return (
    <div className="main-content">
      <h1 className="page-title">Committee Dashboard</h1>
      <p className="page-subtitle">
        Welcome, Dummy Committee. Manage tournaments, players, and matches.
      </p>

      {/* Info singkat turnamen */}
      <div className="card mb-8">
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>
          {tournament.name || "Unnamed Tournament"}
        </h2>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>
          {tournament.location} · Start: {tournament.startDate} · Courts:{" "}
          {tournament.courts}
        </p>
        <p style={{ fontSize: 13 }}>
          Status:{" "}
          <strong>
            {tournament.status === "DRAFT"
              ? "Draft (belum dimulai)"
              : tournament.status === "ONGOING"
              ? "Ongoing"
              : "Finished"}
          </strong>
        </p>

        {tournament.status === "DRAFT" && (
          <button
            className="btn-primary mt-16"
            style={{ padding: "6px 14px", fontSize: 13 }}
            onClick={onStart}
          >
            Start Tournament
          </button>
        )}
      </div>

      {/* Dashboard utama pakai data beneran */}
      <Dashboard
        tournament={tournament}
        players={players}
        matches={matches}
      />
    </div>
  );
}

// 2. PLAYERS PAGE
function PlayersPage({ tournament, players, onAddPlayer }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [message, setMessage] = useState("");

  if (!tournament) {
    return (
      <div className="main-content">
        <h1 className="page-title">Players Management</h1>
        <p className="page-subtitle">
          Silakan buat turnamen terlebih dahulu sebelum mendaftarkan pemain.
        </p>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage("");

    if (!name || !dob) {
      setMessage("Nama dan tanggal lahir wajib diisi.");
      return;
    }

    const age = calculateAge(dob);
    const category = getCategoryForAge(age);

    onAddPlayer({
      name,
      dob,
      age,
      category,
    });

    setMessage(
      `Pendaftaran berhasil. ${name} masuk kategori ${category} (umur ${age} tahun).`
    );
    setName("");
    setDob("");
  };

  return (
    <div className="main-content">
      <h1 className="page-title">Players Management</h1>
      <p className="page-subtitle">
        Daftarkan pemain baru dan lihat daftar pemain yang sudah terdaftar.
      </p>

      {/* Form pendaftaran pemain */}
      <div className="form-card">
        <h2 className="form-title">Register New Player</h2>
        <p className="form-subtitle">
          Masukkan nama dan tanggal lahir, sistem akan otomatis menentukan
          kategori umur.
        </p>

        {message && (
          <p style={{ fontSize: 13, marginBottom: 8, color: "#a5f3fc" }}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Pemain</label>
            <input
              className="form-input"
              placeholder="Nama Lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tanggal Lahir</label>
            <input
              type="date"
              className="form-input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            <p className="form-helper">
              Format: YYYY-MM-DD. Contoh: 2008-05-12.
            </p>
          </div>

          <button className="btn-primary mt-16" type="submit">
            Daftarkan Pemain
          </button>
        </form>
      </div>

      {/* Tabel pemain */}
      <h2 className="section-title" style={{ marginTop: 24 }}>
        Daftar Pemain Terdaftar
      </h2>
      <div className="card mt-8">
        {players.length === 0 ? (
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            Belum ada pemain terdaftar.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "#9ca3af" }}>
                <th style={{ padding: "6px 4px" }}>#</th>
                <th style={{ padding: "6px 4px" }}>Nama</th>
                <th style={{ padding: "6px 4px" }}>Tanggal Lahir</th>
                <th style={{ padding: "6px 4px" }}>Umur</th>
                <th style={{ padding: "6px 4px" }}>Kategori</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <tr key={p.id} style={{ borderTop: "1px solid #111827" }}>
                  <td style={{ padding: "6px 4px" }}>{idx + 1}</td>
                  <td style={{ padding: "6px 4px" }}>{p.name}</td>
                  <td style={{ padding: "6px 4px" }}>{p.dob}</td>
                  <td style={{ padding: "6px 4px" }}>{p.age}</td>
                  <td style={{ padding: "6px 4px" }}>{p.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// 3. MATCHES PAGE
function MatchesPage({ tournament, matches }) {
  if (!tournament) {
    return (
      <div className="main-content">
        <h1 className="page-title">Matches</h1>
        <p className="page-subtitle">
          Belum ada turnamen. Silakan buat turnamen terlebih dahulu.
        </p>
      </div>
    );
  }

  const liveOrScheduled = matches.filter(
    (m) => m.status === "LIVE" || m.status === "SCHEDULED"
  );

  return (
    <div className="main-content">
      <h1 className="page-title">Matches</h1>
      <p className="page-subtitle">
        Daftar pertandingan yang sedang berlangsung atau akan dimainkan.
      </p>

      <div className="card mt-16">
        {liveOrScheduled.length === 0 ? (
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            Belum ada pertandingan terjadwal.
          </p>
        ) : (
          <div className="match-grid">
            {liveOrScheduled.map((m) => (
              <div className="match-card" key={m.id}>
                <div className="match-header">
                  <span className="match-category">{m.category}</span>
                  <span
                    className={`match-status ${m.status.toLowerCase()}`}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="match-body">
                  <div className="match-row">
                    <span>{m.players[0]}</span>
                    <span className="match-score">{m.score?.[0] ?? "-"}</span>
                  </div>
                  <div className="match-row">
                    <span>{m.players[1]}</span>
                    <span className="match-score">{m.score?.[1] ?? "-"}</span>
                  </div>
                </div>
                <div className="match-footer">
                  <span className="match-court">Court {m.court}</span>
                  <span style={{ fontSize: 11 }}>
                    Referee: {m.referee || "Belum ditugaskan"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 4. WASIT PAGE
function RefereePage({ tournament, matches, onPickMatch }) {
  if (!tournament) {
    return (
      <div className="main-content">
        <h1 className="page-title">Referee – Pick Matches</h1>
        <p className="page-subtitle">
          Buat turnamen terlebih dahulu sebelum menugaskan wasit.
        </p>
      </div>
    );
  }

  const available = matches.filter((m) => !m.referee);

  return (
    <div className="main-content">
      <h1 className="page-title">Referee – Pick Matches</h1>
      <p className="page-subtitle">
        Pilih pertandingan yang akan kamu wasitkan.
      </p>

      <div className="card mt-16">
        {available.length === 0 ? (
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            Semua pertandingan sudah memiliki wasit, atau belum ada pertandingan.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "#9ca3af" }}>
                <th style={{ padding: "6px 4px" }}>Kategori</th>
                <th style={{ padding: "6px 4px" }}>Pemain</th>
                <th style={{ padding: "6px 4px" }}>Court</th>
                <th style={{ padding: "6px 4px" }}>Status</th>
                <th style={{ padding: "6px 4px" }}></th>
              </tr>
            </thead>
            <tbody>
              {available.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #111827" }}>
                  <td style={{ padding: "6px 4px" }}>{m.category}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {m.players[0]} vs {m.players[1]}
                  </td>
                  <td style={{ padding: "6px 4px" }}>Court {m.court}</td>
                  <td style={{ padding: "6px 4px" }}>{m.status}</td>
                  <td style={{ padding: "6px 4px" }}>
                    <button
                      className="btn-primary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => onPickMatch(m.id)}
                    >
                      Ambil pertandingan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="main-content">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">
        Tempat untuk pengaturan turnamen (bisa diisi nanti).
      </p>
      <div className="card mt-16">
        <p style={{ fontSize: 14, color: "#9ca3af" }}>
          Placeholder halaman Settings. Kamu bisa tambahkan pengaturan kategori,
          jumlah court, format turnamen, dsb di sini.
        </p>
      </div>
    </div>
  );
}

// ========= APP UTAMA =========

function App() {
  // turnamen: awalnya belum ada
  const [tournament, setTournament] = useState(null);

  // players & matches: mulai dari kosong
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  const handleCreateTournament = (data) => {
    setTournament({
      id: 1,
      ...data,
    });
  };

  const handleStartTournament = () => {
    setTournament((prev) =>
      prev ? { ...prev, status: "ONGOING" } : prev
    );
  };

  const handleAddPlayer = (playerData) => {
    setPlayers((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        ...playerData,
      },
    ]);
  };

  const handlePickMatch = (matchId) => {
    const REF_NAME = "Referee A";

    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              referee: REF_NAME,
              status: "LIVE",
            }
          : m
      )
    );
  };

  return (
    <Router>
      <div className="app-container">
        <Navbar />

        <Routes>
          {/* Kalau belum ada tournament → halaman Create Tournament.
              Kalau sudah ada → Committee Dashboard */}
          <Route
            path="/"
            element={
              tournament ? (
                <CommitteeDashboard
                  tournament={tournament}
                  players={players}
                  matches={matches}
                  onStart={handleStartTournament}
                />
              ) : (
                <TournamentSetup onCreate={handleCreateTournament} />
              )
            }
          />

          {/* Login opsional */}
          <Route path="/login" element={<Login />} />

          <Route
            path="/players"
            element={
              <PlayersPage
                tournament={tournament}
                players={players}
                onAddPlayer={handleAddPlayer}
              />
            }
          />

          <Route
            path="/matches"
            element={
              <MatchesPage tournament={tournament} matches={matches} />
            }
          />

          <Route
            path="/referee"
            element={
              <RefereePage
                tournament={tournament}
                matches={matches}
                onPickMatch={handlePickMatch}
              />
            }
          />

          <Route path="/settings" element={<SettingsPage />} />

          {/* Fallback */}
          <Route
            path="*"
            element={
              tournament ? (
                <CommitteeDashboard
                  tournament={tournament}
                  players={players}
                  matches={matches}
                  onStart={handleStartTournament}
                />
              ) : (
                <TournamentSetup onCreate={handleCreateTournament} />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
