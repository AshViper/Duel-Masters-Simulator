// 効果エンジンの拡張分のテスト：「〜ではない」、シンカパワー、メテオバーン、サバイバー、マジボンバー、
// 「〜1体につき」、行き先がいくつもある山札めくり、鬼タイム、「そうしたら」の続き
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { altCost, canPlayAlt, fushigiCandidates, keywords, power } from '../engine/queries';
import { getLegalActions } from '../engine/legal';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import { setUserLineDefs, validateLineDefs } from './lineDefs';
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
  recycle: spell('m-20', ['カードを２枚引く。', 'リサイクル [ff04]（この呪文を自分の墓地から「リサイクル」コストを支払って唱えてもよい。こうして唱えた後、墓地のかわりに山札の下に置く）']),
  galaxy: mk('m-21', ['ギャラクシールド [ff02]（このカードを使うコストの代わりに、[ff02]を支払ってもよい。そうしたら、このカードを表向きにし、新しいシールドとしてシールドゾーンに置く）', '自分のターンのはじめに、このクリーチャーが表向きで自分のシールドゾーンにあれば、コストを支払ったものとして召喚する。'], { cost: '6' }),
  kirifu: mk('m-22', ['キリフダッシュ [ff02]（自分のクリーチャーの攻撃の終わりに、そのクリーチャーがその攻撃中にシールドをブレイクしていれば、このクリーチャーを[ff02]支払って召喚してもよい）'], { cost: '5' }),
  fushigi: mk('m-23', ['フシギバース [ff08]（自分のクリーチャーを１体タップしてマナゾーンに置き、[ff08]からそのクリーチャーのコストを引いた数のコストを支払って、このクリーチャーを自分の墓地から召喚してもよい。ただし、コストは[ff02]より少なくならない）'], { cost: '8' }),
  bad: mk('m-24', ['B・A・D ２（このクリーチャーの召喚コストを２少なくしてもよい。そうしたら、このターンの終わりにこのクリーチャーを破壊する）'], { cost: '4' }),
  joe: mk('m-25', ['Ｊ・Ｏ・Ｅ ２ (このクリーチャーを、コストを２少なくして召喚してもよい。こうして出したら、このターンの終わりに、それを自分の山札の下に置く。そうしたら、カードを１枚引く)'], { cost: '4' }),
  cheap: spell('m-26', ['この呪文を[ff01]支払って唱えてもよい。そうしたら、相手はカードを１枚引いてもよい。', 'カードを２枚引く。']),
  cost5: mk('m-27', [], { cost: '5' }),
  cyclica: mk('m-30', ['このクリーチャーをバトルゾーンに出した時、コスト７以下の呪文を１枚、自分の墓地からコストを支払わずに唱えてもよい。そうした場合、唱えた後、墓地に置くかわりに自分の手札に加える。', 'W・ブレイカー（このクリーチャーはシールドを２枚ブレイクする）', 'このクリーチャーが破壊される時、墓地に置くかわりに自分の山札の一番下に置く。'], { civ: '水', cost: '2', power: '6000' }),
  water: mk('m-31', [], { civ: '水' }),
  draw2: spell('m-32', ['カードを２枚引く。']),
  lookAlt: spell('m-40', ['自分の山札の上から３枚を見る。そのうちの１枚を手札に加えるかマナゾーンに置き、残りを好きな順序で山札の下に置く。']),
  lookPair: spell('m-41', ['自分の山札の上から５枚を見る。その中から火のカードと闇のカードをそれぞれ１枚まで、表向きにしてから手札に加えてもよい。残りを好きな順序で山札の下に置く。']),
  untilDark: spell('m-42', ['自分の山札の上から闇のクリーチャーが２体出るまで表向きにし、その２体を出す。その後、山札をシャッフルする。']),
  upTo3: mk('m-43', ['このクリーチャーが出た時、次の能力を３回まで使う。\n▶カードを１枚引く。']),
  searchSwap: spell('m-44', ['自分の山札を見る。その中から１枚選んで自分のマナゾーンに置き、自分のマナゾーンから１枚選んで墓地に置く。その後、山札をシャッフルする。']),
  revealAny: spell('m-45', ['自分の山札の上から１枚を表向きにする。それが呪文または名前に《m-2》とあるカードなら、手札に加える。']),
  topBottom: spell('m-46', ['自分の山札の上から２枚を見る。その後、それらを好きな順序で山札の上または下に置く。']),
  shuffleLook: spell('m-47', ['自分の山札をシャッフルし、上から３枚を表向きにする。その中からクリーチャーを１体出し、残りを好きな順序で山札の下に置く。']),
  number: spell('m-50', ['数字を１つ選ぶ。次の自分のターンのはじめまで、その数字と同じコストの相手のクリーチャーは攻撃もブロックもできない。']),
  both: spell('m-51', ['次のうちいずれかひとつを選ぶ。バトルゾーンに自分の闇のクリーチャーと火のクリーチャーがそれぞれ１体以上あれば、両方選んでもよい。\n▶カードを１枚引く。\n▶自分の山札の上から１枚目をマナゾーンに置く。その後、カードを１枚、自分のマナゾーンから手札に戻してもよい。']),
  tapAll: mk('m-52', ['このクリーチャーがバトルゾーンに出た時、相手のクリーチャーをすべてタップする。次の相手のターンのはじめに、それらはアンタップしない。']),
  toggle: mk('m-53', ['このクリーチャーが出た時、クリーチャーを１体選び、タップまたはアンタップする。']),
  discardDraw: mk('m-54', ['このクリーチャーが出た時、自分の手札を２枚まで捨て、その枚数より１枚多くカードを引く。']),
  power13: mk('m-55', ['このクリーチャーをバトルゾーンに出した時、パワーの合計が7000以下になるよう、相手のクリーチャーを好きな数選び、破壊する。']),
  evoCond: mk('m-56', ['このクリーチャーが出た時、カードを１枚引く。これが進化クリーチャーなら、カードをもう１枚引く。']),
  underLeft: mk(
    'm-60',
    ['進化：自分の火のクリーチャー１体の上に置く。', 'メテオバーン：このクリーチャーが攻撃する時、このクリーチャーの下にあるカードを１枚墓地に置いてもよい。', 'カードがこのクリーチャーの下を離れた時、次のうちいずれかひとつを選ぶ。\n▶自分の山札の上から１枚をシールド化する。\n▶相手のクリーチャーを１体選び、破壊する。'],
    { type: '進化クリーチャー', power: '6000' },
  ),
  taxFree: mk('m-70', ['相手のクリーチャーが出た時、そのターン、そのクリーチャーは攻撃できない。そのクリーチャーがコストを支払わずに出ていたら、カードを１枚引いてもよい。']),
  toShield: spell('m-71', ['バトルゾーンにある、進化クリーチャーでないクリーチャーを１体選び、裏向きにして持ち主のシールドに加える。']),
  underHand: mk('m-72', ['このクリーチャーが出た時または自分のターンの終わりに、カードを１枚引いてもよい。その後、自分の手札を１枚、表向きでこのクリーチャーの下に置いてもよい。']),
  lookCast: spell('m-73', ['自分の山札の上から４枚を見る。その中から「S・トリガー」付きの呪文を１枚選んでもよい。残りを好きな順序で山札の一番下に戻し、選んだ呪文があればコストを支払わずに唱える。']),
  stSpell: spell('m-74', ['S・トリガー', 'カードを２枚引く。']),
  stealCast: mk('m-75', ['相手が手札から呪文を捨てた時、自分はその呪文を相手の墓地からコストを支払わずに唱えてもよい。']),
  endCast: spell('m-76', ['相手のターンの終わりに、そのターン、クリーチャーが３体以上出ていれば、この呪文をコストを支払わずに唱えてもよい。', 'カードを２枚引く。']),
  twice: spell('m-77', ['次の中から２回選ぶ。同じものを選んでもよい。\n▶カードを２枚引き、自分の手札を１枚捨てる。\n▶「S・トリガー」を持つカードを１枚、自分の墓地からコストを支払わずに実行する。こうして呪文を唱えたなら、それを唱えた後、墓地のかわりに山札の下に置く。\n▶クリーチャーを１体選び、シールド化する。']),
  handMana: mk('m-78', ['このクリーチャーがバトルゾーンに出た時、自分の手札をすべてマナゾーンに置く。その後、それと同じ枚数のカードを自分のマナゾーンから手札に戻す。']),
  discard: spell('m-79', ['自分の手札を１枚捨てる。']),
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

