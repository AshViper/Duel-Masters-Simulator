// 保存済みカードで手動だった能力のテスト（ツインパクトの名前、「このカードを出す」、一番パワーが小さい、バトルに勝った時など）
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { effectiveCost, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { applyParsedEffects, convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type F = { name: string; type: string; race?: string; civilization?: string; cost: string; power?: string; abilities: string[] };
const face = (f: F) => ({ ...base, race: '', civilization: '火', power: '', ...f });
const mk = (id: string, ...faces: F[]) => convertOfficialCard({ id, detailUrl: '', faces: faces.map(face) });

const TWIN = 'ボルメテウス・イエロー / ボルメテウス・スパーク';
const C = {
  twin: mk('s-twin', { name: TWIN, type: 'クリーチャー', race: 'ドラゴン', cost: '2', power: '2000', abilities: ['W・ブレイカー'] }, { name: TWIN, type: '呪文', cost: '1', abilities: ['相手のクリーチャーをすべてタップする。', 'このカードを出す。'] }),
  lowest: mk('s-low', { name: '最小破壊', type: '呪文', cost: '1', abilities: ['相手の、パワーが一番小さいクリーチャーをすべて破壊する。'] }),
  below: mk('s-below', { name: 'より小さい', type: 'クリーチャー', race: 'テスト', cost: '1', power: '5000', abilities: ['このクリーチャーが出た時、このクリーチャーよりパワーが小さい相手のクリーチャーをすべて破壊する。'] }),
  winDraw: mk('s-win', { name: '勝てば引く', type: 'クリーチャー', race: 'テスト', cost: '1', power: '1000', abilities: ['自分のクリーチャーがバトルに勝った時、カードを１枚引いてもよい。'] }),
  ultra: mk('s-ultra', { name: '守り手', type: 'クリーチャー', race: 'テスト', cost: '1', power: '1000', abilities: ['ウルトラ・セイバー：名前に《ボルメテウス》とあるクリーチャー（…）'] }),
  cond: mk('s-cond', { name: '多色で安い', type: 'クリーチャー', race: 'テスト', cost: '7', power: '7000', abilities: ['相手のマナゾーンに多色カードがあれば、このクリーチャーの召喚コストを３少なくする。'] }),
  reanimate: mk('s-rean', { name: '蘇生してブロッカー', type: '呪文', cost: '1', abilities: ['コスト８以下のクリーチャーを１体、自分の墓地から出す。次の自分のターンのはじめまで、そのクリーチャーに「ブロッカー」を与える。'] }),
  small: mk('s-s', { name: '小型', type: 'クリーチャー', race: 'テスト', cost: '1', power: '2000', abilities: [] }),
  mid: mk('s-m', { name: '中型', type: 'クリーチャー', race: 'テスト', cost: '1', power: '4000', abilities: [] }),
  big: mk('s-b', { name: '大型', type: 'クリーチャー', race: 'テスト', cost: '1', power: '9000', abilities: [] }),
  multi: mk('s-multi', { name: '多色', type: 'クリーチャー', race: 'テスト', civilization: '火/水', cost: '1', power: '1000', abilities: [] }),
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
const mana = (s: GameState, p: PlayerId, n: number) => {
  for (let i = 0; i < n; i++) put(s, p, C.small.id, 'mana');
};
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 3, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.name, c.support]).toEqual([c.name, 'full']);
  });
  it('ツインパクトの「A / B」の名前を分け、ハイパー化と取り違えない（保存済みのカードも直す）', () => {
    expect(C.twin.name).toBe('ボルメテウス・イエロー');
    expect(C.twin.twin?.name).toBe('ボルメテウス・スパーク');
    expect(C.twin.hyperText).toBeUndefined();
    // 以前の版の保存データ：両面とも「A / B」
    const old = applyParsedEffects({ ...C.twin, name: TWIN, twin: { ...C.twin.twin!, name: TWIN }, hyperText: undefined });
    expect([old.name, old.twin?.name, old.hyperText]).toEqual(['ボルメテウス・イエロー', 'ボルメテウス・スパーク', undefined]);
  });
  it('ウルトラ・セイバー', () => {
    expect(C.ultra.replacements).toEqual([{ event: 'leaveBattle', subject: 'otherOwn', filter: { nameIncludes: 'ボルメテウス' }, instead: 'destroySelf', optional: true }]);
  });
  it('次の、相手のターンの終わりまで', () => {
    expect(parseAbilityText('このクリーチャーが出た時、次の、相手のターンの終わりまで、相手は呪文を唱えられない。', 'creature').manualLines).toEqual([]);
  });
});

describe('エンジンで動く', () => {
  it('ツインパクトの呪文側「このカードを出す」：唱えた後、このカードがクリーチャーとして出る', () => {
    let s = newGame();
    const opp = put(s, 1, C.big.id, 'battle');
    const t = put(s, 0, C.twin.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: t, side: 'twin' });
    expect(s.cards[opp].tapped).toBe(true);
    expect(s.cards[t].zone).toBe('battle');
  });

  it('相手の、パワーが一番小さいクリーチャーをすべて破壊する', () => {
    let s = newGame();
    const a = put(s, 1, C.small.id, 'battle');
    const b = put(s, 1, C.small.id, 'battle');
    const c = put(s, 1, C.big.id, 'battle');
    const sp = put(s, 0, C.lowest.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect([s.cards[a].zone, s.cards[b].zone, s.cards[c].zone]).toEqual(['graveyard', 'graveyard', 'battle']);
  });

  it('このクリーチャーよりパワーが小さい相手のクリーチャーをすべて破壊する', () => {
    let s = newGame();
    const a = put(s, 1, C.mid.id, 'battle');
    const c = put(s, 1, C.big.id, 'battle');
    const k = put(s, 0, C.below.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: k });
    expect([s.cards[a].zone, s.cards[c].zone]).toEqual(['graveyard', 'battle']);
  });

  it('自分のクリーチャーがバトルに勝った時、カードを1枚引いてもよい', () => {
    let s = newGame();
    put(s, 0, C.winDraw.id, 'battle');
    const atk = put(s, 0, C.big.id, 'battle');
    const def_ = put(s, 1, C.small.id, 'battle');
    s.cards[def_].tapped = true;
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'creature', iid: def_ } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.pending).toMatchObject({ kind: 'confirm' });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
  });

  it('相手のマナゾーンに多色カードがあれば、召喚コストを3少なくする', () => {
    const s = newGame();
    const c = put(s, 0, C.cond.id, 'hand');
    expect(effectiveCost(s, reg, 0, c)).toBe(7);
    put(s, 1, C.multi.id, 'mana');
    expect(effectiveCost(s, reg, 0, c)).toBe(4);
  });

  it('墓地から出したクリーチャーに、次の自分のターンのはじめまで「ブロッカー」を与える', () => {
    let s = newGame();
    const dead = put(s, 0, C.big.id, 'graveyard');
    const sp = put(s, 0, C.reanimate.id, 'hand');
    mana(s, 0, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [dead] });
    expect(s.cards[dead].zone).toBe('battle');
    expect(keywords(s, reg, dead).blocker).toBe(true);
  });
});
