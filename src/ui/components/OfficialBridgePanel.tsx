import { useEffect, useRef } from 'react';
import { DM_ORIGIN } from '../../server/dmOfficial';
import { needsBridge } from '../officialApi';
import { bookmarkletHref, useBridgeConnected } from '../officialBridge';

/**
 * 中継サーバーのない版（GitHub Pages）で、公式サイトとつなぐ手順とブックマークレットを出す。
 * ローカル版・中継を設定した版では何も出さない。
 */
export function OfficialBridgePanel({ compact = false }: { compact?: boolean }) {
  const connected = useBridgeConnected();
  const link = useRef<HTMLAnchorElement>(null);
  // React は javascript: の href を書き換えるので、DOM に直接設定する
  useEffect(() => {
    link.current?.setAttribute('href', bookmarkletHref());
  });
  if (!needsBridge()) return null;

  if (connected) {
    return (
      <p className="bridge-panel ok" data-testid="bridge-status">
        ● 公式サイトとつながっています（公式カード検索のタブは開いたままにしてください）
      </p>
    );
  }
  return (
    <div className="bridge-panel" data-testid="bridge-status">
      <strong>公式サイトとつなぐ</strong>
      {!compact && (
        <p className="small">
          この版はサーバーを使わないため、公式サイトの取得は、あなたが開いた公式カード検索のタブが代わりに行います（取得した内容はこのブラウザの中だけで使います）。
        </p>
      )}
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
    </div>
  );
}
