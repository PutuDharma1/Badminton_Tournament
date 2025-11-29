import React from "react";
import { useOutletContext } from "react-router-dom";

function Matches() {
  const context = useOutletContext();
  const { tournament, matches } = context;

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

export default Matches;
