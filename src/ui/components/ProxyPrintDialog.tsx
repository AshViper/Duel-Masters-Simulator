import { useState } from 'react';
import { proxyLayout } from '../../core/print/proxyPdf';
import { createProxyPdf, downloadBlob, type ProxyEntry } from '../proxyPrint';

interface Props {
  deckName: string;
  entries: ProxyEntry[];
  onClose: () => void;
}

/** デッキをプロキシカードとして A4 の PDF にする */
export function ProxyPrintDialog({ deckName, entries, onClose }: Props) {
  const [gapMm, setGapMm] = useState(0);
  const [scalePct, setScalePct] = useState(100);
  const [marks, setMarks] = useState(true);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = entries.reduce((s, e) => s + e.count, 0);
  const noImage = entries.filter((e) => !e.card?.imageRef && !e.card?.imageUrl).length;
  const layout = proxyLayout(total, { gapMm, scale: scalePct / 100 });
  const busy = progress !== null;

  const run = async () => {
    setError(null);
    setProgress([0, entries.length]);
    try {
      const blob = await createProxyPdf(entries, { gapMm, scale: scalePct / 100, cropMarks: marks, onProgress: (d, t) => setProgress([d, t]) });
      downloadBlob(blob, `${deckName.replace(/[\\/:*?"<>|]/g, '_') || 'deck'}_proxy.pdf`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal proxy-dialog" onClick={(e) => e.stopPropagation()} data-testid="proxy-dialog">
        <button className="modal-close" onClick={onClose} disabled={busy}>×</button>
        <h2>プロキシPDF（A4）</h2>
        <p className="muted small">
          {total}枚 → A4 {layout.pages.length}ページ（1ページ {layout.cols}×{layout.rows} = {layout.cols * layout.rows}枚、カード {layout.cardW.toFixed(1)}×{layout.cardH.toFixed(1)}mm）
        </p>
        <label>
          カードの間隔
          <select value={gapMm} onChange={(e) => setGapMm(Number(e.target.value))} disabled={busy}>
            <option value={0}>なし（まとめて裁断）</option>
            <option value={1}>1mm</option>
            <option value={2}>2mm</option>
          </select>
        </label>
        <label>
          倍率
          <select value={scalePct} onChange={(e) => setScalePct(Number(e.target.value))} disabled={busy}>
            {[95, 97, 98, 99, 100, 101].map((v) => <option key={v} value={v}>{v}%{v === 100 ? '（実寸 63×88mm）' : ''}</option>)}
          </select>
        </label>
        <label>
          裁断用のトンボ
          <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} disabled={busy} />
        </label>
        {noImage > 0 && <p className="muted small">画像が保存されていないカード {noImage}種は、文字だけのプロキシになります。</p>}
        <p className="muted small">印刷するときは「実際のサイズ（100%）」を選び、「用紙に合わせる」はオフにしてください。</p>
        {error && <p className="error">PDF を作れませんでした：{error}</p>}
        <div className="toolbar">
          <button className="primary" onClick={() => void run()} disabled={busy || total === 0} data-testid="proxy-pdf-run">
            {busy ? `作成中… ${progress[0]}/${progress[1]}` : 'PDFを作成'}
          </button>
          <button onClick={onClose} disabled={busy}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
