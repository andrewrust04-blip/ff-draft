import type {
  DraftPick,
  DraftStatus,
  RankedPlayer,
  Roster,
  TeamState,
} from '../types';
import { TOTAL_TEAMS, TOTAL_PICKS, createEmptyRoster, teamNameForIndex } from '../types';
import { roundForPick, teamIndexForPick } from '../draft/snakeOrder';
import { assignSlotForPlayer, isPositionEligible } from '../draft/rosterLogic';

export interface DraftState {
  status: DraftStatus;
  userTeamIndex: number;
  teams: TeamState[];
  availablePlayers: RankedPlayer[];
  allPlayers: RankedPlayer[];
  picks: DraftPick[];
  currentPick: number; // 1-based; > TOTAL_PICKS means draft complete
  cpuPaused: boolean;
}

export function createInitialTeams(userTeamIndex: number): TeamState[] {
  return Array.from({ length: TOTAL_TEAMS }, (_, index) => ({
    index,
    name: teamNameForIndex(index, userTeamIndex),
    roster: createEmptyRoster(),
    isUser: index === userTeamIndex,
  }));
}

export function createInitialState(allPlayers: RankedPlayer[]): DraftState {
  return {
    status: 'setup',
    userTeamIndex: 0,
    teams: createInitialTeams(0),
    availablePlayers: allPlayers,
    allPlayers,
    picks: [],
    currentPick: 1,
    cpuPaused: false,
  };
}

export type DraftAction =
  | { type: 'START_DRAFT'; userTeamIndex: number }
  | { type: 'DRAFT_PLAYER'; playerId: string }
  | { type: 'UNDO_PICK' }
  | { type: 'RESTART_DRAFT' }
  | { type: 'RESET_TO_SETUP' }
  | { type: 'PAUSE_CPU' }
  | { type: 'RESUME_CPU' };

function applyPick(state: DraftState, player: RankedPlayer): DraftState {
  if (state.currentPick > TOTAL_PICKS) return state;

  const teamIndex = teamIndexForPick(state.currentPick);
  const round = roundForPick(state.currentPick);
  const team = state.teams[teamIndex];

  // Enforce the roster-building rules (e.g. max 3 QBs) for every team,
  // human or CPU - this used to only be checked in the CPU's own scoring
  // logic, so the user could draft a 4th QB straight through the UI.
  if (!isPositionEligible(team.roster, player.position)) return state;

  const assignedSlot = assignSlotForPlayer(team.roster, player);

  const updatedRoster: Roster = { ...team.roster, [assignedSlot]: player };
  const updatedTeams = state.teams.map((t, i) =>
    i === teamIndex ? { ...t, roster: updatedRoster } : t
  );

  const pick: DraftPick = {
    overallPick: state.currentPick,
    round,
    teamIndex,
    player,
    assignedSlot,
  };

  const nextPick = state.currentPick + 1;

  return {
    ...state,
    teams: updatedTeams,
    availablePlayers: state.availablePlayers.filter((p) => p.id !== player.id),
    picks: [...state.picks, pick],
    currentPick: nextPick,
    status: nextPick > TOTAL_PICKS ? 'complete' : state.status,
  };
}

function undoLastPick(state: DraftState): DraftState {
  if (state.picks.length === 0) return state;

  const lastPick = state.picks[state.picks.length - 1];
  const remainingPicks = state.picks.slice(0, -1);

  const team = state.teams[lastPick.teamIndex];
  const updatedRoster: Roster = { ...team.roster, [lastPick.assignedSlot]: null };
  const updatedTeams = state.teams.map((t, i) =>
    i === lastPick.teamIndex ? { ...t, roster: updatedRoster } : t
  );

  // Re-insert the player back into available list, keeping sort by twoQbRank.
  const restoredAvailable = [...state.availablePlayers, lastPick.player].sort(
    (a, b) => a.twoQbRank - b.twoQbRank
  );

  return {
    ...state,
    teams: updatedTeams,
    availablePlayers: restoredAvailable,
    picks: remainingPicks,
    currentPick: lastPick.overallPick,
    status: 'in-progress',
  };
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'START_DRAFT': {
      return {
        ...createInitialState(state.allPlayers),
        userTeamIndex: action.userTeamIndex,
        teams: createInitialTeams(action.userTeamIndex),
        status: 'in-progress',
      };
    }
    case 'DRAFT_PLAYER': {
      const player = state.availablePlayers.find((p) => p.id === action.playerId);
      if (!player) return state;
      return applyPick(state, player);
    }
    case 'UNDO_PICK': {
      return undoLastPick(state);
    }
    case 'RESTART_DRAFT': {
      return {
        ...createInitialState(state.allPlayers),
        userTeamIndex: state.userTeamIndex,
        teams: createInitialTeams(state.userTeamIndex),
        status: 'in-progress',
      };
    }
    case 'RESET_TO_SETUP': {
      return createInitialState(state.allPlayers);
    }
    case 'PAUSE_CPU': {
      return { ...state, cpuPaused: true };
    }
    case 'RESUME_CPU': {
      return { ...state, cpuPaused: false };
    }
    default:
      return state;
  }
}