describe('別のコストでの使い方', () => {
  const alt = { type: 'PLAY_CARD' as const, player: 0 as PlayerId, alt: 0 };
  const endTurn = (s: GameState) => act(s, { type: 'END_TURN', player: s.activePlayer });

  it('読み取り：マナの記号からコストと文明を読む', () => {
    expect(C.recycle.altPlays).toEqual([{ name: 'リサイクル', cost: 4, civilizations: ['fire'], from: 'graveyard', spellAfter: 'deckBottom' }]);
    expect(C.fushigi.altPlays?.[0]).toMatchObject({ name: 'フシギバース', cost: 8, from: 'graveyard', fushigi: { min: 2 } });
    expect(C.bad.altPlays).toEqual([{ name: 'B・A・D', reduce: 2, endOfTurn: 'destroy' }]);
    expect(C.galaxy.galaxyReturn).toBe(true);
  });

  it('リサイクル：墓地からリサイクルのコストで唱え、唱えた後は山札の下に置く', () => {
    let s = newGame();
    const sp = put(s, 0, C.recycle.id, 'graveyard');
    mana(s, 3);
    expect(canPlayAlt(s, reg, 0, sp, 0)).toBe(false);
    mana(s, 1);
    expect(getLegalActions(s, reg, 0)).toContainEqual({ ...alt, iid: sp });
    const hand = zone(s, 0, 'hand');
    s = act(s, { ...alt, iid: sp });
    expect(zone(s, 0, 'hand')).toBe(hand + 2);
    expect(s.players[0].zones.deck[0]).toBe(sp);
    expect(s.players[0].zones.mana.filter((m) => s.cards[m].tapped)).toHaveLength(4);
  });

  it('ギャラクシールド：表向きでシールドゾーンに置き、次の自分のターンのはじめに召喚する', () => {
    let s = newGame();
    const c = put(s, 0, C.galaxy.id, 'hand');
    mana(s, 2);
    s = act(s, { ...alt, iid: c });
    expect(s.cards[c].zone).toBe('shield');
    expect(s.cards[c].faceUp).toBe(true);
    s = endTurn(s);
    expect(s.cards[c].zone).toBe('shield');
    s = endTurn(s);
    expect(s.cards[c].zone).toBe('battle');
  });

  it('キリフダッシュ：攻撃でシールドをブレイクしたら、攻撃の終わりにコストを支払って召喚できる', () => {
    let s = newGame();
    const a = put(s, 0, C.vanilla.id, 'battle', true);
    const k = put(s, 0, C.kirifu.id, 'hand');
    mana(s, 2);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    for (let i = 0; i < 6 && s.pending && !(s.pending.kind === 'selectCards' && s.pending.candidates.includes(k)); i++) {
      s = act(s, s.pending.kind === 'selectCards' ? { type: 'RESPOND', player: s.pending.player, selected: s.pending.candidates.slice(0, s.pending.min) } : { type: 'RESPOND', player: s.pending.player, selected: [], accept: false });
    }
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toEqual([k]);
    s = act(s, { type: 'RESPOND', player: 0, selected: [k] });
    expect(s.cards[k].zone).toBe('battle');
    expect(s.players[0].zones.mana.filter((m) => s.cards[m].tapped)).toHaveLength(2);
  });

  it('フシギバース：自分のクリーチャーをマナゾーンに置き、そのコストだけ少なく支払って墓地から召喚する', () => {
    let s = newGame();
    const f = put(s, 0, C.fushigi.id, 'graveyard');
    const five = put(s, 0, C.cost5.id, 'battle');
    mana(s, 3);
    expect(altCost(s, reg, 0, f, C.fushigi.altPlays![0], [five])).toBe(3);
    expect(fushigiCandidates(s, reg, 0, f, 0)).toEqual([five]);
    s = act(s, { ...alt, iid: f, sacrifice: [five] });
    expect(s.cards[f].zone).toBe('battle');
    expect(s.cards[five].zone).toBe('mana');
    expect(s.cards[five].tapped).toBe(true);
  });

  it('B・A・D：コストを少なくして召喚し、ターンの終わりに破壊する（ふつうに召喚すれば残る）', () => {
    let s = newGame();
    const b = put(s, 0, C.bad.id, 'hand');
    mana(s, 2);
    expect(canPlayAlt(s, reg, 0, b, 0)).toBe(true);
    s = act(s, { ...alt, iid: b });
    expect(s.cards[b].zone).toBe('battle');
    s = endTurn(s);
    expect(s.cards[b].zone).toBe('graveyard');
    let s2 = newGame();
    const b2 = put(s2, 0, C.bad.id, 'hand');
    mana(s2, 4);
    s2 = act(s2, { type: 'PLAY_CARD', player: 0, iid: b2 });
    s2 = endTurn(s2);
    expect(s2.cards[b2].zone).toBe('battle');
  });

  it('J・O・E：ターンの終わりに山札の下に置いて、カードを1枚引く', () => {
    let s = newGame();
    const j = put(s, 0, C.joe.id, 'hand');
    mana(s, 2);
    s = act(s, { ...alt, iid: j });
    const hand = zone(s, 0, 'hand');
    s = endTurn(s);
    expect(s.players[0].zones.deck[0]).toBe(j);
    expect(zone(s, 0, 'hand')).toBe(hand + 1);
  });

  it('「この呪文を[ff01]支払って唱えてもよい。そうしたら、相手はカードを1枚引いてもよい」', () => {
    let s = newGame();
    const sp = put(s, 0, C.cheap.id, 'hand');
    mana(s, 1);
    const mine = zone(s, 0, 'hand');
    const theirs = zone(s, 1, 'hand');
    s = act(s, { ...alt, iid: sp });
    expect(zone(s, 0, 'hand')).toBe(mine - 1 + 2);
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(zone(s, 1, 'hand')).toBe(theirs + 1);
  });
});

