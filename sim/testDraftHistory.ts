import { summarizeDraftHistory } from '../src/state/draftHistoryStats';
import type { DraftHistoryEntry } from '../src/state/draftHistoryStorage';
import type { RankedPlayer } from '../src/types';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

function fakePlayer(id: string, name: string): RankedPlayer {
  return { id, name, position: 'RB', team: 'XXX', bye: 7, espnRank: 1, espnPositionRank: 1, twoQbRank: 1 };
}

const gibbs = fakePlayer('p1', 'Jahmyr Gibbs');
const bijan = fakePlayer('p2', 'Bijan Robinson');
const someoneElse = fakePlayer('p99', 'Someone Else');

const entries: DraftHistoryEntry[] = [
  // Draft 1: slot 1, favorited gibbs+bijan, landed only gibbs.
  {
    id: 'a',
    completedAt: '2026-01-01T00:00:00Z',
    slot: 1,
    roster: [gibbs, someoneElse],
    favoriteIdsAtCompletion: ['p1', 'p2'],
  },
  // Draft 2: slot 1, favorited gibbs+bijan, landed both.
  {
    id: 'b',
    completedAt: '2026-01-02T00:00:00Z',
    slot: 1,
    roster: [gibbs, bijan],
    favoriteIdsAtCompletion: ['p1', 'p2'],
  },
  // Draft 3: slot 4, favorited mccaffrey only, landed none.
  {
    id: 'c',
    completedAt: '2026-01-03T00:00:00Z',
    slot: 4,
    roster: [someoneElse],
    favoriteIdsAtCompletion: ['p3'],
  },
  // Draft 4: slot 4, no favorites set at all.
  {
    id: 'd',
    completedAt: '2026-01-04T00:00:00Z',
    slot: 4,
    roster: [someoneElse],
    favoriteIdsAtCompletion: [],
  },
];

const summary = summarizeDraftHistory(entries);

assert(summary.totalDrafts === 4, 'total drafts counted correctly');
assert(summary.mostDraftedSlot === 1 || summary.mostDraftedSlot === 4, 'most drafted slot is a tie between 1 and 4 (2 each), either is acceptable');

const slot1 = summary.slotStats.find((s) => s.slot === 1)!;
assert(slot1.timesDrafted === 2, 'slot 1 drafted twice');
// Draft1: 1/2 landed = 0.5, Draft2: 2/2 landed = 1.0, avg = 0.75
assert(Math.abs(slot1.avgCaptureRate! - 0.75) < 1e-9, `slot 1 avg capture rate is 0.75 (got ${slot1.avgCaptureRate})`);

const slot4 = summary.slotStats.find((s) => s.slot === 4)!;
assert(slot4.timesDrafted === 2, 'slot 4 drafted twice');
// Draft3: 0/1 = 0, Draft4: no favorites -> excluded from average entirely
assert(slot4.avgCaptureRate === 0, `slot 4 avg capture rate is 0 (only draft 3 counts, got ${slot4.avgCaptureRate})`);

// Overall: total favorited instances = 2+2+1+0 = 5, total landed = 1+2+0+0 = 3 -> 3/5 = 0.6
assert(Math.abs(summary.overallCaptureRate! - 0.6) < 1e-9, `overall capture rate is 0.6 (got ${summary.overallCaptureRate})`);

const gibbsStat = summary.playerStats.find((p) => p.id === 'p1')!;
assert(gibbsStat.timesFavorited === 2 && gibbsStat.timesLanded === 2 && gibbsStat.rate === 1, 'Gibbs landed 2/2 (100%)');

const bijanStat = summary.playerStats.find((p) => p.id === 'p2')!;
assert(bijanStat.timesFavorited === 2 && bijanStat.timesLanded === 1 && bijanStat.rate === 0.5, 'Bijan landed 1/2 (50%)');

const mccaffreyStat = summary.playerStats.find((p) => p.id === 'p3')!;
assert(mccaffreyStat.timesFavorited === 1 && mccaffreyStat.timesLanded === 0 && mccaffreyStat.rate === 0, 'McCaffrey (never on any roster) landed 0/1 (0%)');

// Empty history should be safe.
const emptySummary = summarizeDraftHistory([]);
assert(emptySummary.totalDrafts === 0, 'empty history: 0 total drafts');
assert(emptySummary.mostDraftedSlot === null, 'empty history: no most-drafted slot');
assert(emptySummary.overallCaptureRate === null, 'empty history: no overall capture rate');
assert(emptySummary.slotStats.length === 0, 'empty history: no slot stats');
assert(emptySummary.playerStats.length === 0, 'empty history: no player stats');

console.log(process.exitCode === 1 ? '\nSOME TESTS FAILED' : '\nALL TESTS PASSED');
