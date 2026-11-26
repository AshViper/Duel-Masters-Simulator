// 呪文主体のデッキ（シャコガイルなど）のカードが、能力テキストから自動で処理されることのテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const face = { packName: '(T 1/1)', imageUrl: '', civilization: '水', rarity: 'C', mana: '1', race: '', illustrator: '', flavor: '', cost: '1' };
const spell = (id: string, name: string, abilities: string[]) => convertOfficialCard({ id, detailUrl: '', faces: [{ ...face, name, type: '呪文', power: '', abilities }] });

const CARDS = {
  darts: spell('d-1', 'ダーツ', ['自分のシールドを１枚相手に選ばせ、見る。それが呪文であればコストを支払わずにすぐ唱えてもよい 。唱えない場合やそのカードが呪文でない場合、元の場所に戻す。']),
  life: spell('d-2', 'ライフ', ['S(シールド)・トリガー(この呪文をシールドゾーンから手札に加えるとき、コストを支払わずにすぐ唱えてよい)\n\n自分の山札の上から１枚目を、自分のマナゾーンに置く。']),
  storm: spell('d-3', 'ストーム', ['カードを３枚まで引く。その後、自分の手札を２枚、好きな順序で自分の山札の上に置く。']),
  cube: spell('d-4', 'キューブ', ['S(シールド)・トリガー(このカードをシールドゾーンから手札に戻すとき、コストを支払わずにすぐに使ってよい。)\n\n自分の山札から呪文を１枚さがして相手に見せ、自分の手札に加える。そのあと、山札をシャッフルする。']),
  shaper: spell('d-5', 'シェイパー', ['自分の山札のカードを、上から４枚表向きにする。その中の水のカードをすべて自分の手札に加え、それ以外のカードを自分の墓地に置く。']),
  energy: spell('d-6', 'ライト', ['カードを２枚引く。']),
  cyber: spell('d-7', 'サイバー', ['S(シールド)・トリガー(このカードをシールドゾーンから手札に戻すとき、コストを支払わずにすぐ使ってよい。)\n\n自分の山札からカードを３枚まで引く。']),
  shower: spell('d-8', 'シャワー', ['マナゾーンに置く時、このカードはタップして置く。', 'S・トリガー（この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい）', '自分の山札の上から２枚を見る。そのうちの１枚を自分の手札に加え、もう１枚をマナゾーンに置く。']),
  door: spell('d-9', '扉', ['マナゾーンに置く時、このカードはタップして置く。\n\nS・トリガー\n\n自分の山札の上から４枚を表向きにする。その中から進化クリーチャー以外のクリーチャーを１体相手に選ばせ、バトルゾーンに出す。残りを好きな順序で自分の山札の一番下に戻す。']),
  hogan: spell('d-10', 'ブラスター', ['S・トリガー(この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい)\n\n自分の山札をシャッフルし、上から１枚目をすべてのプレイヤーに見せる。そのカードがクリーチャーであれば、バトルゾーンに出してもよい。呪文であれば、コストを支払わずに唱えてもよい。']),
  mystery: spell('d-11', 'ミステリー', ['S・トリガー（この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい）', '自分の山札をシャッフルし、その後、上から１枚目をすべてのプレイヤーに見せる。そのカードがクリーチャーであれば、それをバトルゾーンに出してもよい。クリーチャーでなければ、自分のマナゾーンに置く。']),
  coral: spell('d-12', '仙樹', ['カードを３枚引く。その後、自分の手札にあるカードの枚数以下のコストを持つ水のカードを１枚選んでもよい。そうしたら、そのカードを自分の手札からコストを支払わずに使う。']),
  shako: convertOfficialCard({
    id: 'd-13',
    detailUrl: '',
    faces: [{ ...face, name: 'シャコ', type: 'クリーチャー', power: '13000', abilities: ['T・ブレイカー', 'このクリーチャーがバトルゾーンに出た時、自分の墓地にあるカードをすべて山札に加え、シャッフルする。', '相手のターンのはじめに、カードを５枚引き、その後、自分の手札を３枚捨てる。', '自分の山札の最後の１枚を引く時、ゲームに負けるかわりに勝つ。'] }],
  }),
  odd: convertOfficialCard({ id: 'd-14', detailUrl: '', faces: [{ ...face, name: '謎', type: 'クリーチャー', power: '1000', abilities: ['このクリーチャーが出た時、相手の手札を見る。'] }] }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(CARDS)]);
const filler = Array.from({ length: 40 }, () => 'S01-043'); // 自然のクリーチャー

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);
/** 水のマナを置いて呪文を唱える */
function cast(s: GameState, cardId: string): { s: GameState; iid: string } {
  const iid = put(s, 0, cardId, 'hand');
  put(s, 0, 'S01-011', 'mana');
  return { s: act(s, { type: 'PLAY_CARD', player: 0, iid }), iid };
}

