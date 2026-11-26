// 効果エンジンの拡張分のテスト：「〜ではない」、シンカパワー、メテオバーン、サバイバー、マジボンバー、
// 「〜1体につき」、行き先がいくつもある山札めくり、鬼タイム、「そうしたら」の続き
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { keywords, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

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
const spell = (id: string, abilities: string[]) => mk(id, abilities, { type: '呪文', power: '' });

const C = {
  vanilla: mk('m-1', [], { power: '5000' }),
  dark: mk('m-2', [], { civ: '闇' }),
  notDark: spell('m-3', ['闇ではないクリーチャーをすべて破壊する。']),
  shinka: mk('m-4', ['シンカパワー：このクリーチャーが進化する時、カードを１枚引く。']),
  evo: mk('m-5', ['進化：自分の火のクリーチャー１体の上に置く。'], { type: '進化クリーチャー', power: '6000' }),
  meteor: mk('m-6', ['進化：自分の火のクリーチャー１体の上に置く。', 'メテオバーン：このクリーチャーが攻撃する時、このクリーチャーの下にあるカードを１枚墓地に置いてもよい。そうしたら、カードを２枚引く。'], {
    type: '進化クリーチャー',
    power: '6000',
  }),
  survivorA: mk('m-7', ['{S} ブロッカー（このクリーチャーをタップして、相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい）', 'サバイバー（自分の他のサバイバーすべてに、上の{S} 能力を与える）'], { race: 'サバイバー' }),
  survivorB: mk('m-8', [], { race: 'サバイバー' }),
  magi: mk('m-9', ['マジボンバー ３（このクリーチャーが攻撃する時、自分の山札の上から１枚目を見る。その後、コスト３以下のクリーチャーを１体、自分の手札または山札の上から、バトルゾーンに出してもよい）']),
  perDraw: spell('m-10', ['自分のクリーチャー１体につき、カードを１枚引く。']),
  look3: spell('m-11', ['自分の山札の上から３枚を見る。その中から１枚をシールド化し、１枚をマナゾーンに置き、残りの１枚を墓地に置く。']),
  oni: mk('m-12', ['鬼タイム ：自分と相手のシールドの数が合計６つ以下なら、このクリーチャーのパワーを +4000し、「W・ブレイカー」を与える。']),
  bigSummon: mk('m-13', ['自分のパワー5000以上のクリーチャーが出た時、カードを１枚引く。'], { power: '6000' }),
  sacDraw: spell('m-14', ['自分のクリーチャーを１体破壊してもよい。そうしたら、カードを２枚引く。']),
  exile: mk('m-16', ['自分の他の、名前に《拳銃》とあるエグザイル・クリーチャーをバトルゾーンに出すことはできない。'], { race: 'エグザイル・クリーチャー' }),
  noMulti: mk('m-17', ['このクリーチャーが出た時、このターン、相手はコスト７以下のクリーチャーを出せない。']),
  powerGj: mk('m-18', ['このクリーチャーが出た時、相手とパワー・ガチンコ・ジャッジする。自分が負けたら、このクリーチャーを破壊する。']),
  plus: mk('m-15', ['{STP} S・トリガー・プラス（このクリーチャーを自分のシールドゾーンから手札に加える時、コストを支払わずにすぐ召喚してもよい）', '{x+}このクリーチャーが出た時、相手のクリーチャーをすべてタップする。']),
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
const mana = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) put(s, 0, C.vanilla.id, 'mana');
};
const zone = (s: GameState, p: PlayerId, z: 'hand' | 'graveyard' | 'shield' | 'mana' | 'battle') => s.players[p].zones[z].length;
/** 進化クリーチャーをバトルゾーンに置き、下にカードを1枚重ねる */
function putEvolved(s: GameState, cardId: string): { top: string; under: string } {
  const under = put(s, 0, C.vanilla.id, 'battle');
  const top = put(s, 0, cardId, 'battle', true);
  s.players[0].zones.battle = s.players[0].zones.battle.filter((x) => x !== under);
  s.cards[top].under = [under];
  return { top, under };
}

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「各ターン、このクリーチャーがはじめて攻撃する時」は各ターンに1度の誘発', () => {
    expect(parseAbilityText('各ターン、このクリーチャーがはじめて攻撃する時、カードを１枚引く。', 'creature').abilities).toEqual([{ when: 'onAttack', effects: [{ type: 'draw', count: 1 }], oncePerTurn: true }]);
  });
  it('持ち主の書いていない「クリーチャーが破壊された時」は両方のプレイヤーのクリーチャー', () => {
    expect(parseAbilityText('クリーチャーが破壊された時、カードを１枚引いてもよい。', 'creature').abilities[0]).toMatchObject({ when: 'onOtherDestroyed', who: 'any', optional: true });
  });
  it('S・トリガー・プラスの {x+} 能力は、相手のターンでシールドが2つ以上ブレイクされた時だけ', () => {
    expect(C.plus.abilities?.[0].condition).toEqual({ type: 'and', conditions: [{ type: 'opponentTurn' }, { type: 'shieldsBrokenThisTurn', who: 'self', min: 2 }] });
  });
  it('「こうして破壊したクリーチャー1体につき」は選んだ数だけくり返す', () => {
    const p = parseAbilityText('このクリーチャーが出た時、自分のクリーチャーを好きな数破壊してもよい。こうして破壊したクリーチャー１体につき、カードを２枚引く。', 'creature');
    expect(p.manualLines).toHaveLength(0);
    expect(p.abilities[1]?.effects ?? p.abilities[0].effects).toContainEqual({ type: 'repeat', per: 'chosen', unit: 1, effects: [{ type: 'draw', count: 2 }] });
  });
});

