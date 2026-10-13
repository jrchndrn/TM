import React, { useEffect, useRef, useState } from 'react';
import { TournamentState } from '../types/tournament';
import {
  downloadCanvasAsPng,
  PosterType,
  renderTournamentPoster,
  shareCanvasPoster,
} from '../utils/posterRenderer';
import {
  Download,
  Share2,
  Copy,
  Check,
  Calendar,
  TableProperties,
  Award,
  BarChart3,
  Flame,
  Layers,
} from 'lucide-react';

interface PosterTabProps {
  state: TournamentState;
  initialPosterType?: PosterType;
  initialGroup?: string;
}

export const PosterTab: React.FC<PosterTabProps> = ({
  state,
  initialPosterType = 'league_table',
  initialGroup,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [posterType, setPosterType] = useState<PosterType>(initialPosterType);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup || '');
  const [isCopied, setIsCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const isGroupFormat = state.format === 'groups_knockout';
  const groupLetters = isGroupFormat
    ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, state.knockoutConfig.groupsCount)
    : [];

  const availableRounds = Array.from(new Set(state.matches.map((m) => m.round))).sort((a, b) => a - b);

  // Re-render poster on canvas whenever selection changes
  useEffect(() => {
    if (!canvasRef.current) return;
    renderTournamentPoster(canvasRef.current, {
      state,
      posterType,
      selectedRound,
      selectedGroup: selectedGroup || undefined,
    });
  }, [state, posterType, selectedRound, selectedGroup]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const cleanName = state.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadCanvasAsPng(canvasRef.current, `${cleanName}_${posterType}.png`);
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    setIsSharing(true);
    try {
      await shareCanvasPoster(canvasRef.current, `${state.name} - ${posterType.replace('_', ' ').toUpperCase()}`);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopySummaryText = () => {
    const lines: string[] = [
      `🏆 *${state.name.toUpperCase()}* 🏆`,
      `Official Update from Chandrutty Tournament Manager\n`,
    ];

    if (posterType === 'matchday_fixtures') {
      lines.push(`⚽ *Matchday ${selectedRound} Results:*`);
      const roundMatches = state.matches.filter((m) => m.round === selectedRound);
      roundMatches.forEach((m) => {
        const home = state.teams.find((t) => t.id === m.homeTeamId)?.name || 'TBD';
        const away = state.teams.find((t) => t.id === m.awayTeamId)?.name || 'TBD';
        if (m.status === 'finished') {
          lines.push(`• ${home} ${m.homeScore} - ${m.awayScore} ${away}`);
        } else {
          lines.push(`• ${home} vs ${away} (Upcoming)`);
        }
      });
    } else {
      lines.push(`📊 *Current Standings & Report Available!*`);
      lines.push(`Total teams: ${state.teams.length}`);
      lines.push(`Matches played: ${state.matches.filter((m) => m.status === 'finished').length}`);
    }

    lines.push(`\n#ChandruttyTournament #Football #Touchline`);

    navigator.clipboard.writeText(lines.join('\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const posterOptions: { id: PosterType; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'matchday_fixtures',
      label: 'Matchday Fixtures & Results',
      desc: 'Selected round scores, VS match cards, and penalty markers',
      icon: Calendar,
    },
    {
      id: 'league_table',
      label: 'Official Standings Table',
      desc: 'Rankings, played, goal difference, points, and crests',
      icon: TableProperties,
    },
    {
      id: 'top_scorers',
      label: 'Golden Boot / Top Scorers',
      desc: 'Top striker spotlight and tournament goalscorer table',
      icon: Award,
    },
    {
      id: 'tournament_stats',
      label: 'Tournament Overview & Awards',
      desc: 'Best attack, best defence, biggest win margin, total goals',
      icon: BarChart3,
    },
    {
      id: 'goals_comparison',
      label: 'Team Attack vs Defence',
      desc: 'Goals scored (GF) and conceded (GA) breakdown per club',
      icon: Flame,
    },
    {
      id: 'all_results',
      label: 'Complete Results Summary',
      desc: 'High-level multi-match summary of the entire competition',
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5">
        <div>
          <div className="text-xs font-semibold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> High-Resolution Graphic Generator
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-display">
            Share Center & Poster Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate football graphics in PNG format for WhatsApp, Instagram, Telegram, and tournament printouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCopySummaryText}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-[#09170e] hover:bg-[#0e2418] border border-emerald-950 rounded-xl transition-all flex items-center gap-1.5"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Text Copied!' : 'Copy Summary Text'}
          </button>

          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-3.5 py-2 text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl transition-all flex items-center gap-2"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            {isSharing ? 'Sharing...' : 'Share Graphic'}
          </button>

          <button
            onClick={handleDownload}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>

      {/* Main Grid: Controls Left / Canvas Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display">
              1. Select Poster Type
            </h3>

            <div className="space-y-2">
              {posterOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = posterType === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPosterType(opt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500/80 text-white shadow-sm'
                        : 'bg-[#07130b] border-emerald-950/80 text-slate-400 hover:border-emerald-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-display tracking-wide">{opt.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Additional Parameter Selectors */}
            {posterType === 'matchday_fixtures' && (
              <div className="pt-3 border-t border-emerald-950">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-display">
                  Select Matchday / Round:
                </label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(parseInt(e.target.value, 10))}
                  className="w-full bg-[#07130b] border border-emerald-800/60 rounded-lg p-2.5 text-xs text-white"
                >
                  {availableRounds.map((r) => (
                    <option key={r} value={r}>
                      Matchday {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {posterType === 'league_table' && isGroupFormat && groupLetters.length > 0 && (
              <div className="pt-3 border-t border-emerald-950">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 font-display">
                  Select Group to Display:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setSelectedGroup('')}
                    className={`p-2 rounded-lg text-xs font-bold uppercase ${
                      selectedGroup === ''
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#07130b] text-slate-400 border border-emerald-950'
                    }`}
                  >
                    All
                  </button>
                  {groupLetters.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGroup(g)}
                      className={`p-2 rounded-lg text-xs font-bold uppercase ${
                        selectedGroup === g
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#07130b] text-slate-400 border border-emerald-950'
                      }`}
                    >
                      Grp {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Poster specs note */}
            <div className="pt-3 border-t border-emerald-950 text-[11px] text-slate-500 space-y-1">
              <div>• Canvas Size: 1200 × 1600 px (Ultra-HD 9:16)</div>
              <div>• Output: Lossless PNG with stadium lighting</div>
              <div>• Watermark: Chandrutty Tournament Manager</div>
            </div>
          </div>
        </div>

        {/* Poster Canvas Preview Column */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="bg-[#0b1b12] border border-emerald-900/50 rounded-2xl p-4 sm:p-6 w-full flex flex-col items-center shadow-2xl">
            <div className="flex items-center justify-between w-full pb-3 border-b border-emerald-950 mb-4 text-xs text-slate-400">
              <span className="font-display uppercase tracking-wider font-semibold text-emerald-400">
                Live Preview
              </span>
              <span>1200 × 1600 PNG Format</span>
            </div>

            {/* Canvas rendered and displayed responsive */}
            <div className="w-full max-w-[460px] aspect-[3/4] bg-[#05130b] rounded-xl overflow-hidden shadow-2xl border border-emerald-900/40 relative">
              <canvas
                ref={canvasRef}
                width={1200}
                height={1600}
                className="w-full h-full object-contain block"
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 w-full">
              <button
                onClick={handleDownload}
                className="w-full max-w-xs py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Graphic (PNG)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
