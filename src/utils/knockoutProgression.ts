import { KnockoutConfig, Match, Team, TournamentFormat, TournamentPointsRule } from '../types/tournament';
import { calculateStandings } from './standings';

/**
 * Determine the winner and loser of a match, handling extra time and penalty shootouts
 */
export function resolveMatchWinner(match: Match): {
  winnerId: string | null;
  loserId: string | null;
  isTied: boolean;
  needsShootout: boolean;
} {
  if (match.homeScore === null || match.awayScore === null) {
    return { winnerId: null, loserId: null, isTied: false, needsShootout: false };
  }

  // If winner is explicitly set (e.g. by manual selection / byes)
  if (match.winnerTeamId) {
    const loser = match.winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
    return { winnerId: match.winnerTeamId, loserId: loser, isTied: false, needsShootout: false };
  }

  // Regulation score differences
  if (match.homeScore > match.awayScore) {
    return { winnerId: match.homeTeamId, loserId: match.awayTeamId, isTied: false, needsShootout: false };
  }
  if (match.homeScore < match.awayScore) {
    return { winnerId: match.awayTeamId, loserId: match.homeTeamId, isTied: false, needsShootout: false };
  }

  // Regulation ended in a draw (homeScore === awayScore)
  // Check penalty shootout
  if (
    match.hasPenalties &&
    match.homePenalties !== null &&
    match.homePenalties !== undefined &&
    match.awayPenalties !== null &&
    match.awayPenalties !== undefined
  ) {
    if (match.homePenalties > match.awayPenalties) {
      return { winnerId: match.homeTeamId, loserId: match.awayTeamId, isTied: false, needsShootout: false };
    }
    if (match.awayPenalties > match.homePenalties) {
      return { winnerId: match.awayTeamId, loserId: match.homeTeamId, isTied: false, needsShootout: false };
    }
  }

  // Knockout matches that end in a draw REQUIRE a penalty shootout
  const isKnockout = match.stage === 'knockout';
  return {
    winnerId: null,
    loserId: null,
    isTied: true,
    needsShootout: isKnockout,
  };
}

/**
 * Transition a knockout match into the Penalty Shootout state
 */
export function startPenaltyShootout(match: Match): Match {
  return {
    ...match,
    status: 'penalty_shootout',
    hasPenalties: true,
    homePenalties: match.homePenalties ?? 0,
    awayPenalties: match.awayPenalties ?? 0,
    penaltyKicks: match.penaltyKicks || {
      homeKicks: [true, true, true, true, false],
      awayKicks: [true, true, true, false, false],
    },
  };
}

/**
 * Finalize penalty shootout result with definitive winner and advance to next round
 */
export function finalizePenaltyShootout(
  match: Match,
  homePens: number,
  awayPens: number,
  explicitWinnerId?: string | null
): Match {
  let winnerId = explicitWinnerId || null;
  if (!winnerId) {
    if (homePens > awayPens) winnerId = match.homeTeamId;
    else if (awayPens > homePens) winnerId = match.awayTeamId;
  }

  return {
    ...match,
    status: 'finished',
    hasPenalties: true,
    homePenalties: homePens,
    awayPenalties: awayPens,
    winnerTeamId: winnerId,
  };
}

/**
 * Update downstream knockout matches when a match result is entered or updated
 */
