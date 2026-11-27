import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from './engine';
import { createGame } from './setup';
import type { Action, GameState, PlayerId } from './types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { buildRegistry } from '../cards/registry';
import type { CardDefinition, EffectDef, TriggeredAbility, ZoneName } from '../cards/types';

const cd = (id: string, o: Partial<CardDefinition>): CardDefinition => ({ id, name: id, cost: 0, civilizations: ['fire'], type: 'creature', races: ['テスト'], power: 3000, text: '', set: 'T', support: 'full', ...o });
const log = (text: string): EffectDef => ({ type: 'manual', text });
const ab = (when: TriggeredAbility['when'], effects: EffectDef[], extra: Partial<TriggeredAbility> = {}): TriggeredAbility => ({ when, effects, ...extra });
const C = {
  vanilla: cd('r-v', {}),
  v3000: cd('r-3000', { power: 3000 }),
  // 呪文：相手のクリーチャーを1体破壊する。その後、カードを1枚引く
  killDraw: cd('r-kill', { type: 'spell', power: undefined, abilities: [ab('onCast', [{ type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } }, { type: 'draw', count: 1 }])] }),
  // 破壊された時、ログ
  onDie: cd('r-die', { abilities: [ab('onDestroyed', [log('破壊された時')])] }),
  // 呪文：相手のクリーチャー1体のパワーを-3000。その後、そのクリーチャーのパワーを+3000（ターン終了まで）
  minusPlus: cd('r-mp', {
    type: 'spell',
    power: undefined,
    abilities: [ab('onCast', [{ type: 'powerMod', target: { owner: 'opponent', zone: 'battle', count: 1 }, amount: -3000 }, { type: 'powerMod', target: { owner: 'any', zone: 'battle', count: 'all', ref: 'chosen' }, amount: 3000 }])],
  }),
  // ターンのはじめ／終わり
  startA: cd('r-sa', { abilities: [ab('onTurnStart', [log('はじめA')], { who: 'any' })] }),
  startB: cd('r-sb', { abilities: [ab('onTurnStart', [log('はじめB')], { who: 'any' })] }),
  endA: cd('r-ea', { abilities: [ab('onTurnEnd', [log('終わりA')], { who: 'any' })] }),
  attackDraw: cd('r-ad', { abilities: [ab('onAttack', [log('攻撃する時')])] }),
  blockerLog: cd('r-bl', { keywords: { blocker: true }, power: 1000, abilities: [ab('onBlock', [log('ブロックした時')])] }),
  trigSpellA: cd('r-sta', { type: 'spell', power: undefined, keywords: { shieldTrigger: true }, abilities: [ab('onCast', [log('S・トリガーA')])] }),
  trigSpellB: cd('r-stb', { type: 'spell', power: undefined, keywords: { shieldTrigger: true }, abilities: [ab('onCast', [log('S・トリガーB')])] }),
  trigCreature: cd('r-stc', { keywords: { shieldTrigger: true }, abilities: [ab('onSummon', [log('S・トリガーで出た時')])] }),
  wbreaker: cd('r-wb', { keywords: { breaker: 2 }, power: 6000 }),
  manualSpell: cd('r-ms', { type: 'spell', power: undefined, abilities: [ab('onCast', [log('墓地からクリーチャーを出す'), { type: 'draw', count: 1 }])] }),
  invader: cd('r-inv', { type: 'evolution', power: 8000, evolvesFrom: { civilization: 'fire' }, attackSwap: { kind: 'invasion', filter: { civilization: 'fire' } }, abilities: [ab('onSummon', [log('侵略で出た時')])] }),
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
const act = (s: GameState, a: Action) => {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
};
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 3, firstPlayer: 0 }, reg);
/** 手動処理のログ（[要手動処理] X）の順番 */
const marks = (s: GameState) => s.log.filter((l) => l.text.includes('要手動処理')).map((l) => l.text.replace(/^.*：/, ''));
/** 入力待ちに、手動処理は「処理した」、確認は「はい」で答え続ける */
function drain(s: GameState, pick?: (p: NonNullable<GameState['pending']>) => Partial<{ selected: string[]; accept: boolean }>): GameState {
  for (let g = 0; g < 30 && s.pending; g++) {
    const p = s.pending;
    const r = pick?.(p) ?? (p.kind === 'selectCards' ? { selected: p.candidates.slice(0, p.min) } : p.kind === 'chooseMode' ? { selected: ['0'] } : p.kind === 'block' ? { selected: [] } : { accept: true });
    s = act(s, { type: 'RESPOND', player: p.player, ...r });
  }
  return s;
}

