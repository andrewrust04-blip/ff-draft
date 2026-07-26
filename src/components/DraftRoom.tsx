import { useState } from 'react';
import { Users, ClipboardList, LayoutGrid } from 'lucide-react';
import { useDraft } from '../state/DraftContext';
import { DraftHeader } from './DraftHeader';
import { AvailablePlayers } from './AvailablePlayers';
import { MyRoster } from './MyRoster';
import { DraftBoard } from './DraftBoard';
import { CompletionScreen } from './CompletionScreen';
import { PickCarousel } from './PickCarousel';
import { DraftReadyGate } from './DraftReadyGate';
import { useIsMobile } from '../hooks/useIsMobile';

type MobileTab = 'players' | 'roster' | 'board';
const TABS: { key: MobileTab; label: string; Icon: typeof Users }[] = [
  { key: 'players', label: 'Players', Icon: Users },
  { key: 'roster', label: 'My Roster', Icon: ClipboardList },
  { key: 'board', label: 'Board', Icon: LayoutGrid },
];

export function DraftRoom() {
  const { state } = useDraft();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<MobileTab>('players');

  if (isMobile) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {state.awaitingStart && <DraftReadyGate />}
        <div style={{ flexShrink: 0, padding: '10px 10px 0' }}>
          <DraftHeader />
        </div>

        <div style={{ flexShrink: 0, padding: '0 10px 6px' }}>
          <PickCarousel />
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: '0 10px' }}>
          {mobileTab === 'players' &&
            (state.status === 'complete' ? (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                <CompletionScreen />
              </div>
            ) : (
              <AvailablePlayers />
            ))}
          {mobileTab === 'roster' && <MyRoster />}
          {mobileTab === 'board' && <DraftBoard fillHeight />}
        </div>

        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-raised)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {TABS.map(({ key, label, Icon }) => {
            const active = key === mobileTab;
            return (
              <button
                key={key}
                onClick={() => setMobileTab(key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '8px 0 6px',
                  border: 'none',
                  background: 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-faint)',
                  cursor: 'pointer',
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {state.awaitingStart && <DraftReadyGate />}
      <DraftHeader />

      {state.status === 'complete' ? (
        <CompletionScreen />
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <PickCarousel />
          </div>
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
        </>
      )}

      <DraftBoard />
    </div>
  );
}
