// 超魂X・超魂レイド・サイキック・クリーチャー（超次元ゾーン・覚醒リンク・リンク解除）のテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { def, keywords, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { validateDeck, DEFAULT_FORMAT } from '../deck/rules';
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

const SUPER = face('絶対合体 スーパーX', ['T・ブレイカー', 'リンク解除(このクリーチャーがバトルゾーンを離れる時、そのサイキック・セルのいずれか１枚を選んで超次元ゾーンに戻し、残りのカードを裏返す)', '※覚醒リンクするために必要なカード(セルA/セルB/セルC)'], {
  type: 'サイキック・スーパー・クリーチャー',
  power: '17000',
  cost: '30',
});
const cell = (id: string, abilities: string[]) =>
  convertOfficialCard({ id, detailUrl: '', faces: [face(id === 'p-a' ? 'セルA' : id === 'p-b' ? 'セルB ＜1＞' : 'セルC', abilities, { type: 'サイキック・クリーチャー', cost: '5', power: '5000' }), SUPER] });

const C = {
  soul: mk('s-1', ['このクリーチャーが出た時、カードを１枚引く。', '超魂X（これがクリーチャーの下にあれば、そのクリーチャーにも以下の能力を与える）', 'スピードアタッカー'], { cost: '2' }),
  top: mk('s-2', [], { power: '6000' }),
  raid: mk('s-3', ['NEO進化：火のクリーチャー１体の上に置いてもよい。', '超魂レイド（このクリーチャーが出た時、山札の上から３枚を表向きにする。その中からこのクリーチャーの進化元になれるカードを１枚、この下に置いてもよい。残りを好きな順序で山札の下に置く）'], { type: 'NEOクリーチャー', cost: '1' }),
  water: mk('s-4', [], { civ: '水' }),
  a: cell('p-a', ['覚醒(サイキック)リンク - 自分のターンのはじめに、バトルゾーンに自分の《セルB》と《セルC》があれば、そのクリーチャーとこのクリーチャーを裏返しリンクさせる。(ゲーム開始時、サイキック・クリーチャーは山札には含めず、自身の超次元ゾーンに置き、バトルゾーン以外のゾーンに行った場合、そこに戻す)']),
  b: cell('p-b', ['W・ブレイカー']),
  c: cell('p-c', ['ブロッカー']),
  hyperSpell: mk('s-5', ['コスト５以下のサイキック・クリーチャーを１体、自分の超次元ゾーンから出す。'], { type: '呪文', power: '', cost: '1' }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  s.cards[iid].enteredTurn = 0;
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const newGame = (deck0 = filler) => createGame({ players: [{ name: 'A', deck: deck0 }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('超魂X より後の能力は、下にある時に与える能力', () => {
    expect(C.soul.soul).toEqual({ keywords: { speedAttacker: true } });
    expect(C.soul.keywords).toEqual({ speedAttacker: true });
  });
  it('サイキック・クリーチャーの裏面と覚醒リンクの条件', () => {
    expect(C.a.twin).toBeUndefined();
    expect(C.a.psychic?.back).toMatchObject({ name: '絶対合体 スーパーX', power: 17000, keywords: { breaker: 3 } });
    expect(C.a.psychic?.link).toEqual({ names: ['セルB', 'セルC'], timing: 'turnStart' });
    expect(C.b.psychic?.link).toBeUndefined();
  });
  it('コストの合計がN以下になるように', () => {
    expect(parseAbilityText('コストの合計が９以下になるように、相手のクリーチャーを２体まで選び、破壊する。', 'spell').abilities[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 2, upTo: true, maxTotalCost: 9 } },
    ]);
  });
});

describe('超魂X・超魂レイド', () => {
  it('超魂X のカードが下にあるクリーチャーは、その能力を得る', () => {
    const s = newGame();
    const t = put(s, 0, C.top.id, 'battle');
    expect(keywords(s, reg, t).speedAttacker).toBeFalsy();
    const u = put(s, 0, C.soul.id, 'battle');
    s.players[0].zones.battle.splice(s.players[0].zones.battle.indexOf(u), 1);
    s.cards[t].under = [u];
    expect(keywords(s, reg, t).speedAttacker).toBe(true);
  });

  it('超魂レイド：山札の上3枚から進化元になれるカードを1枚下に置き、残りは山札の下へ', () => {
    let s = newGame();
    const w = put(s, 0, C.water.id, 'deck');
    const f = put(s, 0, C.top.id, 'deck');
    // 山札の一番上（配列の最後）に置く
    for (const x of [w, f]) {
      const d = s.players[0].zones.deck;
      d.splice(d.indexOf(x), 1);
      d.push(x);
    }
    const raid = put(s, 0, C.raid.id, 'hand');
    put(s, 0, C.top.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: raid });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [f] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [f] });
    expect(s.cards[raid].under).toEqual([f]);
    expect(s.cards[f].zone).toBe('battle');
    // 残り（水のカードを含む2枚）は山札の下
    expect(s.players[0].zones.deck[0]).not.toBe(f);
    expect(s.players[0].zones.deck.slice(0, 2)).toContain(w);
  });
});