describe('総合ルールの処理順', () => {
  it('呪文の解決中に誘発した能力は、呪文の効果をすべて終えてから解決する', () => {
    let s = newGame();
    put(s, 1, C.onDie.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.killDraw.id, 'hand') });
    // 手動処理の確認が出るのは、呪文の「引く」の後
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
    expect(s.pending?.kind).toBe('manualStep');
  });

  it('ルール処理（パワー0以下の破壊）は、能力の解決が終わってから行う', () => {
    let s = newGame();
    const foe = put(s, 1, C.v3000.id, 'battle');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.minusPlus.id, 'hand') });
    s = drain(s);
    expect(s.cards[foe].zone).toBe('battle');
  });

  it('ターンのはじめ：アンタップの後、ドローの前に誘発を解決する。ターンプレイヤーの能力が先', () => {
    let s = newGame();
    put(s, 0, C.startA.id, 'battle');
    put(s, 1, C.startB.id, 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    // 相手（B）のターン：Bのはじめ能力 → Aのはじめ能力
    s = drain(s);
    expect(marks(s)).toEqual(['はじめB', 'はじめA']);
  });

  it('攻撃する時の能力 → ブロック → ブロックした時の能力 → バトル', () => {
    let s = newGame();
    const atk = put(s, 0, C.attackDraw.id, 'battle');
    const blk = put(s, 1, C.blockerLog.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s.pending?.kind).toBe('manualStep');
    s = drain(s, (p) => (p.kind === 'block' ? { selected: [blk] } : p.kind === 'manualStep' ? { accept: true } : {}));
    expect(marks(s)).toEqual(['攻撃する時', 'ブロックした時']);
    expect(s.cards[blk].zone).toBe('graveyard');
  });

  it('S・トリガーが2枚：ブレイクされたプレイヤーが使う順番を選ぶ。出たクリーチャーの「出た時」はS・トリガーを使い終えてから', () => {
    let s = newGame();
    const atk = put(s, 0, C.wbreaker.id, 'battle');
    // 相手のシールドを2枚だけにして、どちらもS・トリガーにする
    for (const sh of [...s.players[1].zones.shield]) new Ctx(s, reg).moveCard(sh, 'graveyard');
    const a = put(s, 1, C.trigSpellA.id, 'shield');
    const cr = put(s, 1, C.trigCreature.id, 'shield');
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    // 2枚ともブレイク → どちらから使うか選ぶ
    expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 1 });
    const opts = (s.pending as { options: string[] }).options;
    s = act(s, { type: 'RESPOND', player: 1, selected: [String(opts.findIndex((o) => o.includes('r-stc')))] });
    s = drain(s);
    void a;
    void cr;
    expect(marks(s)).toEqual(['S・トリガーA', 'S・トリガーで出た時']);
  });

  it('ターンの終わり：誘発を解決してから「このターン」の効果が終わる', () => {
    let s = newGame();
    put(s, 0, C.endA.id, 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    s = drain(s);
    expect(marks(s)[0]).toBe('終わりA');
    expect(s.activePlayer).toBe(1);
  });

  it('侵略と「攻撃する時」の能力は同じタイミング：ターンプレイヤーが順番を選ぶ', () => {
    for (const first of ['0', '1'] as const) {
      let s = newGame();
      const atk = put(s, 0, C.attackDraw.id, 'battle');
      put(s, 0, C.invader.id, 'hand');
      s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
      expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 0 });
      s = act(s, { type: 'RESPOND', player: 0, selected: [first] });
      s = drain(s, (p) => (p.kind === 'selectCards' && p.prompt.includes('侵略') ? { selected: p.candidates.slice(0, 1) } : p.kind === 'manualStep' ? { accept: true } : p.kind === 'block' ? { selected: [] } : p.kind === 'selectCards' ? { selected: p.candidates.slice(0, p.min) } : p.kind === 'chooseMode' ? { selected: ['0'] } : { accept: true }));
      // 侵略を先にすると、侵略で出た時と攻撃する時の2つが待っている状態になる（順番はまた選べる）
      if (first === '1') expect(marks(s)).toEqual(['攻撃する時', '侵略で出た時']);
      else expect(marks(s).sort()).toEqual(['侵略で出た時', '攻撃する時'].sort());
    }
  });

});

describe('手動操作', () => {
  it('手動で「バトルゾーンに出す」と「出た時」が誘発する。「置き直す」なら誘発しない', () => {
    let s = newGame();
    const a = put(s, 0, C.trigCreature.id, 'hand');
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: a, to: 'battle' });
    expect(s.cards[a].zone).toBe('battle');
    expect(s.pending?.kind).toBe('manualStep');
    s = drain(s);
    const b = put(s, 0, C.trigCreature.id, 'hand');
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: b, to: 'battle', raw: true });
    expect(s.cards[b].zone).toBe('battle');
    expect(s.pending).toBeNull();
  });

  it('手動で「破壊する」と「破壊された時」が誘発する', () => {
    let s = newGame();
    const a = put(s, 1, C.onDie.id, 'battle');
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: a, to: 'graveyard' });
    expect(s.cards[a].zone).toBe('graveyard');
    expect(marks(s)).toEqual(['破壊された時']);
  });

  it('手動処理の能力の途中で出したクリーチャーの「出た時」は、その能力（呪文）を終えてから解決する', () => {
    let s = newGame();
    const g = put(s, 0, C.trigCreature.id, 'graveyard');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: put(s, 0, C.manualSpell.id, 'hand') });
    expect(s.pending?.kind).toBe('manualStep');
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: g, to: 'battle' });
    expect(s.cards[g].zone).toBe('battle');
    // まだ同じ能力の手動処理の途中（「要手動処理」のログは1回だけ）
    expect(s.pending?.kind).toBe('manualStep');
    expect(marks(s)).toEqual(['墓地からクリーチャーを出す']);
    const deck = s.players[0].zones.deck.length;
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    // 呪文の残り（1枚引く）を終えてから「出た時」
    expect(s.players[0].zones.deck.length).toBe(deck - 1);
    expect(s.pending?.kind).toBe('manualStep');
    s = drain(s);
    expect(marks(s)).toEqual(['墓地からクリーチャーを出す', 'S・トリガーで出た時']);
  });
});
