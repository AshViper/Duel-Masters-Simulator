import { describe, expect, it } from 'vitest';
import { buildSearchBody, parseCardDetail, parseOptions, parseSearchResult } from './dmOfficial';

// 公式ページと同じ構造の合成 HTML（内容はダミー）
const SEARCH_HTML = `
<ul class="cardList01 clearfix"><li><a href='/card/detail/?id=xx1-001' data-href='/card/detail/?id=xx1-001'><img class='cardImage' data-href='/card/detail/?id=xx1-001' src='/wp-content/card/cardthumb/xx1-001a.jpg' alt=' ' loading='lazy'/></a></li>
<li><a href='/card/detail/?id=xx1-ex002'><img class='cardImage' data-href='/card/detail/?id=xx1-ex002' src='/wp-content/card/cardthumb/xx1-ex002.jpg' alt=' '/></a></li></ul>
<div class="pagerList01"><div class="wp-pagenavi"><span class="current">2</span><a class="page larger" href="" data-page="3">3</a><a class="nextpostslink" rel="next" href="" data-page="12">最後のページ</a></div></div>`;

const DETAIL_HTML = `<div border='0' class='cardDetail'><div class='card-itself'><div class='row'><h3 class='card-name'>テスト竜&amp;剣<span class='packname'>(XX1 1/10)</span></h3></div>
<div class="card"><div class="card-img"><img src="/wp-content/card/cardimage/xx1-001.jpg" alt=""></div><div class='card_package'><a href="https://dm.takaratomy.co.jp/product/xx1/" target="_blank"></a></div></div>
<table><tr><th>カードの種類</th><td class='type'>クリーチャー</td><th>文明</th><td class='civil'>火/自然</td></tr></table>
<table><tr><td class='rarelity'>VR</td><td class='power'>6500+</td></tr></table>
<table><tr><td class='cost'>3</td><td class='mana'>1</td></tr></table>
<table><tr><td class='race'>ドラゴン</td></tr></table>
<table><tr><td colspan='3' class='illusttxt'>someone</td></tr></table>
<table><tr><td class='skills full'><li>W・ブレイカー<br /></li><li>能力その1。<br />続き</li></td></tr></table>
<table><tr><td class='flavor full'>フレーバー</td></tr></table></div>
<div class='card-itself'><h3 class='card-name'>裏面の呪文<span class='packname'>(XX1 1/10)</span></h3><td class='type'>呪文</td><td class='cost'>2</td><td class='skills full'><li>カードを1枚引く。</li></td></div></div>`;

describe('公式カード検索の解析', () => {
  it('検索結果からカードIDとサムネイル、ページ数を取り出す', () => {
    const r = parseSearchResult(SEARCH_HTML);
    expect(r.cards.map((c) => c.id)).toEqual(['xx1-001', 'xx1-ex002']);
    expect(r.cards[0].thumbUrl).toBe('https://dm.takaratomy.co.jp/wp-content/card/cardthumb/xx1-001a.jpg');
    expect(r.page).toBe(2);
    expect(r.lastPage).toBe(12);
  });

  it('該当なしは空', () => {
    const r = parseSearchResult('<p class="nodata">みつかりませんでした</p><div class="wp-pagenavi"></div>');
    expect(r.cards).toEqual([]);
    expect(r.lastPage).toBe(0);
  });

  it('詳細ページの各項目とツインパクトの両面を読み取る', () => {
    const d = parseCardDetail(DETAIL_HTML, 'xx1-001');
    expect(d.faces).toHaveLength(2);
    const f = d.faces[0];
    expect(f.name).toBe('テスト竜&剣');
    expect(f.packName).toBe('(XX1 1/10)');
    expect(f.imageUrl).toBe('https://dm.takaratomy.co.jp/wp-content/card/cardimage/xx1-001.jpg');
    expect([f.type, f.civilization, f.rarity, f.power, f.cost, f.mana, f.race, f.illustrator, f.flavor]).toEqual([
      'クリーチャー', '火/自然', 'VR', '6500+', '3', '1', 'ドラゴン', 'someone', 'フレーバー',
    ]);
    expect(f.abilities).toEqual(['W・ブレイカー', '能力その1。\n続き']);
    expect(d.faces[1]).toMatchObject({ name: '裏面の呪文', type: '呪文', cost: '2', abilities: ['カードを1枚引く。'] });
    expect(d.productUrl).toBe('https://dm.takaratomy.co.jp/product/xx1/');
  });

  it('検索フォームの選択肢を読み取る', () => {
    const o = parseOptions('<form id="search_cond" method="POST"><select name="cardtype"><option value="">指定なし</option><option value="呪文">呪文</option></select></form>');
    expect(o.cardtype).toEqual([{ value: '呪文', label: '呪文' }]);
  });

  it('公式フォームと同じ形式の本文を作る（キーワード対象はキーワードがある時だけ）', () => {
    const b = buildSearchBody({ keyword: ' 竜 ', keywordTypes: ['card_name'], civilizations: ['火', '水'], costMin: 3, page: 2 });
    expect(b.getAll('keyword_type[]')).toEqual(['card_name']);
    expect(b.getAll('culture[]')).toEqual(['火', '水']);
    expect(b.get('keyword')).toBe('竜');
    expect(b.get('cost_lower')).toBe('3');
    expect(b.get('pagenum')).toBe('2');
    expect(buildSearchBody({ keywordTypes: ['card_name'] }).has('keyword_type[]')).toBe(false);
  });
});

