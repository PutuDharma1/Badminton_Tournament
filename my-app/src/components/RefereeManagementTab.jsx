import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UserCheck, UserPlus, Clock, CheckCircle, XCircle, Search, Trash2, Users } from 'lucide-react';
import refereeApplicationsApi from '../api/refereeApplications';
import authApi from '../api/auth';

// ─── Status badge config — uses CSS variables for theme-awareness ─────────────
const APP_STATUS = {
  PENDING:  { label: 'Pending',  color: 'var(--status-ongoing-text)',   bg: 'var(--status-ongoing-bg)',   dot: 'var(--status-ongoing-border)'   },
  ACCEPTED: { label: 'Accepted', color: 'var(--status-finished-text)',  bg: 'var(--status-finished-bg)',  dot: 'var(--status-finished-border)'  },
  REJECTED: { label: 'Rejected', color: 'var(--danger-text)',           bg: 'var(--danger-bg)',           dot: 'var(--danger-border)'           },
};

function StatusBadge({ status }) {
  const cfg = APP_STATUS[status] || APP_STATUS.PENDING;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, fontWeight: 700,
      padding: '3px 9px', borderRadius: 6,
      background: cfg.bg, color: cfg.color,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }} aria-hidden="true">
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ height: 13, width: '40%', borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 11, width: '60%', borderRadius: 4 }} />
      </div>
      <div className="skeleton" style={{ height: 24, width: 72, borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 8 }} />
    </div>
  );
}

// ─── Rejection reason modal ───────────────────────────────────────────────────
function RejectModal({ applicant, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onConfirm(reason.trim());
    setLoading(false);
  };

  return createPortal(
    <>
      <div
        onClick={onCancel}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          zIndex: 999, animation: 'fadeIn 0.15s ease',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'var(--bg-card)', border: '1.5px solid var(--border)',
          borderRadius: 16, padding: '24px', maxWidth: 420, width: '92%',
          zIndex: 1000, boxShadow: 'var(--shadow-modal)',
          animation: 'slideUp 0.18s ease',
        }}
      >
        <h3 id="reject-modal-title" style={{
          fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700,
          color: 'var(--text-primary)', margin: '0 0 6px',
        }}>
          Reject Application
        </h3>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 20px' }}>
          Rejecting <strong style={{ color: 'var(--text-primary)' }}>{applicant?.referee?.name}</strong>'s application. Optionally provide a reason.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reject-reason">
              Reason <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="reject-reason"
              className="form-input"
              rows="3"
              placeholder="e.g. Positions already filled for this tournament."
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ resize: 'vertical' }}
              disabled={loading}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn-outline" onClick={onCancel} disabled={loading} style={{ padding: '9px 18px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-danger" disabled={loading} style={{ padding: '9px 18px' }}>
              {loading ? 'Rejecting…' : 'Reject Application'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}

