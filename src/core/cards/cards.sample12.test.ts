// 例文12：自分のドラゴン以外を破壊して同じ数のドラゴンが出るまで表向き（メガ・メイキング・ドラゴン）・
// 相手の人数と同じ枚数を見て好きな数のドラゴンを出し、残りをタップしてマナへ・それらにスピードアタッカー（ボルシャック・ドラゴ大王）・
// 革命0トリガー（ボルシャック・ドギラゴン）・「相手のクリーチャーがこのクリーチャーに破壊された時」（勝利のレジェンド ガイアール）
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
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '1000', cost: o.cost ?? '1', abilities }] } as never);

const MEGA = 'このクリーチャーがバトルゾーンに出た時、自分のドラゴン以外のクリーチャーをすべて破壊する。その後、それと同じ数の進化ではないドラゴンが出るまで、自分の山札の上からカードを表向きにする。こうして見せた進化ではないドラゴンをすべてバトルゾーンに出し、残りを自分の墓地に置く。';
const DRAGO = 'このクリーチャーが攻撃する時、自分の山札の上から、相手の人数と同じ枚数、見る。その中から、好きな数のドラゴンを出し、残りをタップしてマナゾーンに置く。このターン、それらのドラゴンに「スピードアタッカー」を与える。';
const REV0 = '革命０トリガー―クリーチャーが自分を攻撃する時、自分のシールドが１枚もなければ、このクリーチャーを手札から見せてもよい。そうしたら、自分の山札の上から１枚目を表向きにする。そのカードが火の進化ではないクリーチャーなら、バトルゾーンに出し、このクリーチャーをその上に置く。';
const GAIAL = '相手のクリーチャーがこのクリーチャーに破壊された時、自分の山札の上から１枚目を表向きにする。それが進化ではないドラゴンなら、バトルゾーンに出す。それ以外なら、自分の山札の一番下に置く。';
const C = {
  mega: mk('s12-1', 'めがめいきんぐ', ['W・ブレイカー', MEGA], { race: 'メガ・コマンド・ドラゴン', cost: '9', power: '11000' }),
  drago: mk('s12-2', 'どらごだいおう', ['スピードアタッカー', 'T・ブレイカー', DRAGO], { race: 'アーマード・ドラゴン/レッド・コマンド・ドラゴン', civ: '火/自然', cost: '10', power: '12000' }),
  dogi: mk('s12-3', 'どぎらごん', [
    REV0,
    '進化-自分の火のクリーチャー１体の上に置く。',
    'T・ブレイカー',
    'このクリーチャーがバトルゾーンに出た時または攻撃する時、相手のクリーチャーを１体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。',
  ], { race: 'メガ・コマンド・ドラゴン/革命軍', type: '進化クリーチャー', cost: '7', power: '12000' }),
  gaial: mk('s12-4', 'がいあーる', ['スピードアタッカー', 'T・ブレイカー', 'このクリーチャーが攻撃する時、パワー9000以下のクリーチャーをすべて破壊する。', GAIAL], { race: 'レッド・コマンド・ドラゴン/ハンター', cost: '10', power: '13000' }),
  gaialOnly: mk('s12-5', 'がいあーるだけ', [GAIAL], { race: 'レッド・コマンド・ドラゴン', cost: '10', power: '13000' }),
  dragon: mk('s12-6', 'どらごん', [], { race: 'アーマード・ドラゴン', cost: '5', power: '5000' }),
  evoDragon: mk('s12-7', 'しんかどらごん', ['進化-自分の火のクリーチャー１体の上に置く。'], { race: 'アーマード・ドラゴン', type: '進化クリーチャー', cost: '5', power: '7000' }),
  small: mk('s12-8', 'こもの', [], { cost: '2', power: '2000' }),
  water: mk('s12-9', 'みず', [], { civ: '水', cost: '2', power: '2000' }),
  big: mk('s12-10', 'おおもの', [], { cost: '6', power: '10000' }),
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
/** 山札の上に積む（最後に渡したカードが一番上） */
function stack(s: GameState, player: PlayerId, cardIds: string[]): string[] {
  return cardIds.map((cardId) => {
    const iid = `t${s.nextIid++}`;
    s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
    s.players[player].zones.deck.push(iid);
    return iid;
  });
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
/** undefined を返すと既定（先頭から必要な数）にする */
type Pick = (c: string[], prompt: string) => string[] | undefined;
/** 確認はすべて accept、選択は先頭から（pick で変えられる）、モードは0番。stop を満たしたらそこで止める */
function settle(s: GameState, accept = true, pick?: Pick, stop?: (s: GameState) => boolean): GameState {
  for (let i = 0; i < 30 && s.pending && !stop?.(s); i++) {
    const p = s.pending as { kind: string; player: PlayerId; candidates?: string[]; options?: string[]; max?: number; min?: number; prompt?: string };
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: pick?.(p.candidates ?? [], p.prompt ?? '') ?? (p.candidates ?? []).slice(0, Math.max(p.min ?? 1, 1)) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: ['0'] });
    else if (p.kind === 'block') s = act(s, { type: 'RESPOND', player: p.player, selected: [] });
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
const zone = (s: GameState, iid: string) => s.cards[iid].zone;
const top = (s: GameState, p: PlayerId) => s.players[p].zones.deck[s.players[p].zones.deck.length - 1];
const bottom = (s: GameState, p: PlayerId) => s.players[p].zones.deck[0];
function clearShields(s: GameState, p: PlayerId): void {
  const ctx = new Ctx(s, reg);
  for (const sh of [...s.players[p].zones.shield]) ctx.moveCard(sh, 'graveyard');
}

describe('例文12の読み取り', () => {
  it('4枚とも自動の効果になる', () => {
    for (const c of [C.mega, C.drago, C.dogi, C.gaial]) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('ドラゴン以外をすべて破壊し、その数だけ進化ではないドラゴンが出るまで表向きにする', () => {
    expect(C.mega.abilities?.[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'self', zone: 'battle', count: 'all', filter: { not: { race: 'ドラゴン' } } } },
      { type: 'revealUntil', filter: { race: 'ドラゴン', nonEvolution: true }, count: 1, to: 'battle', restTo: 'graveyard', countChosen: true },
    ]);
  });
  it('相手の人数（1人）と同じ枚数を見て、好きな数のドラゴンを出し、残りはタップしてマナへ、出したものにスピードアタッカー', () => {
    expect(C.drago.abilities?.[0]).toEqual(
      expect.objectContaining({
        when: 'onAttack',
        effects: [{ type: 'lookAtTop', count: 1, pickCount: 1, pickFilter: { race: 'ドラゴン' }, pickTo: 'battle', restTo: 'mana', restTapped: true, pickGrant: { keywords: { speedAttacker: true } } }],
      }),
    );
  });
  it('革命0トリガーは、攻撃された時に手札から使う効果（シールドが0の条件つき）', () => {
    expect(C.dogi.handTriggers).toEqual([
      {
        when: 'attackedPlayer',
        condition: { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 },
        effects: [{ type: 'lookAtTop', count: 1, pickCount: 1, pickFilter: { civilization: 'fire', nonEvolution: true, cardType: 'creature' }, pickTo: 'battle', restTo: 'top', pickAll: true, evolveSelfOnto: true }],
      },
    ]);
  });
  it('「相手のクリーチャーがこのクリーチャーに破壊された時」の誘発になる', () => {
    expect(C.gaialOnly.abilities).toEqual([
      expect.objectContaining({
        when: 'onDestroyedByThis',
        who: 'opponent',
        effects: [{ type: 'lookAtTop', count: 1, pickCount: 1, pickFilter: { race: 'ドラゴン', nonEvolution: true }, pickTo: 'battle', restTo: 'deckBottom', pickAll: true }],
      }),
    ]);
  });
});

describe('例文12の動作', () => {
  it('メガ・メイキング：ドラゴン以外を破壊し、その数（2体）の進化ではないドラゴンが出るまで表向き。出たドラゴンを出し、残りは墓地へ', () => {
    let s = newGame();
    const sm1 = put(s, 0, C.small.id, 'battle');
    const sm2 = put(s, 0, C.small.id, 'battle');
    const dr0 = put(s, 0, C.dragon.id, 'battle');
    const opp = put(s, 1, C.small.id, 'battle');
    // 上から：こもの・進化ドラゴン・ドラゴン・こもの・ドラゴン・ドラゴン
    const [dr3, dr2, x2, dr1, evo, x1] = stack(s, 0, [C.dragon.id, C.dragon.id, C.small.id, C.dragon.id, C.evoDragon.id, C.small.id]);
    const mega = put(s, 0, C.mega.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: mega }));
    expect([zone(s, sm1), zone(s, sm2), zone(s, dr0), zone(s, opp)]).toEqual(['graveyard', 'graveyard', 'battle', 'battle']);
    expect([zone(s, dr1), zone(s, dr2)]).toEqual(['battle', 'battle']);
    expect([zone(s, x1), zone(s, evo), zone(s, x2)]).toEqual(['graveyard', 'graveyard', 'graveyard']);
    expect([zone(s, dr3), top(s, 0)]).toEqual(['deck', dr3]);
  });

  it('メガ・メイキング：破壊するクリーチャーがいなければ、表向きにしない', () => {
    let s = newGame();
    put(s, 0, C.dragon.id, 'battle');
    const [x] = stack(s, 0, [C.small.id]);
    const mega = put(s, 0, C.mega.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: mega }));
    expect([zone(s, x), top(s, 0)]).toEqual(['deck', x]);
  });

  it('ドラゴ大王：見たドラゴンを出すとスピードアタッカーを得る', () => {
    let s = newGame();
    const a = put(s, 0, C.drago.id, 'battle');
    const [dr] = stack(s, 0, [C.dragon.id]);
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }), false, (c) => (c.includes(dr) ? [dr] : undefined));
    expect(zone(s, dr)).toBe('battle');
    expect(keywords(s, reg, dr).speedAttacker).toBe(true);
  });

  it('ドラゴ大王：出さなかったカード・ドラゴンでないカードは、タップしてマナゾーンに置く', () => {
    let s = newGame();
    const a = put(s, 0, C.drago.id, 'battle');
    const [dr] = stack(s, 0, [C.dragon.id]);
    s.phase = 'attack';
    // 「好きな数」なので0体でもよい
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }), false, (_, p) => (p.includes('山札の上から') ? [] : undefined));
    expect([zone(s, dr), s.cards[dr].tapped]).toEqual(['mana', true]);
    s = newGame();
    const a2 = put(s, 0, C.drago.id, 'battle');
    const [sm] = stack(s, 0, [C.small.id]);
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a2, target: { kind: 'player' } }), false);
    expect([zone(s, sm), s.cards[sm].tapped]).toEqual(['mana', true]);
  });

  it('ドギラゴン：シールドが0の時に攻撃されたら、手札から見せて、山札の上の火の進化ではないクリーチャーを出し、その上に置く', () => {
    let s = newGame();
    clearShields(s, 1);
    const dogi = put(s, 1, C.dogi.id, 'hand');
    const [fire] = stack(s, 1, [C.small.id]);
    const a = put(s, 0, C.small.id, 'battle');
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending?.kind === 'confirm' && s.pending.player).toBe(1);
    // 出た時のバトル（任意）は使わない：ブロックの選択で止める
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    s = settle(s, false, undefined, (x) => x.pending?.kind === 'block');
    expect([zone(s, dogi), zone(s, fire)]).toEqual(['battle', 'battle']);
    expect(s.cards[dogi].under).toEqual([fire]);
    expect(s.players[1].zones.battle).toContain(dogi);
    expect(s.players[1].zones.battle).not.toContain(fire);
  });

  it('ドギラゴン：山札の上が火のクリーチャーでなければ出さず、ドギラゴンも手札に残る。シールドがあれば聞かない', () => {
    let s = newGame();
    clearShields(s, 1);
    const dogi = put(s, 1, C.dogi.id, 'hand');
    const [w] = stack(s, 1, [C.water.id]);
    const a = put(s, 0, C.small.id, 'battle');
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    s = settle(s, false, undefined, (x) => x.pending?.kind === 'block');
    expect([zone(s, dogi), zone(s, w), top(s, 1)]).toEqual(['hand', 'deck', w]);

    s = newGame();
    put(s, 1, C.dogi.id, 'hand');
    const a2 = put(s, 0, C.small.id, 'battle');
    s.phase = 'attack';
    s = act(s, { type: 'ATTACK', player: 0, attacker: a2, target: { kind: 'player' } });
    expect(s.pending?.kind === 'confirm' && s.pending.player === 1).toBe(false);
  });

  it('ガイアール：攻撃する時の能力で破壊した相手のクリーチャー1体ごとに、山札の上がドラゴンなら出し、それ以外は山札の一番下へ', () => {
    let s = newGame();
    const g = put(s, 0, C.gaial.id, 'battle');
    const own = put(s, 0, C.small.id, 'battle');
    const o1 = put(s, 1, C.small.id, 'battle');
    const o2 = put(s, 1, C.small.id, 'battle');
    // 上から：ドラゴン・こもの（自分のこもの1体の破壊では誘発しないので、2回だけ）
    const [sm, dr] = stack(s, 0, [C.small.id, C.dragon.id]);
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: g, target: { kind: 'player' } }), false);
    expect([zone(s, own), zone(s, o1), zone(s, o2)]).toEqual(['graveyard', 'graveyard', 'graveyard']);
    expect(zone(s, dr)).toBe('battle');
    expect([zone(s, sm), bottom(s, 0)]).toEqual(['deck', sm]);
  });

  it('ガイアール：バトルで破壊した時も誘発する。他のカードが破壊した時は誘発しない', () => {
    let s = newGame();
    const g = put(s, 0, C.gaialOnly.id, 'battle');
    const o = put(s, 1, C.big.id, 'battle');
    s.cards[o].tapped = true;
    const [dr] = stack(s, 0, [C.dragon.id]);
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: g, target: { kind: 'creature', iid: o } }), false);
    expect([zone(s, o), zone(s, dr)]).toEqual(['graveyard', 'battle']);

    s = newGame();
    put(s, 0, C.gaialOnly.id, 'battle');
    const o2 = put(s, 1, C.small.id, 'battle');
    const [dr2] = stack(s, 0, [C.dragon.id]);
    s = settle(runTask(s, { kind: 'leave', iid: o2, to: 'graveyard', cause: 'destroy' }));
    expect([zone(s, o2), zone(s, dr2)]).toEqual(['graveyard', 'deck']);
  });
});
