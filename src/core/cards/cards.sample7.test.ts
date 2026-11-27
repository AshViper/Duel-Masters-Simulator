// 例文7：ターンの残りをとばす・手札からマナゾーンに置いた時・超次元ゾーンから出す・パンドラ・シフト・攻撃の後に手札から出す
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, name: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities }] });

const C = {
  skip: mk('s7-1', 'スキップ', ['このクリーチャーをバトルゾーンに出した時、ターンの残りをとばす。（次のプレイヤーのターンをすぐに始める）'], { cost: '0' }),
  seed: mk('s7-2', 'タマ', ['このタマシードを自分の手札からマナゾーンに置いた時、アンタップする。'], { type: 'タマシード', power: '', cost: '2' }),
  dig: mk('s7-3', 'ほり', ['このクリーチャーが出た時、自分の手札を１枚捨て、カードを３枚まで引き、もう一度自分の手札を１枚捨てる。'], { cost: '0' }),
  hyper: mk('s7-4', 'ハイパー', ['このクリーチャーが出た時または自分の超次元ゾーンに置かれた時、カードを２枚引く。その後、自分の手札を１枚捨てる。', 'このクリーチャーを自分の超次元ゾーンから召喚してもよい。'], { cost: '0', civ: '水' }),
  pandora: mk('s7-5', 'パンドラ', ['パンドラ・シフト：（このカードを使うコストの代わりに、 [wf02]を支払ってもよい。そうしたら、このカードを自分の超次元ゾーンに置く。'], { civ: '水/火', cost: '5' }),
  hand: mk('s7-6', '手札出し', ['自分のクリーチャーが攻撃する時、このクリーチャーが自分の手札にあり、その攻撃がこのターン２度目のクリーチャーによる攻撃で、このターン自分の《龍装者 バルチュリス》をバトルゾーンに出していなければ、攻撃の後、このクリーチャーをバトルゾーンに出してもよい。'], { cost: '9' }),
  small: mk('s7-7', 'こもの', [], { power: '1000' }),
  water: mk('s7-8', 'みず', [], { civ: '水/火' }),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const mana = (s: GameState, p: PlayerId, n: number) => {
  for (let i = 0; i < n; i++) s.cards[put(s, p, C.water.id, 'mana')].tapped = false;
};

describe('例文7の読み取り', () => {
  it('すべて自動の効果になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「《名》ではない」は名前の指定になる', () => {
    const r = parseAbilityText('自分のターンのはじめに、このクリーチャーを自分の超次元ゾーンに置いてもよい。そうしたら、《再興王女プリン》ではないエイリアン・クリーチャーを１体、自分の超次元ゾーンから出す。', 'creature');
    expect(r.manualLines).toEqual([]);
  });
  it('パンドラ・シフトは別のコストで超次元ゾーンに置く使い方', () => {
    expect(C.pandora.altPlays?.[0]).toMatchObject({ name: 'パンドラ・シフト', cost: 2, toHyperspatial: true });
  });
  it('超次元ゾーンから召喚できる', () => {
    expect(C.hyper.summonFrom?.zones).toContain('hyperspatial');
  });
});

describe('例文7の動作', () => {
  it('ターンの残りをとばすと、すぐ相手のターンになる', () => {
    let s = newGame();
    const c = put(s, 0, C.skip.id, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.activePlayer).toBe(1);
  });
  it('タマシードを手札からマナゾーンに置くとアンタップして置かれる', () => {
    let s = newGame();
    const t = put(s, 0, C.seed.id, 'hand');
    s = act(s, { type: 'CHARGE_MANA', player: 0, iid: t });
    expect(s.cards[t].zone).toBe('mana');
    expect(s.cards[t].tapped).toBe(false);
  });
  it('出た時：1枚捨て、3枚まで引き、もう一度1枚捨てる', () => {
    let s = newGame();
    put(s, 0, C.small.id, 'hand');
    const d = put(s, 0, C.dig.id, 'hand');
    const before = s.players[0].zones.hand.length - 1;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: d });
    // 1回目の捨て：手札の小物
    let guard = 0;
    while (s.pending && guard++ < 10) {
      const p = s.pending as { kind: string; player: PlayerId; candidates?: string[]; max?: number };
      if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: (p.candidates ?? []).slice(0, p.max ?? 1) });
      else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: ['0'] });
      else s = act(s, { type: 'RESPOND', player: p.player, accept: true });
    }
    expect(s.players[0].zones.hand.length).toBe(before + 1);
    expect(s.players[0].zones.graveyard.length).toBe(2);
  });

  it('パンドラ・シフト：2マナを払ってカードを超次元ゾーンに置く（置かれた時の能力も誘発）', () => {
    let s = newGame();
    const p = put(s, 0, C.pandora.id, 'hand');
    mana(s, 0, 2);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: p, alt: 0 });
    expect(s.cards[p].zone).toBe('hyperspatial');
  });
  it('超次元ゾーンに置かれた時、カードを2枚引いて1枚捨てる', () => {
    let s = newGame();
    const h = put(s, 0, C.hyper.id, 'hand');
    const before = s.players[0].zones.hand.length;
    s = act(s, { type: 'MANUAL_MOVE', player: 0, iid: h, to: 'hyperspatial' });
    let guard = 0;
    while (s.pending && guard++ < 10) {
      const p = s.pending as { kind: string; player: PlayerId; candidates?: string[]; max?: number };
      s = act(s, p.kind === 'selectCards' ? { type: 'RESPOND', player: p.player, selected: (p.candidates ?? []).slice(0, p.max ?? 1) } : { type: 'RESPOND', player: p.player, accept: true });
    }
    expect(s.players[0].zones.hand.length).toBe(before - 1 + 2 - 1);
  });
  it('2度目の攻撃の後に、手札からバトルゾーンに出せる', () => {
    let s = newGame();
    const a = put(s, 0, C.small.id, 'battle');
    const b = put(s, 0, C.small.id, 'battle');
    const h = put(s, 0, C.hand.id, 'hand');
    s.phase = 'attack';
    const settle = (st: GameState, trace: string[]): GameState => {
      for (let i = 0; i < 12 && st.pending; i++) {
        const p = st.pending as { kind: string; player: PlayerId; candidates?: string[]; min?: number };
        trace.push(`${p.kind}:${st.cards[h].zone}:${JSON.stringify(st.pending).slice(0, 200)}`);
        st = act(st, p.kind === 'selectCards' ? { type: 'RESPOND', player: p.player, selected: (p.candidates ?? []).slice(0, 1) } : { type: 'RESPOND', player: p.player, accept: true });
      }
      return st;
    };
    const t1: string[] = [];
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }), t1);
    expect(s.cards[h].zone).toBe('hand');
    const t2: string[] = [];
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: b, target: { kind: 'player' } }), t2);
    console.log('T2', t2);
    expect(s.cards[h].zone).toBe('battle');
  });
});
