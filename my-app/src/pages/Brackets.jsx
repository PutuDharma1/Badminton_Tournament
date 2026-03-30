import { useState, useEffect, useCallback } from 'react';
import tournamentsApi from '../api/tournaments';
import matchesApi from '../api/matches';
import { Trophy, RefreshCw, MapPin, Calendar } from 'lucide-react';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Brackets() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [tournament, setTournament] = useState(null);
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await tournamentsApi.getTournaments();
        setTournaments(data);
        const ongoing = data.find(t => t.status === 'ONGOING');
        if (ongoing) setSelectedId(String(ongoing.id));
        else if (data.length > 0) setSelectedId(String(data[0].id));
      } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || !selectedId) return;
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, selectedId, fetchData]);

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
        <div className="form-group" style={{ margin: 0, minWidth: 240 }}>
          <label className="form-label">Tournament</label>
          <select
            className="form-input"
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setActiveCategory(null); }}
            style={{ fontSize: 13 }}
          >
            <option value="">— Select tournament —</option>
            {tournaments.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.name} ({t.status})
              </option>
            ))}
          </select>
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
  return (
    <div style={{
      display: 'flex', gap: 0, alignItems: 'stretch',
      minWidth: 'max-content', paddingBottom: 8,
    }}>
      {bracket.rounds.map((roundObj, rIdx) => (
        <RoundColumn
          key={rIdx}
          roundObj={roundObj}
          isLast={rIdx === bracket.rounds.length - 1}
        />
      ))}
    </div>
  );
}


// ─── Round Column ─────────────────────────────────────────────────────────────
function RoundColumn({ roundObj, isLast }) {
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
            <BracketMatchCard key={match.id || `ph-${mIdx}`} match={match} />
          ))}
        </div>
      </div>

      {!isLast && <ConnectorColumn matchCount={roundObj.matches.length} />}
    </div>
  );
}


// ─── Connector Column ─────────────────────────────────────────────────────────
function ConnectorColumn({ matchCount }) {
  const pairs = [];
  for (let i = 0; i < matchCount; i += 2) pairs.push(i);

  return (
    <div style={{
      width: 28, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-around',
      paddingBottom: 12, marginTop: 27,
    }}>
      {pairs.map(pairStart => (
        <ConnectorPair key={pairStart} />
      ))}
    </div>
  );
}

function ConnectorPair() {
  return (
    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border)' }} />
        <div style={{ position: 'absolute', top: '50%', right: 0, width: 1, height: '50%', background: 'var(--border)' }} />
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border)' }} />
        <div style={{ position: 'absolute', bottom: '50%', right: 0, width: 1, height: '50%', background: 'var(--border)' }} />
      </div>
    </div>
  );
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
                {new Date(match.scheduledAt).toLocaleString('id-ID', {
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
