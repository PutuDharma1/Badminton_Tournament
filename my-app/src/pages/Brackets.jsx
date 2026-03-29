import { useState, useEffect, useCallback } from 'react';
import tournamentsApi from '../api/tournaments';
import matchesApi from '../api/matches';

// ─── Google Fonts injection ───────────────────────────────────────────────────
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&display=swap';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        '#05080f',
  surface:   '#0b1220',
  card:      '#101c2e',
  cardHover: '#162436',
  border:    '#1a3050',
  accent:    '#38bdf8',  // sky-400
  gold:      '#f59e0b',
  goldDim:   '#92400e',
  red:       '#ef4444',
  green:     '#22c55e',
  muted:     '#4b6280',
  textPri:   '#dde6f0',
  textSec:   '#7a9cbf',
  textFaint: '#3a5470',
  placeholder: '#1e3248',
};

const CSS = `
  @import url('${FONTS_HREF}');

  .arena-root * { box-sizing: border-box; }

  .arena-root {
    background: ${T.bg};
    min-height: 100vh;
    color: ${T.textPri};
    font-family: 'Rajdhani', sans-serif;
    position: relative;
  }

  /* subtle grid texture */
  .arena-root::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(${T.border}22 1px, transparent 1px),
      linear-gradient(90deg, ${T.border}22 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  .arena-content { position: relative; z-index: 1; }

  /* ── Header ── */
  .arena-header {
    border-bottom: 1px solid ${T.border};
    padding: 28px 32px 20px;
    display: flex; align-items: flex-end; justify-content: space-between;
    flex-wrap: wrap; gap: 16px;
  }
  .arena-title {
    font-family: 'Teko', sans-serif;
    font-size: 40px; font-weight: 700; letter-spacing: 0.04em;
    line-height: 1; margin: 0;
    background: linear-gradient(135deg, #fff 0%, ${T.accent} 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .arena-subtitle {
    font-size: 13px; color: ${T.textSec}; margin: 4px 0 0; letter-spacing: 0.04em;
  }

  /* ── Controls bar ── */
  .arena-controls {
    background: ${T.surface};
    border-bottom: 1px solid ${T.border};
    padding: 14px 32px;
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }

  .arena-select {
    background: ${T.card};
    border: 1px solid ${T.border};
    color: ${T.textPri};
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px; font-weight: 500;
    padding: 8px 36px 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    min-width: 220px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234b6280' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: border-color 0.2s;
  }
  .arena-select:focus { outline: none; border-color: ${T.accent}; }
  .arena-select option { background: ${T.card}; }

  .arena-btn {
    background: transparent;
    border: 1px solid ${T.border};
    color: ${T.textSec};
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
    padding: 7px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .arena-btn:hover { border-color: ${T.accent}; color: ${T.accent}; }
  .arena-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: ${T.red};
    display: inline-block;
    box-shadow: 0 0 6px ${T.red};
    animation: livePulse 1.5s ease-in-out infinite;
  }
  @keyframes livePulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 6px ${T.red}; }
    50% { opacity: 0.5; box-shadow: 0 0 2px ${T.red}; }
  }

  /* ── Tournament meta strip ── */
  .arena-meta {
    background: ${T.surface};
    border-bottom: 1px solid ${T.border};
    padding: 10px 32px;
    display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    font-size: 12px; color: ${T.textSec}; letter-spacing: 0.03em;
  }
  .arena-stage-badge {
    font-family: 'Teko', sans-serif;
    font-size: 13px; font-weight: 600; letter-spacing: 0.08em;
    padding: 3px 10px; border-radius: 4px;
    text-transform: uppercase;
  }

  /* ── Category tabs ── */
  .arena-tabs {
    padding: 20px 32px 0;
    display: flex; gap: 4px; flex-wrap: wrap;
  }
  .arena-tab {
    font-family: 'Teko', sans-serif;
    font-size: 14px; font-weight: 600; letter-spacing: 0.06em;
    padding: 8px 20px;
    border: 1px solid ${T.border};
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: ${T.surface};
    color: ${T.textSec};
    cursor: pointer;
    transition: all 0.15s;
    text-transform: uppercase;
  }
  .arena-tab.active {
    background: ${T.card};
    color: ${T.accent};
    border-color: ${T.accent};
  }
  .arena-tab:hover:not(.active) { color: ${T.textPri}; border-color: ${T.muted}; }

  /* ── Bracket panel ── */
  .arena-panel {
    margin: 0 32px 32px;
    background: ${T.card};
    border: 1px solid ${T.border};
    border-top: 2px solid ${T.accent};
    border-radius: 0 6px 6px 6px;
    padding: 24px;
    overflow-x: auto;
  }

  /* ── Bracket tree ── */
  .bracket-tree {
    display: flex;
    gap: 0;
    align-items: stretch;
    min-width: max-content;
    padding-bottom: 8px;
  }

  .bracket-round {
    display: flex;
    flex-direction: column;
    min-width: 240px;
    flex-shrink: 0;
    position: relative;
  }

  .round-header {
    font-family: 'Teko', sans-serif;
    font-size: 11px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${T.accent};
    text-align: center;
    padding: 0 24px 16px;
  }

  .round-matches {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    flex: 1;
    padding: 0 12px;
    gap: 12px;
  }

  /* ── Match card ── */
  .match-card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: 6px;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
    position: relative;
    cursor: default;
  }
  .match-card:hover { border-color: ${T.muted}; }
  .match-card.live {
    border-color: ${T.red}55;
    box-shadow: 0 0 16px ${T.red}18, inset 0 0 20px ${T.red}06;
  }
  .match-card.placeholder {
    border-style: dashed;
    border-color: ${T.placeholder};
    background: #0a1422;
  }
  .match-card.finished { border-color: ${T.green}30; }

  .match-card-inner { padding: 10px 12px; }

  .team-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 5px 0;
    min-height: 30px;
  }
  .team-row + .team-row {
    border-top: 1px solid ${T.border};
  }

  .team-name {
    font-size: 13px; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 150px;
    transition: color 0.15s;
  }
  .team-name.winner { color: ${T.green}; }
  .team-name.ph { color: ${T.textFaint}; font-weight: 500; font-style: italic; }

  .team-score {
    font-family: 'Teko', sans-serif;
    font-size: 18px; font-weight: 700;
    min-width: 22px; text-align: right;
    line-height: 1;
  }
  .team-score.winner { color: ${T.green}; }
  .team-score.loser { color: ${T.muted}; }
  .team-score.pending { color: ${T.textFaint}; }

  /* Match footer */
  .match-footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 12px 7px;
    border-top: 1px solid ${T.border};
    font-size: 10px; color: ${T.muted};
    letter-spacing: 0.04em;
    background: rgba(0,0,0,0.2);
  }
  .match-footer .court { font-weight: 600; color: ${T.textSec}; }

  /* Live badge */
  .live-badge {
    position: absolute; top: -1px; right: 8px;
    background: ${T.red};
    color: white;
    font-family: 'Teko', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    padding: 1px 7px; border-radius: 0 0 4px 4px;
    text-transform: uppercase;
  }

  /* Predicted badge */
  .predicted-badge {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em;
    color: ${T.textFaint}; text-transform: uppercase;
    border: 1px solid ${T.placeholder};
    padding: 1px 5px; border-radius: 3px;
  }

  /* status badge */
  .status-chip {
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    padding: 1px 6px; border-radius: 3px; text-transform: uppercase;
  }

  /* ── Connector lines between rounds ── */
  .bracket-connector {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    width: 28px;
    flex-shrink: 0;
    position: relative;
  }
  .connector-segment {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
  }
  /* right-side stub from current match */
  .connector-segment::before {
    content: '';
    position: absolute;
    left: 0; right: 0;
    top: 50%;
    height: 1px;
    background: ${T.border};
  }
  /* Vertical line connecting pair to next-round match */
  .connector-pair::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%; bottom: -50%; /* spans from center of top to center of bottom */
    width: 1px;
    background: ${T.border};
  }

  /* ── Champion card ── */
  .champion-banner {
    margin: 0 32px 32px;
    background: linear-gradient(135deg, #1a1200 0%, #2d1f00 50%, #1a1200 100%);
    border: 1px solid ${T.gold}55;
    border-radius: 8px;
    padding: 20px 28px;
    display: flex; align-items: center; gap: 20px;
    box-shadow: 0 0 32px ${T.gold}18;
  }
  .champion-trophy { font-size: 40px; line-height: 1; flex-shrink: 0; }
  .champion-label {
    font-family: 'Teko', sans-serif;
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
    color: ${T.goldDim}; text-transform: uppercase; margin-bottom: 4px;
  }
  .champion-name {
    font-family: 'Teko', sans-serif;
    font-size: 28px; font-weight: 700; letter-spacing: 0.04em;
    color: ${T.gold}; line-height: 1;
  }
  .champion-cat {
    font-size: 12px; color: ${T.goldDim}; margin-top: 4px;
  }

  /* ── Empty / loading states ── */
  .arena-empty {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 80px 32px;
    color: ${T.muted}; text-align: center;
  }
  .arena-empty-icon { font-size: 56px; margin-bottom: 16px; opacity: 0.6; }
  .arena-empty-title { font-family: 'Teko', sans-serif; font-size: 22px; letter-spacing: 0.06em; color: ${T.textSec}; }
  .arena-empty-sub { font-size: 13px; margin-top: 6px; }

  .arena-spinner {
    width: 36px; height: 36px;
    border: 3px solid ${T.border};
    border-top-color: ${T.accent};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Scrollbar styling ── */
  .arena-panel::-webkit-scrollbar { height: 5px; }
  .arena-panel::-webkit-scrollbar-track { background: ${T.bg}; }
  .arena-panel::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
`;

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

  // Determine active category (default to first)
  const activeCat = activeCategory && brackets.find(b => b.categoryId === activeCategory)
    ? activeCategory
    : brackets[0]?.categoryId ?? null;

  const currentBracket = brackets.find(b => b.categoryId === activeCat);
  const champions = brackets.filter(b => b.champion);

  return (
    <div className="arena-root">
      <style>{CSS}</style>
      <div className="arena-content">

        {/* Header */}
        <div className="arena-header">
          <div>
            <h1 className="arena-title">BRACKETS</h1>
            <p className="arena-subtitle">Live knockout bracket — updated in real time</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSec, cursor: 'pointer' }}>
              <input
                type="checkbox" checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                style={{ accentColor: T.accent }}
              />
              Auto-refresh
            </label>
            {autoRefresh && <span className="live-dot" />}
            <button className="arena-btn" onClick={fetchData} disabled={loading || !selectedId}>
              {loading ? '⏳' : '↺'} Refresh
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="arena-controls">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: T.muted, textTransform: 'uppercase' }}>
              Tournament
            </span>
            <select className="arena-select" value={selectedId} onChange={e => { setSelectedId(e.target.value); setActiveCategory(null); }}>
              <option value="">— Select tournament —</option>
              {tournaments.map(t => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} · {t.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Meta strip */}
        {selectedT && (
          <div className="arena-meta">
            <span>📍 {selectedT.location}</span>
            <span>📅 {selectedT.startDate?.slice(0, 10)} – {selectedT.endDate?.slice(0, 10)}</span>
            <span
              className="arena-stage-badge"
              style={{
                background: selectedT.currentStage === 'KNOCKOUT' ? `${T.accent}18` : `${T.gold}15`,
                color: selectedT.currentStage === 'KNOCKOUT' ? T.accent : T.gold,
                border: `1px solid ${selectedT.currentStage === 'KNOCKOUT' ? T.accent : T.gold}44`,
              }}
            >
              {selectedT.currentStage || selectedT.status}
            </span>
            {selectedT.currentStage === 'GROUP' && (
              <span style={{ fontSize: 11, color: T.textFaint, fontStyle: 'italic' }}>
                Showing predicted knockout schedule — bracket finalises after group stage
              </span>
            )}
          </div>
        )}

        {/* Champions strip */}
        {champions.length > 0 && (
          <div style={{ display: 'flex', gap: 16, padding: '20px 32px 0', flexWrap: 'wrap' }}>
            {champions.map(b => (
              <div key={b.categoryId} className="champion-banner" style={{ flex: '1 1 280px' }}>
                <div className="champion-trophy">🏆</div>
                <div>
                  <div className="champion-label">Champion</div>
                  <div className="champion-name">{b.champion}</div>
                  <div className="champion-cat">{b.categoryName}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Category tabs */}
        {brackets.length > 1 && (
          <div className="arena-tabs">
            {brackets.map(b => (
              <button
                key={b.categoryId}
                className={`arena-tab${b.categoryId === activeCat ? ' active' : ''}`}
                onClick={() => setActiveCategory(b.categoryId)}
              >
                {b.categoryName}
                {b.champion && ' 🏆'}
              </button>
            ))}
          </div>
        )}

        {/* Bracket panel */}
        {loading && (
          <div className="arena-empty">
            <div className="arena-spinner" />
            <p style={{ marginTop: 20, fontSize: 13 }}>Loading bracket data…</p>
          </div>
        )}

        {!loading && !selectedId && (
          <div className="arena-empty">
            <div className="arena-empty-icon">🏸</div>
            <div className="arena-empty-title">Select a Tournament</div>
            <p className="arena-empty-sub">Choose a tournament above to view its bracket</p>
          </div>
        )}

        {!loading && selectedId && brackets.length === 0 && (
          <div className="arena-empty">
            <div className="arena-empty-icon">⏳</div>
            <div className="arena-empty-title">No Bracket Yet</div>
            <p className="arena-empty-sub">Start the tournament to see the predicted knockout schedule</p>
          </div>
        )}

        {!loading && currentBracket && (
          <div className={`arena-panel${brackets.length <= 1 ? ' arena-panel-notabbed' : ''}`}
               style={brackets.length <= 1 ? { margin: '20px 32px 32px', borderTopLeftRadius: 6 } : {}}>
            <BracketTree bracket={currentBracket} />
          </div>
        )}

      </div>
    </div>
  );
}


// ─── Bracket Tree ─────────────────────────────────────────────────────────────
function BracketTree({ bracket }) {
  return (
    <div className="bracket-tree">
      {bracket.rounds.map((roundObj, rIdx) => (
        <RoundColumn
          key={rIdx}
          roundObj={roundObj}
          isLast={rIdx === bracket.rounds.length - 1}
          nextRound={bracket.rounds[rIdx + 1]}
        />
      ))}
    </div>
  );
}


// ─── Round Column ─────────────────────────────────────────────────────────────
function RoundColumn({ roundObj, isLast }) {
  return (
    <div style={{ display: 'flex', flexShrink: 0, alignItems: 'stretch' }}>
      {/* Matches column */}
      <div className="bracket-round">
        <div className="round-header">{roundObj.label}</div>
        <div className="round-matches">
          {roundObj.matches.map((match, mIdx) => (
            <MatchCard key={match.id || `ph-${mIdx}`} match={match} />
          ))}
        </div>
      </div>

      {/* Connector column between this round and next */}
      {!isLast && <ConnectorColumn matchCount={roundObj.matches.length} />}
    </div>
  );
}


// ─── Connector Column ─────────────────────────────────────────────────────────
// Draws vertical + horizontal lines pairing adjacent matches in this round
// feeding into the next round. Pairs: (0,1)→0, (2,3)→1, etc.
function ConnectorColumn({ matchCount }) {
  // We need `matchCount` segments, grouped into pairs
  const pairs = [];
  for (let i = 0; i < matchCount; i += 2) {
    pairs.push(i);
  }

  return (
    <div style={{
      width: 28, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-around',
      paddingBottom: 12, // account for round-header offset
      marginTop: 27,     // align with round-header height
    }}>
      {pairs.map(pairStart => (
        <ConnectorPair key={pairStart} />
      ))}
    </div>
  );
}

function ConnectorPair() {
  const lineColor = `${T.border}`;
  return (
    <div style={{ flex: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Top half: horizontal line going right + vertical line going down */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: lineColor }} />
        <div style={{ position: 'absolute', top: '50%', right: 0, width: 1, height: '50%', background: lineColor }} />
      </div>
      {/* Bottom half: horizontal line going right + vertical line going up */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: lineColor }} />
        <div style={{ position: 'absolute', bottom: '50%', right: 0, width: 1, height: '50%', background: lineColor }} />
      </div>
    </div>
  );
}


// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({ match }) {
  const isPlaceholder = !match.homeTeamId && !match.awayTeamId;
  const isLive = match.status === 'IN_PROGRESS';
  const isFinished = match.status === 'FINISHED';

  const homeWon = isFinished && match.winnerTeamId === match.homeTeamId;
  const awayWon = isFinished && match.winnerTeamId === match.awayTeamId;

  const homeName = match.homeTeam?.name || match.homePlaceholder || 'TBD';
  const awayName = match.awayTeam?.name || match.awayPlaceholder || 'TBD';

  const homeScore = isFinished || isLive ? (match.homeScore ?? '-') : '–';
  const awayScore = isFinished || isLive ? (match.awayScore ?? '-') : '–';

  let cardClass = 'match-card';
  if (isPlaceholder) cardClass += ' placeholder';
  else if (isLive) cardClass += ' live';
  else if (isFinished) cardClass += ' finished';

  return (
    <div className={cardClass}>
      {isLive && <div className="live-badge">🔴 LIVE</div>}

      <div className="match-card-inner">
        {/* Home row */}
        <div className="team-row">
          <span className={`team-name${homeWon ? ' winner' : ''}${isPlaceholder ? ' ph' : ''}`}>
            {homeName}
          </span>
          <span className={`team-score${homeWon ? ' winner' : isFinished ? ' loser' : ' pending'}`}>
            {homeScore}
          </span>
        </div>
        {/* Away row */}
        <div className="team-row">
          <span className={`team-name${awayWon ? ' winner' : ''}${isPlaceholder ? ' ph' : ''}`}>
            {awayName}
          </span>
          <span className={`team-score${awayWon ? ' winner' : isFinished ? ' loser' : ' pending'}`}>
            {awayScore}
          </span>
        </div>
      </div>

      {/* Footer: time, court, status */}
      {(match.scheduledAt || match.court?.name) && (
        <div className="match-footer">
          <div>
            {isPlaceholder ? (
              <span className="predicted-badge">Predicted</span>
            ) : (
              <StatusChip status={match.status} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {match.court?.name && (
              <span className="court">🏟 {match.court.name}</span>
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


// ─── Status chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const MAP = {
    SCHEDULED:   { bg: `${T.accent}18`,  color: T.accent, label: 'Scheduled' },
    IN_PROGRESS: { bg: `${T.red}18`,     color: T.red,    label: 'Live' },
    FINISHED:    { bg: `${T.green}18`,   color: T.green,  label: 'Done' },
  };
  const s = MAP[status] || MAP.SCHEDULED;
  return (
    <span className="status-chip" style={{ background: s.bg, color: s.color }}>
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
