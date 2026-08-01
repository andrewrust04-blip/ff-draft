import { players } from '../src/data/players';
import { computeTwoQbRankings } from '../src/data/twoQbAdjustment';
import { pickForCpuTeam } from '../src/draft/cpuLogic';
import { teamIndexForPick } from '../src/draft/snakeOrder';
import { assignSlotForPlayer } from '../src/draft/rosterLogic';
import { createEmptyRoster, TOTAL_TEAMS } from '../src/types';
import type { RankedPlayer, TeamState } from '../src/types';

function main() {
  const N = parseInt(process.argv[2] ?? '2000', 10);
  const baseRanked = computeTwoQbRankings(players);

  const firstPickCounts: Record<string, number> = {};
  const first3AllTrio = { yes: 0, no: 0 };
  const violations: string[] = [];

  for (let d = 0; d < N; d++) {
    let available: RankedPlayer[] = baseRanked.slice();
    const teams: TeamState[] = Array.from({ length: TOTAL_TEAMS }, (_, i) => ({
      index: i,
      name: `Team ${i + 1}`,
      roster: createEmptyRoster(),
      isUser: false,
    }));

    const first3Names: string[] = [];
    for (let pick = 1; pick <= 3; pick++) {
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
      first3Names.push(chosen.name);
      const slot = assignSlotForPlayer(team.roster, chosen);
      team.roster[slot] = chosen;
      available = available.filter((p) => p.id !== chosen.id);
    }

    firstPickCounts[first3Names[0]] = (firstPickCounts[first3Names[0]] ?? 0) + 1;

    const trio = new Set(['Josh Allen', 'Jahmyr Gibbs', 'Bijan Robinson']);
    const allTrio = first3Names.every((n) => trio.has(n)) && new Set(first3Names).size === 3;
    if (allTrio) first3AllTrio.yes++;
    else {
      first3AllTrio.no++;
      if (violations.length < 5) violations.push(first3Names.join(', '));
    }
  }

  console.log(`Simulated ${N} drafts.\n`);
  console.log('Pick #1 distribution (who got taken first overall):');
  Object.entries(firstPickCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => console.log(`  ${name}: ${count} (${((100 * count) / N).toFixed(1)}%)`));

  console.log(`\nAll of first 3 picks were exactly {Allen, Gibbs, Bijan} in some order: ${first3AllTrio.yes} (${((100 * first3AllTrio.yes) / N).toFixed(2)}%)`);
  console.log(`Violations: ${first3AllTrio.no}`);
  if (violations.length) {
    console.log('Sample violations:');
    violations.forEach((v) => console.log('  ', v));
  }
}

main();
