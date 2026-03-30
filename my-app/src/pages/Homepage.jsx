import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import tournamentsApi from '../api/tournaments';
import { MapPin, Calendar, Users, Target, User, Scale, ArrowRight } from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  DRAFT:    { label: 'Draft',    accent: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  dot: '#3b82f6' },
  ONGOING:  { label: 'Ongoing',  accent: '#c2410c', bg: 'rgba(194,65,12,0.08)',   dot: '#f97316' },
  FINISHED: { label: 'Finished', accent: '#15803d', bg: 'rgba(21,128,61,0.08)',   dot: '#22c55e' },
};

const darkStatusCfg = {
  DRAFT:    { accent: '#93c5fd', bg: 'rgba(96,165,250,0.1)',   dot: '#60a5fa' },
  ONGOING:  { accent: '#fdba74', bg: 'rgba(251,146,60,0.1)',   dot: '#f97316' },
  FINISHED: { accent: '#86efac', bg: 'rgba(34,197,94,0.08)',   dot: '#22c55e' },
};

// ─── Quick action card ────────────────────────────────────────────────────────
function ActionCard({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border)',
        borderRadius: 13,
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        textAlign: 'left',
        boxShadow: 'var(--shadow-card)',
        flex: '1 1 200px',
        minWidth: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{
        width: 40, height: 40,
        borderRadius: 10,
        background: 'rgba(var(--accent-rgb), 0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
    </button>
  );
}

