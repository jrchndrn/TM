import React, { useEffect, useState } from 'react';
import { Match, Team, TournamentState } from '../types/tournament';
import { resolveMatchWinner, seedKnockoutBracketFromStandings } from '../utils/knockoutProgression';
import { TeamBadge } from './TeamBadge';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RefreshCw,
  GitFork,
  Award,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface KnockoutTabProps {
  state: TournamentState;
  onUpdateMatches: (updatedMatches: Match[]) => void;
  onOpenMatchModal: (match: Match) => void;
}

export const KnockoutTab: React.FC<KnockoutTabProps> = ({
  state,
  onUpdateMatches,
  onOpenMatchModal,
}) => {
  const knockoutMatches = state.matches.filter((m) => m.stage === 'knockout');
  const teamMap = new Map<string, Team>();
  state.teams.forEach((t) => teamMap.set(t.id, t));

  // Find champion if Final match finished
  const finalMatch = knockoutMatches.find(
    (m) =>
      (m.roundName?.toLowerCase().includes('final') && !m.roundName.toLowerCase().includes('semi') && !m.roundName.toLowerCase().includes('quarter') && !m.isThirdPlacePlayoff) ||
      m.id.includes('final')
  );

  const championTeam = finalMatch && finalMatch.status === 'finished' && finalMatch.winnerTeamId
    ? teamMap.get(finalMatch.winnerTeamId)
    : null;

  useEffect(() => {
    if (championTeam) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#facc15', '#38bdf8', '#ffffff'],
        });
      } catch (err) {
        // silent fail if confetti not supported
      }
    }
  }, [championTeam?.id]);

  // Group knockout matches by round
  const roundsMap: Record<number, Match[]> = {};
  knockoutMatches.forEach((m) => {
    const r = m.knockoutRound || m.round;
    if (!roundsMap[r]) roundsMap[r] = [];
    roundsMap[r].push(m);
  });

  const sortedRoundKeys = Object.keys(roundsMap)
    .map(Number)
    .sort((a, b) => a - b);

  const handleSyncSeeds = () => {
    const updated = seedKnockoutBracketFromStandings(
      state.matches,
      state.teams,
      state.pointsRule,
      state.format,
      state.knockoutConfig
    );
    onUpdateMatches(updated);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Knockout Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5">
        <div>
          <div className="text-xs font-semibold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5" /> Knockout Stage & Playoff Automation
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display">
            Championship Bracket
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic winner progression, cross-group seeds (A1 vs B2), and penalty tiebreaker resolution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {state.format !== 'knockout' && (
            <button
              onClick={handleSyncSeeds}
              className="px-3.5 py-2 text-xs font-bold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-all flex items-center gap-2"
              title="Populates Round 1 of the bracket using the latest standings"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Sync Bracket Seeds from Table
            </button>
          )}
        </div>
      </div>

      {/* Champion Podium Banner if Final Finished */}
      {championTeam && (
        <div className="bg-gradient-to-r from-amber-950/50 via-emerald-950/70 to-amber-950/50 border-2 border-amber-500/60 rounded-2xl p-6 text-center relative overflow-hidden shadow-2xl animate-pulse">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-display font-bold text-xs uppercase tracking-widest mb-2">
            <Trophy className="w-4 h-4 text-amber-400" /> TOURNAMENT CHAMPIONS CROWNED
          </div>
          <div className="flex items-center justify-center gap-3">
            <TeamBadge shortCode={championTeam.shortCode} color={championTeam.color} size="xl" />
            <div className="text-left">
              <h3 className="text-2xl sm:text-4xl font-black text-white font-display tracking-wider">
                {championTeam.name.toUpperCase()}
              </h3>
              <p className="text-sm text-emerald-300 font-medium">
                Official Winners of {state.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Bracket Columns */}
      {knockoutMatches.length > 0 ? (
        <div className="bg-[#07130b] border border-emerald-950 rounded-2xl p-6 overflow-x-auto">
          <div className="flex items-start gap-8 min-w-[700px] justify-between py-4">
            {sortedRoundKeys.map((roundKey, colIdx) => {
              const matchesInRound = roundsMap[roundKey] || [];
              const roundTitle = matchesInRound[0]?.roundName || `Round ${roundKey}`;

              return (
                <div key={roundKey} className="flex-1 min-w-[220px] max-w-[300px] space-y-6">
                  {/* Round Column Header */}
                  <div className="text-center pb-2 border-b border-emerald-900/60">
                    <span className="text-xs font-bold text-emerald-400 font-display uppercase tracking-wider block">
                      {roundTitle}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {matchesInRound.length} match{matchesInRound.length > 1 ? 'es' : ''}
                    </span>
                  </div>

                  {/* Matches List */}
                  <div className="flex flex-col justify-around gap-6 h-full">
                    {matchesInRound.map((m) => {
                      const home = teamMap.get(m.homeTeamId || '');
                      const away = teamMap.get(m.awayTeamId || '');
                      const isFinished = m.status === 'finished';
                      const { winnerId } = resolveMatchWinner(m);

                      return (
                        <div
                          key={m.id}
                          onClick={() => onOpenMatchModal(m)}
                          className={`bg-[#0b1b12] border rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] shadow-sm relative group ${
                            isFinished
                              ? 'border-emerald-700/60'
                              : 'border-emerald-900/50 hover:border-emerald-600'
                          }`}
                        >
                          {/* Match Header / Notes */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                            <span className="font-semibold text-emerald-400 truncate max-w-[120px]">
                              {m.notes || m.roundName || 'Knockout Match'}
                            </span>
                            {m.isThirdPlacePlayoff && (
                              <span className="text-amber-400 font-bold">3rd Place</span>
                            )}
                            {m.status === 'penalty_shootout' ? (
                              <span className="text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600 animate-pulse">
                                PENS
                              </span>
                            ) : m.homeScore !== null && m.awayScore !== null && m.homeScore === m.awayScore && (!m.hasPenalties || m.homePenalties === m.awayPenalties) ? (
                              <span className="text-rose-300 font-bold bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-600 animate-pulse">
                                TIED
                              </span>
                            ) : isFinished && m.hasPenalties ? (
                              <span className="text-amber-300 font-bold">FT (PENS)</span>
                            ) : isFinished ? (
                              <span className="text-emerald-400 font-bold">FT</span>
                            ) : (
                              <span className="text-slate-500 group-hover:text-emerald-400">Score &rarr;</span>
                            )}
                          </div>

                          {/* Home Team Slot */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                              isFinished && winnerId === home?.id
                                ? 'bg-emerald-950/80 border border-emerald-500/50'
                                : 'bg-[#0e2418]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {home ? (
                                <>
                                  <TeamBadge shortCode={home.shortCode} color={home.color} size="sm" />
                                  <span
                                    className={`text-xs truncate ${
                                      winnerId === home.id ? 'font-black text-emerald-300' : 'text-slate-200'
                                    }`}
                                  >
                                    {home.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500 italic truncate">
                                  {m.notes?.includes('Group') ? m.notes.split('vs')[0] : 'Slot Pending'}
                                </span>
                              )}
                            </div>
                            <span className="font-display font-black text-sm text-white ml-2">
                              {m.homeScore !== null && m.homeScore !== undefined ? m.homeScore : '—'}
                            </span>
                          </div>

                          {/* Away Team Slot */}
                          <div
                            className={`flex items-center justify-between p-2 rounded-lg mt-1.5 transition-colors ${
                              isFinished && winnerId === away?.id
                                ? 'bg-emerald-950/80 border border-emerald-500/50'
                                : 'bg-[#0e2418]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {away ? (
                                <>
                                  <TeamBadge shortCode={away.shortCode} color={away.color} size="sm" />
                                  <span
                                    className={`text-xs truncate ${
                                      winnerId === away.id ? 'font-black text-emerald-300' : 'text-slate-200'
                                    }`}
                                  >
                                    {away.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500 italic truncate">
                                  {m.notes?.includes('Group') ? m.notes.split('vs')[1] : 'Slot Pending'}
                                </span>
                              )}
                            </div>
                            <span className="font-display font-black text-sm text-white ml-2">
                              {m.awayScore !== null && m.awayScore !== undefined ? m.awayScore : '—'}
                            </span>
                          </div>

                          {/* Penalty Shootout Banner */}
                          {m.status === 'penalty_shootout' && (
                            <div className="mt-2 text-center text-[10px] font-bold text-amber-300 bg-amber-950/80 py-1 px-2 rounded border border-amber-600 animate-pulse">
                              ⚡ Penalty Shootout Active: Click to record
                            </div>
                          )}

                          {m.hasPenalties && m.homePenalties !== null && m.awayPenalties !== null && (
                            <div className="mt-2 text-center text-[10px] font-bold text-amber-300 bg-amber-950/60 py-1 px-2 rounded border border-amber-800/60 flex items-center justify-between">
                              <span>⚽ Pens: {m.homePenalties} - {m.awayPenalties}</span>
                              {winnerId && (
                                <span className="text-emerald-400 font-semibold truncate max-w-[110px]">
                                  {teamMap.get(winnerId)?.shortCode || 'Winner'} won
                                </span>
                              )}
                            </div>
                          )}

                          {/* Auto Next Destination Indicator */}
                          {m.nextMatchId && (
                            <div className="mt-2 text-[9px] text-slate-500 flex items-center justify-between">
                              <span>Winner advances</span>
                              <ChevronRight className="w-3 h-3 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-2xl p-12 text-center text-slate-500">
          <GitFork className="w-10 h-10 mx-auto text-emerald-900 mb-2" />
          <p className="text-sm font-semibold text-slate-300">No Knockout Bracket configured</p>
          <p className="text-xs text-slate-500 mt-1">
            Current format is &ldquo;{state.format}&rdquo;. You can enable Knockout or Playoff brackets in Setup & Backup!
          </p>
        </div>
      )}

      {/* Cross-Group Explanation Card */}
      <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-white">How Knockout Automation Operates</div>
          <p>
            When Group or League matches conclude, clicking &ldquo;Sync Bracket Seeds from Table&rdquo; assigns the proper 1st and 2nd placed teams directly into their corresponding slots (e.g. 1st Group A plays 2nd Group B).
            As soon as any knockout match is given a final score or penalty shootout result, the winning club automatically moves forward into the next round all the way to the Grand Final!
          </p>
        </div>
      </div>
    </div>
  );
};
