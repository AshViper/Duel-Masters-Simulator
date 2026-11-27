// 特殊なカード：超次元（サイキック・ドラグハート）・超魂・禁断・ジェニーのデッキ
// 元は別々のテストファイル。ファイルごとに describe（元のファイル名）で包んであるので、補助関数（mk・put・reg など）は同じ名前でもぶつからない
import { describe, expect, it } from 'vitest';
import { chooseAction } from '../ai/cpu';
import { DEFAULT_FORMAT, validateDeck } from '../deck/rules';
import { applyAction, Ctx } from '../engine/engine';
import { battleCards, canAttackWith, def, isIgnored, keywords, power, targetCandidates } from '../engine/queries';
import { nextRandom } from '../engine/rng';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { applyParsedEffects, convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

// ════════════════════════ hyperspatial.test.ts ════════════════════════
describe('hyperspatial', () => {
// 超次元まわりのテスト：覚醒・解除・ループ覚醒（サイキック・クリーチャーが裏返る）、ドラグハート（龍解・龍回避）
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });
const two = (id: string, front: ReturnType<typeof face>, back: ReturnType<typeof face>) => convertOfficialCard({ id, detailUrl: '', faces: [front, back] });

const C = {
  vanilla: mk('h-1', [], { power: '1000' }),
  // 覚醒：ターンの終わりに、バトルに勝っていれば裏返る。裏面は解除を持つ
  awaken: two(
    'h-10',
    face('表のサイキック', ['覚醒：自分のターンの終わりに、このターン、自分のクリーチャーがバトルに勝っていれば、このクリーチャーをコストが大きいほうに裏返す。'], { type: 'サイキック・クリーチャー', cost: '4', power: '3000' }),
    face('裏の覚醒者', ['ブロッカー', '解除（このクリーチャーが離れる時、かわりにコストが小さいほうに裏返す）', 'このクリーチャーが覚醒した時、カードを１枚引く。'], { type: 'サイキック・クリーチャー', cost: '8', power: '9000' }),
  ),
  loop: two(
    'h-11',
    face('ジキル', ['ブロッカー', 'ループ覚醒-このクリーチャーがブロックした時または攻撃された時、自分の山札の上から２枚を墓地に置き、その後、このクリーチャーを《ハイド》のほうに裏返す。（攻撃は中止されない）'], { type: 'サイキック・クリーチャー', cost: '4', power: '1000' }),
    face('ハイド', [], { type: 'サイキック・クリーチャー', cost: '4', power: '3000' }),
  ),
  // ドラグハート・フォートレス：ターンの終わりに墓地が3枚以上なら龍解する。クリーチャー側は龍回避を持つ
  fortress: two(
    'h-12',
    face('要塞', ['このドラグハートをバトルゾーンに出した時、カードを１枚引いてもよい。', '龍解：自分のターンの終わりに、自分の墓地にカードが３枚以上あれば、このドラグハートをクリーチャー側に裏返し、アンタップする。'], { type: 'ドラグハート・フォートレス', cost: '4', power: '' }),
    face('龍解した龍', ['W・ブレイカー', '龍回避：このクリーチャーがバトルゾーンを離れる時、バトルゾーンを離れるかわりに、フォートレス側に裏返す。'], { type: 'ドラグハート・クリーチャー', cost: '7', power: '9000' }),
  ),
  weapon: two(
    'h-14',
    face('剣', ['これを装備したクリーチャーに「スピードアタッカー」を与える。', 'これを装備したクリーチャーのパワーを+2000する。', '龍解：これを装備したクリーチャーが攻撃する時、このドラグハートをクリーチャー側に裏返す。'], { type: 'ドラグハート・ウエポン', cost: '3', power: '' }),
    face('剣の龍', ['W・ブレイカー'], { type: 'ドラグハート・クリーチャー', cost: '6', power: '7000' }),
  ),
  dragner: mk('h-13', ['このクリーチャーが出た時、コスト４以下のドラグハートを１枚、自分の超次元ゾーンからバトルゾーンに出す。']),
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
  it('ドラグハートは、表がクリーチャーではない置き物、裏がクリーチャーの両面カード', () => {
    expect(C.fortress.type).toBe('field');
    expect(C.fortress.psychic?.back.name).toBe('龍解した龍');
  });
});

describe('覚醒・解除', () => {
  it('バトルに勝ったターンの終わりに覚醒し、「覚醒した時」が誘発する。離れる時はかわりに表に裏返る', () => {
    let s = newGame();
    const a = put(s, 0, C.awaken.id, 'battle', true);
    const d = put(s, 1, C.vanilla.id, 'battle');
    s.cards[d].tapped = true;
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: d } }));
    expect(s.cards[d].zone).toBe('graveyard');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[a].flipped).toBe(true);
    expect(def(s, reg, a).name).toBe('裏の覚醒者');
    expect(power(s, reg, a)).toBe(9000);
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
    // 解除：破壊されるかわりに表に裏返ってとどまる
    s.queue.push({ kind: 'leave', iid: a, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[a].zone).toBe('battle');
    expect(s.cards[a].flipped).toBeFalsy();
    // 表の時に破壊されると、超次元ゾーンに戻る
    s.queue.push({ kind: 'leave', iid: a, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[a].zone).toBe('hyperspatial');
  });

  it('バトルに勝っていなければ覚醒しない', () => {
    let s = newGame();
    const a = put(s, 0, C.awaken.id, 'battle', true);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[a].flipped).toBeFalsy();
  });

  it('ループ覚醒：攻撃された時、山札の上から2枚を墓地に置いて裏返る', () => {
    let s = newGame();
    const j = put(s, 1, C.loop.id, 'battle');
    s.cards[j].tapped = true;
    const atk = put(s, 0, C.vanilla.id, 'battle', true);
    const grave = s.players[1].zones.graveyard.length;
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'creature', iid: j } }));
    expect(s.players[1].zones.graveyard.length).toBeGreaterThanOrEqual(grave + 2);
    // 裏返ってパワー3000になったので、パワー1000の攻撃クリーチャーに勝つ
    expect(s.cards[j].zone).toBe('battle');
    expect(s.cards[j].flipped).toBe(true);
    expect(s.cards[atk].zone).toBe('graveyard');
  });
});

describe('ドラグハート', () => {
  it('超次元ゾーンで始まり、効果でバトルゾーンに出せる。出た時の能力が誘発する', () => {
    let s = createGame({ players: [{ name: 'A', deck: [...filler.slice(0, 39), C.fortress.id] }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);
    const f = s.players[0].zones.hyperspatial[0];
    expect(s.cards[f].cardId).toBe(C.fortress.id);
    const dr = put(s, 0, C.dragner.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: dr });
    expect(s.cards[f].zone).toBe('battle');
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
  });

  it('龍解：条件を満たすとクリーチャー側に裏返る。龍回避：離れる時、かわりにフォートレス側に裏返る', () => {
    let s = newGame();
    const f = put(s, 0, C.fortress.id, 'battle');
    for (let i = 0; i < 3; i++) put(s, 0, C.vanilla.id, 'graveyard');
    expect(keywords(s, reg, f).breaker).toBeFalsy();
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[f].flipped).toBe(true);
    expect(def(s, reg, f).type).toBe('creature');
    expect(power(s, reg, f)).toBe(9000);
    s.queue.push({ kind: 'leave', iid: f, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[f].zone).toBe('battle');
    expect(s.cards[f].flipped).toBeFalsy();
    expect(def(s, reg, f).type).toBe('field');
  });
});

describe('ドラグハート・ウエポンの装備', () => {
  const setup = () => {
    let s = createGame({ players: [{ name: 'A', deck: [...filler.slice(0, 39), C.weapon.id] }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);
    const w = s.players[0].zones.hyperspatial[0];
    const dr = put(s, 0, C.dragner.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: dr });
    return { s, w, dr };
  };

  it('クリーチャーの能力で出したウエポンは、そのクリーチャーに装備される。装備したクリーチャーに能力を与える', () => {
    const { s, w, dr } = setup();
    expect(s.cards[w].zone).toBe('battle');
    expect(s.cards[w].equippedTo).toBe(dr);
    expect(keywords(s, reg, dr).speedAttacker).toBe(true);
    expect(power(s, reg, dr)).toBe(3000 + 2000);
    // 装備していないクリーチャーにはかからない
    const other = put(s, 0, C.vanilla.id, 'battle');
    expect(keywords(s, reg, other).speedAttacker).toBeFalsy();
    expect(power(s, reg, other)).toBe(1000);
  });

  it('装備先が離れたら、ウエポンは超次元ゾーンに戻る', () => {
    const { s, w, dr } = setup();
    s.queue.push({ kind: 'leave', iid: dr, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[dr].zone).toBe('graveyard');
    expect(s.cards[w].zone).toBe('hyperspatial');
    expect(s.cards[w].equippedTo).toBeUndefined();
  });

  it('「これを装備したクリーチャーが攻撃する時」で龍解し、装備から外れてクリーチャーになる', () => {
    let { s, w, dr } = setup();
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: dr, target: { kind: 'player' } }));
    expect(s.cards[w].flipped).toBe(true);
    expect(s.cards[w].equippedTo).toBeUndefined();
    expect(def(s, reg, w).type).toBe('creature');
    // 装備が外れたので、与えていた能力はなくなる
    expect(power(s, reg, dr)).toBe(3000);
  });
});

