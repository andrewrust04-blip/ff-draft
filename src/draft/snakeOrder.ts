// Snake draft order helpers. Round 1 goes 0..9, round 2 reverses 9..0, etc.

import { TOTAL_TEAMS, TOTAL_PICKS } from '../types';

/** Returns the 0-based team index that is on the clock for a given 1-based overall pick. */
export function teamIndexForPick(overallPick: number): number {
  const zeroBasedPick = overallPick - 1;
  const round = Math.floor(zeroBasedPick / TOTAL_TEAMS);
  const slotInRound = zeroBasedPick % TOTAL_TEAMS;
  const isEvenRound = round % 2 === 1; // round is 0-based here; round index 1 (2nd round) reverses
  return isEvenRound ? TOTAL_TEAMS - 1 - slotInRound : slotInRound;
}

/** Returns the 1-based round number for a given 1-based overall pick. */
export function roundForPick(overallPick: number): number {
  return Math.floor((overallPick - 1) / TOTAL_TEAMS) + 1;
}

/** Precomputes the full 130-pick draft order as an array of team indices. */
export function buildFullDraftOrder(): number[] {
  const order: number[] = [];
  for (let pick = 1; pick <= TOTAL_PICKS; pick++) {
    order.push(teamIndexForPick(pick));
  }
  return order;
}

export function isDraftComplete(overallPick: number): boolean {
  return overallPick > TOTAL_PICKS;
}
