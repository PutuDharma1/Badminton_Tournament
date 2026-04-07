import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import ConfirmationModal from '../components/ConfirmationModal';
import { MapPin, Calendar, Users, Trophy } from 'lucide-react';

// ─── Status config — uses CSS custom properties so dark mode is automatic ─────
const STATUS_CFG = {
  DRAFT: {
    label: 'Draft',
    color: 'var(--status-scheduled-text)',
    bg:    'var(--status-scheduled-bg)',
    dot:   'var(--status-scheduled-border)',
  },
  ONGOING: {
    label: 'Ongoing',
    color: 'var(--status-ongoing-text)',
    bg:    'var(--status-ongoing-bg)',
    dot:   'var(--status-ongoing-border)',
  },
  FINISHED: {
    label: 'Finished',
    color: 'var(--status-finished-text)',
    bg:    'var(--status-finished-bg)',
    dot:   'var(--status-finished-border)',
  },
};

// ─── Skeleton card for loading state ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }} aria-hidden="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="skeleton" style={{ height: 20, width: '60%' }} />
        <div className="skeleton" style={{ height: 20, width: 56, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="skeleton" style={{ height: 13, width: '45%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 13, width: '35%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 13, width: '55%', borderRadius: 4 }} />
      </div>
      <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ height: 34, flex: 1, borderRadius: 10 }} />
        <div className="skeleton" style={{ height: 34, width: 64, borderRadius: 10 }} />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, note }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {note && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6 }}>{note}</div>}
    </div>
  );
}

