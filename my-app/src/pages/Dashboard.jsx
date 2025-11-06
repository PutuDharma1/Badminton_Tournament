// src/pages/Dashboard.jsx
import React from 'react';
import { useGlobalContext } from '../context/GlobalContext';
import DashboardMetrics from '../components/DashboardMetrics';
import MatchTable from '../components/MatchTable';

function Dashboard() {
  const { tournament, participants, matches } = useGlobalContext();

  const ongoingMatches = matches.filter(m => m.status === 'Sedang Berlangsung');
  const completedMatches = matches.filter(m => m.status === 'Selesai');

  // Hitung kategori unik
  const categories = [...new Set(participants.map(p => p.category))];

  const metrics = {
    participantsCount: participants.length,
    categoriesCount: categories.length,
    matchesCount: matches.length,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-center">{tournament.name}</h2>
      
      <DashboardMetrics metrics={metrics} />
      
      <MatchTable title="Sedang Berlangsung" matches={ongoingMatches} />
      <MatchTable title="Selesai" matches={completedMatches} />
    </div>
  );
}

export default Dashboard;