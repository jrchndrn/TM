import React, { useState } from 'react';
import { Match, Team, TournamentState } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import {
  Calendar,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Clock,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface FixturesTabProps {
  state: TournamentState;
  onUpdateMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
  onAddMatch: (newMatch: Match) => void;
  onOpenMatchModal: (match: Match) => void;
}

export const FixturesTab: React.FC<FixturesTabProps> = ({
  state,
  onUpdateMatch,
  onDeleteMatch,
  onAddMatch,
  onOpenMatchModal,
}) => {
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Fixture Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHomeTeamId, setNewHomeTeamId] = useState<string>(state.teams[0]?.id || '');
  const [newAwayTeamId, setNewAwayTeamId] = useState<string>(state.teams[1]?.id || '');
  const [newRound, setNewRound] = useState<number>(1);
  const [newStage, setNewStage] = useState<'league' | 'group' | 'knockout'>('league');
  const [newGroup, setNewGroup] = useState<string>('A');
  const [newVenue, setNewVenue] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('');

  const teamMap = new Map<string, Team>();
  state.teams.forEach((t) => teamMap.set(t.id, t));

  // Determine available rounds
  const rounds = Array.from(new Set(state.matches.map((m) => m.round))).sort((a, b) => a - b);
  const groups = Array.from(
    new Set(state.matches.map((m) => m.group).filter(Boolean) as string[])
  ).sort();

  // Filter matches
  const filteredMatches = state.matches.filter((m) => {
    if (selectedRound !== 'all' && m.round !== parseInt(selectedRound, 10)) return false;
    if (selectedGroup !== 'all' && m.group !== selectedGroup) return false;
    if (selectedStage !== 'all' && m.stage !== selectedStage) return false;
    if (selectedStatus === 'finished' && m.status !== 'finished') return false;
    if (selectedStatus === 'upcoming' && m.status === 'finished') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const home = teamMap.get(m.homeTeamId || '')?.name.toLowerCase() || '';
      const away = teamMap.get(m.awayTeamId || '')?.name.toLowerCase() || '';
      const roundLabel = (m.roundName || `Round ${m.round}`).toLowerCase();
      if (!home.includes(q) && !away.includes(q) && !roundLabel.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const handleInlineScoreChange = (match: Match, homeVal: string, awayVal: string) => {
    const hs = homeVal.trim() !== '' ? parseInt(homeVal, 10) : null;
    const as = awayVal.trim() !== '' ? parseInt(awayVal, 10) : null;

    let newStatus = match.status;
    let winnerId = match.winnerTeamId || null;
    let hasPens = match.hasPenalties;

    if (hs !== null && as !== null) {
      if (hs > as) {
        newStatus = 'finished';
        winnerId = match.homeTeamId;
      } else if (as > hs) {
        newStatus = 'finished';
        winnerId = match.awayTeamId;
      } else {
        // Equal scores
        if (match.stage === 'knockout') {
          // Check if penalties already decided
          if (
            match.hasPenalties &&
            match.homePenalties !== null &&
            match.homePenalties !== undefined &&
            match.awayPenalties !== null &&
            match.awayPenalties !== undefined &&
            match.homePenalties !== match.awayPenalties
          ) {
            newStatus = 'finished';
            winnerId = match.homePenalties > match.awayPenalties ? match.homeTeamId : match.awayTeamId;
          } else {
            // Must enter penalty shootout state to resolve draw!
            newStatus = 'penalty_shootout';
            hasPens = true;
            winnerId = null;
          }
        } else {
          // Regular league draw
          newStatus = 'finished';
          winnerId = null;
        }
      }
    } else if (hs === null && as === null) {
      newStatus = 'scheduled';
      winnerId = null;
    }

    const updatedMatch: Match = {
      ...match,
      homeScore: hs,
      awayScore: as,
      status: newStatus,
      hasPenalties: hasPens,
      winnerTeamId: winnerId,
    };

    onUpdateMatch(updatedMatch);

    // If knockout match became tied without existing penalties, open modal to resolve shootout
    if (match.stage === 'knockout' && hs !== null && as !== null && hs === as && (!match.hasPenalties || match.homePenalties === match.awayPenalties)) {
      onOpenMatchModal(updatedMatch);
    }
  };

  const handleCreateFixture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeTeamId || !newAwayTeamId || newHomeTeamId === newAwayTeamId) {
      return;
    }

    const homeTeam = teamMap.get(newHomeTeamId);
    const awayTeam = teamMap.get(newAwayTeamId);

    const fixture: Match = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      round: newRound,
      roundName: newStage === 'group' ? `Group ${newGroup} - Round ${newRound}` : `Matchday ${newRound}`,
      stage: newStage,
      group: newStage === 'group' ? newGroup : undefined,
      homeTeamId: newHomeTeamId,
      awayTeamId: newAwayTeamId,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      venue: newVenue.trim() || undefined,
      time: newTime.trim() || undefined,
    };

    onAddMatch(fixture);
    setIsAddModalOpen(false);
    setNewVenue('');
    setNewTime('');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Search / Add Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5">
        <div>
          <div className="text-xs font-semibold text-emerald-400 font-display uppercase tracking-wider">
            Match Schedule & Results
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display">
            Fixtures Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter scores inline, track penalties & goal scorers, or schedule custom matchdays.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Match
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-xl p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search team or matchday..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#07130b] border border-emerald-900/60 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Round Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="bg-[#07130b] border border-emerald-900/60 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Matchdays</option>
            {rounds.map((r) => (
              <option key={r} value={String(r)}>
                Matchday {r}
              </option>
            ))}
          </select>
        </div>

        {/* Group Filter */}
        {groups.length > 0 && (
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-[#07130b] border border-emerald-900/60 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                Group {g}
              </option>
            ))}
          </select>
        )}

        {/* Stage Filter */}
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="bg-[#07130b] border border-emerald-900/60 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">All Stages</option>
          <option value="league">League Stage</option>
          <option value="group">Group Stage</option>
          <option value="knockout">Knockout Stage</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#07130b] border border-emerald-900/60 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="upcoming">Upcoming / Unplayed</option>
          <option value="finished">Completed (FT)</option>
        </select>
      </div>

      {/* Match Cards List */}
      <div className="space-y-3">
        {filteredMatches.length > 0 ? (
          filteredMatches.map((match) => {
            const home = teamMap.get(match.homeTeamId || '');
            const away = teamMap.get(match.awayTeamId || '');
            const isFinished = match.status === 'finished' && match.homeScore !== null && match.awayScore !== null;

            return (
              <div
                key={match.id}
                className="bg-[#0b1b12] border border-emerald-900/40 hover:border-emerald-700/50 rounded-xl p-4 transition-all shadow-sm group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Round & Details */}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-display font-bold text-emerald-400">
                      {match.roundName || `Matchday ${match.round}`}
                    </span>
                    {match.venue && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[120px]">{match.venue}</span>
                      </>
                    )}
                    {match.time && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" /> {match.time}
                        </span>
                      </>
                    )}
                    {match.status === 'penalty_shootout' && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-700 animate-pulse">
                        SHOOTOUT IN PROGRESS
                      </span>
                    )}
                    {isFinished && match.hasPenalties && (
                      <span className="text-[10px] font-bold text-amber-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-amber-800">
                        FT (PENS)
                      </span>
                    )}
                    {isFinished && !match.hasPenalties && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                        FT
                      </span>
                    )}
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => onOpenMatchModal(match)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/60 rounded-lg transition-colors flex items-center gap-1.5"
                      title="Open Scorers & Shootout editor"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Match Details
                    </button>
                    <button
                      onClick={() => onDeleteMatch(match.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-950/20"
                      title="Delete fixture"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scoreboard Body */}
                <div className="mt-3.5 pt-3 border-t border-emerald-950/70 grid grid-cols-12 items-center gap-3">
                  {/* Home Team */}
                  <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                    {home ? (
                      <>
                        <TeamBadge shortCode={home.shortCode} color={home.color} size="md" />
                        <div className="min-w-0">
                          <div className={`text-xs sm:text-sm truncate ${match.winnerTeamId === home.id ? 'font-black text-emerald-300' : 'font-bold text-white'}`}>
                            {home.name}
                          </div>
                          <div className="text-[10px] text-slate-400">Home</div>
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Pending bracket slot</span>
                    )}
                  </div>

                  {/* Score Inputs / Live Score Box */}
                  <div className="col-span-2 flex items-center justify-center gap-1 sm:gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={match.homeScore !== null && match.homeScore !== undefined ? match.homeScore : ''}
                      onChange={(e) =>
                        handleInlineScoreChange(
                          match,
                          e.target.value,
                          match.awayScore !== null && match.awayScore !== undefined ? String(match.awayScore) : ''
                        )
                      }
                      className="w-9 h-9 sm:w-10 sm:h-10 text-center font-display font-extrabold text-base bg-[#0e2418] border border-emerald-700/50 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                    />
                    <span className="text-slate-600 font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={match.awayScore !== null && match.awayScore !== undefined ? match.awayScore : ''}
                      onChange={(e) =>
                        handleInlineScoreChange(
                          match,
                          match.homeScore !== null && match.homeScore !== undefined ? String(match.homeScore) : '',
                          e.target.value
                        )
                      }
                      className="w-9 h-9 sm:w-10 sm:h-10 text-center font-display font-extrabold text-base bg-[#0e2418] border border-emerald-700/50 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {/* Away Team */}
                  <div className="col-span-5 flex items-center justify-end gap-2.5 min-w-0 text-right">
                    {away ? (
                      <>
                        <div className="min-w-0">
                          <div className={`text-xs sm:text-sm truncate ${match.winnerTeamId === away.id ? 'font-black text-emerald-300' : 'font-bold text-white'}`}>
                            {away.name}
                          </div>
                          <div className="text-[10px] text-slate-400">Away</div>
                        </div>
                        <TeamBadge shortCode={away.shortCode} color={away.color} size="md" />
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Pending bracket slot</span>
                    )}
                  </div>
                </div>

                {/* Shootout Attention Banners */}
                {match.status === 'penalty_shootout' && (
                  <button
                    onClick={() => onOpenMatchModal(match)}
                    className="w-full mt-3 py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 rounded-lg text-xs font-bold text-amber-300 flex items-center justify-between transition-colors animate-pulse"
                  >
                    <span>⚡ Penalty Shootout in Progress: Click to enter shootout kicks</span>
                    <span className="underline">Conduct Shootout &rarr;</span>
                  </button>
                )}

                {match.stage === 'knockout' && match.homeScore !== null && match.awayScore !== null && match.homeScore === match.awayScore && (!match.hasPenalties || match.homePenalties === match.awayPenalties) && match.status !== 'penalty_shootout' && (
                  <button
                    onClick={() => onOpenMatchModal(match)}
                    className="w-full mt-3 py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/50 rounded-lg text-xs font-bold text-rose-300 flex items-center justify-between transition-colors"
                  >
                    <span>⚠️ Match Tied in Knockout: Penalty Shootout Needed to Advance Winner</span>
                    <span className="underline">Resolve Shootout &rarr;</span>
                  </button>
                )}

                {/* Scorer Pills & Penalty Note */}
                {(match.hasPenalties || (match.scorers && match.scorers.length > 0)) && (
                  <div className="mt-2.5 pt-2 border-t border-emerald-950/40 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    {match.hasPenalties && match.homePenalties !== null && match.awayPenalties !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300 font-bold bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-900/60 flex items-center gap-1.5">
                          <span>⚽ Pens:</span>
                          <span className="font-display text-xs text-white">{match.homePenalties} - {match.awayPenalties}</span>
                        </span>
                        {match.winnerTeamId && (
                          <span className="text-emerald-400 font-semibold">
                            ({teamMap.get(match.winnerTeamId)?.name || 'Winner'} won on penalties)
                          </span>
                        )}
                      </div>
                    )}

                    {match.scorers && match.scorers.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
                        <span className="text-emerald-400">⚽</span>
                        {match.scorers.map((s) => (
                          <span key={s.id} className="text-slate-300">
                            {s.playerName} {s.minute ? `(${s.minute}')` : ''}
                            {s.isPenalty ? ' [P]' : ''}
                            <span className="text-slate-600">,</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-2xl p-12 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto text-emerald-900 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No fixtures matching current filter</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or add new fixtures manually.</p>
          </div>
        )}
      </div>

      {/* Add Manual Fixture Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleCreateFixture}
            className="w-full max-w-lg bg-[#0b1710] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
              <h3 className="font-display font-bold text-lg text-white">Add Tournament Fixture</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Home Team</label>
                <select
                  value={newHomeTeamId}
                  onChange={(e) => setNewHomeTeamId(e.target.value)}
                  className="w-full bg-[#0e2217] border border-emerald-800/50 rounded-lg p-2 text-white"
                  required
                >
                  {state.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Away Team</label>
                <select
                  value={newAwayTeamId}
                  onChange={(e) => setNewAwayTeamId(e.target.value)}
                  className="w-full bg-[#0e2217] border border-emerald-800/50 rounded-lg p-2 text-white"
                  required
                >
                  {state.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.shortCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Round / Matchday</label>
                <input
                  type="number"
                  min="1"
                  value={newRound}
                  onChange={(e) => setNewRound(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-[#0e2217] border border-emerald-800/50 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Stage</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as any)}
                  className="w-full bg-[#0e2217] border border-emerald-800/50 rounded-lg p-2 text-white"
                >
                  <option value="league">League</option>
                  <option value="group">Group</option>
                  <option value="knockout">Knockout</option>
                </select>
              </div>

              {newStage === 'group' && (
                <div>
                  <label className="block text-slate-400 mb-1">Group Letter</label>
                  <input
                    type="text"
                    maxLength={1}
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value.toUpperCase())}
                    className="w-full bg-[#0e2217] border border-emerald-800/50 rounded-lg p-2 text-white uppercase text-center"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Venue / Pitch</label>
                <input
                  type="text"
                  placeholder="Pitch 1"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  className="w-full bg-[#0e2217] border border-emerald-800/50 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Time / Date</label>
                <input
                  type="text"
                  placeholder="17:00 or Sat 4pm"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-[#0e2217] border border-emerald-800/50 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
              >
                Create Fixture
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
