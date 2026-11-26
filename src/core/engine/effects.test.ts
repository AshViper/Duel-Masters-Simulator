// 拡張した効果（常在効果・置換効果・各種誘発・ツインパクト・モード選択など）のテスト
import { describe, expect, it } from 'vitest';
import { chooseAction } from '../ai/cpu';
import { buildRegistry } from '../cards/registry';
import { SAMPLE_CARDS, SAMPLE_DECKS } from '../testing/fixtureCards';
import type { ZoneName } from '../cards/types';
import { expandDeck } from '../deck/rules';
import { applyAction, Ctx } from './engine';
import { getLegalActions } from './legal';
import { canPlay, effectiveCost, keywords, power } from './queries';
import { nextRandom } from './rng';
import { createGame } from './setup';
import type { Action, GameState, PlayerId } from './types';

const reg = buildRegistry(SAMPLE_CARDS);
const filler = (id: string) => Array.from({ length: 40 }, () => id);

function newGame(): GameState {
  return createGame({ players: [{ name: 'A', deck: filler('S01-043') }, { name: 'B', deck: filler('S01-043') }], seed: 7, firstPlayer: 0 }, reg);
}

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName, opts: { tapped?: boolean; sick?: boolean } = {}): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  if (opts.tapped) s.cards[iid].tapped = true;
  s.cards[iid].enteredTurn = opts.sick ? s.turn : 0;
  return iid;
}

function mana(s: GameState, player: PlayerId, cardId: string, n: number) {
  for (let i = 0; i < n; i++) put(s, player, cardId, 'mana');
}

function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  checkInvariants(r.state);
  return r.state;
}

function checkInvariants(s: GameState) {
  const seen = new Map<string, number>();
  for (const p of s.players) {
    for (const [zone, list] of Object.entries(p.zones)) {
      for (const iid of list) {
        seen.set(iid, (seen.get(iid) ?? 0) + 1);
        expect(s.cards[iid].zone).toBe(zone);
        for (const u of s.cards[iid].under) seen.set(u, (seen.get(u) ?? 0) + 1);
      }
    }
  }
  for (const iid of Object.keys(s.cards)) expect(seen.get(iid), iid).toBe(1);
}

const clearShields = (s: GameState, p: PlayerId) => {
  for (const sh of [...s.players[p].zones.shield]) new Ctx(s, reg).moveCard(sh, 'graveyard');
};

describe('常在効果', () => {
  it('コスト軽減：自分の呪文のコストが1下がり、1未満にはならない', () => {
    const s = newGame();
    const spell = put(s, 0, 'S01-013', 'hand'); // 水3
    const cheap = put(s, 0, 'S02-011', 'hand'); // 水2
    expect(effectiveCost(s, reg, 0, spell)).toBe(3);
    put(s, 0, 'S02-001', 'battle');
    expect(effectiveCost(s, reg, 0, spell)).toBe(2);
    expect(effectiveCost(s, reg, 0, cheap)).toBe(1);
    // 相手の呪文には効かない
    const oppSpell = put(s, 1, 'S01-013', 'hand');
    expect(effectiveCost(s, reg, 1, oppSpell)).toBe(3);
  });

  it('軽減したコストで唱えられる', () => {
    let s = newGame();
    put(s, 0, 'S02-001', 'battle');
    const spell = put(s, 0, 'S01-013', 'hand');
    mana(s, 0, 'S01-012', 2);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: spell });
    expect(s.cards[spell].zone).toBe('graveyard');
  });

  it('種族を指定したパワー修正（自身は除く）', () => {
    const s = newGame();
    const lord = put(s, 0, 'S02-002', 'battle');
    const a = put(s, 0, 'S01-032', 'battle'); // 紅蓮族 3000
    const b = put(s, 0, 'S01-043', 'battle'); // 巨獣 7000
    expect(power(s, reg, a)).toBe(4000);
    expect(power(s, reg, b)).toBe(7000);
    expect(power(s, reg, lord)).toBe(2000);
  });

  it('召喚制限：相手はコスト6以上を召喚できない', () => {
    const s = newGame();
    put(s, 1, 'S02-003', 'battle');
    const big = put(s, 0, 'S01-035', 'hand'); // 火7
    const small = put(s, 0, 'S01-034', 'hand'); // 火5
    mana(s, 0, 'S01-031', 7);
    expect(canPlay(s, reg, 0, big)).toBe(false);
    expect(canPlay(s, reg, 0, small)).toBe(true);
    expect(applyAction(s, { type: 'PLAY_CARD', player: 0, iid: big }, reg).error).toMatch(/召喚できません/);
  });

  it('ターン終了まで有効な常在効果：S・トリガーで相手は攻撃できなくなり、次のターンには戻る', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-043', 'battle');
    const b = put(s, 0, 'S01-031', 'battle');
    clearShields(s, 1);
    put(s, 1, 'S02-015', 'shield');
    put(s, 1, 'S01-043', 'shield');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(keywords(s, reg, b).cannotAttack).toBe(true);
    expect(getLegalActions(s, reg, 0).some((x) => x.type === 'ATTACK')).toBe(false);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.turnStatics).toEqual([]);
    expect(keywords(s, reg, b).cannotAttack).toBeFalsy();
  });
});

