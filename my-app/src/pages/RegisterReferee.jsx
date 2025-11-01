// src/pages/RegisterReferee.jsx
import { useState } from "react";
import { pushItem } from "../utils/storage.js";
import { useNavigate } from "react-router-dom";

export default function RegisterReferee() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    license: "",
    phone: "",
    email: "",
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!form.full_name || !form.license) {
      alert("Nama dan level lisensi wajib diisi.");
      return;
    }

    pushItem("referees", { ...form, id: crypto.randomUUID() });
    nav("/thanks", { state: { role: "Wasit", name: form.full_name } });
  }

  return (
    <div className="container">
      <h2>Registrasi Wasit</h2>
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
          Level Lisensi
          <select name="license" value={form.license} onChange={onChange}>
            <option value="">Pilih</option>
            <option value="C">Level C</option>
            <option value="B">Level B</option>
            <option value="A">Level A</option>
          </select>
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
        <label>
          Email (opsional)
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder="email@example.com"
          />
        </label>
        <button className="btn primary">Simpan</button>
      </form>
    </div>
  );
}
