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
        <div className="main-content">
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
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    marginBottom: 16
                }}>
                    <p style={{ color: '#dc2626', margin: 0, fontSize: 14 }}>{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Total Tournaments</span>
                    </div>
                    <div className="stat-value">{stats.total}</div>
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
        DRAFT: { bg: 'rgba(59, 130, 246, 0.12)', border: '#60a5fa', text: '#bfdbfe' },
        ONGOING: { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: '#fde047' },
        FINISHED: { bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', text: '#bbf7d0' },
    };

    const status = statusColors[tournament.status] || statusColors.DRAFT;

    return (
        <div className="card" style={{ padding: 16 }}>
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
                    }}
                >
                    {tournament.status}
                </span>
            </div>

            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
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

        // Validation
        if (!formData.name || !formData.location || !formData.startDate) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            const newTournament = await tournamentsApi.createTournament({
                ...formData,
                createdById: user.id,
            });
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
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 999,
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 16,
                    padding: 24,
                    maxWidth: 500,
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    zIndex: 1000,
                }}
            >
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Create New Tournament</h2>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
                    Set up a new badminton tournament
                </p>

                {error && (
                    <div style={{ padding: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 16 }}>
                        <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Tournament Name *</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="Spring Championship 2024"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Location *</label>
                        <input
                            type="text"
                            name="location"
                            className="form-input"
                            placeholder="GOR Senayan, Jakarta"
                            value={formData.location}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Start Date *</label>
                            <input
                                type="date"
                                name="startDate"
                                className="form-input"
                                value={formData.startDate}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                className="form-input"
                                value={formData.endDate}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Registration Deadline</label>
                        <input
                            type="date"
                            name="registrationDeadline"
                            className="form-input"
                            value={formData.registrationDeadline}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Number of Courts</label>
                        <input
                            type="number"
                            name="courts"
                            className="form-input"
                            min="1"
                            value={formData.courts}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            name="description"
                            className="form-input"
                            rows="3"
                            placeholder="Tournament description..."
                            value={formData.description}
                            onChange={handleChange}
                            disabled={loading}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Creating...' : 'Create Tournament'}
                        </button>
                        <button
                            type="button"
                            className="btn-outline"
                            onClick={onClose}
                            disabled={loading}
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
