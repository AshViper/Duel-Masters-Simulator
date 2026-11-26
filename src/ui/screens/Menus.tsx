import { useEffect, useState } from 'react';
import { DEFAULT_FORMAT } from '../../core/deck/rules';
import { db, type MatchRecord } from '../../db/db';
import { useApp } from '../../store/appStore';
import { Header } from '../components/AppShell';
export { Header };

export { HomeScreen, DeckListScreen } from './Home';

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
