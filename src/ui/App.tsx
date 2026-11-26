import { useEffect } from 'react';
import { useApp } from '../store/appStore';
import { BattleScreen } from './screens/Battle';
import { BattleSetupScreen } from './screens/BattleSetup';
import { DeckBuilderScreen } from './screens/DeckBuilder';
import { LibraryScreen } from './screens/Library';
import { OfficialSearchScreen } from './screens/OfficialSearch';
import { OnlineScreen } from './screens/Online';
import { DeckListScreen, HistoryScreen, HomeScreen, SettingsScreen } from './screens/Menus';
import { useBridgeConnected } from './officialBridge';
import { BridgeImport } from './components/BridgeImport';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <>
      <BridgeImport />
      <Shell />
    </>
  );
}

/** 対戦画面は全画面、それ以外は左ナビつきの枠に入れる */
function Shell() {
  const screen = useApp((s) => s.screen);
  if (screen === 'battle') return <CurrentScreen />;
  return (
    <AppShell>
      <CurrentScreen />
    </AppShell>
  );
}

function CurrentScreen() {
  const { screen, ready, init, editingDeckId, go } = useApp();
  useEffect(() => {
    void init();
  }, [init]);
  // ブックマークレットで公式サイトから開かれたら、ホームから公式カード検索へ進む
  const bridged = useBridgeConnected();
  useEffect(() => {
    if (bridged && ready && useApp.getState().screen === 'home') go('official');
  }, [bridged, ready, go]);
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
