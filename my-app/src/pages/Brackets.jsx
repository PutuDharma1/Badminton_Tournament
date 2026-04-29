import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import tournamentsApi from '../api/tournaments';
import matchesApi from '../api/matches';
import { Trophy, RefreshCw, MapPin, Calendar, Search, X } from 'lucide-react';
import Toast from '../components/Toast';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Brackets() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [tournament, setTournament] = useState(null);
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await tournamentsApi.getTournaments();
        setTournaments(data);
        const ongoing = data.find(t => t.status === 'ONGOING');
        if (ongoing) setSelectedId(String(ongoing.id));
        else if (data.length > 0) setSelectedId(String(data[0].id));
      } catch (e) { showToast(`Failed to load tournaments: ${e.message}`, 'error'); }
    })();
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const [tData, koData] = await Promise.all([
        tournamentsApi.getTournamentById(selectedId),
        matchesApi.getMatches(selectedId, null, 'KNOCKOUT'),
      ]);
      setTournament(tData);
      setKnockoutMatches(koData);
    } catch (e) { showToast(`Failed to load bracket data: ${e.message}`, 'error'); }
    finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || !selectedId) return;
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, selectedId, fetchData]);

  const filteredTournamentList = searchQuery.trim()
    ? tournaments.filter(t =>
        t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : tournaments;

  const brackets = buildBrackets(tournament, knockoutMatches);
  const selectedT = tournaments.find(t => String(t.id) === selectedId);

  const activeCat = activeCategory && brackets.find(b => b.categoryId === activeCategory)
    ? activeCategory
    : brackets[0]?.categoryId ?? null;

  const currentBracket = brackets.find(b => b.categoryId === activeCat);
  const champions = brackets.filter(b => b.champion);

  return (
    <div className="main-content-wide">

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 16, marginBottom: 24,
      }}>
        <div>
          <p style={{
            fontSize: 12, fontWeight: 600, color: 'var(--accent)',
            letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px',
          }}>
            Live Brackets
          </p>
          <h1 className="page-title">Knockout Brackets</h1>
          <p className="page-subtitle" style={{ marginTop: 6 }}>
            Live knockout bracket — updated in real time
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer',
            fontWeight: 500,
          }}>
            <input
              type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            Auto-refresh
            {autoRefresh && (
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#ef4444', display: 'inline-block',
                boxShadow: '0 0 6px #ef4444',
                animation: 'livePulse 1.5s ease-in-out infinite',
              }} />
            )}
          </label>
          <button className="btn-outline" onClick={fetchData} disabled={loading || !selectedId}
            style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 0.8s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tournament selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{
              position: 'absolute', left: 10,
              color: 'var(--text-faint)', pointerEvents: 'none',
            }} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search tournaments…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search tournaments"
              style={{
                width: '100%',
                paddingLeft: 32, paddingRight: searchQuery ? 30 : 12,
                paddingTop: 7, paddingBottom: 7,
                fontSize: 13,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: 9,
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.15s',
                fontFamily: 'var(--font-body)',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: 8,
                  background: 'none', border: 'none',
                  color: 'var(--text-faint)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 0,
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
          {/* Select */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tournament</label>
            <select
              className="form-input"
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setActiveCategory(null); }}
              style={{ fontSize: 13 }}
            >
              <option value="">— Select tournament —</option>
              {filteredTournamentList.map(t => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} ({t.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedT && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            fontSize: 12.5, color: 'var(--text-muted)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={13} style={{ color: 'var(--text-faint)' }} />
              {selectedT.location}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={13} style={{ color: 'var(--text-faint)' }} />
              {selectedT.startDate?.slice(0, 10)} – {selectedT.endDate?.slice(0, 10)}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '3px 9px', borderRadius: 6,
              background: 'rgba(var(--accent-rgb), 0.1)',
              color: 'var(--accent)',
            }}>
              {selectedT.currentStage || selectedT.status}
            </span>
            {selectedT.currentStage === 'GROUP' && (
              <span style={{ fontSize: 11.5, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                Showing predicted knockout schedule
              </span>
            )}
          </div>
        )}
      </div>

      {/* Champions */}
      {champions.length > 0 && (
        <div className="stagger-in" style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          {champions.map(b => (
            <div key={b.categoryId} style={{
              flex: '1 1 280px',
              background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.08) 0%, rgba(var(--accent-rgb), 0.02) 100%)',
              border: '1.5px solid rgba(var(--accent-rgb), 0.25)',
              borderRadius: 14,
              padding: '18px 22px',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 2px 12px rgba(var(--accent-rgb), 0.08)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(var(--accent-rgb), 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', flexShrink: 0,
              }}>
                <Trophy size={24} />
              </div>
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4,
                }}>
                  Champion
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em',
                  color: 'var(--accent)', lineHeight: 1.2,
                }}>
                  {b.champion}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {b.categoryName}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category tabs */}
      {brackets.length > 1 && (
        <div style={{
          display: 'flex', gap: 4, flexWrap: 'wrap',
          borderBottom: '1.5px solid var(--border)',
          marginBottom: 0,
        }}>
          {brackets.map(b => {
            const isActive = b.categoryId === activeCat;
            return (
              <button
                key={b.categoryId}
                onClick={() => setActiveCategory(b.categoryId)}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                  padding: '10px 18px',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: '-1.5px',
                  background: 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                  textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {b.categoryName}
                {b.champion && <Trophy size={12} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Bracket panel */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px' }}>
          <div className="spinner" />
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>Loading bracket data...</p>
        </div>
      )}

      {!loading && !selectedId && (
        <EmptyState
          icon={<Trophy size={28} />}
          title="Select a Tournament"
          subtitle="Choose a tournament above to view its bracket"
        />
      )}

      {!loading && selectedId && brackets.length === 0 && (
        <EmptyState
          icon={<Calendar size={28} />}
          title="No Bracket Yet"
          subtitle="Start the tournament to see the predicted knockout schedule"
        />
      )}

      {!loading && currentBracket && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderTop: '2px solid var(--accent)',
          borderRadius: brackets.length <= 1 ? '14px' : '0 14px 14px 14px',
          padding: 24,
          overflowX: 'auto',
          boxShadow: 'var(--shadow-card)',
          marginTop: brackets.length <= 1 ? 20 : 0,
        }}>
          <BracketTree bracket={currentBracket} />
        </div>
      )}

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #ef4444; }
          50% { opacity: 0.4; box-shadow: 0 0 2px #ef4444; }
        }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'var(--bg-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-faint)', marginBottom: 16,
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 18, fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: 6,
      }}>
        {title}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-faint)', margin: 0 }}>{subtitle}</p>
    </div>
  );
}


