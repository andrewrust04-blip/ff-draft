// Measures which draft slot gives the best chance of landing a specific
// wishlist of players. Strategy for "my" team: on each of my turns, if any
// wishlist player is still available AND fits an open roster need, take the
// best-ranked (lowest twoQbRank) one; otherwise fall back to the app's own
// best-value logic (suggestBestPick) to fill the pick normally. The 9 CPU
// opponents always draft with the real pickForCpuTeam logic - they don't
// know about your wishlist, they just take who they'd normally take, which
// is exactly the competition you're playing against for these players.
//
// Run with:
//   npx esbuild sim/wishlist.ts --bundle --platform=node --format=cjs --outfile=/tmp/wishlist.cjs
//   node /tmp/wishlist.cjs 2000

import { players } from '../src/data/players';
import { computeTwoQbRankings } from '../src/data/twoQbAdjustment';
import { pickForCpuTeam, suggestBestPick } from '../src/draft/cpuLogic';
import { teamIndexForPick } from '../src/draft/snakeOrder';
import { assignSlotForPlayer, isPositionEligible } from '../src/draft/rosterLogic';
import { createEmptyRoster, TOTAL_PICKS, TOTAL_TEAMS } from '../src/types';
import type { RankedPlayer, TeamState } from '../src/types';

const WISHLIST_NAMES = [
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

function runOneDraft(userSlot: number, wishlistIds: Set<string>) {
  const allRanked = computeTwoQbRankings(players);
  let available: RankedPlayer[] = allRanked.slice();

  const teams: TeamState[] = Array.from({ length: TOTAL_TEAMS }, (_, i) => ({
    index: i,
    name: `Team ${i + 1}`,
    roster: createEmptyRoster(),
    isUser: i === userSlot,
  }));

  const captured: RankedPlayer[] = [];

  for (let pick = 1; pick <= TOTAL_PICKS; pick++) {
    const teamIndex = teamIndexForPick(pick);
    const team = teams[teamIndex];

    let chosen: RankedPlayer | undefined;

    if (teamIndex === userSlot) {
      // Best-ranked available wishlist player that's positionally eligible.
      const wishlistCandidates = available
        .filter((p) => wishlistIds.has(p.id) && isPositionEligible(team.roster, p.position))
        .sort((a, b) => a.twoQbRank - b.twoQbRank);
      if (wishlistCandidates.length > 0) {
        chosen = wishlistCandidates[0];
      } else {
        chosen =
          suggestBestPick({ availablePlayers: available, roster: team.roster, teams, teamIndex, currentPick: pick }) ??
          undefined;
      }
    } else {
      chosen = pickForCpuTeam({ availablePlayers: available, roster: team.roster, teams, teamIndex, currentPick: pick }) ?? undefined;
    }

    if (!chosen) continue;
    const slot = assignSlotForPlayer(team.roster, chosen);
    team.roster[slot] = chosen;
    available = available.filter((p) => p.id !== chosen!.id);
    if (teamIndex === userSlot && wishlistIds.has(chosen.id)) {
      captured.push(chosen);
    }
  }

  return captured;
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

  const allRanked = computeTwoQbRankings(players);
  const wishlistPlayers = allRanked.filter((p) => WISHLIST_NAMES.includes(p.name));
  const wishlistIds = new Set(wishlistPlayers.map((p) => p.id));
  if (wishlistPlayers.length !== WISHLIST_NAMES.length) {
    console.error(`WARNING: matched ${wishlistPlayers.length} of ${WISHLIST_NAMES.length} names`);
  }

  const capturedCounts: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  const capturedValues: number[][] = Array.from({ length: TOTAL_TEAMS }, () => []);
  // Per-player capture count, indexed [slot][playerId]
  const perPlayerCaptures: Map<string, number>[] = Array.from({ length: TOTAL_TEAMS }, () => new Map());

  for (let slot = 0; slot < TOTAL_TEAMS; slot++) {
    for (let d = 0; d < N; d++) {
      const captured = runOneDraft(slot, wishlistIds);
      capturedCounts[slot].push(captured.length);
      capturedValues[slot].push(captured.reduce((sum, p) => sum + (1000 - p.twoQbRank), 0));
      for (const p of captured) {
        perPlayerCaptures[slot].set(p.id, (perPlayerCaptures[slot].get(p.id) ?? 0) + 1);
      }
    }
  }

  console.log(`Simulated ${N} drafts per slot (${WISHLIST_NAMES.length} players on the wishlist, 14 roster spots total).\n`);
  console.log(
    'Slot | Avg wishlist players captured (of 14 spots) | Avg captured value (rewards landing your HIGHER-ranked guys, not just any 14)'
  );
  console.log('-'.repeat(110));

  const summary = [];
  for (let slot = 0; slot < TOTAL_TEAMS; slot++) {
    const mCount = mean(capturedCounts[slot]);
    const mValue = mean(capturedValues[slot]);
    const sValue = stddev(capturedValues[slot]);
    const se = sValue / Math.sqrt(N);
    summary.push({ slot: slot + 1, mCount, mValue, se });
    console.log(`${String(slot + 1).padStart(4)} | ${mCount.toFixed(2).padStart(6)} | ${mValue.toFixed(1)} (SE ±${se.toFixed(1)})`);
  }

  console.log('\nRanked by captured VALUE (best slot first):');
  summary
    .slice()
    .sort((a, b) => b.mValue - a.mValue)
    .forEach((s, i) => console.log(`  ${i + 1}. Slot ${s.slot} — avg value ${s.mValue.toFixed(1)}, avg count ${s.mCount.toFixed(2)}`));

  // Per-player capture rate for the best and worst slot (by value), to see
  // which specific players are the contested ones and how slot affects them.
  const byValue = summary.slice().sort((a, b) => b.mValue - a.mValue);
  const best = byValue[0].slot - 1;
  const worst = byValue[byValue.length - 1].slot - 1;

  console.log(`\nPer-player capture rate, best slot (${best + 1}) vs worst slot (${worst + 1}):`);
  for (const p of wishlistPlayers.sort((a, b) => a.twoQbRank - b.twoQbRank)) {
    const bestRate = (100 * (perPlayerCaptures[best].get(p.id) ?? 0)) / N;
    const worstRate = (100 * (perPlayerCaptures[worst].get(p.id) ?? 0)) / N;
    console.log(
      `  ${p.name.padEnd(22)} (${p.position}, rank ${p.twoQbRank}) — slot ${best + 1}: ${bestRate.toFixed(0).padStart(3)}% | slot ${
        worst + 1
      }: ${worstRate.toFixed(0).padStart(3)}%`
    );
  }
}

main();
