import { useEffect, useRef, useState } from 'react';
import { officialCardId } from '../../core/cards/officialConvert';
import type { CardDefinition } from '../../core/cards/types';
import { nameMatchScore, parseDeckText, type DeckTextEntry } from '../../core/deck/deckText';
import { useCachedImage } from '../../db/imageCache';
import type { ResolvedCandidate } from '../../server/dmOfficial';
import { useApp } from '../../store/appStore';
import { saveOfficialCard } from '../../store/officialCards';
import { api } from '../officialApi';
import { Modal } from './CardDetail';

// AI などで作ったデッキリストのテキストを貼り付けて、そのままデッキにする。
// カード名は ①保存済みのカード → ②公式カード検索 の順に探す。公式のカードは反映する時に保存する。

interface Choice {
  /** 保存済みなら cardId（dm:...）、公式の未保存カードなら公式 ID */
  key: string;
  label: string;
  local?: CardDefinition;
  official?: ResolvedCandidate;
  score: number;
}

interface Row {
  entry: DeckTextEntry;
  count: number;
  state: 'waiting' | 'resolving' | 'done' | 'error';
  choices: Choice[];
  /** 選んだ Choice.key（'' は入れない） */
  chosen: string;
  error?: string;
}

const SAMPLE = `| カード | 枚数 | 役割 |
|---|---|---|
| 《ロジック・サークル》 | 4 | 呪文確保 |
| 《サイバー・ブレイン》 | 4 | ドロー |`;

