import React from 'react';
import { useGlobalContext } from '../context/GlobalContext';

function AdminPanel() {
  const categories = [
    {id: 1, name: 'Tunggal Putra U-15'},
    {id: 2, name: 'Ganda Putra Dewasa'},
    {id: 3, name: 'Tunggal Putri Dewasa'},
  ];
  const participants = [
    {id: 1, categoryId: 1},
    {id: 2, categoryId: 1},
    {id: 3, categoryId: 2},
    {id: 4, categoryId: 3},
  ];

  const categorySummary = categories.map(cat => ({
    ...cat,
    participantCount: participants.filter(p => p.categoryId === cat.id).length
  }));

  const handleGenerateSchedule = (categoryId) => {
    // Panggil fungsi context
    console.log(`Memicu generate jadwal untuk kategori: ${categoryId}`);
    // generateSchedule(categoryId);
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-6">
        <h3 className="card-title">Manajemen Kategori & Jadwal</h3>
        
        {/* Tabel Ringkasan Kategori */}
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Peserta</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td>{cat.participantCount}</td>
                  <td className="space-x-2">
                    <button 
                      onClick={() => handleGenerateSchedule(cat.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Generate Jadwal
                    </button>
                    <button className="btn btn-ghost btn-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bagian Laporan */}
        <div className="divider"></div>
        <div>
          <h4 className="text-lg font-semibold mb-2">Laporan Turnamen</h4>
          <div className="flex gap-2">
            <button 
              // onClick={() => downloadReport('participants')}
              className="btn btn-success"
            >
              Unduh Laporan Peserta
            </button>
            <button 
              // onClick={() => downloadReport('results')}
              className="btn btn-success"
            >
              Unduh Hasil Pertandingan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;