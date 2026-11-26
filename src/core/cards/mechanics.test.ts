// 侵略・革命チェンジ・NEO進化など、能力テキストから読み取った特殊な処理がエンジンで動くことのテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { blockersFor, breakerCount, canAttackWith, hyperizeCandidates, keywords } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', civilization: '火', rarity: 'C', mana: '1', illustrator: '', flavor: '', cost: '1' };
const mk = (id: string, name: string, abilities: string[], o: { type?: string; power?: string; race?: string; cost?: string } = {}) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name, type: o.type ?? 'クリーチャー', power: o.power ?? '3000', race: o.race ?? 'テスト', cost: o.cost ?? '1', abilities }] });

const C = {
  dragon: mk('m-1', '火竜', [], { power: '6000', race: 'ドラゴン', cost: '6' }),
  rev: mk('m-2', '革命竜', ['革命チェンジ：火のコスト5以上のドラゴン（…）', 'このクリーチャーが出た時、カードを1枚引く。'], { power: '9000', race: 'ドラゴン', cost: '7' }),
  inv: mk('m-3', '侵略者', ['進化：自分の火のクリーチャー1体の上に置く。', '侵略：火のクリーチャー（…）'], { type: '進化クリーチャー', power: '8000' }),
  neo: mk('m-4', 'NEO', ['NEO進化：火のクリーチャー1体の上に置いてもよい。（…）'], { type: 'NEOクリーチャー', power: '5000' }),
  fighter: mk('m-5', '格闘', ['このクリーチャーが出た時、相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる。'], { power: '5000' }),
  modes: mk('m-6', '二択', ['次の中から2回選ぶ。\n▶カードを1枚引く。\n▶相手の手札を1枚見ないで選び、捨てさせる。'], { type: '呪文', power: '' }),
  freeze: mk('m-7', '凍結', ['相手のクリーチャーを1体選ぶ。次の自分のターンのはじめまで、そのクリーチャーは攻撃もブロックもできない。'], { type: '呪文', power: '' }),
  kill: mk('m-8', '破壊', ['相手のクリーチャーを1体選び、破壊する。'], { type: '呪文', power: '' }),
  toMana: mk('m-9', 'マナ還り', ['このクリーチャーが破壊される時、墓地に置くかわりに自分のマナゾーンに置く。']),
  escape: mk('m-10', '逃げ足', ['エスケープ（このクリーチャーが破壊される時、かわりに自分のシールドを1つ手札に加えてもよい）']),
  guard: mk('m-11', '守り手', ['ガードマン（…）']),
  hyper: convertOfficialCard({
    id: 'm-12',
    detailUrl: '',
    faces: [
      { ...base, name: 'ハイパー犬', type: 'クリーチャー', power: '3000', race: 'テスト', abilities: ['ハイパー化：自分の他のクリーチャーを１体タップする。（…）'] },
      { ...base, name: 'ハイパー犬', type: 'クリーチャー', power: '3000', race: 'テスト', abilities: ['ハイパー化：自分の他のクリーチャーを１体タップする。（…）', 'スピードアタッカー', 'W・ブレイカー'] },
    ],
  }),
  peeker: mk('m-13', '覗き見', ['相手がそのターン２枚目以降のカードを引いた時、相手は自身の手札を１枚選び、捨てる。', '相手はカードをマナゾーンに置く時、タップして置く。']),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');

function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName, ready = false): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  if (ready) s.cards[iid].enteredTurn = 0;
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const fireMana = (s: GameState, n: number) => {
  for (let i = 0; i < n; i++) put(s, 0, 'S01-031', 'mana');
};