describe('手札にある間の誘発・攻撃まわりの条件', () => {
  const revenge = mk('h-20', ['リベンジ・チャンス：各ターンの終わりに、相手の、コスト９以上またはパワー15000以上のクリーチャーがあれば、このクリーチャーをコストを支払わずに召喚してもよい。'], { cost: '7' });
  const big = mk('h-21', [], { cost: '9', power: '2000' });
  const climax = mk('h-22', ['クライマックス・ドロン・ゴー：自分のエグザイル・クリーチャーが破壊された時、このクリーチャーを自分の手札からバトルゾーンに出してもよい。'], { cost: '8' });
  const exile = mk('h-23', [], { race: 'エグザイル・クリーチャー' });
  const zero = mk('h-24', ['侵略ZERO：相手のターンの終わりに、そのターン、相手のクリーチャーがコストを支払わずに出ていたら、この呪文を自分の手札からコストを支払わずに唱えてもよい。', 'カードを２枚引く。'], { type: '呪文', power: '', cost: '0' });
  const untapAfter = mk('h-25', ['各ターン、このクリーチャーがはじめて攻撃する時、その攻撃の後、このクリーチャーをアンタップする。']);
  const firstAtk = mk('h-26', ['自分のクリーチャーが攻撃する時、それがこのターン最初の攻撃なら、カードを１枚引く。']);
  const r2 = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), revenge, big, climax, exile, zero, untapAfter, firstAtk]);
  const game = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r2);
  const add = (s: GameState, p: PlayerId, cardId: string, zone: ZoneName) => {
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId, owner: p, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[p].zones.deck.unshift(iid);
    new Ctx(s, r2).moveCard(iid, zone);
    s.cards[iid].enteredTurn = 0;
    return iid;
  };
  const step = (s: GameState, a: Action) => {
    const r = applyAction(s, a, r2);
    if (r.error) throw new Error(r.error);
    return r.state;
  };
  const settle2 = (s: GameState) => {
    for (let i = 0; i < 20 && s.pending; i++) {
      const p = s.pending;
      s = step(s, p.kind === 'selectCards' ? { type: 'RESPOND', player: p.player, selected: p.candidates.slice(0, p.min) } : { type: 'RESPOND', player: p.player, selected: [], accept: false });
    }
    return s;
  };

  it('読み取り：すべて自動になる', () => {
    for (const c of [revenge, climax, zero, untapAfter, firstAtk]) expect([c.id, c.support]).toEqual([c.id, 'full']);
    expect(revenge.handTriggers?.[0].when).toBe('anyTurnEnd');
    expect(climax.handTriggers).toEqual([{ when: 'ownDestroyed', filter: { race: 'エグザイル' } }]);
    expect(zero.handTriggers?.[0]).toMatchObject({ when: 'opponentTurnEnd', condition: { type: 'enteredFreeThisTurn', who: 'opponent' } });
  });

  it('リベンジ・チャンス：ターンの終わりに、相手にコスト9以上のクリーチャーがいれば召喚できる', () => {
    let s = game();
    const rv = add(s, 0, revenge.id, 'hand');
    add(s, 1, big.id, 'battle');
    s = step(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = step(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[rv].zone).toBe('battle');
  });

  it('クライマックス・ドロン・ゴー：自分のエグザイル・クリーチャーが破壊された時、手札から出せる', () => {
    let s = game();
    const cl = add(s, 0, climax.id, 'hand');
    const ex = add(s, 0, exile.id, 'battle');
    s.queue.push({ kind: 'leave', iid: ex, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, r2).run();
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = step(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[cl].zone).toBe('battle');
  });

  it('侵略ZERO：相手のクリーチャーがコストを支払わずに出たターンの終わりに唱えられる', () => {
    let s = game();
    const z = add(s, 1, zero.id, 'hand');
    const free = add(s, 0, exile.id, 'hand');
    s.queue.push({ kind: 'enterBattle', player: 0, iid: free });
    new Ctx(s, r2).run();
    s = step(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = step(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[z].zone).toBe('graveyard');
  });

  it('「その攻撃の後、アンタップする」：攻撃が終わってからアンタップし、各ターン1回だけ', () => {
    let s = game();
    const a = add(s, 0, untapAfter.id, 'battle');
    s = settle2(step(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }));
    expect(s.cards[a].tapped).toBe(false);
    s = settle2(step(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }));
    expect(s.cards[a].tapped).toBe(true);
  });

  it('「それがこのターン最初の攻撃なら」：1回目の攻撃だけ。自分自身の攻撃でも誘発する', () => {
    let s = game();
    const a = add(s, 0, firstAtk.id, 'battle');
    const b = add(s, 0, exile.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s = settle2(step(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }));
    const afterFirst = s.players[0].zones.hand.length;
    expect(afterFirst).toBeGreaterThanOrEqual(hand + 1);
    s = settle2(step(s, { type: 'ATTACK', player: 0, attacker: b, target: { kind: 'player' } }));
    // 2回目の攻撃では引かない（ブレイクしたシールドが相手の手札に入るだけ）
    expect(s.players[0].zones.hand.length).toBe(afterFirst);
  });
});

