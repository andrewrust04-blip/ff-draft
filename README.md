# 2-QB Mock Draft Simulator

A local, single-player mock draft prototype for a **10-team, 2-QB, full PPR** fantasy
football league. Draft against nine CPU teams using a custom "2-QB Rank" derived from
ESPN's 2026 rankings.

## Setup

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

To type-check and build a production bundle:

```bash
npm run build
```

## How it works

- **Setup screen**: pick your draft slot (1–10), start the draft, or reset a saved run.
- **Draft room**:
  - **Available Players** (left): searchable, filterable by position (plus a
    combined **FLEX** filter showing just RB/WR/TE in rank order), sorted by
    2-QB Rank. Shows a **Suggested pick** banner on your turn, based on your
    own roster's positional needs (same scoring model as the CPU, without the
    random jitter). Click **Draft** on your turn — the button disables itself
    once you've hit the 3-QB roster cap.
  - **My Roster** (right): your starting lineup (2 QB / 2 RB / 2 WR / 1 TE / 1 FLEX)
    and 6 bench slots, auto-filled in that priority order, plus position totals.
    FLEX is eligible for RB/WR/TE and fills only after each position's own
    dedicated starting slot(s) are taken. No team - CPU or user - can roster
    more than 3 QBs.
  - **Draft Board** (bottom): all 10 teams × 14 rounds, snake order, your team
    highlighted, current pick highlighted.
- CPU teams draft automatically ~0.25s after it becomes their turn. Use **Pause**
  to freeze CPU picks, **Undo** to take back the most recent pick (yours or a
  CPU's), and **Restart** to reset the board and re-draft from the same slot.
- When all 140 picks are in, a completion screen shows your full roster with
  draft position, ESPN rank, and 2-QB rank for every pick, plus a **Start new
  mock draft** button that returns you to the setup screen so you can pick a
  different draft slot.

## Where things live

| What | File |
|---|---|
| Player data extracted from the ESPN PDF (includes bye weeks) | `src/data/players.ts` |
| 2-QB ranking adjustment (the tunable QB-boost logic) + custom order merge | `src/data/twoQbAdjustment.ts` |
| Snake draft order math | `src/draft/snakeOrder.ts` |
| CPU pick scoring/selection | `src/draft/cpuLogic.ts` |
| Roster slot auto-assignment | `src/draft/rosterLogic.ts` |
| Draft state (reducer + actions) | `src/state/draftReducer.ts` |
| React context wiring + CPU auto-pick timer | `src/state/DraftContext.tsx` |
| Favorites (starred players), shared across the app | `src/state/FavoritesContext.tsx` |
| localStorage: favorites, ranking overrides, custom order, cheat-sheet parsing | `src/state/preferencesStorage.ts` |
| Rankings & Favorites screen open/close state | `src/state/RankingsUIContext.tsx` |
| Rankings & Favorites editor UI (nudge/reorder, paste sheet, favorites) | `src/components/RankingsScreen.tsx` |
| "Check my odds from this slot" UI | `src/components/SlotOddsAnalyzer.tsx` |
| Off-main-thread simulation for the odds check | `src/workers/oddsWorker.ts` |
| localStorage: completed-draft history log | `src/state/draftHistoryStorage.ts` |
| Draft history aggregation (per-slot, per-player capture rates) | `src/state/draftHistoryStats.ts` |
| Watches for a draft completing and logs it | `src/state/DraftHistoryLogger.tsx` |
| Draft History & Stats screen open/close state | `src/state/DraftHistoryUIContext.tsx` |
| Draft History & Stats UI | `src/components/DraftHistoryScreen.tsx` |
| Shared types | `src/types.ts` |
| UI components | `src/components/*.tsx` |

## Personalization features (favorites, ranking edits)

Three related features, all built this session, all persisted via `localStorage`
(this is a real deployed Vercel app, not a claude.ai artifact, so browser storage
is fine here) and all best-effort - a corrupted/missing value degrades to "no
preference saved" rather than crashing, see `preferencesStorage.ts`.

### Favorites

Star any player from Available Players, the Rankings screen, or the Favorites tab.
`FavoritesContext.tsx` holds the live state so every place that shows a star stays
in sync; `preferencesStorage.ts` persists it. A "★ Favorites" filter chip in
Available Players shows just your starred players. Favorites are purely a personal
UI aid - **CPU teams never see or react to your favorites list**, same as a real
opponent wouldn't know your rankings.

### Rankings & Favorites editor (`RankingsScreen.tsx`)

Reachable from the "Rankings & Favorites" button on the Setup screen, or the
Favorites-only shortcut in the in-draft settings menu. Two tabs:

- **Rankings**: search/filter all 268 players, nudge any player up/down or type
  a target rank directly to jump it there. "Save order" persists your edits as a
  full custom order (`customOrder` in `preferencesStorage.ts`) that's layered on
  top of the normally-computed rankings via `applyCustomOrder()` in
  `twoQbAdjustment.ts` — see that function's comment for how it threads
  untouched players back in around your edits. **Only editable before a draft
  starts** (`state.status === 'setup'`) — editing mid-draft would mean
  reconciling already-picked/available player state against a changed ranking,
  which isn't worth the complexity for what's meant to be pre-draft prep.
  Saving calls `refreshRankings()` (see `DraftContext.tsx`), which rebuilds the
  player pool and resets to a fresh setup state.
- **Rankings → Paste an updated cheat sheet**: paste raw ESPN cheat sheet text
  (the same "N. (POS#) Name, TEAM $X Y" row format the original PDF import
  used) and it's parsed client-side with the same regex approach used to import
  the PDF originally. Matches existing RB/WR/TE players by name, previews
  exactly what will be updated/added/removed, and only writes anything on
  explicit "Apply." **QB rows are always ignored** — QBs use the separate
  reserved-slot system (see "2-QB Rank logic" above), not this pipeline. This
  is meant to remove the "upload a zip, get code back" loop for a pure ranking
  refresh — though a genuinely new cheat sheet PDF is still best handled by
  attaching it in a new conversation, since a paste can't include the
  bye-week-table cross-check or catch subtler formatting issues the way a full
  PDF re-extraction can.
- **Favorites tab**: same star-toggle list, plus your current favorites shown
  as removable chips up top.

Note: each player's bye week is still tracked (`Player.bye`, extracted directly
from each player's own PDF row rather than the separate bye-week side table,
since that table's layout doesn't extract cleanly through `pdfplumber`) and
shown as a plain "BYE N" tag in My Roster and Available Players. An earlier
version of this session also added a 3+-on-one-week stack warning banner and
an inline "would make N on bye wk W" flag; both were removed by request as
unwanted UI clutter. If bye-stack warnings come back in a future session,
they're straightforward to re-add against the existing `bye` field.

