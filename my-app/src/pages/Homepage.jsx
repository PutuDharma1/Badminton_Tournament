import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';

export default function Homepage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasRole } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, ongoing, finished

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await tournamentsApi.getTournaments();
      setTournaments(data);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = filter === 'all'
    ? tournaments
    : tournaments.filter(t => t.status === filter.toUpperCase());

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 className="page-title">
          {isAuthenticated ? `Welcome, ${user?.name}!` : 'Badminton Tournaments'}
        </h1>
        <p className="page-subtitle">
          {isAuthenticated
            ? 'Explore and join badminton tournaments'
            : 'Sign in to register for tournaments'}
        </p>
      </div>

      {/* Quick Actions */}
      {isAuthenticated && (
        <div style={{
          padding: 20,
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1))',
          borderRadius: 16,
          border: '1px solid rgba(34, 197, 94, 0.3)',
          marginBottom: 32
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {hasRole('COMMITTEE') && (
              <button
                className="btn-primary"
                onClick={() => navigate('/committee')}
              >
                🎯 Committee Dashboard
              </button>
            )}
            {hasRole('PLAYER') && (
              <button
                className="btn-primary"
                onClick={() => navigate('/player')}
              >
                🏸 My Tournaments
              </button>
            )}
            {hasRole('REFEREE') && (
              <button
                className="btn-primary"
                onClick={() => navigate('/referee')}
              >
                👨‍⚖️ Referee Dashboard
              </button>
            )}
            <button
              className="btn-outline"
              onClick={() => navigate('/profile')}
            >
              👤 My Profile
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {['all', 'draft', 'ongoing', 'finished'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 0',
                color: filter === f ? 'var(--text-link)' : 'var(--text-muted)',
                borderBottom: filter === f ? '2px solid var(--text-link)' : 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {f} {f === 'all' ? `(${tournaments.length})` : `(${tournaments.filter(t => t.status === f.toUpperCase()).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tournaments Grid */}
      {filteredTournaments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            {filter === 'all' ? 'No tournaments available' : `No ${filter} tournaments`}
          </p>
          {!isAuthenticated && (
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Sign In
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16
        }}>
          {filteredTournaments.map(tournament => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              onClick={() => navigate(`/tournament/${tournament.id}`)}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Tournament Card Component
function TournamentCard({ tournament, onClick, isAuthenticated }) {
  const statusColors = {
    DRAFT: { bg: 'var(--status-scheduled-bg)', border: 'var(--status-scheduled-border)', text: 'var(--status-scheduled-text)' },
    ONGOING: { bg: 'var(--status-ongoing-bg)', border: 'var(--status-ongoing-border)', text: 'var(--status-ongoing-text)' },
    FINISHED: { bg: 'var(--status-finished-bg)', border: 'var(--status-finished-border)', text: 'var(--status-finished-text)' },
  };

  const status = statusColors[tournament.status] || statusColors.DRAFT;

  return (
    <div
      className="card"
      style={{
        padding: 16,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>{tournament.name}</h3>
        <span
          style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 999,
            background: status.bg,
            border: `1px solid ${status.border}`,
            color: status.text,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}
        >
          {tournament.status}
        </span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        <p style={{ margin: '4px 0' }}>📍 {tournament.location}</p>
        <p style={{ margin: '4px 0' }}>📅 {new Date(tournament.startDate).toLocaleDateString()}</p>
        <p style={{ margin: '4px 0' }}>👥 {tournament.participantCount || 0} participants</p>
      </div>

      {tournament.description && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>
          {tournament.description.substring(0, 80)}{tournament.description.length > 80 ? '...' : ''}
        </p>
      )}

      <button
        className="btn-primary"
        style={{ marginTop: 12, width: '100%', fontSize: 13, padding: '8px 12px' }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        View Details →
      </button>
    </div>
  );
}
