import { describe, expect, it } from 'vitest';
import { buildRegistry } from '../cards/registry';
import { SAMPLE_CARDS, SAMPLE_DECKS } from '../testing/fixtureCards';
import type { ZoneName } from '../cards/types';
import { expandDeck } from '../deck/rules';
import { chooseAction, type Difficulty } from '../ai/cpu';
import { applyAction, Ctx } from './engine';
import { getLegalActions } from './legal';
import { nextRandom } from './rng';
import { createGame } from './setup';
import type { Action, GameState, PlayerId } from './types';

const reg = buildRegistry(SAMPLE_CARDS);
const filler = (id: string) => Array.from({ length: 40 }, () => id);

function newGame(deck0 = filler('S01-043'), deck1 = filler('S01-043'), seed = 1): GameState {
  return createGame({ players: [{ name: 'A', deck: deck0 }, { name: 'B', deck: deck1 }], seed, firstPlayer: 0 }, reg);
}

/** テスト用：指定カードの個体を作って指定ゾーンに置く */
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName, opts: { tapped?: boolean; sick?: boolean } = {}): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  if (opts.tapped) s.cards[iid].tapped = true;
  s.cards[iid].enteredTurn = opts.sick ? s.turn : 0;
  return iid;
}

function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  checkInvariants(r.state);
  return r.state;
}

/** ゾーン整合性：全カードがちょうど1か所（ゾーン or 進化元）にある */
function checkInvariants(s: GameState) {
  const seen = new Map<string, number>();
  for (const p of s.players) {
    for (const [zone, list] of Object.entries(p.zones)) {
      for (const iid of list) {
        seen.set(iid, (seen.get(iid) ?? 0) + 1);
        expect(s.cards[iid].zone).toBe(zone);
        expect(s.cards[iid].owner).toBe(p.id);
        for (const u of s.cards[iid].under) seen.set(u, (seen.get(u) ?? 0) + 1);
      }
    }
  }
  for (const iid of Object.keys(s.cards)) expect(seen.get(iid), iid).toBe(1);
}

describe('ゲーム開始', () => {
  it('シャッフル・シールド5枚・手札5枚・先攻はドローしない', () => {
    const s = newGame();
    checkInvariants(s);
    for (const p of s.players) {
      expect(p.zones.shield).toHaveLength(5);
      expect(p.zones.deck.length + p.zones.hand.length).toBe(35);
    }
    expect(s.players[0].zones.hand).toHaveLength(5);
    expect(s.players[1].zones.hand).toHaveLength(5);
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('charge');
  });

  it('同じシードなら同じ結果になる', () => {
    const a = newGame(expandDeck(SAMPLE_DECKS[0]), expandDeck(SAMPLE_DECKS[1]), 42);
    const b = newGame(expandDeck(SAMPLE_DECKS[0]), expandDeck(SAMPLE_DECKS[1]), 42);
    expect(a.players[0].zones.hand.map((i) => a.cards[i].cardId)).toEqual(b.players[0].zones.hand.map((i) => b.cards[i].cardId));
  });

  it('JSON にして戻しても同じ状態（保存・復元）', () => {
    const s = newGame();
    const restored = JSON.parse(JSON.stringify(s)) as GameState;
    expect(restored).toEqual(s);
    const s2 = act(restored, { type: 'CHARGE_MANA', player: 0, iid: restored.players[0].zones.hand[0] });
    expect(s2.players[0].zones.mana).toHaveLength(1);
  });
});

describe('ターン進行', () => {
  it('マナチャージは1ターン1回、ターン終了で相手がドロー', () => {
    let s = newGame();
    const [h0, h1] = s.players[0].zones.hand;
    s = act(s, { type: 'CHARGE_MANA', player: 0, iid: h0 });
    expect(applyAction(s, { type: 'CHARGE_MANA', player: 0, iid: h1 }, reg).error).toBeTruthy();
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.activePlayer).toBe(1);
    expect(s.turn).toBe(2);
    expect(s.players[1].zones.hand).toHaveLength(6);
    expect(s.phase).toBe('charge');
  });

  it('相手のターンには行動できない', () => {
    const s = newGame();
    expect(applyAction(s, { type: 'END_TURN', player: 1 }, reg).error).toBeTruthy();
  });

  it('ターン開始時に自分のカードをアンタップする', () => {
    let s = newGame();
    const m = put(s, 0, 'S01-041', 'mana', { tapped: true });
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.cards[m].tapped).toBe(false);
  });

  it('フェイズ順序は設定で変えられる', () => {
    const s = createGame({ players: [{ name: 'A', deck: filler('S01-043') }, { name: 'B', deck: filler('S01-043') }], seed: 3, firstPlayer: 0, config: { phaseOrder: ['start', 'draw', 'main', 'attack', 'end'] } }, reg);
    expect(s.phase).toBe('main');
  });
});

