import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { searchCards, type CardQuery } from '../../core/cards/registry';
import { CIVILIZATIONS, CIV_LABEL, type CardDefinition } from '../../core/cards/types';
import { deckCount, HYPERSPATIAL_MAX, hyperspatialCount, validateDeck, type Deck } from '../../core/deck/rules';
import { useApp } from '../../store/appStore';
import { Header } from '../components/AppShell';
import { CardDetail, CardInfoPanel } from '../components/CardDetail';
import { CardFilter } from '../components/CardFilter';
import { CardView, CIV_COLOR } from '../components/CardView';
import { DeckTextImport } from '../components/DeckTextImport';
import { OfficialPicker } from '../components/OfficialPicker';
import { ProxyPrintDialog } from '../components/ProxyPrintDialog';

// デッキ構築（design/app-ui.md）：検索｜デッキ40枚｜カード詳細 の3列。ページ全体はスクロールしない。

const DND_ADD = 'application/x-dm-add';
const DND_REMOVE = 'application/x-dm-remove';
const GAP = 6;

/** 空いている幅と高さから、デッキのカードがいちばん大きくなる並べ方（8×5 か 10×4）を選ぶ */
function useDeckLayout(slotCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [lay, setLay] = useState({ cols: 8, w: 60 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const calc = () => {
      const W = el.clientWidth - 4;
      const H = el.clientHeight - 4;
      let best = { cols: 8, w: 0 };
      for (const cols of [8, 10]) {
        const rows = Math.ceil(slotCount / cols);
        const w = Math.floor(Math.min((W - (cols - 1) * GAP) / cols, ((H - (rows - 1) * GAP) / rows) * (63 / 88)));
        if (w > best.w) best = { cols, w };
      }
      setLay((cur) => (cur.cols === best.cols && cur.w === best.w ? cur : { cols: best.cols, w: Math.max(30, best.w) }));
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slotCount]);
  return { ref, ...lay };
}

export function DeckBuilderScreen() {
  const { decks, editingDeckId, cards, registry, settings, saveDeck, duplicateDeck, deleteDeck, editDeck, go } = useApp();
  const original = decks.find((d) => d.id === editingDeckId);
  const [deck, setDeck] = useState<Deck | undefined>(original);
  const [q, setQ] = useState<CardQuery>({});
  const [selected, setSelected] = useState<CardDefinition | null>(null);
  const [hover, setHover] = useState<CardDefinition | null>(null);
  const [zoom, setZoom] = useState<CardDefinition | null>(null);
  const [saved, setSaved] = useState(true);
  const [source, setSource] = useState<'saved' | 'official'>('saved');
  const [textImport, setTextImport] = useState(() => useApp.getState().pendingTextImport);
  const [lastAdded, setLastAdded] = useState<{ id: string; seq: number } | null>(null);
  const [dropOver, setDropOver] = useState<'deck' | 'search' | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  useEffect(() => {
    if (useApp.getState().pendingTextImport) useApp.setState({ pendingTextImport: false });
  }, []);
  const [printing, setPrinting] = useState(false);
  const results = useMemo(() => searchCards(cards, q), [cards, q]);

  const entries = useMemo(
    () =>
      Object.entries(deck?.cards ?? {})
        .map(([id, n]) => ({ card: registry[id] as CardDefinition | undefined, id, n }))
        .sort((a, b) => (a.card?.cost ?? 99) - (b.card?.cost ?? 99) || a.id.localeCompare(b.id)),
    [deck?.cards, registry],
  );
  // 1枚ずつ展開する（コスト順）。サイキック・クリーチャーは超次元ゾーンの列へ分ける
  const expand = (list: typeof entries) => list.flatMap(({ id, n, card }) => Array.from({ length: n }, (_, k) => ({ id, card, k, key: `${id}#${k}` })));
  const mainSlots = expand(entries.filter((e) => !e.card?.psychic));
  const hyperSlots = expand(entries.filter((e) => e.card?.psychic));
  const slotCount = Math.max(settings.format.deckSize, Math.ceil(mainSlots.length / 10) * 10);
  const layout = useDeckLayout(slotCount);

  if (!deck) {
    return (
      <div className="screen">
        <Header title="デッキ構築" />
        <p className="pad">デッキが選択されていません。<button onClick={() => go('decks')}>デッキ一覧へ</button></p>
      </div>
    );
  }
  // 超次元ゾーンのカード（サイキック・クリーチャー）は40枚に数えない
  const hyper = hyperspatialCount(deck, registry);
  const total = deckCount(deck) - hyper;
  const issues = validateDeck(deck, settings.format, registry);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');
  const max = (id: string) => settings.format.restricted[id] ?? settings.format.maxCopies;
  // 公式カードは保存（非同期）の後に追加されるので、常に最新のデッキに対して更新する
  const update = (fn: (cards: Record<string, number>) => Record<string, number>) => {
    setDeck((d) => (d ? { ...d, cards: fn(d.cards) } : d));
    setSaved(false);
  };
  const add = (id: string) => {
    if ((deck.cards[id] ?? 0) < max(id)) setLastAdded((l) => ({ id, seq: (l?.seq ?? 0) + 1 }));
    update((cards) => {
      const n = cards[id] ?? 0;
      return n >= max(id) ? cards : { ...cards, [id]: n + 1 };
    });
  };
  const remove = (id: string) =>
    update((cards) => {
      const n = (cards[id] ?? 0) - 1;
      const next = { ...cards };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const civCount = CIVILIZATIONS.map((c) => ({ c, n: entries.filter((e) => e.card?.civilizations.includes(c)).reduce((s, e) => s + e.n, 0) })).filter((x) => x.n > 0);
  const curve = Array.from({ length: 8 }, (_, i) => entries.filter((e) => !e.card?.psychic && (i === 7 ? (e.card?.cost ?? 0) >= 7 : e.card?.cost === i)).reduce((s, e) => s + e.n, 0));
  const curveMax = Math.max(4, ...curve);
  const info = hover ?? selected;

  // ドラッグ＆ドロップ（補助）：検索結果→デッキで追加、デッキ→検索側で1枚減らす
  const dragAdd = (id: string) => (e: DragEvent) => {
    e.dataTransfer.setData(DND_ADD, id);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const dragRemove = (id: string) => (e: DragEvent) => {
    e.dataTransfer.setData(DND_REMOVE, id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const dropZone = (zone: 'deck' | 'search', type: string, act: (id: string) => void) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(type)) return;
      e.preventDefault();
      if (dropOver !== zone) setDropOver(zone);
    },
    onDragLeave: (e: DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropOver(null);
    },
    onDrop: (e: DragEvent) => {
      const id = e.dataTransfer.getData(type);
      setDropOver(null);
      if (id) {
        e.preventDefault();
        act(id);
      }
    },
  });

  const renderSlot = (slot: (typeof mainSlots)[number]) => {
    const n = deck.cards[slot.id] ?? 0;
    const fresh = lastAdded?.id === slot.id && slot.k === n - 1;
    return (
      <div key={slot.key + (fresh ? `@${lastAdded!.seq}` : '')} className={'deck-slot' + (fresh ? ' just-added' : '')}>
        {slot.card ? (
          <CardView
            card={slot.card}
            size="sm"
            selected={selected?.id === slot.id}
            onClick={() => remove(slot.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setZoom(slot.card!);
            }}
            onHover={(on) => setHover(on ? slot.card! : null)}
            draggable
            onDragStart={dragRemove(slot.id)}
            title={`${slot.card.name}（クリックで1枚減らす・右クリックで拡大）`}
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
  };

  return (
    <div className="screen fill builder">
      <Header
        title="デッキ構築"
        sub={
          <div className="deck-title">
            <input className="deck-name" value={deck.name} onChange={(e) => { setDeck({ ...deck, name: e.target.value }); setSaved(false); }} aria-label="デッキ名" />
            {!saved && <span className="unsaved-dot" title="未保存の変更があります" />}
            <span key={total} className={'deck-count ' + (total === settings.format.deckSize ? 'ok' : 'ng')} data-testid="deck-count">{total} / {settings.format.deckSize}{hyper ? `＋超次元${hyper}` : ''}</span>
          </div>
        }
      >
        <button className="gold" onClick={() => { void saveDeck(deck); setSaved(true); }} disabled={saved} data-testid="save-deck">保存</button>
        <button onClick={async () => { const c = await duplicateDeck(deck.id); if (c) { editDeck(c.id); setDeck(c); } }}>複製</button>
        <button onClick={() => setTextImport(true)} data-testid="open-text-import">テキスト取込</button>
        <button onClick={() => go('decks')}>一覧へ</button>
        <button onClick={() => setPrinting(true)} disabled={total + hyper === 0} data-testid="proxy-pdf">プロキシPDF</button>
        <button className="danger" onClick={() => { if (confirm('このデッキを削除しますか？')) { void deleteDeck(deck.id); go('decks'); } }}>削除</button>
      </Header>
      <div className="builder-body">
        <section className={'builder-search panel' + (dropOver === 'search' ? ' drop-on' : '')} {...dropZone('search', DND_REMOVE, remove)}>
          <div className="mode-tabs">
            <button className={source === 'saved' ? 'on' : ''} onClick={() => setSource('saved')} data-testid="source-saved">保存済みカード（{cards.length}）</button>
            <button className={source === 'official' ? 'on' : ''} onClick={() => setSource('official')} data-testid="source-official">公式から探す</button>
          </div>
          {source === 'official' ? (
            <OfficialPicker onPick={add} count={(id) => deck.cards[id] ?? 0} max={max} onDetail={(id) => registry[id] && setZoom(registry[id])} onHover={(id) => setHover(id ? registry[id] ?? null : null)} />
          ) : (
            <>
              <CardFilter q={q} onChange={setQ} cards={cards} full />
              <div className="result-count muted small">
                {results.length}件　<span>クリックで追加・右クリックで拡大・デッキへドラッグでも追加</span>
              </div>
              {cards.length === 0 && (
                <p className="muted small">
                  カードがありません。<button className="link" onClick={() => setSource('official')}>公式から探す</button>で検索して追加してください。
                </p>
              )}
              <div className="pool-grid">
                {results.map((c) => {
                  const n = deck.cards[c.id] ?? 0;
                  const full = n >= max(c.id);
                  return (
                    <div key={c.id} className={'pool-cell' + (full ? ' maxed' : '')} title={full ? `${c.name}：上限（${max(c.id)}枚）まで入っています` : undefined}>
                      <CardView
                        card={c}
                        size="sm"
                        selected={selected?.id === c.id}
                        onClick={() => {
                          setSelected(c);
                          add(c.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setZoom(c);
                        }}
                        onHover={(on) => setHover(on ? c : null)}
                        draggable={!full}
                        onDragStart={dragAdd(c.id)}
                        testId={`pool-${c.id}`}
                        badge={<span className={'count-badge' + (full ? ' full' : n > 0 ? ' some' : '')}>{n}/{max(c.id)}</span>}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className={'builder-deck panel' + (dropOver === 'deck' ? ' drop-on' : '')} {...dropZone('deck', DND_ADD, add)}>
          <div className="panel-title">
            DECK<span>メイン {total}枚・クリックで1枚減らす・右クリックで拡大</span>
          </div>
          <div className="deck-area" ref={layout.ref}>
            <div className="deck-grid-auto" data-testid="deck-grid" style={{ gridTemplateColumns: `repeat(${layout.cols}, ${layout.w}px)`, gap: GAP }}>
              {Array.from({ length: slotCount }, (_, i) => (mainSlots[i] ? renderSlot(mainSlots[i]) : <div key={`empty-${i}`} className="deck-slot empty" />))}
            </div>
          </div>
          {hyperSlots.length > 0 && (
            <div className="hyper-row">
              <span className="hyper-label">超次元 <b>{hyper}</b>/{HYPERSPATIAL_MAX}</span>
              <div className="hyper-cards">
                {Array.from({ length: HYPERSPATIAL_MAX }, (_, i) => (hyperSlots[i] ? renderSlot(hyperSlots[i]) : <div key={`hempty-${i}`} className="deck-slot empty" />))}
              </div>
            </div>
          )}
          <div className="deck-stats">
            <div className="stat-block">
              <span className="stat-label">文明</span>
              <div className="civ-bar">
                {civCount.length === 0 && <span className="muted small">—</span>}
                {civCount.map(({ c, n }) => (
                  <span key={c} style={{ ['--c' as string]: CIV_COLOR[c] }}>{CIV_LABEL[c]} <b>{n}</b></span>
                ))}
              </div>
            </div>
            <div className="stat-block">
              <span className="stat-label">コスト</span>
              <div className="curve">
                {curve.map((n, i) => (
                  <div key={i} className="curve-col" title={`コスト${i === 7 ? '7以上' : i}：${n}枚`}>
                    <span className="curve-n">{n || ''}</span>
                    <div className="curve-bar" style={{ height: `${(n / curveMax) * 100}%` }} />
                    <span>{i === 7 ? '7+' : i}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={'stat-block stat-num' + (warnings.length ? ' warn' : '')} title={warnings.map((i) => i.message).join('\n')}>
              <span className="stat-label">手動処理</span>
              <b>{warnings.length}</b>
              <small>種</small>
            </div>
            <button className={'stat-block stat-num' + (errors.length ? ' bad' : ' good')} onClick={() => setShowIssues((v) => !v)} disabled={errors.length === 0}>
              <span className="stat-label">ルール違反</span>
              <b>{errors.length}</b>
              <small>{errors.length ? (showIssues ? '▲' : '▼') : '✓'}</small>
            </button>
          </div>
          {showIssues && errors.length > 0 && (
            <ul className="issues">
              {errors.map((i, k) => <li key={k} className="error">{i.message}</li>)}
            </ul>
          )}
        </section>

        <CardInfoPanel
          card={info}
          hint={<p>カードにマウスを乗せると詳細が出ます。<br />検索結果をクリックで追加、デッキのカードをクリックで1枚減らします。</p>}
          actions={
            info && (
              <>
                <button className="primary" onClick={() => add(info.id)} disabled={(deck.cards[info.id] ?? 0) >= max(info.id)}>＋ デッキに追加</button>
                <button onClick={() => remove(info.id)} disabled={!deck.cards[info.id]}>－ 1枚減らす</button>
                <span className="muted small">{deck.cards[info.id] ?? 0}/{max(info.id)}枚</span>
              </>
            )
          }
        />
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
      {zoom && (
        <CardDetail
          card={zoom}
          onClose={() => setZoom(null)}
          actions={
            <>
              <button className="primary" onClick={() => add(zoom.id)}>デッキに追加</button>
              <button onClick={() => remove(zoom.id)}>1枚減らす</button>
            </>
          }
        />
      )}
    </div>
  );
}