describe('龍素記号Sr スペルサイクリカ', () => {
  it('出た時、墓地の呪文をコストを支払わずに唱え、唱えた後は手札に加える', () => {
    expect(C.cyclica.support).toBe('full');
    let s = newGame();
    const c = put(s, 0, C.cyclica.id, 'hand');
    const sp = put(s, 0, C.draw2.id, 'graveyard');
    put(s, 0, C.water.id, 'mana');
    put(s, 0, C.water.id, 'mana');
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    // 唱える呪文を選ぶ（候補が1枚でも、使うかどうかを選べる）
    for (let i = 0; i < 3 && s.pending; i++) {
      s = act(s, s.pending.kind === 'selectCards' ? { type: 'RESPOND', player: 0, selected: [sp] } : { type: 'RESPOND', player: 0, accept: true });
    }
    expect(s.pending).toBeFalsy();
    expect(s.cards[sp].zone).toBe('hand');
    // スペルサイクリカを出して1枚減り、2枚引き、唱えた呪文が手札に加わる
    expect(zone(s, 0, 'hand')).toBe(hand - 1 + 2 + 1);
  });

  it('破壊される時、墓地に置くかわりに山札の一番下に置く', () => {
    let s = newGame();
    const c = put(s, 0, C.cyclica.id, 'battle');
    s.queue.push({ kind: 'leave', iid: c, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.players[0].zones.deck[0]).toBe(c);
  });
});

describe('山札を見る効果', () => {
  const cast = (s: GameState, cardId: string) => {
    const sp = put(s, 0, cardId, 'hand');
    mana(s, 1);
    return act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
  };
  const cands = (s: GameState) => (s.pending?.kind === 'selectCards' ? s.pending.candidates : []);

  it('「手札に加えるかマナゾーンに置き」：選んだカードの行き先を選べる', () => {
    let s = newGame();
    const manaBefore = zone(s, 0, 'mana');
    s = cast(s, C.lookAlt.id);
    const pick = cands(s)[0];
    s = act(s, { type: 'RESPOND', player: 0, selected: [pick] });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['手札に加える', 'マナゾーンに置く'] });
    s = act(s, { type: 'RESPOND', player: 0, selected: ['1'] });
    expect(s.pending).toBeFalsy();
    expect(s.cards[pick].zone).toBe('mana');
    expect(zone(s, 0, 'mana')).toBe(manaBefore + 1 + 1);
  });

  it('「火のカードと闇のカードをそれぞれ1枚まで」：条件ごとに選ぶ', () => {
    let s = newGame();
    const dark = put(s, 0, C.dark.id, 'deck');
    const fire = put(s, 0, C.vanilla.id, 'deck');
    s = cast(s, C.lookPair.id);
    expect(cands(s)).toContain(fire);
    expect(cands(s)).not.toContain(dark);
    s = act(s, { type: 'RESPOND', player: 0, selected: [fire] });
    expect(cands(s)).toEqual([dark]);
    s = act(s, { type: 'RESPOND', player: 0, selected: [dark] });
    expect(s.pending).toBeFalsy();
    expect([s.cards[fire].zone, s.cards[dark].zone]).toEqual(['hand', 'hand']);
  });

  it('「闇のクリーチャーが2体出るまで表向きにし、その2体を出す」', () => {
    let s = newGame();
    const d1 = put(s, 0, C.dark.id, 'deck');
    put(s, 0, C.vanilla.id, 'deck');
    const d2 = put(s, 0, C.dark.id, 'deck');
    const deck = s.players[0].zones.deck.length;
    s = cast(s, C.untilDark.id);
    expect([s.cards[d1].zone, s.cards[d2].zone]).toEqual(['battle', 'battle']);
    expect(s.players[0].zones.deck.length).toBe(deck - 2);
  });

  it('「次の能力を3回まで使う」：1回ずつ使うかどうかを聞く', () => {
    let s = newGame();
    const c = put(s, 0, C.upTo3.id, 'hand');
    mana(s, 1);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending?.kind).toBe('confirm');
    s = act(s, { type: 'RESPOND', player: 0, accept: false });
    expect(s.pending).toBeFalsy();
    expect(zone(s, 0, 'hand')).toBe(hand - 1 + 2);
  });

  it('山札から1枚マナゾーンに置き、マナゾーンから1枚墓地に置く', () => {
    let s = newGame();
    const manaBefore = zone(s, 0, 'mana');
    s = cast(s, C.searchSwap.id);
    s = act(s, { type: 'RESPOND', player: 0, selected: [cands(s)[0]] });
    expect(s.pending?.kind).toBe('selectCards');
    s = act(s, { type: 'RESPOND', player: 0, selected: [cands(s)[0]] });
    expect(s.pending).toBeFalsy();
    expect(zone(s, 0, 'mana')).toBe(manaBefore + 1);
  });

  it('「それが呪文または名前に《X》とあるカードなら、手札に加える」：合わなければ山札の上に残る', () => {
    let s = newGame();
    const named = put(s, 0, C.dark.id, 'deck');
    s = cast(s, C.revealAny.id);
    expect(s.cards[named].zone).toBe('hand');
    let s2 = newGame();
    const other = put(s2, 0, C.vanilla.id, 'deck');
    s2 = cast(s2, C.revealAny.id);
    expect(s2.cards[other].zone).toBe('deck');
    expect(s2.players[0].zones.deck.at(-1)).toBe(other);
  });

  it('「好きな順序で山札の上または下に置く」：選んだカードを下に置き、残りは上に残す', () => {
    let s = newGame();
    const a = put(s, 0, C.dark.id, 'deck');
    const b = put(s, 0, C.vanilla.id, 'deck');
    s = cast(s, C.topBottom.id);
    expect(cands(s)).toEqual([b, a]);
    s = act(s, { type: 'RESPOND', player: 0, selected: [b] });
    expect(s.players[0].zones.deck[0]).toBe(b);
    expect(s.players[0].zones.deck.at(-1)).toBe(a);
  });

  it('「山札をシャッフルし、上から3枚を表向きにする」：シャッフルしてから見る', () => {
    expect(C.shuffleLook.twin ?? C.shuffleLook.abilities?.[0].effects.map((e) => e.type)).toEqual(['shuffleDeck', 'lookAtTop']);
  });
});

