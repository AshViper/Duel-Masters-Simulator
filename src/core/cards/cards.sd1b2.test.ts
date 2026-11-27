// ドキドキつよいデッキ 25の王道（その2）：手動だった能力を自動処理にしたカードの読み取りと動作
// Vチャロン・斬隠蒼頭龍バイケン・解体人形ジェニー・ボルメテウス・サファイア・ドラゴン・アシスター・コッピ・竜皇神 ボルシャック・バクテラス・
// 輝く革命 ボルシャック・フレア・頂上印鑑 パラキン8th・アシスター・Mogi林檎・歌舞音愛 ヒメカット・単騎連射 マグナム・瞬閃と疾駆と双撃の決断・
// 閃光の精霊カンビアーレ・ガチャンコ ガチロボ・永遠のリュウセイ・カイザー
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { effectiveCost, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, name: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '闇', type: o.type ?? 'クリーチャー', power: o.power ?? '1000', cost: o.cost ?? '1', abilities }] } as never);
const spell = (id: string, name: string, abilities: string[], o: O = {}) => mk(id, name, abilities, { type: '呪文', power: '', race: '', ...o });

const VCHARON =
  'このクリーチャーがバトルゾーンに出た時、プレイヤーを１人選ぶ。そのプレイヤーは自身の手札をすべて、好きな順序で山札の一番下に置き、その後、その枚数と同じ数、カードを引く。その後、そのプレイヤーは自身のシールドゾーンにあるカードをすべて好きな順序で山札の一番下に置き、その枚数と同じ数のカードを、山札の上から裏向きのまま、それぞれ新しいシールドとしてシールドゾーンに置く。';
const BAIKEN_DISCARD = '相手のターン中にこのクリーチャーが自分の手札から捨てられる時、墓地に置くかわりにバトルゾーンに出してもよい。そうした場合、バトルゾーンにあるクリーチャーを１体選び、持ち主の手札に戻してもよい。';
const BAIKEN_NINJA = '自分のシノビの「ニンジャ・ストライク」能力を使った時、カードを１枚引いてもよい。';
const JENNY = 'このクリーチャーをバトルゾーンに出した時、相手の手札を見てその中から１枚選び、捨てさせる。';
const SAPPHIRE = 'このクリーチャーがシールドをブレイクする時、相手はそのシールドを手札に加えるかわりに、持ち主の墓地に置く。';
const COPPI = '各ターンに一度、自分のアーマードを使うコストを１少なくしてもよい。ただし、コストは０以下にはならない。';
const MOGI = '各ターンに一度、自分のマジックを使うコストを１少なくしてもよい。ただし、コストは０以下にはならない。';
const BAKU_CHANGE = '革命チェンジ：コスト７以上の名前に《ボルシャック》とある多色クリーチャー';
const BAKU_ETB = 'このクリーチャーが出た時、自分の山札の上から４枚を見て、その中から《竜皇神 ボルシャック・バクテラス》ではないアーマードを好きな数出す。残りを好きな順序で山札の下に置く。';
const FLARE_WIN = '各ターン、はじめて自分のクリーチャーがバトルする時、そのクリーチャーはそのバトルに勝つ。';
const FLARE_TAP = '各ターン、はじめて相手のクリーチャーが出る時、そのクリーチャーはタップして出る。';
const PARAKIN = 'このクリーチャーの召喚コストを１少なくしてもよい。そうしたら、このターンの終わりに、このクリーチャーを破壊する。';
const HIME = '相手のターン中、相手がそのターンで２枚目以降のカードを引いた時、自分もカードを１枚引いてもよい。';
const MAGNUM = '自分のターン中に、相手のクリーチャーがバトルゾーンに出る時、そのクリーチャーはバトルゾーンのかわりに持ち主の墓地に置かれる。';
const KESSEN = [
  '次の中から２回選ぶ。（同じものを選んでもよい）',
  '',
  '　→コスト３以下のクリーチャーを１体、自分の手札からバトルゾーンに出す。',
  '',
  '　→このターン、自分のクリーチャー１体に「スピードアタッカー」を与える。',
  '',
  '　→自分のクリーチャーを１体選ぶ。このターン、そのクリーチャーの最初の攻撃の終わりに、そのクリーチャーをアンタップする。',
];
const KANBI = '革命０：このクリーチャーを自分のシールドゾーンから手札に加えた時、自分のシールドが１つもなければ、このクリーチャーを自分の手札からコストを支払わずに召喚してもよい。';
const GACHA_ETB = 'このクリーチャーがバトルゾーンに出た時または攻撃する時、自分の山札の上から３枚を見せる。それがすべてコストが同じクリーチャーであれば、バトルゾーンに出す。それ以外なら、好きな順序で山札の一番下に置く。';
const GACHA_STATIC = '相手のシールドが２つ以下なら、自分の水のクリーチャーは攻撃もブロックもされない。';
const RYU_TAP = '相手のクリーチャーは、バトルゾーンに出す時タップして置く。';
const RYU_DISCARD = '相手の呪文の効果または相手のクリーチャーの能力によって、このクリーチャーが自分の手札から捨てられる時、墓地に置くかわりに自分のバトルゾーンに置いてもよい。';

