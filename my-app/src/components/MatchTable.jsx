// my-app/src/components/MatchTable.jsx
import React, { useState, useEffect } from 'react';
// import { useGlobalContext } from '../context/GlobalContext'; // Uncomment saat context siap

function MatchTable() {
  // const { matches, isLoading } = useGlobalContext(); // Uncomment saat context siap
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    // Simulasi pengambilan data. Ganti dengan data context Anda
    const fetchMatches = async () => {
       try {
        const response = await fetch('http://127.0.0.1:5000/match/list/1'); // Asumsi turnamen ID 1
        const data = await response.json();
        setMatches(data.data || []);
      } catch (error) {
        console.error("Gagal mengambil pertandingan:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMatches();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'FINISHED':
        return <span className="badge badge-success badge-outline">Selesai</span>;
      case 'ONGOING':
        return <span className="badge badge-warning badge-outline">Berlangsung</span>;
      case 'SCHEDULED':
      default:
        return <span className="badge badge-info badge-outline">Terjadwal</span>;
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Jadwal & Hasil Pertandingan</h3>
        {isLoading ? (
          <div className="flex justify-center p-10">
            <span className="loading loading-lg loading-spinner"></span>
          </div>
        ) : (
          <div className="overflow-x-auto h-96">
            <table className="table table-zebra table-pin-rows w-full">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Babak</th>
                  <th>Tim 1</th>
                  <th>Skor</th>
                  <th>Tim 2</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.length > 0 ? (
                  matches.map(m => (
                    <tr key={m.id}>
                      <td>{m.category?.name || 'N/A'}</td>
                      <td>{m.round}</td>
                      <td className={m.winnerTeamId === m.homeTeamId ? 'font-bold' : ''}>
                        {m.homeTeam?.name || 'N/A'}
                      </td>
                      <td>
                        {m.status === 'FINISHED' ? (
                          `${m.homeScore} - ${m.awayScore}`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className={m.winnerTeamId === m.awayTeamId ? 'font-bold' : ''}>
                        {m.awayTeam?.name || 'N/A'}
                      </td>
                      <td>{getStatusBadge(m.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">Jadwal belum dibuat.</td>
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

export default MatchTable;