describe('数字を選ぶ・次のうちいずれかを選ぶ・出た時の能力', () => {
  const cast = (s: GameState, cardId: string) => {
    const sp = put(s, 0, cardId, 'hand');
    mana(s, 1);
    return { s: act(s, { type: 'PLAY_CARD', player: 0, iid: sp }), iid: sp };
  };

  it('数字を1つ選ぶ：その数字と同じコストの相手のクリーチャーは攻撃もブロックもできない', () => {
    let s = newGame();
    const one = put(s, 1, C.vanilla.id, 'battle');
    const five = put(s, 1, C.cost5.id, 'battle');
    s = cast(s, C.number.id).s;
    expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, selected: ['5'] });
    expect(keywords(s, reg, five)).toMatchObject({ cannotAttack: true, cannotBlock: true });
    expect(keywords(s, reg, one).cannotAttack).toBeFalsy();
    // 後で別の数字を選んでも、前の効果は変わらない
    s.chosenNumber = 1;
    expect(keywords(s, reg, five).cannotAttack).toBe(true);
    expect(keywords(s, reg, one).cannotAttack).toBeFalsy();
  });

  it('「次のうちいずれかひとつを選ぶ。〜があれば、両方選んでもよい」：条件を満たす時だけ両方を選べる', () => {
    let s = newGame();
    s = cast(s, C.both.id).s;
    expect(s.pending?.kind === 'chooseMode' && s.pending.options).toHaveLength(2);

    let s2 = newGame();
    put(s2, 0, C.dark.id, 'battle');
    put(s2, 0, C.vanilla.id, 'battle');
    const hand = zone(s2, 0, 'hand');
    const manaBefore = zone(s2, 0, 'mana');
    s2 = cast(s2, C.both.id).s;
    expect(s2.pending?.kind === 'chooseMode' && s2.pending.options).toHaveLength(3);
    s2 = act(s2, { type: 'RESPOND', player: 0, selected: ['2'] });
    // 選択肢の中の「〜してもよい」は、使うかどうかを聞く
    expect(s2.pending?.kind).toBe('confirm');
    s2 = act(s2, { type: 'RESPOND', player: 0, accept: false });
    expect(s2.pending).toBeFalsy();
    // 手札：1枚引く（唱えた呪文は手札に入れてから使うので差し引き0）
    expect(zone(s2, 0, 'hand')).toBe(hand + 1);
    expect(zone(s2, 0, 'mana')).toBe(manaBefore + 1 + 1);
  });

  it('「相手のクリーチャーをすべてタップする。次の相手のターンのはじめに、それらはアンタップしない」', () => {
    let s = newGame();
    const o = put(s, 1, C.vanilla.id, 'battle');
    const c = put(s, 0, C.tapAll.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.cards[o].tapped).toBe(true);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.activePlayer).toBe(1);
    expect(s.cards[o].tapped).toBe(true);
  });

  it('「クリーチャーを1体選び、タップまたはアンタップする」', () => {
    let s = newGame();
    const o = put(s, 1, C.vanilla.id, 'battle');
    const c = put(s, 0, C.toggle.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    s = act(s, { type: 'RESPOND', player: 0, selected: [o] });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['タップする', 'アンタップする'] });
    s = act(s, { type: 'RESPOND', player: 0, selected: ['0'] });
    expect(s.cards[o].tapped).toBe(true);
  });

  it('「手札を2枚まで捨て、その枚数より1枚多くカードを引く」', () => {
    let s = newGame();
    const c = put(s, 0, C.discardDraw.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    const hand = zone(s, 0, 'hand');
    const pick = s.pending?.kind === 'selectCards' ? s.pending.candidates.slice(0, 2) : [];
    s = act(s, { type: 'RESPOND', player: 0, selected: pick });
    expect(s.pending).toBeFalsy();
    expect(zone(s, 0, 'hand')).toBe(hand - 2 + 3);
  });

  it('「パワーの合計が7000以下になるよう」：合計を超える分は破壊しない', () => {
    let s = newGame();
    const a = put(s, 1, C.vanilla.id, 'battle');
    const b = put(s, 1, C.vanilla.id, 'battle');
    const c = put(s, 0, C.power13.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    s = act(s, { type: 'RESPOND', player: 0, selected: [a, b] });
    expect([s.cards[a].zone, s.cards[b].zone]).toEqual(['graveyard', 'battle']);
  });

  it('途中の文の条件：「これが進化クリーチャーなら、カードをもう1枚引く」は進化していなければ引かない', () => {
    let s = newGame();
    const c = put(s, 0, C.evoCond.id, 'hand');
    mana(s, 1);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(zone(s, 0, 'hand')).toBe(hand - 1 + 1);
  });
});

