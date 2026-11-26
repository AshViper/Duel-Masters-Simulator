// 「ドキンダム」デッキ（侵略・S級侵略・ドキンダムエリア）で手動だった能力のテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { battleCards, canPlay, def, isIgnored, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type F = { name: string; type: string; race: string; civilization: string; cost: string; power: string; abilities: string[] };
const mk = (id: string, f: F) => convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, ...f }] });

const C = {
  zet: mk('d-zet', { name: '轟速 ザ・ゼット', type: 'クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '4', power: '7000', abilities: ['スピードアタッカー（このクリーチャーは召喚酔いしない）', 'W・ブレイカー（このクリーチャーはシールドを２つブレイクする）', '自分のターンの終わりに、そのターンこのクリーチャーが攻撃していたら、破壊する。'] }),
  mach: mk('d-mach', { name: '轟速 ザ・マッハ', type: 'クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '5', power: '5000', abilities: ['スピードアタッカー', 'このクリーチャーがバトルゾーンに出た時、自分の山札の上から４枚を表向きにする。その中から進化クリーチャーを１体、自分の手札に加えてもよい。残りを好きな順序で山札の一番下に置く。'] }),
  redzone: mk('d-rz', { name: '轟く侵略 レッドゾーン', type: '進化クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '6', power: '12000', abilities: ['進化-自分の火のクリーチャー１体の上に置く。', '侵略-火のコマンド（自分の火のコマンドが攻撃する時、自分の手札にあるこのクリーチャーをその上に重ねてもよい）', 'T・ブレイカー', 'このクリーチャーがバトルゾーンに出た時、一番パワーが大きい相手のクリーチャーをすべて破壊する。'] }),
  redzoneZ: mk('d-rzz', { name: '熱き侵略 レッドゾーンZ', type: '進化クリーチャー', race: 'ソニック・コマンド/侵略者', civilization: '火', cost: '6', power: '11000', abilities: ['進化―自分の火のクリーチャー１体の上に置く。', '侵略―火のコマンド（自分の火のコマンドが攻撃する時、自分の手札にあるこのクリーチャーをその上に重ねてもよい）', 'W・ブレイカー', 'このクリーチャーを進化ではないクリーチャーの上に置いた時、相手のシールドをひとつ選び、持ち主の墓地に置く。'] }),
  redzoneX: mk('d-rzx', { name: '禁断の轟速 レッドゾーンX', type: '進化クリーチャー', race: 'ソニック・コマンド/S級侵略者/イニシャルズ', civilization: '闇/火', cost: '6', power: '8000', abilities: ['進化―自分の闇または火のクリーチャー１体の上に置く。', 'S級侵略 [轟速]―闇または火のコマンド（自分の闇または火のコマンドが攻撃する時、自分の手札か墓地、またはバトルゾーンにあるこのクリーチャーをその上に重ねてもよい）', 'W・ブレイカー', 'このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを１体選び、相手はそれに封印をひとつ付ける。（…）'] }),
  kizamu: mk('d-kz', { name: '禁断V キザム', type: 'クリーチャー', race: 'ソニック・コマンド/イニシャルズ', civilization: '闇/火', cost: '7', power: '3000', abilities: ['S・トリガー', 'このクリーチャーがバトルゾーンに出た時、バトルゾーンにある相手のクリーチャーを１体選んでもよい。このクリーチャーとその選んだクリーチャーをバトルさせる。'] }),
  dolhakaba: mk('d-dh', { name: '終断Δ ドルハカバ', type: 'クリーチャー', race: 'ソニック・コマンド/イニシャルズX', civilization: '闇/火', cost: '5', power: '3000', abilities: ['スピードアタッカー', 'バトルゾーンに自分のフィールドがあれば、このクリーチャーを自分の墓地から召喚してもよい。'] }),
  area: mk('d-area', { name: 'Dの禁断 ドキンダムエリア', type: 'D2フィールド', race: '', civilization: '闇', cost: '5', power: '', abilities: ['自分のクリーチャーがバトルゾーンを離れる時、かわりにそのクリーチャーに封印を付ける。（…）（他のD２フィールドがバトルゾーンに出た時、このD２フィールドを自分の墓地に置く）**', 'Dスイッチ：自分のターンのはじめに、このD２フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、自分の封印を６枚まで墓地に置いてもよい。'] }),
  area2: mk('d-area2', { name: '別のD2フィールド', type: 'D2フィールド', race: '', civilization: '闇', cost: '1', power: '', abilities: [] }),
  dark: mk('d-dark', { name: '闇のマナ', type: 'クリーチャー', race: 'テスト', civilization: '闇', cost: '1', power: '1000', abilities: [] }),
  small: mk('d-s', { name: '小型', type: 'クリーチャー', race: 'テスト', civilization: '火', cost: '1', power: '2000', abilities: [] }),
  big: mk('d-b', { name: '大型', type: 'クリーチャー', race: 'テスト', civilization: '自然', cost: '1', power: '9000', abilities: [] }),
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
/** 山札の一番上に置く */
function onTop(s: GameState, player: PlayerId, cardId: string): string {
  const iid = put(s, player, cardId, 'deck');
  const d = s.players[player].zones.deck;
  d.splice(d.indexOf(iid), 1);
  d.push(iid);
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const mana = (s: GameState, p: PlayerId, n: number) => {
  // 闇と火を交互に置く
  for (let i = 0; i < n; i++) put(s, p, i % 2 ? C.small.id : C.dark.id, 'mana');
};
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('デッキのカードはすべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.name, c.support]).toEqual([c.name, 'full']);
    expect(C.area.type).toBe('field');
    expect(C.redzoneX.attackSwap).toMatchObject({ kind: 'invasion', zones: ['graveyard', 'battle'] });
    expect(C.redzone.attackSwap).toMatchObject({ kind: 'invasion' });
  });
});

describe('エンジンで動く', () => {
  it('ザ・ゼット：攻撃したターンの終わりに破壊される（攻撃しなければ残る）', () => {
    let s = newGame();
    const z = put(s, 0, C.zet.id, 'battle');
    const z2 = put(s, 0, C.zet.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: z, target: { kind: 'player' } });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min) : [], accept: false });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[z].zone).toBe('graveyard');
    expect(s.cards[z2].zone).toBe('battle');
  });

  it('レッドゾーン：一番パワーが大きい相手のクリーチャーをすべて破壊する（同じパワーなら両方）', () => {
    let s = newGame();
    const b1 = put(s, 1, C.big.id, 'battle');
    const b2 = put(s, 1, C.big.id, 'battle');
    const sm = put(s, 1, C.small.id, 'battle');
    const base = put(s, 0, C.small.id, 'battle');
    const rz = put(s, 0, C.redzone.id, 'hand');
    mana(s, 0, 6);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: rz, evolveOn: base });
    expect([s.cards[b1].zone, s.cards[b2].zone, s.cards[sm].zone]).toEqual(['graveyard', 'graveyard', 'battle']);
  });

  it('レッドゾーンZ：進化ではないクリーチャーの上に置いた時だけ、相手のシールドを1つ墓地に置く', () => {
    let s = newGame();
    const base = put(s, 0, C.small.id, 'battle');
    const z = put(s, 0, C.redzoneZ.id, 'hand');
    mana(s, 0, 6);
    const shields = s.players[1].zones.shield.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: z, evolveOn: base });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [s.pending.candidates[0]] });
    expect(s.players[1].zones.shield.length).toBe(shields - 1);
    // 進化クリーチャーの上に置いた時は何もしない
    const z2 = put(s, 0, C.redzoneZ.id, 'hand');
    mana(s, 0, 6);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: z2, evolveOn: z });
    expect(s.players[1].zones.shield.length).toBe(shields - 1);
  });

  it('ザ・マッハ：山札の上4枚から進化クリーチャーだけを手札に加えられる', () => {
    let s = newGame();
    const evo = onTop(s, 0, C.redzone.id);
    onTop(s, 0, C.small.id);
    const m = put(s, 0, C.mach.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: m });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [evo] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [evo] });
    expect(s.cards[evo].zone).toBe('hand');
  });

  it('キザム：相手のクリーチャーとバトルさせる', () => {
    let s = newGame();
    const target = put(s, 1, C.small.id, 'battle');
    const k = put(s, 0, C.kizamu.id, 'hand');
    mana(s, 0, 7);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: k });
    if (s.pending?.kind === 'confirm') s = act(s, { type: 'RESPOND', player: 0, accept: true });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('graveyard');
    expect(s.cards[k].zone).toBe('battle');
  });

  it('ドキンダムエリア：フィールドはクリーチャーではなく、自分のクリーチャーは離れるかわりに封印される', () => {
    let s = newGame();
    const area = put(s, 0, C.area.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: area });
    expect(s.cards[area].zone).toBe('battle');
    expect(battleCards(s, reg, 0)).not.toContain(area);
    const c = put(s, 0, C.small.id, 'battle');
    s.queue.push({ kind: 'leave', iid: c, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    expect(s.cards[c].zone).toBe('battle');
    expect(s.cards[c].seals).toHaveLength(1);
    expect(isIgnored(s, reg, c)).toBe(true);
    // 新しいD2フィールドが出ると、前のものは墓地へ
    const a2 = put(s, 0, C.area2.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: a2 });
    expect(s.cards[area].zone).toBe('graveyard');
    expect(s.cards[a2].zone).toBe('battle');
  });

  it('Dスイッチ：自分のターンのはじめに、選んだカードの封印を外す（ゲーム中に一度）', () => {
    let s = newGame();
    const area = put(s, 0, C.area.id, 'battle');
    const c = put(s, 0, C.small.id, 'battle');
    const ctx = new Ctx(s, reg);
    ctx.sealCard(c);
    ctx.sealCard(c);
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.pending).toMatchObject({ kind: 'confirm', source: area });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [c] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [c] });
    expect(s.cards[c].seals ?? []).toHaveLength(0);
    expect(isIgnored(s, reg, c)).toBe(false);
    // 2回目は聞かれない
    new Ctx(s, reg).sealCard(c);
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.pending).toBeNull();
  });

  it('ドルハカバ：自分のフィールドがあれば墓地から召喚できる', () => {
    let s = newGame();
    const d = put(s, 0, C.dolhakaba.id, 'graveyard');
    mana(s, 0, 5);
    expect(canPlay(s, reg, 0, d)).toBe(false);
    put(s, 0, C.area.id, 'battle');
    expect(canPlay(s, reg, 0, d)).toBe(true);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: d });
    expect(s.cards[d].zone).toBe('battle');
    expect(power(s, reg, d)).toBe(3000);
    expect(def(s, reg, d).name).toBe('終断Δ ドルハカバ');
  });
});
