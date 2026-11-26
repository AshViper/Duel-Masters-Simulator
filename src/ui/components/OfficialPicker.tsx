import { useState } from 'react';
import { create } from 'zustand';
import { officialCardId } from '../../core/cards/officialConvert';
import type { OfficialSearchQuery, OfficialSearchResult } from '../../server/dmOfficial';
import { useCachedImage } from '../../db/imageCache';
import { useApp } from '../../store/appStore';
import { saveOfficialCard } from '../../store/officialCards';
import { api } from '../officialApi';
import { OfficialBridgePanel } from './OfficialBridgePanel';

// デッキ構築画面から公式カード検索を使い、見つけたカードをそのままデッキに入れる。
// まだ保存していないカードは、入れる時に情報と画像をブラウザへ保存する（以後は通信しない）。

const CIVS = [
  { value: '光', color: '#f4d35e' },
  { value: '水', color: '#4ea8ff' },
  { value: '闇', color: '#9b6bd6' },
  { value: '火', color: '#ff5a4e' },
  { value: '自然', color: '#4cc26b' },
  { value: 'ゼロ', color: '#b8c0cc' },
];

const usePicker = create<{
  query: OfficialSearchQuery;
  result: OfficialSearchResult | null;
  set: (p: Partial<{ query: OfficialSearchQuery; result: OfficialSearchResult | null }>) => void;
}>((set) => ({ query: { keywordTypes: ['card_name', 'card_ruby'], page: 1 }, result: null, set }));

interface Props {
  /** 保存済みのカードID（dm:...）を受け取ってデッキに1枚入れる */
  onPick: (cardId: string) => void;
  count: (cardId: string) => number;
  max: (cardId: string) => number;
  onDetail: (cardId: string) => void;
  /** 保存済みのカードにマウスが乗った時（詳細パネルに出す） */
  onHover?: (cardId: string | null) => void;
}

export function OfficialPicker({ onPick, count, max, onDetail, onHover }: Props) {
  const { query, result, set } = usePicker();
  const registry = useApp((s) => s.registry);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const update = (p: Partial<OfficialSearchQuery>) => set({ query: { ...query, ...p } });
  const num = (v: string) => (v === '' ? undefined : Number(v));
  const run = async (page = 1) => {
    const q = { ...query, page };
    set({ query: q });
    setLoading(true);
    setError('');
    try {
      set({ result: await api<OfficialSearchResult>('/dm-api/search', q) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const toggleCiv = (c: string) => {
    const cur = query.civilizations ?? [];
    update({ civilizations: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] });
  };

  const pick = async (id: string) => {
    const cardId = officialCardId(id);
    if (registry[cardId]) {
      if (count(cardId) < max(cardId)) onPick(cardId);
      return;
    }
    setSaving((s) => new Set(s).add(id));
    setError('');
    try {
      await saveOfficialCard(id);
      onPick(cardId);
    } catch (e) {
      setError(`${id}: ${(e as Error).message}`);
    } finally {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  return (
    <div className="official-picker">
      <OfficialBridgePanel compact />
      <form
        className="filter"
        onSubmit={(e) => {
          e.preventDefault();
          void run(1);
        }}
      >
        <div className="row">
          <input className="grow" placeholder="カード名・読み" value={query.keyword ?? ''} onChange={(e) => update({ keyword: e.target.value })} data-testid="picker-keyword" />
          <button type="submit" className="primary" disabled={loading} data-testid="picker-search">検索</button>
        </div>
        <div className="row">
          <div className="civ-toggles">
            {CIVS.map((c) => (
              <button type="button" key={c.value} className={'civ-btn' + (query.civilizations?.includes(c.value) ? ' on' : '')} style={{ ['--c' as string]: c.color }} onClick={() => toggleCiv(c.value)}>
                {c.value}
              </button>
            ))}
          </div>
          <label>
            コスト
            <input type="number" min={0} className="num" value={query.costMin ?? ''} onChange={(e) => update({ costMin: num(e.target.value) })} />〜
            <input type="number" min={0} className="num" value={query.costMax ?? ''} onChange={(e) => update({ costMax: num(e.target.value) })} />
          </label>
        </div>
      </form>
      <p className="muted small">クリックでデッキに追加（未保存のカードは追加時にブラウザへ保存）。右クリックで拡大。</p>
      {error && <p className="ng small">{error}</p>}
      {loading && <p className="muted">公式サイトから取得中…</p>}
      {result && !loading && (
        <>
          {result.cards.length === 0 && <p className="muted">該当するカードがありません</p>}
          <div className="official-grid picker-grid" data-testid="picker-results">
            {result.cards.map((c) => {
              const cardId = officialCardId(c.id);
              const saved = !!registry[cardId];
              const n = count(cardId);
              const busy = saving.has(c.id);
              return (
                <button
                  key={c.id}
                  className={'official-thumb' + (saved ? ' saved' : '') + (busy ? ' busy' : '')}
                  disabled={busy || (saved && n >= max(cardId))}
                  onClick={() => void pick(c.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (saved) onDetail(cardId);
                  }}
                  onMouseEnter={() => saved && onHover?.(cardId)}
                  onMouseLeave={() => onHover?.(null)}
                  title={saved ? registry[cardId].name : c.id}
                >
                  <Thumb thumbUrl={c.thumbUrl} imageRef={saved ? registry[cardId].imageRef : undefined} alt={c.id} />
                  {busy && <span className="saved-badge busy-badge">保存中…</span>}
                  {saved && !busy && <span className="saved-badge">{n}/{max(cardId)}</span>}
                </button>
              );
            })}
          </div>
          {result.lastPage > 1 && (
            <div className="row pager">
              <button disabled={result.page <= 1} onClick={() => void run(result.page - 1)}>‹ 前へ</button>
              <span>
                {result.page} / {result.lastPage}
              </span>
              <button disabled={result.page >= result.lastPage} onClick={() => void run(result.page + 1)}>次へ ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** 保存済みならブラウザ内の画像、未保存なら公式サイトのサムネイル */
function Thumb({ thumbUrl, imageRef, alt }: { thumbUrl: string; imageRef?: string; alt: string }) {
  const cached = useCachedImage(imageRef);
  return <img src={cached ?? thumbUrl} alt={alt} loading="lazy" referrerPolicy="no-referrer" />;
}
