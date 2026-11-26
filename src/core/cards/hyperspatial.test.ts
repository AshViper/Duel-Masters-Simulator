// 超次元まわりのテスト：覚醒・解除・ループ覚醒（サイキック・クリーチャーが裏返る）、ドラグハート（龍解・龍回避）
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { def, keywords, power } from '../engine/queries';
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
  const zero = mk('h-24', ['侵略ZERO：相手のターンの終わりに、そのターン、相手のクリーチャーがコストを支払わずに出ていたら、この呪文を自分の手札からコストを支払わずに唱えてもよい。', 'カードを２枚引く。'], { type: '呪文', power: '' });
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