describe('シールド・プラス／シールド・セイバー', () => {
  const plus = mk('h-30', ['シールド・プラス：このクリーチャーが出た時、自分の山札の上から１枚を裏向きで自分のシールド１つの下に置いてもよい。（そのシールドの束は１つと数える）']);
  const ultra = mk('h-31', ['ウルトラシールド・プラス-このクリーチャーをバトルゾーンに出した時、自分の山札の上から５枚まで、裏向きのまま、自分のシールドいずれか１枚の下に置いてもよい。（こうして重ねたカードの束を１枚のシールドとみなす）']);
  const saver = mk('h-32', ['シールド・セイバー（自分のシールドがブレイクされる時、かわりにこのクリーチャーを破壊してもよい）']);
  const r3 = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), plus, ultra, saver]);
  const game = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r3);
  const add = (s: GameState, p: PlayerId, cardId: string, zone: ZoneName) => {
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId, owner: p, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[p].zones.deck.unshift(iid);
    new Ctx(s, r3).moveCard(iid, zone);
    s.cards[iid].enteredTurn = 0;
    return iid;
  };
  const step = (s: GameState, a: Action) => {
    const r = applyAction(s, a, r3);
    if (r.error) throw new Error(r.error);
    return r.state;
  };

  it('読み取り', () => {
    expect([plus.support, ultra.support, saver.support]).toEqual(['full', 'full', 'full']);
    expect(saver.keywords?.shieldSaver).toBe(true);
  });

  it('シールド・プラス：シールドの下に置いたカードは1つのシールドと数え、ブレイクされると一緒に手札に入る', () => {
    let s = game();
    const c = add(s, 1, plus.id, 'hand');
    s.queue.push({ kind: 'enterBattle', player: 1, iid: c });
    new Ctx(s, r3).run();
    s = step(s, { type: 'RESPOND', player: 1, accept: true });
    const target = s.pending?.kind === 'selectCards' ? s.pending.candidates[0] : '';
    s = step(s, { type: 'RESPOND', player: 1, selected: [target] });
    expect(s.players[1].zones.shield.length).toBe(5);
    expect(s.cards[target].under).toHaveLength(1);
    // その束をブレイクすると、2枚が手札に入る
    const hand = s.players[1].zones.hand.length;
    s.queue.push({ kind: 'breakShields', breaker: 0, source: c, defender: 1, count: 1, chosen: [target] });
    new Ctx(s, r3).run();
    expect(s.players[1].zones.shield.length).toBe(4);
    expect(s.players[1].zones.hand.length).toBe(hand + 2);
  });

  it('ウルトラシールド・プラス：枚数を選んで、シールド1つの下に置く', () => {
    let s = game();
    const c = add(s, 0, ultra.id, 'hand');
    s.queue.push({ kind: 'enterBattle', player: 0, iid: c });
    new Ctx(s, r3).run();
    s = step(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toMatchObject({ kind: 'chooseMode' });
    s = step(s, { type: 'RESPOND', player: 0, selected: ['2'] });
    const target = s.pending?.kind === 'selectCards' ? s.pending.candidates[1] : '';
    s = step(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].under).toHaveLength(3);
    expect(s.players[0].zones.shield.length).toBe(5);
  });

  it('シールド・セイバー：ブレイクされるシールド1つのかわりに破壊できる', () => {
    let s = game();
    const sv = add(s, 1, saver.id, 'battle');
    const atk = add(s, 0, C.vanilla.id, 'battle');
    s = step(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    for (let i = 0; i < 6 && s.pending && s.pending.kind !== 'confirm'; i++) {
      const p = s.pending;
      s = step(s, p.kind === 'selectCards' ? { type: 'RESPOND', player: p.player, selected: p.candidates.slice(0, Math.max(1, p.min)) } : { type: 'RESPOND', player: p.player, selected: [] });
    }
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = step(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[sv].zone).toBe('graveyard');
    expect(s.players[1].zones.shield.length).toBe(5);
  });
});

describe('相手のターン中に手札から使う能力', () => {
  const ninja = mk('h-40', ['ニンジャ・ストライク ２（相手のクリーチャーが攻撃またはブロックした時、自分のマナゾーンにカードが２枚以上あり、その攻撃中に「ニンジャ・ストライク」能力を使っていなければ、このシノビをコストを支払わずに召喚してもよい。そのターンの終わりに、このシノビを山札の下に置く）', 'ブロッカー'], { cost: '5', power: '4000' });
  const acr = mk('h-41', ['アタック・チャンスR：テスト（自分のアビスが攻撃する時、この呪文を自分の手札または墓地からコストを支払わずに唱えてもよい。そうしたら、唱えた後、墓地のかわりに山札の下に置く）', 'カードを２枚引く。'], { type: '呪文', power: '', cost: '6' });
  const r4 = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), ninja, acr]);
  const game = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r4);
  const add = (s: GameState, p: PlayerId, cardId: string, zone: ZoneName) => {
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId, owner: p, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[p].zones.deck.unshift(iid);
    new Ctx(s, r4).moveCard(iid, zone);
    s.cards[iid].enteredTurn = 0;
    return iid;
  };
  const step = (s: GameState, a: Action) => {
    const r = applyAction(s, a, r4);
    if (r.error) throw new Error(r.error);
    return r.state;
  };

  it('読み取り', () => {
    expect([ninja.support, acr.support]).toEqual(['full', 'full']);
    expect(ninja.handTriggers?.[0]).toMatchObject({ when: 'opponentAttackOrBlock', endOfTurn: 'deckBottom', oncePerAttack: true });
    expect(acr.handTriggers?.[0]).toMatchObject({ when: 'ownAttack', zones: ['hand', 'graveyard'], spellAfter: 'deckBottom' });
  });

  it('ニンジャ・ストライク：相手の攻撃の時、マナが足りていれば召喚でき、ターンの終わりに山札の下に置く。1回の攻撃に1体だけ', () => {
    let s = game();
    const n1 = add(s, 1, ninja.id, 'hand');
    const n2 = add(s, 1, ninja.id, 'hand');
    add(s, 1, C.vanilla.id, 'mana');
    const atk = add(s, 0, C.vanilla.id, 'battle');
    // マナが1枚では使えない
    let s0 = step(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s0.pending?.kind === 'confirm' && s0.pending.player === 1 && s0.cards[n1].zone === 'hand' && s0.pending.source === n1).toBeFalsy();
    add(s, 1, C.vanilla.id, 'mana');
    s = step(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = step(s, { type: 'RESPOND', player: 1, accept: true });
    // 2枚目のニンジャは、同じ攻撃では使えない（聞かれない）
    const summoned = [n1, n2].filter((x) => s.cards[x].zone === 'battle');
    expect(summoned).toHaveLength(1);
    for (let i = 0; i < 8 && s.pending; i++) {
      const p = s.pending;
      s = step(s, p.kind === 'selectCards' ? { type: 'RESPOND', player: p.player, selected: p.candidates.slice(0, Math.max(1, p.min)) } : { type: 'RESPOND', player: p.player, selected: [], accept: false });
    }
    expect([n1, n2].filter((x) => s.cards[x].zone === 'battle')).toHaveLength(1);
    s = step(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[summoned[0]].zone).toBe('deck');
  });

  it('アタック・チャンスR：自分の条件に合うクリーチャーが攻撃する時、墓地からも唱えられ、唱えた後は山札の下に置く', () => {
    let s = game();
    const sp = add(s, 0, acr.id, 'graveyard');
    const atk = add(s, 0, C.vanilla.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s = step(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = step(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.players[0].zones.hand.length).toBe(hand + 2);
    expect(s.players[0].zones.deck[0]).toBe(sp);
  });
});

describe('GR召喚・クロスギア', () => {
  const grA = mk('h-50', [], { type: 'GRクリーチャー', power: '2000' });
  const caller = mk('h-51', ['このクリーチャーが出た時、GR召喚を２回する。']);
  const gear = mk('h-52', ['クロスギア：このカードをバトルゾーンに置く。クリーチャーにクロスするには、このカードのコストをもう一度支払う。そのクリーチャーがバトルゾーンを離れても、このカードはバトルゾーンに残る。', 'これをクロスしたクリーチャーのパワーを+3000する。', 'これをクロスしたクリーチャーに「スピードアタッカー」を与える。'], { type: 'クロスギア', power: '', cost: '1' });
  const accel = mk('h-53', ['アクセル（このクリーチャーにクロスギアがクロスされている時、このクリーチャーは次の a 能力を得る）\n\na このクリーチャーのパワーは、+500される。'], { power: '1000' });
  const r5 = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), grA, caller, gear, accel]);
  const add = (s: GameState, p: PlayerId, cardId: string, zone: ZoneName) => {
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId, owner: p, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[p].zones.deck.unshift(iid);
    new Ctx(s, r5).moveCard(iid, zone);
    s.cards[iid].enteredTurn = 0;
    return iid;
  };
  const step = (s: GameState, a: Action) => {
    const r = applyAction(s, a, r5);
    if (r.error) throw new Error(r.error);
    return r.state;
  };

  it('読み取り', () => {
    expect([caller.support, gear.support, accel.support]).toEqual(['full', 'full', 'full']);
    expect(gear.type).toBe('field');
  });

  it('GRクリーチャーは超GRゾーンで始まり、GR召喚で上から出る。離れたら超GRゾーンの下に戻る', () => {
    let s = createGame({ players: [{ name: 'A', deck: [...filler.slice(0, 37), grA.id, grA.id, grA.id] }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r5);
    expect(s.players[0].zones.grZone).toHaveLength(3);
    expect(s.players[0].zones.deck.every((x) => s.cards[x].cardId !== grA.id)).toBe(true);
    const c = add(s, 0, caller.id, 'hand');
    add(s, 0, C.vanilla.id, 'mana');
    s = step(s, { type: 'PLAY_CARD', player: 0, iid: c });
    const out = s.players[0].zones.battle.filter((x) => s.cards[x].cardId === grA.id);
    expect(out).toHaveLength(2);
    expect(s.players[0].zones.grZone).toHaveLength(1);
    s.queue.push({ kind: 'leave', iid: out[0], to: 'graveyard', cause: 'destroy' });
    new Ctx(s, r5).run();
    expect(s.cards[out[0]].zone).toBe('grZone');
    expect(s.players[0].zones.grZone[0]).toBe(out[0]);
  });

  it('クロスギア：バトルゾーンに置き、コストを支払ってクロスする。クロスしたクリーチャーに能力を与え、離れても残る', () => {
    let s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r5);
    const g = add(s, 0, gear.id, 'hand');
    const host = add(s, 0, accel.id, 'battle');
    add(s, 0, C.vanilla.id, 'mana');
    add(s, 0, C.vanilla.id, 'mana');
    s = step(s, { type: 'PLAY_CARD', player: 0, iid: g });
    expect(s.cards[g].zone).toBe('battle');
    expect(power(s, r5, host)).toBe(1000);
    s = step(s, { type: 'CROSS', player: 0, iid: g, target: host });
    expect(s.cards[g].equippedTo).toBe(host);
    // クロスギアの +3000 と、アクセルの +500
    expect(power(s, r5, host)).toBe(1000 + 3000 + 500);
    expect(keywords(s, r5, host).speedAttacker).toBe(true);
    expect(s.players[0].zones.mana.filter((m) => s.cards[m].tapped)).toHaveLength(2);
    s.queue.push({ kind: 'leave', iid: host, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, r5).run();
    expect(s.cards[g].zone).toBe('battle');
    expect(s.cards[g].equippedTo).toBeUndefined();
  });
});
});

