// プロキシカード印刷用の A4 レイアウトと、最小限の PDF 書き出し（外部ライブラリなし）。
// 画像は JPEG をそのまま DCTDecode で埋め込む。座標は mm で計算し、PDF に書く時に pt へ変換する。

export const A4_MM = { w: 210, h: 297 } as const;
/** デュエル・マスターズのカードサイズ（63×88mm） */
export const CARD_MM = { w: 63, h: 88 } as const;

const PT_PER_MM = 72 / 25.4;

export interface ProxyLayoutOptions {
  /** カード同士の間隔（mm）。0 なら隙間なしで並べる */
  gapMm?: number;
  /** 印刷倍率（1 = 実寸）。スリーブに合わせて微調整したい時用 */
  scale?: number;
}

export interface Slot {
  /** 入力した配列での位置 */
  index: number;
  /** 左上の座標（mm、用紙の左上が原点） */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProxyLayout {
  cols: number;
  rows: number;
  /** 並びの左上（mm） */
  originX: number;
  originY: number;
  cardW: number;
  cardH: number;
  gap: number;
  pages: Slot[][];
}

/** A4 縦に、実寸のカードを入るだけ（実寸・隙間0なら 3×3=9枚）並べて中央に寄せる */
export function proxyLayout(count: number, opts: ProxyLayoutOptions = {}): ProxyLayout {
  const gap = Math.max(0, opts.gapMm ?? 0);
  const scale = opts.scale ?? 1;
  const cardW = CARD_MM.w * scale;
  const cardH = CARD_MM.h * scale;
  const cols = Math.max(1, Math.floor((A4_MM.w + gap) / (cardW + gap)));
  const rows = Math.max(1, Math.floor((A4_MM.h + gap) / (cardH + gap)));
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridH = rows * cardH + (rows - 1) * gap;
  const originX = (A4_MM.w - gridW) / 2;
  const originY = (A4_MM.h - gridH) / 2;
  const perPage = cols * rows;
  const pages: Slot[][] = [];
  for (let i = 0; i < count; i++) {
    const p = Math.floor(i / perPage);
    const k = i % perPage;
    const c = k % cols;
    const r = Math.floor(k / cols);
    (pages[p] ??= []).push({ index: i, x: originX + c * (cardW + gap), y: originY + r * (cardH + gap), w: cardW, h: cardH });
  }
  return { cols, rows, originX, originY, cardW, cardH, gap, pages };
}

/** 裁断用のトンボ（並びの外側の余白にだけ引く線。カードの上には描かない）。mm の [x1, y1, x2, y2] */
export function cropMarks(l: ProxyLayout, slots: Slot[]): [number, number, number, number][] {
  if (slots.length === 0) return [];
  const usedCols = Math.min(l.cols, slots.length);
  const usedRows = Math.ceil(slots.length / l.cols);
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (let c = 0; c < usedCols; c++) {
    xs.add(l.originX + c * (l.cardW + l.gap));
    xs.add(l.originX + c * (l.cardW + l.gap) + l.cardW);
  }
  for (let r = 0; r < usedRows; r++) {
    ys.add(l.originY + r * (l.cardH + l.gap));
    ys.add(l.originY + r * (l.cardH + l.gap) + l.cardH);
  }
  const right = l.originX + usedCols * l.cardW + (usedCols - 1) * l.gap;
  const bottom = l.originY + usedRows * l.cardH + (usedRows - 1) * l.gap;
  const off = 1; // 並びから 1mm 離す
  const lines: [number, number, number, number][] = [];
  for (const x of xs) {
    if (l.originY - off > 0) lines.push([x, 0, x, l.originY - off]);
    if (bottom + off < A4_MM.h) lines.push([x, bottom + off, x, A4_MM.h]);
  }
  for (const y of ys) {
    if (l.originX - off > 0) lines.push([0, y, l.originX - off, y]);
    if (right + off < A4_MM.w) lines.push([right + off, y, A4_MM.w, y]);
  }
  return lines;
}

export interface PdfImage {
  /** 画素数 */
  width: number;
  height: number;
  /** ベースライン JPEG（RGB） */
  jpeg: Uint8Array;
}

export interface PdfPage {
  /** image は images 配列の添字。座標は mm（用紙の左上が原点） */
  images: { image: number; x: number; y: number; w: number; h: number }[];
  lines: [number, number, number, number][];
}

const enc = new TextEncoder();
const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

/** A4 縦の PDF を組み立てる */
export function buildPdf(pages: PdfPage[], images: PdfImage[]): Uint8Array {
  const pageW = A4_MM.w * PT_PER_MM;
  const pageH = A4_MM.h * PT_PER_MM;
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (b: Uint8Array | string) => {
    const bytes = typeof b === 'string' ? enc.encode(b) : b;
    chunks.push(bytes);
    size += bytes.length;
  };
  // 1: Catalog, 2: Pages, 3..: 画像, その後ページごとに Page と内容
  const imgObj = (i: number) => 3 + i;
  const pageObj = (p: number) => 3 + images.length + p * 2;
  const contentObj = (p: number) => pageObj(p) + 1;
  const total = 2 + images.length + pages.length * 2;
  const begin = (id: number) => {
    offsets[id] = size;
    push(`${id} 0 obj\n`);
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  begin(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  begin(2);
  push(`<< /Type /Pages /Kids [${pages.map((_, p) => `${pageObj(p)} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);
  images.forEach((img, i) => {
    begin(imgObj(i));
    push(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.jpeg.length} >>\nstream\n`);
    push(img.jpeg);
    push('\nendstream\nendobj\n');
  });
  pages.forEach((page, p) => {
    const used = [...new Set(page.images.map((im) => im.image))];
    begin(pageObj(p));
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(pageW)} ${n(pageH)}] ` +
        `/Resources << /XObject << ${used.map((i) => `/Im${i} ${imgObj(i)} 0 R`).join(' ')} >> >> /Contents ${contentObj(p)} 0 R >>\nendobj\n`,
    );
    let s = '';
    for (const im of page.images) {
      const w = im.w * PT_PER_MM;
      const h = im.h * PT_PER_MM;
      const x = im.x * PT_PER_MM;
      const y = pageH - im.y * PT_PER_MM - h;
      s += `q ${n(w)} 0 0 ${n(h)} ${n(x)} ${n(y)} cm /Im${im.image} Do Q\n`;
    }
    if (page.lines.length > 0) {
      s += '0.5 G 0.3 w\n';
      for (const [x1, y1, x2, y2] of page.lines) {
        s += `${n(x1 * PT_PER_MM)} ${n(pageH - y1 * PT_PER_MM)} m ${n(x2 * PT_PER_MM)} ${n(pageH - y2 * PT_PER_MM)} l S\n`;
      }
    }
    const body = enc.encode(s);
    begin(contentObj(p));
    push(`<< /Length ${body.length} >>\nstream\n`);
    push(body);
    push('\nendstream\nendobj\n');
  });
  const xref = size;
  let x = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= total; id++) x += `${offsets[id].toString().padStart(10, '0')} 00000 n \n`;
  push(x);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
