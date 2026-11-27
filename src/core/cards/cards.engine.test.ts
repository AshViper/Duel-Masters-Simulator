// 読み取った効果がエンジンで動くこと：拡張分・特殊な処理・手動だった能力・進化・タマシード・ドキンダム・魔導具
// 元は別々のテストファイル。ファイルごとに describe（元のファイル名）で包んであるので、補助関数（mk・put・reg など）は同じ名前でもぶつからない
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { getLegalActions } from '../engine/legal';
import { altCost, attackSwapCandidates, attackTargets, battleCards, blockersFor, breakerCount, canAttackWith, canPlay, canPlayAlt, canSummonFromZone, def, effectiveCost, evolutionBases, evolveSourceCandidates, fushigiCandidates, hyperizeCandidates, isIgnored, keywords, playRestriction, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { setUserLineDefs, validateLineDefs } from './lineDefs';
import { applyParsedEffects, convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

// ════════════════════════ engineMore.test.ts ════════════════════════
describe('engineMore', () => {
// 効果エンジンの拡張分のテスト：「〜ではない」、シンカパワー、メテオバーン、サバイバー、マジボンバー、
// 「〜1体につき」、行き先がいくつもある山札めくり、鬼タイム、「そうしたら」の続き
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
  numberBounce: mk('m-90', ['このクリーチャーがバトルゾーンに出た時、数字を１つ選ぶ。その数字と同じコストを持つ相手のクリーチャーをすべて、持ち主の手札に戻す。']),
  numberLock: spell('m-91', ['数字を１つ選ぶ。次の自分のターンのはじめまで、相手はその数字と同じコストを持つクリーチャーと呪文を召喚したり唱えたりできない。']),
  tapOrCast: spell('m-92', ['次のうちいずれかひとつを選ぶ。\n▶相手のクリーチャーをすべてタップする。\n▶カードを１枚引く。その後、光または水のコスト５以下の呪文を１枚、コストを支払わずに自分の手札から唱えてもよい。']),
  spell5: mk('m-93', [], { type: '呪文', power: '', cost: '5' }),
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

  it('「その数字と同じコストを持つ相手のクリーチャーをすべて、持ち主の手札に戻す」', () => {
    let s = newGame();
    const one = put(s, 1, C.vanilla.id, 'battle');
    const five = put(s, 1, C.cost5.id, 'battle');
    const mine = put(s, 0, C.cost5.id, 'battle');
    expect(C.numberBounce.support).toBe('full');
    const b = put(s, 0, C.numberBounce.id, 'hand');
    mana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: b });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, selected: ['5'] });
    expect(s.cards[five].zone).toBe('hand');
    expect(s.cards[one].zone).toBe('battle');
    expect(s.cards[mine].zone).toBe('battle');
  });

  it('「相手はその数字と同じコストを持つクリーチャーと呪文を召喚したり唱えたりできない」', () => {
    let s = newGame();
    expect(C.numberLock.support).toBe('full');
    s = cast(s, C.numberLock.id).s;
    s = act(s, { type: 'RESPOND', player: 0, selected: ['5'] });
    const c5 = put(s, 1, C.cost5.id, 'hand');
    const sp = put(s, 1, C.spell5.id, 'hand');
    const c1 = put(s, 1, C.vanilla.id, 'hand');
    // コスト5のクリーチャーも呪文も使えない。コスト1や自分のカードは使える
    expect(playRestriction(s, reg, 1, c5)).toBeTruthy();
    expect(playRestriction(s, reg, 1, sp)).toBeTruthy();
    expect(playRestriction(s, reg, 1, c1)).toBeNull();
    expect(playRestriction(s, reg, 0, put(s, 0, C.cost5.id, 'hand'))).toBeNull();
  });

  it('「次のうちいずれかひとつを選ぶ。▶すべてタップ ▶1枚引いて光または水のコスト5以下の呪文を唱えてもよい」', () => {
    expect(C.tapOrCast.support).toBe('full');
    let s = newGame();
    const o = put(s, 1, C.vanilla.id, 'battle');
    s = cast(s, C.tapOrCast.id).s;
    s = act(s, { type: 'RESPOND', player: 0, selected: ['0'] });
    expect(s.cards[o].tapped).toBe(true);
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

  it('知らない能力語でも「能力語：本文」の本文が読めれば使う。補足説明の条件は、本文の条件にする', () => {
    const civil = parseAbilityText('シビルカウント３：自分の火のクリーチャーまたは火のタマシードが合計３つ以上あれば、このクリーチャーは「スピードアタッカー」を得る。', 'creature');
    expect(civil.manualLines).toHaveLength(0);
    expect(civil.statics[0]).toMatchObject({ type: 'grantKeyword', keywords: { speedAttacker: true }, condition: { type: 'compare', left: { withPermanents: true } } });
    const bara = parseAbilityText('バラバラエティ３：自分のクリーチャーすべてに「スピードアタッカー」を与える。（コストが異なる自分のエレメントが３つ以上あれば、このクリーチャーにこの能力を与える）', 'creature');
    expect(bara.manualLines).toHaveLength(0);
    expect(bara.statics[0]).toMatchObject({ type: 'grantKeyword', keywords: { speedAttacker: true }, condition: { type: 'compare', left: { distinctCost: true, withPermanents: true }, op: '>=', right: 3 } });
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

describe('ブレイカーの変種', () => {
  it('マスター・W・ブレイカー：出たターン、各ブレイクの前に相手のクリーチャーを1体破壊する', () => {
    const mw = mk('m-110', ['スピードアタッカー', 'マスター・W・ブレイカー（このクリーチャーはシールドを２つブレイクする。このクリーチャーがバトルゾーンに出たターン、各ブレイクの前に、相手のクリーチャーを１体破壊する）']);
    expect(mw.support).toBe('full');
    expect(mw.keywords?.breaker).toBe(2);
    const r = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), mw]);
    let s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r);
    const add = (p: PlayerId, cardId: string, zone: ZoneName) => {
      const iid = `t${s.nextIid++}`;
      s.cards[iid] = { iid, cardId, owner: p, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
      s.players[p].zones.deck.unshift(iid);
      new Ctx(s, r).moveCard(iid, zone);
      return iid;
    };
    const a = add(1, C.vanilla.id, 'battle');
    const b = add(1, C.vanilla.id, 'battle');
    const c = add(0, mw.id, 'battle');
    const shields = s.players[1].zones.shield.length;
    const step = (x: GameState, act2: Action) => applyAction(x, act2, r).state;
    s = step(s, { type: 'ATTACK', player: 0, attacker: c, target: { kind: 'player' } });
    for (let i = 0; i < 12 && s.pending; i++) {
      const p = s.pending;
      s = step(s, p.kind === 'selectCards' ? { type: 'RESPOND', player: p.player, selected: p.candidates.slice(0, Math.max(1, p.min)) } : { type: 'RESPOND', player: p.player, selected: [], accept: false });
    }
    expect(s.players[1].zones.shield.length).toBe(shields - 2);
    expect([s.cards[a].zone, s.cards[b].zone]).toEqual(['graveyard', 'graveyard']);
  });

  it('クルー・ブレイカー：自分の他のハンター1体につき、もう1枚ブレイクする', () => {
    const crew = mk('m-111', ['クルー・ブレイカー：ハンター（このクリーチャーは、バトルゾーンにある自分の他のハンター１体につき、シールドをさらにもう１枚ブレイクする）']);
    const hunter = mk('m-112', [], { race: 'ハンター' });
    expect(crew.support).toBe('full');
    const r = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), crew, hunter]);
    const s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r);
    const add = (cardId: string) => {
      const iid = `t${s.nextIid++}`;
      s.cards[iid] = { iid, cardId, owner: 0, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
      s.players[0].zones.deck.unshift(iid);
      new Ctx(s, r).moveCard(iid, 'battle');
      return iid;
    };
    const c = add(crew.id);
    expect(breakerCount(s, r, c)).toBe(1);
    add(hunter.id);
    add(hunter.id);
    expect(breakerCount(s, r, c)).toBe(3);
  });

  it('G・ブレイカー：相手のシールドをすべてブレイクし、攻撃の後に自分のシールドもすべてブレイクする', () => {
    const p = parseAbilityText('G・ブレイカー（このクリーチャーは、相手のシールドをすべてブレイクし、その攻撃の後、自分のシールドをすべてブレイクする）', 'creature');
    expect(p.manualLines).toHaveLength(0);
    expect(p.keywords.breaker).toBe(99);
    expect(p.abilities).toEqual([{ when: 'onAttackEnd', effects: [{ type: 'breakShields', count: 99, self: true }] }]);
  });
});

describe('補足説明から読む能力語（続き）', () => {
  it('フリーズ：相手プレイヤーを攻撃してブロックされなかった時、タップして次のターンのはじめにアンタップさせない', () => {
    const p = parseAbilityText('フリーズ（このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時、バトルゾーンにある相手のクリーチャーを１体選び、タップしてもよい。そのクリーチャーは、次の相手のターンのはじめにアンタップされない）', 'creature');
    expect(p.manualLines).toHaveLength(0);
    expect(p.abilities[0].when).toBe('onUnblocked');
    const card = mk('m-120', ['このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時、カードを１枚引く。']);
    const r = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), card]);
    let s = createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, r);
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId: card.id, owner: 0, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[0].zones.deck.unshift(iid);
    new Ctx(s, r).moveCard(iid, 'battle');
    s.cards[iid].enteredTurn = 0;
    const hand = s.players[0].zones.hand.length;
    s = applyAction(s, { type: 'ATTACK', player: 0, attacker: iid, target: { kind: 'player' } }, r).state;
    for (let i = 0; i < 6 && s.pending; i++) {
      const p2 = s.pending;
      s = applyAction(s, p2.kind === 'selectCards' ? { type: 'RESPOND', player: p2.player, selected: p2.candidates.slice(0, Math.max(1, p2.min)) } : { type: 'RESPOND', player: p2.player, selected: [], accept: false }, r).state;
    }
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
  });

  it('リサイタル・ラスト・バースト・∞パワーアタッカー', () => {
    const rec = parseAbilityText('リサイタル５ （この呪文を墓地からコスト５を支払って唱えてもよい。そうして唱えた後、墓地に置くかわりに自分の山札の一番下に置く）', 'spell');
    expect(rec.altPlays).toEqual([{ name: '墓地からコスト5で唱える', cost: 5, from: 'graveyard', spellAfter: 'deckBottom' }]);
    const last = parseAbilityText('ラスト・バースト（このクリーチャーが破壊された時、このカードの呪文側をコストを支払わずに唱えてもよい）', 'creature');
    expect(last.abilities).toEqual([{ when: 'onDestroyed', optional: true, effects: [{ type: 'castSelfTwin' }] }]);
    expect(parseAbilityText('∞パワーアタッカー（攻撃中、このクリーチャーのパワーは無限大になる）', 'creature').keywords.powerAttacker).toBeGreaterThan(1e8);
  });
});
});

