// 手札を見て「N枚まで」選んで捨てさせる、各プレイヤーのカードをすべて山札に戻す、「**」や補足説明の後に続く能力語の行
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
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
    faces: [{ ...base, name: id, race: o.race ?? 'テスト', civilization: o.civ ?? '闇', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities }],
  });

const RESET = '各プレイヤーは、バトルゾーン、手札、シールドゾーン、墓地にある自身のカードをすべて山札に加えてシャッフルする。';
const C = {
  vanilla: mk('r-1', [], { power: '5000' }),
  peek: mk('r-2', ['このクリーチャーがバトルゾーンに出た時、相手の手札を見て３枚まで選び、捨てさせる。', 'W・ブレイカー']),
  reset: mk('r-3', [RESET], { type: '呪文', power: '' }),
  d2: mk('r-4', [
    '自分のターンの終わりに、カードを１枚引いてもよい。（他のD２フィールドがバトルゾーンに出た時、このD２フィールドを自分の墓地に置く）**Dスイッチ：相手のクリーチャーが自分を攻撃する時、このD２フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、水のコスト７以下の呪文を１枚、自分の手札からコストを支払わずに唱えてもよい。',
  ], { type: 'D2フィールド', power: '', civ: '水' }),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const play = (s: GameState, cardId: string, cost = 1) => {
  const iid = put(s, 0, cardId, 'hand');
  for (let i = 0; i < cost; i++) put(s, 0, C.vanilla.id, 'mana');
  return act(s, { type: 'PLAY_CARD', player: 0, iid });
};

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「**」や補足説明の後の能力語は別の行として読む', () => {
    expect(C.d2.abilities?.map((a) => a.when)).toEqual(['onTurnEnd', 'onOtherAttackPlayer']);
    const joined = parseAbilityText('自分のターンの終わりに、カードを１枚引いてもよい。（補足）Dスイッチ：相手のクリーチャーが自分を攻撃する時、このD２フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、カードを１枚引く。', 'creature');
    expect(joined.manualLines).toEqual([]);
    expect(joined.abilities).toHaveLength(2);
  });
});

describe('効果', () => {
  it('相手の手札を見て3枚まで選んで捨てさせる（0〜3枚）', () => {
    let s = newGame();
    const hand = [...s.players[1].zones.hand];
    s = play(s, C.peek.id);
    for (let i = 0; i < 4 && s.pending; i++) {
      if (s.pending.kind === 'selectCards') {
        expect(s.pending).toMatchObject({ min: 0, max: 3 });
        s = act(s, { type: 'RESPOND', player: 0, selected: hand.slice(0, 2) });
      } else s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true });
    }
    expect(s.players[1].zones.graveyard).toEqual(expect.arrayContaining(hand.slice(0, 2)));
    expect(s.players[1].zones.hand).toHaveLength(hand.length - 2);
  });
  it('各プレイヤーのバトルゾーン・手札・シールド・墓地のカードをすべて山札に戻してシャッフルする', () => {
    let s = newGame();
    put(s, 0, C.vanilla.id, 'battle');
    put(s, 1, C.vanilla.id, 'battle');
    put(s, 1, C.vanilla.id, 'graveyard');
    const total = (p: PlayerId) => Object.values(s.cards).filter((c) => c.owner === p).length;
    s = play(s, C.reset.id);
    for (let i = 0; i < 4 && s.pending; i++) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true });
    for (const p of [0, 1] as PlayerId[]) {
      const z = s.players[p].zones;
      expect([z.battle, z.hand, z.shield].map((x) => x.length)).toEqual([0, 0, 0]);
      // 唱えた呪文は最後に墓地へ。マナゾーンはそのまま
      expect(z.graveyard.length).toBe(p === 0 ? 1 : 0);
      expect(z.deck.length + z.graveyard.length + z.mana.length).toBe(total(p));
    }
  });
});
