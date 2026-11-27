// ドキドキつよいデッキ 25の王道（その7）：手動だった能力を自動処理にしたカードの読み取りと動作
// 聖カオスマントラ・ヴェネラック-F5・シェケダン・ドメチアーレ・千羽忍革 ボジソワカ・閃光の神官 ヴェルベット・超七極 Gio・邪光魔縛 ネロマノフ=ルドルフⅠ世・
// 全虹帝 ミノガミ・天雷龍姫エリザベス・怪盗妖精カサブランカ・五輪の求道者 清永・アカシック・ゼノン・グレイト“S-駆”・弾丸超邪 クロスファイア・ベイB セガーレ・
// 極楽鳥・清浄のカルマ インカ・冒険妖精ポレキチ・星空に浮かぶニンギョ・晴舞龍 ズンドコ・モモキング・進化設計図
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { attackTargets, blockersFor, breakerCount, canAttackWith, canPlay, effectiveCost, keywords, matchFilter, power, untappedPaySources } from '../engine/queries';
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
/** ツインパクト（クリーチャー側と呪文側） */
const mk2 = (id: string, name: string, abilities: string[], o: O, spell: string, spellText: string[], so: O) =>
  convertOfficialCard({ id, detailUrl: '', faces: [face(name, abilities, o), face(spell, spellText, { type: '呪文', power: '', race: '', ...so })] } as never);
const SPELL: O = { type: '呪文', power: '', race: '' };
const TAMA: O = { type: 'タマシード', power: '' };

const NINJA_CHANGE =
  'ニンジャ・チェンジ５（相手のクリーチャーが攻撃またはブロックした時、この攻撃中に自分が「ニンジャ」能力を使っていなければ、手札にあるこのクリーチャーと、自分のコスト５以上でメカまたはシノビのクリーチャー１体を入れ替えてもよい）';
const NO_ATK = '相手のクリーチャーは、出たターン攻撃できない。';
const VENE = '相手のターン中に、相手のクリーチャーが相手のマナゾーンのカードをタップせずに出た時、それをシールド化してもよい。';
const SHEKE_ETB = 'このクリーチャーが出た時、自分の光のクリーチャーまたは光のタマシード１つにつき、カードを１枚引いてもよい。';
const SHEKE_COST = '自分の光のクリーチャーと光のタマシードを使うコストを２少なくする。ただし、コストは０以下にはならない。';
const SHEKE_CIVIL =
  'シビルカウント５：自分の光のクリーチャーまたは光のタマシードが合計５つ以上あれば、このクリーチャーのパワーを+10000し、「T・ブレイカー」と「このクリーチャーが攻撃する時、相手のクリーチャーを１体選んでもよい。相手はそれをシールド化する」を与える。';
const BOJI = '自分のターンの終わりに、自分のコスト４以下のクリーチャーを手札と墓地から最大１体ずつ出してもよい。次の自分のターンのはじめまで、それらに「ブロッカー」を与える。';
const VELVET = '相手のクリーチャーは、タップしてバトルゾーンに置かれる。';
const GIO =
  'このクリーチャーを召喚する時、自分の手札にある他のコスト９のカードを好きな数、相手に見せてもよい。こうして見せたカード１枚につき、このクリーチャーの召喚コストを１少なくする。ただし、コストは０以下にならない。';
const NERO = '各ターンはじめて、自分またはこのクリーチャーが攻撃された時、各相手の手札を１枚ずつ見ないで選び、捨てさせる。';
const MINO = 'このクリーチャーが攻撃する時、自分のマナゾーンにあるツインパクトカードの枚数よりコストの小さいクリーチャーを１体、自分のマナゾーンから出してもよい。';
const ELIZA = 'シールドゾーンから自分の手札に加えられる呪文はすべて、「S・トリガー」を得る。';
const CASA_CIV = '自分のマナゾーンにあるカードは、すべての文明を持つ。';
const CASA_UNTAP = 'カードを自分の手札からマナゾーンに置いた時、そのカードをアンタップする。';
const KIYO =
  'このクリーチャーが攻撃する時、自分の山札の上から３枚を表向きにする。それらがすべて異なるコストなら、その中から、コスト９以下のエレメントを好きな数、コストを支払わずに使ってもよい。残りをすべてマナゾーンに置く。';