// ─── Tournament Card ──────────────────────────────────────────────────────────
function TournamentCard({ tournament, onClick }) {
  const isDark = document.documentElement.classList.contains('dark');
  const statusKey = tournament.status || 'DRAFT';
  const base = STATUS_CFG[statusKey] || STATUS_CFG.DRAFT;
  const dk   = darkStatusCfg[statusKey] || darkStatusCfg.DRAFT;
  const accent = isDark ? dk.accent : base.accent;
  const bg     = isDark ? dk.bg     : base.bg;
  const dot    = isDark ? dk.dot    : base.dot;

  const startDate = tournament.startDate
    ? new Date(tournament.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <article
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 14,
        padding: '18px 18px 16px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 16, fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          margin: 0, flex: 1,
          lineHeight: 1.25,
        }}>
          {tournament.name}
        </h3>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 10.5,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 6,
          background: bg,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
          {base.label}
        </span>
      </div>

      {/* Meta info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <MapPin size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Calendar size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{startDate}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Users size={13} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
          <span>{tournament.participantCount || 0} participants</span>
        </div>
      </div>

      {/* Description */}
      {tournament.description && (
        <p style={{
          fontSize: 12.5,
          color: 'var(--text-faint)',
          margin: 0,
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {tournament.description}
        </p>
      )}

      {/* CTA */}
      <div style={{
        marginTop: 2,
        paddingTop: 12,
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 13, fontWeight: 600,
          color: 'var(--accent)',
          letterSpacing: '0.01em',
        }}>
          View details <ArrowRight size={14} />
        </span>
      </div>
    </article>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
function FilterTabs({ filter, onChange, counts }) {
  const tabs = [
    { key: 'all',      label: 'All',      count: counts.all },
    { key: 'ongoing',  label: 'Ongoing',  count: counts.ongoing },
    { key: 'draft',    label: 'Draft',    count: counts.draft },
    { key: 'finished', label: 'Finished', count: counts.finished },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: 4,
      borderBottom: '1.5px solid var(--border)',
      marginBottom: 24,
      overflowX: 'auto',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            background: 'none',
            border: 'none',
            borderBottom: filter === tab.key
              ? '2px solid var(--accent)'
              : '2px solid transparent',
            marginBottom: '-1.5px',
            cursor: 'pointer',
            fontSize: 13.5,
            fontWeight: filter === tab.key ? 600 : 500,
            fontFamily: 'var(--font-body)',
            color: filter === tab.key ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'color 0.2s ease, border-color 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {tab.label}
          <span style={{
            padding: '1px 6px',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 600,
            background: filter === tab.key ? 'rgba(var(--accent-rgb), 0.12)' : 'var(--bg-subtle)',
            color: filter === tab.key ? 'var(--accent)' : 'var(--text-faint)',
          }}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Homepage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, hasRole } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setTournaments(await tournamentsApi.getTournaments());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = {
    all:      tournaments.length,
    ongoing:  tournaments.filter(t => t.status === 'ONGOING').length,
    draft:    tournaments.filter(t => t.status === 'DRAFT').length,
    finished: tournaments.filter(t => t.status === 'FINISHED').length,
  };

  const filtered = filter === 'all'
    ? tournaments
    : tournaments.filter(t => t.status === filter.toUpperCase());

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="main-content">

      {/* ── Hero header ── */}
      <div style={{ marginBottom: 32 }}>
        {isAuthenticated ? (
          <>
            <p style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: '0 0 8px',
            }}>
              Welcome back
            </p>
            <h1 className="page-title">{user?.name}</h1>
            <p className="page-subtitle" style={{ marginTop: 6 }}>
              Here's what's happening across all tournaments.
            </p>
          </>
        ) : (
          <>
            <h1 className="page-title">Badminton Tournaments</h1>
            <p className="page-subtitle" style={{ marginTop: 6 }}>
              Browse upcoming and live tournaments. Sign in to register.
            </p>
          </>
        )}
      </div>

      {/* ── Quick actions ── */}
      {isAuthenticated && (
        <div style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-faint)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Quick Actions
          </div>
          <div className="stagger-in" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {hasRole('COMMITTEE') && (
              <ActionCard
                icon={<Target size={20} />}
                label="Committee Dashboard"
                description="Manage tournaments & schedule"
                onClick={() => navigate('/committee')}
              />
            )}
            {hasRole('PLAYER') && (
              <ActionCard
                icon={<Users size={20} />}
                label="My Tournaments"
                description="View your registrations"
                onClick={() => navigate('/player')}
              />
            )}
            {hasRole('REFEREE') && (
              <ActionCard
                icon={<Scale size={20} />}
                label="Referee Dashboard"
                description="Manage your assigned matches"
                onClick={() => navigate('/referee')}
              />
            )}
            <ActionCard
              icon={<User size={20} />}
              label="My Profile"
              description="View and update your info"
              onClick={() => navigate('/profile')}
            />
          </div>
        </div>
      )}

      {/* ── Tournaments section ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <h2 className="section-title">Tournaments</h2>
        {counts.all > 0 && (
          <span style={{
            fontSize: 12,
            color: 'var(--text-faint)',
            fontWeight: 500,
          }}>
            {counts.all} total
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <FilterTabs filter={filter} onChange={setFilter} counts={counts} />

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '56px 24px',
          background: 'var(--bg-card)',
          borderRadius: 14,
          border: '1.5px dashed var(--border)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'var(--bg-subtle)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-faint)',
          }}>
            <Calendar size={24} />
          </div>
          <p style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 17, fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 6,
          }}>
            No {filter === 'all' ? '' : filter + ' '}tournaments
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 20 }}>
            {filter === 'all'
              ? "No tournaments have been created yet."
              : `There are no ${filter} tournaments right now.`}
          </p>
          {!isAuthenticated && (
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Sign In to Get Started
            </button>
          )}
          {isAuthenticated && hasRole('COMMITTEE') && filter !== 'all' && (
            <button className="btn-outline" onClick={() => setFilter('all')}>
              View all tournaments
            </button>
          )}
        </div>
      ) : (
        <div className="stagger-in" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 14,
        }}>
          {filtered.map(t => (
            <TournamentCard
              key={t.id}
              tournament={t}
              onClick={() => navigate(`/tournament/${t.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