describe('カードがこのクリーチャーの下を離れた時', () => {
  it('メテオバーンで下のカードを墓地に置くと誘発し、選んだ効果を処理する', () => {
    expect(C.underLeft.support).toBe('full');
    let s = newGame();
    const { top } = putEvolved(s, C.underLeft.id);
    const victim = put(s, 1, C.vanilla.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: top, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, selected: ['1'] });
    expect(s.cards[victim].zone).toBe('graveyard');
  });
});

describe('前の文のカード・枚数を使う効果、下に置く、手札にある間の誘発', () => {
  it('読み取り：すべて自動になる', () => {
    for (const c of [C.taxFree, C.toShield, C.underHand, C.lookCast, C.stealCast, C.endCast, C.twice, C.handMana]) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });

  it('相手のクリーチャーが出た時：そのターン攻撃できず、コストを支払わずに出ていたら引いてもよい', () => {
    let s = newGame();
    put(s, 0, C.taxFree.id, 'battle');
    const hand = zone(s, 0, 'hand');
    // 効果で（コストを支払わずに）出る
    const free = put(s, 1, C.vanilla.id, 'hand');
    s.queue.push({ kind: 'enterBattle', player: 1, iid: free });
    new Ctx(s, reg).run();
    expect(keywords(s, reg, free).cannotAttack).toBe(true);
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(zone(s, 0, 'hand')).toBe(hand + 1);
    // コストを支払って出たクリーチャーでは引けない
    const paid = put(s, 1, C.vanilla.id, 'hand');
    s.queue.push({ kind: 'enterBattle', player: 1, iid: paid, summoned: true, paid: true });
    new Ctx(s, reg).run();
    expect(s.pending).toBeFalsy();
    expect(zone(s, 0, 'hand')).toBe(hand + 1);
  });

  it('進化クリーチャーでないクリーチャーを選び、持ち主のシールドに加える', () => {
    let s = newGame();
    const o = put(s, 1, C.vanilla.id, 'battle');
    const shields = zone(s, 1, 'shield');
    const sp = put(s, 0, C.toShield.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending) s = act(s, { type: 'RESPOND', player: 0, selected: [o] });
    expect(s.cards[o].zone).toBe('shield');
    expect(zone(s, 1, 'shield')).toBe(shields + 1);
  });

  it('手札を1枚、このクリーチャーの下に置く', () => {
    let s = newGame();
    const c = put(s, 0, C.underHand.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    s = act(s, { type: 'RESPOND', player: 0, accept: false });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    const pick = s.pending?.kind === 'selectCards' ? s.pending.candidates[0] : '';
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'RESPOND', player: 0, selected: [pick] });
    expect(s.cards[c].under).toEqual([pick]);
    expect(zone(s, 0, 'hand')).toBe(hand - 1);
    expect(s.players[0].zones.battle).not.toContain(pick);
  });

  it('山札の上から4枚を見て「S・トリガー」付きの呪文を選び、残りを下に置いてから唱える', () => {
    let s = newGame();
    const st = put(s, 0, C.stSpell.id, 'deck');
    const sp = put(s, 0, C.lookCast.id, 'hand');
    mana(s, 1);
    const hand = zone(s, 0, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toEqual([st]);
    s = act(s, { type: 'RESPOND', player: 0, selected: [st] });
    if (s.pending?.kind === 'confirm') s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toBeFalsy();
    expect(s.cards[st].zone).toBe('graveyard');
    expect(zone(s, 0, 'hand')).toBe(hand - 1 + 2);
  });

  it('相手が手札から呪文を捨てた時、その呪文を相手の墓地から唱えてもよい', () => {
    let s = newGame();
    put(s, 1, C.stealCast.id, 'battle');
    for (const h of [...s.players[0].zones.hand]) new Ctx(s, reg).moveCard(h, 'deck');
    const d = put(s, 0, C.discard.id, 'hand');
    const drawSpell = put(s, 0, C.stSpell.id, 'hand');
    mana(s, 1);
    const theirs = zone(s, 1, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: d });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    if (s.pending?.kind === 'confirm') s = act(s, { type: 'RESPOND', player: 1, accept: true });
    // 唱えたのはプレイヤー1（2枚引く）。呪文は持ち主（プレイヤー0）の墓地に置かれる
    expect(zone(s, 1, 'hand')).toBe(theirs + 2);
    expect(s.cards[drawSpell].zone).toBe('graveyard');
    expect(s.cards[drawSpell].owner).toBe(0);
  });

  it('手札にある間の誘発：相手のターンの終わりに、クリーチャーが3体以上出ていれば唱えてもよい', () => {
    let s = newGame();
    const sp = put(s, 1, C.endCast.id, 'hand');
    s = act(s, { type: 'END_TURN', player: 0 });
    // 3体出ていないので聞かれない
    expect(s.activePlayer).toBe(1);
    expect(s.cards[sp].zone).toBe('hand');
    s = act(s, { type: 'END_TURN', player: 1 });
    s.players[0].creaturesThisTurn = 3;
    const hand = zone(s, 1, 'hand');
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[sp].zone).toBe('graveyard');
    // 唱えて1枚減り、2枚引く（次のターンのドローの前後は問わず、2枚以上増える）
    expect(zone(s, 1, 'hand')).toBeGreaterThanOrEqual(hand - 1 + 2);
  });

  it('手札をすべてマナゾーンに置き、それと同じ枚数をマナゾーンから手札に戻す', () => {
    let s = newGame();
    const c = put(s, 0, C.handMana.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    const moved = zone(s, 0, 'mana') - 1;
    expect(zone(s, 0, 'hand')).toBe(0);
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: moved, max: moved });
    const pick = s.pending?.kind === 'selectCards' ? s.pending.candidates.slice(0, moved) : [];
    s = act(s, { type: 'RESPOND', player: 0, selected: pick });
    expect(zone(s, 0, 'hand')).toBe(moved);
  });
});