// ─── Direct-add referee modal ─────────────────────────────────────────────────
function AddRefereeModal({ tournamentId, onSuccess, onClose }) {
  const [referees, setReferees] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi.getPlayers()
      .then(data => setReferees((data || []).filter(u => u.role === 'REFEREE')))
      .catch(() => setError('Failed to load referees.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = referees.filter(r =>
    r.name?.toLowerCase().includes(query.toLowerCase()) ||
    r.email?.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = async (referee) => {
    try {
      setAdding(referee.id);
      setError('');
      const result = await refereeApplicationsApi.directAdd(tournamentId, referee.id);
      onSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(null);
    }
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          zIndex: 999, animation: 'fadeIn 0.15s ease',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-ref-modal-title"
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'var(--bg-card)', border: '1.5px solid var(--border)',
          borderRadius: 16, padding: '24px',
          maxWidth: 480, width: '92%', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          zIndex: 1000, boxShadow: 'var(--shadow-modal)',
          animation: 'slideUp 0.18s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 id="add-ref-modal-title" style={{
            fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700,
            color: 'var(--text-primary)', margin: 0,
          }}>
            Add Referee Directly
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 44, height: 44, borderRadius: 8,
              border: '1.5px solid var(--border)', background: 'var(--bg-subtle)',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Select a referee to add immediately without requiring them to apply.
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-faint)', pointerEvents: 'none',
          }} aria-hidden="true" />
          <input
            type="search"
            className="form-input"
            placeholder="Search by name or email…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 32 }}
            autoFocus
            aria-label="Search referees"
          />
        </div>

        {error && <div className="alert-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Referee list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }} aria-hidden="true">
                <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 13, width: '50%', borderRadius: 4, marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 11, width: '70%', borderRadius: 4 }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              {query ? 'No referees match your search.' : 'No referees registered yet.'}
            </p>
          ) : (
            filtered.map(referee => (
              <div
                key={referee.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: '#f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff',
                }}>
                  {referee.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'R'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {referee.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {referee.email}
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={() => handleAdd(referee)}
                  disabled={adding === referee.id}
                  aria-label={`Add ${referee.name} as referee`}
                  style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }}
                >
                  {adding === referee.id ? 'Adding…' : 'Add'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function RefereeManagementTab({ tournamentId, isFinished }) {
  const [allApplications, setAllApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await refereeApplicationsApi.getTournamentApplications(tournamentId);
      setAllApplications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleAccept = async (appId, refName) => {
    try {
      setActionLoading(appId);
      const updated = await refereeApplicationsApi.review(appId, 'ACCEPTED');
      setAllApplications(prev => prev.map(a => a.id === appId ? updated : a));
      flash(`${refName} accepted as a referee.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    try {
      setActionLoading(rejectTarget.id);
      const updated = await refereeApplicationsApi.review(rejectTarget.id, 'REJECTED', reason);
      setAllApplications(prev => prev.map(a => a.id === rejectTarget.id ? updated : a));
      flash(`Application from ${rejectTarget.referee?.name} rejected.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
    }
  };

  const handleRemove = async (app) => {
    try {
      setActionLoading(app.id);
      await refereeApplicationsApi.removeReferee(tournamentId, app.refereeId);
      setAllApplications(prev => prev.filter(a => a.id !== app.id));
      flash(`${app.referee?.name} removed from tournament.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDirectAddSuccess = (newApp) => {
    setAllApplications(prev => {
      const exists = prev.find(a => a.id === newApp.id);
      if (exists) return prev.map(a => a.id === newApp.id ? newApp : a);
      return [newApp, ...prev];
    });
    setShowAddModal(false);
    flash(`${newApp.referee?.name} added as a referee.`);
  };

  const pending  = allApplications.filter(a => a.status === 'PENDING');
  const accepted = allApplications.filter(a => a.status === 'ACCEPTED');
  const rejected = allApplications.filter(a => a.status === 'REJECTED');

  return (
    <div>
      {/* Success flash */}
      {successMsg && (
        <div className="alert-success" role="status" aria-live="polite" style={{ marginBottom: 20 }}>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* ── Section: Pending Applications ── */}
      <section aria-labelledby="pending-heading" style={{ marginBottom: 32 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 id="pending-heading" className="section-title">Pending Applications</h2>
            {pending.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                background: 'var(--status-ongoing-bg)', color: 'var(--status-ongoing-text)',
              }}>
                {pending.length}
              </span>
            )}
          </div>
          {!isFinished && (
            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
              style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <UserPlus size={14} aria-hidden="true" /> Add Referee Directly
            </button>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '0 20px' }}>
              {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : pending.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Clock size={28} style={{ color: 'var(--text-faint)', marginBottom: 10 }} aria-hidden="true" />
              <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>No pending applications.</p>
            </div>
          ) : (
            <div>
              {pending.map((app, idx) => (
                <div
                  key={app.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '16px 20px',
                    borderBottom: idx < pending.length - 1 ? '1px solid var(--border)' : 'none',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff',
                  }} aria-hidden="true">
                    {app.referee?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'R'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {app.referee?.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: app.message ? 8 : 0 }}>
                      {app.referee?.email} &nbsp;·&nbsp; Applied {timeAgo(app.appliedAt)}
                    </div>
                    {app.message && (
                      <div style={{
                        fontSize: 12.5, color: 'var(--text-secondary)',
                        background: 'var(--bg-subtle)',
                        borderLeft: '3px solid var(--border-strong)',
                        padding: '6px 10px', borderRadius: '0 6px 6px 0',
                        lineHeight: 1.5, marginTop: 6,
                      }}>
                        "{app.message}"
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignSelf: 'center', flexShrink: 0 }}>
                    <button
                      className="btn-primary"
                      onClick={() => handleAccept(app.id, app.referee?.name)}
                      disabled={actionLoading === app.id}
                      aria-label={`Accept ${app.referee?.name}'s application`}
                      style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <CheckCircle size={13} aria-hidden="true" />
                      {actionLoading === app.id ? 'Saving…' : 'Accept'}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => setRejectTarget(app)}
                      disabled={actionLoading === app.id}
                      aria-label={`Reject ${app.referee?.name}'s application`}
                      style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <XCircle size={13} aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Section: Accepted Referees ── */}
      <section aria-labelledby="accepted-heading" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 id="accepted-heading" className="section-title">Accepted Referees</h2>
          {accepted.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
              background: 'var(--status-finished-bg)', color: 'var(--status-finished-text)',
            }}>
              {accepted.length}
            </span>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '0 20px' }}>
              {[0, 1].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : accepted.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Users size={28} style={{ color: 'var(--text-faint)', marginBottom: 10 }} aria-hidden="true" />
              <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: '0 0 12px' }}>
                No referees accepted yet.
              </p>
              {!isFinished && (
                <button
                  className="btn-outline"
                  onClick={() => setShowAddModal(true)}
                  style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <UserPlus size={14} aria-hidden="true" /> Add Referee Directly
                </button>
              )}
            </div>
          ) : (
            <div>
              {accepted.map((app, idx) => (
                <div
                  key={app.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    borderBottom: idx < accepted.length - 1 ? '1px solid var(--border)' : 'none',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Sora', sans-serif", fontSize: 13, fontWeight: 700, color: '#fff',
                  }} aria-hidden="true">
                    {app.referee?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'R'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {app.referee?.name}
                      <UserCheck size={13} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                      {app.referee?.email}
                      {app.appliedAt && (
                        <span> &nbsp;·&nbsp; {app.reviewedAt ? `Added ${timeAgo(app.reviewedAt)}` : `Applied ${timeAgo(app.appliedAt)}`}</span>
                      )}
                    </div>
                  </div>

                  <StatusBadge status="ACCEPTED" />

                  {!isFinished && (
                    <button
                      className="btn-outline"
                      onClick={() => handleRemove(app)}
                      disabled={actionLoading === app.id}
                      aria-label={`Remove ${app.referee?.name} from tournament`}
                      style={{ fontSize: 12, padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      {actionLoading === app.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Section: Rejected Applications (collapsible summary) ── */}
      {rejected.length > 0 && (
        <section aria-labelledby="rejected-heading">
          <details>
            <summary
              id="rejected-heading"
              style={{
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: 'var(--text-muted)', marginBottom: 12,
                userSelect: 'none', listStyle: 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              Rejected Applications ({rejected.length})
            </summary>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 4 }}>
              {rejected.map((app, idx) => (
                <div
                  key={app.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '12px 20px',
                    borderBottom: idx < rejected.length - 1 ? '1px solid var(--border)' : 'none',
                    opacity: 0.7,
                  }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                  }} aria-hidden="true">
                    {app.referee?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'R'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {app.referee?.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
                      {app.referee?.email}
                    </div>
                    {app.rejectionReason && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                        "{app.rejectionReason}"
                      </div>
                    )}
                  </div>
                  <StatusBadge status="REJECTED" />
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          applicant={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* Direct-add modal */}
      {showAddModal && (
        <AddRefereeModal
          tournamentId={tournamentId}
          onSuccess={handleDirectAddSuccess}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

export default RefereeManagementTab;