const ZENON_ETB = 'このクリーチャーが出た時、自分のツインパクト・クリーチャーがあれば、山札の上から１枚目をマナゾーンに置く。';
const ZENON_SA = '自分のツインパクト・クリーチャーすべてに「スピードアタッカー」を与える。';
const ZENON_ATK = '各ターンに一度、自分のツインパクト・クリーチャーが攻撃する時、そのクリーチャーの呪文側を、バトルゾーンに置いたままコストを支払わずに唱えてもよい。';
const SKU = '自分のターンの終わりに、このクリーチャーがアンタップしていたら、自分の手札に戻す。';
const GZERO = 'G・ゼロ - 自分のクリーチャーが４体以上あり、自分の《弾丸超邪 クロスファイア》がなければ、このクリーチャーをコストを支払わずに召喚してもよい。';
const SEGARE = '相手が、自身のマナゾーンのカードの枚数よりコストが大きいクリーチャーを出す時、相手はそれをかわりにマナゾーンに置き、その後、自分はこのクリーチャーをマナゾーンに置く。';
const FLY = '飛行（このクリーチャーは、「飛行」を持たないクリーチャーから攻撃もブロックもされない）';
const NOBREAK = 'このクリーチャーはシールドをブレイクできない。';
const BIRD = 'このクリーチャーを、自分のマナゾーンにあり、すべての文明を持つかのようにタップしてもよい。（この能力を、出たターンに使ってもよい）';
const INCA = 'プレイヤーを１人選ぶ。そのプレイヤーは、自身の墓地を山札に加えてシャッフルする。';
const POREKI = 'このクリーチャーが出た時、自分のマナゾーンにあるクリーチャーを１体選ぶ。このターン、そのクリーチャーをマナゾーンから召喚してもよい。（コストは支払う）';
const NINGYO = '相手のターン中、相手が自身の手札以外からマナゾーンにカードを置く時、かわりに墓地に置く。';
const ZUNDOKO = 'このカードが離れた時、カードを１枚、自分のマナゾーンから手札に戻す。';
const BLUEPRINT = '自分の山札の上から６枚を表向きにする。その中から進化クリーチャーをすべて自分の手札に加え、それ以外のカードを好きな順で自分の山札の一番下に戻す。';

