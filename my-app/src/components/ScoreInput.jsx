import React, { useState } from 'react';
import { useGlobalContext } from '../context/GlobalContext';

function ScoreInput({ match }) {
  const { updateMatchScore } = useGlobalContext();
  const [scores, setScores] = useState(match.score || [0, 0, 0, 0, 0, 0]);

  const handleChange = (index, value) => {
    const newScores = [...scores];
    newScores[index] = value;
    setScores(newScores);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMatchScore(match.id, scores);
    alert(`Skor untuk match ${match.id} berhasil diupdate.`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-4">
      <h3 className="text-xl font-semibold mb-4">Input Skor</h3>
      <p className="text-lg mb-2">{match.playerA.name} vs {match.playerB.name}</p>
      <p className="text-sm text-gray-500 mb-4">Kategori: {match.category} (Status: {match.status})</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-around items-center">
          <span className="font-bold w-1/3 text-center">{match.playerA.name}</span>
          <span className="text-gray-500">Set</span>
          <span className="font-bold w-1/3 text-center">{match.playerB.name}</span>
        </div>
        
        {/* Set 1 */}
        <div className="flex justify-around items-center gap-2">
          <input type="number" value={scores[0]} onChange={e => handleChange(0, e.target.value)} className="w-1/3 p-2 border rounded-md text-center" />
          <span className="text-gray-700 font-bold">Set 1</span>
          <input type="number" value={scores[1]} onChange={e => handleChange(1, e.target.value)} className="w-1/3 p-2 border rounded-md text-center" />
        </div>
        
        {/* Set 2 */}
        <div className="flex justify-around items-center gap-2">
          <input type="number" value={scores[2]} onChange={e => handleChange(2, e.target.value)} className="w-1/3 p-2 border rounded-md text-center" />
          <span className="text-gray-700 font-bold">Set 2</span>
          <input type="number" value={scores[3]} onChange={e => handleChange(3, e.target.value)} className="w-1/3 p-2 border rounded-md text-center" />
        </div>
        
        {/* Set 3 (Jika Perlu) */}
        <div className="flex justify-around items-center gap-2">
          <input type="number" value={scores[4]} onChange={e => handleChange(4, e.target.value)} className="w-1/3 p-2 border rounded-md text-center" />
          <span className="text-gray-700 font-bold">Set 3</span>
          <input type="number" value={scores[5]} onChange={e => handleChange(5, e.target.value)} className="w-1/3 p-2 border rounded-md text-center" />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 transition-colors"
        >
          Update Skor
        </button>
      </form>
    </div>
  );
}

export default ScoreInput;