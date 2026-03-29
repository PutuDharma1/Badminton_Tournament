import React, { useState, useEffect } from 'react';
import participantsApi from '../api/participants';

const ROLE_CFG = {
  PLAYER:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Player' },
  COMMITTEE: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Committee' },
  REFEREE:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Referee' },
  ADMIN:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Admin' },
};

function Peserta() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const results = await participantsApi.searchUsers(debouncedQuery);
        setPlayers(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQuery]);

  const initials = (name) => {
    if (!name) return 'U';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  return (
    <div className="main-content">

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Directory
        </p>
        <h1 className="page-title">Players Directory</h1>
        <p className="page-subtitle" style={{ marginTop: 6 }}>
          Browse all registered users in the system.
        </p>
      </div>

      {/* ── Search ── */}
      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: 'var(--text-faint)', pointerEvents: 'none',
          }}>
            🔍
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* ── Results ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <div className="spinner" />
        </div>
      ) : players.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--bg-card)', borderRadius: 14,
          border: '1.5px dashed var(--border)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>👤</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {query ? 'No results found' : 'No users registered'}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
            {query ? `No users match "${query}"` : 'Users will appear here once registered.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 12 }}>
            {players.length} {players.length === 1 ? 'user' : 'users'} found
          </div>
          <div style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}>
            {players.map((p, idx) => {
              const role = ROLE_CFG[p.role] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: p.role };
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 18px',
                    borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: role.color,
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {initials(p.name)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 1 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.email}
                    </div>
                  </div>

                  {/* Role badge */}
                  <span style={{
                    fontSize: 10.5, fontWeight: 700,
                    padding: '3px 8px', borderRadius: 5,
                    background: role.bg, color: role.color,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}>
                    {role.label}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default Peserta;
