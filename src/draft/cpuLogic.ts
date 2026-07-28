// =============================================================================
// CPU DRAFTING LOGIC
// =============================================================================
// Keeps CPU behavior simple, transparent, and easy to improve later. Every CPU
// pick is chosen by scoring each available player and taking the highest
// score, with a hard rule layer on top to enforce roster-building sanity
// (never more than 3 QBs, never finish a draft with an empty required slot).
//
//   CPU Score = 2-QB Ranking Value
//             + Tier-Cliff Value        (grab the last player before a drop-off)
//             + Starting Position Need  (scaled by round + safe-to-wait check)
//             + League-Wide Scarcity    (demand vs. remaining supply)
//             - Roster Surplus Penalty  (escalating cost for over-stacking one position)
//             + Small Random Adjustment
//
// On top of the score, two hard (non-negotiable) rules run before scoring:
//   1. isPositionEligible - a team can never draft a 4th QB.
//   2. endgameRequiredPositions - once a team is close enough to the end of
//      its own picks that it can no longer afford a "luxury" best-player-
//      available pick without risking an empty required slot, the eligible
//      pool is narrowed to ONLY positions still needed. This is what
//      guarantees every team finishes with 2 starting QBs + 1 backup, 2 RB,
//      2 WR, 1 TE, and a FLEX - no team should ever finish a draft with a
//      hole at a required position again.
// =============================================================================

import type { Position, RankedPlayer, Roster, TeamState } from '../types';
import { TOTAL_PICKS } from '../types';
import { roundForPick, teamIndexForPick } from './snakeOrder';
import { countByPosition, isPositionEligible } from './rosterLogic';

/**
 * Every team is expected to finish the draft with exactly this many QBs
 * (2 starters + 1 backup) - this matches how real 2-QB leagues actually
 * draft, and matches MAX_QBS_PER_TEAM in rosterLogic.ts so the "target" and
 * the hard cap agree with each other.
 */
export const TARGET_QBS = 3;

/** Minimum count of each position a team needs so no starting slot (QB1/QB2,
 * RB1/RB2, WR1/WR2, TE) is ever left empty. RB/WR/TE additionally share one
 * more player between them to fill FLEX - see computeUnmetNeeds. */
const REQUIRED_STARTERS: Record<Position, number> = {
  QB: TARGET_QBS,
  RB: 2,
  WR: 2,
  TE: 1,
};

/** Total RB+WR+TE needed to cover their own starting slots AND FLEX. */
const FLEX_POOL_MIN =
  REQUIRED_STARTERS.RB + REQUIRED_STARTERS.WR + REQUIRED_STARTERS.TE + 1;

interface PositionNeeds {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  /** 1 if the team still needs one more RB/WR/TE (in any combination) to
   * cover FLEX, otherwise 0. Not tied to a single position since any of the
   * three can fill it. */
  FLEX: number;
}

/** How many more of each position (and FLEX) a roster still needs to avoid
 * finishing with an empty required slot. */
function computeUnmetNeeds(roster: Roster): PositionNeeds {
  const counts = countByPosition(roster);
  const skillTotal = counts.RB + counts.WR + counts.TE;
  return {
    QB: Math.max(0, REQUIRED_STARTERS.QB - counts.QB),
    RB: Math.max(0, REQUIRED_STARTERS.RB - counts.RB),
    WR: Math.max(0, REQUIRED_STARTERS.WR - counts.WR),
    TE: Math.max(0, REQUIRED_STARTERS.TE - counts.TE),
    FLEX: skillTotal < FLEX_POOL_MIN ? 1 : 0,
  };
}

// -----------------------------------------------------------------------
// Endgame hard constraint pass
// -----------------------------------------------------------------------
// A soft bonus can still lose to a big enough ranking gap, which is how a
// team used to end up with zero TEs. This is the backstop: once a team is
// down to (or fewer than) as many picks as it has unmet required needs,
// every remaining pick MUST go toward one of those needs.

/** This team's own overall pick numbers from `currentPick` through the end
 * of the draft, in order. `schedule[0]` is always `currentPick` itself. */
function teamPickSchedule(teamIndex: number, currentPick: number): number[] {
  const schedule: number[] = [];
  for (let pick = currentPick; pick <= TOTAL_PICKS; pick++) {
    if (teamIndexForPick(pick) === teamIndex) schedule.push(pick);
  }
  return schedule;
}

