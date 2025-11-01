// src/pages/RegisterPlayer.jsx
import { useState } from "react";
import { pushItem, calcAge, categoryForAge } from "../utils/storage.js";
import { useNavigate } from "react-router-dom";

export default function RegisterPlayer() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    dob: "",
    gender: "",
    club: "",
  });

  const age = calcAge(form.dob);
  const category = categoryForAge(age);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!form.full_name || !form.dob || !form.gender) {
      alert("Nama, tanggal lahir, dan gender wajib diisi.");
      return;
    }

    const item = { ...form, age, category, id: crypto.randomUUID() };
    pushItem("players", item);
    nav("/thanks", { state: { role: "Pemain", name: form.full_name } });
  }

  return (
    <div className="container">
      <h2>Registrasi Pemain</h2>
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
          Tanggal Lahir
          <input type="date" name="dob" value={form.dob} onChange={onChange} />
        </label>
        <label>
          Jenis Kelamin
          <select name="gender" value={form.gender} onChange={onChange}>
            <option value="">Pilih</option>
            <option value="M">Laki-laki</option>
            <option value="F">Perempuan</option>
          </select>
        </label>
        <label>
          Klub (opsional)
          <input
            name="club"
            value={form.club}
            onChange={onChange}
            placeholder="Nama klub"
          />
        </label>

        <div className="preview">
          <div><b>Umur (otomatis):</b> {Number.isFinite(age) ? age : "-"}</div>
          <div><b>Kategori:</b> {Number.isFinite(age) ? category : "-"}</div>
        </div>

        <button className="btn primary" type="submit">Simpan</button>
      </form>
    </div>
  );
}
