import { useMemo, useState } from 'react';
import { useDraft } from '../state/DraftContext';
import { PositionBadge, POSITION_COLORS } from './PositionBadge';
import type { Position } from '../types';
import { TOTAL_PICKS } from '../types';
import { teamIndexForPick } from '../draft/snakeOrder';
import { isPositionEligible } from '../draft/rosterLogic';
import { suggestBestPick } from '../draft/cpuLogic';
import { useIsMobile } from '../hooks/useIsMobile';

type FilterOption = 'ALL' | Position | 'FLEX';
const FILTERS: { value: FilterOption; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'QB', label: 'QB' },
  { value: 'RB', label: 'RB' },
  { value: 'WR', label: 'WR' },
  { value: 'TE', label: 'TE' },
  { value: 'FLEX', label: 'FLEX' },
];
const FLEX_ELIGIBLE: Position[] = ['RB', 'WR', 'TE'];

export function AvailablePlayers() {
  const { state, dispatch } = useDraft();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const isMobile = useIsMobile();

  const isUsersTurn =
    state.status === 'in-progress' &&
    !state.awaitingStart &&
    state.currentPick <= TOTAL_PICKS &&
    teamIndexForPick(state.currentPick) === state.userTeamIndex;

  const myRoster = state.teams[state.userTeamIndex]?.roster;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.availablePlayers.filter((p) => {
      if (filter === 'FLEX') {
        if (!FLEX_ELIGIBLE.includes(p.position)) return false;
      } else if (filter !== 'ALL' && p.position !== filter) {
        return false;
      }
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [state.availablePlayers, query, filter]);

  // Suggested pick: same scoring model the CPU uses, applied to the user's
  // own roster, so it reflects real positional need (won't suggest a 4th QB,
  // leans toward open starting slots, etc). Deterministic - no jitter - so
  // it doesn't change on every render.
  const suggestedPlayer = useMemo(() => {
    if (!isUsersTurn || !myRoster) return null;
    return suggestBestPick({
      availablePlayers: state.availablePlayers,
      roster: myRoster,
      teams: state.teams,
      teamIndex: state.userTeamIndex,
      currentPick: state.currentPick,
    });
  }, [isUsersTurn, myRoster, state.availablePlayers, state.teams, state.userTeamIndex, state.currentPick]);

  const hasActiveFilters = filter !== 'ALL' || query.trim().length > 0;

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <div style={{ padding: isMobile ? '10px 10px 8px' : '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
        {suggestedPlayer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isMobile ? '6px 8px' : '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent)',
              background: 'var(--accent-glow)',
              marginBottom: 8,
            }}
          >
            <PositionBadge position={suggestedPlayer.position} />
            <span style={{ fontSize: isMobile ? 12.5 : 13, color: 'var(--text)', flex: 1, minWidth: 0 }}>
              <strong>Suggested:</strong> {suggestedPlayer.name}
              {!isMobile && <span style={{ color: 'var(--text-dim)' }}> ({suggestedPlayer.team})</span>}
            </span>
            <button
              onClick={() => dispatch({ type: 'DRAFT_PLAYER', playerId: suggestedPlayer.id })}
              style={{
                padding: isMobile ? '7px 14px' : '5px 14px',
                minHeight: isMobile ? 30 : undefined,
                borderRadius: 999,
                border: 'none',
                background: 'var(--accent)',
                color: '#08110b',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Draft
            </button>
          </div>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player name..."
          style={{
            width: '100%',
            padding: isMobile ? '8px 10px' : '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: 16,
            marginBottom: 8,
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{
                  flex: '1 0 auto',
                  minWidth: 44,
                  padding: '5px 8px',
                  minHeight: 26,
                  borderRadius: 999,
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-glow)' : 'var(--bg-card)',
                  color: active ? 'var(--accent)' : 'var(--text-dim)',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            );
          })}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilter('ALL');
                setQuery('');
              }}
              style={{
                marginLeft: 4,
                border: 'none',
                background: 'transparent',
                color: 'var(--link)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '5px 2px',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? 14 : 13 }}>
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--bg-raised)',
                zIndex: 1,
              }}
            >
              <Th align="right">RK</Th>
              <Th>Player</Th>
              <Th align="right"> </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isSuggested = suggestedPlayer?.id === p.id;
              const qbCapBlocked = !!myRoster && !isPositionEligible(myRoster, p.position);
              const canDraft = isUsersTurn && !qbCapBlocked;
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isSuggested ? 'var(--accent-glow)' : undefined,
                  }}
                >
                  <Td align="right" mono dim>
                    {p.twoQbRank}
                  </Td>
                  <Td>
                    <div style={{ color: 'var(--link)', fontWeight: 600, fontSize: isMobile ? 14 : 13.5 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11.5, marginTop: 1 }}>
                      <span style={{ color: 'var(--text-faint)' }}>{p.team}</span>{' '}
                      <span style={{ color: POSITION_COLORS[p.position], fontWeight: 700 }}>
                        {p.position}
                      </span>
                    </div>
                  </Td>
                  <Td align="right">
                    <button
                      disabled={!canDraft}
                      title={qbCapBlocked ? 'QB limit reached (3 max)' : undefined}
                      onClick={() => dispatch({ type: 'DRAFT_PLAYER', playerId: p.id })}
                      style={{
                        padding: isMobile ? '8px 14px' : '5px 14px',
                        minHeight: isMobile ? 34 : undefined,
                        borderRadius: 999,
                        border: canDraft ? 'none' : '1px solid var(--border-strong)',
                        background: canDraft ? 'var(--accent)' : 'transparent',
                        color: canDraft ? '#08110b' : 'var(--text-faint)',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: canDraft ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Draft
                    </button>
                  </Td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)' }}>
                  No players match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '8px 10px',
        fontSize: 11,
        color: 'var(--text-faint)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono = false,
  dim = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  mono?: boolean;
  dim?: boolean;
}) {
  return (
    <td
      style={{
        textAlign: align,
        padding: '8px 10px',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        color: dim ? 'var(--text-dim)' : 'var(--text)',
        verticalAlign: 'middle',
      }}
    >
      {children}
    </td>
  );
}
