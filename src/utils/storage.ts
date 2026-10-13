import { GoalScorer, Match, Team, TournamentState } from '../types/tournament';
import { generateGroupStageFixtures, generateKnockoutBracket, generateRoundRobinFixtures } from './scheduler';

export const PRIMARY_STORAGE_KEY = 'touchline-v1';
export const LEGACY_STORAGE_KEY = 'chandrutty-tournament-v1';

// Default initial teams for Chandrutty Premier League
export const DEFAULT_PREMIER_TEAMS: Team[] = [
  { id: 'tm_1', name: 'Chandrutty FC', shortCode: 'CFC', color: '#10b981' },
  { id: 'tm_2', name: 'Valley Rangers', shortCode: 'VRN', color: '#3b82f6' },
  { id: 'tm_3', name: 'Red Star Albion', shortCode: 'RSA', color: '#ef4444' },
  { id: 'tm_4', name: 'Royal Strikers', shortCode: 'RYS', color: '#f59e0b' },
  { id: 'tm_5', name: 'Athletic Coast', shortCode: 'ATC', color: '#8b5cf6' },
  { id: 'tm_6', name: 'Emerald United', shortCode: 'EMU', color: '#059669' },
  { id: 'tm_7', name: 'City Wanderers', shortCode: 'CTW', color: '#06b6d4' },
  { id: 'tm_8', name: 'Metro Dynamos', shortCode: 'MTD', color: '#ec4899' },
];