// ════════════════════════ mechanics.test.ts ════════════════════════
describe('mechanics', () => {
// 侵略・革命チェンジ・NEO進化など、能力テキストから読み取った特殊な処理がエンジンで動くことのテスト
const base = { packName: '(T 1/1)', imageUrl: '', civilization: '火', rarity: 'C', mana: '1', illustrator: '', flavor: '', cost: '1' };
const mk = (id: string, name: string, abilities: string[], o: { type?: string; power?: string; race?: string; cost?: string } = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, type: o.type ?? 'クリーチャー', power: o.power ?? '3000', race: o.race ?? 'テスト', cost: o.cost ?? '1', abilities }] });

const C = {
  dragon: mk('m-1', '火竜', [], { power: '6000', race: 'ドラゴン', cost: '6' }),
  rev: mk('m-2', '革命竜', ['革命チェンジ：火のコスト5以上のドラゴン（…）', 'このクリーチャーが出た時、カードを1枚引く。'], { power: '9000', race: 'ドラゴン', cost: '7' }),
  inv: mk('m-3', '侵略者', ['進化：自分の火のクリーチャー1体の上に置く。', '侵略：火のクリーチャー（…）'], { type: '進化クリーチャー', power: '8000' }),
  neo: mk('m-4', 'NEO', ['NEO進化：火のクリーチャー1体の上に置いてもよい。（…）'], { type: 'NEOクリーチャー', power: '5000' }),
  fighter: mk('m-5', '格闘', ['このクリーチャーが出た時、相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。'], { power: '5000' }),
  modes: mk('m-6', '二択', ['次の中から2回選ぶ。\n▶カードを1枚引く。\n▶相手の手札を1枚見ないで選び、捨てさせる。'], { type: '呪文', power: '' }),
  freeze: mk('m-7', '凍結', ['相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまで、そのクリーチャーは攻撃もブロックもできない。'], { type: '呪文', power: '' }),
  kill: mk('m-8', '破壊', ['相手のクリーチャーを1体選び、破壊する。'], { type: '呪文', power: '' }),
  toMana: mk('m-9', 'マナ還り', ['このクリーチャーが破壊される時、墓地に置くかわりに自分のマナゾーンに置く。']),
  escape: mk('m-10', '逃げ足', ['エスケープ（このクリーチャーが破壊される時、かわりに自分のシールドを1つ手札に加えてもよい）']),
  guard: mk('m-11', '守り手', ['ガードマン（…）']),
  hyper: convertOfficialCard({
    id: 'm-12',
    detailUrl: '',
    faces: [
      { ...base, name: 'ハイパー犬', type: 'クリーチャー', power: '3000', race: 'テスト', abilities: ['ハイパー化：自分の他のクリーチャーを１体タップする。（…）'] },
      { ...base, name: 'ハイパー犬', type: 'クリーチャー', power: '3000', race: 'テスト', abilities: ['ハイパー化：自分の他のクリーチャーを１体タップする。（…）', 'スピードアタッカー', 'W・ブレイカー'] },
    ],
  }),
  cmd: mk('m-14', '火の指揮官', [], { race: 'ソニック・コマンド', cost: '3' }),
  sDead: mk('m-15', 'S級不死', ['S級侵略[不死]：火のコマンド（自分の火のコマンドが攻撃する時、自分の手札または墓地にあるこのクリーチャーをその上に重ねてもよい）'], { type: '進化クリーチャー', race: 'ソニック・コマンド/S級侵略者', power: '9000' }),
  sSpace: mk('m-16', 'S級宇宙', ['S級侵略［宇宙］：火のコマンド（自分の火のコマンドが攻撃する時、バトルゾーンまたは自分の手札にあるこのカードをその上に重ねてもよい）'], { type: '進化クリーチャー', race: 'S級侵略者', power: '9000' }),
  sSpeed: mk('m-17', 'S級轟速', ['S級侵略[轟速]：火のコマンド'], { type: '進化クリーチャー', race: 'S級侵略者', power: '9000' }),
  sPrimal: mk('m-18', 'S級原始', ['S級侵略[原始]：火のコスト3のクリーチャー（自分の火のコスト3のクリーチャーが攻撃する時、自分の手札またはマナゾーンにあるこのクリーチャーをその上に重ねてもよい）'], { type: '進化クリーチャー', race: 'S級侵略者', power: '9000' }),
  peeker: mk('m-13', '覗き見', ['相手がそのターン２枚目以降のカードを引いた時、相手は自身の手札を１枚選び、捨てる。', '相手はカードをマナゾーンに置く時、タップして置く。']),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const fireMana = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) put(s, 0, 'S01-031', 'mana');
};

describe('特殊な処理の読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.name, c.support]).toEqual([c.name, 'full']);
    expect(C.rev.attackSwap).toEqual({ kind: 'revolution', filter: { civilization: 'fire', minCost: 5, race: 'ドラゴン' } });
    expect(C.inv.attackSwap).toEqual({ kind: 'invasion', filter: { civilization: 'fire' } });
    expect(C.neo.neoEvolution).toEqual({ civilization: 'fire' });
  });

  it('S級侵略：補足説明（なければ種類名）から使えるゾーンを読む', () => {
    expect(C.sDead.attackSwap).toMatchObject({ kind: 'invasion', zones: ['graveyard'], filter: { civilization: 'fire', race: 'コマンド' } });
    expect(C.sSpace.attackSwap).toMatchObject({ zones: ['battle'], battleCardOnly: true });
    expect(C.sSpeed.attackSwap).toMatchObject({ zones: ['graveyard', 'battle'] });
    expect(C.sSpeed.attackSwap?.battleCardOnly).toBeUndefined();
    expect(C.sPrimal.attackSwap).toMatchObject({ zones: ['mana'], filter: { civilization: 'fire', minCost: 3, maxCost: 3 } });
    // 種類が分からず補足説明もなければ手動
    expect(parseAbilityText('S級侵略[謎]：火のコマンド', 'creature').manualLines).toHaveLength(1);
  });

  it('いろいろな書き方', () => {
    const cr = (t: string) => parseAbilityText(t, 'creature');
    expect(cr('革命チェンジ：光または自然の、パワー8000以上のクリーチャー').manualLines).toEqual([]);
    expect(cr('NEO進化：水、闇、または火のクリーチャー1体の上に置いてもよい。').neoEvolution).toEqual({ civilizations: ['water', 'darkness', 'fire'] });
    expect(cr('NEO進化：ジョーカーズまたはレクスターズの、クリーチャー1体の上に置いてもよい。').neoEvolution).toEqual({ races: ['ジョーカーズ', 'レクスターズ'] });
    expect(cr('このクリーチャーをバトルゾーンに出した時、カードを1枚引く。').abilities[0].when).toBe('onSummon');
    expect(cr('このクリーチャーは攻撃することができない。').keywords).toEqual({ cannotAttack: true });
    expect(cr('このクリーチャーが攻撃する時、相手とガチンコ・ジャッジする。自分が勝ったら、カードを1枚引く。').abilities[0].effects).toEqual([
      { type: 'gachinko', then: [{ type: 'draw', count: 1 }] },
    ]);
    expect(cr('このクリーチャーが攻撃する時、自分の山札の上から1枚を表向きにする。それがドラゴンなら出す。それ以外なら山札の下に置く。').abilities[0].effects).toEqual([
      { type: 'lookAtTop', count: 1, pickCount: 1, pickFilter: { race: 'ドラゴン' }, pickTo: 'battle', restTo: 'deckBottom', pickAll: true },
    ]);
    expect(cr('このクリーチャーが出た時、自分の山札の上から4枚を表向きにする。その中から好きな数のクリーチャーを出し、残りをマナゾーンに置く。').abilities[0].effects[0]).toMatchObject({
      type: 'lookAtTop',
      pickCount: 4,
      pickFilter: { cardType: 'creature' },
      pickTo: 'battle',
      restTo: 'mana',
    });
    expect(parseAbilityText('次の自分のターンのはじめまで、相手はコスト5以下の呪文を唱えられない。', 'spell').abilities[0].effects).toEqual([
      { type: 'turnStatic', static: { type: 'cannotCast', who: 'opponent', filter: { maxCost: 5 } }, untilNextTurn: true },
    ]);
  });
});

