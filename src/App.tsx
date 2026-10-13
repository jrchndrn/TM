/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Match, TournamentState } from './types/tournament';
import { loadTournamentState, saveTournamentState } from './utils/storage';
import { advanceKnockoutWinner, resolveMatchWinner } from './utils/knockoutProgression';
import { Navbar, NavigationTab } from './components/Navbar';
import { DashboardTab } from './components/DashboardTab';
import { StandingsTab } from './components/StandingsTab';
import { FixturesTab } from './components/FixturesTab';
import { KnockoutTab } from './components/KnockoutTab';
import { StatsTab } from './components/StatsTab';
import { PosterTab } from './components/PosterTab';
import { SettingsTab } from './components/SettingsTab';
import { MatchScoreModal } from './components/MatchScoreModal';
import { PosterType } from './utils/posterRenderer';

export default function App() {
  const [tournament, setTournament] = useState<TournamentState>(() => loadTournamentState());
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Initial poster configuration when switching from table or stats
  const [posterConfig, setPosterConfig] = useState<{
    type: PosterType;
    group?: string;
  }>({
    type: 'league_table',
  });

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    saveTournamentState(tournament);
  }, [tournament]);

  // Handle match score updates with knockout winner propagation
  const handleUpdateMatch = (updatedMatch: Match) => {
    let nextMatches = tournament.matches.map((m) =>
      m.id === updatedMatch.id ? updatedMatch : m
    );

    // If knockout match, propagate winner into next bracket round
    if (updatedMatch.stage === 'knockout') {
      const { winnerId, loserId } = resolveMatchWinner(updatedMatch);
      nextMatches = advanceKnockoutWinner(nextMatches, updatedMatch.id, winnerId, loserId);
    }

    setTournament({
      ...tournament,
      matches: nextMatches,
      updatedAt: new Date().toISOString(),
    });

    if (editingMatch && editingMatch.id === updatedMatch.id) {
      setEditingMatch(null);
    }
  };

  const handleDeleteMatch = (matchId: string) => {
    if (!confirm('Are you sure you want to delete this fixture?')) return;
    setTournament({
      ...tournament,
      matches: tournament.matches.filter((m) => m.id !== matchId),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddMatch = (newMatch: Match) => {
    setTournament({
      ...tournament,
      matches: [...tournament.matches, newMatch],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleBatchUpdateMatches = (updatedMatches: Match[]) => {
    setTournament({
      ...tournament,
      matches: updatedMatches,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleOpenPosterForTable = (group?: string) => {
    setPosterConfig({
      type: 'league_table',
      group,
    });
    setActiveTab('posters');
  };

  const handleOpenPosterForStats = () => {
    setPosterConfig({
      type: 'top_scorers',
    });
    setActiveTab('posters');
  };

  const matchesPlayed = tournament.matches.filter((m) => m.status === 'finished').length;
  const matchesTotal = tournament.matches.length;

  return (
    <div className="min-h-screen bg-[#080e0b] text-slate-100 flex flex-col pitch-turf-gradient font-sans">
      {/* Top Navbar */}
      <Navbar
        tournamentName={tournament.name}
        format={tournament.format}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        matchesPlayed={matchesPlayed}
        matchesTotal={matchesTotal}
      />

      {/* Main Tab Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardTab
            state={tournament}
            onOpenMatchModal={(m) => setEditingMatch(m)}
            onSwitchTab={(tab) => {
              if (tab === 'posters') {
                setPosterConfig({ type: 'matchday_fixtures' });
              }
              setActiveTab(tab);
            }}
          />
        )}

        {activeTab === 'standings' && (
          <StandingsTab
            state={tournament}
            onOpenPosterGenerator={handleOpenPosterForTable}
          />
        )}

        {activeTab === 'fixtures' && (
          <FixturesTab
            state={tournament}
            onUpdateMatch={handleUpdateMatch}
            onDeleteMatch={handleDeleteMatch}
            onAddMatch={handleAddMatch}
            onOpenMatchModal={(m) => setEditingMatch(m)}
          />
        )}

        {activeTab === 'knockout' && (
          <KnockoutTab
            state={tournament}
            onUpdateMatches={handleBatchUpdateMatches}
            onOpenMatchModal={(m) => setEditingMatch(m)}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            state={tournament}
            onOpenPosterGenerator={handleOpenPosterForStats}
          />
        )}

        {activeTab === 'posters' && (
          <PosterTab
            state={tournament}
            initialPosterType={posterConfig.type}
            initialGroup={posterConfig.group}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            state={tournament}
            onSaveState={(newState) => setTournament(newState)}
          />
        )}
      </main>

      {/* Match Score & Penalty Modal */}
      {editingMatch && (
        <MatchScoreModal
          match={editingMatch}
          teams={tournament.teams}
          onSave={handleUpdateMatch}
          onClose={() => setEditingMatch(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-emerald-950/70 py-6 text-center text-xs text-slate-500 bg-[#061009]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-emerald-400">CHANDRUTTY TOURNAMENT MANAGER</span>
            <span>· Touchline Official v1.0</span>
          </div>
          <div className="text-slate-400">
            Auto-saved locally · Storage key: <code className="text-emerald-400">touchline-v1</code>
          </div>
        </div>
      </footer>
    </div>
  );
}
