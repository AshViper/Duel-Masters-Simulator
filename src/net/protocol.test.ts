import { describe, expect, it } from 'vitest';
import { buildRegistry } from '../core/cards/registry';
import type { CardDefinition } from '../core/cards/types';
import type { Deck } from '../core/deck/rules';
import { deckCardDefs, imageKeysOf, mergeRegistry, missingCardIds, newRoomCode, normalizeRoomCode, peerIdOf } from './protocol';

const card = (id: string, extra: Partial<CardDefinition> = {}): CardDefinition => ({
  id,
  name: id,
  cost: 1,
  civilizations: ['fire'],
  type: 'creature',
  races: [],
  power: 1000,
  text: '',
  ...extra,
});

const deck = (cards: Record<string, number>): Deck => ({ id: 'd', name: 'D', cards, formatId: 'standard', createdAt: 0, updatedAt: 0 });

describe('online protocol helpers', () => {
  it('collects definitions of the cards in a deck', () => {
    const reg = buildRegistry([card('A'), card('B'), card('C')]);
    expect(deckCardDefs(deck({ A: 4, C: 2, X: 1 }), reg).map((c) => c.id)).toEqual(['A', 'C']);
    expect(missingCardIds(deck({ A: 4, X: 1 }), reg)).toEqual(['X']);
  });

  it('later definitions win when merging (host definition is authoritative)', () => {
    const base = buildRegistry([card('A', { power: 1000 }), card('B')]);
    const merged = mergeRegistry(base, [card('A', { power: 5000 }), card('Z')]);
    expect(merged.A.power).toBe(5000);
    expect(Object.keys(merged).sort()).toEqual(['A', 'B', 'Z']);
    // 元の辞書は変えない
    expect(base.A.power).toBe(1000);
  });

  it('lists unique image keys', () => {
    expect(imageKeysOf([card('A', { imageRef: 'img1' }), card('B', { imageRef: 'img1' }), card('C')])).toEqual(['img1']);
  });

  it('makes and normalizes room codes', () => {
    const code = newRoomCode();
    expect(code).toMatch(/^[a-z2-9]{6}$/);
    expect(normalizeRoomCode('  AB c-12 ')).toBe('abc12');
    expect(peerIdOf('abc123')).toBe('card-duel-sim-abc123');
  });
});