describe('特殊な処理の読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.name, c.support]).toEqual([c.name, 'full']);
    expect(C.rev.attackSwap).toEqual({ kind: 'revolution', filter: { civilization: 'fire', minCost: 5, race: 'ドラゴン' } });
    expect(C.inv.attackSwap).toEqual({ kind: 'invasion', filter: { civilization: 'fire' } });
    expect(C.neo.neoEvolution).toEqual({ civilization: 'fire' });
  });

  it('いろいろな書き方', () => {
    const cr = (t: string) => parseAbilityText(t, 'creature');
    expect(cr('革命チェンジ：光または自然の、パワー8000以上のクリーチャー').manualLines).toEqual([]);
    expect(cr('NEO進化：水、闇、または火のクリーチャー1体の上に置いてもよい。').neoEvolution).toEqual({ civilizations: ['water', 'darkness', 'fire'] });
    expect(cr('NEO進化：ジョーカーズまたはレクスターズの、クリーチャー1体の上に置いてもよい。').neoEvolution).toEqual({ races: ['ジョーカーズ', 'レクスターズ'] });
    expect(cr('このクリーチャーをバトルゾーンに出した時、カードを1枚引く。').abilities[0].when).toBe('onSummon');
    expect(cr('このクリーチャーは攻撃することができない。').keywords).toEqual({ cannotAttack: true });
    expect(cr('このクリーチャーが攻撃する時、相手とガチンコ・ジャッジする。自分が勝ったら、カードを1枚引く。').abilities[0].effects).toEqual([
      { type: 'gachinko', then: [{ type: 'draw', count: 1 }] },
    ]);
    expect(cr('このクリーチャーが攻撃する時、自分の山札の上から1枚を表向きにする。それがドラゴンなら出す。それ以外なら山札の下に置く。').abilities[0].effects).toEqual([
      { type: 'lookAtTop', count: 1, pickCount: 1, pickFilter: { race: 'ドラゴン' }, pickTo: 'battle', restTo: 'deckBottom', pickAll: true },
    ]);
    expect(cr('このクリーチャーが出た時、自分の山札の上から4枚を表向きにする。その中から好きな数のクリーチャーを出し、残りをマナゾーンに置く。').abilities[0].effects[0]).toMatchObject({
      type: 'lookAtTop',
      pickCount: 4,
      pickFilter: { cardType: 'creature' },
      pickTo: 'battle',
      restTo: 'mana',
    });
    expect(parseAbilityText('次の自分のターンのはじめまで、相手はコスト5以下の呪文を唱えられない。', 'spell').abilities[0].effects).toEqual([
      { type: 'turnStatic', static: { type: 'cannotCast', who: 'opponent', filter: { maxCost: 5 } }, untilNextTurn: true },
    ]);
  });
});

