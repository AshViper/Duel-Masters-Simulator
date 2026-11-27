// 例文9：バトルに勝った時マナゾーンから召喚・3枚表向きで全部同じコストなら出す・攻撃の終わりに山札を見て出す／シールド化／マナ・
// ファイナル革命（パワーが小さい相手をマナへ）・残りを山札の上か下へ・クリーチャーがなければ軽減・「〜時、または〜時」の2つの誘発
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
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '自然', type: o.type ?? 'クリーチャー', power: o.power ?? '1000', cost: o.cost ?? '1', abilities }] } as never);

const C = {
  win: mk('s9-1', 'かったら', ['このクリーチャーがバトルに勝った時、自分のマナゾーンの数以下のコストを持つハンター・クリーチャーを１体、自分のマナゾーンからコストを支払わずに召喚してもよい。'], { power: '14000', cost: '10', race: 'ジャイアント/ハンター' }),
  gacha: mk('s9-2', 'ガチャ', ['自分のクリーチャーがなければ、このクリーチャーの召喚コストを３少なくする。', 'このクリーチャーが攻撃する時、自分の山札の上から３枚を表向きにする。それがすべて同じコストのクリーチャーなら出す。そうでなければ、好きな順序で山札の下に置く。'], { civ: '火', cost: '8', power: '5000' }),
  axe: mk('s9-3', 'おの', ['このクリーチャーの攻撃の終わりに、自分の山札の上から３枚を見る。その中から、エレメントを最大１つ出し、１枚をシールド化し、残りをマナゾーンに置く。', 'ファイナル革命：このクリーチャーが「革命チェンジ」によって出た時、そのターンに他の「ファイナル革命」を使っていなければ、このクリーチャーよりパワーが小さい相手のクリーチャーをすべて持ち主のマナゾーンに置く。'], { power: '22500', cost: '10' }),
  look2: mk('s9-4', 'みる', ['山札の上から２枚を見る。そのうちの１枚をマナゾーンに置き、残りを山札の上または下に置く。'], { type: '呪文', cost: '3' }),
  watch: mk('s9-5', 'みはり', ['相手のクリーチャーがバトルゾーンに出た時、または相手が呪文を唱えた時、ターンの残りをとばしてもよい。'], { civ: '水', cost: '10', power: '12000' }),
  hunter3: mk('s9-6', 'かりうど', [], { cost: '3', race: 'ハンター' }),
  hunter9: mk('s9-7', 'おおかりうど', [], { cost: '9', race: 'ハンター' }),
  small: mk('s9-8', 'こもの', [], { cost: '2', power: '2000' }),
  mid: mk('s9-9', 'ちゅうもの', [], { cost: '4', power: '4000' }),
  spell: mk('s9-10', 'じゅもん', [], { type: '呪文', cost: '1' }),
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
/** 山札の一番上に置く（後に渡したものほど上） */
function onTop(s: GameState, player: PlayerId, cardId: string): string {
  const iid = put(s, player, cardId, 'deck');
  const deck = s.players[player].zones.deck;
  deck.splice(deck.indexOf(iid), 1);
  deck.push(iid);
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
/** 確認はすべて accept（引数で変えられる）、選択は先頭から（pick で変えられる） */
function settle(s: GameState, accept = true, pick?: (c: string[], prompt: string) => string[]): GameState {
  for (let i = 0; i < 20 && s.pending; i++) {
    const p = s.pending as { kind: string; player: PlayerId; candidates?: string[]; max?: number; min?: number; prompt?: string };
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: pick ? pick(p.candidates ?? [], p.prompt ?? '') : (p.candidates ?? []).slice(0, Math.max(p.min ?? 1, 1)) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: ['0'] });
    else s = act(s, { type: 'RESPOND', player: p.player, accept });
  }
  return s;
}
function runTask(s: GameState, task: GameState['queue'][number]): GameState {
  s.queue.push(task);
  new Ctx(s, reg).run();
  return s;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const mana = (s: GameState, p: PlayerId, n: number, id = C.small.id) => {
  for (let i = 0; i < n; i++) s.cards[put(s, p, id, 'mana')].tapped = false;
};

describe('例文9の読み取り', () => {
  it('すべて自動の効果になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「〜時、または〜時」は同じ本文の誘発2つになる', () => {
    expect(C.watch.abilities?.map((a) => [a.when, a.who])).toEqual([
      ['onOtherSummon', 'opponent'],
      ['onSpellCast', 'opponent'],
    ]);
  });
});

describe('例文9の動作', () => {
  it('バトルに勝った時、マナの枚数以下のコストのハンターをマナゾーンから召喚する', () => {
    let s = newGame();
    const w = put(s, 0, C.win.id, 'battle');
    const h3 = put(s, 0, C.hunter3.id, 'mana');
    const h9 = put(s, 0, C.hunter9.id, 'mana');
    mana(s, 0, 2); // マナは4枚 → コスト4以下のハンターだけ
    const foe = put(s, 1, C.small.id, 'battle');
    s.cards[foe].tapped = true;
    s.phase = 'attack';
    let seen: string[] = [];
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: w, target: { kind: 'creature', iid: foe } }), true, (c) => ((seen = c), c.slice(0, 1)));
    expect(s.cards[foe].zone).toBe('graveyard');
    expect(seen).toEqual([h3]);
    expect(s.cards[h3].zone).toBe('battle');
    expect(s.cards[h9].zone).toBe('mana');
  });

  it('自分のクリーチャーがいなければ召喚コストが3少なくなる', () => {
    const s = newGame();
    const g = put(s, 0, C.gacha.id, 'hand');
    expect(effectiveCost(s, reg, 0, g)).toBe(5);
    put(s, 0, C.small.id, 'battle');
    expect(effectiveCost(s, reg, 0, g)).toBe(8);
  });

  it('攻撃する時、表向きの3枚がすべて同じコストのクリーチャーなら全部出す', () => {
    let s = newGame();
    const g = put(s, 0, C.gacha.id, 'battle');
    const tops = [onTop(s, 0, C.small.id), onTop(s, 0, C.small.id), onTop(s, 0, C.small.id)];
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: g, target: { kind: 'player' } }), false);
    for (const t of tops) expect(s.cards[t].zone).toBe('battle');
  });

  it('同じコストでなければ、3枚とも山札の下へ', () => {
    let s = newGame();
    const g = put(s, 0, C.gacha.id, 'battle');
    const tops = [onTop(s, 0, C.small.id), onTop(s, 0, C.mid.id), onTop(s, 0, C.small.id)];
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: g, target: { kind: 'player' } }), false);
    const deck = s.players[0].zones.deck;
    for (const t of tops) {
      expect(s.cards[t].zone).toBe('deck');
      expect(deck.indexOf(t)).toBeLessThan(3);
    }
  });

  it('攻撃の終わりに、3枚からエレメントを1つ出し、1枚をシールド化し、残りをマナへ', () => {
    let s = newGame();
    const a = put(s, 0, C.axe.id, 'battle');
    const sp = onTop(s, 0, C.spell.id);
    const m1 = onTop(s, 0, C.mid.id);
    const cr = onTop(s, 0, C.small.id);
    const foe = put(s, 1, C.small.id, 'battle');
    s.cards[foe].tapped = true;
    const shields = s.players[0].zones.shield.length;
    s.phase = 'attack';
    // 出すのは こもの、シールド化は じゅもん（呪文は出せない）
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: foe } }), true, (c, prompt) => {
      if (prompt.includes('バトルゾーン')) {
        expect(c).not.toContain(sp);
        return [cr];
      }
      return [sp];
    });
    expect(s.cards[cr].zone).toBe('battle');
    expect(s.cards[sp].zone).toBe('shield');
    expect(s.cards[m1].zone).toBe('mana');
    expect(s.players[0].zones.shield.length).toBe(shields + 1);
  });

  it('ファイナル革命：革命チェンジで出た時、パワーが小さい相手のクリーチャーをすべてマナへ（各ターン1回）', () => {
    let s = newGame();
    const small = put(s, 1, C.small.id, 'battle');
    const big = put(s, 1, C.win.id, 'battle'); // 14000 < 22500 もマナへ
    s = runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.axe.id, 'hand') });
    s = settle(s);
    expect(s.cards[small].zone).toBe('battle');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.axe.id, 'hand'), byRevolution: true }));
    expect(s.cards[small].zone).toBe('mana');
    expect(s.cards[big].zone).toBe('mana');
    // 同じターンの2回目は使えない
    const again = put(s, 1, C.small.id, 'battle');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.axe.id, 'hand'), byRevolution: true }));
    expect(s.cards[again].zone).toBe('battle');
  });

  it('2枚から1枚をマナへ、残りは選べば山札の下へ', () => {
    let s = newGame();
    const sp = put(s, 0, C.look2.id, 'hand');
    mana(s, 0, 3);
    const b = onTop(s, 0, C.mid.id);
    const a = onTop(s, 0, C.small.id);
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: sp }), true, (c) => c.slice(0, 1));
    expect(s.cards[a].zone).toBe('mana');
    expect(s.players[0].zones.deck[0]).toBe(b);
  });

  it('残りを選ばなければ山札の上に残る', () => {
    let s = newGame();
    const sp = put(s, 0, C.look2.id, 'hand');
    mana(s, 0, 3);
    const b = onTop(s, 0, C.mid.id);
    const a = onTop(s, 0, C.small.id);
    let n = 0;
    s = settle(act(s, { type: 'PLAY_CARD', player: 0, iid: sp }), true, (c) => (n++ === 0 ? c.slice(0, 1) : []));
    expect(s.cards[a].zone).toBe('mana');
    expect(s.players[0].zones.deck.at(-1)).toBe(b);
  });

  it('相手のクリーチャーが出た時、ターンの残りをとばせる', () => {
    let s = newGame();
    put(s, 0, C.watch.id, 'battle');
    s.activePlayer = 1;
    const c = put(s, 1, C.small.id, 'hand');
    mana(s, 1, 2);
    s.phase = 'main';
    s = settle(act(s, { type: 'PLAY_CARD', player: 1, iid: c }));
    expect(s.cards[c].zone).toBe('battle');
    expect(s.activePlayer).toBe(0);
  });

  it('相手が呪文を唱えた時、ターンの残りをとばせる（とばさなければそのまま）', () => {
    let s = newGame();
    put(s, 0, C.watch.id, 'battle');
    s.activePlayer = 1;
    s.phase = 'main';
    const c = put(s, 1, C.spell.id, 'hand');
    mana(s, 1, 1);
    const kept = settle(act(structuredClone(s), { type: 'PLAY_CARD', player: 1, iid: c }), false);
    expect(kept.activePlayer).toBe(1);
    s = settle(act(s, { type: 'PLAY_CARD', player: 1, iid: c }));
    expect(s.activePlayer).toBe(0);
  });
});