function localChoices(name: string, cards: CardDefinition[]): Choice[] {
  return cards
    .map((c) => ({ c, score: nameMatchScore(name, c.name, [c.name, c.twin?.name ?? '']) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .map(({ c, score }) => ({ key: c.id, label: c.name, local: c, score }));
}

export function DeckTextImport({ onClose, onApply, initialText }: { initialText?: string; onClose: () => void; onApply: (cards: Record<string, number>, mode: 'replace' | 'add') => void }) {
  const cards = useApp((s) => s.cards);
  const registry = useApp((s) => s.registry);
  const [text, setText] = useState(initialText ?? '');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const cancel = useRef({ cancelled: false });

  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs && rs.map((r, k) => (k === i ? { ...r, ...p } : r)));

  const read = async (src = text) => {
    const parsed = parseDeckText(src);
    setSkipped(parsed.skipped);
    setError(parsed.entries.length === 0 ? 'カード名と枚数を読み取れませんでした。「《カード名》 4」や表の形で貼り付けてください。' : '');
    const initial: Row[] = parsed.entries.map((entry) => {
      const choices = localChoices(entry.name, cards);
      return { entry, count: entry.count, choices, chosen: choices[0]?.key ?? '', state: choices.length ? 'done' : 'waiting' };
    });
    setRows(initial);
    cancel.current = { cancelled: false };
    const signal = cancel.current;
    // 保存済みのカードで見つからなかった名前だけ、公式カード検索で探す（1件ずつ）
    for (let i = 0; i < initial.length; i++) {
      if (signal.cancelled) return;
      if (initial[i].state === 'done') continue;
      setBusy(`公式カード検索で探しています… ${i + 1}/${initial.length}`);
      patch(i, { state: 'resolving' });
      try {
        const r = await api<{ candidates: ResolvedCandidate[] }>(`/dm-api/resolve?name=${encodeURIComponent(initial[i].entry.name)}`);
        const choices: Choice[] = r.candidates.map((c) => {
          const local = registry[officialCardId(c.id)];
          return { key: local ? local.id : c.id, label: c.name, local, official: c, score: c.score };
        });
        // 完全一致・片面一致なら自動で選ぶ。部分一致だけの時も先頭を選ぶが、確認を促す
        patch(i, { state: 'done', choices, chosen: choices[0]?.key ?? '' });
      } catch (e) {
        patch(i, { state: 'error', error: (e as Error).message });
      }
    }
    setBusy('');
  };

  // デフォルトデッキなど、最初から内容が決まっている時はすぐ読み取る
  const autoRead = useRef(false);
  useEffect(() => {
    if (initialText && !autoRead.current) {
      autoRead.current = true;
      void read(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = async (mode: 'replace' | 'add') => {
    if (!rows) return;
    const out: Record<string, number> = {};
    const picked = rows.filter((r) => r.chosen && r.count > 0);
    for (let i = 0; i < picked.length; i++) {
      const r = picked[i];
      const choice = r.choices.find((c) => c.key === r.chosen)!;
      let cardId = choice.local?.id;
      if (!cardId && choice.official) {
        setBusy(`カードを保存しています… ${i + 1}/${picked.length}（${choice.label}）`);
        try {
          await saveOfficialCard(choice.official.id);
        } catch (e) {
          setBusy('');
          setError(`${choice.label} を保存できませんでした: ${(e as Error).message}`);
          return;
        }
        cardId = officialCardId(choice.official.id);
      }
      if (cardId) out[cardId] = (out[cardId] ?? 0) + r.count;
    }
    setBusy('');
    onApply(out, mode);
    onClose();
  };

  const total = rows?.reduce((s, r) => s + (r.chosen ? r.count : 0), 0) ?? 0;
  const unresolved = rows?.filter((r) => r.state === 'done' && !r.chosen).length ?? 0;
  const resolving = rows?.some((r) => r.state === 'waiting' || r.state === 'resolving') ?? false;

  return (
    <Modal
      wide
      onClose={() => {
        cancel.current.cancelled = true;
        onClose();
      }}
    >
      <div className="text-import" data-testid="text-import">
        <h2>テキストからデッキを作る</h2>
        {!rows ? (
          <>
            <p className="muted small">AI に作らせたデッキリストなどを貼り付けてください。表（Markdown・画面からコピーしたもの）、「《カード名》×4」「4 カード名」などの形を読み取れます。見出しや「合計」の行は無視します。</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE} rows={14} data-testid="text-import-input" />
            {error && <p className="ng small">{error}</p>}
            <div className="row">
              <button className="primary" disabled={!text.trim()} onClick={() => void read()} data-testid="text-import-read">読み取る</button>
            </div>
          </>
        ) : (
          <>
            <div className="row">
              <span className={total === 40 ? 'ok' : 'ng'}>合計 {total} 枚</span>
              {unresolved > 0 && <span className="ng">見つからないカード {unresolved} 種</span>}
              {busy && <span className="muted">{busy}</span>}
            </div>
            <table className="text-import-table">
              <thead>
                <tr><th></th><th>書かれた名前</th><th>使うカード</th><th>枚数</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const choice = r.choices.find((c) => c.key === r.chosen);
                  const fuzzy = choice && choice.score < 2;
                  return (
                    <tr key={i} className={!choice && r.state === 'done' ? 'missing' : fuzzy ? 'fuzzy' : ''}>
                      <td className="thumb-cell"><ChoiceThumb choice={choice} /></td>
                      <td>
                        {r.entry.name}
                        {r.entry.countGuessed && <div className="muted small">枚数が書かれていないので1枚</div>}
                      </td>
                      <td>
                        {r.state === 'waiting' && <span className="muted">待機中</span>}
                        {r.state === 'resolving' && <span className="muted">検索中…</span>}
                        {r.state === 'error' && <span className="ng small">{r.error}</span>}
                        {r.state === 'done' && (
                          <>
                            <select value={r.chosen} onChange={(e) => patch(i, { chosen: e.target.value })} data-testid={`text-import-choice-${i}`}>
                              {r.choices.map((c) => (
                                <option key={c.key} value={c.key}>
                                  {c.label}
                                  {c.official ? `（${c.official.id}）` : ''}
                                  {c.local ? ' ✓保存済み' : ''}
                                </option>
                              ))}
                              <option value="">入れない</option>
                            </select>
                            {r.choices.length === 0 && <div className="ng small">見つかりませんでした（名前を確認してください）</div>}
                            {fuzzy && <div className="warn small">名前が完全には一致しません。確認してください</div>}
                          </>
                        )}
                      </td>
                      <td>
                        <input type="number" className="num" min={0} max={40} value={r.count} onChange={(e) => patch(i, { count: Math.max(0, Number(e.target.value) || 0) })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {skipped.length > 0 && (
              <details className="muted small">
                <summary>読み取らなかった行（{skipped.length}）</summary>
                <pre>{skipped.join('\n')}</pre>
              </details>
            )}
            {error && <p className="ng small">{error}</p>}
            <div className="row">
              <button className="primary" disabled={resolving || !!busy || total === 0} onClick={() => void apply('replace')} data-testid="text-import-apply">デッキをこの内容にする</button>
              <button disabled={resolving || !!busy || total === 0} onClick={() => void apply('add')}>今のデッキに追加</button>
              <button
                disabled={!!busy && !resolving}
                onClick={() => {
                  cancel.current.cancelled = true;
                  setBusy('');
                  setRows(null);
                }}
              >
                貼り付けに戻る
              </button>
            </div>
            <p className="muted small">公式のカードは「反映」した時にブラウザへ保存します（以後は通信しません）。</p>
          </>
        )}
      </div>
    </Modal>
  );
}

function ChoiceThumb({ choice }: { choice?: Choice }) {
  const cached = useCachedImage(choice?.local?.imageRef);
  const src = cached ?? choice?.official?.thumbUrl;
  return src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <div className="thumb-empty" />;
}
