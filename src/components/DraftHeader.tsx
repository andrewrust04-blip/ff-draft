import { useDraft } from '../state/DraftContext';
import { TOTAL_PICKS } from '../types';
import { roundForPick, teamIndexForPick } from '../draft/snakeOrder';
import { useIsMobile } from '../hooks/useIsMobile';

export function DraftHeader() {
  const { state, dispatch } = useDraft();
  const isMobile = useIsMobile();

  const pickNum = Math.min(state.currentPick, TOTAL_PICKS);
  const round = roundForPick(pickNum);
  const onTheClockTeam =
    state.status === 'in-progress' && state.currentPick <= TOTAL_PICKS
      ? state.teams[teamIndexForPick(state.currentPick)]
      : null;

  const canUndo = state.picks.length > 0;
  const isComplete = state.status === 'complete';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '10px 12px' : '14px 20px',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: isMobile ? 8 : 16,
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-faint)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {isComplete ? 'Draft complete' : `Round ${round}`}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 16 : 22, fontWeight: 700 }}>
            {isComplete ? `${TOTAL_PICKS} picks made` : `Pick ${state.currentPick} of ${TOTAL_PICKS}`}
          </div>
        </div>
        {onTheClockTeam && (
          <div
            style={{
              padding: isMobile ? '4px 10px' : '6px 14px',
              borderRadius: 'var(--radius-md)',
              background: onTheClockTeam.isUser ? 'var(--accent-glow)' : 'var(--bg-card)',
              color: onTheClockTeam.isUser ? 'var(--accent)' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            On the clock: {onTheClockTeam.name}
            {state.cpuPaused && !onTheClockTeam.isUser ? ' (paused)' : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, width: isMobile ? '100%' : undefined }}>
        {state.cpuPaused ? (
          <ControlButton onClick={() => dispatch({ type: 'RESUME_CPU' })} disabled={isComplete}>
            Resume
          </ControlButton>
        ) : (
          <ControlButton onClick={() => dispatch({ type: 'PAUSE_CPU' })} disabled={isComplete}>
            Pause
          </ControlButton>
        )}
        <ControlButton onClick={() => dispatch({ type: 'UNDO_PICK' })} disabled={!canUndo}>
          Undo
        </ControlButton>
        <ControlButton
          onClick={() => dispatch({ type: 'RESTART_DRAFT' })}
          variant="danger"
        >
          Restart
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  disabled = false,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  const isMobile = useIsMobile();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: isMobile ? '8px 10px' : '9px 16px',
        minHeight: isMobile ? 34 : undefined,
        flex: isMobile ? 1 : undefined,
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${variant === 'danger' ? 'var(--danger-dim)' : 'var(--border)'}`,
        background: disabled ? 'var(--bg-card)' : 'var(--bg-card-hover)',
        color: disabled ? 'var(--text-faint)' : variant === 'danger' ? 'var(--danger)' : 'var(--text)',
        fontWeight: 600,
        fontSize: isMobile ? 11.5 : 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
