// src/pages/Dashboard.jsx
import React from "react";

const StatCard = ({ label, value, chip }) => {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {chip && <span className="stat-chip">{chip}</span>}
      </div>
      <p className="stat-value">{value}</p>
    </div>
  );
};

const MatchCard = ({ match }) => {
  const { category, players, court, status, score, referee } = match;

  return (
    <div className="match-card">
      <div className="match-header">
        <span className="match-category">{category}</span>
        <span className={`match-status ${status.toLowerCase()}`}>
          {status}
        </span>
      </div>

      <div className="match-body">
        <div className="match-row">
          <span>{players[0]}</span>
          <span className="match-score">{score?.[0] ?? "-"}</span>
        </div>
        <div className="match-row">
          <span>{players[1]}</span>
          <span className="match-score">{score?.[1] ?? "-"}</span>
        </div>
      </div>

      <div className="match-footer">
        <span className="match-court">Court {court}</span>
        <span style={{ fontSize: 11 }}>
          Referee: {referee || "Belum ditugaskan"}
        </span>
      </div>
    </div>
  );
};

const Dashboard = ({ tournament, players = [], matches = [] }) => {
  const totalPlayers = players.length;
  const categoriesSet = new Set(players.map((p) => p.category));
  const totalCategories = categoriesSet.size || 0;

  const liveMatches = matches.filter((m) => m.status === "LIVE");
  const scheduledMatches = matches.filter((m) => m.status === "SCHEDULED");
  const todayMatches = matches.length;

  const activeCourtsSet = new Set(
    liveMatches.map((m) => m.court).filter(Boolean)
  );
  const activeCourts = activeCourtsSet.size || 0;

  const matchesToShow = matches
    .filter((m) => m.status === "LIVE" || m.status === "SCHEDULED")
    .slice(0, 4);

  return (
    <>
      <h2 className="section-title" style={{ marginTop: 8 }}>
        Tournament Dashboard
      </h2>
      <p className="page-subtitle">
        {tournament
          ? `Overview for ${tournament.name}.`
          : "Create a tournament to see stats."}
      </p>

      {/* STAT CARDS */}
      <div className="stat-grid">
        <StatCard
          label="Total Players"
          value={totalPlayers}
          chip={
            totalCategories > 0
              ? `${totalCategories} categories`
              : "No category yet"
          }
        />
        <StatCard
          label="Today Matches"
          value={todayMatches}
          chip={
            liveMatches.length > 0
              ? `${liveMatches.length} in progress`
              : scheduledMatches.length > 0
              ? `${scheduledMatches.length} scheduled`
              : "No matches"
          }
        />
        <StatCard
          label="Courts Active"
          value={activeCourts}
          chip={activeCourts > 0 ? "Live courts" : "No active court"}
        />
      </div>

      {/* LIVE / SCHEDULED MATCHES */}
      <h2 className="section-title" style={{ marginTop: 16 }}>
        Live Matches
      </h2>
      {matchesToShow.length === 0 ? (
        <p style={{ fontSize: 14, color: "#9ca3af" }}>
          Belum ada pertandingan live atau terjadwal.
        </p>
      ) : (
        <div className="match-grid">
          {matchesToShow.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </>
  );
};

export default Dashboard;
