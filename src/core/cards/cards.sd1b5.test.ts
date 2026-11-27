// ドキドキつよいデッキ 25の王道（その5）：手動だった能力を自動処理にしたカードの読み取りと動作
// MMM-ジョーキング・MAX・ザ・ジョニー・ジョーカーズの心絵・コーライルの海幻・♪なぜ離れ・AQ NETWORK・理想と平和の決断・アルカディアス・モモキング・
// 天風のゲイル・ヴェスパー・ジーク・ナハトファルター・ヴァム・ウィングダム・ジュラノキル（ジュラスティック・ハウル）・デスマッチ・ビートル・ナ・チュラルゴ・デンジャー・ホールインワン・ヘラクレス
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { battleCards, canAttackWith, effectiveCost, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '自然', type: o.type ?? 'クリーチャー', power: o.power ?? '1000', cost: o.cost ?? '1', abilities });
const mk = (id: string, name: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(name, abilities, o)] } as never);
const twin = (id: string, name: string, abilities: string[], o: O, spellName: string, spellAbilities: string[], so: O = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [face(name, abilities, o), face(spellName, spellAbilities, { type: '呪文', power: '', race: '', civ: o.civ, ...so })] } as never);
const SPELL: O = { type: '呪文', power: '', race: '' };
const TAMA: O = { type: 'タマシード', power: '' };

const MMM = '相手のクリーチャーが自分を攻撃する時、自分のシールドが１つもなく、自分のマナゾーンに光と自然のカードがあれば、このクリーチャーを手札から出してもよい。';
const JOHNNY_SMAX =
  'S-MAX進化：自分がゲームに負ける時、かわりにこのクリーチャーを破壊するか、自分の手札から《じょにー》を１枚捨てる。（このクリーチャーは進化元を必要としない。自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す）';
const JOHNNY_WIN = 'このクリーチャーの攻撃の終わりに、自分のシールドが10以上あれば、自分はゲームに勝つ。';
const KOKOROE = 'このタマシードが出た時、各プレイヤーは自身のクリーチャーとタマシードを最大１つずつ選び、残りをすべて山札に加えてシャッフルする。その後、各プレイヤーは、こうして山札に加えたカード１枚につき、自身の山札の上から１枚目をシールド化する。';
const CORAIL = 'このタマシードが出た時、クリーチャー１体またはタマシードを１枚選ぶ。その持ち主は、それを山札の下に置き、カードを１枚引く。';
const NAZE = 'プレイヤーを１人選ぶ。そのプレイヤーは、自身の墓地のカードをすべてシャッフルし、山札の下に置く。';
const AQ_ETB = 'このクリーチャーが出た時、コスト５以下のタマシードを１枚またはコスト５以下の呪文を１枚、自分の手札からコストを支払わずに使ってもよい。';
const AQ_CIVIL =
  'シビルカウント３：自分の水のクリーチャーまたは水のタマシードが合計３つ以上あれば、このクリーチャーに「ブロッカー」を与え、破壊される時、墓地に置くかわりに手札に戻す。（「ブロッカー」を持つクリーチャーをタップして、相手クリーチャーの攻撃先をそのクリーチャーに変更してもよい）';
