import { useEffect, useState } from 'react';
import { useApp } from '../../store/appStore';
import { saveOfficialCards } from '../../store/officialCards';
import { clearBridgeImportRequest, useBridgeConnected, useBridgeImportRequest } from '../officialBridge';

// ブックマークレット（またはユーザースクリプトの「DMシミュへ保存」）を押したページ（公式の検索結果・カード詳細）に出ていたカードを、自動で保存する。
// 進み具合と結果を画面上部に出す。保存済みのカードは公式へ取りに行かない。

type Status = { phase: 'saving'; done: number; total: number } | { phase: 'done'; saved: number; skipped: number; errors: string[] };

export function BridgeImport() {
  const request = useBridgeImportRequest();
  const ready = useApp((s) => s.ready);
  const connected = useBridgeConnected();
  const go = useApp((s) => s.go);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!request || !ready || !connected) return;
    clearBridgeImportRequest();
    const ids = request.ids;
    setStatus({ phase: 'saving', done: 0, total: ids.length });
    void saveOfficialCards(ids, (done, total) => setStatus({ phase: 'saving', done, total })).then((r) =>
      setStatus({ phase: 'done', saved: r.saved, skipped: r.skipped, errors: r.errors }),
    );
  }, [request, ready, connected]);

  if (!status) return null;
  if (status.phase === 'saving') {
    return (
      <div className="bridge-banner" data-testid="bridge-import">
        公式サイトのカードを保存しています… {status.done}/{status.total}
      </div>
    );
  }
  const { saved, skipped, errors } = status;
  return (
    <div className={'bridge-banner' + (errors.length ? ' warn' : '')} data-testid="bridge-import">
      <span>
        {saved === 0 && skipped > 0 ? `${skipped}枚とも保存済みです` : `${saved}枚を保存しました${skipped ? `（${skipped}枚は保存済み）` : ''}`}
        {errors.length ? `。${errors.length}枚は失敗：${errors.slice(0, 2).join('、')}` : ''}
      </span>
      <button
        onClick={() => {
          setStatus(null);
          go('library');
        }}
      >
        カード図鑑で見る
      </button>
      <button onClick={() => setStatus(null)}>閉じる</button>
    </div>
  );
}
