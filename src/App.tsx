import { DraftProvider, useDraft } from './state/DraftContext';
import { SetupScreen } from './components/SetupScreen';
import { DraftRoom } from './components/DraftRoom';

function AppInner() {
  const { state } = useDraft();
  return state.status === 'setup' ? <SetupScreen /> : <DraftRoom />;
}

export default function App() {
  return (
    <DraftProvider>
      <AppInner />
    </DraftProvider>
  );
}
