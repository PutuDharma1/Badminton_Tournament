// my-app/src/components/ParticipantTable.jsx
import React, { useState, useEffect } from 'react';

function ParticipantTable() {
  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Ganti '1' dengan ID turnamen dinamis jika perlu
        const response = await fetch('http://127.0.0.1:5000/participant/list/1'); 
        const data = await response.json();
        setParticipants(data.data || []);
      } catch (error) {
        console.error("Gagal mengambil peserta:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchParticipants();
  }, []); // TODO: Tambahkan dependency untuk refresh data

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Daftar Peserta Terdaftar</h3>
        
        {isLoading ? (
          <div className="flex justify-center p-10">
            <span className="loading loading-lg loading-spinner"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Kategori</th>
                  <th>Usia (saat turnamen)</th>
                </tr>
              </thead>
              <tbody>
                {participants.length > 0 ? (
                  participants.map(p => (
                    <tr key={p.id}>
                      <td>{p.fullName}</td>
                      <td>{p.email || '-'}</td>
                      <td>{p.category ? p.category.name : 'Belum ada'}</td>
                      <td>{p.age || '?'} thn</td> 
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center">Belum ada peserta terdaftar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParticipantTable;