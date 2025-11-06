// src/utils/roundRobin.js
export function generateRoundRobin(participants, category) {
  const matches = [];
  if (participants.length < 2) return matches;

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        id: `m-${category}-${Date.now()}-${i}-${j}`,
        playerA: participants[i],
        playerB: participants[j],
        category: category,
        status: 'Belum Dimulai', // 'Belum Dimulai', 'Sedang Berlangsung', 'Selesai'
        score: [0, 0, 0, 0, 0, 0], // [s1a, s1b, s2a, s2b, s3a, s3b]
        winner: null,
      });
    }
  }
  return matches;
}