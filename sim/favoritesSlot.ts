// For each of the 10 draft slots, simulates "my team" drafting greedily from
// a fixed favorites list (best-ranked favorite still available and
// position-eligible; falls back to normal best-value CPU logic only when no
// favorite qualifies), while the other 9 teams draft normally. Measures how
// many of the favorites actually land on the roster, per slot.
//
// Run with:
//   npx esbuild sim/favoritesSlot.ts --bundle --platform=node --format=cjs --outfile=/tmp/favSlot.cjs
//   node /tmp/favSlot.cjs 3000

import { players } from '../src/data/players';
import { computeTwoQbRankings } from '../src/data/twoQbAdjustment';
import { pickForCpuTeam } from '../src/draft/cpuLogic';
import { teamIndexForPick } from '../src/draft/snakeOrder';
import { assignSlotForPlayer, isPositionEligible } from '../src/draft/rosterLogic';
import { createEmptyRoster, TOTAL_PICKS, TOTAL_TEAMS } from '../src/types';
import type { RankedPlayer, TeamState, Roster } from '../src/types';

const FAVORITE_NAMES = [
  // QB
  'Josh Allen', 'Drake Maye', 'Caleb Williams', 'Justin Herbert', 'Trevor Lawrence',
  'Dak Prescott', 'Brock Purdy', 'Patrick Mahomes', 'Kyler Murray', 'Matthew Stafford', 'Sam Darnold',
  // RB
  'Bijan Robinson', 'Jahmyr Gibbs', 'Christian McCaffrey', 'James Cook III', 'Ashton Jeanty',
  'Kenneth Walker III', 'Derrick Henry', 'Chase Brown', 'Omarion Hampton', 'Javonte Williams',
  'Cam Skattebo', "D'Andre Swift", 'David Montgomery', 'Bhayshul Tuten', 'Jaylen Warren',
  'Rico Dowdle', 'Kyle Monangai', 'Blake Corum', 'Kenny Gainwell', 'Jonathon Brooks',
  // WR
  'Puka Nacua', "Ja'Marr Chase", 'Jaxon Smith-Njigba', 'Amon-Ra St. Brown', 'Justin Jefferson',
  'A.J. Brown', 'George Pickens', 'Rashee Rice', 'DeVonta Smith', 'Zay Flowers', 'Ladd McConkey',
  'Jaylen Waddle', 'Davante Adams', 'Malik Nabers', 'Luther Burden III', 'Mike Evans',
  'Christian Watson', 'Parker Washington', 'Courtland Sutton', 'Quentin Johnston', 'Josh Downs',
  'Jayden Reed', "Wan'Dale Robinson", 'Rashid Shaheed',
  // TE
  'Tucker Kraft', 'George Kittle', 'Dallas Goedert', 'Isaiah Likely',
];

// The most contested tier - top-15 favorites by 2QB rank - reported
// separately since these are the ones draft slot actually swings.
const ELITE_WATCH_COUNT = 15;

function runOneDraft(userSlotIndex: number, favoriteIds: Set<string>, baseRanked: RankedPlayer[]) {
  let available: RankedPlayer[] = baseRanked.slice();

  const teams: TeamState[] = Array.from({ length: TOTAL_TEAMS }, (_, i) => ({
    index: i,
    name: `Team ${i + 1}`,
    roster: createEmptyRoster(),
    isUser: i === userSlotIndex,
  }));

  for (let pick = 1; pick <= TOTAL_PICKS; pick++) {
    const teamIndex = teamIndexForPick(pick);
    const team = teams[teamIndex];

    let chosen: RankedPlayer | undefined;

    if (teamIndex === userSlotIndex) {
      const favoritesEligible = available
        .filter((p) => favoriteIds.has(p.id) && isPositionEligible(team.roster, p.position))
        .sort((a, b) => a.twoQbRank - b.twoQbRank);
      chosen = favoritesEligible[0] ?? pickForCpuTeam({
        availablePlayers: available,
        roster: team.roster,
        teams,
        teamIndex,
        currentPick: pick,
      }) ?? undefined;
    } else {
      chosen = pickForCpuTeam({
        availablePlayers: available,
        roster: team.roster,
        teams,
        teamIndex,
        currentPick: pick,
      }) ?? undefined;
    }

    if (!chosen) continue;
    const slot = assignSlotForPlayer(team.roster, chosen);
    team.roster[slot] = chosen;
    available = available.filter((p) => p.id !== chosen!.id);
  }

  return teams[userSlotIndex].roster;
}

