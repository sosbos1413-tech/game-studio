import { useEffect } from 'react';
import { useGameStore } from './state/gameStore';
import { NewGameScreen } from './features/new-game/NewGameScreen';
import { CrestStudioScreen } from './features/crest-studio/CrestStudioScreen';
import { ManagerDeskScreen } from './features/manager-desk/ManagerDeskScreen';

function App() {
  const screen = useGameStore((s) => s.screen);
  const loadFromStorage = useGameStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
    // Only ever attempt a resume on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-shell">
      {screen === 'new-game' && <NewGameScreen />}
      {screen === 'crest-studio' && <CrestStudioScreen />}
      {screen === 'manager-desk' && <ManagerDeskScreen />}
    </div>
  );
}

export default App;