// ════════════════════════ soulPsychic.test.ts ════════════════════════
describe('soulPsychic', () => {
// 超魂X・超魂レイド・サイキック・クリーチャー（超次元ゾーン・覚醒リンク・リンク解除）のテスト
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({
  ...base,
  name,
  race: o.race ?? 'テスト',
  civilization: o.civ ?? '火',
  type: o.type ?? 'クリーチャー',
  power: o.power ?? '3000',
  cost: o.cost ?? '1',
  abilities,
});
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });

const SUPER = face('絶対合体 スーパーX', ['T・ブレイカー', 'リンク解除(このクリーチャーがバトルゾーンを離れる時、そのサイキック・セルのいずれか１枚を選んで超次元ゾーンに戻し、残りのカードを裏返す)', '※覚醒リンクするために必要なカード(セルA/セルB/セルC)'], {
  type: 'サイキック・スーパー・クリーチャー',
  power: '17000',
  cost: '30',
});
const cell = (id: string, abilities: string[]) =>
  convertOfficialCard({ id, detailUrl: '', faces: [face(id === 'p-a' ? 'セルA' : id === 'p-b' ? 'セルB ＜1＞' : 'セルC', abilities, { type: 'サイキック・クリーチャー', cost: '5', power: '5000' }), SUPER] });

const C = {
  soul: mk('s-1', ['このクリーチャーが出た時、カードを１枚引く。', '超魂X（これがクリーチャーの下にあれば、そのクリーチャーにも以下の能力を与える）', 'スピードアタッカー'], { cost: '2' }),
  top: mk('s-2', [], { power: '6000' }),
  raid: mk('s-3', ['NEO進化：火のクリーチャー１体の上に置いてもよい。', '超魂レイド（このクリーチャーが出た時、山札の上から３枚を表向きにする。その中からこのクリーチャーの進化元になれるカードを１枚、この下に置いてもよい。残りを好きな順序で山札の下に置く）'], { type: 'NEOクリーチャー', cost: '1' }),
  water: mk('s-4', [], { civ: '水' }),
  a: cell('p-a', ['覚醒(サイキック)リンク - 自分のターンのはじめに、バトルゾーンに自分の《セルB》と《セルC》があれば、そのクリーチャーとこのクリーチャーを裏返しリンクさせる。(ゲーム開始時、サイキック・クリーチャーは山札には含めず、自身の超次元ゾーンに置き、バトルゾーン以外のゾーンに行った場合、そこに戻す)']),
  b: cell('p-b', ['W・ブレイカー']),
  c: cell('p-c', ['ブロッカー']),
  hyperSpell: mk('s-5', ['コスト５以下のサイキック・クリーチャーを１体、自分の超次元ゾーンから出す。'], { type: '呪文', power: '', cost: '1' }),
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
const newGame = (deck0 = filler) => createGame({ players: [{ name: 'A', deck: deck0 }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('超魂X より後の能力は、下にある時に与える能力', () => {
    expect(C.soul.soul).toEqual({ keywords: { speedAttacker: true } });
    expect(C.soul.keywords).toEqual({ speedAttacker: true });
  });
  it('サイキック・クリーチャーの裏面と覚醒リンクの条件', () => {
    expect(C.a.twin).toBeUndefined();
    expect(C.a.psychic?.back).toMatchObject({ name: '絶対合体 スーパーX', power: 17000, keywords: { breaker: 3 } });
    expect(C.a.psychic?.link).toEqual({ names: ['セルB', 'セルC'], timing: 'turnStart' });
    expect(C.b.psychic?.link).toBeUndefined();
  });
  it('コストの合計がN以下になるように', () => {
    expect(parseAbilityText('コストの合計が９以下になるように、相手のクリーチャーを２体まで選び、破壊する。', 'spell').abilities[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 2, upTo: true, maxTotalCost: 9 } },
    ]);
  });
});

describe('超魂X・超魂レイド', () => {
  it('超魂X のカードが下にあるクリーチャーは、その能力を得る', () => {
    const s = newGame();
    const t = put(s, 0, C.top.id, 'battle');
    expect(keywords(s, reg, t).speedAttacker).toBeFalsy();
    const u = put(s, 0, C.soul.id, 'battle');
    s.players[0].zones.battle.splice(s.players[0].zones.battle.indexOf(u), 1);
    s.cards[t].under = [u];
    expect(keywords(s, reg, t).speedAttacker).toBe(true);
  });

  it('超魂レイド：山札の上3枚から進化元になれるカードを1枚下に置き、残りは山札の下へ', () => {
    let s = newGame();
    const w = put(s, 0, C.water.id, 'deck');
    const f = put(s, 0, C.top.id, 'deck');
    // 山札の一番上（配列の最後）に置く
    for (const x of [w, f]) {
      const d = s.players[0].zones.deck;
      d.splice(d.indexOf(x), 1);
      d.push(x);
    }
    const raid = put(s, 0, C.raid.id, 'hand');
    put(s, 0, C.top.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: raid });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [f] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [f] });
    expect(s.cards[raid].under).toEqual([f]);
    expect(s.cards[f].zone).toBe('battle');
    // 残り（水のカードを含む2枚）は山札の下
    expect(s.players[0].zones.deck[0]).not.toBe(f);
    expect(s.players[0].zones.deck.slice(0, 2)).toContain(w);
  });
});