describe('特殊な処理がエンジンで動く', () => {
  it('革命チェンジ：攻撃したクリーチャーを手札に戻し、手札のクリーチャーを出して攻撃を続ける', () => {
    let s = newGame();
    const dragon = put(s, 0, 'dm:m-1', 'battle', true);
    const rev = put(s, 0, 'dm:m-2', 'hand');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: dragon, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, candidates: [rev], min: 0, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [rev] });
    expect(s.cards[dragon].zone).toBe('hand');
    expect(s.cards[rev]).toMatchObject({ zone: 'battle', tapped: true });
    // 出た時の能力で1枚引いた（手札：革命竜が出て、火竜が戻り、1枚引く）
    expect(s.players[0].zones.hand).toHaveLength(hand + 1);
    expect(s.combat?.attacker ?? rev).toBe(rev);
  });

  it('侵略：攻撃したクリーチャーの上に重ねて攻撃を続ける', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-031', 'battle', true);
    const inv = put(s, 0, 'dm:m-3', 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, selected: [inv] });
    expect(s.cards[inv]).toMatchObject({ zone: 'battle', tapped: true, under: [a] });
  });

  it('S級侵略[不死]：墓地から攻撃中のクリーチャーの上に重ねる', () => {
    let s = newGame();
    const a = put(s, 0, 'dm:m-14', 'battle', true);
    const dead = put(s, 0, 'dm:m-15', 'graveyard');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [dead] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [dead] });
    expect(s.cards[dead]).toMatchObject({ zone: 'battle', tapped: true, under: [a] });
    expect(s.players[0].zones.battle).toEqual([dead]);
  });

  it('S級侵略[原始]：マナゾーンから重ねる', () => {
    let s = newGame();
    const a = put(s, 0, 'dm:m-14', 'battle', true);
    const primal = put(s, 0, 'dm:m-18', 'mana');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, selected: [primal] });
    expect(s.cards[primal]).toMatchObject({ zone: 'battle', under: [a] });
    expect(s.players[0].zones.mana).not.toContain(primal);
  });

  it('S級侵略[宇宙]：バトルゾーンからこのカードだけ移す（下のカードは残る）', () => {
    let s = newGame();
    const a = put(s, 0, 'dm:m-14', 'battle', true);
    const u = put(s, 0, 'S01-031', 'battle', true);
    const space = put(s, 0, 'dm:m-16', 'battle', true);
    const bz = s.players[0].zones.battle;
    bz.splice(bz.indexOf(u), 1);
    s.cards[space].under = [u];
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ candidates: [space] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [space] });
    expect(s.cards[space]).toMatchObject({ zone: 'battle', tapped: true, under: [a] });
    expect([...s.players[0].zones.battle].sort()).toEqual([space, u].sort());
    expect(s.cards[u].under).toEqual([]);
  });

  it('S級侵略[轟速]：バトルゾーンから下のカードごと移す', () => {
    let s = newGame();
    const a = put(s, 0, 'dm:m-14', 'battle', true);
    const u = put(s, 0, 'S01-031', 'battle', true);
    const speed = put(s, 0, 'dm:m-17', 'battle', true);
    const bz = s.players[0].zones.battle;
    bz.splice(bz.indexOf(u), 1);
    s.cards[speed].under = [u];
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, selected: [speed] });
    expect(s.cards[speed]).toMatchObject({ zone: 'battle', tapped: true, under: [u, a] });
    expect(s.players[0].zones.battle).toEqual([speed]);
  });

  it('S級侵略：攻撃する時に墓地になかったカードは使えない。条件に合わない攻撃では使えない', () => {
    const s = newGame();
    const a = put(s, 0, 'dm:m-14', 'battle', true);
    const dead = put(s, 0, 'dm:m-15', 'graveyard');
    s.combat = { attacker: a, attackingPlayer: 0, target: { kind: 'player' }, sClassEligible: [] };
    expect(attackSwapCandidates(s, reg, 0, a)).toEqual([]);
    s.combat.sClassEligible = [dead];
    expect(attackSwapCandidates(s, reg, 0, a)).toEqual([dead]);
    const plain = put(s, 0, 'S01-031', 'battle', true);
    expect(attackSwapCandidates(s, reg, 0, plain)).toEqual([]);
  });

  it('使わないことも選べる', () => {
    let s = newGame();
    const dragon = put(s, 0, 'dm:m-1', 'battle', true);
    put(s, 0, 'dm:m-2', 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: dragon, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, selected: [] });
    expect(s.cards[dragon].zone).toBe('battle');
  });

  it('NEO進化：重ねて召喚すると召喚酔いしない。重ねずに召喚もできる', () => {
    let s = newGame();
    const b = put(s, 0, 'S01-031', 'battle');
    const neo = put(s, 0, 'dm:m-4', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: neo, evolveOn: b });
    expect(s.cards[neo].under).toEqual([b]);
    expect(canAttackWith(s, reg, 0, neo)).toBe(true);

    s = newGame();
    put(s, 0, 'S01-031', 'battle');
    const neo2 = put(s, 0, 'dm:m-4', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: neo2 });
    expect(s.cards[neo2]).toMatchObject({ zone: 'battle', under: [] });
    expect(canAttackWith(s, reg, 0, neo2)).toBe(false);
  });

  it('出た時にバトルさせる', () => {
    let s = newGame();
    const weak = put(s, 1, 'S01-032', 'battle'); // 3000
    const f = put(s, 0, 'dm:m-5', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: f });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[weak].zone).toBe('graveyard');
    expect(s.cards[f].zone).toBe('battle');
  });

  it('次の中から2回選ぶ（同じものは選べない）', () => {
    let s = newGame();
    const sp = put(s, 0, 'dm:m-6', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['カードを1枚引く', '相手の手札を1枚見ないで選び、捨てさせる'] });
    s = act(s, { type: 'RESPOND', player: 0, selected: ['0'] });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['相手の手札を1枚見ないで選び、捨てさせる'] });
  });

  it('次の自分のターンのはじめまで攻撃もブロックもできない', () => {
    let s = newGame();
    const t = put(s, 1, 'S01-032', 'battle');
    const sp = put(s, 0, 'dm:m-7', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(keywords(s, reg, t)).toMatchObject({ cannotAttack: true, cannotBlock: true });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(keywords(s, reg, t).cannotAttack).toBe(true);
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(keywords(s, reg, t).cannotAttack).toBeFalsy();
  });

  it('破壊されるかわりにマナゾーンへ／エスケープ', () => {
    let s = newGame();
    const m = put(s, 1, 'dm:m-9', 'battle');
    let sp = put(s, 0, 'dm:m-8', 'hand');
    fireMana(s, 2);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[m].zone).toBe('mana');

    s = newGame();
    const e = put(s, 1, 'dm:m-10', 'battle');
    sp = put(s, 0, 'dm:m-8', 'hand');
    fireMana(s, 1);
    const shields = s.players[1].zones.shield.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[e].zone).toBe('battle');
    expect(s.players[1].zones.shield).toHaveLength(shields - 1);
  });

  it('ガードマン：他のクリーチャーへの攻撃を引き受けられる', () => {
    let s = newGame();
    const g = put(s, 1, 'dm:m-11', 'battle');
    const victim = put(s, 1, 'S01-032', 'battle');
    s.cards[victim].tapped = true;
    const a = put(s, 0, 'S01-043', 'battle', true);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: victim } });
    expect(s.pending).toMatchObject({ kind: 'block', blockers: [g] });
    // プレイヤーへの攻撃では使えない
    expect(blockersFor({ ...s, combat: { ...s.combat!, target: { kind: 'player' } } }, reg, 1, a)).toEqual([]);
  });

  it('ハイパー化：他のクリーチャーをタップしてハイパーモードの能力を得る。次の自分のターンのはじめに戻る', () => {
    expect(C.hyper.twin).toBeUndefined();
    let s = newGame();
    const h = put(s, 0, 'dm:m-12', 'battle');
    expect(hyperizeCandidates(s, reg, 0, h)).toBeNull(); // タップできる他のクリーチャーがいない
    const a = put(s, 0, 'S01-031', 'battle');
    const b = put(s, 0, 'S01-032', 'battle');
    s = act(s, { type: 'HYPERIZE', player: 0, iid: h });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [a, b], min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [b] });
    expect(s.cards[b].tapped).toBe(true);
    expect(keywords(s, reg, h).speedAttacker).toBe(true);
    expect(breakerCount(s, reg, h)).toBe(2);
    expect(canAttackWith(s, reg, 0, h)).toBe(true);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[h].hyper).toBe(true); // 相手のターン中は続く
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.cards[h].hyper).toBeFalsy();
  });

  it('相手がそのターン2枚目以降を引いた時に捨てさせる・相手のマナはタップして置かれる', () => {
    let s = newGame();
    put(s, 0, 'dm:m-13', 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    // 相手のターン：通常のドローは1枚目なので誘発しない
    expect(s.pending).toBeNull();
    const before = s.players[1].zones.hand.length;
    s = act(s, { type: 'MANUAL_DRAW', player: 1, target: 1 });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1, min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [s.players[1].zones.hand[0]] });
    expect(s.players[1].zones.hand).toHaveLength(before);
    const m = put(s, 1, 'S01-031', 'mana');
    expect(s.cards[m].tapped).toBe(true);
    expect(s.cards[put(s, 0, 'S01-031', 'mana')].tapped).toBe(false);
  });
});

describe('同じ行に並んだ選択肢', () => {
  it('「次のうちいずれかひとつを選ぶ。▼…▼…」', () => {
    const p = parseAbilityText('次のうちいずれかひとつを選ぶ。▼手札を１枚捨て、その後、カードを２枚引く。▼相手のパワー2000以下のクリーチャーを１体破壊する。', 'spell');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities[0].effects[0]).toMatchObject({ type: 'chooseOne', options: [{ effects: [{ type: 'move', to: 'graveyard' }, { type: 'draw', count: 2 }] }, { effects: [{ type: 'destroy' }] }] });
  });
});
});

// ════════════════════════ manualBatch.test.ts ════════════════════════
describe('manualBatch', () => {
// 手動のままだった能力の言い方を自動処理にした分のテスト：
// 可能ならこのクリーチャーを攻撃する／選ぶ、パワー・コストが小さいクリーチャーにブロック・攻撃されない、タップして出す、
// パワード・ブロッカー、「〜とバトル中」、追加ターン中でなければ、ゲームに勝つ、墓地から手札に戻す、次のターンまでのパワー修正など
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities }],
  });
const spell = (id: string, abilities: string[]) => mk(id, abilities, { type: '呪文', power: '' });

