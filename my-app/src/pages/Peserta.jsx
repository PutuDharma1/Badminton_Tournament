import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';

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
  const context = useOutletContext();
  const { players, handleAddPlayer } = context;

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage("");

    if (!name || !dob) {
      setMessage("Nama dan tanggal lahir wajib diisi.");
      return;
    }

    const age = calculateAge(dob);
    const category = getCategoryForAge(age);

    handleAddPlayer({
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

export default Peserta;