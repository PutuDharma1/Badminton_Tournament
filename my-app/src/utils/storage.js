// src/utils/storage.js
const KEY = "bos-data-v1";

// Ambil data dari localStorage
export function getData() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {
      players: [],
      referees: [],
      organizers: [],
    };
  } catch {
    return { players: [], referees: [], organizers: [] };
  }
}

// Simpan data ke localStorage
export function setData(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

// Tambahkan satu item ke jenis data tertentu
export function pushItem(type, item) {
  const db = getData();
  db[type] = [...(db[type] || []), item];
  setData(db);
}

// Hitung umur dari tanggal lahir
export function calcAge(isoDob) {
  if (!isoDob) return 0;
  const dob = new Date(isoDob);
  const today = new Date();
  const diff = today - dob;
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// Kategori otomatis berdasar umur
export function categoryForAge(age) {
  if (age <= 13) return "U13";
  if (age <= 17) return "U17";
  return "Open";
}