describe('サイキック・クリーチャー', () => {
  it('サイキック・クリーチャーは山札に入れず超次元ゾーンに置く。デッキの40枚にも数えない', () => {
    const deck = [...filler, C.a.id, C.b.id, C.c.id];
    const s = newGame(deck);
    expect(s.players[0].zones.hyperspatial).toHaveLength(3);
    expect(s.players[0].zones.deck.every((i) => !reg[s.cards[i].cardId].psychic)).toBe(true);
    const sizeErrors = (cards: Record<string, number>) =>
      validateDeck({ cards }, { ...DEFAULT_FORMAT, maxCopies: 99 }, reg).filter((i) => i.level === 'error').map((i) => i.message);
    expect(sizeErrors({ 'S01-043': 40, [C.a.id]: 1, [C.b.id]: 1, [C.c.id]: 1 })).toEqual([]);
    expect(sizeErrors({ 'S01-043': 40, [C.a.id]: 9 })).toEqual(['超次元ゾーンのカードは8枚までです（現在9枚）']);
  });

  it('超次元呪文で出し、バトルゾーンを離れると超次元ゾーンに戻る', () => {
    let s = newGame([...filler, C.b.id]);
    const sp = put(s, 0, C.hyperSpell.id, 'hand');
    put(s, 0, C.top.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    const b = s.players[0].zones.battle.find((i) => s.cards[i].cardId === C.b.id)!;
    expect(b).toBeDefined();
    new Ctx(s, reg).moveCard(b, 'graveyard');
    expect(s.cards[b].zone).toBe('hyperspatial');
  });

  it('手動で墓地へ移しても、ログには実際の行き先（超次元ゾーン）を書く', () => {
    let s = newGame();
    const b = put(s, 0, C.b.id, 'battle');
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: b, to: 'graveyard', raw: true });
    expect(s.cards[b].zone).toBe('hyperspatial');
    expect(s.log[s.log.length - 1].text).toBe('［手動］セルB ＜1＞ を バトルゾーン → 超次元ゾーン に移動（墓地のかわりに）');
  });

  it('覚醒リンク：自分のターンのはじめにそろっていればリンクし、リンク解除で1枚だけ超次元ゾーンに戻る', () => {
    let s = newGame();
    const a = put(s, 0, C.a.id, 'battle');
    const b = put(s, 0, C.b.id, 'battle');
    const c = put(s, 0, C.c.id, 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.activePlayer).toBe(0);
    expect(s.players[0].zones.battle).toEqual([a]);
    expect(s.cards[a]).toMatchObject({ flipped: true, links: [b, c] });
    expect(def(s, reg, a).name).toBe('絶対合体 スーパーX');
    expect(power(s, reg, a)).toBe(17000);
    expect(keywords(s, reg, a).breaker).toBe(3);

    // 破壊される → リンク解除：選んだセル（B）だけ超次元ゾーンへ、残りは表に戻ってバトルゾーンに残る
    s.queue.push({ kind: 'leave', iid: a, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [a, b, c], min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [b] });
    expect(s.cards[b].zone).toBe('hyperspatial');
    expect(s.players[0].zones.battle.sort()).toEqual([a, c].sort());
    expect(s.cards[a].flipped).toBeFalsy();
    expect(def(s, reg, a).name).toBe('セルA');
  });
});
});

// ════════════════════════ forbidden.test.ts ════════════════════════
describe('forbidden', () => {
// 禁断の鼓動（禁断 ～封印されしX～ / 伝説の禁断 ドキンダムX）と封印の処理のテスト
// 公式カード検索の詳細（dmr19-fl01）と同じ内容
const KINDAN = convertOfficialCard({
  id: 'dmr19-fl01',
  detailUrl: '',
  faces: [
    {
      name: '禁断 ～封印されしX～', packName: '(DMR19 FL1/FL1)', imageUrl: '', type: '禁断の鼓動', civilization: '火', rarity: '', power: '', cost: '', mana: '-', race: '', illustrator: '', flavor: '',
      abilities: [
        'この鼓動は、ゲーム開始時、封印を６つ付けてバトルゾーンに置く。',
        'この鼓動はバトルゾーンを離れない。',
        '禁断解放-この鼓動の封印がすべてなくなった時、クリーチャー側に裏返す。（カードを封印するには、自分の山札の上から１枚目を裏向きのままそのカードの上に置く。コマンドがバトルゾーンに出た時、その持ち主はそのコマンドと同じ文明を持つ自身のカードから封印をひとつ、墓地に置く。クリーチャーが封印されている間、両プレイヤーはそのクリーチャーを無視する）',
      ],
    },
    {
      name: '伝説の禁断 ドキンダムX', packName: '(DMR19 FL1/FL1)', imageUrl: '', type: '禁断クリーチャー', civilization: '火', rarity: '', power: '99999', cost: '99', mana: '-', race: '', illustrator: '', flavor: '',
      abilities: [
        'T・ブレイカー',
        'このクリーチャーが禁断解放した時、相手は自身のクリーチャーすべてに封印をひとつ付ける。',
        'コスト４以下の呪文によって、相手がクリーチャーを選ぶ時、このクリーチャーは選べない。',
        'このカードがバトルゾーン以外のゾーンにあれば、自分はゲームに負ける。',
      ],
    },
  ],
});

const base = { packName: '(T 1/1)', imageUrl: '', civilization: '火', rarity: 'C', mana: '1', illustrator: '', flavor: '', cost: '1' };
const mk = (id: string, name: string, abilities: string[], o: { type?: string; power?: string; race?: string; cost?: string; civ?: string } = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', race: o.race ?? 'テスト', cost: o.cost ?? '1', abilities }] });
const C = {
  command: mk('k-1', '火のコマンド', [], { race: 'ドラゴン・コマンド', power: '5000' }),
  calmCommand: mk('k-5', '攻撃しないコマンド', ['このクリーチャーは攻撃できない。'], { race: 'コマンド', power: '1000' }),
  waterCommand: mk('k-2', '水のコマンド', [], { race: 'コマンド', civ: '水' }),
  plain: mk('k-3', 'ふつう', [], { power: '2000' }),
  cheapKill: mk('k-4', '安い除去', ['相手のクリーチャーを1体選び、破壊する。'], { type: '呪文', power: '', cost: '3' }),
};
const reg = buildRegistry([...SAMPLE_CARDS, KINDAN, ...Object.values(C)]);
const filler = Array.from({ length: 39 }, () => 'S01-043');

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
const newGame = () => createGame({ players: [{ name: 'A', deck: [KINDAN.id, ...filler] }, { name: 'B', deck: [...filler, 'S01-043'] }], seed: 7, firstPlayer: 0 }, reg);
const kodou = (s: GameState) => s.players[0].zones.battle.find((i) => s.cards[i].cardId === KINDAN.id)!;
/** 封印を n 個残して外す */
function leaveSeals(s: GameState, n: number): void {
  const k = kodou(s);
  const ctx = new Ctx(s, reg);
  while ((s.cards[k].seals?.length ?? 0) > n) ctx.moveCard(s.cards[k].seals![0], 'graveyard');
}

describe('禁断の鼓動の読み取り', () => {
  it('鼓動の面と禁断クリーチャーの面を読み、全部自動になる', () => {
    expect(KINDAN.twin).toBeUndefined();
    expect(KINDAN.forbidden?.seals).toBe(6);
    const x = KINDAN.forbidden!.creature;
    expect(x).toMatchObject({ name: '伝説の禁断 ドキンダムX', power: 99999, keywords: { breaker: 3, untargetableBySpellCost: 4, loseIfNotInBattle: true } });
    expect(x.abilities).toEqual([{ when: 'onUnleash', effects: [{ type: 'seal', target: { owner: 'opponent', zone: 'battle', count: 'all' } }] }]);
    expect(KINDAN.support).toBe('full');
  });

  it('以前の版でツインパクトとして保存したカードを直す', () => {
    const old = { ...KINDAN, forbidden: undefined, twin: { name: '伝説の禁断 ドキンダムX', cost: 99, civilizations: ['fire' as const], text: KINDAN.forbidden!.creature.text } };
    const fixed = applyParsedEffects(old);
    expect(fixed.twin).toBeUndefined();
    expect(fixed.forbidden?.seals).toBe(6);
    expect(fixed.forbidden?.creature.keywords?.breaker).toBe(3);
  });
});

describe('禁断の鼓動の処理', () => {
  it('ゲーム開始時に封印6つを付けてバトルゾーンに置き、山札は 40-1-6-5-5 枚', () => {
    const s = newGame();
    const k = kodou(s);
    expect(s.cards[k].seals).toHaveLength(6);
    expect(s.players[0].zones.seal).toHaveLength(6);
    expect(s.players[0].zones.shield).toHaveLength(5);
    expect(s.players[0].zones.deck).toHaveLength(40 - 1 - 6 - 5 - 5);
    // 鼓動はクリーチャーとして扱わない
    expect(isIgnored(s, reg, k)).toBe(true);
    expect(battleCards(s, reg, 0)).toEqual([]);
    expect(canAttackWith(s, reg, 0, k)).toBe(false);
  });

  it('火のコマンドが出ると封印が1つ外れ、水のコマンドでは外れない', () => {
    let s = newGame();
    const k = kodou(s);
    const water = put(s, 0, C.waterCommand.id, 'hand');
    const fire = put(s, 0, C.command.id, 'hand');
    put(s, 0, 'S01-012', 'mana'); // 水のマナ（フィクスチャの水のカード）
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: water });
    expect(s.cards[k].seals).toHaveLength(6);
    put(s, 0, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: fire });
    expect(s.cards[k].seals).toHaveLength(5);
    expect(s.players[0].zones.graveyard).toHaveLength(1);
  });

  it('封印がすべてなくなると禁断解放し、相手のクリーチャーすべてを封印する', () => {
    let s = newGame();
    const k = kodou(s);
    const opp1 = put(s, 1, C.plain.id, 'battle', true);
    const opp2 = put(s, 1, C.plain.id, 'battle', true);
    leaveSeals(s, 1);
    const fire = put(s, 0, C.command.id, 'hand');
    put(s, 0, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: fire });
    expect(s.cards[k].flipped).toBe(true);
    expect(s.cards[k].seals).toBeUndefined();
    expect(def(s, reg, k).name).toBe('伝説の禁断 ドキンダムX');
    expect(power(s, reg, k)).toBe(99999);
    expect(keywords(s, reg, k).breaker).toBe(3);
    // 相手のクリーチャーは封印され、無視される
    expect(s.cards[opp1].seals).toHaveLength(1);
    expect(s.cards[opp2].seals).toHaveLength(1);
    expect(battleCards(s, reg, 1)).toEqual([]);
    // ゲーム開始時からバトルゾーンにあるので、すぐ攻撃できる
    expect(canAttackWith(s, reg, 0, k)).toBe(true);
    expect(s.log.some((l) => l.text.includes('禁断解放'))).toBe(true);
  });

  it('古い版で保存した（パワーが分からない）ドキンダムXでも、禁断解放した途端に破壊されて負けにはならない', () => {
    const stale = { ...KINDAN, id: 'stale-kindan', forbidden: { ...KINDAN.forbidden!, creature: { ...KINDAN.forbidden!.creature, power: undefined } } };
    const reg2 = buildRegistry([...SAMPLE_CARDS, stale, ...Object.values(C)]);
    let s = createGame({ players: [{ name: 'A', deck: [stale.id, ...filler] }, { name: 'B', deck: [...filler, 'S01-043'] }], seed: 7, firstPlayer: 0 }, reg2);
    const k = s.players[0].zones.battle[0];
    const ctx = new Ctx(s, reg2);
    while ((s.cards[k].seals?.length ?? 0) > 1) ctx.moveCard(s.cards[k].seals![0], 'graveyard');
    const fire = put(s, 0, C.command.id, 'hand');
    put(s, 0, 'S01-031', 'mana');
    const r = applyAction(s, { type: 'PLAY_CARD', player: 0, iid: fire }, reg2);
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.cards[k].flipped).toBe(true);
    expect(s.cards[k].zone).toBe('battle');
    expect(s.gameOverReason).toBeNull();
  });

  it('コスト4以下の呪文では選べず、ドキンダムXがバトルゾーンを離れると負ける', () => {
    let s = newGame();
    const k = kodou(s);
    leaveSeals(s, 0);
    expect(s.cards[k].flipped).toBe(true);
    s.activePlayer = 1;
    expect(targetCandidates(s, reg, 1, { owner: 'opponent', zone: 'battle', count: 1 })).toEqual([k]);
    const spell = put(s, 1, C.cheapKill.id, 'hand');
    for (let i = 0; i < 3; i++) put(s, 1, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 1, iid: spell });
    expect(s.cards[k].zone).toBe('battle');
    // 手動で墓地に置くと負け
    s.activePlayer = 0;
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: k, to: 'graveyard' });
    expect(s.winner).toBe(1);
  });

  it('封印されたクリーチャーは、その持ち主のコマンドで封印が外れて元に戻る', () => {
    let s = newGame();
    const victim = put(s, 1, C.plain.id, 'battle', true);
    new Ctx(s, reg).sealCard(victim);
    expect(isIgnored(s, reg, victim)).toBe(true);
    s.activePlayer = 1;
    s.phase = 'main';
    const cmd = put(s, 1, C.command.id, 'hand');
    put(s, 1, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 1, iid: cmd });
    expect(s.cards[victim].seals).toBeUndefined();
    expect(isIgnored(s, reg, victim)).toBe(false);
  });
});

