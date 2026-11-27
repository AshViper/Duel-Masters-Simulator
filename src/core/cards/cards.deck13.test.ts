// 13種類のカード（ウラギリダムス・ブラキオ龍樹など）で足した読み取りと処理
import { describe, expect, it } from 'vitest';
import { Ctx } from '../engine/engine';
import { createGame } from '../engine/setup';
import type { GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
const mk = (id: string, name: string, abilities: string[], o: { civ?: string; power?: string; cost?: string } = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, race: 'テスト', civilization: o.civ ?? '闇', type: 'クリーチャー', power: o.power ?? '5000', cost: o.cost ?? '5', abilities }] } as never);

const URA = [
  'シンパシー：自分の墓地にあるクリーチャー（自分の墓地にあるクリーチャー1体につき、このクリーチャーの召喚コストを1少なくする。ただし、コストは1以下にはならない）',
  'このクリーチャーが出た時または自分のターンのはじめに、クリーチャーを5体自分の墓地から選び、このクリーチャーの下に重ねてもよい。そうしたら、相手のクリーチャーを1体破壊する。',
  'このクリーチャーが離れる時または自分がゲームに負ける時、かわりにこのクリーチャーの下に重ねたカードを5枚、好きな順序で自分の山札の下に置いてもよい。',
];
const C = { ura: mk('d13-1', 'ウラギリ', URA, { cost: '9', power: '9000' }), body: mk('d13-2', 'ダミー', []) };
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);

describe('ウラギリダムスの読み取り', () => {
  it('3行とも自動になる', () => {
    expect(C.ura.support).toBe('full');
    for (const l of URA) expect(parseAbilityText(l, 'creature').manualLines).toEqual([]);
  });
  it('出た時とターンのはじめの2つの誘発になる', () => {
    const whens = (C.ura.abilities ?? []).map((a) => a.when);
    expect(whens).toContain('onSummon');
    expect(whens).toContain('onTurnStart');
  });
  it('離れる時または負ける時の置換になる', () => {
    expect(C.ura.replacements?.[0]).toMatchObject({ event: 'leaveBattle', instead: 'underToDeckBottom', count: 5, alsoLose: true, optional: true });
  });
  it('シンパシーは墓地のクリーチャーの数だけ召喚コストが下がる', () => {
    expect(C.ura.selfCost).toMatchObject({ amount: 1, min: 1 });
  });
});

describe('ウラギリダムスの処理', () => {
  const setup = (under: number) => {
    const s = newGame();
    const iid = put(s, 0, C.ura.id, 'battle');
    for (let i = 0; i < under; i++) {
      const u = put(s, 0, C.body.id, 'graveyard');
      s.players[0].zones.graveyard = s.players[0].zones.graveyard.filter((x) => x !== u);
      s.cards[u].zone = 'battle';
      s.cards[iid].under.push(u);
    }
    s.players[0].zones.deck = [];
    return { s, iid };
  };
  it('下に5枚あれば、負ける時にかわりに山札の下へ置いて続行する', () => {
    const { s, iid } = setup(5);
    new Ctx(s, reg).checkStateBased();
    expect(s.gameOverReason).toBeNull();
    expect(s.players[0].zones.deck.length).toBe(5);
    expect(s.cards[iid].under.length).toBe(0);
    expect(s.cards[iid].zone).toBe('battle');
  });
  it('下のカードが5枚未満なら負ける', () => {
    const { s } = setup(4);
    new Ctx(s, reg).checkStateBased();
    expect(s.winner).toBe(1);
  });
});

describe('追加の言い回し', () => {
  const ok = (l: string) => expect(parseAbilityText(l, 'creature').manualLines).toEqual([]);
  it('「召喚するコストは、〜につき1少なくなる」', () => {
    ok('このクリーチャーを召喚するコストは、自分の墓地にあるクリーチャー１体につき１少なくなる。ただし、コストは０以下にならない。');
    ok('このクリーチャーを召喚するコストは、自分の墓地のクリーチャー１体につき１少なくなる。ただし、コストは１より少なくならない。');
    expect(parseAbilityText('このクリーチャーの進化元クリーチャー１体につき、このクリーチャーの召喚コストを１少なくする。ただし、コストは０以下にはならない。', 'creature').selfCost).toMatchObject({ perEvolve: true, min: 1 });
  });
  it('「1体選ぶ。そのクリーチャーのパワーは〜される」', () => {
    const r = parseAbilityText('このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを１体選ぶ。そのクリーチャーのパワーは、自分の墓地にあるクリーチャー１体につき−1000される。', 'creature');
    expect(r.abilities[0].effects[0]).toMatchObject({ type: 'powerMod', amount: -1000, perCount: { zone: 'graveyard' } });
  });
  it('メテオバーン（読点つき）と「全て破壊する」', () => {
    ok('メテオバーン：このクリーチャーが攻撃する時、このクリーチャーの下にあるカードを１枚、墓地に置いてもよい。そうしたら、相手のクリーチャーを１体選ぶ。このターン、その選んだクリーチャーのパワーを－9000する。その後、進化ではないクリーチャーを１体、自分の墓地から出す。');
    ok('このクリーチャーをバトルゾーンに出した時、サイキック・クリーチャーを全て破壊する。その後、パワー5000以下のクリーチャーを全て破壊する。');
  });
  it('「鬼タイム ：…真上の▪️能力を無視する」は前の能力の条件になる', () => {
    const c = mk('d13-3', 'アバク', ['このクリーチャーが出た時、自分の山札の上から５枚を墓地に置く。その後、このクリーチャーを破壊する。', '鬼タイム ：自分と相手のシールドの数が合計６つ以下なら、真上の▪️能力を無視する。']);
    expect(c.support).toBe('full');
    expect(c.abilities?.[0].condition).toMatchObject({ type: 'not' });
  });
});