export function advanceKnockoutWinner(
  matches: Match[],
  matchId: string,
  winnerId: string | null,
  loserId?: string | null
): Match[] {
  const currentMatch = matches.find((m) => m.id === matchId);
  if (!currentMatch) return matches;

  return matches.map((m) => {
    // If it's the current match, make sure winnerTeamId is recorded
    if (m.id === matchId) {
      return {
        ...m,
        winnerTeamId: winnerId,
      };
    }

    // Check if this match is the direct next match for the winner
    if (currentMatch.nextMatchId && m.id === currentMatch.nextMatchId) {
      if (currentMatch.nextMatchSlot === 'home') {
        return {
          ...m,
          homeTeamId: winnerId,
          // Reset downstream score if the team changed
          homeScore: m.homeTeamId !== winnerId ? null : m.homeScore,
          awayScore: m.homeTeamId !== winnerId ? null : m.awayScore,
          status: m.homeTeamId !== winnerId ? 'scheduled' : m.status,
          winnerTeamId: m.homeTeamId !== winnerId ? null : m.winnerTeamId,
        };
      } else if (currentMatch.nextMatchSlot === 'away') {
        return {
          ...m,
          awayTeamId: winnerId,
          homeScore: m.awayTeamId !== winnerId ? null : m.homeScore,
          awayScore: m.awayTeamId !== winnerId ? null : m.awayScore,
          status: m.awayTeamId !== winnerId ? 'scheduled' : m.status,
          winnerTeamId: m.awayTeamId !== winnerId ? null : m.winnerTeamId,
        };
      }
    }

    // Check if this match is a 3rd place playoff receiving semi-final losers
    if (m.isThirdPlacePlayoff && loserId) {
      // If current match was SF1
      if (currentMatch.id.includes('sf1')) {
        return {
          ...m,
          homeTeamId: loserId,
        };
      }
      // If current match was SF2
      if (currentMatch.id.includes('sf2')) {
        return {
          ...m,
          awayTeamId: loserId,
        };
      }
    }

    return m;
  });
}

/**
 * Seed or refresh knockout bracket initial matches based on current standings
 */
