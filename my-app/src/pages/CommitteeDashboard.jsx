import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import { MapPin, Calendar, Users, ArrowRight, Trophy } from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  DRAFT:    { label: 'Draft',    textLight: '#1d4ed8', textDark: '#93c5fd', bgLight: 'rgba(59,130,246,0.08)',   dotLight: '#3b82f6', dotDark: '#60a5fa' },
  ONGOING:  { label: 'Ongoing',  textLight: '#c2410c', textDark: '#fdba74', bgLight: 'rgba(194,65,12,0.08)',    dotLight: '#f97316', dotDark: '#f97316' },
  FINISHED: { label: 'Finished', textLight: '#15803d', textDark: '#86efac', bgLight: 'rgba(21,128,61,0.08)',    dotLight: '#22c55e', dotDark: '#22c55e' },
};

function getStatusStyle(statusKey) {
  const isDark = document.documentElement.classList.contains('dark');
  const cfg = STATUS_CFG[statusKey] || STATUS_CFG.DRAFT;
  return {
    color:      isDark ? cfg.textDark  : cfg.textLight,
    background: cfg.bgLight,
    dot:        isDark ? cfg.dotDark   : cfg.dotLight,
    label:      cfg.label,
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, note, accentClass }) {
  return (
    <div className={`stat-card ${accentClass || ''}`}>
      <div className="stat-header">
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {note && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6 }}>{note}</div>}
    </div>
  );
}

