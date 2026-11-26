// 魔導具デッキの能力：無月の門（重ねて召喚）、虚無月の門、無月の門・絶、墓地から出る・召喚する魔導具、卍 新世壊 卍 など
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { canSummonFromZone, effectiveCost, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: o.race ?? 'マフィ・ギャング/魔導具', civilization: o.civ ?? '闇', type: o.type ?? 'クリーチャー', power: o.power ?? '2000', cost: o.cost ?? '2', abilities }],
  });

const GATE = '無月の門：自分の魔導具をバトルゾーンに出した時、自分の魔導具をバトルゾーンと墓地から２つずつ選び、このクリーチャーを自分の手札または墓地からそれら４枚の上にコストを支払わずに召喚してもよい。';
const C = {
  madogu: mk('md-1', []),
  madoguSpell: mk('md-2', ['カードを１枚引く。'], { type: '呪文', power: '', civ: '水', race: '魔導具' }),
  other: mk('md-3', [], { race: 'テスト', civ: '火', power: '3000', cost: '1' }),
  deSuzak: mk('md-10', [GATE, 'W・ブレイカー', 'このクリーチャーの下に４枚以上カードがあれば、相手のクリーチャーはタップしてバトルゾーンに出る。'], { race: 'マスター・ドルスザク/マフィ・ギャング', cost: '8', power: '9000' }),
  giRugirin: mk('md-11', ['虚無月の門：自分の魔導具呪文を唱えた時、自分の魔導具をバトルゾーンと墓地から合計４枚選び、このクリーチャーを自分の手札または墓地からそれら４枚の上にコストを支払わずに召喚してもよい。', 'W・ブレイカー', '自分のクリーチャーはブロックされない。'], { race: 'ムートピア/ドルスザク', civ: '水', cost: '8', power: '9000' }),
  gaRyuzak: mk('md-12', ['無月の門・絶：各ターンの終わりに、自分の魔導具をバトルゾーンまたは墓地から合計６つ選び、このクリーチャーを自分の手札または墓地からそれら６枚の上にコストを支払わずに召喚してもよい。', 'W・ブレイカー'], { race: 'マスター・ドルスザク', cost: '9', power: '11000' }),
  duBel: mk('md-13', ['自分の魔導具クリーチャーを召喚した時または魔導具を持つ呪文を唱えた時、このクリーチャーを自分の墓地からバトルゾーンに出してもよい。'], { power: '1000' }),
  voMira: mk('md-14', ['このクリーチャーがバトルゾーンに出た時、自分の山札の上から３枚を墓地に置いてもよい。', '自分のターンに一度、魔導具クリーチャーを１体、自分の墓地から召喚してもよい。'], { cost: '4', power: '4000' }),
  voGaiga: mk('md-15', ['自分の魔導具クリーチャーを召喚するコストを１少なくする。ただし、コストは０以下にならない。'], { cost: '4', power: '4000' }),
  duGlass: mk('md-16', ['ブロッカー', 'このクリーチャーが攻撃する時、攻撃の後、このクリーチャーを破壊する。']),
  duShiza: mk('md-17', ['このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを１体選ぶ。そのターン、そのクリーチャーのパワーを?2000する。（パワー０以下のクリーチャーは破壊される）'], { power: '1000' }),
  shinsekai: mk('md-18', ['自分の魔導具呪文を唱えた時、唱えた後で墓地に置くかわりに、このフィールドの下に置いてカードを１枚引いてもよい。', '自分の魔導具呪文またはドルスザク呪文を唱えられなくする能力を無視する。', '無月の門99：自分のターンの終わりに、このフィールドの下に４枚以上カードがあれば、ゲーム中で一度、水のコスト99以下の呪文を１枚、自分の手札または墓地からコストを支払わずに唱えてもよい。'], { type: '無月フィールド', power: '', race: '', civ: '水' }),
  airvo: mk('md-19', ['S・トリガー', 'バトルゾーンにある、コスト７以下のカードを１枚選び、持ち主の手札に戻す。'], { type: '呪文', power: '', civ: '水', race: '魔導具', cost: '4' }),
  noSpell: mk('md-20', ['相手は呪文を唱えられない。'], { race: 'テスト' }),
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
const mana = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) put(s, 0, i % 2 ? C.madoguSpell.id : C.madogu.id, 'mana');
};
const play = (s: GameState, iid: string, m = 2) => {
  mana(s, m);
  return act(s, { type: 'PLAY_CARD', player: 0, iid });
};

