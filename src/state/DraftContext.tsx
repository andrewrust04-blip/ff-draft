import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { players as rawPlayers } from '../data/players';
import { computeTwoQbRankings, applyCustomOrder } from '../data/twoQbAdjustment';
import { pickForCpuTeam } from '../draft/cpuLogic';
import { teamIndexForPick } from '../draft/snakeOrder';
import { TOTAL_PICKS } from '../types';
import { applyBaseOverrides, loadBaseOverrides, loadCustomOrder } from './preferencesStorage';
import {
  createInitialState,
  draftReducer,
  type DraftAction,
  type DraftState,
} from './draftReducer';

interface DraftContextValue {
  state: DraftState;
  dispatch: React.Dispatch<DraftAction>;
  /**
   * Call after saving ranking overrides (base-data edits or a custom order)
   * in the Rankings screen so the next draft picks them up. Only meaningful
   * before a draft is in progress - see RankingsScreen.tsx, which is only
   * reachable while status is 'setup' for exactly this reason: recomputing
   * mid-draft would need to reconcile already-picked/available player state
   * against a changed ranking, which isn't worth the complexity for what's
   * meant to be a pre-draft prep tool.
   */
  refreshRankings: () => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

const CPU_PICK_DELAY_MS = 250;

function computeAllPlayers() {
  const baseOverrides = loadBaseOverrides();
  const effectiveBase = applyBaseOverrides(rawPlayers, baseOverrides);
  const computed = computeTwoQbRankings(effectiveBase);
  const customOrder = loadCustomOrder();
  return applyCustomOrder(computed, customOrder);
}

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [prefsVersion, setPrefsVersion] = useState(0);
  const allPlayers = useMemo(() => computeAllPlayers(), [prefsVersion]);
  const [state, dispatch] = useReducer(draftReducer, allPlayers, createInitialState);

  // If ranking overrides change (Rankings screen saved), rebuild the player
  // pool and reset any in-flight draft back to setup so it starts clean
  // against the new rankings rather than mixing old/new mid-draft.
  const refreshRankings = () => setPrefsVersion((v) => v + 1);

  useEffect(() => {
    dispatch({ type: 'REPLACE_PLAYER_POOL', allPlayers });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlayers]);

  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending CPU-pick timer whenever state changes, then decide
    // whether to schedule a new one below. Prevents duplicate/stale picks.
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (state.status !== 'in-progress') return;
    if (state.awaitingStart) return;
    if (state.cpuPaused) return;
    if (state.currentPick > TOTAL_PICKS) return;

    const onTheClock = teamIndexForPick(state.currentPick);
    if (onTheClock === state.userTeamIndex) return; // wait for human input

    timeoutRef.current = window.setTimeout(() => {
      const team = state.teams[onTheClock];
      const player = pickForCpuTeam({
        availablePlayers: state.availablePlayers,
        roster: team.roster,
        teams: state.teams,
        teamIndex: onTheClock,
        currentPick: state.currentPick,
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

  const value = useMemo(() => ({ state, dispatch, refreshRankings }), [state]);

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useDraft must be used within a DraftProvider');
  return ctx;
}