const C = {
  vanilla: mk('b-1', [], { power: '5000' }),
  small: mk('b-2', [], { power: '2000' }),
  zenith: mk('b-3', [], { power: '12000', race: 'ゼニス' }),
  blocker: mk('b-4', ['ブロッカー'], { power: '2000' }),
  attackLure: mk('b-10', ['相手のクリーチャーが攻撃するなら、可能ならこのクリーチャーを攻撃する。'], { power: '1000' }),
  pickLure: mk('b-11', ['相手が自分のクリーチャーを選ぶ時、相手は可能ならこのクリーチャーを選ぶ。']),
  noSmallBlock: mk('b-12', ['このクリーチャーは、このクリーチャーよりパワーが小さいクリーチャーにブロックされない。'], { power: '6000' }),
  noSmallAttack: mk('b-13', ['このクリーチャーは、これよりコストが小さいクリーチャーに攻撃されない。'], { cost: '6' }),
  entersTapped: mk('b-14', ['バトルゾーンに置く時、このカードはタップして置く。']),
  mayTapped: mk('b-15', ['このクリーチャーを、タップしてバトルゾーンに出してもよい。']),
  pBlocker: mk('b-16', ['ブロッカー', 'パワード・ブロッカー+8000（ブロック中、このクリーチャーのパワーを+8000する）'], { power: '1000' }),
  vsZenith: mk('b-17', ['ゼニスとバトル中、このクリーチャーのパワーは+11000される。'], { power: '2000' }),
  extraTurn: mk('b-18', ['このクリーチャーが破壊された時、追加ターン中でなければ、このターンの後に自分のターンを追加する。']),
  win: mk('b-19', ['自分のターンのはじめに、バトルゾーンに自分の、コスト８以上のクリーチャーが４体以上あれば、自分はゲームに勝つ。']),
  big: mk('b-20', [], { cost: '8' }),
  backToHand: mk('b-21', ['このクリーチャーが破壊された時、自分の墓地から手札に戻す。']),
  untilNext: spell('b-22', ['自分のクリーチャーを１体アンタップする。次の自分のターンのはじめまで、そのクリーチャーのパワーを+4000し、「ブロッカー」を与える。']),
  eachDraw: spell('b-23', ['各プレイヤーは３枚ずつカードを引いてもよい。']),
  bothDie: mk('b-24', ['相手のクリーチャーが攻撃する時、そのクリーチャーとこのクリーチャーを破壊する。']),
  moreDraw: spell('b-25', ['カードを１枚引く。その後、相手のシールドが２枚以下ならば、カードをさらに２枚引く。']),
  aliens: mk('b-26', ['バトルゾーンにあるエイリアンはすべて「スレイヤー」を得る。']),
  alien: mk('b-27', [], { race: 'エイリアン' }),
  spellLimit: mk('b-28', ['相手は各ターン１回しか呪文を唱えられない。']),
  noBlockTurn: mk('b-29', ['このクリーチャーは、出たターンの間、ブロックされない。']),
  discardOnEnterTurn: mk('b-30', ['このクリーチャーが出たターンに攻撃する時、相手は自身の手札をすべて捨てる。']),
  deckTop: mk('b-31', ['このクリーチャーが破壊される時、かわりに自分の山札の上に置く。']),
  psychicWipe: mk('b-32', ['このクリーチャーをバトルゾーンに出した時、コスト３以下の、サイキック以外のクリーチャーをすべて破壊する。']),
  atkOrBlock: mk('b-33', ['このクリーチャーが攻撃またはブロックした時、クリーチャーを１体、自分の墓地から手札に戻す。']),
  d2: mk('b-40', ['自分のターンの終わりに、カードを１枚引いてもよい。（他のD２フィールドがバトルゾーンに出た時、このD２フィールドを自分の墓地に置く）', 'Dスイッチ：相手のクリーチャーが自分を攻撃する時、このD２フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、水のコスト７以下の呪文を１枚、自分の手札からコストを支払わずに唱えてもよい。'], { type: 'D2フィールド', power: '', civ: '水' }),
  waterSpell: mk('b-41', ['カードを１枚引く。'], { type: '呪文', power: '', civ: '水', cost: '5' }),
  graveCast: spell('b-42', ['自分の墓地にあるコスト７以下の呪文を１枚、コストを支払わずに唱える。唱えた後、墓地に置くかわりに山札の一番下に置く']),
  stUse: mk('b-43', ['このクリーチャーがバトルゾーンに出た時、「S・トリガー」を持つカードを１枚、自分の手札からコストを支払わずに使ってもよい。']),
  stSpell: mk('b-44', ['S・トリガー', 'カードを１枚引く。'], { type: '呪文', power: '', cost: '6' }),
  taxNonLight: mk('b-45', ['相手の光以外のクリーチャーと呪文は、召喚または唱えるコストが１多くなる。']),
  lightDiscount: mk('b-46', ['自分の光のクリーチャーと呪文は、召喚または唱えるコストが１少なくなる。ただし、コストは０以下にならない。']),
  lightC: mk('b-47', [], { civ: '光', cost: '4' }),
  condST: mk('b-48', ['このクリーチャーがバトルゾーンに出た時、自分の墓地にエンジェル・コマンドまたはドラゴンがあれば、「S・トリガー」付きの呪文を１枚、自分の手札からコストを支払わずに唱えてもよい。']),
  dragon: mk('b-49', [], { race: 'アーマード・ドラゴン' }),
  reveal: spell('b-50', ['自分の山札の上から３枚を、すべてのプレイヤーに見せる。その中から光と闇のカードをすべて自分の手札に加え、残りを墓地に置く。']),
  stInline: mk('b-51', ['S・トリガー(この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい)カードを２枚まで引く。その後、自分の手札を１枚捨てる。'], { type: '呪文', power: '' }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName, ready = true): string {
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
const mana = (s: GameState, n: number, p: PlayerId = 0) => {
  for (let i = 0; i < n; i++) put(s, p, C.vanilla.id, 'mana');
};
const play = (s: GameState, cardId: string, p: PlayerId = 0) => {
  const iid = put(s, p, cardId, 'hand');
  mana(s, 1, p);
  return { s: act(s, { type: 'PLAY_CARD', player: p, iid }), iid };
};
/** 攻撃フェイズへ進める */
const toAttack = (s: GameState) => {
  while (s.phase !== 'main') s = act(s, { type: 'NEXT_PHASE', player: s.activePlayer });
  return s;
};

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('言い方の違いを同じ効果として読む', () => {
    expect(C.pickLure.keywords).toMatchObject({ lure: true });
    expect(C.spellLimit.statics).toEqual([{ type: 'playLimit', who: 'opponent', what: 'spell', max: 1 }]);
    expect(C.aliens.statics?.[0]).toMatchObject({ type: 'grantKeyword', keywords: { slayer: true }, appliesTo: { owner: 'any', filter: { race: 'エイリアン' } } });
    expect(C.deckTop.replacements).toEqual([{ event: 'destroyed', subject: 'self', instead: 'toDeckTop' }]);
    expect(C.atkOrBlock.abilities?.map((a) => a.when)).toEqual(['onAttack', 'onBlock']);
    expect(C.discardOnEnterTurn.abilities?.[0]).toMatchObject({ when: 'onAttack', condition: { type: 'selfEnteredThisTurn' } });
    expect(C.noBlockTurn.statics?.[0]).toMatchObject({ keywords: { unblockable: true }, condition: { type: 'selfEnteredThisTurn' } });
    // 「バトルゾーンにある、〜を選び」は両方のプレイヤーのカードの言い方のまま
    expect(parseAbilityText('バトルゾーンにあるクリーチャーを１体選び、持ち主の手札に戻す。', 'spell').manualLines).toEqual([]);
  });
});

describe('攻撃・ブロック', () => {
  it('「可能ならこのクリーチャーを攻撃する」：攻撃できるなら攻撃先はそれだけ', () => {
    const s = newGame();
    const a = put(s, 0, C.vanilla.id, 'battle');
    const lure = put(s, 1, C.attackLure.id, 'battle');
    put(s, 1, C.small.id, 'battle');
    // タップしていない間は攻撃できないので、プレイヤーも攻撃できる
    expect(attackTargets(s, reg, 0, a).some((t) => t.kind === 'player')).toBe(true);
    s.cards[lure].tapped = true;
    expect(attackTargets(s, reg, 0, a)).toEqual([{ kind: 'creature', iid: lure }]);
  });
  it('このクリーチャーよりパワーが小さいクリーチャーにブロックされない', () => {
    const s = newGame();
    const a = put(s, 0, C.noSmallBlock.id, 'battle');
    put(s, 1, C.blocker.id, 'battle');
    expect(blockersFor(s, reg, 1, a)).toEqual([]);
    const s2 = newGame();
    const v = put(s2, 0, C.vanilla.id, 'battle');
    put(s2, 1, C.blocker.id, 'battle');
    expect(blockersFor(s2, reg, 1, v)).toHaveLength(1);
  });
  it('これよりコストが小さいクリーチャーに攻撃されない', () => {
    const s = newGame();
    const a = put(s, 0, C.vanilla.id, 'battle');
    const t = put(s, 1, C.noSmallAttack.id, 'battle');
    s.cards[t].tapped = true;
    expect(attackTargets(s, reg, 0, a).some((x) => x.kind === 'creature')).toBe(false);
  });
  it('パワード・ブロッカー：ブロック中だけパワーが上がり、バトルに勝つ', () => {
    let s = toAttack(newGame());
    const a = put(s, 0, C.vanilla.id, 'battle');
    const b = put(s, 1, C.pBlocker.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'block', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [b] });
    expect(s.cards[a].zone).toBe('graveyard');
    expect(s.cards[b].zone).toBe('battle');
  });
  it('「ゼニスとバトル中」：相手がゼニスの時だけパワーが上がる', () => {
    let s = toAttack(newGame());
    const a = put(s, 0, C.vsZenith.id, 'battle');
    const z = put(s, 1, C.zenith.id, 'battle');
    s.cards[z].tapped = true;
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: z } });
    while (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.cards[z].zone).toBe('graveyard');
    expect(power(s, reg, a)).toBe(2000);
  });
});

