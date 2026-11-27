// ドキドキつよいデッキ 25の王道（その6）：手動だった能力を自動処理にしたカードの読み取りと動作
// アシステスト・シネラリア・キャディ・ビートル・とこしえの超人・チアスカーレット アカネ・完璧妖精マリニャンX・超球の超人・超重竜 ゴルファンタジスタ・
// 銀河竜 ゴルファンタジスタ・悪魔世界の閃光・鎧機天 シロフェシー・ボルメテウス・武者・ドラゴン「武偉」・竜装 ゴウソク・タキオンアーマー・
// 竜装 ザンゲキ・マッハアーマー・ヴァルキリアス・武者・ムサシ「弐天」・竜牙 リュウジン・ドスファング
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { canCross, canPlay, crossCost, effectiveCost, keywords, playRestriction, power } from '../engine/queries';
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
const SPELL: O = { type: '呪文', power: '', race: '' };
const TAMA: O = { type: 'タマシード', power: '' };
const GEAR: O = { type: 'クロスギア', power: '' };

const CIN_COST = '自分のジャイアントを使うコストを１少なくする。ただし、コストは０以下にはならない。';
const CIN_SABER = 'ウルトラ・セイバー：ジャイアント（自分のジャイアントが離れる時、かわりにこのクリーチャーを破壊してもよい）';
const CADDY = '相手のターン中、相手が、自身のマナゾーンのカードの枚数よりコストが大きいクリーチャーを出す時、かわりにマナゾーンに置く。';
const TOKO = '相手が自身の手札以外からカードを出す時、かわりにマナゾーンに置く。';
const AKANE = '自分のターン中、ジャイアントを１体、自分のマナゾーンから召喚してもよい。そうしたら、自分の山札の上から１枚目をマナゾーンに置く。';
const MAR_MANA = 'このクリーチャーを、自分のマナゾーンから召喚してもよい。';
const MAR_SUPP = '相手のクリーチャーが出て、その能力がトリガーする時、自分のスノーフェアリーが５つ以上あれば、かわりにその能力はトリガーしない。';
const SUPERBALL = '相手はコスト５以下の、クリーチャーではないカードを使えない。';
const FINAL =
  '終極宣言：自分のターンのはじめに、自分の手札と同じ枚数のカードを引いてもよい。その後、自分のマナゾーンにあるカードと同じ枚数のカードを、自分の山札の上からマナゾーンに置いてもよい。（「終極宣言」は、ゲーム中に一度だけ使える）';
const GINGA = '自分の他のジャイアントが相手のクリーチャーとバトルする時、かわりにこのクリーチャーにバトルさせてもよい。';
const YOBI = 'ヨビニオン（自分の山札の上から、この呪文よりコストが小さいクリーチャーが出るまで表向きにしてもよい。そのクリーチャーを出す。残りをシャッフルし、山札の下に置く）';
const REVO =
  '革命チェンジ：コスト３以上のアーマードまたはコスト３以上のメカ（自分のコスト３以上のアーマードまたはコスト３以上のメカが攻撃する時、そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい）';
const GENERATE = '侍流ジェネレート（このクリーチャーが出た時、自分の手札にあるクロスギアを１枚、コストを支払わずにジェネレートしてもよい）';
const TACHYON = '自分のクロスギアをジェネレートしたりクロスするコストは１少なくなる。ただし、コストは０以下にはならない。';
const ZAN_PWR = 'このカードがドラゴンまたはサムライにクロスされている時、バトルゾーンにある自分のドラゴンとサムライ・クリーチャーのパワーは+2000され、「スピードアタッカー」を得る。';
const ZAN_FREE = 'このカードは、コストを支払わずに《ボルメテウス・武者・ドラゴン》にクロスしてもよい。';
const NITEN_ETB = 'このクリーチャーが出た時、自分の火のエレメントの数以下のコストの相手のエレメントを１つ選び、破壊する。その後、自分の光のエレメント１つにつき、カードを１枚引いてもよい。';
const NITEN_ATK = 'このクリーチャーが攻撃する時、自分の手札から、自分の手札の枚数以下のコストを持つ進化ではない、サムライまたはアーマードを１枚、コストを支払わずに使ってもよい。';
const DOS = 'このクロスギアをコストを支払わずにサムライ・クリーチャーにクロスしてもよい。';