## Draft History & Stats (`DraftHistoryScreen.tsx`)

Every completed draft is logged (`draftHistoryStorage.ts`, `localStorage`,
best-effort like everything else in this section) as a snapshot: which slot
you drafted from, your full final roster, and — importantly — **which players
were on your favorites list at the moment the draft finished**, not your
current list. Favorites drift over time, so judging an old draft against
today's list would misrepresent it; each entry carries its own snapshot for
that reason (`favoriteIdsAtCompletion` in `DraftHistoryEntry`).

Logging happens via `DraftHistoryLogger.tsx`, a component mounted once at the
app root that watches `state.status` and fires exactly once per completion
(guarded with a ref that resets whenever status leaves `'complete'`, so
neither re-renders nor starting a fresh draft double-log or skip an entry).

`draftHistoryStats.ts` aggregates the raw log into what the screen shows —
covered by `sim/testDraftHistory.ts` (15 assertions against synthetic data,
including a tie-breaking most-drafted-slot case and an entry with zero
favorites set, which correctly excludes itself from capture-rate averages
rather than counting as a 0%):

- **Summary cards**: total drafts completed, most-drafted slot, and an overall
  favorites capture rate (aggregated across every favorited-at-the-time
  instance across all drafts — not an average of per-draft percentages, which
  would over-weight drafts where you'd favorited very few players).
- **By draft slot**: times drafted and average capture rate per slot — this is
  the "real" counterpart to `SlotOddsAnalyzer.tsx`'s simulated version. Over
  enough drafts, worth comparing the two: if reality consistently diverges
  from the simulation, that's a signal the CPU logic doesn't quite match how
  you actually draft in practice.
- **By favorite player**: every player you've ever favorited, how many of
  those drafts they landed on your roster, and the resulting rate — "you've
  gotten Bijan in 6 of 10 drafts" style stats.
- **Past drafts list**: chronological, expandable to the full roster for that
  draft, with a ★ marking which slots were favorites at the time.
- **Clear all history** with a confirm dialog, capped at 200 stored entries
  (`MAX_HISTORY_ENTRIES`) so localStorage never grows unbounded.

Reachable from the Setup screen (next to Rankings & Favorites) and from the
completion screen ("View stats") right after finishing a draft.

## "Check my odds from this slot" (`SlotOddsAnalyzer.tsx` + `oddsWorker.ts`)

On the Setup screen, runs the same kind of simulation from `sim/favoritesSlot.ts`
(see "CPU tuning results" below for the manual version of this we ran earlier)
but live, in the browser, against your actual current favorites list and the
slot you have selected. Strategy for "your team": take your best-ranked
available favorite at each turn (falling back to normal best-value CPU logic
if none qualify); every other team drafts normally, with no knowledge of your
list - same as `favoritesSlot.ts`.

Runs in a Web Worker (`src/workers/oddsWorker.ts`) so the UI thread never
blocks - `cpuLogic.ts`/`twoQbAdjustment.ts`/`rosterLogic.ts`/`snakeOrder.ts`
have no DOM dependencies (verified before building this), so they import into
the worker unmodified, meaning results come from the *exact* same draft logic
the live app uses, not a simplified stand-in. Defaults to 150 trials, which
measured at ~25ms/draft (~3.8s total) in local testing - a progress bar keeps
it from feeling frozen. Results: overall average favorites landed, plus a
per-favorite capture-rate bar for every starred player.

## Player data

`src/data/players.ts` contains 268 skill-position players (QB/RB/WR/TE), based
on the attached ESPN 2026 PPR Top 300 Cheat Sheet (most recently updated from
the **7/31/2026** version of that sheet — see "Player data updates" below).
**K and D/ST entries from the source PDF were intentionally left out**, since
this league format has no kicker or defense roster spots. RB/WR/TE `espnRank`/
`espnPositionRank` are exactly as ESPN printed them — never modified.

**QBs are the one exception.** All 40 QBs' `espnRank` and `espnPositionRank`
values are *reserved rank slots*, not ESPN's own numbers — see "2-QB Rank
logic" below for what that means. As of the 7/31 update, the player occupying
each of those 40 slots matches ESPN's current QB order; the 40 slot numbers
themselves haven't changed since they were first set. 8 QBs aren't in ESPN's
current top-300 at all (Ty Simpson, Michael Penix, J.J. McCarthy, Shedeur
Sanders, Mac Jones, Anthony Richardson, Justin Fields, Garrett Nussmeier) —
those were left exactly as they were, in their existing slots.

## 2-QB Rank logic (tunable)

All quarterback logic lives in one file, `src/data/twoQbAdjustment.ts`. QBs'
`espnRank` values in `players.ts` are **reserved slots**, not just sort keys —
a QB's final `twoQbRank` always exactly equals its `espnRank`. RB/WR/TE
players thread through whatever slots the QBs don't occupy, in their own
relative ESPN order. See the comment block at the top of that file for the
exact algorithm; the short version: QBs are queued by their reserved rank,
skill players are queued by ESPN rank, and we walk final positions 1, 2,
3, ... placing whichever queue's next player is due at that position.

Earlier versions of this file used a tier-boost formula (QB position rank →
target overall rank range) or a plain merge-sort — both let skill players
occasionally push a QB's final position later than the number that was
actually assigned to it. The reserved-slot approach fixed that.

To change how aggressively QBs get boosted relative to RB/WR/TE, edit the
QB `espnRank` values directly in `players.ts` — smaller numbers = earlier
reserved slots = more aggressive.

## Player data updates

When ESPN puts out a new cheat sheet, both the skill-position ranks and the
QB slot assignments can be refreshed:

- **RB/WR/TE**: the skill-position section of `players.ts` is fully
  regenerated from the new sheet — existing players get updated `espnRank`/
  `espnPositionRank`/`team`, players no longer in ESPN's top 300 are removed,
  and any newly-appearing players are added with new IDs. **7/31/2026 update**
  dropped Christian Kirk, Chris Brazzell II, Tyreek Hill, Trey Benson, Kaleb
  Johnson, Kyle Juszczyk, Nick Westbrook-Ikhine, and Hunter Luepke (no longer
  in ESPN's top 300), and added Treylon Burks, Tyquan Thornton, Tyler Badie,
  Tahj Brooks, Kendre Miller, Jawhar Jordan, Marvin Mims Jr., and KaVontae
  Turpin.
- **QB**: if you want the *player* occupying each reserved slot to follow a
  new QB order (e.g. an updated ESPN QB ranking) while keeping the reserved
  slots themselves — and therefore the CPU draft timing/pacing — exactly as
  they are: take the reserved slots currently used by QBs *that appear in the
  new ranking*, sort those slot numbers ascending, and assign the new
  ranking's QB1, QB2, QB3... to them in order. Any QB not present in the new
  ranking keeps its existing slot untouched. **7/31/2026 update**: ESPN's
  sheet only explicitly ranks 32 QBs, so the other 8 (listed above) were left
  alone; the 32 that matched were reassigned across the same 32 reserved
  slots they already occupied, just in ESPN's new order.

  **Manual tweak right after that update**: Drake Maye and Jayden Daniels
  were swapped — Maye now sits in the rank-3 slot, Daniels in the rank-10
  slot (the reverse of what the ESPN-order reassignment above produced).
  Just a direct two-player slot swap in `players.ts`, no change to the
  reserved-slot algorithm itself.

## CPU drafting

Each CPU team scores every available, eligible player and takes the highest score:

```
CPU Score = 2-QB Ranking Value
          + Tier-Cliff Value        (grab the last player before a rank drop-off)
          + Starting Position Need  (scaled by round + a safe-to-wait check)
          + League-Wide Scarcity    (demand vs. remaining supply, all 10 teams)
          - Roster Surplus Penalty  (escalating cost for over-stacking one position)
          + Small Random Adjustment
```

- **Tier-Cliff Value**: rewards taking the last player in a tier before the position's
  rank jumps at that spot, rather than only comparing raw rank. Computed per-position
  from the gap to the next-best available player at that position.
- **Starting Position Need**: no longer a flat bonus. It's scaled by round (light in
  rounds 1–3 so best-player-available wins, normal through the middle rounds, heavier
  in the final rounds to lock in roster construction) and by a pick-distance check —
  if a team has many picks before its next turn *and* the position isn't scarce, the
  bonus is discounted since it's safe to wait; if supply is thin relative to that same
  window, the discount is removed. **QB has its own round curve**: getting to a 2nd QB
  follows the normal curve, but once a team already has 2 QBs, the 3rd (a backup, not
  a starter) stays low-priority until round 7+.
- **League-Wide Scarcity**: generalizes the old QB-only scarcity signal to every
  position, comparing total unmet need across all 10 teams against total remaining
  supply at that position — a better predictor of a position "running dry" than a raw
  headcount.
- **Roster Surplus Penalty**: the other three terms above only ever pull a team
  *toward* a position — nothing pushed back once a real need was satisfied, so raw
  value could still pile up a 2nd/3rd/4th copy of the same position back to back (e.g.
  a team ending the draft with 3 straight TEs). This adds the missing pushback: past a
  generous per-position "comfort ceiling" (RB/WR: 3, TE: 1 — QB is excluded, see
  below), every additional pick at that position costs a bit more than the last. It's
  soft, not a hard block, so a genuinely huge value/cliff pick can still win.

QB is intentionally excluded from the surplus penalty — it's already hard-capped at
exactly 3 (its own target), so there's no "surplus QB" scenario to penalize; the QB3
hard round-gate below is what fixes QB's version of this problem instead.

TE's surplus penalty unit (14 per copy past the ceiling) is more than double RB/WR's
(6) — a 2nd TE should only happen when it's a clear value pick (a notably better rank
than the best available RB/WR at that moment), not just because a team has bench space
left. See "CPU tuning results" below for what this looks like in practice: almost all
2nd-TE picks land in the final 1-2 rounds, when a startable-caliber TE is genuinely
better value than replacement-level bench RB/WR — not stacking, just taking the value
that's there.

