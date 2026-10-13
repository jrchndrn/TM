import { Match, StandingsRow, Team, TopScorerRow, TournamentState } from '../types/tournament';
import { calculateStandings, getTopScorers, getTournamentStatistics } from './standings';

export type PosterType =
  | 'matchday_fixtures'
  | 'league_table'
  | 'top_scorers'
  | 'tournament_stats'
  | 'goals_comparison'
  | 'all_results';

interface RenderPosterOptions {
  state: TournamentState;
  posterType: PosterType;
  selectedRound?: number;
  selectedGroup?: string;
}

/**
 * Draws background with dark football pitch turf and stadium floodlight ambiance
 */
function drawFootballBackground(ctx: CanvasRenderingContext2D, width: number, height: number, subtitleText: string, titleText: string) {
  // Base dark pitch color
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#05130b');
  bgGrad.addColorStop(0.3, '#081c11');
  bgGrad.addColorStop(0.7, '#07170e');
  bgGrad.addColorStop(1, '#030a06');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Stadium spotlight gradient at top center
  const spotGrad = ctx.createRadialGradient(width / 2, 0, 10, width / 2, 100, width * 0.7);
  spotGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
  spotGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.05)');
  spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, width, height * 0.6);

  // Subtle pitch stripes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  const stripeHeight = 90;
  for (let y = 0; y < height; y += stripeHeight * 2) {
    ctx.fillRect(0, y, width, stripeHeight);
  }

  // Border frame
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // Corner accents
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 6;
  const cornerSize = 40;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(24, 24 + cornerSize);
  ctx.lineTo(24, 24);
  ctx.lineTo(24 + cornerSize, 24);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - 24 - cornerSize, 24);
  ctx.lineTo(width - 24, 24);
  ctx.lineTo(width - 24, 24 + cornerSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(24, height - 24 - cornerSize);
  ctx.lineTo(24, height - 24);
  ctx.lineTo(24 + cornerSize, height - 24);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - 24 - cornerSize, height - 24);
  ctx.lineTo(width - 24, height - 24);
  ctx.lineTo(width - 24, height - 24 - cornerSize);
  ctx.stroke();

  // Header Trophy Emblem & Subtitle
  ctx.textAlign = 'center';
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 20px "Outfit", sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillText('⚽ CHANDRUTTY TOURNAMENT OFFICIAL REPORT', width / 2, 75);
  ctx.letterSpacing = '0px';

  // Tournament Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px "Rajdhani", sans-serif';
  ctx.fillText(titleText.toUpperCase(), width / 2, 130);

  // Category Banner / Subtitle Box
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  const bannerW = 600;
  const bannerH = 44;
  const bannerX = (width - bannerW) / 2;
  const bannerY = 155;
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

  ctx.fillStyle = '#34d399';
  ctx.font = '700 22px "Rajdhani", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(subtitleText.toUpperCase(), width / 2, bannerY + 30);
  ctx.letterSpacing = '0px';

  // Footer branding
  ctx.textAlign = 'center';
  ctx.font = '14px "Outfit", sans-serif';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.fillText('POWERED BY CHANDRUTTY TOURNAMENT MANAGER · TOUCHLINE OFFICIAL', width / 2, height - 42);
}

/**
 * Draws a football club shield crest badge
 */
function drawTeamBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shortCode: string,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);

  // Shield path
  const w = size;
  const h = size * 1.15;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, -h / 4);
  ctx.lineTo(w / 2, h / 8);
  ctx.quadraticCurveTo(w / 2, h / 2, 0, h / 2);
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 8);
  ctx.lineTo(-w / 2, -h / 4);
  ctx.closePath();

  // Badge background
  ctx.fillStyle = color || '#10b981';
  ctx.fill();

  // Subtle dark inner bevel
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Initial code text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(size * 0.36)}px "Rajdhani", sans-serif`;
  ctx.fillText(shortCode.slice(0, 3).toUpperCase(), 0, 2);

  ctx.restore();
}

/**
 * Render poster directly to an HTMLCanvasElement
 */
export function renderTournamentPoster(canvas: HTMLCanvasElement, options: RenderPosterOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { state, posterType, selectedRound = 1, selectedGroup } = options;
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const teamMap = new Map<string, Team>();
  state.teams.forEach((t) => teamMap.set(t.id, t));

  if (posterType === 'matchday_fixtures') {
    drawFootballBackground(ctx, width, height, `MATCHDAY ${selectedRound} RESULTS & FIXTURES`, state.name);

    const roundMatches = state.matches.filter((m) => m.round === selectedRound);
    const startY = 240;
    const itemHeight = 110;
    const maxItems = Math.min(roundMatches.length, 9);

    if (roundMatches.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px "Outfit", sans-serif';
      ctx.fillText(`No fixtures scheduled for Matchday ${selectedRound}`, width / 2, 500);
      return;
    }

    roundMatches.slice(0, maxItems).forEach((m, idx) => {
      const y = startY + idx * (itemHeight + 16);
      const homeTeam = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
      const awayTeam = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;

      // Card container
      ctx.fillStyle = 'rgba(15, 33, 23, 0.85)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.lineWidth = 1.5;
      const cardW = width - 120;
      const cardX = 60;
      ctx.beginPath();
      ctx.roundRect(cardX, y, cardW, itemHeight, 12);
      ctx.fill();
      ctx.stroke();

      // Home Team
      if (homeTeam) {
        drawTeamBadge(ctx, cardX + 60, y + itemHeight / 2, 52, homeTeam.shortCode, homeTeam.color);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillText(homeTeam.name, cardX + 105, y + itemHeight / 2 + 8);
      } else {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 20px "Outfit", sans-serif';
        ctx.fillText('TBD / Slot', cardX + 70, y + itemHeight / 2 + 8);
      }

      // Center Score or VS
      ctx.textAlign = 'center';
      if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
        // Score box
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.fillRect(width / 2 - 75, y + 25, 150, 60);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.strokeRect(width / 2 - 75, y + 25, 150, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 38px "Rajdhani", sans-serif';
        ctx.fillText(`${m.homeScore}  -  ${m.awayScore}`, width / 2, y + 68);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px "Outfit", sans-serif';
        ctx.fillText('FT', width / 2, y + 20);

        if (m.hasPenalties && m.homePenalties !== null && m.awayPenalties !== null) {
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 12px "Outfit", sans-serif';
          ctx.fillText(`(Pens ${m.homePenalties}-${m.awayPenalties})`, width / 2, y + 100);
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '800 28px "Rajdhani", sans-serif';
        ctx.fillText('VS', width / 2, y + itemHeight / 2 + 8);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px "Outfit", sans-serif';
        ctx.fillText('UPCOMING', width / 2, y + itemHeight / 2 - 18);
      }

      // Away Team
      if (awayTeam) {
        drawTeamBadge(ctx, cardX + cardW - 60, y + itemHeight / 2, 52, awayTeam.shortCode, awayTeam.color);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.fillText(awayTeam.name, cardX + cardW - 105, y + itemHeight / 2 + 8);
      } else {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 20px "Outfit", sans-serif';
        ctx.fillText('TBD / Slot', cardX + cardW - 70, y + itemHeight / 2 + 8);
      }
    });
  } else if (posterType === 'league_table') {
    const title = selectedGroup ? `GROUP ${selectedGroup} OFFICIAL STANDINGS` : 'OFFICIAL LEAGUE TABLE';
    drawFootballBackground(ctx, width, height, title, state.name);

    const standings = calculateStandings(state.teams, state.matches, state.pointsRule, selectedGroup);
    const startY = 240;
    const tableW = width - 120;
    const tableX = 60;

    // Table Header
    ctx.fillStyle = '#0f291a';
    ctx.fillRect(tableX, startY, tableW, 46);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableX, startY, tableW, 46);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('#   TEAM', tableX + 24, startY + 29);

    ctx.textAlign = 'center';
    ctx.fillText('P', tableX + tableW - 370, startY + 29);
    ctx.fillText('W', tableX + tableW - 310, startY + 29);
    ctx.fillText('D', tableX + tableW - 250, startY + 29);
    ctx.fillText('L', tableX + tableW - 190, startY + 29);
    ctx.fillText('GD', tableX + tableW - 120, startY + 29);
    ctx.fillText('PTS', tableX + tableW - 45, startY + 29);

    const rowH = 64;
    standings.slice(0, 14).forEach((row, idx) => {
      const y = startY + 46 + idx * rowH;

      // Row background
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(12, 28, 19, 0.75)' : 'rgba(18, 40, 28, 0.75)';
      ctx.fillRect(tableX, y, tableW, rowH);

      // Qualification highlight line
      if (idx === 0) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(tableX, y, 6, rowH);
      } else if (idx < 4) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(tableX, y, 6, rowH);
      }

      // Position
      ctx.textAlign = 'center';
      ctx.fillStyle = idx === 0 ? '#facc15' : '#cbd5e1';
      ctx.font = 'bold 22px "Rajdhani", sans-serif';
      ctx.fillText(String(row.position), tableX + 35, y + 40);

      // Crest
      drawTeamBadge(ctx, tableX + 80, y + rowH / 2, 38, row.team.shortCode, row.team.color);

      // Team Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 22px "Outfit", sans-serif';
      ctx.fillText(row.team.name, tableX + 115, y + 40);

      // Stats
      ctx.textAlign = 'center';
      ctx.font = '600 20px "Outfit", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(String(row.played), tableX + tableW - 370, y + 40);
      ctx.fillText(String(row.won), tableX + tableW - 310, y + 40);
      ctx.fillText(String(row.drawn), tableX + tableW - 250, y + 40);
      ctx.fillText(String(row.lost), tableX + tableW - 190, y + 40);

      // GD
      ctx.fillStyle = row.goalDifference > 0 ? '#34d399' : row.goalDifference < 0 ? '#f87171' : '#94a3b8';
      ctx.fillText((row.goalDifference > 0 ? '+' : '') + String(row.goalDifference), tableX + tableW - 120, y + 40);

      // Points (Highlighted)
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 26px "Rajdhani", sans-serif';
      ctx.fillText(String(row.points), tableX + tableW - 45, y + 40);
    });
  } else if (posterType === 'top_scorers') {
    drawFootballBackground(ctx, width, height, 'GOLDEN BOOT · TOP SCORERS', state.name);

    const scorers = getTopScorers(state.matches, state.teams);
    const startY = 240;
    const tableW = width - 120;
    const tableX = 60;

    if (scorers.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '24px "Outfit", sans-serif';
      ctx.fillText('No goal scorers recorded yet. Add scorers in match score cards!', width / 2, 500);
      return;
    }

    // Top player spotlight card
    const leader = scorers[0];
    const spotH = 140;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tableX, startY, tableW, spotH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('👑 CURRENT GOLDEN BOOT LEADER', tableX + 30, startY + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px "Rajdhani", sans-serif';
    ctx.fillText(leader.playerName.toUpperCase(), tableX + 30, startY + 85);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px "Outfit", sans-serif';
    ctx.fillText(leader.teamName, tableX + 30, startY + 118);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#facc15';
    ctx.font = '900 68px "Rajdhani", sans-serif';
    ctx.fillText(`${leader.goals}`, tableX + tableW - 30, startY + 85);
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('GOALS', tableX + tableW - 30, startY + 115);

    // Leaderboard list
    const listStartY = startY + spotH + 30;
    const rowH = 68;

    scorers.slice(1, 12).forEach((player, idx) => {
      const y = listStartY + idx * rowH;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(12, 28, 19, 0.7)' : 'rgba(18, 40, 28, 0.7)';
      ctx.beginPath();
      ctx.roundRect(tableX, y, tableW, rowH - 6, 8);
      ctx.fill();

      // Rank
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 22px "Rajdhani", sans-serif';
      ctx.fillText(String(idx + 2), tableX + 35, y + 38);

      // Player Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.fillText(player.playerName, tableX + 75, y + 30);

      // Club
      ctx.fillStyle = '#34d399';
      ctx.font = '16px "Outfit", sans-serif';
      ctx.fillText(player.teamName, tableX + 75, y + 52);

      // Goals badge
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px "Rajdhani", sans-serif';
      ctx.fillText(`${player.goals} G`, tableX + tableW - 30, y + 42);
    });
  } else if (posterType === 'tournament_stats') {
    drawFootballBackground(ctx, width, height, 'TOURNAMENT STATISTICS & AWARDS', state.name);

    const stats = getTournamentStatistics(state.teams, state.matches, state.pointsRule);
    const startY = 240;
    const cardW = (width - 160) / 2;
    const cardH = 160;

    const cards = [
      {
        title: 'TOTAL GOALS SCORED',
        value: String(stats.totalGoals),
        sub: `${stats.goalsPerMatch} goals / match average`,
        color: '#10b981',
      },
      {
        title: 'MATCHES COMPLETED',
        value: `${stats.matchesPlayed} / ${stats.matchesTotal}`,
        sub: `${stats.matchesRemaining} fixtures remaining`,
        color: '#3b82f6',
      },
      {
        title: 'BEST ATTACK (MOST GOALS)',
        value: stats.bestAttack ? `${stats.bestAttack.goalsFor} Goals` : '—',
        sub: stats.bestAttack ? stats.bestAttack.team.name : 'No matches played',
        color: '#f59e0b',
      },
      {
        title: 'BEST DEFENCE (FEWEST GA)',
        value: stats.bestDefence ? `${stats.bestDefence.goalsAgainst} Conceded` : '—',
        sub: stats.bestDefence ? stats.bestDefence.team.name : 'No matches played',
        color: '#06b6d4',
      },
      {
        title: 'MOST CLEAN SHEETS',
        value: stats.mostCleanSheetsTeam ? `${stats.mostCleanSheetsTeam.count} Clean Sheets` : '0',
        sub: stats.mostCleanSheetsTeam ? stats.mostCleanSheetsTeam.team.name : 'None yet',
        color: '#8b5cf6',
      },
      {
        title: 'BIGGEST WINNING MARGIN',
        value: stats.biggestMargin ? stats.biggestMargin.score : '—',
        sub: stats.biggestMargin ? stats.biggestMargin.matchTitle : 'No blowout games yet',
        color: '#ec4899',
      },
    ];

    cards.forEach((card, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 60 + col * (cardW + 40);
      const y = startY + row * (cardH + 30);

      ctx.fillStyle = 'rgba(15, 33, 23, 0.85)';
      ctx.strokeStyle = card.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = card.color;
      ctx.font = 'bold 15px "Outfit", sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(card.title, x + 24, y + 36);
      ctx.letterSpacing = '0px';

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px "Rajdhani", sans-serif';
      ctx.fillText(card.value, x + 24, y + 95);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 18px "Outfit", sans-serif';
      ctx.fillText(card.sub, x + 24, y + 132);
    });
  } else if (posterType === 'goals_comparison') {
    drawFootballBackground(ctx, width, height, 'TEAM ATTACK VS DEFENCE', state.name);

    const standings = calculateStandings(state.teams, state.matches, state.pointsRule);
    const startY = 240;
    const tableW = width - 120;
    const tableX = 60;
    const rowH = 68;

    // Header
    ctx.fillStyle = '#0f291a';
    ctx.fillRect(tableX, startY, tableW, 46);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableX, startY, tableW, 46);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CLUB', tableX + 24, startY + 29);

    ctx.textAlign = 'center';
    ctx.fillText('SCORED (GF)', tableX + tableW - 320, startY + 29);
    ctx.fillText('CONCEDED (GA)', tableX + tableW - 170, startY + 29);
    ctx.fillText('DIFF', tableX + tableW - 45, startY + 29);

    standings.slice(0, 14).forEach((row, idx) => {
      const y = startY + 46 + idx * rowH;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(12, 28, 19, 0.75)' : 'rgba(18, 40, 28, 0.75)';
      ctx.fillRect(tableX, y, tableW, rowH);

      drawTeamBadge(ctx, tableX + 45, y + rowH / 2, 40, row.team.shortCode, row.team.color);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 22px "Outfit", sans-serif';
      ctx.fillText(row.team.name, tableX + 85, y + 42);

      // Scored
      ctx.textAlign = 'center';
      ctx.fillStyle = '#34d399';
      ctx.font = '900 28px "Rajdhani", sans-serif';
      ctx.fillText(String(row.goalsFor), tableX + tableW - 320, y + 43);

      // Conceded
      ctx.fillStyle = '#f87171';
      ctx.fillText(String(row.goalsAgainst), tableX + tableW - 170, y + 43);

      // GD
      ctx.fillStyle = row.goalDifference >= 0 ? '#38bdf8' : '#fb923c';
      ctx.fillText((row.goalDifference > 0 ? '+' : '') + String(row.goalDifference), tableX + tableW - 45, y + 43);
    });
  } else {
    // all_results
    drawFootballBackground(ctx, width, height, 'ALL FIXTURES & RESULTS SUMMARY', state.name);

    const matches = state.matches;
    const startY = 240;
    const itemH = 64;
    const tableW = width - 120;
    const tableX = 60;

    matches.slice(0, 16).forEach((m, idx) => {
      const y = startY + idx * (itemH + 8);
      const homeTeam = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
      const awayTeam = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;

      ctx.fillStyle = 'rgba(15, 33, 23, 0.8)';
      ctx.beginPath();
      ctx.roundRect(tableX, y, tableW, itemH, 8);
      ctx.fill();

      // Round label
      ctx.textAlign = 'left';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 15px "Outfit", sans-serif';
      ctx.fillText(m.roundName || `R${m.round}`, tableX + 20, y + 38);

      // Teams and Score
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 20px "Outfit", sans-serif';
      ctx.fillText(homeTeam?.name || 'TBD', width / 2 - 60, y + 38);

      ctx.textAlign = 'center';
      if (m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
        ctx.fillStyle = '#facc15';
        ctx.font = '900 24px "Rajdhani", sans-serif';
        ctx.fillText(`${m.homeScore} - ${m.awayScore}`, width / 2, y + 38);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '700 18px "Rajdhani", sans-serif';
        ctx.fillText('vs', width / 2, y + 38);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 20px "Outfit", sans-serif';
      ctx.fillText(awayTeam?.name || 'TBD', width / 2 + 60, y + 38);
    });
  }
}

/**
 * Download canvas as PNG
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Share poster via Web Share API or copy image to clipboard
 */
export async function shareCanvasPoster(canvas: HTMLCanvasElement, title: string): Promise<boolean> {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }

      const file = new File([blob], `${title.replace(/[^a-z0-9]/gi, '_')}.png`, { type: 'image/png' });

      // Check if navigator.canShare and files are supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: title,
            text: `Tournament update: ${title}`,
            files: [file],
          });
          resolve(true);
          return;
        } catch (err) {
          // Fallback if user cancelled or error
          console.warn('Share cancelled or not completed:', err);
        }
      }

      // Fallback: download automatically
      downloadCanvasAsPng(canvas, `${title.replace(/[^a-z0-9]/gi, '_')}.png`);
      resolve(true);
    }, 'image/png');
  });
}
