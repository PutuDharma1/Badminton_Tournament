import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import participantsApi from '../api/participants';

function PlayerDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [myTournaments, setMyTournaments] = useState([]);
    const [availableTournaments, setAvailableTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [registering, setRegistering] = useState(null); // tournamentId being registered
    const [showRegisterModal, setShowRegisterModal] = useState(null); // tournament object

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch my tournaments and all tournaments in parallel
            const [myData, allData] = await Promise.all([
                participantsApi.getMyTournaments(),
                tournamentsApi.getTournaments()
            ]);

            setMyTournaments(myData);

            // Filter available tournaments: all tournaments not already joined
            const myTournamentIds = new Set(myData.map(t => t.id));
            const available = allData.filter(
                t => !myTournamentIds.has(t.id)
            );
            setAvailableTournaments(available);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (tournament) => {
        setRegistering(tournament.id);
        try {
            await participantsApi.selfRegister({
                tournamentId: tournament.id,
                categoryId: tournament.categories?.[0]?.id || null,
            });
            // Refresh data
            await fetchData();
            setShowRegisterModal(null);
        } catch (err) {
            alert(err.message || 'Registration failed');
        } finally {
            setRegistering(null);
        }
    };

    // Stats
    const stats = {
        joined: myTournaments.length,
        ongoing: myTournaments.filter(t => t.status === 'ONGOING').length,
        draft: myTournaments.filter(t => t.status === 'DRAFT').length,
        finished: myTournaments.filter(t => t.status === 'FINISHED').length,
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
                <h1 className="page-title">🏸 Player Dashboard</h1>
                <p className="page-subtitle">
                    Welcome, {user?.name}! Manage your tournaments and view your match schedule.
                </p>
            </div>

            {error && (
                <div className="alert-error">
                    <p style={{ margin: 0 }}>{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Tournaments Joined</span>
                        <span className="stat-chip" style={{ borderColor: '#3b82f6' }}>
                            Total
                        </span>
                    </div>
                    <div className="stat-value">{stats.joined}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Ongoing</span>
                        <span className="stat-chip" style={{ borderColor: '#f59e0b', color: '#fde047' }}>
                            Active
                        </span>
                    </div>
                    <div className="stat-value">{stats.ongoing}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Upcoming</span>
                        <span className="stat-chip">Draft</span>
                    </div>
                    <div className="stat-value">{stats.draft}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-label">Completed</span>
                        <span className="stat-chip" style={{ borderColor: '#22c55e', color: '#86efac' }}>
                            Done
                        </span>
                    </div>
                    <div className="stat-value">{stats.finished}</div>
                </div>
            </div>

            {/* My Tournaments Section */}
            <div style={{ marginTop: 32, marginBottom: 16 }}>
                <h2 className="section-title">📋 My Tournaments</h2>
            </div>

            {myTournaments.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 8 }}>
                        You are not registered in any tournament yet.
                    </p>
                    <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>
                        Check the available tournaments below to register.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {myTournaments.map(tournament => (
                        <MyTournamentCard
                            key={tournament.id}
                            tournament={tournament}
                            onView={() => navigate(`/tournament/${tournament.id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Available Tournaments Section */}
            <div style={{ marginTop: 40, marginBottom: 16 }}>
                <h2 className="section-title">🏆 Available Tournaments</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    List of tournaments created by organizers. You can register for tournaments that are still in DRAFT status.
                </p>
            </div>

            {availableTournaments.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
                        No tournaments available at this time.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {availableTournaments.map(tournament => (
                        <AvailableTournamentCard
                            key={tournament.id}
                            tournament={tournament}
                            onRegister={() => setShowRegisterModal(tournament)}
                            isRegistering={registering === tournament.id}
                        />
                    ))}
                </div>
            )}

            {/* Register Confirmation Modal */}
            {showRegisterModal && (
                <RegisterModal
                    tournament={showRegisterModal}
                    onConfirm={() => handleRegister(showRegisterModal)}
                    onClose={() => setShowRegisterModal(null)}
                    isLoading={registering === showRegisterModal.id}
                />
            )}
        </div>
    );
}


// ─── My Tournament Card ─────────────────────────────────────────────────────

function MyTournamentCard({ tournament, onView }) {
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
                <p style={{ margin: '4px 0' }}>📅 {new Date(tournament.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p style={{ margin: '4px 0' }}>👥 {tournament.participantCount || 0} participants</p>
            </div>

            {tournament.description && (
                <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 12, lineHeight: 1.4 }}>
                    {tournament.description.length > 80
                        ? tournament.description.substring(0, 80) + '...'
                        : tournament.description}
                </p>
            )}

            <button
                className="btn-primary"
                onClick={onView}
                style={{ width: '100%', fontSize: 13, padding: '8px 12px' }}
            >
                View Details
            </button>
        </div>
    );
}


// ─── Available Tournament Card ───────────────────────────────────────────────

function AvailableTournamentCard({ tournament, onRegister, isRegistering }) {
    const now = new Date();
    const deadlinePassed = tournament.registrationDeadline && new Date(tournament.registrationDeadline) < now;
    const canRegister = tournament.status === 'DRAFT' && !deadlinePassed;

    const statusConfig = {
        DRAFT: { badge: 'badge badge-scheduled', label: 'OPEN', canJoin: true },
        ONGOING: { badge: 'badge badge-ongoing', label: 'ONGOING', canJoin: false },
        FINISHED: { badge: 'badge badge-finished', label: 'FINISHED', canJoin: false },
    };
    const config = statusConfig[tournament.status] || statusConfig.DRAFT;

    return (
        <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, flex: 1 }}>{tournament.name}</h3>
                <span className={config.badge}>{config.label}</span>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                <p style={{ margin: '4px 0' }}>📍 {tournament.location}</p>
                <p style={{ margin: '4px 0' }}>📅 {new Date(tournament.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p style={{ margin: '4px 0' }}>👥 {tournament.participantCount || 0} registered participants</p>
                {tournament.registrationDeadline && (
                    <p style={{ margin: '4px 0', color: deadlinePassed ? '#f87171' : 'var(--text-muted)' }}>
                        ⏰ Registration deadline: {new Date(tournament.registrationDeadline).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(tournament.registrationDeadline).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>

            {tournament.description && (
                <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 12, lineHeight: 1.4 }}>
                    {tournament.description.length > 80
                        ? tournament.description.substring(0, 80) + '...'
                        : tournament.description}
                </p>
            )}

            {/* Categories */}
            {tournament.categories && tournament.categories.length > 0 && (
                <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tournament.categories.map(cat => (
                        <span key={cat.id} className="stat-chip" style={{ fontSize: 10 }}>
                            {cat.name}
                        </span>
                    ))}
                </div>
            )}

            {canRegister ? (
                <button
                    className="btn-primary"
                    onClick={onRegister}
                    disabled={isRegistering}
                    style={{ width: '100%', fontSize: 13, padding: '8px 12px', opacity: isRegistering ? 0.7 : 1 }}
                >
                    {isRegistering ? 'Registering...' : '✋ Register for Tournament'}
                </button>
            ) : (
                <button
                    className="btn-outline"
                    disabled
                    style={{ width: '100%', fontSize: 13, padding: '8px 12px', opacity: 0.6, cursor: 'not-allowed' }}
                >
                    {deadlinePassed ? '⏰ Registration Deadline Passed' : '🔒 Registration Closed'}
                </button>
            )}
        </div>
    );
}


// ─── Register Confirmation Modal ─────────────────────────────────────────────

function RegisterModal({ tournament, onConfirm, onClose, isLoading }) {
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
                    maxWidth: 440, width: '90%',
                    zIndex: 1000,
                }}
            >
                <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                    Confirm Registration
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                    You are about to register as a participant in the following tournament:
                </p>

                <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
                        {tournament.name}
                    </h3>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        <p style={{ margin: '4px 0' }}>📍 {tournament.location}</p>
                        <p style={{ margin: '4px 0' }}>
                            📅 {new Date(tournament.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {' — '}
                            {new Date(tournament.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p style={{ margin: '4px 0' }}>👥 {tournament.participantCount || 0} registered participants</p>
                    </div>
                </div>

                <div style={{
                    padding: 12,
                    background: 'var(--status-scheduled-bg)',
                    border: '1px solid var(--status-scheduled-border)',
                    borderRadius: 8,
                    marginBottom: 20,
                }}>
                    <p style={{ fontSize: 12, color: 'var(--status-scheduled-text)', margin: 0 }}>
                        ℹ️ Your profile data (name, date of birth, gender) will be used for registration.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="btn-primary"
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{ flex: 1, opacity: isLoading ? 0.7 : 1 }}
                    >
                        {isLoading ? 'Registering...' : '✅ Yes, Register Now'}
                    </button>
                    <button
                        className="btn-outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
}


export default PlayerDashboard;