/**
 * Returns the set of positions this pick is REQUIRED to come from, or null
 * if the team still has slack (can safely take a best-player-available pick
 * without jeopardizing its required slots). Positions with unmet FLEX need
 * (but no unmet dedicated need) are included too, since any of RB/WR/TE can
 * cover FLEX.
 */
function endgameRequiredPositions(
  roster: Roster,
  picksRemainingForTeam: number
): Set<Position> | null {
  const needs = computeUnmetNeeds(roster);
  const totalUnmet = needs.QB + needs.RB + needs.WR + needs.TE + needs.FLEX;
  if (totalUnmet === 0) return null; // fully on track, no forcing needed
  if (totalUnmet < picksRemainingForTeam) return null; // still room for a BPA pick

  const required = new Set<Position>();
  if (needs.QB > 0) required.add('QB');
  if (needs.RB > 0 || needs.FLEX > 0) required.add('RB');
  if (needs.WR > 0 || needs.FLEX > 0) required.add('WR');
  if (needs.TE > 0 || needs.FLEX > 0) required.add('TE');
  return required;
}

// -----------------------------------------------------------------------
// League-wide supply vs. demand scarcity
// -----------------------------------------------------------------------
// qbScarcityBonus used to only look at raw QB count remaining. This
// generalizes it to every position and compares it against actual demand
// (how many unmet needs are still out there across all 10 teams), which is
// what really predicts a position "running dry" - not just a low headcount.

function computeLeagueDemand(teams: TeamState[]): Record<Position, number> {
  const demand: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const team of teams) {
    const needs = computeUnmetNeeds(team.roster);
    // FLEX need isn't tied to one position - split it evenly across the
    // three positions that could fill it, as a soft demand signal.
    demand.QB += needs.QB;
    demand.RB += needs.RB + needs.FLEX / 3;
    demand.WR += needs.WR + needs.FLEX / 3;
    demand.TE += needs.TE + needs.FLEX / 3;
  }
  return demand;
}

function computeSupply(availablePlayers: RankedPlayer[]): Record<Position, number> {
  const supply: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const player of availablePlayers) supply[player.position]++;
  return supply;
}

/** Modest nudge (not a hard override - the endgame pass above handles the
 * hard guarantee) that grows as remaining demand catches up to remaining
 * supply at a position. */
function scarcityBonus(
  position: Position,
  demand: Record<Position, number>,
  supply: Record<Position, number>
): number {
  const ratio = demand[position] / Math.max(supply[position], 1);
  return Math.min(ratio, 2.5) * 5; // capped so it nudges rather than dominates
}

// -----------------------------------------------------------------------
// Tier-cliff value
// -----------------------------------------------------------------------
// Two players three ranks apart isn't always the same "value gap" - it
// matters whether there's a cliff right after one of them. This rewards
// taking the last player in a tier before the position's rank jumps, which
// is a big part of what makes real drafters feel sharp instead of just
// rank-following.

function computeCliffBonuses(availablePlayers: RankedPlayer[]): Map<string, number> {
  const byPosition: Record<Position, RankedPlayer[]> = { QB: [], RB: [], WR: [], TE: [] };
  for (const player of availablePlayers) byPosition[player.position].push(player);

  const CLIFF_CAP = 15; // one huge outlier gap shouldn't swamp everything else
  const cliffById = new Map<string, number>();

  for (const position of Object.keys(byPosition) as Position[]) {
    const ranked = byPosition[position].slice().sort((a, b) => a.twoQbRank - b.twoQbRank);
    for (let i = 0; i < ranked.length; i++) {
      const gapToNext =
        i + 1 < ranked.length ? ranked[i + 1].twoQbRank - ranked[i].twoQbRank : CLIFF_CAP;
      cliffById.set(ranked[i].id, Math.min(gapToNext, CLIFF_CAP));
    }
  }

  return cliffById;
}

// -----------------------------------------------------------------------
// Starting position need (round-scaled + pick-distance discounted)
// -----------------------------------------------------------------------
// Two upgrades over the old flat bonus:
//   - Round scaling: need barely matters in the first few rounds (best
//     player available should win), matters normally through the middle
//     rounds, and matters more in the final rounds when locking in roster
//     construction (like guaranteeing that 3rd QB / the TE slot) is what
//     an expert drafter is actually doing.
//   - Pick-distance discount: if a team has many picks before its next turn
//     AND the position isn't scarce, it's "safe to wait" - the need bonus
//     is discounted so BPA wins now. If supply is thin relative to that same
//     window, the discount is removed, since the position might not survive
//     that long.

