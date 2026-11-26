import { describe, expect, it } from 'vitest';
import { buildRegistry, parseCardJson, searchCards } from '../cards/registry';
import { SAMPLE_CARDS, SAMPLE_DECKS } from '../testing/fixtureCards';
import { DEFAULT_FORMAT, deckCount, expandDeck, isDeckLegal, validateDeck } from './rules';

const reg = buildRegistry(SAMPLE_CARDS);

describe('デッキ構成チェック', () => {
  it('サンプルデッキは40枚で合法', () => {
    for (const d of SAMPLE_DECKS) {
      expect(deckCount(d)).toBe(40);
      expect(expandDeck(d)).toHaveLength(40);
      expect(isDeckLegal(d, DEFAULT_FORMAT, reg)).toBe(true);
    }
  });

  it('枚数不足・5枚以上・殿堂をエラーにする', () => {
    expect(validateDeck({ cards: { 'S01-001': 4 } }, DEFAULT_FORMAT, reg).some((i) => i.message.includes('40枚'))).toBe(true);
    expect(validateDeck({ cards: { 'S01-001': 5 } }, DEFAULT_FORMAT, reg).some((i) => i.message.includes('4枚まで'))).toBe(true);
    const fmt = { ...DEFAULT_FORMAT, restricted: { 'S01-013': 1, 'S01-015': 0 }, restrictedPairs: [['S01-001', 'S01-002']] };
    const issues = validateDeck({ cards: { 'S01-013': 2, 'S01-015': 1, 'S01-001': 1, 'S01-002': 1 } }, fmt, reg).map((i) => i.message);
    expect(issues.some((m) => m.includes('殿堂のため1枚'))).toBe(true);
    expect(issues.some((m) => m.includes('プレミアム殿堂'))).toBe(true);
    expect(issues.some((m) => m.includes('殿堂ペア'))).toBe(true);
  });
});

describe('カード検索', () => {
  it('名前・文明・コスト・種族・タイプで絞り込める', () => {
    expect(searchCards(SAMPLE_CARDS, { name: 'ルミナ' }).map((c) => c.id)).toEqual(['S01-001']);
    expect(searchCards(SAMPLE_CARDS, { civilizations: ['fire'], costMax: 2 }).every((c) => c.civilizations.includes('fire') && c.cost <= 2)).toBe(true);
    expect(searchCards(SAMPLE_CARDS, { race: '紅蓮竜' }).length).toBeGreaterThan(0);
    expect(searchCards(SAMPLE_CARDS, { types: ['spell'] }).every((c) => c.type === 'spell')).toBe(true);
    expect(searchCards(SAMPLE_CARDS, { text: 'ブロッカー' }).length).toBeGreaterThan(0);
  });

  it('インポート JSON を検証し、効果定義のないカードは手動処理扱いにする', () => {
    const { cards, errors } = parseCardJson([
      { id: 'X1', name: 'テスト', cost: 3, civilizations: ['fire'], type: 'creature', power: 3000 },
      { id: 'X2', name: '壊れ', cost: 'a', civilizations: ['fire'], type: 'creature' },
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].support).toBe('manual');
    expect(errors).toHaveLength(1);
  });
});
