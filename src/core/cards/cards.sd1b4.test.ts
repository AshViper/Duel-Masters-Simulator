// ドキドキつよいデッキ 25の王道（その4）：手動だった能力を自動処理にしたカードの読み取りと動作
// 「必然」の頂 リュウセイ・超神龍バイラス・カースド・「勝利」の頂カイザー「刃鬼」・邪幽 ジャガイスト・至高の魂 アビスベル＝ジャシン帝・
// 深淵の壊炉 マーダン=ロウ・謀遠 テレスコ=テレス・秩序の意志・ア:エヌ:マクア・めっちゃ！デンヂャラスG3・ヘルトッQ・プリプリズン・タイムピョンチキ
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { attackTargets, canAttackWith, effectiveCost, keywords, power } from '../engine/queries';
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

const RYUSEI_LOSE = '各ターンに一度、自分がゲームに負ける時、かわりに自分のハンターを１つ破壊してもよい。';
const RYUSEI_COST = '相手のクリーチャー１体につき、この呪文を唱えるコストを１少なくする。ただし、コストは０以下にはならない。';
const VIRUS = 'このクリーチャーがタップしていれば、相手は「S・トリガー」を使えない。';
const JINKI_SA = '相手のシールドが５つ以上あれば、このクリーチャーに「スピードアタッカー」を与える。';
const JINKI_MEKU =
  'このクリーチャーが召喚によって出た時または攻撃する時、ハンター・W・メクレイド10する。（ハンター・W・メクレイド10：自分の山札の上から６枚を見る。その中から、コスト10以下のハンターを２枚まで、コストを支払わずに使う。残りを好きな順序で山札の下に置く）';
const JAGA =
  '各ターンに一度、自分の山札からクリーチャーが出た時、そのクリーチャーのコスト以下のアビス・クリーチャーを１体、自分の墓地から出してもよい。そのターン、そのアビスは相手プレイヤーを攻撃でき、そのターン中に攻撃したら、ターンの終わりに山札の下に置く。';
const JASHIN = '各ターン、はじめて自分の、進化クリーチャーまたはアビス・クリーチャーをタップした時、それをアンタップする。';
const MADAN_ETB = 'このクリーチャーが出た時、相手の手札を見てクリーチャーを１体選び、捨てさせる。';
const MADAN_ATK =
  'シビルカウント３：このクリーチャーが攻撃する時、自分の闇のクリーチャーまたは闇のタマシードが合計３つ以上あれば、相手の墓地にあるカードを１枚選んでもよい。そのカードの、出た時にトリガーする能力を、自分が１つ使ってもよい。その後、相手はそのカードを山札の下に置く。';
const TELESCO = '手札が１枚もないプレイヤー１人につき、このクリーチャーのパワーを+5000する。';
const SBACK = 'S・バック：闇（闇のカードを自分のシールドゾーンから手札に加える時、そのカードを捨ててもよい。そうしたら、コストを支払わずにこの呪文を唱える）';
const MACUA = [
  'このクリーチャーが出た時、次のうちいずれか１つを選ぶ。',
  '',
  '　▶自分の山札の上から２枚を、タップしてマナゾーンに置く。その後、カードを１枚、自分のマナゾーンから手札に戻す。',
  '',
  '　▶プレイヤーを１人選ぶ。そのプレイヤーは、自身の墓地をシャッフルし、山札の下に置く。',
  '',
  '　▶相手は、自身のコスト５以下の、クリーチャーではないエレメントをすべてマナゾーンに置く。',
];
const G3_BREAKER = 'G・ブレイカー（このクリーチャーは、相手のシールドをすべてブレイクし、その攻撃の後、自分のシールドをすべてブレイクする）';
const G3_ETB = 'このクリーチャーがバトルゾーンに出た時、「シールドいらねえー！」と言ってもよい。そうしたら、そのターン、自分のクリーチャー３体に「G・ブレイカー」を与える。';
const G3_SPELL = '「気に入らねぇやつは消す」と言ってもよい。そうしたら、このターン、相手のクリーチャーの能力すべてを無視する。';
const HELL = 'このクリーチャーは、出たターン、相手プレイヤーを攻撃できる。';
const PRIPRI = '革命０：このクリーチャーがバトルゾーンに出た時、自分のシールドが０枚なら、コスト７以下のジョーカーズ・クリーチャーを１体、自分の手札からバトルゾーンに出してもよい。';
const PYON = 'このクリーチャーがバトルに勝った時、山札の上から２枚をマナゾーンに置いてもよい。そうしたら、カードを１枚、自分のマナゾーンから手札に戻す。';