describe('能力の文ごとの効果定義', () => {
  const jan = 'このクリーチャーが出た時、相手とじゃんけんする。';

  it('アプリに入っている定義：読み取りでは読めない文が自動になる（全角・補足説明の違いは無視する）', () => {
    const p = parseAbilityText('このクリーチャーが出た時、自分の、リキッド・ピープルまたはハンター１つにつき、相手のクリーチャーを１体選んでもよい。次の自分のターンのはじめまで、それらは攻撃もブロックもできない。（補足）', 'creature');
    expect(p.manualLines).toHaveLength(0);
    expect(p.abilities[0].effects[0].type).toBe('repeat');
    // 選択肢つきの能力（呪文）
    const s = parseAbilityText('次の中から１回選ぶ。自分のクリーチャーまたはタマシードの中に水と闇があれば、両方選んでもよい。\n\n▶カードを３枚引き、自分の手札を１枚捨てる。\n\n▶コスト８以下のクリーチャーを１体、自分の墓地から出す。', 'spell');
    expect(s.manualLines).toHaveLength(0);
    expect(s.abilities[0]).toMatchObject({ when: 'onCast', effects: [{ type: 'chooseOne' }] });
  });

  it('取り込んだ定義：手動だった能力が自動になり、エンジンで動く。外すと手動に戻る', () => {
    expect(parseAbilityText(jan, 'creature').manualLines).toHaveLength(1);
    setUserLineDefs({ [jan]: { abilities: [{ when: 'onSummon', effects: [{ type: 'draw', count: 2 }] }] } });
    try {
      const card = mk('m-90', [jan]);
      expect(card.support).toBe('full');
      const r = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), card]);
      let s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r);
      const iid = `t${s.nextIid++}`;
      s.cards[iid] = { iid, cardId: card.id, owner: 0, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
      s.players[0].zones.deck.unshift(iid);
      new Ctx(s, r).moveCard(iid, 'hand');
      mana(s, 1);
      const hand = zone(s, 0, 'hand');
      const res = applyAction(s, { type: 'PLAY_CARD', player: 0, iid }, r);
      s = res.state;
      expect(res.error).toBeFalsy();
      expect(zone(s, 0, 'hand')).toBe(hand - 1 + 2);
    } finally {
      setUserLineDefs(undefined);
    }
    expect(parseAbilityText(jan, 'creature').manualLines).toHaveLength(1);
  });

  it('取り込む JSON の形を確かめる', () => {
    expect(validateLineDefs([]).errors).toHaveLength(1);
    const r = validateLineDefs({ 正しい文: { abilities: [{ when: 'onSummon', effects: [{ type: 'draw', count: 1 }] }] }, だめな文: { abilities: [{ when: 'いつか', effects: [] }] } });
    expect(Object.keys(r.defs)).toEqual(['正しい文']);
    expect(r.errors).toHaveLength(1);
  });
});

