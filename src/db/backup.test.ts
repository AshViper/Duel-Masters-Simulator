import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, base64ToBytes, bytesToBase64, isBackupFile, parseBackup } from './backup';

const card = { id: 'X-001', name: 'テスト', cost: 3, civilizations: ['fire'], type: 'creature', races: [], power: 3000, text: '', set: 's', rarity: 'C', support: 'manual' };
const deck = { id: 'd1', name: 'デッキ', cards: { 'X-001': 4 }, formatId: 'standard', createdAt: 1, updatedAt: 2 };

describe('backup', () => {
  it('Base64 の往復でバイト列が変わらない（大きなデータも）', () => {
    const bytes = new Uint8Array(100_000).map((_, i) => (i * 7) % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('バックアップ形式を見分ける', () => {
    expect(isBackupFile({ format: BACKUP_FORMAT })).toBe(true);
    expect(isBackupFile([card])).toBe(false);
    expect(isBackupFile({ cards: [card] })).toBe(false);
  });

  it('正しい項目を取り出し、不正な項目は飛ばしてエラーに数える', () => {
    const r = parseBackup({
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: 0,
      cards: [card, { id: 'bad' }],
      decks: [deck, { id: 'd2', name: 'x', cards: { a: -1 }, formatId: 'standard' }],
      images: [{ key: 'k', type: 'image/jpeg', source: 's', data: 'AAAA' }, { key: 1 }],
    });
    expect(r.cards.map((c) => c.id)).toEqual(['X-001']);
    expect(r.decks.map((d) => d.id)).toEqual(['d1']);
    expect(r.images.map((i) => i.key)).toEqual(['k']);
    expect(r.errors).toHaveLength(3);
  });

  it('新しい版の形式は読み込まない', () => {
    const r = parseBackup({ format: BACKUP_FORMAT, version: 99, cards: [card] });
    expect(r.cards).toEqual([]);
    expect(r.errors[0]).toMatch(/新しい形式/);
  });
});
