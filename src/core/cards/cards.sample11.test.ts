// 例文11：コストのかわりにクリーチャー・シールド・手札を山札の下に置いて召喚・2つのゾーンを合わせて数える条件（ジョーカーズが4枚以上／合計7つ以上）・
// 相手がバトルゾーン・マナゾーン・手札から1枚ずつ選んで山札の下へ・手札から2体まで出してスピードアタッカー、ターンの終わりに山札の下に置いて引く・
// 《消王ケシカス》（破壊して、出た相手のクリーチャーの能力をトリガーさせない）・相手は自身の各ターンに1枚しか呪文を唱えられない
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

const J = { race: 'ジョーカーズ' };
const C = {
  niku: mk('s11-1', 'にくじーる', ['コストを支払うかわりに、クリーチャー１体とシールド１つ、そして手札１枚を自分の山札の一番下に置いて、このクリーチャーを召喚してもよい。', 'W・ブレイカー'], { ...J, civ: '火', cost: '6', power: '6000' }),
  dead: mk('s11-2', 'でっと', ['T・ブレイカー', 'このクリーチャーがバトルゾーンに出た時、バトルゾーンまたはマナゾーンに自分のジョーカーズが４枚以上あれば、相手はバトルゾーン、マナゾーン、手札から自身のカードを１枚ずつ選び、好きな順序で山札の一番下に置く。その後、自分はカードを３枚引く。'], { race: 'ジョーカーズ/スペシャルズ', civ: '無色', cost: '9', power: '12000' }),
  mera: mk('s11-3', 'めら', [
    '{GS} G・ストライク',
    '進化：ジョーカーズ・クリーチャー１体の上に置く。',
    'W・ブレイカー',
    'このクリーチャーが出た時、ジョーカーズ・クリーチャーを２体まで自分の手札から出し、それらに「スピードアタッカー」を与える。このターンの終わりに、それらを好きな順序で山札の下に置き、こうして下に置いたクリーチャー１体につき、カードを１枚引く。',
    'このクリーチャーが攻撃する時、自分の、ジョーカーズとマナゾーンにあるジョーカーズ・カードが合計７つ以上なら、相手の「ブロッカー」を持つクリーチャーをすべて破壊する。',
  ], { ...J, civ: '火', type: '進化クリーチャー', cost: '7', power: '10000' }),
  meraOut: mk('s11-4', 'めらだす', ['このクリーチャーが出た時、ジョーカーズ・クリーチャーを２体まで自分の手札から出し、それらに「スピードアタッカー」を与える。このターンの終わりに、それらを好きな順序で山札の下に置き、こうして下に置いたクリーチャー１体につき、カードを１枚引く。'], { ...J, civ: '火', cost: '7', power: '10000' }),
  meraAtk: mk('s11-5', 'めらこうげき', ['このクリーチャーが攻撃する時、自分の、ジョーカーズとマナゾーンにあるジョーカーズ・カードが合計７つ以上なら、相手の「ブロッカー」を持つクリーチャーをすべて破壊する。'], { ...J, civ: '火', cost: '7', power: '10000' }),
  keshi: mk('s11-6', 'けしかす', ['相手のクリーチャーがバトルゾーンに出て、その能力がトリガーする時、「ノーン!!」と叫びながらこのクリーチャーを破壊してもよい。そうしたら、その能力はトリガーしない。（例えば、「このクリーチャーがバトルゾーンに出た時」で始まる能力はトリガーしない）'], { ...J, civ: '無色', cost: '5', power: '5000' }),
  jogi: mk('s11-7', 'じょぎ', ['W・ブレイカー', '相手は、自身の各ターンに１枚しか呪文を唱えられない。'], { race: 'ジョーカーズ・ドラゴン', civ: '無色', cost: '8', power: '10000' }),
  jogiFull: mk('s11-13', 'じょぎぜんぶ', [
    '革命チェンジ：コスト５以上のジョーカーズ（自分のコスト５以上のジョーカーズが攻撃する時、そのクリーチャーと手札にあるこのクリーチャーを入れ替えてもよい）',
    'W・ブレイカー',
    'このクリーチャーがバトルゾーンに出た時、カードを１枚引き、その後、自分の手札を１枚捨てる。こうして捨てたカードがジョーカーズなら、そのカードの「このクリーチャーがバトルゾーンに出た時」で始まる能力を１つ使ってもよい。',
    '相手は、自身の各ターンに１枚しか呪文を唱えられない。',
  ], { race: 'ジョーカーズ・ドラゴン', civ: '無色', cost: '8', power: '10000' }),
  jokerCip: mk('s11-14', 'でるじょーかー', ['このクリーチャーが出た時、カードを２枚引く。'], { ...J, civ: '無色', cost: '4', power: '3000' }),
  joker2: mk('s11-15', 'ふたつじょーかー', ['このクリーチャーが出た時、カードを２枚引く。', 'このクリーチャーが出た時、相手のクリーチャーを１体破壊する。'], { ...J, civ: '無色', cost: '6', power: '3000' }),
  joker: mk('s11-8', 'じょーかー', [], { ...J, civ: '無色', cost: '2', power: '2000' }),
  small: mk('s11-9', 'こもの', [], { cost: '2', power: '2000' }),
  blocker: mk('s11-10', 'ぶろっかー', ['ブロッカー'], { cost: '2', power: '2000' }),
  cip: mk('s11-11', 'でたとき', ['このクリーチャーが出た時、カードを２枚引く。'], { cost: '3', power: '3000' }),
  watcher: mk('s11-12', 'みはり', ['自分の他のクリーチャーが出た時、カードを１枚引く。'], { cost: '3', power: '3000' }),
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
const zone = (s: GameState, iid: string) => s.cards[iid].zone;
const deckBottom = (s: GameState, p: PlayerId, n: number) => s.players[p].zones.deck.slice(0, n);

describe('例文11の読み取り', () => {
  it('すべて自動の効果になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('コストのかわりに3つのゾーンのカードを山札の下に置く使い方になる', () => {
    expect(C.niku.altPlays).toEqual([expect.objectContaining({ cost: 0, payFirst: [expect.objectContaining({ to: 'deckBottom' }), expect.anything(), expect.anything()] })]);
  });
  it('2つのゾーンを合わせて数える条件になる', () => {
    const cond = { type: 'compare', left: expect.objectContaining({ who: 'self', zone: 'battle', extraZones: ['mana'], filter: { race: 'ジョーカーズ' } }), op: '>=' };
    expect(C.dead.abilities?.[0].condition).toEqual({ ...cond, right: 4 });
    expect(C.meraAtk.abilities?.[0].condition).toEqual({ ...cond, right: 7 });
  });
  it('出したクリーチャーに、このターンの終わりに山札の下に置いて引くことを付ける', () => {
    expect(C.meraOut.abilities?.[0].effects).toEqual([expect.objectContaining({ type: 'move', to: 'battle', grant: { keywords: { speedAttacker: true } }, endOfTurn: 'deckBottomDraw' })]);
  });
  it('ケシカスは任意の破壊つきでトリガーさせない常在効果、ジョギラゴンは各ターン1枚の呪文の制限', () => {
    expect(C.keshi.statics).toEqual([{ type: 'suppressEnterTriggers', destroySelf: true }]);
    expect(C.jogi.statics).toEqual([{ type: 'playLimit', who: 'opponent', what: 'spell', max: 1 }]);
  });
});

