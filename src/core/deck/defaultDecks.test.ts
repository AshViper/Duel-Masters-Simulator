import { describe, expect, it } from 'vitest';
import { parseDeckText } from './deckText';
import { DEFAULT_DECKS } from './defaultDecks';

describe('DEFAULT_DECKS', () => {
  for (const d of DEFAULT_DECKS) {
    it(`${d.name} は 40 枚で、すべての行を読み取れる`, () => {
      const r = parseDeckText(d.text);
      expect(r.skipped).toEqual([]);
      expect(r.entries.reduce((a, e) => a + e.count, 0)).toBe(40);
      expect(r.entries.every((e) => e.count <= 4 && !e.countGuessed)).toBe(true);
    });
  }
});
