import React from 'react';

function RefereeMatchPicker({ matches, onSelectMatch, selectedMatchId }) {
  
  const handleChange = (e) => {
    onSelectMatch(e.target.value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">Pilih Pertandingan</h3>
      <select
        value={selectedMatchId || ""}
        onChange={handleChange}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="" disabled>-- Pilih pertandingan --</option>
        {matches.map(match => (
          <option key={match.id} value={match.id}>
            [{match.category}] {match.playerA.name} vs {match.playerB.name} ({match.status})
          </option>
        ))}
      </select>
      
      {matches.length === 0 && (
         <p className="text-sm text-gray-500 mt-2">
           Tidak ada pertandingan yang tersedia (buat jadwal di tab Peserta).
         </p>
      )}
    </div>
  );
}

export default RefereeMatchPicker;