// my-app/src/components/RefereeMatchPicker.jsx
import React from 'react';

function RefereeMatchPicker({ matches, onSelectMatch, selectedMatchId }) {
  // Anda akan mengganti 'matches' dengan data dari GlobalContext
  const availableMatches = matches || []; 

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Pilih Pertandingan</h3>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Pilih pertandingan yang akan diwasiti</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedMatchId || ''}
            onChange={(e) => onSelectMatch(parseInt(e.target.value) || null)}
          >
            <option value="">Pilih pertandingan...</option>
            {availableMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.category.name} - {match.homeTeam.name} vs {match.awayTeam.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default RefereeMatchPicker;