describe('サイキック・クリーチャー', () => {
  it('サイキック・クリーチャーは山札に入れず超次元ゾーンに置く。デッキの40枚にも数えない', () => {
    const deck = [...filler, C.a.id, C.b.id, C.c.id];
    const s = newGame(deck);
    expect(s.players[0].zones.hyperspatial).toHaveLength(3);
    expect(s.players[0].zones.deck.every((i) => !reg[s.cards[i].cardId].psychic)).toBe(true);
    const sizeErrors = (cards: Record<string, number>) =>
      validateDeck({ cards }, { ...DEFAULT_FORMAT, maxCopies: 99 }, reg).filter((i) => i.level === 'error').map((i) => i.message);
    expect(sizeErrors({ 'S01-043': 40, [C.a.id]: 1, [C.b.id]: 1, [C.c.id]: 1 })).toEqual([]);
    expect(sizeErrors({ 'S01-043': 40, [C.a.id]: 9 })).toEqual(['超次元ゾーンのカードは8枚までです（現在9枚）']);
  });

  it('超次元呪文で出し、バトルゾーンを離れると超次元ゾーンに戻る', () => {
    let s = newGame([...filler, C.b.id]);
    const sp = put(s, 0, C.hyperSpell.id, 'hand');
    put(s, 0, C.top.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    const b = s.players[0].zones.battle.find((i) => s.cards[i].cardId === C.b.id)!;
    expect(b).toBeDefined();
    new Ctx(s, reg).moveCard(b, 'graveyard');
    expect(s.cards[b].zone).toBe('hyperspatial');
  });

  it('手動で墓地へ移しても、ログには実際の行き先（超次元ゾーン）を書く', () => {
    let s = newGame();
    const b = put(s, 0, C.b.id, 'battle');
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: b, to: 'graveyard' });
    expect(s.cards[b].zone).toBe('hyperspatial');
    expect(s.log[s.log.length - 1].text).toBe('［手動］セルB ＜1＞ を バトルゾーン → 超次元ゾーン に移動（墓地のかわりに）');
  });

  it('覚醒リンク：自分のターンのはじめにそろっていればリンクし、リンク解除で1枚だけ超次元ゾーンに戻る', () => {
    let s = newGame();
    const a = put(s, 0, C.a.id, 'battle');
    const b = put(s, 0, C.b.id, 'battle');
    const c = put(s, 0, C.c.id, 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.activePlayer).toBe(0);
    expect(s.players[0].zones.battle).toEqual([a]);
    expect(s.cards[a]).toMatchObject({ flipped: true, links: [b, c] });
    expect(def(s, reg, a).name).toBe('絶対合体 スーパーX');
    expect(power(s, reg, a)).toBe(17000);
    expect(keywords(s, reg, a).breaker).toBe(3);

    // 破壊される → リンク解除：選んだセル（B）だけ超次元ゾーンへ、残りは表に戻ってバトルゾーンに残る
    s.queue.push({ kind: 'leave', iid: a, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [a, b, c], min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [b] });
    expect(s.cards[b].zone).toBe('hyperspatial');
    expect(s.players[0].zones.battle.sort()).toEqual([a, c].sort());
    expect(s.cards[a].flipped).toBeFalsy();
    expect(def(s, reg, a).name).toBe('セルA');
  });
});