const C = {
  ryusei: twin(
    'b4-1',
    'りゅうせい',
    ['T・ブレイカー', RYUSEI_LOSE],
    { civ: '火', cost: '10', power: '12000', race: 'レッド・コマンド・ドラゴン/ジャイアント・ハンター/ゼニス' },
    'おれのしょうり',
    [RYUSEI_COST, 'パワー4000以下のクリーチャーをすべて破壊する。'],
    { cost: '7' },
  ),
  virus: mk('b4-2', 'ばいらす', ['T・ブレイカー', VIRUS], { civ: '自然', cost: '10', power: '17000' }),
  jinki: mk('b4-3', 'じんき', ['T・ブレイカー', JINKI_MEKU, JINKI_SA], { civ: '水/火/自然', cost: '11', power: '17000', race: 'レッド・コマンド・ドラゴン/ジャイアント・ハンター/ゼニス' }),
  jaga: mk('b4-4', 'じゃがいすと', ['ブロッカー', JAGA], { cost: '5', power: '9000', race: 'アビスドラゴン' }),
  jashin: mk('b4-5', 'じゃしんてい', ['W・ブレイカー', JASHIN], { civ: '水/闇/火', cost: '5', power: '7000', race: 'アビスロイヤル' }),
  madan: mk('b4-6', 'まーだん', ['スレイヤー', MADAN_ETB, MADAN_ATK], { cost: '4', power: '4000', race: 'アビスロイヤル' }),
  telesco: mk('b4-7', 'てれすこ', ['ブロッカー', TELESCO], { cost: '5', power: '5000', race: 'アビスロイヤル' }),
  order: mk('b4-8', 'ちつじょ', [SBACK, 'カードを１枚引く。'], { type: '呪文', power: '', race: '', cost: '4' }),
  macua: mk('b4-9', 'まくあ', ['W・ブレイカー', ...MACUA], { civ: '自然', cost: '5', power: '6000', race: 'ヴェールアビス' }),
  g3: twin('b4-10', 'じーすりー', [G3_BREAKER, G3_ETB], { civ: 'ゼロ', cost: '10', power: '21300', race: 'ジョーカーズ' }, 'けっしんぐ', ['S・トリガー', G3_SPELL], { cost: '7' }),
  hell: mk('b4-11', 'へるとっきゅー', [HELL], { civ: 'ゼロ', cost: '5', power: '5050', race: 'ジョーカーズ' }),
  pripri: mk('b4-12', 'ぷりぷりずん', ['S・トリガー', PRIPRI], { civ: '火', cost: '5', power: '1000', race: 'ジョーカーズ' }),
  pyon: mk('b4-13', 'ぴょんちき', ['マッハファイター', PYON], { civ: '自然', cost: '4', power: '5000', race: 'ジョーカーズ/レクスターズ' }),
  // 動作を確かめるための部品
  small: mk('b4-20', 'ちいさい', [], { civ: '火', cost: '3', power: '1000' }),
  hunter: mk('b4-21', 'はんたー', [], { civ: '火', cost: '2', power: '2000', race: 'ビート・ハンター' }),
  abyss3: mk('b4-22', 'あびす3', [], { cost: '3', power: '3000', race: 'アビスロイヤル' }),
  abyss7: mk('b4-23', 'あびす7', [], { cost: '7', power: '7000', race: 'アビスロイヤル' }),
  trig: mk('b4-24', 'とりがー', ['S・トリガー', 'カードを１枚引く。'], { type: '呪文', power: '', race: '', civ: '水', cost: '3' }),
  etb: mk('b4-25', 'でたとき', ['このクリーチャーが出た時、カードを１枚引く。'], { civ: '水', cost: '2', power: '2000' }),
  dark: mk('b4-26', 'やみ', [], { cost: '2', power: '2000' }),
  spellx: mk('b4-27', 'じゅもん', ['カードを１枚引く。'], { type: '呪文', power: '', race: '', civ: '闇', cost: '2' }),
  tama: mk('b4-28', 'たましーど', [], { type: 'タマシード', power: '', race: 'アビス', cost: '3' }),
  joker: mk('b4-29', 'じょーかー', [], { civ: 'ゼロ', cost: '7', power: '7000', race: 'ジョーカーズ' }),
  blocker: mk('b4-30', 'ぶろっかー', ['ブロッカー', 'W・ブレイカー'], { civ: '光', cost: '4', power: '4000' }),
  w2: mk('b4-31', 'だぶる', ['W・ブレイカー'], { civ: '火', cost: '6', power: '6000' }),
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
const hand = (s: GameState, p: PlayerId) => s.players[p].zones.hand.length;
const enter = (s: GameState, player: PlayerId, iid: string) => runTask(s, { kind: 'enterBattle', player, iid });
const effect = (s: GameState, controller: PlayerId, source: string, e: Extract<GameState['queue'][number], { kind: 'effect' }>['effect']) => runTask(s, { kind: 'effect', controller, source, effect: e });
const only = (x: string): Pick => (c) => (c.includes(x) ? [x] : undefined);
/** 相手のシールドをすべて墓地に置いてから、指定のカードをシールドにする */
function setShields(s: GameState, p: PlayerId, cardIds: string[]): string[] {
  const ctx = new Ctx(s, reg);
  for (const x of [...s.players[p].zones.shield]) ctx.moveCard(x, 'graveyard');
  return cardIds.map((id) => put(s, p, id, 'shield'));
}

describe('SD1その4の読み取り', () => {
  it('13枚とも自動の効果になる', () => {
    for (const c of Object.values(C).slice(0, 13)) expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('リュウセイ：負ける時の置換と、呪文側のコスト軽減', () => {
    expect(C.ryusei.replacements).toEqual([{ event: 'lose', subject: 'anyOwn', instead: 'destroyOwn', filter: { race: 'ハンター' }, oncePerTurn: true, optional: true }]);
    expect(C.ryusei.twin?.selfCost).toEqual({ amount: 1, per: { who: 'opponent', zone: 'battle' }, unit: 1, min: 1 });
  });
  it('バイラス・刃鬼', () => {
    expect(C.virus.statics).toEqual([{ type: 'noShieldTrigger', who: 'opponent', condition: { type: 'selfTapped' } }]);
    expect(C.jinki.statics?.[0]).toEqual(expect.objectContaining({ keywords: { speedAttacker: true }, condition: { type: 'compare', left: { who: 'opponent', zone: 'shield' }, op: '>=', right: 5 } }));
    // W・メクレイドは山札の上から6枚を見る
    expect(C.jinki.abilities?.[0].effects[0]).toEqual(expect.objectContaining({ type: 'lookAtTop', count: 6, pickCount: 2 }));
  });
  it('ジャガイスト・ジャシン帝・マーダン=ロウ', () => {
    expect(C.jaga.abilities?.map((a) => [a.when, a.filter])).toEqual([
      ['onSummon', { enteredFrom: 'deck' }],
      ['onOtherSummon', { enteredFrom: 'deck' }],
    ]);
    expect(C.jashin.abilities?.map((a) => a.when)).toEqual(['onTap', 'onOtherTap']);
    expect(C.madan.abilities?.[0].effects).toEqual([{ type: 'move', target: { owner: 'opponent', zone: 'hand', count: 1, filter: { cardType: 'creature' } }, to: 'graveyard' }]);
    expect(C.madan.abilities?.[1].when).toBe('onAttack');
  });
  it('テレスコ=テレス・秩序の意志・マクア・G3・ヘルトッQ・プリプリズン・タイムピョンチキ', () => {
    expect(C.telesco.statics?.map((x) => x.type)).toEqual(['powerMod', 'powerMod']);
    expect(C.order.keywords?.sBack).toBe('darkness');
    const ch = C.macua.abilities?.[0].effects[0];
    expect(ch?.type === 'chooseOne' && ch.options.length).toBe(3);
    expect(C.g3.abilities?.[1]).toEqual(expect.objectContaining({ when: 'onSummon', optional: true }));
    expect(C.g3.twin?.abilities?.[0].effects[0].type).toBe('optional');
    expect(C.hell.keywords?.attackPlayersOnEnterTurn).toBe(true);
    expect(C.pripri.abilities?.[0]).toEqual(expect.objectContaining({ optional: true, condition: { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 } }));
    expect(C.pyon.abilities?.[0].effects[0]).toEqual({ type: 'deckTopTo', count: 2, to: 'mana' });
  });
});

describe('SD1その4の動作', () => {
  it('リュウセイ：負ける時、かわりにハンターを1つ破壊する（各ターンに一度）', () => {
    let s = newGame();
    const r = put(s, 0, C.ryusei.id, 'battle');
    const h = put(s, 0, C.hunter.id, 'battle');
    const src = put(s, 1, C.small.id, 'battle');
    s = settle(effect(s, 1, src, { type: 'winGame' }));
    expect(s.gameOverReason).toBeNull();
    // コストの小さいハンターから破壊する
    expect([zone(s, h), zone(s, r)]).toEqual(['graveyard', 'battle']);
    // 同じターンの2回目は使えない
    s = settle(effect(s, 1, src, { type: 'winGame' }));
    expect(s.winner).toBe(1);
  });

  it('リュウセイ：ハンターがこのクリーチャーだけなら、このクリーチャーを破壊する', () => {
    let s = newGame();
    const r = put(s, 0, C.ryusei.id, 'battle');
    const src = put(s, 1, C.small.id, 'battle');
    s = settle(effect(s, 1, src, { type: 'winGame' }));
    expect(s.gameOverReason).toBeNull();
    expect(zone(s, r)).toBe('graveyard');
  });

  it('リュウセイの呪文側：相手のクリーチャー1体につきコストが1少なくなる（0以下にはならない）', () => {
    const s = newGame();
    const r = put(s, 0, C.ryusei.id, 'hand');
    expect(effectiveCost(s, reg, 0, r, 'twin')).toBe(7);
    for (let i = 0; i < 3; i++) put(s, 1, C.small.id, 'battle');
    expect(effectiveCost(s, reg, 0, r, 'twin')).toBe(4);
    for (let i = 0; i < 6; i++) put(s, 1, C.small.id, 'battle');
    expect(effectiveCost(s, reg, 0, r, 'twin')).toBe(1);
    // クリーチャー側は変わらない
    expect(effectiveCost(s, reg, 0, r, 'main')).toBe(10);
  });

  it('バイラス・カースド：タップしていれば、相手はS・トリガーを使えない', () => {
    let s = newGame();
    const v = put(s, 0, C.virus.id, 'battle');
    let [t] = setShields(s, 1, [C.trig.id]);
    s.cards[v].tapped = true;
    s = runTask(s, { kind: 'breakShields', breaker: 0, source: v, defender: 1, count: 1 });
    expect(s.pending).toBeNull();
    expect(zone(s, t)).toBe('hand');

    s = newGame();
    const v2 = put(s, 0, C.virus.id, 'battle');
    [t] = setShields(s, 1, [C.trig.id]);
    s = runTask(s, { kind: 'breakShields', breaker: 0, source: v2, defender: 1, count: 1 });
    expect(s.pending?.kind).toBe('confirm');
    s = settle(s);
    expect(zone(s, t)).toBe('graveyard');
  });

  it('刃鬼：相手のシールドが5つ以上なら、スピードアタッカー', () => {
    const s = newGame();
    const j = put(s, 0, C.jinki.id, 'battle');
    s.cards[j].enteredTurn = s.turn;
    expect(s.players[1].zones.shield.length).toBe(5);
    expect(keywords(s, reg, j).speedAttacker).toBe(true);
    expect(canAttackWith(s, reg, 0, j)).toBe(true);
    new Ctx(s, reg).moveCard(s.players[1].zones.shield[0], 'graveyard');
    expect(keywords(s, reg, j).speedAttacker).toBeFalsy();
    expect(canAttackWith(s, reg, 0, j)).toBe(false);
  });

  it('ジャガイスト：山札からクリーチャーが出た時、そのコスト以下のアビスを墓地から出す。プレイヤーを攻撃でき、攻撃したらターンの終わりに山札の下へ', () => {
    let s = newGame();
    put(s, 0, C.jaga.id, 'battle');
    const a3 = put(s, 0, C.abyss3.id, 'graveyard');
    const a7 = put(s, 0, C.abyss7.id, 'graveyard');
    // 手札から出たクリーチャーでは誘発しない
    s = settle(enter(s, 0, put(s, 0, C.small.id, 'hand')));
    expect(zone(s, a3)).toBe('graveyard');
    // 山札から出たコスト3のクリーチャー：コスト3以下のアビスだけ選べる
    const [top] = stack(s, 0, [C.small.id]);
    let cands: string[] = [];
    s = settle(enter(s, 0, top), true, (c) => ((cands = c), c.includes(a3) ? [a3] : undefined));
    expect(cands).toEqual([a3]);
    expect(zone(s, a3)).toBe('battle');
    expect(zone(s, a7)).toBe('graveyard');
    // 出たターン：相手プレイヤーは攻撃できるが、クリーチャーは攻撃できない
    const foe = put(s, 1, C.small.id, 'battle');
    s.cards[foe].tapped = true;
    s.cards[a3].enteredTurn = s.turn;
    expect(attackTargets(s, reg, 0, a3)).toEqual([{ kind: 'player' }]);
    // 各ターンに一度
    const [top2] = stack(s, 0, [C.abyss7.id]);
    s = settle(enter(s, 0, top2));
    expect(zone(s, a7)).toBe('graveyard');
    // 攻撃したので、ターンの終わりに山札の下へ
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a3, target: { kind: 'player' } }), false);
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    expect(zone(s, a3)).toBe('deck');
    expect(s.players[0].zones.deck[0]).toBe(a3);
  });

  it('ジャガイスト：出したアビスが攻撃しなければ、ターンの終わりもそのまま', () => {
    let s = newGame();
    put(s, 0, C.jaga.id, 'battle');
    const a3 = put(s, 0, C.abyss3.id, 'graveyard');
    const [top] = stack(s, 0, [C.small.id]);
    s = settle(enter(s, 0, top), true, only(a3));
    expect(zone(s, a3)).toBe('battle');
    s.phase = 'main';
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    expect(zone(s, a3)).toBe('battle');
  });

  it('ジャシン帝：各ターン、はじめて自分の進化またはアビス・クリーチャーをタップした時、それをアンタップする', () => {
    let s = newGame();
    put(s, 0, C.jashin.id, 'battle');
    const small = put(s, 0, C.small.id, 'battle');
    const a3 = put(s, 0, C.abyss3.id, 'battle');
    const b = put(s, 0, C.abyss7.id, 'battle');
    // アビスではないクリーチャーのタップは数えない
    s = settle(effect(s, 0, small, { type: 'selfAction', action: 'tap' }));
    expect(s.cards[small].tapped).toBe(true);
    s = settle(effect(s, 0, a3, { type: 'selfAction', action: 'tap' }));
    expect(s.cards[a3].tapped).toBe(false);
    // 2回目（別のアビス・同じアビス）はアンタップしない
    s = settle(effect(s, 0, b, { type: 'selfAction', action: 'tap' }));
    expect(s.cards[b].tapped).toBe(true);
    s = settle(effect(s, 0, a3, { type: 'selfAction', action: 'tap' }));
    expect(s.cards[a3].tapped).toBe(true);
  });

  it('ジャシン帝：自身が攻撃してタップした時もアンタップする', () => {
    let s = newGame();
    const j = put(s, 0, C.jashin.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: j, target: { kind: 'player' } }), false);
    expect(s.cards[j].tapped).toBe(false);
  });

  it('マーダン=ロウ：出た時、相手の手札を見てクリーチャーを1体捨てさせる', () => {
    let s = newGame();
    const spell = put(s, 1, C.spellx.id, 'hand');
    const cr = put(s, 1, C.small.id, 'hand');
    for (const x of [...s.players[1].zones.hand]) if (x !== spell && x !== cr) new Ctx(s, reg).moveCard(x, 'deck');
    s = settle(enter(s, 0, put(s, 0, C.madan.id, 'hand')));
    expect([zone(s, cr), zone(s, spell)]).toEqual(['graveyard', 'hand']);
  });

  it('マーダン=ロウ：シビルカウント3で、相手の墓地のカードの出た時の能力を使い、そのカードを相手の山札の下へ', () => {
    let s = newGame();
    const m = put(s, 0, C.madan.id, 'battle');
    put(s, 0, C.dark.id, 'battle');
    const e = put(s, 1, C.etb.id, 'graveyard');
    // 闇が2つだけ：何もしない
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: m, target: { kind: 'player' } }), false);
    expect(zone(s, e)).toBe('graveyard');

    s = newGame();
    const m2 = put(s, 0, C.madan.id, 'battle');
    put(s, 0, C.dark.id, 'battle');
    put(s, 0, C.tama.id, 'battle');
    const e2 = put(s, 1, C.etb.id, 'graveyard');
    const h = hand(s, 0);
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: m2, target: { kind: 'player' } });
    // 選ぶ → 能力を使う（カードを1枚引く）→ 相手の山札の下へ。ブレイクしたシールドのS・トリガーなどは使わない
    s = settle(s, true, only(e2));
    expect(hand(s, 0)).toBe(h + 1);
    expect(zone(s, e2)).toBe('deck');
    expect(s.players[1].zones.deck[0]).toBe(e2);
  });

  it('マーダン=ロウ：能力を使わなくても、選んだカードは山札の下へ', () => {
    let s = newGame();
    const m = put(s, 0, C.madan.id, 'battle');
    put(s, 0, C.dark.id, 'battle');
    put(s, 0, C.dark.id, 'battle');
    const sp = put(s, 1, C.spellx.id, 'graveyard');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: m, target: { kind: 'player' } }), true, only(sp));
    expect(zone(s, sp)).toBe('deck');
  });

  it('テレスコ=テレス：手札が1枚もないプレイヤー1人につき+5000', () => {
    const s = newGame();
    const t = put(s, 0, C.telesco.id, 'battle');
    expect(power(s, reg, t)).toBe(5000);
    const ctx = new Ctx(s, reg);
    for (const x of [...s.players[1].zones.hand]) ctx.moveCard(x, 'graveyard');
    expect(power(s, reg, t)).toBe(10000);
    for (const x of [...s.players[0].zones.hand]) ctx.moveCard(x, 'graveyard');
    expect(power(s, reg, t)).toBe(15000);
  });

  it('秩序の意志：闇のカードがシールドから手札に加わる時、それを捨ててこの呪文をコストを支払わずに唱える', () => {
    let s = newGame();
    const a = put(s, 0, C.w2.id, 'battle');
    const o = put(s, 1, C.order.id, 'hand');
    const [sh] = setShields(s, 1, [C.dark.id]);
    const h = hand(s, 1);
    s = settle(runTask(s, { kind: 'breakShields', breaker: 0, source: a, defender: 1, count: 1 }));
    expect([zone(s, sh), zone(s, o)]).toEqual(['graveyard', 'graveyard']);
    // 秩序の意志を唱えてカードを1枚引いた（手札：+1 シールド -1 捨てた -1 唱えた +1 引いた）
    expect(hand(s, 1)).toBe(h);

    // 闇ではないカードでは使えない
    s = newGame();
    const a2 = put(s, 0, C.w2.id, 'battle');
    const o2 = put(s, 1, C.order.id, 'hand');
    const [sh2] = setShields(s, 1, [C.small.id]);
    s = runTask(s, { kind: 'breakShields', breaker: 0, source: a2, defender: 1, count: 1 });
    expect(s.pending).toBeNull();
    expect([zone(s, sh2), zone(s, o2)]).toEqual(['hand', 'hand']);
  });

  it('秩序の意志：使わなければ、そのまま手札に加える', () => {
    let s = newGame();
    const a = put(s, 0, C.w2.id, 'battle');
    const o = put(s, 1, C.order.id, 'hand');
    const [sh] = setShields(s, 1, [C.dark.id]);
    s = settle(runTask(s, { kind: 'breakShields', breaker: 0, source: a, defender: 1, count: 1 }), false);
    expect([zone(s, sh), zone(s, o)]).toEqual(['hand', 'hand']);
  });

  it('マクア：3つの選択肢', () => {
    // 1つ目：山札の上から2枚をタップしてマナへ、その後マナから1枚を手札へ
    let s = newGame();
    const [x, y] = stack(s, 0, [C.small.id, C.small.id]);
    const mana = s.players[0].zones.mana.length;
    s = settle(enter(s, 0, put(s, 0, C.macua.id, 'hand')), true, only(y), ['0']);
    expect(s.players[0].zones.mana.length).toBe(mana + 1);
    expect([zone(s, x), zone(s, y)]).toEqual(['mana', 'hand']);
    expect(s.cards[x].tapped).toBe(true);
    // 2つ目：選んだプレイヤーの墓地を山札の下へ
    s = newGame();
    const g = put(s, 1, C.small.id, 'graveyard');
    s = settle(enter(s, 0, put(s, 0, C.macua.id, 'hand')), true, undefined, ['1', '1']);
    expect(zone(s, g)).toBe('deck');
    expect(s.players[1].zones.graveyard).toEqual([]);
    // 3つ目：相手のコスト5以下のクリーチャーではないエレメントをすべてマナへ（クリーチャーはそのまま）
    s = newGame();
    const t = put(s, 1, C.tama.id, 'battle');
    const c = put(s, 1, C.small.id, 'battle');
    s = settle(enter(s, 0, put(s, 0, C.macua.id, 'hand')), true, undefined, ['2']);
    expect([zone(s, t), zone(s, c)]).toEqual(['mana', 'battle']);
  });

  it('G3：出た時、自分のクリーチャー3体に「G・ブレイカー」。攻撃の後、自分のシールドをすべてブレイクする', () => {
    let s = newGame();
    const w = put(s, 0, C.small.id, 'battle');
    s = settle(enter(s, 0, put(s, 0, C.g3.id, 'hand')), true, (c) => c.filter((x) => x === w));
    expect(keywords(s, reg, w).breaker).toBe(99);
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: w, target: { kind: 'player' } }), false);
    expect(s.players[1].zones.shield.length).toBe(0);
    expect(s.players[0].zones.shield.length).toBe(0);
  });

  it('G3：元から G・ブレイカーを持つ G3 に与えても、自分のシールドのブレイクは1回だけ', () => {
    let s = newGame();
    const g = put(s, 0, C.g3.id, 'hand');
    s = settle(enter(s, 0, g), true, (c) => c.filter((x) => x === g));
    s.cards[g].enteredTurn = 0;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: g, target: { kind: 'player' } }), false);
    expect(s.log.filter((l) => l.text.startsWith('シールドを') && l.player === 0).length).toBe(2);
  });

  it('ケッシング・ゼロ：このターン、相手のクリーチャーの能力をすべて無視する', () => {
    let s = newGame();
    const g = put(s, 0, C.g3.id, 'hand');
    const b = put(s, 1, C.blocker.id, 'battle');
    const v = put(s, 1, C.virus.id, 'battle');
    s.cards[v].tapped = true;
    expect(keywords(s, reg, b).blocker).toBe(true);
    s = settle(runTask(s, { kind: 'castSpell', player: 0, iid: g, side: 'twin', from: 'hand' }));
    expect(keywords(s, reg, b).blocker).toBeFalsy();
    expect(keywords(s, reg, b).breaker).toBeFalsy();
    // 常在効果（S・トリガーを使えない）も働かない
    const [t] = setShields(s, 0, [C.trig.id]);
    const a = put(s, 1, C.small.id, 'battle');
    s = runTask(s, { kind: 'breakShields', breaker: 1, source: a, defender: 0, count: 1 });
    expect(s.pending?.kind).toBe('confirm');
    s = settle(s, false);
    expect(zone(s, t)).toBe('hand');
    // 相手のクリーチャーの出た時の能力も誘発しない
    const h = hand(s, 1);
    s = settle(enter(s, 1, put(s, 1, C.etb.id, 'hand')));
    expect(hand(s, 1)).toBe(h);
    // 次のターンには元に戻る
    s.phase = 'main';
    s = settle(act(s, { type: 'END_TURN', player: 0 }), false);
    expect(keywords(s, reg, b).blocker).toBe(true);
  });

  it('ヘルトッQ：出たターン、相手プレイヤーを攻撃できる（クリーチャーは攻撃できない）', () => {
    const s = newGame();
    const q = put(s, 0, C.hell.id, 'battle');
    s.cards[q].enteredTurn = s.turn;
    const foe = put(s, 1, C.small.id, 'battle');
    s.cards[foe].tapped = true;
    expect(attackTargets(s, reg, 0, q)).toEqual([{ kind: 'player' }]);
    s.cards[q].enteredTurn = 0;
    expect(attackTargets(s, reg, 0, q)).toEqual([{ kind: 'player' }, { kind: 'creature', iid: foe }]);
  });

  it('プリプリズン：革命0。シールドが0枚なら、手札からコスト7以下のジョーカーズを出してもよい', () => {
    let s = newGame();
    const j = put(s, 0, C.joker.id, 'hand');
    stack(s, 0, [C.small.id, C.small.id, C.small.id, C.small.id]);
    s = settle(enter(s, 0, put(s, 0, C.pripri.id, 'hand')), true, (c) => (c.includes(j) ? [j] : []));
    expect(zone(s, j)).toBe('hand');

    s = newGame();
    const j2 = put(s, 0, C.joker.id, 'hand');
    stack(s, 0, [C.small.id, C.small.id, C.small.id, C.small.id]);
    setShields(s, 0, []);
    s = settle(enter(s, 0, put(s, 0, C.pripri.id, 'hand')), true, (c) => (c.includes(j2) ? [j2] : []));
    expect(zone(s, j2)).toBe('battle');
  });

  it('タイムピョンチキ：バトルに勝った時、山札の上から2枚をマナへ。そうしたら、マナから1枚を手札へ', () => {
    let s = newGame();
    const p = put(s, 0, C.pyon.id, 'battle');
    const foe = put(s, 1, C.small.id, 'battle');
    s.cards[foe].tapped = true;
    const [x, y] = stack(s, 0, [C.small.id, C.small.id]);
    const mana = s.players[0].zones.mana.length;
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: p, target: { kind: 'creature', iid: foe } }), true, only(x));
    expect(zone(s, foe)).toBe('graveyard');
    expect([zone(s, x), zone(s, y)]).toEqual(['hand', 'mana']);
    expect(s.players[0].zones.mana.length).toBe(mana + 1);
  });
});
