import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { OfficialCardDetail, OfficialOptions, OfficialSearchQuery, OfficialSearchResult } from '../../server/dmOfficial';
import { officialCardId } from '../../core/cards/officialConvert';
import { useApp } from '../../store/appStore';
import { saveOfficialCard, saveOfficialCards } from '../../store/officialCards';
import { Modal } from '../components/CardDetail';
import { OfficialBridgePanel } from '../components/OfficialBridgePanel';
import { useBridgeConnected } from '../officialBridge';
import { api } from '../officialApi';
import { Header } from './Menus';

// 公式カード検索。検索・閲覧は公式サイトからその都度取得する。
// 「保存」したカードだけ、カード情報と画像をブラウザ（IndexedDB）に保存し、デッキ構築・対戦で使う。
// 保存済みのカードは公式サーバーに再アクセスしない。

const KEYWORD_TYPES = [
  { value: 'card_name', label: 'カード名' },
  { value: 'card_ruby', label: '読み' },
  { value: 'card_text', label: 'テキスト' },
  { value: 'race', label: '種族' },
  { value: 'flavor', label: 'フレーバー' },
  { value: 'illustrator_name', label: 'イラストレーター' },
];
const CIVS = [
  { value: '光', color: '#f4d35e' },
  { value: '水', color: '#4ea8ff' },
  { value: '闇', color: '#9b6bd6' },
  { value: '火', color: '#ff5a4e' },
  { value: '自然', color: '#4cc26b' },
  { value: 'ゼロ', color: '#b8c0cc' },
];
const SELECTS: { name: keyof OfficialSearchQuery; label: string }[] = [
  { name: 'cardtype', label: 'カードの種類' },
  { name: 'twinpact', label: 'ツインパクト' },
  { name: 'race', label: '種族' },
  { name: 'rarity', label: 'レアリティ' },
  { name: 'ability', label: '特殊能力' },
  { name: 'products', label: '商品名' },
  { name: 'format', label: 'フォーマット' },
  { name: 'sort', label: '並び順' },
];

/** 画面を離れても検索条件と結果を保つ（メモリ上のみ。保存はしない） */
const useOfficial = create<{
  query: OfficialSearchQuery;
  result: OfficialSearchResult | null;
  options: OfficialOptions | null;
  set: (p: Partial<{ query: OfficialSearchQuery; result: OfficialSearchResult | null; options: OfficialOptions | null }>) => void;
}>((set) => ({ query: { keywordTypes: ['card_name'], page: 1 }, result: null, options: null, set }));