describe('特殊な処理がエンジンで動く', () => {
  it('革命チェンジ：攻撃したクリーチャーを手札に戻し、手札のクリーチャーを出して攻撃を続ける', () => {
    let s = newGame();
    const dragon = put(s, 0, 'dm:m-1', 'battle', true);
    const rev = put(s, 0, 'dm:m-2', 'hand');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: dragon, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, candidates: [rev], min: 0, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [rev] });
    expect(s.cards[dragon].zone).toBe('hand');
    expect(s.cards[rev]).toMatchObject({ zone: 'battle', tapped: true });
    // 出た時の能力で1枚引いた（手札：革命竜が出て、火竜が戻り、1枚引く）
    expect(s.players[0].zones.hand).toHaveLength(hand + 1);
    expect(s.combat?.attacker ?? rev).toBe(rev);
  });

  it('侵略：攻撃したクリーチャーの上に重ねて攻撃を続ける', () => {
    let s = newGame();
    const a = put(s, 0, 'S01-031', 'battle', true);
    const inv = put(s, 0, 'dm:m-3', 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, selected: [inv] });
    expect(s.cards[inv]).toMatchObject({ zone: 'battle', tapped: true, under: [a] });
  });

  it('使わないことも選べる', () => {
    let s = newGame();
    const dragon = put(s, 0, 'dm:m-1', 'battle', true);
    put(s, 0, 'dm:m-2', 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: dragon, target: { kind: 'player' } });
    s = act(s, { type: 'RESPOND', player: 0, selected: [] });
    expect(s.cards[dragon].zone).toBe('battle');
  });

  it('NEO進化：重ねて召喚すると召喚酔いしない。重ねずに召喚もできる', () => {
    let s = newGame();
    const b = put(s, 0, 'S01-031', 'battle');
    const neo = put(s, 0, 'dm:m-4', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: neo, evolveOn: b });
    expect(s.cards[neo].under).toEqual([b]);
    expect(canAttackWith(s, reg, 0, neo)).toBe(true);

    s = newGame();
    put(s, 0, 'S01-031', 'battle');
    const neo2 = put(s, 0, 'dm:m-4', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: neo2 });
    expect(s.cards[neo2]).toMatchObject({ zone: 'battle', under: [] });
    expect(canAttackWith(s, reg, 0, neo2)).toBe(false);
  });

  it('出た時にバトルさせる', () => {
    let s = newGame();
    const weak = put(s, 1, 'S01-032', 'battle'); // 3000
    const f = put(s, 0, 'dm:m-5', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: f });
    s = act(s, { type: 'RESPOND', player: 0, accept: true });
    expect(s.cards[weak].zone).toBe('graveyard');
    expect(s.cards[f].zone).toBe('battle');
  });

  it('次の中から2回選ぶ（同じものは選べない）', () => {
    let s = newGame();
    const sp = put(s, 0, 'dm:m-6', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['カードを1枚引く', '相手の手札を1枚見ないで選び、捨てさせる'] });
    s = act(s, { type: 'RESPOND', player: 0, selected: ['0'] });
    expect(s.pending).toMatchObject({ kind: 'chooseMode', options: ['相手の手札を1枚見ないで選び、捨てさせる'] });
  });

  it('次の自分のターンのはじめまで攻撃もブロックもできない', () => {
    let s = newGame();
    const t = put(s, 1, 'S01-032', 'battle');
    const sp = put(s, 0, 'dm:m-7', 'hand');
    fireMana(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(keywords(s, reg, t)).toMatchObject({ cannotAttack: true, cannotBlock: true });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(keywords(s, reg, t).cannotAttack).toBe(true);
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(keywords(s, reg, t).cannotAttack).toBeFalsy();
  });

  it('破壊されるかわりにマナゾーンへ／エスケープ', () => {
    let s = newGame();
    const m = put(s, 1, 'dm:m-9', 'battle');
    let sp = put(s, 0, 'dm:m-8', 'hand');
    fireMana(s, 2);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[m].zone).toBe('mana');

    s = newGame();
    const e = put(s, 1, 'dm:m-10', 'battle');
    sp = put(s, 0, 'dm:m-8', 'hand');
    fireMana(s, 1);
    const shields = s.players[1].zones.shield.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[e].zone).toBe('battle');
    expect(s.players[1].zones.shield).toHaveLength(shields - 1);
  });

  it('ガードマン：他のクリーチャーへの攻撃を引き受けられる', () => {
    let s = newGame();
    const g = put(s, 1, 'dm:m-11', 'battle');
    const victim = put(s, 1, 'S01-032', 'battle');
    s.cards[victim].tapped = true;
    const a = put(s, 0, 'S01-043', 'battle', true);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: victim } });
    expect(s.pending).toMatchObject({ kind: 'block', blockers: [g] });
    // プレイヤーへの攻撃では使えない
    expect(blockersFor({ ...s, combat: { ...s.combat!, target: { kind: 'player' } } }, reg, 1, a)).toEqual([]);
  });

  it('ハイパー化：他のクリーチャーをタップしてハイパーモードの能力を得る。次の自分のターンのはじめに戻る', () => {
    expect(C.hyper.twin).toBeUndefined();
    let s = newGame();
    const h = put(s, 0, 'dm:m-12', 'battle');
    expect(hyperizeCandidates(s, reg, 0, h)).toBeNull(); // タップできる他のクリーチャーがいない
    const a = put(s, 0, 'S01-031', 'battle');
    const b = put(s, 0, 'S01-032', 'battle');
    s = act(s, { type: 'HYPERIZE', player: 0, iid: h });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [a, b], min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [b] });
    expect(s.cards[b].tapped).toBe(true);
    expect(keywords(s, reg, h).speedAttacker).toBe(true);
    expect(breakerCount(s, reg, h)).toBe(2);
    expect(canAttackWith(s, reg, 0, h)).toBe(true);
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.cards[h].hyper).toBe(true); // 相手のターン中は続く
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.cards[h].hyper).toBeFalsy();
  });

  it('相手がそのターン2枚目以降を引いた時に捨てさせる・相手のマナはタップして置かれる', () => {
    let s = newGame();
    put(s, 0, 'dm:m-13', 'battle');
    s = act(s, { type: 'END_TURN', player: 0 });
    // 相手のターン：通常のドローは1枚目なので誘発しない
    expect(s.pending).toBeNull();
    const before = s.players[1].zones.hand.length;
    s = act(s, { type: 'MANUAL_DRAW', player: 1, target: 1 });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1, min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [s.players[1].zones.hand[0]] });
    expect(s.players[1].zones.hand).toHaveLength(before);
    const m = put(s, 1, 'S01-031', 'mana');
    expect(s.cards[m].tapped).toBe(true);
    expect(s.cards[put(s, 0, 'S01-031', 'mana')].tapped).toBe(false);
  });
});

describe('同じ行に並んだ選択肢', () => {
  it('「次のうちいずれかひとつを選ぶ。▼…▼…」', () => {
    const p = parseAbilityText('次のうちいずれかひとつを選ぶ。▼手札を１枚捨て、その後、カードを２枚引く。▼相手のパワー2000以下のクリーチャーを１体破壊する。', 'spell');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities[0].effects[0]).toMatchObject({ type: 'chooseOne', options: [{ effects: [{ type: 'toGraveyard' }, { type: 'draw', count: 2 }] }, { effects: [{ type: 'destroy' }] }] });
  });
});
