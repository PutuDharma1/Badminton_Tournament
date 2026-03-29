import { useState, useEffect, useCallback } from 'react';
import tournamentsApi from '../api/tournaments';
import matchesApi from '../api/matches';
import apiClient from '../api/client';

// ─── Status Badge ───────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  SCHEDULED: { bg: 'rgba(59,130,246,0.1)', border: '#60a5fa', text: '#3b82f6' },
  IN_PROGRESS: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', text: '#d97706' },
  FINISHED: { bg: 'rgba(34,197,94,0.08)', border: '#22c55e', text: '#15803d' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.SCHEDULED;
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

// ─── Main Brackets Page ─────────────────────────────────────────────────────────
export default function Brackets() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [tournament, setTournament] = useState(null);
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [groupCategories, setGroupCategories] = useState([]);
  const [knockoutPreview, setKnockoutPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch list of tournaments
  useEffect(() => {
    (async () => {
      try {
        const data = await tournamentsApi.getTournaments();
        setTournaments(data);
        // Auto-select if there's an ONGOING tournament
        const ongoing = data.find(t => t.status === 'ONGOING');
        if (ongoing) setSelectedTournamentId(String(ongoing.id));
        else if (data.length > 0) setSelectedTournamentId(String(data[0].id));
      } catch (err) {
        console.error('Failed to fetch tournaments:', err);
      }
    })();
  }, []);

  // Fetch tournament data when selection changes
  const fetchTournamentData = useCallback(async () => {
    if (!selectedTournamentId) return;
    setLoading(true);
    try {
      const [tData, koData, grpData] = await Promise.all([
        tournamentsApi.getTournamentById(selectedTournamentId),
        matchesApi.getMatches(selectedTournamentId, null, 'KNOCKOUT'),
        tournamentsApi.getGroups(selectedTournamentId),
      ]);
      setTournament(tData);
      setKnockoutMatches(koData);
      setGroupCategories(grpData.categories || []);

      // Fetch knockout schedule preview (times + courts)
      try {
        const preview = await apiClient.get(`/api/tournaments/${selectedTournamentId}/knockout-preview`);
        setKnockoutPreview(preview);
      } catch {
        setKnockoutPreview(null);
      }
    } catch (err) {
      console.error('Failed to fetch tournament data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTournamentId]);

  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (!autoRefresh || !selectedTournamentId) return;
    const interval = setInterval(fetchTournamentData, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedTournamentId, fetchTournamentData]);

  // Build bracket data
  const bracketsByCategory = buildBrackets(tournament, groupCategories, knockoutMatches, knockoutPreview);

  const selectedT = tournaments.find(t => String(t.id) === selectedTournamentId);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🏅 Brackets</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Lihat posisi dan skor terkini dari setiap kategori turnamen
        </p>
      </div>

      {/* Tournament Selector + Controls */}
      <div className="card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>
            Pilih Turnamen
          </label>
          <select
            className="form-input"
            value={selectedTournamentId}
            onChange={e => setSelectedTournamentId(e.target.value)}
            style={{ fontSize: 14, fontWeight: 500 }}
          >
            <option value="">-- Pilih Turnamen --</option>
            {tournaments.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.name} ({t.status})
              </option>
            ))}
          </select>
        </div>

        {/* Live update toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: '#8b5cf6' }}
            />
            Live Update
          </label>
          {autoRefresh && (
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
              display: 'inline-block', animation: 'pulse 2s infinite',
            }} />
          )}
        </div>

        <button
          className="btn-outline"
          onClick={fetchTournamentData}
          disabled={loading || !selectedTournamentId}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {/* Tournament Info */}
      {selectedT && (
        <div style={{
          padding: '12px 16px', marginBottom: 20, borderRadius: 8,
          background: 'var(--bg-subtle)', fontSize: 13, color: 'var(--text-secondary)',
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span>📍 {selectedT.location}</span>
          <span>📅 {selectedT.startDate?.slice(0, 10)} — {selectedT.endDate?.slice(0, 10)}</span>
          <span style={{
            padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: selectedT.status === 'ONGOING' ? 'rgba(245,158,11,0.15)' : selectedT.status === 'FINISHED' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
            color: selectedT.status === 'ONGOING' ? '#d97706' : selectedT.status === 'FINISHED' ? '#15803d' : '#3b82f6',
          }}>
            {selectedT.status}
          </span>
          {selectedT.currentStage && (
            <span style={{ fontWeight: 600 }}>
              Stage: {selectedT.currentStage}
            </span>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          ⏳ Memuat bracket data...
        </div>
      )}

      {/* Empty state */}
      {!loading && selectedTournamentId && bracketsByCategory.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏸</div>
          <p style={{ fontWeight: 500 }}>Belum ada data bracket</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            Bracket akan muncul setelah turnamen memiliki group dan kategori
          </p>
        </div>
      )}

      {!loading && !selectedTournamentId && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👆</div>
          <p style={{ fontWeight: 500 }}>Pilih turnamen untuk melihat bracket</p>
        </div>
      )}

      {/* Brackets */}
      {!loading && bracketsByCategory.map(bracket => (
        <div key={bracket.categoryId} className="card" style={{ marginBottom: 28, padding: 24 }}>
          {/* Category header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 12,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {bracket.categoryName}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                (Knockout Stage)
              </span>
            </h3>
            {bracket.champion && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 999,
                background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.15))',
                border: '1px solid rgba(234,179,8,0.3)',
              }}>
                <span style={{ fontSize: 16 }}>🏆</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>{bracket.champion}</span>
              </div>
            )}
          </div>

          {/* Bracket tree — horizontal scrollable */}
          <div style={{ display: 'flex', gap: 32, overflowX: 'auto', paddingBottom: 16, paddingRight: 40 }}>
            {bracket.rounds.map((roundObj, rIdx) => (
              <div key={rIdx} style={{
                display: 'flex', flexDirection: 'column', minWidth: 250, flexShrink: 0,
                justifyContent: 'space-around', position: 'relative',
              }}>
                {/* Round label */}
                <div style={{
                  textAlign: 'center', fontWeight: 600, color: '#8b5cf6', marginBottom: 20,
                  fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {roundObj.label}
                </div>

                {/* Match cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'space-around' }}>
                  {roundObj.matches.map((match, mIdx) => (
                    <MatchSlot key={match.id || mIdx} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Pulse animation for live indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}


// ─── Match Slot Card ────────────────────────────────────────────────────────────
function MatchSlot({ match }) {
  const isPlaceholder = match.isPlaceholder;
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'IN_PROGRESS';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: isPlaceholder ? '1px dashed var(--border)' : isLive ? '1.5px solid #f59e0b' : '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 12px',
      boxShadow: isLive ? '0 0 12px rgba(245,158,11,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.2s',
      position: 'relative',
    }}>
      {/* Live indicator */}
      {isLive && (
        <div style={{
          position: 'absolute', top: -6, right: 8,
          background: '#f59e0b', color: 'white',
          fontSize: 9, fontWeight: 700, padding: '1px 6px',
          borderRadius: 4, textTransform: 'uppercase',
        }}>
          🔴 LIVE
        </div>
      )}

      {/* Home team */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '5px 0',
        borderBottom: '1px solid var(--bg-subtle)',
      }}>
        <span style={{
          fontSize: 13, fontWeight: match.winnerTeamId === match.homeTeamId ? 700 : 500,
          color: isPlaceholder ? 'var(--text-faint)' : match.winnerTeamId === match.homeTeamId ? '#16a34a' : 'var(--text-primary)',
        }}>
          {match.homeTeam?.name || match.homeTeamName || 'TBD'}
        </span>
        <span style={{
          fontWeight: 700, fontSize: 13, minWidth: 20, textAlign: 'right',
          color: match.winnerTeamId === match.homeTeamId ? '#16a34a' : 'var(--text-secondary)',
        }}>
          {match.homeScore ?? '-'}
        </span>
      </div>

      {/* Away team */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
        <span style={{
          fontSize: 13, fontWeight: match.winnerTeamId === match.awayTeamId ? 700 : 500,
          color: isPlaceholder ? 'var(--text-faint)' : match.winnerTeamId === match.awayTeamId ? '#16a34a' : 'var(--text-primary)',
        }}>
          {match.awayTeam?.name || match.awayTeamName || 'TBD'}
        </span>
        <span style={{
          fontWeight: 700, fontSize: 13, minWidth: 20, textAlign: 'right',
          color: match.winnerTeamId === match.awayTeamId ? '#16a34a' : 'var(--text-secondary)',
        }}>
          {match.awayScore ?? '-'}
        </span>
      </div>

      {/* Schedule info — shown for BOTH placeholders and real matches */}
      {(match.scheduledAt || match.courtName) && (
        <div style={{
          marginTop: 6, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontSize: 10, color: 'var(--text-muted)',
        }}>
          {!isPlaceholder ? <StatusBadge status={match.status} /> : <span style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>Jadwal Prediksi</span>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {match.courtName && (
              <span style={{ fontWeight: 600, fontSize: 11, color: isPlaceholder ? 'var(--text-faint)' : 'var(--text-primary)' }}>🏟 {match.courtName}</span>
            )}
            {match.scheduledAt && (
              <span style={{ fontSize: 10, color: isPlaceholder ? 'var(--text-faint)' : 'var(--text-muted)' }}>
                {new Date(match.scheduledAt).toLocaleString('id-ID', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Bracket tree builder ───────────────────────────────────────────────────────
function buildBrackets(tournament, groupCategories, knockoutMatches, knockoutPreview) {
  const brackets = [];
  const LABELS = { 1: 'FINAL', 2: 'SEMI-FINALS', 4: 'QUARTER-FINALS', 8: 'ROUND OF 16', 16: 'ROUND OF 32' };

  const isPending = !tournament || tournament.status === 'DRAFT' || tournament.currentStage === 'GROUP';

  // Generate placeholder brackets from group info
  if ((isPending || knockoutMatches.length === 0) && groupCategories && groupCategories.length > 0) {
    groupCategories.forEach(cat => {
      if (!cat.groups) return;
      const gCodes = cat.groups.map(g => g.code).sort();
      if (gCodes.length < 1) return;

      const qualifiers = [];
      gCodes.forEach(code => {
        qualifiers.push({ group: code, rank: 1 });
        qualifiers.push({ group: code, rank: 2 });
      });

      const top = qualifiers.filter(q => q.rank === 1);
      const bot = qualifiers.filter(q => q.rank === 2).reverse();
      const seeded = [];
      for (let i = 0; i < Math.max(top.length, bot.length); i++) {
        if (i < top.length) seeded.push(top[i]);
        if (i < bot.length) seeded.push(bot[i]);
      }

      const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(seeded.length, 2))));
      while (seeded.length < bracketSize) seeded.push(null);

      const rounds = [];
      let matchCount = bracketSize / 2;
      let roundNum = 1;

      // Round 1
      const r1 = [];
      for (let i = 0; i < matchCount; i++) {
        const h = seeded[i * 2];
        const a = seeded[i * 2 + 1];
        r1.push({
          id: `ph-${cat.categoryId}-r1-m${i}`,
          homeTeamName: h ? `Winner Grp ${h.group}` : 'BYE',
          awayTeamName: a ? `Runner Up Grp ${a.group}` : 'BYE',
          status: 'PENDING',
          isPlaceholder: true,
        });
      }
      rounds.push({ label: LABELS[matchCount] || `Round of ${matchCount * 2}`, matches: r1 });

      // Subsequent rounds
      let prev = matchCount;
      roundNum++;
      while (prev > 1) {
        const next = prev / 2;
        const rN = [];
        for (let i = 0; i < next; i++) {
          rN.push({
            id: `ph-${cat.categoryId}-r${roundNum}-m${i}`,
            homeTeamName: 'TBD',
            awayTeamName: 'TBD',
            status: 'PENDING',
            isPlaceholder: true,
          });
        }
        rounds.push({ label: LABELS[next] || `Round of ${next * 2}`, matches: rN });
        prev = next;
        roundNum++;
      }

      brackets.push({ categoryId: cat.categoryId, categoryName: cat.categoryName, rounds, champion: null });
    });

    // Merge knockout-preview schedule data into placeholders
    if (knockoutPreview) {
      brackets.forEach(bracket => {
        const preview = knockoutPreview[String(bracket.categoryId)];
        if (!preview) return;
        bracket.rounds.forEach((roundObj, rIdx) => {
          const previewRound = preview.rounds[rIdx];
          if (!previewRound) return;
          roundObj.matches.forEach((match, mIdx) => {
            const previewMatch = previewRound.matches[mIdx];
            if (!previewMatch) return;
            match.scheduledAt = previewMatch.scheduledAt;
            match.courtName = previewMatch.courtName;
            match.courtId = previewMatch.courtId;
            // Use labels from preview if available
            if (previewMatch.homeLabel && match.homeTeamName !== 'BYE') {
              match.homeTeamName = previewMatch.homeLabel;
            }
            if (previewMatch.awayLabel && match.awayTeamName !== 'BYE') {
              match.awayTeamName = previewMatch.awayLabel;
            }
          });
        });
      });
    }
  } else if (knockoutMatches.length > 0) {
    // Build real brackets from knockout match data
    const catMap = {};
    knockoutMatches.forEach(m => {
      const cid = m.categoryId || 1;
      if (!catMap[cid]) catMap[cid] = {};
      if (!catMap[cid][m.round]) catMap[cid][m.round] = [];
      catMap[cid][m.round].push(m);
    });

    Object.keys(catMap).forEach(cidStr => {
      const cid = parseInt(cidStr);
      const catInfo = tournament?.categories?.find(c => c.id === cid);
      const cName = catInfo ? catInfo.name : `Category ${cid}`;

      const roundMap = catMap[cid];
      const rounds = [];
      const sortedRounds = Object.keys(roundMap).map(Number).sort((a, b) => a - b);

      let champion = null;

      sortedRounds.forEach(r => {
        const rMatches = roundMap[r].sort((a, b) => (a.bracketPosition || 0) - (b.bracketPosition || 0));
        const matchCount = rMatches.length;

        // Check for champion
        if (matchCount === 1 && rMatches[0].status === 'FINISHED' && rMatches[0].winnerTeamId) {
          const w = rMatches[0];
          champion = w.winnerTeamId === w.homeTeamId
            ? (w.homeTeam?.name || 'Winner')
            : (w.awayTeam?.name || 'Winner');
        }

        rounds.push({
          label: LABELS[matchCount] || `ROUND OF ${matchCount * 2}`,
          matches: rMatches,
        });
      });

      brackets.push({ categoryId: cid, categoryName: cName, rounds, champion });
    });
  }

  return brackets;
}
