// 手動のままだった能力の言い方を自動処理にした分のテスト：
// 可能ならこのクリーチャーを攻撃する／選ぶ、パワー・コストが小さいクリーチャーにブロック・攻撃されない、タップして出す、
// パワード・ブロッカー、「〜とバトル中」、追加ターン中でなければ、ゲームに勝つ、墓地から手札に戻す、次のターンまでのパワー修正など
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { attackTargets, blockersFor, effectiveCost, keywords, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

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
