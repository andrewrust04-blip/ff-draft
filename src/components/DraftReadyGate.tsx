import { useDraft } from '../state/DraftContext';
import { useIsMobile } from '../hooks/useIsMobile';

/**
 * Full-screen overlay shown right after Start mock draft / Restart, before
 * the draft actually begins. Without this, a user drafting from a late slot
 * would see every CPU pick before their turn fire almost instantly (250ms
 * apart) the moment they land in the draft room. This gives them a real
 * beat to look at the empty board and click in when ready.
 */
export function DraftReadyGate() {
  const { state, dispatch } = useDraft();
  const isMobile = useIsMobile();

  const myTeam = state.teams[state.userTeamIndex];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(10, 12, 15, 0.72)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: isMobile ? '28px 22px' : '36px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.1em',
            color: 'var(--accent)',
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          You're drafting from slot {state.userTeamIndex + 1}
        </div>
        <h2
          style={{
            margin: '0 0 10px',
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 22 : 26,
            fontWeight: 700,
          }}
        >
          Ready when you are
        </h2>
        <p style={{ margin: '0 0 24px', color: 'var(--text-dim)', fontSize: 14.5, lineHeight: 1.55 }}>
          {myTeam.isUser && state.userTeamIndex === 0
            ? "You're picking first — the board is yours."
            : `Nine CPU teams will pick before ${myTeam.name} is on the clock. They stay paused until you click below.`}
        </p>
        <button
          onClick={() => dispatch({ type: 'BEGIN_DRAFT' })}
          style={{
            width: '100%',
            padding: isMobile ? '17px 0' : '15px 0',
            minHeight: isMobile ? 50 : undefined,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--accent)',
            color: '#0f1216',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Start the draft
        </button>
      </div>
    </div>
  );
}