All of the bonus/penalty terms above are deliberately modest relative to the 2-QB
Ranking Value (nudges/tie-breakers, not overrides) — the ranking still drives most
picks. Earlier versions used much larger bonuses that caused an artificial round-1 QB
run regardless of ranking.

### Hard rules (run before scoring, not just nudges)

- A team can never draft a 4th QB, and duplicate/drafted players are filtered out of
  the pool before scoring.
- **QB3 round gate**: a team may not draft its 3rd QB (the backup) before round 7,
  full stop — *unless* the endgame constraint pass below has already forced QB into
  the required set because the team is genuinely running out of picks. This exists
  because the QB round-curve above (a soft need multiplier) wasn't enough on its own:
  a 3rd QB with a strong raw 2-QB rank could still out-score a mediocre RB/WR/TE on
  ranking value alone, regardless of how low its need bonus was. Needed a hard rule,
  not just a bigger nudge. See `QB3_MIN_ROUND` in `src/draft/cpuLogic.ts`.
- **Endgame constraint pass**: every team is targeted to finish with 2 starting QBs +
  1 backup (3 total), 2 RB, 2 WR, 1 TE, and 1 FLEX (any extra RB/WR/TE). Once a team
  has only as many picks left as it has unmet required needs, the eligible pool for
  that pick is narrowed to *only* positions still needed — this is what guarantees no
  team ever finishes a draft with an empty required slot (an earlier version could
  occasionally finish a team with zero TEs), and it's also the escape hatch for the
  QB3 round gate above if a team somehow falls behind on QB.
