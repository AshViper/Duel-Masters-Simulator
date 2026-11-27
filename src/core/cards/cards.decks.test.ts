// デッキと保存したカード：デッキのカードがすべて自動処理になること・保存済みカードの読み直し・行定義
// 元は別々のテストファイル。ファイルごとに describe（元のファイル名）で包んであるので、補助関数（mk・put・reg など）は同じ名前でもぶつからない
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { canPlay, effectiveCost, evolutionBases, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { applyParsedEffects, convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

// ════════════════════════ deckCards.test.ts ════════════════════════
describe('deckCards', () => {
// 呪文主体のデッキ（シャコガイルなど）のカードが、能力テキストから自動で処理されることのテスト
const face = { packName: '(T 1/1)', imageUrl: '', civilization: '水', rarity: 'C', mana: '1', race: '', illustrator: '', flavor: '', cost: '1' };
const spell = (id: string, name: string, abilities: string[]) => convertOfficialCard({ id, detailUrl: '', faces: [{ ...face, name, type: '呪文', power: '', abilities }] });

const CARDS = {
  darts: spell('d-1', 'ダーツ', ['自分のシールドを１枚相手に選ばせ、見る。それが呪文であればコストを支払わずにすぐ唱えてもよい 。唱えない場合やそのカードが呪文でない場合、元の場所に戻す。']),
  life: spell('d-2', 'ライフ', ['S(シールド)・トリガー(この呪文をシールドゾーンから手札に加えるとき、コストを支払わずにすぐ唱えてよい)\n\n自分の山札の上から１枚目を、自分のマナゾーンに置く。']),
  storm: spell('d-3', 'ストーム', ['カードを３枚まで引く。その後、自分の手札を２枚、好きな順序で自分の山札の上に置く。']),
  cube: spell('d-4', 'キューブ', ['S(シールド)・トリガー(このカードをシールドゾーンから手札に戻すとき、コストを支払わずにすぐに使ってよい。)\n\n自分の山札から呪文を１枚さがして相手に見せ、自分の手札に加える。そのあと、山札をシャッフルする。']),
  shaper: spell('d-5', 'シェイパー', ['自分の山札のカードを、上から４枚表向きにする。その中の水のカードをすべて自分の手札に加え、それ以外のカードを自分の墓地に置く。']),
  energy: spell('d-6', 'ライト', ['カードを２枚引く。']),
  cyber: spell('d-7', 'サイバー', ['S(シールド)・トリガー(このカードをシールドゾーンから手札に戻すとき、コストを支払わずにすぐ使ってよい。)\n\n自分の山札からカードを３枚まで引く。']),
  shower: spell('d-8', 'シャワー', ['マナゾーンに置く時、このカードはタップして置く。', 'S・トリガー（この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい）', '自分の山札の上から２枚を見る。そのうちの１枚を自分の手札に加え、もう１枚をマナゾーンに置く。']),
  door: spell('d-9', '扉', ['マナゾーンに置く時、このカードはタップして置く。\n\nS・トリガー\n\n自分の山札の上から４枚を表向きにする。その中から進化クリーチャー以外のクリーチャーを１体相手に選ばせ、バトルゾーンに出す。残りを好きな順序で自分の山札の一番下に戻す。']),
  hogan: spell('d-10', 'ブラスター', ['S・トリガー(この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい)\n\n自分の山札をシャッフルし、上から１枚目をすべてのプレイヤーに見せる。そのカードがクリーチャーであれば、バトルゾーンに出してもよい。呪文であれば、コストを支払わずに唱えてもよい。']),
  mystery: spell('d-11', 'ミステリー', ['S・トリガー（この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい）', '自分の山札をシャッフルし、その後、上から１枚目をすべてのプレイヤーに見せる。そのカードがクリーチャーであれば、それをバトルゾーンに出してもよい。クリーチャーでなければ、自分のマナゾーンに置く。']),
  coral: spell('d-12', '仙樹', ['カードを３枚引く。その後、自分の手札にあるカードの枚数以下のコストを持つ水のカードを１枚選んでもよい。そうしたら、そのカードを自分の手札からコストを支払わずに使う。']),
  shako: convertOfficialCard({
    id: 'd-13',
    detailUrl: '',
    faces: [{ ...face, name: 'シャコ', type: 'クリーチャー', power: '13000', abilities: ['T・ブレイカー', 'このクリーチャーがバトルゾーンに出た時、自分の墓地にあるカードをすべて山札に加え、シャッフルする。', '相手のターンのはじめに、カードを５枚引き、その後、自分の手札を３枚捨てる。', '自分の山札の最後の１枚を引く時、ゲームに負けるかわりに勝つ。'] }],
  }),
  odd: convertOfficialCard({ id: 'd-14', detailUrl: '', faces: [{ ...face, name: '謎', type: 'クリーチャー', power: '1000', abilities: ['このクリーチャーが出た時、相手とじゃんけんする。'] }] }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(CARDS)]);
const filler = Array.from({ length: 40 }, () => 'S01-043'); // 自然のクリーチャー

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);
/** 水のマナを置いて呪文を唱える */
function cast(s: GameState, cardId: string): { s: GameState; iid: string } {
  const iid = put(s, 0, cardId, 'hand');
  put(s, 0, 'S01-011', 'mana');
  return { s: act(s, { type: 'PLAY_CARD', player: 0, iid }), iid };
}

describe('デッキのカードがすべて自動処理になる', () => {
  it('対応状況', () => {
    for (const c of Object.values(CARDS)) if (c.id !== 'dm:d-14') expect([c.name, c.support]).toEqual([c.name, 'full']);
    expect(CARDS.odd.support).toBe('manual');
  });

  it('カードを3枚まで引き、手札を2枚山札の上に置く', () => {
    let { s } = cast(newGame(), 'dm:d-3');
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['3枚引く', '2枚引く', '1枚引く', '0枚引く'] });
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'RESPOND', player: 0, selected: ['1'] }); // 2枚
    expect(s.players[0].zones.hand).toHaveLength(hand + 2);
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 2, max: 2 });
    const back = s.players[0].zones.hand.slice(0, 2);
    s = act(s, { type: 'RESPOND', player: 0, selected: back });
    expect(s.players[0].zones.deck.slice(-2).sort()).toEqual([...back].sort());
  });

  it('山札から呪文を探す・山札の上4枚の水のカードをすべて手札に', () => {
    let s = newGame();
    const target = put(s, 0, 'dm:d-6', 'deck');
    s.players[0].zones.deck.unshift(...s.players[0].zones.deck.splice(s.players[0].zones.deck.indexOf(target), 1)); // 山札の一番下へ
    ({ s } = cast(s, 'dm:d-4'));
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [target] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('hand');

    s = newGame();
    const w1 = put(s, 0, 'S01-011', 'deck');
    const w2 = put(s, 0, 'S01-012', 'deck');
    ({ s } = cast(s, 'dm:d-5'));
    expect(s.pending).toBeNull();
    expect(s.cards[w1].zone).toBe('hand');
    expect(s.cards[w2].zone).toBe('hand');
    expect(s.players[0].zones.graveyard.filter((x) => s.cards[x].cardId === 'S01-043')).toHaveLength(2);
  });

  it('山札の上2枚：1枚を手札、もう1枚をマナ。この呪文はマナにタップして置かれる', () => {
    let { s } = cast(newGame(), 'dm:d-8');
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 1, max: 1 });
    const [a] = (s.pending as { candidates: string[] }).candidates;
    s = act(s, { type: 'RESPOND', player: 0, selected: [a] });
    expect(s.cards[a].zone).toBe('hand');
    const m = put(s, 0, 'dm:d-8', 'mana');
    expect(s.cards[m].tapped).toBe(true);
  });

  it('山札の上4枚から相手が選んだクリーチャーを出す', () => {
    let { s } = cast(newGame(), 'dm:d-9');
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1, min: 1, max: 1 });
    const pick = (s.pending as { candidates: string[] }).candidates[0];
    s = act(s, { type: 'RESPOND', player: 1, selected: [pick] });
    expect(s.cards[pick].zone).toBe('battle');
  });

  it('シャッフルして公開：クリーチャーなら出してもよい', () => {
    let { s } = cast(newGame(), 'dm:d-11');
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    const top = s.players[0].zones.deck[s.players[0].zones.deck.length - 1];
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[top].zone).toBe('battle');
  });

  it('ラッキー・ダーツ：相手が選んだシールドが呪文なら唱えられる', () => {
    let s = newGame();
    const sh = put(s, 0, 'dm:d-6', 'shield');
    ({ s } = cast(s, 'dm:d-1'));
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [sh] });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[sh].zone).toBe('graveyard');
    // 2枚引き、解決を終えたダーツ自身が手札から墓地へ
    expect(s.players[0].zones.hand).toHaveLength(hand + 2 - 1);
  });

  it('仙樹：3枚引いて、手札の枚数以下のコストの水のカードをタダで使う', () => {
    let s = newGame();
    const free = put(s, 0, 'S01-014', 'hand'); // 水・コスト4
    ({ s } = cast(s, 'dm:d-12'));
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 0, max: 1 });
    expect((s.pending as { candidates: string[] }).candidates).toContain(free);
    s = act(s, { type: 'RESPOND', player: 0, selected: [free] });
    expect(s.cards[free].zone).toBe('battle');
  });

  it('シャコガイル：相手のターンのはじめに5枚引いて3枚捨てる。山札の最後の1枚を引いたら勝つ', () => {
    let s = newGame();
    put(s, 0, 'dm:d-13', 'battle');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, min: 3, max: 3 });
    s = act(s, { type: 'RESPOND', player: 0, selected: s.players[0].zones.hand.slice(0, 3) });
    expect(s.players[0].zones.hand).toHaveLength(hand + 2);

    s = newGame();
    put(s, 0, 'dm:d-13', 'battle');
    s.players[0].zones.deck.splice(0, s.players[0].zones.deck.length - 3);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.winner).toBe(0);
  });

  it('自動処理できない能力は判断パネルで手動処理するまで止まる', () => {
    let s = newGame();
    const c = put(s, 0, 'dm:d-14', 'hand');
    put(s, 0, 'S01-011', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.pending).toMatchObject({ kind: 'manualStep', player: 0, source: c, text: expect.stringContaining('じゃんけん') });
    // 止まっている間も手動操作はできる
    s = act(s, { type: 'MANUAL_DRAW', player: 0, target: 0 });
    expect(s.pending?.kind).toBe('manualStep');
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toBeNull();
  });
});
});

