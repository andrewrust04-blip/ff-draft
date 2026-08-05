import { useEffect, useRef } from 'react';
import { useDraft } from './DraftContext';
import { useFavorites } from './FavoritesContext';
import { appendDraftHistoryEntry, buildDraftHistoryEntry } from './draftHistoryStorage';

/**
 * Mounted once at the app root. Renders nothing - just watches for the draft
 * transitioning into 'complete' and logs a snapshot for the stats screen.
 * Guarded so it fires exactly once per completion, not on every re-render
 * while status stays 'complete', and resets automatically once the user
 * starts a new draft (status leaves 'complete').
 */
export function DraftHistoryLogger() {
  const { state } = useDraft();
  const { favorites } = useFavorites();
  const loggedRef = useRef(false);

  useEffect(() => {
    if (state.status !== 'complete') {
      loggedRef.current = false;
      return;
    }
    if (loggedRef.current) return;
    loggedRef.current = true;

    const myTeam = state.teams[state.userTeamIndex];
    const roster = Object.values(myTeam.roster).filter(
      (p): p is NonNullable<typeof p> => p !== null
    );
    const entry = buildDraftHistoryEntry(
      state.userTeamIndex + 1,
      roster,
      Array.from(favorites)
    );
    appendDraftHistoryEntry(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return null;
}