export function OfficialSearchScreen() {
  const { query, result, options, set } = useOfficial();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const registry = useApp((st) => st.registry);
  const [bulk, setBulk] = useState<{ done: number; total: number; errors: string[]; signal: { cancelled: boolean } } | null>(null);
  const [bulkMsg, setBulkMsg] = useState('');
  const saveAll = async () => {
    if (!result) return;
    const ids = result.cards.map((c) => c.id).filter((id) => !registry[officialCardId(id)]);
    if (ids.length === 0) return setBulkMsg('このページのカードはすべて保存済みです');
    const signal = { cancelled: false };
    setBulk({ done: 0, total: ids.length, errors: [], signal });
    setBulkMsg('');
    const r = await saveOfficialCards(ids, (done, total, errors) => setBulk({ done, total, errors, signal }), signal);
    setBulk(null);
    setBulkMsg(`${r.saved}枚を保存しました${r.errors.length ? `（失敗${r.errors.length}枚：${r.errors.slice(0, 2).join('、')}）` : ''}`);
  };

  // 公式サイトとつながった時（Pages 版）にも読み直す
  const bridged = useBridgeConnected();
  useEffect(() => {
    if (options) return;
    setError('');
    api<OfficialOptions>('/dm-api/options')
      .then((o) => set({ options: o }))
      .catch((e: Error) => setError(`検索条件の読み込みに失敗しました: ${e.message}`));
  }, [options, set, bridged]);

  const update = (p: Partial<OfficialSearchQuery>) => set({ query: { ...query, ...p } });
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
  const toggle = (key: 'keywordTypes' | 'civilizations', v: string) => {
    const cur = query[key] ?? [];
    update({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const num = (v: string) => (v === '' ? undefined : Number(v));

  return (
    <div className="screen">
      <Header title="公式カード検索" />
      <div className="library official">
        <aside>
          <form
            className="filter"
            onSubmit={(e) => {
              e.preventDefault();
              void run(1);
            }}
          >
            <input placeholder="カード名やテキスト" value={query.keyword ?? ''} onChange={(e) => update({ keyword: e.target.value })} data-testid="official-keyword" />
            <div className="check-row">
              {KEYWORD_TYPES.map((t) => (
                <label key={t.value}>
                  <input type="checkbox" checked={query.keywordTypes?.includes(t.value) ?? false} onChange={() => toggle('keywordTypes', t.value)} />
                  {t.label}
                </label>
              ))}
            </div>
            <div className="civ-toggles">
              {CIVS.map((c) => (
                <button type="button" key={c.value} className={'civ-btn' + (query.civilizations?.includes(c.value) ? ' on' : '')} style={{ ['--c' as string]: c.color }} onClick={() => toggle('civilizations', c.value)}>
                  {c.value}
                </button>
              ))}
            </div>
            <label className="row">
              コスト
              <input type="number" min={0} className="num" value={query.costMin ?? ''} onChange={(e) => update({ costMin: num(e.target.value) })} />〜
              <input type="number" min={0} className="num" value={query.costMax ?? ''} onChange={(e) => update({ costMax: num(e.target.value) })} />
            </label>
            <label className="row">
              パワー
              <input type="number" min={0} step={500} className="num wide" value={query.powerMin ?? ''} onChange={(e) => update({ powerMin: num(e.target.value) })} />〜
              <input type="number" min={0} step={500} className="num wide" value={query.powerMax ?? ''} onChange={(e) => update({ powerMax: num(e.target.value) })} />
            </label>
            {SELECTS.map((s) => (
              <select key={s.name} value={(query[s.name] as string) ?? ''} onChange={(e) => update({ [s.name]: e.target.value || undefined })} disabled={!options}>
                <option value="">{s.label}：指定なし</option>
                {(options?.[s.name] ?? []).map((o, i) => (
                  <option key={`${i}-${o.value}`} value={o.value}>{o.label}</option>
                ))}
              </select>
            ))}
            <div className="row">
              <button type="submit" className="primary" disabled={loading} data-testid="official-search">検索</button>
              <button type="button" onClick={() => set({ query: { keywordTypes: ['card_name'], page: 1 }, result: null })}>条件をクリア</button>
            </div>
          </form>
          <p className="muted small">
            検索結果は
            <a href="https://dm.takaratomy.co.jp/card/" target="_blank" rel="noreferrer">デュエル・マスターズ公式カード検索</a>
            からその都度取得しています。「保存」したカードだけ、情報と画像をこのブラウザ内に保存し、デッキ構築・対戦ではそれを使います（公式サーバーに再アクセスしません）。個人利用の範囲でお使いください。著作権は各権利者に帰属します。
          </p>
        </aside>
        <main>
          <OfficialBridgePanel />
          {error && <p className="ng">{error}</p>}
          {loading && <p className="muted">公式サイトから取得中…</p>}
          {result && !loading && (
            <>
              <Pager result={result} onPage={(p) => void run(p)} />
              {result.cards.length > 0 && (
                <div className="row save-bar">
                  {bulk ? (
                    <>
                      <progress max={bulk.total} value={bulk.done} />
                      <span>{bulk.done} / {bulk.total} 枚を保存中…</span>
                      <button onClick={() => (bulk.signal.cancelled = true)}>中止</button>
                    </>
                  ) : (
                    <button onClick={() => void saveAll()} data-testid="official-save-page">このページのカードを保存（デッキ構築・対戦用）</button>
                  )}
                  <span className="muted small">保存済み {result.cards.filter((c) => registry[officialCardId(c.id)]).length} / {result.cards.length}</span>
                  {bulkMsg && <span className="small">{bulkMsg}</span>}
                </div>
              )}
              {result.cards.length === 0 && <p className="muted">該当するカードがありません</p>}
              <div className="official-grid" data-testid="official-results">
                {result.cards.map((c) => (
                  <button key={c.id} className={'official-thumb' + (registry[officialCardId(c.id)] ? ' saved' : '')} onClick={() => setDetailId(c.id)} title={c.id}>
                    <img src={c.thumbUrl} alt={c.id} loading="lazy" referrerPolicy="no-referrer" />
                    {registry[officialCardId(c.id)] && <span className="saved-badge">保存済</span>}
                  </button>
                ))}
              </div>
              <Pager result={result} onPage={(p) => void run(p)} />
            </>
          )}
          {!result && !loading && <p className="muted">条件を指定して検索してください（条件なしで検索すると新しい順に表示します）。</p>}
        </main>
      </div>
      {detailId && <OfficialDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function Pager({ result, onPage }: { result: OfficialSearchResult; onPage: (p: number) => void }) {
  if (result.lastPage <= 1) return null;
  return (
    <div className="row pager">
      <button disabled={result.page <= 1} onClick={() => onPage(1)}>«</button>
      <button disabled={result.page <= 1} onClick={() => onPage(result.page - 1)}>‹ 前へ</button>
      <span>
        {result.page} / {result.lastPage} ページ
      </span>
      <button disabled={result.page >= result.lastPage} onClick={() => onPage(result.page + 1)}>次へ ›</button>
      <button disabled={result.page >= result.lastPage} onClick={() => onPage(result.lastPage)}>»</button>
    </div>
  );
}

function OfficialDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [detail, setDetail] = useState<OfficialCardDetail | null>(null);
  const [error, setError] = useState('');
  const saved = useApp((st) => !!st.registry[officialCardId(id)]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDetail(null);
    api<OfficialCardDetail>(`/dm-api/detail?id=${encodeURIComponent(id)}`)
      .then(setDetail)
      .catch((e: Error) => setError(e.message));
  }, [id]);
  const rows = (f: OfficialCardDetail['faces'][number]) =>
    [
      ['カードの種類', f.type],
      ['文明', f.civilization],
      ['コスト', f.cost],
      ['パワー', f.power],
      ['種族', f.race],
      ['レアリティ', f.rarity],
      ['マナ', f.mana],
      ['イラストレーター', f.illustrator],
    ].filter(([, v]) => v);
  return (
    <Modal onClose={onClose} wide>
      {error && <p className="ng">{error}</p>}
      {!detail && !error && <p className="muted">読み込み中…</p>}
      {detail && (
        <div className="official-detail" data-testid="official-detail">
          <div className="official-detail-img">
            {detail.faces[0]?.imageUrl && <img src={detail.faces[0].imageUrl} alt={detail.faces[0].name} referrerPolicy="no-referrer" />}
          </div>
          <div className="detail-info">
            {detail.faces.map((f, i) => (
              <section key={i} className="official-face">
                <h2>
                  {f.name} <span className="muted small">{f.packName}</span>
                </h2>
                <table>
                  <tbody>
                    {rows(f).map(([k, v]) => (
                      <tr key={k}>
                        <th>{k}</th>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {f.abilities.length > 0 && (
                  <ul className="detail-text abilities">
                    {f.abilities.map((a, k) => <li key={k}>{a}</li>)}
                  </ul>
                )}
                {f.flavor && <p className="flavor">{f.flavor}</p>}
              </section>
            ))}
            <div className="row">
              <button
                className="primary"
                disabled={saved || saving}
                data-testid="official-save"
                onClick={() => {
                  setSaving(true);
                  saveOfficialCard(id)
                    .catch((e: Error) => setError(e.message))
                    .finally(() => setSaving(false));
                }}
              >
                {saved ? '保存済み（デッキ構築・対戦で使えます）' : saving ? '保存中…' : '保存してデッキ構築・対戦で使う'}
              </button>
              <a className="btn" href={detail.detailUrl} target="_blank" rel="noreferrer">公式サイトで見る</a>
              {detail.productUrl && <a className="btn" href={detail.productUrl} target="_blank" rel="noreferrer">収録商品</a>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
