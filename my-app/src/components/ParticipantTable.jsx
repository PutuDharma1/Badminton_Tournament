// my-app/src/components/ParticipantTable.jsx

import React, { useContext } from 'react';
import { GlobalContext } from '../context/GlobalContext';
import { calculateAge } from '../utils/ageCalculator'; // Asumsi util ini ada

// Terima 'fetchParticipants' sebagai prop
function ParticipantTable({ participants, fetchParticipants }) { 
  const { state } = useContext(GlobalContext);

  const handleDelete = async (participantId, participantName) => {
    // Konfirmasi sebelum menghapus
    if (!window.confirm(`Apakah Anda yakin ingin menghapus peserta "${participantName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${state.api_url}/participants/${participantId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus peserta');
      }

      alert(data.message || 'Peserta berhasil dihapus');
      fetchParticipants(); // Panggil fungsi refresh dari parent
    } catch (error) {
      console.error('Error deleting participant:', error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <h2 className="text-xl font-semibold p-4 border-b">Daftar Peserta Terdaftar</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                No
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gender
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usia
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategori
              </th>
              {/* Kolom baru untuk Aksi */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participants.length > 0 ? (
              participants.map((p, index) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.gender}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {calculateAge(p.dob)} Thn
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {p.category ? p.category.name : 'N/A'}
                  </td>
                  {/* Tombol Hapus */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  Belum ada peserta yang terdaftar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ParticipantTable;