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
| Player data extracted from the ESPN PDF | `src/data/players.ts` |
| 2-QB ranking adjustment (the tunable QB-boost logic) | `src/data/twoQbAdjustment.ts` |
| Snake draft order math | `src/draft/snakeOrder.ts` |
| CPU pick scoring/selection | `src/draft/cpuLogic.ts` |
| Roster slot auto-assignment | `src/draft/rosterLogic.ts` |
| Draft state (reducer + actions) | `src/state/draftReducer.ts` |
| React context wiring + CPU auto-pick timer | `src/state/DraftContext.tsx` |
| Shared types | `src/types.ts` |
| UI components | `src/components/*.tsx` |

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
