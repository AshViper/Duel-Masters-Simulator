// 保存済みカードで手動だった能力を、部品と効果定義で自動にした分のテスト
// （一番上のカードを破壊、選んだ中から持ち主が選ぶ、墓地に置いた中から使う、シンカライズ、D・D・D、
//   攻撃できない効果を無視、NEO進化のコスト軽減、Zラッシュ、手札にある間の誘発、スマッシュ・バースト、相手の出た時の能力を使う）
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { canPlay, effectiveCost, evolutionBases, keywords } from '../engine/queries';
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