describe('デッキのカードがすべて自動処理になる', () => {
  it('対応状況', () => {
    for (const c of Object.values(CARDS)) if (c.id !== 'dm:d-14') expect([c.name, c.support]).toEqual([c.name, 'full']);
    expect(CARDS.odd.support).toBe('manual');
  });

  it('カードを3枚まで引き、手札を2枚山札の上に置く', () => {
    let { s } = cast(newGame(), 'dm:d-3');
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['3枚引く', '2枚引く', '1枚引く', '0枚引く'] });
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'RESPOND', player: 0, selected: ['1'] }); // 2枚
    expect(s.players[0].zones.hand).toHaveLength(hand + 2);
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 2, max: 2 });
    const back = s.players[0].zones.hand.slice(0, 2);
    s = act(s, { type: 'RESPOND', player: 0, selected: back });
    expect(s.players[0].zones.deck.slice(-2).sort()).toEqual([...back].sort());
  });

  it('山札から呪文を探す・山札の上4枚の水のカードをすべて手札に', () => {
    let s = newGame();
    const target = put(s, 0, 'dm:d-6', 'deck');
    s.players[0].zones.deck.unshift(...s.players[0].zones.deck.splice(s.players[0].zones.deck.indexOf(target), 1)); // 山札の一番下へ
    ({ s } = cast(s, 'dm:d-4'));
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [target] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('hand');

    s = newGame();
    const w1 = put(s, 0, 'S01-011', 'deck');
    const w2 = put(s, 0, 'S01-012', 'deck');
    ({ s } = cast(s, 'dm:d-5'));
    expect(s.pending).toBeNull();
    expect(s.cards[w1].zone).toBe('hand');
    expect(s.cards[w2].zone).toBe('hand');
    expect(s.players[0].zones.graveyard.filter((x) => s.cards[x].cardId === 'S01-043')).toHaveLength(2);
  });

  it('山札の上2枚：1枚を手札、もう1枚をマナ。この呪文はマナにタップして置かれる', () => {
    let { s } = cast(newGame(), 'dm:d-8');
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 1, max: 1 });
    const [a] = (s.pending as { candidates: string[] }).candidates;
    s = act(s, { type: 'RESPOND', player: 0, selected: [a] });
    expect(s.cards[a].zone).toBe('hand');
    const m = put(s, 0, 'dm:d-8', 'mana');
    expect(s.cards[m].tapped).toBe(true);
  });

  it('山札の上4枚から相手が選んだクリーチャーを出す', () => {
    let { s } = cast(newGame(), 'dm:d-9');
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1, min: 1, max: 1 });
    const pick = (s.pending as { candidates: string[] }).candidates[0];
    s = act(s, { type: 'RESPOND', player: 1, selected: [pick] });
    expect(s.cards[pick].zone).toBe('battle');
  });

  it('シャッフルして公開：クリーチャーなら出してもよい', () => {
    let { s } = cast(newGame(), 'dm:d-11');
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    const top = s.players[0].zones.deck[s.players[0].zones.deck.length - 1];
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[top].zone).toBe('battle');
  });

  it('ラッキー・ダーツ：相手が選んだシールドが呪文なら唱えられる', () => {
    let s = newGame();
    const sh = put(s, 0, 'dm:d-6', 'shield');
    ({ s } = cast(s, 'dm:d-1'));
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [sh] });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 0 });
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[sh].zone).toBe('graveyard');
    // 2枚引き、解決を終えたダーツ自身が手札から墓地へ
    expect(s.players[0].zones.hand).toHaveLength(hand + 2 - 1);
  });

  it('仙樹：3枚引いて、手札の枚数以下のコストの水のカードをタダで使う', () => {
    let s = newGame();
    const free = put(s, 0, 'S01-014', 'hand'); // 水・コスト4
    ({ s } = cast(s, 'dm:d-12'));
    expect(s.pending).toMatchObject({ kind: 'selectCards', min: 0, max: 1 });
    expect((s.pending as { candidates: string[] }).candidates).toContain(free);
    s = act(s, { type: 'RESPOND', player: 0, selected: [free] });
    expect(s.cards[free].zone).toBe('battle');
  });

  it('シャコガイル：相手のターンのはじめに5枚引いて3枚捨てる。山札の最後の1枚を引いたら勝つ', () => {
    let s = newGame();
    put(s, 0, 'dm:d-13', 'battle');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, min: 3, max: 3 });
    s = act(s, { type: 'RESPOND', player: 0, selected: s.players[0].zones.hand.slice(0, 3) });
    expect(s.players[0].zones.hand).toHaveLength(hand + 2);

    s = newGame();
    put(s, 0, 'dm:d-13', 'battle');
    s.players[0].zones.deck.splice(0, s.players[0].zones.deck.length - 3);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.winner).toBe(0);
  });

  it('自動処理できない能力は判断パネルで手動処理するまで止まる', () => {
    let s = newGame();
    const c = put(s, 0, 'dm:d-14', 'hand');
    put(s, 0, 'S01-011', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.pending).toMatchObject({ kind: 'manualStep', player: 0, source: c, text: expect.stringContaining('相手の手札を見る') });
    // 止まっている間も手動操作はできる
    s = act(s, { type: 'MANUAL_DRAW', player: 0, target: 0 });
    expect(s.pending?.kind).toBe('manualStep');
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.pending).toBeNull();
  });
});
