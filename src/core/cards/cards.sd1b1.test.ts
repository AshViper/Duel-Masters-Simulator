// ドキドキつよいデッキ 25の王道（その1）：手動だった能力を自動処理にしたカードの読み取りと動作
// 魔誕の斬将オルゲイト・絶望と反魂と滅殺の決断・ヨビニオン・マルル・終末縫合王 ザ=キラー・キーナリー・アクアン・フェアリー・ミラクル・
// 聖魔連結王 ドルファディロム・王道の革命 ドギラゴン・SSS級天災 デッドダムド・お清めシャラップ・龍素記号ｗD サイクルペディア・
// 百鬼の邪王門・一王二命三眼槍・「無月」の頂 ＄スザーク＄・堕呪 ブラッドゥ
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { power } from '../engine/queries';
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

const ORGEIT = '相手のターン中に、相手のクリーチャーが出て、そのクリーチャーの能力がトリガーした時、自分もその能力を使ってもよい。';
const KESSHI = [
  'この呪文を、自分の墓地から唱えてもよい。そうしたら、唱えた後、墓地に置くかわりに自分の山札の一番下に置く。',
  '次の中から２回選ぶ。（同じものを選んでもよい）',
  '',
  '　→相手は自身の手札を１枚選んで捨てる。',
  '',
  '　→コスト４以下の闇のクリーチャー１体またはコスト４以下の闇のオーラを１枚、自分の墓地からバトルゾーンに出す。',
  '',
  '　→相手のクリーチャーを１体選ぶ。このターン、そのクリーチャーのパワーを-4000する。',
];
const MARUL = '各ターン、自分の２体目のクリーチャーが出た時、自分の山札の上から１枚目を見る。そのカードを手札に加えるか、タップしてマナゾーンに置く。';
const KEENARY_ETB = 'このクリーチャーが出た時、相手のクリーチャーを１体選ぶ。その選んだクリーチャーを相手の手札に戻してもよい。その後、その選んだクリーチャーのコスト以下のクリーチャーを１体、自分の墓地から出す。';
const KEENARY_LOCK = '相手のクリーチャーが出て、その能力がトリガーする時、かわりにその能力はトリガーしない。';
const AQUAN = 'このクリーチャーがバトルゾーンに出たとき、自分の山札を上から５枚、表向きにしてもよい。その中の光と闇のカードをすべて自分の手札に加え、それ以外のカードを自分の墓地に置く。';
const FAIRY = ['自分の山札の上から１枚目をマナゾーンに置く。', '', '自分のマナゾーンにすべての文明が揃っていれば、さらにもう１枚、自分の山札の上からカードをマナゾーンに置く。'];
const DORFA = 'このクリーチャーが出た時、またはこのクリーチャーの「EXライフ」シールドが自分のシールドゾーンを離れた時、相手の多色ではないクリーチャーをすべて破壊する。';
const REV2 = '革命２：自分のシールドが２つ以下なら、自分のシールドゾーンから手札に加えるこのクリーチャーに「S・トリガー」を与える。';
const REV0 = '革命０：自分のシールドが１つもなければ、バトル中、このクリーチャーのパワーを+10000し、このクリーチャーがバトルに勝った時、アンタップする。';
const SSS = 'SSS級侵略 [天災]：水、闇、または自然のコマンド（自分の水、闇、または自然のコマンドが攻撃する時、バトルゾーン、自分の手札、墓地、マナゾーンにあるこのカードをその上に重ねてもよい）';
const STACKED = 'このクリーチャーを別のクリーチャーの上に重ねた時、相手のクリーチャーを１体選び、持ち主の墓地かマナゾーンに置く、または手札に戻す。';
const OKIYOME = ['自身の山札の上から１枚目をマナゾーンに置く。', 'カードを１枚以上、いずれかのプレイヤーの墓地から選んでもよい。そのプレイヤーは、それらを自身の山札に加えてシャッフルする。'];
const RECAST = '自分の手札から呪文を唱えた時、その呪文を自分の墓地からもう１度、コストを支払わずに唱えてもよい。この能力は各ターン１度しか使えない。';
const GRAVE_BOTTOM = '自分の墓地から呪文を唱えた時、唱えた後で、墓地のかわりに山札の下に置く。';
const ONI_GATE = '鬼エンド：クリーチャーが攻撃する時、シールドが１つもないプレイヤーがいて、自分のマナゾーンに闇のカードと火のカードがそれぞれ１枚以上あれば、この呪文を自分の手札からコストを支払わずに唱えてもよい。';
const SANGAN_LOSE = '自分がゲームに負ける時または相手がゲームに勝つ時、これが相手のターンで、自分のマナゾーンに闇のカードと火のカードがそれぞれ１枚以上あれば、かわりに自分の手札にあるこのカードを相手に見せ、山札の下に置いてもよい。';
const SANGAN_ONI = '鬼エンド：このクリーチャーがバトルゾーンに出た時、シールドが１つもないプレイヤーがいれば、自分の山札の一番下のカードを墓地に置く。それがコスト５以下のクリーチャーなら、バトルゾーンに出してもよい。';
const SUZAAKU = '相手の墓地に、どこからでもカードが置かれた時、カードを１枚引いてもよい。';
const BLOODO = ['プレイヤーを１人選ぶ。そのプレイヤーは、自身の墓地のカードをすべて山札に加えてシャッフルする。', 'カードを１枚引く。'];

