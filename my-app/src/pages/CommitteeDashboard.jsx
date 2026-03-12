import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';

function CommitteeDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [error, setError] = useState('');

    // Fetch tournaments on mount
    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            setLoading(true);
            const data = await tournamentsApi.getTournaments();
            setTournaments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const stats = {
        total: tournaments.length,
        draft: tournaments.filter(t => t.status === 'DRAFT').length,
        ongoing: tournaments.filter(t => t.status === 'ONGOING').length,
        totalParticipants: tournaments.reduce((sum, t) => sum + (t.participantCount || 0), 0),
    };

    const handleCreateTournament = () => {
        setShowCreateModal(true);
    };

    const handleDeleteTournament = async (tournamentId) => {
        if (!confirm('Are you sure you want to delete this tournament?')) return;

        try {
            await tournamentsApi.deleteTournament(tournamentId);
            setTournaments(tournaments.filter(t => t.id !== tournamentId));
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="main-content-wide">
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 className="page-title">Committee Dashboard</h1>
                <p className="page-subtitle">
                    Welcome back, {user?.name}! Manage your tournaments and participants.
                </p>
            </div>

            {error && (
                <div style={{
                    padding: 12,
                    backgroundColor: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 8,
                    marginBottom: 16
                }}>
                    <p style={{ color: 'var(--danger-text)', margin: 0, fontSize: 14 }}>{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Ongoing</span>
                        <span
                            className="stat-chip text-amber-700 dark:text-[#fde047]"
                            style={{ borderColor: '#f59e0b' }}
                        >
                            Active
                        </span>
                    </div>
                    <div className="stat-value">{stats.ongoing}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Draft</span>
                        <span className="stat-chip">Planning</span>
                    </div>
                    <div className="stat-value">{stats.draft}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Ongoing</span>
                        <span className="stat-chip" style={{ borderColor: '#f59e0b', color: '#fde047' }}>Active</span>
                    </div>
                    <div className="stat-value">{stats.ongoing}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Total Players</span>
                    </div>
                    <div className="stat-value">{stats.totalParticipants}</div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 32, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title" style={{ margin: 0 }}>My Tournaments</h2>
                <button className="btn-primary" onClick={handleCreateTournament}>
                    + Create Tournament
                </button>
            </div>

            {/* Tournaments List */}
            {tournaments.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: '#9ca3af', marginBottom: 16 }}>No tournaments yet.</p>
                    <button className="btn-primary" onClick={handleCreateTournament}>
                        Create Your First Tournament
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {tournaments.map(tournament => (
                        <TournamentCard
                            key={tournament.id}
                            tournament={tournament}
                            onView={() => navigate(`/tournament/${tournament.id}`)}
                            onDelete={() => handleDeleteTournament(tournament.id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Tournament Modal */}
            {showCreateModal && (
                <CreateTournamentModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(newTournament) => {
                        setTournaments([...tournaments, newTournament]);
                        setShowCreateModal(false);
                        navigate(`/tournament/${newTournament.id}`);
                    }}
                />
            )}
        </div>
    );
}

// Tournament Card Component
function TournamentCard({ tournament, onView, onDelete }) {
    const statusColors = {
        DRAFT: { bg: 'var(--status-scheduled-bg)', border: 'var(--status-scheduled-border)', text: 'var(--status-scheduled-text)' },
        ONGOING: { bg: 'var(--status-ongoing-bg)', border: 'var(--status-ongoing-border)', text: 'var(--status-ongoing-text)' },
        FINISHED: { bg: 'var(--status-finished-bg)', border: 'var(--status-finished-border)', text: 'var(--status-finished-text)' },
    };

    const status = statusColors[tournament.status] || statusColors.DRAFT;

    return (
        <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>{tournament.name}</h3>
                <span
                    className="text-slate-700 dark:text-white" /* <-- Tambahkan class Tailwind ini */
                    style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: status.bg,
                        border: `1px solid ${status.border}`,
                        color: status.text,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: '600'
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

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button
                    className="btn-primary"
                    onClick={onView}
                    style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
                >
                    Manage
                </button>
                <button
                    className="btn-outline"
                    onClick={onDelete}
                    style={{ fontSize: 13, padding: '6px 12px', color: '#f87171', borderColor: '#f87171' }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

// Create Tournament Modal Component
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
        // Schedule settings
        dailyStartTime: '09:00',
        dailyEndTime: '18:00',
        matchDurationMinutes: 40,
        breakStartTime: '',
        breakEndTime: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.location || !formData.startDate || !formData.endDate) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            // 1. Create the tournament
            const newTournament = await tournamentsApi.createTournament({
                name: formData.name,
                location: formData.location,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
                description: formData.description,
                createdById: user.id,
                // Registration deadline
                registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString() : null,
                // Schedule settings
                dailyStartTime: formData.dailyStartTime || '09:00',
                dailyEndTime: formData.dailyEndTime || '18:00',
                matchDurationMinutes: parseInt(formData.matchDurationMinutes) || 40,
                breakStartTime: formData.breakStartTime || null,
                breakEndTime: formData.breakEndTime || null,
            });

            // 2. Auto-create courts for this tournament (required by the scheduler)
            const courtCount = Math.max(1, parseInt(formData.courts) || 4);
            try {
                await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/courts/bulk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    },
                    body: JSON.stringify({
                        tournamentId: newTournament.id,
                        count: courtCount,
                        locationNote: formData.location,
                    }),
                });
            } catch {
                // Courts creation failure is non-fatal — can be added manually later
                console.warn('Court auto-creation failed; courts can be added manually.');
            }

            onSuccess(newTournament);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 999,
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--modal-bg)',
                    border: '1px solid var(--modal-border)',
                    borderRadius: 16,
                    padding: 24,
                    maxWidth: 500, width: '90%',
                    maxHeight: '90vh', overflow: 'auto',
                    zIndex: 1000,
                }}
            >
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Create New Tournament</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
                    Set up a new badminton tournament
                </p>

                {error && (
                    <div style={{ padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 6, marginBottom: 16 }}>
                        <p style={{ color: '#f87171', fontSize: 14, margin: 0 }}>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Tournament Name *</label>
                        <input
                            type="text" name="name" className="form-input"
                            placeholder="Spring Championship 2025"
                            value={formData.name} onChange={handleChange} disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Location *</label>
                        <input
                            type="text" name="location" className="form-input"
                            placeholder="GOR Senayan, Jakarta"
                            value={formData.location} onChange={handleChange} disabled={loading}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Start Date *</label>
                            <input
                                type="date" name="startDate" className="form-input"
                                value={formData.startDate} onChange={handleChange} disabled={loading}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date *</label>
                            <input
                                type="date" name="endDate" className="form-input"
                                value={formData.endDate} onChange={handleChange} disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Registration Deadline</label>
                        <input
                            type="datetime-local" name="registrationDeadline" className="form-input"
                            value={formData.registrationDeadline} onChange={handleChange} disabled={loading}
                        />
                        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                            Optional. Players cannot register after this date and time.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Number of Courts</label>
                        <input
                            type="number" name="courts" className="form-input"
                            min="1" max="20"
                            value={formData.courts} onChange={handleChange} disabled={loading}
                        />
                        <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                            Courts will be auto-created and are required for scheduling matches.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            name="description" className="form-input" rows="3"
                            placeholder="Tournament description..."
                            value={formData.description} onChange={handleChange}
                            disabled={loading} style={{ resize: 'vertical' }}
                        />
                    </div>

                    {/* ── Schedule Settings ── */}
                    <div style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: 16, marginTop: 4
                    }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                            🕐 Schedule Settings
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Daily Start Time</label>
                                <input
                                    type="time" name="dailyStartTime" className="form-input"
                                    value={formData.dailyStartTime} onChange={handleChange} disabled={loading}
                                />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Daily End Time</label>
                                <input
                                    type="time" name="dailyEndTime" className="form-input"
                                    value={formData.dailyEndTime} onChange={handleChange} disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: 12, marginBottom: 12 }}>
                            <label className="form-label">Match Duration (minutes)</label>
                            <input
                                type="number" name="matchDurationMinutes" className="form-input"
                                min="15" max="120" step="5"
                                value={formData.matchDurationMinutes} onChange={handleChange} disabled={loading}
                            />
                            <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                                Estimated time per match. Used by the scheduler to space match slots.
                            </p>
                        </div>

                        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
                            Break / Lunch (optional)
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Break Start</label>
                                <input
                                    type="time" name="breakStartTime" className="form-input"
                                    value={formData.breakStartTime} onChange={handleChange} disabled={loading}
                                    placeholder="e.g. 12:00"
                                />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Break End</label>
                                <input
                                    type="time" name="breakEndTime" className="form-input"
                                    value={formData.breakEndTime} onChange={handleChange} disabled={loading}
                                    placeholder="e.g. 13:00"
                                />
                            </div>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>
                            Leave blank for no break. The scheduler will skip this window.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                        <button
                            type="submit" className="btn-primary" disabled={loading}
                            style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Creating...' : 'Create Tournament'}
                        </button>
                        <button
                            type="button" className="btn-outline"
                            onClick={onClose} disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

export default CommitteeDashboard;

