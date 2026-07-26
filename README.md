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
          + Starting Position Need
          + Quarterback Scarcity
          + Small Random Adjustment
```

The Starting Position Need and Quarterback Scarcity terms are deliberately small
(tie-breakers, roughly a handful of rank-points) relative to the 2-QB Ranking Value,
since the ranking already moves QBs up the board by tier. Earlier versions used much
larger bonuses that caused an artificial round-1 QB run regardless of ranking — now
the ranking drives the pick, and need/scarcity only nudge between similarly-ranked
options.

Hard rules on top of the score: a team can never draft a 4th QB, and duplicate/drafted
players are filtered out of the pool before scoring. This logic lives in
`src/draft/cpuLogic.ts`.

## Known limits of this prototype (by design)

No draft grades, projections, trade tools, advanced analytics, accounts, or online
multiplayer — this is a first, functional prototype meant to be extended later.
