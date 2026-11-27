import { useEffect, useMemo, useState } from 'react';
import { CARD_TYPE_LABEL, type CardDefinition } from '../../core/cards/types';
import { manualLines } from '../components/CardDetail';
import { deckCountLabel, isDeckLegal, type Deck } from '../../core/deck/rules';
import { db, type SavedGame } from '../../db/db';
import { DEFAULT_DECKS } from '../../core/deck/defaultDecks';
import { useApp } from '../../store/appStore';
import { useBattle } from '../../store/battleStore';
import { Header } from '../components/AppShell';
import { CardView } from '../components/CardView';
import { CivDots, deckSummary } from '../components/DeckPicker';

const HOME_MENU: { icon: string; art: string; label: string; desc: string; testId?: string; primary?: boolean; run: () => void }[] = [
  { icon: '⚔', art: 'battle', label: '対戦開始', desc: 'CPU戦・1人回し', testId: 'menu-battle', primary: true, run: () => useApp.getState().go('setup') },
  { icon: '✚', art: 'build', label: 'デッキ構築', desc: '新しいデッキを作る', run: () => void useApp.getState().newDeck() },
  { icon: '▤', art: 'decks', label: 'デッキ一覧', desc: '保存したデッキ', testId: 'menu-decks', run: () => useApp.getState().go('decks') },
  { icon: '❖', art: 'library', label: 'カード図鑑', desc: '保存したカード・バックアップ', testId: 'menu-library', run: () => useApp.getState().go('library') },
  { icon: '⌕', art: 'search', label: '公式カード検索', desc: 'カードを探して保存', testId: 'menu-official', run: () => useApp.getState().go('official') },
  { icon: '⇄', art: 'online', label: 'オンライン対戦', desc: '部屋コードで友達と', run: () => useApp.getState().go('online') },
  { icon: '☰', art: 'history', label: '対戦履歴', desc: '過去の対戦とログ', run: () => useApp.getState().go('history') },
  { icon: '⚙', art: 'settings', label: '設定', desc: '構築ルール・CPU', run: () => useApp.getState().go('settings') },
];

export function HomeScreen() {
  const { go, decks, recentDeckIds, editDeck, cards, registry } = useApp();
  const loadGame = useBattle((s) => s.loadGame);
  const [saves, setSaves] = useState<SavedGame[]>([]);
  const [resumeError, setResumeError] = useState('');
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
            <button key={m.label} className={'home-tile art-' + m.art + (m.primary ? ' primary' : '')} onClick={m.run} data-testid={m.testId}>
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
                <button key={s.id} className="list-item resume" onClick={() => void loadGame(s.id).then((err) => setResumeError(err ?? ''))}>
                  <span>▶ {s.title}</span> <span className="muted">{new Date(s.savedAt).toLocaleString()}</span>
                </button>
              ))}
              {resumeError && <p className="small ng" role="alert">{resumeError}</p>}
            </section>
          )}
          <ManualAbilitiesPanel cards={cards} />
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

/** 手動の能力を文ごとにまとめる（同じ文のカードを束ねる）。多いカードの文から並べる */
function groupManualLines(cards: CardDefinition[]): { line: string; cards: CardDefinition[] }[] {
  const map = new Map<string, CardDefinition[]>();
  for (const c of cards) {
    for (const raw of new Set(manualLines(c).map((l) => l.replace(/\n/g, '')))) {
      const list = map.get(raw) ?? [];
      list.push(c);
      map.set(raw, list);
    }
  }
  return [...map.entries()].map(([line, cs]) => ({ line, cards: cs })).sort((a, b) => b.cards.length - a.cards.length || a.line.localeCompare(b.line, 'ja'));
}

