import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useDraft } from '../state/DraftContext';
import { useRankingsUI } from '../state/RankingsUIContext';
import { TOTAL_ROUNDS, TOTAL_TEAMS } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { SlotOddsAnalyzer } from './SlotOddsAnalyzer';

export function SetupScreen() {
  const { dispatch } = useDraft();
  const { openRankings } = useRankingsUI();
  const [selectedSlot, setSelectedSlot] = useState(1);
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 12 : 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: isMobile ? '28px 20px' : '40px 36px',
        }}
      >
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.12em',
              color: 'var(--accent)',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            2-QB Mock Draft
          </span>
        </div>
        <h1
          style={{
            margin: '0 0 6px',
            fontFamily: 'var(--font-display)',
            fontSize: isMobile ? 26 : 34,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          Set the board
        </h1>
        <p style={{ margin: '0 0 20px', color: 'var(--text-dim)', lineHeight: 1.5, fontSize: 15 }}>
          {TOTAL_TEAMS}-team, full PPR, 2-QB snake draft &middot; {TOTAL_ROUNDS} rounds &middot; nine
          CPU teams draft against you, on the clock automatically.
        </p>

        <button
          onClick={() => openRankings('rankings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '11px 0',
            marginBottom: 28,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={15} />
          Rankings &amp; Favorites
        </button>

        <div style={{ marginBottom: 28 }}>
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
            Choose your draft slot
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
            }}
          >
            {Array.from({ length: TOTAL_TEAMS }).map((_, i) => {
              const slot = i + 1;
              const active = slot === selectedSlot;
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  style={{
                    padding: isMobile ? '16px 0' : '14px 0',
                    minHeight: isMobile ? 48 : undefined,
                    borderRadius: 'var(--radius-md)',
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: active ? 'var(--accent-glow)' : 'var(--bg-card)',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: 'pointer',
                    transition: 'background 120ms, border-color 120ms',
                  }}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <SlotOddsAnalyzer slot={selectedSlot} />
        </div>

        <button
          onClick={() => dispatch({ type: 'START_DRAFT', userTeamIndex: selectedSlot - 1 })}
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
          Start mock draft from slot {selectedSlot}
        </button>

        <button
          onClick={() => dispatch({ type: 'RESET_TO_SETUP' })}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '10px 0',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-faint)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Reset saved draft
        </button>
      </div>
    </div>
  );
}