describe('禁断入りデッキの CPU 対戦', () => {
  it.each([1, 2, 3])('合法手だけで決着し、カードの枚数が合う (seed %i)', (seed) => {
    const deckA = [KINDAN.id, ...Array.from({ length: 39 }, () => C.calmCommand.id)];
    const deckB = Array.from({ length: 40 }, () => 'S01-043');
    let s = createGame({ players: [{ name: 'A', deck: deckA, isCpu: true }, { name: 'B', deck: deckB, isCpu: true }], seed, firstPlayer: 0 }, reg);
    let rng = seed;
    const rand = () => {
      const [v, n] = nextRandom(rng);
      rng = n;
      return v;
    };
    let unleashed = false;
    for (let steps = 0; s.gameOverReason === null && steps < 5000; steps++) {
      const who: PlayerId = s.pending ? s.pending.player : s.activePlayer;
      const a = chooseAction(s, reg, who, 'normal', rand);
      expect(a).not.toBeNull();
      const r = applyAction(s, a!, reg);
      expect(r.error, JSON.stringify(a)).toBeUndefined();
      s = r.state;
      if (s.cards[kodou(s)]?.flipped) unleashed = true;
      for (const p of [0, 1] as PlayerId[]) {
        const n = Object.values(s.players[p].zones).reduce((sum, z) => sum + z.length, 0);
        expect(n).toBe(40);
      }
    }
    expect(s.gameOverReason).not.toBeNull();
    expect(unleashed).toBe(true);
  });
});
});

