import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import participantsApi from '../api/participants';
import { MapPin, Calendar, Users, Clock } from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  DRAFT:    { label: 'Draft',    accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  dot: '#3b82f6' },
  ONGOING:  { label: 'Ongoing',  accent: '#c2410c', bg: 'rgba(194,65,12,0.08)',   dot: '#f97316' },
  FINISHED: { label: 'Finished', accent: '#15803d', bg: 'rgba(21,128,61,0.08)',   dot: '#22c55e' },
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Tournament Card (for joined) ─────────────────────────────────────────────
function TournamentCard({ tournament, onView }) {
  const isDark = document.documentElement.classList.contains('dark');
  const statusKey = tournament.status || 'DRAFT';
  const cfg = STATUS_CFG[statusKey] || STATUS_CFG.DRAFT;
  const accent = cfg.accent;
  const bg = cfg.bg;

  const startDate = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <article style={{
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: 'var(--shadow-card)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 15, fontWeight: 700,
          color: 'var(--text-primary)', margin: 0, flex: 1, lineHeight: 1.3,
        }}>
          {tournament.name}
        </h3>
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 6,
          background: bg, color: accent,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          whiteSpace: 'nowrap', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
          {cfg.label}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <MapPin size={12} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <Calendar size={12} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{startDate}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <Users size={12} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.participantCount || 0} participants</span>
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        <button
          className="btn-primary"
          onClick={onView}
          style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
        >
          View Details
        </button>
      </div>
    </article>
  );
}

