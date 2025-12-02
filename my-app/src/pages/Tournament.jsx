import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import matchesApi from '../api/matches';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';

function TournamentManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // UI State
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const data = await tournamentsApi.getTournamentById(id);
      setTournament(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoundRobin = async () => {
    const participantCount = tournament.participants?.length || 0;

    if (participantCount < 3) {
      showToast(`Round-robin requires at least 3 players. You currently have ${participantCount} players.`, 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Start Round-Robin',
      message: `Are you sure you want to start round-robin matching with ${participantCount} players? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await tournamentsApi.startRoundRobin(tournament.id);
          showToast('Round-robin started successfully!', 'success');
          fetchTournament();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
          showToast(err.message, 'error');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleUpdateTournament = async (updates) => {
    try {
      const updated = await tournamentsApi.updateTournament(tournament.id, updates);
      setTournament(updated);
      setShowEditModal(false);
      showToast('Tournament updated successfully!', 'success');
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
          <button className="btn-primary" onClick={() => navigate('/committee')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCommittee = hasRole('COMMITTEE');
  const participantCount = tournament.participants?.length || 0;
  const matchCount = tournament.matches?.length || 0;
  const canStartRoundRobin = tournament.status === 'DRAFT' && participantCount >= 3;
  const registrationClosed = tournament.registrationDeadline && new Date(tournament.registrationDeadline) < new Date();

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/committee')}
          style={{
            background: 'none',
            border: 'none',
            color: '#60a5fa',
            cursor: 'pointer',
            fontSize: 14,
            marginBottom: 8,
            padding: 0
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h1 className="page-title">{tournament.name}</h1>
            <p className="page-subtitle">
              {tournament.location} • {new Date(tournament.startDate).toLocaleDateString()}
            </p>
          </div>

          {isCommittee && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline" onClick={() => setShowEditModal(true)}>
                Edit
              </button>
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
        padding: 16,
        borderRadius: 12,
        background: tournament.status === 'ONGOING' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        border: tournament.status === 'ONGOING' ? '1px solid #f59e0b' : '1px solid #60a5fa',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>Status: </span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{tournament.status}</span>
          </div>
          {registrationClosed && (
            <span style={{ fontSize: 13, color: '#f87171' }}>
              Registration closed on {new Date(tournament.registrationDeadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Participants</span>
          </div>
          <div className="stat-value">{participantCount}</div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            {participantCount >= 3 ? '✓ Ready for round-robin' : `Need ${3 - participantCount} more`}
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Matches</span>
          </div>
          <div className="stat-value">{matchCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Courts</span>
          </div>
          <div className="stat-value">{tournament.courts || 0}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #334155', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {['overview', 'participants', 'matches'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 0',
                color: activeTab === tab ? '#60a5fa' : '#9ca3af',
                borderBottom: activeTab === tab ? '2px solid #60a5fa' : 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {tab} {tab === 'participants' && `(${participantCount})`} {tab === 'matches' && `(${matchCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Tournament Details</h3>
          <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
            <div>
              <span style={{ color: '#9ca3af' }}>Description:</span>{' '}
              <span>{tournament.description || 'No description'}</span>
            </div>
            <div>
              <span style={{ color: '#9ca3af' }}>Start Date:</span>{' '}
              <span>{new Date(tournament.startDate).toLocaleDateString()}</span>
            </div>
            {tournament.endDate && (
              <div>
                <span style={{ color: '#9ca3af' }}>End Date:</span>{' '}
                <span>{new Date(tournament.endDate).toLocaleDateString()}</span>
              </div>
            )}
            {tournament.registrationDeadline && (
              <div>
                <span style={{ color: '#9ca3af' }}>Registration Deadline:</span>{' '}
                <span>{new Date(tournament.registrationDeadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Participant List</h3>
            {isCommittee && !registrationClosed && (
              <button className="btn-primary" onClick={() => setShowAddPlayerModal(true)}>
                + Add Player
              </button>
            )}
          </div>

          {participantCount === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#9ca3af' }}>No participants yet</p>
            </div>
          ) : (
            <div className="card">
              <table style={{ width: '100%', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: '#9ca3af', fontWeight: 500 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: '#9ca3af', fontWeight: 500 }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: '#9ca3af', fontWeight: 500 }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '8px 0', color: '#9ca3af', fontWeight: 500 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.participants.map((participant, index) => (
                    <tr key={participant.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px 0' }}>{index + 1}</td>
                      <td style={{ padding: '12px 0' }}>
                        {participant.user?.name || participant.offlineName || 'Unknown'}
                      </td>
                      <td style={{ padding: '12px 0' }}>
                        <span style={{
                          fontSize: 12,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: participant.userId ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                          color: participant.userId ? '#bbf7d0' : '#cbd5e1'
                        }}>
                          {participant.userId ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0' }}>
                        <span style={{ color: participant.isActive ? '#22c55e' : '#9ca3af' }}>
                          {participant.isActive ? 'Active' : 'Inactive'}
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

      {activeTab === 'matches' && (
        <MatchesTab
          tournament={tournament}
          isCommittee={isCommittee}
          canStartRoundRobin={canStartRoundRobin}
          onStartRoundRobin={handleStartRoundRobin}
          onUpdate={fetchTournament}
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
            fetchTournament();
            showToast('Player added successfully!', 'success');
          }}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}

// Matches Tab Component
function MatchesTab({ tournament, isCommittee, canStartRoundRobin, onStartRoundRobin, onUpdate }) {
  const matchCount = tournament.matches?.length || 0;

  if (matchCount === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#9ca3af', marginBottom: 16 }}>No matches scheduled yet</p>
        {canStartRoundRobin && (
          <button className="btn-primary" onClick={onStartRoundRobin}>
            Generate Round-Robin Matches
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Match Schedule</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        {tournament.matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            isCommittee={isCommittee}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

// Match Card Component
function MatchCard({ match, isCommittee, onUpdate }) {
  const [showRefereeModal, setShowRefereeModal] = useState(false);
  const [editingScore, setEditingScore] = useState(false);
  const [homeScore, setHomeScore] = useState(match.homeScore || '');
  const [awayScore, setAwayScore] = useState(match.awayScore || '');
  const [updating, setUpdating] = useState(false);

  const handleSaveScore = async () => {
    try {
      setUpdating(true);
      await matchesApi.updateScore(match.id, homeScore, awayScore);
      setEditingScore(false);
      onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const statusColors = {
    SCHEDULED: { bg: 'rgba(59, 130, 246, 0.1)', border: '#60a5fa', text: '#bfdbfe' },
    ONGOING: { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#fde047' },
    FINISHED: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#bbf7d0' },
  };

  const status = statusColors[match.status] || statusColors.SCHEDULED;

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Match #{match.id}</span>
          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '4px 0' }}>
            {match.homeTeam?.user?.name || match.homeTeam?.offlineName || 'TBD'}
            {' vs '}
            {match.awayTeam?.user?.name || match.awayTeam?.offlineName || 'TBD'}
          </h4>
        </div>
        <span style={{
          fontSize: 11,
          padding: '3px 8px',
          borderRadius: 999,
          background: status.bg,
          border: `1px solid ${status.border}`,
          color: status.text,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {match.status}
        </span>
      </div>

      {/* Score Display/Edit */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        {editingScore ? (
          <>
            <input
              type="number"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="form-input"
              style={{ width: 60, padding: '4px 8px', fontSize: 14 }}
              placeholder="0"
            />
            <span>-</span>
            <input
              type="number"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="form-input"
              style={{ width: 60, padding: '4px 8px', fontSize: 14 }}
              placeholder="0"
            />
            <button
              className="btn-primary"
              onClick={handleSaveScore}
              disabled={updating}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              {updating ? 'Saving...' : 'Save'}
            </button>
            <button
              className="btn-outline"
              onClick={() => {
                setEditingScore(false);
                setHomeScore(match.homeScore || '');
                setAwayScore(match.awayScore || '');
              }}
              style={{ fontSize: 12, padding: '4px 12px' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {match.homeScore !== null ? match.homeScore : '-'} - {match.awayScore !== null ? match.awayScore : '-'}
            </div>
            {isCommittee && match.status !== 'FINISHED' && (
              <button
                className="btn-outline"
                onClick={() => setEditingScore(true)}
                style={{ fontSize: 12, padding: '4px 12px' }}
              >
                Edit Score
              </button>
            )}
          </>
        )}
      </div>

      {/* Referee Assignment */}
      <div style={{ fontSize: 13, color: '#9ca3af' }}>
        <span>Referee: </span>
        {match.referee ? (
          <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{match.referee.name}</span>
        ) : (
          <span style={{ color: '#f87171' }}>Not assigned</span>
        )}
        {isCommittee && !match.referee && (
          <button
            className="btn-outline"
            onClick={() => setShowRefereeModal(true)}
            style={{ fontSize: 11, padding: '2px 8px', marginLeft: 8 }}
          >
            Assign
          </button>
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
        />
      )}
    </div>
  );
}

// Referee Assign Modal
function RefereeAssignModal({ matchId, onClose, onSuccess }) {
  const [referees, setReferees] = useState([]);
  const [selectedReferee, setSelectedReferee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReferees();
  }, []);

  const fetchReferees = async () => {
    try {
      const data = await matchesApi.getAvailableReferees();
      setReferees(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedReferee) {
      alert('Please select a referee');
      return;
    }

    try {
      setSaving(true);
      await matchesApi.assignReferee(matchId, selectedReferee.id);
      onSuccess();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', zIndex: 999 }} />

      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', zIndex: 1000 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Assign Referee</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div className="spinner"></div>
          </div>
        ) : referees.length === 0 ? (
          <p style={{ color: '#9ca3af', marginBottom: 16 }}>No referees available</p>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {referees.map(referee => (
              <div
                key={referee.id}
                onClick={() => setSelectedReferee(referee)}
                style={{
                  padding: 12,
                  background: selectedReferee?.id === referee.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                  border: selectedReferee?.id === referee.id ? '1px solid #60a5fa' : '1px solid #334155',
                  borderRadius: 8,
                  marginBottom: 8,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>{referee.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{referee.email}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-primary"
            onClick={handleAssign}
            disabled={!selectedReferee || saving}
            style={{ flex: 1, opacity: (!selectedReferee || saving) ? 0.5 : 1 }}
          >
            {saving ? 'Assigning...' : 'Assign Referee'}
          </button>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// Edit Tournament Modal
function EditTournamentModal({ tournament, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: tournament.name,
    location: tournament.location,
    startDate: tournament.startDate,
    endDate: tournament.endDate || '',
    registrationDeadline: tournament.registrationDeadline || '',
    description: tournament.description || '',
    courts: tournament.courts || 4,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', zIndex: 999 }} />

      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto', zIndex: 1000 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Edit Tournament</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" name="location" className="form-input" value={formData.location} onChange={handleChange} disabled={loading} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" name="startDate" className="form-input" value={formData.startDate} onChange={handleChange} disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="date" name="endDate" className="form-input" value={formData.endDate} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registration Deadline</label>
            <input type="date" name="registrationDeadline" className="form-input" value={formData.registrationDeadline} onChange={handleChange} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Courts</label>
            <input type="number" name="courts" className="form-input" min="1" value={formData.courts} onChange={handleChange} disabled={loading} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-input" rows="3" value={formData.description} onChange={handleChange} disabled={loading} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Add Player Modal
function AddPlayerModal({ tournament, onClose, onSuccess }) {
  const [tab, setTab] = useState('online');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', zIndex: 999 }} />

      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 24, maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto', zIndex: 1000 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Add Player</h2>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
          Add a player to this tournament
        </p>

        {error && (
          <div style={{ padding: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 16 }}>
            <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #334155', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => setTab('online')}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 0',
                color: tab === 'online' ? '#60a5fa' : '#9ca3af',
                borderBottom: tab === 'online' ? '2px solid #60a5fa' : 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Online Registration
            </button>
            <button
              onClick={() => setTab('offline')}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 0',
                color: tab === 'offline' ? '#60a5fa' : '#9ca3af',
                borderBottom: tab === 'offline' ? '2px solid #60a5fa' : 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Offline Registration
            </button>
          </div>
        </div>

        {tab === 'online' ? (
          <OnlineRegistrationForm
            tournament={tournament}
            onSuccess={onSuccess}
            onError={setError}
            loading={loading}
            setLoading={setLoading}
          />
        ) : (
          <OfflineRegistrationForm
            tournament={tournament}
            onSuccess={onSuccess}
            onError={setError}
            loading={loading}
            setLoading={setLoading}
          />
        )}

        <button
          className="btn-outline"
          onClick={onClose}
          disabled={loading}
          style={{ width: '100%', marginTop: 16 }}
        >
          Cancel
        </button>
      </div>
    </>
  );
}

// Online Registration Form
function OnlineRegistrationForm({ tournament, onSuccess, onError, loading, setLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      onError('');
      const { participantsApi } = await import('../api/participants');
      const results = await participantsApi.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      onError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedUser) {
      onError('Please select a player');
      return;
    }

    try {
      setLoading(true);
      const { participantsApi } = await import('../api/participants');
      await participantsApi.addOnlineParticipant(tournament.id, selectedUser.id);
      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Search User</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />
          <button className="btn-outline" onClick={handleSearch} disabled={searching || loading}>
            {searching ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div style={{ marginBottom: 16, maxHeight: 150, overflow: 'auto', border: '1px solid #334155', borderRadius: 8 }}>
          {searchResults.map(user => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: selectedUser?.id === user.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderBottom: '1px solid #1e293b'
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{user.email}</div>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleAddPlayer}
        disabled={loading || !selectedUser}
        style={{ width: '100%' }}
      >
        {loading ? 'Adding...' : 'Add Selected Player'}
      </button>
    </div>
  );
}

// Offline Registration Form
function OfflineRegistrationForm({ tournament, onSuccess, onError, loading, setLoading }) {
  const [formData, setFormData] = useState({
    offlineName: '',
    offlineBirthDate: '',
    offlineGender: 'MALE',
    offlinePhone: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.offlineName || !formData.offlineBirthDate) {
      onError('Name and Birth Date are required');
      return;
    }

    try {
      setLoading(true);
      const { participantsApi } = await import('../api/participants');
      await participantsApi.addOfflineParticipant(tournament.id, formData);
      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Full Name</label>
        <input
          type="text"
          name="offlineName"
          className="form-input"
          value={formData.offlineName}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Birth Date</label>
        <input
          type="date"
          name="offlineBirthDate"
          className="form-input"
          value={formData.offlineBirthDate}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Gender</label>
        <select
          name="offlineGender"
          className="form-input"
          value={formData.offlineGender}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Phone (Optional)</label>
        <input
          type="text"
          name="offlinePhone"
          className="form-input"
          value={formData.offlinePhone}
          onChange={handleChange}
          disabled={loading}
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Adding...' : 'Add Offline Player'}
      </button>
    </div>
  );
}

export default TournamentManagement;