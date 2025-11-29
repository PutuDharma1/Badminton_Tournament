import React from 'react';
import { useOutletContext } from 'react-router-dom';

function Wasit() {
  const context = useOutletContext();
  const { tournament, matches, handlePickMatch } = context;

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
                      onClick={() => handlePickMatch(m.id)}
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

export default Wasit;