describe('出る時・離れる時', () => {
  it('バトルゾーンに置く時、タップして置く', () => {
    const s = newGame();
    const i = put(s, 0, C.entersTapped.id, 'battle');
    expect(s.cards[i].tapped).toBe(true);
  });
  it('「タップして出してもよい」：出た時にタップするかを選ぶ', () => {
    let { s, iid } = play(newGame(), C.mayTapped.id);
    expect(s.pending?.kind).toBe('confirm');
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[iid].tapped).toBe(true);
  });
  it('「破壊された時、自分の墓地から手札に戻す」', () => {
    let s = newGame();
    const i = put(s, 1, C.backToHand.id, 'battle');
    s = play(s, C.psychicWipe.id).s;
    expect(s.cards[i].zone).toBe('hand');
  });
  it('破壊される時、かわりに山札の上に置く', () => {
    let s = newGame();
    const i = put(s, 1, C.deckTop.id, 'battle');
    s = play(s, C.psychicWipe.id).s;
    expect(s.cards[i].zone).toBe('deck');
    expect(s.players[1].zones.deck.at(-1)).toBe(i);
  });
});

describe('呪文・その他', () => {
  it('次の自分のターンのはじめまで、パワー+4000と「ブロッカー」', () => {
    let s = newGame();
    const c = put(s, 0, C.small.id, 'battle');
    s.cards[c].tapped = true;
    s = play(s, C.untilNext.id).s;
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [c] });
    expect(s.cards[c].tapped).toBe(false);
    expect(power(s, reg, c)).toBe(6000);
    expect(keywords(s, reg, c).blocker).toBe(true);
    // 相手のターンでも続き、次の自分のターンのはじめに終わる
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(power(s, reg, c)).toBe(6000);
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(power(s, reg, c)).toBe(2000);
  });
  it('各プレイヤーは3枚ずつ引いてもよい：自分と相手がそれぞれ選ぶ', () => {
    let s = newGame();
    const h0 = s.players[0].zones.hand.length;
    const h1 = s.players[1].zones.hand.length;
    s = play(s, C.eachDraw.id).s;
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toMatchObject({ player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: false });
    expect(s.players[0].zones.hand.length).toBe(h0 + 3);
    expect(s.players[1].zones.hand.length).toBe(h1);
  });
  it('「相手のシールドが2枚以下ならば、カードをさらに2枚引く」', () => {
    let s = newGame();
    while (s.players[1].zones.shield.length > 2) new Ctx(s, reg).moveCard(s.players[1].zones.shield[0], 'graveyard');
    const h0 = s.players[0].zones.hand.length;
    s = play(s, C.moreDraw.id).s;
    expect(s.players[0].zones.hand.length).toBe(h0 + 3);
  });
  it('サイキック以外のコスト3以下のクリーチャーをすべて破壊する', () => {
    let s = newGame();
    const o = put(s, 1, C.small.id, 'battle');
    s = play(s, C.psychicWipe.id).s;
    expect(s.cards[o].zone).toBe('graveyard');
  });
  it('自分のターンのはじめに条件を満たせばゲームに勝つ', () => {
    let s = newGame();
    put(s, 0, C.win.id, 'battle');
    for (let i = 0; i < 4; i++) put(s, 0, C.big.id, 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.gameOverReason).toBeTruthy();
    expect(s.winner).toBe(0);
  });
});

describe('D2フィールド・コストを支払わずに使う・コストの増減', () => {
  it('D2フィールド：ターンの終わりのドローと、相手の攻撃でDスイッチ', () => {
    expect(C.d2.support).toBe('full');
    expect(C.d2.abilities?.map((a) => a.when)).toEqual(['onTurnEnd', 'onOtherAttackPlayer']);
    let s = newGame();
    const f = put(s, 0, C.d2.id, 'battle');
    const sp = put(s, 0, C.waterSpell.id, 'hand');
    s = act(s, { type: 'END_TURN', player: 0 });
    // 自分のターンの終わりのドローは聞かれる
    while (s.pending?.kind === 'confirm' && s.pending.player === 0) s = act(s, { type: 'RESPOND', player: 0, accept: false });
    s = toAttack(s);
    const a = put(s, 1, C.vanilla.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 1, attacker: a, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    // 唱える呪文を選ぶ（候補が1枚なら確認だけのこともある）
    for (let i = 0; i < 4 && s.pending && s.pending.player === 0; i++) {
      s = s.pending.kind === 'selectCards' ? act(s, { type: 'RESPOND', player: 0, selected: [sp] }) : act(s, { type: 'RESPOND', player: 0, accept: true });
    }
    expect(s.cards[sp].zone).toBe('graveyard');
    expect(s.cards[f].dSwitched).toBe(true);
  });
  it('墓地の呪文をコストを支払わずに唱え、山札の一番下に置く', () => {
    let s = newGame();
    const g = put(s, 0, C.waterSpell.id, 'graveyard');
    s = play(s, C.graveCast.id).s;
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [g] });
    expect(s.cards[g].zone).toBe('deck');
    expect(s.players[0].zones.deck[0]).toBe(g);
  });
  it('「S・トリガー」を持つカードを手札からコストを支払わずに使ってもよい', () => {
    let s = newGame();
    const st = put(s, 0, C.stSpell.id, 'hand');
    s = play(s, C.stUse.id).s;
    for (let i = 0; i < 4 && s.pending; i++) {
      s = s.pending.kind === 'selectCards' ? act(s, { type: 'RESPOND', player: 0, selected: [st] }) : act(s, { type: 'RESPOND', player: 0, accept: true });
    }
    expect(s.cards[st].zone).toBe('graveyard');
  });
  it('光以外のコストが1多く、自分の光のコストが1少なくなる', () => {
    const s = newGame();
    put(s, 0, C.taxNonLight.id, 'battle');
    put(s, 0, C.lightDiscount.id, 'battle');
    const fire = put(s, 1, C.vanilla.id, 'hand');
    const lightOpp = put(s, 1, C.lightC.id, 'hand');
    const lightMine = put(s, 0, C.lightC.id, 'hand');
    expect(effectiveCost(s, reg, 1, fire)).toBe(2);
    expect(effectiveCost(s, reg, 1, lightOpp)).toBe(4);
    expect(effectiveCost(s, reg, 0, lightMine)).toBe(3);
  });
  it('墓地にドラゴンがあれば「S・トリガー」付きの呪文を唱えてもよい', () => {
    expect(C.condST.support).toBe('full');
    let s = newGame();
    put(s, 0, C.stSpell.id, 'hand');
    s = play(s, C.condST.id).s;
    expect(s.pending).toBeFalsy();
    let s2 = newGame();
    put(s2, 0, C.dragon.id, 'graveyard');
    put(s2, 0, C.stSpell.id, 'hand');
    s2 = play(s2, C.condST.id).s;
    expect(s2.pending).toBeTruthy();
  });
  it('山札の上から3枚を見せ、光と闇のカードをすべて手札に', () => {
    expect(C.reveal.support).toBe('full');
  });
  it('キーワードと本文が1行に続いていても読む', () => {
    expect(C.stInline.support).toBe('full');
    expect(C.stInline.keywords?.shieldTrigger).toBe(true);
    expect(C.stInline.abilities?.[0].effects.map((e) => e.type)).toEqual(['draw', 'move']);
  });
});
});

// ════════════════════════ evolveSpec.test.ts ════════════════════════
describe('evolveSpec', () => {
// 進化の種類（マナ進化・墓地進化・進化V/GV・デッキ進化・シールド進化・究極進化・スター進化）のテスト
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });
const evo = (id: string, line: string, type = '進化クリーチャー') => mk(id, [line], { type, power: '6000' });

const C = {
  vanilla: mk('e-1', []),
  dark: mk('e-2', [], { civ: '闇' }),
  spell: mk('e-3', ['カードを１枚引く。'], { type: '呪文', power: '' }),
  basicEvo: evo('e-4', '進化：火のクリーチャー１体の上に置く。'),
  mana: evo('e-10', 'マナ進化：自分のマナゾーンにある、火または自然のクリーチャー１体の上に重ねつつ出す。'),
  v: evo('e-11', '進化V：テスト２体の上に置く。'),
  graveGv: evo('e-12', '墓地進化GV：クリーチャーを３体自分の墓地から選び、このクリーチャーをその上に重ねつつ出す。'),
  deck: evo('e-13', 'デッキ進化：自分の山札の上から１枚目を表向きにする。そのカードがクリーチャーなら、このクリーチャーをその上に重ねつつバトルゾーンに出す。クリーチャー以外なら、このクリーチャーを自分の手札に戻す。'),
  shield: evo('e-14', 'シールド進化：自分のシールドを１つ選び、このクリーチャーをその上に重ねつつバトルゾーンに出す。（裏向きのカードは裏向きのまま、見ないで置く）'),
  ultimate: evo('e-15', '究極進化：進化クリーチャー１体の上に置く。'),
  star: evo('e-16', 'スター進化：デモニオ、闇、または自然の、クリーチャー１体の上に置く。（このクリーチャーが離れる時、かわりに一番上のカードが離れる）', 'スター進化クリーチャー'),
  handV: evo('e-17', '手札進化V - 火のクリーチャーを２体自分の手札から選び、このクリーチャーをその上に重ねつつバトルゾーンに出す。'),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);
const play = (iid: string, evolveFrom?: string[]): Action => ({ type: 'PLAY_CARD', player: 0, iid, ...(evolveFrom ? { evolveFrom } : {}) });

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('進化元の指定：どのゾーンから・何枚・どんなカード', () => {
    expect(C.mana.evolveSpec).toEqual({ zones: ['mana'], filter: { civilizations: ['fire', 'nature'], cardType: 'creature' }, count: 1 });
    expect(C.v.evolveSpec).toEqual({ zones: ['battle'], filter: { race: 'テスト' }, count: 2 });
    expect(C.graveGv.evolveSpec).toEqual({ zones: ['graveyard'], filter: { cardType: 'creature' }, count: 3 });
    expect(C.deck.evolveSpec?.deckTop).toEqual({ count: 1, creatureOnly: true });
    expect(C.shield.evolveSpec).toEqual({ zones: ['shield'], count: 1 });
    expect(C.star.evolveSpec?.filter).toEqual({ anyOf: [{ race: 'デモニオ' }, { civilization: 'darkness' }, { civilization: 'nature' }] });
    expect(C.star.replacements).toEqual([{ event: 'leaveBattle', subject: 'self', instead: 'shedTop' }]);
  });
});