describe('置換効果', () => {
  it('破壊されるかわりに手札に戻る', () => {
    let s = newGame();
    const ghost = put(s, 1, 'S02-005', 'battle');
    const spell = put(s, 0, 'S01-022', 'hand');
    mana(s, 0, 'S01-021', 4);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: spell });
    expect(s.cards[ghost].zone).toBe('hand');
    expect(s.log.some((l) => l.text.includes('置換効果'))).toBe(true);
  });

  it('セイバー：他のクリーチャーのかわりに破壊される（任意）', () => {
    let s = newGame();
    const saver = put(s, 1, 'S02-004', 'battle');
    const vip = put(s, 1, 'S01-043', 'battle');
    const spell = put(s, 0, 'S01-022', 'hand');
    mana(s, 0, 'S01-021', 4);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: spell });
    s = act(s, { type: 'RESPOND', player: 0, selected: [vip] });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[vip].zone).toBe('battle');
    expect(s.cards[saver].zone).toBe('graveyard');
  });

  it('セイバーを使わなければ普通に破壊される', () => {
    let s = newGame();
    put(s, 1, 'S02-004', 'battle');
    const vip = put(s, 1, 'S01-043', 'battle');
    const spell = put(s, 0, 'S01-022', 'hand');
    mana(s, 0, 'S01-021', 4);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: spell });
    s = act(s, { type: 'RESPOND', player: 0, selected: [vip] });
    s = act(s, { type: 'RESPOND', player: 1, accept: false });
    expect(s.cards[vip].zone).toBe('graveyard');
  });

  it('バトルで負けた時も置換効果が働く', () => {
    let s = newGame();
    const ghost = put(s, 1, 'S02-005', 'battle', { tapped: true });
    const a = put(s, 0, 'S01-043', 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: ghost } });
    expect(s.cards[ghost].zone).toBe('hand');
  });
});

