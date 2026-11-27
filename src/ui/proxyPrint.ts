import { CARD_TYPE_LABEL, CIV_LABEL, type CardDefinition } from '../core/cards/types';
import { buildPdf, cropMarks, proxyLayout, type PdfImage, type PdfPage, type ProxyLayoutOptions } from '../core/print/proxyPdf';
import { db } from '../db/db';
import { CIV_COLOR } from './components/CardView';
import { lookOf } from './cardLooks';

// デッキからプロキシ印刷用の A4 PDF を作る。
// 画像は IndexedDB に保存済みのものを使う（公式サーバーへはアクセスしない）。画像がないカードは文字だけのプロキシを描く。

/** 63×88mm を 300dpi 相当で描く */
const PX_W = 744;
const PX_H = 1039;

export interface ProxyPdfOptions extends ProxyLayoutOptions {
  /** 裁断用のトンボを入れる */
  cropMarks?: boolean;
  onProgress?: (done: number, total: number) => void;
}

export interface ProxyEntry {
  id: string;
  count: number;
  card?: CardDefinition;
}

export async function createProxyPdf(entries: ProxyEntry[], opts: ProxyPdfOptions = {}): Promise<Blob> {
  const list = entries.filter((e) => e.count > 0);
  const images: PdfImage[] = [];
  const imageIndex = new Map<string, number>();
  for (const [i, e] of list.entries()) {
    opts.onProgress?.(i, list.length);
    imageIndex.set(e.id, images.length);
    images.push(await renderCard(e));
  }
  opts.onProgress?.(list.length, list.length);

  const order = list.flatMap((e) => Array.from({ length: e.count }, () => imageIndex.get(e.id)!));
  const layout = proxyLayout(order.length, opts);
  const pages: PdfPage[] = layout.pages.map((slots) => ({
    images: slots.map((s) => ({ image: order[s.index], x: s.x, y: s.y, w: s.w, h: s.h })),
    lines: opts.cropMarks === false ? [] : cropMarks(layout, slots),
  }));
  const bytes = buildPdf(pages, images);
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function renderCard(e: ProxyEntry): Promise<PdfImage> {
  const canvas = document.createElement('canvas');
  canvas.width = PX_W;
  canvas.height = PX_H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, PX_W, PX_H);
  const bitmap = await loadBitmap(e.card);
  if (bitmap) {
    // カードの比率に合わせて中央を切り出す（ほぼ同じ比率なので切れるのは端の数px）
    const s = Math.max(PX_W / bitmap.width, PX_H / bitmap.height);
    const w = bitmap.width * s;
    const h = bitmap.height * s;
    ctx.drawImage(bitmap, (PX_W - w) / 2, (PX_H - h) / 2, w, h);
    bitmap.close();
  } else {
    drawTextProxy(ctx, e);
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG に変換できませんでした'))), 'image/jpeg', 0.92));
  return { width: PX_W, height: PX_H, jpeg: new Uint8Array(await blob.arrayBuffer()) };
}

async function loadBitmap(card?: CardDefinition): Promise<ImageBitmap | null> {
  try {
    // 詳細で選んだイラスト（cardLooks.ts）があればそれを使う
    for (const key of [lookOf(card?.name)?.art, card?.imageRef]) {
      if (!key) continue;
      const row = await db.images.get(key);
      if (row) return await createImageBitmap(row.blob);
    }
    if (card?.imageUrl) {
      const res = await fetch(card.imageUrl);
      if (res.ok) return await createImageBitmap(await res.blob());
    }
  } catch {
    // 読めない画像（CORS など）は文字だけのプロキシにする
  }
  return null;
}

function drawTextProxy(ctx: CanvasRenderingContext2D, e: ProxyEntry): void {
  const card = e.card;
  const font = (px: number, bold = false) => `${bold ? 'bold ' : ''}${px}px "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif`;
  const civs = card?.civilizations.length ? card.civilizations : (['zero'] as const);
  const m = 24;
  // 枠：文明色の帯
  civs.forEach((c, i) => {
    ctx.fillStyle = CIV_COLOR[c];
    ctx.fillRect((PX_W / civs.length) * i, 0, PX_W / civs.length + 1, PX_H);
  });
  ctx.fillStyle = '#fff';
  ctx.fillRect(m, m, PX_W - m * 2, PX_H - m * 2);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.strokeRect(m, m, PX_W - m * 2, PX_H - m * 2);
  ctx.fillStyle = '#111';
  ctx.textBaseline = 'top';

  if (!card) {
    ctx.font = font(40, true);
    ctx.fillText('未登録のカード', m + 30, m + 40);
    ctx.font = font(32);
    ctx.fillText(e.id, m + 30, m + 100);
    return;
  }
  // コスト
  ctx.beginPath();
  ctx.arc(m + 62, m + 62, 44, 0, Math.PI * 2);
  ctx.fillStyle = CIV_COLOR[civs[0]];
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = font(48, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), m + 62, m + 64);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // 名前
  let y = m + 30;
  ctx.font = font(40, true);
  y = wrap(ctx, card.name, m + 120, y, PX_W - m * 2 - 130, 46, 2);
  y = Math.max(y, m + 120) + 10;
  ctx.font = font(26);
  const typeLine = `${card.typeLabel ?? CARD_TYPE_LABEL[card.type]} / ${card.civilizations.map((c) => CIV_LABEL[c]).join('・')}${card.races.length ? ` / ${card.races.join('/')}` : ''}`;
  y = wrap(ctx, typeLine, m + 24, y, PX_W - m * 2 - 48, 32, 2) + 10;
  ctx.beginPath();
  ctx.moveTo(m + 16, y);
  ctx.lineTo(PX_W - m - 16, y);
  ctx.stroke();
  y += 16;
  // テキスト（ツインパクトは呪文側も）
  const bottom = PX_H - m - (card.power !== undefined ? 90 : 30);
  ctx.font = font(26);
  y = wrapBlock(ctx, card.text, m + 24, y, PX_W - m * 2 - 48, 34, bottom);
  if (card.twin && y < bottom - 80) {
    y += 10;
    ctx.beginPath();
    ctx.moveTo(m + 16, y);
    ctx.lineTo(PX_W - m - 16, y);
    ctx.stroke();
    y += 14;
    ctx.font = font(30, true);
    y = wrap(ctx, `${card.twin.name}（${card.twin.cost}）`, m + 24, y, PX_W - m * 2 - 48, 36, 2) + 6;
    ctx.font = font(26);
    wrapBlock(ctx, card.twin.text, m + 24, y, PX_W - m * 2 - 48, 34, bottom);
  }
  if (card.power !== undefined) {
    ctx.font = font(44, true);
    ctx.fillText(String(card.power), m + 24, PX_H - m - 70);
  }
}

/** 1文字ずつ詰めて折り返す（日本語向け）。描いた後の y を返す */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = Infinity): number {
  let line = '';
  let lines = 0;
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      if (lines + 1 >= maxLines) {
        ctx.fillText(line.slice(0, -1) + '…', x, y);
        return y + lineH;
      }
      ctx.fillText(line, x, y);
      y += lineH;
      lines++;
      line = '';
    }
    line += ch;
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

/** 改行を保ったまま、bottom を越えない範囲で描く */
function wrapBlock(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, bottom: number): number {
  for (const para of text.split('\n')) {
    const room = Math.floor((bottom - y) / lineH);
    if (room <= 0) break;
    y = wrap(ctx, para, x, y, maxW, lineH, room);
  }
  return y;
}
