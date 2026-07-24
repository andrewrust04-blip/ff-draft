import { useEffect, useRef } from 'react';
import { useDraft } from '../state/DraftContext';
import { POSITION_COLORS } from './PositionBadge';
import { TOTAL_PICKS } from '../types';
import { roundForPick, teamIndexForPick } from '../draft/snakeOrder';

export function PickCarousel() {
  const { state } = useDraft();
  const containerRef = useRef<HTMLDivElement>(null);

  const pickByOverall = new Map(state.picks.map((p) => [p.overallPick, p]));
  const focusPick = Math.min(state.currentPick, TOTAL_PICKS);

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-pick="${focusPick}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPick]);

  const items: React.ReactNode[] = [];
  let lastRound = 0;

  for (let overallPick = 1; overallPick <= TOTAL_PICKS; overallPick++) {
    const round = roundForPick(overallPick);
    const teamIndex = teamIndexForPick(overallPick);
    const team = state.teams[teamIndex];
    const pick = pickByOverall.get(overallPick);
    const isCurrent = state.status === 'in-progress' && overallPick === state.currentPick;

    if (round !== lastRound) {
      items.push(
        <div
          key={`round-${round}`}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            alignSelf: 'stretch',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-faint)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          R{round}
        </div>
      );
      lastRound = round;
    }

    items.push(
      <div
        key={overallPick}
        data-pick={overallPick}
        style={{
          flexShrink: 0,
          width: 92,
          padding: '6px 8px',
          borderRadius: 'var(--radius-sm)',
          border: isCurrent ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          background: isCurrent
            ? 'var(--accent-glow)'
            : team.isUser
            ? 'rgba(62, 207, 110, 0.05)'
            : 'var(--bg-card)',
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-faint)',
            marginBottom: 2,
          }}
        >
          P{overallPick}
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: team.isUser ? 'var(--accent)' : 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {team.name}
        </div>
        {pick ? (
          <div
            style={{
              fontSize: 10.5,
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: POSITION_COLORS[pick.player.position], fontWeight: 700 }}>
              {pick.player.position}
            </span>{' '}
            <span style={{ color: 'var(--text-dim)' }}>{pick.player.name}</span>
          </div>
        ) : isCurrent ? (
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginTop: 1 }}>
            ON CLOCK
          </div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 1 }}>&mdash;</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        padding: '2px 2px 4px',
      }}
    >
      {items}
    </div>
  );
}