function needRoundMultiplier(round: number): number {
  if (round <= 3) return 0.35; // early rounds: mostly best-player-available
  if (round <= 8) return 1; // middle rounds: need matters at normal weight
  return 1.75; // late rounds: prioritize locking in roster construction
}

/**
 * QB gets its own curve instead of the generic one above. The generic curve
 * jumps from 0.35 (rounds 1-3) straight to 1.0 the moment round 4 starts -
 * fine for a team's 1st/2nd QB (a real starting need), but that same jump
 * also applied to a team's 3rd QB (a backup, not a starter). A team that
 * landed 2 QBs early - easy to do given how high this league's QB rankings
 * go - would suddenly feel full urgency to grab QB #3 in round 4, which is
 * how a team ends up with 3 QBs in its first 4 picks. Nobody drafts a
 * backup QB in round 4. So: the 1st/2nd QB still follows the normal curve,
 * but once a team already has 2 QBs, the 3rd stays low-priority until deep
 * in the draft - the requirement never disappears (the endgame pass in
 * bestEligiblePlayer still guarantees it gets filled), it just isn't
 * treated as urgent this early.
 */
function qbNeedRoundMultiplier(round: number, qbsAlreadyOwned: number): number {
  if (qbsAlreadyOwned >= 2) {
    if (round <= 6) return 0.15;
    if (round <= 9) return 0.6;
    return 1.75;
  }
  return needRoundMultiplier(round);
}

function pickDistanceFactor(
  position: Position,
  picksUntilNextTurn: number,
  supply: Record<Position, number>
): number {
  const remainingSupply = supply[position];
  if (remainingSupply > picksUntilNextTurn * 1.5) return 0.4; // comfortably safe to wait
  if (remainingSupply > picksUntilNextTurn) return 0.75; // probably safe, small discount
  return 1; // not safe to wait - keep full urgency
}

function needBonus(
  position: Position,
  roster: Roster,
  round: number,
  picksUntilNextTurn: number,
  supply: Record<Position, number>
): number {
  const needs = computeUnmetNeeds(roster);
  let rawNeed = 0;
  switch (position) {
    case 'QB':
      rawNeed = needs.QB > 0 ? 8 : 0;
      break;
    case 'RB':
      rawNeed = needs.RB > 0 ? 6 : needs.FLEX > 0 ? 3 : 0;
      break;
    case 'WR':
      rawNeed = needs.WR > 0 ? 6 : needs.FLEX > 0 ? 3 : 0;
      break;
    case 'TE':
      // Slightly higher than RB/WR's dedicated need - TE has historically
      // been the position most likely to get skipped entirely (thinner
      // startable pool), so it gets a bit more push before the endgame
      // pass would otherwise have to force it.
      rawNeed = needs.TE > 0 ? 7 : needs.FLEX > 0 ? 3 : 0;
      break;
  }
  if (rawNeed === 0) return 0;

  const roundFactor =
    position === 'QB' ? qbNeedRoundMultiplier(round, countByPosition(roster).QB) : needRoundMultiplier(round);
  const distanceFactor = pickDistanceFactor(position, picksUntilNextTurn, supply);
  return rawNeed * roundFactor * distanceFactor;
}

// -----------------------------------------------------------------------
// Roster balance (surplus penalty)
// -----------------------------------------------------------------------
// needBonus above only ever pulls a team TOWARD a position it still needs -
// nothing ever pushed back the other way, so once a team's real starting
// need was satisfied, raw value/cliff/scarcity could still happily pile up
// a 2nd, 3rd, 4th copy of the same position back to back (e.g. a team
// ending the draft with 3 straight TEs). This adds that missing pushback:
// once a team already has "enough" of a position - defined generously, well
// past its required starters - every additional pick at that position costs
// a bit more than the last. It's a soft, escalating cost, not a hard block,
// so a genuinely huge value/cliff pick can still overcome it; it just stops
// the CPU from treating "enough" and "way more than enough" the same way.
//
// QB is intentionally excluded here - it's already hard-capped at exactly
// its target (3, see MAX_QBS_PER_TEAM in rosterLogic.ts / TARGET_QBS above),
// so there's no "surplus" QB scenario to penalize. QB's version of this
// problem (rushing to a 3rd/backup QB too early) is handled by
// qbNeedRoundMultiplier above instead.