// ════════════════════════ savedCards.test.ts ════════════════════════
describe('savedCards', () => {
// 保存済みカードで手動だった能力のテスト（ツインパクトの名前、「このカードを出す」、一番パワーが小さい、バトルに勝った時など）
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type F = { name: string; type: string; race?: string; civilization?: string; cost: string; power?: string; abilities: string[] };
const face = (f: F) => ({ ...base, race: '', civilization: '火', power: '', ...f });
const mk = (id: string, ...faces: F[]) => convertOfficialCard({ id, detailUrl: '', faces: faces.map(face) });

const TWIN = 'ボルメテウス・イエロー / ボルメテウス・スパーク';
const C = {
  twin: mk('s-twin', { name: TWIN, type: 'クリーチャー', race: 'ドラゴン', cost: '2', power: '2000', abilities: ['W・ブレイカー'] }, { name: TWIN, type: '呪文', cost: '1', abilities: ['相手のクリーチャーをすべてタップする。', 'このカードを出す。'] }),
  lowest: mk('s-low', { name: '最小破壊', type: '呪文', cost: '1', abilities: ['相手の、パワーが一番小さいクリーチャーをすべて破壊する。'] }),
  below: mk('s-below', { name: 'より小さい', type: 'クリーチャー', race: 'テスト', cost: '1', power: '5000', abilities: ['このクリーチャーが出た時、このクリーチャーよりパワーが小さい相手のクリーチャーをすべて破壊する。'] }),
  winDraw: mk('s-win', { name: '勝てば引く', type: 'クリーチャー', race: 'テスト', cost: '1', power: '1000', abilities: ['自分のクリーチャーがバトルに勝った時、カードを１枚引いてもよい。'] }),
  ultra: mk('s-ultra', { name: '守り手', type: 'クリーチャー', race: 'テスト', cost: '1', power: '1000', abilities: ['ウルトラ・セイバー：名前に《ボルメテウス》とあるクリーチャー（…）'] }),
  cond: mk('s-cond', { name: '多色で安い', type: 'クリーチャー', race: 'テスト', cost: '7', power: '7000', abilities: ['相手のマナゾーンに多色カードがあれば、このクリーチャーの召喚コストを３少なくする。'] }),
  reanimate: mk('s-rean', { name: '蘇生してブロッカー', type: '呪文', cost: '1', abilities: ['コスト８以下のクリーチャーを１体、自分の墓地から出す。次の自分のターンのはじめまで、そのクリーチャーに「ブロッカー」を与える。'] }),
  small: mk('s-s', { name: '小型', type: 'クリーチャー', race: 'テスト', cost: '1', power: '2000', abilities: [] }),
  mid: mk('s-m', { name: '中型', type: 'クリーチャー', race: 'テスト', cost: '1', power: '4000', abilities: [] }),
  big: mk('s-b', { name: '大型', type: 'クリーチャー', race: 'テスト', cost: '1', power: '9000', abilities: [] }),
  multi: mk('s-multi', { name: '多色', type: 'クリーチャー', race: 'テスト', civilization: '火/水', cost: '1', power: '1000', abilities: [] }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  s.cards[iid].enteredTurn = 0;
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const mana = (s: GameState, p: PlayerId, n: number) => {
  for (let i = 0; i < n; i++) put(s, p, C.small.id, 'mana');
};
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 3, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('ツインパクトの「A / B」の名前を分け、ハイパー化と取り違えない（保存済みのカードも直す）', () => {
    expect(C.twin.name).toBe('ボルメテウス・イエロー');
    expect(C.twin.twin?.name).toBe('ボルメテウス・スパーク');
    expect(C.twin.hyperText).toBeUndefined();
    // 以前の版の保存データ：両面とも「A / B」
    const old = applyParsedEffects({ ...C.twin, name: TWIN, twin: { ...C.twin.twin!, name: TWIN }, hyperText: undefined });
    expect([old.name, old.twin?.name, old.hyperText]).toEqual(['ボルメテウス・イエロー', 'ボルメテウス・スパーク', undefined]);
  });
  it('空白なしの「A/B」の名前のツインパクトも分ける（呪文側をハイパーモードと取り違えて消さない）', () => {
    const N = '龍聖霊ウルフェウス/ヘブンの衝撃';
    const c = mk(
      's-twin2',
      { name: N, type: 'クリーチャー', race: 'エンジェル・コマンド', civilization: '光', cost: '9', power: '12000', abilities: ['W・ブレイカー'] },
      { name: N, type: '呪文', civilization: '光', cost: '5', abilities: ['S・トリガー', '相手の進化ではないクリーチャーを１体選び、裏向きにして持ち主のシールドゾーンに新しいシールドとして置く。'] },
    );
    expect([c.name, c.twin?.name, c.twin?.cost, c.hyperText, c.support]).toEqual(['龍聖霊ウルフェウス', 'ヘブンの衝撃', 5, undefined, 'full']);
    expect(c.twin?.abilities?.[0].effects[0]).toMatchObject({ type: 'move', to: 'shield', target: { owner: 'opponent', count: 1, filter: { nonEvolution: true } } });
  });
  it('ウルトラ・セイバー', () => {
    expect(C.ultra.replacements).toEqual([{ event: 'leaveBattle', subject: 'otherOwn', filter: { nameIncludes: 'ボルメテウス' }, instead: 'destroySelf', optional: true }]);
  });
  it('次の、相手のターンの終わりまで', () => {
    expect(parseAbilityText('このクリーチャーが出た時、次の、相手のターンの終わりまで、相手は呪文を唱えられない。', 'creature').manualLines).toEqual([]);
  });
});

describe('エンジンで動く', () => {
  it('ツインパクトの呪文側「このカードを出す」：唱えた後、このカードがクリーチャーとして出る', () => {
    let s = newGame();
    const opp = put(s, 1, C.big.id, 'battle');
    const t = put(s, 0, C.twin.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: t, side: 'twin' });
    expect(s.cards[opp].tapped).toBe(true);
    expect(s.cards[t].zone).toBe('battle');
  });

  it('相手の、パワーが一番小さいクリーチャーをすべて破壊する', () => {
    let s = newGame();
    const a = put(s, 1, C.small.id, 'battle');
    const b = put(s, 1, C.small.id, 'battle');
    const c = put(s, 1, C.big.id, 'battle');
    const sp = put(s, 0, C.lowest.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect([s.cards[a].zone, s.cards[b].zone, s.cards[c].zone]).toEqual(['graveyard', 'graveyard', 'battle']);
  });

  it('このクリーチャーよりパワーが小さい相手のクリーチャーをすべて破壊する', () => {
    let s = newGame();
    const a = put(s, 1, C.mid.id, 'battle');
    const c = put(s, 1, C.big.id, 'battle');
    const k = put(s, 0, C.below.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: k });
    expect([s.cards[a].zone, s.cards[c].zone]).toEqual(['graveyard', 'battle']);
  });

  it('自分のクリーチャーがバトルに勝った時、カードを1枚引いてもよい', () => {
    let s = newGame();
    put(s, 0, C.winDraw.id, 'battle');
    const atk = put(s, 0, C.big.id, 'battle');
    const def_ = put(s, 1, C.small.id, 'battle');
    s.cards[def_].tapped = true;
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'creature', iid: def_ } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.pending).toMatchObject({ kind: 'confirm' });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
  });

  it('相手のマナゾーンに多色カードがあれば、召喚コストを3少なくする', () => {
    const s = newGame();
    const c = put(s, 0, C.cond.id, 'hand');
    expect(effectiveCost(s, reg, 0, c)).toBe(7);
    put(s, 1, C.multi.id, 'mana');
    expect(effectiveCost(s, reg, 0, c)).toBe(4);
  });

  it('墓地から出したクリーチャーに、次の自分のターンのはじめまで「ブロッカー」を与える', () => {
    let s = newGame();
    const dead = put(s, 0, C.big.id, 'graveyard');
    const sp = put(s, 0, C.reanimate.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [dead] });
    expect(s.cards[dead].zone).toBe('battle');
    expect(keywords(s, reg, dead).blocker).toBe(true);
  });
});
});

