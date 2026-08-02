// Runs the "check my odds from this slot" simulation entirely off the main
// thread, using the exact same pickForCpuTeam logic the live draft uses (not
// a simplified stand-in), so results actually reflect this app's behavior.
//
// Strategy for "my team": at each of my turns, take the best-ranked favorite
// still available and position-eligible; if none of my favorites qualify,
// fall back to the same best-value CPU logic everyone else uses. Every other
// team drafts normally the whole time - they don't know about your favorites
// list, same as real opponents wouldn't.

import { pickForCpuTeam } from '../draft/cpuLogic';
import { teamIndexForPick } from '../draft/snakeOrder';
import { assignSlotForPlayer, isPositionEligible } from '../draft/rosterLogic';
import { createEmptyRoster, TOTAL_PICKS, TOTAL_TEAMS } from '../types';
import type { RankedPlayer, Roster, TeamState } from '../types';

export interface OddsRequest {
  type: 'run';
  slotIndex: number; // 0-based
  allPlayers: RankedPlayer[];
  favoriteIds: string[];
  trials: number;
}

export interface OddsProgressMessage {
  type: 'progress';
  completed: number;
  total: number;
}

export interface OddsDoneMessage {
  type: 'done';
  trials: number;
  avgTotalFavorites: number;
  perPlayerCaptureRate: { id: string; name: string; rate: number }[];
}

function rosterPlayers(roster: Roster): RankedPlayer[] {
  const players: RankedPlayer[] = [];
  for (const key in roster) {
    const p = roster[key as keyof Roster];
    if (p) players.push(p);
  }
  return players;
}

function runOneDraft(slotIndex: number, favoriteIds: Set<string>, baseRanked: RankedPlayer[]): Roster {
  let available: RankedPlayer[] = baseRanked.slice();
  const teams: TeamState[] = Array.from({ length: TOTAL_TEAMS }, (_, i) => ({
    index: i,
    name: `Team ${i + 1}`,
    roster: createEmptyRoster(),
    isUser: i === slotIndex,
  }));

  for (let pick = 1; pick <= TOTAL_PICKS; pick++) {
    const teamIndex = teamIndexForPick(pick);
    const team = teams[teamIndex];

    let chosen: RankedPlayer | undefined;
    if (teamIndex === slotIndex) {
      const eligible = available
        .filter((p) => favoriteIds.has(p.id) && isPositionEligible(team.roster, p.position))
        .sort((a, b) => a.twoQbRank - b.twoQbRank);
      chosen =
        eligible[0] ??
        pickForCpuTeam({
          availablePlayers: available,
          roster: team.roster,
          teams,
          teamIndex,
          currentPick: pick,
        }) ??
        undefined;
    } else {
      chosen =
        pickForCpuTeam({
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

  return teams[slotIndex].roster;
}

self.onmessage = (e: MessageEvent<OddsRequest>) => {
  const { slotIndex, allPlayers, favoriteIds, trials } = e.data;
  const favSet = new Set(favoriteIds);
  const favPlayers = allPlayers
    .filter((p) => favSet.has(p.id))
    .sort((a, b) => a.twoQbRank - b.twoQbRank);

  const captureCounts = new Map<string, number>(favPlayers.map((p) => [p.id, 0]));
  let totalCaught = 0;

  const PROGRESS_EVERY = Math.max(1, Math.floor(trials / 20));

  for (let i = 0; i < trials; i++) {
    const roster = runOneDraft(slotIndex, favSet, allPlayers);
    const got = rosterPlayers(roster).filter((p) => favSet.has(p.id));
    totalCaught += got.length;
    for (const p of got) {
      captureCounts.set(p.id, (captureCounts.get(p.id) ?? 0) + 1);
    }
    if ((i + 1) % PROGRESS_EVERY === 0 || i === trials - 1) {
      const progress: OddsProgressMessage = { type: 'progress', completed: i + 1, total: trials };
      (self as unknown as Worker).postMessage(progress);
    }
  }

  const perPlayerCaptureRate = favPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    rate: (captureCounts.get(p.id) ?? 0) / trials,
  }));

  const done: OddsDoneMessage = {
    type: 'done',
    trials,
    avgTotalFavorites: totalCaught / trials,
    perPlayerCaptureRate,
  };
  (self as unknown as Worker).postMessage(done);
};
