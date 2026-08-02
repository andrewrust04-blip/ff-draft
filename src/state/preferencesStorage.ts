// All persistent, cross-session user preferences for this app live here.
// Draft state itself is intentionally NOT persisted (see DraftContext) -
// only durable personal preferences that should survive a page refresh or a
// brand new draft: which players you've starred, any manual ranking edits,
// and any base-data corrections from pasting in an updated cheat sheet.
//
// Everything here is best-effort: private browsing, storage quota, or a
// corrupted blob should degrade to "no preferences saved" rather than crash
// the app, so every read is wrapped in try/catch with a safe fallback.

import type { Player, Position } from '../types';

const FAVORITES_KEY = 'twoqb-mock-draft:favorites:v1';
const BASE_OVERRIDES_KEY = 'twoqb-mock-draft:base-overrides:v1';
const CUSTOM_ORDER_KEY = 'twoqb-mock-draft:custom-order:v1';

// ---------------------------------------------------------------------------
// Favorites - a simple set of player IDs.
// ---------------------------------------------------------------------------

export function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function saveFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  } catch {
    // Storage full or unavailable - favorites just won't persist this session.
  }
}

// ---------------------------------------------------------------------------
// Base-data overrides - corrections to RB/WR/TE espnRank/espnPositionRank/
// team/bye, or wholly new/removed players, produced by pasting an updated
// cheat sheet into the Rankings screen. Layered on top of the static
// players.ts data before the 2-QB merge runs. QBs are intentionally left
// out of this layer entirely - see RankingsScreen.tsx for why.
// ---------------------------------------------------------------------------

export interface BaseOverrideEdit {
  espnRank: number;
  espnPositionRank: number;
  team: string;
  bye: number;
}

export interface BaseOverridesData {
  /** Edits to existing players, keyed by player id. */
  edits: Record<string, BaseOverrideEdit>;
  /** Wholly new players added by a pasted sheet (not in players.ts at all). */
  added: Player[];
  /** IDs of players to exclude entirely (no longer on the pasted sheet). */
  removedIds: string[];
  /** When this override set was applied, for display purposes. */
  appliedAt: string | null;
}

export function emptyBaseOverrides(): BaseOverridesData {
  return { edits: {}, added: [], removedIds: [], appliedAt: null };
}

export function loadBaseOverrides(): BaseOverridesData {
  try {
    const raw = localStorage.getItem(BASE_OVERRIDES_KEY);
    if (!raw) return emptyBaseOverrides();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyBaseOverrides();
    return {
      edits: parsed.edits ?? {},
      added: Array.isArray(parsed.added) ? parsed.added : [],
      removedIds: Array.isArray(parsed.removedIds) ? parsed.removedIds : [],
      appliedAt: typeof parsed.appliedAt === 'string' ? parsed.appliedAt : null,
    };
  } catch {
    return emptyBaseOverrides();
  }
}

export function saveBaseOverrides(data: BaseOverridesData): void {
  try {
    localStorage.setItem(BASE_OVERRIDES_KEY, JSON.stringify(data));
  } catch {
    // Best-effort only.
  }
}

