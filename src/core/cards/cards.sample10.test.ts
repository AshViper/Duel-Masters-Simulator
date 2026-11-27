// 例文10：次のうちいずれか1つ（相手が選んで破壊／手札に戻す）・プレイヤーを選んで墓地を山札の下へ、その枚数以下のコストを破壊・
// 出た時または攻撃する時に手札かマナゾーンから多色を出す・ファイナル革命（コストの合計6以下の多色を好きな数）・
// 各ターンに1度、自分の多色が出た時にバトル・条件つきの D・D・D（攻撃中のクリーチャーのコストだけ軽減）・
// 「スピードアタッカー」「マッハファイター」「エスケープ」を与える・相手は各ターン1枚しか呪文を唱えられない・相手は光ではない呪文を唱えられない
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { keywords } from '../engine/queries';
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
  cyber: mk('s10-1', 'サイバー', ['このクリーチャーがバトルゾーンに出た時、次のうちいずれか１つを選ぶ。', '▶︎相手は自身のパワーが一番小さいクリーチャーを１体選び、破壊する。', '▶︎相手のクリーチャーを１体選び、持ち主の手札に戻す。'], { civ: '水/火', cost: '7', power: '9000' }),
  jaouga: mk('s10-2', 'まそう', ['このクリーチャーが出た時、プレイヤーを１人選ぶ。そのプレイヤーは自身の墓地にあるカードの枚数を数え、シャッフルして山札の下に置く。その後、こうして山札の下に置かれたカードの枚数以下のコストを持つ相手のクリーチャーを１体選び、破壊してもよい。'], { civ: '闇', cost: '8', power: '15000' }),
  oudou: mk('s10-3', 'おうどう', [
    '自分のマナゾーンに光、火、自然の各文明があれば、このカードに「D・D・D[cc08]」を与え、そのコストを攻撃中のクリーチャーのコストの数少なくする。ただし、コストは０以下にはならない。',
    'このクリーチャーが出た時または攻撃する時、コスト７以下の多色クリーチャーを１体、自分の、手札またはマナゾーンから出してもよい。',
    '自分の他の多色クリーチャーすべてに「スピードアタッカー」と「マッハファイター」と「エスケープ」を与える。',
  ], { civ: '光/火/自然', cost: '8', power: '12000' }),
  ken: mk('s10-4', 'つるぎ', ['ファイナル革命-このクリーチャーが「革命チェンジ」によってバトルゾーンに出た時、そのターン中に他の「ファイナル革命」をまだ使っていなければ、コストの合計が６以下になるよう、進化ではない多色クリーチャーを好きな数、自分のマナゾーンまたは手札から選び、バトルゾーンに出す。'], { civ: '火/自然', cost: '8', power: '13000' }),
  aku: mk('s10-5', 'あく', ['各ターンに１度、自分の多色クリーチャーが出た時、相手のクリーチャーを１体選んでもよい。そうしたら、その選んだクリーチャーとこのクリーチャーをバトルさせる。'], { civ: '闇/火', cost: '7', power: '9000' }),
  jogi: mk('s10-6', 'じょぎ', ['相手は、自身の各ターンに１枚しか呪文を唱えられない。'], { civ: '無色', cost: '8', power: '10000' }),
  momo: mk('s10-7', 'もも', ['相手は光ではない呪文を唱えられない。'], { civ: '光/自然', cost: '6', power: '6000' }),
  multi2: mk('s10-8', 'たしょく2', [], { civ: '火/自然', cost: '2', power: '2000' }),
  multi4: mk('s10-9', 'たしょく4', [], { civ: '火/自然', cost: '4', power: '4000' }),
  multi5: mk('s10-10', 'たしょく5', [], { civ: '火/自然', cost: '5', power: '5000' }),
  small: mk('s10-11', 'こもの', [], { cost: '2', power: '2000' }),
  mid: mk('s10-12', 'ちゅうもの', [], { cost: '4', power: '4000' }),
  light: mk('s10-13', 'ひかり', [], { civ: '光', cost: '1' }),
  fire: mk('s10-14', 'ほのお', [], { civ: '火', cost: '1' }),
  lightSpell: mk('s10-15', 'ひかりのじゅもん', [], { civ: '光', type: '呪文', cost: '1' }),
  fireSpell: mk('s10-16', 'ほのおのじゅもん', [], { civ: '火', type: '呪文', cost: '1' }),
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
type Pick = (c: string[], prompt: string) => string[];
type Mode = (options: string[], prompt: string) => number;
/** 確認はすべて accept、選択は先頭から（pick で変えられる）、モードは0番（mode で変えられる） */
function settle(s: GameState, accept = true, pick?: Pick, mode?: Mode): GameState {
  for (let i = 0; i < 20 && s.pending; i++) {
    const p = s.pending as { kind: string; player: PlayerId; candidates?: string[]; options?: string[]; max?: number; min?: number; prompt?: string };
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: pick ? pick(p.candidates ?? [], p.prompt ?? '') : (p.candidates ?? []).slice(0, Math.max(p.min ?? 1, 1)) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: [String(mode ? mode(p.options ?? [], p.prompt ?? '') : 0)] });
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

