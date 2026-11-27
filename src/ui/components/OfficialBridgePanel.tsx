import { useEffect, useRef } from 'react';
import { DM_ORIGIN } from '../../server/dmOfficial';
import { needsBridge } from '../officialApi';
import { bookmarkletHref, useBridgeKind } from '../officialBridge';

/**
 * 中継サーバーのない版（GitHub Pages）で、公式サイトとつなぐ手順とブックマークレットを出す。
 * ローカル版・中継を設定した版では何も出さない。
 */
/** Pages 版と同じ場所に置いているユーザースクリプト（public/dm-bridge.user.js） */
const USERSCRIPT_URL = `${import.meta.env.BASE_URL}dm-bridge.user.js`;

export function OfficialBridgePanel({ compact = false }: { compact?: boolean }) {
  const kind = useBridgeKind();
  const link = useRef<HTMLAnchorElement>(null);
  // React は javascript: の href を書き換えるので、DOM に直接設定する
  useEffect(() => {
    link.current?.setAttribute('href', bookmarkletHref());
  });
  if (!needsBridge()) return null;

  if (kind === 'relay') {
    return (
      <p className="bridge-panel ok" data-testid="bridge-status">
        ● 公式サイトとつながっています
      </p>
    );
  }
  if (kind === 'userscript') {
    return (
      <p className="bridge-panel ok" data-testid="bridge-status">
        ● 公式サイトとつながっています（ユーザースクリプトで自動接続）
      </p>
    );
  }
  if (kind === 'tab') {
    return (
      <p className="bridge-panel ok" data-testid="bridge-status">
        ● 公式サイトとつながっています（公式カード検索のタブは開いたままにしてください）
      </p>
    );
  }
  return (
    <div className="bridge-panel" data-testid="bridge-status">
      <strong>公式サイトとつなぐ</strong>（いつもは自動でつながります。中継サーバーに届かない時だけ、次のどちらかでつないでください）
      {!compact && (
        <p className="small">
          この版はサーバーを使わないため、公式サイトの取得は、ユーザースクリプト（またはあなたが開いた公式カード検索のタブ）が代わりに行います（取得した内容はこのブラウザの中だけで使います）。
        </p>
      )}
      <p className="small">
        <b>おすすめ：自動でつなぐ（ブラウザごとに最初の1回だけ）</b>
      </p>
      <ol className="small">
        <li>
          ブラウザに拡張機能「Tampermonkey」か「Violentmonkey」を入れる（Chrome・Edge では拡張機能の詳細で「ユーザー スクリプトを許可」をオンにする）
        </li>
        <li>
          <a href={USERSCRIPT_URL} target="_blank" rel="noreferrer">
            ユーザースクリプトを入れる
          </a>
          （開いた画面で「インストール」を押す）
        </li>
        <li>このページを再読み込みする。以後はアプリを開くだけでつながります。公式カード検索のページには「DMシミュへ保存」ボタンも出ます</li>
      </ol>
      <details className="small">
        <summary>拡張機能を入れずにつなぐ（ブックマークレット・毎回押す）</summary>
        <ol className="small">
          <li>
            次のボタンをブックマークバーへドラッグして登録する：{' '}
            <a ref={link} className="bookmarklet" onClick={(e) => e.preventDefault()} title="ブックマークバーへドラッグしてください">
              DMシミュへ接続
            </a>
          </li>
          <li>
            <a href={`${DM_ORIGIN}/card/`} target="_blank" rel="noreferrer">
              公式カード検索
            </a>
            で欲しいカードを検索して（またはカードの詳細ページを開いて）、登録したブックマークを押す
          </li>
          <li>このアプリが開き、そのページのカードが自動で保存されます。つながっている間は、ここでの検索・保存もできます</li>
        </ol>
      </details>
    </div>
  );
}
