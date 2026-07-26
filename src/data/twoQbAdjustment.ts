// =============================================================================
// CUSTOM 2-QB RANKING ADJUSTMENT
// =============================================================================
// This is the ONE file responsible for turning the raw player pool into a
// "2-QB Rank" appropriate for a 2-QB starting league.
//
// How it works - QBs' espnRank values are RESERVED SLOTS in the final order,
// not just sort keys:
//   1. QBs are queued in ascending order of their (already-overridden)
//      espnRank - see players.ts, where all 40 QBs' espnRank/espnPositionRank
//      were set from the dedicated 2-QB-relevant QB rankings source.
//   2. RB/WR/TE players are queued separately, in ascending order of their
//      own (untouched) ESPN rank.
//   3. We walk final positions 1, 2, 3, ... one at a time. At each position,
//      if the next queued QB's espnRank is <= that position number, the QB
//      is placed there. Otherwise the next queued skill player is placed.
//   This means a QB's final twoQbRank always exactly equals its espnRank
//   (skill players never bump a QB later than its own number) - skill
//   players simply thread through whatever slots the QBs don't occupy, in
//   their own relative order.
//
// History: earlier versions of this file either ran QBs through a
// tier-interpolation formula, or did a plain value merge-sort with ties
// broken alphabetically. Both let skill players push a QB's final position
// later than the number that was actually assigned to it (e.g. Jalen Hurts'
// assigned rank of 25 was coming out as 33). The reserved-slot approach
// above guarantees that can't happen.
// =============================================================================

import type { Player, RankedPlayer } from '../types';

function byEspnRank(a: Player, b: Player): number {
  if (a.espnRank !== b.espnRank) return a.espnRank - b.espnRank;
  return a.name.localeCompare(b.name);
}

/**
 * Computes the 2-QB Rank for every player. Original ESPN rank is preserved
 * on the returned objects (espnRank field is untouched); twoQbRank is added.
 */
export function computeTwoQbRankings(allPlayers: Player[]): RankedPlayer[] {
  const qbQueue = allPlayers.filter((p) => p.position === 'QB').sort(byEspnRank);
  const skillQueue = allPlayers.filter((p) => p.position !== 'QB').sort(byEspnRank);

  const merged: Player[] = [];
  let qbIdx = 0;
  let skillIdx = 0;
  let position = 1;

  while (qbIdx < qbQueue.length || skillIdx < skillQueue.length) {
    const nextQb = qbQueue[qbIdx];
    const nextSkill = skillQueue[skillIdx];

    if (nextQb && nextQb.espnRank <= position) {
      merged.push(nextQb);
      qbIdx++;
    } else if (nextSkill) {
      merged.push(nextSkill);
      skillIdx++;
    } else if (nextQb) {
      // Only QBs left (their reserved slot exceeds the remaining count of
      // skill players) - append them in order.
      merged.push(nextQb);
      qbIdx++;
    }
    position++;
  }

  return merged.map((player, index) => ({
    ...player,
    twoQbRank: index + 1,
  }));
}
