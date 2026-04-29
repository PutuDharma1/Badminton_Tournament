import React, { useState, useEffect, useRef } from "react";
import matchesApi from "../api/matches";
import tournamentsApi from "../api/tournaments";
import { Trophy, Clock, MapPin, CalendarDays, User, Search, ChevronDown, Info } from "lucide-react";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [tournaments, setTournaments] = useState([]);

  const [selectedDay, setSelectedDay] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => { fetchTournaments(); }, []);

  useEffect(() => {
    if (activeTournamentId) {
      fetchMatches(activeTournamentId);
    } else if (tournaments.length > 0) {
      setActiveTournamentId(tournaments[0].id);
    }
  }, [activeTournamentId, tournaments]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTournaments = async () => {
    try {
      const data = await tournamentsApi.getTournaments();
      setTournaments(data);
      if (data.length > 0 && !activeTournamentId) {
        setActiveTournamentId(data[0].id);
      }
    } catch (err) {
      setError(`Failed to load tournaments: ${err.message}`);
    }
  };

  const fetchMatches = async (tournamentId) => {
    try {
      setLoading(true);
      const data = await matchesApi.getMatches(tournamentId);
      setMatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (tournaments.length === 0 && !loading) {
    return (
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'var(--bg-subtle)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-faint)', marginBottom: 16,
        }}>
          <Trophy size={36} strokeWidth={1.5} />
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Matches</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No tournaments found.</p>
      </div>
    );
  }

  const liveOrScheduled = matches.filter(
    (m) => m.status === "ONGOING" || m.status === "SCHEDULED" || m.status === "FINISHED"
  );

  // Group matches by date
  const matchesByDay = {};
  liveOrScheduled.forEach(m => {
    if (!m.scheduledAt) {
      const key = 'unscheduled';
      if (!matchesByDay[key]) matchesByDay[key] = [];
      matchesByDay[key].push(m);
      return;
    }
    const d = new Date(m.scheduledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!matchesByDay[key]) matchesByDay[key] = [];
    matchesByDay[key].push(m);
  });
  const dayKeys = Object.keys(matchesByDay).filter(k => k !== 'unscheduled').sort();
  const totalDays = dayKeys.length;
  const clampedDay = Math.min(selectedDay, Math.max(1, totalDays));
  const currentDayKey = dayKeys[clampedDay - 1];
  const currentDayMatches = (currentDayKey ? matchesByDay[currentDayKey] : [])
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        marginBottom: 32, paddingBottom: 24,
        borderBottom: '1.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(var(--accent-rgb), 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                <CalendarDays size={22} />
              </div>
              <h1 className="page-title">Tournament Matches</h1>
            </div>
            <p className="page-subtitle">Match schedule for the selected tournament.</p>
          </div>

          {/* Tournament Selector */}
          <div style={{ position: 'relative', flexShrink: 0, zIndex: 50 }} ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                width: 280,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '10px 14px', borderRadius: 12,
                boxShadow: 'var(--shadow-card)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 13.5, fontWeight: 500,
                textAlign: 'left',
                transition: 'border-color 0.2s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <Trophy size={15} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeTournament ? activeTournament.name : "Select Tournament"}
                </span>
              </span>
              <ChevronDown
                size={15}
                style={{
                  color: 'var(--text-faint)', flexShrink: 0,
                  transition: 'transform 0.2s ease',
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                }}
              />
            </button>

            {isDropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)',
                left: 0, right: 0,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-modal)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                maxHeight: 320,
                animation: 'dropIn 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
              }}>
                <div style={{
                  padding: 8,
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{
                      position: 'absolute', left: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-faint)', pointerEvents: 'none',
                    }} />
                    <input
                      type="text"
                      placeholder="Search tournaments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: 32, fontSize: 13, padding: '7px 10px 7px 32px' }}
                      autoFocus
                    />
                  </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: 4 }}>
                  {filteredTournaments.length > 0 ? (
                    filteredTournaments.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTournamentId(t.id);
                          setIsDropdownOpen(false);
                          setSearchQuery("");
                        }}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '9px 12px', borderRadius: 8,
                          fontSize: 13, fontWeight: 500,
                          border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          transition: 'background 0.15s ease',
                          background: activeTournamentId === t.id
                            ? 'rgba(var(--accent-rgb), 0.1)'
                            : 'transparent',
                          color: activeTournamentId === t.id
                            ? 'var(--accent)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        {t.name}
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                      No tournaments found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Info size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <div>
          {liveOrScheduled.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1.5px dashed var(--border)',
              borderRadius: 18,
              padding: '56px 24px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--bg-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-faint)', marginBottom: 16,
              }}>
                <CalendarDays size={28} />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17, fontWeight: 600,
                color: 'var(--text-secondary)', marginBottom: 6,
              }}>
                No Matches Scheduled
              </h3>
              <p style={{ color: 'var(--text-faint)', fontSize: 13.5, maxWidth: 340 }}>
                This tournament doesn't have any scheduled or active matches yet.
              </p>
            </div>
          ) : (
            <div>
              {/* Day selector */}
              {totalDays > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {dayKeys.map((dk, idx) => {
                      const dayNum = idx + 1;
                      const dateLabel = new Date(dk).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                      const isActive = clampedDay === dayNum;
                      return (
                        <button
                          key={dk}
                          onClick={() => setSelectedDay(dayNum)}
                          style={{
                            padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                            cursor: 'pointer',
                            border: isActive ? '1px solid var(--round-btn-border-active)' : '1px solid var(--border)',
                            background: isActive ? 'var(--round-btn-bg-active)' : 'var(--bg-card)',
                            color: isActive ? 'var(--round-btn-text-active)' : 'var(--text-muted)',
                            transition: 'all 0.15s',
                          }}
                        >
                          Day {dayNum} — {dateLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day header */}
              {totalDays > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-secondary)' }}>
                    Day {clampedDay} — {currentDayKey ? new Date(currentDayKey).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                  </h3>
                  <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                    {currentDayMatches.length} match{currentDayMatches.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              )}

              <div className="stagger-in" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 14,
              }}>
                {(totalDays > 0 ? currentDayMatches : liveOrScheduled).map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match: m }) {
  const isOngoing = m.status === 'ONGOING';
  const isScheduled = m.status === 'SCHEDULED';

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.25s ease, transform 0.25s ease',
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
      {/* Header: Category & Status */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-subtle)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--text-faint)',
        }}>
          <Trophy size={13} style={{ color: 'var(--accent)' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
            {m.category?.name || "Category"}
          </span>
        </div>
        <span className={`badge ${isOngoing ? 'badge-ongoing' : isScheduled ? 'badge-scheduled' : 'badge-finished'}`}>
          {m.status}
        </span>
      </div>

      {/* Match body */}
      <div style={{ padding: '18px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Stage label */}
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'var(--text-faint)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          textAlign: 'center',
          marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
          {m.stage === 'GROUP' ? `Group ${m.groupCode || '-'}` : m.stage} &middot; Round {m.round}
          <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
        </div>

        {/* Teams & Score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Home */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 4px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--bg-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 8, color: 'var(--text-faint)',
            }}>
              <User size={18} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {m.homeTeam?.name || m.homeTeam?.user?.name || "Home Team"}
            </span>
          </div>

          {/* VS / Score */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
            {(m.homeScore !== null && m.homeScore !== undefined) ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--text-primary)',
                color: 'var(--bg-base)',
                borderRadius: 10,
                padding: '6px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{m.homeScore}</span>
                <span style={{ fontSize: 13, opacity: 0.5 }}>-</span>
                <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{m.awayScore}</span>
              </div>
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--bg-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                color: 'var(--text-faint)',
              }}>
                VS
              </div>
            )}
          </div>

          {/* Away */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 4px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--bg-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 8, color: 'var(--text-faint)',
            }}>
              <User size={18} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {m.awayTeam?.name || m.awayTeam?.user?.name || "Away Team"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 12,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)', fontWeight: 500 }}>
            <Clock size={12} style={isOngoing ? { color: 'var(--accent-orange)' } : {}} />
            {m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>
            <MapPin size={12} style={{ color: 'var(--accent)' }} />
            {m.court?.name ? m.court.name : m.courtId ? `Court ${m.courtId}` : 'Court TBD'}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: 2 }}>
            Referee
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.referee?.name || "TBA"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Matches;
