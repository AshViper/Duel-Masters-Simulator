import { useState } from 'react';
import { deckCountLabel, isDeckLegal } from '../../core/deck/rules';
import { useApp } from '../../store/appStore';
import { useOnline } from '../../store/onlineStore';
import { Header } from './Menus';

/** オンライン対戦：部屋を作る／部屋に入る */
export function OnlineScreen() {
  const { decks, registry, settings, updateSettings, touchRecent, go } = useApp();
  const { role, status, code, message, host, join, leave } = useOnline();
  const [deckId, setDeckId] = useState(decks[0]?.id ?? '');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const deck = decks.find((d) => d.id === deckId);
  const legal = !!deck && isDeckLegal(deck, settings.format, registry);
  const busy = status === 'opening' || status === 'waiting' || status === 'connecting';

  const back = () => {
    leave();
    go('setup');
  };

  return (
    <div className="screen">
      <Header title="オンライン対戦" />
      <div className="setup">
        <div className="mode-tabs">
          <button onClick={back}>CPU対戦・1人回し</button>
          <button className="on">オンライン対戦</button>
        </div>
        <label>
          あなたの名前
          <input
            value={settings.playerName}
            placeholder={role === 'guest' ? 'ゲスト' : 'ホスト'}
            maxLength={20}
            onChange={(e) => void updateSettings({ playerName: e.target.value })}
            disabled={busy}
            data-testid="online-name"
          />
        </label>
        <label>
          使うデッキ
          <select value={deckId} onChange={(e) => setDeckId(e.target.value)} disabled={busy} data-testid="online-deck">
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}（{deckCountLabel(d, registry)}{isDeckLegal(d, settings.format, registry) ? '' : '・ルール違反'}）
              </option>
            ))}
          </select>
        </label>
        {decks.length > 0 && !legal && <p className="ng">構築ルールを満たすデッキを選んでください</p>}

        {status === 'waiting' && role === 'host' ? (
          <section className="online-box" data-testid="online-waiting">
            <p>この部屋コードを相手に伝えてください。相手が入ると対戦が始まります。</p>
            <div className="room-code" data-testid="room-code">{code}</div>
            <div className="row">
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(code).then(() => setCopied(true));
                }}
              >
                {copied ? 'コピーしました' : 'コードをコピー'}
              </button>
              <button onClick={leave}>部屋を閉じる</button>
            </div>
            <p className="muted small">相手を待っています…</p>
          </section>
        ) : (
          <div className="online-actions">
            <section className="online-box">
              <h3>部屋を作る</h3>
              <p className="muted small">あなたがホストになります。先攻・後攻はランダムです。</p>
              <button
                className="primary big"
                disabled={!legal || busy}
                onClick={() => {
                  void touchRecent(deck!.id);
                  setCopied(false);
                  void host(deck!);
                }}
                data-testid="online-host"
              >
                {status === 'opening' ? '部屋を作成中…' : '部屋を作る'}
              </button>
            </section>
            <section className="online-box">
              <h3>部屋に入る</h3>
              <input
                className="room-input"
                value={input}
                placeholder="部屋コード（6文字）"
                maxLength={12}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && legal && input && !busy && void join(input, deck!)}
                disabled={busy}
                data-testid="online-code"
              />
              <button
                className="primary big"
                disabled={!legal || !input.trim() || busy}
                onClick={() => {
                  void touchRecent(deck!.id);
                  void join(input, deck!);
                }}
                data-testid="online-join"
              >
                {status === 'connecting' ? '接続中…' : '入る'}
              </button>
            </section>
          </div>
        )}
        {status === 'error' && message && <p className="ng" data-testid="online-error">{message}</p>}
        <p className="muted small">
          接続の仲介に PeerJS の公開サーバーを使い、対戦データはブラウザ同士で直接やり取りします。デッキのカード情報と画像は対戦中だけ相手に渡し、相手の端末には保存しません。
          回線（携帯回線や一部のルーター）によっては接続できないことがあります。
        </p>
      </div>
    </div>
  );
}
