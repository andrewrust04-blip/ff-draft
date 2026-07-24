import { useDraft } from '../state/DraftContext';
import { PositionBadge } from './PositionBadge';
import { STARTING_SLOTS, BENCH_SLOTS } from '../types';
import { countByPosition } from '../draft/rosterLogic';
import { useIsMobile } from '../hooks/useIsMobile';

export function MyRoster() {
  const { state } = useDraft();
  const myTeam = state.teams[state.userTeamIndex];
  const counts = countByPosition(myTeam.roster);
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div style={{ padding: isMobile ? '10px 10px 8px' : '16px 18px 12px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            marginBottom: isMobile ? 6 : 10,
          }}
        >
          My roster
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          <CountBadge label="QB" value={counts.QB} />
          <CountBadge label="RB" value={counts.RB} />
          <CountBadge label="WR" value={counts.WR} />
          <CountBadge label="TE" value={counts.TE} />
        </div>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: isMobile ? '6px 10px 12px' : '8px 12px 16px' }}>
        <SlotGroup label="Starters" slots={STARTING_SLOTS} roster={myTeam.roster} />
        <SlotGroup label="Bench" slots={BENCH_SLOTS} roster={myTeam.roster} />
      </div>
    </div>
  );
}

function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span style={{ color: 'var(--text-dim)' }}>
      {label} <span style={{ color: 'var(--text)', fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function SlotGroup({
  label,
  slots,
  roster,
}: {
  label: string;
  slots: readonly string[];
  roster: ReturnType<typeof useDraft>['state']['teams'][number]['roster'];
}) {
  const isMobile = useIsMobile();
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
          margin: '10px 4px 6px',
        }}
      >
        {label}
      </div>
      {slots.map((slot) => {
        const player = roster[slot as keyof typeof roster];
        return (
          <div
            key={slot}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isMobile ? '10px 8px' : '8px 8px',
              borderRadius: 'var(--radius-sm)',
              background: player ? 'var(--bg-card)' : 'transparent',
              border: player ? '1px solid var(--border)' : '1px dashed var(--border)',
              marginBottom: 5,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-faint)',
                width: 56,
                flexShrink: 0,
              }}
            >
              {slot}
            </span>
            {player ? (
              <>
                <PositionBadge position={player.position} />
                <span style={{ fontSize: isMobile ? 14.5 : 13.5, flex: 1 }}>{player.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{player.team}</span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                Open
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
