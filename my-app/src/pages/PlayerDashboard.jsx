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

    const handleRegister = async (tournament, categoryId, partnerEmail) => {
        setRegistering(tournament.id);
        try {
            const payload = {
                tournamentId: tournament.id,
                categoryId: categoryId || tournament.categories?.[0]?.id || null,
            };
            if (partnerEmail) {
                payload.partnerEmail = partnerEmail;
            }
            await participantsApi.selfRegister(payload);
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
                    user={user}
                    onConfirm={(categoryId, partnerEmail) => handleRegister(showRegisterModal, categoryId, partnerEmail)}
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

function RegisterModal({ tournament, user, onConfirm, onClose, isLoading }) {
    // Filter categories based on user gender
    const validCategories = (tournament.categories || []).filter(cat => 
        cat.gender === 'MIXED' || (user?.gender && cat.gender.toUpperCase() === user.gender.toUpperCase())
    );

    const isCatFull = (cat) => cat.maxParticipants && (cat.participantCount || 0) >= cat.maxParticipants;
    const availableCategories = validCategories.filter(cat => !isCatFull(cat));

    const [selectedCategoryId, setSelectedCategoryId] = useState(
        availableCategories.length > 0 ? availableCategories[0].id : ''
    );

    // Partner email state for doubles
    const [partnerEmail, setPartnerEmail] = useState('');
    const [partnerInfo, setPartnerInfo] = useState(null); // { id, name, email, gender }
    const [partnerError, setPartnerError] = useState('');
    const [verifyingPartner, setVerifyingPartner] = useState(false);

    // Determine if selected category is DOUBLE
    const selectedCategory = validCategories.find(cat => cat.id === Number(selectedCategoryId));
    const isDoubles = selectedCategory?.categoryType === 'DOUBLE';

    // Reset partner state when category changes
    const handleCategoryChange = (newCategoryId) => {
        setSelectedCategoryId(Number(newCategoryId));
        setPartnerEmail('');
        setPartnerInfo(null);
        setPartnerError('');
    };

    // Verify partner email
    const handleVerifyPartner = async () => {
        if (!partnerEmail.trim()) {
            setPartnerError('Please enter partner email');
            return;
        }
        setVerifyingPartner(true);
        setPartnerError('');
        setPartnerInfo(null);
        try {
            const result = await participantsApi.lookupPartner(partnerEmail.trim(), tournament.id);
            setPartnerInfo(result);
        } catch (err) {
            setPartnerError(err.message || 'Partner not found');
        } finally {
            setVerifyingPartner(false);
        }
    };

    // Can register?
    const canRegister = availableCategories.length > 0 && selectedCategoryId && (!isDoubles || partnerInfo);

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
                    maxWidth: 480, width: '90%',
                    zIndex: 1000,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
            >
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>
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

                {validCategories.length > 0 ? (
                    <>
                        {/* Category selector */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text)' }}>
                                Select Category
                            </label>
                            <select
                                className="input-field"
                                value={selectedCategoryId}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                {validCategories.map(cat => {
                                    const full = isCatFull(cat);
                                    return (
                                        <option key={cat.id} value={cat.id} disabled={full}>
                                            {cat.name} ({cat.gender} • {cat.categoryType})
                                            {cat.maxParticipants ? ` — ${cat.participantCount || 0}/${cat.maxParticipants}` : ''}
                                            {full ? ' [FULL]' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            {availableCategories.length === 0 && (
                                <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>
                                    All eligible categories are full.
                                </p>
                            )}
                        </div>

                        {/* Partner email section for DOUBLES */}
                        {isDoubles && (
                            <div style={{
                                marginBottom: 20,
                                padding: 16,
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                            }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
                                    🤝 Partner Registration
                                </label>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, marginTop: 0 }}>
                                    Enter your partner's email to register as a doubles pair.
                                </p>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="partner@email.com"
                                        value={partnerEmail}
                                        onChange={(e) => {
                                            setPartnerEmail(e.target.value);
                                            if (partnerInfo) {
                                                setPartnerInfo(null);
                                            }
                                            if (partnerError) {
                                                setPartnerError('');
                                            }
                                        }}
                                        disabled={verifyingPartner || isLoading}
                                        style={{ flex: 1 }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleVerifyPartner();
                                            }
                                        }}
                                    />
                                    <button
                                        className="btn-outline"
                                        onClick={handleVerifyPartner}
                                        disabled={verifyingPartner || !partnerEmail.trim() || isLoading}
                                        style={{
                                            whiteSpace: 'nowrap',
                                            padding: '8px 16px',
                                            fontSize: 13,
                                            opacity: (verifyingPartner || !partnerEmail.trim()) ? 0.6 : 1,
                                        }}
                                    >
                                        {verifyingPartner ? '⏳ Checking...' : '🔍 Verify'}
                                    </button>
                                </div>

                                {/* Partner error */}
                                {partnerError && (
                                    <div style={{
                                        marginTop: 10,
                                        padding: '8px 12px',
                                        background: 'var(--danger-bg)',
                                        border: '1px solid var(--danger-border)',
                                        borderRadius: 8,
                                    }}>
                                        <p style={{ fontSize: 12, color: 'var(--danger-text)', margin: 0 }}>
                                            ❌ {partnerError}
                                        </p>
                                    </div>
                                )}

                                {/* Partner found card */}
                                {partnerInfo && (
                                    <div style={{
                                        marginTop: 10,
                                        padding: '10px 14px',
                                        background: 'var(--status-finished-bg)',
                                        border: '1px solid var(--status-finished-border)',
                                        borderRadius: 8,
                                    }}>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-finished-text)', margin: '0 0 4px' }}>
                                            ✅ Partner Found
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>
                                            <strong>Name:</strong> {partnerInfo.name}
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>
                                            <strong>Gender:</strong> {partnerInfo.gender || 'Not set'}
                                        </p>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0' }}>
                                            <strong>Email:</strong> {partnerInfo.email}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="alert-error" style={{ marginBottom: 20 }}>
                        <p style={{ margin: 0, fontSize: 13 }}>
                            There are no suitable categories available for your gender ({user?.gender || 'Unknown'}).
                        </p>
                    </div>
                )}

                <div style={{
                    padding: 12,
                    background: 'var(--status-scheduled-bg)',
                    border: '1px solid var(--status-scheduled-border)',
                    borderRadius: 8,
                    marginBottom: 20,
                }}>
                    <p style={{ fontSize: 12, color: 'var(--status-scheduled-text)', margin: 0 }}>
                        ℹ️ Your profile data (name, date of birth, gender: {user?.gender}) will be used for registration.
                        {isDoubles && partnerInfo && (
                            <> Your team will be registered as <strong>"{user?.name?.split(' ').pop()} / {partnerInfo.name.split(' ').pop()}"</strong>.</>
                        )}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="btn-primary"
                        onClick={() => onConfirm(selectedCategoryId, isDoubles && partnerInfo ? partnerEmail.trim() : null)}
                        disabled={isLoading || !canRegister}
                        style={{ flex: 1, opacity: (isLoading || !canRegister) ? 0.7 : 1 }}
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