export function seedKnockoutBracketFromStandings(
  matches: Match[],
  teams: Team[],
  pointsRule: TournamentPointsRule,
  format: TournamentFormat,
  config: KnockoutConfig
): Match[] {
  if (format === 'knockout') {
    // Pure knockout is seeded directly by teams list, nothing to seed from standings
    return matches;
  }

  let updatedMatches = [...matches];

  if (format === 'league_knockout') {
    const standings = calculateStandings(teams, matches, pointsRule);
    const topSeeds = standings.map((s) => s.team.id);

    if (config.leaguePlayoffTeams === 2) {
      updatedMatches = updatedMatches.map((m) => {
        if (m.id === 'lp_final') {
          return {
            ...m,
            homeTeamId: topSeeds[0] || null,
            awayTeamId: topSeeds[1] || null,
          };
        }
        return m;
      });
    } else if (config.leaguePlayoffTeams === 4) {
      updatedMatches = updatedMatches.map((m) => {
        if (m.id === 'lp_sf1') {
          return {
            ...m,
            homeTeamId: topSeeds[0] || null, // 1st
            awayTeamId: topSeeds[3] || null, // 4th
          };
        }
        if (m.id === 'lp_sf2') {
          return {
            ...m,
            homeTeamId: topSeeds[1] || null, // 2nd
            awayTeamId: topSeeds[2] || null, // 3rd
          };
        }
        return m;
      });
    } else if (config.leaguePlayoffTeams === 8) {
      updatedMatches = updatedMatches.map((m) => {
        if (m.id === 'lp_qf1') return { ...m, homeTeamId: topSeeds[0] || null, awayTeamId: topSeeds[7] || null }; // 1 vs 8
        if (m.id === 'lp_qf2') return { ...m, homeTeamId: topSeeds[3] || null, awayTeamId: topSeeds[4] || null }; // 4 vs 5
        if (m.id === 'lp_qf3') return { ...m, homeTeamId: topSeeds[1] || null, awayTeamId: topSeeds[6] || null }; // 2 vs 7
        if (m.id === 'lp_qf4') return { ...m, homeTeamId: topSeeds[2] || null, awayTeamId: topSeeds[5] || null }; // 3 vs 6
        return m;
      });
    }
  } else if (format === 'groups_knockout') {
    // Calculate standings for each group
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, config.groupsCount);
    const groupStandings: Record<string, Team[]> = {};

    letters.forEach((letter) => {
      const rows = calculateStandings(teams, matches, pointsRule, letter);
      groupStandings[letter] = rows.map((r) => r.team);
    });

    const getGroupTeam = (letter: string, pos: number): string | null => {
      const list = groupStandings[letter];
      if (!list || list.length < pos) return null;
      return list[pos - 1]?.id || null;
    };

    if (config.groupsCount === 2 && config.advancePerGroup === 2) {
      // SF1: A1 vs B2
      // SF2: B1 vs A2
      updatedMatches = updatedMatches.map((m) => {
        if (m.id === 'gk_sf1') {
          return {
            ...m,
            homeTeamId: getGroupTeam('A', 1),
            awayTeamId: getGroupTeam('B', 2),
          };
        }
        if (m.id === 'gk_sf2') {
          return {
            ...m,
            homeTeamId: getGroupTeam('B', 1),
            awayTeamId: getGroupTeam('A', 2),
          };
        }
        return m;
      });
    } else if (config.groupsCount === 2 && config.advancePerGroup === 1) {
      // Final: A1 vs B1
      updatedMatches = updatedMatches.map((m) => {
        if (m.id === 'gk_final') {
          return {
            ...m,
            homeTeamId: getGroupTeam('A', 1),
            awayTeamId: getGroupTeam('B', 1),
          };
        }
        return m;
      });
    } else if (config.groupsCount === 4 && config.advancePerGroup === 2) {
      // QF1: A1 vs B2
      // QF2: C1 vs D2
      // QF3: B1 vs A2
      // QF4: D1 vs C2
      updatedMatches = updatedMatches.map((m) => {
        if (m.id === 'gk_qf1') return { ...m, homeTeamId: getGroupTeam('A', 1), awayTeamId: getGroupTeam('B', 2) };
        if (m.id === 'gk_qf2') return { ...m, homeTeamId: getGroupTeam('C', 1), awayTeamId: getGroupTeam('D', 2) };
        if (m.id === 'gk_qf3') return { ...m, homeTeamId: getGroupTeam('B', 1), awayTeamId: getGroupTeam('A', 2) };
        if (m.id === 'gk_qf4') return { ...m, homeTeamId: getGroupTeam('D', 1), awayTeamId: getGroupTeam('C', 2) };
        return m;
      });
    } else if (config.groupsCount === 4 && config.advancePerGroup === 1) {
      // SF1: A1 vs B1, SF2: C1 vs D1
      updatedMatches = updatedMatches.map((m) => {
        if (m.id === 'gk_sf1') return { ...m, homeTeamId: getGroupTeam('A', 1), awayTeamId: getGroupTeam('B', 1) };
        if (m.id === 'gk_sf2') return { ...m, homeTeamId: getGroupTeam('C', 1), awayTeamId: getGroupTeam('D', 1) };
        return m;
      });
    } else if (config.groupsCount === 8 && config.advancePerGroup === 2) {
      // Round of 16
      const r16Map: Record<string, { home: [string, number]; away: [string, number] }> = {
        gk_r16_1: { home: ['A', 1], away: ['B', 2] },
        gk_r16_2: { home: ['C', 1], away: ['D', 2] },
        gk_r16_3: { home: ['E', 1], away: ['F', 2] },
        gk_r16_4: { home: ['G', 1], away: ['H', 2] },
        gk_r16_5: { home: ['B', 1], away: ['A', 2] },
        gk_r16_6: { home: ['D', 1], away: ['C', 2] },
        gk_r16_7: { home: ['F', 1], away: ['E', 2] },
        gk_r16_8: { home: ['H', 1], away: ['G', 2] },
      };

      updatedMatches = updatedMatches.map((m) => {
        const config = r16Map[m.id];
        if (config) {
          return {
            ...m,
            homeTeamId: getGroupTeam(config.home[0], config.home[1]),
            awayTeamId: getGroupTeam(config.away[0], config.away[1]),
          };
        }
        return m;
      });
    }
  }

  return updatedMatches;
}
