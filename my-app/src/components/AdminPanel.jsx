import React, { useState } from 'react';
import { useGlobalContext } from '../context/GlobalContext';

function AdminPanel() {
  const { tournament, updateSettings, seedData, resetData } = useGlobalContext();
  const [settings, setSettings] = useState({
    name: tournament.name || 'Turnamen Baru',
    date: tournament.date || new Date().toISOString().split('T')[0],
    bracketSize: tournament.bracketSize || 32,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateSettings = () => {
    updateSettings(settings);
    alert("Pengaturan turnamen berhasil disimpan.");
  };

  const handleSeed = () => {
    if (confirm("Yakin ingin memuat data demo? Semua data saat ini akan hilang.")) {
      seedData();
      alert("Data demo berhasil dimuat.");
    }
  };

  const handleReset = () => {
    if (confirm("YAKIN ingin me-reset semua data? (Peserta, Jadwal, Skor)")) {
      resetData();
      alert("Semua data telah di-reset.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      {/* Pengaturan Turnamen */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Pengaturan Turnamen</h3>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Turnamen</label>
          <input
            type="text"
            name="name"
            id="name"
            value={settings.name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Tanggal</label>
          <input
            type="date"
            name="date"
            id="date"
            value={settings.date}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="bracketSize" className="block text-sm font-medium text-gray-700">Jenis Bracket</label>
          <select
            name="bracketSize"
            id="bracketSize"
            value={settings.bracketSize}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          >
            <option value="16">16 Besar</option>
            <option value="32">32 Besar</option>
            <option value="64">64 Besar</option>
          </select>
        </div>
        <button
          onClick={handleUpdateSettings}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700"
        >
          Simpan Pengaturan
        </button>
      </div>

      {/* Kontrol Data */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-xl font-semibold">Kontrol Data (Demo)</h3>
        <button
          onClick={handleSeed}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-green-700"
        >
          Seed Demo Data
        </button>
        <button
          onClick={handleReset}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-700"
        >
          Reset Semua Data
        </button>
      </div>
    </div>
  );
}

export default AdminPanel;