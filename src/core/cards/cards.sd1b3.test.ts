// ドキドキつよいデッキ 25の王道（その3）：手動だった能力を自動処理にしたカードの読み取りと動作
// カブトリアル・クーガ（ミステリー・ディザスター）・黒豆だんしゃく・闇参謀グラン・ギニョール・ニコル・ボーラス・不死鳥縫合 ブラック・ビッグバン・
// 勝災電融王 ギュカウツ・マグル・斬龍電融 オロチリュウセイ・特攻の忠剣ハチ公・D2V3 終断のレッドトロン・ストーム・ハイパーXX・Q.Q.QX.（終葬 5.S.D.）・
// シビレアシダケ・轟く革命 レッドギラゾーン・「合体」の頂 アクア・TITAAANS・不敗のダイハード・リュウセイ
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { canPlayAlt, canSummonFromZone, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '闇', type: o.type ?? 'クリーチャー', power: o.power ?? '1000', cost: o.cost ?? '1', abilities });
const mk = (id: string, name: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(name, abilities, o)] } as never);
/** ツインパクト（クリーチャー側と呪文側） */
const twin = (id: string, name: string, abilities: string[], o: O, spellName: string, spellAbilities: string[], so: O = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [face(name, abilities, o), face(spellName, spellAbilities, { type: '呪文', power: '', race: '', civ: o.civ, ...so })] } as never);

const MYSTERY = '自分の山札をシャッフルし、その後、上から１枚目を表向きにする。それがクリーチャーなら、バトルゾーンに出す。それ以外なら、自分のマナゾーンに置く。';
const KUROMAME = '相手の、「このクリーチャーがバトルゾーンに出た時」で始まる能力を持つクリーチャーがバトルゾーンに出た時、そのクリーチャーを持ち主のマナゾーンに置く。';
const MUGEN = 'ムゲンクライム ２（自分のクリーチャーを２体タップし、 [wd02]支払って、このクリーチャーを自分の手札または墓地から召喚してもよい）';
const GUIGNOL = ['このクリーチャーが出た時、次のうちいずれか１つを選ぶ。', '', '　▶︎他のクリーチャーを１体選び、持ち主の手札に戻す。', '', '　▶︎自分の山札の上から２枚を墓地に置き、その後、そのうちのどちらか１枚を手札に戻してもよい。'];
const BOLAS = 'このクリーチャーがバトルゾーンに出た時、相手は自身の手札から７枚選び、捨てる。';
const PHOENIX_NOLOSE = '自分の山札が０枚でも、自分はゲームに負けない。';
const PHOENIX_DRAW = '自分がカードを引く時、自分の山札が０枚なら、かわりにクリーチャーを１体、墓地から出してもよい。';
const GYUKAUTS = 'このクリーチャーが出た時、自分の山札の上から４枚を見る。その中からコストの合計が９以下になるよう、多色クリーチャーを好きな数選び、出す。残りを好きな順序で山札の下に置く。';
const OROCHI = '自分のターン中、自分の山札の上から１枚目をいつでも見てもよい。それがクリーチャーなら、召喚してもよい。';
const HACHI_DECK = 'このカードは、４枚より多くデッキに入れることができる。';
const HACHI_END = 'このクリーチャーの攻撃の終わりに、相手とガチンコ・ジャッジする。自分が勝ったら、自分の山札を見る。その中から、《特攻の忠剣ハチ公》を１体、バトルゾーンに出してもよい。その後、山札をシャッフルする。';
const D2V3 = 'このクリーチャーを召喚する時、自分の手札を１枚捨ててもよい。そうしたら、このクリーチャーの召喚コストを２少なくする。';
const STORM = 'このクリーチャーが出た時、これよりパワーが小さい相手のクリーチャーをすべて破壊する。';
const QX = [
  '５.S.D.：このクリーチャーがシールドをブレイクする時、相手はそのシールドのカードを手札に加えるかわりに、自身の山札の上から４枚目の位置に、横向きに刺す。',
  '相手は、自身の山札の横向きのカードを手札に加えた時、ゲームに負ける。',
  '相手は、自身の山札を見たり、順番を入れ替えたりできない。',
  'このクリーチャーがバトルゾーンを離れた時、相手は自身の山札をシャッフルする。',
];
const QX_SPELL = ['相手のクリーチャーを１体選ぶ。相手はそれを、自身の山札の上から４枚目の位置に、横向きに刺す。', 'このカードをバトルゾーンに出す。'];
const SHIBIRE = 'このクリーチャーがバトルゾーンに出たとき、自分の手札からカードを１枚選び、自分のマナゾーンに置いてよい。';
const GIRAZON = '自分のコマンドはすべて「スピードアタッカー」と「マッハファイター」を持ち、ブロックされない。';
const TITAN = '相手のクリーチャーが出た時、相手とガチンコ・ジャッジをする。自分が勝ったら、カードを１枚引き、このターン、相手のクリーチャーはすべて攻撃できない。';
const DIEHARD_REP = '自分がゲームに負ける時、または相手が勝つ時、かわりにこのクリーチャーを破壊する。';
const DIEHARD_DESTROYED = 'このクリーチャーが破壊された時、そのターン、自分はゲームに負けず、相手は勝てない。';

