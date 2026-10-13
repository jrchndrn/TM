import { Match, StandingsRow, Team, TopScorerRow, TournamentPointsRule } from '../types/tournament';

/**
 * Recalculate standings for a set of teams based on finished matches
 */
export function calculateStandings(
  teams: Team[],
  matches: Match[],
  pointsRule: TournamentPointsRule,
  groupFilter?: string
): StandingsRow[] {
  // Filter teams if group is specified
  const filteredTeams = groupFilter
    ? teams.filter((t) => t.group === groupFilter)
    : teams;

  const teamMap = new Map<string, Team>();
  filteredTeams.forEach((t) => teamMap.set(t.id, t));

  // Initialize table
  const rows: Record<string, StandingsRow> = {};
  filteredTeams.forEach((t) => {
    rows[t.id] = {
      team: t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      position: 0,
      form: [],
    };
  });

  // Filter finished matches involving these teams
  // Only include league/group matches for regular standings table (knockout matches tracked separately)
  const relevantMatches = matches.filter((m) => {
    if (m.status !== 'finished' || m.homeScore === null || m.awayScore === null) return false;
    if (m.stage === 'knockout') return false; // knockouts don't count towards league table
    if (groupFilter && m.group !== groupFilter) return false;
    return (
      m.homeTeamId &&
      m.awayTeamId &&
      teamMap.has(m.homeTeamId) &&
      teamMap.has(m.awayTeamId)
    );
  });

  // Sort matches chronologically/round order to get accurate form
  const sortedMatches = [...relevantMatches].sort((a, b) => a.round - b.round);

  for (const match of sortedMatches) {
    const homeId = match.homeTeamId!;
    const awayId = match.awayTeamId!;
    const homeScore = match.homeScore!;
    const awayScore = match.awayScore!;

    const homeRow = rows[homeId];
    const awayRow = rows[awayId];

    if (!homeRow || !awayRow) continue;

    homeRow.played += 1;
    awayRow.played += 1;
    homeRow.goalsFor += homeScore;
    homeRow.goalsAgainst += awayScore;
    awayRow.goalsFor += awayScore;
    awayRow.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeRow.won += 1;
      homeRow.points += pointsRule.win;
      homeRow.form.push('W');

      awayRow.lost += 1;
      awayRow.points += pointsRule.loss;
      awayRow.form.push('L');
    } else if (homeScore < awayScore) {
      awayRow.won += 1;
      awayRow.points += pointsRule.win;
      awayRow.form.push('W');

      homeRow.lost += 1;
      homeRow.points += pointsRule.loss;
      homeRow.form.push('L');
    } else {
      homeRow.drawn += 1;
      awayRow.drawn += 1;
      homeRow.points += pointsRule.draw;
      awayRow.points += pointsRule.draw;
      homeRow.form.push('D');
      awayRow.form.push('D');
    }
  }

  // Calculate goal differences and slice form to last 5
  Object.values(rows).forEach((row) => {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    row.form = row.form.slice(-5);
  });

  // Sort by tiebreaker rules:
  // 1. Points (desc)
  // 2. Goal Difference (desc)
  // 3. Goals For (desc)
  // 4. Head-to-Head between tied teams
  // 5. Team name (asc)
  const sortedRows = Object.values(rows).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    // Head-to-head check
    const h2hMatches = sortedMatches.filter(
      (m) =>
        (m.homeTeamId === a.team.id && m.awayTeamId === b.team.id) ||
        (m.homeTeamId === b.team.id && m.awayTeamId === a.team.id)
    );
    if (h2hMatches.length > 0) {
      let aH2hPts = 0;
      let bH2hPts = 0;
      for (const m of h2hMatches) {
        if (m.homeScore! > m.awayScore!) {
          if (m.homeTeamId === a.team.id) aH2hPts += 3;
          else bH2hPts += 3;
        } else if (m.homeScore! < m.awayScore!) {
          if (m.awayTeamId === a.team.id) aH2hPts += 3;
          else bH2hPts += 3;
        } else {
          aH2hPts += 1;
          bH2hPts += 1;
        }
      }
      if (bH2hPts !== aH2hPts) return bH2hPts - aH2hPts;
    }

    return a.team.name.localeCompare(b.team.name);
  });

  // Assign positions
  sortedRows.forEach((row, index) => {
    row.position = index + 1;
  });

  return sortedRows;
}

/**
 * Aggregate goal scorers from all finished matches into Golden Boot leaderboard
 */