describe('エンジンで動く', () => {
  it('マナ進化：マナゾーンのクリーチャーを進化元にして出す', () => {
    let s = newGame();
    const e = put(s, 0, C.mana.id, 'hand');
    const m1 = put(s, 0, C.vanilla.id, 'mana');
    put(s, 0, C.dark.id, 'mana');
    expect(evolveSourceCandidates(s, reg, 0, e)).toEqual([m1]);
    expect(canPlay(s, reg, 0, e)).toBe(true);
    s = act(s, play(e, [m1]));
    expect(s.cards[e].zone).toBe('battle');
    expect(s.cards[e].under).toEqual([m1]);
    expect(s.players[0].zones.mana).not.toContain(m1);
  });

  it('進化V：バトルゾーンの2体を重ねる。1体だけでは出せない', () => {
    let s = newGame();
    const e = put(s, 0, C.v.id, 'hand');
    const a = put(s, 0, C.vanilla.id, 'battle');
    put(s, 0, C.vanilla.id, 'mana');
    expect(canPlay(s, reg, 0, e)).toBe(false);
    const b = put(s, 0, C.dark.id, 'battle');
    expect(applyAction(s, play(e, [a]), reg).error).toBeTruthy();
    s = act(s, play(e, [a, b]));
    expect(s.cards[e].under).toEqual([a, b]);
    expect(s.players[0].zones.battle).toEqual([e]);
  });

  it('墓地進化GV：墓地のクリーチャー3体を進化元にする（CPU 用の合法手にも進化元が入る）', () => {
    let s = newGame();
    const e = put(s, 0, C.graveGv.id, 'hand');
    const g = [C.vanilla.id, C.dark.id, C.vanilla.id].map((id) => put(s, 0, id, 'graveyard'));
    put(s, 0, C.spell.id, 'graveyard');
    put(s, 0, C.vanilla.id, 'mana');
    const legal = getLegalActions(s, reg, 0).find((x) => x.type === 'PLAY_CARD' && x.iid === e);
    expect(legal).toMatchObject({ evolveFrom: g });
    s = act(s, legal!);
    expect(s.cards[e].under).toEqual(g);
    expect(s.players[0].zones.graveyard.filter((x) => g.includes(x))).toEqual([]);
  });

  it('手札進化V：手札のクリーチャー2体を進化元にする（自分自身は進化元にできない）', () => {
    let s = newGame();
    for (const h of [...s.players[0].zones.hand]) new Ctx(s, reg).moveCard(h, 'deck');
    const e = put(s, 0, C.handV.id, 'hand');
    const h1 = put(s, 0, C.vanilla.id, 'hand');
    const h2 = put(s, 0, C.vanilla.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    expect(evolveSourceCandidates(s, reg, 0, e)).toEqual([h1, h2]);
    s = act(s, play(e));
    expect(s.cards[e].under).toEqual([h1, h2]);
    expect(s.players[0].zones.hand).toEqual([]);
  });

  it('デッキ進化：山札の上がクリーチャーなら重ねて出し、そうでなければ手札に残る', () => {
    let s = newGame();
    const top = put(s, 0, C.vanilla.id, 'deck');
    const e = put(s, 0, C.deck.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, play(e));
    expect(s.cards[e].under).toEqual([top]);

    let s2 = newGame();
    put(s2, 0, C.spell.id, 'deck');
    const e2 = put(s2, 0, C.deck.id, 'hand');
    put(s2, 0, C.vanilla.id, 'mana');
    s2 = act(s2, play(e2));
    expect(s2.cards[e2].zone).toBe('hand');
  });

  it('シールド進化：シールドを1つ進化元にする', () => {
    let s = newGame();
    const e = put(s, 0, C.shield.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const sh = s.players[0].zones.shield[0];
    const n = s.players[0].zones.shield.length;
    s = act(s, play(e, [sh]));
    expect(s.cards[e].under).toEqual([sh]);
    expect(s.players[0].zones.shield.length).toBe(n - 1);
  });

  it('究極進化：進化クリーチャーだけを進化元にできる', () => {
    const s = newGame();
    const e = put(s, 0, C.ultimate.id, 'hand');
    put(s, 0, C.vanilla.id, 'battle');
    expect(evolutionBases(s, reg, 0, e)).toEqual([]);
    const ev = put(s, 0, C.basicEvo.id, 'battle');
    expect(evolutionBases(s, reg, 0, e)).toEqual([ev]);
  });

  it('スター進化：離れる時、かわりに一番上のカードだけが離れ、進化元が残る', () => {
    let s = newGame();
    const b = put(s, 0, C.dark.id, 'battle');
    const e = put(s, 0, C.star.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    expect(evolutionBases(s, reg, 0, e)).toEqual([b]);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: e, evolveOn: b });
    expect(s.cards[e].under).toEqual([b]);
    s.queue.push({ kind: 'leave', iid: e, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[e].zone).toBe('graveyard');
    expect(s.players[0].zones.battle).toEqual([b]);
    expect(s.cards[b].under).toEqual([]);
  });
});
});

// ════════════════════════ tamaseed.test.ts ════════════════════════
describe('tamaseed', () => {
// タマシード：呪文でもクリーチャーでもない独自の種類
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '', race: 'テスト', abilities: [] as string[] };
const seed = convertOfficialCard({ id: 't-seed', detailUrl: '', faces: [{ ...base, name: 'テストのタマシード', type: 'タマシード', civilization: '火', cost: '2', power: '' }] });
const creatureSeed = convertOfficialCard({ id: 't-cseed', detailUrl: '', faces: [{ ...base, name: 'クリーチャーのタマシード', type: 'タマシード/クリーチャー', civilization: '火', cost: '2', power: '2000' }] });
const fire = convertOfficialCard({ id: 't-fire', detailUrl: '', faces: [{ ...base, name: '火のマナ', type: 'クリーチャー', civilization: '火', cost: '1', power: '1000' }] });
const reg = buildRegistry([...SAMPLE_CARDS, seed, creatureSeed, fire]);

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  return iid;
}

describe('タマシード', () => {
  it('呪文でもクリーチャーでもない種類として読む（タマシード/クリーチャーはクリーチャー）', () => {
    expect(seed).toMatchObject({ type: 'tamaseed', power: undefined });
    expect(creatureSeed.type).toBe('creature');
    // 以前の版で呪文として保存したタマシードも直す
    expect(applyParsedEffects({ ...seed, type: 'spell' }).type).toBe('tamaseed');
  });

  it('使うとバトルゾーンに残り、クリーチャーとしては数えない', () => {
    let s = createGame({ players: [{ name: 'A', deck: Array(40).fill('S01-043') }, { name: 'B', deck: Array(40).fill('S01-043') }], seed: 1, firstPlayer: 0 }, reg);
    put(s, 0, fire.id, 'mana');
    put(s, 0, fire.id, 'mana');
    const iid = put(s, 0, seed.id, 'hand');
    expect(canPlay(s, reg, 0, iid)).toBe(true);
    const r = applyAction(s, { type: 'PLAY_CARD', player: 0, iid }, reg);
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.cards[iid].zone).toBe('battle');
    expect(battleCards(s, reg, 0)).not.toContain(iid);
  });
});
});

// ════════════════════════ dokindam.test.ts ════════════════════════
describe('dokindam', () => {
// 「ドキンダム」デッキ（侵略・S級侵略・ドキンダムエリア）で手動だった能力のテスト
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type F = { name: string; type: string; race: string; civilization: string; cost: string; power: string; abilities: string[] };
const mk = (id: string, f: F) => convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, ...f }] });

