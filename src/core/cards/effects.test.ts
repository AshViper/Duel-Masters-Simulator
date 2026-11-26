// 移動系の効果を move 1つにまとめた分のテスト（旧形式の読み替え・動詞表・「このクリーチャーを〜」・エンジンでの処理）
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { asMove } from './effects';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { CardDefinition, ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
const mk = (id: string, abilities: string[], type = 'クリーチャー') =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: 'テスト', civilization: '火', type, power: type === '呪文' ? '' : '3000', cost: '1', abilities }],
  });

const C = {
  toDeckTop: mk('m-1', ['相手のクリーチャーを1体選び、持ち主の山札の上に置く。'], '呪文'),
  selfBottom: mk('m-2', ['このクリーチャーが攻撃する時、このクリーチャーを山札の下に置く。']),
  selfTapMana: mk('m-3', ['このクリーチャーが攻撃する時、このクリーチャーをタップしてマナゾーンに置く。']),
  vanilla: mk('m-4', []),
};
/** 旧形式（toMana）のまま保存されているカード */
const legacy: CardDefinition = {
  ...C.vanilla,
  id: 'legacy-1',
  name: '旧形式',
  type: 'spell',
  power: undefined,
  support: 'full',
  abilities: [{ when: 'onCast', effects: [{ type: 'toMana', target: { owner: 'opponent', zone: 'battle', count: 1 }, tapped: true }] }],
} as CardDefinition;

const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), legacy]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 3, firstPlayer: 0 }, reg);
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
const top = (s: GameState, p: PlayerId) => s.players[p].zones.deck[s.players[p].zones.deck.length - 1];

describe('move：移動系の効果を1つにまとめる', () => {
  it('旧形式の効果を move に読み替える', () => {
    const t = { owner: 'self', zone: 'graveyard', count: 1 } as const;
    expect(asMove({ type: 'graveyardToHand', target: t })).toEqual({ type: 'move', target: t, to: 'hand' });
    expect(asMove({ type: 'toMana', target: t, tapped: true })).toEqual({ type: 'move', target: t, to: 'mana', tapped: true });
    expect(asMove({ type: 'toDeckBottom', target: t })).toEqual({ type: 'move', target: t, to: 'deckBottom' });
    expect(asMove({ type: 'draw', count: 1 })).toBeNull();
  });

  it('動詞表の言い方はすべて move になる', () => {
    const p = (t: string) => parseAbilityText(t, 'spell').abilities[0]?.effects[0];
    expect(p('相手のクリーチャーを1体選び、持ち主の手札に戻す。')).toMatchObject({ type: 'move', to: 'hand', target: { zone: 'battle' } });
    expect(p('自分の墓地からカードを1枚、手札に戻す。')).toMatchObject({ type: 'move', to: 'hand', target: { zone: 'graveyard' } });
    expect(p('相手のクリーチャーを1体選び、持ち主の山札の下に置く。')).toMatchObject({ type: 'move', to: 'deckBottom' });
    expect(p('相手のクリーチャーを1体選び、タップしてマナゾーンに置く。')).toMatchObject({ type: 'move', to: 'mana', tapped: true });
  });

  it('「このクリーチャーを〜」も同じ動詞表で読む', () => {
    expect(C.selfBottom.support).toBe('full');
    expect(C.selfTapMana.support).toBe('full');
    expect(parseAbilityText('このクリーチャーが攻撃する時、このクリーチャーを山札の下に置く。', 'creature').abilities[0].effects).toEqual([{ type: 'selfAction', action: 'deckBottom' }]);
    expect(parseAbilityText('このクリーチャーが攻撃する時、このクリーチャーをタップしてマナゾーンに置く。', 'creature').abilities[0].effects).toEqual([
      { type: 'selfAction', action: 'mana', tapped: true },
    ]);
  });

  it('エンジン：バトルゾーンのクリーチャーを山札の上に置く', () => {
    let s = newGame();
    const target = put(s, 1, C.vanilla.id, 'battle');
    const sp = put(s, 0, C.toDeckTop.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('deck');
    expect(top(s, 1)).toBe(target);
  });

  it('エンジン：旧形式（toMana・タップして）のままのカードも動く', () => {
    let s = newGame();
    const target = put(s, 1, C.vanilla.id, 'battle');
    const sp = put(s, 0, legacy.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('mana');
    expect(s.cards[target].tapped).toBe(true);
  });
});
