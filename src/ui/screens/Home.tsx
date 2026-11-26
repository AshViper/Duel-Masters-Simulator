import { useEffect, useState } from 'react';
import type { CardRegistry } from '../../core/cards/registry';
import { CIV_LABEL, type CardDefinition, type Civilization } from '../../core/cards/types';
import { deckCountLabel, isDeckLegal, type Deck } from '../../core/deck/rules';
import { db, type SavedGame } from '../../db/db';
import { useApp } from '../../store/appStore';
import { useBattle } from '../../store/battleStore';
import { Header } from '../components/AppShell';
import { CardView, CIV_COLOR } from '../components/CardView';

/** デッキの代表カード（コストが一番高いカード）と文明ごとの枚数 */
function deckSummary(d: Deck, registry: CardRegistry) {
  let cover: CardDefinition | undefined;
  const civ = new Map<Civilization, number>();
  for (const [id, n] of Object.entries(d.cards)) {
    const c = registry[id];
    if (!c) continue;
    if (!cover || c.cost > cover.cost || (c.cost === cover.cost && !cover.imageRef && c.imageRef)) cover = c;
    for (const v of c.civilizations) civ.set(v, (civ.get(v) ?? 0) + n);
  }
  return { cover, civ: [...civ.entries()].sort((a, b) => b[1] - a[1]) };
}

function CivDots({ civ }: { civ: [Civilization, number][] }) {
  return (
    <span className="civ-dots">
      {civ.map(([c, n]) => (
        <span key={c} style={{ ['--c' as string]: CIV_COLOR[c] }} title={`${CIV_LABEL[c]} ${n}枚`}>
          {CIV_LABEL[c]}
          <b>{n}</b>
        </span>
      ))}
    </span>
  );
}

const HOME_MENU: { icon: string; label: string; desc: string; testId?: string; primary?: boolean; run: () => void }[] = [
  { icon: '⚔', label: '対戦開始', desc: 'CPU戦・1人回し', testId: 'menu-battle', primary: true, run: () => useApp.getState().go('setup') },
  { icon: '✚', label: 'デッキ構築', desc: '新しいデッキを作る', run: () => void useApp.getState().newDeck() },
  { icon: '▤', label: 'デッキ一覧', desc: '保存したデッキ', testId: 'menu-decks', run: () => useApp.getState().go('decks') },
  { icon: '❖', label: 'カード図鑑', desc: '保存したカード・バックアップ', testId: 'menu-library', run: () => useApp.getState().go('library') },
  { icon: '⌕', label: '公式カード検索', desc: 'カードを探して保存', testId: 'menu-official', run: () => useApp.getState().go('official') },
  { icon: '⇄', label: 'オンライン対戦', desc: '部屋コードで友達と', run: () => useApp.getState().go('online') },
  { icon: '☰', label: '対戦履歴', desc: '過去の対戦とログ', run: () => useApp.getState().go('history') },
  { icon: '⚙', label: '設定', desc: '構築ルール・CPU', run: () => useApp.getState().go('settings') },
];

