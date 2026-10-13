import React, { useState } from 'react';
import {
  KnockoutConfig,
  Match,
  Team,
  TournamentFormat,
  TournamentPointsRule,
  TournamentState,
} from '../types/tournament';
import {
  exportTournamentBackup,
  getPresetTournament,
  importFixturesWithScorePreservation,
  parseTournamentBackup,
} from '../utils/storage';
import {
  assignTeamsToGroups,
  generateGroupStageFixtures,
  generateKnockoutBracket,
  generateRoundRobinFixtures,
} from '../utils/scheduler';
import { TeamBadge } from './TeamBadge';
import {
  Save,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

interface SettingsTabProps {
  state: TournamentState;
  onSaveState: (newState: TournamentState) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ state, onSaveState }) => {
  // Form state
  const [name, setName] = useState<string>(state.name);
  const [format, setFormat] = useState<TournamentFormat>(state.format);
  const [winPoints, setWinPoints] = useState<number>(state.pointsRule.win);
  const [drawPoints, setDrawPoints] = useState<number>(state.pointsRule.draw);
  const [lossPoints, setLossPoints] = useState<number>(state.pointsRule.loss);

  // Knockout config
  const [groupsCount, setGroupsCount] = useState<2 | 4 | 8>(state.knockoutConfig.groupsCount);
  const [advancePerGroup, setAdvancePerGroup] = useState<1 | 2>(state.knockoutConfig.advancePerGroup);
  const [leaguePlayoffTeams, setLeaguePlayoffTeams] = useState<number>(
    state.knockoutConfig.leaguePlayoffTeams
  );
  const [hasThirdPlace, setHasThirdPlace] = useState<boolean>(
    state.knockoutConfig.hasThirdPlacePlayoff
  );

  // Teams Bulk input & team editor
  const [bulkTeamsText, setBulkTeamsText] = useState<string>(
    state.teams.map((t) => t.name).join('\n')
  );
  const [teamsList, setTeamsList] = useState<Team[]>([...state.teams]);

  // Fixture list import state
  const [fixtureImportText, setFixtureImportText] = useState<string>('');
  const [preserveScores, setPreserveScores] = useState<boolean>(true);
  const [fixtureImportMessage, setFixtureImportMessage] = useState<string | null>(null);

  // Status message
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const colors = [
    '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#eab308', '#6366f1',
    '#059669', '#dc2626', '#0284c7', '#9333ea', '#d97706',
  ];

  const handleUpdateBulkTeams = () => {
    const lines = bulkTeamsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      alert('Please enter at least 2 team names (one per line).');
      return;
    }

    const updated: Team[] = lines.map((teamName, index) => {
      // Check if team already exists to preserve id and color
      const existing = teamsList.find(
        (t) => t.name.toLowerCase() === teamName.toLowerCase()
      );
      if (existing) {
        return existing;
      }

      const shortCode = teamName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || teamName.slice(0, 3).toUpperCase();

      return {
        id: `team_${Date.now()}_${index}`,
        name: teamName,
        shortCode,
        color: colors[index % colors.length],
      };
    });

    setTeamsList(updated);
    setSavedNotice(`Updated ${updated.length} teams in editor list.`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleAddSingleTeam = () => {
    const newId = `team_${Date.now()}`;
    const newTeam: Team = {
      id: newId,
      name: `Team ${teamsList.length + 1}`,
      shortCode: `T${teamsList.length + 1}`,
      color: colors[teamsList.length % colors.length],
    };
    const updated = [...teamsList, newTeam];
    setTeamsList(updated);
    setBulkTeamsText(updated.map((t) => t.name).join('\n'));
  };

  const handleRemoveTeam = (id: string) => {
    const updated = teamsList.filter((t) => t.id !== id);
    setTeamsList(updated);
    setBulkTeamsText(updated.map((t) => t.name).join('\n'));
  };

  const handleSaveAllSettings = () => {
    const pointsRule: TournamentPointsRule = {
      win: winPoints,
      draw: drawPoints,
      loss: lossPoints,
    };

    const knockoutConfig: KnockoutConfig = {
      groupsCount,
      advancePerGroup,
      leaguePlayoffTeams,
      hasThirdPlacePlayoff: hasThirdPlace,
    };

    let finalizedTeams = [...teamsList];

    // If groups format, assign groups
    if (format === 'groups_knockout') {
      finalizedTeams = assignTeamsToGroups(finalizedTeams, groupsCount);
    }

    // Keep existing matches if format or teams didn't drastically change, or regenerate if user chooses
    const newState: TournamentState = {
      ...state,
      name: name.trim() || 'Chandrutty Tournament',
      format,
      pointsRule,
      knockoutConfig,
      teams: finalizedTeams,
      updatedAt: new Date().toISOString(),
    };

    onSaveState(newState);
    setSavedNotice('Tournament configuration and teams saved successfully!');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleRegenerateFixtures = () => {
    if (!confirm('This will regenerate all fixtures for the current format. Are you sure you want to proceed?')) {
      return;
    }

    let finalizedTeams = [...teamsList];
    let newMatches: Match[] = [];

    const koConfig: KnockoutConfig = {
      groupsCount,
      advancePerGroup,
      leaguePlayoffTeams,
      hasThirdPlacePlayoff: hasThirdPlace,
    };

    if (format === 'league') {
      newMatches = generateRoundRobinFixtures(finalizedTeams, 'league');
    } else if (format === 'league_knockout') {
      const leagueMatches = generateRoundRobinFixtures(finalizedTeams, 'league');
      const koMatches = generateKnockoutBracket(format, finalizedTeams, koConfig, leagueMatches.length > 0 ? Math.max(...leagueMatches.map((m) => m.round)) : 0);
      newMatches = [...leagueMatches, ...koMatches];
    } else if (format === 'groups_knockout') {
      finalizedTeams = assignTeamsToGroups(finalizedTeams, groupsCount);
      const groupMatches = generateGroupStageFixtures(finalizedTeams, groupsCount);
      const maxRound = groupMatches.length > 0 ? Math.max(...groupMatches.map((m) => m.round)) : 3;
      const koMatches = generateKnockoutBracket(format, finalizedTeams, koConfig, maxRound);
      newMatches = [...groupMatches, ...koMatches];
    } else if (format === 'knockout') {
      newMatches = generateKnockoutBracket(format, finalizedTeams, koConfig);
    }

    const newState: TournamentState = {
      ...state,
      name,
      format,
      pointsRule: { win: winPoints, draw: drawPoints, loss: lossPoints },
      knockoutConfig: koConfig,
      teams: finalizedTeams,
      matches: newMatches,
      updatedAt: new Date().toISOString(),
    };

    onSaveState(newState);
    setSavedNotice(`Generated ${newMatches.length} fixtures successfully!`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // Fixture text import with score preservation
  const handleImportFixtures = () => {
    if (!fixtureImportText.trim()) return;

    try {
      const result = importFixturesWithScorePreservation(
        fixtureImportText,
        state.teams,
        preserveScores ? state.matches : []
      );

      const combinedTeams = [...state.teams, ...result.newTeamsCreated];

      const newState: TournamentState = {
        ...state,
        teams: combinedTeams,
        matches: result.matches,
        updatedAt: new Date().toISOString(),
      };

      onSaveState(newState);
      setTeamsList(combinedTeams);
      setBulkTeamsText(combinedTeams.map((t) => t.name).join('\n'));
      setFixtureImportMessage(
        `Imported ${result.matches.length} fixtures! ${
          result.newTeamsCreated.length > 0 ? `Created ${result.newTeamsCreated.length} new teams.` : ''
        } ${result.errorCount > 0 ? `Skipped ${result.errorCount} invalid lines.` : ''}`
      );
      setFixtureImportText('');
    } catch (err: any) {
      alert('Error importing fixtures: ' + err.message);
    }
  };

  // JSON Backup Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseTournamentBackup(text);
        onSaveState(parsed);
        setName(parsed.name);
        setFormat(parsed.format);
        setTeamsList(parsed.teams);
        setBulkTeamsText(parsed.teams.map((t) => t.name).join('\n'));
        setWinPoints(parsed.pointsRule.win);
        setDrawPoints(parsed.pointsRule.draw);
        setLossPoints(parsed.pointsRule.loss);
        setGroupsCount(parsed.knockoutConfig.groupsCount);
        setAdvancePerGroup(parsed.knockoutConfig.advancePerGroup);
        setLeaguePlayoffTeams(parsed.knockoutConfig.leaguePlayoffTeams);
        setHasThirdPlace(parsed.knockoutConfig.hasThirdPlacePlayoff);
        setSavedNotice('Restored tournament from JSON backup!');
        setTimeout(() => setSavedNotice(null), 3000);
      } catch (err: any) {
        alert('Invalid tournament backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadPreset = (preset: 'premier' | 'groups_champions' | 'knockout_cup') => {
    if (!confirm('Load preset tournament data? Current unsaved changes will be replaced.')) {
      return;
    }
    const presetState = getPresetTournament(preset);
    onSaveState(presetState);
    setName(presetState.name);
    setFormat(presetState.format);
    setTeamsList(presetState.teams);
    setBulkTeamsText(presetState.teams.map((t) => t.name).join('\n'));
    setWinPoints(presetState.pointsRule.win);
    setDrawPoints(presetState.pointsRule.draw);
    setLossPoints(presetState.pointsRule.loss);
    setGroupsCount(presetState.knockoutConfig.groupsCount);
    setAdvancePerGroup(presetState.knockoutConfig.advancePerGroup);
    setLeaguePlayoffTeams(presetState.knockoutConfig.leaguePlayoffTeams);
    setHasThirdPlace(presetState.knockoutConfig.hasThirdPlacePlayoff);
    setSavedNotice(`Loaded preset: ${presetState.name}`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleResetScoresOnly = () => {
    if (!confirm('Reset all match scores to 0-0/unplayed? Team lists and schedules will be kept.')) {
      return;
    }
    const resetMatches = state.matches.map((m) => ({
      ...m,
      homeScore: null,
      awayScore: null,
      status: 'scheduled' as const,
      hasExtraTime: false,
      hasPenalties: false,
      homePenalties: null,
      awayPenalties: null,
      winnerTeamId: null,
      scorers: [],
    }));
    onSaveState({
      ...state,
      matches: resetMatches,
      updatedAt: new Date().toISOString(),
    });
    setSavedNotice('All scores have been reset.');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Save Notification */}
      {savedNotice && (
        <div className="bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {savedNotice}
        </div>
      )}

      {/* Preset Pickers Banner */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Quick Start Templates
          </span>
          <h3 className="font-display font-bold text-base text-white">
            Pre-loaded Tournament Formats
          </h3>
          <p className="text-xs text-slate-400">
            Instantly load fully populated tournaments with sample teams, played fixtures, and realistic stats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleLoadPreset('premier')}
            className="px-3 py-1.5 text-xs font-bold bg-[#07130b] hover:bg-emerald-950 border border-emerald-800 text-slate-200 rounded-lg transition-colors"
          >
            Premier League (10 Teams)
          </button>
          <button
            onClick={() => handleLoadPreset('groups_champions')}
            className="px-3 py-1.5 text-xs font-bold bg-[#07130b] hover:bg-emerald-950 border border-emerald-800 text-slate-200 rounded-lg transition-colors"
          >
            Champions Cup (4 Groups)
          </button>
          <button
            onClick={() => handleLoadPreset('knockout_cup')}
            className="px-3 py-1.5 text-xs font-bold bg-[#07130b] hover:bg-emerald-950 border border-emerald-800 text-slate-200 rounded-lg transition-colors"
          >
            Super Knockout Cup
          </button>
        </div>
      </div>

      {/* Section 1: Tournament Setup & Rules */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
          <div>
            <h3 className="font-display font-bold text-lg text-white">1. Tournament Setup</h3>
            <p className="text-xs text-slate-400">Configure name, format, and custom points rules.</p>
          </div>
          <button
            onClick={handleSaveAllSettings}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Tournament Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">Tournament Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#07130b] border border-emerald-800/60 rounded-xl p-2.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
              placeholder="e.g. Chandrutty Premier League"
            />
          </div>

          {/* Tournament Format */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-300">Tournament Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as TournamentFormat)}
              className="w-full bg-[#07130b] border border-emerald-800/60 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="league">League — Round-robin fixtures</option>
              <option value="league_knockout">League + Knockout Playoffs</option>
              <option value="groups_knockout">Groups + Knockout format</option>
              <option value="knockout">Pure Knockout (Single Elimination)</option>
            </select>
          </div>
        </div>

        {/* Format Specific Parameters */}
        {format === 'groups_knockout' && (
          <div className="p-4 bg-[#07130b] border border-emerald-950 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Number of Groups</label>
              <select
                value={groupsCount}
                onChange={(e) => setGroupsCount(parseInt(e.target.value, 10) as any)}
                className="w-full bg-[#0e2217] border border-emerald-800/60 rounded-lg p-2 text-white"
              >
                <option value={2}>2 Groups (Group A & B)</option>
                <option value={4}>4 Groups (A, B, C, D)</option>
                <option value={8}>8 Groups (A through H)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Qualify Per Group</label>
              <select
                value={advancePerGroup}
                onChange={(e) => setAdvancePerGroup(parseInt(e.target.value, 10) as any)}
                className="w-full bg-[#0e2217] border border-emerald-800/60 rounded-lg p-2 text-white"
              >
                <option value={2}>Top 2 Advance (Winners & Runners-up)</option>
                <option value={1}>Top 1 Only Advance (Winners only)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">3rd Place Playoff</label>
              <select
                value={hasThirdPlace ? 'yes' : 'no'}
                onChange={(e) => setHasThirdPlace(e.target.value === 'yes')}
                className="w-full bg-[#0e2217] border border-emerald-800/60 rounded-lg p-2 text-white"
              >
                <option value="yes">Include 3rd Place Match</option>
                <option value="no">Final Only</option>
              </select>
            </div>
          </div>
        )}

        {format === 'league_knockout' && (
          <div className="p-4 bg-[#07130b] border border-emerald-950 rounded-xl grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">League Playoff Teams</label>
              <select
                value={leaguePlayoffTeams}
                onChange={(e) => setLeaguePlayoffTeams(parseInt(e.target.value, 10))}
                className="w-full bg-[#0e2217] border border-emerald-800/60 rounded-lg p-2 text-white"
              >
                <option value={2}>Top 2 (1st vs 2nd Grand Final)</option>
                <option value={4}>Top 4 (Semi-finals: 1 vs 4, 2 vs 3)</option>
                <option value={8}>Top 8 (Quarter-finals)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">3rd Place Playoff</label>
              <select
                value={hasThirdPlace ? 'yes' : 'no'}
                onChange={(e) => setHasThirdPlace(e.target.value === 'yes')}
                className="w-full bg-[#0e2217] border border-emerald-800/60 rounded-lg p-2 text-white"
              >
                <option value="yes">Include 3rd Place Match</option>
                <option value="no">Final Only</option>
              </select>
            </div>
          </div>
        )}

        {/* Custom Points Configuration */}
        <div>
          <label className="block font-bold text-slate-300 text-xs mb-2">
            Custom Points Rule (Standings Calculation)
          </label>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="block text-slate-400 mb-1">Points for WIN</span>
              <input
                type="number"
                value={winPoints}
                onChange={(e) => setWinPoints(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#07130b] border border-emerald-800/60 rounded-lg p-2 text-white text-center font-bold"
              />
            </div>
            <div>
              <span className="block text-slate-400 mb-1">Points for DRAW</span>
              <input
                type="number"
                value={drawPoints}
                onChange={(e) => setDrawPoints(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#07130b] border border-emerald-800/60 rounded-lg p-2 text-white text-center font-bold"
              />
            </div>
            <div>
              <span className="block text-slate-400 mb-1">Points for LOSS</span>
              <input
                type="number"
                value={lossPoints}
                onChange={(e) => setLossPoints(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#07130b] border border-emerald-800/60 rounded-lg p-2 text-white text-center font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Teams Editor (One per line bulk or individual) */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950">
          <div>
            <h3 className="font-display font-bold text-lg text-white">2. Teams & Clubs Management</h3>
            <p className="text-xs text-slate-400">Add multiple teams (one per line) or customize club crests & colors.</p>
          </div>
          <button
            onClick={handleAddSingleTeam}
            className="px-3 py-1.5 text-xs font-semibold bg-[#07130b] hover:bg-emerald-950 border border-emerald-800 text-slate-200 rounded-lg flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Individual Club
          </button>
        </div>

        {/* Bulk Input Textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            Paste or Enter Teams (One Per Line):
          </label>
          <textarea
            rows={5}
            value={bulkTeamsText}
            onChange={(e) => setBulkTeamsText(e.target.value)}
            className="w-full bg-[#07130b] border border-emerald-800/60 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            placeholder="Arsenal&#10;Chelsea&#10;Liverpool&#10;Manchester City"
          />
          <div className="flex justify-end">
            <button
              onClick={handleUpdateBulkTeams}
              className="px-4 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950 border border-emerald-700/60 rounded-lg hover:bg-emerald-900 transition-colors"
            >
              Parse & Update Teams List
            </button>
          </div>
        </div>

        {/* Current Teams Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            Current Teams Registered ({teamsList.length} clubs):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
            {teamsList.map((t, idx) => (
              <div
                key={t.id}
                className="bg-[#07130b] border border-emerald-950 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TeamBadge shortCode={t.shortCode} color={t.color} size="sm" />
                  <div className="min-w-0">
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => {
                        const updated = [...teamsList];
                        updated[idx].name = e.target.value;
                        setTeamsList(updated);
                      }}
                      className="bg-transparent font-bold text-white text-xs truncate focus:bg-[#0e2418] rounded px-1 w-28"
                    />
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>{t.shortCode}</span>
                      <input
                        type="color"
                        value={t.color}
                        onChange={(e) => {
                          const updated = [...teamsList];
                          updated[idx].color = e.target.value;
                          setTeamsList(updated);
                        }}
                        className="w-3.5 h-3.5 rounded border-0 bg-transparent cursor-pointer p-0"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveTeam(t.id)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                  title="Remove club"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Fixture Generator CTA */}
        <div className="p-4 bg-[#07130b] border border-emerald-800/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold text-white text-xs">Generate Competition Fixtures</div>
            <p className="text-[11px] text-slate-400">
              Automatically creates balanced Berger round-robin pairings for your teams and sets up bracket rounds.
            </p>
          </div>
          <button
            onClick={handleRegenerateFixtures}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shrink-0 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Generate Fixtures
          </button>
        </div>
      </div>

      {/* Section 3: Fixture List Importer with Score Preservation */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-6 space-y-4">
        <div className="pb-3 border-b border-emerald-950">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> 3. Import Fixture List (Preserve Existing Scores)
          </h3>
          <p className="text-xs text-slate-400">
            Paste fixture schedules from text or CSV. If teams have already played, their existing scores will be preserved!
          </p>
        </div>

        {fixtureImportMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-lg text-xs text-emerald-200">
            {fixtureImportMessage}
          </div>
        )}

        <textarea
          rows={4}
          value={fixtureImportText}
          onChange={(e) => setFixtureImportText(e.target.value)}
          placeholder={`Accepts formats:&#10;Arsenal vs Chelsea&#10;Round 1: Liverpool vs Everton&#10;Bayern Munich, Real Madrid, 2`}
          className="w-full bg-[#07130b] border border-emerald-800/60 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={preserveScores}
              onChange={(e) => setPreserveScores(e.target.checked)}
              className="rounded bg-[#07130b] text-emerald-500 border-emerald-700"
            />
            <span className="font-semibold">Preserve matching existing match scores & scorers</span>
          </label>

          <button
            onClick={handleImportFixtures}
            disabled={!fixtureImportText.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl"
          >
            Import Fixture Schedule
          </button>
        </div>
      </div>

      {/* Section 4: Data Storage, JSON Backup & Reset Controls */}
      <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-6 space-y-4">
        <div className="pb-3 border-b border-emerald-950">
          <h3 className="font-display font-bold text-lg text-white">4. Data Storage & JSON Backups</h3>
          <p className="text-xs text-slate-400">
            All tournament changes save automatically to local browser storage (<code className="text-emerald-400 font-mono">touchline-v1</code>).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Export JSON */}
          <button
            onClick={() => exportTournamentBackup(state)}
            className="p-3 bg-[#07130b] hover:bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-left flex items-start gap-3 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">Export JSON Backup</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Download full tournament state file</div>
            </div>
          </button>

          {/* Import JSON */}
          <label className="p-3 bg-[#07130b] hover:bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-left flex items-start gap-3 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">Import JSON Backup</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Restore from saved JSON file</div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </label>

          {/* Reset Scores Only */}
          <button
            onClick={handleResetScoresOnly}
            className="p-3 bg-[#07130b] hover:bg-amber-950/30 border border-amber-900/40 rounded-xl text-left flex items-start gap-3 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-200">Reset Scores Only</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Clears scores but keeps schedule</div>
            </div>
          </button>

          {/* Reset Completely */}
          <button
            onClick={() => {
              if (confirm('DANGER: Reset all tournament data back to default?')) {
                handleLoadPreset('premier');
              }
            }}
            className="p-3 bg-[#07130b] hover:bg-rose-950/30 border border-rose-900/40 rounded-xl text-left flex items-start gap-3 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-200">Factory Reset</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Clear and load fresh template</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