const C = {
  cineraria: mk('b6-1', 'しねらりあ', ['このクリーチャーが出た時、自分の他のジャイアントがあれば、カードを１枚引く。', CIN_COST, CIN_SABER], { civ: '水', cost: '3', power: '2000', race: 'ジャイアント・スノーフェアリー' }),
  caddy: mk('b6-2', 'きゃでぃ', [CADDY, 'このクリーチャーが破壊される時、墓地に置くかわりにマナゾーンに置く。'], { cost: '2', race: 'ジャイアント・インセクト' }),
  toko: mk('b6-3', 'とこしえ', ['このクリーチャーは、相手プレイヤーを攻撃できない。', TOKO], { cost: '1', power: '4000', race: 'ジャイアント' }),
  akane: mk('b6-4', 'あかね', ['W・ブレイカー', AKANE], { cost: '5', power: '7000', race: 'ジャイアント・スノーフェアリー' }),
  marinyan: mk('b6-5', 'まりにゃん', [MAR_MANA, 'マッハファイター', 'W・ブレイカー', MAR_SUPP], { cost: '5', power: '8000', race: 'ジャイアント・スノーフェアリー' }),
  superball: mk('b6-6', 'ちょうきゅう', ['T・ブレイカー', SUPERBALL], { cost: '8', power: '12000', race: 'ジャイアント' }),
  chojuryu: mk('b6-7', 'ちょうじゅうりゅう', ['T・ブレイカー', FINAL], { civ: '水/自然', cost: '7', power: '12000', race: 'ジャイアント・ドラゴン' }),
  ginga: mk('b6-8', 'ぎんがりゅう', ['T・ブレイカー', GINGA], { civ: '水/自然', cost: '7', power: '13000', race: 'ジャイアント・ドラゴン' }),
  akuma: mk('b6-9', 'あくませかい', ['S・トリガー', YOBI], { civ: '光', ...SPELL, cost: '6' }),
  shirofe: mk('b6-10', 'しろふぇしー', [REVO, 'ブロッカー', 'W・ブレイカー'], { civ: '光', cost: '4', power: '6500', race: 'アーマード・メカ・セレス' }),
  bui: mk('b6-11', 'ボルメテウス・武者・ドラゴン「武偉」', [GENERATE, 'W・ブレイカー'], { civ: '火', cost: '4', power: '6000', race: 'アーマード・ドラゴン/アーマード・サムライ' }),
  tachyon: mk('b6-12', 'たきおん', ['クロスギア', TACHYON, 'これをクロスしたクリーチャーのパワーを+1000する。'], { civ: '火', ...GEAR, cost: '2', race: 'アーマード・サムライ' }),
  zangeki: mk('b6-13', 'ざんげき', ['クロスギア', ZAN_PWR, ZAN_FREE], { civ: '火', ...GEAR, cost: '4', race: 'サムライ' }),
  niten: mk('b6-14', 'にてん', ['W・ブレイカー', NITEN_ETB, NITEN_ATK], { civ: '光/火', cost: '5', power: '6000', race: 'アーマード・ドラゴン' }),
  dosfang: mk('b6-15', 'どすふぁんぐ', ['クロスギア', DOS], { civ: '光/火', ...GEAR, cost: '5', race: 'アーマード・サムライ' }),
  // 動作を確かめるための部品
  giant: mk('b6-20', 'じゃいあんと', [], { cost: '6', power: '6000', race: 'ジャイアント' }),
  small: mk('b6-21', 'ちいさい', [], { civ: '火', cost: '3', power: '1000' }),
  big: mk('b6-22', 'おおきい', [], { civ: '闇', cost: '7', power: '9000' }),
  tama: mk('b6-23', 'たましーど', [], { ...TAMA, cost: '3' }),
  spell5: mk('b6-24', 'じゅもん5', ['カードを１枚引く。'], { civ: '水', ...SPELL, cost: '5' }),
  spell6: mk('b6-25', 'じゅもん6', ['カードを１枚引く。'], { civ: '水', ...SPELL, cost: '6' }),
  etbDraw: mk('b6-26', 'でたらひく', ['このクリーチャーが出た時、カードを１枚引く。'], { civ: '水', cost: '2', power: '2000' }),
  snowTama: mk('b6-27', 'ゆきたま', [], { ...TAMA, cost: '2', race: 'スノーフェアリー' }),
  samurai: mk('b6-28', 'さむらい', [], { civ: '火', cost: '3', power: '3000', race: 'サムライ' }),
  borume: mk('b6-29', 'ボルメテウス・武者・ドラゴン', [], { civ: '火', cost: '7', power: '9000', race: 'アーマード・ドラゴン/サムライ' }),
  armored3: mk('b6-30', 'あーまーど3', [], { civ: '火', cost: '3', power: '3000', race: 'ヒューマノイド・アーマード' }),
  mecha2: mk('b6-31', 'めか2', [], { civ: '光', cost: '2', power: '2000', race: 'メカ・セレス' }),
  mecha3: mk('b6-32', 'めか3', [], { civ: '光', cost: '3', power: '3000', race: 'メカ・セレス' }),
  light: mk('b6-33', 'ひかり', [], { civ: '光', cost: '2', power: '2000' }),
  fire: mk('b6-34', 'ひ', [], { civ: '火', cost: '4', power: '4000' }),
  fireGear: mk('b6-35', 'ひのぎあ', ['クロスギア'], { civ: '火', ...GEAR, cost: '2' }),
  opp4: mk('b6-36', 'あいて4', [], { civ: '闇', cost: '4', power: '4000' }),
  samuraiEvo: mk('b6-37', 'さむらいしんか', [], { civ: '火', type: '進化クリーチャー', cost: '2', power: '5000', race: 'サムライ' }),
  armoredSpell: mk('b6-38', 'あーまーどじゅもん', ['カードを１枚引く。'], { civ: '火', ...SPELL, cost: '6' }),
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
const mana = (s: GameState, p: PlayerId, cardId: string, n: number) => Array.from({ length: n }, () => put(s, p, cardId, 'mana'));

describe('SD1その6の読み取り', () => {
  it('15枚とも自動の効果になる', () => {
    for (const c of Object.values(C).slice(0, 15)) expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('シネラリア：ジャイアントを使うコストと、ウルトラ・セイバー：ジャイアント', () => {
    expect(C.cineraria.statics).toContainEqual({ type: 'costMod', amount: -1, appliesTo: { owner: 'self', filter: { race: 'ジャイアント' } } });
    expect(C.cineraria.replacements).toEqual([{ event: 'leaveBattle', subject: 'otherOwn', filter: { race: 'ジャイアント', cardType: 'creature' }, instead: 'destroySelf', optional: true }]);
  });
  it('キャディ・ビートル・とこしえの超人：出る時かわりにマナゾーンへ', () => {
    expect(C.caddy.statics?.[0]).toEqual({ type: 'enterInstead', who: 'opponent', filter: { costAboveOwnerMana: true }, to: 'mana', duringTurn: 'opponent' });
    expect(C.toko.statics?.[0]).toEqual({ type: 'enterInstead', who: 'opponent', to: 'mana', exceptFromHand: true, anyCard: true });
  });
  it('アカネ・マリニャン：マナゾーンから召喚', () => {
    expect(C.akane.statics?.[0]).toEqual(expect.objectContaining({ type: 'summonFromZone', zone: 'mana', then: [{ type: 'deckTopTo', count: 1, to: 'mana' }] }));
    expect(C.marinyan.summonFrom).toEqual({ zones: ['mana'] });
    expect(C.marinyan.statics?.[0]).toEqual(expect.objectContaining({ type: 'suppressEnterTriggers', subjectOnly: true }));
  });
  it('超球の超人・終極宣言・銀河竜', () => {
    expect(C.superball.statics?.[0]).toEqual({ type: 'cannotUse', who: 'opponent', filter: { maxCost: 5 }, nonCreature: true });
    expect(C.chojuryu.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onTurnStart', onceName: '終極宣言', optional: true }));
    expect(C.ginga.statics?.[0]).toEqual({ type: 'battleSubstitute', filter: { cardType: 'creature', race: 'ジャイアント' } });
  });
  it('呪文のヨビニオン・革命チェンジの「または」', () => {
    expect(C.akuma.abilities?.[0]).toEqual(expect.objectContaining({ when: 'onCast', optional: true, effects: [expect.objectContaining({ type: 'revealUntil', filter: { relativeToSource: { stat: 'cost', cmp: 'less' }, cardType: 'creature' } })] }));
    expect(C.shirofe.attackSwap).toEqual({ kind: 'revolution', filter: { anyOf: [{ minCost: 3, race: 'アーマード' }, { minCost: 3, race: 'メカ' }] } });
  });
  it('クロスギアの4枚と武偉・弐天', () => {
    expect(C.bui.abilities?.[0]).toEqual({ when: 'onSummon', optional: true, effects: [{ type: 'playFromHandFree', filter: { typeLabelIncludes: 'クロスギア' } }] });
    expect(C.tachyon.statics?.[0]).toEqual(expect.objectContaining({ type: 'costMod', appliesTo: { owner: 'self', filter: { typeLabelIncludes: 'クロスギア' } } }));
    expect(C.zangeki.statics?.map((x) => x.type)).toEqual(['powerMod', 'grantKeyword', 'freeCross']);
    expect(C.dosfang.statics?.[0]).toEqual({ type: 'freeCross', filter: { cardType: 'creature', race: 'サムライ' } });
    expect(C.niten.abilities?.map((a) => a.when)).toEqual(['onSummon', 'onAttack']);
  });
});

describe('SD1その6の動作', () => {
  it('シネラリア：自分のジャイアントのコストを1少なくする（クリーチャー以外も、ジャイアントでなければ変わらない）', () => {
    const s = newGame();
    put(s, 0, C.cineraria.id, 'battle');
    const g = put(s, 0, C.giant.id, 'hand');
    const sm = put(s, 0, C.small.id, 'hand');
    expect(effectiveCost(s, reg, 0, g)).toBe(5);
    expect(effectiveCost(s, reg, 0, sm)).toBe(3);
    // 相手のジャイアントは軽くならない
    expect(effectiveCost(s, reg, 1, put(s, 1, C.giant.id, 'hand'))).toBe(6);
  });

  it('シネラリア：自分の他のジャイアントが離れる時、かわりにこのクリーチャーを破壊できる', () => {
    let s = newGame();
    const cin = put(s, 0, C.cineraria.id, 'battle');
    const g = put(s, 0, C.giant.id, 'battle');
    const src = put(s, 1, C.big.id, 'battle');
    s = settle(effect(s, 1, src, { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } }), true, only(g));
    expect(zone(s, g)).toBe('battle');
    expect(zone(s, cin)).toBe('graveyard');
    // ジャイアントではないクリーチャーは守らない
    const cin2 = put(s, 0, C.cineraria.id, 'battle');
    const sm = put(s, 0, C.small.id, 'battle');
    s = settle(effect(s, 1, src, { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } }), true, only(sm));
    expect([zone(s, sm), zone(s, cin2)]).toEqual(['graveyard', 'battle']);
  });

  it('キャディ・ビートル：相手のターン中、相手がマナの枚数よりコストが大きいクリーチャーを出す時、かわりにマナゾーンへ', () => {
    let s = newGame();
    put(s, 0, C.caddy.id, 'battle');
    clearZone(s, 1, 'mana');
    mana(s, 1, C.small.id, 3);
    s.activePlayer = 1;
    const b = put(s, 1, C.big.id, 'graveyard');
    s = enter(s, 1, b);
    expect(zone(s, b)).toBe('mana');
    // コストがマナの枚数以下なら出る
    const sm = put(s, 1, C.small.id, 'hand');
    s = enter(s, 1, sm);
    expect(zone(s, sm)).toBe('battle');
    // 自分のターン中は効かない
    s.activePlayer = 0;
    const b2 = put(s, 1, C.big.id, 'hand');
    s = enter(s, 1, b2);
    expect(zone(s, b2)).toBe('battle');
  });

  it('とこしえの超人：相手が手札以外からカードを出す時、かわりにマナゾーンへ（タマシードも）。手札からは出る', () => {
    let s = newGame();
    put(s, 0, C.toko.id, 'battle');
    const g = put(s, 1, C.big.id, 'graveyard');
    s = enter(s, 1, g);
    expect(zone(s, g)).toBe('mana');
    const t = put(s, 1, C.tama.id, 'graveyard');
    s = enter(s, 1, t);
    expect(zone(s, t)).toBe('mana');
    const h = put(s, 1, C.big.id, 'hand');
    s = enter(s, 1, h);
    expect(zone(s, h)).toBe('battle');
    // 自分のカードは置き換えない
    const mine = put(s, 0, C.big.id, 'graveyard');
    s = enter(s, 0, mine);
    expect(zone(s, mine)).toBe('battle');
  });

  it('チアスカーレット アカネ：ジャイアントをマナゾーンから召喚でき、そうしたら山札の上から1枚目をマナへ', () => {
    let s = newGame();
    put(s, 0, C.akane.id, 'battle');
    clearZone(s, 0, 'mana');
    mana(s, 0, C.giant.id, 6);
    const g = put(s, 0, C.giant.id, 'mana');
    const sm = put(s, 0, C.samurai.id, 'mana');
    expect(canPlay(s, reg, 0, g)).toBe(true);
    expect(canPlay(s, reg, 0, sm)).toBe(false);
    const [top] = stack(s, 0, [C.small.id]);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: g }));
    expect(zone(s, g)).toBe('battle');
    expect(zone(s, top)).toBe('mana');
  });

  it('完璧妖精マリニャンX：自分のマナゾーンから召喚できる', () => {
    let s = newGame();
    clearZone(s, 0, 'mana');
    mana(s, 0, C.giant.id, 5);
    const m = put(s, 0, C.marinyan.id, 'mana');
    expect(canPlay(s, reg, 0, m)).toBe(true);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: m }));
    expect(zone(s, m)).toBe('battle');
  });

  it('完璧妖精マリニャンX：スノーフェアリーが5つ以上あれば、出た相手のクリーチャーの能力はトリガーしない', () => {
    let s = newGame();
    put(s, 0, C.marinyan.id, 'battle');
    // スノーフェアリーは まりにゃん とタマシード4つ（タマシードも数える）
    for (let i = 0; i < 4; i++) put(s, 0, C.snowTama.id, 'battle');
    const e1 = put(s, 1, C.etbDraw.id, 'hand');
    const h1 = s.players[1].zones.hand.length;
    s = settle(enter(s, 1, e1));
    // 手札から出た1枚の分だけ減り、引かない
    expect(s.players[1].zones.hand.length).toBe(h1 - 1);
  });

  it('完璧妖精マリニャンX：スノーフェアリーが4つ以下なら誘発する', () => {
    let s = newGame();
    put(s, 0, C.marinyan.id, 'battle');
    for (let i = 0; i < 3; i++) put(s, 0, C.snowTama.id, 'battle');
    const e = put(s, 1, C.etbDraw.id, 'hand');
    const h = s.players[1].zones.hand.length;
    s = settle(enter(s, 1, e));
    expect(s.players[1].zones.hand.length).toBe(h);
  });

  it('超球の超人：相手はコスト5以下の、クリーチャーではないカードを使えない（コストを支払わずに使う時も）', () => {
    let s = newGame();
    put(s, 0, C.superball.id, 'battle');
    expect(playRestriction(s, reg, 1, put(s, 1, C.tama.id, 'hand'))).toMatch(/使えません/);
    expect(playRestriction(s, reg, 1, put(s, 1, C.spell5.id, 'hand'))).toMatch(/使えません/);
    expect(playRestriction(s, reg, 1, put(s, 1, C.spell6.id, 'hand'))).toBeNull();
    expect(playRestriction(s, reg, 1, put(s, 1, C.small.id, 'hand'))).toBeNull();
    // 自分は使える
    expect(playRestriction(s, reg, 0, put(s, 0, C.tama.id, 'hand'))).toBeNull();
    // 効果でコストを支払わずに使う時も
    const src = put(s, 1, C.small.id, 'battle');
    const t = put(s, 1, C.tama.id, 'hand');
    s = settle(effect(s, 1, src, { type: 'playFromHandFree', filter: { cardType: 'tamaseed' } }), true, only(t));
    expect(zone(s, t)).toBe('hand');
  });

  it('超重竜：終極宣言で手札と同じ枚数を引き、マナと同じ枚数をマナへ。ゲーム中に一度だけ', () => {
    let s = newGame();
    put(s, 0, C.chojuryu.id, 'battle');
    clearZone(s, 0, 'mana');
    mana(s, 0, C.giant.id, 3);
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    const hand = s.players[0].zones.hand.length;
    s = settle(act(s, { type: 'END_TURN', player: 1 }), true);
    // 手札と同じ枚数を引き、ターンのはじめのドローで1枚
    expect(s.players[0].zones.hand.length).toBe(hand * 2 + 1);
    expect(s.players[0].zones.mana.length).toBe(6);
    expect(s.players[0].usedOnceNames).toEqual(['終極宣言']);
    // 次の自分のターンには使えない（別の終極宣言を持つカードでも）
    put(s, 0, C.chojuryu.id, 'battle');
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    s = settle(act(s, { type: 'END_TURN', player: 1 }), false);
    const h2 = s.players[0].zones.hand.length;
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    s = settle(act(s, { type: 'END_TURN', player: 1 }), true);
    expect(s.players[0].zones.hand.length).toBe(h2 + 1);
  });

  it('超重竜：使わなければ、次の自分のターンにまた使える', () => {
    let s = newGame();
    put(s, 0, C.chojuryu.id, 'battle');
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    s = settle(act(s, { type: 'END_TURN', player: 1 }), false);
    expect(s.players[0].usedOnceNames).toBeUndefined();
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    const hand = s.players[0].zones.hand.length;
    s = settle(act(s, { type: 'END_TURN', player: 1 }), true);
    expect(s.players[0].zones.hand.length).toBe(hand * 2 + 1);
  });

  it('銀河竜：自分の他のジャイアントのバトルを、かわりにこのクリーチャーにさせられる', () => {
    let s = newGame();
    const gin = put(s, 0, C.ginga.id, 'battle');
    const g = put(s, 0, C.giant.id, 'battle');
    const opp = put(s, 1, C.big.id, 'battle');
    s.cards[opp].tapped = true;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: g, target: { kind: 'creature', iid: opp } }), true);
    expect([zone(s, g), zone(s, gin), zone(s, opp)]).toEqual(['battle', 'battle', 'graveyard']);
  });

  it('銀河竜：使わなければ、元のジャイアントがバトルする', () => {
    let s = newGame();
    const gin = put(s, 0, C.ginga.id, 'battle');
    const g = put(s, 0, C.giant.id, 'battle');
    const opp = put(s, 1, C.big.id, 'battle');
    s.cards[opp].tapped = true;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: g, target: { kind: 'creature', iid: opp } }), false);
    expect([zone(s, g), zone(s, gin), zone(s, opp)]).toEqual(['graveyard', 'battle', 'battle']);
  });

  it('悪魔世界の閃光：この呪文よりコストが小さいクリーチャーが出るまで表向きにして出す', () => {
    let s = newGame();
    clearZone(s, 0, 'mana');
    mana(s, 0, C.light.id, 6);
    const sp = put(s, 0, C.akuma.id, 'hand');
    const [sm, b] = stack(s, 0, [C.small.id, C.big.id]);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: sp }));
    expect(zone(s, sm)).toBe('battle');
    expect(zone(s, b)).toBe('deck');
  });

  it('鎧機天 シロフェシー：コスト3以上のメカが攻撃する時、革命チェンジできる（コスト2のメカではできない）', () => {
    let s = newGame();
    const sh = put(s, 0, C.shirofe.id, 'hand');
    const m3 = put(s, 0, C.mecha3.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: m3, target: { kind: 'player' } }), true, only(sh));
    expect([zone(s, sh), zone(s, m3)]).toEqual(['battle', 'hand']);
    let t = newGame();
    const sh2 = put(t, 0, C.shirofe.id, 'hand');
    const m2 = put(t, 0, C.mecha2.id, 'battle');
    t.phase = 'attack';
    t = settle(act(t, { type: 'ATTACK', player: 0, attacker: m2, target: { kind: 'player' } }), true, only(sh2));
    expect(zone(t, sh2)).toBe('hand');
  });

  it('武偉：出た時、手札のクロスギアをコストを支払わずにジェネレートできる', () => {
    let s = newGame();
    const b = put(s, 0, C.bui.id, 'hand');
    const gear = put(s, 0, C.zangeki.id, 'hand');
    put(s, 0, C.small.id, 'hand');
    s = settle(enter(s, 0, b), true, only(gear));
    expect(zone(s, gear)).toBe('battle');
  });

  it('タキオンアーマー：クロスギアをジェネレート・クロスするコストが1少なくなる', () => {
    let s = newGame();
    s.phase = 'main';
    put(s, 0, C.tachyon.id, 'battle');
    const zh = put(s, 0, C.zangeki.id, 'hand');
    expect(effectiveCost(s, reg, 0, zh)).toBe(3);
    const gear = put(s, 0, C.fireGear.id, 'battle');
    const host = put(s, 0, C.small.id, 'battle');
    expect(crossCost(s, reg, 0, gear, host)).toBe(1);
    clearZone(s, 0, 'mana');
    const m = mana(s, 0, C.small.id, 1);
    s = act(s, { type: 'CROSS', player: 0, iid: gear, target: host });
    expect(s.cards[gear].equippedTo).toBe(host);
    expect(s.cards[m[0]].tapped).toBe(true);
    // クロスギアではないカードは軽くならない
    expect(effectiveCost(s, reg, 0, put(s, 0, C.small.id, 'hand'))).toBe(3);
  });

  it('ザンゲキ：《ボルメテウス・武者・ドラゴン》にコストを支払わずにクロスでき、ドラゴンにクロスされていれば自分のドラゴンとサムライは+2000・スピードアタッカー', () => {
    let s = newGame();
    s.phase = 'main';
    clearZone(s, 0, 'mana');
    const z = put(s, 0, C.zangeki.id, 'battle');
    const bo = put(s, 0, C.borume.id, 'battle');
    const bui = put(s, 0, C.bui.id, 'battle');
    const sam = put(s, 0, C.samurai.id, 'battle');
    const sm = put(s, 0, C.small.id, 'battle');
    // 名前が同じでなければコストがかかる
    expect(canCross(s, reg, 0, z, bui)).toBe(false);
    expect(canCross(s, reg, 0, z, bo)).toBe(true);
    expect(power(s, reg, sam)).toBe(3000);
    s = act(s, { type: 'CROSS', player: 0, iid: z, target: bo });
    expect(s.cards[z].equippedTo).toBe(bo);
    expect(power(s, reg, sam)).toBe(5000);
    expect(power(s, reg, bui)).toBe(8000);
    expect(keywords(s, reg, sam).speedAttacker).toBe(true);
    expect(power(s, reg, sm)).toBe(1000);
    // ドラゴンでもサムライでもないクリーチャーにクロスされている時は効かない
    s.cards[z].equippedTo = sm;
    expect(power(s, reg, sam)).toBe(3000);
  });

  it('ドスファング：サムライ・クリーチャーにはコストを支払わずにクロスできる', () => {
    let s = newGame();
    s.phase = 'main';
    clearZone(s, 0, 'mana');
    const d = put(s, 0, C.dosfang.id, 'battle');
    const sam = put(s, 0, C.samurai.id, 'battle');
    const sm = put(s, 0, C.small.id, 'battle');
    expect(canCross(s, reg, 0, d, sm)).toBe(false);
    expect(crossCost(s, reg, 0, d, sam)).toBe(0);
    s = act(s, { type: 'CROSS', player: 0, iid: d, target: sam });
    expect(s.cards[d].equippedTo).toBe(sam);
  });

  it('弐天：出た時、火のエレメントの数以下のコストの相手のエレメントを破壊し、光のエレメント1つにつき引いてもよい', () => {
    let s = newGame();
    put(s, 0, C.fire.id, 'battle');
    put(s, 0, C.fireGear.id, 'battle');
    put(s, 0, C.light.id, 'battle');
    const n = put(s, 0, C.niten.id, 'hand');
    const o3 = put(s, 1, C.small.id, 'battle');
    const o4 = put(s, 1, C.opp4.id, 'battle');
    const ot = put(s, 1, C.tama.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    let cands: string[] = [];
    // 火のエレメントは にてん・ひ・ひのぎあ の3つ
    s = settle(enter(s, 0, n), true, (c) => ((cands = c), c.includes(ot) ? [ot] : undefined));
    expect(cands.sort()).toEqual([o3, ot].sort());
    expect([zone(s, ot), zone(s, o4)]).toEqual(['graveyard', 'battle']);
    // 光のエレメントは にてん・ひかり の2つ：2枚引く（手札から出た にてん の分を引く）
    expect(s.players[0].zones.hand.length).toBe(hand - 1 + 2);
  });

  it('弐天：攻撃する時、手札の枚数以下のコストを持つ進化ではないサムライかアーマードを、コストを支払わずに使える', () => {
    let s = newGame();
    clearZone(s, 0, 'hand');
    const n = put(s, 0, C.niten.id, 'battle');
    const sam = put(s, 0, C.samurai.id, 'hand');
    const gear = put(s, 0, C.dosfang.id, 'hand');
    const evo = put(s, 0, C.samuraiEvo.id, 'hand');
    put(s, 0, C.small.id, 'hand');
    const tach = put(s, 0, C.tachyon.id, 'hand');
    s.phase = 'attack';
    let cands: string[] = [];
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: n, target: { kind: 'player' } }), true, (c, p) => (/コストを支払わずに使う/.test(p) ? ((cands = c), [tach]) : undefined));
    // 手札は5枚：コスト5のドスファングも使える。進化とサムライ・アーマードではないカードは使えない
    expect(cands.sort()).toEqual([sam, gear, tach].sort());
    expect(zone(s, evo)).toBe('hand');
    expect(zone(s, tach)).toBe('battle');
  });
});
