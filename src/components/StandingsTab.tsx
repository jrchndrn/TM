import React, { useState } from 'react';
import { TournamentState } from '../types/tournament';
import { calculateStandings } from '../utils/standings';
import { TeamBadge } from './TeamBadge';
import { Trophy, Info, ChevronRight, ShieldCheck } from 'lucide-react';

interface StandingsTabProps {
  state: TournamentState;
  onSelectGroup?: (group: string) => void;
  onOpenPosterGenerator: (group?: string) => void;
}

export const StandingsTab: React.FC<StandingsTabProps> = ({
  state,
  onOpenPosterGenerator,
}) => {
  const isGroupFormat = state.format === 'groups_knockout';
  const groupLetters = isGroupFormat
    ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, state.knockoutConfig.groupsCount)
    : [];

  const [activeGroup, setActiveGroup] = useState<string>(
    isGroupFormat ? groupLetters[0] || 'A' : ''
  );

  const standings = calculateStandings(
    state.teams,
    state.matches,
    state.pointsRule,
    isGroupFormat ? activeGroup : undefined
  );

  // Qualification cutoff threshold
  const qualificationCutoff = isGroupFormat
    ? state.knockoutConfig.advancePerGroup
    : state.format === 'league_knockout'
    ? state.knockoutConfig.leaguePlayoffTeams
    : 1;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5">
        <div>
          <div className="text-xs font-semibold text-emerald-400 font-display uppercase tracking-wider">
            Official Competition Table
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display">
            {isGroupFormat ? `Group ${activeGroup} Standings` : 'League Standings'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Win = {state.pointsRule.win} pts · Draw = {state.pointsRule.draw} pts · Loss = {state.pointsRule.loss} pts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenPosterGenerator(isGroupFormat ? activeGroup : undefined)}
            className="px-3.5 py-2 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-all flex items-center gap-2"
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            Generate Table Poster
          </button>
        </div>
      </div>

      {/* Group Switcher Tabs if Groups format */}
      {isGroupFormat && groupLetters.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {groupLetters.map((letter) => (
            <button
              key={letter}
              onClick={() => setActiveGroup(letter)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-display uppercase tracking-wider transition-all ${
                activeGroup === letter
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950 border border-emerald-500'
                  : 'bg-[#09170e] text-slate-400 hover:text-white border border-emerald-950'
              }`}
            >
              Group {letter}
            </button>
          ))}
        </div>
      )}

      {/* Standings Table */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#07130b] border-b border-emerald-900/60 text-slate-400 font-display text-xs">
                <th className="py-3.5 px-3 w-10 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[180px]">Team / Club</th>
                <th className="py-3.5 px-3 text-center w-12" title="Matches Played">P</th>
                <th className="py-3.5 px-3 text-center w-12" title="Matches Won">W</th>
                <th className="py-3.5 px-3 text-center w-12" title="Matches Drawn">D</th>
                <th className="py-3.5 px-3 text-center w-12" title="Matches Lost">L</th>
                <th className="py-3.5 px-3 text-center w-12 hidden md:table-cell" title="Goals For">GF</th>
                <th className="py-3.5 px-3 text-center w-12 hidden md:table-cell" title="Goals Against">GA</th>
                <th className="py-3.5 px-3 text-center w-14" title="Goal Difference">GD</th>
                <th className="py-3.5 px-4 text-center w-16 font-black text-white text-sm" title="Total Points">PTS</th>
                <th className="py-3.5 px-4 text-center min-w-[140px] hidden lg:table-cell" title="Recent Form">Form (Last 5)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/60">
              {standings.map((row, idx) => {
                const isLeader = row.position === 1;
                const isQualified = row.position <= qualificationCutoff;
                const isCutoffLine = row.position === qualificationCutoff && idx < standings.length - 1;

                return (
                  <tr
                    key={row.team.id}
                    className={`transition-colors hover:bg-emerald-950/30 ${
                      isLeader
                        ? 'bg-amber-500/[0.04]'
                        : isQualified
                        ? 'bg-emerald-500/[0.02]'
                        : ''
                    } ${isCutoffLine ? 'border-b-2 border-b-emerald-500/50' : ''}`}
                  >
                    {/* Position */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-md font-display font-bold text-xs ${
                            isLeader
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : isQualified
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {row.position}
                        </span>
                      </div>
                    </td>

                    {/* Team */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <TeamBadge shortCode={row.team.shortCode} color={row.team.color} size="md" />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                            {row.team.name}
                            {isLeader && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {row.team.shortCode} {isGroupFormat ? `· Group ${activeGroup}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* P W D L */}
                    <td className="py-3.5 px-3 text-center text-slate-300 font-medium">{row.played}</td>
                    <td className="py-3.5 px-3 text-center text-slate-300 font-medium">{row.won}</td>
                    <td className="py-3.5 px-3 text-center text-slate-300 font-medium">{row.drawn}</td>
                    <td className="py-3.5 px-3 text-center text-slate-300 font-medium">{row.lost}</td>

                    {/* GF GA */}
                    <td className="py-3.5 px-3 text-center text-slate-400 hidden md:table-cell">{row.goalsFor}</td>
                    <td className="py-3.5 px-3 text-center text-slate-400 hidden md:table-cell">{row.goalsAgainst}</td>

                    {/* GD */}
                    <td
                      className={`py-3.5 px-3 text-center font-display font-bold ${
                        row.goalDifference > 0
                          ? 'text-emerald-400'
                          : row.goalDifference < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>

                    {/* PTS */}
                    <td className="py-3.5 px-4 text-center font-display font-black text-white text-base">
                      {row.points}
                    </td>

                    {/* Form */}
                    <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {row.form.length > 0 ? (
                          row.form.map((res, i) => (
                            <span
                              key={i}
                              className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold font-display ${
                                res === 'W'
                                  ? 'bg-emerald-600 text-white'
                                  : res === 'D'
                                  ? 'bg-slate-700 text-slate-300'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {res}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {standings.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 italic">
                    No teams registered in this group or tournament.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend / Tiebreak explanation */}
        <div className="bg-[#07130b] p-4 border-t border-emerald-950 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/60" />
              <span>Championship Leader / 1st Seed</span>
            </div>
            {qualificationCutoff > 1 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/60" />
                <span>Knockout Playoff Qualification (Top {qualificationCutoff})</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Info className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tiebreakers: Points &gt; Goal Diff (GD) &gt; Goals Scored (GF) &gt; Head-to-Head &gt; Club Name</span>
          </div>
        </div>
      </div>
    </div>
  );
};