describe('例文10の読み取り', () => {
  it('すべて自動の効果になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「各ターンに1度、自分の多色クリーチャーが出た時」は2つの誘発で1度を分け合う', () => {
    const keys = C.aku.abilities?.map((a) => [a.when, a.oncePerTurn, a.onceKey]);
    expect(keys).toEqual([
      ['onSummon', true, 'onSummon+onOtherSummon'],
      ['onOtherSummon', true, 'onSummon+onOtherSummon'],
    ]);
  });
  it('条件つきの D・D・D は、攻撃中のクリーチャーのコストだけ少なくする別の使い方になる', () => {
    expect(C.oudou.altPlays).toEqual([expect.objectContaining({ name: 'D・D・D', cost: 8, timing: 'ownAttack', reduceByAttacker: true, min: 1 })]);
  });
});

describe('例文10の動作', () => {
  it('次のうちいずれか1つ：相手が自身のパワーが一番小さいクリーチャーを選んで破壊する', () => {
    let s = newGame();
    const small = put(s, 1, C.small.id, 'battle');
    const mid = put(s, 1, C.mid.id, 'battle');
    // 候補が1体だけなら自動で選ばれる（選ばせる時も、パワーが一番小さいものだけ）
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.cyber.id, 'hand') }), true, (c) => (expect(c).toEqual([small]), c));
    expect(s.cards[small].zone).toBe('graveyard');
    expect(s.cards[mid].zone).toBe('battle');
  });

  it('次のうちいずれか1つ：相手のクリーチャーを手札に戻す', () => {
    let s = newGame();
    put(s, 1, C.small.id, 'battle');
    const mid = put(s, 1, C.mid.id, 'battle');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.cyber.id, 'hand') }), true, (c) => c.filter((x) => x === mid), () => 1);
    expect(s.cards[mid].zone).toBe('hand');
  });

  it('プレイヤーを選び、その墓地をシャッフルして山札の下へ。その枚数以下のコストの相手のクリーチャーを破壊できる', () => {
    let s = newGame();
    const grave = [put(s, 1, C.small.id, 'graveyard'), put(s, 1, C.small.id, 'graveyard'), put(s, 1, C.small.id, 'graveyard')];
    put(s, 0, C.small.id, 'graveyard');
    const cheap = put(s, 1, C.small.id, 'battle'); // コスト2
    const big = put(s, 1, C.mid.id, 'battle'); // コスト4（3枚より大きい）
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.jaouga.id, 'hand') }), true, (c) => (expect(c).toEqual([cheap]), c), (o) => o.findIndex((x) => x.startsWith('相手')));
    const deck = s.players[1].zones.deck;
    for (const g of grave) {
      expect(s.cards[g].zone).toBe('deck');
      expect(deck.indexOf(g)).toBeLessThan(3);
    }
    expect(s.players[0].zones.graveyard.length).toBe(1);
    expect(s.cards[cheap].zone).toBe('graveyard');
    expect(s.cards[big].zone).toBe('battle');
  });

  it('自分を選べば自分の墓地が山札の下へ（0枚ならコスト0以下だけ）', () => {
    let s = newGame();
    const mine = [put(s, 0, C.small.id, 'graveyard'), put(s, 0, C.small.id, 'graveyard')];
    const foe = put(s, 1, C.small.id, 'battle');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.jaouga.id, 'hand') }));
    for (const g of mine) expect(s.cards[g].zone).toBe('deck');
    expect(s.cards[foe].zone).toBe('graveyard');
  });

  it('出た時、コスト7以下の多色クリーチャーを手札かマナゾーンから出せる', () => {
    let s = newGame();
    const inMana = put(s, 0, C.multi5.id, 'mana');
    const inHand = put(s, 0, C.multi2.id, 'hand');
    put(s, 0, C.small.id, 'hand'); // 単色は出せない
    put(s, 0, C.ken.id, 'hand'); // コスト8は出せない
    let seen: string[] = [];
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.oudou.id, 'hand') }), true, (c) => ((seen = c), c.filter((x) => x === inMana)));
    expect(new Set(seen)).toEqual(new Set([inMana, inHand]));
    expect(s.cards[inMana].zone).toBe('battle');
  });

  it('攻撃する時も、多色クリーチャーを出せる', () => {
    let s = newGame();
    const o = put(s, 0, C.oudou.id, 'battle');
    const inHand = put(s, 0, C.multi4.id, 'hand');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: o, target: { kind: 'player' } }), true, (c, prompt) => (c.includes(inHand) ? [inHand] : prompt.includes('シールド') ? c.slice(0, 1) : []));
    expect(s.cards[inHand].zone).toBe('battle');
  });

  it('他の多色クリーチャーに「スピードアタッカー」「マッハファイター」「エスケープ」を与える（自分自身と単色には与えない）', () => {
    const s = newGame();
    const o = put(s, 0, C.oudou.id, 'battle');
    const m = put(s, 0, C.multi2.id, 'battle');
    const mono = put(s, 0, C.small.id, 'battle');
    expect(keywords(s, reg, m)).toMatchObject({ speedAttacker: true, machFighter: true, escape: true });
    expect(keywords(s, reg, o).escape).toBeFalsy();
    expect(keywords(s, reg, mono).escape).toBeFalsy();
  });

  it('与えられた「エスケープ」：破壊される時、かわりにシールドを1つ手札に加えられる', () => {
    let s = newGame();
    put(s, 0, C.oudou.id, 'battle');
    const m = put(s, 0, C.multi2.id, 'battle');
    const shields = s.players[0].zones.shield.length;
    const hand = s.players[0].zones.hand.length;
    s = settle(runTask(s, { kind: 'leave', iid: m, to: 'graveyard', cause: 'destroy' }));
    expect(s.cards[m].zone).toBe('battle');
    expect(s.players[0].zones.shield.length).toBe(shields - 1);
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
    // 使わなければ破壊される
    s = settle(runTask(s, { kind: 'leave', iid: m, to: 'graveyard', cause: 'destroy' }), false);
    expect(s.cards[m].zone).toBe('graveyard');
  });

  it('D・D・D：光・火・自然がマナにあれば、攻撃中のクリーチャーのコストだけ少なく払って出せる', () => {
    let s = newGame();
    const a = put(s, 0, C.multi5.id, 'battle'); // コスト5 → 8-5=3
    const d = put(s, 0, C.oudou.id, 'hand');
    mana(s, 0, 1, C.light.id);
    mana(s, 0, 1, C.fire.id);
    mana(s, 0, 1, C.small.id);
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toEqual([d]);
    s = act(s, { type: 'RESPOND', player: 0, selected: [d] });
    expect(s.cards[d].zone).toBe('battle');
    expect(s.players[0].zones.mana.every((x) => s.cards[x].tapped)).toBe(true);
  });

  it('D・D・D：文明が足りない、またはマナが足りなければ使えない', () => {
    // 自然がない
    let s = newGame();
    let a = put(s, 0, C.multi5.id, 'battle');
    put(s, 0, C.oudou.id, 'hand');
    mana(s, 0, 2, C.light.id);
    mana(s, 0, 2, C.fire.id);
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind === 'selectCards' && s.pending.prompt.includes('D・D・D')).toBeFalsy();
    // 攻撃中のクリーチャーがコスト2 → 6マナ必要、3マナしかない
    s = newGame();
    a = put(s, 0, C.multi2.id, 'battle');
    put(s, 0, C.oudou.id, 'hand');
    mana(s, 0, 1, C.light.id);
    mana(s, 0, 1, C.fire.id);
    mana(s, 0, 1, C.small.id);
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind === 'selectCards' && s.pending.prompt.includes('D・D・D')).toBeFalsy();
  });

  it('D・D・D：コストは1より少なくならない', () => {
    let s = newGame();
    const a = put(s, 0, C.ken.id, 'battle'); // コスト8 → 0 ではなく 1
    const d = put(s, 0, C.oudou.id, 'hand');
    mana(s, 0, 1, C.light.id);
    put(s, 0, C.fire.id, 'mana');
    put(s, 0, C.small.id, 'mana');
    // 火と自然はタップ済み（文明はあるが支払えるのは1枚）
    for (const x of s.players[0].zones.mana.slice(1)) s.cards[x].tapped = true;
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind === 'selectCards' && s.pending.candidates).toEqual([d]);
    s = act(s, { type: 'RESPOND', player: 0, selected: [d] });
    expect(s.cards[d].zone).toBe('battle');
  });

  it('ファイナル革命：コストの合計が6以下になるよう、多色クリーチャーをマナゾーンと手札から出す', () => {
    let s = newGame();
    const m2 = put(s, 0, C.multi2.id, 'mana');
    const m4 = put(s, 0, C.multi4.id, 'hand');
    const m5 = put(s, 0, C.multi5.id, 'mana');
    const mono = put(s, 0, C.small.id, 'mana');
    let seen: string[] = [];
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.ken.id, 'hand'), byRevolution: true }), true, (c) => ((seen = c), [m2, m4]));
    expect(seen).toContain(m5);
    expect(seen).not.toContain(mono);
    expect(s.cards[m2].zone).toBe('battle');
    expect(s.cards[m4].zone).toBe('battle');
    expect(s.cards[m5].zone).toBe('mana');
  });

  it('ファイナル革命：革命チェンジで出ていなければ使わない', () => {
    let s = newGame();
    const m2 = put(s, 0, C.multi2.id, 'mana');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.ken.id, 'hand') }), true, () => [m2]);
    expect(s.cards[m2].zone).toBe('mana');
  });

  it('各ターンに1度、自分の多色クリーチャーが出た時、相手のクリーチャーとバトルする（自分自身が出た時と合わせて1度）', () => {
    let s = newGame();
    const foe1 = put(s, 1, C.small.id, 'battle');
    const foe2 = put(s, 1, C.small.id, 'battle');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.aku.id, 'hand') }), true, (c) => c.filter((x) => x === foe1));
    expect(s.cards[foe1].zone).toBe('graveyard');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.multi2.id, 'hand') }));
    expect(s.cards[foe2].zone).toBe('battle');
  });

  it('他の多色クリーチャーが出た時もバトルする。単色では誘発しない', () => {
    let s = newGame();
    put(s, 0, C.aku.id, 'battle');
    const foe = put(s, 1, C.small.id, 'battle');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.small.id, 'hand') }));
    expect(s.cards[foe].zone).toBe('battle');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.multi2.id, 'hand') }));
    expect(s.cards[foe].zone).toBe('graveyard');
  });

  it('相手は、自身の各ターンに1枚しか呪文を唱えられない', () => {
    let s = newGame();
    put(s, 0, C.jogi.id, 'battle');
    s.activePlayer = 1;
    s.phase = 'main';
    mana(s, 1, 2, C.fire.id);
    const sp1 = put(s, 1, C.fireSpell.id, 'hand');
    const sp2 = put(s, 1, C.fireSpell.id, 'hand');
    s = settle(act(s, { type: 'PLAY_CARD', player: 1, iid: sp1 }));
    expect(s.cards[sp1].zone).toBe('graveyard');
    expect(() => act(s, { type: 'PLAY_CARD', player: 1, iid: sp2 })).toThrow();
  });

  it('相手は光ではない呪文を唱えられない（光の呪文は唱えられる）', () => {
    let s = newGame();
    put(s, 0, C.momo.id, 'battle');
    s.activePlayer = 1;
    s.phase = 'main';
    mana(s, 1, 1, C.fire.id);
    mana(s, 1, 1, C.light.id);
    const f = put(s, 1, C.fireSpell.id, 'hand');
    const l = put(s, 1, C.lightSpell.id, 'hand');
    expect(() => act(s, { type: 'PLAY_CARD', player: 1, iid: f })).toThrow();
    s = settle(act(s, { type: 'PLAY_CARD', player: 1, iid: l }));
    expect(s.cards[l].zone).toBe('graveyard');
  });
});
