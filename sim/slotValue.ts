// Measures which of the 10 draft slots produces the strongest roster, using
// the SAME pickForCpuTeam logic for every team (including "the user's" slot)
// so results reflect this app's actual CPU behavior and player pool, not a
// generic draft-theory answer. Every team plays by identical rules; the only
// difference between slots is draft position itself (who's left when your
// turn comes around). Run with:
//   npx esbuild sim/slotValue.ts --bundle --platform=node --format=cjs --outfile=/tmp/slotValue.cjs
//   node /tmp/slotValue.cjs 1000

import { players } from '../src/data/players';
import { computeTwoQbRankings } from '../src/data/twoQbAdjustment';
import { pickForCpuTeam } from '../src/draft/cpuLogic';
import { teamIndexForPick } from '../src/draft/snakeOrder';
import { assignSlotForPlayer, countByPosition } from '../src/draft/rosterLogic';
import { createEmptyRoster, TOTAL_PICKS, TOTAL_TEAMS, STARTING_SLOTS } from '../src/types';
import type { RankedPlayer, TeamState, Roster } from '../src/types';

// Value per player: higher is better, mirrors the score scale cpuLogic.ts
// itself uses internally (1000 - rank), so "roster value" numbers are
// directly comparable to that scale.
function playerValue(p: RankedPlayer): number {
  return 1000 - p.twoQbRank;
}

function rosterValue(roster: Roster, slots: readonly string[]): number {
  let total = 0;
  for (const slot of slots) {
    const p = (roster as any)[slot] as RankedPlayer | null;
    if (p) total += playerValue(p);
  }
  return total;
}

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
    if (!chosen) continue;
    const slot = assignSlotForPlayer(team.roster, chosen);
    team.roster[slot] = chosen;
    available = available.filter((p) => p.id !== chosen.id);
  }

  return teams;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function stddev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function main() {
  const N = parseInt(process.argv[2] ?? '1000', 10);

  // Indexed by draft slot (0-9, i.e. slot 1-10).
  const fullRosterValues: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  const starterValues: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  const finishRanks: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []); // 1 = best that draft
  const qb1Values: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  const rb1Values: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  const wr1Values: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);

  for (let d = 0; d < N; d++) {
    const teams = runOneDraft();

    const starterScoresThisDraft = teams.map((t) => rosterValue(t.roster, STARTING_SLOTS));
    // Rank teams 1 (best) to 10 (worst) by starter value for this draft.
    const order = starterScoresThisDraft
      .map((v, i) => ({ v, i }))
      .sort((a, b) => b.v - a.v);
    const rankByTeam = new Array(TOTAL_TEAMS);
    order.forEach((entry, rankIdx) => {
      rankByTeam[entry.i] = rankIdx + 1;
    });

    for (let t = 0; t < TOTAL_TEAMS; t++) {
      fullRosterValues[t].push(rosterValue(teams[t].roster, Object.keys(teams[t].roster)));
      starterValues[t].push(starterScoresThisDraft[t]);
      finishRanks[t].push(rankByTeam[t]);
      const r: any = teams[t].roster;
      if (r.QB1) qb1Values[t].push(playerValue(r.QB1));
      if (r.RB1) rb1Values[t].push(playerValue(r.RB1));
      if (r.WR1) wr1Values[t].push(playerValue(r.WR1));
    }
  }

  console.log(`Simulated ${N} full 10-team drafts, all teams drafting with identical CPU logic.\n`);
  console.log(
    `Slot | Avg Starter Value | Avg Full Roster Value | Avg Finish Rank (1=best) | Avg QB1 Val | Avg RB1 Val | Avg WR1 Val`
  );
  console.log('-'.repeat(110));

  const summary: { slot: number; starterMean: number; rankMean: number }[] = [];

  for (let t = 0; t < TOTAL_TEAMS; t++) {
    const slot = t + 1;
    const sMean = mean(starterValues[t]);
    const sStd = stddev(starterValues[t]);
    const fMean = mean(fullRosterValues[t]);
    const rMean = mean(finishRanks[t]);
    const qbMean = mean(qb1Values[t]);
    const rbMean = mean(rb1Values[t]);
    const wrMean = mean(wr1Values[t]);
    summary.push({ slot, starterMean: sMean, rankMean: rMean });
    console.log(
      `${String(slot).padStart(4)} | ${sMean.toFixed(1).padStart(18)} (±${sStd.toFixed(1)}) | ${fMean
        .toFixed(1)
        .padStart(10)} | ${rMean.toFixed(2).padStart(10)} | ${qbMean.toFixed(1).padStart(11)} | ${rbMean
        .toFixed(1)
        .padStart(11)} | ${wrMean.toFixed(1).padStart(11)}`
    );
  }

  console.log('\nRanked by average starter value (best slot first):');
  summary
    .slice()
    .sort((a, b) => b.starterMean - a.starterMean)
    .forEach((s, i) => {
      console.log(`  ${i + 1}. Slot ${s.slot} — avg starter value ${s.starterMean.toFixed(1)}, avg finish rank ${s.rankMean.toFixed(2)}`);
    });
}

main();
