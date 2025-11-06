// src/context/GlobalContext.jsx
import React, { createContext, useContext, useReducer } from 'react';
import { SEED_DATA, DEFAULT_TOURNAMENT } from '../utils/seedData';
import { calculateCategory } from '../utils/ageCalculator';
import { generateRoundRobin } from '../utils/roundRobin'; // <-- Perbaikan di sini

// State awal
const initialState = {
  tournament: DEFAULT_TOURNAMENT,
  participants: [],
  matches: [],
};

// Reducer untuk mengelola semua aksi
function appReducer(state, action) {
  switch (action.type) {
    case 'ADD_PARTICIPANT': {
      const newParticipant = {
        ...action.payload,
        id: `p-${Date.now()}`,
        category: calculateCategory(action.payload.dob),
      };
      return {
        ...state,
        participants: [...state.participants, newParticipant],
      };
    }
    case 'GENERATE_SCHEDULE': {
      // 1. Group peserta berdasarkan kategori
      const participantsByCategory = state.participants.reduce((acc, p) => {
        (acc[p.category] = acc[p.category] || []).push(p);
        return acc;
      }, {});

      // 2. Generate jadwal round robin untuk tiap kategori
      let allMatches = [];
      for (const category in participantsByCategory) {
        const categoryParticipants = participantsByCategory[category];
        if (categoryParticipants.length > 1) {
          const categoryMatches = generateRoundRobin(categoryParticipants, category);
          allMatches = [...allMatches, ...categoryMatches];
        }
      }
      return { ...state, matches: allMatches };
    }
    case 'UPDATE_MATCH_SCORE': {
      const { matchId, scores } = action.payload;
      return {
        ...state,
        matches: state.matches.map(match =>
          match.id === matchId
            ? { ...match, ...determineWinner(match, scores) }
            : match
        ),
      };
    }
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        tournament: { ...state.tournament, ...action.payload },
      };
    case 'SEED_DATA':
      return SEED_DATA;
    case 'RESET_DATA':
      return initialState;
    default:
      return state;
  }
}

// Helper untuk menentukan pemenang & status
function determineWinner(match, scores) {
  // Pastikan skor adalah angka
  const [s1a, s1b, s2a, s2b, s3a, s3b] = scores.map(s => parseInt(s) || 0);
  let winsA = 0;
  let winsB = 0;

  if (s1a > s1b) winsA++; else if (s1b > s1a) winsB++;
  if (s2a > s2b) winsA++; else if (s2b > s2a) winsB++;
  
  // Jika skor 1-1, mainkan set 3
  if (winsA === 1 && winsB === 1) {
    if (s3a > s3b) winsA++; else if (s3b > s3a) winsB++;
  }

  const status = (winsA === 2 || winsB === 2) ? 'Selesai' : 'Sedang Berlangsung';
  const winner = status === 'Selesai' ? (winsA > winsB ? match.playerA.name : match.playerB.name) : null;

  return {
    score: [s1a, s1b, s2a, s2b, s3a, s3b], // Simpan skor yang sudah diparsing
    status,
    winner,
  };
}


// Buat Context
const GlobalContext = createContext();

// Buat Provider
export const GlobalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = {
    ...state,
    addParticipant: (participant) => {
      dispatch({ type: 'ADD_PARTICIPANT', payload: participant });
    },
    generateSchedule: () => {
      dispatch({ type: 'GENERATE_SCHEDULE' });
    },
    updateMatchScore: (matchId, scores) => {
      dispatch({ type: 'UPDATE_MATCH_SCORE', payload: { matchId, scores } });
    },
    updateSettings: (settings) => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    },
    seedData: () => dispatch({ type: 'SEED_DATA' }),
    resetData: () => dispatch({ type: 'RESET_DATA' }),
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

// Buat custom hook untuk menggunakan context
export const useGlobalContext = () => {
  return useContext(GlobalContext);
};