describe('例文11の動作', () => {
  it('コストのかわりに、クリーチャー・シールド・ほかの手札を1枚ずつ山札の下に置いて召喚する', () => {
    let s = newGame();
    s.phase = 'main';
    const cr = put(s, 0, C.small.id, 'battle');
    const sh = s.players[0].zones.shield[0];
    const other = put(s, 0, C.small.id, 'hand');
    const niku = put(s, 0, C.niku.id, 'hand');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: niku, alt: 0 });
    // 手札の候補にこのカード自身は入らない
    s = settle(s, true, (c) => {
      expect(c).not.toContain(niku);
      return c.includes(other) ? [other] : c.slice(0, 1);
    });
    expect(zone(s, niku)).toBe('battle');
    expect([zone(s, cr), zone(s, sh), zone(s, other)]).toEqual(['deck', 'deck', 'deck']);
    expect(deckBottom(s, 0, 3).sort()).toEqual([cr, sh, other].sort());
    expect(s.cards[niku].enteredBySummon).toBe(true);
  });

  it('置くカードがそろわなければ、その使い方はできない', () => {
    const s = newGame();
    s.phase = 'main';
    put(s, 0, C.small.id, 'hand');
    const niku = put(s, 0, C.niku.id, 'hand');
    // クリーチャーがいない
    expect(applyAction(s, { type: 'PLAY_CARD', player: 0, iid: niku, alt: 0 }, reg).error).toBeTruthy();
    // ほかの手札がない
    const s2 = newGame();
    s2.phase = 'main';
    put(s2, 0, C.small.id, 'battle');
    const n2 = put(s2, 0, C.niku.id, 'hand');
    s2.players[0].zones.hand = [n2];
    expect(applyAction(s2, { type: 'PLAY_CARD', player: 0, iid: n2, alt: 0 }, reg).error).toBeTruthy();
  });

  it('ジョーカーズが合わせて4枚以上なら、相手はバトルゾーン・マナゾーン・手札から1枚ずつ山札の下に置き、自分は3枚引く', () => {
    let s = newGame();
    put(s, 0, C.joker.id, 'battle');
    put(s, 0, C.joker.id, 'mana');
    put(s, 0, C.joker.id, 'mana');
    const ob = put(s, 1, C.small.id, 'battle');
    const om = put(s, 1, C.small.id, 'mana');
    const oh = put(s, 1, C.small.id, 'hand');
    s.players[1].zones.hand = [oh];
    const dead = put(s, 0, C.dead.id, 'hand');
    const hand0 = s.players[0].zones.hand.length - 1;
    // でっと自身（バトルゾーンのジョーカーズ）も数える：1+2+1=4
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: dead }));
    expect([zone(s, ob), zone(s, om), zone(s, oh)]).toEqual(['deck', 'deck', 'deck']);
    expect(deckBottom(s, 1, 3).sort()).toEqual([ob, om, oh].sort());
    expect(s.players[0].zones.hand.length).toBe(hand0 + 3);
  });

  it('ジョーカーズが3枚なら、何もせず引きもしない', () => {
    let s = newGame();
    put(s, 0, C.joker.id, 'mana');
    put(s, 0, C.joker.id, 'mana');
    const ob = put(s, 1, C.small.id, 'battle');
    const dead = put(s, 0, C.dead.id, 'hand');
    const hand0 = s.players[0].zones.hand.length - 1;
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: dead }));
    expect(zone(s, ob)).toBe('battle');
    expect(s.players[0].zones.hand.length).toBe(hand0);
  });

  it('手札からジョーカーズを2体まで出してスピードアタッカーを与え、ターンの終わりに山札の下に置いて1体につき1枚引く', () => {
    let s = newGame();
    s.phase = 'main';
    const j1 = put(s, 0, C.joker.id, 'hand');
    const j2 = put(s, 0, C.joker.id, 'hand');
    const nj = put(s, 0, C.small.id, 'hand');
    const m = put(s, 0, C.meraOut.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: m }), true, (c) => {
      expect(c).not.toContain(nj);
      return c.filter((x) => x === j1 || x === j2);
    });
    expect([zone(s, j1), zone(s, j2)]).toEqual(['battle', 'battle']);
    expect(keywords(s, reg, j1).speedAttacker).toBe(true);
    const hand0 = s.players[0].zones.hand.length;
    s = settle(act(s, { type: 'END_TURN', player: 0 }));
    expect([zone(s, j1), zone(s, j2)]).toEqual(['deck', 'deck']);
    expect(deckBottom(s, 0, 2).sort()).toEqual([j1, j2].sort());
    expect(s.players[0].zones.hand.length).toBe(hand0 + 2);
  });

  it('ターンの終わりまでにバトルゾーンを離れたクリーチャーは山札の下に置かず、その分は引かない', () => {
    let s = newGame();
    s.phase = 'main';
    const j1 = put(s, 0, C.joker.id, 'hand');
    const j2 = put(s, 0, C.joker.id, 'hand');
    const m = put(s, 0, C.meraOut.id, 'hand');
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: m }), true, (c) => c.filter((x) => x === j1 || x === j2));
    new Ctx(s, reg).moveCard(j2, 'graveyard');
    const hand0 = s.players[0].zones.hand.length;
    s = settle(act(s, { type: 'END_TURN', player: 0 }));
    expect([zone(s, j1), zone(s, j2)]).toEqual(['deck', 'graveyard']);
    expect(s.players[0].zones.hand.length).toBe(hand0 + 1);
  });

  it('攻撃する時、バトルゾーンのジョーカーズとマナゾーンのジョーカーズ・カードが合計7つ以上なら、相手のブロッカーをすべて破壊する', () => {
    let s = newGame();
    const a = put(s, 0, C.meraAtk.id, 'battle');
    put(s, 0, C.joker.id, 'battle');
    for (let i = 0; i < 5; i++) put(s, 0, C.joker.id, 'mana');
    const b1 = put(s, 1, C.blocker.id, 'battle');
    const b2 = put(s, 1, C.blocker.id, 'battle');
    const nb = put(s, 1, C.small.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }), false);
    expect([zone(s, b1), zone(s, b2), zone(s, nb)]).toEqual(['graveyard', 'graveyard', 'battle']);
  });

  it('合計6つなら、ブロッカーは破壊しない', () => {
    let s = newGame();
    const a = put(s, 0, C.meraAtk.id, 'battle');
    for (let i = 0; i < 5; i++) put(s, 0, C.joker.id, 'mana');
    const b1 = put(s, 1, C.blocker.id, 'battle');
    s.phase = 'attack';
    s = settle(act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } }), false);
    expect(zone(s, b1)).toBe('battle');
  });

  it('ケシカス：破壊すれば、出た相手のクリーチャーの「出た時」の能力はトリガーしない（相手の他のクリーチャーの能力はトリガーする）', () => {
    let s = newGame();
    const k = put(s, 0, C.keshi.id, 'battle');
    put(s, 1, C.watcher.id, 'battle');
    const c = put(s, 1, C.cip.id, 'hand');
    const hand1 = s.players[1].zones.hand.length - 1;
    s = runTask(s, { kind: 'enterBattle', player: 1, iid: c });
    expect(s.pending?.kind === 'confirm' && s.pending.player).toBe(0);
    s = settle(s, true);
    expect(zone(s, k)).toBe('graveyard');
    // でたとき（2枚）はトリガーしない。みはり（1枚）はトリガーする
    expect(s.players[1].zones.hand.length).toBe(hand1 + 1);
  });

  it('ケシカス：破壊しなければ、能力はそのままトリガーする', () => {
    let s = newGame();
    const k = put(s, 0, C.keshi.id, 'battle');
    const c = put(s, 1, C.cip.id, 'hand');
    const hand1 = s.players[1].zones.hand.length - 1;
    s = settle(runTask(s, { kind: 'enterBattle', player: 1, iid: c }), false);
    expect(zone(s, k)).toBe('battle');
    expect(s.players[1].zones.hand.length).toBe(hand1 + 2);
  });

  it('捨てたカードがジョーカーズなら、その「出た時」の能力を使ってもよい（墓地にあるまま使う）', () => {
    let s = newGame();
    const jc = put(s, 0, C.jokerCip.id, 'hand');
    const jogi = put(s, 0, C.jogiFull.id, 'hand');
    s.players[0].zones.hand = [jc, jogi];
    s = runTask(s, { kind: 'enterBattle', player: 0, iid: jogi });
    // 1枚引いた後、捨てるカードに でるじょーかー を選ぶ → 使うか聞かれる
    s = settle(s, true, (c) => (c.includes(jc) ? [jc] : c.slice(0, 1)));
    expect(zone(s, jc)).toBe('graveyard');
    // 1枚引いて1枚捨て、2枚引く：手札は 1（引いた1枚）+2
    expect(s.players[0].zones.hand.length).toBe(3);
  });

  it('使わなければ引かない／ジョーカーズでないカードを捨てた時は聞かない', () => {
    let s = newGame();
    const jc = put(s, 0, C.jokerCip.id, 'hand');
    const jogi = put(s, 0, C.jogiFull.id, 'hand');
    s.players[0].zones.hand = [jc, jogi];
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: jogi }), false, (c) => (c.includes(jc) ? [jc] : c.slice(0, 1)));
    expect(s.players[0].zones.hand.length).toBe(1);
    s = newGame();
    const sm = put(s, 0, C.small.id, 'hand');
    const jogi2 = put(s, 0, C.jogiFull.id, 'hand');
    s.players[0].zones.hand = [sm, jogi2];
    s = runTask(s, { kind: 'enterBattle', player: 0, iid: jogi2 });
    s = settle(s, true, (c) => (c.includes(sm) ? [sm] : c.slice(0, 1)));
    expect(zone(s, sm)).toBe('graveyard');
    expect(s.players[0].zones.hand.length).toBe(1);
  });

  it('「出た時」の能力が2つあれば、使う1つを選ぶ', () => {
    let s = newGame();
    const j2 = put(s, 0, C.joker2.id, 'hand');
    const jogi = put(s, 0, C.jogiFull.id, 'hand');
    const foe = put(s, 1, C.small.id, 'battle');
    s.players[0].zones.hand = [j2, jogi];
    s = settle(runTask(s, { kind: 'enterBattle', player: 0, iid: jogi }), true, (c) => (c.includes(j2) ? [j2] : c.slice(0, 1)), (o) => (expect(o.length).toBe(2), 1));
    expect(zone(s, foe)).toBe('graveyard');
    expect(s.players[0].zones.hand.length).toBe(1);
  });

  it('ケシカス：出た時の能力を持たない相手のクリーチャー・自分のクリーチャーでは聞かない', () => {
    let s = newGame();
    put(s, 0, C.keshi.id, 'battle');
    s = runTask(s, { kind: 'enterBattle', player: 1, iid: put(s, 1, C.small.id, 'hand') });
    expect(s.pending).toBeFalsy();
    s = runTask(s, { kind: 'enterBattle', player: 0, iid: put(s, 0, C.cip.id, 'hand') });
    expect(s.pending?.kind === 'confirm').toBeFalsy();
  });
});