const C = {
  chaos: mk('b7-1', 'かおすまんとら', [NINJA_CHANGE, 'W・ブレイカー', NO_ATK], { civ: '光', cost: '7', power: '9500', race: 'メカ・デル・ステラ/シノビ' }),
  vene: mk('b7-2', 'べねらっく', [VENE], { civ: '光', cost: '2', power: '2000', race: 'メカ・デル・ディネロ' }),
  sheke: mk('b7-3', 'しぇけだん', ['ブロッカー', SHEKE_ETB, SHEKE_COST, SHEKE_CIVIL], { civ: '光', cost: '5', power: '5500', race: 'メカ・デル・ディネロ' }),
  boji: mk('b7-4', 'ぼじそわか', ['ブロッカー', 'W・ブレイカー', BOJI], { civ: '光/闇', cost: '7', power: '10500', race: 'メカ・デル・ステラ/シノビ' }),
  velvet: mk('b7-5', 'べるべっと', ['ブロッカー', VELVET, 'W・ブレイカー'], { civ: '光', cost: '9', power: '11000', race: 'オラクル' }),
  gio: mk('b7-6', 'じお', ['進化―自分の光のクリーチャー１体の上に置く。', GIO, 'ブロッカー', 'W・ブレイカー'], { civ: '光', type: '進化クリーチャー', cost: '9', power: '11500', race: 'エンジェル・コマンド' }),
  nero: mk('b7-7', 'ねろまのふ', ['ブロッカー', 'W・ブレイカー', NERO], { civ: '光/闇/自然', cost: '7', power: '11000', race: 'ディスペクター' }),
  mino: mk('b7-8', 'みのがみ', ['マッハファイター', MINO], { cost: '5', power: '5000', race: 'グランセクト' }),
  eliza: mk('b7-9', 'えりざべす', [ELIZA], { civ: '光', cost: '5', power: '5000', race: 'アポロニア・ドラゴン' }),
  casa: mk('b7-10', 'かさぶらんか', ['このクリーチャーが出た時、自分の山札の上から１枚目をマナゾーンに置く。', CASA_CIV, CASA_UNTAP], { cost: '3', power: '2000', race: 'スノーフェアリー' }),
  kiyo: mk('b7-11', 'きよなが', ['ブロッカー', 'W・ブレイカー', KIYO], { civ: '光/水/自然', cost: '6', power: '8500', race: 'サムライ' }),
  zenon: mk('b7-12', 'ぜのん', ['W・ブレイカー', ZENON_ETB, ZENON_SA, ZENON_ATK], { civ: '水/火/自然', cost: '5', power: '7000', race: 'サイバーロード' }),
  sku: mk('b7-13', 'すーぱーかける', ['G・G・G：自分の手札が１枚以下なら、このクリーチャーに「スピードアタッカー」を与える。', SKU], { civ: '火', cost: '1', power: '1000', race: 'ビートジョッキー' }),
  cross: mk('b7-14', '弾丸超邪 クロスファイア', [GZERO, 'スピードアタッカー', 'W・ブレイカー'], { civ: '火', cost: '7', power: '7000', race: 'マジック・アウトレイジMAX' }),
  segare: mk('b7-15', 'せがーれ', ['このクリーチャーは攻撃できない。', SEGARE], { cost: '1', power: '6000', race: 'ミルクボーイ' }),
  bird: mk('b7-16', 'ごくらくちょう', [FLY, NOBREAK, BIRD], { cost: '2', power: '1000', race: 'マナ・バード' }),
  inca: mk('b7-17', 'おきよめ', [INCA, '水晶チャージャー（この呪文を唱えた後、墓地に置くかわりに、裏向きにしてマナゾーンに置く）'], { ...SPELL, cost: '3' }),
  poreki: mk('b7-18', 'ぽれきち', [POREKI], { cost: '2', power: '3000', race: 'スノーフェアリー' }),
  ningyo: mk('b7-19', 'にんぎょ', ['スレイヤー', NINGYO], { civ: '闇', cost: '2', power: '1000', race: 'マフィ・ギャング' }),
  zundoko: mk('b7-20', 'ずんどこ', ['スター進化：レクスターズまたは自然のクリーチャー１体の上に置く。', 'このクリーチャーが出た時、山札の上から１枚目をマナゾーンに置く。', ZUNDOKO], {
    type: 'スター進化クリーチャー',
    cost: '2',
    power: '5000',
    race: 'ジョーカーズ/レクスターズ',
  }),
  blueprint: mk('b7-21', 'しんかせっけいず', ['S・トリガー', BLUEPRINT], { ...SPELL, cost: '2' }),
  // 動作を確かめるための部品
  mecha5: mk('b7-30', 'めか5', [], { civ: '光', cost: '5', power: '5000', race: 'メカ' }),
  mecha4: mk('b7-31', 'めか4', [], { civ: '光', cost: '4', power: '4000', race: 'メカ' }),
  oppAtk: mk('b7-32', 'こうげき', [], { civ: '闇', cost: '3', power: '3000' }),
  speedy: mk('b7-33', 'はやい', ['スピードアタッカー'], { civ: '火', cost: '3', power: '3000' }),
  small: mk('b7-34', 'ちいさい', [], { civ: '火', cost: '3', power: '1000' }),
  big: mk('b7-35', 'おおきい', [], { civ: '闇', cost: '7', power: '9000' }),
  light: mk('b7-36', 'ひかり', [], { civ: '光', cost: '2', power: '2000' }),
  lightTama: mk('b7-37', 'ひかりたま', [], { civ: '光', ...TAMA, cost: '3' }),
  cost9: mk('b7-38', 'こすと9', [], { civ: '光', cost: '9', power: '9000' }),
  twin: mk2('b7-39', 'ついん', [], { civ: '水', cost: '4', power: '4000' }, 'ついんじゅもん', ['カードを１枚引く。'], { civ: '水', cost: '3' }),
  drawSpell: mk('b7-40', 'ひくじゅもん', ['カードを１枚引く。'], { civ: '水', ...SPELL, cost: '4' }),
  nat2: mk('b7-41', 'しぜん2', [], { cost: '2', power: '2000' }),
  nat3: mk('b7-42', 'しぜん3', [], { cost: '3', power: '3000' }),
  multi: mk('b7-43', 'たしょく', [], { civ: '光/水', cost: '3', power: '3000' }),
  evo: mk('b7-44', 'しんか', ['進化―自分の自然のクリーチャー１体の上に置く。'], { type: '進化クリーチャー', cost: '4', power: '6000' }),
  tama2: mk('b7-45', 'たましーど2', [], { ...TAMA, cost: '2' }),
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
const attack = (s: GameState, player: PlayerId, attacker: string, target: { kind: 'player' } | { kind: 'creature'; iid: string }, accept = true, pick?: Pick) => {
  s.activePlayer = player;
  s.phase = 'attack';
  return settle(act(s, { type: 'ATTACK', player, attacker, target }), accept, pick);
};

describe('SD1その7の読み取り', () => {
  it('21枚とも自動の効果になる', () => {
    for (const c of Object.values(C).slice(0, 21)) expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('ニンジャ・チェンジ・出たターン攻撃できない・タップして出る', () => {
    expect(C.chaos.handTriggers).toEqual([{ when: 'opponentAttackOrBlock', oncePerAttack: true, ninjaChange: { cardType: 'creature', minCost: 5, races: ['メカ', 'シノビ'] } }]);
    expect(C.chaos.statics).toEqual([{ type: 'grantKeyword', keywords: { noAttackOnEnterTurn: true }, appliesTo: { owner: 'opponent' } }]);
    expect(C.velvet.statics).toEqual([{ type: 'opponentEntersTapped' }]);
  });
  it('G・ゼロの2つの条件と《名前》・ツインパクト・クリーチャー', () => {
    expect(C.cross.gZero).toEqual({
      type: 'and',
      conditions: [
        { type: 'compare', left: { who: 'self', zone: 'battle' }, op: '>=', right: 4 },
        { type: 'not', condition: { type: 'compare', left: { who: 'self', zone: 'battle', filter: { nameEquals: '弾丸超邪クロスファイア' } }, op: '>=', right: 1 } },
      ],
    });
    expect(C.zenon.statics).toEqual([{ type: 'grantKeyword', keywords: { speedAttacker: true }, appliesTo: { owner: 'self', filter: { twinpact: true } } }]);
  });
  it('Gio の召喚コスト・極楽鳥のキーワード', () => {
    expect(C.gio.selfCost).toEqual({ amount: 1, per: { who: 'self', zone: 'hand', filter: { minCost: 9, maxCost: 9, excludeSelf: true } }, unit: 1, min: 1 });
    expect(C.bird.keywords).toEqual({ flying: true, maxBreakPerAttack: 0, tapAsMana: true });
  });
  it('置き換えの常在効果', () => {
    expect(C.segare.statics).toEqual([{ type: 'enterInstead', who: 'opponent', filter: { costAboveOwnerMana: true }, to: 'mana', thenSelfTo: 'mana' }]);
    expect(C.ningyo.statics).toEqual([{ type: 'manaInstead', who: 'opponent', to: 'graveyard', exceptFromHand: true, duringTurn: 'opponent' }]);
    expect(C.casa.statics).toEqual([{ type: 'manaAllCivs' }, { type: 'manaEntersUntapped', fromHand: true }]);
    expect(C.eliza.statics).toEqual([{ type: 'shieldSpellsTrigger' }]);
  });
});

describe('SD1その7の動作', () => {
  it('聖カオスマントラ：相手が攻撃した時、手札のこのクリーチャーと自分のコスト5以上のメカを入れ替える', () => {
    let s = newGame();
    const ch = put(s, 0, C.chaos.id, 'hand');
    const m5 = put(s, 0, C.mecha5.id, 'battle');
    put(s, 0, C.mecha4.id, 'battle');
    s.cards[m5].tapped = true;
    const atk = put(s, 1, C.oppAtk.id, 'battle');
    let cands: string[] = [];
    s = attack(s, 1, atk, { kind: 'player' }, true, (c, p) => (p.includes('ニンジャ・チェンジ') ? ((cands = c), [m5]) : undefined));
    expect(cands).toEqual([m5]);
    expect([zone(s, ch), zone(s, m5)]).toEqual(['battle', 'hand']);
    // 入れ替えたクリーチャーと同じタップの状態で出る
    expect(s.cards[ch].tapped).toBe(true);
  });

  it('聖カオスマントラ：コスト5以上のメカかシノビがいなければ使えない', () => {
    let s = newGame();
    const ch = put(s, 0, C.chaos.id, 'hand');
    const m4 = put(s, 0, C.mecha4.id, 'battle');
    const atk = put(s, 1, C.oppAtk.id, 'battle');
    s = attack(s, 1, atk, { kind: 'player' });
    expect([zone(s, ch), zone(s, m4)]).toEqual(['hand', 'battle']);
  });

  it('聖カオスマントラ：相手のクリーチャーは、出たターン攻撃できない（スピードアタッカーでも）', () => {
    const s = newGame();
    put(s, 0, C.chaos.id, 'battle');
    s.activePlayer = 1;
    const sp = put(s, 1, C.speedy.id, 'battle');
    s.cards[sp].enteredTurn = s.turn;
    expect(canAttackWith(s, reg, 1, sp)).toBe(false);
    s.cards[sp].enteredTurn = 0;
    expect(canAttackWith(s, reg, 1, sp)).toBe(true);
  });

  it('ヴェネラック-F5：相手のターン中、相手のクリーチャーがマナをタップせずに出た時、シールド化できる', () => {
    let s = newGame();
    put(s, 0, C.vene.id, 'battle');
    s.activePlayer = 1;
    const shields = s.players[1].zones.shield.length;
    const b = put(s, 1, C.big.id, 'graveyard');
    s = settle(enter(s, 1, b));
    expect(zone(s, b)).toBe('shield');
    expect(s.players[1].zones.shield.length).toBe(shields + 1);
    // コストを支払って出たものはシールド化しない
    const p = put(s, 1, C.big.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 1, iid: p, paid: true, summoned: true }));
    expect(zone(s, p)).toBe('battle');
    // 自分のターン中は誘発しない
    s.activePlayer = 0;
    const b2 = put(s, 1, C.big.id, 'graveyard');
    s = settle(enter(s, 1, b2));
    expect(zone(s, b2)).toBe('battle');
  });

  it('シェケダン：出た時、光のクリーチャーと光のタマシード1つにつき引ける・光のクリーチャーとタマシードのコストが2少なくなる', () => {
    let s = newGame();
    put(s, 0, C.light.id, 'battle');
    put(s, 0, C.lightTama.id, 'battle');
    put(s, 0, C.small.id, 'battle');
    const sh = put(s, 0, C.sheke.id, 'hand');
    const hand = s.players[0].zones.hand.length;
    s = settle(enter(s, 0, sh));
    // シェケダン・ひかり・ひかりたま の3つ
    expect(s.players[0].zones.hand.length).toBe(hand - 1 + 3);
    expect(effectiveCost(s, reg, 0, put(s, 0, C.light.id, 'hand'))).toBe(1);
    expect(effectiveCost(s, reg, 0, put(s, 0, C.lightTama.id, 'hand'))).toBe(1);
    expect(effectiveCost(s, reg, 0, put(s, 0, C.small.id, 'hand'))).toBe(3);
    expect(effectiveCost(s, reg, 1, put(s, 1, C.light.id, 'hand'))).toBe(2);
  });

  it('シェケダン：シビルカウント5で+10000・T・ブレイカー・攻撃する時に相手のクリーチャーをシールド化', () => {
    let s = newGame();
    const sh = put(s, 0, C.sheke.id, 'battle');
    put(s, 0, C.light.id, 'battle');
    put(s, 0, C.light.id, 'battle');
    put(s, 0, C.lightTama.id, 'battle');
    expect(power(s, reg, sh)).toBe(5500);
    put(s, 0, C.lightTama.id, 'battle');
    expect(power(s, reg, sh)).toBe(15500);
    expect(keywords(s, reg, sh).breaker).toBe(3);
    const o = put(s, 1, C.big.id, 'battle');
    s = attack(s, 0, sh, { kind: 'player' }, true, (c, p) => (p.includes('ブレイク') ? undefined : c.includes(o) ? [o] : undefined));
    expect(zone(s, o)).toBe('shield');
  });

  it('千羽忍革 ボジソワカ：自分のターンの終わりに、コスト4以下のクリーチャーを手札と墓地から1体ずつ出し、ブロッカーを与える', () => {
    let s = newGame();
    s.phase = 'main';
    put(s, 0, C.boji.id, 'battle');
    const h = put(s, 0, C.small.id, 'hand');
    const g = put(s, 0, C.nat2.id, 'graveyard');
    const big = put(s, 0, C.big.id, 'hand');
    s = settle(act(s, { type: 'END_TURN', player: 0 }), true, (c) => (c.includes(h) ? [h] : c.includes(g) ? [g] : undefined));
    expect([zone(s, h), zone(s, g), zone(s, big)]).toEqual(['battle', 'battle', 'hand']);
    expect(s.activePlayer).toBe(1);
    expect(keywords(s, reg, h).blocker).toBe(true);
    expect(keywords(s, reg, g).blocker).toBe(true);
  });

  it('閃光の神官 ヴェルベット：相手のクリーチャーはタップして出る', () => {
    let s = newGame();
    put(s, 0, C.velvet.id, 'battle');
    const o = put(s, 1, C.small.id, 'hand');
    s = enter(s, 1, o);
    expect(s.cards[o].tapped).toBe(true);
    const mine = put(s, 0, C.small.id, 'hand');
    s = enter(s, 0, mine);
    expect(s.cards[mine].tapped).toBe(false);
  });

  it('超七極 Gio：手札の他のコスト9のカード1枚につき召喚コストが1少なくなる', () => {
    const s = newGame();
    clearZone(s, 0, 'hand');
    const g = put(s, 0, C.gio.id, 'hand');
    expect(effectiveCost(s, reg, 0, g)).toBe(9);
    put(s, 0, C.cost9.id, 'hand');
    put(s, 0, C.cost9.id, 'hand');
    put(s, 0, C.small.id, 'hand');
    expect(effectiveCost(s, reg, 0, g)).toBe(7);
  });

  it('ネロマノフ：各ターンはじめて自分かこのクリーチャーが攻撃された時、相手の手札を1枚捨てさせる', () => {
    let s = newGame();
    put(s, 0, C.nero.id, 'battle');
    const a1 = put(s, 1, C.oppAtk.id, 'battle');
    const a2 = put(s, 1, C.oppAtk.id, 'battle');
    const hand = s.players[1].zones.hand.length;
    s = attack(s, 1, a1, { kind: 'player' }, false);
    expect(s.players[1].zones.hand.length).toBe(hand - 1);
    // 同じターンの2回目は誘発しない
    s.cards[a2].tapped = false;
    s = attack(s, 1, a2, { kind: 'player' }, false);
    expect(s.players[1].zones.hand.length).toBe(hand - 1);
  });

  it('ネロマノフ：このクリーチャーが攻撃された時も誘発する', () => {
    let s = newGame();
    const n = put(s, 0, C.nero.id, 'battle');
    s.cards[n].tapped = true;
    const a1 = put(s, 1, C.big.id, 'battle');
    const hand = s.players[1].zones.hand.length;
    s = attack(s, 1, a1, { kind: 'creature', iid: n }, false);
    expect(s.players[1].zones.hand.length).toBe(hand - 1);
  });

  it('全虹帝 ミノガミ：マナゾーンのツインパクトの枚数よりコストの小さいクリーチャーをマナゾーンから出せる', () => {
    let s = newGame();
    clearZone(s, 0, 'mana');
    mana(s, 0, C.twin.id, 3);
    const n2 = put(s, 0, C.nat2.id, 'mana');
    const n3 = put(s, 0, C.nat3.id, 'mana');
    const m = put(s, 0, C.mino.id, 'battle');
    let cands: string[] = [];
    s = attack(s, 0, m, { kind: 'player' }, true, (c) => (c.includes(n2) ? ((cands = c), [n2]) : undefined));
    expect(cands).toContain(n2);
    expect(cands).not.toContain(n3);
    expect(zone(s, n2)).toBe('battle');
  });

  it('天雷龍姫エリザベス：ブレイクされて手札に加えられる呪文は「S・トリガー」を得る', () => {
    let s = newGame();
    put(s, 0, C.eliza.id, 'battle');
    clearZone(s, 0, 'shield');
    const sp = put(s, 0, C.drawSpell.id, 'shield');
    put(s, 0, C.small.id, 'shield');
    const src = put(s, 1, C.big.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s = settle(runTask(s, { kind: 'breakShields', breaker: 1, source: src, defender: 0, count: 1, chosen: [sp] }), true);
    expect(zone(s, sp)).toBe('graveyard');
    // 手札に加えた分は唱えて減り、1枚引く
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
    // エリザベスがいなければ S・トリガーではない
    let t = newGame();
    clearZone(t, 0, 'shield');
    const sp2 = put(t, 0, C.drawSpell.id, 'shield');
    t = settle(runTask(t, { kind: 'breakShields', breaker: 1, source: put(t, 1, C.big.id, 'battle'), defender: 0, count: 1, chosen: [sp2] }), true);
    expect(zone(t, sp2)).toBe('hand');
  });

  it('怪盗妖精カサブランカ：マナゾーンのカードはすべての文明を持ち、手札から置いた多色カードはアンタップ', () => {
    let s = newGame();
    s.phase = 'main';
    clearZone(s, 0, 'mana');
    const f = mana(s, 0, C.small.id, 2);
    const l = put(s, 0, C.light.id, 'hand');
    expect(canPlay(s, reg, 0, l)).toBe(false);
    put(s, 0, C.casa.id, 'battle');
    expect(canPlay(s, reg, 0, l)).toBe(true);
    expect(matchFilter(s, reg, f[0], { civilization: 'water' })).toBe(true);
    const mu = put(s, 0, C.multi.id, 'hand');
    new Ctx(s, reg).moveCard(mu, 'mana');
    expect(s.cards[mu].tapped).toBe(false);
    // 山札から置いた多色カードはタップして置かれる
    const [top] = stack(s, 0, [C.multi.id]);
    s = effect(s, 0, l, { type: 'deckTopTo', count: 1, to: 'mana' });
    expect(s.cards[top].tapped).toBe(true);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: l }));
    expect(zone(s, l)).toBe('battle');
  });

  it('五輪の求道者 清永：攻撃する時、山札の上3枚がすべて異なるコストなら、コスト9以下のエレメントを使い、残りをマナへ', () => {
    let s = newGame();
    const k = put(s, 0, C.kiyo.id, 'battle');
    const [a, b, c] = stack(s, 0, [C.drawSpell.id, C.nat2.id, C.small.id]);
    s = attack(s, 0, k, { kind: 'player' }, true, (cands, p) => (p.includes('コストを支払わずに使う') ? cands : undefined));
    // 呪文はエレメントではないので使えない
    expect([zone(s, a), zone(s, b), zone(s, c)]).toEqual(['mana', 'battle', 'battle']);
  });

  it('五輪の求道者 清永：同じコストのカードがあれば使えず、すべてマナへ', () => {
    let s = newGame();
    const k = put(s, 0, C.kiyo.id, 'battle');
    const cards = stack(s, 0, [C.nat3.id, C.nat2.id, C.small.id]);
    s = attack(s, 0, k, { kind: 'player' }, true, (cands, p) => (p.includes('コストを支払わずに使う') ? cands : undefined));
    expect(cards.map((x) => zone(s, x))).toEqual(['mana', 'mana', 'mana']);
  });

  it('アカシック・ゼノン：ツインパクト・クリーチャーがあれば出た時にマナを増やし、攻撃する時に呪文側を唱えられる（各ターン一度）', () => {
    let s = newGame();
    const tw = put(s, 0, C.twin.id, 'battle');
    const z = put(s, 0, C.zenon.id, 'hand');
    const manaN = s.players[0].zones.mana.length;
    s = settle(enter(s, 0, z));
    expect(s.players[0].zones.mana.length).toBe(manaN + 1);
    expect(keywords(s, reg, tw).speedAttacker).toBe(true);
    const hand = s.players[0].zones.hand.length;
    s = attack(s, 0, tw, { kind: 'player' }, true);
    expect(zone(s, tw)).toBe('battle');
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
    // 同じターンにもう一度は使えない
    const tw2 = put(s, 0, C.twin.id, 'battle');
    const hand2 = s.players[0].zones.hand.length;
    s = attack(s, 0, tw2, { kind: 'player' }, true);
    expect(s.players[0].zones.hand.length).toBe(hand2);
  });

  it('アカシック・ゼノン：ツインパクト・クリーチャーがなければ出た時に何もしない', () => {
    let s = newGame();
    const z = put(s, 0, C.zenon.id, 'hand');
    const manaN = s.players[0].zones.mana.length;
    s = settle(enter(s, 0, z));
    expect(s.players[0].zones.mana.length).toBe(manaN);
  });

  it('グレイト“S-駆”：自分のターンの終わりに、アンタップしていれば手札に戻る', () => {
    let s = newGame();
    s.phase = 'main';
    const a = put(s, 0, C.sku.id, 'battle');
    const b = put(s, 0, C.sku.id, 'battle');
    s.cards[b].tapped = true;
    s = settle(act(s, { type: 'END_TURN', player: 0 }));
    expect([zone(s, a), zone(s, b)]).toEqual(['hand', 'battle']);
  });

  it('弾丸超邪 クロスファイア：G・ゼロは、クリーチャーが4体以上で、自分の同じ名前のクリーチャーがない時だけ', () => {
    const s = newGame();
    const c = put(s, 0, C.cross.id, 'hand');
    for (let i = 0; i < 3; i++) put(s, 0, C.small.id, 'battle');
    expect(effectiveCost(s, reg, 0, c)).toBe(7);
    put(s, 0, C.small.id, 'battle');
    expect(effectiveCost(s, reg, 0, c)).toBe(0);
    put(s, 0, C.cross.id, 'battle');
    expect(effectiveCost(s, reg, 0, c)).toBe(7);
  });

  it('ベイB セガーレ：相手がマナの枚数よりコストが大きいクリーチャーを出す時、かわりにマナへ。その後このクリーチャーもマナへ', () => {
    let s = newGame();
    const sg = put(s, 0, C.segare.id, 'battle');
    clearZone(s, 1, 'mana');
    mana(s, 1, C.small.id, 3);
    const b = put(s, 1, C.big.id, 'graveyard');
    s = settle(enter(s, 1, b));
    expect([zone(s, b), zone(s, sg)]).toEqual(['mana', 'mana']);
    // 自分のターンでも効く・コストがマナ以下なら出る
    let t = newGame();
    const sg2 = put(t, 0, C.segare.id, 'battle');
    clearZone(t, 1, 'mana');
    mana(t, 1, C.small.id, 3);
    const sm = put(t, 1, C.small.id, 'hand');
    t = settle(enter(t, 1, sm));
    expect([zone(t, sm), zone(t, sg2)]).toEqual(['battle', 'battle']);
  });

  it('極楽鳥：すべての文明を持つマナとしてタップでき、シールドはブレイクできず、飛行を持たないクリーチャーから攻撃もブロックもされない', () => {
    let s = newGame();
    s.phase = 'main';
    clearZone(s, 0, 'mana');
    const bird = put(s, 0, C.bird.id, 'battle');
    s.cards[bird].enteredTurn = s.turn;
    const l = put(s, 0, C.light.id, 'hand');
    mana(s, 0, C.small.id, 1);
    expect(canPlay(s, reg, 0, l)).toBe(true);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: l }));
    expect(zone(s, l)).toBe('battle');
    expect(s.cards[bird].tapped).toBe(true);
    // 飛行：持たないクリーチャーの攻撃先にならない
    const atk = put(s, 1, C.big.id, 'battle');
    expect(attackTargets(s, reg, 1, atk).some((t) => t.kind === 'creature' && t.iid === bird)).toBe(false);
    // ブロックされない
    const blk = put(s, 1, C.big.id, 'battle');
    const kwBlk = s.cards[blk];
    kwBlk.tapped = false;
    s.cards[bird].tapped = false;
    s.cards[bird].enteredTurn = 0;
    expect(blockersFor(s, reg, 1, bird)).toEqual([]);
    // シールドをブレイクできない
    const shields = s.players[1].zones.shield.length;
    s = attack(s, 0, bird, { kind: 'player' }, false);
    expect(s.players[1].zones.shield.length).toBe(shields);
  });

  it('表示用の支払い元：極楽鳥はすべての文明、カサブランカがいればマナはすべての文明', () => {
    const s = newGame();
    clearZone(s, 0, 'mana');
    mana(s, 0, C.small.id, 1);
    const bird = put(s, 0, C.bird.id, 'battle');
    const src = untappedPaySources(s, reg, 0);
    expect(src.map((x) => x.iid)).toContain(bird);
    expect(src.find((x) => x.iid === bird)!.civs).toHaveLength(5);
    expect(src.find((x) => x.iid !== bird)!.civs).toEqual(['fire']);
    put(s, 0, C.casa.id, 'battle');
    expect(untappedPaySources(s, reg, 0).every((x) => x.civs.length === 5)).toBe(true);
  });

  it('付与された「シールドをブレイクできない」（0）も有効で、きびしい方が使われる', () => {
    const s = newGame();
    const c = put(s, 0, C.big.id, 'battle');
    s.cards[c].keywordsTurn = { breaker: 2, maxBreakPerAttack: 0 };
    expect(keywords(s, reg, c).maxBreakPerAttack).toBe(0);
    expect(breakerCount(s, reg, c)).toBe(0);
  });

  it('清浄のカルマ インカ（呪文側）：選んだプレイヤーの墓地を山札に加えてシャッフル', () => {
    let s = newGame();
    const g = put(s, 1, C.small.id, 'graveyard');
    const sp = put(s, 0, C.inca.id, 'hand');
    s = settle(runTask(s, { kind: 'castSpell', player: 0, iid: sp, side: 'main' }), true, undefined, ['1']);
    expect(zone(s, g)).toBe('deck');
  });

  it('冒険妖精ポレキチ：出た時に選んだマナゾーンのクリーチャーを、このターンマナゾーンから召喚できる', () => {
    let s = newGame();
    s.phase = 'main';
    clearZone(s, 0, 'mana');
    mana(s, 0, C.small.id, 4);
    const a = put(s, 0, C.nat2.id, 'mana');
    const b = put(s, 0, C.nat3.id, 'mana');
    const p = put(s, 0, C.poreki.id, 'hand');
    s = settle(enter(s, 0, p), true, only(a));
    expect(canPlay(s, reg, 0, a)).toBe(true);
    expect(canPlay(s, reg, 0, b)).toBe(false);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: a }));
    expect(zone(s, a)).toBe('battle');
  });

  it('星空に浮かぶニンギョ：相手のターン中、相手が手札以外からマナゾーンに置くカードは墓地へ', () => {
    let s = newGame();
    put(s, 0, C.ningyo.id, 'battle');
    s.activePlayer = 1;
    const src = put(s, 1, C.small.id, 'battle');
    const [top] = stack(s, 1, [C.small.id]);
    s = effect(s, 1, src, { type: 'deckTopTo', count: 1, to: 'mana' });
    expect(zone(s, top)).toBe('graveyard');
    // 手札からは置ける
    const h = put(s, 1, C.small.id, 'hand');
    new Ctx(s, reg).moveCard(h, 'mana');
    expect(zone(s, h)).toBe('mana');
    // 自分のターン中は効かない
    s.activePlayer = 0;
    const [top2] = stack(s, 1, [C.small.id]);
    s = effect(s, 1, src, { type: 'deckTopTo', count: 1, to: 'mana' });
    expect(zone(s, top2)).toBe('mana');
  });

  it('晴舞龍 ズンドコ・モモキング：このカードが離れた時、マナゾーンのカードを1枚手札に戻す', () => {
    let s = newGame();
    clearZone(s, 0, 'mana');
    const m = put(s, 0, C.small.id, 'mana');
    const z = put(s, 0, C.zundoko.id, 'battle');
    const src = put(s, 1, C.big.id, 'battle');
    s = settle(effect(s, 1, src, { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } }), true, only(z));
    expect([zone(s, z), zone(s, m)]).toEqual(['graveyard', 'hand']);
  });

  it('進化設計図：山札の上から6枚のうち進化クリーチャーをすべて手札に、残りを山札の下へ', () => {
    let s = newGame();
    const six = stack(s, 0, [C.evo.id, C.small.id, C.evo.id, C.nat2.id, C.drawSpell.id, C.tama2.id]);
    const sp = put(s, 0, C.blueprint.id, 'hand');
    s = settle(runTask(s, { kind: 'castSpell', player: 0, iid: sp, side: 'main' }));
    expect(six.map((x) => zone(s, x))).toEqual(['hand', 'deck', 'hand', 'deck', 'deck', 'deck']);
    const deck = s.players[0].zones.deck;
    // 山札の下（配列の先頭）に4枚
    expect(deck.slice(0, 4).sort()).toEqual([six[1], six[3], six[4], six[5]].sort());
  });
});
