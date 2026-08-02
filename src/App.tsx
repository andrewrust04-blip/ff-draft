import { DraftProvider, useDraft } from './state/DraftContext';
import { FavoritesProvider } from './state/FavoritesContext';
import { RankingsUIProvider } from './state/RankingsUIContext';
import { SetupScreen } from './components/SetupScreen';
import { DraftRoom } from './components/DraftRoom';
import { RankingsScreen } from './components/RankingsScreen';

function AppInner() {
  const { state } = useDraft();
  return (
    <>
      {state.status === 'setup' ? <SetupScreen /> : <DraftRoom />}
      <RankingsScreen />
    </>
  );
}

export default function App() {
  return (
    <FavoritesProvider>
      <DraftProvider>
        <RankingsUIProvider>
          <AppInner />
        </RankingsUIProvider>
      </DraftProvider>
    </FavoritesProvider>
  );
}
