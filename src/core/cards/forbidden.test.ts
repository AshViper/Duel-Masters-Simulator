// 禁断の鼓動（禁断 ～封印されしX～ / 伝説の禁断 ドキンダムX）と封印の処理のテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { battleCards, canAttackWith, def, isIgnored, keywords, power, targetCandidates } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { chooseAction } from '../ai/cpu';
import { nextRandom } from '../engine/rng';
import { applyParsedEffects, convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

// 公式カード検索の詳細（dmr19-fl01）と同じ内容
const KINDAN = convertOfficialCard({
  id: 'dmr19-fl01',
  detailUrl: '',
  faces: [
    {
      name: '禁断 ～封印されしX～', packName: '(DMR19 FL1/FL1)', imageUrl: '', type: '禁断の鼓動', civilization: '火', rarity: '', power: '', cost: '', mana: '-', race: '', illustrator: '', flavor: '',
      abilities: [
        'この鼓動は、ゲーム開始時、封印を６つ付けてバトルゾーンに置く。',
        'この鼓動はバトルゾーンを離れない。',
        '禁断解放-この鼓動の封印がすべてなくなった時、クリーチャー側に裏返す。（カードを封印するには、自分の山札の上から１枚目を裏向きのままそのカードの上に置く。コマンドがバトルゾーンに出た時、その持ち主はそのコマンドと同じ文明を持つ自身のカードから封印をひとつ、墓地に置く。クリーチャーが封印されている間、両プレイヤーはそのクリーチャーを無視する）',
      ],
    },
    {
      name: '伝説の禁断 ドキンダムX', packName: '(DMR19 FL1/FL1)', imageUrl: '', type: '禁断クリーチャー', civilization: '火', rarity: '', power: '99999', cost: '99', mana: '-', race: '', illustrator: '', flavor: '',
      abilities: [
        'T・ブレイカー',
        'このクリーチャーが禁断解放した時、相手は自身のクリーチャーすべてに封印をひとつ付ける。',
        'コスト４以下の呪文によって、相手がクリーチャーを選ぶ時、このクリーチャーは選べない。',
        'このカードがバトルゾーン以外のゾーンにあれば、自分はゲームに負ける。',
      ],
    },
  ],
});

const base = { packName: '(T 1/1)', imageUrl: '', civilization: '火', rarity: 'C', mana: '1', illustrator: '', flavor: '', cost: '1' };
const mk = (id: string, name: string, abilities: string[], o: { type?: string; power?: string; race?: string; cost?: string; civ?: string } = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', race: o.race ?? 'テスト', cost: o.cost ?? '1', abilities }] });
const C = {
  command: mk('k-1', '火のコマンド', [], { race: 'ドラゴン・コマンド', power: '5000' }),
  calmCommand: mk('k-5', '攻撃しないコマンド', ['このクリーチャーは攻撃できない。'], { race: 'コマンド', power: '1000' }),
  waterCommand: mk('k-2', '水のコマンド', [], { race: 'コマンド', civ: '水' }),
  plain: mk('k-3', 'ふつう', [], { power: '2000' }),
  cheapKill: mk('k-4', '安い除去', ['相手のクリーチャーを1体選び、破壊する。'], { type: '呪文', power: '', cost: '3' }),
};
const reg = buildRegistry([...SAMPLE_CARDS, KINDAN, ...Object.values(C)]);
const filler = Array.from({ length: 39 }, () => 'S01-043');

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName, ready = false): string {
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
const newGame = () => createGame({ players: [{ name: 'A', deck: [KINDAN.id, ...filler] }, { name: 'B', deck: [...filler, 'S01-043'] }], seed: 7, firstPlayer: 0 }, reg);
const kodou = (s: GameState) => s.players[0].zones.battle.find((i) => s.cards[i].cardId === KINDAN.id)!;
/** 封印を n 個残して外す */
function leaveSeals(s: GameState, n: number): void {
  const k = kodou(s);
  const ctx = new Ctx(s, reg);
  while ((s.cards[k].seals?.length ?? 0) > n) ctx.moveCard(s.cards[k].seals![0], 'graveyard');
}

describe('禁断の鼓動の読み取り', () => {
  it('鼓動の面と禁断クリーチャーの面を読み、全部自動になる', () => {
    expect(KINDAN.twin).toBeUndefined();
    expect(KINDAN.forbidden?.seals).toBe(6);
    const x = KINDAN.forbidden!.creature;
    expect(x).toMatchObject({ name: '伝説の禁断 ドキンダムX', power: 99999, keywords: { breaker: 3, untargetableBySpellCost: 4, loseIfNotInBattle: true } });
    expect(x.abilities).toEqual([{ when: 'onUnleash', effects: [{ type: 'seal', target: { owner: 'opponent', zone: 'battle', count: 'all' } }] }]);
    expect(KINDAN.support).toBe('full');
  });

  it('以前の版でツインパクトとして保存したカードを直す', () => {
    const old = { ...KINDAN, forbidden: undefined, twin: { name: '伝説の禁断 ドキンダムX', cost: 99, civilizations: ['fire' as const], text: KINDAN.forbidden!.creature.text } };
    const fixed = applyParsedEffects(old);
    expect(fixed.twin).toBeUndefined();
    expect(fixed.forbidden?.seals).toBe(6);
    expect(fixed.forbidden?.creature.keywords?.breaker).toBe(3);
  });
});

describe('禁断の鼓動の処理', () => {
  it('ゲーム開始時に封印6つを付けてバトルゾーンに置き、山札は 40-1-6-5-5 枚', () => {
    const s = newGame();
    const k = kodou(s);
    expect(s.cards[k].seals).toHaveLength(6);
    expect(s.players[0].zones.seal).toHaveLength(6);
    expect(s.players[0].zones.shield).toHaveLength(5);
    expect(s.players[0].zones.deck).toHaveLength(40 - 1 - 6 - 5 - 5);
    // 鼓動はクリーチャーとして扱わない
    expect(isIgnored(s, reg, k)).toBe(true);
    expect(battleCards(s, reg, 0)).toEqual([]);
    expect(canAttackWith(s, reg, 0, k)).toBe(false);
  });

  it('火のコマンドが出ると封印が1つ外れ、水のコマンドでは外れない', () => {
    let s = newGame();
    const k = kodou(s);
    const water = put(s, 0, C.waterCommand.id, 'hand');
    const fire = put(s, 0, C.command.id, 'hand');
    put(s, 0, 'S01-012', 'mana'); // 水のマナ（フィクスチャの水のカード）
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: water });
    expect(s.cards[k].seals).toHaveLength(6);
    put(s, 0, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: fire });
    expect(s.cards[k].seals).toHaveLength(5);
    expect(s.players[0].zones.graveyard).toHaveLength(1);
  });

  it('封印がすべてなくなると禁断解放し、相手のクリーチャーすべてを封印する', () => {
    let s = newGame();
    const k = kodou(s);
    const opp1 = put(s, 1, C.plain.id, 'battle', true);
    const opp2 = put(s, 1, C.plain.id, 'battle', true);
    leaveSeals(s, 1);
    const fire = put(s, 0, C.command.id, 'hand');
    put(s, 0, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: fire });
    expect(s.cards[k].flipped).toBe(true);
    expect(s.cards[k].seals).toBeUndefined();
    expect(def(s, reg, k).name).toBe('伝説の禁断 ドキンダムX');
    expect(power(s, reg, k)).toBe(99999);
    expect(keywords(s, reg, k).breaker).toBe(3);
    // 相手のクリーチャーは封印され、無視される
    expect(s.cards[opp1].seals).toHaveLength(1);
    expect(s.cards[opp2].seals).toHaveLength(1);
    expect(battleCards(s, reg, 1)).toEqual([]);
    // ゲーム開始時からバトルゾーンにあるので、すぐ攻撃できる
    expect(canAttackWith(s, reg, 0, k)).toBe(true);
    expect(s.log.some((l) => l.text.includes('禁断解放'))).toBe(true);
  });

  it('古い版で保存した（パワーが分からない）ドキンダムXでも、禁断解放した途端に破壊されて負けにはならない', () => {
    const stale = { ...KINDAN, id: 'stale-kindan', forbidden: { ...KINDAN.forbidden!, creature: { ...KINDAN.forbidden!.creature, power: undefined } } };
    const reg2 = buildRegistry([...SAMPLE_CARDS, stale, ...Object.values(C)]);
    let s = createGame({ players: [{ name: 'A', deck: [stale.id, ...filler] }, { name: 'B', deck: [...filler, 'S01-043'] }], seed: 7, firstPlayer: 0 }, reg2);
    const k = s.players[0].zones.battle[0];
    const ctx = new Ctx(s, reg2);
    while ((s.cards[k].seals?.length ?? 0) > 1) ctx.moveCard(s.cards[k].seals![0], 'graveyard');
    const fire = put(s, 0, C.command.id, 'hand');
    put(s, 0, 'S01-031', 'mana');
    const r = applyAction(s, { type: 'PLAY_CARD', player: 0, iid: fire }, reg2);
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.cards[k].flipped).toBe(true);
    expect(s.cards[k].zone).toBe('battle');
    expect(s.gameOverReason).toBeNull();
  });

  it('コスト4以下の呪文では選べず、ドキンダムXがバトルゾーンを離れると負ける', () => {
    let s = newGame();
    const k = kodou(s);
    leaveSeals(s, 0);
    expect(s.cards[k].flipped).toBe(true);
    s.activePlayer = 1;
    expect(targetCandidates(s, reg, 1, { owner: 'opponent', zone: 'battle', count: 1 })).toEqual([k]);
    const spell = put(s, 1, C.cheapKill.id, 'hand');
    for (let i = 0; i < 3; i++) put(s, 1, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 1, iid: spell });
    expect(s.cards[k].zone).toBe('battle');
    // 手動で墓地に置くと負け
    s.activePlayer = 0;
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: k, to: 'graveyard' });
    expect(s.winner).toBe(1);
  });

  it('封印されたクリーチャーは、その持ち主のコマンドで封印が外れて元に戻る', () => {
    let s = newGame();
    const victim = put(s, 1, C.plain.id, 'battle', true);
    new Ctx(s, reg).sealCard(victim);
    expect(isIgnored(s, reg, victim)).toBe(true);
    s.activePlayer = 1;
    s.phase = 'main';
    const cmd = put(s, 1, C.command.id, 'hand');
    put(s, 1, 'S01-031', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 1, iid: cmd });
    expect(s.cards[victim].seals).toBeUndefined();
    expect(isIgnored(s, reg, victim)).toBe(false);
  });
});

