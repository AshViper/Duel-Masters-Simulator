import { describe, expect, it } from 'vitest';
import { parseDeckText } from './deckText';
import { DEFAULT_DECKS, SD1 } from './defaultDecks';

/** 「このカードをデッキに何枚入れてもよい」カード */
const ANY_COPIES = new Set(['特攻の忠剣ハチ公']);

describe('DEFAULT_DECKS', () => {
  for (const d of DEFAULT_DECKS) {
    it(`${d.name} は 40 枚で、すべての行を読み取れる`, () => {
      const r = parseDeckText(d.text);
      expect(r.skipped).toEqual([]);
      expect(r.entries.reduce((a, e) => a + e.count, 0)).toBe(40);
      expect(r.entries.every((e) => (e.count <= 4 || ANY_COPIES.has(e.name)) && !e.countGuessed)).toBe(true);
    });
  }
  it('ドキドキつよいデッキ 25の王道 の25種がそろっている', () => {
    const sd1 = DEFAULT_DECKS.filter((d) => d.group === SD1);
    expect(sd1).toHaveLength(25);
    expect(sd1.map((d) => d.note?.[0]).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXY');
    expect(new Set(DEFAULT_DECKS.map((d) => d.id)).size).toBe(DEFAULT_DECKS.length);
  });
});
