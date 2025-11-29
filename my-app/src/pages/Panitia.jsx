import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Dashboard from './Dashboard';

// ========= Halaman Create Tournament =========
function TournamentSetup({ onCreate }) {
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [courts, setCourts] = React.useState(4);
  const [error, setError] = React.useState("");

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

// ========= COMMITTEE DASHBOARD =========
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

// ========= PANITIA PAGE =========
function Panitia() {
  const context = useOutletContext();
  const { tournament, handleCreateTournament, handleStartTournament, players, matches } = context;

  return tournament ? (
    <CommitteeDashboard
      tournament={tournament}
      players={players}
      matches={matches}
      onStart={handleStartTournament}
    />
  ) : (
    <TournamentSetup onCreate={handleCreateTournament} />
  );
}

export default Panitia;