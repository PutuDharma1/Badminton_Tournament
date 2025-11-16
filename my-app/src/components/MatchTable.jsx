// src/components/MatchTable.jsx
import React from 'react';

function MatchTable({ title, matches }) {
  
  const formatScore = (score) => {
    if (!score || score.every(s => s === 0)) return '-';
    
    let sets = [];
    if (score[0] > 0 || score[1] > 0) sets.push(`${score[0]}-${score[1]}`);
    if (score[2] > 0 || score[3] > 0) sets.push(`${score[2]}-${score[3]}`);
    if (score[4] > 0 || score[5] > 0) sets.push(`${score[4]}-${score[5]}`);
    return sets.join(', ');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pertandingan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status/Pemenang</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matches.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">Tidak ada pertandingan.</td>
              </tr>
            ) : (
              matches.map((match) => (
                <tr key={match.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{match.id.split('-')[1]}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{match.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {match.playerA.name} vs {match.playerB.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{formatScore(match.score)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {match.status === 'Selesai' ? (
                      <span className="font-bold text-green-600">{match.winner}</span>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        match.status === 'Sedang Berlangsung' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {match.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MatchTable; // Pastikan ada ini!