describe('召喚・呪文', () => {
  it('文明とコストが足りれば召喚でき、マナがタップされる', () => {
    let s = newGame();
    const card = put(s, 0, 'S01-041', 'hand'); // 自然2コスト（出た時マナ+1）
    put(s, 0, 'S01-043', 'mana');
    expect(applyAction(s, { type: 'PLAY_CARD', player: 0, iid: card }, reg).error).toMatch(/マナが足りません/);
    put(s, 0, 'S01-031', 'mana'); // 火
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: card });
    expect(s.cards[card].zone).toBe('battle');
    expect(s.players[0].zones.mana).toHaveLength(3); // 誘発でマナ+1
    expect(s.players[0].zones.mana.filter((m) => s.cards[m].tapped)).toHaveLength(2);
  });

  it('文明が合わないと使えない', () => {
    const s = newGame();
    const card = put(s, 0, 'S01-031', 'hand'); // 火1コスト
    put(s, 0, 'S01-043', 'mana');
    expect(applyAction(s, { type: 'PLAY_CARD', player: 0, iid: card }, reg).error).toMatch(/マナが足りません/);
  });

  it('多色カードはタップしてマナに置かれる', () => {
    let s = newGame();
    const card = put(s, 0, 'S01-051', 'hand');
    s = act(s, { type: 'CHARGE_MANA', player: 0, iid: card });
    expect(s.cards[card].tapped).toBe(true);
  });

  it('対象選択の効果は入力待ちで中断し、応答で再開する', () => {
    let s = newGame();
    const spell = put(s, 0, 'S01-003', 'hand'); // 光3：2体までタップ
    for (let i = 0; i < 3; i++) put(s, 0, 'S01-001', 'mana');
    const e1 = put(s, 1, 'S01-043', 'battle');
    const e2 = put(s, 1, 'S01-043', 'battle');
    put(s, 1, 'S01-043', 'battle');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: spell });
    expect(s.pending?.kind).toBe('selectCards');
    expect(applyAction(s, { type: 'END_TURN', player: 0 }, reg).error).toBeTruthy();
    expect(applyAction(s, { type: 'RESPOND', player: 1, selected: [e1] }, reg).error).toBeTruthy();
    s = act(s, { type: 'RESPOND', player: 0, selected: [e1, e2] });
    expect(s.cards[e1].tapped && s.cards[e2].tapped).toBe(true);
    expect(s.cards[spell].zone).toBe('graveyard');
    expect(s.pending).toBeNull();
  });

  it('任意効果は確認してから実行する', () => {
    let s = newGame();
    const c = put(s, 0, 'S01-011', 'hand');
    put(s, 0, 'S01-012', 'mana');
    put(s, 0, 'S01-012', 'mana');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.pending?.kind).toBe('confirm');
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.players[0].zones.hand.length).toBe(hand); // 1枚出して1枚引いた
  });

  it('進化：進化元の上に重なり、すぐ攻撃でき、破壊時は一緒に墓地へ', () => {
    let s = newGame();
    const base = put(s, 0, 'S01-031', 'battle', { sick: true });
    const evo = put(s, 0, 'S01-036', 'hand');
    for (let i = 0; i < 4; i++) put(s, 0, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: evo });
    expect(s.cards[evo].under).toEqual([base]);
    expect(s.players[0].zones.battle).toEqual([evo]);
    expect(getLegalActions(s, reg, 0).some((a) => a.type === 'ATTACK' && a.attacker === evo)).toBe(true);
    const r = applyAction(s, { type: 'MANUAL_MOVE', player: 0, iid: evo, to: 'graveyard' }, reg);
    checkInvariants(r.state);
    expect(r.state.players[0].zones.graveyard).toEqual(expect.arrayContaining([evo, base]));
  });
});

