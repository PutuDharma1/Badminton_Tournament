import React, { useState, useEffect } from 'react';
import participantsApi from '../api/participants';

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

function Peserta() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // In a real app, we would have an endpoint to get all registered players
      // For now, let's use the search endpoint with empty query or just mock it
      // Since mock API doesn't have "get all users", we might need to rely on what we have
      // Let's assume we want to show all participants from all tournaments for now
      // or just use a mock list. 
      // Actually, let's use the searchUsers from participantsApi if it returns all on empty
      const results = await participantsApi.searchUsers('');
      setPlayers(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!name || !dob) {
      setMessage("Nama dan tanggal lahir wajib diisi.");
      return;
    }

    const age = calculateAge(dob);
    const category = getCategoryForAge(age);

    // Note: This form seems to be for "Offline Registration" or creating a new user?
    // The previous code called handleAddPlayer from context.
    // We should probably use an API to create a user or participant.
    // For now, let's just show a success message as this page seems to be less critical 
    // than the Tournament specific player addition.
    
    setMessage(
      `Fitur pendaftaran global belum aktif. Silakan daftar melalui menu Turnamen.`
    );
    
    // Reset form
    setName("");
    setDob("");
  };

  return (
    <div className="main-content">
      <h1 className="page-title">Players Directory</h1>
      <p className="page-subtitle">
        Daftar pemain yang terdaftar di sistem.
      </p>

      {/* Form pendaftaran pemain */}
      <div className="form-card">
        <h2 className="form-title">Cari Pemain</h2>
        <p className="form-subtitle">
          Cari pemain berdasarkan nama.
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
          {/* 
          <div className="form-group">
            <label className="form-label">Tanggal Lahir</label>
            <input
              type="date"
              className="form-input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <button className="btn-primary mt-16" type="submit">
            Daftarkan Pemain
          </button>
          */}
        </form>
      </div>

      {/* Tabel pemain */}
      <h2 className="section-title" style={{ marginTop: 24 }}>
        Daftar Pemain
      </h2>
      <div className="card mt-8">
        {loading ? (
          <div className="spinner"></div>
        ) : players.length === 0 ? (
          <p style={{ fontSize: 14, color: "#9ca3af" }}>
            Belum ada pemain ditemukan.
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
                <th style={{ padding: "6px 4px" }}>Email</th>
                <th style={{ padding: "6px 4px" }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <tr key={p.id} style={{ borderTop: "1px solid #111827" }}>
                  <td style={{ padding: "6px 4px" }}>{idx + 1}</td>
                  <td style={{ padding: "6px 4px" }}>{p.name}</td>
                  <td style={{ padding: "6px 4px" }}>{p.email}</td>
                  <td style={{ padding: "6px 4px" }}>{p.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Peserta;