describe('誘発タイミング', () => {
  it('ターンのはじめの誘発はドローより先に解決される', () => {
    let s = newGame();
    const t = put(s, 1, 'S02-006', 'battle');
    expect(t).toBeTruthy();
    const mana1 = s.players[1].zones.mana.length;
    const hand1 = s.players[1].zones.hand.length;
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.players[1].zones.mana.length).toBe(mana1 + 1);
    expect(s.players[1].zones.hand.length).toBe(hand1 + 1);
    const iManaLog = s.log.findIndex((l) => l.text.includes('マナゾーンへ'));
    expect(iManaLog).toBeGreaterThan(0);
  });

  it('ターンの終わりの誘発とブロック時の誘発', () => {
    let s = newGame();
    const g = put(s, 1, 'S02-007', 'battle');
    const a = put(s, 0, 'S01-031', 'battle');
    const hand1 = s.players[1].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 1, selected: [g] });
    expect(s.players[1].zones.hand.length).toBe(hand1 + 1); // ブロックして1枚引いた
    // 相手（プレイヤー1）のターン終了時に、プレイヤー0の手札が1枚減る
    s = act(s, { type: 'END_TURN', player: 0 });
    const hand0 = s.players[0].zones.hand.length;
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.players[0].zones.hand.length).toBe(hand0 - 1 + 1); // 捨てて、次のターンに1枚引く
  });

  it('バトルに勝った時の誘発（アンタップのクリーチャーも攻撃できる）', () => {
    let s = newGame();
    const v = put(s, 0, 'S02-008', 'battle');
    const target = put(s, 1, 'S01-032', 'battle'); // 3000・アンタップ
    s = act(s, { type: 'ATTACK', player: 0, attacker: v, target: { kind: 'creature', iid: target } });
    expect(s.cards[target].zone).toBe('graveyard');
    s = act(s, { type: 'RESPOND', player: 0, selected: [s.players[1].zones.shield[0]] });
    expect(s.players[1].zones.shield).toHaveLength(4);
  });

  it('他のクリーチャーが出た時の誘発', () => {
    let s = newGame();
    const wolf = put(s, 0, 'S02-009', 'battle');
    const c = put(s, 0, 'S01-031', 'hand');
    mana(s, 0, 'S01-031', 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(power(s, reg, wolf)).toBe(5000);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(power(s, reg, wolf)).toBe(3000);
  });

  it('条件付きの効果（if / else）', () => {
    let s = newGame();
    const c = put(s, 0, 'S02-019', 'hand');
    mana(s, 0, 'S01-031', 3);
    mana(s, 0, 'S01-041', 2);
    put(s, 0, 'S01-043', 'battle');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.players[0].zones.hand.length).toBe(hand - 1 + 1); // 2体なので1枚

    let t = newGame();
    const c2 = put(t, 0, 'S02-019', 'hand');
    mana(t, 0, 'S01-031', 3);
    mana(t, 0, 'S01-041', 2);
    put(t, 0, 'S01-043', 'battle');
    put(t, 0, 'S01-043', 'battle');
    const hand2 = t.players[0].zones.hand.length;
    t = act(t, { type: 'PLAY_CARD', player: 0, iid: c2 });
    expect(t.players[0].zones.hand.length).toBe(hand2 - 1 + 2); // 3体なので2枚
  });
});

describe('ツインパクト', () => {
  it('呪文側を唱えると呪文の効果が出て墓地へ、マナでは両面の文明を持つ', () => {
    let s = newGame();
    const tw = put(s, 0, 'S02-010', 'hand');
    const target = put(s, 1, 'S01-043', 'battle');
    mana(s, 0, 'S01-012', 3);
    expect(canPlay(s, reg, 0, tw, 'main')).toBe(false); // 本体は6コスト
    expect(getLegalActions(s, reg, 0).some((a) => a.type === 'PLAY_CARD' && a.side === 'twin')).toBe(true);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: tw, side: 'twin' });
    expect(s.cards[target].zone).toBe('hand');
    expect(s.cards[tw].zone).toBe('graveyard');
  });

  it('呪文側の S・トリガーで使える', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-043', 'battle');
    clearShields(s, 1);
    put(s, 1, 'S01-043', 'shield');
    put(s, 1, 'S02-010', 'shield');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[a].zone).toBe('hand');
  });
});