export function createDefaultTournament(): TournamentState {
  const teams = [...DEFAULT_PREMIER_TEAMS];
  const matches = generateRoundRobinFixtures(teams, 'league');

  // Seed sample match results for a lively first experience
  const sampleScorers: Record<number, GoalScorer[]> = {
    0: [
      { id: 'sc_1', playerName: 'K. Rahul', teamId: 'tm_1', minute: 23 },
      { id: 'sc_2', playerName: 'K. Rahul', teamId: 'tm_1', minute: 58 },
      { id: 'sc_3', playerName: 'M. Sterling', teamId: 'tm_2', minute: 82 },
    ],
    1: [
      { id: 'sc_4', playerName: 'A. Silva', teamId: 'tm_3', minute: 14, isPenalty: true },
      { id: 'sc_5', playerName: 'J. Henderson', teamId: 'tm_4', minute: 44 },
    ],
    2: [
      { id: 'sc_6', playerName: 'K. Rahul', teamId: 'tm_1', minute: 71 },
    ],
  };

  // Pre-fill a few finished matches in round 1
  if (matches.length >= 4) {
    matches[0].homeScore = 2;
    matches[0].awayScore = 1;
    matches[0].status = 'finished';
    matches[0].scorers = sampleScorers[0];

    matches[1].homeScore = 1;
    matches[1].awayScore = 1;
    matches[1].status = 'finished';
    matches[1].scorers = sampleScorers[1];

    matches[2].homeScore = 3;
    matches[2].awayScore = 0;
    matches[2].status = 'finished';
    matches[2].scorers = [
      { id: 'sc_7', playerName: 'E. Vance', teamId: matches[2].homeTeamId!, minute: 31 },
      { id: 'sc_8', playerName: 'E. Vance', teamId: matches[2].homeTeamId!, minute: 65 },
      { id: 'sc_9', playerName: 'D. Rocha', teamId: matches[2].homeTeamId!, minute: 88 },
    ];
  }

  return {
    id: 'chandrutty-premier-league',
    name: 'Chandrutty Premier League 2026',
    format: 'league',
    pointsRule: {
      win: 3,
      draw: 1,
      loss: 0,
    },
    knockoutConfig: {
      leaguePlayoffTeams: 4,
      groupsCount: 4,
      advancePerGroup: 2,
      hasThirdPlacePlayoff: true,
    },
    teams,
    matches,
    currentRound: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Load tournament state from browser localStorage, falling back to legacy key or default
 */
export function loadTournamentState(): TournamentState {
  try {
    const rawPrimary = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (rawPrimary) {
      return JSON.parse(rawPrimary);
    }
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      return JSON.parse(rawLegacy);
    }
  } catch (err) {
    console.error('Error loading tournament from localStorage:', err);
  }
  return createDefaultTournament();
}

/**
 * Save tournament state to browser localStorage under touchline-v1 key
 */
export function saveTournamentState(state: TournamentState): void {
  try {
    const serialized = JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(PRIMARY_STORAGE_KEY, serialized);
    localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
  } catch (err) {
    console.error('Error saving tournament to localStorage:', err);
  }
}

/**
 * Trigger download of full JSON backup file
 */
export function exportTournamentBackup(state: TournamentState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const cleanName = state.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  downloadAnchor.setAttribute('download', `${cleanName}_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Parse and validate an imported JSON backup
 */
export function parseTournamentBackup(jsonString: string): TournamentState {
  const data = JSON.parse(jsonString);
  if (!data.name || !Array.isArray(data.teams) || !Array.isArray(data.matches)) {
    throw new Error('Invalid tournament backup file: missing required fields (name, teams, matches).');
  }
  return data as TournamentState;
}

/**
 * Import fixture text while PRESERVING matching existing scores!
 * Text format lines can be:
 *   Team A vs Team B
 *   Round 1: Team A vs Team B
 *   Team A, Team B, Round 1
 */
export function importFixturesWithScorePreservation(
  text: string,
  currentTeams: Team[],
  existingMatches: Match[]
): { matches: Match[]; newTeamsCreated: Team[]; errorCount: number } {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const teamMap = new Map<string, Team>();
  const newTeams: Team[] = [];

  // Register existing teams
  currentTeams.forEach((t) => {
    teamMap.set(t.name.toLowerCase(), t);
    teamMap.set(t.shortCode.toLowerCase(), t);
    teamMap.set(t.id, t);
  });

  const getOrCreateTeam = (rawName: string): Team => {
    const clean = rawName.trim();
    const key = clean.toLowerCase();
    if (teamMap.has(key)) return teamMap.get(key)!;

    // Create a new team
    const shortCode = clean
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 3) || clean.slice(0, 3).toUpperCase();

    const colors = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
    const color = colors[teamMap.size % colors.length];

    const newTeam: Team = {
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: clean,
      shortCode,
      color,
    };

    teamMap.set(key, newTeam);
    newTeams.push(newTeam);
    return newTeam;
  };

  const parsedMatches: Match[] = [];
  let errorCount = 0;

  lines.forEach((line, index) => {
    let round = 1;
    let homeName = '';
    let awayName = '';
    let importedHomeScore: number | null = null;
    let importedAwayScore: number | null = null;

    // Check for "Round X:" or "Matchday X:" prefix
    const roundMatch = line.match(/^(?:Round|Matchday|R|M)\s*(\d+)[:\s-]+(.*)$/i);
    let remainingLine = line;
    if (roundMatch) {
      round = parseInt(roundMatch[1], 10);
      remainingLine = roundMatch[2].trim();
    }

    if (remainingLine.includes(',')) {
      // CSV format: Home, Away, [Round]
      const parts = remainingLine.split(',').map((p) => p.trim());
      if (parts.length >= 2) {
        homeName = parts[0];
        awayName = parts[1];
        if (parts[2] && !isNaN(parseInt(parts[2], 10))) {
          round = parseInt(parts[2], 10);
        }
      }
    } else if (remainingLine.toLowerCase().includes(' vs ') || remainingLine.toLowerCase().includes(' v ')) {
      // "Team A vs Team B" or "Team A 2 - 1 Team B"
      const separator = remainingLine.toLowerCase().includes(' vs ') ? / vs /i : / v /i;
      const parts = remainingLine.split(separator).map((p) => p.trim());
      homeName = parts[0];
      awayName = parts[1];

      // Check if line contains inline score e.g. "Arsenal 2 - 1 Chelsea"
      const scorePattern = /^(.*?)\s+(\d+)\s*[-:]\s*(\d+)\s+(.*)$/;
      const scoreCheck = remainingLine.match(scorePattern);
      if (scoreCheck) {
        homeName = scoreCheck[1].trim();
        importedHomeScore = parseInt(scoreCheck[2], 10);
        importedAwayScore = parseInt(scoreCheck[3], 10);
        awayName = scoreCheck[4].trim();
      }
    } else {
      errorCount++;
      return;
    }

    if (!homeName || !awayName) {
      errorCount++;
      return;
    }

    const homeTeam = getOrCreateTeam(homeName);
    const awayTeam = getOrCreateTeam(awayName);

    // Look for matching existing match between these two teams to PRESERVE score
    const matchingExisting = existingMatches.find(
      (m) =>
        (m.homeTeamId === homeTeam.id && m.awayTeamId === awayTeam.id) ||
        (m.homeTeamId === awayTeam.id && m.awayTeamId === homeTeam.id)
    );

    let homeScore: number | null = null;
    let awayScore: number | null = null;
    let status: 'scheduled' | 'live' | 'finished' = 'scheduled';
    let scorers: GoalScorer[] | undefined = undefined;

    if (matchingExisting && matchingExisting.status === 'finished') {
      // PRESERVE EXISTING SCORE!
      if (matchingExisting.homeTeamId === homeTeam.id) {
        homeScore = matchingExisting.homeScore;
        awayScore = matchingExisting.awayScore;
      } else {
        homeScore = matchingExisting.awayScore;
        awayScore = matchingExisting.homeScore;
      }
      status = 'finished';
      scorers = matchingExisting.scorers;
    } else if (importedHomeScore !== null && importedAwayScore !== null) {
      homeScore = importedHomeScore;
      awayScore = importedAwayScore;
      status = 'finished';
    }

    parsedMatches.push({
      id: `imported_${Date.now()}_${index}`,
      round,
      roundName: `Matchday ${round}`,
      stage: 'league',
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      homeScore,
      awayScore,
      status,
      scorers,
    });
  });

  return {
    matches: parsedMatches,
    newTeamsCreated: newTeams,
    errorCount,
  };
}

/**
 * Pre-configured presets for instant loading
 */
export function getPresetTournament(presetKey: 'premier' | 'groups_champions' | 'knockout_cup'): TournamentState {
  if (presetKey === 'premier') {
    return createDefaultTournament();
  }

  if (presetKey === 'groups_champions') {
    const teams: Team[] = [
      { id: 'g_1', name: 'Real Chandrutty', shortCode: 'RCH', color: '#10b981', group: 'A' },
      { id: 'g_2', name: 'Bayern Coast', shortCode: 'BYC', color: '#ef4444', group: 'A' },
      { id: 'g_3', name: 'Porto Athletic', shortCode: 'POA', color: '#3b82f6', group: 'A' },
      { id: 'g_4', name: 'Ajax Rising', shortCode: 'AJR', color: '#f59e0b', group: 'A' },

      { id: 'g_5', name: 'Milan Strikers', shortCode: 'MLS', color: '#dc2626', group: 'B' },
      { id: 'g_6', name: 'Celtic Green', shortCode: 'CLT', color: '#059669', group: 'B' },
      { id: 'g_7', name: 'Benfica Stars', shortCode: 'BEN', color: '#e11d48', group: 'B' },
      { id: 'g_8', name: 'Dortmund Yellow', shortCode: 'BVB', color: '#eab308', group: 'B' },

      { id: 'g_9', name: 'Paris Capital', shortCode: 'PAR', color: '#1e40af', group: 'C' },
      { id: 'g_10', name: 'Juventus Black', shortCode: 'JUV', color: '#475569', group: 'C' },
      { id: 'g_11', name: 'Sevilla Knights', shortCode: 'SEV', color: '#be123c', group: 'C' },
      { id: 'g_12', name: 'Sporting Lions', shortCode: 'SPO', color: '#16a34a', group: 'C' },

      { id: 'g_13', name: 'London Blues', shortCode: 'LBL', color: '#2563eb', group: 'D' },
      { id: 'g_14', name: 'Madrid Whites', shortCode: 'MDW', color: '#94a3b8', group: 'D' },
      { id: 'g_15', name: 'Inter Warriors', shortCode: 'INT', color: '#0284c7', group: 'D' },
      { id: 'g_16', name: 'Napoli Sky', shortCode: 'NAP', color: '#38bdf8', group: 'D' },
    ];

    const groupFixtures = generateGroupStageFixtures(teams, 4);
    const knockoutFixtures = generateKnockoutBracket('groups_knockout', teams, {
      groupsCount: 4,
      advancePerGroup: 2,
      hasThirdPlacePlayoff: true,
      leaguePlayoffTeams: 4,
    }, 4);

    // Seed some finished group matches
    if (groupFixtures.length > 0) {
      groupFixtures[0].homeScore = 3;
      groupFixtures[0].awayScore = 1;
      groupFixtures[0].status = 'finished';
      groupFixtures[0].scorers = [
        { id: 's1', playerName: 'V. Junior', teamId: groupFixtures[0].homeTeamId!, minute: 12 },
        { id: 's2', playerName: 'V. Junior', teamId: groupFixtures[0].homeTeamId!, minute: 49 },
        { id: 's3', playerName: 'K. Coman', teamId: groupFixtures[0].awayTeamId!, minute: 76 },
      ];
    }

    return {
      id: 'chandrutty-champions-cup',
      name: 'Chandrutty Champions Cup 2026',
      format: 'groups_knockout',
      pointsRule: { win: 3, draw: 1, loss: 0 },
      knockoutConfig: {
        groupsCount: 4,
        advancePerGroup: 2,
        hasThirdPlacePlayoff: true,
        leaguePlayoffTeams: 4,
      },
      teams,
      matches: [...groupFixtures, ...knockoutFixtures],
      currentRound: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Knockout cup
  const teams: Team[] = [
    { id: 'k_1', name: 'Chandrutty Warriors', shortCode: 'WAR', color: '#10b981' },
    { id: 'k_2', name: 'Coastal Thunder', shortCode: 'THU', color: '#3b82f6' },
    { id: 'k_3', name: 'Highland Eagles', shortCode: 'EAG', color: '#f59e0b' },
    { id: 'k_4', name: 'Riverside Phoenix', shortCode: 'PHX', color: '#ef4444' },
    { id: 'k_5', name: 'Apex Titans', shortCode: 'APX', color: '#8b5cf6' },
    { id: 'k_6', name: 'Shadow Strikers', shortCode: 'SHD', color: '#06b6d4' },
    { id: 'k_7', name: 'Emerald Dragons', shortCode: 'DRG', color: '#059669' },
    { id: 'k_8', name: 'Solaris FC', shortCode: 'SOL', color: '#ec4899' },
  ];

  const koMatches = generateKnockoutBracket('knockout', teams, {
    groupsCount: 2,
    advancePerGroup: 2,
    hasThirdPlacePlayoff: true,
    leaguePlayoffTeams: 4,
  });

  return {
    id: 'chandrutty-super-cup',
    name: 'Chandrutty Super Knockout Cup',
    format: 'knockout',
    pointsRule: { win: 3, draw: 1, loss: 0 },
    knockoutConfig: {
      groupsCount: 2,
      advancePerGroup: 2,
      hasThirdPlacePlayoff: true,
      leaguePlayoffTeams: 4,
    },
    teams,
    matches: koMatches,
    currentRound: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
