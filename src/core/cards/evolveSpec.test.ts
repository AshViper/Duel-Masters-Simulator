// 進化の種類（マナ進化・墓地進化・進化V/GV・デッキ進化・シールド進化・究極進化・スター進化）のテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { getLegalActions } from '../engine/legal';
import { canPlay, evolutionBases, evolveSourceCandidates } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });
const evo = (id: string, line: string, type = '進化クリーチャー') => mk(id, [line], { type, power: '6000' });

const C = {
  vanilla: mk('e-1', []),
  dark: mk('e-2', [], { civ: '闇' }),
  spell: mk('e-3', ['カードを１枚引く。'], { type: '呪文', power: '' }),
  basicEvo: evo('e-4', '進化：火のクリーチャー１体の上に置く。'),
  mana: evo('e-10', 'マナ進化：自分のマナゾーンにある、火または自然のクリーチャー１体の上に重ねつつ出す。'),
  v: evo('e-11', '進化V：テスト２体の上に置く。'),
  graveGv: evo('e-12', '墓地進化GV：クリーチャーを３体自分の墓地から選び、このクリーチャーをその上に重ねつつ出す。'),
  deck: evo('e-13', 'デッキ進化：自分の山札の上から１枚目を表向きにする。そのカードがクリーチャーなら、このクリーチャーをその上に重ねつつバトルゾーンに出す。クリーチャー以外なら、このクリーチャーを自分の手札に戻す。'),
  shield: evo('e-14', 'シールド進化：自分のシールドを１つ選び、このクリーチャーをその上に重ねつつバトルゾーンに出す。（裏向きのカードは裏向きのまま、見ないで置く）'),
  ultimate: evo('e-15', '究極進化：進化クリーチャー１体の上に置く。'),
  star: evo('e-16', 'スター進化：デモニオ、闇、または自然の、クリーチャー１体の上に置く。（このクリーチャーが離れる時、かわりに一番上のカードが離れる）', 'スター進化クリーチャー'),
  handV: evo('e-17', '手札進化V - 火のクリーチャーを２体自分の手札から選び、このクリーチャーをその上に重ねつつバトルゾーンに出す。'),
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
const play = (iid: string, evolveFrom?: string[]): Action => ({ type: 'PLAY_CARD', player: 0, iid, ...(evolveFrom ? { evolveFrom } : {}) });

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('進化元の指定：どのゾーンから・何枚・どんなカード', () => {
    expect(C.mana.evolveSpec).toEqual({ zones: ['mana'], filter: { civilizations: ['fire', 'nature'], cardType: 'creature' }, count: 1 });
    expect(C.v.evolveSpec).toEqual({ zones: ['battle'], filter: { race: 'テスト' }, count: 2 });
    expect(C.graveGv.evolveSpec).toEqual({ zones: ['graveyard'], filter: { cardType: 'creature' }, count: 3 });
    expect(C.deck.evolveSpec?.deckTop).toEqual({ count: 1, creatureOnly: true });
    expect(C.shield.evolveSpec).toEqual({ zones: ['shield'], count: 1 });
    expect(C.star.evolveSpec?.filter).toEqual({ anyOf: [{ race: 'デモニオ' }, { civilization: 'darkness' }, { civilization: 'nature' }] });
    expect(C.star.replacements).toEqual([{ event: 'leaveBattle', subject: 'self', instead: 'shedTop' }]);
  });
});