const IDEAL = [
  '革命２：自分のシールドが２つ以下なら、自分のシールドゾーンから手札に加えるこの呪文に「S・トリガー」を与える。',
  '次の中から２回選ぶ。（同じものを選んでもよい）\n\n　▶自分の山札の上から２枚を表向きにする。その中の光と水のカードをすべて手札に加え、残りを好きな順序で山札の下に置く。\n\n　▶自分の山札の上から１枚目をシールド化する。\n\n　▶コスト３以下のエレメントを１つ選び、シールド化する。',
];
const MOMO_STAR = 'スター進化：レクスターズ、光のクリーチャー、または火のクリーチャー１体の上に置く。（このクリーチャーが離れる時、かわりに一番上のカードが離れる）';
const MOMO_TAP = '各ターン、はじめて出る相手のクリーチャーは、タップして出る。';
const GALE_SYM = 'W・シンパシー：パワー12000以上のクリーチャー（このクリーチャーを召喚する時支払うコストは、バトルゾーンにある自分のパワー12000以上のクリーチャー１体につき２少なくなる。ただしコストは０以下にならない）';
const GALE = '自分の手札にあるクリーチャーすべてに、「W・シンパシー：パワー12000以上のクリーチャー」を与える。';
const ZIEK_START = '自分のターンのはじめに、このクリーチャーを自分のマナゾーンから手札に戻してもよい。';
const ZIEK_ETB = 'このクリーチャーまたは自分の他のパワー12000以上のクリーチャーがバトルゾーンに出た時、自分の山札の上から２枚をマナゾーンに置く。そうしたら、クリーチャーを１体、自分のマナゾーンから手札に戻す。';
const VAM = 'このターン、パワー12000以上で攻撃していた自分のクリーチャーがいなければ、このクリーチャーは攻撃できない。';
const HOWL = '相手は、自身のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーをすべて、自身のマナゾーンに置く。';
const DEATHMATCH = '相手のターン中に、相手がコストを支払わずにクリーチャーをバトルゾーンに出した時、このクリーチャーとそのクリーチャーをバトルさせてもよい。';
const NATURAL =
  'このクリーチャーがバトルゾーンに出た時あるいは自分が名前に《トラップ》とある呪文を唱えた時、自然のコスト６以下のクリーチャーを１体、自分の手札またはマナゾーンからバトルゾーンに出してもよい。';
const HERC_ETB = 'このタマシードが出た時、プレイヤーを１人選ぶ。そのプレイヤーは、自身の墓地をシャッフルし、山札の下に置く。';
const HERC_TC = '自分の自然のクリーチャーまたは自然のタマシードが合計４つ以上なければ、バトルゾーンにあるこのタマシードはクリーチャーとして扱わない。';

