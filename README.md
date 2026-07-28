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
on the attached ESPN 2026 PPR Top 300 Cheat Sheet. **K and D/ST entries from the
source PDF were intentionally left out**, since this league format has no kicker
or defense roster spots. RB/WR/TE `espnRank`/`espnPositionRank` are exactly as
ESPN printed them — never modified.

**QBs are the one exception.** All 40 QBs' `espnRank` and `espnPositionRank`
were overwritten to match a separate, more accurate/current QB rankings source
(not ESPN's own QB order), since that's what league mates actually reference
for mock drafts. 8 QBs absent from the original ESPN PDF extraction (Ty Simpson,
Michael Penix, J.J. McCarthy, Shedeur Sanders, Mac Jones, Anthony Richardson,
Justin Fields, Garrett Nussmeier) were added to support this. Deshaun Watson
wasn't in the new source, so his original ESPN-derived rank was left as-is.
The 2-QB tier-boost logic downstream is unaffected — it just now operates on
this QB order instead of ESPN's.

## 2-QB Rank logic (tunable)

All quarterback-boost logic lives in one file, `src/data/twoQbAdjustment.ts`, with
a `QB_TIERS` table you can edit directly:

- QB position rank 1–3 (elite QB1s) → target overall rank 1–9 (Round 1)
- QB position rank 4–8 (strong QB1s) → target overall rank 10–30 (Rounds 1–3)
- QB position rank 9–15 (mid starters) → target overall rank 31–55 (Rounds 3–6)
- QB position rank 16–24 (lower starters) → target overall rank 56–95 (Rounds 6–10)
- QB position rank 25+ (backups/uncertain) → smaller boost: original ESPN rank × 0.75

RB/WR/TE players are **not** re-ranked — they keep the exact same relative order
ESPN gave them; only their position in the merged list shifts as QBs move up
around them.

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
  a starter) stays low-priority until round 7+ — without this, the normal curve's jump
  from round 3 to round 4 made teams rush a 3rd QB the moment round 4 started, which is
  how a team could end up with 3 QBs in its first 4 picks.
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
exactly 3 (its own target), so there's no "surplus QB" scenario to penalize; the QB
round-curve change above is what fixes QB's version of this problem instead.

All of the bonus/penalty terms above are deliberately modest relative to the 2-QB
Ranking Value (nudges/tie-breakers, not overrides) — the ranking still drives most
picks. Earlier versions used much larger bonuses that caused an artificial round-1 QB
run regardless of ranking.

### Hard rules (run before scoring, not just nudges)

- A team can never draft a 4th QB, and duplicate/drafted players are filtered out of
  the pool before scoring.
- **Endgame constraint pass**: every team is targeted to finish with 2 starting QBs +
  1 backup (3 total), 2 RB, 2 WR, 1 TE, and 1 FLEX (any extra RB/WR/TE). Once a team
  has only as many picks left as it has unmet required needs, the eligible pool for
  that pick is narrowed to *only* positions still needed — this is what guarantees no
  team ever finishes a draft with an empty required slot (an earlier version could
  occasionally finish a team with zero TEs).

This logic lives in `src/draft/cpuLogic.ts`. It was stress-tested with 150 simulated
full 10-team drafts (1,500 team-rosters) with zero empty slots, zero missing TEs, and
every team finishing with exactly 3 QBs. The roster-balance fix above was separately
verified against 30 simulated drafts (300 team-rosters): teams finishing with 3+
consecutive TE picks dropped to 1%, and teams with 3+ QBs in their first 4 picks
dropped to 6.3% (both were a reliable, near-every-draft pattern before the fix).

## Available Players: "your next pick" divider

While it isn't the user's turn, the Available Players list (in its default state —
`ALL` filter, no search) shows an inline divider matching ESPN's mock draft UI:
`YOUR PICK (R#, P#)`, positioned N players down the ranked list, where N is however
many picks will happen before the user is back on the clock. It's a rough guide (CPU
teams won't necessarily take the top N players in exact order) for eyeballing who's
likely to still be available next turn versus who probably won't be. Hidden during a
position filter or an active search, since "N players from now" only means something
against the full ranked list. Implemented in `AvailablePlayers.tsx`.

## Known limits of this prototype (by design)

No draft grades, projections, trade tools, advanced analytics, accounts, or online
multiplayer — this is a first, functional prototype meant to be extended later.
