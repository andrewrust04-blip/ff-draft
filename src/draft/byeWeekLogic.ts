// Flags when too many rostered players share the same bye week - a real
// planning problem in a 2-QB league (2 empty starting slots is a lot worse
// than 1-QB leagues where you can usually stream a waiver QB). bye === 0
// means "unknown/free agent" (see Player.bye) and is always excluded.

import type { Roster, RankedPlayer } from '../types';

/** 3+ players sharing a bye week is the threshold that starts to actually hurt a lineup. */
export const BYE_STACK_THRESHOLD = 3;

/** Week -> count of rostered players on that bye, excluding week 0 (unknown). */
export function countByeWeeks(roster: Roster): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const player of Object.values(roster)) {
    if (!player || player.bye === 0) continue;
    counts[player.bye] = (counts[player.bye] ?? 0) + 1;
  }
  return counts;
}

/** Only the weeks that meet/exceed the stack threshold, sorted ascending by week. */
export function getByeStackWarnings(roster: Roster): { week: number; count: number }[] {
  const counts = countByeWeeks(roster);
  return Object.entries(counts)
    .map(([week, count]) => ({ week: Number(week), count }))
    .filter((w) => w.count >= BYE_STACK_THRESHOLD)
    .sort((a, b) => a.week - b.week);
}

/**
 * How many rostered players (before adding this one) already share this
 * candidate's bye week. Used to flag "drafting this player would make N on
 * week W" in the Available Players list before the user commits to the pick.
 */
export function currentCountForCandidateBye(roster: Roster, candidate: RankedPlayer): number {
  if (candidate.bye === 0) return 0;
  return countByeWeeks(roster)[candidate.bye] ?? 0;
}
