import { describe, expect, it } from 'vitest';
import { fallbackKeywords, nameMatchScore, normalizeCardName, parseDeckText, searchKeywords } from './deckText';

const SAMPLE_TSV = `修正版40枚
カード\t枚数\t役割
《水上第九院 シャコガイル》\t4\tフィニッシャー
《ブレイン珊瑚の仙樹》\t4\tコンボ始動
《エターナル・ブレイン／ブレイン珊瑚の仙樹》\t4\t始動・山札操作
《ラッキー・ダーツ》\t1\t1コスト踏み倒し
合計\t40\t`;

describe('parseDeckText', () => {
  it('画面の表をコピーしたタブ区切りを読む（見出し・合計は無視）', () => {
    const r = parseDeckText(SAMPLE_TSV);
    expect(r.entries.map((e) => [e.name, e.count])).toEqual([
      ['水上第九院 シャコガイル', 4],
      ['ブレイン珊瑚の仙樹', 4],
      ['エターナル・ブレイン／ブレイン珊瑚の仙樹', 4],
      ['ラッキー・ダーツ', 1],
    ]);
    expect(r.skipped).toEqual(['修正版40枚']);
  });

  it('Markdown の表を読む', () => {
    const md = `| カード | 枚数 | 役割 |
|---|---:|---|
| 《ロジック・サークル》 | 4 | 山札上操作・呪文確保 |
| **《サイバー・ブレイン》** | 4 | 大量ドロー |
| **合計** | **40** | |`;
    expect(parseDeckText(md).entries.map((e) => [e.name, e.count])).toEqual([
      ['ロジック・サークル', 4],
      ['サイバー・ブレイン', 4],
    ]);
  });

  it('箇条書き・いろいろな枚数の書き方を読む', () => {
    const text = `- 《ロジック・キューブ》×4
・ブレイン・ストーム x3
4 ケンザン・チャージャー
2x ミステリー・キューブ
1. ホーガン・ブラスター 1枚
ストリーミング・シェイパー：2
《ミクルとミステリーの扉》`;
    expect(parseDeckText(text).entries.map((e) => [e.name, e.count, !!e.countGuessed])).toEqual([
      ['ロジック・キューブ', 4, false],
      ['ブレイン・ストーム', 3, false],
      ['ケンザン・チャージャー', 4, false],
      ['ミステリー・キューブ', 2, false],
      ['ホーガン・ブラスター', 1, false],
      ['ストリーミング・シェイパー', 2, false],
      ['ミクルとミステリーの扉', 1, true],
    ]);
  });

  it('全角数字の枚数も読む', () => {
    expect(parseDeckText('《ラッキー・ダーツ》　４枚').entries[0].count).toBe(4);
  });
});

describe('カード名の照合', () => {
  it('空白・中黒・全角半角・公式のパック名表記の違いを無視する', () => {
    expect(normalizeCardName('水上第九院 シャコガイル')).toBe(normalizeCardName('水上第九院　シャコガイル(DMRP03 S3/S10)'));
    expect(normalizeCardName('ロジック・サークル')).toBe(normalizeCardName('ロジックサークル'));
  });

  it('完全一致 > ツインパクトの片面 > 部分一致', () => {
    const twin = 'エターナル・ブレイン / ブレイン珊瑚の仙樹(DMEX18 18/75)';
    expect(nameMatchScore('エターナル・ブレイン／ブレイン珊瑚の仙樹', twin)).toBe(3);
    expect(nameMatchScore('ブレイン珊瑚の仙樹', 'ブレイン珊瑚の仙樹(DMRP05 18/93)')).toBe(3);
    expect(nameMatchScore('ブレイン珊瑚の仙樹', twin)).toBe(2);
    expect(nameMatchScore('シャコガイル', '水上第九院 シャコガイル')).toBe(1);
    expect(nameMatchScore('ロジック・サークル', 'ロジック・キューブ')).toBe(0);
    // 書き間違い
    expect(nameMatchScore('ミクルとミステリーの扉', 'ミラクルとミステリーの扉')).toBe(1);
  });

  it('見つからない時のキーワード（前半・後半）', () => {
    expect(fallbackKeywords('ミクルとミステリーの扉')).toEqual(['ステリーの扉', 'ミクルとミス']);
  });

  it('検索キーワードの候補', () => {
    expect(searchKeywords('エターナル・ブレイン／ブレイン珊瑚の仙樹')).toEqual(['エターナル・ブレイン／ブレイン珊瑚の仙樹', 'エターナル・ブレイン', 'ブレイン珊瑚の仙樹']);
    expect(searchKeywords('水上第九院 シャコガイル')).toEqual(['水上第九院 シャコガイル', 'シャコガイル']);
  });
});
