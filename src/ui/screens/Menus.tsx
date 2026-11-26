import { useEffect, useState } from 'react';
import { DEFAULT_FORMAT } from '../../core/deck/rules';
import { db, type MatchRecord } from '../../db/db';
import { useApp } from '../../store/appStore';
import { Header } from '../components/AppShell';
export { Header };

export { HomeScreen, DeckListScreen } from './Home';

/** 設定：対戦・プレイヤー・構築ルール・データ（左）｜殿堂レギュレーション（右） */
export function SettingsScreen() {
  const { settings, updateSettings, clearCustomCards, registry } = useApp();
  const [restricted, setRestricted] = useState(JSON.stringify(settings.format.restricted, null, 1));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fmt = settings.format;
  const entries = Object.entries(fmt.restricted);
  const setFormat = (patch: Partial<typeof fmt>) => void updateSettings({ format: { ...fmt, ...patch } });
  return (
    <div className="screen fill">
      <Header title="設定" sub={<span className="muted">変更はすぐに保存されます</span>} />
      <div className="settings-body">
        <div className="settings-col">
          <section className="panel settings-group">
            <div className="panel-title">対戦</div>
            <div className="setting-row">
              <div className="setting-label">
                <b>CPU の行動間隔</b>
                <small>CPU が1つ行動するたびに待つ時間</small>
              </div>
              <div className="setting-control">
                <input type="range" min={0} max={2000} step={100} value={settings.cpuDelayMs} onChange={(e) => void updateSettings({ cpuDelayMs: Number(e.target.value) })} />
                <input className="num wide" type="number" min={0} step={100} value={settings.cpuDelayMs} onChange={(e) => void updateSettings({ cpuDelayMs: Number(e.target.value) })} />
                <span className="unit">ms</span>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <b>プレイヤー名</b>
                <small>オンライン対戦で相手に表示される名前</small>
              </div>
              <div className="setting-control">
                <input value={settings.playerName} maxLength={20} placeholder="未設定" onChange={(e) => void updateSettings({ playerName: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="panel settings-group">
            <div className="panel-title">構築ルール</div>
            <div className="setting-row">
              <div className="setting-label">
                <b>デッキ枚数</b>
                <small>メインデッキの枚数（通常 40）</small>
              </div>
              <div className="setting-control">
                <input className="num wide" type="number" min={1} value={fmt.deckSize} onChange={(e) => setFormat({ deckSize: Number(e.target.value) })} />
                <span className="unit">枚</span>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <b>同名カードの上限</b>
                <small>同じカードを入れられる枚数（通常 4）</small>
              </div>
              <div className="setting-control">
                <input className="num wide" type="number" min={1} value={fmt.maxCopies} onChange={(e) => setFormat({ maxCopies: Number(e.target.value) })} />
                <span className="unit">枚</span>
              </div>
            </div>
            <div className="settings-actions">
              <button onClick={() => void updateSettings({ format: DEFAULT_FORMAT })}>構築ルールを初期値に戻す</button>
            </div>
          </section>

          <section className="panel settings-group danger-zone">
            <div className="panel-title">データ</div>
            <div className="setting-row">
              <div className="setting-label">
                <b>インポートしたカードを削除</b>
                <small>JSON から取り込んだカードをすべて削除します。元に戻せません。</small>
              </div>
              <div className="setting-control">
                <button className="danger" onClick={() => confirm('インポートしたカードをすべて削除しますか？') && void clearCustomCards()}>削除する</button>
              </div>
            </div>
          </section>
        </div>

        <section className="panel settings-group restricted">
          <div className="panel-title">
            殿堂レギュレーション
            <span>{entries.length}件（殿堂 {entries.filter(([, n]) => n === 1).length}・プレミアム殿堂 {entries.filter(([, n]) => n === 0).length}）</span>
          </div>
          <p className="muted small">カードID と上限枚数の JSON。殿堂 = 1、プレミアム殿堂 = 0。</p>
          <div className="restricted-split">
            <textarea spellCheck={false} value={restricted} onChange={(e) => setRestricted(e.target.value)} />
            <ul className="restricted-list">
              {entries.length === 0 && <li className="muted">登録なし</li>}
              {entries.map(([id, n]) => (
                <li key={id}>
                  <span className={'restricted-tag ' + (n === 0 ? 'premium' : 'hall')}>{n === 0 ? 'プレ殿' : '殿堂'}</span>
                  <span className="restricted-name" title={id}>{registry[id]?.name ?? id}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="settings-actions">
            {msg && <span className={msg.ok ? 'ok' : 'ng'}>{msg.text}</span>}
            <button
              className="gold"
              onClick={() => {
                try {
                  const v = JSON.parse(restricted || '{}');
                  setFormat({ restricted: v });
                  setMsg({ ok: true, text: '保存しました' });
                } catch {
                  setMsg({ ok: false, text: 'JSON の形式が正しくありません' });
                }
              }}
            >
              殿堂リストを保存
            </button>
          </div>
        </section>
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
