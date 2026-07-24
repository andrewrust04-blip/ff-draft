// Decides which roster slot a newly-drafted player goes into: fills the
// matching open starting slot(s) first, then falls back to the next open
// bench slot. Used both for live picks and to recompute state after undo.

import type { Position, RankedPlayer, Roster, RosterSlot } from '../types';
import { BENCH_SLOTS } from '../types';

// FLEX is eligible for RB/WR/TE and is checked last, after each position's
// own dedicated slots, so it only fills once a player has nowhere else to
// start. Since 'FLEX' is the same roster key for all three positions, the
// first of them to hit an open FLEX claims it — later ones fall through to
// bench, same as any other slot contention.
const STARTING_SLOTS_BY_POSITION: Record<Position, RosterSlot[]> = {
  QB: ['QB1', 'QB2'],
  RB: ['RB1', 'RB2', 'FLEX'],
  WR: ['WR1', 'WR2', 'FLEX'],
  TE: ['TE', 'FLEX'],
};

/**
 * Returns the roster slot a player should be placed in, given the roster's
 * current state. Does NOT mutate the roster; caller applies the result.
 */
export function assignSlotForPlayer(roster: Roster, player: RankedPlayer): RosterSlot {
  const candidateStartingSlots = STARTING_SLOTS_BY_POSITION[player.position];
  for (const slot of candidateStartingSlots) {
    if (roster[slot] === null) {
      return slot;
    }
  }
  for (const slot of BENCH_SLOTS) {
    if (roster[slot] === null) {
      return slot;
    }
  }
  // Roster is full (shouldn't happen with 13 picks and 13 slots), but return
  // the last bench slot as a safe fallback rather than throwing mid-draft.
  return BENCH_SLOTS[BENCH_SLOTS.length - 1];
}

export function countByPosition(roster: Roster): Record<Position, number> {
  const counts: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const player of Object.values(roster)) {
    if (player) counts[player.position]++;
  }
  return counts;
}

export function isRosterFull(roster: Roster): boolean {
  return Object.values(roster).every((slot) => slot !== null);
}

/** No team - CPU or user - may roster more than this many QBs. */
export const MAX_QBS_PER_TEAM = 3;

/** Whether a player of this position is still allowed to join this roster. */
export function isPositionEligible(roster: Roster, position: Position): boolean {
  if (position === 'QB' && countByPosition(roster).QB >= MAX_QBS_PER_TEAM) return false;
  return true;
}
