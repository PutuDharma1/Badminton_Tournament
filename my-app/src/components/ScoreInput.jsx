// my-app/src/components/ScoreInput.jsx
import React, { useState } from 'react';
// import { useGlobalContext } from '../context/GlobalContext'; // Uncomment saat context siap

function ScoreInput({ match }) {
  // const { refreshData } = useGlobalContext(); // Uncomment saat context siap
  const [homeScore, setHomeScore] = useState(match.homeScore || 0);
  const [awayScore, setAwayScore] = useState(match.awayScore || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdateScore = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`http://127.0.0.1:5000/match/score/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore) 
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      setMessage('Skor berhasil disimpan!');
      // refreshData(); // Panggil fungsi ini untuk update data global
      
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title text-center block mb-4">Input Skor Pertandingan</h3>
        
        <div className="grid grid-cols-3 items-center gap-4">
          {/* Tim Tuan Rumah */}
          <div className="text-center space-y-2">
            <label className="text-lg font-medium">{match.homeTeam.name}</label>
            <input
              type="number"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="input input-bordered w-24 text-center text-3xl font-bold"
            />
          </div>

          <span className="text-3xl font-bold text-center">vs</span>

          {/* Tim Tamu */}
          <div className="text-center space-y-2">
            <label className="text-lg font-medium">{match.awayTeam.name}</label>
            <input
              type="number"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="input input-bordered w-24 text-center text-3xl font-bold"
            />
          </div>
        </div>

        <div className="card-actions justify-end mt-6">
          <button
            onClick={handleUpdateScore}
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? <span className="loading loading-spinner"></span> : 'Simpan Skor & Akhiri'}
          </button>
        </div>

         {message && (
           <div role="alert" className={`alert ${message.startsWith('Error') ? 'alert-error' : 'alert-success'} mt-4`}>
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScoreInput;