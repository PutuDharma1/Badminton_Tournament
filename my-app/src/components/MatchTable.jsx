import { useState, useEffect } from 'react';

const STATUS_MAP = {
  FINISHED:  { label: 'Finished',   cls: 'badge-finished'  },
  ONGOING:   { label: 'In Progress', cls: 'badge-ongoing'  },
  SCHEDULED: { label: 'Scheduled',   cls: 'badge-scheduled' },
};

function MatchTable() {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/matches/`
        );
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setMatches(data.data || data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, []);

  if (isLoading) {
    return (
      <div className="card" aria-busy="true" aria-label="Loading matches">
        {/* Header skeleton */}
        <div style={{ marginBottom: 16 }}>
          <div className="skeleton" style={{ height: 20, width: 220, borderRadius: 6 }} />
        </div>
        {/* Row skeletons */}
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 80px 1fr 60px 1fr 90px',
            gap: 12, padding: '10px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            {[0, 1, 2, 3, 4, 5].map(j => (
              <div key={j} className="skeleton" style={{ height: 14, borderRadius: 4 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert-error" role="alert" style={{ marginBottom: 0 }}>
          Failed to load matches: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 className="section-title">Match Schedule &amp; Results</h3>
        <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
          aria-label="Match schedule and results"
        >
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-subtle)', zIndex: 1 }}>
              {['Category', 'Round', 'Team 1', 'Score', 'Team 2', 'Status'].map(h => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--table-header-text)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: 'var(--text-faint)',
                    fontSize: 13,
                  }}
                >
                  No matches scheduled yet.
                </td>
              </tr>
            ) : (
              matches.map((m, idx) => {
                const statusInfo = STATUS_MAP[m.status] || STATUS_MAP.SCHEDULED;
                const home1Won = m.winnerTeamId && m.winnerTeamId === m.homeTeamId;
                const away1Won = m.winnerTeamId && m.winnerTeamId === m.awayTeamId;

                return (
                  <tr
                    key={m.id}
                    style={{
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(var(--accent-rgb), 0.02)',
                      borderBottom: '1px solid var(--table-row-border)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(var(--accent-rgb), 0.02)'; }}
                  >
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {m.category?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {m.round || '—'}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      color: 'var(--text-primary)',
                      fontWeight: home1Won ? 700 : 400,
                    }}>
                      {home1Won && <span style={{ color: 'var(--accent)', marginRight: 4 }} aria-label="Winner">●</span>}
                      {m.homeTeam?.name || '—'}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {m.status === 'FINISHED' ? `${m.homeScore ?? 0} – ${m.awayScore ?? 0}` : '—'}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      color: 'var(--text-primary)',
                      fontWeight: away1Won ? 700 : 400,
                    }}>
                      {away1Won && <span style={{ color: 'var(--accent)', marginRight: 4 }} aria-label="Winner">●</span>}
                      {m.awayTeam?.name || '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span className={`badge ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MatchTable;