describe('公式カードの変換', () => {
  it('キーワード能力を読み取り、残りの能力は手動処理にする', async () => {
    const { convertOfficialCard } = await import('../core/cards/officialConvert');
    const d = parseCardDetail(DETAIL_HTML, 'xx1-001');
    const c = convertOfficialCard(d);
    expect(c).toMatchObject({
      id: 'dm:xx1-001', name: 'テスト竜&剣', cost: 3, civilizations: ['fire', 'nature'], type: 'creature', power: 6500,
      races: ['ドラゴン'], rarity: 'VR', keywords: { breaker: 2 }, support: 'partial', imageRef: 'dm:img:xx1-001', set: '公式 XX1',
    });
    expect(c.twin).toMatchObject({ name: '裏面の呪文', cost: 2 });
  });

  it('キーワード・定型文の効果は自動処理、読めない能力は手動', async () => {
    const { convertOfficialCard } = await import('../core/cards/officialConvert');
    const face = { name: 'A', packName: '(P 1/1)', imageUrl: '', type: 'クリーチャー', civilization: '光', rarity: 'C', power: '3000', cost: '2', mana: '1', race: '種族', illustrator: '', flavor: '' };
    const blocker = convertOfficialCard({ id: 'p-1', detailUrl: '', faces: [{ ...face, abilities: ['ブロッカー', 'このクリーチャーは相手プレイヤーを攻撃できない。'] }] });
    expect(blocker.keywords).toEqual({ blocker: true, cannotAttackPlayers: true });
    expect(blocker.support).toBe('full');
    const spell = convertOfficialCard({ id: 'p-2', detailUrl: '', faces: [{ ...face, type: '呪文', power: '', abilities: ['S・トリガー', 'カードを2枚引く。'] }] });
    // 定型文の効果（カードを2枚引く）は自動処理になる
    expect(spell).toMatchObject({ type: 'spell', power: undefined, keywords: { shieldTrigger: true }, abilities: [{ when: 'onCast', effects: [{ type: 'draw', count: 2 }] }], support: 'full' });
    const odd = convertOfficialCard({ id: 'p-3', detailUrl: '', faces: [{ ...face, type: 'タマシード', power: '', civilization: '火/水', abilities: ['何かの能力'] }] });
    expect(odd).toMatchObject({ type: 'tamaseed', typeLabel: 'タマシード', civilizations: ['fire', 'water'], support: 'manual' });
  });
});

describe('画像の中継', () => {
  it('公式のカード画像パス以外は受け付けない', async () => {
    const { isCardImagePath } = await import('./dmOfficial');
    expect(isCardImagePath('/wp-content/card/cardimage/dm24rp1-001.jpg')).toBe(true);
    expect(isCardImagePath('/wp-content/card/cardthumb/dm26bd1-004a.jpg')).toBe(true);
    expect(isCardImagePath('/wp-admin/x.jpg')).toBe(false);
    expect(isCardImagePath('/wp-content/card/cardimage/../../secret.jpg')).toBe(false);
    expect(isCardImagePath('https://evil.example/a.jpg')).toBe(false);
  });
});
