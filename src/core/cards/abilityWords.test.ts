// 能力語の続き：シールドをブレイクした時・メクレイドの誘発・真・エスケープ／マナ武装・∞／バラエティ・ブレイカー・サイクロン・シビルカウントなど
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { breakerCount, keywords, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });

const C = {
  vanilla: mk('w-1', [], { power: '1000' }),
  cost2: mk('w-2', [], { power: '1000', cost: '2' }),
  cost3: mk('w-3', [], { power: '1000', cost: '3' }),
  breakDraw: mk('w-10', ['このクリーチャーがシールドをブレイクした時、カードを１枚引く。']),
  otherBreak: mk('w-11', ['自分の他のクリーチャーがシールドをブレイクした時、カードを１枚引く。']),
  escape: mk('w-12', ['真・エスケープ（このクリーチャーが離れる時、かわりに自分のシールドを２つ手札に加えてもよい。ただし、その「S・トリガー」は使えない）']),
  armed: mk('w-13', ['マナ武装 ３：自分のクリーチャーが離れる時、自分のマナゾーンに光のカードが３枚以上あれば、かわりに自分のシールドを２つ手札に加えてもよい。その「S・トリガー」は使えない。'], { civ: '光' }),
  infinity: mk('w-14', ['∞ブレイカー（「∞ ブレイカー」を持つクリーチャーは、相手のシールドを好きな数ブレイクできる）']),
  variety: mk('w-15', ['バラエティ・ブレイカー（このクリーチャーは、コストが異なる自分のクリーチャーの数、シールドをブレイクする）'], { cost: '5' }),
  cyclone: mk('w-16', ['サイクロン(このターン、この呪文を唱える直前にクリーチャーを召喚していれば、この呪文を唱えた後、墓地に置くかわりに自分の手札に戻す)', 'カードを１枚引く。'], { type: '呪文', power: '' }),
  civil: mk('w-17', ['シビルカウント２：自分の火のクリーチャーまたは火のタマシードが合計２つ以上あれば、このクリーチャーは「スピードアタッカー」を得、バトル中パワーが+5000される。']),
  toGrave: mk('w-18', ['このカードが墓地に置かれた時、その直前にバトルゾーンにあれば、カードを１枚引く。']),
  grSpell: mk('w-19', ['GR召喚を２回する。このターン、それらのGRクリーチャーに「スピードアタッカー」と「ブロッカー」を与える。'], { type: '呪文', power: '' }),
  gr: mk('w-20', [], { type: 'GRクリーチャー', power: '2000' }),
  marshal: mk('w-21', ['マーシャル・タッチ（このクリーチャーがバトルゾーンに出た時、自分の他のクリーチャーを１体、バトルゾーンから手札に戻してもよい。そうしたら、 このクリーチャーの g能力を使う）', '▶ g カードを２枚引く。']),
  bara: mk('w-22', ['バラバラエティ３：自分のクリーチャーすべてに「スピードアタッカー」を与える。（コストが異なる自分のエレメントが３つ以上あれば、このクリーチャーにこの能力を与える）']),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => C.vanilla.id);
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
/** 入力待ちを、はい（accept）または最初の候補で進める */
function settle(s: GameState, accept = true): GameState {
  for (let i = 0; i < 20 && s.pending; i++) {
    const p = s.pending;
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: p.candidates.slice(0, Math.max(p.min, 1)) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: ['0'] });
    else s = act(s, { type: 'RESPOND', player: p.player, selected: [], accept });
  }
  return s;
}
const newGame = (deck = filler) => createGame({ players: [{ name: 'A', deck }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
});

describe('シールドをブレイクした時', () => {
  it('このクリーチャーがブレイクした時と、自分の他のクリーチャーがブレイクした時に誘発する', () => {
    let s = newGame();
    const a = put(s, 0, C.breakDraw.id, 'battle');
    put(s, 0, C.otherBreak.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = settle(s, false);
    // 自分の能力で1枚、他のクリーチャーの能力で1枚
    expect(s.players[0].zones.hand.length).toBe(hand + 2);
  });
});

describe('置換', () => {
  it('真・エスケープ：離れるかわりにシールドを2つ手札に加える', () => {
    let s = newGame();
    const e = put(s, 0, C.escape.id, 'battle');
    const shields = s.players[0].zones.shield.length;
    s.queue.push({ kind: 'leave', iid: e, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.cards[e].zone).toBe('battle');
    expect(s.players[0].zones.shield.length).toBe(shields - 2);
  });
  it('マナ武装：マナゾーンに光のカードが足りなければ置換しない', () => {
    let s = newGame();
    const e = put(s, 0, C.armed.id, 'battle');
    put(s, 0, C.armed.id, 'mana');
    s.queue.push({ kind: 'leave', iid: e, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.cards[e].zone).toBe('graveyard');
    // 光が3枚あれば置換できる
    s = newGame();
    const e2 = put(s, 0, C.armed.id, 'battle');
    for (let i = 0; i < 3; i++) put(s, 0, C.armed.id, 'mana');
    s.queue.push({ kind: 'leave', iid: e2, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.cards[e2].zone).toBe('battle');
  });
});

describe('ブレイカー', () => {
  it('∞ブレイカーはシールドをすべてブレイクし、バラエティ・ブレイカーはコストの種類の数だけブレイクする', () => {
    const s = newGame();
    expect(breakerCount(s, reg, put(s, 0, C.infinity.id, 'battle'))).toBeGreaterThanOrEqual(5);
    const s2 = newGame();
    const v = put(s2, 0, C.variety.id, 'battle');
    expect(breakerCount(s2, reg, v)).toBe(1);
    put(s2, 0, C.cost2.id, 'battle');
    put(s2, 0, C.cost3.id, 'battle');
    put(s2, 0, C.cost3.id, 'battle');
    expect(breakerCount(s2, reg, v)).toBe(3);
  });
});

describe('呪文・常在', () => {
  it('サイクロン：直前にクリーチャーを召喚していれば、唱えた後に手札に戻る', () => {
    let s = newGame();
    const c = put(s, 0, C.vanilla.id, 'hand');
    const sp = put(s, 0, C.cyclone.id, 'hand');
    for (let i = 0; i < 2; i++) put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    s = settle(s);
    expect(s.cards[sp].zone).toBe('hand');
    // 直前が召喚でなければ墓地へ
    let t = newGame();
    const sp2 = put(t, 0, C.cyclone.id, 'hand');
    put(t, 0, C.vanilla.id, 'mana');
    t = act(t, { type: 'PLAY_CARD', player: 0, iid: sp2 });
    t = settle(t);
    expect(t.cards[sp2].zone).toBe('graveyard');
  });
  it('シビルカウント：条件を満たすとスピードアタッカーを得、バトル中だけパワーが上がる', () => {
    let s = newGame();
    const c = put(s, 0, C.civil.id, 'battle');
    expect(keywords(s, reg, c).speedAttacker).toBeFalsy();
    put(s, 0, C.vanilla.id, 'battle');
    expect(keywords(s, reg, c).speedAttacker).toBe(true);
    expect(power(s, reg, c)).toBe(3000);
    const d = put(s, 1, C.vanilla.id, 'battle');
    s.cards[d].tapped = true;
    s = act(s, { type: 'ATTACK', player: 0, attacker: c, target: { kind: 'creature', iid: d } });
    expect(s.log.some((l) => /8000/.test(typeof l === 'string' ? l : l.text))).toBe(true);
  });
  it('バラバラエティ：コストが異なるエレメントが3つ以上あれば、自分のクリーチャーすべてにスピードアタッカーを与える', () => {
    const s = newGame();
    const b = put(s, 0, C.bara.id, 'battle');
    const v = put(s, 0, C.cost2.id, 'battle');
    expect(keywords(s, reg, v).speedAttacker).toBeFalsy();
    put(s, 0, C.cost3.id, 'battle');
    expect(keywords(s, reg, v).speedAttacker).toBe(true);
    expect(keywords(s, reg, b).speedAttacker).toBe(true);
  });
  it('バトルゾーンから墓地に置かれた時に誘発する（手札から捨てた時は誘発しない）', () => {
    let s = newGame();
    const g = put(s, 0, C.toGrave.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s.queue.push({ kind: 'leave', iid: g, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
  });
  it('GR召喚で出したクリーチャーに、このターン能力を与える', () => {
    let s = newGame([...filler.slice(0, 37), C.gr.id, C.gr.id, C.gr.id]);
    const sp = put(s, 0, C.grSpell.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    s = settle(s);
    const grs = s.players[0].zones.battle.filter((x) => s.cards[x].cardId === C.gr.id);
    expect(grs).toHaveLength(2);
    for (const g of grs) expect(keywords(s, reg, g)).toMatchObject({ speedAttacker: true, blocker: true });
  });
  it('マーシャル・タッチ：他のクリーチャーを手札に戻したら、記号つきの能力を使う', () => {
    let s = newGame();
    put(s, 0, C.vanilla.id, 'battle');
    const m = put(s, 0, C.marshal.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: m });
    s = settle(s);
    // 手札：出したカード -1、戻したクリーチャー +1、引いた2枚 +2
    expect(s.players[0].zones.hand.length).toBe(hand + 2);
  });
});
