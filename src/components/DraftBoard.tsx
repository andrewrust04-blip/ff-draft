import { useDraft } from '../state/DraftContext';
import { PositionBadge } from './PositionBadge';
import { TOTAL_ROUNDS, TOTAL_TEAMS } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

function overallPickFor(round: number, teamIndex: number): number {
  const roundZero = round - 1;
  const isEvenRound = roundZero % 2 === 1;
  const slotInRound = isEvenRound ? TOTAL_TEAMS - 1 - teamIndex : teamIndex;
  return roundZero * TOTAL_TEAMS + slotInRound + 1;
}

export function DraftBoard({ fillHeight = false }: { fillHeight?: boolean }) {
  const { state } = useDraft();
  const isMobile = useIsMobile();

  const pickByOverall = new Map(state.picks.map((p) => [p.overallPick, p]));

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        height: fillHeight ? '100%' : undefined,
        display: fillHeight ? 'flex' : undefined,
        flexDirection: fillHeight ? 'column' : undefined,
      }}
    >
      <div style={{ padding: isMobile ? '10px 12px 8px' : '14px 18px 10px', flexShrink: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
          }}
        >
          Draft board
        </div>
      </div>
      <div
        style={{
          overflowX: 'auto',
          overflowY: fillHeight ? 'auto' : undefined,
          flex: fillHeight ? 1 : undefined,
          minHeight: fillHeight ? 0 : undefined,
          paddingBottom: 12,
        }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: isMobile ? 760 : 980 }}>
          <thead>
            <tr>
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  top: 0,
                  zIndex: 2,
                  background: 'var(--bg-raised)',
                  width: 36,
                  padding: '6px 6px',
                  fontSize: 11,
                  color: 'var(--text-faint)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                Rd
              </th>
              {state.teams.map((team) => (
                <th
                  key={team.index}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    background: 'var(--bg-raised)',
                    padding: '8px 6px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: team.isUser ? 'var(--accent)' : 'var(--text-dim)',
                    borderBottom: '1px solid var(--border)',
                    minWidth: isMobile ? 82 : 108,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {team.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((round) => (
              <tr key={round}>
                <td
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: 'var(--bg-raised)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    color: 'var(--text-faint)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {round}
                </td>
                {state.teams.map((team) => {
                  const overallPick = overallPickFor(round, team.index);
                  const pick = pickByOverall.get(overallPick);
                  const isOnTheClock =
                    state.status === 'in-progress' && overallPick === state.currentPick;
                  return (
                    <td
                      key={team.index}
                      style={{
                        padding: isMobile ? '8px 6px' : '5px 6px',
                        borderBottom: '1px solid var(--border)',
                        background: isOnTheClock
                          ? 'var(--accent-glow)'
                          : team.isUser
                          ? 'rgba(62, 207, 110, 0.05)'
                          : 'transparent',
                      }}
                    >
                      {pick ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <PositionBadge position={pick.player.position} />
                          <span
                            style={{
                              fontSize: 12,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: isMobile ? 72 : 96,
                            }}
                            title={pick.player.name}
                          >
                            {pick.player.name}
                          </span>
                        </div>
                      ) : isOnTheClock ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'var(--accent)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          ON CLOCK
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>&mdash;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