// ─── Tournament Card ──────────────────────────────────────────────────────────
function TournamentCard({ tournament, onView, onDelete }) {
  const s = getStatusStyle(tournament.status);
  const startDate = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div
      className="card"
      style={{
        padding: '18px 18px 16px',
        borderLeft: `3px solid ${s.dot}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.transform = '';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 16, fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          margin: 0, flex: 1, lineHeight: 1.25,
        }}>
          {tournament.name}
        </h3>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, fontWeight: 700,
          padding: '3px 8px', borderRadius: 6,
          background: s.background, color: s.color,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
          {s.label}
        </span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <MapPin size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Calendar size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{startDate}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Users size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.participantCount || 0} participants &middot; {tournament.matchCount || 0} matches</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 8, paddingTop: 10,
        borderTop: '1px solid var(--border)', marginTop: 2,
      }}>
        <button
          className="btn-primary"
          onClick={onView}
          style={{ flex: 1, fontSize: 13, padding: '7px 12px' }}
        >
          Manage →
        </button>
        <button
          className="btn-danger"
          onClick={onDelete}
          style={{ fontSize: 13, padding: '7px 14px', flexShrink: 0 }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Create Tournament Modal ──────────────────────────────────────────────────
function CreateTournamentModal({ onClose, onSuccess }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    description: '',
    courts: 4,
    dailyStartTime: '09:00',
    dailyEndTime: '18:00',
    matchDurationMinutes: 40,
    breakStartTime: '',
    breakEndTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location || !formData.startDate || !formData.endDate) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      setLoading(true);
      const newT = await tournamentsApi.createTournament({
        name: formData.name,
        location: formData.location,
        startDate: new Date(formData.startDate).toISOString(),
        endDate:   new Date(formData.endDate).toISOString(),
        description: formData.description,
        createdById: user.id,
        registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString() : null,
        dailyStartTime:       formData.dailyStartTime || '09:00',
        dailyEndTime:         formData.dailyEndTime   || '18:00',
        matchDurationMinutes: parseInt(formData.matchDurationMinutes) || 40,
        breakStartTime:       formData.breakStartTime || null,
        breakEndTime:         formData.breakEndTime   || null,
      });
      const courtCount = Math.max(1, parseInt(formData.courts) || 4);
      try {
        await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/courts/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify({ tournamentId: newT.id, count: courtCount, locationNote: formData.location }),
        });
      } catch {
        console.warn('Court auto-creation failed; courts can be added manually.');
      }
      onSuccess(newT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Shared input grid helper
  const Grid2 = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
  );

  const SectionDivider = ({ label }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '20px 0 14px',
    }}>
      <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-faint)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
    </div>
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'fadeIn 0.15s ease',
        }}
      />
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 18,
          padding: '26px 24px 24px',
          maxWidth: 520, width: '92%',
          maxHeight: '92vh',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: 'var(--shadow-modal)',
          animation: 'slideUp 0.18s ease',
        }}
      >
        <style>{`@keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 10px)) } to { opacity: 1; transform: translate(-50%, -50%) } }`}</style>

        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 21, fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              margin: '0 0 4px',
            }}>
              New Tournament
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Fill in the details to create a new event.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ✕
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tournament Name *</label>
            <input type="text" name="name" className="form-input"
              placeholder="Spring Championship 2025"
              value={formData.name} onChange={handleChange} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Venue / Location *</label>
            <input type="text" name="location" className="form-input"
              placeholder="GOR Senayan, Jakarta"
              value={formData.location} onChange={handleChange} disabled={loading} />
          </div>

          <Grid2>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Start Date *</label>
              <input type="date" name="startDate" className="form-input"
                value={formData.startDate} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">End Date *</label>
              <input type="date" name="endDate" className="form-input"
                value={formData.endDate} onChange={handleChange} disabled={loading} />
            </div>
          </Grid2>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Registration Deadline <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span></label>
            <input type="datetime-local" name="registrationDeadline" className="form-input"
              value={formData.registrationDeadline} onChange={handleChange} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Number of Courts</label>
            <input type="number" name="courts" className="form-input"
              min="1" max="20" value={formData.courts} onChange={handleChange} disabled={loading} />
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
              Courts are auto-created and required for match scheduling.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Description <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span></label>
            <textarea name="description" className="form-input" rows="3"
              placeholder="Tournament rules, prizes, eligibility…"
              value={formData.description} onChange={handleChange}
              disabled={loading} style={{ resize: 'vertical' }} />
          </div>

          {/* Schedule settings */}
          <SectionDivider label="Schedule Settings" />

          <Grid2>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Daily Start</label>
              <input type="time" name="dailyStartTime" className="form-input"
                value={formData.dailyStartTime} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Daily End</label>
              <input type="time" name="dailyEndTime" className="form-input"
                value={formData.dailyEndTime} onChange={handleChange} disabled={loading} />
            </div>
          </Grid2>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Match Duration (minutes)</label>
            <input type="number" name="matchDurationMinutes" className="form-input"
              min="15" max="120" step="5"
              value={formData.matchDurationMinutes} onChange={handleChange} disabled={loading} />
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
              Used by the scheduler to space match slots.
            </span>
          </div>

          <SectionDivider label="Break / Lunch (optional)" />

          <Grid2>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Break Start</label>
              <input type="time" name="breakStartTime" className="form-input"
                value={formData.breakStartTime} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Break End</label>
              <input type="time" name="breakEndTime" className="form-input"
                value={formData.breakEndTime} onChange={handleChange} disabled={loading} />
            </div>
          </Grid2>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2, display: 'block' }}>
            Leave blank if there's no break. The scheduler skips this window.
          </span>

          {/* Submit row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="submit" className="btn-primary" disabled={loading}
              style={{ flex: 1, padding: '10px', fontSize: 14 }}
            >
              {loading ? 'Creating…' : 'Create Tournament'}
            </button>
            <button
              type="button" className="btn-outline"
              onClick={onClose} disabled={loading}
              style={{ padding: '10px 20px', fontSize: 14 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function CommitteeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setTournaments(await tournamentsApi.getTournaments());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total:             tournaments.length,
    ongoing:           tournaments.filter(t => t.status === 'ONGOING').length,
    draft:             tournaments.filter(t => t.status === 'DRAFT').length,
    finished:          tournaments.filter(t => t.status === 'FINISHED').length,
    totalParticipants: tournaments.reduce((s, t) => s + (t.participantCount || 0), 0),
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tournament? This cannot be undone.')) return;
    try {
      await tournamentsApi.deleteTournament(id);
      setTournaments(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="main-content-wide">

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: 'var(--accent)',
          letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px',
        }}>
          Committee Portal
        </p>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>. Manage tournaments, schedule matches, and track standings.
        </p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Stats */}
      <div className="stat-grid">
        <StatCard label="Total Tournaments" value={stats.total}    note="all time" />
        <StatCard label="Ongoing"           value={stats.ongoing}  note="currently active" />
        <StatCard label="In Draft"          value={stats.draft}    note="not yet started" />
        <StatCard label="Total Players"     value={stats.totalParticipants} note="across all events" />
      </div>

      {/* Actions bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <h2 className="section-title">My Tournaments</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          + New Tournament
        </button>
      </div>

      {/* Tournament list */}
      {tournaments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: 'var(--bg-card)',
          borderRadius: 14,
          border: '1.5px dashed var(--border)',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-subtle)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
            <Trophy size={24} />
          </div>
          <p style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 17, fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            No tournaments yet
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 20 }}>
            Create your first tournament to get started.
          </p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Tournament
          </button>
        </div>
      ) : (
        <div className="stagger-in" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}>
          {tournaments.map(t => (
            <TournamentCard
              key={t.id}
              tournament={t}
              onView={() => navigate(`/tournament/${t.id}`)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTournamentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newT) => {
            setTournaments(prev => [newT, ...prev]);
            setShowCreateModal(false);
            navigate(`/tournament/${newT.id}`);
          }}
        />
      )}
    </div>
  );
}

export default CommitteeDashboard;
