import { useEffect, useMemo, useRef, useState } from 'react';
import { OFFICIAL_PREFIX } from '../../core/cards/officialConvert';
import { buildBackup, isBackupFile, parseBackup, restoreBackup } from '../../db/backup';
import { useCardLooks } from '../cardLooks';
import { imageCacheStats } from '../../db/imageCache';
import { deleteAllOfficialCards } from '../../store/officialCards';
import { parseCardJson, searchCards, type CardQuery } from '../../core/cards/registry';
import type { CardDefinition } from '../../core/cards/types';
import { useApp } from '../../store/appStore';
import { CardDetail, CardInfoPanel } from '../components/CardDetail';
import { CardFilter } from '../components/CardFilter';
import { CardView } from '../components/CardView';
import { Header } from './Menus';

export function LibraryScreen() {
  const { cards, decks, importCards, go, init } = useApp();
  const [cache, setCache] = useState<{ count: number; bytes: number } | null>(null);
  const officialCount = useMemo(() => cards.filter((c) => c.id.startsWith(OFFICIAL_PREFIX)).length, [cards]);
  useEffect(() => {
    void imageCacheStats().then(setCache);
  }, [officialCount]);
  const [q, setQ] = useState<CardQuery>({});
  const [detail, setDetail] = useState<CardDefinition | null>(null);
  const [selected, setSelected] = useState<CardDefinition | null>(null);
  const [hover, setHover] = useState<CardDefinition | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchCards(cards, q), [cards, q]);
  const coverage = useMemo(() => {
    const by = { full: 0, partial: 0, manual: 0 };
    for (const c of cards) by[c.support]++;
    return by;
  }, [cards]);

  const [busy, setBusy] = useState(false);
  const backupRef = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    setBusy(true);
    try {
      const b = await buildBackup(useCardLooks.getState().looks);
      const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `card-duel-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg(`カード${b.cards.length}枚・デッキ${b.decks.length}個・画像${b.images.length}枚・見た目の設定${Object.keys(b.looks ?? {}).length}件を書き出しました`);
    } catch (e) {
      setMsg(`書き出しに失敗しました: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onBackupFile = async (f: File) => {
    setBusy(true);
    try {
      const { cards: c, decks: d, images, looks, errors } = parseBackup(JSON.parse(await f.text()));
      const nLooks = Object.keys(looks).length;
      if (c.length + d.length + images.length + nLooks === 0) throw new Error(errors[0] ?? '読み込めるデータがありません');
      if (d.some((x) => decks.some((y) => y.id === x.id)) && !confirm('同じデッキがすでにあります。ファイルの内容で上書きしますか？')) return;
      await restoreBackup({ cards: c, decks: d, images });
      // 画像を先に書いてから見た目を読み込む（選んだ画像が見つからない時間を作らない）
      if (nLooks) useCardLooks.getState().importLooks(looks);
      await init();
      setCache(await imageCacheStats());
      setMsg(`カード${c.length}枚・デッキ${d.length}個・画像${images.length}枚・見た目の設定${nLooks}件を読み込みました` + (errors.length ? `／${errors.slice(0, 3).join('、')}` : ''));
    } catch (e) {
      setMsg(`読み込みに失敗しました: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (backupRef.current) backupRef.current.value = '';
    }
  };

  const onFile = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text());
      if (isBackupFile(raw)) return void (await onBackupFile(f));
      const { cards: parsed, errors } = parseCardJson(raw);
      if (parsed.length) await importCards(parsed);
      setMsg(`${parsed.length}枚を取り込みました` + (errors.length ? `／エラー${errors.length}件: ${errors.slice(0, 3).join('、')}` : ''));
    } catch (e) {
      setMsg(`読み込みに失敗しました: ${(e as Error).message}`);
    }
  };

  return (
    <div className="screen fill">
      <Header title="カード図鑑" sub={<span className="muted">{cards.length}枚</span>}>
        <button onClick={() => go('official')}>公式カード検索で追加</button>
        <button disabled={busy} onClick={() => void onExport()} data-testid="backup-export">バックアップを書き出す</button>
        <button disabled={busy} onClick={() => backupRef.current?.click()} data-testid="backup-import">読み込む</button>
      </Header>
      <div className="library">
        <aside className="panel library-side">
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
            <h4>バックアップ（別のブラウザへ移す）</h4>
            <p className="muted small">カード・画像・デッキを1つのファイルにまとめます。公式カード検索が使えない版（GitHub Pages など）へは、ローカル版で書き出したファイルを読み込んでください。</p>
            <input ref={backupRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void onBackupFile(e.target.files[0])} />
          </div>
          <div className="import">
            <h4>カードデータの取り込み</h4>
            <p className="muted small">利用条件を確認したカードデータを JSON で追加できます。効果定義のないカードは「手動処理」として扱われます。</p>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}>JSON を選ぶ</button>
            {msg && <p className="small">{msg}</p>}
          </div>
        </aside>
        <main className="panel library-main">
          <div className="result-count muted small">{results.length}件　クリックで詳細・右クリックで拡大</div>
          <div className="pool-grid lib">
            {results.map((c) => (
              <div key={c.id} className="pool-cell">
                <CardView
                  card={c}
                  size="sm"
                  selected={selected?.id === c.id}
                  onClick={() => setSelected(c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setDetail(c);
                  }}
                  onHover={(on) => setHover(on ? c : null)}
                  testId={`lib-${c.id}`}
                />
              </div>
            ))}
          </div>
        </main>
        <CardInfoPanel card={hover ?? selected} />
      </div>
      {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