const C = {
  zet: mk('d-zet', { name: '轟速 ザ・ゼット', type: 'クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '4', power: '7000', abilities: ['スピードアタッカー（このクリーチャーは召喚酔いしない）', 'W・ブレイカー（このクリーチャーはシールドを２つブレイクする）', '自分のターンの終わりに、そのターンこのクリーチャーが攻撃していたら、破壊する。'] }),
  mach: mk('d-mach', { name: '轟速 ザ・マッハ', type: 'クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '5', power: '5000', abilities: ['スピードアタッカー', 'このクリーチャーがバトルゾーンに出た時、自分の山札の上から４枚を表向きにする。その中から進化クリーチャーを１体、自分の手札に加えてもよい。残りを好きな順序で山札の一番下に置く。'] }),
  redzone: mk('d-rz', { name: '轟く侵略 レッドゾーン', type: '進化クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '6', power: '12000', abilities: ['進化-自分の火のクリーチャー１体の上に置く。', '侵略-火のコマンド（自分の火のコマンドが攻撃する時、自分の手札にあるこのクリーチャーをその上に重ねてもよい）', 'T・ブレイカー', 'このクリーチャーがバトルゾーンに出た時、一番パワーが大きい相手のクリーチャーをすべて破壊する。'] }),
  redzoneZ: mk('d-rzz', { name: '熱き侵略 レッドゾーンZ', type: '進化クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '6', power: '11000', abilities: ['進化―自分の火のクリーチャー１体の上に置く。', '侵略―火のコマンド（自分の火のコマンドが攻撃する時、自分の手札にあるこのクリーチャーをその上に重ねてもよい）', 'W・ブレイカー', 'このクリーチャーを進化ではないクリーチャーの上に置いた時、相手のシールドをひとつ選び、持ち主の墓地に置く。'] }),
  redzoneX: mk('d-rzx', { name: '禁断の轟速 レッドゾーンX', type: '進化クリーチャー', race: 'ソニック・コマンド/S級侵略者/イニシャルズ', civilization: '闇/火', cost: '6', power: '8000', abilities: ['進化―自分の闇または火のクリーチャー１体の上に置く。', 'S級侵略 [轟速]―闇または火のコマンド（自分の闇または火のコマンドが攻撃する時、自分の手札か墓地、またはバトルゾーンにあるこのクリーチャーをその上に重ねてもよい）', 'W・ブレイカー', 'このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを１体選び、相手はそれに封印をひとつ付ける。（…）'] }),
  kizamu: mk('d-kz', { name: '禁断V キザム', type: 'クリーチャー', race: 'ソニック・コマンド/イニシャルズ', civilization: '闇/火', cost: '7', power: '3000', abilities: ['S・トリガー', 'このクリーチャーがバトルゾーンに出た時、バトルゾーンにある相手のクリーチャーを１体選んでもよい。このクリーチャーとその選んだクリーチャーをバトルさせる。'] }),
  dolhakaba: mk('d-dh', { name: '終断Δ ドルハカバ', type: 'クリーチャー', race: 'ソニック・コマンド/イニシャルズX', civilization: '闇/火', cost: '5', power: '3000', abilities: ['スピードアタッカー', 'バトルゾーンに自分のフィールドがあれば、このクリーチャーを自分の墓地から召喚してもよい。'] }),
  area: mk('d-area', { name: 'Dの禁断 ドキンダムエリア', type: 'D2フィールド', race: '', civilization: '闇', cost: '5', power: '', abilities: ['自分のクリーチャーがバトルゾーンを離れる時、かわりにそのクリーチャーに封印を付ける。（…）（他のD２フィールドがバトルゾーンに出た時、このD２フィールドを自分の墓地に置く）**', 'Dスイッチ：自分のターンのはじめに、このD２フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、自分の封印を６枚まで墓地に置いてもよい。'] }),
  area2: mk('d-area2', { name: '別のD2フィールド', type: 'D2フィールド', race: '', civilization: '闇', cost: '1', power: '', abilities: [] }),
  dark: mk('d-dark', { name: '闇のマナ', type: 'クリーチャー', race: 'テスト', civilization: '闇', cost: '1', power: '1000', abilities: [] }),
  small: mk('d-s', { name: '小型', type: 'クリーチャー', race: 'テスト', civilization: '火', cost: '1', power: '2000', abilities: [] }),
  big: mk('d-b', { name: '大型', type: 'クリーチャー', race: 'テスト', civilization: '自然', cost: '1', power: '9000', abilities: [] }),
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
/** 山札の一番上に置く */
function onTop(s: GameState, player: PlayerId, cardId: string): string {
  const iid = put(s, player, cardId, 'deck');
  const d = s.players[player].zones.deck;
  d.splice(d.indexOf(iid), 1);
  d.push(iid);
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const mana = (s: GameState, p: PlayerId, n: number) => {
  // 闇と火を交互に置く
  for (let i = 0; i < n; i++) put(s, p, i % 2 ? C.small.id : C.dark.id, 'mana');
};
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('デッキのカードはすべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.name, c.support]).toEqual([c.name, 'full']);
    expect(C.area.type).toBe('field');
    expect(C.redzoneX.attackSwap).toMatchObject({ kind: 'invasion', zones: ['graveyard', 'battle'] });
    expect(C.redzone.attackSwap).toMatchObject({ kind: 'invasion' });
  });
});

describe('エンジンで動く', () => {
  it('ザ・ゼット：攻撃したターンの終わりに破壊される（攻撃しなければ残る）', () => {
    let s = newGame();
    const z = put(s, 0, C.zet.id, 'battle');
    const z2 = put(s, 0, C.zet.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: z, target: { kind: 'player' } });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min) : [], accept: false });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[z].zone).toBe('graveyard');
    expect(s.cards[z2].zone).toBe('battle');
  });

  it('レッドゾーン：一番パワーが大きい相手のクリーチャーをすべて破壊する（同じパワーなら両方）', () => {
    let s = newGame();
    const b1 = put(s, 1, C.big.id, 'battle');
    const b2 = put(s, 1, C.big.id, 'battle');
    const sm = put(s, 1, C.small.id, 'battle');
    const base = put(s, 0, C.small.id, 'battle');
    const rz = put(s, 0, C.redzone.id, 'hand');
    mana(s, 0, 6);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: rz, evolveOn: base });
    expect([s.cards[b1].zone, s.cards[b2].zone, s.cards[sm].zone]).toEqual(['graveyard', 'graveyard', 'battle']);
  });

  it('レッドゾーンZ：進化ではないクリーチャーの上に置いた時だけ、相手のシールドを1つ墓地に置く', () => {
    let s = newGame();
    const base = put(s, 0, C.small.id, 'battle');
    const z = put(s, 0, C.redzoneZ.id, 'hand');
    mana(s, 0, 6);
    const shields = s.players[1].zones.shield.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: z, evolveOn: base });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [s.pending.candidates[0]] });
    expect(s.players[1].zones.shield.length).toBe(shields - 1);
    // 進化クリーチャーの上に置いた時は何もしない
    const z2 = put(s, 0, C.redzoneZ.id, 'hand');
    mana(s, 0, 6);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: z2, evolveOn: z });
    expect(s.players[1].zones.shield.length).toBe(shields - 1);
  });

  it('ザ・マッハ：山札の上4枚から進化クリーチャーだけを手札に加えられる', () => {
    let s = newGame();
    const evo = onTop(s, 0, C.redzone.id);
    onTop(s, 0, C.small.id);
    const m = put(s, 0, C.mach.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: m });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [evo] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [evo] });
    expect(s.cards[evo].zone).toBe('hand');
  });

  it('キザム：相手のクリーチャーとバトルさせる', () => {
    let s = newGame();
    const target = put(s, 1, C.small.id, 'battle');
    const k = put(s, 0, C.kizamu.id, 'hand');
    mana(s, 0, 7);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: k });
    if (s.pending?.kind === 'confirm') s = act(s, { type: 'RESPOND', player: 0, accept: true });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('graveyard');
    expect(s.cards[k].zone).toBe('battle');
  });

  it('ドキンダムエリア：フィールドはクリーチャーではなく、自分のクリーチャーは離れるかわりに封印される', () => {
    let s = newGame();
    const area = put(s, 0, C.area.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: area });
    expect(s.cards[area].zone).toBe('battle');
    expect(battleCards(s, reg, 0)).not.toContain(area);
    const c = put(s, 0, C.small.id, 'battle');
    s.queue.push({ kind: 'leave', iid: c, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[c].zone).toBe('battle');
    expect(s.cards[c].seals).toHaveLength(1);
    expect(isIgnored(s, reg, c)).toBe(true);
    // 新しいD2フィールドが出ると、前のものは墓地へ
    const a2 = put(s, 0, C.area2.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: a2 });
    expect(s.cards[area].zone).toBe('graveyard');
    expect(s.cards[a2].zone).toBe('battle');
  });

  it('Dスイッチ：自分のターンのはじめに、選んだカードの封印を外す（ゲーム中に一度）', () => {
    let s = newGame();
    const area = put(s, 0, C.area.id, 'battle');
    const c = put(s, 0, C.small.id, 'battle');
    const ctx = new Ctx(s, reg);
    ctx.sealCard(c);
    ctx.sealCard(c);
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.pending).toMatchObject({ kind: 'confirm', source: area });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [c] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [c] });
    expect(s.cards[c].seals ?? []).toHaveLength(0);
    expect(isIgnored(s, reg, c)).toBe(false);
    // 2回目は聞かれない
    new Ctx(s, reg).sealCard(c);
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.pending).toBeNull();
  });

  it('ドルハカバ：自分のフィールドがあれば墓地から召喚できる', () => {
    let s = newGame();
    const d = put(s, 0, C.dolhakaba.id, 'graveyard');
    mana(s, 0, 5);
    expect(canPlay(s, reg, 0, d)).toBe(false);
    put(s, 0, C.area.id, 'battle');
    expect(canPlay(s, reg, 0, d)).toBe(true);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: d });
    expect(s.cards[d].zone).toBe('battle');
    expect(power(s, reg, d)).toBe(3000);
    expect(def(s, reg, d).name).toBe('終断Δ ドルハカバ');
  });
});
});

// ════════════════════════ madogu.test.ts ════════════════════════
describe('madogu', () => {
// 魔導具デッキの能力：無月の門（重ねて召喚）、虚無月の門、無月の門・絶、墓地から出る・召喚する魔導具、卍 新世壊 卍 など
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: o.race ?? 'マフィ・ギャング/魔導具', civilization: o.civ ?? '闇', type: o.type ?? 'クリーチャー', power: o.power ?? '2000', cost: o.cost ?? '2', abilities }],
  });

