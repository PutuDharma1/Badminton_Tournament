import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import matchesApi from '../api/matches';
import participantsApi from '../api/participants';
import authApi from '../api/auth';
import { categoriesApi } from '../api/categories';
import apiClient from '../api/client';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';
import RefereeManagementTab from '../components/RefereeManagementTab';

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  SCHEDULED: { bg: 'rgba(59,130,246,0.1)', border: '#60a5fa', text: '#3b82f6' },
  ONGOING: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', text: '#d97706' },
  FINISHED: { bg: 'rgba(34,197,94,0.08)', border: '#22c55e', text: '#15803d' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.SCHEDULED;
  return (
    <span style={{
      fontSize: 11, padding: '3px 8px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function TournamentManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDay, setSelectedDay] = useState(1);
  const [leaderboard, setLeaderboard] = useState({});
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupCategories, setGroupCategories] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [knockoutMatches, setKnockoutMatches] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Fetch tournament metadata
  const fetchTournament = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tournamentsApi.getTournamentById(id);
      setTournament(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch participants separately
  const fetchParticipants = useCallback(async () => {
    try {
      const data = await participantsApi.getParticipants(id);
      setParticipants(data);
    } catch (err) {
      console.error('Failed to fetch participants:', err.message);
    }
  }, [id]);

  // Fetch all GROUP stage matches (we paginate by day on the client)
  const fetchMatches = useCallback(async () => {
    try {
      setMatchesLoading(true);
      const data = await matchesApi.getMatches(id, null, 'GROUP');
      setMatches(data);
    } catch (err) {
      console.error('Failed to fetch matches:', err.message);
    } finally {
      setMatchesLoading(false);
    }
  }, [id]);

  // Fetch knockout matches
  const fetchKnockoutMatches = useCallback(async () => {
    try {
      const data = await matchesApi.getMatches(id, null, 'KNOCKOUT');
      setKnockoutMatches(data);
    } catch (err) {
      console.error('Failed to fetch knockout matches:', err.message);
    }
  }, [id]);

  // Fetch group assignments
  const fetchGroups = useCallback(async () => {
    try {
      setGroupsLoading(true);
      const data = await tournamentsApi.getGroups(id);
      setGroups(data.groups || []);
      setGroupCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err.message);
    } finally {
      setGroupsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTournament();
    fetchParticipants();
  }, [fetchTournament, fetchParticipants]);

  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'matches') fetchMatches();
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'groups') fetchGroups();
    if (activeTab === 'bracket') fetchKnockoutMatches();
  }, [activeTab, fetchMatches, fetchKnockoutMatches, fetchGroups]);

  // Fetch leaderboard standings
  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const data = await tournamentsApi.getLeaderboard(id);
      setLeaderboard(data);
    } catch (err) {
      console.error('Leaderboard error:', err.message);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const handleStartRoundRobin = async () => {
    const count = participants.length;
    if (count < 4) {
      showToast(`Round-robin requires at least 4 players. You have ${count}.`, 'error');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Start Round-Robin',
      message: `Start grouped round-robin with ${count} players? Players will be divided into groups of ~4. This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const result = await tournamentsApi.startRoundRobin(tournament.id);
          showToast(`${result.matchCount ?? 'All'} matches generated in ${result.groups?.length || '?'} groups!`, 'success');
          await fetchTournament();
          await fetchMatches();
          setActiveTab('groups');
        } catch (err) {
          showToast(err.message, 'error');
        }
      },
    });
  };

  const handleGenerateKnockout = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Generate Knockout Bracket',
      message: 'All group matches are complete. Generate the knockout bracket? Top 2 from each group will advance.',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const result = await tournamentsApi.generateKnockout(tournament.id);
          showToast(`Bracket generated with ${result.matchCount} match(es)!`, 'success');
          await fetchTournament();
          await fetchKnockoutMatches();
          setActiveTab('bracket');
        } catch (err) {
          showToast(err.message, 'error');
        }
      },
    });
  };

  const handleUpdateTournament = async (updates) => {
    try {
      const updated = await tournamentsApi.updateTournament(tournament.id, updates);
      setTournament(updated);
      setShowEditModal(false);
      showToast('Tournament updated!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="main-content">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#f87171', marginBottom: 16 }}>{error || 'Tournament not found'}</p>
          <button className="btn-primary" onClick={() => navigate('/committee')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const isCommittee = hasRole('COMMITTEE');
  const participantCount = participants.length;
  const matchCount = tournament.matchCount || 0;
  const canStartRoundRobin = tournament.status === 'DRAFT' && participantCount >= 4;
  const isOngoing = tournament.status === 'ONGOING';
  const isFinished = tournament.status === 'FINISHED';
  const currentStage = tournament.currentStage || 'GROUP';

  // Group matches by day (date string)
  const matchesByDay = {};
  matches.forEach(m => {
    if (!m.scheduledAt) return;
    const d = new Date(m.scheduledAt);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!matchesByDay[day]) matchesByDay[day] = [];
    matchesByDay[day].push(m);
  });
  const dayKeys = Object.keys(matchesByDay).sort();
  const totalDays = dayKeys.length;
  const clampedDay = Math.min(selectedDay, Math.max(1, totalDays));
  const currentDayMatches = matchesByDay[dayKeys[clampedDay - 1]] || [];

  // Check if all group matches are finished (for knockout generation)
  const allGroupFinished = matches.length > 0 && matches.every(m => m.status === 'FINISHED');

  // Build tab list dynamically
  const tabs = ['overview', 'participants'];
  if (isOngoing || isFinished) {
    tabs.push('groups', 'matches', 'leaderboard');
  }
  tabs.push('bracket');
  if (isCommittee) tabs.push('referees');

  // Find champion if tournament is finished
  let championTeamName = null;
  if (isFinished && knockoutMatches.length > 0) {
    const finalMatch = knockoutMatches.find(m => m.groupCode === 'F');
    if (finalMatch && finalMatch.winnerTeamId) {
      championTeamName = finalMatch.winnerTeamId === finalMatch.homeTeamId
        ? finalMatch.homeTeam?.name
        : finalMatch.awayTeam?.name;
    }
  }

  return (
    <div className="main-content">
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/committee')}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, marginBottom: 10, padding: 0,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            letterSpacing: '0.02em',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">{tournament.name}</h1>
            <p className="page-subtitle">
              {tournament.location} &nbsp;&middot;&nbsp; {new Date(tournament.startDate).toLocaleDateString()}
            </p>
          </div>

          {isCommittee && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!isFinished && (
                <button className="btn-outline" onClick={() => setShowEditModal(true)}>Edit</button>
              )}
              {canStartRoundRobin && (
                <button className="btn-primary" onClick={handleStartRoundRobin}>
                  🚀 Start Round-Robin
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div style={{
        padding: '12px 16px', borderRadius: 12, marginBottom: 24,
        background: isOngoing ? 'rgba(194,65,12,0.07)' : isFinished ? 'rgba(21,128,61,0.07)' : 'rgba(59,130,246,0.07)',
        border: isOngoing ? '1.5px solid rgba(249,115,22,0.3)' : isFinished ? '1.5px solid rgba(34,197,94,0.3)' : '1.5px solid rgba(96,165,250,0.3)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <StatusBadge status={tournament.status} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {tournament.status === 'DRAFT' && `${participantCount} participant${participantCount !== 1 ? 's' : ''} registered`}
          {tournament.status === 'ONGOING' && `${matchCount} matches scheduled`}
          {tournament.status === 'FINISHED' && (
            <span>
              Tournament completed
              {championTeamName && <span style={{ color: '#fbbf24', marginLeft: 8, fontWeight: 700 }}>👑 Champion: {championTeamName}</span>}
            </span>
          )}
        </span>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-header"><span className="stat-label">Participants</span></div>
          <div className="stat-value">{participantCount}</div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>
            {canStartRoundRobin ? '✓ Ready for round-robin' : tournament.status === 'DRAFT' ? `Need ${Math.max(0, 4 - participantCount)} more` : ''}
          </p>
        </div>
        <div className="stat-card">
          <div className="stat-header"><span className="stat-label">Matches</span></div>
          <div className="stat-value">{matchCount}</div>
        </div>
        {isOngoing && (
          <div className="stat-card">
            <div className="stat-header"><span className="stat-label">Days</span></div>
            <div className="stat-value">{totalDays}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1.5px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1.5px',
                cursor: 'pointer', fontSize: 13.5,
                fontWeight: activeTab === tab ? 600 : 500,
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'color 0.15s ease, border-color 0.15s ease',
                whiteSpace: 'nowrap', textTransform: 'capitalize',
              }}
            >
              {tab === 'leaderboard' ? 'Leaderboard' : tab === 'bracket' ? 'Bracket' : tab === 'referees' ? 'Referees' : tab}
              {(tab === 'participants' || tab === 'matches') && (
                <span style={{
                  padding: '1px 6px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                  background: activeTab === tab ? 'rgba(var(--accent-rgb,21,128,61),0.12)' : 'var(--bg-subtle)',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text-faint)',
                }}>
                  {tab === 'participants' ? participantCount : matchCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Basic Details */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Tournament Details</h3>
            <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              {tournament.description && (
                <div><span style={{ color: 'var(--text-muted)' }}>Description: </span>{tournament.description}</div>
              )}
              <div><span style={{ color: 'var(--text-muted)' }}>Start Date: </span>{new Date(tournament.startDate).toLocaleDateString()}</div>
              {tournament.endDate && (
                <div><span style={{ color: 'var(--text-muted)' }}>End Date: </span>{new Date(tournament.endDate).toLocaleDateString()}</div>
              )}
              {tournament.categories?.length > 0 ? (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Categories: </span>
                  {tournament.categories.map(c => c.name).join(', ')}
                </div>
              ) : (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Categories: </span>
                  <span style={{ color: 'var(--text-faint)' }}>None created yet</span>
                </div>
              )}
              {tournament.status === 'DRAFT' && isCommittee && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}
                    onClick={() => setShowCategoryModal(true)}>
                    Manage Categories
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🕐 Schedule Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ color: 'var(--text-faint)', fontSize: 11, marginBottom: 4 }}>DAILY START</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{tournament.dailyStartTime || '09:00'}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ color: 'var(--text-faint)', fontSize: 11, marginBottom: 4 }}>DAILY END</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{tournament.dailyEndTime || '18:00'}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ color: 'var(--text-faint)', fontSize: 11, marginBottom: 4 }}>MATCH DURATION</div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{tournament.matchDurationMinutes || 40} <span style={{ fontSize: 12, fontWeight: 400 }}>min</span></div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ color: 'var(--text-faint)', fontSize: 11, marginBottom: 4 }}>BREAK</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {tournament.breakStartTime && tournament.breakEndTime
                    ? `${tournament.breakStartTime} – ${tournament.breakEndTime}`
                    : <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>No break</span>}
                </div>
              </div>
            </div>
            {tournament.status === 'DRAFT' && isCommittee && (
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12 }}>
                ✏️ Edit these settings before starting the round-robin.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Participants Tab */}
      {activeTab === 'participants' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              Participant List ({participantCount})
            </h3>
            {isCommittee && !isOngoing && !isFinished && (
              <button className="btn-primary" onClick={() => setShowAddPlayerModal(true)}>
                + Add Player
              </button>
            )}
          </div>

          {participantCount === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--text-faint)', marginBottom: 16 }}>No participants yet.</p>
              {isCommittee && !isOngoing && (
                <button className="btn-primary" onClick={() => setShowAddPlayerModal(true)}>Add First Player</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {(() => {
                const grouped = {};
                participants.forEach(p => {
                  const cId = p.categoryId || 'unassigned';
                  if (!grouped[cId]) grouped[cId] = [];
                  grouped[cId].push(p);
                });

                const getCatName = (id) => {
                  if (id === 'unassigned') return 'Unassigned';
                  const cat = tournament?.categories?.find(c => c.id === Number(id));
                  return cat ? cat.name : `Category ${id}`;
                };

                const getCatCapacity = (id) => {
                  if (id === 'unassigned') return '';
                  const cat = tournament?.categories?.find(c => c.id === Number(id));
                  if (cat && cat.maxParticipants) {
                    const count = cat.participantCount || 0;
                    const full = count >= cat.maxParticipants;
                    return { text: `${count}/${cat.maxParticipants}`, full };
                  }
                  return null;
                };

                return Object.keys(grouped).map(catId => {
                  const capacity = getCatCapacity(catId);
                  const catObj = tournament?.categories?.find(c => c.id === Number(catId));
                  const isDouble = catObj?.categoryType === 'DOUBLE';

                  // For doubles, group participants by teamId
                  let rows;
                  if (isDouble) {
                    const teams = {};
                    grouped[catId].forEach(p => {
                      const tId = p.teamId || `solo-${p.id}`;
                      if (!teams[tId]) teams[tId] = [];
                      teams[tId].push(p);
                    });
                    rows = Object.values(teams);
                  } else {
                    rows = grouped[catId].map(p => [p]);
                  }

                  return (
                  <div key={catId} className="card">
                    <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{getCatName(catId)} ({isDouble ? `${rows.length} teams` : grouped[catId].length})</span>
                      {capacity && (
                        <span style={{
                          fontSize: 12, fontWeight: 500, padding: '2px 10px', borderRadius: 999,
                          background: capacity.full ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                          color: capacity.full ? '#f87171' : '#22c55e',
                          border: `1px solid ${capacity.full ? '#ef4444' : '#22c55e'}`,
                        }}>
                          {capacity.text} {capacity.full ? 'FULL' : 'slots'}
                        </span>
                      )}
                    </h4>
                    <table style={{ width: '100%', fontSize: 13.5, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-faint)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', width: 40 }}>#</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-faint)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isDouble ? 'Team' : 'ID'}</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-faint)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isDouble ? 'Players' : 'Name'}</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-faint)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-faint)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((team, idx) => {
                          const firstP = team[0];
                          return (
                          <tr key={firstP.teamId || firstP.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 12px' }}>
                              {isDouble ? (
                                <span style={{
                                  fontFamily: 'monospace', fontSize: 12,
                                  background: 'rgba(96,165,250,0.1)', color: '#93c5fd',
                                  padding: '2px 6px', borderRadius: 4,
                                }}>T-{String(firstP.teamId || firstP.id).padStart(3, '0')}</span>
                              ) : (
                                <span style={{
                                  fontFamily: 'monospace', fontSize: 12,
                                  background: 'rgba(96,165,250,0.1)', color: '#93c5fd',
                                  padding: '2px 6px', borderRadius: 4,
                                }}>P-{String(firstP.id).padStart(3, '0')}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                              {isDouble
                                ? team.map(p => p.fullName || p.user?.name || 'Unknown').join(' / ')
                                : firstP.fullName || firstP.user?.name || 'Unknown'}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                              {isDouble
                                ? [...new Set(team.map(p => p.gender?.toLowerCase()))].join(', ')
                                : firstP.gender?.toLowerCase() || '\u2014'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ color: firstP.isActive ? '#22c55e' : '#9ca3af', fontSize: 12 }}>
                                {firstP.isActive ? '\u25cf Active' : '\u25cb Inactive'}
                              </span>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <GroupsTab groups={groups} groupCategories={groupCategories} loading={groupsLoading} />
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <LeaderboardTab
          tournament={tournament}
          leaderboard={leaderboard}
          loading={leaderboardLoading}
          onRefresh={fetchLeaderboard}
        />
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <MatchesTab
          tournament={tournament}
          matches={currentDayMatches}
          allMatches={matches}
          loading={matchesLoading}
          isCommittee={isCommittee}
          canStartRoundRobin={canStartRoundRobin}
          onStartRoundRobin={handleStartRoundRobin}
          selectedDay={clampedDay}
          totalDays={totalDays}
          dayKeys={dayKeys}
          onDayChange={setSelectedDay}
          onUpdate={fetchMatches}
          showToast={showToast}
          allGroupFinished={allGroupFinished}
          onGenerateKnockout={handleGenerateKnockout}
          currentStage={currentStage}
        />
      )}

      {/* Bracket Tab */}
      {activeTab === 'bracket' && (
        <BracketTab
          tournament={tournament}
          groupCategories={groupCategories}
          matches={knockoutMatches}
          isCommittee={isCommittee}
          onUpdate={fetchKnockoutMatches}
          showToast={showToast}
        />
      )}

      {/* Referees Tab — committee only */}
      {activeTab === 'referees' && isCommittee && (
        <RefereeManagementTab
          tournamentId={Number(id)}
          isFinished={isFinished}
        />
      )}

      {/* Modals */}
      {showEditModal && (
        <EditTournamentModal
          tournament={tournament}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateTournament}
        />
      )}

      {showCategoryModal && (
        <ManageCategoriesModal
          tournament={tournament}
          onClose={() => setShowCategoryModal(false)}
          onSuccess={() => {
            fetchTournament();
            showToast('Categories updated successfully');
          }}
        />
      )}

      {showAddPlayerModal && (
        <AddPlayerModal
          tournament={tournament}
          participants={participants}
          onClose={() => setShowAddPlayerModal(false)}
          onSuccess={() => {
            setShowAddPlayerModal(false);
            fetchParticipants();
            fetchTournament();
            showToast('Player added successfully!', 'success');
          }}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// ─── Matches Tab ────────────────────────────────────────────────────────────────
function MatchesTab({
  tournament, matches, allMatches, loading, isCommittee, canStartRoundRobin,
  onStartRoundRobin, selectedDay, totalDays, dayKeys, onDayChange, onUpdate, showToast,
  allGroupFinished, onGenerateKnockout, currentStage,
}) {
  if (tournament.status === 'DRAFT') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>No matches scheduled yet.</p>
        <p style={{ color: 'var(--text-faint)', fontSize: 13, marginBottom: 20 }}>
          Matches are generated when you start the round-robin. Players will be divided into groups of ~4.
        </p>
        {canStartRoundRobin && (
          <button className="btn-primary" onClick={onStartRoundRobin}>
            🚀 Generate Round-Robin Matches
          </button>
        )}
      </div>
    );
  }

  // Sort matches chronologically
  const sortedMatches = [...matches].sort((a, b) => {
    if (!a.scheduledAt) return 1;
    if (!b.scheduledAt) return -1;
    return new Date(a.scheduledAt) - new Date(b.scheduledAt);
  });

  return (
    <div>
      {/* Knockout generation banner */}
      {allGroupFinished && currentStage === 'GROUP' && isCommittee && (
        <div className="card" style={{
          textAlign: 'center', padding: 20, marginBottom: 20,
          background: 'rgba(34,197,94,0.08)', border: '1px solid #22c55e', borderRadius: 12,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 8 }}>
            ✅ All group matches are complete!
          </p>
          <button className="btn-primary" onClick={onGenerateKnockout}>
            🏅 Generate Knockout Bracket
          </button>
        </div>
      )}

      {/* Day selector */}
      {totalDays > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>Select Day</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dayKeys.map((dk, idx) => {
              const dayNum = idx + 1;
              const dateLabel = new Date(dk).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <button
                  key={dk}
                  onClick={() => onDayChange(dayNum)}
                  style={{
                    padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    border: selectedDay === dayNum ? '1px solid var(--round-btn-border-active)' : '1px solid var(--round-btn-border)',
                    background: selectedDay === dayNum ? 'var(--round-btn-bg-active)' : 'var(--round-btn-bg)',
                    color: selectedDay === dayNum ? 'var(--round-btn-text-active)' : 'var(--round-btn-text)',
                    transition: 'all 0.15s',
                  }}
                >
                  Day {dayNum} — {dateLabel}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          Day {selectedDay} — Matches
        </h3>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner"></div>
        </div>
      ) : matches.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--text-faint)' }}>No matches on this day.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {sortedMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              isCommittee={isCommittee}
              onUpdate={onUpdate}
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Match Card ─────────────────────────────────────────────────────────────────
function MatchCard({ match, isCommittee, onUpdate, showToast }) {
  const [showRefereeModal, setShowRefereeModal] = useState(false);
  const [editingScore, setEditingScore] = useState(false);
  const [sets, setSets] = useState(() => initSets(match.sets));
  const [saving, setSaving] = useState(false);
  const [showRetireModal, setShowRetireModal] = useState(false);

  // Initialize 3 set slots from existing match.sets data
  function initSets(existingSets = []) {
    const base = [
      { homeScore: '', awayScore: '' },
      { homeScore: '', awayScore: '' },
      { homeScore: '', awayScore: '' },
    ];
    existingSets.forEach((s, i) => {
      if (i < 3) {
        base[i] = { homeScore: String(s.homeScore), awayScore: String(s.awayScore) };
      }
    });
    return base;
  }

  const handleSetChange = (idx, side, val) => {
    setSets(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [side]: val };
      return next;
    });
  };

  const handleSaveScore = async () => {
    // Only include sets that have been filled in
    const filledSets = sets
      .filter(s => s.homeScore !== '' || s.awayScore !== '')
      .map(s => ({
        homeScore: parseInt(s.homeScore) || 0,
        awayScore: parseInt(s.awayScore) || 0,
      }));

    if (filledSets.length === 0) {
      showToast('Please enter at least one set score.', 'error');
      return;
    }

    // Validate badminton scoring rules
    for (const s of filledSets) {
      const h = s.homeScore;
      const a = s.awayScore;
      const max = Math.max(h, a);
      const min = Math.min(h, a);

      if (max > 30) {
        showToast('Maximum score in badminton is 30.', 'error');
        return;
      }
      if (max >= 21) {
        if (max === 30) {
          if (min < 28) {
            showToast(`Invalid score ${h}-${a}: set would have ended earlier (must win by 2, or 30-29).`, 'error');
            return;
          }
        } else if (max > 21) {
          if (max - min !== 2) {
            showToast(`Invalid score ${h}-${a}: must win by exactly 2 points past 20.`, 'error');
            return;
          }
        } else {
          // max === 21
          if (min >= 20) {
            showToast(`Invalid score ${h}-${a}: must win by 2 points.`, 'error');
            return;
          }
        }
      }
    }

    try {
      setSaving(true);
      await matchesApi.updateScore(match.id, filledSets);
      setEditingScore(false);
      showToast('Score saved!', 'success');
      onUpdate();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishMatch = async () => {
    try {
      setSaving(true);
      await matchesApi.finishMatch(match.id);
      showToast('Match finished!', 'success');
      onUpdate();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async (retireTeamId, reason) => {
    try {
      setSaving(true);
      await matchesApi.retireMatch(match.id, retireTeamId, reason);
      showToast(`Match ended: ${reason === 'RETIRE' ? 'Retired' : 'Walk Out'}`, 'success');
      setShowRetireModal(false);
      onUpdate();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const homeTeamName = match.homeTeam?.name || 'TBD';
  const awayTeamName = match.awayTeam?.name || 'TBD';
  const isWinnerHome = match.winnerTeamId && match.winnerTeamId === match.homeTeamId;
  const isWinnerAway = match.winnerTeamId && match.winnerTeamId === match.awayTeamId;

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Match header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', display: 'block', marginBottom: 4 }}>
            Round {match.round} · Match #{match.id}
            {match.category && ` · ${match.category.name}`}
            {match.court && <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}> · {match.court.name}</span>}
            {' · '}👨‍⚖️ {match.referee ? match.referee.name : 'Unassigned'}
          </span>
          {match.scheduledAt && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              🕐 {new Date(match.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {new Date(match.scheduledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {/* Player names row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: isWinnerHome ? 'var(--accent)' : isWinnerAway ? 'var(--text-faint)' : 'var(--text-primary)'
            }}>
              {isWinnerHome && '🏆 '}{homeTeamName}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>vs</span>
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: isWinnerAway ? 'var(--accent)' : isWinnerHome ? 'var(--text-faint)' : 'var(--text-primary)'
            }}>
              {isWinnerAway && '🏆 '}{awayTeamName}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StatusBadge status={match.status} />
          {match.finishReason && match.finishReason !== 'NORMAL' && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              background: match.finishReason === 'RETIRE' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
              color: match.finishReason === 'RETIRE' ? '#ef4444' : '#f97316',
              border: `1px solid ${match.finishReason === 'RETIRE' ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`,
            }}>
              {match.finishReason === 'RETIRE' ? '🤕 Retired' : '🚫 Walk Out'}
              {match.retiredTeam ? ` (${match.retiredTeam.name})` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Sets score display */}
      {!editingScore && match.sets && match.sets.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
            {match.sets.map(s => (
              <span key={s.setNumber} style={{
                fontSize: 13,
                background: 'rgba(100,116,139,0.12)',
                border: '1px solid rgba(100,116,139,0.3)',
                borderRadius: 8, padding: '4px 10px',
              }}>
                Set {s.setNumber}: <strong>{s.homeScore}</strong> – <strong>{s.awayScore}</strong>
              </span>
            ))}
          </div>
          {/* Games won summary */}
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Sets won: <strong style={{ color: 'var(--accent)' }}>{match.homeScore}</strong>
            {' – '}
            <strong style={{ color: 'var(--accent)' }}>{match.awayScore}</strong>
          </div>
        </div>
      )}

      {/* Score editor */}
      {editingScore && (
        <div style={{
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 16, marginBottom: 14,
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Enter scores per set (best of 3):</p>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 20px 1fr', gap: 8, marginBottom: 6 }}>
            <div></div>
            <span style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center', fontWeight: 600 }}>{homeTeamName}</span>
            <div></div>
            <span style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center', fontWeight: 600 }}>{awayTeamName}</span>
          </div>

          {sets.map((s, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 20px 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Set {idx + 1}</span>
              <input
                type="number" min="0" max="30"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: 14, textAlign: 'center' }}
                placeholder="0"
                value={s.homeScore}
                onChange={e => handleSetChange(idx, 'homeScore', e.target.value)}
              />
              <span style={{ textAlign: 'center', color: '#475569' }}>–</span>
              <input
                type="number" min="0" max="30"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: 14, textAlign: 'center' }}
                placeholder="0"
                value={s.awayScore}
                onChange={e => handleSetChange(idx, 'awayScore', e.target.value)}
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn-primary"
              onClick={handleSaveScore}
              disabled={saving}
              style={{ fontSize: 13, padding: '6px 16px', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save Scores'}
            </button>
            <button
              className="btn-outline"
              onClick={() => { setEditingScore(false); setSets(initSets(match.sets)); }}
              disabled={saving}
              style={{ fontSize: 13, padding: '6px 16px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Match actions row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {/* Referee */}
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          🧑‍⚖️{' '}
          {match.referee ? (
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{match.referee.name}</span>
          ) : (
            <span style={{ color: '#f87171' }}>No referee</span>
          )}
          {isCommittee && match.status !== 'FINISHED' && (
            <button
              onClick={() => setShowRefereeModal(true)}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer',
                fontSize: 12, marginLeft: 8, padding: 0, textDecoration: 'underline',
              }}
            >
              {match.referee ? 'Change' : 'Assign'}
            </button>
          )}
        </div>

        {/* Action buttons */}
        {isCommittee && match.status !== 'FINISHED' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!editingScore && (
              <button
                className="btn-outline"
                onClick={() => setEditingScore(true)}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                {match.sets?.length > 0 ? 'Edit Score' : 'Enter Score'}
              </button>
            )}
            {match.sets?.length > 0 && !editingScore && (
              <button
                className="btn-primary"
                onClick={handleFinishMatch}
                disabled={saving}
                style={{ fontSize: 12, padding: '4px 12px', background: '#16a34a', border: 'none' }}
              >
                Finish Match
              </button>
            )}
            {!editingScore && (
              <button
                onClick={() => setShowRetireModal(true)}
                disabled={saving}
                style={{
                  fontSize: 12, padding: '4px 12px', fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                }}
              >
                🏳️ Retire / Walk Out
              </button>
            )}
          </div>
        )}
      </div>

      {showRefereeModal && (
        <RefereeAssignModal
          matchId={match.id}
          onClose={() => setShowRefereeModal(false)}
          onSuccess={() => {
            setShowRefereeModal(false);
            onUpdate();
          }}
          showToast={showToast}
        />
      )}

      {showRetireModal && (
        <RetireModal
          match={match}
          onClose={() => setShowRetireModal(false)}
          onRetire={handleRetire}
          saving={saving}
        />
      )}
    </div>
  );
}

// ─── Referee Assign Modal ───────────────────────────────────────────────────────
function RefereeAssignModal({ matchId, onClose, onSuccess, showToast }) {
  const [referees, setReferees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    matchesApi.getAvailableReferees()
      .then(setReferees)
      .catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selected) { showToast('Please select a referee', 'error'); return; }
    try {
      setSaving(true);
      await matchesApi.assignReferee(matchId, selected.id);
      onSuccess();
      showToast('Referee assigned!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24,
        maxWidth: 380, width: '90%', zIndex: 1000, boxShadow: 'var(--shadow-modal)',
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Assign Referee</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner"></div></div>
        ) : referees.length === 0 ? (
          <p style={{ color: 'var(--text-faint)' }}>No referees available.</p>
        ) : (
          <div style={{ marginBottom: 16, maxHeight: 200, overflow: 'auto', display: 'grid', gap: 8 }}>
            {referees.map(r => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  padding: 12, borderRadius: 8, cursor: 'pointer',
                  border: selected?.id === r.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: selected?.id === r.id ? 'var(--status-scheduled-bg)' : 'var(--bg-subtle)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{r.email}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-primary" onClick={handleAssign}
            disabled={!selected || saving} style={{ flex: 1, opacity: (!selected || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Assigning...' : 'Assign'}
          </button>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Retire / Walk Out Modal ────────────────────────────────────────────────────
function RetireModal({ match, onClose, onRetire, saving }) {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [reason, setReason] = useState('RETIRE');

  const homeName = match.homeTeam?.name || 'Home';
  const awayName = match.awayTeam?.name || 'Away';

  const winnerName = selectedTeamId === match.homeTeamId ? awayName : homeName;

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24,
        maxWidth: 420, width: '90%', zIndex: 1000, boxShadow: 'var(--shadow-modal)',
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>🏳️ Retire / Walk Out</h3>

        {/* Team selection */}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Pilih tim yang retire / walk out:</p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {[
            { id: match.homeTeamId, name: homeName },
            { id: match.awayTeamId, name: awayName },
          ].map(team => (
            <div
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              style={{
                padding: 12, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                border: selectedTeamId === team.id ? '1.5px solid #ef4444' : '1px solid var(--border)',
                background: selectedTeamId === team.id ? 'rgba(239,68,68,0.06)' : 'var(--bg-subtle)',
                fontWeight: selectedTeamId === team.id ? 600 : 400,
                color: selectedTeamId === team.id ? '#ef4444' : 'var(--text-primary)',
              }}
            >
              {team.name}
            </div>
          ))}
        </div>

        {/* Reason selector */}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Alasan:</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setReason('RETIRE')}
            style={{
              flex: 1, padding: '10px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              borderRadius: 8, transition: 'all 0.15s',
              background: reason === 'RETIRE' ? 'rgba(239,68,68,0.12)' : 'var(--bg-subtle)',
              border: reason === 'RETIRE' ? '1.5px solid #ef4444' : '1px solid var(--border)',
              color: reason === 'RETIRE' ? '#ef4444' : 'var(--text-secondary)',
            }}
          >
            🤕 Retire<br/>
            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>Cedera / Tidak bisa lanjut</span>
          </button>
          <button
            type="button"
            onClick={() => setReason('WALKOVER')}
            style={{
              flex: 1, padding: '10px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              borderRadius: 8, transition: 'all 0.15s',
              background: reason === 'WALKOVER' ? 'rgba(249,115,22,0.12)' : 'var(--bg-subtle)',
              border: reason === 'WALKOVER' ? '1.5px solid #f97316' : '1px solid var(--border)',
              color: reason === 'WALKOVER' ? '#f97316' : 'var(--text-secondary)',
            }}
          >
            🚫 Walk Out<br/>
            <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>Tidak hadir / Mengundurkan diri</span>
          </button>
        </div>

        {selectedTeamId && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 8 }}>
            <strong>{winnerName}</strong> akan otomatis memenangkan match ini.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onRetire(selectedTeamId, reason)}
            disabled={!selectedTeamId || saving}
            style={{
              flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600,
              background: '#ef4444', color: 'white', border: 'none',
              borderRadius: 8, cursor: (!selectedTeamId || saving) ? 'not-allowed' : 'pointer',
              opacity: (!selectedTeamId || saving) ? 0.5 : 1,
            }}
          >
            {saving ? 'Processing...' : `Confirm ${reason === 'RETIRE' ? 'Retire' : 'Walk Out'}`}
          </button>
          <button className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Edit Tournament Modal ──────────────────────────────────────────────────────
function EditTournamentModal({ tournament, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: tournament.name,
    location: tournament.location,
    startDate: tournament.startDate?.slice(0, 10) || '',
    endDate: tournament.endDate?.slice(0, 10) || '',
    description: tournament.description || '',
    // Schedule settings
    dailyStartTime: tournament.dailyStartTime || '09:00',
    dailyEndTime: tournament.dailyEndTime || '18:00',
    matchDurationMinutes: tournament.matchDurationMinutes || 40,
    breakStartTime: tournament.breakStartTime || '',
    breakEndTime: tournament.breakEndTime || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-modal)',
        maxWidth: 480, width: '90%', maxHeight: '90vh', overflow: 'auto', zIndex: 1000,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Edit Tournament</h2>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Name', name: 'name', type: 'text' },
            { label: 'Location', name: 'location', type: 'text' },
            { label: 'Start Date', name: 'startDate', type: 'date' },
            { label: 'End Date', name: 'endDate', type: 'date' },
          ].map(f => (
            <div className="form-group" key={f.name}>
              <label className="form-label">{f.label}</label>
              <input
                type={f.type} name={f.name} className="form-input"
                value={formData[f.name]}
                onChange={e => setFormData({ ...formData, [f.name]: e.target.value })}
                disabled={loading}
              />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description" className="form-input" rows="3"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              disabled={loading} style={{ resize: 'vertical' }}
            />
          </div>

          {/* Schedule Settings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
              🕐 Schedule Settings
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Daily Start</label>
                <input type="time" className="form-input"
                  value={formData.dailyStartTime}
                  onChange={e => setFormData({ ...formData, dailyStartTime: e.target.value })}
                  disabled={loading} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Daily End</label>
                <input type="time" className="form-input"
                  value={formData.dailyEndTime}
                  onChange={e => setFormData({ ...formData, dailyEndTime: e.target.value })}
                  disabled={loading} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 12, marginBottom: 12 }}>
              <label className="form-label">Match Duration (minutes)</label>
              <input type="number" className="form-input" min="15" max="120" step="5"
                value={formData.matchDurationMinutes}
                onChange={e => setFormData({ ...formData, matchDurationMinutes: e.target.value })}
                disabled={loading} />
            </div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
              Break / Lunch (optional)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Break Start</label>
                <input type="time" className="form-input"
                  value={formData.breakStartTime}
                  onChange={e => setFormData({ ...formData, breakStartTime: e.target.value })}
                  disabled={loading} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Break End</label>
                <input type="time" className="form-input"
                  value={formData.breakEndTime}
                  onChange={e => setFormData({ ...formData, breakEndTime: e.target.value })}
                  disabled={loading} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
              Leave blank for no break.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}

// ─── Manage Categories Modal ──────────────────────────────────────────────────────
function ManageCategoriesModal({ tournament, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ageGroups, setAgeGroups] = useState([]);
  const [formData, setFormData] = useState({
    gender: 'MALE',
    categoryType: 'SINGLE',
    ageGroup: '',
    maxParticipants: ''
  });

  // Fetch age groups on mount
  useEffect(() => {
    categoriesApi.getAgeGroups()
      .then(data => {
        setAgeGroups(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, ageGroup: data[0].name }));
      })
      .catch(err => console.error('Failed to fetch age groups:', err));
  }, []);

  // Auto-generate category name from selections
  const generateName = (data) => {
    const genderLabel = { MALE: "Men's", FEMALE: "Women's", MIXED: "Mixed" }[data.gender] || data.gender;
    const typeLabel = data.categoryType === 'DOUBLE' ? 'Doubles' : 'Singles';
    const ageLabel = data.ageGroup || '';
    return `${ageLabel} ${genderLabel} ${typeLabel}`.trim();
  };

  const handleDelete = async (catId) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      setLoading(true);
      await categoriesApi.delete(catId);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to delete category');
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.ageGroup) {
      setError('Please select an age group.');
      return;
    }

    const name = generateName(formData);

    try {
      setLoading(true);
      await categoriesApi.create({
        name,
        gender: formData.gender,
        level: 'OPEN',
        categoryType: formData.categoryType,
        ageGroup: formData.ageGroup,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        tournamentId: tournament.id,
      });
      setFormData(prev => ({ ...prev, maxParticipants: '' }));
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  // Helper: get age group info from category's minAge/maxAge
  const getAgeGroupLabel = (cat) => {
    if (cat.minAge == null && cat.maxAge == null) return 'OPEN';
    if (cat.minAge === 0 && cat.maxAge === 200) return 'OPEN';
    const match = ageGroups.find(ag => ag.minAge === cat.minAge && ag.maxAge === cat.maxAge);
    return match ? match.name : (cat.minAge != null ? `${cat.minAge}-${cat.maxAge}` : '');
  };

  const previewName = generateName(formData);
  const selectedAgeGroup = ageGroups.find(ag => ag.name === formData.ageGroup);

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-modal)',
        maxWidth: 520, width: '90%', maxHeight: '90vh', overflow: 'auto', zIndex: 1000,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Manage Categories</h2>
        <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 20 }}>
          Create categories by selecting age group, gender, and format type.
        </p>

        {error && (
          <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 16 }}>
            <p style={{ color: '#f87171', fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-faint)' }}>Existing Categories</h3>
          {tournament.categories?.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {tournament.categories.map(c => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: getAgeGroupLabel(c) === 'OPEN' ? 'rgba(34,197,94,0.15)' : 'rgba(96,165,250,0.15)',
                        color: getAgeGroupLabel(c) === 'OPEN' ? '#22c55e' : '#60a5fa',
                        border: `1px solid ${getAgeGroupLabel(c) === 'OPEN' ? '#22c55e' : '#60a5fa'}`,
                      }}>{getAgeGroupLabel(c)}</span>
                      <span>•</span>
                      <span>{c.gender}</span>
                      <span>•</span>
                      <span>{c.categoryType}</span>
                      {c.maxParticipants ? <><span>•</span><span>{c.participantCount || 0}/{c.maxParticipants} slots</span></> : null}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No categories created yet.</div>
          )}
        </div>

        <form onSubmit={handleCreate}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-faint)' }}>Add New Category</h3>
          
          {/* Age Group Selector */}
          <div className="form-group">
            <label className="form-label">Age Group *</label>
            <select className="form-input" value={formData.ageGroup}
              onChange={e => setFormData({...formData, ageGroup: e.target.value})} disabled={loading}>
              {ageGroups.map(ag => (
                <option key={ag.name} value={ag.name}>
                  {ag.name} — {ag.label}
                  {ag.name !== 'OPEN' ? ` (umur ${ag.minAge}–${ag.maxAge - 1} tahun)` : ''}
                </option>
              ))}
            </select>
            {selectedAgeGroup && selectedAgeGroup.name !== 'OPEN' && (
              <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                ℹ️ Peserta harus berumur {selectedAgeGroup.minAge}–{selectedAgeGroup.maxAge - 1} tahun
              </p>
            )}
            {selectedAgeGroup && selectedAgeGroup.name === 'OPEN' && (
              <p style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>
                ✅ Semua umur bisa mendaftar
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Format Type</label>
              <select className="form-input" value={formData.categoryType} onChange={e => setFormData({...formData, categoryType: e.target.value})} disabled={loading}>
                <option value="SINGLE">Single (1v1)</option>
                <option value="DOUBLE">Double (2v2)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} disabled={loading}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Max Teams/Players</label>
              <input type="number" className="form-input" placeholder="e.g. 16 (empty = unlimited)"
                value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: e.target.value})} disabled={loading} min="2" />
            </div>
          </div>

          {/* Preview */}
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 12,
            background: 'var(--status-scheduled-bg)', border: '1px solid var(--status-scheduled-border)',
          }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              📋 Category name: <strong style={{ color: 'var(--text-primary)' }}>{previewName}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Processing...' : 'Add Category'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Close</button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}

// ─── Add Player Modal ───────────────────────────────────────────────────────────
function AddPlayerModal({ tournament, participants, onClose, onSuccess }) {
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [players, setPlayers] = useState([]);
  
  const selectedCategory = tournament.categories?.find(c => c.id.toString() === categoryId);
  const isDouble = selectedCategory?.categoryType === 'DOUBLE';

  const initialPlayerState = { fullName: '', birthDate: '', gender: 'MALE', email: '', phone: '', userId: '', mode: 'new', search: '', showDropdown: false };
  const [p1, setP1] = useState({...initialPlayerState});
  const [p2, setP2] = useState({...initialPlayerState});

  useEffect(() => {
    authApi.getPlayers().then(data => {
      const existingIds = new Set(participants.map(p => p.userId || (p.user && p.user.id)).filter(Boolean));
      setPlayers(data.filter(u => !existingIds.has(u.id)));
    }).catch(console.error);

    if (tournament.categories?.length > 0) {
      setCategoryId(tournament.categories[0].id.toString());
    }
  }, [participants, tournament]);

  const handlePlayerSelect = (pObj, dbPlayer) => {
    pObj.setter({
      ...pObj.state,
      search: `${dbPlayer.name} ${dbPlayer.email ? `(${dbPlayer.email})` : ''}`,
      showDropdown: false,
      fullName: dbPlayer.name || '',
      birthDate: dbPlayer.birthDate ? dbPlayer.birthDate.split('T')[0] : '',
      gender: dbPlayer.gender || 'MALE',
      email: dbPlayer.email || '',
      phone: dbPlayer.phone || '',
      userId: dbPlayer.id
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!categoryId) {
      setError('Please select a category first.');
      return;
    }

    // Validate P1
    if (p1.mode === 'existing' && !p1.userId) return setError('Please select a registered player for Player 1.');
    if (!p1.fullName || !p1.birthDate) return setError('Full Name and Birth Date are required for Player 1.');

    // Validate P2
    if (isDouble) {
      if (p2.mode === 'existing' && !p2.userId) return setError('Please select a registered player for Player 2.');
      if (!p2.fullName || !p2.birthDate) return setError('Full Name and Birth Date are required for Player 2.');
      if (p1.userId && p1.userId === p2.userId) return setError('Player 1 and Player 2 cannot be the same registered user.');
    }

    try {
      setLoading(true);
      const payload = {
        categoryId: parseInt(categoryId),
        player1: {
          fullName: p1.fullName,
          birthDate: new Date(p1.birthDate).toISOString(),
          gender: p1.gender,
          email: p1.email || undefined,
          phone: p1.phone || undefined,
          userId: p1.userId || undefined,
        }
      };
      
      if (isDouble) {
        payload.player2 = {
          fullName: p2.fullName,
          birthDate: new Date(p2.birthDate).toISOString(),
          gender: p2.gender,
          email: p2.email || undefined,
          phone: p2.phone || undefined,
          userId: p2.userId || undefined,
        };
      }

      await participantsApi.addParticipant(tournament.id, payload);

      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to add participant');
    } finally {
      setLoading(false);
    }
  };

  const renderPlayerForm = (pObj, title) => {
    const { state, setter } = pObj;
    const filtered = players.filter(p => p.name.toLowerCase().includes(state.search.toLowerCase()) || (p.email && p.email.toLowerCase().includes(state.search.toLowerCase())));

    return (
      <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-main)' }}>{title}</div>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--bg-subtle)', padding: 4, borderRadius: 8 }}>
          <button type="button" onClick={() => setter({...initialPlayerState, mode: 'new'})} 
            style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, background: state.mode === 'new' ? 'var(--bg-elevated)' : 'transparent', color: state.mode === 'new' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', borderRadius: 6, cursor: 'pointer', boxShadow: state.mode === 'new' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
            Walk-in Player
          </button>
          <button type="button" onClick={() => setter({...initialPlayerState, mode: 'existing'})}
            style={{ flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, background: state.mode === 'existing' ? 'var(--bg-elevated)' : 'transparent', color: state.mode === 'existing' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', borderRadius: 6, cursor: 'pointer', boxShadow: state.mode === 'existing' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
            Existing User
          </button>
        </div>

        {state.mode === 'existing' && (
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Search Registered Player *</label>
            <input type="text" className="form-input" placeholder="Type name or email..." value={state.search} disabled={loading}
              onChange={e => setter({...state, search: e.target.value, showDropdown: true, userId: ''})}
              onFocus={() => setter({...state, showDropdown: true})} />
            {state.showDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 150, overflowY: 'auto', zIndex: 1050, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}>
                {filtered.map(p => (
                  <div key={p.id} onClick={() => handlePlayerSelect(pObj, p)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }} onMouseEnter={(e) => e.target.style.background = 'var(--bg-subtle)'} onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input type="text" className="form-input" value={state.fullName} disabled={loading || state.mode === 'existing'}
            onChange={e => setter({...state, fullName: e.target.value})} placeholder="Player full name" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Birth Date *</label>
            <input type="date" className="form-input" value={state.birthDate} disabled={loading || state.mode === 'existing'}
              onChange={e => setter({...state, birthDate: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-input" value={state.gender} disabled={loading || state.mode === 'existing'}
              onChange={e => setter({...state, gender: e.target.value})}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 999 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-modal)', maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto', zIndex: 1000}}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Add Player</h2>
        
        {error && <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 16, color: '#f87171', fontSize: 14 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Select Category *</label>
            {tournament.categories?.length > 0 ? (
              <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={loading}>
                {tournament.categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.categoryType})</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 13, color: '#ef4444' }}>Please create a Category first.</div>
            )}
          </div>

          {categoryId && (
            <>
              {renderPlayerForm({state: p1, setter: setP1}, isDouble ? "Player 1" : "Player Details")}
              {isDouble && renderPlayerForm({state: p2, setter: setP2}, "Player 2")}
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="submit" className="btn-primary" disabled={loading || !categoryId} style={{ flex: 1 }}>
              {loading ? 'Adding...' : isDouble ? 'Add Team' : 'Add Player'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}


// ─── Groups Tab ─────────────────────────────────────────────────────────────────
function GroupsTab({ groups, groupCategories, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div className="spinner" />
      </div>
    );
  }

  const cats = groupCategories && groupCategories.length > 0 ? groupCategories : null;

  if ((!cats && (!groups || groups.length === 0)) || (cats && cats.length === 0)) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text-muted)' }}>Groups will appear here after the tournament starts.</p>
      </div>
    );
  }

  const renderGroup = (group) => (
    <div key={group.code} className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px',
        background: 'rgba(var(--accent-rgb,21,128,61),0.07)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--accent)' }}>
          Group {group.code}
        </h4>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {group.teams.length} player{group.teams.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ padding: '8px 0' }}>
        {group.teams.map((team, idx) => (
          <div key={team.id} style={{
            padding: '8px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: idx < group.teams.length - 1 ? '1px solid var(--table-row-border)' : 'none',
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--bg-subtle)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
            }}>
              {idx + 1}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{team.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (cats) {
    return (
      <div>
        {cats.map(cat => (
          <div key={cat.categoryId} style={{ marginBottom: 32 }}>
            <h3 style={{
              fontSize: 17, fontWeight: 700, marginBottom: 16,
              paddingBottom: 8, borderBottom: '2px solid var(--border)',
              color: 'var(--text-primary)',
            }}>
              {cat.categoryName}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {cat.groups.map(renderGroup)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: flat groups (backward compatibility)
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Group Assignments</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
        {groups.map(renderGroup)}
      </div>
    </div>
  );
}

// ─── Leaderboard Tab (per-group) ────────────────────────────────────────────────
function LeaderboardTab({ tournament, leaderboard, loading, onRefresh }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const isFinished = tournament.status === 'FINISHED';
  const isOngoing = tournament.status === 'ONGOING';

  const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const TOP2_TINT = 'rgba(34,197,94,0.08)';

  const COL = [
    { key: 'Pts', label: 'Pts', title: 'Tournament Points (2 per win)', highlight: true },
    { key: 'MP', label: 'MP', title: 'Matches Played' },
    { key: 'W', label: 'W', title: 'Wins' },
    { key: 'L', label: 'L', title: 'Losses' },
    { key: 'SW', label: 'SW', title: 'Sets Won' },
    { key: 'SL', label: 'SL', title: 'Sets Lost' },
    { key: 'SD', label: 'SD', title: 'Set Difference' },
    { key: 'PD', label: 'PD', title: 'Point Difference' },
  ];

  const categories = leaderboard?.categories || [];
  const isOldStyle = !leaderboard?.categories && leaderboard && !Array.isArray(leaderboard);
  const oldStyleGroups = isOldStyle ? Object.keys(leaderboard).sort() : [];
  const isArray = Array.isArray(leaderboard);

  let isEmpty = true;
  if (categories.length > 0) {
    isEmpty = categories.every(c => c.groups.every(g => g.standings.length === 0));
  } else if (isOldStyle) {
    isEmpty = oldStyleGroups.every(k => leaderboard[k].length === 0);
  } else if (isArray) {
    isEmpty = leaderboard.length === 0;
  }

  const renderTable = (rows, groupCode, keyPrefix = '') => {
    if (!rows || rows.length === 0) return null;
    return (
      <div key={`${keyPrefix}-${groupCode}`} className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {groupCode && (
          <div style={{
            padding: '8px 16px',
            background: 'rgba(var(--accent-rgb,21,128,61),0.07)',
            borderBottom: '1px solid var(--border)',
            fontSize: 14, fontWeight: 700, color: 'var(--accent)',
          }}>
            Group {groupCode}
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--table-header-text)', fontWeight: 600, width: 36 }}>#</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--table-header-text)', fontWeight: 600 }}>Team</th>
                {COL.map(c => (
                  <th key={c.key} title={c.title} style={{
                    padding: '10px 12px', textAlign: 'center',
                    color: c.highlight ? 'var(--accent)' : 'var(--table-header-text)',
                    fontWeight: c.highlight ? 700 : 600, cursor: 'help', minWidth: 44,
                  }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rank = row.rank;
                const qualifies = rank <= 2;
                return (
                  <tr
                    key={row.teamId}
                    style={{
                      borderBottom: '1px solid var(--table-row-border)',
                      background: qualifies ? TOP2_TINT : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 15 }}>
                      {MEDAL[rank] || <span style={{ color: 'var(--text-faint)' }}>{rank}</span>}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: rank <= 2 ? 700 : 500 }}>
                      {row.teamName}
                      {qualifies && (
                        <span style={{
                          marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 700,
                        }}>
                          QUALIFIES
                        </span>
                      )}
                    </td>
                    {COL.map(c => (
                      <td key={c.key} style={{
                        padding: '10px 12px', textAlign: 'center',
                        fontWeight: c.highlight ? 700 : 400,
                        color: c.highlight
                          ? 'var(--accent)'
                          : c.key === 'SD' || c.key === 'PD'
                            ? row[c.key] > 0 ? '#16a34a' : row[c.key] < 0 ? 'var(--danger-text)' : 'var(--text-muted)'
                            : 'currentColor',
                      }}>
                        {c.key === 'SD' || c.key === 'PD'
                          ? (row[c.key] > 0 ? `+${row[c.key]}` : row[c.key])
                          : row[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Standings</h3>
          {isOngoing && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999, fontWeight: 700,
              background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              ● Live
            </span>
          )}
          {isFinished && <span className="badge badge-finished">Final</span>}
        </div>
        <button
          className="btn-outline"
          onClick={onRefresh}
          disabled={loading}
          style={{ fontSize: 12, padding: '4px 12px' }}
        >
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" />
        </div>
      ) : isEmpty ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {tournament.status === 'DRAFT'
              ? 'Start the round-robin to see standings.'
              : 'No finished matches yet. Standings will appear here as matches complete.'}
          </p>
        </div>
      ) : (
        <div>
          {categories.length > 0 ? (
            categories.map(cat => (
              <div key={cat.categoryId} style={{ marginBottom: 32 }}>
                <h3 style={{
                  fontSize: 16, fontWeight: 700, marginBottom: 16,
                  paddingBottom: 8, borderBottom: '2px solid var(--border)',
                  color: 'var(--text-primary)'
                }}>
                  {cat.categoryName}
                </h3>
                {cat.groups.map(g => renderTable(g.standings, g.code, cat.categoryId))}
              </div>
            ))
          ) : isOldStyle ? (
            oldStyleGroups.map(code => renderTable(leaderboard[code], code))
          ) : (
            renderTable(leaderboard, null)
          )}
          <div style={{
            padding: '8px 16px', display: 'flex', gap: 16, flexWrap: 'wrap',
            fontSize: 11, color: 'var(--text-faint)',
          }}>
            <span>🟢 Top 2 per group qualify for knockout</span>
            <span>·</span>
            <span title="Tournament Points">Pts = 2 per win</span>
            <span>·</span>
            <span>Sort: Pts → SD → PD → SW</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bracket Tab (knockout visualization) ───────────────────────────────────────
function BracketTab({ tournament, groupCategories, matches, isCommittee, onUpdate, showToast }) {
  const [knockoutPreview, setKnockoutPreview] = useState(null);

  // Fetch knockout schedule preview (times + courts)
  useEffect(() => {
    if (!tournament?.id) return;
    (async () => {
      try {
        const data = await apiClient.get(`/api/tournaments/${tournament.id}/knockout-preview`);
        setKnockoutPreview(data);
      } catch {
        setKnockoutPreview(null);
      }
    })();
  }, [tournament?.id]);

  const isPending = tournament.status === 'DRAFT' || tournament.currentStage === 'GROUP';
  const bracketsByCategory = [];

  // 1. Generate Placeholder Brackets
  if ((isPending || matches.length === 0) && groupCategories && groupCategories.length > 0) {
    groupCategories.forEach(cat => {
      if (!cat.groups) return;
      const gCodes = cat.groups.map(g => g.code).sort();
      if (gCodes.length < 1) return;

      const qualifiers = [];
      gCodes.forEach(code => {
        qualifiers.push({ group: code, rank: 1 });
        qualifiers.push({ group: code, rank: 2 });
      });

      const top = qualifiers.filter(q => q.rank === 1);
      const bot = qualifiers.filter(q => q.rank === 2).reverse();
      const seeded = [];
      for (let i = 0; i < Math.max(top.length, bot.length); i++) {
        if (i < top.length) seeded.push(top[i]);
        if (i < bot.length) seeded.push(bot[i]);
      }

      const bracketSize = Math.pow(2, Math.ceil(Math.log2(seeded.length)));
      while (seeded.length < bracketSize) {
        seeded.push(null);
      }

      const rounds = [];
      let currentRoundMatchCount = bracketSize / 2;
      let roundNum = 1;

      const LABELS = { 1: 'Final', 2: 'Semi-Finals', 4: 'Quarter-Finals', 8: 'Round of 16', 16: 'Round of 32' };

      // Round 1
      const r1 = [];
      for (let i = 0; i < currentRoundMatchCount; i++) {
        const h = seeded[i * 2];
        const a = seeded[i * 2 + 1];
        r1.push({
          id: `cat-${cat.categoryId}-r1-m${i}`,
          homeTeamName: h ? `Winner Grp ${h.group}` : 'BYE',
          awayTeamName: a ? `Runner Up Grp ${a.group}` : 'BYE',
          status: 'PENDING',
          isPlaceholder: true
        });
      }
      rounds.push({ label: LABELS[currentRoundMatchCount] || `Round of ${currentRoundMatchCount * 2}`, matches: r1 });

      // Subsequent rounds
      let prevCount = currentRoundMatchCount;
      roundNum++;
      while (prevCount > 1) {
        let nextCount = prevCount / 2;
        const rNext = [];
        for (let i = 0; i < nextCount; i++) {
          rNext.push({
            id: `cat-${cat.categoryId}-r${roundNum}-m${i}`,
            homeTeamName: 'TBD',
            awayTeamName: 'TBD',
            status: 'PENDING',
            isPlaceholder: true
          });
        }
        rounds.push({ label: LABELS[nextCount] || `Round of ${nextCount * 2}`, matches: rNext });
        prevCount = nextCount;
        roundNum++;
      }

      bracketsByCategory.push({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        rounds: rounds
      });
    });

    // Merge knockout-preview schedule data into placeholders
    if (knockoutPreview) {
      bracketsByCategory.forEach(bracket => {
        const preview = knockoutPreview[String(bracket.categoryId)];
        if (!preview) return;
        bracket.rounds.forEach((roundObj, rIdx) => {
          const previewRound = preview.rounds[rIdx];
          if (!previewRound) return;
          roundObj.matches.forEach((match, mIdx) => {
            const previewMatch = previewRound.matches[mIdx];
            if (!previewMatch) return;
            match.scheduledAt = previewMatch.scheduledAt;
            match.courtName = previewMatch.courtName;
          });
        });
      });
    }
  } else if (matches.length > 0) {
    // 2. Generate Real Bracket from Matches
    const catMap = {};
    matches.forEach(m => {
      const cid = m.categoryId || 1;
      if (!catMap[cid]) catMap[cid] = {};
      if (!catMap[cid][m.round]) catMap[cid][m.round] = [];
      catMap[cid][m.round].push(m);
    });

    Object.keys(catMap).forEach(cidStr => {
      const cid = parseInt(cidStr);
      const catInfo = tournament?.categories?.find(c => c.id === cid);
      const cName = catInfo ? catInfo.name : `Category ${cid}`;

      const roundMap = catMap[cid];
      const rounds = [];
      const sortedRounds = Object.keys(roundMap).map(Number).sort((a, b) => a - b);

      sortedRounds.forEach(r => {
        const rMatches = roundMap[r].sort((a, b) => a.bracketPosition - b.bracketPosition);
        const matchCount = rMatches.length;
        const LABELS = { 1: 'Final', 2: 'Semi-Finals', 4: 'Quarter-Finals', 8: 'Round of 16', 16: 'Round of 32' };

        rounds.push({
          label: LABELS[matchCount] || `Round of ${matchCount * 2}`,
          matches: rMatches
        });
      });

      bracketsByCategory.push({
        categoryId: cid,
        categoryName: cName,
        rounds: rounds
      });
    });
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>🏅 Category Brackets</h3>

      {bracketsByCategory.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          {isPending
            ? "Not enough groups to generate a knockout bracket."
            : "No knockout matches found."}
        </div>
      ) : (
        bracketsByCategory.map(bracket => (
          <div key={bracket.categoryId} className="card" style={{ marginBottom: 32, padding: 24 }}>
            <h4 style={{
              fontSize: 18, fontWeight: 700, marginBottom: 24,
              color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', paddingBottom: 12
            }}>
              {bracket.categoryName} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>(Knockout Stage)</span>
            </h4>

            <div style={{ display: 'flex', gap: 40, overflowX: 'auto', paddingBottom: 16, paddingRight: 40 }}>
              {bracket.rounds.map((roundObj, rIdx) => (
                <div key={rIdx} style={{ display: 'flex', flexDirection: 'column', minWidth: 260, flexShrink: 0, justifyContent: 'space-around', position: 'relative' }}>
                  <div style={{
                    textAlign: 'center', fontWeight: 600, color: '#8b5cf6', marginBottom: 24,
                    fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {roundObj.label}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'space-around' }}>
                    {roundObj.matches.map((match, mIdx) => {
                      const isBye = match.homeTeamName === 'BYE' || match.awayTeamName === 'BYE' || match.homeTeamId === match.awayTeamId;

                      return (
                        <div key={match.id || mIdx} style={{
                          position: 'relative',
                          background: 'var(--bg-card)',
                          border: match.isPlaceholder ? '1px dashed var(--border)' : '1px solid var(--border)',
                          borderRadius: 8,
                          padding: 12,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}>
                          {/* Top Team */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bg-subtle)' }}>
                            <span style={{ fontSize: 13, fontWeight: match.winnerTeamId === match.homeTeamId ? 700 : 500, color: match.isPlaceholder ? 'var(--text-faint)' : 'currentColor' }}>
                              {match.homeTeam?.name || match.homeTeamName || 'TBD'}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: match.winnerTeamId === match.homeTeamId ? '#16a34a' : 'currentColor' }}>
                              {match.homeScore ?? '-'}
                            </span>
                          </div>
                          {/* Bottom Team */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                            <span style={{ fontSize: 13, fontWeight: match.winnerTeamId === match.awayTeamId ? 700 : 500, color: match.isPlaceholder ? 'var(--text-faint)' : 'currentColor' }}>
                              {match.awayTeam?.name || match.awayTeamName || 'TBD'}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: match.winnerTeamId === match.awayTeamId ? '#16a34a' : 'currentColor' }}>
                              {match.awayScore ?? '-'}
                            </span>
                          </div>

                          {/* Schedule & Court Info — shown for both placeholders and real matches */}
                          {(match.scheduledAt || match.courtName || (!match.isPlaceholder && match.status)) && (
                            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', alignItems: 'center' }}>
                              {match.isPlaceholder
                                ? <span style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>Jadwal Prediksi</span>
                                : <StatusBadge status={match.status} />
                              }
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {match.courtName && (
                                  <span style={{ fontWeight: 600, fontSize: 11, color: match.isPlaceholder ? 'var(--text-faint)' : 'var(--text-primary)' }}>
                                    🏟 {match.courtName}
                                  </span>
                                )}
                                {match.scheduledAt && (
                                  <span style={{ fontSize: 10, color: match.isPlaceholder ? 'var(--text-faint)' : 'var(--text-muted)' }}>
                                    {new Date(match.scheduledAt).toLocaleString('id-ID', {
                                      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {isCommittee && match.status === 'SCHEDULED' && !isBye && !match.isPlaceholder && (
                            <div style={{ marginTop: 8 }}>
                              <MatchCard match={match} isCommittee={isCommittee} onUpdate={onUpdate} showToast={showToast} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TournamentManagement;
