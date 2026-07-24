import { useState } from 'react';
import { useDraft } from '../state/DraftContext';
import { DraftHeader } from './DraftHeader';
import { AvailablePlayers } from './AvailablePlayers';
import { MyRoster } from './MyRoster';
import { DraftBoard } from './DraftBoard';
import { CompletionScreen } from './CompletionScreen';
import { useIsMobile } from '../hooks/useIsMobile';

type MobileTab = 'players' | 'roster' | 'board';
const TABS: { key: MobileTab; label: string }[] = [
  { key: 'players', label: 'Players' },
  { key: 'roster', label: 'My Roster' },
  { key: 'board', label: 'Board' },
];

export function DraftRoom() {
  const { state } = useDraft();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<MobileTab>('players');

  if (isMobile) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', padding: 10, gap: 8 }}>
        <div style={{ flexShrink: 0 }}>
          <DraftHeader />
        </div>

        {state.status === 'complete' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <CompletionScreen />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {TABS.map((tab) => {
                const active = tab.key === mobileTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setMobileTab(tab.key)}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      minHeight: 38,
                      borderRadius: 'var(--radius-md)',
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'var(--accent-glow)' : 'var(--bg-raised)',
                      color: active ? 'var(--accent)' : 'var(--text-dim)',
                      fontWeight: 700,
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {mobileTab === 'players' && <AvailablePlayers />}
              {mobileTab === 'roster' && <MyRoster />}
              {mobileTab === 'board' && <DraftBoard fillHeight />}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <DraftHeader />

      {state.status === 'complete' ? (
        <CompletionScreen />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 0.9fr)',
            gap: 16,
            marginBottom: 16,
            height: 560,
          }}
        >
          <AvailablePlayers />
          <MyRoster />
        </div>
      )}

      <DraftBoard />
    </div>
  );
}