export function clearBaseOverrides(): void {
  try {
    localStorage.removeItem(BASE_OVERRIDES_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Custom rank order - a full override of final draft order, produced by
// nudging/moving specific players in the Rankings screen. Stored as an
// ordered list of player IDs; position in the array = final twoQbRank.
// Only ever covers the players the user has touched (or the full list, if
// they've opened and saved the editor) - anything not present falls back to
// its normally-computed rank, threaded in around the overrides.
// ---------------------------------------------------------------------------

export function loadCustomOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(CUSTOM_ORDER_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return arr.filter((x): x is string => typeof x === 'string');
  } catch {
    return null;
  }
}

export function saveCustomOrder(order: string[]): void {
  try {
    localStorage.setItem(CUSTOM_ORDER_KEY, JSON.stringify(order));
  } catch {
    // Best-effort only.
  }
}

export function clearCustomOrder(): void {
  try {
    localStorage.removeItem(CUSTOM_ORDER_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Parsing a pasted cheat sheet. Mirrors the same "N. (POS#) Name, TEAM $X Y"
// pattern the original PDF import used, since that's the copy-pasteable
// text ESPN's cheat sheet produces. K/D-ST rows are ignored (this league has
// no kicker/defense slots); QB rows are ignored (QBs use a different,
// reserved-slot ranking system - see twoQbAdjustment.ts).
// ---------------------------------------------------------------------------

export interface ParsedSheetRow {
  overall: number;
  pos: string;
  posRank: number;
  name: string;
  team: string;
  bye: number;
}

const ROW_PATTERN = /(\d+)\.\s*\(([A-Z]+)(\d+)\)\s*([^,]+),\s*([A-Z]{2,4})\s*\$(\d+)\s*(\d+)/g;

export function parsePastedCheatSheet(text: string): ParsedSheetRow[] {
  const rows: ParsedSheetRow[] = [];
  const seenOverall = new Set<number>();
  for (const match of text.matchAll(ROW_PATTERN)) {
    const [, overallStr, pos, posRankStr, name, team, , byeStr] = match;
    const overall = parseInt(overallStr, 10);
    if (seenOverall.has(overall)) continue; // e.g. the legend example row repeats #1
    seenOverall.add(overall);
    if (pos !== 'RB' && pos !== 'WR' && pos !== 'TE') continue; // skip QB/K/DST
    rows.push({
      overall,
      pos,
      posRank: parseInt(posRankStr, 10),
      name: name.trim(),
      team,
      bye: parseInt(byeStr, 10),
    });
  }
  return rows;
}

/**
 * Builds a fresh BaseOverridesData from parsed sheet rows, matched against
 * the current player pool by exact name. Unmatched sheet rows become new
 * players; existing RB/WR/TE players not present on the sheet are marked
 * removed. Does not mutate anything - caller decides whether to save it.
 */
export function buildOverridesFromParsedSheet(
  parsedRows: ParsedSheetRow[],
  currentPlayers: Player[]
): { overrides: BaseOverridesData; addedNames: string[]; removedNames: string[] } {
  const currentSkill = currentPlayers.filter((p) => p.position !== 'QB');
  const byName = new Map(currentSkill.map((p) => [p.name, p]));
  const sheetNames = new Set(parsedRows.map((r) => r.name));

  const edits: Record<string, BaseOverrideEdit> = {};
  const added: Player[] = [];
  const addedNames: string[] = [];

  let nextCustomId = 1;
  const existingIds = new Set(currentPlayers.map((p) => p.id));
  const genId = () => {
    let id = `custom-${nextCustomId}`;
    while (existingIds.has(id)) {
      nextCustomId++;
      id = `custom-${nextCustomId}`;
    }
    existingIds.add(id);
    nextCustomId++;
    return id;
  };

  for (const row of parsedRows) {
    const existing = byName.get(row.name);
    if (existing) {
      edits[existing.id] = {
        espnRank: row.overall,
        espnPositionRank: row.posRank,
        team: row.team,
        bye: row.bye,
      };
    } else {
      const id = genId();
      added.push({
        id,
        espnRank: row.overall,
        position: row.pos as Position,
        espnPositionRank: row.posRank,
        name: row.name,
        team: row.team,
        bye: row.bye,
      });
      addedNames.push(row.name);
    }
  }

  const removedNames: string[] = [];
  const removedIds: string[] = [];
  for (const p of currentSkill) {
    if (!sheetNames.has(p.name)) {
      removedIds.push(p.id);
      removedNames.push(p.name);
    }
  }

  return {
    overrides: { edits, added, removedIds, appliedAt: new Date().toISOString() },
    addedNames,
    removedNames,
  };
}

/** Applies stored base overrides on top of the raw players.ts data. QBs pass through untouched. */
export function applyBaseOverrides(basePlayers: Player[], overrides: BaseOverridesData): Player[] {
  if (
    Object.keys(overrides.edits).length === 0 &&
    overrides.added.length === 0 &&
    overrides.removedIds.length === 0
  ) {
    return basePlayers;
  }
  const removed = new Set(overrides.removedIds);
  const edited = basePlayers
    .filter((p) => !removed.has(p.id))
    .map((p) => {
      const edit = overrides.edits[p.id];
      if (!edit) return p;
      return { ...p, ...edit };
    });
  return [...edited, ...overrides.added];
}
