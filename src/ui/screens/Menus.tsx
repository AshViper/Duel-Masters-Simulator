import { useEffect, useState } from 'react';
import { DEFAULT_FORMAT, deckCountLabel, isDeckLegal } from '../../core/deck/rules';
import { db, type MatchRecord, type SavedGame } from '../../db/db';
import { useApp } from '../../store/appStore';
import { useBattle } from '../../store/battleStore';

export function Header({ title }: { title: string }) {
  const go = useApp((s) => s.go);
  return (
    <header className="screen-header">
      <button className="ghost" onClick={() => go('home')}>← ホーム</button>
      <h1>{title}</h1>
    </header>
  );
}

export function HomeScreen() {
  const { go, decks, recentDeckIds, editDeck, cards, registry } = useApp();
  const loadGame = useBattle((s) => s.loadGame);
  const [saves, setSaves] = useState<SavedGame[]>([]);
  useEffect(() => {
    void db.savedGames.orderBy('savedAt').reverse().limit(3).toArray().then(setSaves);
  }, []);
  const recent = recentDeckIds.map((id) => decks.find((d) => d.id === id)).filter(Boolean);
  return (
    <div className="home">
      <div className="home-title">
        <div className="logo-mark">◆</div>
        <h1>Card Duel Simulator</h1>
        <p>デッキ構築と対戦のシミュレーター</p>
      </div>
      <nav className="home-menu">
        <button className="primary big" onClick={() => go('setup')} data-testid="menu-battle">対戦開始</button>
        <button className="big" onClick={() => void useApp.getState().newDeck()}>デッキ構築</button>
        <button className="big" onClick={() => go('decks')} data-testid="menu-decks">デッキ一覧</button>
        <button className="big" onClick={() => go('library')} data-testid="menu-library">カード図鑑</button>
        <button className="big" onClick={() => go('official')} data-testid="menu-official">公式カード検索</button>
        <button className="big" onClick={() => go('history')}>対戦履歴</button>
        <button className="big" onClick={() => go('settings')}>設定</button>
      </nav>
      <div className="home-side">
        {cards.length === 0 && (
          <section className="getting-started">
            <h3>はじめに</h3>
            <p className="small">カードがまだありません。「公式カード検索」で使いたいカードを保存すると、デッキ構築と対戦で使えるようになります。</p>
            <button className="primary" onClick={() => go('official')}>公式カード検索へ</button>
          </section>
        )}
        <section>
          <h3>最近使用したデッキ</h3>
          {recent.length === 0 && <p className="muted">まだありません</p>}
          {recent.map((d) => (
            <button key={d!.id} className="list-item" onClick={() => editDeck(d!.id)}>
              {d!.name} <span className="muted">{deckCountLabel(d!, registry)}</span>
            </button>
          ))}
        </section>
        {saves.length > 0 && (
          <section>
            <h3>中断した対戦</h3>
            {saves.map((s) => (
              <button key={s.id} className="list-item" onClick={() => void loadGame(s.id)}>
                {s.title} <span className="muted">{new Date(s.savedAt).toLocaleString()}</span>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

export function DeckListScreen() {
  const { decks, editDeck, duplicateDeck, deleteDeck, newDeck, registry, settings } = useApp();
  return (
    <div className="screen">
      <Header title="デッキ一覧" />
      <div className="toolbar">
        <button className="primary" onClick={() => void newDeck()}>＋ 新しいデッキ</button>
        <button
          onClick={async () => {
            useApp.setState({ pendingTextImport: true });
            await newDeck();
          }}
          data-testid="new-deck-from-text"
        >
          ＋ テキストから作成（AIのデッキリストなど）
        </button>
      </div>
      <div className="deck-grid">
        {decks.map((d) => {
          const legal = isDeckLegal(d, settings.format, registry);
          return (
            <div key={d.id} className="deck-tile">
              <div className="deck-tile-name">{d.name}</div>
              <div className="muted">
                {deckCountLabel(d, registry)} {legal ? <span className="ok">✓ 使用可能</span> : <span className="ng">✗ 構築ルール違反</span>}
              </div>
              <div className="deck-tile-actions">
                <button onClick={() => editDeck(d.id)}>編集</button>
                <button onClick={() => void duplicateDeck(d.id)}>複製</button>
                <button className="danger" onClick={() => confirm(`「${d.name}」を削除しますか？`) && void deleteDeck(d.id)}>削除</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const { settings, updateSettings, clearCustomCards } = useApp();
  const [restricted, setRestricted] = useState(JSON.stringify(settings.format.restricted, null, 1));
  const [err, setErr] = useState('');
  return (
    <div className="screen">
      <Header title="設定" />
      <div className="settings">
        <label>
          CPU の行動間隔（ミリ秒）
          <input type="number" min={0} step={100} value={settings.cpuDelayMs} onChange={(e) => void updateSettings({ cpuDelayMs: Number(e.target.value) })} />
        </label>
        <label>
          デッキ枚数
          <input type="number" min={1} value={settings.format.deckSize} onChange={(e) => void updateSettings({ format: { ...settings.format, deckSize: Number(e.target.value) } })} />
        </label>
        <label>
          同名カードの上限
          <input type="number" min={1} value={settings.format.maxCopies} onChange={(e) => void updateSettings({ format: { ...settings.format, maxCopies: Number(e.target.value) } })} />
        </label>
        <label className="col">
          殿堂レギュレーション（カードID: 上限枚数。殿堂=1、プレミアム殿堂=0）
          <textarea rows={5} value={restricted} onChange={(e) => setRestricted(e.target.value)} />
          <button
            onClick={() => {
              try {
                const v = JSON.parse(restricted || '{}');
                void updateSettings({ format: { ...settings.format, restricted: v } });
                setErr('保存しました');
              } catch {
                setErr('JSON の形式が正しくありません');
              }
            }}
          >
            殿堂リストを保存
          </button>
          {err && <span className="muted">{err}</span>}
        </label>
        <div className="row">
          <button onClick={() => void updateSettings({ format: DEFAULT_FORMAT })}>構築ルールを初期値に戻す</button>
          <button className="danger" onClick={() => confirm('インポートしたカードをすべて削除しますか？') && void clearCustomCards()}>インポートしたカードを削除</button>
        </div>
      </div>
    </div>
  );
}

export function HistoryScreen() {
  const [rows, setRows] = useState<MatchRecord[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    void db.matches.orderBy('playedAt').reverse().limit(50).toArray().then(setRows);
  }, []);
  return (
    <div className="screen">
      <Header title="対戦履歴" />
      {rows.length === 0 && <p className="muted pad">まだ対戦記録がありません</p>}
      <div className="history">
        {rows.map((r) => (
          <div key={r.id} className="history-row">
            <button className="list-item" onClick={() => setOpen(open === r.id ? null : r.id!)}>
              <span>{new Date(r.playedAt).toLocaleString()}</span>
              <span>{r.mode === 'cpu' ? 'CPU戦' : r.mode === 'online' ? 'オンライン' : '1人回し'}</span>
              <span>{r.deckNames.join(' vs ')}</span>
              <span className={r.winner === 0 ? 'ok' : 'ng'}>{r.winner === null ? '引き分け' : r.winner === 0 ? '勝利' : '敗北'}（{r.reason}・{r.turns}ターン）</span>
            </button>
            {open === r.id && (
              <ol className="log small">
                {r.log.map((l, i) => <li key={i} className={l.manual ? 'manual' : ''}>{l.text}</li>)}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
