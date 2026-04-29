import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import matchesApi from '../api/matches';
import { validateSetScore, setIsWon, getMaxScore, getScoringHint } from '../utils/scoringRules';
import tournamentsApi from '../api/tournaments';
import refereeApplicationsApi from '../api/refereeApplications';
import { useAuth } from '../context/AuthContext';
import { Trophy, Clock, CheckCircle, XCircle, Send } from 'lucide-react';
import Toast from '../components/Toast';

function Wasit() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(null);

  // Tournament selection state
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  // Score Modal state
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Tab state
  const [activeTab, setActiveTab] = useState('matches');

  // Applications tab state
  const [allTournaments, setAllTournaments] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [applyTarget, setApplyTarget] = useState(null); // tournament to apply to
  const [applyMessage, setApplyMessage] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [appsSuccessMsg, setAppsSuccessMsg] = useState('');
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => { fetchMatches(); }, []);

  // Fetch all tournaments + my applications when switching to applications tab
  useEffect(() => {
    if (activeTab !== 'applications') return;
    const load = async () => {
      try {
        setAppsLoading(true);
        const [allT, apps] = await Promise.all([
          tournamentsApi.getTournaments(),
          refereeApplicationsApi.myApplications(),
        ]);
        setAllTournaments((allT || []).filter(t => t.status !== 'FINISHED'));
        setMyApplications(apps || []);
      } catch (err) {
        showToast(`Failed to load application data: ${err.message}`, 'error');
      } finally {
        setAppsLoading(false);
      }
    };
    load();
  }, [activeTab]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyTarget) return;
    try {
      setApplySubmitting(true);
      setApplyError('');
      const newApp = await refereeApplicationsApi.apply(applyTarget.id, applyMessage);
      setMyApplications(prev => [newApp, ...prev]);
      setApplyTarget(null);
      setApplyMessage('');
      setAppsSuccessMsg(`Application sent to "${applyTarget.name}"!`);
      setTimeout(() => setAppsSuccessMsg(''), 4000);
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setApplySubmitting(false);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);

      // 1. Fetch all tournaments to find the ONGOING ones
      const tournaments = await tournamentsApi.getTournaments();
      const ongoingTournaments = tournaments.filter(t => t.status === 'ONGOING');
      setTournaments(ongoingTournaments);

      if (ongoingTournaments.length > 0 && !selectedTournamentId) {
        setSelectedTournamentId(ongoingTournaments[0].id);
      }

      // 2. Fetch matches for all ongoing tournaments
      const matchPromises = ongoingTournaments.map(t => matchesApi.getMatches(t.id));
      const matchResults = await Promise.all(matchPromises);

      // Flatten arrays
      let allMatches = [];
      matchResults.forEach((res, index) => {
        // Tag each match with its tournament info for display
        const t = ongoingTournaments[index];
        const taggedMatches = res.map(m => ({ ...m, tournamentName: t.name }));
        allMatches = [...allMatches, ...taggedMatches];
      });

      // 3. Filter for matches that:
      // - Are available (no referee)
      // - OR assigned to current user
      // Exclude FINISHED matches unless they are somehow relevant (usually we want active ones)
      const relevantMatches = allMatches.filter(m =>
        m.status !== 'FINISHED' && (!m.refereeId || m.refereeId === user?.id)
      );

      setMatches(relevantMatches);
    } catch (err) {
      showToast(`Failed to load matches: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePickMatch = async (matchId) => {
    try {
      setPicking(matchId);
      await matchesApi.selfAssignReferee(matchId);
      await fetchMatches(); // Refresh list
    } catch (err) {
      showToast(err.message || 'Error occurred while picking the match.', 'error');
    } finally {
      setPicking(null);
    }
  };

  const openScoreModal = (match) => {
    setSelectedMatch(match);
    setShowScoreModal(true);
  };

  if (loading) {
    return (
      <div className="main-content-wide" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const myMatches = matches.filter(m => m.refereeId === user?.id);
  const availableMatches = matches.filter(m => !m.refereeId);
  const filteredAvailableMatches = availableMatches.filter(m => m.tournamentId === selectedTournamentId);

  // Helper to check if picking a certain match should be disabled
  const ongoingMatch = myMatches.find(m => m.status === 'ONGOING');

  const checkDisablePick = (targetMatch) => {
    if (ongoingMatch) return "You cannot pick up new matches while you have an ONGOING match.";
    if (targetMatch.scheduledAt) {
      const overlapping = myMatches.find(m => m.scheduledAt === targetMatch.scheduledAt && m.status !== 'FINISHED');
      if (overlapping) return "You already have a match scheduled at this exact time.";
    }
    return null;
  };


  const APP_STATUS_CFG = {
    PENDING:  { label: 'Pending',  color: 'var(--status-ongoing-text)',  bg: 'var(--status-ongoing-bg)',  dot: 'var(--status-ongoing-border)'  },
    ACCEPTED: { label: 'Accepted', color: 'var(--status-finished-text)', bg: 'var(--status-finished-bg)', dot: 'var(--status-finished-border)' },
    REJECTED: { label: 'Rejected', color: 'var(--danger-text)',          bg: 'var(--danger-bg)',          dot: 'var(--danger-border)'          },
  };

  const TAB_ITEMS = [
    { key: 'matches',      label: 'Matches' },
    { key: 'applications', label: 'Applications' },
  ];

  return (
    <div className="main-content-wide">

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Referee Portal
        </p>
        <h1 className="page-title">Referee Dashboard</h1>
        <p className="page-subtitle" style={{ marginTop: 6 }}>
          Manage your matches, apply to tournaments, and find new assignments.
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ borderBottom: '1.5px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4 }} role="tablist" aria-label="Referee dashboard sections">
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1.5px',
                cursor: 'pointer', fontSize: 13.5,
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'color 0.15s ease, border-color 0.15s ease',
                whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 7,
              }}
            >
              {tab.label}
              {tab.key === 'applications' && myApplications.filter(a => a.status === 'PENDING').length > 0 && (
                <span style={{
                  padding: '1px 6px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                  background: activeTab === tab.key ? 'rgba(var(--accent-rgb),0.12)' : 'var(--bg-subtle)',
                  color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-faint)',
                }}>
                  {myApplications.filter(a => a.status === 'PENDING').length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MATCHES TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'matches' && (
        <div
          role="tabpanel"
          id="panel-matches"
          aria-labelledby="tab-matches"
        >
          {/* My Active Matches */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>My Active Matches</h2>
              <button className="btn-outline" style={{ fontSize: 12, padding: '6px 12px' }} onClick={fetchMatches}
                aria-label="Refresh matches">
                ↻ Refresh
              </button>
            </div>
            {myMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>You have no assigned matches.</p>
            ) : (
              <MatchTable matches={myMatches} isMyMatch={true} onManageScore={openScoreModal} />
            )}
          </div>

          {/* Available for Pickup */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Available for Pickup</h2>
              {tournaments.length > 0 && (
                <select
                  className="form-select"
                  style={{ padding: '6px 12px', fontSize: 13, minWidth: 200 }}
                  value={selectedTournamentId || ''}
                  onChange={e => setSelectedTournamentId(Number(e.target.value))}
                  aria-label="Filter by tournament"
                >
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            {tournaments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No ongoing tournaments found.</p>
            ) : filteredAvailableMatches.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No matches available for pickup in this tournament.</p>
            ) : (
              <MatchTable
                matches={filteredAvailableMatches}
                onPick={handlePickMatch}
                picking={picking}
                checkDisablePick={checkDisablePick}
              />
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          APPLICATIONS TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'applications' && (
        <div
          role="tabpanel"
          id="panel-applications"
          aria-labelledby="tab-applications"
        >
          {appsSuccessMsg && (
            <div className="alert-success" role="status" aria-live="polite" style={{ marginBottom: 20 }}>
              {appsSuccessMsg}
            </div>
          )}

          {/* ── Browse Tournaments ── */}
          <section aria-labelledby="browse-heading" style={{ marginBottom: 32 }}>
            <h2 id="browse-heading" className="section-title" style={{ marginBottom: 16 }}>
              Browse Tournaments
            </h2>

            {appsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="card" style={{ padding: 16 }} aria-hidden="true">
                    <div className="skeleton" style={{ height: 18, width: '70%', borderRadius: 5, marginBottom: 10 }} />
                    <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 4, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 4, marginBottom: 14 }} />
                    <div className="skeleton" style={{ height: 36, borderRadius: 9 }} />
                  </div>
                ))}
              </div>
            ) : allTournaments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Trophy size={24} aria-hidden="true" /></div>
                <p className="empty-state-title">No open tournaments</p>
                <p className="empty-state-desc">There are no active tournaments to apply to right now.</p>
              </div>
            ) : (
              <div
                className="stagger-in"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}
              >
                {allTournaments.map(t => {
                  const existingApp = myApplications.find(a => a.tournamentId === t.id);
                  const cfg = existingApp ? APP_STATUS_CFG[existingApp.status] : null;
                  return (
                    <article
                      key={t.id}
                      className="card"
                      style={{
                        padding: '16px 18px',
                        display: 'flex', flexDirection: 'column', gap: 10,
                        borderLeft: `3px solid ${existingApp ? cfg.dot : 'var(--border)'}`,
                      }}
                    >
                      {/* Tournament name + status badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <h3 style={{
                          fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700,
                          color: 'var(--text-primary)', margin: 0, flex: 1, lineHeight: 1.25,
                        }}>
                          {t.name}
                        </h3>
                        {existingApp && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                            background: cfg.bg, color: cfg.color,
                            textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot }} aria-hidden="true" />
                            {cfg.label}
                          </span>
                        )}
                      </div>

                      {/* Meta */}
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span>📍 {t.location}</span>
                        <span>📅 {new Date(t.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>

                      {/* Rejection reason */}
                      {existingApp?.status === 'REJECTED' && existingApp.rejectionReason && (
                        <div style={{
                          fontSize: 12, color: 'var(--danger-text)',
                          background: 'var(--danger-bg)',
                          borderRadius: 6, padding: '6px 10px', lineHeight: 1.5,
                        }}>
                          "{existingApp.rejectionReason}"
                        </div>
                      )}

                      {/* Action */}
                      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                        {!existingApp ? (
                          <button
                            className="btn-primary"
                            onClick={() => { setApplyTarget(t); setApplyMessage(''); setApplyError(''); }}
                            style={{ width: '100%', fontSize: 13, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <Send size={13} aria-hidden="true" /> Apply as Referee
                          </button>
                        ) : existingApp.status === 'ACCEPTED' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--status-finished-text)', fontWeight: 600 }}>
                            <CheckCircle size={14} aria-hidden="true" /> You're a referee here
                          </div>
                        ) : existingApp.status === 'PENDING' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--status-ongoing-text)', fontWeight: 600 }}>
                            <Clock size={14} aria-hidden="true" /> Awaiting review
                          </div>
                        ) : (
                          <button
                            className="btn-outline"
                            onClick={() => { setApplyTarget(t); setApplyMessage(''); setApplyError(''); }}
                            style={{ width: '100%', fontSize: 13, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                          >
                            <Send size={13} aria-hidden="true" /> Re-apply
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── My Applications ── */}
          <section aria-labelledby="my-apps-heading">
            <h2 id="my-apps-heading" className="section-title" style={{ marginBottom: 16 }}>My Applications</h2>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {appsLoading ? (
                <div style={{ padding: '0 20px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)' }} aria-hidden="true">
                      <div className="skeleton" style={{ flex: 1, height: 14, borderRadius: 4 }} />
                      <div className="skeleton" style={{ width: 72, height: 22, borderRadius: 6 }} />
                    </div>
                  ))}
                </div>
              ) : myApplications.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <Clock size={28} style={{ color: 'var(--text-faint)', marginBottom: 10 }} aria-hidden="true" />
                  <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>
                    You haven't applied to any tournaments yet.
                  </p>
                </div>
              ) : (
                myApplications.map((app, idx) => {
                  const cfg = APP_STATUS_CFG[app.status] || APP_STATUS_CFG.PENDING;
                  return (
                    <div
                      key={app.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '14px 20px',
                        borderBottom: idx < myApplications.length - 1 ? '1px solid var(--border)' : 'none',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Tournament info */}
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                          {app.tournament?.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                          {app.tournament?.location}
                          &nbsp;·&nbsp;
                          Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : '—'}
                        </div>
                        {app.message && (
                          <div style={{
                            fontSize: 12, color: 'var(--text-secondary)', marginTop: 5,
                            borderLeft: '2px solid var(--border-strong)',
                            paddingLeft: 8, lineHeight: 1.5, fontStyle: 'italic',
                          }}>
                            "{app.message}"
                          </div>
                        )}
                        {app.status === 'REJECTED' && app.rejectionReason && (
                          <div style={{
                            fontSize: 12, color: 'var(--danger-text)', marginTop: 5,
                            background: 'var(--danger-bg)', borderRadius: 5, padding: '4px 8px',
                          }}>
                            Reason: {app.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, alignSelf: 'center' }}>
                        {app.status === 'ACCEPTED' && <CheckCircle size={14} style={{ color: 'var(--status-finished-text)' }} aria-hidden="true" />}
                        {app.status === 'REJECTED' && <XCircle size={14} style={{ color: 'var(--danger-text)' }} aria-hidden="true" />}
                        {app.status === 'PENDING' && <Clock size={14} style={{ color: 'var(--status-ongoing-text)' }} aria-hidden="true" />}
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                          background: cfg.bg, color: cfg.color,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── Apply modal ── */}
      {applyTarget && createPortal(
        <>
          <div
            onClick={() => setApplyTarget(null)}
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
            aria-labelledby="apply-modal-title"
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              borderRadius: 18, padding: '24px', maxWidth: 440, width: '92%',
              zIndex: 1000, boxShadow: 'var(--shadow-modal)',
              animation: 'slideUp 0.18s ease',
            }}
          >
            <h2 id="apply-modal-title" style={{
              fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700,
              color: 'var(--text-primary)', margin: '0 0 4px',
            }}>
              Apply as Referee
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '0 0 20px' }}>
              Applying to <strong style={{ color: 'var(--text-primary)' }}>{applyTarget.name}</strong>
            </p>

            {applyError && <div className="alert-error" role="alert" style={{ marginBottom: 14 }}>{applyError}</div>}

            <form onSubmit={handleApplySubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="apply-msg">
                  Message to committee{' '}
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  id="apply-msg"
                  className="form-input"
                  rows="3"
                  placeholder="e.g. I have 3 years of experience officiating regional tournaments."
                  value={applyMessage}
                  onChange={e => setApplyMessage(e.target.value)}
                  disabled={applySubmitting}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={applySubmitting}
                  style={{ flex: 1, padding: '10px', fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Send size={14} aria-hidden="true" />
                  {applySubmitting ? 'Sending…' : 'Send Application'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setApplyTarget(null)}
                  disabled={applySubmitting}
                  style={{ padding: '10px 20px', fontSize: 14 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>,
        document.body
      )}

      {/* ── Score modal ── */}
      {showScoreModal && selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          onClose={() => { setShowScoreModal(false); setSelectedMatch(null); }}
          onSuccess={async (warning) => {
            setShowScoreModal(false);
            setSelectedMatch(null);
            await fetchMatches();
            if (warning) showToast(warning, 'info');
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Match Table Component ──────────────────────────────────────────────────
function MatchTable({ matches, isMyMatch, onPick, picking, checkDisablePick, onManageScore }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--text-faint)", borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: "12px 8px" }}>Match</th>
            <th style={{ padding: "12px 8px" }}>Schedule & Court</th>
            <th style={{ padding: "12px 8px" }}>Status</th>
            <th style={{ padding: "12px 8px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const isOngoing = m.status === 'ONGOING';
            const isScheduled = m.status === 'SCHEDULED';

            return (
              <tr key={m.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                {/* Match Matchup */}
                <td style={{ padding: "12px 8px" }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {m.homeTeam?.name || 'TBD'}
                    <span style={{ color: 'var(--text-faint)', margin: '0 8px', fontWeight: 400 }}>vs</span>
                    {m.awayTeam?.name || 'TBD'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {isMyMatch && <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>{m.tournamentName} •</span>}
                    {m.category && <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>{m.category.name} •</span>}
                    {m.stage === 'GROUP' ? `Group ${m.groupCode || '-'}` : `${m.stage}`}
                    {' • '}R{m.round}
                  </div>
                </td>

                {/* Schedule & Court */}
                <td style={{ padding: "12px 8px", color: 'var(--text-secondary)' }}>
                  <div>{m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                    {m.court?.name ? m.court.name : m.courtId ? `Court ${m.courtId}` : 'Court TBD'}
                  </span>
                </td>

                {/* Status Badge */}
                <td style={{ padding: "12px 8px" }}>
                  <span className={`badge ${isOngoing ? 'badge-ongoing' :
                    isScheduled ? 'badge-scheduled' : 'badge-finished'
                    }`}>
                    {m.status}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: "12px 8px" }}>
                  {isMyMatch ? (
                    <button
                      className="btn-primary"
                      style={{ padding: "6px 14px", fontSize: 12 }}
                      onClick={() => onManageScore(m)}
                    >
                      {isScheduled ? 'Start & Score' : 'Manage Score'}
                    </button>
                  ) : (() => {
                    const disableReason = checkDisablePick ? checkDisablePick(m) : null;
                    const isDisabled = !!disableReason || picking === m.id;
                    return (
                      <button
                        className={disableReason ? "btn-outline" : "btn-primary"}
                        style={{
                          padding: "6px 14px",
                          fontSize: 12,
                          opacity: isDisabled ? 0.5 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer'
                        }}
                        onClick={() => onPick(m.id)}
                        disabled={isDisabled}
                        title={disableReason || ""}
                      >
                        {picking === m.id ? 'Assigning...' : disableReason ? 'Locked' : 'Pick Match'}
                      </button>
                    );
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Score Modal Component ──────────────────────────────────────────────────
function ScoreModal({ match, onClose, onSuccess }) {
  const [sets, setSets] = useState(() => {
    // Initialize with existing sets from match, or default to 2 empty sets
    if (match.sets && match.sets.length > 0) {
      return match.sets.map(s => ({ homeScore: s.homeScore, awayScore: s.awayScore }));
    }
    return [
      { homeScore: 0, awayScore: 0 },
      { homeScore: 0, awayScore: 0 }
    ];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Retire/Walkover state
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);
  const [retireTeamId, setRetireTeamId] = useState(null);
  const [retireReason, setRetireReason] = useState('RETIRE');

  const handleScoreChange = (index, field, value) => {
    const newSets = [...sets];
    newSets[index][field] = parseInt(value) || 0;
    setSets(newSets);
  };

  const addSet = () => {
    if (sets.length < 3) {
      setSets([...sets, { homeScore: 0, awayScore: 0 }]);
    }
  };

  const removeSet = () => {
    if (sets.length > 1) {
      setSets(sets.slice(0, -1));
    }
  };

  const pointSystem = match.pointSystem || 'RALLY_21';
  const isWomensSingles = match.category?.gender === 'FEMALE' && match.category?.categoryType === 'SINGLE';
  const maxScoreInput = getMaxScore(pointSystem, isWomensSingles);

  const getGamesWon = () => {
    let hw = 0, aw = 0;
    sets.forEach(s => {
      const h = parseInt(s.homeScore) || 0;
      const a = parseInt(s.awayScore) || 0;
      if (setIsWon(h, a, pointSystem, isWomensSingles)) {
        if (h > a) hw++; else aw++;
      }
    });
    return { hw, aw };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    for (const s of sets) {
      const h = parseInt(s.homeScore) || 0;
      const a = parseInt(s.awayScore) || 0;
      const err = validateSetScore(h, a, pointSystem, isWomensSingles);
      if (err) { setError(err); setSaving(false); return; }
    }

    try {
      // If match is SCHEDULED, start it to make it ONGOING
      if (match.status === 'SCHEDULED') {
        await matchesApi.startMatch(match.id);
      }

      // Submit the scores
      const result = await matchesApi.updateScore(match.id, sets);
      onSuccess(result.warning);
    } catch (err) {
      setError(err.message || 'Failed to submit score. Please check your connection.');
      setSaving(false);
    }
  };

  const handleRetire = async () => {
    if (!retireTeamId) return;
    setSaving(true);
    setError('');
    try {
      const result = await matchesApi.retireMatch(match.id, retireTeamId, retireReason);
      onSuccess(result.warning);
    } catch (err) {
      setError(err.message || 'Failed to process retire/walkover.');
      setSaving(false);
    }
  };

  const { hw, aw } = getGamesWon();
  const matchDecided = hw >= 2 || aw >= 2;

  const homeName = match.homeTeam?.name || match.homeTeam?.user?.name || match.homeTeam?.offlineName || 'Home';
  const awayName = match.awayTeam?.name || match.awayTeam?.user?.name || match.awayTeam?.offlineName || 'Away';

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 24, margin: '0 16px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Input Match Score</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {error && <div className="alert-error" style={{ padding: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, textAlign: 'center', flex: 1 }}>{homeName} (Home)</div>
          <div style={{ fontWeight: 600, color: 'var(--text-faint)', padding: '0 16px' }}>VS</div>
          <div style={{ fontWeight: 600, textAlign: 'center', flex: 1 }}>{awayName} (Away)</div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', marginBottom: 16 }}>
          {getScoringHint(pointSystem, isWomensSingles)}
        </p>

        <form onSubmit={handleSubmit}>
          {sets.map((setObj, idx) => (
            <div key={idx} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Set {idx + 1}</p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <input
                  type="number" min="0" max={maxScoreInput} className="form-input" style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: '12px', boxSizing: 'border-box' }}
                  value={setObj.homeScore} onChange={e => handleScoreChange(idx, 'homeScore', e.target.value)}
                  required disabled={saving}
                />
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>-</span>
                <input
                  type="number" min="0" max={maxScoreInput} className="form-input" style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: '12px', boxSizing: 'border-box' }}
                  value={setObj.awayScore} onChange={e => handleScoreChange(idx, 'awayScore', e.target.value)}
                  required disabled={saving}
                />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 24 }}>
            {sets.length < 3 && !matchDecided ? (
              <button type="button" onClick={addSet} className="btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}>
                + Add Rubber Set
              </button>
            ) : <div />}
            {sets.length > 1 ? (
              <button type="button" onClick={removeSet} className="btn-outline" style={{ fontSize: 12, padding: '4px 10px', borderColor: 'var(--danger-border)', color: 'var(--danger-text)' }}>
                - Remove Last Set
              </button>
            ) : <div />}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Submit Score'}
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 12, textAlign: 'center' }}>
            {match.status === 'SCHEDULED' ? 'Submitting will start the match and update its status to ONGOING.' : 'If either side wins 2 sets, the match will automatically be marked as FINISHED.'}
          </p>
        </form>

        {/* ── Retire / Walk Out Section ───────────────────────── */}
        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
        }}>
          {!showRetireConfirm ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setRetireTeamId(match.homeTeamId); setRetireReason('RETIRE'); setShowRetireConfirm(true); }}
                disabled={saving}
                style={{
                  flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8,
                  transition: 'all 0.15s',
                }}
                title={`${homeName} Retire/Walk Out`}
              >
                🏳️ {homeName} Retire
              </button>
              <button
                type="button"
                onClick={() => { setRetireTeamId(match.awayTeamId); setRetireReason('RETIRE'); setShowRetireConfirm(true); }}
                disabled={saving}
                style={{
                  flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8,
                  transition: 'all 0.15s',
                }}
                title={`${awayName} Retire/Walk Out`}
              >
                🏳️ {awayName} Retire
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 10, padding: 16,
            }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 12 }}>
                ⚠️ Confirm: {retireTeamId === match.homeTeamId ? homeName : awayName}
              </p>

              {/* Reason selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setRetireReason('RETIRE')}
                  style={{
                    flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    borderRadius: 8, transition: 'all 0.15s',
                    background: retireReason === 'RETIRE' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-subtle)',
                    border: retireReason === 'RETIRE' ? '1.5px solid #ef4444' : '1px solid var(--border)',
                    color: retireReason === 'RETIRE' ? '#ef4444' : 'var(--text-secondary)',
                  }}
                >
                  🤕 Retire<br/>
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>Injury / Unable to continue</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRetireReason('WALKOVER')}
                  style={{
                    flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    borderRadius: 8, transition: 'all 0.15s',
                    background: retireReason === 'WALKOVER' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-subtle)',
                    border: retireReason === 'WALKOVER' ? '1.5px solid #ef4444' : '1px solid var(--border)',
                    color: retireReason === 'WALKOVER' ? '#ef4444' : 'var(--text-secondary)',
                  }}
                >
                  🚫 Walk Out<br/>
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>No-show / Withdrawal</span>
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                <strong>{retireTeamId === match.homeTeamId ? awayName : homeName}</strong> will automatically win this match.
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleRetire}
                  disabled={saving}
                  style={{
                    flex: 1, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    background: '#ef4444', color: 'white', border: 'none',
                    borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? 'Processing...' : `Confirm ${retireReason === 'RETIRE' ? 'Retire' : 'Walk Out'}`}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => { setShowRetireConfirm(false); setRetireTeamId(null); }}
                  disabled={saving}
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Wasit;