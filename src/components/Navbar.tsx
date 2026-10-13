import React from 'react';
import { TournamentFormat } from '../types/tournament';
import {
  Trophy,
  LayoutDashboard,
  TableProperties,
  Calendar,
  GitFork,
  Flame,
  Share2,
  Settings,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'standings'
  | 'fixtures'
  | 'knockout'
  | 'stats'
  | 'posters'
  | 'settings';

interface NavbarProps {
  tournamentName: string;
  format: TournamentFormat;
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  matchesPlayed: number;
  matchesTotal: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  tournamentName,
  format,
  activeTab,
  onSelectTab,
  matchesPlayed,
  matchesTotal,
}) => {
  const formatLabels: Record<TournamentFormat, string> = {
    league: 'Single League',
    league_knockout: 'League + Playoffs',
    groups_knockout: 'Groups + Knockout',
    knockout: 'Pure Knockout Cup',
  };

  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'standings', label: 'Standings', icon: TableProperties },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar },
    { id: 'knockout', label: 'Knockout Bracket', icon: GitFork },
    { id: 'stats', label: 'Stats & Scorers', icon: Flame },
    { id: 'posters', label: 'Poster Generator', icon: Share2 },
    { id: 'settings', label: 'Setup & Backup', icon: Settings },
  ];

  const completionPct = matchesTotal > 0 ? Math.round((matchesPlayed / matchesTotal) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 bg-[#07130b]/95 backdrop-blur-md border-b border-emerald-900/60">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-emerald-950/60">
          {/* Logo & Tournament Name */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
              <Trophy className="w-5 h-5 text-[#06180e]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold font-display text-white tracking-wide truncate">
                  {tournamentName || 'Chandrutty Tournament'}
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-display">
                  · {formatLabels[format]}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="truncate">Chandrutty Tournament Manager</span>
                <span className="hidden sm:inline" aria-hidden="true">·</span>
                <span className="hidden sm:inline text-emerald-400 font-medium">
                  {matchesPlayed} of {matchesTotal} matches played ({completionPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Quick tournament progress bar */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <div className="w-28 bg-[#0e2217] rounded-full h-2 overflow-hidden border border-emerald-950">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-400 font-display">
              {completionPct}% COMPLETE
            </span>
          </div>
        </div>

        {/* Tab Navigation Navigation bar */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-all select-none ${
                  isActive
                    ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-emerald-950/40 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
