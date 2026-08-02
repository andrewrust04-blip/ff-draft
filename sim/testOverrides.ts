import { players } from '../src/data/players';
import { computeTwoQbRankings, applyCustomOrder } from '../src/data/twoQbAdjustment';
import {
  applyBaseOverrides,
  parsePastedCheatSheet,
  buildOverridesFromParsedSheet,
  type BaseOverridesData,
} from '../src/state/preferencesStorage';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

// --- applyCustomOrder ---
{
  const computed = computeTwoQbRankings(players);
  assert(computed.length === players.length, 'baseline computed length matches player count');

  // No custom order -> unchanged.
  const unchanged = applyCustomOrder(computed, null);
  assert(unchanged[0].id === computed[0].id, 'null custom order leaves rank-1 player unchanged');

  // Move the #50 player to #1.
  const target = computed[49];
  const customOrder = [target.id, ...computed.filter((p) => p.id !== target.id).map((p) => p.id)];
  const reordered = applyCustomOrder(computed, customOrder);
  assert(reordered[0].id === target.id, 'custom order correctly moves target player to rank 1');
  assert(reordered[0].twoQbRank === 1, 'moved player gets renumbered twoQbRank = 1');
  assert(reordered.length === computed.length, 'custom order preserves total player count');
  const ids = new Set(reordered.map((p) => p.id));
  assert(ids.size === reordered.length, 'no duplicate players after custom order applied');

  // Partial custom order (only 3 players specified, deliberately not in
  // natural-rank order) - their RELATIVE order must be preserved exactly as
  // given, even though it's not sorted by natural rank; everyone else
  // (leftover) threads in around them.
  const partial = [computed[10].id, computed[5].id, computed[20].id];
  const partialReordered = applyCustomOrder(computed, partial);
  assert(partialReordered.length === computed.length, 'partial custom order still covers every player');
  const posOf = (id: string) => partialReordered.findIndex((p) => p.id === id);
  assert(
    posOf(computed[10].id) < posOf(computed[5].id) && posOf(computed[5].id) < posOf(computed[20].id),
    'partial custom order preserves the exact given relative sequence of listed players'
  );
}

// --- base overrides + paste-sheet parsing ---
{
  const sample = `
161. (WR67) Jalen Nailor, LV $0 13 162. (WR68) Omar Cooper Jr., NYJ $0 13
1. (RB1) Jahmyr Gibbs, DET $60 6
999. (WR200) Some New Undrafted Guy, KC $0 5
`;
  const rows = parsePastedCheatSheet(sample);
  assert(rows.length === 4, `parses 4 RB/WR rows from sample text (got ${rows.length})`);
  assert(rows.some((r) => r.name === 'Jahmyr Gibbs' && r.overall === 1), 'parses Jahmyr Gibbs correctly');
  assert(
    rows.some((r) => r.name === 'Some New Undrafted Guy'),
    'parses a brand-new player not in the current dataset'
  );

  const { overrides, addedNames, removedNames } = buildOverridesFromParsedSheet(rows, players);
  assert(addedNames.includes('Some New Undrafted Guy'), 'new player correctly identified as added');
  assert(removedNames.length > 0, 'players missing from the pasted sheet are identified as removed');
  assert(Object.keys(overrides.edits).length > 0, 'existing matched players get edits');

  const finalPlayers = applyBaseOverrides(players, overrides);
  const gibbs = finalPlayers.find((p) => p.name === 'Jahmyr Gibbs');
  assert(!!gibbs && gibbs.espnRank === 1, 'applyBaseOverrides correctly updates existing player rank');
  assert(
    finalPlayers.some((p) => p.name === 'Some New Undrafted Guy'),
    'applyBaseOverrides correctly includes newly-added player'
  );
  assert(
    !finalPlayers.some((p) => removedNames.includes(p.name)),
    'applyBaseOverrides correctly excludes removed players'
  );

  // Empty overrides should be a true no-op (same reference).
  const emptyOverrides: BaseOverridesData = { edits: {}, added: [], removedIds: [], appliedAt: null };
  const noop = applyBaseOverrides(players, emptyOverrides);
  assert(noop === players, 'empty overrides return the exact same array reference (no-op)');
}

console.log(process.exitCode === 1 ? '\nSOME TESTS FAILED' : '\nALL TESTS PASSED');
