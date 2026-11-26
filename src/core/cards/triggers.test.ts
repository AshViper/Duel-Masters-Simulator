// 誘発の出来事の表（EVENTS）とキーワードの表（KEYWORD_LINES）で増えた分のテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { attackTargets, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
const mk = (id: string, abilities: string[], type = 'クリーチャー', power = '3000') =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: 'テスト', civilization: '火', type, power: type === '呪文' ? '' : power, cost: '1', abilities }],
  });

const C = {
  tapDraw: mk('t-1', ['このクリーチャーがタップした時、カードを1枚引く。']),
  attackedDraw: mk('t-2', ['このクリーチャーが攻撃された時または相手に選ばれた時、カードを1枚引く。'], 'クリーチャー', '9000'),
  tapSpell: mk('t-3', ['相手のクリーチャーを1体選び、タップする。'], '呪文'),
  noUntap: mk('t-4', ['このクリーチャーは、自分のターンのはじめにアンタップしない。']),
  noCreatureAttack: mk('t-5', ['このクリーチャーは、クリーチャーを攻撃できない。']),
  vanilla: mk('t-6', []),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  // 召喚酔いなし（前のターンから出ていた扱い）
  s.cards[iid].enteredTurn = 0;
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const handSize = (s: GameState, p: PlayerId) => s.players[p].zones.hand.length;

describe('誘発の表', () => {
  it('「このクリーチャーまたは自分の〜が出た時」は自身と他のクリーチャーの両方で誘発する', () => {
    const p = parseAbilityText('このクリーチャーまたは自分のコスト6以上のクリーチャーが出た時、カードを1枚引く。', 'creature');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities.map((a) => a.when)).toEqual(['onSummon', 'onOtherSummon']);
    expect(p.abilities[1]).toMatchObject({ who: 'self', filter: { minCost: 6 } });
  });

  it('「自分の他のドラゴンが出た時」も同じ表で読む（種族だけの主語）', () => {
    const p = parseAbilityText('自分の他のドラゴンが出た時、カードを1枚引く。', 'creature');
    expect(p.abilities).toEqual([{ when: 'onOtherSummon', who: 'self', filter: { race: 'ドラゴン', excludeSelf: true }, effects: [{ type: 'draw', count: 1 }] }]);
  });

  it('タップした時：攻撃でタップすると誘発する', () => {
    let s = newGame();
    const a = put(s, 0, C.tapDraw.id, 'battle');
    const before = handSize(s, 0);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(handSize(s, 0)).toBeGreaterThanOrEqual(before + 1);
  });

  it('攻撃された時：攻撃されたクリーチャーの持ち主が引く', () => {
    let s = newGame();
    const a = put(s, 0, C.vanilla.id, 'battle');
    const d = put(s, 1, C.attackedDraw.id, 'battle');
    s.cards[d].tapped = true;
    const before = handSize(s, 1);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(handSize(s, 1)).toBe(before + 1);
  });

  it('相手に選ばれた時：相手の呪文で選ばれると誘発する', () => {
    let s = newGame();
    const d = put(s, 1, C.attackedDraw.id, 'battle');
    const sp = put(s, 0, C.tapSpell.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const before = handSize(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [d] });
    expect(s.cards[d].tapped).toBe(true);
    expect(handSize(s, 1)).toBe(before + 1);
  });
});

describe('キーワードの表', () => {
  it('自分のターンのはじめにアンタップしない', () => {
    let s = newGame();
    const stuck = put(s, 0, C.noUntap.id, 'battle');
    const normal = put(s, 0, C.vanilla.id, 'battle');
    expect(keywords(s, reg, stuck).noUntap).toBe(true);
    s.cards[stuck].tapped = true;
    s.cards[normal].tapped = true;
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.activePlayer).toBe(0);
    expect(s.cards[stuck].tapped).toBe(true);
    expect(s.cards[normal].tapped).toBe(false);
  });

  it('クリーチャーを攻撃できない：プレイヤーだけ攻撃できる', () => {
    const s = newGame();
    const a = put(s, 0, C.noCreatureAttack.id, 'battle');
    const d = put(s, 1, C.vanilla.id, 'battle');
    s.cards[d].tapped = true;
    expect(attackTargets(s, reg, 0, a)).toEqual([{ kind: 'player' }]);
  });
});