- **Opening-trio rule**: whichever CPU team is on the clock for overall picks 1-3
  must take Josh Allen, Jahmyr Gibbs, or Bijan Robinson — no exceptions, and it's a
  weighted random pick among whichever of the three are still left (Allen 55%, Gibbs
  27%, Bijan 18%), so Allen usually but not always goes first. **CPU-only**: this is
  applied inside `pickForCpuTeam`, which the app never calls for the user's own turn
  — if the user holds pick 1, 2, or 3, they can take anyone. See `OPENING_TRIO_WEIGHTS`
  in `src/draft/cpuLogic.ts`.

This logic lives in `src/draft/cpuLogic.ts`. It was stress-tested with 150 simulated
full 10-team drafts (1,500 team-rosters) with zero empty slots, zero missing TEs, and
every team finishing with exactly 3 QBs.

### CPU tuning results

A repeatable simulation harness lives in `sim/simulate.ts` (run via esbuild + node,
not part of the app bundle — `tsconfig.json` only includes `src`). It plays out full
10-team drafts using the real `pickForCpuTeam` logic and tallies roster-construction
stats. Most recent run, 1,000 simulated drafts (10,000 team-rosters):

| Metric | Before fix | After fix |
|---|---|---|
| Teams with 3 QBs within their first 4 picks | 5.5% | **0.00%** |
| Teams with 3 QBs within their first 6 picks | 10.7% | **0.00%** |
| Teams with 3+ TE total | 3.3% | **1.6%** |
| Teams with 3+ *consecutive* TE picks | 0.4% | **0.1%** |
| Teams finishing with an empty required slot | 0% | 0% |
| Teams NOT finishing with exactly 3 QB | 0% | 0% |