/** カード1枚の、実装に要る情報（数値・種族・能力の全文） */
function cardBrief(c: CardDefinition): string[] {
  const civ = c.civilizations.map((x) => CIV_LABEL[x]).join('/');
  const stats = [c.typeLabel ?? CARD_TYPE_LABEL[c.type], civ, `コスト${c.cost}`, c.power !== undefined ? `パワー${c.power}` : '', c.races.length ? `種族 ${c.races.join('/')}` : ''].filter(Boolean).join('・');
  const out = [`### ${c.name}（${c.id}）`, stats, '```', c.text.trim(), '```'];
  if (c.twin) out.push(`呪文側：${c.twin.name}（コスト${c.twin.cost}・${c.twin.civilizations.map((x) => CIV_LABEL[x]).join('/')}）`, '```', c.twin.text.trim(), '```');
  return out;
}

/** Claude に効果処理を作らせるための依頼文：手動の能力の文と、それを持つカードの全文 */
function manualToText(groups: { line: string; cards: CardDefinition[] }[]): string {
  const cards = [...new Map(groups.flatMap((g) => g.cards.map((c) => [c.id, c] as const))).values()];
  const out = [
    `# 依頼：手動処理になっている能力を自動処理にする（${groups.length}種類・カード${cards.length}枚）`,
    '',
    '次の能力の文は、テキストの読み取り（textParser / grammar）で読めず、対戦中は手動処理になっている。',
    'CLAUDE.md と vault の手順に従って、各文を自動で処理できるようにしてほしい（読み取りの追加と、足りなければエンジンに処理を追加）。',
    '- カード名で決め打ちせず、同じ形の文が読めるように一般化する。似た文はまとめて実装する',
    '- 文ごとにテストを足す（既存のカード能力テストの書き方に合わせる）',
    '- ルールの解釈が分かれる所は総合ルールに従い、判断した内容を vault/decisions.md に書く',
    '- 実装できなかった文は、理由（エンジンに無い仕組みなど）を最後に一覧にする',
    '',
    '## 手動の能力（文ごと。〔〕は持っているカード）',
    '',
  ];
  groups.forEach((g, i) => out.push(`${i + 1}. ${g.line}〔${g.cards.map((c) => c.name).join(' / ')}〕`));
  out.push('', '## カードの全文（ほかの能力との関係を見るため）', '');
  for (const c of cards) out.push(...cardBrief(c), '');
  return out.join('\n').trimEnd() + '\n';
}

/** 保存カードのうち、手動で処理する能力の一覧。エンジン実装用にまとめてコピーできる */
function ManualAbilitiesPanel({ cards }: { cards: CardDefinition[] }) {
  const groups = useMemo(() => groupManualLines(cards), [cards]);
  const [copied, setCopied] = useState(false);
  if (groups.length === 0) return null;
  return (
    <section className="panel home-manual" data-testid="home-manual">
      <h3>
        手動の能力 <span className="muted small">{groups.length}種類</span>
        <button
          className="home-manual-copy"
          title="手動の能力を自動処理にしてもらうための依頼文（能力の文・カードの全文）をコピーします。Claude にそのまま貼り付けて使います"
          onClick={() => void navigator.clipboard?.writeText(manualToText(groups)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        >
          {copied ? 'コピーしました' : 'まとめてコピー'}
        </button>
      </h3>
      <ul className="home-manual-list small">
        {groups.map((g) => (
          <li key={g.line}>
            <span>{g.line}</span>
            <span className="muted"> — {g.cards.map((c) => c.name).join(' / ')}</span>
          </li>
        ))}
      </ul>
    </section>
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
  const fromDefault = async (d: (typeof DEFAULT_DECKS)[number]) => {
    useApp.setState({ pendingTextImport: d.text });
    await newDeck(d.name);
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
        <section className="default-decks" data-testid="default-decks">
          <h3>デフォルトデッキ</h3>
          <p className="muted small">押すとデッキを作り、カード名を公式カード検索で照合します（保存済みのカードは通信しません）。「デッキをこの内容にする」で完成です。</p>
          <div className="row wrap">
            {DEFAULT_DECKS.map((d) => {
              const added = decks.some((x) => x.name === d.name);
              return (
                <button key={d.id} onClick={() => void fromDefault(d)} data-testid={`default-deck-${d.id}`} title={added ? '同じ名前のデッキがすでにあります（もう1つ作ります）' : undefined}>
                  ＋ {d.name}{added ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </section>
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