// ════════════════════════ savedDefs.test.ts ════════════════════════
describe('savedDefs', () => {
// 保存済みカードで手動だった能力を、部品と効果定義で自動にした分のテスト
// （一番上のカードを破壊、選んだ中から持ち主が選ぶ、墓地に置いた中から使う、シンカライズ、D・D・D、
//   攻撃できない効果を無視、NEO進化のコスト軽減、Zラッシュ、手札にある間の誘発、スマッシュ・バースト、相手の出た時の能力を使う）
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });
const spell = (id: string, abilities: string[]) => mk(id, abilities, { type: '呪文', power: '' });

const C = {
  vanilla: mk('v-1', [], { power: '5000' }),
  dark: mk('v-2', [], { civ: '闇' }),
  cost5: mk('v-3', [], { cost: '5' }),
  draw2: spell('v-4', ['カードを２枚引く。']),
  drawOnSummon: mk('v-5', ['このクリーチャーが出た時、カードを１枚引く。']),
  rzf: mk('v-10', ['進化：火のクリーチャー１体の上に置く。', 'W・ブレイカー', '各ターン、このクリーチャーの最初の攻撃の終わりに、このクリーチャーをアンタップし、一番上のカードを破壊する。'], { type: '進化クリーチャー', power: '11000', cost: '6' }),
  sword: spell('v-11', ['相手のクリーチャーを２体選ぶ。相手はその中から１体選んで手札に戻し、もう１体を破壊する。その後、カードを２枚、相手のマナゾーンから選ぶ。相手はその中から１枚選んで手札に戻し、もう１枚を墓地に置く。']),
  nexus: mk('v-12', ['W・ブレイカー', 'このクリーチャーが出た時、自分の山札の上から４枚を墓地に置く。それがすべて異なる名前なら、その中からコスト７以下のカードを１枚、コストを支払わずに実行してもよい。こうして実行しなければ、その中からカードを１枚、自分の手札に戻してもよい。'], { cost: '7' }),
  seed: mk('v-13', ['シンカライズ：このタマシードがクリーチャーであるかのように、この上に進化クリーチャーを置いてもよい。'], { type: 'タマシード', power: '', race: 'ソニック・コマンド' }),
  evo: mk('v-14', ['進化：火のクリーチャー１体の上に置く。'], { type: '進化クリーチャー', power: '6000' }),
  ddd: mk('v-15', ['D・D・D [ff01]'], { cost: '6' }),
  lockAll: mk('v-16', ['相手のクリーチャーは攻撃できない。']),
  ignore: mk('v-17', ['自分のクリーチャーは、相手のカードによる攻撃できない効果を無視して攻撃できる。']),
  neo: mk('v-18', ['NEO進化クリーチャーとして召喚するなら、このクリーチャーの召喚コストを２少なくする。', 'G-NEO進化：火のクリーチャー１体の上に置いてもよい。'], { cost: '3', type: 'G-NEOクリーチャー' }),
  zrush: convertOfficialCard({ id: 'v-19', detailUrl: '', faces: [face('v-19', ['Zラッシュ（シールドが離れたら、次の自分のターンのはじめまで、このクリーチャーのハイパーモードを解放する）']), face('v-19', ['Zラッシュ（シールドが離れたら、次の自分のターンのはじめまで、このクリーチャーのハイパーモードを解放する）', 'ブロッカー'], { power: '7500' })] }),
  blue: convertOfficialCard({
    id: 'v-20',
    detailUrl: '',
    faces: [
      face('ブルー・インパルス / 「真実を見極めよ、ジョニー！」', ['相手のターンの終わりに、その相手のクリーチャーが自分より４体以上多く、自分の《ブルー・インパルス》がなければ、このクリーチャーをコストを支払わずに召喚してもよい。', 'スマッシュ・バースト（このクリーチャーが攻撃する時、このカードの呪文側を、バトルゾーンに置いたままコストを支払わずに唱えてもよい）'], { civ: '水', cost: '10', power: '12000' }),
      face('ブルー・インパルス / 「真実を見極めよ、ジョニー！」', ['カードを２枚引く。'], { civ: '水', type: '呪文', cost: '7', power: '' }),
    ],
  }),
  mimic: mk('v-21', ['相手のターンに相手のクリーチャーが出て、その能力がトリガーした時、自分もその能力を使ってもよい。']),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName, ready = false): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  if (ready) s.cards[iid].enteredTurn = 0;
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);
const run = (s: GameState) => new Ctx(s, reg).run();
const hand = (s: GameState, p: PlayerId) => s.players[p].zones.hand.length;
/** 入力待ちを、いちばん小さい選択（選ばない・断る）で進める */
function settle(s: GameState): GameState {
  for (let i = 0; i < 20 && s.pending; i++) {
    const p = s.pending;
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: p.candidates.slice(0, p.min) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: ['0'] });
    else s = act(s, { type: 'RESPOND', player: p.player, selected: [], accept: false });
  }
  return s;
}

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
});