// ════════════════════════ jennyDeck.test.ts ════════════════════════
describe('jennyDeck', () => {
// デスパペット（ジェニー）デッキの能力：各プレイヤーが自身のカードを選ぶ・残して墓地へ、山札から墓地への置換、
// 各ターンの出せる数、逆転撃、－∞、「〜ず、」の能力、次の相手のターン中だけの常在効果、超次元ゾーンへ置く呪文、S-MAX進化など
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type F = { name?: string; civ?: string; type?: string; power?: string; cost?: string; race?: string; abilities: string[] };
const face = (id: string, f: F) => ({ ...base, name: f.name ?? id, race: f.race ?? 'デスパペット', civilization: f.civ ?? '闇', type: f.type ?? 'クリーチャー', power: f.power ?? '2000', cost: f.cost ?? '2', abilities: f.abilities });
const mk = (id: string, ...faces: F[]) => convertOfficialCard({ id, detailUrl: '', faces: faces.map((f) => face(id, f)) });

const BOLME = ['ブロッカー', 'W・ブレイカー', 'このクリーチャーはブロックされず、相手に選ばれない。', 'このクリーチャーが出た時、次の自分のターンのはじめまで、相手のクリーチャーはすべて、攻撃もブロックもできない。', 'Zラッシュ（シールドが離れたら、次の自分のターンのはじめまで、このクリーチャーのハイパーモードを解放する）'];
const C = {
  akaivu: mk('jd-1', { abilities: ['W・ブレイカー', 'このクリーチャーが出た時、自分のエレメントを１つ破壊する。その後、各プレイヤーは自身のエレメントを１つ選び、破壊する。'], power: '8000' }),
  jenimoon: mk(
    'jd-2',
    { name: '弾手人形ジェニムーン', abilities: ['ブロッカー', 'このクリーチャーは攻撃できない。', 'このクリーチャーが出た時、相手は自身の手札を１枚選んで捨てる。'], power: '1000' },
    { name: '月のダンスを見においで', type: '呪文', cost: '5', race: '', power: '', abilities: ['S・トリガー', '相手のクリーチャーを１体選び、破壊する。', 'この呪文を唱えた後、墓地のかわりに自分の超次元ゾーンに置く。'] },
  ),
  kareiko: mk('jd-3', { type: 'タマシード', race: 'オラクル/レクスターズ', power: '', cost: '3', abilities: ['シンカライズ：このタマシードがクリーチャーであるかのように、この上に進化クリーチャーを置いてもよい。', 'いずれかのプレイヤーの山札から、手札以外のゾーンにカードが置かれる時、かわりにそのプレイヤーは、そのカードを墓地に置く。'] }),
  kurin: mk('jd-4', { civ: '水', cost: '3', power: '3000', abilities: ['ジャストダイバー', '各ターンに１度、自分のデスパペットが出た時、カードを１枚引いてもよい。', '各ターン、相手はクリーチャーを２体までしか出せない。'] }),
  gyakuten: mk('jd-5', {
    type: '呪文',
    race: '',
    power: '',
    cost: '4',
    abilities: ['逆転撃{dd03}：クリーチャーが自分を攻撃する時、その攻撃中にまだ「逆転撃」を使っていなければ、この呪文を自分の手札からコストを支払わずに唱えてもよい。そうしたら、次の自分のターンのはじめに{dd03}を支払う。支払えなければ、自分はゲームに負ける。', '相手のクリーチャーを１体選ぶ。このターン、そのクリーチャーのパワーを －∞ する。（パワー０以下のクリーチャーは破壊される）'],
  }),
  bolme: mk(
    'jd-6',
    { name: 'ボルメテウス', type: 'ドリーム・クリーチャー', race: 'エクスドリーマー', civ: '水', cost: '5', power: '7000', abilities: BOLME },
    { name: 'ボルメテウス', type: 'ドリーム・クリーチャー', race: 'エクスドリーマー', civ: '水', cost: '5', power: '12000', abilities: [...BOLME, 'T・ブレイカー', 'このクリーチャーが相手のシールドをブレイクする時、そのシールドを手札に加えるかわりに持ち主の山札の下に置く。その後、各プレイヤーはこうして置かれたシールドの数、カードを引く。'] },
  ),
  brain: mk('jd-7', {
    type: '呪文',
    civ: '水/闇',
    race: '',
    power: '',
    cost: '6',
    abilities: ['S・トリガー', '次のうちいずれか１つを選ぶ。自分のクリーチャーまたはタマシードの中に水と闇があれば、かわりに両方選んでもよい。\n▶カードを３枚引き、その後、１枚捨てる。\n▶コスト８以下のクリーチャーを１体、自分の墓地から出す。'],
  }),
  crymax: mk('jd-8', {
    type: 'S-MAX進化クリーチャー',
    race: 'デモニオ/鬼レクスターズ',
    cost: '7',
    power: '13000',
    abilities: ['鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。（このクリーチャーは進化元を必要としない。自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す）', 'T・ブレイカー', 'このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。'],
  }),
  vt: mk('jd-9', {
    race: 'マジック・アウトレイジMAX',
    civ: '水',
    cost: '8',
    power: '12000',
    abilities: ['ジャストダイバー', 'T・ブレイカー', 'このクリーチャーが出た時、相手のパワー5000以下のクリーチャーをすべて、持ち主の手札に戻す。次の相手のターン中、相手はパワー5000以下のクリーチャーを出せない。'],
  }),
  vamiria: mk(
    'jd-10',
    { name: 'ヴァミリア', civ: '水/闇', cost: '3', power: '3000', abilities: ['ブロッカー'] },
    { name: 'ヴァミリア', civ: '水/闇', cost: '3', power: '6000', abilities: ['ブロッカー', '相手がカードを引いた時、それがそのターンに相手が引く１枚目でなければ、相手は自身の手札を１枚選んで捨てる。'] },
  ),
  seed: mk('jd-13', { type: 'タマシード', race: 'テスト', power: '', cost: '2', abilities: [] }),
  small: mk('jd-11', { race: 'テスト', civ: '火', cost: '1', power: '3000', abilities: [] }),
  water: mk('jd-12', { race: 'テスト', civ: '光/水/闇/火/自然', cost: '1', power: '1000', abilities: [] }),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const mana = (s: GameState, p: PlayerId, n: number) => {
  // 多色のマナはタップして置かれるので、アンタップしておく
  for (let i = 0; i < n; i++) s.cards[put(s, p, C.water.id, 'mana')].tapped = false;
};
const play = (s: GameState, iid: string, m: number) => {
  mana(s, 0, m);
  return act(s, { type: 'PLAY_CARD', player: 0, iid });
};

describe('読み取り', () => {
  it('デッキのカードがすべて自動になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「ブロックされず、相手に選ばれない」は2つのキーワード', () => {
    expect(C.bolme.keywords).toMatchObject({ unblockable: true, untargetable: true, blocker: true });
  });
});

describe('各プレイヤーが自身のカードを選ぶ', () => {
  it('アカイブ：自分のエレメントを1つ破壊し、その後、各プレイヤーは自身のエレメントを1つ選んで破壊する', () => {
    let s = newGame();
    const mine = [put(s, 0, C.small.id, 'battle'), put(s, 0, C.small.id, 'battle')];
    const theirs = [put(s, 1, C.small.id, 'battle'), put(s, 1, C.small.id, 'battle')];
    const ak = put(s, 0, C.akaivu.id, 'hand');
    s = play(s, ak, 2);
    // 自分のエレメント（アカイブ自身を含む3つ）から1つ
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [mine[0]] });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [mine[1]] });
    // 相手は自身のエレメントを選ぶ
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [theirs[1]] });
    expect(mine.map((x) => s.cards[x].zone)).toEqual(['graveyard', 'graveyard']);
    expect(theirs.map((x) => s.cards[x].zone)).toEqual(['battle', 'graveyard']);
    expect(s.cards[ak].zone).toBe('battle');
  });

  it('CRYMAX ジャオウガ：各プレイヤーはシールドを3つ選んで残し、残りを墓地に置く', () => {
    let s = newGame();
    const jo = put(s, 0, C.crymax.id, 'hand');
    s = play(s, jo, 7);
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, min: 3, max: 3 });
    const keep0 = s.players[0].zones.shield.slice(0, 3);
    s = act(s, { type: 'RESPOND', player: 0, selected: keep0 });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1, min: 3, max: 3 });
    const keep1 = s.players[1].zones.shield.slice(1, 4);
    s = act(s, { type: 'RESPOND', player: 1, selected: keep1 });
    expect([...s.players[0].zones.shield].sort()).toEqual([...keep0].sort());
    expect([...s.players[1].zones.shield].sort()).toEqual([...keep1].sort());
    expect(s.players[1].zones.graveyard).toHaveLength(2);
  });
});

describe('常在効果', () => {
  it('カレイコの黒像：山札から手札以外のゾーンに置かれるカードは墓地へ', () => {
    let s = newGame();
    put(s, 0, C.kareiko.id, 'battle');
    const ctx = new Ctx(s, reg);
    const top = s.players[1].zones.deck[s.players[1].zones.deck.length - 1];
    ctx.moveCard(top, 'mana');
    expect(s.cards[top].zone).toBe('graveyard');
    const top2 = s.players[0].zones.deck[s.players[0].zones.deck.length - 1];
    ctx.moveCard(top2, 'hand');
    expect(s.cards[top2].zone).toBe('hand');
    void act;
  });

  it('クリン・ラビィ：相手は各ターン2体までしかクリーチャーを出せない', () => {
    let s = newGame();
    put(s, 1, C.kurin.id, 'battle');
    const hs = [put(s, 0, C.small.id, 'hand'), put(s, 0, C.small.id, 'hand'), put(s, 0, C.small.id, 'hand')];
    mana(s, 0, 3);
    for (const h of hs.slice(0, 2)) s = act(s, { type: 'PLAY_CARD', player: 0, iid: h });
    expect(applyAction(s, { type: 'PLAY_CARD', player: 0, iid: hs[2] }, reg).error).toBeTruthy();
  });

  it('5000VT：出た時に小さいクリーチャーを戻し、次の相手のターン中だけ出せない', () => {
    let s = newGame();
    const o = put(s, 1, C.small.id, 'battle');
    s = play(s, put(s, 0, C.vt.id, 'hand'), 8);
    expect(s.cards[o].zone).toBe('hand');
    s = act(s, { type: 'END_TURN', player: 0 });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    mana(s, 1, 1);
    expect(applyAction(s, { type: 'PLAY_CARD', player: 1, iid: o }, reg).error).toBeTruthy();
    s = act(s, { type: 'END_TURN', player: 1 });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    s = act(s, { type: 'END_TURN', player: 0 });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    s = act(s, { type: 'PLAY_CARD', player: 1, iid: o });
    expect(s.cards[o].zone).toBe('battle');
  });

  it('ボルメテウス：出た時、次の自分のターンのはじめまで相手のクリーチャーは攻撃もブロックもできない', () => {
    let s = newGame();
    const o = put(s, 1, C.small.id, 'battle');
    s = play(s, put(s, 0, C.bolme.id, 'hand'), 5);
    expect(keywords(s, reg, o)).toMatchObject({ cannotAttack: true, cannotBlock: true });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(keywords(s, reg, o).cannotAttack).toBe(true);
  });
});