describe('禁断入りデッキの CPU 対戦', () => {
  it.each([1, 2, 3])('合法手だけで決着し、カードの枚数が合う (seed %i)', (seed) => {
    const deckA = [KINDAN.id, ...Array.from({ length: 39 }, () => C.calmCommand.id)];
    const deckB = Array.from({ length: 40 }, () => 'S01-043');
    let s = createGame({ players: [{ name: 'A', deck: deckA, isCpu: true }, { name: 'B', deck: deckB, isCpu: true }], seed, firstPlayer: 0 }, reg);
    let rng = seed;
    const rand = () => {
      const [v, n] = nextRandom(rng);
      rng = n;
      return v;
    };
    let unleashed = false;
    for (let steps = 0; s.gameOverReason === null && steps < 5000; steps++) {
      const who: PlayerId = s.pending ? s.pending.player : s.activePlayer;
      const a = chooseAction(s, reg, who, 'normal', rand);
      expect(a).not.toBeNull();
      const r = applyAction(s, a!, reg);
      expect(r.error, JSON.stringify(a)).toBeUndefined();
      s = r.state;
      if (s.cards[kodou(s)]?.flipped) unleashed = true;
      for (const p of [0, 1] as PlayerId[]) {
        const n = Object.values(s.players[p].zones).reduce((sum, z) => sum + z.length, 0);
        expect(n).toBe(40);
      }
    }
    expect(s.gameOverReason).not.toBeNull();
    expect(unleashed).toBe(true);
  });
});
