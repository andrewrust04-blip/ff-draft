// =============================================================================
// CPU DRAFTING LOGIC
// =============================================================================
// Keeps CPU behavior simple, transparent, and easy to improve later. Every CPU
// pick is chosen by scoring each available player and taking the highest
// score, with a hard rule layer on top to enforce roster-building sanity
// (never more than 3 QBs, fill starting needs, etc).
//
//   CPU Score = 2-QB Ranking Value
//             + Starting Position Need
//             + Quarterback Scarcity
//             + Small Random Adjustment
// =============================================================================

import type { Position, RankedPlayer, Roster } from '../types';
import { countByPosition, isPositionEligible } from './rosterLogic';

const TARGET_QBS = 2;

/**
 * Players remaining in the pool who are QBs - used for scarcity signal.
 *
 * The 2-QB rank already moves QBs up the board by tier, so this only needs
 * to add a *small* nudge once the position is genuinely thinning out - it
 * shouldn't be strong enough to override what the rankings already say.
 */
function qbScarcityBonus(availableQbCount: number): number {
  const scarcity = Math.max(0, 15 - availableQbCount); // only matters under ~15 left
  return scarcity * 0.5;
}

/**
 * Small tie-breaking nudge toward filling starting need. Kept deliberately
 * modest relative to typical twoQbRank gaps between consecutive picks, so it
 * breaks ties among similarly-ranked players instead of overriding the
 * ranking outright (that was causing an artificial QB run every draft,
 * since the ranking's QB tiers already account for 2-QB value).
 */
function startingNeedBonus(roster: Roster, position: Position): number {
  const counts = countByPosition(roster);
  switch (position) {
    case 'QB':
      if (counts.QB < TARGET_QBS) return 8;
      return 0;
    case 'RB':
      if (counts.RB < 2) return 6;
      return 0;
    case 'WR':
      if (counts.WR < 2) return 6;
      return 0;
    case 'TE':
      if (counts.TE < 1) return 5;
      return 0;
  }
}

/**
 * Scores a single player for a given roster. `randomize` adds a small jitter
 * so repeated CPU drafts don't all play out identically; the user-facing
 * "suggested pick" leaves it off so the suggestion doesn't flicker between
 * renders.
 */
function scorePlayer(
  player: RankedPlayer,
  roster: Roster,
  availableQbCount: number,
  randomize: boolean
): number {
  // Lower twoQbRank is better, so invert it into a positive "value" score.
  const rankingValue = 1000 - player.twoQbRank;
  const needBonus = startingNeedBonus(roster, player.position);
  const scarcity = player.position === 'QB' ? qbScarcityBonus(availableQbCount) : 0;
  const randomAdjustment = randomize ? Math.random() * 8 : 0;
  return rankingValue + needBonus + scarcity + randomAdjustment;
}

export interface CpuPickContext {
  availablePlayers: RankedPlayer[];
  roster: Roster;
}

function bestEligiblePlayer(
  context: CpuPickContext,
  randomize: boolean
): RankedPlayer | null {
  const { availablePlayers, roster } = context;
  const availableQbCount = availablePlayers.filter((p) => p.position === 'QB').length;

  let bestPlayer: RankedPlayer | null = null;
  let bestScore = -Infinity;

  for (const player of availablePlayers) {
    if (!isPositionEligible(roster, player.position)) continue;

    const score = scorePlayer(player, roster, availableQbCount, randomize);
    if (score > bestScore) {
      bestScore = score;
      bestPlayer = player;
    }
  }

  return bestPlayer;
}

/**
 * Picks the best available player for a CPU team. Returns null only if there
 * are truly no eligible players left (shouldn't happen in a normal draft).
 */
export function pickForCpuTeam(context: CpuPickContext): RankedPlayer | null {
  return bestEligiblePlayer(context, true);
}

/**
 * Same scoring model as the CPU, but deterministic (no random jitter) -
 * used to power the "suggested pick" hint shown to the user based on their
 * own roster's positional needs.
 */
export function suggestBestPick(context: CpuPickContext): RankedPlayer | null {
  return bestEligiblePlayer(context, false);
}
