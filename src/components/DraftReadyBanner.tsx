import { useDraft } from '../state/DraftContext';
import { useIsMobile } from '../hooks/useIsMobile';

/**
 * Small inline banner shown right after Start mock draft / Restart, before
 * the draft actually begins. Without this, a user drafting from a late slot
 * would see every CPU pick before their turn fire almost instantly (250ms
 * apart) the moment they land in the draft room. This gives them a beat to
 * click in when ready - deliberately small/inline (not a full-screen modal)
 * so the board underneath is fully visible while they decide.
 */
export function DraftReadyBanner() {
  const { state, dispatch } = useDraft();
  const isMobile = useIsMobile();

  const myTeam = state.teams[state.userTeamIndex];
  const isFirstOverall = state.userTeamIndex === 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        padding: isMobile ? '8px 12px' : '9px 14px',
        marginBottom: isMobile ? 8 : 12,
        background: 'var(--accent-glow)',
        border: '1px solid var(--accent-dim)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <span style={{ fontSize: isMobile ? 12 : 13, color: 'var(--text-dim)', fontWeight: 600 }}>
        {isFirstOverall
          ? "You're on the clock first - CPUs are paused until you start."
          : `CPUs are paused until you start - ${myTeam.name} is up at pick ${state.userTeamIndex + 1}.`}
      </span>
      <button
        onClick={() => dispatch({ type: 'BEGIN_DRAFT' })}
        style={{
          padding: isMobile ? '6px 14px' : '7px 16px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          background: 'var(--accent)',
          color: '#0f1216',
          fontWeight: 700,
          fontSize: isMobile ? 12.5 : 13.5,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Start the draft
      </button>
    </div>
  );
}