const GATE = '無月の門：自分の魔導具をバトルゾーンに出した時、自分の魔導具をバトルゾーンと墓地から２つずつ選び、このクリーチャーを自分の手札または墓地からそれら４枚の上にコストを支払わずに召喚してもよい。';
const C = {
  madogu: mk('md-1', []),
  madoguSpell: mk('md-2', ['カードを１枚引く。'], { type: '呪文', power: '', civ: '水', race: '魔導具' }),
  other: mk('md-3', [], { race: 'テスト', civ: '火', power: '3000', cost: '1' }),
  deSuzak: mk('md-10', [GATE, 'W・ブレイカー', 'このクリーチャーの下に４枚以上カードがあれば、相手のクリーチャーはタップしてバトルゾーンに出る。'], { race: 'マスター・ドルスザク/マフィ・ギャング', cost: '8', power: '9000' }),
  giRugirin: mk('md-11', ['虚無月の門：自分の魔導具呪文を唱えた時、自分の魔導具をバトルゾーンと墓地から合計４枚選び、このクリーチャーを自分の手札または墓地からそれら４枚の上にコストを支払わずに召喚してもよい。', 'W・ブレイカー', '自分のクリーチャーはブロックされない。'], { race: 'ムートピア/ドルスザク', civ: '水', cost: '8', power: '9000' }),
  gaRyuzak: mk('md-12', ['無月の門・絶：各ターンの終わりに、自分の魔導具をバトルゾーンまたは墓地から合計６つ選び、このクリーチャーを自分の手札または墓地からそれら６枚の上にコストを支払わずに召喚してもよい。', 'W・ブレイカー'], { race: 'マスター・ドルスザク', cost: '9', power: '11000' }),
  duBel: mk('md-13', ['自分の魔導具クリーチャーを召喚した時または魔導具を持つ呪文を唱えた時、このクリーチャーを自分の墓地からバトルゾーンに出してもよい。'], { power: '1000' }),
  voMira: mk('md-14', ['このクリーチャーがバトルゾーンに出た時、自分の山札の上から３枚を墓地に置いてもよい。', '自分のターンに一度、魔導具クリーチャーを１体、自分の墓地から召喚してもよい。'], { cost: '4', power: '4000' }),
  voGaiga: mk('md-15', ['自分の魔導具クリーチャーを召喚するコストを１少なくする。ただし、コストは０以下にならない。'], { cost: '4', power: '4000' }),
  duGlass: mk('md-16', ['ブロッカー', 'このクリーチャーが攻撃する時、攻撃の後、このクリーチャーを破壊する。']),
  duShiza: mk('md-17', ['このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを１体選ぶ。そのターン、そのクリーチャーのパワーを?2000する。（パワー０以下のクリーチャーは破壊される）'], { power: '1000' }),
  shinsekai: mk('md-18', ['自分の魔導具呪文を唱えた時、唱えた後で墓地に置くかわりに、このフィールドの下に置いてカードを１枚引いてもよい。', '自分の魔導具呪文またはドルスザク呪文を唱えられなくする能力を無視する。', '無月の門99：自分のターンの終わりに、このフィールドの下に４枚以上カードがあれば、ゲーム中で一度、水のコスト99以下の呪文を１枚、自分の手札または墓地からコストを支払わずに唱えてもよい。'], { type: '無月フィールド', power: '', race: '', civ: '水' }),
  airvo: mk('md-19', ['S・トリガー', 'バトルゾーンにある、コスト７以下のカードを１枚選び、持ち主の手札に戻す。'], { type: '呪文', power: '', civ: '水', race: '魔導具', cost: '4' }),
  noSpell: mk('md-20', ['相手は呪文を唱えられない。'], { race: 'テスト' }),
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
const mana = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) put(s, 0, i % 2 ? C.madoguSpell.id : C.madogu.id, 'mana');
};
const play = (s: GameState, iid: string, m = 2) => {
  mana(s, m);
  return act(s, { type: 'PLAY_CARD', player: 0, iid });
};

describe('読み取り', () => {
  it('魔導具デッキの主なカードがすべて自動になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
});

describe('無月の門', () => {
  it('魔導具を出した時、バトルゾーンと墓地から2つずつ選んで、その上に手札から召喚する', () => {
    let s = newGame();
    const b1 = put(s, 0, C.madogu.id, 'battle');
    const g1 = put(s, 0, C.madogu.id, 'graveyard');
    const g2 = put(s, 0, C.madoguSpell.id, 'graveyard');
    const g3 = put(s, 0, C.madogu.id, 'graveyard');
    const de = put(s, 0, C.deSuzak.id, 'hand');
    const nw = put(s, 0, C.madogu.id, 'hand');
    s = play(s, nw);
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    // バトルゾーンの魔導具はちょうど2つなので自動、墓地は3枚から2枚を選ぶ
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 2, max: 2 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [g1, g2] });
    // 出た時の「相手のクリーチャーを1体破壊する」は相手のクリーチャーがいないので何もしない
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true, selected: [] });
    expect(s.cards[de].zone).toBe('battle');
    expect([...s.cards[de].under].sort()).toEqual([b1, nw, g1, g2].sort());
    expect(s.cards[g3].zone).toBe('graveyard');
    // 下に4枚以上：相手のクリーチャーはタップして出る
    const o = put(s, 1, C.other.id, 'battle');
    expect(s.cards[o].tapped).toBe(true);
  });

  it('素材が足りなければ聞かれない', () => {
    let s = newGame();
    put(s, 0, C.deSuzak.id, 'hand');
    put(s, 0, C.madogu.id, 'graveyard');
    s = play(s, put(s, 0, C.madogu.id, 'hand'));
    expect(s.pending).toBeFalsy();
  });

  it('虚無月の門：魔導具呪文を唱えた時、合計4枚の上に墓地から召喚する', () => {
    let s = newGame();
    const gi = put(s, 0, C.giRugirin.id, 'graveyard');
    put(s, 0, C.madogu.id, 'battle');
    put(s, 0, C.madogu.id, 'battle');
    put(s, 0, C.madogu.id, 'graveyard');
    s = play(s, put(s, 0, C.madoguSpell.id, 'hand'));
    // 唱えた呪文が墓地に置かれる前に誘発を解決する：候補は3枚（呪文は唱えている間は手札）→ 呪文を解決してから墓地へ
    for (let i = 0; i < 6 && s.pending; i++) s = act(s, { type: 'RESPOND', player: 0, accept: true, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min) : undefined });
    expect(s.cards[gi].zone).toBe('battle');
    expect(s.cards[gi].under).toHaveLength(4);
  });

  it('無月の門・絶：ターンの終わりに合計6つ', () => {
    let s = newGame();
    const ga = put(s, 0, C.gaRyuzak.id, 'hand');
    for (let i = 0; i < 3; i++) put(s, 0, C.madogu.id, 'battle');
    for (let i = 0; i < 3; i++) put(s, 0, C.madogu.id, 'graveyard');
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[ga].zone).toBe('battle');
    expect(s.cards[ga].under).toHaveLength(6);
  });
});

describe('魔導具の仲間', () => {
  it('ドゥベル：魔導具クリーチャーを召喚した時、墓地から出てもよい', () => {
    let s = newGame();
    const db = put(s, 0, C.duBel.id, 'graveyard');
    s = play(s, put(s, 0, C.madogu.id, 'hand'));
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[db].zone).toBe('battle');
  });
  it('ヴォーミラ：自分のターンに一度、魔導具クリーチャーを墓地から召喚できる', () => {
    let s = newGame();
    put(s, 0, C.voMira.id, 'battle');
    const g1 = put(s, 0, C.madogu.id, 'graveyard');
    const g2 = put(s, 0, C.madogu.id, 'graveyard');
    const og = put(s, 0, C.other.id, 'graveyard');
    expect(canSummonFromZone(s, reg, 0, g1)).toBe(true);
    expect(canSummonFromZone(s, reg, 0, og)).toBe(false);
    s = play(s, g1, 4);
    expect(s.cards[g1].zone).toBe('battle');
    expect(canSummonFromZone(s, reg, 0, g2)).toBe(false);
  });
  it('ヴォガイガ：魔導具クリーチャーの召喚コストが1少なくなる', () => {
    const s = newGame();
    put(s, 0, C.voGaiga.id, 'battle');
    expect(effectiveCost(s, reg, 0, put(s, 0, C.madogu.id, 'hand'))).toBe(1);
    expect(effectiveCost(s, reg, 0, put(s, 0, C.other.id, 'hand'))).toBe(1);
    expect(effectiveCost(s, reg, 0, put(s, 0, C.deSuzak.id, 'hand'))).toBe(8);
  });
  it('ドゥシーザ：公式テキストの「?2000」を-2000として読む', () => {
    expect(C.duShiza.abilities?.[0].effects).toContainEqual(expect.objectContaining({ type: 'powerMod', amount: -2000 }));
    let s = newGame();
    const o = put(s, 1, C.madogu.id, 'battle');
    const big = put(s, 1, C.other.id, 'battle');
    s = play(s, put(s, 0, C.duShiza.id, 'hand'));
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [o] });
    expect(s.cards[o].zone).toBe('graveyard');
    expect(power(s, reg, big)).toBe(3000);
  });
  it('ドゥグラス：攻撃の後に破壊される', () => {
    expect(C.duGlass.abilities?.[0]).toMatchObject({ when: 'onAttackEnd' });
  });
  it('エアヴォ：バトルゾーンのコスト7以下のカード（エレメント）を手札に戻す', () => {
    let s = newGame();
    const o = put(s, 1, C.other.id, 'battle');
    s = play(s, put(s, 0, C.airvo.id, 'hand'), 4);
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [o] });
    expect(s.cards[o].zone).toBe('hand');
  });
});

describe('卍 新世壊 卍', () => {
  it('魔導具呪文を唱えた後、墓地のかわりに下に置いて1枚引いてもよい', () => {
    let s = newGame();
    const f = put(s, 0, C.shinsekai.id, 'battle');
    const sp = put(s, 0, C.madoguSpell.id, 'hand');
    s = play(s, sp);
    const hand = s.players[0].zones.hand.length;
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[f].under).toEqual([sp]);
    // 唱えている間は手札にあるので、下に置いた分と引いた分で差し引き0
    expect(s.players[0].zones.hand.length).toBe(hand);
  });
  it('魔導具呪文を唱えられなくする効果を無視する', () => {
    const s = newGame();
    put(s, 1, C.noSpell.id, 'battle');
    const sp = put(s, 0, C.madoguSpell.id, 'hand');
    const plain = put(s, 0, C.other.id, 'hand');
    mana(s, 3);
    put(s, 0, C.shinsekai.id, 'battle');
    expect(() => act(s, { type: 'PLAY_CARD', player: 0, iid: sp })).not.toThrow();
    expect(plain).toBeTruthy();
  });
  it('無月の門99：自分のターンの終わりに、下に4枚以上あればゲーム中で一度だけ', () => {
    expect(C.shinsekai.abilities?.find((a) => a.oncePerGame)).toMatchObject({ when: 'onTurnEnd', condition: { type: 'underCount', min: 4 }, optional: true });
  });
});
});
