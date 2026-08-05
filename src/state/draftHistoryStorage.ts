// Logs a snapshot of every completed draft so DraftHistoryScreen can show
// trends across multiple mock drafts - which slots you've drafted from, and
// (cross-referenced with your favorites at the time) how often you actually
// land the guys you wanted. Same best-effort persistence pattern as
// preferencesStorage.ts: any read failure degrades to "no history" rather
// than crashing the app.

import type { RankedPlayer } from '../types';

const HISTORY_KEY = 'twoqb-mock-draft:draft-history:v1';
const MAX_HISTORY_ENTRIES = 200; // sane cap so localStorage never grows unbounded

export interface DraftHistoryEntry {
  id: string;
  completedAt: string; // ISO timestamp
  slot: number; // 1-based
  /** Full final roster snapshot - stored as plain data, not live player refs,
   * since players.ts/rankings can change in later sessions. */
  roster: RankedPlayer[];
  /** Which player IDs were starred as favorites at the moment this draft
   * completed - the denominator for "how often do I land guys I actually
   * wanted" stats, since favorites drift over time and old entries shouldn't
   * be judged against your CURRENT list. */
  favoriteIdsAtCompletion: string[];
}

export function loadDraftHistory(): DraftHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is DraftHistoryEntry =>
        e &&
        typeof e.id === 'string' &&
        typeof e.completedAt === 'string' &&
        typeof e.slot === 'number' &&
        Array.isArray(e.roster) &&
        Array.isArray(e.favoriteIdsAtCompletion)
    );
  } catch {
    return [];
  }
}

export function appendDraftHistoryEntry(entry: DraftHistoryEntry): void {
  try {
    const existing = loadDraftHistory();
    const next = [...existing, entry].slice(-MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Best-effort only - a full quota or private-browsing failure just means
    // this one draft doesn't get logged.
  }
}

export function clearDraftHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

function makeHistoryId(): string {
  return `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDraftHistoryEntry(
  slot: number,
  roster: RankedPlayer[],
  favoriteIdsAtCompletion: string[]
): DraftHistoryEntry {
  return {
    id: makeHistoryId(),
    completedAt: new Date().toISOString(),
    slot,
    roster,
    favoriteIdsAtCompletion,
  };
}
