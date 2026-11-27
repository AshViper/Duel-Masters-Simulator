// 例文8：捨てたカード以下のコスト・次に召喚するクリーチャーの軽減・各プレイヤーのマナ枚数以上・「AすべてとBをすべて」・そうしなければ・手札を捨てて唱える
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { effectiveCost } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, name: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '光', type: o.type ?? 'クリーチャー', power: o.power ?? '1000', cost: o.cost ?? '1', abilities }] } as never);

const C = {
  disc: mk('s8-1', 'すてやき', ['自分の手札を１枚捨てる。こうして捨てた手札以下のコストを持つ相手のエレメントを１つ選び、破壊する。'], { type: '呪文', cost: '2' }),
  nsd: mk('s8-2', 'けいげん', ['このターン、次に召喚する自分のクリーチャーの召喚コストを１少なくしてもよい。ただし、コストは１より少なくならない。そのクリーチャーをバトルゾーンに出した時、このターンの終わりまでそのクリーチャーは「スピードアタッカー」を得る。'], { type: '呪文' }),
  modes: mk('s8-3', 'えらぶ', ['次のうちいずれか１つを選ぶ。', '▶相手のクリーチャーを３体まで選んでタップする。', '▶カードを３枚引く。', '▶このターン、次に召喚する自分のクリーチャーのコストを最大３少なくする。ただし、コストは０以下にはならない。このターン、そのクリーチャーに「スピードアタッカー」を与える。'], { type: '呪文' }),
  mass: mk('s8-4', 'したへ', ['各プレイヤーは、自身のマナゾーンにあるカードの枚数以上のコストを持つクリーチャーをすべて、好きな順序で自身の山札の一番下に置く。', 'マナゾーンに置く時、このカードはタップして置く。'], { type: '呪文' }),
  cast: mk('s8-5', 'ほうおう', ['このクリーチャーがバトルゾーンに出た時、光のコスト５以下の呪文を１枚、コストを支払わずに自分の手札から唱えてもよい。そうしなければ、カードを１枚引く。'], { cost: '7' }),
  snow: mk('s8-6', 'ゆき', ['コストを支払うかわりに、自分の手札からスノーフェアリーを５体捨て、この呪文を唱えてもよい。', '相手のクリーチャーすべてと、相手のマナゾーンにあるカードをすべてタップする。次の相手のターンのはじめに、それらはアンタップしない。'], { type: '呪文', cost: '9', civ: '自然' }),
  fairy: mk('s8-7', 'ようせい', [], { race: 'スノーフェアリー', civ: '自然' }),
  big: mk('s8-8', 'おおもの', [], { cost: '5', power: '5000' }),
  small: mk('s8-9', 'こもの', [], { cost: '1' }),
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
/** 確認はすべて accept（引数で変えられる）、選択は先頭から */
function settle(s: GameState, accept = true, pick?: (c: string[]) => string[]): GameState {
  for (let i = 0; i < 20 && s.pending; i++) {
    const p = s.pending as { kind: string; player: PlayerId; candidates?: string[]; max?: number; min?: number };
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: pick ? pick(p.candidates ?? []) : (p.candidates ?? []).slice(0, Math.max(p.min ?? 1, 1)) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: ['0'] });
    else s = act(s, { type: 'RESPOND', player: p.player, accept });
  }
  return s;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const mana = (s: GameState, p: PlayerId, n: number, civ = C.small.id) => {
  for (let i = 0; i < n; i++) s.cards[put(s, p, civ, 'mana')].tapped = false;
};

describe('例文8の読み取り', () => {
  it('すべて自動の効果になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
});

describe('例文8の動作', () => {
  it('捨てた手札のコスト以下の相手のクリーチャーだけ破壊できる', () => {
    let s = newGame();
    const d = put(s, 0, C.disc.id, 'hand');
    const toss = put(s, 0, C.small.id, 'hand');
    // 手札は捨てる1枚だけにする
    s.players[0].zones.hand = [d, toss];
    const big = put(s, 1, C.big.id, 'battle');
    const sm = put(s, 1, C.small.id, 'battle');
    mana(s, 0, 2);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: d }));
    expect(s.cards[toss].zone).toBe('graveyard');
    expect(s.cards[sm].zone).toBe('graveyard');
    expect(s.cards[big].zone).toBe('battle');
  });
  it('次に召喚するクリーチャーだけコストが下がり、スピードアタッカーを得る', () => {
    let s = newGame();
    const sp = put(s, 0, C.nsd.id, 'hand');
    const b = put(s, 0, C.big.id, 'hand');
    mana(s, 0, 5);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: sp }));
    expect(effectiveCost(s, reg, 0, b)).toBe(4);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: b }));
    expect(s.cards[b].zone).toBe('battle');
    expect(s.cards[b].keywordsTurn?.speedAttacker).toBe(true);
    expect(s.players[0].nextSummonDiscount).toBeUndefined();
  });
  it('マナの枚数以上のコストのクリーチャーは、持ち主ごとに山札の下へ', () => {
    let s = newGame();
    const sp = put(s, 0, C.mass.id, 'hand');
    mana(s, 0, 3);
    mana(s, 1, 6);
    const mine = put(s, 0, C.big.id, 'battle'); // 5 >= 3 → 下へ
    const theirs = put(s, 1, C.big.id, 'battle'); // 5 < 6 → 残る
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: sp }));
    expect(s.cards[mine].zone).toBe('deck');
    expect(s.cards[theirs].zone).toBe('battle');
  });
  it('出た時に唱えなければ、かわりにカードを1枚引く', () => {
    let s = newGame();
    const c = put(s, 0, C.cast.id, 'hand');
    mana(s, 0, 7);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    const before = s.players[0].zones.hand.length;
    s = settle(s, false);
    expect(s.players[0].zones.hand.length).toBe(before + 1);
  });
  it('スノーフェアリー5体を捨てて唱え、相手のクリーチャーとマナをタップしたままにする', () => {
    let s = newGame();
    const sp = put(s, 0, C.snow.id, 'hand');
    const fairies = Array.from({ length: 5 }, () => put(s, 0, C.fairy.id, 'hand'));
    const oc = put(s, 1, C.small.id, 'battle');
    mana(s, 1, 2);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: sp, alt: 0 }), true, (c) => c.slice(0, 5));
    for (const f of fairies) expect(s.cards[f].zone).toBe('graveyard');
    expect(s.cards[oc].tapped).toBe(true);
    expect(s.players[1].zones.mana.every((m) => s.cards[m].tapped)).toBe(true);
    s = settle(act(s, { type: 'END_TURN', player: 0 } as Action));
    expect(s.activePlayer).toBe(1);
    expect(s.cards[oc].tapped).toBe(true);
    expect(s.players[1].zones.mana.every((m) => s.cards[m].tapped)).toBe(true);
  });
});
