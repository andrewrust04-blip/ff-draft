// =============================================================================
// CUSTOM 2-QB RANKING ADJUSTMENT
// =============================================================================
// This is the ONE file responsible for turning ESPN's single-QB rankings into
// a "2-QB Rank" appropriate for a 2-QB starting league. Edit the QB_TIERS table
// below to change how aggressively quarterbacks get moved up the board.
//
// How it works:
//   1. RB / WR / TE players keep a "target score" equal to their original ESPN
//      rank, so their relative order to each other never changes.
//   2. QBs get a new "target score" based on which tier their ESPN position
//      rank (QB1, QB2, QB3, ...) falls into. Each tier maps to a target overall
//      rank *range*; a QB's position within the tier is linearly interpolated
//      into that range.
//   3. Every player (QB and non-QB) is sorted by target score ascending, with
//      original ESPN rank as a tiebreaker, and the result is numbered 1..N to
//      produce the final "2-QB Rank".
//
// This keeps the whole system transparent and easy to hand-tune: want elite
// QBs to go even earlier? Lower QB_TIERS[0]'s target range. Want backup QBs to
// stay buried? Reduce the backupBoostFactor.
// =============================================================================

import type { Player, RankedPlayer } from '../types';

interface QbTier {
  label: string;
  /** Inclusive range of ESPN QB position rank (e.g. QB1-QB3) that falls in this tier. */
  minPosRank: number;
  maxPosRank: number;
  /** Target overall-rank range this tier's QBs get interpolated into. */
  targetMin: number;
  targetMax: number;
}

// Elite QBs -> Round 1. Strong QB1s -> Rounds 1-3. Mid starters -> Rounds 3-6.
// Lower starters -> still moved well above their ESPN rank. Backups handled
// separately below with a smaller, proportional boost instead of a hard tier.
const QB_TIERS: QbTier[] = [
  { label: 'Elite QB1s', minPosRank: 1, maxPosRank: 3, targetMin: 1, targetMax: 9 },
  { label: 'Strong QB1s', minPosRank: 4, maxPosRank: 8, targetMin: 10, targetMax: 30 },
  { label: 'Mid starting QBs', minPosRank: 9, maxPosRank: 15, targetMin: 31, targetMax: 55 },
  { label: 'Lower NFL starters', minPosRank: 16, maxPosRank: 24, targetMin: 56, targetMax: 95 },
];

// Backup / uncertain QBs (position rank 25+) don't get a fixed tier. Instead
// they get a smaller, proportional bump: their target score is their original
// ESPN rank multiplied by this factor (< 1 moves them up, but only modestly).
const BACKUP_QB_BOOST_FACTOR = 0.75;
const BACKUP_QB_MIN_POS_RANK = 25;

function targetScoreForQb(player: Player): number {
  const posRank = player.espnPositionRank;

  if (posRank >= BACKUP_QB_MIN_POS_RANK) {
    return player.espnRank * BACKUP_QB_BOOST_FACTOR;
  }

  const tier = QB_TIERS.find((t) => posRank >= t.minPosRank && posRank <= t.maxPosRank);
  if (!tier) {
    // Shouldn't happen given the tiers above cover 1-24, but fall back safely.
    return player.espnRank;
  }

  if (tier.maxPosRank === tier.minPosRank) {
    return tier.targetMin;
  }

  const fraction = (posRank - tier.minPosRank) / (tier.maxPosRank - tier.minPosRank);
  return tier.targetMin + fraction * (tier.targetMax - tier.targetMin);
}

/**
 * Computes the 2-QB Rank for every player. Original ESPN rank is preserved
 * on the returned objects (espnRank field is untouched); twoQbRank is added.
 */
export function computeTwoQbRankings(allPlayers: Player[]): RankedPlayer[] {
  const scored = allPlayers.map((player) => ({
    player,
    score: player.position === 'QB' ? targetScoreForQb(player) : player.espnRank,
  }));

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.player.espnRank - b.player.espnRank;
  });

  return scored.map((entry, index) => ({
    ...entry.player,
    twoQbRank: index + 1,
  }));
}
