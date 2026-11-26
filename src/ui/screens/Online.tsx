import { useState } from 'react';
import { isDeckLegal } from '../../core/deck/rules';
import { useApp } from '../../store/appStore';
import { useOnline, type OnlineStatus } from '../../store/onlineStore';
import { DeckPicker } from '../components/DeckPicker';
import { Header } from './Menus';

const STATUS_LABEL: Record<OnlineStatus, string> = {
  idle: '未接続',
  opening: '部屋を作成中…',
  waiting: '相手を待っています',
  connecting: '接続中…',
  playing: '対戦中',
  disconnected: '接続が切れました',
  error: 'エラー',
};

/** オンライン対戦：プレイヤーとデッキ（左）｜部屋を作る／部屋に入る（右） */
export function OnlineScreen() {
  const { decks, registry, settings, updateSettings, touchRecent, go } = useApp();
  const { role, status, code, message, host, join, leave } = useOnline();
  const [deckId, setDeckId] = useState(decks[0]?.id ?? '');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const deck = decks.find((d) => d.id === deckId);
  const legal = !!deck && isDeckLegal(deck, settings.format, registry);
  const busy = status === 'opening' || status === 'waiting' || status === 'connecting';
  const canJoin = legal && !!input.trim() && !busy;

  const back = () => {
    leave();
    go('setup');
  };
  const doJoin = () => {
    void touchRecent(deck!.id);
    void join(input, deck!);
  };

  return (
    <div className="screen fill">
      <Header title="オンライン対戦" sub={<span className={'net-status ' + status}><i />{STATUS_LABEL[status]}</span>}>
        <button onClick={back}>CPU対戦・1人回しへ</button>
      </Header>
      <div className="setup-body online">
        <div className="online-left">
          <section className="panel online-player">
            <div className="panel-title">プレイヤー名 <span>相手の画面に表示されます</span></div>
            <input
              value={settings.playerName}
              placeholder={role === 'guest' ? 'ゲスト' : 'ホスト'}
              maxLength={20}
              onChange={(e) => void updateSettings({ playerName: e.target.value })}
              disabled={busy}
              data-testid="online-name"
            />
          </section>
          <DeckPicker label="使うデッキ" value={deckId} onChange={setDeckId} disabled={busy} testId="online-deck" />
        </div>

        <section className="panel online-room">
          <div className="panel-title">部屋</div>
          {status === 'waiting' && role === 'host' ? (
            <div className="room-waiting" data-testid="online-waiting">
              <p>この部屋コードを相手に伝えてください。<br />相手が入ると対戦が始まります。</p>
              <div className="room-code" data-testid="room-code">{code}</div>
              <div className="row center">
                <button className="primary" onClick={() => void navigator.clipboard?.writeText(code).then(() => setCopied(true))}>
                  {copied ? '✓ コピーしました' : 'コードをコピー'}
                </button>
                <button className="danger" onClick={leave}>部屋を閉じる</button>
              </div>
              <div className="waiting-pulse" aria-hidden><span /><span /><span /></div>
            </div>
          ) : (
            <div className="room-choices">
              <div className="room-choice">
                <div className="room-choice-head">
                  <span className="room-choice-icon" aria-hidden>✦</span>
                  <div>
                    <b>部屋を作る</b>
                    <small>あなたがホストになります。先攻・後攻はランダムです。</small>
                  </div>
                </div>
                <button
                  className="gold big"
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
              </div>
              <div className="room-or"><span>または</span></div>
              <div className="room-choice">
                <div className="room-choice-head">
                  <span className="room-choice-icon" aria-hidden>⇥</span>
                  <div>
                    <b>部屋に入る</b>
                    <small>相手から聞いた部屋コードを入力します。</small>
                  </div>
                </div>
                <input
                  className="room-input"
                  value={input}
                  placeholder="部屋コード"
                  maxLength={12}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canJoin && doJoin()}
                  disabled={busy}
                  data-testid="online-code"
                />
                <button className="primary big" disabled={!canJoin} onClick={doJoin} data-testid="online-join">
                  {status === 'connecting' ? '接続中…' : '入る'}
                </button>
              </div>
            </div>
          )}
          {decks.length > 0 && !legal && <p className="ng small">構築ルールを満たすデッキを選んでください</p>}
          {status === 'error' && message && <p className="ng" data-testid="online-error">{message}</p>}
          <p className="online-note">
            接続の仲介に PeerJS の公開サーバーを使い、対戦データはブラウザ同士で直接やり取りします。デッキのカード情報と画像は対戦中だけ相手に渡し、相手の端末には保存しません。
            回線（携帯回線や一部のルーター）によっては接続できないことがあります。
          </p>
        </section>
      </div>
    </div>
  );
}
