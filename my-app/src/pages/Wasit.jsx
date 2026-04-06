import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import matchesApi from '../api/matches';
import tournamentsApi from '../api/tournaments';
import { useAuth } from '../context/AuthContext';

function Wasit() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(null);

  // Tournament selection state
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  // Score Modal state
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError('');

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
      setError('Failed to load matches');
      console.error(err);
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
      alert(err.message || 'Error occurred while picking the match.');
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

  return (
    <div className="main-content-wide">
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Referee Portal
        </p>
        <h1 className="page-title">Referee Dashboard</h1>
        <p className="page-subtitle" style={{ marginTop: 6 }}>
          Manage your matches, input scores, and find new assignments.
        </p>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* My Matches Section */}
      <div className="card mt-16" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>My Active Matches</h3>
          <button className="btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={fetchMatches}>
            ↻ Refresh
          </button>
        </div>
        {myMatches.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>You have no assigned matches.</p>
        ) : (
          <MatchTable
            matches={myMatches}
            isMyMatch={true}
            onManageScore={openScoreModal}
          />
        )}
      </div>

      {/* Available Matches Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Available for Pickup</h3>

          {/* Tournament Selector */}
          {tournaments.length > 0 && (
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: 13, minWidth: 200 }}
              value={selectedTournamentId || ''}
              onChange={(e) => setSelectedTournamentId(Number(e.target.value))}
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
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No matches currently available for pickup in this tournament.</p>
        ) : (
          <MatchTable
            matches={filteredAvailableMatches}
            onPick={handlePickMatch}
            picking={picking}
            // Function to check if a specific match pick should be disabled
            checkDisablePick={checkDisablePick}
          />
        )}
      </div>

      {showScoreModal && selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          onClose={() => {
            setShowScoreModal(false);
            setSelectedMatch(null);
          }}
          onSuccess={async () => {
            setShowScoreModal(false);
            setSelectedMatch(null);
            await fetchMatches();
          }}
        />
      )}
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

  const getGamesWon = () => {
    let hw = 0, aw = 0;
    sets.forEach(s => {
      const h = parseInt(s.homeScore) || 0;
      const a = parseInt(s.awayScore) || 0;
      const mx = Math.max(h, a);
      const mn = Math.min(h, a);
      // Valid won set
      if (mx >= 21) {
        if (mx === 30 && mn <= 29) {
          if (h > a) hw++; else aw++;
        } else if (mx > 21 && mx - mn === 2) {
          if (h > a) hw++; else aw++;
        } else if (mx === 21 && mn <= 19) {
          if (h > a) hw++; else aw++;
        }
      }
    });
    return { hw, aw };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Strict validation
    for (const s of sets) {
      const h = parseInt(s.homeScore) || 0;
      const a = parseInt(s.awayScore) || 0;
      const mx = Math.max(h, a);
      const mn = Math.min(h, a);

      if (mx > 30) {
        setError(`Score ${h}-${a} is invalid: max points is 30.`);
        setSaving(false); return;
      }
      if (mx >= 21) {
        if (mx === 30 && mn < 28) {
          setError(`Score ${h}-${a} is invalid: set should have ended earlier.`);
          setSaving(false); return;
        } else if (mx > 21 && mx < 30 && mx - mn !== 2) {
          setError(`Score ${h}-${a} is invalid: must win by exactly 2 points past 20.`);
          setSaving(false); return;
        } else if (mx === 21 && mn >= 20) {
          setError(`Score ${h}-${a} is invalid: must win by 2 points (deuce).`);
          setSaving(false); return;
        }
      }
    }

    try {
      // If match is SCHEDULED, start it to make it ONGOING
      if (match.status === 'SCHEDULED') {
        await matchesApi.startMatch(match.id);
      }

      // Submit the scores
      await matchesApi.updateScore(match.id, sets);
      onSuccess();
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
      await matchesApi.retireMatch(match.id, retireTeamId, retireReason);
      onSuccess();
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

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, textAlign: 'center', flex: 1 }}>{homeName} (Home)</div>
          <div style={{ fontWeight: 600, color: 'var(--text-faint)', padding: '0 16px' }}>VS</div>
          <div style={{ fontWeight: 600, textAlign: 'center', flex: 1 }}>{awayName} (Away)</div>
        </div>

        <form onSubmit={handleSubmit}>
          {sets.map((setObj, idx) => (
            <div key={idx} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Set {idx + 1}</p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <input
                  type="number" min="0" className="form-input" style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: '12px', boxSizing: 'border-box' }}
                  value={setObj.homeScore} onChange={e => handleScoreChange(idx, 'homeScore', e.target.value)}
                  required disabled={saving}
                />
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>-</span>
                <input
                  type="number" min="0" className="form-input" style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontSize: 20, fontWeight: 700, padding: '12px', boxSizing: 'border-box' }}
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
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>Cedera / Tidak bisa lanjut</span>
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
                  <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>Tidak hadir / Mengundurkan diri</span>
                </button>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                <strong>{retireTeamId === match.homeTeamId ? awayName : homeName}</strong> akan otomatis memenangkan match ini.
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
                  Batal
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