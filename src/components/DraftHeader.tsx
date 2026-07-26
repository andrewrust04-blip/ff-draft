import { useEffect, useRef, useState } from 'react';
import { Settings, Pause, Play, Undo2, RotateCcw } from 'lucide-react';
import { useDraft } from '../state/DraftContext';
import { TOTAL_PICKS } from '../types';
import { roundForPick, teamIndexForPick } from '../draft/snakeOrder';
import { useIsMobile } from '../hooks/useIsMobile';

export function DraftHeader() {
  const { state, dispatch } = useDraft();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pickNum = Math.min(state.currentPick, TOTAL_PICKS);
  const round = roundForPick(pickNum);
  const onTheClockTeam =
    state.status === 'in-progress' && state.currentPick <= TOTAL_PICKS
      ? state.teams[teamIndexForPick(state.currentPick)]
      : null;

  const canUndo = state.picks.length > 0;
  const isComplete = state.status === 'complete';

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

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
        position: 'relative',
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

      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Draft settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? 34 : 38,
            height: isMobile ? 34 : 38,
            borderRadius: '50%',
            border: '1px solid var(--border)',
            background: menuOpen ? 'var(--bg-card-hover)' : 'var(--bg-card)',
            color: 'var(--text-dim)',
            cursor: 'pointer',
          }}
        >
          <Settings size={isMobile ? 17 : 19} />
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 168,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              zIndex: 20,
            }}
          >
            {state.cpuPaused ? (
              <MenuItem
                icon={<Play size={16} />}
                label="Resume"
                disabled={isComplete}
                onClick={() => {
                  dispatch({ type: 'RESUME_CPU' });
                  setMenuOpen(false);
                }}
              />
            ) : (
              <MenuItem
                icon={<Pause size={16} />}
                label="Pause"
                disabled={isComplete}
                onClick={() => {
                  dispatch({ type: 'PAUSE_CPU' });
                  setMenuOpen(false);
                }}
              />
            )}
            <MenuItem
              icon={<Undo2 size={16} />}
              label="Undo pick"
              disabled={!canUndo}
              onClick={() => {
                dispatch({ type: 'UNDO_PICK' });
                setMenuOpen(false);
              }}
            />
            <MenuItem
              icon={<RotateCcw size={16} />}
              label="Restart"
              danger
              onClick={() => {
                dispatch({ type: 'RESTART_DRAFT' });
                setMenuOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 14px',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        background: 'transparent',
        color: disabled ? 'var(--text-faint)' : danger ? 'var(--danger)' : 'var(--text)',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