describe('逆転撃と－∞', () => {
  function attacked() {
    let s = newGame();
    const atk = put(s, 0, C.small.id, 'battle');
    const sp = put(s, 1, C.gyakuten.id, 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    return { s, atk, sp };
  }
  it('クリーチャーが自分を攻撃する時に唱え、パワーを－∞して破壊する。次の自分のターンのはじめに3マナ支払う', () => {
    let { s, atk, sp } = attacked();
    expect(s.cards[atk].zone).toBe('graveyard');
    expect(s.cards[sp].zone).toBe('graveyard');
    mana(s, 1, 4);
    for (const m of s.players[1].zones.mana) s.cards[m].tapped = true;
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.gameOverReason).toBeNull();
    expect(s.players[1].zones.mana.filter((m) => s.cards[m].tapped)).toHaveLength(3);
  });
  it('支払えなければ負ける', () => {
    let { s } = attacked();
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.winner).toBe(0);
  });
  it('－∞は数で表しても、どんな大きなパワーでも0以下', () => {
    const s = newGame();
    const big = put(s, 0, C.vt.id, 'battle');
    s.cards[big].powerModTurn = -999999999;
    expect(power(s, reg, big)).toBeLessThanOrEqual(0);
  });
});

describe('呪文', () => {
  it('ブレイン・スラッシュ：水と闇があれば両方選べる。「1枚捨てる」は自分の手札', () => {
    let s = newGame();
    put(s, 0, C.vamiria.id, 'battle');
    const g = put(s, 0, C.small.id, 'graveyard');
    s = play(s, put(s, 0, C.brain.id, 'hand'), 6);
    expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 0 });
    expect((s.pending as { options: string[] }).options.length).toBe(3);
    s = act(s, { type: 'RESPOND', player: 0, selected: ['2'] });
    for (let i = 0; i < 5 && s.pending; i++) s = act(s, { type: 'RESPOND', player: 0, accept: true, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min || 1) : undefined });
    expect(s.cards[g].zone).toBe('battle');
    expect(s.players[0].zones.graveyard.length).toBeGreaterThanOrEqual(2);
  });

  it('月のダンスを見においで：唱えた後は超次元ゾーンへ', () => {
    let s = newGame();
    const o = put(s, 1, C.small.id, 'battle');
    const tw = put(s, 0, C.jenimoon.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: tw, side: 'twin' });
    expect(s.cards[o].zone).toBe('graveyard');
    expect(s.cards[tw].zone).toBe('hyperspatial');
  });
});

describe('S-MAX進化', () => {
  it('負ける時、かわりに自分の表向きのカードを3枚破壊する', () => {
    let s = newGame();
    const jo = put(s, 1, C.crymax.id, 'battle');
    const others = [put(s, 1, C.small.id, 'battle'), put(s, 1, C.small.id, 'battle'), put(s, 1, C.seed.id, 'battle')];
    for (const sh of [...s.players[1].zones.shield]) new Ctx(s, reg).moveCard(sh, 'graveyard');
    const atk = put(s, 0, C.small.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    expect(s.gameOverReason).toBeNull();
    expect(others.map((x) => s.cards[x].zone)).toEqual(['graveyard', 'graveyard', 'graveyard']);
    expect(s.cards[jo].zone).toBe('battle');
  });

  it('離れる時、かわりに他の表向きのカードを3枚破壊してもよい', () => {
    let s = newGame();
    const jo = put(s, 1, C.crymax.id, 'battle');
    const others = [put(s, 1, C.small.id, 'battle'), put(s, 1, C.small.id, 'battle'), put(s, 1, C.seed.id, 'battle')];
    const tw = put(s, 0, C.jenimoon.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: tw, side: 'twin' });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [jo] });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[jo].zone).toBe('battle');
    expect(others.map((x) => s.cards[x].zone)).toEqual(['graveyard', 'graveyard', 'graveyard']);
  });

  it('S-MAX進化クリーチャーは1体しか残らない', () => {
    let s = newGame();
    const a = put(s, 0, C.crymax.id, 'battle');
    const b = put(s, 0, C.crymax.id, 'hand');
    s = play(s, b, 7);
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min) : undefined });
    expect(s.cards[a].zone).toBe('hand');
    expect(s.cards[b].zone).toBe('battle');
  });
});

describe('ハイパーモード', () => {
  it('ボルメテウス：ブレイクしたシールドを山札の下に置き、各プレイヤーはその数引く', () => {
    expect(C.bolme.hyperForm?.keywords).toMatchObject({ shieldBreakTo: 'deckBottom', shieldBreakEachDraws: true });
  });
  it('ヴァミリア：相手がそのターン2枚目以降を引いた時に誘発する', () => {
    expect(C.vamiria.hyperForm?.abilities?.[0]).toMatchObject({ when: 'onDraw', who: 'opponent', minDrawCount: 2 });
  });
});
});

// ════════════════════════ エレメント ════════════════════════
describe('エレメント（クリーチャー以外のバトルゾーンのカードも含む）', () => {
  const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
  const mk = (id: string, abilities: string[], o: { type?: string; power?: string; cost?: string } = {}) =>
    convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name: id, race: 'テスト', civilization: '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '2', abilities }] });
  const C = {
    seed: mk('e-seed', [], { type: 'タマシード', power: '' }),
    beast: mk('e-beast', [], { power: '2000' }),
    kill: mk('e-kill', ['相手のエレメントを1つ選び、破壊する。'], { type: '呪文', power: '', cost: '0' }),
    count: mk('e-count', ['自分のエレメント1つにつき、カードを1枚引く。'], { type: '呪文', power: '', cost: '0' }),
    raise: mk('e-raise', ['自分の手札からコスト5以下のエレメントを1つ選び、バトルゾーンに出す。'], { type: '呪文', power: '', cost: '0' }),
  };
  const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
  const filler = Array.from({ length: 40 }, () => 'S01-043');
  const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);
  function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
    const iid = `e${s.nextIid++}`;
    s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[player].zones.deck.unshift(iid);
    new Ctx(s, reg).moveCard(iid, zone);
    return iid;
  }
  const act = (s: GameState, a: Action) => {
    const r = applyAction(s, a, reg);
    if (r.error) throw new Error(r.error);
    return r.state;
  };

  it('「相手のエレメントを1つ選び」はタマシードも選べる', () => {
    let s = newGame();
    const seed = put(s, 1, C.seed.id, 'battle');
    const beast = put(s, 1, C.beast.id, 'battle');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.kill.id, 'hand') });
    expect(s.pending).toMatchObject({ kind: 'selectCards' });
    expect((s.pending as { candidates: string[] }).candidates.sort()).toEqual([seed, beast].sort());
    s = act(s, { type: 'RESPOND', player: 0, selected: [seed] });
    expect(s.cards[seed].zone).toBe('graveyard');
  });

  it('「自分のエレメント1つにつき」はタマシードも数える', () => {
    let s = newGame();
    put(s, 0, C.seed.id, 'battle');
    put(s, 0, C.beast.id, 'battle');
    const deck = s.players[0].zones.deck.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.count.id, 'hand') });
    expect(deck - s.players[0].zones.deck.length).toBe(2);
  });

  it('手札のエレメントを出す効果で、タマシードを出せる（呪文は選べない）', () => {
    let s = newGame();
    const seed = put(s, 0, C.seed.id, 'hand');
    const kill = put(s, 0, C.kill.id, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.raise.id, 'hand') });
    if (s.pending?.kind === 'selectCards') {
      expect(s.pending.candidates).toContain(seed);
      expect(s.pending.candidates).not.toContain(kill);
      s = act(s, { type: 'RESPOND', player: 0, selected: [seed] });
    }
    expect(s.cards[seed].zone).toBe('battle');
  });
});