// ─── Tournament Card ──────────────────────────────────────────────────────────
function TournamentCard({ tournament, onView, onDeleteClick }) {
  const cfg = STATUS_CFG[tournament.status] || STATUS_CFG.DRAFT;
  const startDate = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <article
      className="card"
      style={{
        padding: '18px 18px 16px',
        borderLeft: `3px solid ${cfg.dot}`,
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
          background: cfg.bg, color: cfg.color,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} aria-hidden="true" />
          {cfg.label}
        </span>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <MapPin size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} aria-hidden="true" />
          <span>{tournament.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Calendar size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} aria-hidden="true" />
          <span>{startDate}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Users size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} aria-hidden="true" />
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
          aria-label={`Manage ${tournament.name}`}
          style={{ flex: 1, fontSize: 13, padding: '7px 12px' }}
        >
          Manage →
        </button>
        <button
          className="btn-danger"
          onClick={onDeleteClick}
          aria-label={`Delete ${tournament.name}`}
          style={{ fontSize: 13, padding: '7px 14px', flexShrink: 0 }}
        >
          Delete
        </button>
      </div>
    </article>
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

  const Grid2 = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
  );

  const SectionDivider = ({ label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 14px' }}>
      <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-faint)',
        letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap',
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
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
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
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 id="modal-title" style={{
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
            aria-label="Close modal"
            style={{
              width: 44, height: 44, borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="t-name">
              Tournament Name <abbr title="required" style={{ color: 'var(--danger-text)', textDecoration: 'none' }}>*</abbr>
            </label>
            <input id="t-name" type="text" name="name" className="form-input"
              placeholder="Spring Championship 2025"
              value={formData.name} onChange={handleChange}
              disabled={loading} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="t-location">
              Venue / Location <abbr title="required" style={{ color: 'var(--danger-text)', textDecoration: 'none' }}>*</abbr>
            </label>
            <input id="t-location" type="text" name="location" className="form-input"
              placeholder="GOR Senayan, Jakarta"
              value={formData.location} onChange={handleChange}
              disabled={loading} required />
          </div>

          <Grid2>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="t-start">
                Start Date <abbr title="required" style={{ color: 'var(--danger-text)', textDecoration: 'none' }}>*</abbr>
              </label>
              <input id="t-start" type="date" name="startDate" className="form-input"
                value={formData.startDate} onChange={handleChange}
                disabled={loading} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="t-end">
                End Date <abbr title="required" style={{ color: 'var(--danger-text)', textDecoration: 'none' }}>*</abbr>
              </label>
              <input id="t-end" type="date" name="endDate" className="form-input"
                value={formData.endDate} onChange={handleChange}
                disabled={loading} required />
            </div>
          </Grid2>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="t-deadline">
              Registration Deadline{' '}
              <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input id="t-deadline" type="datetime-local" name="registrationDeadline" className="form-input"
              value={formData.registrationDeadline} onChange={handleChange} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="t-courts">Number of Courts</label>
            <input id="t-courts" type="number" name="courts" className="form-input"
              min="1" max="20" value={formData.courts} onChange={handleChange} disabled={loading} />
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4, display: 'block' }}>
              Courts are auto-created and required for match scheduling.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="t-desc">
              Description{' '}
              <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea id="t-desc" name="description" className="form-input" rows="3"
              placeholder="Tournament rules, prizes, eligibility…"
              value={formData.description} onChange={handleChange}
              disabled={loading} style={{ resize: 'vertical' }} />
          </div>

          <SectionDivider label="Schedule Settings" />

          <Grid2>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="t-daily-start">Daily Start</label>
              <input id="t-daily-start" type="time" name="dailyStartTime" className="form-input"
                value={formData.dailyStartTime} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="t-daily-end">Daily End</label>
              <input id="t-daily-end" type="time" name="dailyEndTime" className="form-input"
                value={formData.dailyEndTime} onChange={handleChange} disabled={loading} />
            </div>
          </Grid2>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="t-duration">Match Duration (minutes)</label>
            <input id="t-duration" type="number" name="matchDurationMinutes" className="form-input"
              min="15" max="120" step="5"
              value={formData.matchDurationMinutes} onChange={handleChange} disabled={loading} />
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4, display: 'block' }}>
              Used by the scheduler to space match slots.
            </span>
          </div>

          <SectionDivider label="Break / Lunch (optional)" />

          <Grid2>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="t-break-start">Break Start</label>
              <input id="t-break-start" type="time" name="breakStartTime" className="form-input"
                value={formData.breakStartTime} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="t-break-end">Break End</label>
              <input id="t-break-end" type="time" name="breakEndTime" className="form-input"
                value={formData.breakEndTime} onChange={handleChange} disabled={loading} />
            </div>
          </Grid2>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4, display: 'block' }}>
            Leave blank if there's no break. The scheduler skips this window.
          </span>

          {/* Submit row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              type="submit" className="btn-primary" disabled={loading}
              style={{ flex: 1, padding: '10px', fontSize: 14 }}
            >
              {loading
                ? <><span className="sr-only">Creating tournament…</span><span aria-hidden="true">Creating…</span></>
                : 'Create Tournament'}
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
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
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
    totalParticipants: tournaments.reduce((s, t) => s + (t.participantCount || 0), 0),
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await tournamentsApi.deleteTournament(deleteTarget.id);
      setTournaments(prev => prev.filter(t => t.id !== deleteTarget.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="main-content-wide" aria-busy="true" aria-label="Loading tournaments">
        {/* Header skeleton */}
        <div style={{ marginBottom: 28 }}>
          <div className="skeleton" style={{ height: 11, width: 130, borderRadius: 4, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 32, width: 220, borderRadius: 6, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 4 }} />
        </div>
        {/* Stat cards skeleton */}
        <div className="stat-grid" style={{ marginBottom: 28 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 11, width: '55%', borderRadius: 4, marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 30, width: '40%', borderRadius: 6 }} />
            </div>
          ))}
        </div>
        {/* Tournament cards skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 14,
        }}>
          {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
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

      {error && <div className="alert-error" role="alert">{error}</div>}

      {/* Stats */}
      <div className="stat-grid">
        <StatCard label="Total Tournaments" value={stats.total}             note="all time" />
        <StatCard label="Ongoing"           value={stats.ongoing}           note="currently active" />
        <StatCard label="In Draft"          value={stats.draft}             note="not yet started" />
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
        <div className="empty-state">
          <div className="empty-state-icon">
            <Trophy size={24} aria-hidden="true" />
          </div>
          <p className="empty-state-title">No tournaments yet</p>
          <p className="empty-state-desc">Create your first tournament to get started.</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Tournament
          </button>
        </div>
      ) : (
        <div
          className="stagger-in"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 14,
          }}
        >
          {tournaments.map(t => (
            <TournamentCard
              key={t.id}
              tournament={t}
              onView={() => navigate(`/tournament/${t.id}`)}
              onDeleteClick={() => setDeleteTarget({ id: t.id, name: t.name })}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
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

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Tournament?"
        message={`"${deleteTarget?.name}" will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Tournament"
        cancelText="Cancel"
        isDangerous
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default CommitteeDashboard;