describe('エンジンで動く', () => {
  it('「闇ではないクリーチャーをすべて破壊する」：闇のクリーチャーは残る', () => {
    let s = newGame();
    const fire = put(s, 1, C.vanilla.id, 'battle');
    const dark = put(s, 1, C.dark.id, 'battle');
    const sp = put(s, 0, C.notDark.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[fire].zone).toBe('graveyard');
    expect(s.cards[dark].zone).toBe('battle');
  });

  it('シンカパワー：進化した時にカードを1枚引く', () => {
    let s = newGame();
    const b = put(s, 0, C.shinka.id, 'battle');
    const e = put(s, 0, C.evo.id, 'hand');
    mana(s, 1);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: e, evolveOn: b });
    expect(s.cards[e].zone).toBe('battle');
    // 進化クリーチャーを使って1枚減り、シンカパワーで1枚引く
    expect(zone(s, 0, 'hand')).toBe(hand);
  });

  it('メテオバーン：下のカードを墓地に置いたら、続きの効果を行う', () => {
    let s = newGame();
    const { top, under } = putEvolved(s, C.meteor.id);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: top, target: { kind: 'player' } });
    expect(s.pending?.kind).toBe('confirm');
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[under].zone).toBe('graveyard');
    expect(s.cards[top].under).toEqual([]);
    expect(zone(s, 0, 'hand')).toBe(hand + 2);
  });

  it('メテオバーン：下にカードがなければ、続きの効果は行わない', () => {
    let s = newGame();
    const top = put(s, 0, C.meteor.id, 'battle', true);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: top, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(zone(s, 0, 'hand')).toBe(hand);
  });

  it('「破壊してもよい。そうしたら」：破壊するクリーチャーがいなければ引かない', () => {
    let s = newGame();
    const sp = put(s, 0, C.sacDraw.id, 'hand');
    mana(s, 1);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'confirm') s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(zone(s, 0, 'hand')).toBe(hand - 1);
  });

  it('サバイバー：{S} 能力を自分の他のサバイバーにも与える（サバイバーでないクリーチャーには与えない）', () => {
    const s = newGame();
    const b = put(s, 0, C.survivorB.id, 'battle');
    const v = put(s, 0, C.vanilla.id, 'battle');
    expect(keywords(s, reg, b).blocker).toBeFalsy();
    const a = put(s, 0, C.survivorA.id, 'battle');
    expect(keywords(s, reg, a).blocker).toBe(true);
    expect(keywords(s, reg, b).blocker).toBe(true);
    expect(keywords(s, reg, v).blocker).toBeFalsy();
  });

  it('マジボンバー：攻撃する時、手札のコスト3以下のクリーチャーを出せる', () => {
    let s = newGame();
    const m = put(s, 0, C.magi.id, 'battle', true);
    const h = put(s, 0, C.dark.id, 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: m, target: { kind: 'player' } });
    expect(s.pending?.kind).toBe('selectCards');
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toContain(h);
    s = act(s, { type: 'RESPOND', player: 0, selected: [h] });
    expect(s.cards[h].zone).toBe('battle');
  });

  it('「自分のクリーチャー1体につき、カードを1枚引く」：2体なら2枚引く', () => {
    let s = newGame();
    put(s, 0, C.vanilla.id, 'battle');
    put(s, 0, C.dark.id, 'battle');
    const sp = put(s, 0, C.perDraw.id, 'hand');
    mana(s, 1);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(zone(s, 0, 'hand')).toBe(hand - 1 + 2);
  });

  it('山札の上から3枚を見て、1枚をシールド化、1枚をマナゾーン、残りを墓地に置く', () => {
    let s = newGame();
    const sp = put(s, 0, C.look3.id, 'hand');
    mana(s, 1);
    const before = { shield: zone(s, 0, 'shield'), mana: zone(s, 0, 'mana'), grave: zone(s, 0, 'graveyard') };
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    for (let i = 0; i < 2; i++) {
      expect(s.pending?.kind).toBe('selectCards');
      const c = s.pending?.kind === 'selectCards' ? s.pending.candidates : [];
      s = act(s, { type: 'RESPOND', player: 0, selected: [c[0]] });
    }
    expect(s.pending).toBeFalsy();
    expect(zone(s, 0, 'shield')).toBe(before.shield + 1);
    expect(zone(s, 0, 'mana')).toBe(before.mana + 1);
    // 残りの1枚と、唱えた呪文
    expect(zone(s, 0, 'graveyard')).toBe(before.grave + 2);
  });

  it('エグザイル・クリーチャー：同じ名前を含む自分の他のエグザイル・クリーチャーは出せない', () => {
    const p = parseAbilityText('自分の他の、名前に《拳銃》とあるエグザイル・クリーチャーをバトルゾーンに出すことはできない。', 'creature');
    expect(p.statics).toEqual([{ type: 'cannotEnter', who: 'self', filter: { nameIncludes: '拳銃', race: 'エグザイル' } }]);
  });

  it('「このターン、相手はコスト7以下のクリーチャーを出せない」：相手は召喚できず、自分は召喚できる', () => {
    let s = newGame();
    const c = put(s, 0, C.noMulti.id, 'hand');
    mana(s, 2);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    const mine = put(s, 0, C.dark.id, 'hand');
    put(s, 0, C.dark.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: mine });
    expect(s.cards[mine].zone).toBe('battle');
    // 効果で出そうとしても、相手のクリーチャーは出ない
    const theirs = put(s, 1, C.dark.id, 'hand');
    s.queue.push({ kind: 'enterBattle', player: 1, iid: theirs });
    new Ctx(s, reg).run();
    expect(s.cards[theirs].zone).toBe('hand');
  });

  it('パワー・ガチンコ・ジャッジ：負けたらこのクリーチャーを破壊する', () => {
    let s = newGame();
    // 自分の山札の上はパワー0扱いの呪文、相手の山札の上はパワー5000のクリーチャー
    put(s, 1, C.vanilla.id, 'deck');
    put(s, 0, C.perDraw.id, 'deck');
    const c = put(s, 0, C.powerGj.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.cards[c].zone).toBe('graveyard');
  });

  it('鬼タイム：シールドの合計が6つ以下の時だけパワー+4000と「W・ブレイカー」', () => {
    const s = newGame();
    const o = put(s, 0, C.oni.id, 'battle');
    expect(power(s, reg, o)).toBe(3000);
    const ctx = new Ctx(s, reg);
    while (s.players[0].zones.shield.length + s.players[1].zones.shield.length > 6) ctx.moveCard(s.players[1].zones.shield[0] ?? s.players[0].zones.shield[0], 'graveyard');
    expect(power(s, reg, o)).toBe(7000);
    expect(keywords(s, reg, o).breaker).toBe(2);
  });

  it('「自分のパワー5000以上のクリーチャーが出た時」は、条件に合えばこのクリーチャー自身が出た時にも誘発する', () => {
    let s = newGame();
    const c = put(s, 0, C.bigSummon.id, 'hand');
    mana(s, 1);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(zone(s, 0, 'hand')).toBe(hand);
    // パワー3000のクリーチャーが出ても誘発しない
    const small = put(s, 0, C.dark.id, 'hand');
    put(s, 0, C.dark.id, 'mana');
    const hand2 = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: small });
    expect(zone(s, 0, 'hand')).toBe(hand2 - 1);
  });
});
