import React, { useState, useEffect } from "react";
import matchesApi from "../api/matches";
import tournamentsApi from "../api/tournaments";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (activeTournamentId) {
      fetchMatches(activeTournamentId);
    } else if (tournaments.length > 0) {
        // Default to first tournament if available
        setActiveTournamentId(tournaments[0].id);
    }
  }, [activeTournamentId, tournaments]);

  const fetchTournaments = async () => {
      try {
          const data = await tournamentsApi.getTournaments();
          setTournaments(data);
          if (data.length > 0 && !activeTournamentId) {
              setActiveTournamentId(data[0].id);
          }
      } catch (err) {
          console.error("Failed to fetch tournaments", err);
      }
  };

  const fetchMatches = async (tournamentId) => {
    try {
      setLoading(true);
      const data = await matchesApi.getMatches(tournamentId);
      setMatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (tournaments.length === 0 && !loading) {
     return (
        <div className="main-content">
            <h1 className="page-title">Matches</h1>
            <p className="page-subtitle">No tournaments found.</p>
        </div>
     );
  }

  const liveOrScheduled = matches.filter(
    (m) => m.status === "ONGOING" || m.status === "SCHEDULED" || m.status === "FINISHED"
  );

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Matches</h1>
        <select 
            value={activeTournamentId || ''} 
            onChange={(e) => setActiveTournamentId(e.target.value)}
            className="form-input"
            style={{ width: 'auto' }}
        >
            {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
            ))}
        </select>
      </div>
      
      <p className="page-subtitle">
        Daftar pertandingan untuk turnamen terpilih.
      </p>

      {loading ? (
          <div className="spinner"></div>
      ) : (
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
                      <span className="match-category">{m.category?.name || "Category"}</span>
                      <span
                        className={`match-status ${m.status.toLowerCase()}`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="match-body">
                      <div className="match-row">
                        <span>{m.homeTeam?.name || m.homeTeam?.user?.name || "Home"}</span>
                        <span className="match-score">{m.homeScore !== null ? m.homeScore : "-"}</span>
                      </div>
                      <div className="match-row">
                        <span>{m.awayTeam?.name || m.awayTeam?.user?.name || "Away"}</span>
                        <span className="match-score">{m.awayScore !== null ? m.awayScore : "-"}</span>
                      </div>
                    </div>
                    <div className="match-footer">
                      <span className="match-court">{m.court?.name || "Court ?"}</span>
                      <span style={{ fontSize: 11 }}>
                        Referee: {m.referee?.name || "Belum ditugaskan"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      )}
    </div>
  );
}

export default Matches;