describe('読み取り', () => {
  it('魔導具デッキの主なカードがすべて自動になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
});

describe('無月の門', () => {
  it('魔導具を出した時、バトルゾーンと墓地から2つずつ選んで、その上に手札から召喚する', () => {
    let s = newGame();
    const b1 = put(s, 0, C.madogu.id, 'battle');
    const g1 = put(s, 0, C.madogu.id, 'graveyard');
    const g2 = put(s, 0, C.madoguSpell.id, 'graveyard');
    const g3 = put(s, 0, C.madogu.id, 'graveyard');
    const de = put(s, 0, C.deSuzak.id, 'hand');
    const nw = put(s, 0, C.madogu.id, 'hand');
    s = play(s, nw);
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    // バトルゾーンの魔導具はちょうど2つなので自動、墓地は3枚から2枚を選ぶ
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 2, max: 2 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [g1, g2] });
    // 出た時の「相手のクリーチャーを1体破壊する」は相手のクリーチャーがいないので何もしない
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true, selected: [] });
    expect(s.cards[de].zone).toBe('battle');
    expect([...s.cards[de].under].sort()).toEqual([b1, nw, g1, g2].sort());
    expect(s.cards[g3].zone).toBe('graveyard');
    // 下に4枚以上：相手のクリーチャーはタップして出る
    const o = put(s, 1, C.other.id, 'battle');
    expect(s.cards[o].tapped).toBe(true);
  });

  it('素材が足りなければ聞かれない', () => {
    let s = newGame();
    put(s, 0, C.deSuzak.id, 'hand');
    put(s, 0, C.madogu.id, 'graveyard');
    s = play(s, put(s, 0, C.madogu.id, 'hand'));
    expect(s.pending).toBeFalsy();
  });

  it('虚無月の門：魔導具呪文を唱えた時、合計4枚の上に墓地から召喚する', () => {
    let s = newGame();
    const gi = put(s, 0, C.giRugirin.id, 'graveyard');
    put(s, 0, C.madogu.id, 'battle');
    put(s, 0, C.madogu.id, 'battle');
    put(s, 0, C.madogu.id, 'graveyard');
    s = play(s, put(s, 0, C.madoguSpell.id, 'hand'));
    // 唱えた呪文が墓地に置かれる前に誘発を解決する：候補は3枚（呪文は唱えている間は手札）→ 呪文を解決してから墓地へ
    for (let i = 0; i < 6 && s.pending; i++) s = act(s, { type: 'RESPOND', player: 0, accept: true, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min) : undefined });
    expect(s.cards[gi].zone).toBe('battle');
    expect(s.cards[gi].under).toHaveLength(4);
  });

  it('無月の門・絶：ターンの終わりに合計6つ', () => {
    let s = newGame();
    const ga = put(s, 0, C.gaRyuzak.id, 'hand');
    for (let i = 0; i < 3; i++) put(s, 0, C.madogu.id, 'battle');
    for (let i = 0; i < 3; i++) put(s, 0, C.madogu.id, 'graveyard');
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[ga].zone).toBe('battle');
    expect(s.cards[ga].under).toHaveLength(6);
  });
});

