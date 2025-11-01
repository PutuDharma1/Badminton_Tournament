import RoleCard from "../components/RoleCard.jsx";

export default function RoleSelect() {
  return (
    <div className="container">
      <h2>Pilih Peran yang Ingin Didaftarkan</h2>
      <p className="muted">Silakan pilih salah satu peran di bawah ini.</p>
      <div className="grid">
        <RoleCard
          title="Pemain"
          desc="Nama, tanggal lahir, jenis kelamin, klub. Kategori otomatis."
          to="/register/player"
        />
        <RoleCard
          title="Wasit"
          desc="Data personal & level lisensi (C/B/A)."
          to="/register/referee"
        />
        <RoleCard
          title="Panitia"
          desc="Nama, peran/posisi, dan kontak."
          to="/register/organizer"
        />
      </div>
    </div>
  );
}
