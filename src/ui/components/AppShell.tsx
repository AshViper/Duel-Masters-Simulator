import type { ReactNode } from 'react';
import { useApp, type Screen } from '../../store/appStore';

// アプリ全体の枠組み（design/app-ui.md）：左ナビ 64px ＋ 上部バー 48px ＋ メイン。対戦画面だけは枠なしの全画面。

const NAV: { screen: Screen; icon: string; label: string; also?: Screen[] }[] = [
  { screen: 'home', icon: '◆', label: 'ホーム' },
  { screen: 'decks', icon: '▤', label: 'デッキ', also: ['builder'] },
  { screen: 'library', icon: '❖', label: '図鑑' },
  { screen: 'official', icon: '⌕', label: '公式検索' },
  { screen: 'setup', icon: '⚔', label: '対戦' },
  { screen: 'online', icon: '⇄', label: 'オンライン' },
  { screen: 'history', icon: '☰', label: '履歴' },
  { screen: 'settings', icon: '⚙', label: '設定' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { screen, go } = useApp();
  return (
    <div className="app-shell">
      <nav className="app-nav" aria-label="メインメニュー">
        <div className="app-nav-logo" title="Card Duel Simulator">◆</div>
        {NAV.map((n) => {
          const on = n.screen === screen || n.also?.includes(screen);
          return (
            <button key={n.screen} className={'app-nav-item' + (on ? ' on' : '')} onClick={() => go(n.screen)} title={n.label} aria-current={on ? 'page' : undefined}>
              <span className="app-nav-icon" aria-hidden>{n.icon}</span>
              <span className="app-nav-label">{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="app-main">{children}</div>
    </div>
  );
}

/** 上部バー（48px）。右側に画面ごとの操作を置ける */
export function Header({ title, children, sub }: { title: ReactNode; children?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="screen-header">
      <h1>{title}</h1>
      {sub && <div className="screen-header-sub">{sub}</div>}
      {children && <div className="screen-header-actions">{children}</div>}
    </header>
  );
}