describe('魔導具の仲間', () => {
  it('ドゥベル：魔導具クリーチャーを召喚した時、墓地から出てもよい', () => {
    let s = newGame();
    const db = put(s, 0, C.duBel.id, 'graveyard');
    s = play(s, put(s, 0, C.madogu.id, 'hand'));
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[db].zone).toBe('battle');
  });
  it('ヴォーミラ：自分のターンに一度、魔導具クリーチャーを墓地から召喚できる', () => {
    let s = newGame();
    put(s, 0, C.voMira.id, 'battle');
    const g1 = put(s, 0, C.madogu.id, 'graveyard');
    const g2 = put(s, 0, C.madogu.id, 'graveyard');
    const og = put(s, 0, C.other.id, 'graveyard');
    expect(canSummonFromZone(s, reg, 0, g1)).toBe(true);
    expect(canSummonFromZone(s, reg, 0, og)).toBe(false);
    s = play(s, g1, 4);
    expect(s.cards[g1].zone).toBe('battle');
    expect(canSummonFromZone(s, reg, 0, g2)).toBe(false);
  });
  it('ヴォガイガ：魔導具クリーチャーの召喚コストが1少なくなる', () => {
    const s = newGame();
    put(s, 0, C.voGaiga.id, 'battle');
    expect(effectiveCost(s, reg, 0, put(s, 0, C.madogu.id, 'hand'))).toBe(1);
    expect(effectiveCost(s, reg, 0, put(s, 0, C.other.id, 'hand'))).toBe(1);
    expect(effectiveCost(s, reg, 0, put(s, 0, C.deSuzak.id, 'hand'))).toBe(8);
  });
  it('ドゥシーザ：公式テキストの「?2000」を-2000として読む', () => {
    expect(C.duShiza.abilities?.[0].effects).toContainEqual(expect.objectContaining({ type: 'powerMod', amount: -2000 }));
    let s = newGame();
    const o = put(s, 1, C.madogu.id, 'battle');
    const big = put(s, 1, C.other.id, 'battle');
    s = play(s, put(s, 0, C.duShiza.id, 'hand'));
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [o] });
    expect(s.cards[o].zone).toBe('graveyard');
    expect(power(s, reg, big)).toBe(3000);
  });
  it('ドゥグラス：攻撃の後に破壊される', () => {
    expect(C.duGlass.abilities?.[0]).toMatchObject({ when: 'onAttackEnd' });
  });
  it('エアヴォ：バトルゾーンのコスト7以下のカード（エレメント）を手札に戻す', () => {
    let s = newGame();
    const o = put(s, 1, C.other.id, 'battle');
    s = play(s, put(s, 0, C.airvo.id, 'hand'), 4);
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [o] });
    expect(s.cards[o].zone).toBe('hand');
  });
});

describe('卍 新世壊 卍', () => {
  it('魔導具呪文を唱えた後、墓地のかわりに下に置いて1枚引いてもよい', () => {
    let s = newGame();
    const f = put(s, 0, C.shinsekai.id, 'battle');
    const sp = put(s, 0, C.madoguSpell.id, 'hand');
    s = play(s, sp);
    const hand = s.players[0].zones.hand.length;
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[f].under).toEqual([sp]);
    // 唱えている間は手札にあるので、下に置いた分と引いた分で差し引き0
    expect(s.players[0].zones.hand.length).toBe(hand);
  });
  it('魔導具呪文を唱えられなくする効果を無視する', () => {
    const s = newGame();
    put(s, 1, C.noSpell.id, 'battle');
    const sp = put(s, 0, C.madoguSpell.id, 'hand');
    const plain = put(s, 0, C.other.id, 'hand');
    mana(s, 3);
    put(s, 0, C.shinsekai.id, 'battle');
    expect(() => act(s, { type: 'PLAY_CARD', player: 0, iid: sp })).not.toThrow();
    expect(plain).toBeTruthy();
  });
  it('無月の門99：自分のターンの終わりに、下に4枚以上あればゲーム中で一度だけ', () => {
    expect(C.shinsekai.abilities?.find((a) => a.oncePerGame)).toMatchObject({ when: 'onTurnEnd', condition: { type: 'underCount', min: 4 }, optional: true });
  });
});