("Before fix" numbers are from re-running the harness against the pre-fix scoring
logic for direct comparison, not from a different session.)

Teams with 2+ TE total stayed roughly flat (~77% either way) — expected and fine, not
a regression. Inspecting individual picks shows why: almost every 2nd-TE pick happens
in round 12-14, when the best remaining TE is genuinely 10-20 ranks better than the
best remaining RB/WR (e.g. taking rank-115 Travis Kelce over a rank-128 replacement
RB in the second-to-last round). That's a real value pick a good drafter would also
make with their last couple of bench spots, not the "3 TEs early/mid-draft" stacking
pattern this tuning targets.

`sim/openingTrio.ts` verifies the opening-trio rule specifically — 2,000 simulated
drafts confirmed the first 3 overall picks are Josh Allen/Jahmyr Gibbs/Bijan Robinson
(in some order) **100.00%** of the time, with Josh Allen going 1st in 53.6% of drafts
(Gibbs 27.9%, Bijan 18.6%) — "usually Allen, not always," as intended.

## Available Players: "your next pick" dividers

The Available Players list (in its default state — `ALL` filter, no search) shows an
inline divider matching ESPN's mock draft UI: `YOUR PICK (R#, P#)`, positioned N
players down the ranked list, where N is however many picks will happen before that
particular one of the user's turns arrives. A divider is shown for **every** remaining
pick of the user's, not just the next one, so scrolling all the way down the list
shows the rough range for each of their upcoming turns for the rest of the draft.
It's a rough guide (CPU teams won't necessarily take the top N players in exact
order) for eyeballing who's likely to still be available at each future turn. Hidden
during a position filter or an active search, since "N players from now" only means
something against the full ranked list. Implemented in `AvailablePlayers.tsx`.

Shown in all three of these situations, not just while a CPU team is on the clock:

- **Before the draft starts** (`awaitingStart`): the first divider points at the
  user's very first pick, so they can scroll and preview the whole draft before
  clicking "Start the draft."
- **While a CPU team is picking**: the first divider points at the user's upcoming
  turn (original behavior), with further dividers below it for every turn after that.
- **During the user's own turn**: dividers start from their turn *after* this one
  (this pick is already being decided), so they can scroll ahead and see the range for
  every future pick while still deciding on the current one.

Late in the draft, several of the user's remaining picks can land past the end of a
shrinking available-players list; those stack together at the bottom rather than
disappearing.

## Known limits of this prototype (by design)

No draft grades, projections, trade tools, advanced analytics, accounts, or online
multiplayer — this is a first, functional prototype meant to be extended later.