describe('攻撃', () => {
  it('召喚酔いのクリーチャーは攻撃できない（スピードアタッカーは可）', () => {
    const s = newGame();
    const a = put(s, 0, 'S01-043', 'battle', { sick: true });
    const b = put(s, 0, 'S01-031', 'battle', { sick: true });
    const atk = getLegalActions(s, reg, 0).filter((x) => x.type === 'ATTACK').map((x) => (x as { attacker: string }).attacker);
    expect(atk).not.toContain(a);
    expect(atk).toContain(b);
  });

  it('W・ブレイカーはシールドを2枚ブレイクし、手札に加わる', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-043', 'battle');
    const hand = s.players[1].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind).toBe('selectCards');
    s = act(s, { type: 'RESPOND', player: 0, selected: s.players[1].zones.shield.slice(0, 2) });
    expect(s.players[1].zones.shield).toHaveLength(3);
    expect(s.players[1].zones.hand.length).toBe(hand + 2);
    expect(s.cards[a].tapped).toBe(true);
  });

  it('シールド0枚でダイレクトアタックすると勝利', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-031', 'battle');
    for (const sh of [...s.players[1].zones.shield]) new Ctx(s, reg).moveCard(sh, 'graveyard');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.winner).toBe(0);
    expect(applyAction(s, { type: 'END_TURN', player: 0 }, reg).error).toBeTruthy();
  });

  it('S・トリガーを使うと無償で唱えられる', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-031', 'battle');
    for (const sh of [...s.players[1].zones.shield]) new Ctx(s, reg).moveCard(sh, 'graveyard');
    put(s, 1, 'S01-022', 'shield'); // 闇：S・トリガー 破壊
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[a].zone).toBe('graveyard');
    expect(s.winner).toBeNull();
  });

  it('ブロッカーでブロックするとバトルになり、パワーの低い方が破壊される', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-032', 'battle'); // 3000 + パワーアタッカー2000
    const b = put(s, 1, 'S01-002', 'battle'); // 5000 ブロッカー
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'block', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [b] });
    // 5000 vs 5000 → 相打ち
    expect(s.cards[a].zone).toBe('graveyard');
    expect(s.cards[b].zone).toBe('graveyard');
    expect(s.players[1].zones.shield).toHaveLength(5);
  });

  it('タップされたクリーチャーだけを攻撃でき、スレイヤーは相打ちにする', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-021', 'battle'); // 1000 スレイヤー
    const untapped = put(s, 1, 'S01-043', 'battle');
    const tapped = put(s, 1, 'S01-043', 'battle', { tapped: true });
    const targets = getLegalActions(s, reg, 0).filter((x) => x.type === 'ATTACK').map((x) => (x as { target: { kind: string; iid?: string } }).target.iid);
    expect(targets).toContain(tapped);
    expect(targets).not.toContain(untapped);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: tapped } });
    expect(s.cards[a].zone).toBe('graveyard');
    expect(s.cards[tapped].zone).toBe('graveyard');
  });

  it('破壊時の誘発能力が働く', () => {
    let s = newGame();
    const g = put(s, 1, 'S01-023', 'battle', { tapped: true }); // 破壊時：墓地のクリーチャー回収（任意）
    const a = put(s, 0, 'S01-043', 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: g } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[g].zone).toBe('hand'); // 自分自身を回収できる
  });
});

describe('勝敗', () => {
  it('山札が0枚になったら敗北', () => {
    let s = newGame();
    for (const d of [...s.players[1].zones.deck].slice(1)) new Ctx(s, reg).moveCard(d, 'graveyard');
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.winner).toBe(0);
    expect(s.gameOverReason).toBe('山札切れ');
  });

  it('投了', () => {
    const s = act(newGame(), { type: 'CONCEDE', player: 0 });
    expect(s.winner).toBe(1);
  });
});

describe('手動処理', () => {
  it('手動移動はログに残り、ゾーン整合性が保たれる', () => {
    let s = newGame();
    const h = s.players[0].zones.hand[0];
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: h, to: 'shield' });
    expect(s.players[0].zones.shield).toHaveLength(6);
    expect(s.log.at(-1)?.manual).toBe(true);
  });

  it('未対応の効果は自動処理せず要手動処理としてログに出す', () => {
    let s = newGame();
    const sp = put(s, 0, 'S02-020', 'hand');
    for (let i = 0; i < 3; i++) put(s, 0, 'S01-012', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.log.some((l) => l.text.includes('要手動処理'))).toBe(true);
    expect(s.activePlayer).toBe(0);
  });
});

describe('CPU', () => {
  function playOut(level0: Difficulty, level1: Difficulty, seed: number) {
    let s = createGame({ players: [{ name: 'A', deck: expandDeck(SAMPLE_DECKS[0]), isCpu: true }, { name: 'B', deck: expandDeck(SAMPLE_DECKS[1]), isCpu: true }], seed }, reg);
    let rng = seed;
    const rand = () => {
      const [v, n] = nextRandom(rng);
      rng = n;
      return v;
    };
    let steps = 0;
    while (s.gameOverReason === null && steps < 5000) {
      const who: PlayerId = s.pending ? s.pending.player : s.activePlayer;
      const a = chooseAction(s, reg, who, who === 0 ? level0 : level1, rand);
      expect(a, `no action at step ${steps}`).not.toBeNull();
      const r = applyAction(s, a!, reg);
      expect(r.error, JSON.stringify(a)).toBeUndefined();
      s = r.state;
      steps++;
    }
    checkInvariants(s);
    return s;
  }

  it.each([1, 2, 3, 4, 5])('CPU同士の対戦が合法手だけで決着する (seed %i)', (seed) => {
    const s = playOut('normal', 'hard', seed);
    expect(s.gameOverReason).not.toBeNull();
  });

  it.each([11, 12, 13])('EASY 同士でも決着する (seed %i)', (seed) => {
    const s = playOut('easy', 'easy', seed);
    expect(s.gameOverReason).not.toBeNull();
  });
});