// ─── Available Tournament Card ────────────────────────────────────────────────
function AvailableTournamentCard({ tournament, onRegister, isRegistering }) {
  const now = new Date();
  const deadlinePassed = tournament.registrationDeadline && new Date(tournament.registrationDeadline) < now;
  const canRegister = tournament.status === 'DRAFT' && !deadlinePassed;

  const startDate = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const deadline = tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  return (
    <article style={{
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border)',
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: 'var(--shadow-card)',
      opacity: canRegister ? 1 : 0.7,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 15, fontWeight: 700,
          color: 'var(--text-primary)', margin: 0, flex: 1, lineHeight: 1.3,
        }}>
          {tournament.name}
        </h3>
        {canRegister ? (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(34,197,94,0.1)', color: '#22c55e',
            textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Open
          </span>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: 'var(--bg-subtle)', color: 'var(--text-faint)',
            textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Closed
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <MapPin size={12} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <Calendar size={12} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{startDate}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <Users size={12} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.participantCount || 0} registered</span>
        </div>
        {deadline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: deadlinePassed ? '#f87171' : 'var(--text-muted)' }}>
            <Clock size={12} style={{ flexShrink: 0, color: deadlinePassed ? '#f87171' : 'var(--text-faint)' }} />
            <span>Deadline: {deadline}</span>
          </div>
        )}
      </div>

      {/* Category tags */}
      {tournament.categories && tournament.categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {tournament.categories.slice(0, 4).map(cat => (
            <span key={cat.id} style={{
              fontSize: 10, fontWeight: 600,
              padding: '2px 7px', borderRadius: 5,
              background: 'var(--bg-subtle)', color: 'var(--text-faint)',
            }}>
              {cat.name}
            </span>
          ))}
          {tournament.categories.length > 4 && (
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>+{tournament.categories.length - 4} more</span>
          )}
        </div>
      )}

      <div style={{ marginTop: 2 }}>
        {canRegister ? (
          <button
            className="btn-primary"
            onClick={onRegister}
            disabled={isRegistering}
            style={{ width: '100%', padding: '8px 12px', fontSize: 13 }}
          >
            {isRegistering ? 'Registering…' : 'Register Now'}
          </button>
        ) : (
          <button
            className="btn-outline"
            disabled
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, opacity: 0.5, cursor: 'not-allowed' }}
          >
            {deadlinePassed ? 'Deadline Passed' : 'Registration Closed'}
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Register Modal ───────────────────────────────────────────────────────────
function RegisterModal({ tournament, user, onConfirm, onClose, isLoading }) {
  const playerAge = (() => {
    const bd = user?.birthDate || user?.birth_date;
    if (!bd) return null;
    const today = new Date();
    const d = new Date(bd);
    let age = today.getFullYear() - d.getFullYear();
    if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
    return age;
  })();

  const gender = user?.gender;

  const eligibleCategories = tournament.categories?.filter(cat => {
    if (playerAge !== null && cat.minAge && playerAge < cat.minAge) return false;
    if (playerAge !== null && cat.maxAge && playerAge > cat.maxAge) return false;
    if (gender && cat.gender && cat.gender !== 'MIXED' && cat.gender !== gender) return false;
    return true;
  }) || [];

  const [selectedCategoryId, setSelectedCategoryId] = useState(eligibleCategories[0]?.id || '');
  const [partnerEmail, setPartnerEmail] = useState('');

  const selectedCat = tournament.categories?.find(c => c.id === parseInt(selectedCategoryId));
  const isDoubles = selectedCat?.categoryType === 'DOUBLE';
  const isFull = selectedCat?.maxParticipants && (selectedCat?.currentParticipants || 0) >= selectedCat.maxParticipants;

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border)',
        borderRadius: 16,
        padding: '24px 24px 20px',
        width: '100%', maxWidth: 420,
        boxShadow: 'var(--shadow-modal)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              Register
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{tournament.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 18, lineHeight: 1, padding: 2 }}>✕</button>
        </div>

        {eligibleCategories.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🚫</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              No categories match your profile (age: {playerAge ?? '?'}, gender: {gender ?? '?'}).
            </p>
          </div>
        ) : (
          <>
            {playerAge !== null && (
              <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 14, padding: '7px 12px', background: 'var(--bg-subtle)', borderRadius: 7 }}>
                Your profile: {playerAge} years old · {gender || 'Unknown gender'}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
                {eligibleCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} — {cat.type}
                    {cat.maxParticipants ? ` (${cat.currentParticipants || 0}/${cat.maxParticipants})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {isDoubles && (
              <div className="form-group">
                <label className="form-label">Partner Email</label>
                <input
                  type="email" className="form-input"
                  placeholder="partner@example.com"
                  value={partnerEmail}
                  onChange={e => setPartnerEmail(e.target.value)}
                />
                <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                  Your partner must already have an account.
                </p>
              </div>
            )}

            {isFull && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12.5, color: '#ef4444', marginBottom: 12 }}>
                This category is full.
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn-primary"
                onClick={() => onConfirm(selectedCategoryId ? parseInt(selectedCategoryId) : null, partnerEmail || undefined)}
                disabled={isLoading || isFull || !selectedCategoryId}
                style={{ flex: 1, padding: '9px 14px', fontSize: 13 }}
              >
                {isLoading ? 'Registering…' : 'Confirm Registration'}
              </button>
              <button
                className="btn-outline"
                onClick={onClose}
                disabled={isLoading}
                style={{ padding: '9px 14px', fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function PlayerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myTournaments, setMyTournaments] = useState([]);
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [myData, allData] = await Promise.all([
        participantsApi.getMyTournaments(),
        tournamentsApi.getTournaments(),
      ]);
      setMyTournaments(myData);
      const myIds = new Set(myData.map(t => t.id));
      setAvailableTournaments(allData.filter(t => !myIds.has(t.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (tournament, categoryId, partnerEmail) => {
    setRegistering(tournament.id);
    try {
      const payload = { tournamentId: tournament.id, categoryId: categoryId || tournament.categories?.[0]?.id || null };
      if (partnerEmail) payload.partnerEmail = partnerEmail;
      await participantsApi.selfRegister(payload);
      await fetchData();
      setShowRegisterModal(null);
    } catch (err) {
      alert(err.message || 'Registration failed');
    } finally {
      setRegistering(null);
    }
  };

  const [cityFilter, setCityFilter] = useState('');

  const stats = {
    joined:   myTournaments.length,
    ongoing:  myTournaments.filter(t => t.status === 'ONGOING').length,
    upcoming: myTournaments.filter(t => t.status === 'DRAFT').length,
    finished: myTournaments.filter(t => t.status === 'FINISHED').length,
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="main-content">

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Player Portal
        </p>
        <h1 className="page-title">{user?.name}</h1>
        <p className="page-subtitle" style={{ marginTop: 6 }}>
          Track your tournaments and register for new ones.
        </p>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* ── Stats ── */}
      <div className="stat-grid" style={{ marginBottom: 36 }}>
        <StatCard label="Joined" value={stats.joined} sub="tournaments" />
        <StatCard label="Ongoing" value={stats.ongoing} sub="active now" />
        <StatCard label="Upcoming" value={stats.upcoming} sub="in draft" />
        <StatCard label="Completed" value={stats.finished} sub="finished" />
      </div>

      {/* ── My Tournaments ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="section-title">My Tournaments</h2>
        {myTournaments.length > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{myTournaments.length} total</span>
        )}
      </div>

      {myTournaments.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '40px 24px',
          background: 'var(--bg-card)', borderRadius: 14,
          border: '1.5px dashed var(--border)', marginBottom: 36,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-subtle)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
            <Calendar size={22} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            No tournaments yet
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
            Register below to join your first tournament.
          </p>
        </div>
      ) : (
        <div className="stagger-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 40 }}>
          {myTournaments.map(t => (
            <TournamentCard key={t.id} tournament={t} onView={() => navigate(`/tournament/${t.id}`)} />
          ))}
        </div>
      )}

      {/* ── Available Tournaments ── */}
      {(() => {
        const availCities = [...new Set(availableTournaments.map(t => t.location).filter(Boolean))].sort();
        const filteredAvail = cityFilter
          ? availableTournaments.filter(t => t.location === cityFilter)
          : availableTournaments;
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <h2 className="section-title">Available to Join</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {availCities.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                    <select
                      value={cityFilter}
                      onChange={e => setCityFilter(e.target.value)}
                      style={{
                        fontSize: 12.5, padding: '5px 10px', borderRadius: 7,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text-primary)',
                        cursor: 'pointer', outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="">All Cities</option>
                      {availCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
                {availableTournaments.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {filteredAvail.length}{cityFilter ? `/${availableTournaments.length}` : ''} tournaments
                  </span>
                )}
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              Tournaments open for registration. Only DRAFT tournaments accept new players.
            </p>
            {filteredAvail.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 24px',
                background: 'var(--bg-card)', borderRadius: 14,
                border: '1.5px dashed var(--border)',
              }}>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                  {cityFilter ? `No tournaments in ${cityFilter}.` : 'No tournaments available right now.'}
                </p>
                {cityFilter && (
                  <button className="btn-outline" onClick={() => setCityFilter('')} style={{ marginTop: 12, fontSize: 12 }}>
                    View all cities
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {filteredAvail.map(t => (
                  <AvailableTournamentCard
                    key={t.id}
                    tournament={t}
                    onRegister={() => setShowRegisterModal(t)}
                    isRegistering={registering === t.id}
                  />
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* ── Register Modal ── */}
      {showRegisterModal && (
        <RegisterModal
          tournament={showRegisterModal}
          user={user}
          onConfirm={(catId, partnerEmail) => handleRegister(showRegisterModal, catId, partnerEmail)}
          onClose={() => setShowRegisterModal(null)}
          isLoading={registering === showRegisterModal.id}
        />
      )}
    </div>
  );
}

export default PlayerDashboard;
