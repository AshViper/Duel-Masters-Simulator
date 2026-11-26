import { useEffect, useMemo, useRef, useState } from 'react';
import { OFFICIAL_PREFIX } from '../../core/cards/officialConvert';
import { imageCacheStats } from '../../db/imageCache';
import { deleteAllOfficialCards } from '../../store/officialCards';
import { parseCardJson, searchCards, type CardQuery } from '../../core/cards/registry';
import type { CardDefinition } from '../../core/cards/types';
import { useApp } from '../../store/appStore';
import { CardDetail } from '../components/CardDetail';
import { CardFilter } from '../components/CardFilter';
import { CardView } from '../components/CardView';
import { Header } from './Menus';

export function LibraryScreen() {
  const { cards, importCards, go } = useApp();
  const [cache, setCache] = useState<{ count: number; bytes: number } | null>(null);
  const officialCount = useMemo(() => cards.filter((c) => c.id.startsWith(OFFICIAL_PREFIX)).length, [cards]);
  useEffect(() => {
    void imageCacheStats().then(setCache);
  }, [officialCount]);
  const [q, setQ] = useState<CardQuery>({});
  const [detail, setDetail] = useState<CardDefinition | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCards(cards, q), [cards, q]);
  const coverage = useMemo(() => {
    const by = { full: 0, partial: 0, manual: 0 };
    for (const c of cards) by[c.support]++;
    return by;
  }, [cards]);

  const onFile = async (f: File) => {
    try {
      const { cards: parsed, errors } = parseCardJson(JSON.parse(await f.text()));
      if (parsed.length) await importCards(parsed);
      setMsg(`${parsed.length}枚を取り込みました` + (errors.length ? `／エラー${errors.length}件: ${errors.slice(0, 3).join('、')}` : ''));
    } catch (e) {
      setMsg(`読み込みに失敗しました: ${(e as Error).message}`);
    }
  };

  return (
    <div className="screen">
      <Header title="カード図鑑" />
      <div className="library">
        <aside>
          <CardFilter q={q} onChange={setQ} cards={cards} full />
          <div className="coverage">
            <h4>収録・対応状況</h4>
            <div>収録数 {cards.length}枚</div>
            <div className="support-full">自動処理 {coverage.full}</div>
            <div className="support-partial">一部手動 {coverage.partial}</div>
            <div className="support-manual">手動処理 {coverage.manual}</div>
          </div>
          <div className="import">
            <h4>保存した公式カード</h4>
            <p className="small">
              {officialCount}枚（画像 {cache ? `${cache.count}枚・${(cache.bytes / 1024 / 1024).toFixed(1)}MB` : '…'}）
            </p>
            <p className="muted small">ブラウザ内に保存済み。デッキ構築・対戦では公式サーバーにアクセスしません。</p>
            <div className="row">
              <button onClick={() => go('official')}>公式カード検索で追加</button>
              <button
                className="danger"
                disabled={officialCount === 0}
                onClick={() => confirm('保存した公式カードと画像をすべて削除しますか？（デッキに入れたカードは「未登録」になります）') && void deleteAllOfficialCards().then((n) => setMsg(`${n}枚を削除しました`))}
              >
                すべて削除
              </button>
            </div>
          </div>
          <div className="import">
            <h4>カードデータの取り込み</h4>
            <p className="muted small">利用条件を確認したカードデータを JSON で追加できます。効果定義のないカードは「手動処理」として扱われます。</p>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}>JSON を選ぶ</button>
            {msg && <p className="small">{msg}</p>}
          </div>
        </aside>
        <main>
          <div className="result-count muted">{results.length}件</div>
          <div className="card-grid lib">
            {results.map((c) => (
              <CardView key={c.id} card={c} size="md" onClick={() => setDetail(c)} testId={`lib-${c.id}`} />
            ))}
          </div>
        </main>
      </div>
      {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
