import React from 'react';
import { TournamentState } from '../types/tournament';
import { calculateStandings, getTopScorers, getTournamentStatistics } from '../utils/standings';
import { TeamBadge } from './TeamBadge';
import {
  Trophy,
  Flame,
  Shield,
  Award,
  Sparkles,
  Zap,
} from 'lucide-react';

interface StatsTabProps {
  state: TournamentState;
  onOpenPosterGenerator: () => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  state,
  onOpenPosterGenerator,
}) => {
  const topScorers = getTopScorers(state.matches, state.teams);
  const stats = getTournamentStatistics(state.teams, state.matches, state.pointsRule);
  const standings = calculateStandings(state.teams, state.matches, state.pointsRule);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5">
        <div>
          <div className="text-xs font-semibold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Individual & Team Honors
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display">
            Statistics & Golden Boot
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time player scoring records, attack & defence rankings, and tournament records.
          </p>
        </div>

        <button
          onClick={onOpenPosterGenerator}
          className="px-3.5 py-2 text-xs font-bold text-emerald-200 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-all flex items-center gap-2"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          Generate Golden Boot Poster
        </button>
      </div>

      {/* Top 4 Tournament Records Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Golden Boot Leader */}
        <div className="bg-[#0b1b12] border border-amber-500/30 rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs font-bold text-amber-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Golden Boot Leader
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-display truncate">
              {topScorers[0]?.playerName || 'No scorers yet'}
            </div>
            <div className="text-xs text-slate-400">
              {topScorers[0]?.teamName || 'Record goals'}
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-300 font-display">
            {topScorers[0]?.goals || 0} <span className="text-xs text-slate-400">GOALS</span>
          </div>
        </div>

        {/* Best Attack */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4">
          <div className="text-xs font-bold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Best Attack
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-display truncate">
              {stats.bestAttack?.team.name || '—'}
            </div>
            <div className="text-xs text-slate-400">
              {stats.bestAttack ? `${stats.bestAttack.played} matches played` : 'No matches'}
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400 font-display">
            {stats.bestAttack?.goalsFor || 0} <span className="text-xs text-slate-400">SCORED</span>
          </div>
        </div>

        {/* Best Defence */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4">
          <div className="text-xs font-bold text-cyan-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Best Defence
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-display truncate">
              {stats.bestDefence?.team.name || '—'}
            </div>
            <div className="text-xs text-slate-400">
              {stats.bestDefence ? `${stats.bestDefence.played} matches played` : 'No matches'}
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-400 font-display">
            {stats.bestDefence?.goalsAgainst || 0} <span className="text-xs text-slate-400">CONCEDED</span>
          </div>
        </div>

        {/* Biggest Win Margin */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4">
          <div className="text-xs font-bold text-purple-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Biggest Margin
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-white font-display truncate">
              {stats.biggestMargin ? stats.biggestMargin.score : '—'}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {stats.biggestMargin ? stats.biggestMargin.matchTitle : 'No blowout games'}
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-purple-400 font-display">
            {stats.biggestMargin ? `+${stats.biggestMargin.margin}` : '0'}{' '}
            <span className="text-xs text-slate-400">DIFF</span>
          </div>
        </div>
      </div>

      {/* Main Section: Golden Boot Leaderboard Table */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-[#07130b] border-b border-emerald-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
              Golden Boot Table (Top Goal Scorers)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {topScorers.length} scorer(s) registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-emerald-900/60 text-slate-400 font-display text-xs">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Club</th>
                <th className="py-3 px-4 text-center w-24">Matches</th>
                <th className="py-3 px-4 text-center w-24">Penalties</th>
                <th className="py-3 px-4 text-center w-28 font-bold text-amber-400">Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/50">
              {topScorers.map((scorer, idx) => {
                const isFirst = idx === 0;
                return (
                  <tr
                    key={`${scorer.playerName}-${scorer.teamId}`}
                    className={`hover:bg-emerald-950/20 transition-colors ${
                      isFirst ? 'bg-amber-500/[0.04]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-display font-bold text-xs ${
                          isFirst
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-900'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        {scorer.playerName}
                        {isFirst && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: scorer.teamColor }}
                        />
                        <span className="text-slate-300">{scorer.teamName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                      {scorer.matches}
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                      {scorer.penalties}
                    </td>
                    <td className="py-3.5 px-4 text-center font-display font-black text-amber-400 text-base">
                      {scorer.goals}
                    </td>
                  </tr>
                );
              })}

              {topScorers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    No goal scorers registered yet. Enter goal scorer names when recording match scores in the Fixtures tab!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Attack & Defence Comparison List */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5">
        <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-4">
          Team Goalscoring & Defensive Records
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {standings.map((row) => (
            <div
              key={row.team.id}
              className="bg-[#07130b] border border-emerald-950 p-3.5 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <TeamBadge shortCode={row.team.shortCode} color={row.team.color} size="sm" />
                <div className="min-w-0 font-bold text-white truncate">{row.team.name}</div>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-emerald-950 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block">GF</span>
                  <span className="font-bold text-emerald-400 font-display">{row.goalsFor}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">GA</span>
                  <span className="font-bold text-rose-400 font-display">{row.goalsAgainst}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">GD</span>
                  <span className="font-bold text-white font-display">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