const C = {
  mmm: mk('b5-1', 'えむえむえむ', [MMM, 'ブロッカー'], { civ: '光/自然', cost: '5', power: '6000' }),
  johnny: mk('b5-2', 'じょにー', [JOHNNY_SMAX, JOHNNY_WIN], { civ: '光', type: 'S-MAX進化クリーチャー', cost: '6', power: '10000' }),
  kokoroe: mk('b5-3', 'こころえ', [KOKOROE], { civ: '光', ...TAMA, cost: '8' }),
  corail: mk('b5-4', 'こーらいる', [CORAIL], { civ: '水', ...TAMA, cost: '4' }),
  naze: mk('b5-5', 'なぜはなれ', [NAZE, 'カードを２枚引く。'], { civ: '水', ...SPELL, cost: '3' }),
  aq: mk('b5-6', 'あくあ', [AQ_ETB, AQ_CIVIL], { civ: '水', cost: '5', power: '5000' }),
  ideal: mk('b5-7', 'りそう', IDEAL, { civ: '光/水', ...SPELL, cost: '4' }),
  momo: mk('b5-8', 'ももきんぐ', [MOMO_STAR, 'T・ブレイカー', MOMO_TAP], { civ: '光/火', type: 'スター進化クリーチャー', cost: '6', power: '12500', race: 'レクスターズ' }),
  gale: mk('b5-9', 'げいる', [GALE_SYM, 'T・ブレイカー', GALE], { cost: '10', power: '12000' }),
  ziek: mk('b5-10', 'じーく', [ZIEK_START, 'Q・ブレイカー', ZIEK_ETB], { cost: '11', power: '18000' }),
  vam: twin('b5-11', 'ゔぁむ', [VAM, 'T・ブレイカー'], { cost: '2', power: '12000' }, 'そにっく', ['相手のパワー7000以下のクリーチャーを１体選び、持ち主のマナゾーンに置く。'], { cost: '3' }),
  jurano: twin('b5-12', 'じゅらのきる', ['このクリーチャーは攻撃できない。'], { cost: '1', power: '12000' }, 'はうる', [HOWL], { cost: '3' }),
  deathmatch: mk('b5-13', 'ですまっち', ['このクリーチャーは攻撃できない。', DEATHMATCH], { cost: '2', power: '13000' }),
  natural: twin('b5-14', 'なちゅらるご', [NATURAL, 'T・ブレイカー'], { cost: '7', power: '12000' }, 'なちゅらる・トラップ', ['相手のクリーチャーを１体、持ち主のマナゾーンに置く。'], { cost: '6' }),
  herc: mk('b5-15', 'へらくれす', ['T・ブレイカー', HERC_ETB, HERC_TC], { type: 'タマシード/クリーチャー', cost: '4', power: '12000' }),
  // 動作を確かめるための部品
  small: mk('b5-20', 'ちいさい', [], { civ: '火', cost: '3', power: '1000' }),
  big: mk('b5-21', 'おおきい', [], { cost: '7', power: '12000' }),
  water: mk('b5-22', 'みず', [], { civ: '水', cost: '2', power: '2000' }),
  wtama: mk('b5-23', 'みずたま', [], { civ: '水', ...TAMA, cost: '2' }),
  spell5: mk('b5-24', 'じゅもん5', ['カードを１枚引く。'], { civ: '水', ...SPELL, cost: '5' }),
  spell6: mk('b5-25', 'じゅもん6', ['カードを１枚引く。'], { civ: '水', ...SPELL, cost: '6' }),
  ntama: mk('b5-26', 'しぜんたま', [], { ...TAMA, cost: '2' }),
  light: mk('b5-27', 'ひかり', [], { civ: '光', cost: '2', power: '2000' }),
  rex: mk('b5-28', 'れくす', [], { civ: '水', cost: '2', power: '2000', race: 'レクスターズ' }),
  nature6: mk('b5-29', 'しぜん6', [], { cost: '6', power: '6000' }),
  fire6: mk('b5-30', 'ひ6', [], { civ: '火', cost: '6', power: '6000' }),
  trap: mk('b5-31', 'わな・トラップ', ['カードを１枚引く。'], { ...SPELL, cost: '2' }),
  nottrap: mk('b5-32', 'ふつうのじゅもん', ['カードを１枚引く。'], { ...SPELL, cost: '2' }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  s.cards[iid].enteredTurn = 0;
  s.cards[iid].tapped = false;
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
const enter = (s: GameState, player: PlayerId, iid: string) => runTask(s, { kind: 'enterBattle', player, iid });
const effect = (s: GameState, controller: PlayerId, source: string, e: Extract<GameState['queue'][number], { kind: 'effect' }>['effect']) => runTask(s, { kind: 'effect', controller, source, effect: e });
const only = (...x: string[]): Pick => (c) => (x.every((y) => c.includes(y)) ? x : undefined);
const clearZone = (s: GameState, p: PlayerId, z: ZoneName) => {
  const ctx = new Ctx(s, reg);
  for (const x of [...s.players[p].zones[z]]) ctx.moveCard(x, 'graveyard');
};
describe('SD1その5の読み取り', () => {
  it('15枚とも自動の効果になる', () => {
    for (const c of Object.values(C).slice(0, 15)) expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('MMM-ジョーキング：手札にある間の誘発', () => {
    expect(C.mmm.handTriggers?.[0]).toEqual(expect.objectContaining({ when: 'attackedPlayer' }));
  });
  it('MAX・ザ・ジョニー：負ける時の置換と、攻撃の終わりの勝利', () => {
    expect(C.johnny.keywords?.sMax).toBe(true);
    expect(C.johnny.replacements).toEqual([{ event: 'lose', subject: 'self', instead: 'destroySelf', orDiscardName: 'じょにー' }]);
    expect(C.johnny.abilities?.[0]).toEqual({ when: 'onAttackEnd', effects: [{ type: 'winGame' }], condition: { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '>=', right: 10 } });
  });
  it('心絵・コーライル・♪なぜ離れ・AQ', () => {
    expect(C.kokoroe.abilities?.[0].effects).toEqual([{ type: 'keepOneEachToDeck' }]);
    expect(C.corail.abilities?.[0].effects.map((e) => e.type)).toEqual(['move', 'draw']);
    expect(C.naze.abilities?.[0].effects).toEqual([{ type: 'graveToDeckBottom', who: 'choose' }]);
    expect(C.aq.abilities?.[0].effects[0].type).toBe('playFromHandFree');
    expect(C.aq.statics?.[0].type).toBe('grantKeyword');
    expect(C.aq.replacements?.[0]).toEqual(expect.objectContaining({ event: 'destroyed', instead: 'toHand' }));
  });
  it('理想と平和の決断：2回選ぶ3つの選択肢と、革命2', () => {
    const ch = C.ideal.abilities?.[0].effects[0];
    expect(ch?.type === 'chooseOne' && [ch.times, ch.options.length]).toEqual([2, 3]);
    expect(C.ideal.shieldTriggerIf).toBeDefined();
  });
  it('モモキング：スター進化の進化元と、はじめて出る相手のクリーチャーはタップ', () => {
    expect(C.momo.evolveSpec?.filter).toEqual({ anyOf: [{ race: 'レクスターズ' }, { civilization: 'light' }, { civilization: 'fire' }] });
    expect(C.momo.replacements).toEqual([{ event: 'leaveBattle', subject: 'self', instead: 'shedTop' }]);
    expect(C.momo.statics?.at(-1)).toEqual({ type: 'opponentEntersTapped', firstPerTurn: true });
  });
  it('ゲイル・ヴェスパー：W・シンパシーの条件はパワー（種族ではない）', () => {
    expect(C.gale.selfCost?.per.filter).toEqual({ minPower: 12000 });
  });
  it('ジーク：このクリーチャー自身が出た時は条件なし', () => {
    expect(C.ziek.abilities?.map((a) => [a.when, a.filter])).toEqual([
      ['onSummon', undefined],
      ['onOtherSummon', { minPower: 12000 }],
    ]);
    expect(C.ziek.handTriggers?.[0]).toEqual(expect.objectContaining({ when: 'ownTurnStart', zones: ['mana'] }));
  });
  it('ヘラクレス：クリーチャーとして扱う条件', () => {
    expect(C.herc.creatureIf).toEqual({ civilization: 'nature', min: 4 });
  });
});

describe('SD1その5の動作', () => {
  it('MMM-ジョーキング：シールドがなく、マナに光と自然があれば、攻撃された時に手札から出せる', () => {
    let s = newGame();
    const m = put(s, 1, C.mmm.id, 'hand');
    clearZone(s, 1, 'shield');
    put(s, 1, C.light.id, 'mana');
    put(s, 1, C.nature6.id, 'mana');
    const atk = put(s, 0, C.small.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } }));
    expect(zone(s, m)).toBe('battle');
  });

  it('MMM-ジョーキング：マナに自然のカードがなければ出せない', () => {
    let s = newGame();
    const m = put(s, 1, C.mmm.id, 'hand');
    clearZone(s, 1, 'shield');
    clearZone(s, 1, 'mana');
    put(s, 1, C.light.id, 'mana');
    const atk = put(s, 0, C.small.id, 'battle');
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s.pending?.kind === 'confirm' && s.pending.player === 1).toBe(false);
    expect(zone(s, m)).toBe('hand');
  });

  it('MAX・ザ・ジョニー：負ける時、手札の同名カードを捨てる。なければこのクリーチャーを破壊する', () => {
    let s = newGame();
    const j = put(s, 0, C.johnny.id, 'battle');
    const copy = put(s, 0, C.johnny.id, 'hand');
    const src = put(s, 1, C.small.id, 'battle');
    s = settle(effect(s, 1, src, { type: 'winGame' }));
    expect(s.gameOverReason).toBeNull();
    expect([zone(s, copy), zone(s, j)]).toEqual(['graveyard', 'battle']);
    s = settle(effect(s, 1, src, { type: 'winGame' }));
    expect(s.gameOverReason).toBeNull();
    expect(zone(s, j)).toBe('graveyard');
    // 破壊した後は負ける
    s = settle(effect(s, 1, src, { type: 'winGame' }));
    expect(s.winner).toBe(1);
  });

  it('MAX・ザ・ジョニー：攻撃の終わりに、シールドが10以上なら勝つ', () => {
    let s = newGame();
    const j = put(s, 0, C.johnny.id, 'battle');
    for (let i = 0; i < 5; i++) put(s, 0, C.small.id, 'shield');
    expect(s.players[0].zones.shield.length).toBe(10);
    s = runTask(s, { kind: 'attackEnd', attacker: j } as never);
    s = settle(s);
    expect(s.winner).toBe(0);
  });

  it('ジョーカーズの心絵：各プレイヤーは1つずつ残し、残りを山札に加えてその数だけシールド化する', () => {
    let s = newGame();
    const k = put(s, 0, C.kokoroe.id, 'hand');
    const a1 = put(s, 0, C.small.id, 'battle');
    const a2 = put(s, 0, C.small.id, 'battle');
    const b1 = put(s, 1, C.small.id, 'battle');
    const b2 = put(s, 1, C.small.id, 'battle');
    const b3 = put(s, 1, C.wtama.id, 'battle');
    const sh0 = s.players[0].zones.shield.length;
    const sh1 = s.players[1].zones.shield.length;
    // 自分：クリーチャー a1 と心絵を残す。相手：何も残さない
    s = settle(enter(s, 0, k), true, (c, p) => (c.includes(a1) ? [a1, k] : p ? [] : undefined));
    expect([zone(s, a1), zone(s, k), zone(s, a2) === 'battle']).toEqual(['battle', 'battle', false]);
    expect([b1, b2, b3].every((x) => zone(s, x) !== 'battle')).toBe(true);
    expect(s.players[0].zones.shield.length).toBe(sh0 + 1);
    expect(s.players[1].zones.shield.length).toBe(sh1 + 3);
  });

  it('コーライルの海幻：選んだクリーチャーの持ち主が山札の下に置き、1枚引く', () => {
    let s = newGame();
    const c = put(s, 0, C.corail.id, 'hand');
    const foe = put(s, 1, C.small.id, 'battle');
    const h1 = s.players[1].zones.hand.length;
    const h0 = s.players[0].zones.hand.length;
    s = settle(enter(s, 0, c), true, only(foe));
    expect(zone(s, foe)).toBe('deck');
    expect(s.players[1].zones.deck[0]).toBe(foe);
    expect(s.players[1].zones.hand.length).toBe(h1 + 1);
    // 自分（このタマシードの持ち主）は引かない（手札からこのタマシードが出た分だけ減る）
    expect(s.players[0].zones.hand.length).toBe(h0 - 1);
  });

  it('♪なぜ離れ：選んだプレイヤーの墓地をすべて山札の下に置く', () => {
    const s = newGame();
    const g = [put(s, 1, C.small.id, 'graveyard'), put(s, 1, C.small.id, 'graveyard')];
    let t = s;
    const src = put(t, 0, C.naze.id, 'hand');
    t = settle(effect(t, 0, src, C.naze.abilities![0].effects[0]), true, undefined, ['1']);
    expect(g.map((x) => zone(t, x))).toEqual(['deck', 'deck']);
    expect(t.players[1].zones.graveyard.length).toBe(0);
  });

  it('AQ NETWORK：出た時、コスト5以下のタマシードか呪文を手札からコストを支払わずに使える（コスト6の呪文は選べない）', () => {
    let s = newGame();
    const aq = put(s, 0, C.aq.id, 'hand');
    const sp5 = put(s, 0, C.spell5.id, 'hand');
    const sp6 = put(s, 0, C.spell6.id, 'hand');
    const wt = put(s, 0, C.wtama.id, 'hand');
    let cands: string[] = [];
    s = settle(enter(s, 0, aq), true, (c) => ((cands = c), c.includes(wt) ? [wt] : undefined));
    expect(cands).toContain(sp5);
    expect(cands).not.toContain(sp6);
    expect(zone(s, wt)).toBe('battle');
  });

  it('AQ NETWORK：水のクリーチャー・タマシードが3つ以上なら、ブロッカーで、破壊される時に手札に戻る', () => {
    let s = newGame();
    const aq = put(s, 0, C.aq.id, 'battle');
    put(s, 0, C.water.id, 'battle');
    expect(keywords(s, reg, aq).blocker).toBeFalsy();
    put(s, 0, C.wtama.id, 'battle');
    expect(keywords(s, reg, aq).blocker).toBe(true);
    const src = put(s, 1, C.small.id, 'battle');
    s = settle(effect(s, 1, src, { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } }), true, only(aq));
    expect(zone(s, aq)).toBe('hand');
  });

  it('理想と平和の決断：山札の上2枚から光と水のカードを手札に／シールド化／コスト3以下のエレメントをシールド化', () => {
    let s = newGame();
    const [nat, wat] = stack(s, 0, [C.small.id, C.water.id]);
    const foe = put(s, 1, C.small.id, 'battle');
    const sh1 = s.players[1].zones.shield.length;
    const src = put(s, 0, C.ideal.id, 'hand');
    s = settle(effect(s, 0, src, C.ideal.abilities![0].effects[0]), true, only(foe), ['0', '2']);
    expect(zone(s, wat)).toBe('hand');
    expect(zone(s, nat)).toBe('deck');
    expect(s.players[0].zones.deck[0]).toBe(nat);
    expect(zone(s, foe)).toBe('shield');
    expect(s.players[1].zones.shield.length).toBe(sh1 + 1);
  });

  it('理想と平和の決断：同じものを2回選べる', () => {
    let s = newGame();
    const sh0 = s.players[0].zones.shield.length;
    const src = put(s, 0, C.ideal.id, 'hand');
    s = settle(effect(s, 0, src, C.ideal.abilities![0].effects[0]), true, undefined, ['1', '1']);
    expect(s.players[0].zones.shield.length).toBe(sh0 + 2);
  });

  it('アルカディアス・モモキング：はじめて出る相手のクリーチャーだけタップして出る', () => {
    let s = newGame();
    put(s, 0, C.momo.id, 'battle');
    const a = put(s, 1, C.small.id, 'hand');
    const b = put(s, 1, C.small.id, 'hand');
    s = settle(enter(s, 1, a));
    s = settle(enter(s, 1, b));
    expect([s.cards[a].tapped, s.cards[b].tapped]).toEqual([true, false]);
  });

  it('天風のゲイル・ヴェスパー：手札のクリーチャーに W・シンパシー（自身は2つ）', () => {
    const s = newGame();
    const g = put(s, 0, C.gale.id, 'battle');
    const big = put(s, 0, C.big.id, 'hand');
    const g2 = put(s, 0, C.gale.id, 'hand');
    // パワー12000以上：バトルゾーンのゲイル1体
    expect(effectiveCost(s, reg, 0, big)).toBe(5);
    expect(effectiveCost(s, reg, 0, g2)).toBe(6);
    put(s, 0, C.big.id, 'battle');
    expect(effectiveCost(s, reg, 0, big)).toBe(3);
    expect(effectiveCost(s, reg, 0, g2)).toBe(2);
    put(s, 0, C.big.id, 'battle');
    expect(effectiveCost(s, reg, 0, big)).toBe(1);
    // ゲイルがいなければ、ほかのクリーチャーは軽くならない
    new Ctx(s, reg).moveCard(g, 'graveyard');
    expect(effectiveCost(s, reg, 0, big)).toBe(7);
  });

  it('ジーク・ナハトファルター：自分のターンのはじめに、マナゾーンから手札に戻せる', () => {
    let s = newGame();
    const z = put(s, 0, C.ziek.id, 'mana');
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    s = settle(act(s, { type: 'END_TURN', player: 1 }), true);
    expect(zone(s, z)).toBe('hand');
  });

  it('ジーク・ナハトファルター：自身か他のパワー12000以上が出た時、山札の上から2枚をマナに置き、クリーチャーを1体マナから手札へ', () => {
    let s = newGame();
    const z = put(s, 0, C.ziek.id, 'hand');
    const m0 = s.players[0].zones.mana.length;
    const [c1] = stack(s, 0, [C.small.id, C.small.id]);
    s = settle(enter(s, 0, z), true, only(c1));
    expect(zone(s, c1)).toBe('hand');
    expect(s.players[0].zones.mana.length).toBe(m0 + 1);
    // パワーの小さいクリーチャーでは誘発しない
    const m1 = s.players[0].zones.mana.length;
    s = settle(enter(s, 0, put(s, 0, C.small.id, 'hand')));
    expect(s.players[0].zones.mana.length).toBe(m1);
    s = settle(enter(s, 0, put(s, 0, C.big.id, 'hand')));
    expect(s.players[0].zones.mana.length).toBe(m1 + 1);
  });

  it('ヴァム・ウィングダム：このターンにパワー12000以上で攻撃したクリーチャーがいれば攻撃できる', () => {
    let s = newGame();
    const v = put(s, 0, C.vam.id, 'battle');
    const sm = put(s, 0, C.small.id, 'battle');
    const big = put(s, 0, C.big.id, 'battle');
    s.phase = 'attack';
    expect(canAttackWith(s, reg, 0, v)).toBe(false);
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: sm, target: { kind: 'player' } }), false);
    expect(canAttackWith(s, reg, 0, v)).toBe(false);
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: big, target: { kind: 'player' } }), false);
    expect(canAttackWith(s, reg, 0, v)).toBe(true);
  });

  it('ジュラスティック・ハウル：相手はマナの枚数よりコストが大きいクリーチャーをすべてマナに置く', () => {
    const s = newGame();
    clearZone(s, 1, 'mana');
    for (let i = 0; i < 3; i++) put(s, 1, C.small.id, 'mana');
    const c3 = put(s, 1, C.small.id, 'battle');
    const c6 = put(s, 1, C.nature6.id, 'battle');
    const c7 = put(s, 1, C.big.id, 'battle');
    const t = settle(effect(s, 0, put(s, 0, C.jurano.id, 'hand'), C.jurano.twin!.abilities![0].effects[0]));
    expect([zone(t, c3), zone(t, c6), zone(t, c7)]).toEqual(['battle', 'mana', 'mana']);
  });

  it('デスマッチ・ビートル：相手のターンに相手がコストを支払わずに出したクリーチャーとバトルできる', () => {
    let s = newGame();
    s.activePlayer = 1;
    const d = put(s, 0, C.deathmatch.id, 'battle');
    const free = put(s, 1, C.nature6.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 1, iid: free }));
    expect(zone(s, free)).toBe('graveyard');
    expect(zone(s, d)).toBe('battle');
    // コストを支払って出したものとはバトルしない
    const paid = put(s, 1, C.nature6.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 1, iid: paid, paid: true } as never));
    expect(zone(s, paid)).toBe('battle');
  });

  it('デスマッチ・ビートル：自分のターンには誘発しない', () => {
    let s = newGame();
    put(s, 0, C.deathmatch.id, 'battle');
    const free = put(s, 1, C.nature6.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 1, iid: free }));
    expect(zone(s, free)).toBe('battle');
  });

  it('ナ・チュラルゴ・デンジャー：出た時と《トラップ》の呪文を唱えた時、自然のコスト6以下を手札かマナから出せる', () => {
    let s = newGame();
    const n = put(s, 0, C.natural.id, 'hand');
    const f6 = put(s, 0, C.fire6.id, 'hand');
    const n6 = put(s, 0, C.nature6.id, 'mana');
    let cands: string[] = [];
    s = settle(enter(s, 0, n), true, (c) => ((cands = c), c.includes(n6) ? [n6] : undefined));
    expect(cands).not.toContain(f6);
    expect(zone(s, n6)).toBe('battle');
    // 名前に《トラップ》とある呪文を唱えた時
    const n6b = put(s, 0, C.nature6.id, 'hand');
    const tr = put(s, 0, C.trap.id, 'hand');
    s.phase = 'main';
    for (let i = 0; i < 4; i++) put(s, 0, C.nature6.id, 'mana');
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: tr } as never), true, only(n6b));
    expect(zone(s, n6b)).toBe('battle');
    // それ以外の呪文では誘発しない
    const n6c = put(s, 0, C.nature6.id, 'hand');
    const nt = put(s, 0, C.nottrap.id, 'hand');
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: nt } as never), true, only(n6c));
    expect(zone(s, n6c)).toBe('hand');
  });

  it('ホールインワン・ヘラクレス：自然のクリーチャー・タマシードが4つ以上なければクリーチャーではない', () => {
    let s = newGame();
    const h = put(s, 0, C.herc.id, 'battle');
    expect(battleCards(s, reg, 0)).not.toContain(h);
    put(s, 0, C.ntama.id, 'battle');
    put(s, 0, C.nature6.id, 'battle');
    expect(battleCards(s, reg, 0)).not.toContain(h);
    put(s, 0, C.nature6.id, 'battle');
    expect(battleCards(s, reg, 0)).toContain(h);
    // 出た時：選んだプレイヤーの墓地を山札の下へ
    const g = put(s, 1, C.small.id, 'graveyard');
    s = settle(effect(s, 0, h, C.herc.abilities!.find((a) => a.when === 'onSummon')!.effects[0]), true, undefined, ['1']);
    expect(zone(s, g)).toBe('deck');
  });
});
