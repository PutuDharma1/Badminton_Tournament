import React, { useState, useEffect, useRef } from "react";
import matchesApi from "../api/matches";
import tournamentsApi from "../api/tournaments";
import { Trophy, Clock, MapPin, CalendarDays, User, Swords, Info, Search, ChevronDown } from "lucide-react";

function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [tournaments, setTournaments] = useState([]);

  // Searchable Dropdown States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (activeTournamentId) {
      fetchMatches(activeTournamentId);
    } else if (tournaments.length > 0) {
      // Default to first tournament if available
      setActiveTournamentId(tournaments[0].id);
    }
  }, [activeTournamentId, tournaments]);

  // Handle clicking outside to close
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
      console.error("Failed to fetch tournaments", err);
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
      <div className="main-content flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-full inline-block mb-4 text-slate-400 dark:text-slate-500">
          <Trophy size={48} strokeWidth={1} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Matches</h1>
        <p className="text-slate-500 dark:text-slate-400">No tournaments found.</p>
      </div>
    );
  }

  const liveOrScheduled = matches.filter(
    (m) => m.status === "ONGOING" || m.status === "SCHEDULED" || m.status === "FINISHED"
  );
  
  const filteredTournaments = tournaments.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  return (
    <div className="main-content">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
               <CalendarDays size={26} />
            </div>
            Tournament Matches
          </h1>
          <p className="text-slate-500 dark:text-slate-400 ml-1">
            Daftar pertandingan untuk turnamen terpilih.
          </p>
        </div>

        {/* Searchable Tournament Selector */}
        <div className="relative shrink-0 z-50" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full md:w-[300px] flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3 px-4 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-sm text-left"
          >
            <div className="flex items-center gap-2.5 truncate">
               <Trophy size={16} className="text-slate-400 shrink-0" />
               <span className="truncate">{activeTournament ? activeTournament.name : "Select Tournament"}</span>
            </div>
            <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[320px]">
               <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/80 sticky top-0 z-10">
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                     <Search size={14} />
                   </div>
                   <input
                     type="text"
                     placeholder="Cari turnamen..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                     autoFocus
                   />
                 </div>
               </div>
               
               <div className="overflow-y-auto flex-1 p-1">
                 {filteredTournaments.length > 0 ? (
                   filteredTournaments.map((t) => (
                     <button
                       key={t.id}
                       onClick={() => {
                         setActiveTournamentId(t.id);
                         setIsDropdownOpen(false);
                         setSearchQuery("");
                       }}
                       className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                         activeTournamentId === t.id 
                           ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300" 
                           : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                       }`}
                     >
                       {t.name}
                     </button>
                   ))
                 ) : (
                   <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400 italic">
                     Turnamen tidak ditemukan
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <Info size={20} />
          <span>{error}</span>
        </div>
      ) : (
        <div className="mt-4">
          {liveOrScheduled.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center">
               <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
                 <CalendarDays size={32} />
               </div>
               <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Belum Ada Jadwal</h3>
               <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                 Turnamen ini belum memiliki pertandingan yang dijadwalkan atau sedang berlangsung.
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveOrScheduled.map((m) => {
                const isOngoing = m.status === 'ONGOING';
                const isScheduled = m.status === 'SCHEDULED';

                return (
                  <div key={m.id} className="group bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                    
                    {/* Top Bar: Category & Status */}
                    <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Trophy size={14} className="text-indigo-500 dark:text-indigo-400" />
                        <span className="truncate max-w-[130px]" title={m.category?.name || "Category"}>
                           {m.category?.name || "Category"}
                        </span>
                      </div>
                      <span className={`badge ${isOngoing ? 'badge-ongoing animate-pulse' : isScheduled ? 'badge-scheduled' : 'badge-finished'} shadow-sm`}>
                         {m.status}
                      </span>
                    </div>

                    {/* Middle Box: Teams & Score */}
                    <div className="p-5 flex-1 flex flex-col justify-center relative bg-gradient-to-b from-white to-slate-50/30 dark:from-slate-800/50 dark:to-slate-900/20">
                       
                       <div className="text-[10px] font-bold text-slate-400 tracking-widest text-center mb-5 uppercase relative z-10 flex items-center justify-center gap-2">
                           <span className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></span>
                           {m.stage === 'GROUP' ? `Group ${m.groupCode || '-'}` : `${m.stage}`} • Round {m.round}
                           <span className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></span>
                       </div>

                       <div className="flex justify-between items-center relative z-10">
                          {/* Home Team */}
                          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                             <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-3 shadow-inner text-slate-400 dark:text-slate-500">
                                <User size={20} />
                             </div>
                             <span className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                               {m.homeTeam?.name || m.homeTeam?.user?.name || "Home Team"}
                             </span>
                          </div>

                          {/* VS or Score */}
                          <div className="shrink-0 flex flex-col items-center justify-center px-3 gap-1">
                             {(m.homeScore !== null && m.homeScore !== undefined) ? (
                               <div className="flex items-center gap-2 bg-slate-900 dark:bg-black/50 text-white rounded-xl px-3 py-1.5 shadow-md border border-slate-700">
                                  <span className="text-2xl font-black">{m.homeScore}</span>
                                  <span className="text-sm text-slate-400 font-light">-</span>
                                  <span className="text-2xl font-black">{m.awayScore}</span>
                               </div>
                             ) : (
                               <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 italic">
                                 VS
                               </div>
                             )}
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                             <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-3 shadow-inner text-slate-400 dark:text-slate-500">
                                <User size={20} />
                             </div>
                             <span className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                               {m.awayTeam?.name || m.awayTeam?.user?.name || "Away Team"}
                             </span>
                          </div>
                       </div>
                    </div>

                    {/* Bottom Footer: Info */}
                    <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col gap-1.5">
                         <div className="flex items-center gap-1.5 font-medium">
                            <Clock size={13} className={isOngoing ? "text-amber-500" : ""} />
                            {m.scheduledAt ? new Date(m.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                         </div>
                         <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5">
                            <MapPin size={14} className={isOngoing ? "text-amber-500" : "text-indigo-500 dark:text-indigo-400"} />
                            <span className="text-xs font-semibold text-base-content whitespace-nowrap">
                              {m.court?.name ? m.court.name : m.courtId ? `Court ${m.courtId}` : 'Court TBD'}
                            </span>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="font-semibold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Referee</p>
                         <p className="truncate max-w-[90px]" title={m.referee?.name || "Belum ditugaskan"}>
                           {m.referee?.name || "TBA"}
                         </p>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Matches;