const C = {
  orgeit: mk('b1-1', 'おるげいと', [ORGEIT], { civ: '水', cost: '7', power: '7000' }),
  kesshi: spell('b1-2', 'けっだん', KESSHI, { cost: '5' }),
  marul: mk('b1-3', 'まるる', [MARUL], { civ: '自然', cost: '4', power: '5000' }),
  keenary: mk('b1-4', 'きーなりー', [KEENARY_ETB, KEENARY_LOCK], { civ: '水/闇/自然', cost: '10', power: '15000' }),
  aquan: mk('b1-5', 'あくあん', [AQUAN], { civ: '水', cost: '4', power: '2000' }),
  fairy: spell('b1-6', 'ふぇありー', FAIRY, { civ: '自然', cost: '3' }),
  dorfa: mk('b1-7', 'どるふぁ', ['EXライフ', DORFA], { civ: '光/闇/火', cost: '8', power: '13500' }),
  dogi: mk('b1-8', 'おうどう', [REV2, REV0], { civ: '光/火/自然', cost: '5', power: '5000' }),
  dead: mk('b1-9', 'でっどだむど', ['進化：自分の水、闇、または自然いずれかのクリーチャー１体の上に置く。', SSS, STACKED], { civ: '水/闇/自然', type: '進化クリーチャー', cost: '8', power: '11000', race: 'トリニティ・コマンド/S級侵略者' }),
  okiyome: spell('b1-10', 'おきよめ', OKIYOME, { civ: '自然', cost: '3' }),
  cycle: mk('b1-11', 'さいくる', [RECAST, GRAVE_BOTTOM], { civ: '水/闇', cost: '5', power: '5000' }),
  oniGate: spell('b1-12', 'ひゃっき', [ONI_GATE, 'カードを１枚引く。'], { civ: '闇/火', cost: '6' }),
  sangan: mk('b1-13', 'さんがん', [SANGAN_LOSE, SANGAN_ONI], { civ: '闇/火', cost: '5', power: '6000' }),
  suzaaku: mk('b1-14', 'すざーく', [SUZAAKU], { cost: '10', power: '15000' }),
  bloodo: spell('b1-15', 'ぶらっどぅ', BLOODO, { civ: '水', cost: '2' }),
  // 動作を確かめるための部品
  draw1: spell('b1-20', 'どろー', ['カードを１枚引く。'], { civ: '水', cost: '1' }),
  etbDraw: mk('b1-21', 'でたらひく', ['このクリーチャーが出た時、カードを１枚引く。'], { civ: '水', cost: '3', power: '3000' }),
  dark3: mk('b1-22', 'やみ3', [], { cost: '3', power: '3000' }),
  dark5: mk('b1-23', 'やみ5', [], { cost: '5', power: '5000' }),
  dark6: mk('b1-24', 'やみ6', [], { cost: '6', power: '6000' }),
  light: mk('b1-25', 'ひかり', [], { civ: '光', cost: '2', power: '2000' }),
  water: mk('b1-26', 'みず', [], { civ: '水', cost: '2', power: '2000' }),
  fire: mk('b1-27', 'ひ', [], { civ: '火', cost: '2', power: '2000' }),
  nature: mk('b1-28', 'しぜん', [], { civ: '自然', cost: '2', power: '2000' }),
  multi: mk('b1-29', 'たしょく', [], { civ: '光/闇', cost: '4', power: '4000' }),
  big: mk('b1-30', 'おおきい', [], { civ: '火', cost: '7', power: '12000' }),
  waterCmd: mk('b1-31', 'みずこまんど', [], { civ: '水', cost: '6', power: '6000', race: 'クリスタル・コマンド・ドラゴン' }),
  darkSpell: spell('b1-32', 'やみじゅもん', [], { cost: '3' }),
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
/** 山札の一番下に置く */
function putBottom(s: GameState, player: PlayerId, cardId: string): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
type Pick = (c: string[], prompt: string) => string[] | undefined;
/** 確認はすべて accept、選択は先頭から（pick で変えられる）、モードは modes の順（なければ0番）。stop を満たしたらそこで止める */
function settle(s: GameState, accept = true, pick?: Pick, stop?: (s: GameState) => boolean, modes: string[] = []): GameState {
  const m = [...modes];
  for (let i = 0; i < 40 && s.pending && !stop?.(s); i++) {
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
const bottom = (s: GameState, p: PlayerId) => s.players[p].zones.deck[0];
function clearShields(s: GameState, p: PlayerId): void {
  const ctx = new Ctx(s, reg);
  for (const sh of [...s.players[p].zones.shield]) ctx.moveCard(sh, 'graveyard');
}
const cast = (s: GameState, player: PlayerId, iid: string) => runTask(s, { kind: 'castSpell', player, iid, side: 'main', from: 'hand' });

describe('SD1その1の読み取り', () => {
  it('15枚とも自動の効果になる', () => {
    for (const c of [C.orgeit, C.kesshi, C.marul, C.keenary, C.aquan, C.fairy, C.dorfa, C.dogi, C.dead, C.okiyome, C.cycle, C.oniGate, C.sangan, C.suzaaku, C.bloodo])
      expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('オルゲイト：「そのクリーチャーの能力」の言い方でも、相手の出た時の能力を自分も使う', () => {
    expect(C.orgeit.keywords?.mimicEnemySummon).toBe(true);
  });
  it('決断：墓地から唱えて山札の下へ。「→」の選択肢を2回（同じものを選んでもよい）', () => {
    expect(C.kesshi.altPlays).toEqual([{ name: '墓地から唱える', from: 'graveyard', spellAfter: 'deckBottom' }]);
    const ch = C.kesshi.abilities?.[0].effects[0];
    expect(ch?.type === 'chooseOne' && [ch.times, ch.distinct, ch.options.length]).toEqual([2, undefined, 3]);
  });
  it('マルル：見たカードを手札に加えなければ、タップしてマナゾーンに置く', () => {
    expect(C.marul.abilities?.[0]).toEqual(
      expect.objectContaining({ when: 'onOwnNthEnter', nthEnter: 2, effects: [{ type: 'lookAtTop', count: 1, pickCount: 1, pickTo: 'hand', restTo: 'mana', restTapped: true }] }),
    );
  });
  it('キーナリー：選んで、戻してもよい、そのコスト以下を墓地から。出た相手のクリーチャー自身の能力はトリガーしない', () => {
    expect(C.keenary.abilities?.[0].effects.map((e) => e.type)).toEqual(['choose', 'optional', 'move']);
    expect(C.keenary.statics).toEqual([{ type: 'suppressEnterTriggers', subjectOnly: true }]);
  });
  it('アクアン・フェアリー・ミラクル・ドルファディロム', () => {
    expect(C.aquan.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onSummon', optional: true }));
    expect(C.fairy.abilities?.[1].condition).toEqual({ type: 'civsInBattle', min: 5, manaOf: 'self' });
    expect(C.dorfa.abilities?.map((a) => a.when)).toEqual(['onSummon', 'onExLifeLeft']);
  });
  it('王道の革命 ドギラゴン：革命2は条件つきのS・トリガー、革命0はバトル中のパワーとバトルに勝った時のアンタップ', () => {
    expect(C.dogi.shieldTriggerIf).toEqual({ type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 2 });
    expect(C.dogi.statics?.[0]).toEqual(expect.objectContaining({ type: 'powerMod', amount: 10000, battleOnly: true }));
    expect(C.dogi.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onBattleWin', effects: [{ type: 'selfAction', action: 'untap' }] }));
  });
  it('デッドダムド：3つの文明のどれかの上に進化、SSS級侵略はバトルゾーン・墓地・マナゾーンからも、重ねた時の能力', () => {
    expect(C.dead.evolvesFrom).toEqual({ civilizations: ['water', 'darkness', 'nature'] });
    expect(C.dead.attackSwap).toEqual({ kind: 'invasion', filter: { civilizations: ['water', 'darkness', 'nature'], race: 'コマンド' }, zones: ['graveyard', 'mana', 'battle'], battleCardOnly: true });
    expect(C.dead.abilities?.[0].when).toBe('onStacked');
  });
  it('お清めシャラップ・サイクルペディア・百鬼の邪王門・三眼槍・スザーク・ブラッドゥ', () => {
    expect(C.okiyome.abilities?.[1]).toEqual(expect.objectContaining({ optional: true, effects: [{ type: 'graveyardToDeck', who: 'choose', pick: true }] }));
    expect(C.cycle.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onSpellCast', castFrom: 'hand', oncePerTurnOnUse: true }));
    expect(C.cycle.statics).toEqual([{ type: 'graveCastToDeckBottom' }]);
    expect(C.oniGate.handTriggers?.[0].when).toBe('anyAttack');
    expect(C.sangan.replacements?.[0]).toEqual(expect.objectContaining({ event: 'loseFromHand', instead: 'toDeckBottom' }));
    expect(C.sangan.abilities?.[0].effects[0]).toEqual({ type: 'deckTopTo', count: 1, to: 'graveyard', fromBottom: true });
    expect(C.suzaaku.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onGravePut', who: 'opponent', optional: true }));
    expect(C.bloodo.abilities?.[0].effects).toEqual([{ type: 'graveyardToDeck', who: 'choose' }]);
  });
});

describe('SD1その1の動作', () => {
  it('オルゲイト：相手のターンに相手のクリーチャーが出て「出た時」の能力がトリガーしたら、自分もその能力を使える', () => {
    let s = newGame();
    put(s, 1, C.orgeit.id, 'battle');
    const e = put(s, 0, C.etbDraw.id, 'hand');
    const [h0, h1] = [hand(s, 0), hand(s, 1)];
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: e }));
    expect([hand(s, 0), hand(s, 1)]).toEqual([h0 - 1 + 1, h1 + 1]);
  });

  it('決断：同じ選択肢を2回選べる（相手は手札を2枚捨てる）', () => {
    let s = newGame();
    const k = put(s, 0, C.kesshi.id, 'hand');
    const h1 = hand(s, 1);
    s = settle(cast(s, 0, k), true, undefined, undefined, ['0', '0']);
    expect([hand(s, 1), zone(s, k)]).toEqual([h1 - 2, 'graveyard']);
  });

  it('決断：コスト4以下の闇のクリーチャーを墓地から出し、相手のクリーチャーのパワーを-4000する', () => {
    let s = newGame();
    const g3 = put(s, 0, C.dark3.id, 'graveyard');
    const g6 = put(s, 0, C.dark6.id, 'graveyard');
    const o = put(s, 1, C.big.id, 'battle');
    const k = put(s, 0, C.kesshi.id, 'hand');
    s = settle(cast(s, 0, k), true, undefined, undefined, ['1', '2']);
    expect([zone(s, g3), zone(s, g6)]).toEqual(['battle', 'graveyard']);
    expect(power(s, reg, o)).toBe(8000);
  });

  it('決断：墓地からマナを支払って唱えると、唱えた後は山札の一番下に置く', () => {
    let s = newGame();
    for (let i = 0; i < 5; i++) put(s, 0, C.dark3.id, 'mana');
    const k = put(s, 0, C.kesshi.id, 'graveyard');
    s.phase = 'main';
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: k, alt: 0 }), true, undefined, undefined, ['0', '0']);
    expect([zone(s, k), bottom(s, 0)]).toEqual(['deck', k]);
    expect(s.players[0].zones.mana.every((m) => s.cards[m].tapped)).toBe(true);
  });

  it('マルル：その2体目が出た時、山札の上を見て手札に加えるか、加えなければタップしてマナへ', () => {
    let s = newGame();
    put(s, 0, C.marul.id, 'battle');
    const [x] = stack(s, 0, [C.dark3.id]);
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.dark3.id, 'hand') }));
    expect(zone(s, x)).toBe('deck');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.dark3.id, 'hand') }));
    expect(zone(s, x)).toBe('hand');

    s = newGame();
    put(s, 0, C.marul.id, 'battle');
    const [y] = stack(s, 0, [C.dark3.id]);
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.dark3.id, 'hand') }));
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.dark3.id, 'hand') }), true, () => []);
    expect([zone(s, y), s.cards[y].tapped]).toEqual(['mana', true]);
  });

  it('キーナリー：選んだ相手のクリーチャーを戻し、そのコスト以下のクリーチャーを墓地から出す（戻さなくても出す）', () => {
    let s = newGame();
    const o = put(s, 1, C.dark5.id, 'battle');
    const g5 = put(s, 0, C.dark5.id, 'graveyard');
    const g6 = put(s, 0, C.dark6.id, 'graveyard');
    const k = put(s, 0, C.keenary.id, 'hand');
    let cands: string[] = [];
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: k }), true, (c) => {
      if (c.includes(g5)) cands = c;
      return undefined;
    });
    expect([zone(s, o), zone(s, g5), zone(s, g6)]).toEqual(['hand', 'battle', 'graveyard']);
    expect(cands).not.toContain(g6);

    s = newGame();
    const o2 = put(s, 1, C.dark5.id, 'battle');
    const h5 = put(s, 0, C.dark5.id, 'graveyard');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.keenary.id, 'hand') }), false);
    expect([zone(s, o2), zone(s, h5)]).toEqual(['battle', 'battle']);
  });

  it('キーナリー：相手のクリーチャーが出ても、そのクリーチャー自身の「出た時」の能力はトリガーしない', () => {
    let s = newGame();
    put(s, 0, C.keenary.id, 'battle');
    const e = put(s, 1, C.etbDraw.id, 'hand');
    const h1 = hand(s, 1);
    s = settle(runTask(s, { kind: 'enterBattle', player: 1, iid: e }));
    expect(hand(s, 1)).toBe(h1 - 1);
    // 自分のクリーチャーの能力はトリガーする
    const mine = put(s, 0, C.etbDraw.id, 'hand');
    const h0 = hand(s, 0);
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: mine }));
    expect(hand(s, 0)).toBe(h0);
  });

  it('アクアン：山札の上から5枚のうち、光と闇のカードを手札に、それ以外を墓地に置く', () => {
    let s = newGame();
    const [w, l, d, n, m] = stack(s, 0, [C.water.id, C.light.id, C.dark3.id, C.nature.id, C.multi.id]);
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.aquan.id, 'hand') }));
    expect([zone(s, w), zone(s, l), zone(s, d), zone(s, n), zone(s, m)]).toEqual(['graveyard', 'hand', 'hand', 'graveyard', 'hand']);
  });

  it('フェアリー・ミラクル：1枚目を置いた後にマナゾーンに5文明がそろっていれば、もう1枚置く', () => {
    let s = newGame();
    for (const id of [C.light.id, C.water.id, C.dark3.id, C.fire.id]) put(s, 0, id, 'mana');
    const [second, first] = stack(s, 0, [C.dark3.id, C.nature.id]);
    s = settle(cast(s, 0, put(s, 0, C.fairy.id, 'hand')));
    expect([zone(s, first), zone(s, second)]).toEqual(['mana', 'mana']);

    s = newGame();
    for (const id of [C.light.id, C.water.id, C.dark3.id]) put(s, 0, id, 'mana');
    const [b, a] = stack(s, 0, [C.dark3.id, C.nature.id]);
    s = settle(cast(s, 0, put(s, 0, C.fairy.id, 'hand')));
    expect([zone(s, a), zone(s, b)]).toEqual(['mana', 'deck']);
  });

  it('ドルファディロム：EXライフのシールドが離れた時にも、相手の多色ではないクリーチャーをすべて破壊する', () => {
    let s = newGame();
    const d = put(s, 0, C.dorfa.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: d }));
    const ex = s.cards[d].exLifeShield!;
    expect(zone(s, ex)).toBe('shield');
    const mono = put(s, 1, C.dark5.id, 'battle');
    const multi = put(s, 1, C.multi.id, 'battle');
    s = settle(runTask(s, { kind: 'leave', iid: d, to: 'graveyard', cause: 'destroy' }));
    expect([zone(s, d), zone(s, ex), zone(s, mono), zone(s, multi)]).toEqual(['battle', 'graveyard', 'graveyard', 'battle']);
  });

  it('王道の革命 ドギラゴン：革命2：手札に加える時にシールドが2つ以下ならS・トリガー', () => {
    let s = newGame();
    clearShields(s, 1);
    const dg = put(s, 1, C.dogi.id, 'shield');
    const a = put(s, 0, C.dark3.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }), true, undefined, (x) => x.pending?.kind === 'confirm' && x.pending.player === 1);
    expect(s.pending?.kind === 'confirm' && s.pending.player).toBe(1);
    s = settle(s, true, undefined, (x) => x.pending?.kind === 'block');
    expect(zone(s, dg)).toBe('battle');

    // シールドが4つ（ブレイク後3つ）なら使えない
    s = newGame();
    clearShields(s, 1);
    const ds = [0, 1, 2, 3].map(() => put(s, 1, C.dogi.id, 'shield'));
    const a2 = put(s, 0, C.dark3.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a2, target: { kind: 'player' } }), true);
    expect(ds.filter((x) => zone(s, x) === 'battle')).toEqual([]);
    expect(ds.filter((x) => zone(s, x) === 'hand').length).toBe(1);
  });

  it('王道の革命 ドギラゴン：革命0：シールドがなければバトル中+10000、バトルに勝ったらアンタップ', () => {
    let s = newGame();
    clearShields(s, 0);
    const dg = put(s, 0, C.dogi.id, 'battle');
    const o = put(s, 1, C.big.id, 'battle');
    s.cards[o].tapped = true;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: dg, target: { kind: 'creature', iid: o } }));
    expect([zone(s, dg), s.cards[dg].tapped, zone(s, o)]).toEqual(['battle', false, 'graveyard']);
    expect(power(s, reg, dg)).toBe(5000);

    s = newGame();
    const dg2 = put(s, 0, C.dogi.id, 'battle');
    const o2 = put(s, 1, C.big.id, 'battle');
    s.cards[o2].tapped = true;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: dg2, target: { kind: 'creature', iid: o2 } }));
    expect([zone(s, dg2), zone(s, o2)]).toEqual(['graveyard', 'battle']);
  });

  it('デッドダムド：進化して重ねた時、相手のクリーチャーを選び、墓地・マナ・手札から置き場所を選ぶ', () => {
    let s = newGame();
    const b = put(s, 0, C.dark3.id, 'battle');
    const o = put(s, 1, C.dark5.id, 'battle');
    const d = put(s, 0, C.dead.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: d, evolveOn: b }), true, undefined, undefined, ['1']);
    expect([zone(s, d), s.cards[d].under, zone(s, o)]).toEqual(['battle', [b], 'mana']);
  });

  it('デッドダムド：SSS級侵略でバトルゾーンから攻撃中のコマンドに重ねても、重ねた時の能力を使う', () => {
    let s = newGame();
    const cmd = put(s, 0, C.waterCmd.id, 'battle');
    const base = put(s, 0, C.dark3.id, 'battle');
    const d = put(s, 0, C.dead.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: d, evolveOn: base }), true);
    const o = put(s, 1, C.dark5.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: cmd, target: { kind: 'player' } }), true, (c) => (c.includes(d) ? [d] : undefined), (x) => x.pending?.kind === 'block', ['2']);
    expect(s.cards[d].under).toEqual([cmd]);
    expect(zone(s, base)).toBe('battle');
    expect(zone(s, o)).toBe('hand');
  });

  it('お清めシャラップ：山札の上をマナへ。選んだプレイヤーの墓地から選んだカードだけを山札に加えてシャッフル', () => {
    let s = newGame();
    const [t] = stack(s, 0, [C.dark3.id]);
    const g1 = put(s, 1, C.dark3.id, 'graveyard');
    const g2 = put(s, 1, C.dark5.id, 'graveyard');
    s = settle(cast(s, 0, put(s, 0, C.okiyome.id, 'hand')), true, (c) => (c.includes(g2) ? [g2] : undefined), undefined, ['1']);
    expect([zone(s, t), zone(s, g1), zone(s, g2)]).toEqual(['mana', 'graveyard', 'deck']);
  });

  it('サイクルペディア：手札から唱えた呪文を墓地からもう1度唱え、その後は山札の下へ。各ターン1度（使わなければもう一度使える）', () => {
    let s = newGame();
    put(s, 0, C.cycle.id, 'battle');
    const sp = put(s, 0, C.draw1.id, 'hand');
    const h = hand(s, 0);
    s = settle(cast(s, 0, sp));
    // 唱えた手札1枚が減り、2回引く
    expect(hand(s, 0)).toBe(h - 1 + 2);
    expect([zone(s, sp), bottom(s, 0)]).toEqual(['deck', sp]);
    // 2枚目はもう誘発しない
    const sp2 = put(s, 0, C.draw1.id, 'hand');
    s = settle(cast(s, 0, sp2));
    expect(zone(s, sp2)).toBe('graveyard');

    // 使わなかったら、同じターンにもう一度使える
    s = newGame();
    put(s, 0, C.cycle.id, 'battle');
    const a = put(s, 0, C.draw1.id, 'hand');
    s = settle(cast(s, 0, a), false);
    expect(zone(s, a)).toBe('graveyard');
    const b = put(s, 0, C.draw1.id, 'hand');
    s = settle(cast(s, 0, b), true);
    expect([zone(s, a), zone(s, b)]).toEqual(['graveyard', 'deck']);
  });

  it('百鬼の邪王門：シールドがないプレイヤーがいて、マナに闇と火があれば、クリーチャーの攻撃時に手札から唱えられる', () => {
    let s = newGame();
    clearShields(s, 1);
    put(s, 1, C.dark3.id, 'mana');
    put(s, 1, C.fire.id, 'mana');
    const g = put(s, 1, C.oniGate.id, 'hand');
    const a = put(s, 0, C.dark3.id, 'battle');
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind === 'confirm' && s.pending.player).toBe(1);
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(zone(s, g)).toBe('graveyard');

    // 火のカードがマナになければ聞かない
    s = newGame();
    clearShields(s, 1);
    put(s, 1, C.dark3.id, 'mana');
    put(s, 1, C.oniGate.id, 'hand');
    const a2 = put(s, 0, C.dark3.id, 'battle');
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a2, target: { kind: 'player' } });
    expect(s.pending?.kind === 'confirm' && s.pending.player === 1).toBe(false);
  });

  it('三眼槍：相手のターンに負ける時、マナに闇と火があれば、手札のこのカードを山札の下に置いて負けない', () => {
    let s = newGame();
    clearShields(s, 1);
    put(s, 1, C.dark3.id, 'mana');
    put(s, 1, C.fire.id, 'mana');
    const sg = put(s, 1, C.sangan.id, 'hand');
    const a = put(s, 0, C.dark3.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }), false);
    expect([s.winner, s.gameOverReason, zone(s, sg), bottom(s, 1)]).toEqual([null, null, 'deck', sg]);

    // マナに火がなければ負ける
    s = newGame();
    clearShields(s, 1);
    put(s, 1, C.dark3.id, 'mana');
    put(s, 1, C.sangan.id, 'hand');
    const a2 = put(s, 0, C.dark3.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a2, target: { kind: 'player' } }), false);
    expect(s.winner).toBe(0);
  });

  it('三眼槍：鬼エンド：山札の一番下を墓地に置き、コスト5以下のクリーチャーなら出してもよい', () => {
    let s = newGame();
    clearShields(s, 1);
    const b5 = putBottom(s, 0, C.dark5.id);
    expect(bottom(s, 0)).toBe(b5);
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.sangan.id, 'hand') }));
    expect(zone(s, b5)).toBe('battle');

    s = newGame();
    clearShields(s, 1);
    const b6 = putBottom(s, 0, C.dark6.id);
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.sangan.id, 'hand') }));
    expect(zone(s, b6)).toBe('graveyard');

    // シールドがないプレイヤーがいなければ何もしない
    s = newGame();
    const b3 = putBottom(s, 0, C.dark3.id);
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.sangan.id, 'hand') }));
    expect(zone(s, b3)).toBe('deck');
  });

  it('スザーク：相手の墓地にカードが置かれるたびに1枚引いてもよい（自分の墓地では誘発しない）', () => {
    let s = newGame();
    put(s, 0, C.suzaaku.id, 'battle');
    const o1 = put(s, 1, C.dark3.id, 'battle');
    const o2 = put(s, 1, C.dark3.id, 'battle');
    const h = hand(s, 0);
    s = settle(runTask(s, { kind: 'leave', iid: o1, to: 'graveyard', cause: 'destroy' }));
    s = settle(runTask(s, { kind: 'leave', iid: o2, to: 'graveyard', cause: 'destroy' }));
    expect(hand(s, 0)).toBe(h + 2);
    const mine = put(s, 0, C.dark3.id, 'battle');
    s = settle(runTask(s, { kind: 'leave', iid: mine, to: 'graveyard', cause: 'destroy' }));
    expect(hand(s, 0)).toBe(h + 2);
  });

  it('ブラッドゥ：選んだプレイヤーの墓地のカードをすべて山札に加えてシャッフルする', () => {
    let s = newGame();
    const gs = [put(s, 1, C.dark3.id, 'graveyard'), put(s, 1, C.dark5.id, 'graveyard')];
    const mine = put(s, 0, C.dark3.id, 'graveyard');
    const deck1 = s.players[1].zones.deck.length;
    s = settle(cast(s, 0, put(s, 0, C.bloodo.id, 'hand')), true, undefined, undefined, ['1']);
    expect(gs.map((x) => zone(s, x))).toEqual(['deck', 'deck']);
    expect([zone(s, mine), s.players[1].zones.deck.length]).toEqual(['graveyard', deck1 + 2]);
  });
});