/** How many of a position a team can hold before extra copies start
 * costing anything. Generous for RB/WR (normal fantasy rosters carry real
 * bench depth there); tight for TE (backup TEs are rarely worth a roster
 * spot, which is exactly the "3 straight TEs" pattern this exists to stop).
 * QB isn't listed - see note above. */
const SURPLUS_COMFORT_CEILING: Partial<Record<Position, number>> = {
  RB: 3,
  WR: 3,
  TE: 1,
};

const SURPLUS_PENALTY_UNIT = 6;

function surplusPenalty(position: Position, roster: Roster): number {
  const ceiling = SURPLUS_COMFORT_CEILING[position];
  if (ceiling === undefined) return 0;
  const owned = countByPosition(roster)[position];
  const copiesBeyondCeiling = owned - ceiling + 1; // the 1st pick past the ceiling counts as 1, etc.
  if (copiesBeyondCeiling <= 0) return 0;
  return copiesBeyondCeiling * SURPLUS_PENALTY_UNIT;
}

// -----------------------------------------------------------------------
// Scoring
// -----------------------------------------------------------------------

function scorePlayer(
  player: RankedPlayer,
  roster: Roster,
  round: number,
  picksUntilNextTurn: number,
  demand: Record<Position, number>,
  supply: Record<Position, number>,
  cliffById: Map<string, number>,
  randomize: boolean
): number {
  // Lower twoQbRank is better, so invert it into a positive "value" score.
  const rankingValue = 1000 - player.twoQbRank;
  const cliffValue = (cliffById.get(player.id) ?? 0) * 0.5;
  const need = needBonus(player.position, roster, round, picksUntilNextTurn, supply);
  const scarcity = scarcityBonus(player.position, demand, supply);
  const surplus = surplusPenalty(player.position, roster);
  const randomAdjustment = randomize ? Math.random() * 8 : 0;
  return rankingValue + cliffValue + need + scarcity - surplus + randomAdjustment;
}

export interface CpuPickContext {
  availablePlayers: RankedPlayer[];
  roster: Roster;
  /** Every team's current roster - needed for league-wide scarcity (demand
   * across all 10 teams, not just this one). */
  teams: TeamState[];
  /** 0-based index of the team currently picking (matches `roster` above). */
  teamIndex: number;
  /** 1-based overall pick number currently on the clock. */
  currentPick: number;
}

function bestEligiblePlayer(context: CpuPickContext, randomize: boolean): RankedPlayer | null {
  const { availablePlayers, roster, teams, teamIndex, currentPick } = context;

  const round = roundForPick(currentPick);
  const schedule = teamPickSchedule(teamIndex, currentPick);
  const picksRemainingForTeam = schedule.length;
  const picksUntilNextTurn = schedule.length > 1 ? schedule[1] - schedule[0] - 1 : 0;

  const demand = computeLeagueDemand(teams);
  const supply = computeSupply(availablePlayers);
  const cliffById = computeCliffBonuses(availablePlayers);

  let pool = availablePlayers.filter((p) => isPositionEligible(roster, p.position));

  const requiredPositions = endgameRequiredPositions(roster, picksRemainingForTeam);
  if (requiredPositions) {
    const narrowed = pool.filter((p) => requiredPositions.has(p.position));
    // Fall back to the full eligible pool only in the (very unlikely) case
    // that no eligible player exists at any required position.
    if (narrowed.length > 0) pool = narrowed;
  }

  let bestPlayer: RankedPlayer | null = null;
  let bestScore = -Infinity;

  for (const player of pool) {
    const score = scorePlayer(
      player,
      roster,
      round,
      picksUntilNextTurn,
      demand,
      supply,
      cliffById,
      randomize
    );
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
 * own roster's positional needs (and, same as the CPU, will get narrowed to
 * required positions in the endgame so the suggestion reflects real risk).
 */
export function suggestBestPick(context: CpuPickContext): RankedPlayer | null {
  return bestEligiblePlayer(context, false);
}
