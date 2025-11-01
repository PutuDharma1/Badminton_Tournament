// src/pages/RegisterOrganizer.jsx
import { useState } from "react";
import { pushItem } from "../utils/storage.js";
import { useNavigate } from "react-router-dom";

export default function RegisterOrganizer() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    role: "",
    phone: "",
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!form.full_name || !form.role) {
      alert("Nama dan peran panitia wajib diisi.");
      return;
    }
    pushItem("organizers", { ...form, id: crypto.randomUUID() });
    nav("/thanks", { state: { role: "Panitia", name: form.full_name } });
  }

  return (
    <div className="container">
      <h2>Registrasi Panitia</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Nama Lengkap
          <input
            name="full_name"
            value={form.full_name}
            onChange={onChange}
            placeholder="Nama lengkap"
          />
        </label>
        <label>
          Peran di Turnamen
          <input
            name="role"
            value={form.role}
            onChange={onChange}
            placeholder="Contoh: Sekretariat, Scorer, Marshal"
          />
        </label>
        <label>
          No. HP (opsional)
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            placeholder="08xxxxxxxxxx"
          />
        </label>
        <button className="btn primary">Simpan</button>
      </form>
    </div>
  );
}