const C = {
  vcharon: mk('b2-1', 'ぶいちゃろん', [VCHARON], { civ: '水', cost: '5', power: '4000' }),
  baiken: mk('b2-2', 'ばいけん', ['ニンジャ・ストライク７', BAIKEN_DISCARD, BAIKEN_NINJA], { civ: '水', cost: '8', power: '6000', race: 'シノビ' }),
  jenny: mk('b2-3', 'じぇにー', [JENNY], { cost: '5', power: '1000' }),
  sapphire: mk('b2-4', 'さふぁいあ', ['T・ブレイカー', SAPPHIRE], { civ: '火', cost: '8', power: '11000' }),
  coppi: mk('b2-5', 'こっぴ', [COPPI], { civ: '火', cost: '2', power: '1000' }),
  baku: mk('b2-6', '竜皇神 ボルシャック・バクテラス', [BAKU_CHANGE, BAKU_ETB], { civ: '光/火', cost: '8', power: '15000', race: 'アーマード・ドラゴン' }),
  flare: mk('b2-7', 'ふれあ', [FLARE_WIN, FLARE_TAP], { civ: '火', cost: '7', power: '7000' }),
  parakin: mk('b2-8', 'ぱらきん', [PARAKIN], { civ: '光', cost: '3', power: '3000' }),
  mogi: mk('b2-9', 'もぎ', [MOGI], { civ: '水', cost: '2', power: '1000' }),
  hime: mk('b2-10', 'ひめかっと', [HIME], { civ: '水', cost: '3', power: '2000' }),
  magnum: mk('b2-11', 'まぐなむ', [MAGNUM], { civ: '火', cost: '3', power: '3000' }),
  kessen: spell('b2-12', 'けつだん', KESSEN, { civ: '火', cost: '5' }),
  kanbi: mk('b2-13', 'かんびあーれ', [KANBI], { civ: '光', cost: '7', power: '9500' }),
  gacha: mk('b2-14', 'がちゃんこ', [GACHA_ETB, GACHA_STATIC], { civ: '水', cost: '7', power: '7000' }),
  ryusei: mk('b2-15', 'りゅうせい', [RYU_TAP, RYU_DISCARD], { civ: '火', cost: '7', power: '9000' }),
  // 動作を確かめるための部品
  shinobi: mk('b2-20', 'しのび', ['ニンジャ・ストライク２'], { civ: '水', cost: '3', power: '2000', race: 'シノビ' }),
  armored: mk('b2-21', 'あーまーど', [], { civ: '火', cost: '4', power: '4000', race: 'アーマード・ドラゴン' }),
  magic: spell('b2-22', 'まじっく', ['カードを１枚引く。'], { civ: '水', cost: '3', race: 'マジック' }),
  small: mk('b2-23', 'ちいさい', [], { civ: '火', cost: '3', power: '1000' }),
  big: mk('b2-24', 'おおきい', [], { civ: '火', cost: '7', power: '12000' }),
  water3: mk('b2-25', 'みず3', [], { civ: '水', cost: '3', power: '3000' }),
  dark4: mk('b2-26', 'やみ4', [], { cost: '4', power: '4000' }),
  discard: spell('b2-27', 'すてさせる', ['相手の手札を１枚見ないで選び、捨てさせる。'], { cost: '2' }),
  bolshack: mk('b2-28', 'ボルシャック・たしょく', [], { civ: '光/火', cost: '7', power: '9000', race: 'アーマード・ドラゴン' }),
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
/** 山札の上に積む（最後に渡したカードが一番上） */
function stack(s: GameState, player: PlayerId, cardIds: string[]): string[] {
  return cardIds.map((cardId) => {
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[player].zones.deck.push(iid);
    return iid;
  });
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
type Pick = (c: string[], prompt: string) => string[] | undefined;
/** 確認はすべて accept、選択は先頭から（pick で変えられる）、モードは modes の順（なければ0番） */
function settle(s: GameState, accept = true, pick?: Pick, modes: string[] = []): GameState {
  const m = [...modes];
  for (let i = 0; i < 40 && s.pending; i++) {
    const p = s.pending as { kind: string; player: PlayerId; candidates?: string[]; min?: number; prompt?: string };
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: pick?.(p.candidates ?? [], p.prompt ?? '') ?? (p.candidates ?? []).slice(0, Math.max(p.min ?? 1, 1)) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: [m.shift() ?? '0'] });
    else if (p.kind === 'block') s = act(s, { type: 'RESPOND', player: p.player, selected: [] });
    else s = act(s, { type: 'RESPOND', player: p.player, accept });
  }
  return s;
}
function runTask(s: GameState, task: GameState['queue'][number]): GameState {
  s.queue.push(task);
  new Ctx(s, reg).run();
  return s;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const zone = (s: GameState, iid: string) => s.cards[iid].zone;
const hand = (s: GameState, p: PlayerId) => s.players[p].zones.hand.length;
const enter = (s: GameState, player: PlayerId, iid: string) => runTask(s, { kind: 'enterBattle', player, iid });
const cast = (s: GameState, player: PlayerId, iid: string) => runTask(s, { kind: 'castSpell', player, iid, side: 'main', from: 'hand' });
const only = (x: string): Pick => (c) => (c.includes(x) ? [x] : undefined);
function clearShields(s: GameState, p: PlayerId): void {
  const ctx = new Ctx(s, reg);
  for (const sh of [...s.players[p].zones.shield]) ctx.moveCard(sh, 'graveyard');
}

describe('SD1その2の読み取り', () => {
  it('15枚とも自動の効果になる', () => {
    for (const c of [C.vcharon, C.baiken, C.jenny, C.sapphire, C.coppi, C.baku, C.flare, C.parakin, C.mogi, C.hime, C.magnum, C.kessen, C.kanbi, C.gacha, C.ryusei])
      expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('Vチャロン・バイケン・ジェニー・サファイア', () => {
    expect(C.vcharon.abilities?.[0].effects).toEqual([{ type: 'refreshHandShields', who: 'choose' }]);
    expect(C.baiken.keywords?.discardToBattle).toBe('may');
    expect(C.baiken.keywords?.discardToBattleThen?.[0].type).toBe('optional');
    expect(C.baiken.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onNinjaStrike', filter: { race: 'シノビ' }, optional: true }));
    expect(C.jenny.abilities?.[0].effects).toEqual([{ type: 'move', target: { owner: 'opponent', zone: 'hand', count: 1 }, to: 'graveyard' }]);
    expect(C.sapphire.keywords?.shieldBurn).toBe(true);
  });
  it('コッピ・Mogi林檎：その能力ごとに各ターン1度のコスト軽減', () => {
    expect(C.coppi.statics).toEqual([{ type: 'costMod', amount: -1, appliesTo: { owner: 'self', filter: { race: 'アーマード' } }, oncePerTurn: true }]);
    expect(C.mogi.statics?.[0]).toEqual(expect.objectContaining({ appliesTo: { owner: 'self', filter: { race: 'マジック' } }, oncePerTurn: true }));
  });
  it('バクテラス：名前に《ボルシャック》とあるコスト7以上の多色に革命チェンジ。自分と同じ名前のカードは出さない', () => {
    expect(C.baku.attackSwap).toEqual({ kind: 'revolution', filter: { nameIncludes: 'ボルシャック', minCost: 7, multicolor: true } });
    expect(C.baku.abilities?.[0].effects[0]).toEqual(expect.objectContaining({ type: 'lookAtTop', count: 4, pickTo: 'battle', restTo: 'deckBottom' }));
  });
  it('フレア・パラキン・ヒメカット・マグナム', () => {
    expect(C.flare.statics).toEqual([{ type: 'winFirstBattle' }, { type: 'opponentEntersTapped', firstPerTurn: true }]);
    expect(C.parakin.altPlays).toEqual([expect.objectContaining({ reduce: 1, endOfTurn: 'destroy' })]);
    expect(C.hime.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onDraw', who: 'opponent', minDrawCount: 2, duringTurn: 'opponent', optional: true }));
    expect(C.magnum.statics).toEqual([{ type: 'enterInstead', who: 'opponent', filter: { cardType: 'creature' }, to: 'graveyard', duringTurn: 'self' }]);
  });
  it('決断・カンビアーレ・ガチャンコ・リュウセイ', () => {
    const ch = C.kessen.abilities?.[0].effects[0];
    expect(ch?.type === 'chooseOne' && [ch.times, ch.options.length]).toEqual([2, 3]);
    expect(C.kanbi.shieldTriggerIf).toEqual({ type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 });
    expect(C.gacha.abilities?.map((a) => a.when)).toEqual(['onSummon', 'onAttack']);
    expect(C.gacha.statics?.[0]).toEqual(expect.objectContaining({ keywords: { cannotBeAttacked: true, unblockable: true } }));
    expect(C.ryusei.statics).toEqual([{ type: 'opponentEntersTapped' }]);
    expect(C.ryusei.keywords).toEqual(expect.objectContaining({ discardToBattle: 'may', discardToBattleCause: 'opponentEffect' }));
  });
  it('「このターン、自分のクリーチャー1体に「〜」を与える」は選んだ1体に与える', () => {
    const sp = spell('b2-40', 'あたえる', ['このターン、自分のクリーチャー１体に「スピードアタッカー」を与える。']);
    expect(sp.abilities?.[0].effects).toEqual([{ type: 'grantKeyword', target: { owner: 'self', zone: 'battle', count: 1 }, keywords: { speedAttacker: true } }]);
  });
});

describe('SD1その2の動作', () => {
  it('Vチャロン：選んだプレイヤーの手札とシールドを山札の下に置き、同じ数だけ引いてシールドにする', () => {
    let s = newGame();
    const oldHand = [...s.players[1].zones.hand];
    const oldShields = [...s.players[1].zones.shield];
    s = settle(enter(s, 0, put(s, 0, C.vcharon.id, 'hand')), true, undefined, ['1']);
    expect(hand(s, 1)).toBe(oldHand.length);
    expect(s.players[1].zones.shield.length).toBe(oldShields.length);
    expect([...oldHand, ...oldShields].every((x) => zone(s, x) === 'deck')).toBe(true);
    expect(s.players[1].zones.hand.some((x) => oldHand.includes(x))).toBe(false);
  });

  it('バイケン：相手のターンに手札から捨てられたら出して、クリーチャーを1体手札に戻してもよい。自分のターンなら出ない', () => {
    let s = newGame();
    s.activePlayer = 1;
    const b = put(s, 0, C.baiken.id, 'hand');
    const o = put(s, 1, C.big.id, 'battle');
    s = settle(runTask(s, { kind: 'effect', controller: 1, source: o, effect: { type: 'move', target: { owner: 'opponent', zone: 'hand', count: 1 }, to: 'graveyard' } }), true, (c) =>
      c.includes(o) ? [o] : c.includes(b) ? [b] : undefined,
    );
    expect([zone(s, b), zone(s, o)]).toEqual(['battle', 'hand']);

    s = newGame();
    const b2 = put(s, 0, C.baiken.id, 'hand');
    const src = put(s, 1, C.big.id, 'battle');
    s = settle(runTask(s, { kind: 'effect', controller: 1, source: src, effect: { type: 'move', target: { owner: 'opponent', zone: 'hand', count: 1 }, to: 'graveyard' } }), true, only(b2));
    expect(zone(s, b2)).toBe('graveyard');
  });

  it('バイケン：自分のシノビのニンジャ・ストライクを使った時、カードを1枚引いてもよい', () => {
    let s = newGame();
    s.activePlayer = 0;
    put(s, 1, C.baiken.id, 'battle');
    const sh = put(s, 1, C.shinobi.id, 'hand');
    const h = hand(s, 1);
    s = settle(runTask(s, { kind: 'effect', controller: 1, source: sh, effect: { type: 'handPlay', iid: sh, ninja: true } }));
    expect(zone(s, sh)).toBe('battle');
    expect(hand(s, 1)).toBe(h - 1 + 1);
  });

  it('ジェニー：相手の手札を見て選んだ1枚を捨てさせる', () => {
    let s = newGame();
    const x = put(s, 1, C.big.id, 'hand');
    s = settle(enter(s, 0, put(s, 0, C.jenny.id, 'hand')), true, only(x));
    expect(zone(s, x)).toBe('graveyard');
  });

  it('サファイア：ブレイクしたシールドは手札に加えるかわりに墓地へ', () => {
    let s = newGame();
    const a = put(s, 0, C.sapphire.id, 'battle');
    const sh = [...s.players[1].zones.shield];
    const h = hand(s, 1);
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }));
    expect(sh.filter((x) => zone(s, x) === 'graveyard').length).toBe(3);
    expect(hand(s, 1)).toBe(h);
  });

  it('コッピ・Mogi林檎：各ターン1度、アーマード（マジック）を使うコストを1少なくする', () => {
    let s = newGame();
    put(s, 0, C.coppi.id, 'battle');
    put(s, 0, C.mogi.id, 'battle');
    for (let i = 0; i < 6; i++) put(s, 0, C.armored.id, 'mana');
    const a1 = put(s, 0, C.armored.id, 'hand');
    const a2 = put(s, 0, C.armored.id, 'hand');
    const m1 = put(s, 0, C.magic.id, 'hand');
    expect([effectiveCost(s, reg, 0, a1), effectiveCost(s, reg, 0, m1)]).toEqual([3, 2]);
    s.phase = 'main';
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: a1 }));
    expect(zone(s, a1)).toBe('battle');
    // 1度使ったので、このターンの2体目はそのまま。マジックの軽減は別
    expect([effectiveCost(s, reg, 0, a2), effectiveCost(s, reg, 0, m1)]).toEqual([4, 2]);
  });

  it('バクテラス：山札の上4枚から、同じ名前ではないアーマードを好きな数出し、残りは山札の下へ', () => {
    let s = newGame();
    const [x1, x2, x3, x4] = stack(s, 0, [C.armored.id, C.small.id, C.baku.id, C.armored.id]);
    let cands: string[] = [];
    s = settle(enter(s, 0, put(s, 0, C.baku.id, 'hand')), true, (c) => {
      cands = c;
      return c;
    });
    expect(cands.sort()).toEqual([x1, x4].sort());
    expect([zone(s, x1), zone(s, x2), zone(s, x3), zone(s, x4)]).toEqual(['battle', 'deck', 'deck', 'battle']);
    expect(s.players[0].zones.deck.slice(0, 2).sort()).toEqual([x2, x3].sort());
  });

  it('バクテラス：名前に《ボルシャック》とあるコスト7以上の多色クリーチャーの攻撃時に革命チェンジできる', () => {
    let s = newGame();
    const atk = put(s, 0, C.bolshack.id, 'battle');
    const bk = put(s, 0, C.baku.id, 'hand');
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toContain(bk);
  });

  it('フレア：各ターン、はじめてのバトルには勝つ（2回目は勝たない）', () => {
    let s = newGame();
    put(s, 0, C.flare.id, 'battle');
    const a1 = put(s, 0, C.small.id, 'battle');
    const a2 = put(s, 0, C.small.id, 'battle');
    const d1 = put(s, 1, C.big.id, 'battle');
    const d2 = put(s, 1, C.big.id, 'battle');
    s.cards[d1].tapped = true;
    s.cards[d2].tapped = true;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a1, target: { kind: 'creature', iid: d1 } }));
    expect([zone(s, a1), zone(s, d1)]).toEqual(['battle', 'graveyard']);
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a2, target: { kind: 'creature', iid: d2 } }));
    expect([zone(s, a2), zone(s, d2)]).toEqual(['graveyard', 'battle']);
  });

  it('フレア：各ターン、はじめて出る相手のクリーチャーだけタップして出る', () => {
    let s = newGame();
    put(s, 0, C.flare.id, 'battle');
    const e1 = put(s, 1, C.small.id, 'hand');
    const e2 = put(s, 1, C.small.id, 'hand');
    s = settle(enter(s, 1, e1));
    s = settle(enter(s, 1, e2));
    expect([s.cards[e1].tapped, s.cards[e2].tapped]).toEqual([true, false]);
  });

  it('パラキン：コストを1少なくして召喚すると、ターンの終わりに破壊される。普通に召喚すれば残る', () => {
    let s = newGame();
    for (let i = 0; i < 2; i++) put(s, 0, C.parakin.id, 'mana');
    const p = put(s, 0, C.parakin.id, 'hand');
    s.phase = 'main';
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: p, alt: 0 }));
    expect(zone(s, p)).toBe('battle');
    s = settle(act(s, { type: 'END_TURN', player: 0 }));
    expect(zone(s, p)).toBe('graveyard');
  });

  it('ヒメカット：相手のターンに相手が2枚目以降を引いた時、自分も1枚引いてもよい（自分のターンは引かない）', () => {
    let s = newGame();
    put(s, 0, C.hime.id, 'battle');
    s.activePlayer = 1;
    s.players[1].drawnThisTurn = 0;
    const h = hand(s, 0);
    s = settle(runTask(s, { kind: 'effect', controller: 1, source: s.players[1].zones.deck[0], effect: { type: 'draw', count: 3 } }));
    expect(hand(s, 0)).toBe(h + 2);

    s = newGame();
    put(s, 0, C.hime.id, 'battle');
    s.activePlayer = 0;
    s.players[1].drawnThisTurn = 0;
    const h2 = hand(s, 0);
    s = settle(runTask(s, { kind: 'effect', controller: 0, source: s.players[0].zones.deck[0], effect: { type: 'draw', count: 3 } }));
    expect(hand(s, 0)).toBe(h2 + 3);
  });

  it('マグナム：自分のターン中、相手のクリーチャーは出るかわりに墓地へ（相手のターンは出る）', () => {
    let s = newGame();
    put(s, 0, C.magnum.id, 'battle');
    s.activePlayer = 0;
    const e1 = put(s, 1, C.small.id, 'hand');
    s = settle(enter(s, 1, e1));
    expect(zone(s, e1)).toBe('graveyard');
    s.activePlayer = 1;
    const e2 = put(s, 1, C.small.id, 'hand');
    s = settle(enter(s, 1, e2));
    expect(zone(s, e2)).toBe('battle');
  });

  it('決断：コスト3以下を手札から出し、選んだクリーチャーは最初の攻撃の終わりにアンタップする（2回目はしない）', () => {
    let s = newGame();
    const c3 = put(s, 0, C.small.id, 'hand');
    const k = put(s, 0, C.kessen.id, 'hand');
    s = settle(cast(s, 0, k), true, only(c3), ['0', '2']);
    expect(zone(s, c3)).toBe('battle');
    s.cards[c3].enteredTurn = 0;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: c3, target: { kind: 'player' } }), false);
    expect(s.cards[c3].tapped).toBe(false);
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: c3, target: { kind: 'player' } }), false);
    expect(s.cards[c3].tapped).toBe(true);
  });

  it('カンビアーレ：シールドから手札に加えた時、シールドが1つもなければ召喚してもよい（残っていれば使えない）', () => {
    let s = newGame();
    clearShields(s, 1);
    const kb = put(s, 1, C.kanbi.id, 'shield');
    const a = put(s, 0, C.small.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }));
    expect(zone(s, kb)).toBe('battle');

    s = newGame();
    clearShields(s, 1);
    put(s, 1, C.small.id, 'shield');
    const kb2 = put(s, 1, C.kanbi.id, 'shield');
    const a2 = put(s, 0, C.small.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a2, target: { kind: 'player' } }), true, only(kb2));
    expect(zone(s, kb2)).toBe('hand');
  });

  it('ガチャンコ：見せた3枚がすべて同じコストのクリーチャーなら出す。そうでなければ山札の下へ', () => {
    let s = newGame();
    const same = stack(s, 0, [C.small.id, C.water3.id, C.small.id]);
    s = settle(enter(s, 0, put(s, 0, C.gacha.id, 'hand')));
    expect(same.map((x) => zone(s, x))).toEqual(['battle', 'battle', 'battle']);

    s = newGame();
    const mixed = stack(s, 0, [C.small.id, C.dark4.id, C.small.id]);
    s = settle(enter(s, 0, put(s, 0, C.gacha.id, 'hand')));
    expect(mixed.map((x) => zone(s, x))).toEqual(['deck', 'deck', 'deck']);
    expect(s.players[0].zones.deck.slice(0, 3).sort()).toEqual([...mixed].sort());
  });

  it('ガチャンコ：相手のシールドが2つ以下なら、自分の水のクリーチャーは攻撃もブロックもされない', () => {
    const s = newGame();
    put(s, 0, C.gacha.id, 'battle');
    const w = put(s, 0, C.water3.id, 'battle');
    const f = put(s, 0, C.small.id, 'battle');
    expect(keywords(s, reg, w).cannotBeAttacked).toBeFalsy();
    clearShields(s, 1);
    put(s, 1, C.small.id, 'shield');
    expect([keywords(s, reg, w).cannotBeAttacked, keywords(s, reg, w).unblockable]).toEqual([true, true]);
    expect(keywords(s, reg, f).unblockable).toBeFalsy();
  });

  it('リュウセイ：相手のクリーチャーはタップして出る。相手の呪文で捨てられたら出してもよい（自分のカードで捨てたら出ない）', () => {
    let s = newGame();
    put(s, 0, C.ryusei.id, 'battle');
    const e1 = put(s, 1, C.small.id, 'hand');
    s = settle(enter(s, 1, e1));
    expect(s.cards[e1].tapped).toBe(true);

    s = newGame();
    const r = put(s, 0, C.ryusei.id, 'hand');
    const sp = put(s, 1, C.discard.id, 'graveyard');
    s = settle(runTask(s, { kind: 'effect', controller: 1, source: sp, effect: { type: 'move', target: { owner: 'opponent', zone: 'hand', count: 1 }, to: 'graveyard' } }), true, only(r));
    expect(zone(s, r)).toBe('battle');

    s = newGame();
    const r2 = put(s, 0, C.ryusei.id, 'hand');
    const own = put(s, 0, C.discard.id, 'graveyard');
    s = settle(runTask(s, { kind: 'effect', controller: 0, source: own, effect: { type: 'move', target: { owner: 'self', zone: 'hand', count: 1 }, to: 'graveyard' } }), true, only(r2));
    expect(zone(s, r2)).toBe('graveyard');
  });
});