describe('能力語を補足説明から読む・メクレイド', () => {
  it('知らない能力語は、カッコの補足説明を能力として読む', () => {
    const stealth = parseAbilityText('水ステルス(相手のマナゾーンに水のカードが１枚でもあれば、このクリーチャーはブロックされない)', 'creature');
    expect(stealth.manualLines).toHaveLength(0);
    expect(stealth.statics[0]).toMatchObject({ type: 'grantKeyword', keywords: { unblockable: true }, condition: { type: 'compare' } });
    expect(parseAbilityText('H・ブレイカー（このクリーチャーはシールドを６つブレイクする）', 'creature').keywords.breaker).toBe(6);
    const yobi = parseAbilityText('ヨビニオン（このクリーチャーが召喚によって出た時、自分の山札の上から、これよりコストが小さいクリーチャーが出るまで表向きにしてもよい。そのクリーチャーを出す。残りをシャッフルし、山札の下に置く）', 'creature');
    expect(yobi.manualLines).toHaveLength(0);
    expect(yobi.abilities[0]).toMatchObject({ when: 'onSummon', optional: true, effects: [{ type: 'revealUntil', to: 'battle', restTo: 'deckBottom' }] });
    // 補足説明が読めない能力語は手動のまま
    expect(parseAbilityText('ダイナモ（バトルが始まる時、あるいはこのクリーチャーで攻撃できる時、このクリーチャーをタップしてもよい）', 'creature').manualLines).toHaveLength(1);
  });

  it('文の中の能力語は、補足説明の定義に置き換えて読む。メクレイドは補足説明がなくても読む', () => {
    const withReminder = parseAbilityText('このクリーチャーが出た時、アビス・メクレイド５する。（アビス・メクレイド５：自分の山札の上から３枚を見る。その中から、コスト５以下のアビスを１枚、コストを支払わずに使ってもよい。残りを好きな順序で山札の下に置く）', 'creature');
    expect(withReminder.manualLines).toHaveLength(0);
    const bare = parseAbilityText('このクリーチャーが出た時、アビス・メクレイド５する。', 'creature');
    expect(bare.abilities[0].effects).toEqual([
      { type: 'lookAtTop', count: 3, pickCount: 1, pickFilter: { race: 'アビス', maxCost: 5 }, pickTo: 'none', restTo: 'deckBottom' },
      { type: 'playFree', target: { owner: 'self', zone: 'deck', count: 'all', ref: 'chosen', anyZone: true } },
    ]);
  });

  it('メクレイド：山札の上から3枚を見て、条件に合うクリーチャーをコストを支払わずに出す', () => {
    const mek = mk('m-95', ['このクリーチャーが出た時、テスト・メクレイド５する。']);
    const r = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), mek]);
    let s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r);
    const add = (cardId: string, zone: ZoneName) => {
      const iid = `t${s.nextIid++}`;
      s.cards[iid] = { iid, cardId, owner: 0, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
      s.players[0].zones.deck.unshift(iid);
      new Ctx(s, r).moveCard(iid, zone);
      return iid;
    };
    const target = add(C.vanilla.id, 'deck');
    const c = add(mek.id, 'hand');
    add(C.vanilla.id, 'mana');
    let res = applyAction(s, { type: 'PLAY_CARD', player: 0, iid: c }, r);
    s = res.state;
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toContain(target);
    res = applyAction(s, { type: 'RESPOND', player: 0, selected: [target] }, r);
    s = res.state;
    expect(res.error).toBeFalsy();
    expect(s.cards[target].zone).toBe('battle');
  });
});

