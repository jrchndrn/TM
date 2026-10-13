import React from 'react';
import { Match, Team, TournamentState } from '../types/tournament';
import { calculateStandings, getTopScorers, getTournamentStatistics } from '../utils/standings';
import { TeamBadge } from './TeamBadge';
import {
  Trophy,
  Users,
  Activity,
  Flame,
  Calendar,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface DashboardTabProps {
  state: TournamentState;
  onOpenMatchModal: (match: Match) => void;
  onSwitchTab: (tab: 'standings' | 'fixtures' | 'knockout' | 'posters' | 'stats') => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  state,
  onOpenMatchModal,
  onSwitchTab,
}) => {
  const stats = getTournamentStatistics(state.teams, state.matches, state.pointsRule);
  const topScorers = getTopScorers(state.matches, state.teams);
  const standings = calculateStandings(state.teams, state.matches, state.pointsRule);

  const teamMap = new Map<string, Team>();
  state.teams.forEach((t) => teamMap.set(t.id, t));

  // Recent results (last finished matches)
  const recentResults = state.matches
    .filter((m) => m.status === 'finished' && m.homeScore !== null && m.awayScore !== null)
    .slice(-4)
    .reverse();

  // Upcoming matches (first scheduled matches)
  const upcomingMatches = state.matches
    .filter((m) => m.status !== 'finished')
    .slice(0, 4);

  const leader = stats.leader;
  const goldenBootLeader = topScorers[0] || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Banner with Championship Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1e13] via-[#092b1a] to-[#07190f] border border-emerald-800/40 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest font-display">
              <Sparkles className="w-4 h-4" /> Official Live Tournament Central
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-white tracking-wide">
              {state.name}
            </h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Live standings, Berger round-robin fixtures, cross-group knockout advancement, tiebreaker shootouts, and graphic posters.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSwitchTab('fixtures')}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" /> Manage Fixtures
            </button>
            <button
              onClick={() => onSwitchTab('posters')}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-xl transition-all flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-emerald-400" /> Share Graphics
            </button>
          </div>
        </div>
      </div>

      {/* Penalty Shootout Active Alert Banner */}
      {(() => {
        const shootoutMatch = state.matches.find(
          (m) =>
            m.status === 'penalty_shootout' ||
            (m.stage === 'knockout' &&
              m.homeScore !== null &&
              m.awayScore !== null &&
              m.homeScore === m.awayScore &&
              (!m.hasPenalties || m.homePenalties === m.awayPenalties))
        );
        if (!shootoutMatch) return null;
        const hTeam = teamMap.get(shootoutMatch.homeTeamId || '');
        const aTeam = teamMap.get(shootoutMatch.awayTeamId || '');

        return (
          <div className="bg-gradient-to-r from-amber-950/80 via-[#1c1503] to-amber-950/80 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0">
                <span className="text-xl">⚽</span>
              </div>
              <div>
                <div className="text-xs font-bold text-amber-300 font-display uppercase tracking-wider">
                  Knockout Penalty Shootout Required
                </div>
                <div className="text-sm font-bold text-white">
                  {hTeam?.name || 'Home'} vs {aTeam?.name || 'Away'} ended {shootoutMatch.homeScore}-{shootoutMatch.awayScore}
                </div>
                <div className="text-xs text-amber-200/80 mt-0.5">
                  Record penalty kicks to decide which club advances to the next round.
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenMatchModal(shootoutMatch)}
              className="px-4 py-2 text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-950/50 transition-all shrink-0 flex items-center justify-center gap-1.5"
            >
              Resolve Shootout &rarr;
            </button>
          </div>
        );
      })()}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teams */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
              Teams Registered
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {state.teams.length}
            </span>
            <span className="text-xs text-slate-400">clubs</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400/80">
            Format: {state.format.replace('_', ' ')}
          </div>
        </div>

        {/* Matches Completed */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
              Matches Played
            </span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {stats.matchesPlayed}
            </span>
            <span className="text-xs text-slate-400">/ {stats.matchesTotal}</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {stats.matchesRemaining} fixtures remaining
          </div>
        </div>

        {/* Total Goals */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
              Total Goals
            </span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {stats.totalGoals}
            </span>
            <span className="text-xs text-amber-400">goals</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {stats.goalsPerMatch} goals / game avg
          </div>
        </div>

        {/* Current Leader */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-display">
              Current Leader
            </span>
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            {leader ? (
              <>
                <TeamBadge shortCode={leader.team.shortCode} color={leader.team.color} size="sm" />
                <div className="min-w-0">
                  <div className="font-bold text-white text-sm truncate">{leader.team.name}</div>
                  <div className="text-xs text-emerald-400 font-display">
                    {leader.points} PTS · {leader.goalDifference > 0 ? `+${leader.goalDifference}` : leader.goalDifference} GD
                  </div>
                </div>
              </>
            ) : (
              <span className="text-xs text-slate-500 italic">No matches played</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {standings.length > 0 ? `${standings.length} teams in table` : 'Awaiting scores'}
          </div>
        </div>
      </div>

      {/* Middle Section: Top Scorer Spotlight & Mini Standings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Golden Boot Leader Card */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-400 font-display uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-400" /> Golden Boot Leader
              </span>
              <button
                onClick={() => onSwitchTab('stats')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center"
              >
                All Scorers <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {goldenBootLeader ? (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-black text-white font-display">
                      {goldenBootLeader.playerName}
                    </div>
                    <div className="text-xs text-emerald-400 font-medium">
                      {goldenBootLeader.teamName}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-yellow-400 font-display">
                      {goldenBootLeader.goals}
                    </span>
                    <span className="text-xs text-slate-400 block font-display">GOALS</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-950/70 flex items-center justify-between text-xs text-slate-400">
                  <span>From {goldenBootLeader.matches} match(es)</span>
                  <span>{goldenBootLeader.penalties} penalty goal(s)</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                No goal scorers recorded yet. Add scorers in match score cards!
              </div>
            )}
          </div>

          {/* Quick Attack / Defence highlights */}
          <div className="mt-4 pt-3 border-t border-emerald-950/60 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#0e2418] p-2.5 rounded-lg border border-emerald-900/40">
              <span className="text-[10px] text-slate-400 uppercase font-display block">Best Attack</span>
              <span className="font-bold text-white truncate block">
                {stats.bestAttack ? `${stats.bestAttack.team.name} (${stats.bestAttack.goalsFor}G)` : '—'}
              </span>
            </div>
            <div className="bg-[#0e2418] p-2.5 rounded-lg border border-emerald-900/40">
              <span className="text-[10px] text-slate-400 uppercase font-display block">Best Defence</span>
              <span className="font-bold text-white truncate block">
                {stats.bestDefence ? `${stats.bestDefence.team.name} (${stats.bestDefence.goalsAgainst}GA)` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Standings Quick Preview */}
        <div className="lg:col-span-2 bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                Live Standings (Top 5)
              </h3>
              <span className="text-xs text-emerald-400">· PTS / GD</span>
            </div>
            <button
              onClick={() => onSwitchTab('standings')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              Full Standings <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-emerald-900/60 text-slate-400 font-display text-[11px]">
                  <th className="py-2 px-2 w-8">#</th>
                  <th className="py-2 px-2">Team</th>
                  <th className="py-2 px-2 text-center w-8">P</th>
                  <th className="py-2 px-2 text-center w-8">W</th>
                  <th className="py-2 px-2 text-center w-8">D</th>
                  <th className="py-2 px-2 text-center w-8">L</th>
                  <th className="py-2 px-2 text-center w-12">GD</th>
                  <th className="py-2 px-2 text-center w-10 font-bold text-white">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40">
                {standings.slice(0, 5).map((row) => (
                  <tr key={row.team.id} className="hover:bg-emerald-950/20 transition-colors">
                    <td className="py-2.5 px-2 font-display font-bold text-slate-400">
                      {row.position}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <TeamBadge shortCode={row.team.shortCode} color={row.team.color} size="sm" />
                        <span className="font-semibold text-white truncate">{row.team.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.played}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.won}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.drawn}</td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{row.lost}</td>
                    <td
                      className={`py-2.5 px-2 text-center font-display font-semibold ${
                        row.goalDifference > 0
                          ? 'text-emerald-400'
                          : row.goalDifference < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="py-2.5 px-2 text-center font-display font-extrabold text-white text-sm">
                      {row.points}
                    </td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                      No teams registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Results & Next Fixtures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Results */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
              Recent Results
            </h3>
            <button
              onClick={() => onSwitchTab('fixtures')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center"
            >
              All Matches <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentResults.length > 0 ? (
              recentResults.map((match) => {
                const home = teamMap.get(match.homeTeamId || '');
                const away = teamMap.get(match.awayTeamId || '');
                return (
                  <div
                    key={match.id}
                    onClick={() => onOpenMatchModal(match)}
                    className="p-3 bg-[#0e2418] hover:bg-[#122e1f] border border-emerald-950 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <TeamBadge shortCode={home?.shortCode || 'H'} color={home?.color} size="sm" />
                      <span className="text-xs font-semibold text-white truncate">
                        {home?.name || 'TBD'}
                      </span>
                    </div>

                    <div className="px-3 py-1 bg-[#07130b] border border-emerald-800/40 rounded-md font-display font-bold text-sm text-emerald-300 shrink-0 mx-2 text-center min-w-[58px]">
                      {match.homeScore} - {match.awayScore}
                      {match.hasPenalties && match.homePenalties !== null && (
                        <div className="text-[9px] text-amber-400 font-normal">
                          (P: {match.homePenalties}-{match.awayPenalties})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-right">
                      <span className="text-xs font-semibold text-white truncate">
                        {away?.name || 'TBD'}
                      </span>
                      <TeamBadge shortCode={away?.shortCode || 'A'} color={away?.color} size="sm" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 italic">
                No finished matches yet. Enter scores in the Fixtures tab!
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Fixtures */}
        <div className="bg-[#0b1b12] border border-emerald-900/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
              Upcoming Fixtures
            </h3>
            <button
              onClick={() => onSwitchTab('fixtures')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center"
            >
              Enter Scores <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => {
                const home = teamMap.get(match.homeTeamId || '');
                const away = teamMap.get(match.awayTeamId || '');
                return (
                  <div
                    key={match.id}
                    onClick={() => onOpenMatchModal(match)}
                    className="p-3 bg-[#0e2418] hover:bg-[#122e1f] border border-emerald-950 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <TeamBadge shortCode={home?.shortCode || 'H'} color={home?.color} size="sm" />
                      <span className="text-xs font-semibold text-white truncate">
                        {home?.name || 'TBD'}
                      </span>
                    </div>

                    <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 font-display shrink-0 mx-2 text-center">
                      VS
                      <div className="text-[9px] text-emerald-400/80 font-normal">
                        {match.roundName || `R${match.round}`}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-right">
                      <span className="text-xs font-semibold text-white truncate">
                        {away?.name || 'TBD'}
                      </span>
                      <TeamBadge shortCode={away?.shortCode || 'A'} color={away?.color} size="sm" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 italic">
                All fixtures completed! Check final standings or championship bracket.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