function rosterPlayers(roster: Roster): RankedPlayer[] {
  return Object.values(roster).filter((p): p is RankedPlayer => p !== null);
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function main() {
  const N = parseInt(process.argv[2] ?? '2000', 10);

  const allRanked = computeTwoQbRankings(players);
  const byName = new Map(allRanked.map((p) => [p.name, p]));
  const favoritePlayers = FAVORITE_NAMES.map((n) => {
    const p = byName.get(n);
    if (!p) throw new Error(`Favorite not found in dataset: ${n}`);
    return p;
  }).sort((a, b) => a.twoQbRank - b.twoQbRank);
  const favoriteIds = new Set(favoritePlayers.map((p) => p.id));
  const eliteWatch = favoritePlayers.slice(0, ELITE_WATCH_COUNT);

  console.log(`Tracking ${favoritePlayers.length} favorite players across ${N} simulated drafts per slot.`);
  console.log(`\nMost contested tier (top ${ELITE_WATCH_COUNT} favorites by 2QB rank):`);
  eliteWatch.forEach((p) => console.log(`  rank ${String(p.twoQbRank).padStart(3)} - ${p.name} (${p.position})`));
  console.log();

  const totalCaught: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  const eliteCaught: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  // Per-player capture rate per slot, for the elite watch list only (to keep output readable).
  const eliteCaptureCount: number[][] = Array.from({ length: TOTAL_TEAMS }, () => eliteWatch.map(() => 0));

  for (let slot = 0; slot < TOTAL_TEAMS; slot++) {
    for (let d = 0; d < N; d++) {
      const roster = runOneDraft(slot, favoriteIds, allRanked);
      const got = rosterPlayers(roster).filter((p) => favoriteIds.has(p.id));
      totalCaught[slot].push(got.length);
      const gotIds = new Set(got.map((p) => p.id));
      let eliteCount = 0;
      eliteWatch.forEach((ep, i) => {
        if (gotIds.has(ep.id)) {
          eliteCount++;
          eliteCaptureCount[slot][i]++;
        }
      });
      eliteCaught[slot].push(eliteCount);
    }
  }

  console.log(`\nResults per slot (avg out of ${favoritePlayers.length} total favorites, ${ELITE_WATCH_COUNT} elite-tier favorites):\n`);
  console.log('Slot | Avg total favorites landed | Avg elite-tier favorites landed');
  console.log('-'.repeat(70));
  const summary: { slot: number; totalMean: number; eliteMean: number }[] = [];
  for (let s = 0; s < TOTAL_TEAMS; s++) {
    const totalMean = mean(totalCaught[s]);
    const eliteMean = mean(eliteCaught[s]);
    summary.push({ slot: s + 1, totalMean, eliteMean });
    console.log(`${String(s + 1).padStart(4)} | ${totalMean.toFixed(2).padStart(27)} | ${eliteMean.toFixed(2).padStart(32)}`);
  }

  console.log('\nRanked by avg elite-tier favorites landed (best slot first):');
  summary
    .slice()
    .sort((a, b) => b.eliteMean - a.eliteMean || b.totalMean - a.totalMean)
    .forEach((s, i) => console.log(`  ${i + 1}. Slot ${s.slot} — ${s.eliteMean.toFixed(2)} elite avg, ${s.totalMean.toFixed(2)} total avg`));

  console.log(`\nPer-player capture rate (% of drafts this player ended up on your roster), by slot:`);
  const header = 'Player'.padEnd(24) + Array.from({ length: TOTAL_TEAMS }, (_, i) => `S${i + 1}`.padStart(6)).join('');
  console.log(header);
  eliteWatch.forEach((p, i) => {
    const row = p.name.padEnd(24) + Array.from({ length: TOTAL_TEAMS }, (_, s) => {
      const pct = (100 * eliteCaptureCount[s][i]) / N;
      return `${pct.toFixed(0)}%`.padStart(6);
    }).join('');
    console.log(row);
  });
}

main();