describe('エンジンで動く', () => {
  it('レッドゾーンF：最初の攻撃の終わりにアンタップし、一番上のカードを破壊する（下のクリーチャーが残る）', () => {
    let s = newGame();
    const under = put(s, 0, C.vanilla.id, 'battle', true);
    const top = put(s, 0, C.rzf.id, 'battle', true);
    s.players[0].zones.battle = s.players[0].zones.battle.filter((x) => x !== under);
    s.cards[top].under = [under];
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: top, target: { kind: 'player' } }));
    expect(s.cards[top].zone).toBe('graveyard');
    expect(s.players[0].zones.battle).toContain(under);
    expect(s.cards[under].tapped).toBe(false);
    expect(s.cards[under].under).toEqual([]);
  });

  it('英知と追撃の宝剣：選んだ2体のうち、相手が1体を手札に戻し、もう1体は破壊される', () => {
    let s = newGame();
    const a = put(s, 1, C.vanilla.id, 'battle');
    const b = put(s, 1, C.dark.id, 'battle');
    const m1 = put(s, 1, C.vanilla.id, 'mana');
    const m2 = put(s, 1, C.dark.id, 'mana');
    const sp = put(s, 0, C.sword.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [b] });
    expect([s.cards[a].zone, s.cards[b].zone]).toEqual(['graveyard', 'hand']);
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [m1] });
    expect([s.cards[m1].zone, s.cards[m2].zone]).toEqual(['hand', 'graveyard']);
  });

  it('ネクサス：墓地に置いた4枚がすべて異なる名前なら、その中から1枚をコストを支払わずに使える', () => {
    let s = newGame();
    for (const id of [C.vanilla.id, C.dark.id, C.cost5.id]) put(s, 0, id, 'deck');
    const sp = put(s, 0, C.draw2.id, 'deck');
    const n = put(s, 0, C.nexus.id, 'hand');
    const before = hand(s, 0);
    s.queue.push({ kind: 'enterBattle', player: 0, iid: n });
    run(s);
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toHaveLength(4);
    s = act(s, { type: 'RESPOND', player: 0, selected: [sp] });
    expect(s.pending).toBeFalsy();
    // ネクサスが手札から出て1枚減り、呪文で2枚引く。実行したので、手札に戻す分は聞かれない
    expect(hand(s, 0)).toBe(before - 1 + 2);
    expect(s.cards[sp].zone).toBe('graveyard');
  });

  it('ネクサス：実行しなければ、その中から1枚を手札に戻せる。同じ名前があれば何もしない', () => {
    let s = newGame();
    const v = put(s, 0, C.vanilla.id, 'deck');
    for (const id of [C.dark.id, C.cost5.id, C.draw2.id]) put(s, 0, id, 'deck');
    const n = put(s, 0, C.nexus.id, 'hand');
    s.queue.push({ kind: 'enterBattle', player: 0, iid: n });
    run(s);
    s = act(s, { type: 'RESPOND', player: 0, selected: [] });
    expect(s.pending?.kind).toBe('selectCards');
    s = act(s, { type: 'RESPOND', player: 0, selected: [v] });
    expect(s.cards[v].zone).toBe('hand');

    const s2 = newGame();
    const n2 = put(s2, 0, C.nexus.id, 'hand');
    s2.queue.push({ kind: 'enterBattle', player: 0, iid: n2 });
    run(s2);
    expect(s2.pending).toBeFalsy();
  });

  it('シンカライズ：タマシードを進化元にできる', () => {
    const s = newGame();
    const seed = put(s, 0, C.seed.id, 'battle');
    const e = put(s, 0, C.evo.id, 'hand');
    expect(evolutionBases(s, reg, 0, e)).toEqual([seed]);
  });

  it('D・D・D：自分のクリーチャーが攻撃する時、コストを支払って手札から使える', () => {
    let s = newGame();
    const a = put(s, 0, C.vanilla.id, 'battle', true);
    const d = put(s, 0, C.ddd.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toEqual([d]);
    s = act(s, { type: 'RESPOND', player: 0, selected: [d] });
    expect(s.cards[d].zone).toBe('battle');
  });

  it('相手のカードによる攻撃できない効果を無視して攻撃できる', () => {
    const s = newGame();
    const mine = put(s, 0, C.vanilla.id, 'battle', true);
    put(s, 1, C.lockAll.id, 'battle');
    expect(keywords(s, reg, mine).cannotAttack).toBe(true);
    put(s, 0, C.ignore.id, 'battle');
    expect(keywords(s, reg, mine).cannotAttack).toBeFalsy();
  });

  it('NEO進化クリーチャーとして召喚するなら、召喚コストを2少なくする', () => {
    let s = newGame();
    const b = put(s, 0, C.vanilla.id, 'battle');
    const n = put(s, 0, C.neo.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    expect(effectiveCost(s, reg, 0, n)).toBe(3);
    expect(effectiveCost(s, reg, 0, n, 'main', [], true)).toBe(1);
    expect(canPlay(s, reg, 0, n)).toBe(true);
    expect(applyAction(s, { type: 'PLAY_CARD', player: 0, iid: n }, reg).error).toBeTruthy();
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: n, evolveOn: b });
    expect(s.cards[n].zone).toBe('battle');
    expect(s.cards[n].under).toEqual([b]);
  });

  it('Zラッシュ：シールドが離れたら、ハイパーモードになる', () => {
    const s = newGame();
    const z = put(s, 0, C.zrush.id, 'battle');
    expect(keywords(s, reg, z).blocker).toBeFalsy();
    new Ctx(s, reg).moveCard(s.players[0].zones.shield[0], 'hand');
    expect(s.cards[z].hyper).toBe(true);
    expect(keywords(s, reg, z).blocker).toBe(true);
  });

  it('ブルー・インパルス：相手のターンの終わりに、相手のクリーチャーが4体以上多ければ、コストを支払わずに召喚できる', () => {
    let s = newGame();
    const blue = put(s, 1, C.blue.id, 'hand');
    for (let i = 0; i < 3; i++) put(s, 0, C.vanilla.id, 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    // 3体多いだけでは聞かれない
    expect(s.cards[blue].zone).toBe('hand');
    s = act(s, { type: 'END_TURN', player: 1 });
    put(s, 0, C.vanilla.id, 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[blue].zone).toBe('battle');
  });

  it('スマッシュ・バースト：攻撃する時、呪文側をバトルゾーンに置いたまま唱えられる', () => {
    let s = newGame();
    const blue = put(s, 0, C.blue.id, 'battle', true);
    const before = hand(s, 0);
    s = act(s, { type: 'ATTACK', player: 0, attacker: blue, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(hand(s, 0)).toBe(before + 2);
    expect(s.cards[blue].zone).toBe('battle');
  });

  it('相手のターンに相手のクリーチャーが出て能力がトリガーした時、自分もその能力を使える', () => {
    let s = newGame();
    put(s, 1, C.mimic.id, 'battle');
    const c = put(s, 0, C.drawOnSummon.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const mine = hand(s, 0);
    const theirs = hand(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(hand(s, 0)).toBe(mine - 1 + 1);
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(hand(s, 1)).toBe(theirs + 1);
  });
});
});
