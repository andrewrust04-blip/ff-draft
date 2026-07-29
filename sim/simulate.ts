import { players } from '../src/data/players';
import { computeTwoQbRankings } from '../src/data/twoQbAdjustment';
import { pickForCpuTeam } from '../src/draft/cpuLogic';
import { teamIndexForPick, roundForPick } from '../src/draft/snakeOrder';
import { assignSlotForPlayer, countByPosition } from '../src/draft/rosterLogic';
import { createEmptyRoster, TOTAL_PICKS, TOTAL_TEAMS } from '../src/types';
import type { RankedPlayer, TeamState } from '../src/types';

function runOneDraft(): TeamState[] {
  const allRanked = computeTwoQbRankings(players);
  let available: RankedPlayer[] = allRanked.slice();

  const teams: TeamState[] = Array.from({ length: TOTAL_TEAMS }, (_, i) => ({
    index: i,
    name: `Team ${i + 1}`,
    roster: createEmptyRoster(),
    isUser: false,
  }));

  for (let pick = 1; pick <= TOTAL_PICKS; pick++) {
    const teamIndex = teamIndexForPick(pick);
    const team = teams[teamIndex];
    const chosen = pickForCpuTeam({
      availablePlayers: available,
      roster: team.roster,
      teams,
      teamIndex,
      currentPick: pick,
    });
    if (!chosen) {
      console.error(`No eligible player at pick ${pick} for team ${teamIndex}`);
      continue;
    }
    const slot = assignSlotForPlayer(team.roster, chosen);
    team.roster[slot] = chosen;
    available = available.filter((p) => p.id !== chosen.id);
  }

  return teams;
}

function analyzeDraft(teams: TeamState[], stats: any) {
  for (const team of teams) {
    const counts = countByPosition(team.roster);
    if (counts.QB !== 3) stats.wrongQbCount++;
    if (counts.RB < 2) stats.missingRb++;
    if (counts.WR < 2) stats.missingWr++;
    if (counts.TE < 1) stats.missingTe++;

    // Find pick numbers (by round) for this team's players in draft order.
    const picks: { round: number; position: string }[] = [];
    for (const slot of Object.keys(team.roster) as (keyof typeof team.roster)[]) {
      const p = team.roster[slot];
      if (p) picks.push({ round: -1, position: p.position }); // round tracked separately below
    }

    // Track QB count reached by round using the recorded roster only isn't
    // enough (no round metadata on Roster). Re-derive from allPicksLog instead.
  }
}

// -----------------------------------------------------------------------
// A version that also logs pick-by-pick (round, position) per team so we
// can check "3 QBs by round N" and "3+ TEs" style stats precisely.
// -----------------------------------------------------------------------

interface PickLog {
  pick: number;
  round: number;
  teamIndex: number;
  position: string;
}

function runOneDraftWithLog(): { teams: TeamState[]; log: PickLog[] } {
  const allRanked = computeTwoQbRankings(players);
  let available: RankedPlayer[] = allRanked.slice();

  const teams: TeamState[] = Array.from({ length: TOTAL_TEAMS }, (_, i) => ({
    index: i,
    name: `Team ${i + 1}`,
    roster: createEmptyRoster(),
    isUser: false,
  }));

  const log: PickLog[] = [];

  for (let pick = 1; pick <= TOTAL_PICKS; pick++) {
    const teamIndex = teamIndexForPick(pick);
    const round = roundForPick(pick);
    const team = teams[teamIndex];
    const chosen = pickForCpuTeam({
      availablePlayers: available,
      roster: team.roster,
      teams,
      teamIndex,
      currentPick: pick,
    });
    if (!chosen) {
      console.error(`No eligible player at pick ${pick} for team ${teamIndex}`);
      continue;
    }
    const slot = assignSlotForPlayer(team.roster, chosen);
    team.roster[slot] = chosen;
    available = available.filter((p) => p.id !== chosen.id);
    log.push({ pick, round, teamIndex, position: chosen.position });
  }

  return { teams, log };
}

function debugSecondTePicks(count: number) {
  let logged = 0;
  for (let d = 0; d < count && logged < 40; d++) {
    const allRanked = computeTwoQbRankings(players);
    let available: RankedPlayer[] = allRanked.slice();
    const teams: TeamState[] = Array.from({ length: TOTAL_TEAMS }, (_, i) => ({
      index: i,
      name: `Team ${i + 1}`,
      roster: createEmptyRoster(),
      isUser: false,
    }));

    for (let pick = 1; pick <= TOTAL_PICKS && logged < 40; pick++) {
      const teamIndex = teamIndexForPick(pick);
      const round = roundForPick(pick);
      const team = teams[teamIndex];
      const teBefore = countByPosition(team.roster).TE;
      const chosen = pickForCpuTeam({
        availablePlayers: available,
        roster: team.roster,
        teams,
        teamIndex,
        currentPick: pick,
      });
      if (!chosen) continue;
      if (chosen.position === 'TE' && teBefore >= 1) {
        const bestRb = available.filter((p) => p.position === 'RB').sort((a, b) => a.twoQbRank - b.twoQbRank)[0];
        const bestWr = available.filter((p) => p.position === 'WR').sort((a, b) => a.twoQbRank - b.twoQbRank)[0];
        console.log(
          `draft ${d} pick ${pick} round ${round} team ${teamIndex}: took TE#${teBefore + 1} ` +
          `${chosen.name} (rank ${chosen.twoQbRank}) | best avail RB rank ${bestRb?.twoQbRank} | best avail WR rank ${bestWr?.twoQbRank}`
        );
        logged++;
      }
      const slot = assignSlotForPlayer(team.roster, chosen);
      team.roster[slot] = chosen;
      available = available.filter((p) => p.id !== chosen.id);
    }
  }
}

