import React, { useState, useEffect } from 'react';
import { GoalScorer, Match, Team } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { X, Plus, Trash2, Award, Clock, AlertCircle, CheckCircle2, Trophy, HelpCircle } from 'lucide-react';

interface MatchScoreModalProps {
  match: Match;
  teams: Team[];
  onSave: (updatedMatch: Match) => void;
  onClose: () => void;
}

export const MatchScoreModal: React.FC<MatchScoreModalProps> = ({
  match,
  teams,
  onSave,
  onClose,
}) => {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId);
  const awayTeam = teams.find((t) => t.id === match.awayTeamId);
  const isKnockout = match.stage === 'knockout';

  const [homeScore, setHomeScore] = useState<string>(
    match.homeScore !== null && match.homeScore !== undefined ? String(match.homeScore) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    match.awayScore !== null && match.awayScore !== undefined ? String(match.awayScore) : ''
  );
  const [status, setStatus] = useState<Match['status']>(match.status);
  const [hasExtraTime, setHasExtraTime] = useState<boolean>(match.hasExtraTime || false);
  const [hasPenalties, setHasPenalties] = useState<boolean>(match.hasPenalties || false);
  const [homePens, setHomePens] = useState<string>(
    match.homePenalties !== null && match.homePenalties !== undefined ? String(match.homePenalties) : ''
  );
  const [awayPens, setAwayPens] = useState<string>(
    match.awayPenalties !== null && match.awayPenalties !== undefined ? String(match.awayPenalties) : ''
  );

  // Individual penalty kick dots (5 standard kicks + sudden death)
  const initialHomeKicks = match.penaltyKicks?.homeKicks || [true, true, true, true, false];
  const initialAwayKicks = match.penaltyKicks?.awayKicks || [true, true, true, false, false];
  const [homeKicks, setHomeKicks] = useState<boolean[]>(initialHomeKicks);
  const [awayKicks, setAwayKicks] = useState<boolean[]>(initialAwayKicks);

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(match.winnerTeamId || null);
  const [scorers, setScorers] = useState<GoalScorer[]>(match.scorers || []);
  const [venue, setVenue] = useState<string>(match.venue || '');
  const [time, setTime] = useState<string>(match.time || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New scorer input state
  const [newScorerName, setNewScorerName] = useState('');
  const [newScorerTeamId, setNewScorerTeamId] = useState<string>(
    homeTeam ? homeTeam.id : ''
  );
  const [newScorerMinute, setNewScorerMinute] = useState('');
  const [newScorerIsPenalty, setNewScorerIsPenalty] = useState(false);
  const [newScorerIsOwnGoal, setNewScorerIsOwnGoal] = useState(false);

  const parsedHome = homeScore !== '' ? parseInt(homeScore, 10) : null;
  const parsedAway = awayScore !== '' ? parseInt(awayScore, 10) : null;
  const parsedHomePens = homePens !== '' ? parseInt(homePens, 10) : null;
  const parsedAwayPens = awayPens !== '' ? parseInt(awayPens, 10) : null;

  const isDrawnScore = parsedHome !== null && parsedAway !== null && parsedHome === parsedAway;
  const isShootoutActive = (isKnockout && isDrawnScore) || hasPenalties || status === 'penalty_shootout';

  // If score becomes tied in knockout, automatically activate penalty shootout mode
  useEffect(() => {
    if (isKnockout && isDrawnScore && !hasPenalties) {
      setHasPenalties(true);
      if (status !== 'finished') {
        setStatus('penalty_shootout');
      }
    }
  }, [isKnockout, isDrawnScore, hasPenalties, status]);

  // Update penalty scores from kicks
  const updatePensFromKicks = (hKicks: boolean[], aKicks: boolean[]) => {
    const hCount = hKicks.filter(Boolean).length;
    const aCount = aKicks.filter(Boolean).length;
    setHomePens(String(hCount));
    setAwayPens(String(aCount));

    if (hCount > aCount) {
      setSelectedWinnerId(homeTeam?.id || null);
    } else if (aCount > hCount) {
      setSelectedWinnerId(awayTeam?.id || null);
    } else {
      setSelectedWinnerId(null);
    }
  };

  const toggleHomeKick = (index: number) => {
    const next = [...homeKicks];
    next[index] = !next[index];
    setHomeKicks(next);
    updatePensFromKicks(next, awayKicks);
  };

  const toggleAwayKick = (index: number) => {
    const next = [...awayKicks];
    next[index] = !next[index];
    setAwayKicks(next);
    updatePensFromKicks(homeKicks, next);
  };

  const addSuddenDeathRound = () => {
    const nextH = [...homeKicks, true];
    const nextA = [...awayKicks, false];
    setHomeKicks(nextH);
    setAwayKicks(nextA);
    updatePensFromKicks(nextH, nextA);
  };

  const applyQuickShootoutResult = (hCount: number, aCount: number) => {
    setHomePens(String(hCount));
    setAwayPens(String(aCount));
    setHasPenalties(true);
    setStatus('finished');

    // Create kicks to match the count
    const hK: boolean[] = [];
    for (let i = 0; i < 5; i++) hK.push(i < hCount);
    const aK: boolean[] = [];
    for (let i = 0; i < 5; i++) aK.push(i < aCount);
    setHomeKicks(hK);
    setAwayKicks(aK);

    if (hCount > aCount) {
      setSelectedWinnerId(homeTeam?.id || null);
    } else if (aCount > hCount) {
      setSelectedWinnerId(awayTeam?.id || null);
    }
  };

  const handleAddScorer = () => {
    if (!newScorerName.trim() || !newScorerTeamId) return;
    const scorer: GoalScorer = {
      id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      playerName: newScorerName.trim(),
      teamId: newScorerTeamId,
      minute: newScorerMinute ? parseInt(newScorerMinute, 10) : undefined,
      isPenalty: newScorerIsPenalty,
      isOwnGoal: newScorerIsOwnGoal,
    };
    setScorers([...scorers, scorer]);
    setNewScorerName('');
    setNewScorerMinute('');
    setNewScorerIsPenalty(false);
    setNewScorerIsOwnGoal(false);
  };

  const handleRemoveScorer = (scorerId: string) => {
    setScorers(scorers.filter((s) => s.id !== scorerId));
  };

  const handleSave = () => {
    setErrorMessage(null);

    // Validation for knockout tied matches
    if (isKnockout && isDrawnScore) {
      if (parsedHomePens === null || parsedAwayPens === null) {
        setErrorMessage('This knockout match ended in a draw! You must enter the penalty shootout score.');
        return;
      }
      if (parsedHomePens === parsedAwayPens && !selectedWinnerId) {
        setErrorMessage('Penalty shootout cannot end in a tie. Please record sudden death kicks to produce a winner.');
        return;
      }
    }

    let finalStatus = status;
    if (parsedHome !== null && parsedAway !== null) {
      if (isKnockout && isDrawnScore) {
        finalStatus = 'finished';
      } else if (status === 'scheduled') {
        finalStatus = 'finished';
      }
    }

    // Determine decisive winner
    let finalWinnerId = selectedWinnerId || null;
    if (parsedHome !== null && parsedAway !== null) {
      if (parsedHome > parsedAway) {
        finalWinnerId = homeTeam?.id || null;
      } else if (parsedAway > parsedHome) {
        finalWinnerId = awayTeam?.id || null;
      } else if (hasPenalties && parsedHomePens !== null && parsedAwayPens !== null) {
        if (parsedHomePens > parsedAwayPens) {
          finalWinnerId = homeTeam?.id || null;
        } else if (parsedAwayPens > parsedHomePens) {
          finalWinnerId = awayTeam?.id || null;
        }
      }
    }

    const updated: Match = {
      ...match,
      homeScore: parsedHome,
      awayScore: parsedAway,
      status: finalStatus,
      hasExtraTime,
      hasPenalties,
      homePenalties: parsedHomePens,
      awayPenalties: parsedAwayPens,
      penaltyKicks: {
        homeKicks,
        awayKicks,
      },
      winnerTeamId: finalWinnerId,
      scorers,
      venue: venue.trim() || undefined,
      time: time.trim() || undefined,
    };

    onSave(updated);
  };

  // Current winner calculation for preview banner
  const currentShootoutWinner = (() => {
    if (parsedHomePens !== null && parsedAwayPens !== null) {
      if (parsedHomePens > parsedAwayPens) return homeTeam;
      if (parsedAwayPens > parsedHomePens) return awayTeam;
    }
    if (selectedWinnerId === homeTeam?.id) return homeTeam;
    if (selectedWinnerId === awayTeam?.id) return awayTeam;
    return null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0b1710] border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-950 bg-[#07100b]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-display flex items-center gap-2">
              <span>{match.roundName || `Matchday ${match.round}`}</span>
              {isKnockout && <span className="text-amber-400">· Knockout Match</span>}
              {status === 'penalty_shootout' && (
                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/40 animate-pulse">
                  PENALTY SHOOTOUT IN PROGRESS
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white font-display">Match Result & Scoreboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-emerald-950/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/60 rounded-xl text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Teams and Score Entry Board */}
          <div className="bg-[#09150e] border border-emerald-900/50 rounded-xl p-5">
            <div className="grid grid-cols-5 items-center gap-4">
              {/* Home Team */}
              <div className="col-span-2 flex items-center gap-3">
                {homeTeam ? (
                  <>
                    <TeamBadge shortCode={homeTeam.shortCode} color={homeTeam.color} size="lg" />
                    <div className="min-w-0">
                      <div className="font-bold text-white text-base truncate">{homeTeam.name}</div>
                      <div className="text-xs text-emerald-400 font-display">HOME</div>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 italic text-sm">TBD (Pending Slot)</div>
                )}
              </div>

              {/* Score Inputs */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="w-12 h-12 text-center text-2xl font-bold font-display bg-[#0e2217] border border-emerald-500/40 rounded-lg text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                  <span className="text-slate-500 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="w-12 h-12 text-center text-2xl font-bold font-display bg-[#0e2217] border border-emerald-500/40 rounded-lg text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
                  Regulation (FT)
                </div>
              </div>

              {/* Away Team */}
              <div className="col-span-2 flex items-center justify-end gap-3 text-right">
                {awayTeam ? (
                  <>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-base truncate">{awayTeam.name}</div>
                      <div className="text-xs text-emerald-400 font-display">AWAY</div>
                    </div>
                    <TeamBadge shortCode={awayTeam.shortCode} color={awayTeam.color} size="lg" />
                  </>
                ) : (
                  <div className="text-slate-400 italic text-sm">TBD (Pending Slot)</div>
                )}
              </div>
            </div>

            {/* Extra Time and Status Options */}
            <div className="mt-4 pt-3 border-t border-emerald-950/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={hasExtraTime}
                    onChange={(e) => setHasExtraTime(e.target.checked)}
                    className="rounded border-emerald-600 text-emerald-500 focus:ring-emerald-500 bg-[#0e2217]"
                  />
                  <span>Extra Time Played (AET)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={hasPenalties}
                    onChange={(e) => setHasPenalties(e.target.checked)}
                    className="rounded border-emerald-600 text-emerald-500 focus:ring-emerald-500 bg-[#0e2217]"
                  />
                  <span>Penalty Shootout (Pens)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Match Status:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Match['status'])}
                  className="bg-[#0e2217] border border-emerald-700/50 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live Now</option>
                  <option value="penalty_shootout">Penalty Shootout (In Progress)</option>
                  <option value="finished">Finished (FT/Pens)</option>
                </select>
              </div>
            </div>
          </div>

          {/* DEDICATED PENALTY SHOOTOUT STATE SECTION (For Knockouts & Tied Games) */}
          {isShootoutActive && (
            <div className="bg-[#0a1b12] border-2 border-amber-500/50 rounded-xl p-5 space-y-4 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-900/40">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                      Penalty Shootout Arena
                    </h3>
                    <p className="text-[11px] text-amber-300/90">
                      {isDrawnScore ? 'Match ended in a draw! Winner advances to next knockout round.' : 'Shootout decider'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickShootoutResult(5, 4)}
                    className="px-2 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/50 rounded text-[10px] text-amber-200 font-bold"
                  >
                    Quick 5-4
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickShootoutResult(4, 5)}
                    className="px-2 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/50 rounded text-[10px] text-amber-200 font-bold"
                  >
                    Quick 4-5
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickShootoutResult(4, 2)}
                    className="px-2 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/50 rounded text-[10px] text-amber-200 font-bold"
                  >
                    Quick 4-2
                  </button>
                </div>
              </div>

              {/* Shootout Score Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Home Team Penalties */}
                <div className="bg-[#07130b] border border-emerald-950 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TeamBadge shortCode={homeTeam?.shortCode || 'H'} color={homeTeam?.color} size="sm" />
                      <span className="font-bold text-white text-xs truncate max-w-[120px]">
                        {homeTeam?.name || 'Home Team'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Total:</span>
                      <input
                        type="number"
                        min="0"
                        value={homePens}
                        onChange={(e) => {
                          setHomePens(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          const awayVal = parseInt(awayPens, 10);
                          if (!isNaN(val) && !isNaN(awayVal)) {
                            if (val > awayVal) setSelectedWinnerId(homeTeam?.id || null);
                            else if (awayVal > val) setSelectedWinnerId(awayTeam?.id || null);
                          }
                        }}
                        className="w-10 h-8 text-center text-lg font-black font-display bg-[#0e2217] border border-amber-500/60 rounded text-amber-300"
                      />
                    </div>
                  </div>

                  {/* Kicks dots */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Penalty Kicks (Click to toggle 🟢/🔴):</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {homeKicks.map((scored, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleHomeKick(idx)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-transform hover:scale-110 ${
                            scored
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-900/50'
                              : 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                          }`}
                          title={`Kick #${idx + 1}: ${scored ? 'Scored' : 'Missed'} (click to switch)`}
                        >
                          {scored ? '⚽' : '✕'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Away Team Penalties */}
                <div className="bg-[#07130b] border border-emerald-950 p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TeamBadge shortCode={awayTeam?.shortCode || 'A'} color={awayTeam?.color} size="sm" />
                      <span className="font-bold text-white text-xs truncate max-w-[120px]">
                        {awayTeam?.name || 'Away Team'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Total:</span>
                      <input
                        type="number"
                        min="0"
                        value={awayPens}
                        onChange={(e) => {
                          setAwayPens(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          const homeVal = parseInt(homePens, 10);
                          if (!isNaN(val) && !isNaN(homeVal)) {
                            if (homeVal > val) setSelectedWinnerId(homeTeam?.id || null);
                            else if (val > homeVal) setSelectedWinnerId(awayTeam?.id || null);
                          }
                        }}
                        className="w-10 h-8 text-center text-lg font-black font-display bg-[#0e2217] border border-amber-500/60 rounded text-amber-300"
                      />
                    </div>
                  </div>

                  {/* Kicks dots */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Penalty Kicks (Click to toggle 🟢/🔴):</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {awayKicks.map((scored, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleAwayKick(idx)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-transform hover:scale-110 ${
                            scored
                              ? 'bg-emerald-500 text-black shadow-md shadow-emerald-900/50'
                              : 'bg-rose-600 text-white shadow-md shadow-rose-950/50'
                          }`}
                          title={`Kick #${idx + 1}: ${scored ? 'Scored' : 'Missed'} (click to switch)`}
                        >
                          {scored ? '⚽' : '✕'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sudden Death Button & Winner Confirmation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={addSuddenDeathRound}
                  className="px-3 py-1.5 bg-[#0e2217] hover:bg-emerald-950 border border-emerald-800 rounded-lg text-xs text-emerald-300 font-semibold flex items-center gap-1.5 self-start"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Sudden Death Round
                </button>

                {currentShootoutWinner ? (
                  <div className="flex items-center gap-2 p-2 bg-emerald-950/80 border border-emerald-500 rounded-lg">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-white">
                      Advancing Winner: <span className="text-amber-300">{currentShootoutWinner.name}</span>
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-300/80 italic flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> Tied shootout — enter scores to determine winner
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goal Scorers Section */}
          <div className="bg-[#09150e] border border-emerald-900/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 font-display uppercase tracking-wider flex items-center gap-2">
                ⚽ Goal Scorers (Golden Boot Tracking)
              </h3>
              <span className="text-xs text-slate-400">{scorers.length} goal(s) recorded</span>
            </div>

            {/* List of current scorers */}
            {scorers.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {scorers.map((scorer) => {
                  const sTeam = teams.find((t) => t.id === scorer.teamId);
                  return (
                    <div
                      key={scorer.id}
                      className="flex items-center justify-between p-2.5 bg-[#0e2217] border border-emerald-950 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sTeam?.color || '#10b981' }} />
                        <span className="font-bold text-white">{scorer.playerName}</span>
                        <span className="text-slate-400">({sTeam?.shortCode || 'Team'})</span>
                        {scorer.minute && (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {scorer.minute}&apos;
                          </span>
                        )}
                        {scorer.isPenalty && (
                          <span className="text-amber-400 font-semibold">[Pen]</span>
                        )}
                        {scorer.isOwnGoal && (
                          <span className="text-rose-400 font-semibold">[OG]</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveScorer(scorer.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Remove goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No goal scorers added for this match yet.</p>
            )}

            {/* Add new scorer form */}
            <div className="pt-3 border-t border-emerald-950/60 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-4">
                <label className="block text-[11px] text-slate-400 mb-1">Player Name</label>
                <input
                  type="text"
                  placeholder="e.g. K. Rahul"
                  value={newScorerName}
                  onChange={(e) => setNewScorerName(e.target.value)}
                  className="w-full bg-[#07130b] border border-emerald-800/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">Team</label>
                <select
                  value={newScorerTeamId}
                  onChange={(e) => setNewScorerTeamId(e.target.value)}
                  className="w-full bg-[#07130b] border border-emerald-800/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {homeTeam && <option value={homeTeam.id}>{homeTeam.name}</option>}
                  {awayTeam && <option value={awayTeam.id}>{awayTeam.name}</option>}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Min (opt)</label>
                <input
                  type="number"
                  min="1"
                  max="130"
                  placeholder="45"
                  value={newScorerMinute}
                  onChange={(e) => setNewScorerMinute(e.target.value)}
                  className="w-full bg-[#07130b] border border-emerald-800/40 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex items-center gap-2 pb-1">
                <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newScorerIsPenalty}
                    onChange={(e) => setNewScorerIsPenalty(e.target.checked)}
                    className="rounded text-amber-500 bg-[#07130b]"
                  />
                  <span>Pen</span>
                </label>

                <button
                  type="button"
                  onClick={handleAddScorer}
                  disabled={!newScorerName.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Optional Venue & Kickoff Time */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Pitch / Venue</label>
              <input
                type="text"
                placeholder="e.g. Chandrutty Ground, Pitch 1"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full bg-[#09150e] border border-emerald-900/50 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Kick-off Time / Date</label>
              <input
                type="text"
                placeholder="e.g. 16:30 or Saturday 4 PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#09150e] border border-emerald-900/50 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-emerald-950 bg-[#07100b]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-emerald-950/60 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Save & Update Tournament Progression
          </button>
        </div>
      </div>
    </div>
  );
};
