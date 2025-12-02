import React, { useState, useEffect } from 'react';
import matchesApi from '../api/matches';
import { useAuth } from '../context/AuthContext';

function Wasit() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // Get all matches that need a referee or are assigned to this referee
      // For now, let's fetch all matches and filter client-side or use a specific API endpoint
      // Assuming we want to show matches available for pickup
      const allMatches = await matchesApi.getMatchesByTournament(2); // Temporary: fetching from tournament 2 or we need an endpoint for "all open matches"
      // Since we don't have "get all open matches" in mock API, let's use a workaround or update API
      // Let's assume we want to show matches from all tournaments. 
      // For the mock, let's just fetch from the active tournament (ID 2) for demonstration
      // In a real app, we'd have `matchesApi.getAvailableMatches()`
      
      // Let's use the mock data structure directly if needed, but better to stick to API
      // We'll fetch matches from tournament 1 and 2
      const t1Matches = await matchesApi.getMatchesByTournament(1);
      const t2Matches = await matchesApi.getMatchesByTournament(2);
      
      const all = [...t1Matches, ...t2Matches];
      
      // Filter for matches that:
      // 1. Have no referee (Available)
      // 2. OR are assigned to current user (My Matches)
      const relevantMatches = all.filter(m => 
        (!m.refereeId && m.status !== 'FINISHED') || 
        (m.refereeId === user?.id)
      );
      
      setMatches(relevantMatches);
    } catch (err) {
      setError('Failed to load matches');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickMatch = async (matchId) => {
    try {
      setPicking(matchId);
      await matchesApi.assignReferee(matchId, user.id);
      await fetchMatches(); // Refresh list
    } catch (err) {
      alert(err.message);
    } finally {
      setPicking(null);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const myMatches = matches.filter(m => m.refereeId === user?.id);
  const availableMatches = matches.filter(m => !m.refereeId);

  return (
    <div className="main-content">
      <h1 className="page-title">Referee Dashboard</h1>
      <p className="page-subtitle">
        Manage your matches and find new assignments.
      </p>

      {/* My Matches Section */}
      <div className="card mt-16" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#60a5fa' }}>My Upcoming Matches</h3>
        {myMatches.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>You have no assigned matches.</p>
        ) : (
          <MatchTable matches={myMatches} isMyMatch={true} />
        )}
      </div>

      {/* Available Matches Section */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#34d399' }}>Available for Pickup</h3>
        {availableMatches.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14 }}>No matches available for pickup.</p>
        ) : (
          <MatchTable 
            matches={availableMatches} 
            onPick={handlePickMatch} 
            picking={picking} 
          />
        )}
      </div>
    </div>
  );
}

function MatchTable({ matches, isMyMatch, onPick, picking }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: "left", color: "#9ca3af", borderBottom: '1px solid #334155' }}>
          <th style={{ padding: "12px 8px" }}>Match</th>
          <th style={{ padding: "12px 8px" }}>Time</th>
          <th style={{ padding: "12px 8px" }}>Court</th>
          <th style={{ padding: "12px 8px" }}>Status</th>
          {!isMyMatch && <th style={{ padding: "12px 8px" }}>Action</th>}
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id} style={{ borderBottom: "1px solid #1e293b" }}>
            <td style={{ padding: "12px 8px" }}>
              <div style={{ fontWeight: 500 }}>
                {m.homeTeam?.user?.name || m.homeTeam?.offlineName || 'TBD'} 
                <span style={{ color: '#64748b', margin: '0 4px' }}>vs</span> 
                {m.awayTeam?.user?.name || m.awayTeam?.offlineName || 'TBD'}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{m.groupCode ? `Group ${m.groupCode}` : 'Round Robin'}</div>
            </td>
            <td style={{ padding: "12px 8px" }}>
              {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'TBD'}
            </td>
            <td style={{ padding: "12px 8px" }}>
              {m.courtId ? `Court ${m.courtId}` : '-'}
            </td>
            <td style={{ padding: "12px 8px" }}>
              <span style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 11,
                background: m.status === 'ONGOING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                color: m.status === 'ONGOING' ? '#f59e0b' : '#60a5fa',
                border: `1px solid ${m.status === 'ONGOING' ? '#f59e0b' : '#60a5fa'}`
              }}>
                {m.status}
              </span>
            </td>
            {!isMyMatch && (
              <td style={{ padding: "12px 8px" }}>
                <button
                  className="btn-primary"
                  style={{ padding: "4px 12px", fontSize: 12 }}
                  onClick={() => onPick(m.id)}
                  disabled={picking === m.id}
                >
                  {picking === m.id ? '...' : 'Pick'}
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default Wasit;