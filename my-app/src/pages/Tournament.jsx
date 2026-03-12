import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import matchesApi from '../api/matches';
import participantsApi from '../api/participants';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';

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
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [knockoutMatches, setKnockoutMatches] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
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
    const day = new Date(m.scheduledAt).toLocaleDateString();
    if (!matchesByDay[day]) matchesByDay[day] = [];
    matchesByDay[day].push(m);
  });
  const dayKeys = Object.keys(matchesByDay).sort((a, b) => new Date(a) - new Date(b));
  const totalDays = dayKeys.length;
  const clampedDay = Math.min(selectedDay, Math.max(1, totalDays));
  const currentDayMatches = matchesByDay[dayKeys[clampedDay - 1]] || [];

  // Check if all group matches are finished (for knockout generation)
  const allGroupFinished = matches.length > 0 && matches.every(m => m.status === 'FINISHED');

  // Build tab list dynamically
  const tabs = ['overview', 'participants'];
  if (isOngoing || isFinished) {
    tabs.push('groups', 'matches', 'leaderboard');
    if (currentStage === 'KNOCKOUT' || knockoutMatches.length > 0) {
      tabs.push('bracket');
    }
  }

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
          style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 14, marginBottom: 8, padding: 0 }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">{tournament.name}</h1>
            <p className="page-subtitle">
              📍 {tournament.location} &nbsp;•&nbsp; 📅 {new Date(tournament.startDate).toLocaleDateString()}
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
        background: isOngoing ? 'var(--status-ongoing-bg)' : isFinished ? 'var(--status-finished-bg)' : 'var(--status-scheduled-bg)',
        border: isOngoing ? '1px solid var(--status-ongoing-border)' : isFinished ? '1px solid var(--status-finished-border)' : '1px solid var(--status-scheduled-border)',
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
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
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
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', padding: '12px 0',
                color: activeTab === tab ? 'var(--text-link)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--text-link)' : '2px solid transparent',
                cursor: 'pointer', fontSize: 14, fontWeight: 500, textTransform: 'capitalize',
                whiteSpace: 'nowrap',
              }}
            >
              {tab === 'leaderboard' ? '🏆 Leaderboard' : tab === 'bracket' ? '🏅 Bracket' : tab}
              {tab === 'participants' && ` (${participantCount})`}
              {tab === 'matches' && ` (${matchCount})`}
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
              {tournament.categories?.length > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Categories: </span>
                  {tournament.categories.map(c => c.name).join(', ')}
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
              <p style={{ color: '#9ca3af', marginBottom: 16 }}>No participants yet.</p>
              {isCommittee && !isOngoing && (
                <button className="btn-primary" onClick={() => setShowAddPlayerModal(true)}>Add First Player</button>
              )}
            </div>
          ) : (
            <div className="card">
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500, width: 40 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>Gender</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>Category</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af', fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontFamily: 'monospace', fontSize: 12,
                          background: 'rgba(96,165,250,0.1)', color: '#93c5fd',
                          padding: '2px 6px', borderRadius: 4,
                        }}>P-{String(p.id).padStart(3, '0')}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                        {p.fullName || p.user?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {p.gender?.toLowerCase() || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                        {p.categoryId ? `Cat. ${p.categoryId}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: p.isActive ? '#22c55e' : '#9ca3af', fontSize: 12 }}>
                          {p.isActive ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <GroupsTab groups={groups} loading={groupsLoading} />
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
          matches={knockoutMatches}
          isCommittee={isCommittee}
          onUpdate={fetchKnockoutMatches}
          showToast={showToast}
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

      {showAddPlayerModal && (
        <AddPlayerModal
          tournament={tournament}
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
        <p style={{ color: '#9ca3af', marginBottom: 8 }}>No matches scheduled yet.</p>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
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

  // Group by group_code within the current day
  const byGroup = {};
  matches.forEach(m => {
    const g = m.groupCode || '?';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(m);
  });
  const groupCodes = Object.keys(byGroup).sort();

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
          <p style={{ color: '#9ca3af' }}>No matches on this day.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {groupCodes.map(code => (
            <div key={code}>
              <h4 style={{
                fontSize: 14, fontWeight: 600, marginBottom: 10,
                padding: '4px 12px', borderRadius: 6,
                background: 'rgba(96,165,250,0.1)', color: '#60a5fa',
                display: 'inline-block',
              }}>
                Group {code}
              </h4>
              <div style={{ display: 'grid', gap: 14 }}>
                {byGroup[code].map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isCommittee={isCommittee}
                    onUpdate={onUpdate}
                    showToast={showToast}
                  />
                ))}
              </div>
            </div>
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
            {match.court && ` · ${match.court.name}`}
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
              color: isWinnerHome ? '#16a34a' : isWinnerAway ? '#9ca3af' : 'currentColor'
            }}>
              {isWinnerHome && '🏆 '}{homeTeamName}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>vs</span>
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: isWinnerAway ? '#16a34a' : isWinnerHome ? '#9ca3af' : 'currentColor'
            }}>
              {isWinnerAway && '🏆 '}{awayTeamName}
            </span>
          </div>
        </div>
        <StatusBadge status={match.status} />
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
            Sets won: <strong style={{ color: 'var(--text-link)' }}>{match.homeScore}</strong>
            {' – '}
            <strong style={{ color: 'var(--text-link)' }}>{match.awayScore}</strong>
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
            <span style={{ fontSize: 12, color: '#60a5fa', textAlign: 'center', fontWeight: 600 }}>{homeTeamName}</span>
            <div></div>
            <span style={{ fontSize: 12, color: '#60a5fa', textAlign: 'center', fontWeight: 600 }}>{awayTeamName}</span>
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
                background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer',
                fontSize: 12, marginLeft: 8, padding: 0, textDecoration: 'underline',
              }}
            >
              {match.referee ? 'Change' : 'Assign'}
            </button>
          )}
        </div>

        {/* Action buttons */}
        {isCommittee && match.status !== 'FINISHED' && (
          <div style={{ display: 'flex', gap: 8 }}>
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

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: 16, padding: 24,
        maxWidth: 380, width: '90%', zIndex: 1000,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Assign Referee</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner"></div></div>
        ) : referees.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>No referees available.</p>
        ) : (
          <div style={{ marginBottom: 16, maxHeight: 200, overflow: 'auto', display: 'grid', gap: 8 }}>
            {referees.map(r => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                style={{
                  padding: 12, borderRadius: 8, cursor: 'pointer',
                  border: selected?.id === r.id ? '1px solid var(--text-link)' : '1px solid var(--border)',
                  background: selected?.id === r.id ? 'var(--status-scheduled-bg)' : 'var(--bg-subtle)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.email}</div>
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
    </>
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

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: 16, padding: 24,
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
    </>
  );
}

// ─── Add Player Modal ───────────────────────────────────────────────────────────
function AddPlayerModal({ tournament, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    birthDate: '',
    gender: 'MALE',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName || !formData.birthDate) {
      setError('Full Name and Birth Date are required.');
      return;
    }

    try {
      setLoading(true);
      await participantsApi.addParticipant(tournament.id, {
        fullName: formData.fullName,
        birthDate: new Date(formData.birthDate).toISOString(),
        gender: formData.gender,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--modal-bg)', border: '1px solid var(--modal-border)', borderRadius: 16, padding: 24,
        maxWidth: 460, width: '90%', maxHeight: '90vh', overflow: 'auto', zIndex: 1000,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Add Player</h2>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
          Register a participant for this tournament.
        </p>

        {error && (
          <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 16 }}>
            <p style={{ color: '#f87171', fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text" className="form-input" placeholder="Player full name"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Birth Date *</label>
              <input
                type="date" className="form-input"
                value={formData.birthDate}
                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select
                className="form-input"
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                disabled={loading}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input
                type="email" className="form-input" placeholder="player@email.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input
                type="text" className="form-input" placeholder="+62..."
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button
              type="submit" className="btn-primary" disabled={loading}
              style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Adding...' : 'Add Player'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Groups Tab ─────────────────────────────────────────────────────────────────
function GroupsTab({ groups, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text-muted)' }}>Groups will appear here after the tournament starts.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Group Assignments</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
        {groups.map(group => (
          <div key={group.code} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(96,165,250,0.1)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#60a5fa' }}>
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
        ))}
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

  // leaderboard is now { A: [...], B: [...] } or an old-style array
  const isGrouped = leaderboard && !Array.isArray(leaderboard);
  const groupCodes = isGrouped ? Object.keys(leaderboard).sort() : [];
  const displayGroups = selectedGroup
    ? [selectedGroup]
    : groupCodes.length > 0
      ? groupCodes
      : [];

  const isEmpty = isGrouped
    ? Object.values(leaderboard).every(arr => arr.length === 0)
    : Array.isArray(leaderboard) && leaderboard.length === 0;

  const renderTable = (rows, groupCode) => {
    if (!rows || rows.length === 0) return null;
    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        {groupCode && (
          <div style={{
            padding: '8px 16px',
            background: 'rgba(96,165,250,0.1)',
            borderBottom: '1px solid var(--border)',
            fontSize: 14, fontWeight: 700, color: '#60a5fa',
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
                    color: c.highlight ? 'var(--text-link)' : 'var(--table-header-text)',
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
                          ? 'var(--text-link)'
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

      {/* Group filter */}
      {groupCodes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedGroup(null)}
            style={{
              padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: !selectedGroup ? '1px solid var(--round-btn-border-active)' : '1px solid var(--round-btn-border)',
              background: !selectedGroup ? 'var(--round-btn-bg-active)' : 'var(--round-btn-bg)',
              color: !selectedGroup ? 'var(--round-btn-text-active)' : 'var(--round-btn-text)',
            }}
          >
            All Groups
          </button>
          {groupCodes.map(code => (
            <button
              key={code}
              onClick={() => setSelectedGroup(code)}
              style={{
                padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                border: selectedGroup === code ? '1px solid var(--round-btn-border-active)' : '1px solid var(--round-btn-border)',
                background: selectedGroup === code ? 'var(--round-btn-bg-active)' : 'var(--round-btn-bg)',
                color: selectedGroup === code ? 'var(--round-btn-text-active)' : 'var(--round-btn-text)',
              }}
            >
              Group {code}
            </button>
          ))}
        </div>
      )}

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
          {isGrouped ? (
            displayGroups.map(code => renderTable(leaderboard[code], code))
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
function BracketTab({ matches, isCommittee, onUpdate, showToast }) {
  if (!matches || matches.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--text-muted)' }}>Knockout bracket will appear here after group stage completes.</p>
      </div>
    );
  }

  // Group matches by round label (group_code = QF/SF/F/R16/etc.)
  const byRound = {};
  matches.forEach(m => {
    const label = m.groupCode || `R${m.round}`;
    if (!byRound[label]) byRound[label] = [];
    byRound[label].push(m);
  });

  // Order: R32 → R16 → QF → SF → F
  const ORDER = ['R32', 'R16', 'QF', 'SF', 'F'];
  const LABELS = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-Finals', SF: 'Semi-Finals', F: 'Final' };
  const roundLabels = Object.keys(byRound).sort((a, b) => {
    const ai = ORDER.indexOf(a);
    const bi = ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>🏅 Knockout Bracket</h3>
      <div style={{ display: 'flex', gap: 32, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {roundLabels.map(label => (
          <div key={label} style={{ minWidth: 280, flexShrink: 0 }}>
            <h4 style={{
              fontSize: 13, fontWeight: 700, marginBottom: 12,
              padding: '4px 10px', borderRadius: 6,
              background: label === 'F' ? 'rgba(250,204,21,0.15)' : 'rgba(139,92,246,0.1)',
              color: label === 'F' ? '#ca8a04' : '#8b5cf6',
              display: 'inline-block', textTransform: 'uppercase',
            }}>
              {LABELS[label] || label}
            </h4>
            <div style={{ display: 'grid', gap: 12 }}>
              {byRound[label].map(match => {
                const isBye = match.homeTeamName === match.awayTeamName && match.status === 'FINISHED';
                return (
                  <div
                    key={match.id}
                    className="card"
                    style={{
                      padding: 12, borderRadius: 10,
                      border: match.status === 'FINISHED'
                        ? '1px solid #22c55e'
                        : match.status === 'ONGOING'
                          ? '1px solid #f59e0b'
                          : '1px solid var(--border)',
                      opacity: isBye ? 0.6 : 1,
                    }}
                  >
                    {isBye && (
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>BYE</div>
                    )}
                    {/* Home team */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0',
                      fontWeight: match.winnerTeamId === match.homeTeamId ? 700 : 400,
                      color: match.winnerTeamId === match.homeTeamId ? '#22c55e' : 'currentColor',
                    }}>
                      <span style={{ fontSize: 13 }}>{match.homeTeam?.name || 'TBD'}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>
                        {match.homeScore ?? '-'}
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--table-row-border)' }} />

                    {/* Away team */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 0',
                      fontWeight: match.winnerTeamId === match.awayTeamId ? 700 : 400,
                      color: match.winnerTeamId === match.awayTeamId ? '#22c55e' : 'currentColor',
                    }}>
                      <span style={{ fontSize: 13 }}>{match.awayTeam?.name || 'TBD'}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>
                        {match.awayScore ?? '-'}
                      </span>
                    </div>

                    {/* Status / Court */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-faint)' }}>
                      <StatusBadge status={match.status} />
                      {match.courtName && <span>🏟 {match.courtName}</span>}
                    </div>

                    {/* Committee actions for scheduled knockout matches */}
                    {isCommittee && match.status === 'SCHEDULED' && !isBye && (
                      <div style={{ marginTop: 8 }}>
                        <MatchCard
                          match={match}
                          isCommittee={isCommittee}
                          onUpdate={onUpdate}
                          showToast={showToast}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TournamentManagement;
