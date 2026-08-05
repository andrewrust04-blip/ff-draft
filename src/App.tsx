import { DraftProvider, useDraft } from './state/DraftContext';
import { FavoritesProvider } from './state/FavoritesContext';
import { RankingsUIProvider } from './state/RankingsUIContext';
import { DraftHistoryUIProvider } from './state/DraftHistoryUIContext';
import { DraftHistoryLogger } from './state/DraftHistoryLogger';
import { SetupScreen } from './components/SetupScreen';
import { DraftRoom } from './components/DraftRoom';
import { RankingsScreen } from './components/RankingsScreen';
import { DraftHistoryScreen } from './components/DraftHistoryScreen';

function AppInner() {
  const { state } = useDraft();
  return (
    <>
      {state.status === 'setup' ? <SetupScreen /> : <DraftRoom />}
      <RankingsScreen />
      <DraftHistoryScreen />
      <DraftHistoryLogger />
    </>
  );
}

export default function App() {
  return (
    <FavoritesProvider>
      <DraftProvider>
        <RankingsUIProvider>
          <DraftHistoryUIProvider>
            <AppInner />
          </DraftHistoryUIProvider>
        </RankingsUIProvider>
      </DraftProvider>
    </FavoritesProvider>
  );
}
