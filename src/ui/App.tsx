import { useEffect } from 'react';
import { useApp } from '../store/appStore';
import { BattleScreen } from './screens/Battle';
import { BattleSetupScreen } from './screens/BattleSetup';
import { DeckBuilderScreen } from './screens/DeckBuilder';
import { LibraryScreen } from './screens/Library';
import { OfficialSearchScreen } from './screens/OfficialSearch';
import { OnlineScreen } from './screens/Online';
import { DeckListScreen, HistoryScreen, HomeScreen, SettingsScreen } from './screens/Menus';

export function App() {
  const { screen, ready, init, editingDeckId } = useApp();
  useEffect(() => {
    void init();
  }, [init]);
  if (!ready) return <div className="loading">読み込み中…</div>;
  switch (screen) {
    case 'home':
      return <HomeScreen />;
    case 'decks':
      return <DeckListScreen />;
    case 'builder':
      return <DeckBuilderScreen key={editingDeckId ?? ''} />;
    case 'library':
      return <LibraryScreen />;
    case 'setup':
      return <BattleSetupScreen />;
    case 'battle':
      return <BattleScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'official':
      return <OfficialSearchScreen />;
    case 'online':
      return <OnlineScreen />;
  }
}
