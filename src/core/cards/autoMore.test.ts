// 手動処理だった能力を自動にした分のテスト（条件つきで「〜」を得る、ハンティング、すべてのバトルに勝つ、パワーを0にするなど）
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

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({
  ...base,
  name,
  race: o.race ?? 'テスト',
  civilization: o.civ ?? '火',
  type: o.type ?? 'クリーチャー',
  power: o.power ?? '3000',
  cost: o.cost ?? '1',
  abilities,
});
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });

const C = {
  fireSa: mk('a-1', ['バトルゾーンに自分の他の火のクリーチャーがあれば、このクリーチャーは「スピードアタッカー」を得る。']),
  manaBuff: mk('a-2', ['自分のマナゾーンに火のカードが３枚以上あれば、このクリーチャーのパワーは+4000され、「W・ブレイカー」を得る。']),
  hunter: mk('a-3', ['ハンティング(バトル中、このクリーチャーのパワーは、バトルゾーンにある自分のハンター１体につき+1000される)'], { race: 'ヒューマノイド/ハンター', power: '3000' }),
  winner: mk('a-4', ['このクリーチャーはすべてのバトルに勝つ。'], { power: '1000' }),
  battleBuff: mk('a-5', ['バトル中、このクリーチャーのパワーを+4000する。'], { power: '2000' }),
  zero: mk('a-6', ['相手のクリーチャーを１体選ぶ。このターン、そのクリーチャーのパワーを０にする。（パワーが０以下のクリーチャーは破壊される）'], { type: '呪文', power: '' }),
  big: mk('a-7', [], { power: '5000' }),
  raceCost: mk('a-8', ['自分のマフィ・ギャングを召喚するコストを１少なくする。ただし、コストは０以下にならない。']),
  mafia: mk('a-9', [], { race: 'マフィ・ギャング', cost: '4', civ: '闇' }),
  knight: mk('a-10', ['自分の他のナイトに「スピードアタッカー」を与える。'], { race: 'ナイト' }),
  knight2: mk('a-11', [], { race: 'ナイト' }),
  reveal: mk('a-12', ['自分の山札の上から１枚目を表向きにする。そのカードが呪文であれば、自分の手札に加える。それ以外のカードであれば、自分の墓地に置く。'], { type: '呪文', power: '' }),
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

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('種族の召喚コスト軽減は「N以下にならない」を下限にする', () => {
    expect(parseAbilityText('自分のビートジョッキーを召喚するコストを１少なくする。ただしコストは１以下にならない。', 'creature').statics).toEqual([
      { type: 'costMod', amount: -1, appliesTo: { owner: 'self', filter: { race: 'ビートジョッキー', cardType: 'creature' } }, minCost: 2 },
    ]);
  });
  it('自分の水のハンターは攻撃されない', () => {
    expect(parseAbilityText('自分の水のハンターは攻撃されない。', 'creature').statics[0]).toMatchObject({ type: 'grantKeyword', keywords: { cannotBeAttacked: true } });
  });
});

describe('エンジンで動く', () => {
  it('「他の」火のクリーチャーがいる時だけ「スピードアタッカー」を得る（自分自身は数えない）', () => {
    const s = newGame();
    const a = put(s, 0, C.fireSa.id, 'battle');
    expect(keywords(s, reg, a).speedAttacker).toBeFalsy();
    put(s, 0, C.big.id, 'battle');
    expect(keywords(s, reg, a).speedAttacker).toBe(true);
  });

  it('マナの条件でパワーと「W・ブレイカー」を得る', () => {
    const s = newGame();
    const a = put(s, 0, C.manaBuff.id, 'battle');
    expect(power(s, reg, a)).toBe(3000);
    for (let i = 0; i < 3; i++) put(s, 0, C.big.id, 'mana');
    expect(power(s, reg, a)).toBe(7000);
    expect(keywords(s, reg, a).breaker).toBe(2);
  });

  it('ハンティング：バトル中だけ自分のハンター1体につき+1000（ハンター2体で 3000+2000 → 5000 と相打ち）', () => {
    let s = newGame();
    const h = put(s, 0, C.hunter.id, 'battle', true);
    put(s, 0, C.hunter.id, 'battle');
    const d = put(s, 1, C.big.id, 'battle');
    s.cards[d].tapped = true;
    expect(power(s, reg, h)).toBe(3000);
    s = act(s, { type: 'ATTACK', player: 0, attacker: h, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.cards[h].zone).toBe('graveyard');
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('すべてのバトルに勝つ：パワー1000でも5000に勝つ', () => {
    let s = newGame();
    const w = put(s, 0, C.winner.id, 'battle', true);
    const d = put(s, 1, C.big.id, 'battle');
    s.cards[d].tapped = true;
    s = act(s, { type: 'ATTACK', player: 0, attacker: w, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.cards[w].zone).toBe('battle');
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('バトル中のパワー修正：2000+4000 で 5000 に勝つ', () => {
    let s = newGame();
    const b = put(s, 0, C.battleBuff.id, 'battle', true);
    const d = put(s, 1, C.big.id, 'battle');
    s.cards[d].tapped = true;
    expect(power(s, reg, b)).toBe(2000);
    s = act(s, { type: 'ATTACK', player: 0, attacker: b, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.cards[b].zone).toBe('battle');
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('パワーを0にする：選んだクリーチャーは破壊される', () => {
    let s = newGame();
    const d = put(s, 1, C.big.id, 'battle');
    const sp = put(s, 0, C.zero.id, 'hand');
    for (let i = 0; i < 2; i++) put(s, 0, C.big.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [d] });
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('種族の召喚コスト軽減', () => {
    const s = newGame();
    const m = put(s, 0, C.mafia.id, 'hand');
    expect(effectiveCost(s, reg, 0, m)).toBe(4);
    put(s, 0, C.raceCost.id, 'battle');
    expect(effectiveCost(s, reg, 0, m)).toBe(3);
  });

  it('「すべて」のない「自分の他のナイトに〜を与える」', () => {
    const s = newGame();
    const k = put(s, 0, C.knight.id, 'battle');
    const k2 = put(s, 0, C.knight2.id, 'battle');
    expect(keywords(s, reg, k2).speedAttacker).toBe(true);
    expect(keywords(s, reg, k).speedAttacker).toBeFalsy();
  });

  it('「そのカードが呪文であれば手札、それ以外は墓地」', () => {
    let s = newGame();
    const top = put(s, 0, C.big.id, 'deck');
    const sp = put(s, 0, C.reveal.id, 'hand');
    put(s, 0, C.big.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[top].zone).toBe('graveyard');
  });
});
