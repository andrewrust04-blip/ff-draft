import type { DraftHistoryEntry } from './draftHistoryStorage';

export interface SlotStat {
  slot: number;
  timesDrafted: number;
  /** Average fraction of that draft's own favorites-at-the-time that were landed (0-1), only across entries that had at least 1 favorite set. */
  avgCaptureRate: number | null;
}

export interface PlayerStat {
  id: string;
  name: string;
  timesFavorited: number;
  timesLanded: number;
  rate: number; // timesLanded / timesFavorited
}

export interface DraftHistorySummary {
  totalDrafts: number;
  mostDraftedSlot: number | null;
  overallCaptureRate: number | null; // aggregate across every favorited-at-the-time instance
  slotStats: SlotStat[];
  playerStats: PlayerStat[];
}

function entryCaptureFraction(entry: DraftHistoryEntry): number | null {
  if (entry.favoriteIdsAtCompletion.length === 0) return null;
  const rosterIds = new Set(entry.roster.map((p) => p.id));
  const landed = entry.favoriteIdsAtCompletion.filter((id) => rosterIds.has(id)).length;
  return landed / entry.favoriteIdsAtCompletion.length;
}

export function summarizeDraftHistory(entries: DraftHistoryEntry[]): DraftHistorySummary {
  const totalDrafts = entries.length;

  // --- slot breakdown ---
  const bySlot = new Map<number, { count: number; fractions: number[] }>();
  for (const e of entries) {
    const bucket = bySlot.get(e.slot) ?? { count: 0, fractions: [] };
    bucket.count++;
    const frac = entryCaptureFraction(e);
    if (frac !== null) bucket.fractions.push(frac);
    bySlot.set(e.slot, bucket);
  }
  const slotStats: SlotStat[] = Array.from(bySlot.entries())
    .map(([slot, b]) => ({
      slot,
      timesDrafted: b.count,
      avgCaptureRate: b.fractions.length > 0 ? b.fractions.reduce((a, x) => a + x, 0) / b.fractions.length : null,
    }))
    .sort((a, b) => a.slot - b.slot);

  const mostDraftedSlot =
    slotStats.length > 0
      ? slotStats.reduce((best, s) => (s.timesDrafted > best.timesDrafted ? s : best)).slot
      : null;

  // --- overall capture rate (aggregate across every favorited-at-the-time instance, not an average of averages) ---
  let totalFavoritedInstances = 0;
  let totalLandedInstances = 0;
  for (const e of entries) {
    const rosterIds = new Set(e.roster.map((p) => p.id));
    totalFavoritedInstances += e.favoriteIdsAtCompletion.length;
    totalLandedInstances += e.favoriteIdsAtCompletion.filter((id) => rosterIds.has(id)).length;
  }
  const overallCaptureRate = totalFavoritedInstances > 0 ? totalLandedInstances / totalFavoritedInstances : null;

  // --- per-player breakdown ---
  const playerAgg = new Map<string, { name: string; timesFavorited: number; timesLanded: number }>();
  for (const e of entries) {
    const rosterById = new Map(e.roster.map((p) => [p.id, p]));
    for (const favId of e.favoriteIdsAtCompletion) {
      const existing = playerAgg.get(favId);
      const landedPlayer = rosterById.get(favId);
      const name = landedPlayer?.name ?? existing?.name ?? favId;
      if (existing) {
        existing.timesFavorited++;
        if (landedPlayer) existing.timesLanded++;
      } else {
        playerAgg.set(favId, {
          name,
          timesFavorited: 1,
          timesLanded: landedPlayer ? 1 : 0,
        });
      }
    }
  }
  const playerStats: PlayerStat[] = Array.from(playerAgg.entries())
    .map(([id, v]) => ({
      id,
      name: v.name,
      timesFavorited: v.timesFavorited,
      timesLanded: v.timesLanded,
      rate: v.timesLanded / v.timesFavorited,
    }))
    .sort((a, b) => b.timesFavorited - a.timesFavorited || b.rate - a.rate);

  return { totalDrafts, mostDraftedSlot, overallCaptureRate, slotStats, playerStats };
}