describe('エンジンで動く', () => {
  it('マナ進化：マナゾーンのクリーチャーを進化元にして出す', () => {
    let s = newGame();
    const e = put(s, 0, C.mana.id, 'hand');
    const m1 = put(s, 0, C.vanilla.id, 'mana');
    put(s, 0, C.dark.id, 'mana');
    expect(evolveSourceCandidates(s, reg, 0, e)).toEqual([m1]);
    expect(canPlay(s, reg, 0, e)).toBe(true);
    s = act(s, play(e, [m1]));
    expect(s.cards[e].zone).toBe('battle');
    expect(s.cards[e].under).toEqual([m1]);
    expect(s.players[0].zones.mana).not.toContain(m1);
  });

  it('進化V：バトルゾーンの2体を重ねる。1体だけでは出せない', () => {
    let s = newGame();
    const e = put(s, 0, C.v.id, 'hand');
    const a = put(s, 0, C.vanilla.id, 'battle');
    put(s, 0, C.vanilla.id, 'mana');
    expect(canPlay(s, reg, 0, e)).toBe(false);
    const b = put(s, 0, C.dark.id, 'battle');
    expect(applyAction(s, play(e, [a]), reg).error).toBeTruthy();
    s = act(s, play(e, [a, b]));
    expect(s.cards[e].under).toEqual([a, b]);
    expect(s.players[0].zones.battle).toEqual([e]);
  });

  it('墓地進化GV：墓地のクリーチャー3体を進化元にする（CPU 用の合法手にも進化元が入る）', () => {
    let s = newGame();
    const e = put(s, 0, C.graveGv.id, 'hand');
    const g = [C.vanilla.id, C.dark.id, C.vanilla.id].map((id) => put(s, 0, id, 'graveyard'));
    put(s, 0, C.spell.id, 'graveyard');
    put(s, 0, C.vanilla.id, 'mana');
    const legal = getLegalActions(s, reg, 0).find((x) => x.type === 'PLAY_CARD' && x.iid === e);
    expect(legal).toMatchObject({ evolveFrom: g });
    s = act(s, legal!);
    expect(s.cards[e].under).toEqual(g);
    expect(s.players[0].zones.graveyard.filter((x) => g.includes(x))).toEqual([]);
  });

  it('手札進化V：手札のクリーチャー2体を進化元にする（自分自身は進化元にできない）', () => {
    let s = newGame();
    for (const h of [...s.players[0].zones.hand]) new Ctx(s, reg).moveCard(h, 'deck');
    const e = put(s, 0, C.handV.id, 'hand');
    const h1 = put(s, 0, C.vanilla.id, 'hand');
    const h2 = put(s, 0, C.vanilla.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    expect(evolveSourceCandidates(s, reg, 0, e)).toEqual([h1, h2]);
    s = act(s, play(e));
    expect(s.cards[e].under).toEqual([h1, h2]);
    expect(s.players[0].zones.hand).toEqual([]);
  });

  it('デッキ進化：山札の上がクリーチャーなら重ねて出し、そうでなければ手札に残る', () => {
    let s = newGame();
    const top = put(s, 0, C.vanilla.id, 'deck');
    const e = put(s, 0, C.deck.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, play(e));
    expect(s.cards[e].under).toEqual([top]);

    let s2 = newGame();
    put(s2, 0, C.spell.id, 'deck');
    const e2 = put(s2, 0, C.deck.id, 'hand');
    put(s2, 0, C.vanilla.id, 'mana');
    s2 = act(s2, play(e2));
    expect(s2.cards[e2].zone).toBe('hand');
  });

  it('シールド進化：シールドを1つ進化元にする', () => {
    let s = newGame();
    const e = put(s, 0, C.shield.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const sh = s.players[0].zones.shield[0];
    const n = s.players[0].zones.shield.length;
    s = act(s, play(e, [sh]));
    expect(s.cards[e].under).toEqual([sh]);
    expect(s.players[0].zones.shield.length).toBe(n - 1);
  });

  it('究極進化：進化クリーチャーだけを進化元にできる', () => {
    const s = newGame();
    const e = put(s, 0, C.ultimate.id, 'hand');
    put(s, 0, C.vanilla.id, 'battle');
    expect(evolutionBases(s, reg, 0, e)).toEqual([]);
    const ev = put(s, 0, C.basicEvo.id, 'battle');
    expect(evolutionBases(s, reg, 0, e)).toEqual([ev]);
  });

  it('スター進化：離れる時、かわりに一番上のカードだけが離れ、進化元が残る', () => {
    let s = newGame();
    const b = put(s, 0, C.dark.id, 'battle');
    const e = put(s, 0, C.star.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    expect(evolutionBases(s, reg, 0, e)).toEqual([b]);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: e, evolveOn: b });
    expect(s.cards[e].under).toEqual([b]);
    s.queue.push({ kind: 'leave', iid: e, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[e].zone).toBe('graveyard');
    expect(s.players[0].zones.battle).toEqual([b]);
    expect(s.cards[b].under).toEqual([]);
  });
});