const C = {
  kuga: twin('b3-1', 'くーが', ['T・ブレイカー'], { civ: '自然', cost: '8', power: '13000' }, 'みすてりー', [MYSTERY], { cost: '5' }),
  kuromame: mk('b3-2', 'くろまめ', ['T・ブレイカー', KUROMAME], { civ: '自然', cost: '8', power: '12000' }),
  guignol: mk('b3-3', 'ぎにょーる', ['S・トリガー', MUGEN, ...GUIGNOL], { civ: '水/闇', cost: '8', power: '4000' }),
  bolas: mk('b3-4', 'ぼーらす', ['W・ブレイカー', BOLAS], { civ: '水/闇/火', cost: '8', power: '7000' }),
  phoenix: mk('b3-5', 'ふぇにっくす', ['T・ブレイカー', PHOENIX_NOLOSE, PHOENIX_DRAW], { civ: '水/闇/自然', cost: '8', power: '13000' }),
  gyukauts: mk('b3-6', 'ぎゅかうつ', ['T・ブレイカー', GYUKAUTS], { civ: '水/火/自然', cost: '8', power: '15000' }),
  orochi: mk('b3-7', 'おろち', ['T・ブレイカー', OROCHI], { civ: '水/火/自然', cost: '8', power: '17000' }),
  hachi: mk('b3-8', '特攻の忠剣ハチ公', [HACHI_DECK, 'スピードアタッカー', HACHI_END], { civ: '火', cost: '4', power: '3000' }),
  d2v3: mk('b3-9', 'れっどとろん', [D2V3], { civ: '火', cost: '5', power: '5000' }),
  storm: mk('b3-10', 'すとーむ', ['パワード・ブレイカー', 'コストが異なる自分のクリーチャー１体につき、このクリーチャーのパワーを+3000する。', STORM], { civ: '火', cost: '11', power: '0' }),
  qx: twin('b3-11', 'Q.Q.QX.', QX, { civ: '自然', cost: '4', power: '4000' }, '終葬 5.S.D.', QX_SPELL, { cost: '8' }),
  shibire: mk('b3-12', 'しびれあしだけ', [SHIBIRE], { civ: '自然', cost: '2', power: '1000' }),
  girazon: mk('b3-13', 'ぎらぞーん', ['W・ブレイカー', GIRAZON], { civ: '水/火/自然', cost: '7', power: '11000', race: 'ソニック・コマンド・ドラゴン' }),
  titan: mk('b3-14', 'たいたん', ['T・ブレイカー', TITAN], { civ: '水', cost: '10', power: '12000' }),
  diehard: mk('b3-15', 'だいはーど', ['W・ブレイカー', DIEHARD_REP, DIEHARD_DESTROYED], { civ: '火', cost: '8', power: '8000' }),
  // 動作を確かめるための部品
  small: mk('b3-20', 'ちいさい', [], { civ: '火', cost: '3', power: '1000' }),
  big: mk('b3-21', 'おおきい', [], { civ: '火', cost: '7', power: '12000' }),
  etb: mk('b3-22', 'でたとき', ['このクリーチャーが出た時、カードを１枚引く。'], { civ: '水', cost: '2', power: '2000' }),
  water: mk('b3-23', 'みず', [], { civ: '水', cost: '2', power: '2000' }),
  dark: mk('b3-24', 'やみ', [], { civ: '闇', cost: '2', power: '2000' }),
  multi3: mk('b3-25', 'たしょく3', [], { civ: '水/火', cost: '3', power: '3000' }),
  multi4: mk('b3-26', 'たしょく4', [], { civ: '水/火', cost: '4', power: '4000' }),
  multi5: mk('b3-27', 'たしょく5', [], { civ: '水/火', cost: '5', power: '5000' }),
  spellx: mk('b3-28', 'じゅもん', ['カードを１枚引く。'], { type: '呪文', power: '', race: '', civ: '水', cost: '2' }),
  command: mk('b3-29', 'こまんど', [], { civ: '火', cost: '5', power: '5000', race: 'フレイム・コマンド' }),
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
/** 山札をすべて墓地に置く */
function emptyDeck(s: GameState, p: PlayerId): void {
  const ctx = new Ctx(s, reg);
  for (const x of [...s.players[p].zones.deck]) ctx.moveCard(x, 'graveyard');
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
const effect = (s: GameState, controller: PlayerId, source: string, e: Extract<GameState['queue'][number], { kind: 'effect' }>['effect']) => runTask(s, { kind: 'effect', controller, source, effect: e });
const all: Pick = (c) => c;
const only = (x: string): Pick => (c) => (c.includes(x) ? [x] : undefined);

describe('SD1その3の読み取り', () => {
  it('15枚とも自動の効果になる', () => {
    for (const c of Object.values(C).slice(0, 15)) expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('ミステリー・ディザスター：シャッフルして1枚目を表向きに。クリーチャーなら必ず出し、それ以外はマナへ', () => {
    expect(C.kuga.twin?.abilities?.[0].effects).toEqual([{ type: 'shuffleDeck' }, { type: 'revealTopCard', ifCreature: 'battle', mustPlay: true, otherwise: 'mana' }]);
  });
  it('黒豆だんしゃく・ギニョール・ボーラス', () => {
    expect(C.kuromame.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onOtherSummon', who: 'opponent', filter: { hasOnSummonAbility: true } }));
    expect(C.guignol.altPlays?.map((a) => [a.cost, a.civilizations, a.from])).toEqual([
      [2, ['water', 'darkness'], undefined],
      [2, ['water', 'darkness'], 'graveyard'],
    ]);
    const ch = C.guignol.abilities?.[0].effects[0];
    expect(ch?.type === 'chooseOne' && ch.options.length).toBe(2);
    expect(C.bolas.abilities?.[0].effects).toEqual([{ type: 'move', target: { owner: 'opponent', zone: 'hand', count: 7, chooser: 'owner' }, to: 'graveyard' }]);
  });
  it('不死鳥縫合・ギュカウツ・オロチ・ハチ公', () => {
    expect(C.phoenix.statics?.map((x) => x.type)).toEqual(['cannotLose', 'emptyDrawInstead']);
    expect(C.phoenix.statics?.[0]).toEqual({ type: 'cannotLose', who: 'self', deckOutOnly: true });
    expect(C.gyukauts.abilities?.[0].effects[0]).toEqual(expect.objectContaining({ type: 'lookAtTop', pickMaxTotalCost: 9, pickFilter: { multicolor: true, cardType: 'creature' } }));
    expect(C.orochi.statics?.[0]).toEqual(expect.objectContaining({ type: 'summonFromZone', zone: 'deck', duringTurn: 'self' }));
    // デッキに入れる枚数のきまりはゲーム中の効果にならない
    expect(C.hachi.abilities?.map((a) => a.when)).toEqual(['onAttackEnd']);
  });
  it('D2V3・ストーム・QX・シビレアシダケ・レッドギラゾーン・TITAAANS・ダイハード', () => {
    expect(C.d2v3.altPlays).toEqual([expect.objectContaining({ reduce: 2 })]);
    expect(C.storm.abilities?.[0].effects[0]).toEqual(expect.objectContaining({ type: 'destroy' }));
    expect(C.qx.keywords?.shieldBreakTo).toBe('deckFourthSideways');
    expect(C.qx.statics?.map((x) => x.type)).toEqual(['sidewaysToHandLoses', 'deckLocked']);
    expect(C.qx.twin?.abilities?.[0].effects[0]).toEqual(expect.objectContaining({ to: 'deckTop', deckPos: 4, sideways: true }));
    expect(C.shibire.abilities?.[0].when).toBe('onSummon');
    expect(C.girazon.statics?.[0]).toEqual(expect.objectContaining({ appliesTo: { owner: 'self', filter: { race: 'コマンド' } } }));
    expect(C.titan.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onOtherSummon', who: 'opponent' }));
    expect(C.diehard.replacements).toEqual([{ event: 'lose', subject: 'self', instead: 'destroySelf' }]);
  });
});

describe('SD1その3の動作', () => {
  it('ミステリー・ディザスター：1枚目がクリーチャーなら確認せずに出し、そうでなければマナゾーンに置く', () => {
    let s = newGame();
    const k = put(s, 0, C.kuga.id, 'hand');
    emptyDeck(s, 0);
    const [a, b] = stack(s, 0, [C.small.id, C.small.id]);
    s = runTask(s, { kind: 'castSpell', player: 0, iid: k, side: 'twin', from: 'hand' });
    expect(s.pending).toBeNull();
    expect([zone(s, a), zone(s, b)].sort()).toEqual(['battle', 'deck']);

    s = newGame();
    const k2 = put(s, 0, C.kuga.id, 'hand');
    emptyDeck(s, 0);
    const [c, d] = stack(s, 0, [C.spellx.id, C.spellx.id]);
    s = runTask(s, { kind: 'castSpell', player: 0, iid: k2, side: 'twin', from: 'hand' });
    expect([zone(s, c), zone(s, d)].sort()).toEqual(['deck', 'mana']);
  });

  it('黒豆だんしゃく：相手の「出た時」能力を持つクリーチャーが出たら、マナゾーンに置く', () => {
    let s = newGame();
    put(s, 0, C.kuromame.id, 'battle');
    const e = put(s, 1, C.etb.id, 'hand');
    const n = put(s, 1, C.small.id, 'hand');
    s = settle(enter(s, 1, e));
    s = settle(enter(s, 1, n));
    expect([zone(s, e), zone(s, n)]).toEqual(['mana', 'battle']);
  });

  it('グラン・ギニョール：ムゲンクライム2で、クリーチャー2体をタップし [wd02] を支払って墓地から召喚できる', () => {
    let s = newGame();
    const c1 = put(s, 0, C.small.id, 'battle');
    const g = put(s, 0, C.guignol.id, 'graveyard');
    put(s, 0, C.water.id, 'mana');
    put(s, 0, C.dark.id, 'mana');
    s.phase = 'main';
    // アンタップのクリーチャーが1体では使えない
    expect(canPlayAlt(s, reg, 0, g, 1)).toBe(false);
    const c2 = put(s, 0, C.small.id, 'battle');
    expect(canPlayAlt(s, reg, 0, g, 1)).toBe(true);
    const [x1, x2] = stack(s, 0, [C.big.id, C.small.id]);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: g, alt: 1 }), true, (c, prompt) => (/手札/.test(prompt) && c.includes(x1) ? [x1] : undefined), ['1']);
    expect(zone(s, g)).toBe('battle');
    expect([s.cards[c1].tapped, s.cards[c2].tapped]).toEqual([true, true]);
    // 出た時：山札の上2枚を墓地に置き、そのうち1枚を手札に戻す
    expect([zone(s, x1), zone(s, x2)]).toEqual(['hand', 'graveyard']);
  });

  it('ギニョール：出た時に他のクリーチャーを手札に戻すこともできる', () => {
    let s = newGame();
    const o = put(s, 1, C.big.id, 'battle');
    const g = put(s, 0, C.guignol.id, 'hand');
    s = settle(enter(s, 0, g), true, only(o), ['0']);
    expect([zone(s, o), zone(s, g)]).toEqual(['hand', 'battle']);
  });

  it('ニコル・ボーラス：相手は手札から7枚選んで捨てる', () => {
    let s = newGame();
    for (let i = 0; i < 4; i++) put(s, 1, C.small.id, 'hand');
    const before = hand(s, 1);
    s = settle(enter(s, 0, put(s, 0, C.bolas.id, 'hand')), true, (c) => c.slice(0, 7));
    expect(hand(s, 1)).toBe(before - 7);
  });

  it('不死鳥縫合：山札が0枚でも負けず、引く時はかわりに墓地からクリーチャーを出す', () => {
    let s = newGame();
    put(s, 0, C.phoenix.id, 'battle');
    emptyDeck(s, 0);
    const b = put(s, 0, C.big.id, 'graveyard');
    s = settle(effect(s, 0, b, { type: 'draw', count: 1 }), true, only(b));
    expect(s.gameOverReason).toBeNull();
    expect(zone(s, b)).toBe('battle');
  });

  it('ギュカウツ・マグル：上4枚から、コストの合計が9以下になるよう多色クリーチャーを出す', () => {
    let s = newGame();
    const [m5, mono, m4, m3] = stack(s, 0, [C.multi5.id, C.small.id, C.multi4.id, C.multi3.id]);
    let cands: string[] = [];
    s = settle(enter(s, 0, put(s, 0, C.gyukauts.id, 'hand')), true, (c) => {
      cands = c;
      return all(c, '');
    });
    expect(cands.sort()).toEqual([m3, m4, m5].sort());
    expect([zone(s, m3), zone(s, m4), zone(s, m5), zone(s, mono)]).toEqual(['battle', 'battle', 'deck', 'deck']);
    expect(s.players[0].zones.deck.slice(0, 2).sort()).toEqual([m5, mono].sort());
  });

  it('オロチリュウセイ：自分のターン中、山札の上のクリーチャーを召喚できる（上の1枚だけ）', () => {
    let s = newGame();
    put(s, 0, C.orochi.id, 'battle');
    for (let i = 0; i < 3; i++) put(s, 0, C.small.id, 'mana');
    const [second, top] = stack(s, 0, [C.small.id, C.small.id]);
    s.phase = 'main';
    expect([canSummonFromZone(s, reg, 0, top), canSummonFromZone(s, reg, 0, second)]).toEqual([true, false]);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: top }));
    expect(zone(s, top)).toBe('battle');
    s.activePlayer = 1;
    expect(canSummonFromZone(s, reg, 0, second)).toBe(false);
  });

  it('特攻の忠剣ハチ公：攻撃の終わりにガチンコ・ジャッジに勝てば、山札から《ハチ公》を出す', () => {
    let s = newGame();
    const h = put(s, 0, C.hachi.id, 'battle');
    const [h2] = stack(s, 0, [C.hachi.id, C.big.id]);
    stack(s, 1, [C.small.id]);
    const t = put(s, 1, C.small.id, 'battle');
    s.cards[t].tapped = true;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: h, target: { kind: 'creature', iid: t } }), true, only(h2));
    expect([zone(s, t), zone(s, h2)]).toEqual(['graveyard', 'battle']);
  });

  it('D2V3：手札を1枚捨てると、召喚コストが2少なくなる', () => {
    let s = newGame();
    for (let i = 0; i < 3; i++) put(s, 0, C.small.id, 'mana');
    const d = put(s, 0, C.d2v3.id, 'hand');
    const x = s.players[0].zones.hand.find((i) => i !== d)!;
    s.phase = 'main';
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: d, alt: 0 }), true, only(x));
    expect([zone(s, d), zone(s, x)]).toEqual(['battle', 'graveyard']);
  });

  it('ストーム・ハイパーXX：出た時、これよりパワーが小さい相手のクリーチャーをすべて破壊する', () => {
    let s = newGame();
    const a = put(s, 1, C.small.id, 'battle');
    const b = put(s, 1, C.big.id, 'battle');
    s = settle(enter(s, 0, put(s, 0, C.storm.id, 'hand')));
    expect([zone(s, a), zone(s, b)]).toEqual(['graveyard', 'battle']);
  });

  it('Q.Q.QX.：ブレイクしたシールドは相手の山札の上から4枚目に横向きに刺し、それを手札に加えたら相手の負け', () => {
    let s = newGame();
    const q = put(s, 0, C.qx.id, 'battle');
    const sh = [...s.players[1].zones.shield];
    const h = hand(s, 1);
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: q, target: { kind: 'player' } }));
    const tucked = sh.filter((x) => zone(s, x) === 'deck');
    expect(tucked.length).toBe(1);
    expect(hand(s, 1)).toBe(h);
    const deck = s.players[1].zones.deck;
    expect(deck.indexOf(tucked[0])).toBe(deck.length - 4);
    expect(s.cards[tucked[0]].sideways).toBe(true);
    // 3枚引いても負けない。4枚目（横向き）を引いたら負け
    s = effect(s, 1, deck[0], { type: 'draw', count: 3 });
    expect(s.gameOverReason).toBeNull();
    s = effect(s, 1, deck[0], { type: 'draw', count: 1 });
    expect(s.winner).toBe(0);
  });

  it('Q.Q.QX.：相手は山札をシャッフルできず、自身の山札を見られない。離れたらシャッフルする', () => {
    let s = newGame();
    const q = put(s, 0, C.qx.id, 'battle');
    const src = put(s, 1, C.small.id, 'battle');
    const order = [...s.players[1].zones.deck];
    s = effect(s, 1, src, { type: 'shuffleDeck' });
    expect(s.players[1].zones.deck).toEqual(order);
    s = settle(effect(s, 1, src, { type: 'lookAtTop', count: 3, pickCount: 1, pickTo: 'hand', restTo: 'deckBottom' }));
    expect(s.players[1].zones.deck).toEqual(order);
    // 自分（QX の持ち主）の山札はシャッフルできる
    const mine = [...s.players[0].zones.deck];
    s = effect(s, 0, q, { type: 'shuffleDeck' });
    expect(s.players[0].zones.deck).not.toEqual(mine);
    s = settle(effect(s, 1, src, { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } }), true, only(q));
    expect(zone(s, q)).toBe('graveyard');
    expect(s.players[1].zones.deck).not.toEqual(order);
  });

  it('終葬 5.S.D.：相手のクリーチャーを山札の上から4枚目に横向きに刺し、このカードを出す', () => {
    let s = newGame();
    const o = put(s, 1, C.big.id, 'battle');
    const q = put(s, 0, C.qx.id, 'hand');
    s = settle(runTask(s, { kind: 'castSpell', player: 0, iid: q, side: 'twin', from: 'hand' }), true, only(o));
    const deck = s.players[1].zones.deck;
    expect([zone(s, o), deck.indexOf(o), s.cards[o].sideways]).toEqual(['deck', deck.length - 4, true]);
    expect(zone(s, q)).toBe('battle');
  });

  it('シビレアシダケ：出た時、手札から1枚マナゾーンに置いてもよい', () => {
    let s = newGame();
    const x = s.players[0].zones.hand[0];
    s = settle(enter(s, 0, put(s, 0, C.shibire.id, 'hand')), true, only(x));
    expect(zone(s, x)).toBe('mana');
  });

  it('レッドギラゾーン：自分のコマンドはスピードアタッカー・マッハファイターを持ち、ブロックされない', () => {
    const s = newGame();
    put(s, 0, C.girazon.id, 'battle');
    const c = put(s, 0, C.command.id, 'battle');
    const n = put(s, 0, C.small.id, 'battle');
    expect(keywords(s, reg, c)).toEqual(expect.objectContaining({ speedAttacker: true, machFighter: true, unblockable: true }));
    expect(keywords(s, reg, n).unblockable).toBeFalsy();
  });

  it('アクア・TITAAANS：相手のクリーチャーが出た時、ガチンコ・ジャッジに勝てば1枚引き、相手のクリーチャーはこのターン攻撃できない', () => {
    let s = newGame();
    put(s, 0, C.titan.id, 'battle');
    stack(s, 0, [C.big.id]);
    stack(s, 1, [C.small.id]);
    const h = hand(s, 0);
    const e = put(s, 1, C.small.id, 'hand');
    s = settle(enter(s, 1, e));
    expect(hand(s, 0)).toBe(h + 1);
    expect(keywords(s, reg, e).cannotAttack).toBe(true);
  });

  it('ダイハード・リュウセイ：負ける時かわりに破壊され、そのターンは負けない', () => {
    let s = newGame();
    const d = put(s, 0, C.diehard.id, 'battle');
    const o = put(s, 1, C.small.id, 'battle');
    s = effect(s, 1, o, { type: 'winGame' });
    expect(s.gameOverReason).toBeNull();
    expect(zone(s, d)).toBe('graveyard');
    // 破壊された時の能力で、そのターンは負けない（山札が0枚でも）
    emptyDeck(s, 0);
    s = settle(effect(s, 1, o, { type: 'winGame' }));
    expect(s.gameOverReason).toBeNull();
  });

  it('ダイハード・リュウセイ：山札切れで負ける時も、破壊してそのターンは負けない', () => {
    let s = newGame();
    const d = put(s, 0, C.diehard.id, 'battle');
    emptyDeck(s, 0);
    s = settle(effect(s, 0, d, { type: 'draw', count: 1 }));
    expect(s.gameOverReason).toBeNull();
    expect(zone(s, d)).toBe('graveyard');
  });
});