// ─── Bracket Tree ─────────────────────────────────────────────────────────────
function BracketTree({ bracket }) {
  const wrapperRef = useRef(null);
  const cardRefs = useRef({});
  const [paths, setPaths] = useState([]);

  const setCardRef = useCallback((key, el) => {
    if (el) cardRefs.current[key] = el;
    else delete cardRefs.current[key];
  }, []);

  const recalc = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const wRect = wrapper.getBoundingClientRect();
    const newPaths = [];

    bracket.rounds.forEach((roundObj, rIdx) => {
      if (rIdx === bracket.rounds.length - 1) return;
      const pairCount = Math.floor(roundObj.matches.length / 2);

      for (let pair = 0; pair < pairCount; pair++) {
        const topEl = cardRefs.current[`${rIdx}_${pair * 2}`];
        const botEl = cardRefs.current[`${rIdx}_${pair * 2 + 1}`];
        const nextEl = cardRefs.current[`${rIdx + 1}_${pair}`];
        if (!topEl || !botEl || !nextEl) continue;

        const topR = topEl.getBoundingClientRect();
        const botR = botEl.getBoundingClientRect();
        const nextR = nextEl.getBoundingClientRect();

        const x1   = topR.right  - wRect.left;
        const y1   = (topR.top  + topR.bottom)  / 2 - wRect.top;
        const y2   = (botR.top  + botR.bottom)  / 2 - wRect.top;
        const x2   = nextR.left  - wRect.left;
        const xMid = (x1 + x2) / 2;
        const yMid = (y1 + y2) / 2;

        const topDone = roundObj.matches[pair * 2]?.status === 'FINISHED';
        const botDone = roundObj.matches[pair * 2 + 1]?.status === 'FINISHED';

        newPaths.push({ id: `${rIdx}_${pair}`, x1, y1, y2, xMid, yMid, x2, topDone, botDone });
      }
    });

    setPaths(newPaths);
  }, [bracket]);

  useLayoutEffect(() => { recalc(); }, [recalc]);

  useEffect(() => {
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [recalc]);

  return (
    <div ref={wrapperRef} style={{
      display: 'flex', gap: 0, alignItems: 'stretch',
      minWidth: 'max-content', paddingBottom: 8,
      position: 'relative',
    }}>
      {bracket.rounds.map((roundObj, rIdx) => (
        <RoundColumn
          key={rIdx}
          roundObj={roundObj}
          rIdx={rIdx}
          isLast={rIdx === bracket.rounds.length - 1}
          setCardRef={setCardRef}
        />
      ))}

      {/* SVG connector overlay */}
      <svg style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'visible',
      }}>
        {paths.map(({ id, x1, y1, y2, xMid, yMid, x2, topDone, botDone }) => {
          const active = topDone || botDone;
          const stroke = active ? 'var(--accent)' : 'var(--border)';
          const sw = active ? 1.5 : 1;
          const op = active ? 0.55 : 1;
          return (
            <g key={id} opacity={op}>
              <line x1={x1}   y1={y1}   x2={xMid} y2={y1}   stroke={stroke} strokeWidth={sw} />
              <line x1={x1}   y1={y2}   x2={xMid} y2={y2}   stroke={stroke} strokeWidth={sw} />
              <line x1={xMid} y1={y1}   x2={xMid} y2={y2}   stroke={stroke} strokeWidth={sw} />
              <line x1={xMid} y1={yMid} x2={x2}   y2={yMid} stroke={stroke} strokeWidth={sw} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}


// ─── Round Column ─────────────────────────────────────────────────────────────
function RoundColumn({ roundObj, rIdx, isLast, setCardRef }) {
  return (
    <div style={{ display: 'flex', flexShrink: 0, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 240, flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          textAlign: 'center',
          padding: '0 24px 14px',
        }}>
          {roundObj.label}
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-around',
          flex: 1, padding: '0 12px', gap: 12,
        }}>
          {roundObj.matches.map((match, mIdx) => (
            <div key={match.id || `ph-${mIdx}`} ref={el => setCardRef(`${rIdx}_${mIdx}`, el)}>
              <BracketMatchCard match={match} />
            </div>
          ))}
        </div>
      </div>

      {!isLast && <ConnectorColumn />}
    </div>
  );
}


// ─── Connector Column (spacer only — lines drawn by SVG overlay) ──────────────
function ConnectorColumn() {
  return <div style={{ width: 36, flexShrink: 0 }} />;
}


// ─── Bracket Match Card ──────────────────────────────────────────────────────
function BracketMatchCard({ match }) {
  const isPlaceholder = !match.homeTeamId && !match.awayTeamId;
  const isLive = match.status === 'IN_PROGRESS';
  const isFinished = match.status === 'FINISHED';

  const homeWon = isFinished && match.winnerTeamId === match.homeTeamId;
  const awayWon = isFinished && match.winnerTeamId === match.awayTeamId;

  const homeName = match.homeTeam?.name || match.homePlaceholder || 'TBD';
  const awayName = match.awayTeam?.name || match.awayPlaceholder || 'TBD';

  const homeScore = isFinished || isLive ? (match.homeScore ?? '-') : '–';
  const awayScore = isFinished || isLive ? (match.awayScore ?? '-') : '–';

  const cardBorder = isLive
    ? 'rgba(239, 68, 68, 0.4)'
    : isFinished
      ? 'rgba(var(--accent-rgb), 0.3)'
      : 'var(--border)';

  const cardShadow = isLive
    ? '0 0 12px rgba(239, 68, 68, 0.1), inset 0 0 16px rgba(239, 68, 68, 0.03)'
    : 'none';

  return (
    <div style={{
      background: isPlaceholder ? 'var(--bg-subtle)' : 'var(--bg-card)',
      border: `1px ${isPlaceholder ? 'dashed' : 'solid'} ${cardBorder}`,
      borderRadius: 8,
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      position: 'relative',
      boxShadow: cardShadow,
    }}>
      {isLive && (
        <div style={{
          position: 'absolute', top: -1, right: 8,
          background: '#ef4444', color: '#fff',
          fontFamily: 'var(--font-display)',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
          padding: '2px 7px', borderRadius: '0 0 4px 4px',
          textTransform: 'uppercase',
        }}>
          LIVE
        </div>
      )}

      <div style={{ padding: '10px 12px' }}>
        {/* Home */}
        <TeamRow
          name={homeName}
          score={homeScore}
          isWinner={homeWon}
          isPlaceholder={isPlaceholder}
          isFinished={isFinished}
        />
        <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
        {/* Away */}
        <TeamRow
          name={awayName}
          score={awayScore}
          isWinner={awayWon}
          isPlaceholder={isPlaceholder}
          isFinished={isFinished}
        />
      </div>

      {/* Footer */}
      {(match.scheduledAt || match.court?.name || isPlaceholder) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '5px 12px 6px',
          borderTop: '1px solid var(--border)',
          fontSize: 10, color: 'var(--text-faint)',
          letterSpacing: '0.03em',
          background: 'var(--bg-subtle)',
        }}>
          <div>
            {isPlaceholder ? (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: '1px solid var(--border)',
                padding: '1px 5px', borderRadius: 3,
                color: 'var(--text-faint)',
              }}>
                Predicted
              </span>
            ) : (
              <StatusChip status={match.status} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {match.court?.name && (
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                {match.court.name}
              </span>
            )}
            {match.scheduledAt && (
              <span>
                {new Date(match.scheduledAt).toLocaleString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Team Row ────────────────────────────────────────────────────────────────
function TeamRow({ name, score, isWinner, isPlaceholder, isFinished }) {
  const nameColor = isWinner
    ? 'var(--accent)'
    : isPlaceholder
      ? 'var(--text-faint)'
      : 'var(--text-primary)';

  const scoreColor = isWinner
    ? 'var(--accent)'
    : isFinished
      ? 'var(--text-faint)'
      : 'var(--text-muted)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 0', minHeight: 28,
    }}>
      <span style={{
        fontSize: 13, fontWeight: isWinner ? 700 : 500,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: 150, color: nameColor,
        fontStyle: isPlaceholder ? 'italic' : 'normal',
      }}>
        {name}
      </span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 16, fontWeight: 700,
        minWidth: 22, textAlign: 'right',
        lineHeight: 1, color: scoreColor,
      }}>
        {score}
      </span>
    </div>
  );
}


