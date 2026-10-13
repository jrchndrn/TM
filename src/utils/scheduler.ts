import { KnockoutConfig, Match, Team, TournamentFormat } from '../types/tournament';

/**
 * Berger / Round-Robin schedule generator
 */
export function generateRoundRobinFixtures(teams: Team[], stage: 'league' | 'group' = 'league', groupName?: string): Match[] {
  if (teams.length < 2) return [];

  const teamList = [...teams];
  const isOdd = teamList.length % 2 !== 0;

  // If odd number of teams, add a dummy bye marker
  if (isOdd) {
    teamList.push({
      id: '__BYE__',
      name: 'BYE',
      shortCode: 'BYE',
      color: '#000000',
    });
  }

  const n = teamList.length;
  const totalRounds = n - 1;
  const matchesPerRound = n / 2;
  const matches: Match[] = [];

  for (let round = 0; round < totalRounds; round++) {
    for (let matchIdx = 0; matchIdx < matchesPerRound; matchIdx++) {
      let home = (round + matchIdx) % (n - 1);
      let away = (n - 1 - matchIdx + round) % (n - 1);

      // Last team stays fixed at pivot
      if (matchIdx === 0) {
        away = n - 1;
      }

      // Alternate home/away to maintain balance
      if (round % 2 === 1 && matchIdx === 0) {
        const temp = home;
        home = away;
        away = temp;
      }

      const homeTeam = teamList[home];
      const awayTeam = teamList[away];

      // Skip bye matches
      if (homeTeam.id === '__BYE__' || awayTeam.id === '__BYE__') {
        continue;
      }

      const matchId = `match_${stage}_${groupName ? groupName + '_' : ''}r${round + 1}_${matches.length + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      matches.push({
        id: matchId,
        round: round + 1,
        roundName: groupName ? `Group ${groupName} - Matchday ${round + 1}` : `Matchday ${round + 1}`,
        stage,
        group: groupName,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      });
    }
  }

  return matches;
}

/**
 * Assign teams to groups (A, B, C, etc.)
 */
export function assignTeamsToGroups(teams: Team[], groupsCount: 2 | 4 | 8): Team[] {
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, groupsCount);
  
  return teams.map((team, index) => {
    const group = groupLetters[index % groupsCount];
    return {
      ...team,
      group,
    };
  });
}

/**
 * Generate full group stage fixtures
 */
export function generateGroupStageFixtures(teamsWithGroups: Team[], groupsCount: 2 | 4 | 8): Match[] {
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, groupsCount);
  const allMatches: Match[] = [];

  groupLetters.forEach((letter) => {
    const groupTeams = teamsWithGroups.filter((t) => t.group === letter);
    const groupMatches = generateRoundRobinFixtures(groupTeams, 'group', letter);
    allMatches.push(...groupMatches);
  });

  return allMatches;
}

/**
 * Knockout Bracket structure generator with accurate cross-group and playoff pairings
 */
export function generateKnockoutBracket(
  format: TournamentFormat,
  teams: Team[],
  config: KnockoutConfig,
  currentRoundOffset = 0
): Match[] {
  const matches: Match[] = [];

  if (format === 'knockout') {
    // Pure knockout from existing teams list
    return generatePureKnockoutBracket(teams, config.hasThirdPlacePlayoff, currentRoundOffset);
  }

  if (format === 'league_knockout') {
    // League playoffs: 2, 4, or 8 teams
    return generateLeaguePlayoffBracket(config.leaguePlayoffTeams, config.hasThirdPlacePlayoff, currentRoundOffset);
  }

  if (format === 'groups_knockout') {
    // Groups + Knockout bracket
    return generateGroupsKnockoutBracket(config.groupsCount, config.advancePerGroup, config.hasThirdPlacePlayoff, currentRoundOffset);
  }

  return matches;
}

/**
 * Pure Single Elimination Knockout with power-of-2 bracket and bye handling
 */
function generatePureKnockoutBracket(teams: Team[], hasThirdPlace: boolean, roundOffset: number): Match[] {
  const count = teams.length;
  if (count < 2) return [];

  // Find next power of 2
  let power = 2;
  while (power < count) {
    power *= 2;
  }

  const byesCount = power - count;
  const numRounds = Math.log2(power); // e.g. 8 -> 3 rounds (QF, SF, Final)

  const bracketMatches: Match[] = [];
  const roundMatchMap: Record<number, Match[]> = {};

  // Names for rounds based on remaining teams
  const getRoundName = (teamsInRound: number): string => {
    if (teamsInRound === 2) return 'Final';
    if (teamsInRound === 4) return 'Semi-final';
    if (teamsInRound === 8) return 'Quarter-final';
    if (teamsInRound === 16) return 'Round of 16';
    if (teamsInRound === 32) return 'Round of 32';
    return `Round of ${teamsInRound}`;
  };

  // Build the tree from Final backwards, or from Round 1 forwards.
  // Standard approach: create round by round.
  let currentRoundTeams = power;

  // Let's create from Final down to Round 1
  for (let r = numRounds; r >= 1; r--) {
    const matchesInRound = Math.pow(2, numRounds - r);
    roundMatchMap[r] = [];

    for (let m = 0; m < matchesInRound; m++) {
      const matchId = `ko_r${r}_m${m + 1}`;
      const roundName = getRoundName(Math.pow(2, numRounds - r + 1));

      const match: Match = {
        id: matchId,
        round: roundOffset + r,
        roundName,
        stage: 'knockout',
        knockoutRound: r,
        knockoutMatchNumber: m + 1,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        nextMatchId: r < numRounds ? `ko_r${r + 1}_m${Math.floor(m / 2) + 1}` : null,
        nextMatchSlot: r < numRounds ? (m % 2 === 0 ? 'home' : 'away') : null,
      };

      roundMatchMap[r].push(match);
      bracketMatches.push(match);
    }
  }

  // Assign teams into Round 1 (r = 1)
  const round1Matches = roundMatchMap[1];
  
  // Arrange seeds so 1 plays last, 2 plays second-to-last, etc.
  const seededTeams: (Team | null)[] = [...teams];
  // Pad with byes (nulls)
  for (let i = 0; i < byesCount; i++) {
    seededTeams.push(null);
  }

  // Interleave seeds for classic tournament bracket (1 vs P, 2 vs P-1, etc.)
  let teamIdx = 0;
  for (let m = 0; m < round1Matches.length; m++) {
    const home = seededTeams[teamIdx++] || null;
    const away = seededTeams[power - teamIdx] || null;

    round1Matches[m].homeTeamId = home ? home.id : null;
    round1Matches[m].awayTeamId = away ? away.id : null;

    // If one team has a bye, mark match as auto-advanced
    if (home && !away) {
      round1Matches[m].status = 'finished';
      round1Matches[m].homeScore = 1;
      round1Matches[m].awayScore = 0;
      round1Matches[m].winnerTeamId = home.id;
      round1Matches[m].isBye = true;
      round1Matches[m].notes = `${home.name} advances on BYE`;

      // Propagate directly to next round!
      if (round1Matches[m].nextMatchId) {
        const nextMatch = bracketMatches.find((x) => x.id === round1Matches[m].nextMatchId);
        if (nextMatch) {
          if (round1Matches[m].nextMatchSlot === 'home') {
            nextMatch.homeTeamId = home.id;
          } else {
            nextMatch.awayTeamId = home.id;
          }
        }
      }
    } else if (!home && away) {
      round1Matches[m].status = 'finished';
      round1Matches[m].homeScore = 0;
      round1Matches[m].awayScore = 1;
      round1Matches[m].winnerTeamId = away.id;
      round1Matches[m].isBye = true;
      round1Matches[m].notes = `${away.name} advances on BYE`;

      if (round1Matches[m].nextMatchId) {
        const nextMatch = bracketMatches.find((x) => x.id === round1Matches[m].nextMatchId);
        if (nextMatch) {
          if (round1Matches[m].nextMatchSlot === 'home') {
            nextMatch.homeTeamId = away.id;
          } else {
            nextMatch.awayTeamId = away.id;
          }
        }
      }
    }
  }

  // Add 3rd place playoff if requested
  if (hasThirdPlace && numRounds >= 2) {
    bracketMatches.push({
      id: 'ko_3rd_place',
      round: roundOffset + numRounds,
      roundName: '3rd Place Playoff',
      stage: 'knockout',
      knockoutRound: numRounds,
      knockoutMatchNumber: 99,
      isThirdPlacePlayoff: true,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
    });
  }

  return bracketMatches;
}

/**
 * Generate League Playoff bracket (Top 2, 4, or 8)
 */
function generateLeaguePlayoffBracket(numTeams: number, hasThirdPlace: boolean, roundOffset: number): Match[] {
  const matches: Match[] = [];

  if (numTeams === 2) {
    matches.push({
      id: 'lp_final',
      round: roundOffset + 1,
      roundName: 'Championship Final',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      notes: '1st in League vs 2nd in League',
    });
    return matches;
  }

  if (numTeams === 4) {
    // SF 1: 1st vs 4th -> Final (home)
    matches.push({
      id: 'lp_sf1',
      round: roundOffset + 1,
      roundName: 'Semi-final 1',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'lp_final',
      nextMatchSlot: 'home',
      notes: '1st in League vs 4th in League',
    });

    // SF 2: 2nd vs 3rd -> Final (away)
    matches.push({
      id: 'lp_sf2',
      round: roundOffset + 1,
      roundName: 'Semi-final 2',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 2,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'lp_final',
      nextMatchSlot: 'away',
      notes: '2nd in League vs 3rd in League',
    });

    // Final
    matches.push({
      id: 'lp_final',
      round: roundOffset + 2,
      roundName: 'Championship Final',
      stage: 'knockout',
      knockoutRound: 2,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      notes: 'Winner SF1 vs Winner SF2',
    });

    if (hasThirdPlace) {
      matches.push({
        id: 'lp_3rd_place',
        round: roundOffset + 2,
        roundName: '3rd Place Playoff',
        stage: 'knockout',
        knockoutRound: 2,
        knockoutMatchNumber: 99,
        isThirdPlacePlayoff: true,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        notes: 'Loser SF1 vs Loser SF2',
      });
    }

    return matches;
  }

  // Top 8
  const qfs = [
    { id: 'lp_qf1', name: 'Quarter-final 1', notes: '1st vs 8th', next: 'lp_sf1', slot: 'home' as const },
    { id: 'lp_qf2', name: 'Quarter-final 2', notes: '4th vs 5th', next: 'lp_sf1', slot: 'away' as const },
    { id: 'lp_qf3', name: 'Quarter-final 3', notes: '2nd vs 7th', next: 'lp_sf2', slot: 'home' as const },
    { id: 'lp_qf4', name: 'Quarter-final 4', notes: '3rd vs 6th', next: 'lp_sf2', slot: 'away' as const },
  ];

  qfs.forEach((q, idx) => {
    matches.push({
      id: q.id,
      round: roundOffset + 1,
      roundName: q.name,
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: idx + 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: q.next,
      nextMatchSlot: q.slot,
      notes: q.notes,
    });
  });

  matches.push({
    id: 'lp_sf1',
    round: roundOffset + 2,
    roundName: 'Semi-final 1',
    stage: 'knockout',
    knockoutRound: 2,
    knockoutMatchNumber: 1,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    nextMatchId: 'lp_final',
    nextMatchSlot: 'home',
  });

  matches.push({
    id: 'lp_sf2',
    round: roundOffset + 2,
    roundName: 'Semi-final 2',
    stage: 'knockout',
    knockoutRound: 2,
    knockoutMatchNumber: 2,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    nextMatchId: 'lp_final',
    nextMatchSlot: 'away',
  });

  matches.push({
    id: 'lp_final',
    round: roundOffset + 3,
    roundName: 'Championship Final',
    stage: 'knockout',
    knockoutRound: 3,
    knockoutMatchNumber: 1,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
  });

  if (hasThirdPlace) {
    matches.push({
      id: 'lp_3rd_place',
      round: roundOffset + 3,
      roundName: '3rd Place Playoff',
      stage: 'knockout',
      knockoutRound: 3,
      knockoutMatchNumber: 99,
      isThirdPlacePlayoff: true,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
    });
  }

  return matches;
}

/**
 * Generate Groups + Knockout bracket with verified cross-group pairings!
 */
function generateGroupsKnockoutBracket(
  groupsCount: 2 | 4 | 8,
  advancePerGroup: 1 | 2,
  hasThirdPlace: boolean,
  roundOffset: number
): Match[] {
  const matches: Match[] = [];

  // CASE 1: 2 Groups, Top 2 Advance (4 teams: Semi-finals -> Final)
  // Cross pairings: A1 vs B2, B1 vs A2
  if (groupsCount === 2 && advancePerGroup === 2) {
    matches.push({
      id: 'gk_sf1',
      round: roundOffset + 1,
      roundName: 'Semi-final 1',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'home',
      notes: '1st Group A vs 2nd Group B',
    });

    matches.push({
      id: 'gk_sf2',
      round: roundOffset + 1,
      roundName: 'Semi-final 2',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 2,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'away',
      notes: '1st Group B vs 2nd Group A',
    });

    matches.push({
      id: 'gk_final',
      round: roundOffset + 2,
      roundName: 'Grand Final',
      stage: 'knockout',
      knockoutRound: 2,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      notes: 'Winner SF1 vs Winner SF2',
    });

    if (hasThirdPlace) {
      matches.push({
        id: 'gk_3rd_place',
        round: roundOffset + 2,
        roundName: '3rd Place Playoff',
        stage: 'knockout',
        knockoutRound: 2,
        knockoutMatchNumber: 99,
        isThirdPlacePlayoff: true,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        notes: 'Loser SF1 vs Loser SF2',
      });
    }

    return matches;
  }

  // CASE 2: 2 Groups, Top 1 Advances (2 teams: Grand Final)
  if (groupsCount === 2 && advancePerGroup === 1) {
    matches.push({
      id: 'gk_final',
      round: roundOffset + 1,
      roundName: 'Grand Final',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      notes: '1st Group A vs 1st Group B',
    });
    return matches;
  }

  // CASE 3: 4 Groups, Top 2 Advance (8 teams: QF -> SF -> Final)
  // Cross pairings:
  // QF1: A1 vs B2 -> SF1 (home)
  // QF2: C1 vs D2 -> SF1 (away)
  // QF3: B1 vs A2 -> SF2 (home)
  // QF4: D1 vs C2 -> SF2 (away)
  if (groupsCount === 4 && advancePerGroup === 2) {
    const qfs = [
      { id: 'gk_qf1', name: 'Quarter-final 1', notes: '1st Group A vs 2nd Group B', next: 'gk_sf1', slot: 'home' as const },
      { id: 'gk_qf2', name: 'Quarter-final 2', notes: '1st Group C vs 2nd Group D', next: 'gk_sf1', slot: 'away' as const },
      { id: 'gk_qf3', name: 'Quarter-final 3', notes: '1st Group B vs 2nd Group A', next: 'gk_sf2', slot: 'home' as const },
      { id: 'gk_qf4', name: 'Quarter-final 4', notes: '1st Group D vs 2nd Group C', next: 'gk_sf2', slot: 'away' as const },
    ];

    qfs.forEach((q, idx) => {
      matches.push({
        id: q.id,
        round: roundOffset + 1,
        roundName: q.name,
        stage: 'knockout',
        knockoutRound: 1,
        knockoutMatchNumber: idx + 1,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        nextMatchId: q.next,
        nextMatchSlot: q.slot,
        notes: q.notes,
      });
    });

    matches.push({
      id: 'gk_sf1',
      round: roundOffset + 2,
      roundName: 'Semi-final 1',
      stage: 'knockout',
      knockoutRound: 2,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'home',
      notes: 'Winner QF1 vs Winner QF2',
    });

    matches.push({
      id: 'gk_sf2',
      round: roundOffset + 2,
      roundName: 'Semi-final 2',
      stage: 'knockout',
      knockoutRound: 2,
      knockoutMatchNumber: 2,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'away',
      notes: 'Winner QF3 vs Winner QF4',
    });

    matches.push({
      id: 'gk_final',
      round: roundOffset + 3,
      roundName: 'Grand Final',
      stage: 'knockout',
      knockoutRound: 3,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      notes: 'Winner SF1 vs Winner SF2',
    });

    if (hasThirdPlace) {
      matches.push({
        id: 'gk_3rd_place',
        round: roundOffset + 3,
        roundName: '3rd Place Playoff',
        stage: 'knockout',
        knockoutRound: 3,
        knockoutMatchNumber: 99,
        isThirdPlacePlayoff: true,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        notes: 'Loser SF1 vs Loser SF2',
      });
    }

    return matches;
  }

  // CASE 4: 4 Groups, Top 1 Advances (4 teams: SF1: A1 vs B1, SF2: C1 vs D1 -> Final)
  if (groupsCount === 4 && advancePerGroup === 1) {
    matches.push({
      id: 'gk_sf1',
      round: roundOffset + 1,
      roundName: 'Semi-final 1',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'home',
      notes: '1st Group A vs 1st Group B',
    });

    matches.push({
      id: 'gk_sf2',
      round: roundOffset + 1,
      roundName: 'Semi-final 2',
      stage: 'knockout',
      knockoutRound: 1,
      knockoutMatchNumber: 2,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'away',
      notes: '1st Group C vs 1st Group D',
    });

    matches.push({
      id: 'gk_final',
      round: roundOffset + 2,
      roundName: 'Grand Final',
      stage: 'knockout',
      knockoutRound: 2,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      notes: 'Winner SF1 vs Winner SF2',
    });

    if (hasThirdPlace) {
      matches.push({
        id: 'gk_3rd_place',
        round: roundOffset + 2,
        roundName: '3rd Place Playoff',
        stage: 'knockout',
        knockoutRound: 2,
        knockoutMatchNumber: 99,
        isThirdPlacePlayoff: true,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      });
    }

    return matches;
  }

  // CASE 5: 8 Groups, Top 2 Advance (16 teams: Round of 16 -> QF -> SF -> Final)
  if (groupsCount === 8 && advancePerGroup === 2) {
    const r16 = [
      { id: 'gk_r16_1', name: 'Round of 16 - M1', notes: '1st Group A vs 2nd Group B', next: 'gk_qf1', slot: 'home' as const },
      { id: 'gk_r16_2', name: 'Round of 16 - M2', notes: '1st Group C vs 2nd Group D', next: 'gk_qf1', slot: 'away' as const },
      { id: 'gk_r16_3', name: 'Round of 16 - M3', notes: '1st Group E vs 2nd Group F', next: 'gk_qf2', slot: 'home' as const },
      { id: 'gk_r16_4', name: 'Round of 16 - M4', notes: '1st Group G vs 2nd Group H', next: 'gk_qf2', slot: 'away' as const },
      { id: 'gk_r16_5', name: 'Round of 16 - M5', notes: '1st Group B vs 2nd Group A', next: 'gk_qf3', slot: 'home' as const },
      { id: 'gk_r16_6', name: 'Round of 16 - M6', notes: '1st Group D vs 2nd Group C', next: 'gk_qf3', slot: 'away' as const },
      { id: 'gk_r16_7', name: 'Round of 16 - M7', notes: '1st Group F vs 2nd Group E', next: 'gk_qf4', slot: 'home' as const },
      { id: 'gk_r16_8', name: 'Round of 16 - M8', notes: '1st Group H vs 2nd Group G', next: 'gk_qf4', slot: 'away' as const },
    ];

    r16.forEach((r, idx) => {
      matches.push({
        id: r.id,
        round: roundOffset + 1,
        roundName: r.name,
        stage: 'knockout',
        knockoutRound: 1,
        knockoutMatchNumber: idx + 1,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        nextMatchId: r.next,
        nextMatchSlot: r.slot,
        notes: r.notes,
      });
    });

    const qfs = [
      { id: 'gk_qf1', name: 'Quarter-final 1', next: 'gk_sf1', slot: 'home' as const },
      { id: 'gk_qf2', name: 'Quarter-final 2', next: 'gk_sf1', slot: 'away' as const },
      { id: 'gk_qf3', name: 'Quarter-final 3', next: 'gk_sf2', slot: 'home' as const },
      { id: 'gk_qf4', name: 'Quarter-final 4', next: 'gk_sf2', slot: 'away' as const },
    ];

    qfs.forEach((q, idx) => {
      matches.push({
        id: q.id,
        round: roundOffset + 2,
        roundName: q.name,
        stage: 'knockout',
        knockoutRound: 2,
        knockoutMatchNumber: idx + 1,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
        nextMatchId: q.next,
        nextMatchSlot: q.slot,
      });
    });

    matches.push({
      id: 'gk_sf1',
      round: roundOffset + 3,
      roundName: 'Semi-final 1',
      stage: 'knockout',
      knockoutRound: 3,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'home',
    });

    matches.push({
      id: 'gk_sf2',
      round: roundOffset + 3,
      roundName: 'Semi-final 2',
      stage: 'knockout',
      knockoutRound: 3,
      knockoutMatchNumber: 2,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      nextMatchId: 'gk_final',
      nextMatchSlot: 'away',
    });

    matches.push({
      id: 'gk_final',
      round: roundOffset + 4,
      roundName: 'Grand Final',
      stage: 'knockout',
      knockoutRound: 4,
      knockoutMatchNumber: 1,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
    });

    if (hasThirdPlace) {
      matches.push({
        id: 'gk_3rd_place',
        round: roundOffset + 4,
        roundName: '3rd Place Playoff',
        stage: 'knockout',
        knockoutRound: 4,
        knockoutMatchNumber: 99,
        isThirdPlacePlayoff: true,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: 'scheduled',
      });
    }

    return matches;
  }

  // Default fallback if 8 groups and 1 advance:
  return matches;
}
