// src/utils/seedData.js

export const DEFAULT_TOURNAMENT = {
  name: "Turnamen Bulutangkis React 2025",
  date: "2025-11-10",
  bracketSize: 32,
};

// Data Peserta Demo
const p1 = { id: 'p1', name: 'Budi Santoso', dob: '2010-01-15', email: 'budi@mail.com', category: 'U15' };
const p2 = { id: 'p2', name: 'Citra Lestari', dob: '2009-05-20', email: 'citra@mail.com', category: 'U17' };
const p3 = { id: 'p3', name: 'Agus Wijaya', dob: '2010-03-10', email: 'agus@mail.com', category: 'U15' };
const p4 = { id: 'p4', name: 'Dewi Anggraini', dob: '2008-11-01', email: 'dewi@mail.com', category: 'U17' };
const p5 = { id: 'p5', name: 'Eko Prasetio', dob: '1990-07-07', email: 'eko@mail.com', category: 'Dewasa' };
const p6 = { id: 'p6', name: 'Fitri Handayani', dob: '1992-12-30', email: 'fitri@mail.com', category: 'Dewasa' };

export const SEED_DATA = {
  tournament: DEFAULT_TOURNAMENT,
  participants: [p1, p2, p3, p4, p5, p6],
  matches: [
    {
      id: 'm1',
      playerA: p1,
      playerB: p3,
      category: 'U15',
      status: 'Sedang Berlangsung',
      score: [21, 19, 5, 2, 0, 0],
      winner: null,
    },
    {
      id: 'm2',
      playerA: p2,
      playerB: p4,
      category: 'U17',
      status: 'Selesai',
      score: [18, 21, 21, 15, 21, 10],
      winner: p4.name,
    },
    {
      id: 'm3',
      playerA: p5,
      playerB: p6,
      category: 'Dewasa',
      status: 'Belum Dimulai',
      score: [0, 0, 0, 0, 0, 0],
      winner: null,
    },
  ],
};