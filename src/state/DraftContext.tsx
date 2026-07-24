import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { players as rawPlayers } from '../data/players';
import { computeTwoQbRankings } from '../data/twoQbAdjustment';
import { pickForCpuTeam } from '../draft/cpuLogic';
import { teamIndexForPick } from '../draft/snakeOrder';
import { TOTAL_PICKS } from '../types';
import {
  createInitialState,
  draftReducer,
  type DraftAction,
  type DraftState,
} from './draftReducer';

interface DraftContextValue {
  state: DraftState;
  dispatch: React.Dispatch<DraftAction>;
}

const DraftContext = createContext<DraftContextValue | null>(null);

const CPU_PICK_DELAY_MS = 250;

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const allPlayers = useMemo(() => computeTwoQbRankings(rawPlayers), []);
  const [state, dispatch] = useReducer(draftReducer, allPlayers, createInitialState);

  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending CPU-pick timer whenever state changes, then decide
    // whether to schedule a new one below. Prevents duplicate/stale picks.
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (state.status !== 'in-progress') return;
    if (state.cpuPaused) return;
    if (state.currentPick > TOTAL_PICKS) return;

    const onTheClock = teamIndexForPick(state.currentPick);
    if (onTheClock === state.userTeamIndex) return; // wait for human input

    timeoutRef.current = window.setTimeout(() => {
      const team = state.teams[onTheClock];
      const player = pickForCpuTeam({
        availablePlayers: state.availablePlayers,
        roster: team.roster,
      });
      if (player) {
        dispatch({ type: 'DRAFT_PLAYER', playerId: player.id });
      }
    }, CPU_PICK_DELAY_MS);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used within a DraftProvider');
  return ctx;
}
