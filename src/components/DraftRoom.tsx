import { useDraft } from '../state/DraftContext';
import { DraftHeader } from './DraftHeader';
import { AvailablePlayers } from './AvailablePlayers';
import { MyRoster } from './MyRoster';
import { DraftBoard } from './DraftBoard';
import { CompletionScreen } from './CompletionScreen';
import { useIsMobile } from '../hooks/useIsMobile';

export function DraftRoom() {
  const { state } = useDraft();
  const isMobile = useIsMobile();

  return (
    <div style={{ padding: isMobile ? 10 : 20, maxWidth: 1400, margin: '0 auto' }}>
      <DraftHeader />

      {state.status === 'complete' ? (
        <CompletionScreen />
      ) : (
        <div
          style={
            isMobile
              ? { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }
              : {
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 0.9fr)',
                  gap: 16,
                  marginBottom: 16,
                  height: 560,
                }
          }
        >
          <AvailablePlayers />
          <MyRoster />
        </div>
      )}

      <DraftBoard />
    </div>
  );
}
