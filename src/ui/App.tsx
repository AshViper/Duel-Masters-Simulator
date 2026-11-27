import { useEffect } from 'react';
import { useApp } from '../store/appStore';
import { repairBackImages } from '../store/officialCards';
import { BattleScreen } from './screens/Battle';
import { BattleSetupScreen } from './screens/BattleSetup';
import { DeckBuilderScreen } from './screens/DeckBuilder';
import { LibraryScreen } from './screens/Library';
import { OfficialSearchScreen } from './screens/OfficialSearch';
import { OnlineScreen } from './screens/Online';
import { DeckListScreen, HistoryScreen, HomeScreen, SettingsScreen } from './screens/Menus';
import { useBridgeConnected, useBridgeKind } from './officialBridge';
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
    // 起動後、裏面の画像が抜けている公式カード（禁断・サイキック）の画像を裏で取り直す
    void init().then(() => repairBackImages());
  }, [init]);
  // ブックマークレットで公式サイトから開かれたら、ホームから公式カード検索へ進む
  // （ユーザースクリプトは開くたびに自動でつながるので、その時は進まない）
  const bridged = useBridgeConnected();
  const bridgeKind = useBridgeKind();
  useEffect(() => {
    if (bridgeKind === 'tab' && ready && useApp.getState().screen === 'home') go('official');
  }, [bridgeKind, ready, go]);
  // 公開版では中継（ブックマークレット）がつながってから公式へアクセスできるので、つながった時にも取り直す
  useEffect(() => {
    if (bridged && ready) void repairBackImages();
  }, [bridged, ready]);
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
