// Central type definitions for the mock draft simulator.

export type Position = 'QB' | 'RB' | 'WR' | 'TE';

/** A player as extracted from the ESPN rankings PDF, plus our own derived fields. */
export interface Player {
  id: string;
  /** Original ESPN overall rank (1-300 scale from the source PDF). Never overwritten. */
  espnRank: number;
  position: Position;
  /** ESPN's rank within position, e.g. 3 for the 3rd-ranked RB (QB1, RB1, WR1, TE1...). */
  espnPositionRank: number;
  name: string;
  team: string;
}

/** A player plus the custom 2-QB league rank, used everywhere in the draft UI. */
export interface RankedPlayer extends Player {
  /** Our custom 2-QB adjusted rank. Lower is better. Recomputed once at app start. */
  twoQbRank: number;
}

export const STARTING_SLOTS = [
  'QB1',
  'QB2',
  'RB1',
  'RB2',
  'WR1',
  'WR2',
  'TE',
  'FLEX',
] as const;

export type StartingSlot = (typeof STARTING_SLOTS)[number];

export const BENCH_SLOTS = [
  'Bench 1',
  'Bench 2',
  'Bench 3',
  'Bench 4',
  'Bench 5',
  'Bench 6',
] as const;

export type BenchSlot = (typeof BENCH_SLOTS)[number];

export type RosterSlot = StartingSlot | BenchSlot;

export const ALL_ROSTER_SLOTS: RosterSlot[] = [...STARTING_SLOTS, ...BENCH_SLOTS];

export const TOTAL_ROUNDS = 14;
export const TOTAL_TEAMS = 10;
export const TOTAL_PICKS = TOTAL_ROUNDS * TOTAL_TEAMS;

/**
 * Display name for a team given its 0-based index and which index is the
 * user. The user's team is always "My Team" regardless of draft slot; every
 * other team is labeled by its actual draft slot number (1-based).
 */
export function teamNameForIndex(index: number, userTeamIndex: number): string {
  return index === userTeamIndex ? 'My Team' : `Team ${index + 1}`;
}

/** A single completed draft pick, recorded in board order. */
export interface DraftPick {
  overallPick: number; // 1-based, 1..130
  round: number; // 1-based, 1..13
  teamIndex: number; // 0-based, 0..9
  player: RankedPlayer;
  /** The roster slot the player was auto-assigned to. */
  assignedSlot: RosterSlot;
}

/** A team's roster: maps each slot to a player, or null if still open. */
export type Roster = Record<RosterSlot, RankedPlayer | null>;

export function createEmptyRoster(): Roster {
  const roster = {} as Roster;
  for (const slot of ALL_ROSTER_SLOTS) {
    roster[slot] = null;
  }
  return roster;
}

export interface TeamState {
  index: number;
  name: string;
  roster: Roster;
  isUser: boolean;
}

export type DraftStatus = 'setup' | 'in-progress' | 'paused' | 'complete';
