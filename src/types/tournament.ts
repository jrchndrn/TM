export type TournamentFormat = 
  | 'league' 
  | 'league_knockout' 
  | 'groups_knockout' 
  | 'knockout';

export interface Team {
  id: string;
  name: string;
  shortCode: string;
  color: string;
  secondaryColor?: string;
  group?: string; // e.g. 'A', 'B', 'C', 'D'
  seed?: number;
}

export interface GoalScorer {
  id: string;
  playerName: string;
  teamId: string;
  minute?: number;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

export interface Match {
  id: string;
  round: number; // Matchday or Round number
  roundName?: string; // e.g., 'Matchday 1', 'Quarter-final', 'Semi-final', 'Final'
  stage: 'league' | 'group' | 'knockout';
  group?: string; // 'A', 'B', etc.
  homeTeamId: string | null; // null if knockout slot pending
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'penalty_shootout' | 'finished';
  date?: string;
  time?: string;
  venue?: string;
  // Knockout specific
  knockoutRound?: number; // 1 = R16/QF, 2 = SF, 3 = Final
  knockoutMatchNumber?: number;
  nextMatchId?: string | null;
  nextMatchSlot?: 'home' | 'away' | null;
  hasExtraTime?: boolean;
  hasPenalties?: boolean;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  penaltyKicks?: { homeKicks: boolean[]; awayKicks: boolean[] };
  winnerTeamId?: string | null;
  isThirdPlacePlayoff?: boolean;
  isBye?: boolean;
  // Goal scorers
  scorers?: GoalScorer[];
  notes?: string;
}

export interface StandingsRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  form: ('W' | 'D' | 'L')[];
}

export interface TournamentPointsRule {
  win: number;
  draw: number;
  loss: number;
}

export interface KnockoutConfig {
  leaguePlayoffTeams: number; // 2, 4, 8
  groupsCount: 2 | 4 | 8;
  advancePerGroup: 1 | 2;
  hasThirdPlacePlayoff: boolean;
}

export interface TournamentState {
  id: string;
  name: string;
  format: TournamentFormat;
  pointsRule: TournamentPointsRule;
  knockoutConfig: KnockoutConfig;
  teams: Team[];
  matches: Match[];
  currentRound: number;
  createdAt: string;
  updatedAt: string;
}

export interface TopScorerRow {
  playerName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  goals: number;
  penalties: number;
  matches: number;
}

export interface TeamStatsSummary {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  biggestWin: { margin: number; opponent: string; score: string } | null;
  form: ('W' | 'D' | 'L')[];
}