describe('条件を満たすと能力を得る・能力語つきの本文', () => {
  it('「〜があれば、このクリーチャーは次の能力を得る」：次の行を条件つきの能力として読む', () => {
    const meta = mk('m-100', ['メタモーフ（自分のマナゾーンに７枚以上カードがあれば、このクリーチャーは次の能力を得る）\n\nこのクリーチャーはブロックされない。']);
    expect(meta.support).toBe('full');
    const r = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), meta]);
    const s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r);
    const add = (cardId: string, zone: ZoneName) => {
      const iid = `t${s.nextIid++}`;
      s.cards[iid] = { iid, cardId, owner: 0, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
      s.players[0].zones.deck.unshift(iid);
      new Ctx(s, r).moveCard(iid, zone);
      return iid;
    };
    const c = add(meta.id, 'battle');
    for (let i = 0; i < 6; i++) add(C.vanilla.id, 'mana');
    expect(keywords(s, r, c).unblockable).toBeFalsy();
    add(C.vanilla.id, 'mana');
    expect(keywords(s, r, c).unblockable).toBe(true);
  });

  it('ウェーブストライカー：他に2体以上いる時だけ、印の付いた能力を得る', () => {
    const p = parseAbilityText('ウェーブストライカー（「ウェーブストライカー」を持つクリーチャーが他に２体以上あれば、このクリーチャーに次のw能力を与える）\n\nw自分のクリーチャーすべてのパワーを+5000し、「ブロッカー」と「W・ブレイカー」を与える。', 'creature');
    expect(p.manualLines).toHaveLength(0);
    expect(p.keywords.waveStriker).toBe(true);
    expect(p.statics).toHaveLength(2);
    expect(p.statics[0].condition).toEqual({ type: 'compare', left: { who: 'any', zone: 'battle', filter: { hasKeyword: 'waveStriker', excludeSelf: true } }, op: '>=', right: 2 });
  });

  it('知らない能力語でも「能力語：本文」の本文が読めれば使う。補足説明に条件がある行は読まない', () => {
    const civil = parseAbilityText('シビルカウント３：自分の火のクリーチャーまたは火のタマシードが合計３つ以上あれば、このクリーチャーは「スピードアタッカー」を得る。', 'creature');
    expect(civil.manualLines).toHaveLength(0);
    expect(civil.statics[0]).toMatchObject({ type: 'grantKeyword', keywords: { speedAttacker: true }, condition: { type: 'compare', left: { withPermanents: true } } });
    expect(parseAbilityText('バラバラエティ３：自分のクリーチャーすべてに「スピードアタッカー」を与える。（コストが異なる自分のエレメントが３つ以上あれば、このクリーチャーにこの能力を与える）', 'creature').manualLines).toHaveLength(1);
  });

  it('「カードが自分のシールドゾーンを離れた時」「「EXライフ」シールドが離れた時」', () => {
    expect(parseAbilityText('オシオキムーン：カードが自分のシールドゾーンを離れた時、相手は自身のアンタップしているクリーチャーを１体選び、破壊する。', 'creature').abilities[0]).toMatchObject({ when: 'onShieldLeft', who: 'self' });
    const ex = parseAbilityText('このクリーチャーが出た時またはこのクリーチャーの「EXライフ」シールドが離れた時、カードを１枚引く。', 'creature');
    expect(ex.abilities.map((a) => a.when)).toEqual(['onSummon', 'onExLifeLeft']);
    // エンジン：シールドが離れると誘発する
    const card = mk('m-101', ['カードが自分のシールドゾーンを離れた時、カードを１枚引く。']);
    const r = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), card]);
    const s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r);
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId: card.id, owner: 0, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[0].zones.deck.unshift(iid);
    const ctx = new Ctx(s, r);
    ctx.moveCard(iid, 'battle');
    const hand = s.players[0].zones.hand.length;
    ctx.moveCard(s.players[0].zones.shield[0], 'graveyard');
    ctx.run();
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
  });
});
