// 能力テキストを部品（目的語・動詞・期間・条件・数え方・誘発）の組み合わせで読めることのテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { effectiveCost, keywords, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

const cr = (t: string) => parseAbilityText(t, 'creature');
const sp = (t: string) => parseAbilityText(t, 'spell');

describe('部品の組み合わせで読む', () => {
  it('「〜し、〜する」を2つの効果に分ける', () => {
    expect(sp('相手のクリーチャーを1体選んで破壊し、相手の手札を1枚見ないで選び、捨てさせる。').abilities[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } },
      { type: 'discardRandom', count: 1 },
    ]);
    expect(sp('相手のクリーチャーを1体選び、持ち主の手札に戻し、カードを1枚引く。').abilities[0].effects.map((e) => e.type)).toEqual(['bounce', 'draw']);
  });

  it('目的語の言い方：移動元が後ろ・「にある」・好きな数・名詞のない種族', () => {
    expect(sp('カードを2枚、自分のマナゾーンから手札に戻す。').abilities[0].effects).toEqual([{ type: 'toHand', target: { owner: 'self', zone: 'mana', count: 2 } }]);
    expect(sp('自分のマナゾーンにあるカードを好きな数、墓地に置く。').abilities[0].effects).toEqual([
      { type: 'toGraveyard', target: { owner: 'self', zone: 'mana', count: 99, upTo: true } },
    ]);
    expect(sp('自分のドラゴンを1体選び、アンタップする。').abilities[0].effects).toEqual([{ type: 'untap', target: { owner: 'self', zone: 'battle', count: 1, filter: { race: 'ドラゴン' } } }]);
    expect(sp('相手のクリーチャーを1体選び、持ち主のマナゾーンにタップして置く。').abilities[0].effects).toEqual([
      { type: 'toMana', target: { owner: 'opponent', zone: 'battle', count: 1 }, tapped: true },
    ]);
    expect(sp('自分のシールドをひとつ墓地に置いてもよい。').abilities[0]).toMatchObject({ optional: true, effects: [{ type: 'toGraveyard', target: { zone: 'shield', count: 1 } }] });
  });

  it('2文：相手のシールドを選び、相手がそれを手札に加える', () => {
    expect(cr('このクリーチャーが攻撃する時、相手のシールドをふたつ選ぶ。相手はそのシールドを自身の手札に加える。').abilities[0].effects).toEqual([
      { type: 'shieldToHand', target: { owner: 'opponent', zone: 'shield', count: 2 } },
    ]);
  });

  it('誘発：他のクリーチャーの攻撃・破壊、攻撃の終わり、各ターンに1度', () => {
    expect(cr('相手のクリーチャーが攻撃する時、カードを1枚引く。').abilities[0]).toMatchObject({ when: 'onOtherAttack', who: 'opponent' });
    expect(cr('自分の他のドラゴンが破壊された時、カードを1枚引く。').abilities[0]).toMatchObject({ when: 'onOtherDestroyed', who: 'self', filter: { race: 'ドラゴン' } });
    expect(cr('このクリーチャーの攻撃の終わりに、このクリーチャーを破壊する。').abilities[0]).toMatchObject({ when: 'onAttackEnd' });
    expect(cr('各ターンに1度、自分のクリーチャーが破壊された時、カードを1枚引く。').abilities[0]).toMatchObject({ when: 'onOtherDestroyed', oncePerTurn: true });
  });

  it('常在：「〜1枚につき」・条件つき・自分自身のコスト', () => {
    expect(cr('このクリーチャーのパワーを、自分の墓地にある呪文1枚につき+3000する。').statics).toEqual([
      { type: 'powerMod', amount: 3000, appliesTo: { owner: 'self', onlySelf: true }, perCount: { who: 'self', zone: 'graveyard', filter: { cardType: 'spell' } } },
    ]);
    expect(cr('バトルゾーンに自分のクリーチャーが2体以上なければ、このクリーチャーは攻撃できない。').statics).toEqual([
      {
        type: 'grantKeyword',
        keywords: { cannotAttack: true },
        appliesTo: { owner: 'self', onlySelf: true },
        condition: { type: 'not', condition: { type: 'compare', left: { who: 'self', zone: 'battle' }, op: '>=', right: 2 } },
      },
    ]);
    expect(cr('このクリーチャーの召喚コストを、クリーチャー1体につき1少なくする。ただしコストは2以下にならない。').selfCost).toEqual({
      amount: 1,
      per: { who: 'any', zone: 'battle' },
      unit: 1,
      min: 3,
    });
  });
});