export function getTopScorers(matches: Match[], teams: Team[]): TopScorerRow[] {
  const teamMap = new Map<string, Team>();
  teams.forEach((t) => teamMap.set(t.id, t));

  const scorersMap = new Map<
    string,
    {
      playerName: string;
      teamId: string;
      goals: number;
      penalties: number;
      matchIds: Set<string>;
    }
  >();

  for (const match of matches) {
    if (!match.scorers || match.scorers.length === 0) continue;

    for (const event of match.scorers) {
      if (event.isOwnGoal) continue; // Own goals don't count toward player's golden boot tally
      const trimmedName = event.playerName.trim();
      if (!trimmedName) continue;

      const key = `${trimmedName}__${event.teamId}`;
      if (!scorersMap.has(key)) {
        scorersMap.set(key, {
          playerName: trimmedName,
          teamId: event.teamId,
          goals: 0,
          penalties: 0,
          matchIds: new Set<string>(),
        });
      }

      const playerStat = scorersMap.get(key)!;
      playerStat.goals += 1;
      if (event.isPenalty) playerStat.penalties += 1;
      playerStat.matchIds.add(match.id);
    }
  }

  const result: TopScorerRow[] = Array.from(scorersMap.values()).map((p) => {
    const team = teamMap.get(p.teamId);
    return {
      playerName: p.playerName,
      teamId: p.teamId,
      teamName: team ? team.name : 'Unknown Team',
      teamColor: team ? team.color : '#10b981',
      goals: p.goals,
      penalties: p.penalties,
      matches: p.matchIds.size,
    };
  });

  // Sort by goals (desc), penalties (fewer penalties ranked higher or tiebreak), playerName (asc)
  return result.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (a.penalties !== b.penalties) return a.penalties - b.penalties;
    return a.playerName.localeCompare(b.playerName);
  });
}

export interface TournamentStatsResult {
  matchesTotal: number;
  matchesPlayed: number;
  matchesRemaining: number;
  totalGoals: number;
  goalsPerMatch: string;
  bestAttack: StandingsRow | null;
  bestDefence: StandingsRow | null;
  mostConceded: StandingsRow | null;
  biggestMargin: { margin: number; matchTitle: string; score: string } | null;
  mostCleanSheetsTeam: { team: Team; count: number } | null;
  leader: StandingsRow | null;
}

/**
 * Compute key tournament stats and milestones
 */
export function getTournamentStatistics(
  teams: Team[],
  matches: Match[],
  pointsRule: TournamentPointsRule
): TournamentStatsResult {
  const standings = calculateStandings(teams, matches, pointsRule);

  const finishedMatches = matches.filter(
    (m) => m.status === 'finished' && m.homeScore !== null && m.awayScore !== null
  );

  let totalGoals = 0;
  let biggestMargin = { margin: 0, matchTitle: '', score: '' };

  const teamNameMap = new Map<string, string>();
  teams.forEach((t) => teamNameMap.set(t.id, t.name));

  for (const m of finishedMatches) {
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    totalGoals += hs + as;

    const diff = Math.abs(hs - as);
    if (diff > biggestMargin.margin) {
      const homeName = m.homeTeamId ? teamNameMap.get(m.homeTeamId) || 'Home' : 'Home';
      const awayName = m.awayTeamId ? teamNameMap.get(m.awayTeamId) || 'Away' : 'Away';
      biggestMargin = {
        margin: diff,
        matchTitle: `${homeName} vs ${awayName}`,
        score: `${hs} - ${as}`,
      };
    }
  }

  // Best attack (highest GF)
  const teamsWithMatches = standings.filter((s) => s.played > 0);
  const bestAttack = [...teamsWithMatches].sort((a, b) => b.goalsFor - a.goalsFor)[0] || null;

  // Best defence (lowest GA)
  const bestDefence = [...teamsWithMatches].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0] || null;

  // Most goals conceded
  const mostConceded = [...teamsWithMatches].sort((a, b) => b.goalsAgainst - a.goalsAgainst)[0] || null;

  // Clean sheets count per team
  const cleanSheetsMap = new Map<string, number>();
  teams.forEach((t) => cleanSheetsMap.set(t.id, 0));

  for (const m of finishedMatches) {
    if (m.homeTeamId && m.awayScore === 0) {
      cleanSheetsMap.set(m.homeTeamId, (cleanSheetsMap.get(m.homeTeamId) || 0) + 1);
    }
    if (m.awayTeamId && m.homeScore === 0) {
      cleanSheetsMap.set(m.awayTeamId, (cleanSheetsMap.get(m.awayTeamId) || 0) + 1);
    }
  }

  // Find team with most clean sheets
  let mostCleanSheetsTeam: { team: Team; count: number } | null = null;
  let maxCleanSheets = 0;
  cleanSheetsMap.forEach((count, teamId) => {
    if (count > maxCleanSheets) {
      maxCleanSheets = count;
      const t = teams.find((tm) => tm.id === teamId);
      if (t) mostCleanSheetsTeam = { team: t, count };
    }
  });

  const matchesPlayed = finishedMatches.length;
  const matchesRemaining = matches.length - matchesPlayed;
  const goalsPerMatch = matchesPlayed > 0 ? (totalGoals / matchesPlayed).toFixed(2) : '0.00';

  return {
    matchesTotal: matches.length,
    matchesPlayed,
    matchesRemaining,
    totalGoals,
    goalsPerMatch,
    bestAttack,
    bestDefence,
    mostConceded,
    biggestMargin: biggestMargin.margin > 0 ? biggestMargin : null,
    mostCleanSheetsTeam,
    leader: standings[0] || null,
  };
}
