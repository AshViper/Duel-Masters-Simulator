import { describe, expect, it } from 'vitest';
import { buildPdf, cropMarks, proxyLayout } from './proxyPdf';

describe('proxyLayout', () => {
  it('実寸・隙間0なら A4 に 3×3 で並び、中央に寄る', () => {
    const l = proxyLayout(40);
    expect(l.cols).toBe(3);
    expect(l.rows).toBe(3);
    expect(l.pages.map((p) => p.length)).toEqual([9, 9, 9, 9, 4]);
    expect(l.originX).toBeCloseTo((210 - 189) / 2);
    expect(l.originY).toBeCloseTo((297 - 264) / 2);
    const last = l.pages[0][8];
    expect(last.x + last.w).toBeCloseTo(210 - l.originX);
    expect(last.y + last.h).toBeCloseTo(297 - l.originY);
  });

  it('間隔を入れても用紙からはみ出さない', () => {
    const l = proxyLayout(9, { gapMm: 2 });
    for (const s of l.pages.flat()) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(210);
      expect(s.y + s.h).toBeLessThanOrEqual(297);
    }
  });

  it('トンボは並びの外側にだけ引く', () => {
    const l = proxyLayout(9);
    for (const [x1, y1, x2, y2] of cropMarks(l, l.pages[0])) {
      const insideX = Math.min(x1, x2) >= l.originX && Math.max(x1, x2) <= 210 - l.originX;
      const insideY = Math.min(y1, y2) >= l.originY && Math.max(y1, y2) <= 297 - l.originY;
      expect(insideX && insideY).toBe(false);
    }
  });
});

describe('buildPdf', () => {
  it('xref のオフセットが各オブジェクトの位置と一致する', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const pdf = buildPdf(
      [
        { images: [{ image: 0, x: 10, y: 10, w: 63, h: 88 }], lines: [[0, 5, 5, 5]] },
        { images: [{ image: 0, x: 10, y: 10, w: 63, h: 88 }], lines: [] },
      ],
      [{ width: 2, height: 2, jpeg }],
    );
    const text = new TextDecoder('latin1').decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = text.slice(startxref).split('\n').slice(3).filter((l) => / n $/.test(l));
    expect(entries).toHaveLength(7);
    // latin1 で読んでいるので 1 バイト = 1 文字
    entries.forEach((e, i) => expect(text.slice(Number(e.slice(0, 10))).startsWith(`${i + 1} 0 obj`)).toBe(true));
    expect(text).toContain('/Count 2');
  });
});
