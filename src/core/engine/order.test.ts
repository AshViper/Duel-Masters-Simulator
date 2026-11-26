// 効果の処理順（ルール）：ターンプレイヤーの能力を先に、同時に誘発した自分の能力は順番を選ぶ、
// 解決中の能力（呪文）が終わってから次の能力を解決する
import { describe, expect, it } from 'vitest';
import { convertOfficialCard } from '../cards/officialConvert';
import { buildRegistry } from '../cards/registry';
import type { ZoneName } from '../cards/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { Ctx, applyAction } from './engine';
import { createGame } from './setup';
import type { Action, GameState, PlayerId } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
const mk = (id: string, abilities: string[], type = 'クリーチャー') =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name: id, race: 'テスト', civilization: '火', type, power: type === '呪文' ? '' : '3000', cost: '1', abilities }] });

const C = {
  vanilla: mk('o-1', []),
  drawOnDeath: mk('o-2', ['クリーチャーが破壊された時、カードを１枚引く。']),
  manaOnDeath: mk('o-3', ['クリーチャーが破壊された時、自分の山札の上から１枚目をマナゾーンに置く。']),
  selfMana: mk('o-4', ['このクリーチャーが破壊された時、自分の山札の上から１枚目をマナゾーンに置く。']),
  toMana: mk('o-6', ['このクリーチャーが破壊される時、墓地に置くかわりに自分のマナゾーンに置く。']),
  saver: mk('o-7', ['自分の他のクリーチャーが破壊される時、かわりにそのクリーチャーに封印を付ける。'.replace('自分の他の', '自分の')]),
  optHand: mk('o-8', ['このクリーチャーが破壊される時、かわりに手札に戻してもよい。', 'このクリーチャーが破壊される時、かわりに自分の山札の下に置いてもよい。']),
  sacDraw: mk('o-5', ['自分のクリーチャーを１体破壊する。その後、カードを１枚引く。'], '呪文'),
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
function destroy(s: GameState, iid: string): void {
  s.queue.push({ kind: 'leave', iid, to: 'graveyard', cause: 'destroy' });
  new Ctx(s, reg).run();
}
/** ログの中で、その文字列を含む行を出したプレイヤーの順番 */
const order = (s: GameState, from: number, ...words: string[]) => s.log.slice(from).filter((l) => words.some((w) => l.text.includes(w))).map((l) => [l.player, words.find((w) => l.text.includes(w))]);

describe('効果の処理順', () => {
  it.each([0, 1] as PlayerId[])('両方のプレイヤーの能力が同時に誘発したら、ターンプレイヤー（%i）の能力を先に解決する', (turnPlayer) => {
    const s = newGame();
    put(s, 0, C.drawOnDeath.id, 'battle');
    put(s, 1, C.drawOnDeath.id, 'battle');
    const victim = put(s, 1, C.vanilla.id, 'battle');
    s.activePlayer = turnPlayer;
    const from = s.log.length;
    destroy(s, victim);
    expect(order(s, from, 'カードを1枚引く').map((x) => x[0])).toEqual([turnPlayer, turnPlayer === 0 ? 1 : 0]);
  });

  it('自分の能力が2つ同時に誘発したら、処理する順番を選ぶ', () => {
    let s = newGame();
    put(s, 0, C.drawOnDeath.id, 'battle');
    put(s, 0, C.manaOnDeath.id, 'battle');
    const victim = put(s, 1, C.vanilla.id, 'battle');
    const from = s.log.length;
    destroy(s, victim);
    expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 0 });
    expect(s.pending?.kind === 'chooseMode' && s.pending.options).toHaveLength(2);
    // 2つ目（マナゾーンに置く）を先に処理する
    s = act(s, { type: 'RESPOND', player: 0, selected: ['1'] });
    expect(s.pending).toBeFalsy();
    expect(order(s, from, 'カードを1枚引く', 'マナゾーンへ').map((x) => x[1])).toEqual(['マナゾーンへ', 'カードを1枚引く']);
  });

  it('同じカードの同じ能力が2つ誘発しても、順番は聞かない', () => {
    const s = newGame();
    put(s, 0, C.drawOnDeath.id, 'battle');
    put(s, 0, C.drawOnDeath.id, 'battle');
    const victim = put(s, 1, C.vanilla.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    destroy(s, victim);
    expect(s.pending).toBeFalsy();
    expect(s.players[0].zones.hand.length).toBe(hand + 2);
  });

  it('呪文の効果をすべて処理し終えてから、途中で誘発した能力を解決する', () => {
    let s = newGame();
    put(s, 0, C.selfMana.id, 'battle');
    const sp = put(s, 0, C.sacDraw.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const from = s.log.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toBeFalsy();
    // 破壊 → 呪文の続き（引く）→ 破壊された時の能力（マナゾーンに置く）
    expect(order(s, from, 'カードを1枚引く', 'マナゾーンへ').map((x) => x[1])).toEqual(['カードを1枚引く', 'マナゾーンへ']);
  });
});

describe('置換効果が2つ以上ある時', () => {
  it('読み取り', () => {
    expect(C.toMana.replacements).toHaveLength(1);
    expect(C.saver.replacements).toHaveLength(1);
    expect(C.optHand.replacements).toHaveLength(2);
  });

  it('破壊されるクリーチャーの持ち主が、適用する置換効果を選ぶ', () => {
    for (const pick of [0, 1]) {
      let s = newGame();
      const c = put(s, 1, C.toMana.id, 'battle');
      put(s, 1, C.saver.id, 'battle');
      // 相手のターン中でも、選ぶのは破壊されるクリーチャーの持ち主（プレイヤー1）
      destroy(s, c);
      expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 1 });
      expect(s.pending?.kind === 'chooseMode' && s.pending.options).toHaveLength(2);
      s = act(s, { type: 'RESPOND', player: 1, selected: [String(pick)] });
      expect(s.pending).toBeFalsy();
      // 0: 自身の効果でマナゾーンへ／1: 他のクリーチャーの効果で封印が付いてとどまる
      expect(s.cards[c].zone).toBe(pick === 0 ? 'mana' : 'battle');
      expect(!!s.cards[c].seals?.length).toBe(pick === 1);
    }
  });

  it('置換効果が1つだけなら聞かない', () => {
    const s = newGame();
    const c = put(s, 0, C.toMana.id, 'battle');
    destroy(s, c);
    expect(s.pending).toBeFalsy();
    expect(s.cards[c].zone).toBe('mana');
  });

  it('どれも「〜してもよい」なら、選んだものをそのまま使い、使わないことも選べる', () => {
    let s = newGame();
    const c = put(s, 0, C.optHand.id, 'battle');
    destroy(s, c);
    expect(s.pending?.kind === 'chooseMode' && s.pending.options).toHaveLength(3);
    s = act(s, { type: 'RESPOND', player: 0, selected: ['1'] });
    expect(s.pending).toBeFalsy();
    expect(s.players[0].zones.deck[0]).toBe(c);

    let s2 = newGame();
    const c2 = put(s2, 0, C.optHand.id, 'battle');
    destroy(s2, c2);
    s2 = act(s2, { type: 'RESPOND', player: 0, selected: ['2'] });
    expect(s2.pending).toBeFalsy();
    expect(s2.cards[c2].zone).toBe('graveyard');
  });
});