// ───────────────────────── エンジンで動かす ─────────────────────────
const base = { packName: '(T 1/1)', imageUrl: '', civilization: '火', rarity: 'C', mana: '1', illustrator: '', flavor: '', race: 'テスト' };
const mk = (id: string, abilities: string[], power = '3000', cost = '1') => convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name: id, type: 'クリーチャー', power, cost, abilities }] });
const C = {
  spellPower: mk('c-1', ['このクリーチャーのパワーを、自分の墓地にある呪文1枚につき+3000する。']),
  lonely: mk('c-2', ['バトルゾーンに自分のクリーチャーが2体以上なければ、このクリーチャーは攻撃できない。']),
  cheap: mk('c-3', ['このクリーチャーの召喚コストを、クリーチャー1体につき1少なくする。ただしコストは2以下にならない。'], '5000', '7'),
  watcher: mk('c-4', ['各ターンに1度、相手のクリーチャーが攻撃する時、カードを1枚引く。']),
  ender: mk('c-5', ['このクリーチャーの攻撃の終わりに、このクリーチャーを破壊する。']),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 9, firstPlayer: 0 }, reg);

describe('組み合わせで読んだ効果がエンジンで動く', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });

  it('墓地の呪文の数だけパワーが上がる', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:c-1', 'battle');
    expect(power(s, reg, c)).toBe(3000);
    put(s, 0, 'S01-012', 'graveyard');
    put(s, 0, 'S01-013', 'graveyard');
    expect(power(s, reg, c)).toBe(9000);
  });

  it('条件つき：クリーチャーが2体以上いなければ攻撃できない', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:c-2', 'battle');
    expect(keywords(s, reg, c).cannotAttack).toBe(true);
    put(s, 0, 'S01-031', 'battle');
    expect(keywords(s, reg, c).cannotAttack).toBeFalsy();
  });

  it('自分自身のコスト軽減（下限つき）', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:c-3', 'hand');
    expect(effectiveCost(s, reg, 0, c)).toBe(7);
    put(s, 0, 'S01-031', 'battle');
    put(s, 1, 'S01-031', 'battle');
    expect(effectiveCost(s, reg, 0, c)).toBe(5);
    for (let i = 0; i < 6; i++) put(s, 1, 'S01-031', 'battle');
    expect(effectiveCost(s, reg, 0, c)).toBe(3);
  });

  it('相手のクリーチャーが攻撃する時（各ターンに1度）・攻撃の終わりに', () => {
    let s = newGame();
    put(s, 1, 'dm:c-4', 'battle');
    const a = put(s, 0, 'S01-043', 'battle', true);
    const b = put(s, 0, 'S01-043', 'battle', true);
    const e = put(s, 0, 'dm:c-5', 'battle', true);
    const hand = s.players[1].zones.hand.length;
    // ゴルムは W・ブレイカーなので、シールドを2つ選ぶ
    const breakFirst = () => {
      if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: s.players[1].zones.shield.slice(0, s.pending.min) });
    };
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    breakFirst();
    s = act(s, { type: 'ATTACK', player: 0, attacker: b, target: { kind: 'player' } });
    breakFirst();
    // 1度目の攻撃でだけ1枚引く（2回の攻撃のブレイクで4枚増える）
    expect(s.players[1].zones.hand).toHaveLength(hand + 1 + 4);
    s = act(s, { type: 'ATTACK', player: 0, attacker: e, target: { kind: 'player' } });
    breakFirst();
    expect(s.cards[e].zone).toBe('graveyard');
  });
});
