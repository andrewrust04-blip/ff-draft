import { useMemo, useState } from 'react';
import { useDraft } from '../state/DraftContext';
import { PositionBadge } from './PositionBadge';
import type { Position } from '../types';
import { TOTAL_PICKS } from '../types';
import { teamIndexForPick } from '../draft/snakeOrder';
import { isPositionEligible } from '../draft/rosterLogic';
import { suggestBestPick } from '../draft/cpuLogic';
import { useIsMobile } from '../hooks/useIsMobile';

type FilterOption = 'ALL' | Position | 'FLEX';
const FILTERS: FilterOption[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX'];
const FLEX_ELIGIBLE: Position[] = ['RB', 'WR', 'TE'];

export function AvailablePlayers() {
  const { state, dispatch } = useDraft();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const isMobile = useIsMobile();

  const isUsersTurn =
    state.status === 'in-progress' &&
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
    return suggestBestPick({ availablePlayers: state.availablePlayers, roster: myRoster });
  }, [isUsersTurn, myRoster, state.availablePlayers]);

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: isMobile ? '70vh' : '100%',
      }}
    >
      <div style={{ padding: isMobile ? '14px 14px 10px' : '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            marginBottom: 12,
          }}
        >
          Available players
        </div>
        {suggestedPlayer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent)',
              background: 'var(--accent-glow)',
              marginBottom: 10,
            }}
          >
            <PositionBadge position={suggestedPlayer.position} />
            <span style={{ fontSize: isMobile ? 14 : 13, color: 'var(--text)', flex: 1, minWidth: 140 }}>
              <strong>Suggested:</strong> {suggestedPlayer.name}{' '}
              <span style={{ color: 'var(--text-dim)' }}>
                ({suggestedPlayer.team}, 2QB #{suggestedPlayer.twoQbRank})
              </span>
            </span>
            <button
              onClick={() => dispatch({ type: 'DRAFT_PLAYER', playerId: suggestedPlayer.id })}
              style={{
                padding: isMobile ? '10px 16px' : '5px 12px',
                minHeight: isMobile ? 40 : undefined,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--accent)',
                color: '#0f1216',
                fontWeight: 700,
                fontSize: isMobile ? 13 : 12,
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
            padding: isMobile ? '11px 12px' : '9px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontSize: 16,
            marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flex: isMobile ? '1 0 30%' : 1,
                  padding: isMobile ? '10px 0' : '7px 0',
                  minHeight: isMobile ? 40 : undefined,
                  borderRadius: 'var(--radius-sm)',
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-glow)' : 'var(--bg-card)',
                  color: active ? 'var(--accent)' : 'var(--text-dim)',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        <table
          style={{
            width: '100%',
            minWidth: isMobile ? 480 : undefined,
            borderCollapse: 'collapse',
            fontSize: isMobile ? 14 : 13,
          }}
        >
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                background: 'var(--bg-raised)',
                zIndex: 1,
              }}
            >
              {filter === 'FLEX' && <Th align="right">FLEX #</Th>}
              <Th align="right">2QB</Th>
              <Th align="right">ESPN</Th>
              <Th>Player</Th>
              <Th>Pos</Th>
              <Th>Team</Th>
              <Th align="right"> </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
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
                  {filter === 'FLEX' && (
                    <Td align="right" mono>
                      {i + 1}
                    </Td>
                  )}
                  <Td align="right" mono>
                    {p.twoQbRank}
                  </Td>
                  <Td align="right" mono dim>
                    {p.espnRank}
                  </Td>
                  <Td>{p.name}</Td>
                  <Td>
                    <PositionBadge position={p.position} />
                  </Td>
                  <Td dim>{p.team}</Td>
                  <Td align="right">
                    <button
                      disabled={!canDraft}
                      title={qbCapBlocked ? 'QB limit reached (3 max)' : undefined}
                      onClick={() => dispatch({ type: 'DRAFT_PLAYER', playerId: p.id })}
                      style={{
                        padding: isMobile ? '9px 14px' : '5px 12px',
                        minHeight: isMobile ? 38 : undefined,
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: canDraft ? 'var(--accent)' : 'var(--bg-card)',
                        color: canDraft ? '#0f1216' : 'var(--text-faint)',
                        fontWeight: 700,
                        fontSize: isMobile ? 13 : 12,
                        cursor: canDraft ? 'pointer' : 'not-allowed',
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
                <td
                  colSpan={filter === 'FLEX' ? 7 : 6}
                  style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)' }}
                >
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
  const isMobile = useIsMobile();
  return (
    <th
      style={{
        textAlign: align,
        padding: isMobile ? '10px 8px' : '8px 10px',
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
  const isMobile = useIsMobile();
  return (
    <td
      style={{
        textAlign: align,
        padding: isMobile ? '10px 8px' : '8px 10px',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        color: dim ? 'var(--text-dim)' : 'var(--text)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </td>
  );
}
