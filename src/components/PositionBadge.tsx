import type { Position } from '../types';

const COLORS: Record<Position, string> = {
  QB: 'var(--pos-qb)',
  RB: 'var(--pos-rb)',
  WR: 'var(--pos-wr)',
  TE: 'var(--pos-te)',
};

export function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 34,
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
        fontFamily: 'var(--font-mono)',
        color: '#0f1216',
        background: COLORS[position],
      }}
    >
      {position}
    </span>
  );
}
