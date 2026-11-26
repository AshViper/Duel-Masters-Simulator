import { useEffect, useMemo, useState } from 'react';
import { searchCards, type CardQuery } from '../../core/cards/registry';
import { CIVILIZATIONS, CIV_LABEL, type CardDefinition } from '../../core/cards/types';
import { deckCount, validateDeck, type Deck } from '../../core/deck/rules';
import { useApp } from '../../store/appStore';
import { CardDetail } from '../components/CardDetail';
import { CardFilter } from '../components/CardFilter';
import { CardView, CIV_COLOR } from '../components/CardView';
import { DeckTextImport } from '../components/DeckTextImport';
import { OfficialPicker } from '../components/OfficialPicker';
import { ProxyPrintDialog } from '../components/ProxyPrintDialog';
import { Header } from './Menus';

export function DeckBuilderScreen() {
  const { decks, editingDeckId, cards, registry, settings, saveDeck, duplicateDeck, deleteDeck, editDeck, go } = useApp();
  const original = decks.find((d) => d.id === editingDeckId);
  const [deck, setDeck] = useState<Deck | undefined>(original);
  const [q, setQ] = useState<CardQuery>({});
  const [detail, setDetail] = useState<CardDefinition | null>(null);
  const [saved, setSaved] = useState(true);
  const [source, setSource] = useState<'saved' | 'official'>('saved');
  const [textImport, setTextImport] = useState(() => useApp.getState().pendingTextImport);
  useEffect(() => {
    if (useApp.getState().pendingTextImport) useApp.setState({ pendingTextImport: false });
  }, []);
  const [printing, setPrinting] = useState(false);
  const results = useMemo(() => searchCards(cards, q), [cards, q]);

  if (!deck) {
    return (
      <div className="screen">
        <Header title="デッキ構築" />
        <p className="pad">デッキが選択されていません。<button onClick={() => go('decks')}>デッキ一覧へ</button></p>
      </div>
    );
  }
  const total = deckCount(deck);
  const issues = validateDeck(deck, settings.format, registry);
  const max = (id: string) => settings.format.restricted[id] ?? settings.format.maxCopies;
  // 公式カードは保存（非同期）の後に追加されるので、常に最新のデッキに対して更新する
  const update = (fn: (cards: Record<string, number>) => Record<string, number>) => {
    setDeck((d) => (d ? { ...d, cards: fn(d.cards) } : d));
    setSaved(false);
  };
  const add = (id: string) =>
    update((cards) => {
      const n = cards[id] ?? 0;
      return n >= max(id) ? cards : { ...cards, [id]: n + 1 };
    });
  const remove = (id: string) =>
    update((cards) => {
      const n = (cards[id] ?? 0) - 1;
      const next = { ...cards };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const entries = Object.entries(deck.cards)
    .map(([id, n]) => ({ card: registry[id], id, n }))
    .sort((a, b) => (a.card?.cost ?? 99) - (b.card?.cost ?? 99) || a.id.localeCompare(b.id));
  const civCount = CIVILIZATIONS.map((c) => ({ c, n: entries.filter((e) => e.card?.civilizations.includes(c)).reduce((s, e) => s + e.n, 0) })).filter((x) => x.n > 0);
  // 8列×5段に並べるため、1枚ずつ展開する（コスト順）
  const slots = entries.flatMap(({ id, n, card }) => Array.from({ length: n }, (_, k) => ({ id, card, key: `${id}#${k}` })));
  const slotCount = Math.max(settings.format.deckSize, Math.ceil(slots.length / 8) * 8);
  const curve = Array.from({ length: 8 }, (_, i) => entries.filter((e) => (i === 7 ? (e.card?.cost ?? 0) >= 7 : e.card?.cost === i)).reduce((s, e) => s + e.n, 0));

  return (
    <div className="screen builder">
      <Header title="デッキ構築" />
      <div className="builder-body">
        <aside className="builder-search">
          <div className="mode-tabs">
            <button className={source === 'saved' ? 'on' : ''} onClick={() => setSource('saved')} data-testid="source-saved">保存済みカード（{cards.length}）</button>
            <button className={source === 'official' ? 'on' : ''} onClick={() => setSource('official')} data-testid="source-official">公式から探す</button>
          </div>
          {source === 'official' ? (
            <OfficialPicker onPick={add} count={(id) => deck.cards[id] ?? 0} max={max} onDetail={(id) => registry[id] && setDetail(registry[id])} />
          ) : (
            <>
              <CardFilter q={q} onChange={setQ} cards={cards} full />
              <div className="result-count muted">{results.length}件</div>
              {cards.length === 0 && (
                <p className="muted small">
                  カードがありません。<button className="link" onClick={() => setSource('official')}>公式から探す</button>で検索して追加してください。
                </p>
              )}
              <div className="card-grid">
                {results.map((c) => (
                  <div key={c.id} className="grid-cell">
                    <CardView card={c} size="sm" onClick={() => add(c.id)} onContextMenu={(e) => { e.preventDefault(); setDetail(c); }} testId={`pool-${c.id}`} />
                    <div className="cell-actions">
                      <button className="tiny" onClick={() => setDetail(c)}>詳細</button>
                      <span className="muted">{deck.cards[c.id] ?? 0}/{max(c.id)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
        <section className="builder-deck">
          <div className="deck-head">
            <input className="deck-name" value={deck.name} onChange={(e) => { setDeck({ ...deck, name: e.target.value }); setSaved(false); }} />
            <span className={'deck-count ' + (total === settings.format.deckSize ? 'ok' : 'ng')} data-testid="deck-count">{total} / {settings.format.deckSize}</span>
          </div>
          <div className="toolbar">
            <button className="primary" onClick={() => { void saveDeck(deck); setSaved(true); }} disabled={saved} data-testid="save-deck">保存</button>
            <button onClick={async () => { const c = await duplicateDeck(deck.id); if (c) { editDeck(c.id); setDeck(c); } }}>複製</button>
            <button onClick={() => setTextImport(true)} data-testid="open-text-import">テキストから取り込み</button>
            <button onClick={() => go('decks')}>読み込み（一覧へ）</button>
            <button onClick={() => setPrinting(true)} disabled={total === 0} data-testid="proxy-pdf">プロキシPDF（A4）</button>
            <button className="danger" onClick={() => { if (confirm('このデッキを削除しますか？')) { void deleteDeck(deck.id); go('decks'); } }}>削除</button>
            {!saved && <span className="muted">未保存の変更があります</span>}
          </div>
          <div className="deck-stats">
            <div className="civ-bar">
              {civCount.map(({ c, n }) => (
                <span key={c} style={{ background: CIV_COLOR[c] }}>{CIV_LABEL[c]} {n}</span>
              ))}
            </div>
            <div className="curve">
              {curve.map((n, i) => (
                <div key={i} className="curve-col">
                  <div className="curve-bar" style={{ height: `${Math.min(100, n * 8)}%` }} />
                  <span>{i === 7 ? '7+' : i}</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="issues">
            {issues.filter((i) => i.level === 'error').map((i, k) => <li key={k} className="error">{i.message}</li>)}
            {issues.some((i) => i.level === 'warning') && (
              <li className="warning-summary" title={issues.filter((i) => i.level === 'warning').map((i) => i.message).join('\n')}>
                手動処理の効果を含むカード：{issues.filter((i) => i.level === 'warning').length}種（カードの「手」マーク）
              </li>
            )}
          </ul>
          <p className="muted small">クリックで1枚減らす／右クリックで詳細</p>
          <div className="deck-grid8" data-testid="deck-grid">
            {Array.from({ length: slotCount }, (_, i) => {
              const slot = slots[i];
              if (!slot) return <div key={`empty-${i}`} className="deck-slot empty" />;
              return (
                <div key={slot.key} className="deck-slot">
                  {slot.card ? (
                    <CardView
                      card={slot.card}
                      size="sm"
                      onClick={() => remove(slot.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setDetail(slot.card!);
                      }}
                      title={`${slot.card.name}（クリックで1枚減らす）`}
                    />
                  ) : (
                    <button className="missing-card" onClick={() => remove(slot.id)} title="未登録のカード（クリックで外す）">
                      未登録
                      <br />
                      {slot.id}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {printing && <ProxyPrintDialog deckName={deck.name} entries={entries.map(({ id, n, card }) => ({ id, count: n, card }))} onClose={() => setPrinting(false)} />}
      {textImport && (
        <DeckTextImport
          onClose={() => setTextImport(false)}
          onApply={(cards, mode) =>
            update((cur) => {
              if (mode === 'replace') return cards;
              const next = { ...cur };
              for (const [id, n] of Object.entries(cards)) next[id] = (next[id] ?? 0) + n;
              return next;
            })
          }
        />
      )}
      {detail && (
        <CardDetail
          card={detail}
          onClose={() => setDetail(null)}
          actions={
            <>
              <button className="primary" onClick={() => add(detail.id)}>デッキに追加</button>
              <button onClick={() => remove(detail.id)}>1枚減らす</button>
            </>
          }
        />
      )}
    </div>
  );
}