export function HomeScreen() {
  const { go, decks, recentDeckIds, editDeck, cards, registry } = useApp();
  const loadGame = useBattle((s) => s.loadGame);
  const [saves, setSaves] = useState<SavedGame[]>([]);
  useEffect(() => {
    void db.savedGames.orderBy('savedAt').reverse().limit(3).toArray().then(setSaves);
  }, []);
  const recent = recentDeckIds.map((id) => decks.find((d) => d.id === id)).filter((d): d is Deck => !!d);
  return (
    <div className="screen home">
      <Header title="ホーム" sub={<span className="muted">保存カード {cards.length}枚 ・ デッキ {decks.length}個</span>} />
      <div className="home-body">
        <section className="home-hero">
          <div className="logo-mark">◆</div>
          <div>
            <h2>Card Duel Simulator</h2>
            <p>デッキ構築と対戦のシミュレーター</p>
          </div>
        </section>
        <nav className="home-menu">
          {HOME_MENU.map((m) => (
            <button key={m.label} className={'home-tile' + (m.primary ? ' primary' : '')} onClick={m.run} data-testid={m.testId}>
              <span className="home-tile-icon" aria-hidden>{m.icon}</span>
              <b>{m.label}</b>
              <small>{m.desc}</small>
            </button>
          ))}
        </nav>
        <aside className="home-side">
          {cards.length === 0 && (
            <section className="panel getting-started">
              <h3>はじめに</h3>
              <p className="small">カードがまだありません。「公式カード検索」で使いたいカードを保存すると、デッキ構築と対戦で使えるようになります。</p>
              <button className="primary" onClick={() => go('official')}>公式カード検索へ</button>
            </section>
          )}
          {saves.length > 0 && (
            <section className="panel">
              <h3>中断した対戦</h3>
              {saves.map((s) => (
                <button key={s.id} className="list-item resume" onClick={() => void loadGame(s.id)}>
                  <span>▶ {s.title}</span> <span className="muted">{new Date(s.savedAt).toLocaleString()}</span>
                </button>
              ))}
            </section>
          )}
          <section className="panel home-recent">
            <h3>最近使用したデッキ</h3>
            {recent.length === 0 && <p className="muted">まだありません</p>}
            <div className="recent-decks">
              {recent.map((d) => {
                const { cover, civ } = deckSummary(d, registry);
                return (
                  <button key={d.id} className="recent-deck" onClick={() => editDeck(d.id)}>
                    <span className="recent-cover">{cover ? <CardView card={cover} size="sm" /> : <span className="cover-empty">◆</span>}</span>
                    <span className="recent-info">
                      <b>{d.name}</b>
                      <span className="muted">{deckCountLabel(d, registry)}</span>
                      <CivDots civ={civ} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function DeckListScreen() {
  const { decks, editDeck, duplicateDeck, deleteDeck, newDeck, registry, settings } = useApp();
  const [sort, setSort] = useState<'updated' | 'name'>('updated');
  const [filter, setFilter] = useState('');
  const shown = decks
    .filter((d) => !filter || d.name.includes(filter))
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name, 'ja') : b.updatedAt - a.updatedAt));
  const fromText = async () => {
    useApp.setState({ pendingTextImport: true });
    await newDeck();
  };
  return (
    <div className="screen">
      <Header title="デッキ一覧" sub={<span className="muted">{decks.length}個</span>}>
        <input className="header-search" placeholder="デッキ名で絞り込み" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value as 'updated' | 'name')}>
          <option value="updated">最終更新順</option>
          <option value="name">名前順</option>
        </select>
        <button onClick={() => void fromText()} data-testid="new-deck-from-text">＋ テキストから作成</button>
        <button className="primary" onClick={() => void newDeck()}>＋ 新しいデッキ</button>
      </Header>
      <div className="screen-body">
        <div className="deck-grid">
          <button className="deck-tile new" onClick={() => void newDeck()}>
            <span className="deck-tile-new-icon">＋</span>
            <b>新しいデッキ</b>
            <small className="muted">空のデッキから作る</small>
          </button>
          {shown.map((d) => {
            const legal = isDeckLegal(d, settings.format, registry);
            const { cover, civ } = deckSummary(d, registry);
            return (
              <div key={d.id} className="deck-tile" onClick={() => editDeck(d.id)}>
                <div className="deck-tile-cover">{cover ? <CardView card={cover} size="sm" /> : <span className="cover-empty">◆</span>}</div>
                <div className="deck-tile-info">
                  <div className="deck-tile-name">{d.name}</div>
                  <div className="small">
                    {deckCountLabel(d, registry)} {legal ? <span className="ok">✓ 使用可能</span> : <span className="ng">✗ 構築ルール違反</span>}
                  </div>
                  <CivDots civ={civ} />
                  <div className="muted small">更新 {new Date(d.updatedAt).toLocaleDateString()}</div>
                  <div className="deck-tile-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="primary" onClick={() => editDeck(d.id)}>編集</button>
                    <button onClick={() => void duplicateDeck(d.id)}>複製</button>
                    <button className="danger" onClick={() => confirm(`「${d.name}」を削除しますか？`) && void deleteDeck(d.id)}>削除</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