// ─── Status chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const MAP = {
    SCHEDULED: { bg: 'var(--status-scheduled-bg)', color: 'var(--status-scheduled-text)', label: 'Scheduled' },
    IN_PROGRESS: { bg: 'var(--status-ongoing-bg)', color: 'var(--status-ongoing-text)', label: 'Live' },
    FINISHED: { bg: 'var(--status-finished-bg)', color: 'var(--status-finished-text)', label: 'Done' },
  };
  const s = MAP[status] || MAP.SCHEDULED;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
      padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase',
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}


// ─── Bracket data builder ─────────────────────────────────────────────────────
const ROUND_LABELS = {
  1: 'FINAL',
  2: 'SEMI-FINALS',
  4: 'QUARTER-FINALS',
  8: 'ROUND OF 16',
  16: 'ROUND OF 32',
};

function buildBrackets(tournament, knockoutMatches) {
  if (!knockoutMatches || knockoutMatches.length === 0) return [];

  const catMap = {};
  knockoutMatches.forEach(m => {
    const cid = m.categoryId || 1;
    if (!catMap[cid]) catMap[cid] = {};
    if (!catMap[cid][m.round]) catMap[cid][m.round] = [];
    catMap[cid][m.round].push(m);
  });

  const brackets = [];

  Object.keys(catMap).forEach(cidStr => {
    const cid = parseInt(cidStr);
    const catInfo = tournament?.categories?.find(c => c.id === cid);
    const catName = catInfo ? catInfo.name : `Category ${cid}`;

    const roundMap = catMap[cid];
    const sortedRoundNums = Object.keys(roundMap).map(Number).sort((a, b) => a - b);

    let champion = null;
    const rounds = sortedRoundNums.map(r => {
      const rMatches = roundMap[r].sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));
      const matchCount = rMatches.length;

      if (matchCount === 1 && rMatches[0].status === 'FINISHED' && rMatches[0].winnerTeamId) {
        const w = rMatches[0];
        champion = w.winnerTeamId === w.homeTeamId
          ? (w.homeTeam?.name || 'Winner')
          : (w.awayTeam?.name || 'Winner');
      }

      const label = ROUND_LABELS[matchCount] || `ROUND OF ${matchCount * 2}`;
      return { label, matches: rMatches };
    });

    brackets.push({ categoryId: cid, categoryName: catName, rounds, champion });
  });

  return brackets;
}
