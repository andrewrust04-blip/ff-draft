// =============================================================================
// CUSTOM 2-QB RANKING ADJUSTMENT
// =============================================================================
// This is the ONE file responsible for turning the raw player pool into a
// "2-QB Rank" appropriate for a 2-QB starting league.
//
// How it works:
//   1. RB / WR / TE players use their original ESPN rank as their merge
//      score, so their relative order to each other never changes.
//   2. QBs use their `espnRank` field too - but remember, per players.ts,
//      that field was already overwritten for all 40 QBs to reflect the
//      dedicated 2-QB-relevant QB rankings source (not ESPN's own QB order).
//      So a QB's espnRank IS the correct 2-QB-adjusted value already; no
//      further formula is applied on top of it.
//   3. Every player (QB and non-QB) is sorted by that single score ascending,
//      and the result is numbered 1..N to produce the final "2-QB Rank".
//      Skill players fall naturally into the gaps left as QBs move up the
//      board, since RB/WR/TE numbers are untouched.
//
// History: an earlier version of this file re-derived a QB's target score
// from a tier-interpolation formula (QB position rank -> target overall-rank
// range), ignoring the QB's actual espnRank for position ranks 1-24. That
// caused drift between the QB rankings source and what actually showed up
// in the draft (e.g. Drake Maye's real rank of 3 was overridden to ~5). Since
// every QB already has a correct, current espnRank baked in, that formula
// was retired - it was solving a problem that no longer exists.
// =============================================================================

import type { Player, RankedPlayer } from '../types';

/**
 * Computes the 2-QB Rank for every player. Original ESPN rank is preserved
 * on the returned objects (espnRank field is untouched); twoQbRank is added.
 *
 * Every player - QB or not - is merged directly by espnRank. This is safe
 * because QBs' espnRank values were already overwritten at the data-entry
 * level (src/data/players.ts) to reflect the correct 2-QB-adjusted order.
 */
export function computeTwoQbRankings(allPlayers: Player[]): RankedPlayer[] {
  const sorted = [...allPlayers].sort((a, b) => {
    if (a.espnRank !== b.espnRank) return a.espnRank - b.espnRank;
    // Stable, deterministic tiebreaker for any duplicate rank values.
    return a.name.localeCompare(b.name);
  });

  return sorted.map((player, index) => ({
    ...player,
    twoQbRank: index + 1,
  }));
}