function main() {
  if (process.argv[2] === 'debug-te') {
    debugSecondTePicks(50);
    return;
  }
  const N = parseInt(process.argv[2] ?? '300', 10);

  let wrongQbCount = 0;
  let missingRb = 0;
  let missingWr = 0;
  let missingTe = 0;

  let teamsWith3QbByRound4 = 0;
  let teamsWith3QbByRound5 = 0;
  let teamsWith3QbByRound6 = 0;
  let teamsWith3QbByRound7 = 0;
  let teamsWith3PlusConsecutiveTe = 0;
  let teamsWith2PlusTe = 0;
  let teamsWith3PlusTe = 0;

  const totalTeams = N * TOTAL_TEAMS;

  for (let d = 0; d < N; d++) {
    const { teams, log } = runOneDraftWithLog();

    for (const team of teams) {
      const counts = countByPosition(team.roster);
      if (counts.QB !== 3) wrongQbCount++;
      if (counts.RB < 2) missingRb++;
      if (counts.WR < 2) missingWr++;
      if (counts.TE < 1) missingTe++;
      if (counts.TE >= 2) teamsWith2PlusTe++;
      if (counts.TE >= 3) teamsWith3PlusTe++;
    }

    // Per-team pick sequences in draft order.
    const perTeamPicks: Record<number, PickLog[]> = {};
    for (const entry of log) {
      (perTeamPicks[entry.teamIndex] ??= []).push(entry);
    }

    for (let t = 0; t < TOTAL_TEAMS; t++) {
      const picks = perTeamPicks[t];
      // QB count reached by round X (based on this team's OWN pick number,
      // i.e. their Nth pick, not overall round - matches "3 QBs in their
      // first N picks" framing from the README/prompt).
      let qbCount = 0;
      let qbCountByOwnPickRound: number[] = []; // qbCountByOwnPickRound[i] = qb count after team's (i+1)th pick
      for (const p of picks) {
        if (p.position === 'QB') qbCount++;
        qbCountByOwnPickRound.push(qbCount);
      }
      if (qbCountByOwnPickRound[3] >= 3) teamsWith3QbByRound4++; // after their 4th pick
      if (qbCountByOwnPickRound[4] >= 3) teamsWith3QbByRound5++; // after their 5th pick
      if (qbCountByOwnPickRound[5] >= 3) teamsWith3QbByRound6++; // after their 6th pick
      if (qbCountByOwnPickRound[6] >= 3) teamsWith3QbByRound7++; // after their 7th pick

      // 3+ consecutive TE picks anywhere in this team's own pick sequence.
      let consecutiveTe = 0;
      let maxConsecutiveTe = 0;
      for (const p of picks) {
        if (p.position === 'TE') {
          consecutiveTe++;
          maxConsecutiveTe = Math.max(maxConsecutiveTe, consecutiveTe);
        } else {
          consecutiveTe = 0;
        }
      }
      if (maxConsecutiveTe >= 3) teamsWith3PlusConsecutiveTe++;
    }
  }

  console.log(`Simulated ${N} full drafts (${totalTeams} team-rosters)\n`);
  console.log(`Roster integrity:`);
  console.log(`  Teams NOT finishing with exactly 3 QB: ${wrongQbCount} (${(100 * wrongQbCount / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams finishing with <2 RB: ${missingRb} (${(100 * missingRb / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams finishing with <2 WR: ${missingWr} (${(100 * missingWr / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams finishing with <1 TE: ${missingTe} (${(100 * missingTe / totalTeams).toFixed(2)}%)`);
  console.log();
  console.log(`QB pacing (team's OWN pick sequence, not overall round):`);
  console.log(`  Teams with 3 QBs within their first 4 picks: ${teamsWith3QbByRound4} (${(100 * teamsWith3QbByRound4 / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams with 3 QBs within their first 5 picks: ${teamsWith3QbByRound5} (${(100 * teamsWith3QbByRound5 / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams with 3 QBs within their first 6 picks: ${teamsWith3QbByRound6} (${(100 * teamsWith3QbByRound6 / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams with 3 QBs within their first 7 picks: ${teamsWith3QbByRound7} (${(100 * teamsWith3QbByRound7 / totalTeams).toFixed(2)}%)`);
  console.log();
  console.log(`TE stacking:`);
  console.log(`  Teams with 2+ TE total: ${teamsWith2PlusTe} (${(100 * teamsWith2PlusTe / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams with 3+ TE total: ${teamsWith3PlusTe} (${(100 * teamsWith3PlusTe / totalTeams).toFixed(2)}%)`);
  console.log(`  Teams with 3+ CONSECUTIVE TE picks: ${teamsWith3PlusConsecutiveTe} (${(100 * teamsWith3PlusConsecutiveTe / totalTeams).toFixed(2)}%)`);
}

main();