describe('その他の効果', () => {
  it('山札の上から見て選ぶ（残りは山札の下）', () => {
    let s = newGame();
    const sp = put(s, 0, 'S02-011', 'hand');
    mana(s, 0, 'S01-012', 2);
    const top3 = s.players[0].zones.deck.slice(-3);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'selectCards', max: 1, min: 0 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [top3[0]] });
    expect(s.cards[top3[0]].zone).toBe('hand');
    expect(s.players[0].zones.deck.slice(0, 2).sort()).toEqual([top3[1], top3[2]].sort());
  });

  it('墓地からバトルゾーンに出す（出た時の能力も誘発）', () => {
    let s = newGame();
    const dead = put(s, 0, 'S01-041', 'graveyard'); // 出た時マナ+1
    const sp = put(s, 0, 'S02-012', 'hand');
    mana(s, 0, 'S01-021', 6);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[dead].zone).toBe('battle');
    expect(s.players[0].zones.mana).toHaveLength(7);
  });

  it('すべて破壊（自分のクリーチャーも）', () => {
    let s = newGame();
    const mine = put(s, 0, 'S01-031', 'battle');
    const big = put(s, 1, 'S01-043', 'battle');
    const small = put(s, 1, 'S01-032', 'battle');
    const sp = put(s, 0, 'S02-013', 'hand');
    mana(s, 0, 'S01-031', 6);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect([s.cards[mine].zone, s.cards[small].zone, s.cards[big].zone]).toEqual(['graveyard', 'graveyard', 'battle']);
  });

  it('キーワード付与：召喚したばかりのクリーチャーが攻撃でき、攻撃中パワーが上がる', () => {
    let s = newGame();
    const c = put(s, 0, 'S01-043', 'battle', { sick: true });
    const sp = put(s, 0, 'S02-014', 'hand');
    mana(s, 0, 'S01-031', 2);
    expect(getLegalActions(s, reg, 0).some((a) => a.type === 'ATTACK')).toBe(false);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(getLegalActions(s, reg, 0).some((a) => a.type === 'ATTACK' && a.attacker === c)).toBe(true);
    const b = put(s, 1, 'S01-002', 'battle'); // 5000 ブロッカー
    s = act(s, { type: 'ATTACK', player: 0, attacker: c, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 1, selected: [b] });
    expect(s.cards[b].zone).toBe('graveyard');
  });

  it('モード選択', () => {
    let s = newGame();
    const sp = put(s, 0, 'S02-016', 'hand');
    mana(s, 0, 'S01-001', 3);
    mana(s, 0, 'S01-041', 2);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: expect.any(Array) });
    expect(applyAction(s, { type: 'RESPOND', player: 0, selected: ['9'] }, reg).error).toBeTruthy();
    const m = s.players[0].zones.mana.length;
    s = act(s, { type: 'RESPOND', player: 0, selected: ['1'] });
    expect(s.players[0].zones.mana.length).toBe(m + 2);
  });

  it('相手が自分のクリーチャーを選んで破壊する', () => {
    let s = newGame();
    const a = put(s, 1, 'S01-043', 'battle');
    put(s, 1, 'S01-031', 'battle');
    const sp = put(s, 0, 'S02-017', 'hand');
    mana(s, 0, 'S01-021', 3);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [a] });
    expect(s.cards[a].zone).toBe('graveyard');
  });

  it('効果でシールドをブレイクすると S・トリガーも使える', () => {
    let s = newGame();
    clearShields(s, 1);
    put(s, 1, 'S01-042', 'shield'); // 自然 S・トリガー
    const sp = put(s, 0, 'S02-018', 'hand');
    mana(s, 0, 'S01-031', 4);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.players[1].zones.shield).toHaveLength(0);
    expect(s.players[1].zones.mana.length).toBeGreaterThan(0);
  });

  it('追加ターン', () => {
    let s = newGame();
    const sp = put(s, 0, 'S01-053', 'hand');
    mana(s, 0, 'S01-012', 6);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.activePlayer).toBe(0);
    expect(s.turn).toBe(2);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.activePlayer).toBe(1);
  });

  it('攻撃時の条件付きパワー修正', () => {
    let s = newGame();
    const beast = put(s, 0, 'S01-054', 'battle');
    mana(s, 1, 'S01-043', 5);
    s = act(s, { type: 'ATTACK', player: 0, attacker: beast, target: { kind: 'player' } });
    // マナ 1 vs 5 → +3000
    expect(s.cards[beast].powerModTurn).toBe(3000);
  });
});

describe('CPU 同士で新しいカードを使った対戦', () => {
  it.each([21, 22, 23, 24, 25, 26])('合法手だけで決着する (seed %i)', (seed) => {
    const decks = [expandDeck(SAMPLE_DECKS[2]), expandDeck(SAMPLE_DECKS[seed % 2])];
    let s = createGame({ players: [{ name: 'A', deck: decks[0], isCpu: true }, { name: 'B', deck: decks[1], isCpu: true }], seed }, reg);
    let rng = seed;
    const rand = () => {
      const [v, n] = nextRandom(rng);
      rng = n;
      return v;
    };
    let steps = 0;
    while (s.gameOverReason === null && steps < 6000) {
      const who: PlayerId = s.pending ? s.pending.player : s.activePlayer;
      const a = chooseAction(s, reg, who, seed % 3 === 0 ? 'easy' : 'hard', rand);
      expect(a, `no action at step ${steps}`).not.toBeNull();
      const r = applyAction(s, a!, reg);
      expect(r.error, JSON.stringify(a)).toBeUndefined();
      s = r.state;
      steps++;
    }
    checkInvariants(s);
    expect(s.gameOverReason).not.toBeNull();
  });
});
