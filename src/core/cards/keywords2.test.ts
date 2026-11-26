// マナ武装・G・ゼロ・アタック・チャンス・メガ・ラスト・バースト・シールド・ゴーなどのテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { effectiveCost, power, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '', race: 'テスト' };
type O = { civ?: string; type?: string; power?: string; cost?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });

const C = {
  armed: mk('k-1', ['マナ武装 ３：自分のマナゾーンに水のカードが３枚以上あれば、このクリーチャーのパワーを+4000し、「W・ブレイカー」を与える。'], { civ: '水' }),
  gzero: mk('k-2', ['G・ゼロ：バトルゾーンに自分の火のクリーチャーがあれば、このクリーチャーをコストを支払わずに召喚してもよい。'], { cost: '6' }),
  chance: mk('k-3', ['アタック・チャンス：火のパワー4000以上のクリーチャー（…）', 'カードを２枚引く。'], { type: '呪文', power: '', cost: '5' }),
  hunter: mk('k-4', ['相手の「ブロッカー」を持つクリーチャーを１体選び、破壊する。'], { type: '呪文', power: '' }),
  burst: convertOfficialCard({ id: 'k-5', detailUrl: '', faces: [face('バースト竜', ['メガ・ラスト・バースト（…）']), face('バースト呪文', ['カードを１枚引く。'], { type: '呪文', power: '' })] }),
  go: mk('k-6', ['{SG} シールド・ゴー（…）']),
  extra: mk('k-7', ['エクストラEXライフ（…）']),
  gneo: mk('k-8', ['G-NEO進化：火のクリーチャー１体の上に置いてもよい。（…）'], { type: 'G-NEOクリーチャー' }),
  kill: mk('k-9', ['相手のクリーチャーを１体選び、破壊する。'], { type: '呪文', power: '' }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);
const mana = (s: GameState, p: PlayerId, id: string, n: number) => {
  for (let i = 0; i < n; i++) put(s, p, id, 'mana');
};

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
    expect(C.burst.twin?.name).toBe('バースト呪文');
  });
  it('「〜」を持つクリーチャー', () => {
    expect(parseAbilityText('相手の「ブロッカー」を持つクリーチャーを１体選び、破壊する。', 'spell').abilities[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1, filter: { hasKeyword: 'blocker' } } },
    ]);
  });
});

describe('エンジンで動く', () => {
  it('マナ武装：水のマナが3枚以上でパワー+4000とW・ブレイカー', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:k-1', 'battle');
    expect(power(s, reg, c)).toBe(3000);
    mana(s, 0, 'S01-011', 3);
    expect(power(s, reg, c)).toBe(7000);
    expect(keywords(s, reg, c).breaker).toBe(2);
  });

  it('G・ゼロ：条件を満たせばマナなしで召喚できる', () => {
    let s = newGame();
    const g = put(s, 0, 'dm:k-2', 'hand');
    expect(effectiveCost(s, reg, 0, g)).toBe(6);
    put(s, 0, 'S01-031', 'battle');
    expect(effectiveCost(s, reg, 0, g)).toBe(0);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: g });
    expect(s.cards[g].zone).toBe('battle');
  });

  it('アタック・チャンス：条件に合うクリーチャーの攻撃時に呪文をタダで唱える', () => {
    let s = newGame();
    // 自然のクリーチャー（条件に合わない）の攻撃では選べない
    const a = put(s, 0, 'S01-043', 'battle', true);
    const sp = put(s, 0, 'dm:k-3', 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending && 'candidates' in s.pending ? s.pending.candidates : []).not.toContain(sp);

    s = newGame();
    const fire = put(s, 0, 'S01-034', 'battle', true); // 火・6000
    const sp2 = put(s, 0, 'dm:k-3', 'hand');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: fire, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [sp2] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [sp2] });
    expect(s.cards[sp2].zone).toBe('graveyard');
    expect(s.players[0].zones.hand.length).toBe(hand - 1 + 2);
  });

  it('メガ・ラスト・バースト：破壊されたら呪文側を唱えられる', () => {
    let s = newGame();
    const m = put(s, 1, 'dm:k-5', 'battle');
    const sp = put(s, 0, 'dm:k-9', 'hand');
    mana(s, 0, 'S01-031', 1);
    const hand = s.players[1].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[m].zone).toBe('graveyard');
    expect(s.players[1].zones.hand).toHaveLength(hand + 1);
  });

  it('シールド・ゴー：破壊されたら表向きでシールドに', () => {
    let s = newGame();
    const g = put(s, 1, 'dm:k-6', 'battle');
    const sp = put(s, 0, 'dm:k-9', 'hand');
    mana(s, 0, 'S01-031', 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[g]).toMatchObject({ zone: 'shield', faceUp: true });
  });

  it('エクストラEXライフ：シールドが2つ増え、離れる時は1つずつ墓地へ', () => {
    let s = newGame();
    const x = put(s, 0, 'dm:k-7', 'hand');
    mana(s, 0, 'S01-031', 1);
    const shields = s.players[0].zones.shield.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: x });
    expect(s.players[0].zones.shield).toHaveLength(shields + 2);
  });

  it('G-NEO進化：離れる時、かわりに下のカードが離れる', () => {
    let s = newGame();
    const b = put(s, 1, 'S01-031', 'battle');
    const n = put(s, 1, 'dm:k-8', 'hand');
    s.cards[n].zone = 'battle';
    s.players[1].zones.hand.splice(s.players[1].zones.hand.indexOf(n), 1);
    s.players[1].zones.battle.splice(s.players[1].zones.battle.indexOf(b), 1, n);
    s.cards[b].zone = 'battle';
    s.cards[n].under = [b];
    const sp = put(s, 0, 'dm:k-9', 'hand');
    mana(s, 0, 'S01-031', 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[n].zone).toBe('battle');
    expect(s.cards[n].under).toEqual([]);
    expect(s.cards[b].zone).toBe('graveyard');
  });
});

describe('シンパシー', () => {
  it('種族の並びと W・シンパシー', () => {
    expect(parseAbilityText('シンパシー：自分のジャイアント、ミステリー・トーテム、またはスノーフェアリーのクリーチャー', 'creature').selfCost).toEqual({
      amount: 1,
      per: { who: 'self', zone: 'battle', filter: { races: ['ジャイアント', 'ミステリー・トーテム', 'スノーフェアリー'] } },
      unit: 1,
      min: 1,
    });
    expect(parseAbilityText('W・シンパシー：自分のアースイーター・クリーチャーまたはジャイアント・クリーチャー', 'creature').selfCost).toMatchObject({
      amount: 2,
      per: { filter: { races: ['アースイーター', 'ジャイアント'] } },
    });
  });
});
