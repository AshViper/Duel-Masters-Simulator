// 能力テキストの読み取りの基本（textParser）：書式・キーワード・誘発・部品の組み合わせ・移動の効果・能力語
// 元は別々のテストファイル。ファイルごとに describe（元のファイル名）で包んであるので、補助関数（mk・put・reg など）は同じ名前でもぶつからない
import { describe, expect, it } from 'vitest';
import { applyAction, Ctx } from '../engine/engine';
import { getLegalActions } from '../engine/legal';
import { attackTargets, breakerCount, effectiveCost, isUntargetable, keywords, minimalSacrifice, power, sasageruCandidates } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { asMove } from './effects';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { CardDefinition, ZoneName } from './types';

// ════════════════════════ textParser.test.ts ════════════════════════
describe('textParser', () => {
// 公式カードの能力テキストの読み取りと、読み取った効果がエンジンで実際に動くことのテスト
const creature = (t: string) => parseAbilityText(t, 'creature');
const spell = (t: string) => parseAbilityText(t, 'spell');

describe('能力テキストの読み取り', () => {
  it('出た時の破壊（全角数字・対象の条件）', () => {
    const p = creature('このクリーチャーがバトルゾーンに出た時、相手のパワー４０００以下のクリーチャーを１体選び、破壊する。');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities).toEqual([{ when: 'onSummon', effects: [{ type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1, filter: { maxPower: 4000 } } }] }]);
  });

  it('新しい書き方「出た時」と「出た時または攻撃する時」', () => {
    const p = creature('このクリーチャーが出た時または攻撃する時、相手のクリーチャーを1体選び、持ち主の手札に戻す。');
    expect(p.abilities.map((a) => a.when)).toEqual(['onSummon', 'onAttack']);
    expect(p.abilities[0].effects[0]).toMatchObject({ type: 'move', to: 'hand', target: { owner: 'opponent', count: 1 } });
  });

  it('「〜てもよい」は任意効果、「その後」は続けて処理', () => {
    const p = creature('このクリーチャーがバトルゾーンに出た時、カードを1枚引く。その後、自分の手札を1枚捨ててもよい。');
    // カードに書かれた1つの能力は1つの誘発にまとめ、途中の「〜てもよい」は聞いてから行う効果にする
    expect(p.abilities).toEqual([
      {
        when: 'onSummon',
        effects: [{ type: 'draw', count: 1 }, { type: 'optional', effects: [{ type: 'move', to: 'graveyard', target: { owner: 'self', zone: 'hand', count: 1 } }] }],
      },
    ]);
  });

  it('「〜てもよい。そうしたら」は1つの任意効果にまとめる', () => {
    const p = creature('このクリーチャーがバトルゾーンに出た時、自分の手札を１枚捨ててもよい。そうしたら、カードを２枚引く。');
    expect(p.abilities).toEqual([
      { when: 'onSummon', optional: true, effects: [{ type: 'move', to: 'graveyard', target: { owner: 'self', zone: 'hand', count: 1 } }, { type: 'ifChosen', then: [{ type: 'draw', count: 2 }] }] },
    ]);
  });

  it('呪文：2文に分かれたパワー修正（全角マイナス）', () => {
    const p = spell('相手のクリーチャーを１体選ぶ。このターン、そのクリーチャーのパワーを−4000する。');
    expect(p.abilities).toEqual([{ when: 'onCast', effects: [{ type: 'powerMod', target: { owner: 'opponent', zone: 'battle', count: 1 }, amount: -4000 }] }]);
  });

  it('呪文：山札を見て選ぶ・山札から探す', () => {
    expect(spell('自分の山札の上から3枚を見る。そのうちの1枚を手札に加え、残りを好きな順序で山札の下に置く。').abilities[0].effects).toEqual([
      { type: 'lookAtTop', count: 3, pickCount: 1, pickTo: 'hand', restTo: 'deckBottom', mustPick: true },
    ]);
    expect(spell('自分の山札を見る。その中からクリーチャーを1体選び、相手に見せてから手札に加えてもよい。その後、山札をシャッフルする。').abilities[0].effects).toEqual([
      { type: 'lookAtTop', count: 99, pickCount: 1, pickFilter: { cardType: 'creature' }, pickTo: 'hand', restTo: 'shuffle' },
    ]);
  });

  it('墓地から出す・条件付き', () => {
    expect(creature('このクリーチャーが破壊された時、コスト5以下のクリーチャーを1体、自分の墓地から出してもよい。').abilities).toEqual([
      { when: 'onDestroyed', optional: true, effects: [{ type: 'move', to: 'battle', target: { owner: 'self', zone: 'graveyard', count: 1, filter: { maxCost: 5, cardType: 'creature' } } }] },
    ]);
    const c = creature('このクリーチャーがバトルゾーンに出た時、バトルゾーンに自分の水のクリーチャーがあれば、カードを1枚引く。');
    expect(c.abilities[0].condition).toEqual({ type: 'compare', left: { who: 'self', zone: 'battle', filter: { civilization: 'water' } }, op: '>=', right: 1 });
  });

  it('▶ の選択肢と、途中で改行された文', () => {
    const p = creature('このクリーチャーがバトルゾーンに出た時、このクリーチャーを破壊してもよい。そしたら、次のうちいずれか１つを選ぶ。\n\n　▶相手の手札を１枚見ないで選び、捨てさせる。\n\n　▶相手のパワー2000以下のクリーチャーを１体破壊する。');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities[0]).toMatchObject({ when: 'onSummon', optional: true, effects: [{ type: 'selfAction', action: 'destroy' }, { type: 'chooseOne' }] });
    const q = creature('このクリーチャーがバトルゾーンに出た時、コスト３以下のクリーチャーを１体、\n\n自分の墓地からバトルゾーンに出す。');
    expect(q.manualLines).toEqual([]);
  });

  it('常在効果：コスト軽減・呪文禁止', () => {
    expect(creature('自分のクリーチャーの召喚コストを2少なくする。ただしコストは0以下にならない。').statics).toEqual([
      { type: 'costMod', amount: -2, appliesTo: { owner: 'self', filter: { cardType: 'creature' } } },
    ]);
    expect(creature('相手は呪文を唱えられない。').statics).toEqual([{ type: 'cannotCast', who: 'opponent' }]);
  });

  it('進化元', () => {
    expect(creature('進化：自分のドラゴン１体の上に置く。').evolvesFrom).toEqual({ race: 'ドラゴン' });
    expect(creature('進化：火のクリーチャー１体の上に置く。').evolvesFrom).toEqual({ civilization: 'fire' });
  });

  it('封印を付ける文を読む', () => {
    expect(creature('このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを1体選ぶ。相手はそれに封印を1つ付ける。').abilities).toEqual([
      { when: 'onSummon', effects: [{ type: 'seal', target: { owner: 'opponent', zone: 'battle', count: 1 } }] },
    ]);
  });

  it('読めない文は手動。誘発のタイミングが分かればその時にログで知らせる', () => {
    const p = creature('このクリーチャーがバトルゾーンに出た時、相手のクリーチャーを1体選ぶ。相手はそれを超次元ゾーンに置く。');
    expect(p.manualLines).toHaveLength(1);
    expect(p.abilities).toEqual([{ when: 'onSummon', effects: [{ type: 'manual', text: expect.stringContaining('超次元') }] }]);
    // 能力語つきの文は読まない
    expect(creature('鬼タイム：自分と相手のシールドの数が合計６つ以下で、自分のターンなら、このクリーチャーは破壊されない。').manualLines).toHaveLength(1);
    // 一部だけ読める文は、読めた所まで自動処理し、残りだけを手動にする（前の文が読めない時に後ろの文だけを実行することはしない）
    const partial = creature('このクリーチャーがバトルゾーンに出た時、カードを1枚引く。その後、相手とじゃんけんする。');
    expect(partial.abilities).toEqual([{ when: 'onSummon', effects: [{ type: 'draw', count: 1 }, { type: 'manual', text: '相手とじゃんけんする' }] }]);
    const headUnknown = creature('このクリーチャーがバトルゾーンに出た時、相手とじゃんけんする。その後、カードを1枚引く。');
    expect(headUnknown.abilities[0].effects).toHaveLength(1);
    expect(headUnknown.abilities[0].effects[0].type).toBe('manual');
    // 手動の部分が残る文を持つカードは「一部手動」
    const card = convertOfficialCard({ id: 'x-partial', detailUrl: '', faces: [{ ...face, name: 'じゃんけん', type: 'クリーチャー', power: '1000', cost: '1', abilities: ['このクリーチャーがバトルゾーンに出た時、カードを1枚引く。その後、相手とじゃんけんする。'] }] });
    expect(card.support).toBe('partial');
  });
});

// ───────────────────────── エンジンで動かす ─────────────────────────

const face = { packName: '(T 1/1)', imageUrl: '', civilization: '闇', rarity: 'C', mana: '1', race: 'テスト', illustrator: '', flavor: '' };
const OFFICIAL = [
  convertOfficialCard({ id: 'x-1', detailUrl: '', faces: [{ ...face, name: '破壊屋', type: 'クリーチャー', power: '3000', cost: '1', abilities: ['このクリーチャーがバトルゾーンに出た時、相手のパワー4000以下のクリーチャーを１体選び、破壊する。'] }] }),
  convertOfficialCard({ id: 'x-2', detailUrl: '', faces: [{ ...face, name: '弱体化', type: '呪文', power: '', cost: '1', abilities: ['S・トリガー', '相手のクリーチャーを１体選ぶ。このターン、そのクリーチャーのパワーを−4000する。'] }] }),
  convertOfficialCard({ id: 'x-3', detailUrl: '', faces: [{ ...face, name: '引き屋', type: 'クリーチャー', power: '1000', cost: '1', abilities: ['このクリーチャーがバトルゾーンに出た時、カードを２枚引く。'] }] }),
];
const mk = (id: string, name: string, type: string, power: string, abilities: string[]) =>
  convertOfficialCard({ id, detailUrl: '', faces: [{ ...face, name, type, power, cost: '1', abilities }] });
const EXTRA = [
  mk('x-4', 'EX屋', 'クリーチャー', '3000', ['EXライフ（このクリーチャーを出す時、自分の山札の上から１枚目をシールド化する。このクリーチャーが離れる時、かわりにそのシールドを墓地に置く）']),
  mk('x-5', '充電', '呪文', '', ['チャージャー（この呪文を唱えた後、墓地に置くかわりに自分のマナゾーンに置く）', 'カードを１枚引く。']),
  mk('x-6', '隠れ身', 'クリーチャー', '3000', ['相手はこのクリーチャーを選べない。']),
  mk('x-7', '格闘家', 'クリーチャー', '3000', ['マッハファイター']),
  mk('x-8', '焼却', 'クリーチャー', '5000', ['このクリーチャーがシールドをブレイクする時、相手はそのシールドを手札に加えるかわりに墓地に置く。']),
];
const reg = buildRegistry([...SAMPLE_CARDS, ...OFFICIAL, ...EXTRA]);
const filler = Array.from({ length: 40 }, () => 'S01-043');

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

describe('読み取った効果がエンジンで動く', () => {
  const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 3, firstPlayer: 0 }, reg);

  it('公式カードの対応状況が自動処理になる', () => {
    expect(OFFICIAL.map((c) => c.support)).toEqual(['full', 'full', 'full']);
  });

  it('出た時の破壊：対象が1体なら自動で破壊する', () => {
    let s = newGame();
    const small = put(s, 1, 'S01-032', 'battle'); // 3000
    const big = put(s, 1, 'S01-043', 'battle'); // 7000
    const c = put(s, 0, 'dm:x-1', 'hand');
    put(s, 0, 'S01-021', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.cards[c].zone).toBe('battle');
    expect(s.cards[small].zone).toBe('graveyard');
    expect(s.cards[big].zone).toBe('battle');
  });

  it('出た時のドロー', () => {
    let s = newGame();
    const c = put(s, 0, 'dm:x-3', 'hand');
    put(s, 0, 'S01-021', 'mana');
    const before = s.players[0].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.players[0].zones.hand.length).toBe(before - 1 + 2);
  });

  it('呪文のパワー修正（選んだクリーチャーのパワーが下がる）', () => {
    let s = newGame();
    const a = put(s, 1, 'S01-043', 'battle');
    const b = put(s, 1, 'S01-032', 'battle');
    const sp = put(s, 0, 'dm:x-2', 'hand');
    put(s, 0, 'S01-021', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [a] });
    expect(power(s, reg, a)).toBe(3000);
    expect(power(s, reg, b)).toBe(3000);
    expect(s.cards[sp].zone).toBe('graveyard');
  });

  it('パワーが0以下になったクリーチャーは破壊される', () => {
    let s = newGame();
    const weak = put(s, 1, 'S01-032', 'battle'); // 3000
    const sp = put(s, 0, 'dm:x-2', 'hand');
    put(s, 0, 'S01-021', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[weak].zone).toBe('graveyard');
    // 手動のパワー修正でも同じ
    const other = put(s, 1, 'S01-032', 'battle');
    s = act(s, { type: 'MANUAL_POWER', player: 0, iid: other, amount: -3000 });
    expect(s.cards[other].zone).toBe('graveyard');
  });
});

describe('能力テキストの読み取り（公式の書式・キーワード・フィルター）', () => {
  it('アイコン付きのキーワード、1行に並んだキーワード、補足説明だけの行', () => {
    const p = creature('ブロッカー　 {2W} W・ブレイカー\n\n{GS} G・ストライク（このカードを自分のシールドゾーンから手札に加える時…）\n\n（ゲーム開始時、GRクリーチャーは山札には含めず…）\n\nマッハファイター\n\n{PP} パワード・ブレイカー\n\nEXライフ');
    expect(p.manualLines).toEqual([]);
    expect(p.keywords).toEqual({ blocker: true, breaker: 2, gStrike: true, machFighter: true, poweredBreaker: true, exLife: true });
  });

  it('条件付きで得る能力：{l} は手動のまま、{S} はサバイバーにも与える能力として読む', () => {
    expect(creature('{l} 自分のターンの終わりに、このクリーチャーをアンタップする。').manualLines).toHaveLength(1);
    const p = creature('{S} このクリーチャーが攻撃する時、カードを１枚引いてもよい。\nサバイバー（自分の他のサバイバーすべてに、上の{S}能力を与える）');
    expect(p.manualLines).toHaveLength(0);
    expect(p.abilities).toEqual([{ when: 'onAttack', optional: true, effects: [{ type: 'draw', count: 1 }] }]);
    expect(p.survivor?.abilities).toEqual(p.abilities);
  });

  it('「または」でつないだ誘発条件', () => {
    expect(creature('このクリーチャーが攻撃する時、またはバトルに勝った時、カードを1枚引く。').abilities.map((a) => a.when)).toEqual(['onAttack', 'onBattleWin']);
    expect(creature('このクリーチャーが召喚によって出た時または自分のターンのはじめに、カードを1枚引く。').abilities.map((a) => a.when)).toEqual(['onSummon', 'onTurnStart']);
    expect(creature('このクリーチャーが出た時または離れた時、相手のクリーチャーを1体選び、破壊する。').abilities.map((a) => a.when)).toEqual(['onSummon', 'onLeave']);
  });

  it('種族・進化ではない・多色の条件', () => {
    expect(creature('このクリーチャーが攻撃する時、コスト5以下のアビス・クリーチャーを2体まで、自分の墓地から出してもよい。').abilities[0].effects).toEqual([
      { type: 'move', to: 'battle', target: { owner: 'self', zone: 'graveyard', count: 2, upTo: true, filter: { maxCost: 5, race: 'アビス', cardType: 'creature' } } },
    ]);
    expect(creature('このクリーチャーが破壊された時、闇のコスト6以下の、進化ではないクリーチャーを1体、自分の墓地から出してもよい。').abilities[0].effects[0]).toMatchObject({
      target: { filter: { civilization: 'darkness', maxCost: 6, nonEvolution: true } },
    });
  });

  it('常在効果：キーワード付与・ブロックされない・自分のターン中・カードのコスト軽減', () => {
    expect(creature('自分のジョーカーズまたはビートジョッキーすべてに「スピードアタッカー」を与える。').statics).toEqual([
      { type: 'grantKeyword', keywords: { speedAttacker: true }, appliesTo: { owner: 'self', filter: { races: ['ジョーカーズ', 'ビートジョッキー'] } } },
    ]);
    expect(creature('自分の他のクリーチャーすべてのパワーを+5000し、「スピードアタッカー」と「パワード・ブレイカー」を与える。').statics).toEqual([
      { type: 'powerMod', amount: 5000, appliesTo: { owner: 'self', excludeSelf: true } },
      { type: 'grantKeyword', keywords: { speedAttacker: true, poweredBreaker: true }, appliesTo: { owner: 'self', excludeSelf: true } },
    ]);
    expect(creature('自分の多色クリーチャーすべてに「スピードアタッカー」を与える。').statics[0]).toMatchObject({ appliesTo: { filter: { multicolor: true } } });
    expect(creature('自分のリキッド・ピープルはブロックされない。').statics).toEqual([
      { type: 'grantKeyword', keywords: { unblockable: true }, appliesTo: { owner: 'self', filter: { race: 'リキッド・ピープル' } } },
    ]);
    expect(creature('相手のクリーチャーは自分を攻撃できない。').statics[0]).toMatchObject({ keywords: { cannotAttackPlayers: true }, appliesTo: { owner: 'opponent' } });
    expect(creature('自分のターン中、相手は呪文を唱えられない。').statics).toEqual([{ type: 'cannotCast', who: 'opponent', duringTurn: 'self' }]);
    expect(creature('自分のサムライ・カードを実行するコストを1少なくする。ただしコストは0以下にならない。').statics).toEqual([
      { type: 'costMod', amount: -1, appliesTo: { owner: 'self', filter: { race: 'サムライ' } } },
    ]);
  });

  it('このターンの能力付与・攻撃できない、相手が選ぶ効果、手札をすべて捨てる', () => {
    expect(spell('相手のクリーチャーを3体まで選ぶ。このターンそれらは攻撃もブロックもできない。').abilities[0].effects).toEqual([
      { type: 'grantKeyword', target: { owner: 'opponent', zone: 'battle', count: 3, upTo: true }, keywords: { cannotAttack: true, cannotBlock: true } },
    ]);
    expect(spell('自分のクリーチャーを1体選ぶ。このターン、そのクリーチャーに「スピードアタッカー」と「スレイヤー」を与える。').abilities[0].effects[0]).toMatchObject({
      type: 'grantKeyword',
      keywords: { speedAttacker: true, slayer: true },
    });
    expect(spell('相手は自身のエレメントを1つ選び、破壊する。').abilities[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1, chooser: 'owner' } },
    ]);
    expect(spell('相手は自身の手札をすべて捨てる。').abilities[0].effects).toEqual([{ type: 'move', to: 'graveyard', target: { owner: 'opponent', zone: 'hand', count: 'all' } }]);
    expect(creature('このクリーチャーが出た時、自分の山札の上から4枚までマナゾーンに置く。').abilities[0].effects).toEqual([{ type: 'deckTopTo', count: 4, to: 'mana' }]);
  });
});

describe('新しいキーワードがエンジンで動く', () => {
  const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 3, firstPlayer: 0 }, reg);

  it('対応状況が自動処理になる', () => {
    expect(EXTRA.map((c) => c.support)).toEqual(['full', 'full', 'full', 'full', 'full']);
  });

  it('EXライフ：出た時にシールドが増え、破壊されるかわりにそのシールドを墓地に置く', () => {
    let s = newGame();
    const ex = put(s, 0, 'dm:x-4', 'hand');
    put(s, 0, 'S01-021', 'mana');
    const shields = s.players[0].zones.shield.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: ex });
    expect(s.players[0].zones.shield).toHaveLength(shields + 1);
    const exShield = s.cards[ex].exLifeShield!;
    expect(s.players[0].zones.shield).toContain(exShield);
    // 相手の「破壊屋」で破壊される
    const killer = put(s, 1, 'dm:x-1', 'hand');
    s = act(s, { type: 'END_TURN', player: 0 });
    put(s, 1, 'S01-021', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 1, iid: killer });
    expect(s.cards[ex].zone).toBe('battle');
    expect(s.cards[exShield].zone).toBe('graveyard');
  });

  it('チャージャー：唱えた後マナゾーンに置く', () => {
    let s = newGame();
    const sp = put(s, 0, 'dm:x-5', 'hand');
    put(s, 0, 'S01-021', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[sp].zone).toBe('mana');
  });

  it('相手に選ばれないクリーチャーは対象にならない', () => {
    let s = newGame();
    const hidden = put(s, 1, 'dm:x-6', 'battle');
    const plain = put(s, 1, 'S01-032', 'battle');
    expect(isUntargetable(s, reg, hidden)).toBe(true);
    const c = put(s, 0, 'dm:x-1', 'hand');
    put(s, 0, 'S01-021', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    expect(s.cards[plain].zone).toBe('graveyard');
    expect(s.cards[hidden].zone).toBe('battle');
  });

  it('マッハファイター：出たターンはクリーチャーだけ攻撃できる（アンタップも可）', () => {
    let s = newGame();
    const target = put(s, 1, 'S01-021', 'battle');
    const m = put(s, 0, 'dm:x-7', 'hand');
    put(s, 0, 'S01-021', 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: m });
    expect(attackTargets(s, reg, 0, m)).toEqual([{ kind: 'creature', iid: target }]);
  });

  it('ブレイクしたシールドを墓地に置く', () => {
    let s = newGame();
    const b = put(s, 0, 'dm:x-8', 'battle');
    s.cards[b].enteredTurn = 0;
    const hand = s.players[1].zones.hand.length;
    const grave = s.players[1].zones.graveyard.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: b, target: { kind: 'player' } });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [s.players[1].zones.shield[0]] });
    expect(s.players[1].zones.hand).toHaveLength(hand);
    expect(s.players[1].zones.graveyard).toHaveLength(grave + 1);
  });
});
});

// ════════════════════════ compose.test.ts ════════════════════════
describe('compose', () => {
// 能力テキストを部品（目的語・動詞・期間・条件・数え方・誘発）の組み合わせで読めることのテスト
const cr = (t: string) => parseAbilityText(t, 'creature');
const sp = (t: string) => parseAbilityText(t, 'spell');

describe('部品の組み合わせで読む', () => {
  it('「〜し、〜する」を2つの効果に分ける', () => {
    expect(sp('相手のクリーチャーを1体選んで破壊し、相手の手札を1枚見ないで選び、捨てさせる。').abilities[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1 } },
      { type: 'discardRandom', count: 1 },
    ]);
    expect(sp('相手のクリーチャーを1体選び、持ち主の手札に戻し、カードを1枚引く。').abilities[0].effects.map((e) => e.type)).toEqual(['move', 'draw']);
  });

  it('目的語の言い方：移動元が後ろ・「にある」・好きな数・名詞のない種族', () => {
    expect(sp('カードを2枚、自分のマナゾーンから手札に戻す。').abilities[0].effects).toEqual([{ type: 'move', to: 'hand', target: { owner: 'self', zone: 'mana', count: 2 } }]);
    expect(sp('自分のマナゾーンにあるカードを好きな数、墓地に置く。').abilities[0].effects).toEqual([
      { type: 'move', to: 'graveyard', target: { owner: 'self', zone: 'mana', count: 99, upTo: true } },
    ]);
    expect(sp('自分のドラゴンを1体選び、アンタップする。').abilities[0].effects).toEqual([{ type: 'untap', target: { owner: 'self', zone: 'battle', count: 1, filter: { race: 'ドラゴン' } } }]);
    expect(sp('相手のクリーチャーを1体選び、持ち主のマナゾーンにタップして置く。').abilities[0].effects).toEqual([
      { type: 'move', to: 'mana', target: { owner: 'opponent', zone: 'battle', count: 1 }, tapped: true },
    ]);
    expect(sp('自分のシールドをひとつ墓地に置いてもよい。').abilities[0]).toMatchObject({ optional: true, effects: [{ type: 'move', to: 'graveyard', target: { zone: 'shield', count: 1 } }] });
  });

  it('2文：相手のシールドを選び、相手がそれを手札に加える', () => {
    expect(cr('このクリーチャーが攻撃する時、相手のシールドをふたつ選ぶ。相手はそのシールドを自身の手札に加える。').abilities[0].effects).toEqual([
      { type: 'move', to: 'hand', target: { owner: 'opponent', zone: 'shield', count: 2 } },
    ]);
  });

  it('誘発：他のクリーチャーの攻撃・破壊、攻撃の終わり、各ターンに1度', () => {
    expect(cr('相手のクリーチャーが攻撃する時、カードを1枚引く。').abilities[0]).toMatchObject({ when: 'onOtherAttack', who: 'opponent' });
    expect(cr('自分の他のドラゴンが破壊された時、カードを1枚引く。').abilities[0]).toMatchObject({ when: 'onOtherDestroyed', who: 'self', filter: { race: 'ドラゴン' } });
    expect(cr('このクリーチャーの攻撃の終わりに、このクリーチャーを破壊する。').abilities[0]).toMatchObject({ when: 'onAttackEnd' });
    expect(cr('各ターンに1度、自分のクリーチャーが破壊された時、カードを1枚引く。').abilities[0]).toMatchObject({ when: 'onOtherDestroyed', oncePerTurn: true });
  });

  it('常在：「〜1枚につき」・条件つき・自分自身のコスト', () => {
    expect(cr('このクリーチャーのパワーを、自分の墓地にある呪文1枚につき+3000する。').statics).toEqual([
      { type: 'powerMod', amount: 3000, appliesTo: { owner: 'self', onlySelf: true }, perCount: { who: 'self', zone: 'graveyard', filter: { cardType: 'spell' } } },
    ]);
    expect(cr('バトルゾーンに自分のクリーチャーが2体以上なければ、このクリーチャーは攻撃できない。').statics).toEqual([
      {
        type: 'grantKeyword',
        keywords: { cannotAttack: true },
        appliesTo: { owner: 'self', onlySelf: true },
        condition: { type: 'not', condition: { type: 'compare', left: { who: 'self', zone: 'battle' }, op: '>=', right: 2 } },
      },
    ]);
    expect(cr('このクリーチャーの召喚コストを、クリーチャー1体につき1少なくする。ただしコストは2以下にならない。').selfCost).toEqual({
      amount: 1,
      per: { who: 'any', zone: 'battle' },
      unit: 1,
      min: 3,
    });
  });
});

// ───────────────────────── エンジンで動かす ─────────────────────────
const base = { packName: '(T 1/1)', imageUrl: '', civilization: '火', rarity: 'C', mana: '1', illustrator: '', flavor: '', race: 'テスト' };
const mk = (id: string, abilities: string[], power = '3000', cost = '1') => convertOfficialCard({ id, detailUrl: '', faces: [{ ...base, name: id, type: 'クリーチャー', power, cost, abilities }] });
const C = {
  spellPower: mk('c-1', ['このクリーチャーのパワーを、自分の墓地にある呪文1枚につき+3000する。']),
  lonely: mk('c-2', ['バトルゾーンに自分のクリーチャーが2体以上なければ、このクリーチャーは攻撃できない。']),
  cheap: mk('c-3', ['このクリーチャーの召喚コストを、クリーチャー1体につき1少なくする。ただしコストは2以下にならない。'], '5000', '7'),
  watcher: mk('c-4', ['各ターンに1度、相手のクリーチャーが攻撃する時、カードを1枚引く。']),
  ender: mk('c-5', ['このクリーチャーの攻撃の終わりに、このクリーチャーを破壊する。']),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 9, firstPlayer: 0 }, reg);

describe('組み合わせで読んだ効果がエンジンで動く', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });

  it('墓地の呪文の数だけパワーが上がる', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:c-1', 'battle');
    expect(power(s, reg, c)).toBe(3000);
    put(s, 0, 'S01-012', 'graveyard');
    put(s, 0, 'S01-013', 'graveyard');
    expect(power(s, reg, c)).toBe(9000);
  });

  it('条件つき：クリーチャーが2体以上いなければ攻撃できない', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:c-2', 'battle');
    expect(keywords(s, reg, c).cannotAttack).toBe(true);
    put(s, 0, 'S01-031', 'battle');
    expect(keywords(s, reg, c).cannotAttack).toBeFalsy();
  });

  it('自分自身のコスト軽減（下限つき）', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:c-3', 'hand');
    expect(effectiveCost(s, reg, 0, c)).toBe(7);
    put(s, 0, 'S01-031', 'battle');
    put(s, 1, 'S01-031', 'battle');
    expect(effectiveCost(s, reg, 0, c)).toBe(5);
    for (let i = 0; i < 6; i++) put(s, 1, 'S01-031', 'battle');
    expect(effectiveCost(s, reg, 0, c)).toBe(3);
  });

  it('相手のクリーチャーが攻撃する時（各ターンに1度）・攻撃の終わりに', () => {
    let s = newGame();
    put(s, 1, 'dm:c-4', 'battle');
    const a = put(s, 0, 'S01-043', 'battle', true);
    const b = put(s, 0, 'S01-043', 'battle', true);
    const e = put(s, 0, 'dm:c-5', 'battle', true);
    const hand = s.players[1].zones.hand.length;
    // ゴルムは W・ブレイカーなので、シールドを2つ選ぶ
    const breakFirst = () => {
      if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: s.players[1].zones.shield.slice(0, s.pending.min) });
    };
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    breakFirst();
    s = act(s, { type: 'ATTACK', player: 0, attacker: b, target: { kind: 'player' } });
    breakFirst();
    // 1度目の攻撃でだけ1枚引く（2回の攻撃のブレイクで4枚増える）
    expect(s.players[1].zones.hand).toHaveLength(hand + 1 + 4);
    s = act(s, { type: 'ATTACK', player: 0, attacker: e, target: { kind: 'player' } });
    breakFirst();
    expect(s.cards[e].zone).toBe('graveyard');
  });
});
});

// ════════════════════════ triggers.test.ts ════════════════════════
describe('triggers', () => {
// 誘発の出来事の表（EVENTS）とキーワードの表（KEYWORD_LINES）で増えた分のテスト
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
const mk = (id: string, abilities: string[], type = 'クリーチャー', power = '3000') =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: 'テスト', civilization: '火', type, power: type === '呪文' ? '' : power, cost: '1', abilities }],
  });

const C = {
  tapDraw: mk('t-1', ['このクリーチャーがタップした時、カードを1枚引く。']),
  attackedDraw: mk('t-2', ['このクリーチャーが攻撃された時または相手に選ばれた時、カードを1枚引く。'], 'クリーチャー', '9000'),
  tapSpell: mk('t-3', ['相手のクリーチャーを1体選び、タップする。'], '呪文'),
  noUntap: mk('t-4', ['このクリーチャーは、自分のターンのはじめにアンタップしない。']),
  noCreatureAttack: mk('t-5', ['このクリーチャーは、クリーチャーを攻撃できない。']),
  vanilla: mk('t-6', []),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 5, firstPlayer: 0 }, reg);
function put(s: GameState, player: PlayerId, cardId: string, zone: ZoneName): string {
  const iid = `t${s.nextIid++}`;
  s.cards[iid] = { iid, cardId, owner: player, zone: 'deck', tapped: false, enteredTurn: 0, powerModTurn: 0, under: [], faceUp: false };
  s.players[player].zones.deck.unshift(iid);
  new Ctx(s, reg).moveCard(iid, zone);
  // 召喚酔いなし（前のターンから出ていた扱い）
  s.cards[iid].enteredTurn = 0;
  return iid;
}
function act(s: GameState, a: Action): GameState {
  const r = applyAction(s, a, reg);
  if (r.error) throw new Error(r.error);
  return r.state;
}
const handSize = (s: GameState, p: PlayerId) => s.players[p].zones.hand.length;

describe('誘発の表', () => {
  it('「このクリーチャーまたは自分の〜が出た時」は自身と他のクリーチャーの両方で誘発する', () => {
    const p = parseAbilityText('このクリーチャーまたは自分のコスト6以上のクリーチャーが出た時、カードを1枚引く。', 'creature');
    expect(p.manualLines).toEqual([]);
    expect(p.abilities.map((a) => a.when)).toEqual(['onSummon', 'onOtherSummon']);
    expect(p.abilities[1]).toMatchObject({ who: 'self', filter: { minCost: 6 } });
  });

  it('「自分の他のドラゴンが出た時」も同じ表で読む（種族だけの主語）', () => {
    const p = parseAbilityText('自分の他のドラゴンが出た時、カードを1枚引く。', 'creature');
    expect(p.abilities).toEqual([{ when: 'onOtherSummon', who: 'self', filter: { race: 'ドラゴン', excludeSelf: true }, effects: [{ type: 'draw', count: 1 }] }]);
  });

  it('タップした時：攻撃でタップすると誘発する', () => {
    let s = newGame();
    const a = put(s, 0, C.tapDraw.id, 'battle');
    const before = handSize(s, 0);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(handSize(s, 0)).toBeGreaterThanOrEqual(before + 1);
  });

  it('攻撃された時：攻撃されたクリーチャーの持ち主が引く', () => {
    let s = newGame();
    const a = put(s, 0, C.vanilla.id, 'battle');
    const d = put(s, 1, C.attackedDraw.id, 'battle');
    s.cards[d].tapped = true;
    const before = handSize(s, 1);
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(handSize(s, 1)).toBe(before + 1);
  });

  it('相手に選ばれた時：相手の呪文で選ばれると誘発する', () => {
    let s = newGame();
    const d = put(s, 1, C.attackedDraw.id, 'battle');
    const sp = put(s, 0, C.tapSpell.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const before = handSize(s, 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [d] });
    expect(s.cards[d].tapped).toBe(true);
    expect(handSize(s, 1)).toBe(before + 1);
  });
});

describe('キーワードの表', () => {
  it('自分のターンのはじめにアンタップしない', () => {
    let s = newGame();
    const stuck = put(s, 0, C.noUntap.id, 'battle');
    const normal = put(s, 0, C.vanilla.id, 'battle');
    expect(keywords(s, reg, stuck).noUntap).toBe(true);
    s.cards[stuck].tapped = true;
    s.cards[normal].tapped = true;
    s = act(s, { type: 'END_TURN', player: 0 });
    s = act(s, { type: 'END_TURN', player: 1 });
    expect(s.activePlayer).toBe(0);
    expect(s.cards[stuck].tapped).toBe(true);
    expect(s.cards[normal].tapped).toBe(false);
  });

  it('クリーチャーを攻撃できない：プレイヤーだけ攻撃できる', () => {
    const s = newGame();
    const a = put(s, 0, C.noCreatureAttack.id, 'battle');
    const d = put(s, 1, C.vanilla.id, 'battle');
    s.cards[d].tapped = true;
    expect(attackTargets(s, reg, 0, a)).toEqual([{ kind: 'player' }]);
  });
});
});

// ════════════════════════ effects.test.ts ════════════════════════
describe('effects', () => {
// 移動系の効果を move 1つにまとめた分のテスト（旧形式の読み替え・動詞表・「このクリーチャーを〜」・エンジンでの処理）
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
const mk = (id: string, abilities: string[], type = 'クリーチャー') =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: 'テスト', civilization: '火', type, power: type === '呪文' ? '' : '3000', cost: '1', abilities }],
  });

const C = {
  toDeckTop: mk('m-1', ['相手のクリーチャーを1体選び、持ち主の山札の上に置く。'], '呪文'),
  selfBottom: mk('m-2', ['このクリーチャーが攻撃する時、このクリーチャーを山札の下に置く。']),
  selfTapMana: mk('m-3', ['このクリーチャーが攻撃する時、このクリーチャーをタップしてマナゾーンに置く。']),
  vanilla: mk('m-4', []),
};
/** 旧形式（toMana）のまま保存されているカード */
const legacy: CardDefinition = {
  ...C.vanilla,
  id: 'legacy-1',
  name: '旧形式',
  type: 'spell',
  power: undefined,
  support: 'full',
  abilities: [{ when: 'onCast', effects: [{ type: 'toMana', target: { owner: 'opponent', zone: 'battle', count: 1 }, tapped: true }] }],
} as CardDefinition;

const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C), legacy]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 3, firstPlayer: 0 }, reg);
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
const top = (s: GameState, p: PlayerId) => s.players[p].zones.deck[s.players[p].zones.deck.length - 1];

describe('move：移動系の効果を1つにまとめる', () => {
  it('旧形式の効果を move に読み替える', () => {
    const t = { owner: 'self', zone: 'graveyard', count: 1 } as const;
    expect(asMove({ type: 'graveyardToHand', target: t })).toEqual({ type: 'move', target: t, to: 'hand' });
    expect(asMove({ type: 'toMana', target: t, tapped: true })).toEqual({ type: 'move', target: t, to: 'mana', tapped: true });
    expect(asMove({ type: 'toDeckBottom', target: t })).toEqual({ type: 'move', target: t, to: 'deckBottom' });
    expect(asMove({ type: 'draw', count: 1 })).toBeNull();
  });

  it('動詞表の言い方はすべて move になる', () => {
    const p = (t: string) => parseAbilityText(t, 'spell').abilities[0]?.effects[0];
    expect(p('相手のクリーチャーを1体選び、持ち主の手札に戻す。')).toMatchObject({ type: 'move', to: 'hand', target: { zone: 'battle' } });
    expect(p('自分の墓地からカードを1枚、手札に戻す。')).toMatchObject({ type: 'move', to: 'hand', target: { zone: 'graveyard' } });
    expect(p('相手のクリーチャーを1体選び、持ち主の山札の下に置く。')).toMatchObject({ type: 'move', to: 'deckBottom' });
    expect(p('相手のクリーチャーを1体選び、タップしてマナゾーンに置く。')).toMatchObject({ type: 'move', to: 'mana', tapped: true });
  });

  it('「このクリーチャーを〜」も同じ動詞表で読む', () => {
    expect(C.selfBottom.support).toBe('full');
    expect(C.selfTapMana.support).toBe('full');
    expect(parseAbilityText('このクリーチャーが攻撃する時、このクリーチャーを山札の下に置く。', 'creature').abilities[0].effects).toEqual([{ type: 'selfAction', action: 'deckBottom' }]);
    expect(parseAbilityText('このクリーチャーが攻撃する時、このクリーチャーをタップしてマナゾーンに置く。', 'creature').abilities[0].effects).toEqual([
      { type: 'selfAction', action: 'mana', tapped: true },
    ]);
  });

  it('エンジン：バトルゾーンのクリーチャーを山札の上に置く', () => {
    let s = newGame();
    const target = put(s, 1, C.vanilla.id, 'battle');
    const sp = put(s, 0, C.toDeckTop.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('deck');
    expect(top(s, 1)).toBe(target);
  });

  it('エンジン：旧形式（toMana・タップして）のままのカードも動く', () => {
    let s = newGame();
    const target = put(s, 1, C.vanilla.id, 'battle');
    const sp = put(s, 0, legacy.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [target] });
    expect(s.cards[target].zone).toBe('mana');
    expect(s.cards[target].tapped).toBe(true);
  });
});
});

// ════════════════════════ keywords2.test.ts ════════════════════════
describe('keywords2', () => {
// マナ武装・G・ゼロ・アタック・チャンス・メガ・ラスト・バースト・シールド・ゴーなどのテスト
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '', race: 'テスト' };
type O = { civ?: string; type?: string; power?: string; cost?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });

const C = {
  armed: mk('k-1', ['マナ武装 ３：自分のマナゾーンに水のカードが３枚以上あれば、このクリーチャーのパワーを+4000し、「W・ブレイカー」を与える。'], { civ: '水' }),
  gzero: mk('k-2', ['G・ゼロ：バトルゾーンに自分の火のクリーチャーがあれば、このクリーチャーをコストを支払わずに召喚してもよい。'], { cost: '6' }),
  chance: mk('k-3', ['アタック・チャンス：火のパワー4000以上のクリーチャー（…）', 'カードを２枚引く。'], { type: '呪文', power: '', cost: '5' }),
  hunter: mk('k-4', ['相手の「ブロッカー」を持つクリーチャーを１体選び、破壊する。'], { type: '呪文', power: '' }),
  burst: convertOfficialCard({ id: 'k-5', detailUrl: '', faces: [face('バースト竜', ['メガ・ラスト・バースト（…）']), face('バースト呪文', ['カードを１枚引く。'], { type: '呪文', power: '' })] }),
  go: mk('k-6', ['{SG} シールド・ゴー（…）']),
  extra: mk('k-7', ['エクストラEXライフ（…）']),
  gneo: mk('k-8', ['G-NEO進化：火のクリーチャー１体の上に置いてもよい。（…）'], { type: 'G-NEOクリーチャー' }),
  kill: mk('k-9', ['相手のクリーチャーを１体選び、破壊する。'], { type: '呪文', power: '' }),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);
const mana = (s: GameState, p: PlayerId, id: string, n: number) => {
  for (let i = 0; i < n; i++) put(s, p, id, 'mana');
};

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
    expect(C.burst.twin?.name).toBe('バースト呪文');
  });
  it('「〜」を持つクリーチャー', () => {
    expect(parseAbilityText('相手の「ブロッカー」を持つクリーチャーを１体選び、破壊する。', 'spell').abilities[0].effects).toEqual([
      { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1, filter: { hasKeyword: 'blocker' } } },
    ]);
  });
});

describe('エンジンで動く', () => {
  it('マナ武装：水のマナが3枚以上でパワー+4000とW・ブレイカー', () => {
    const s = newGame();
    const c = put(s, 0, 'dm:k-1', 'battle');
    expect(power(s, reg, c)).toBe(3000);
    mana(s, 0, 'S01-011', 3);
    expect(power(s, reg, c)).toBe(7000);
    expect(keywords(s, reg, c).breaker).toBe(2);
  });

  it('G・ゼロ：条件を満たせばマナなしで召喚できる', () => {
    let s = newGame();
    const g = put(s, 0, 'dm:k-2', 'hand');
    expect(effectiveCost(s, reg, 0, g)).toBe(6);
    put(s, 0, 'S01-031', 'battle');
    expect(effectiveCost(s, reg, 0, g)).toBe(0);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: g });
    expect(s.cards[g].zone).toBe('battle');
  });

  it('アタック・チャンス：条件に合うクリーチャーの攻撃時に呪文をタダで唱える', () => {
    let s = newGame();
    // 自然のクリーチャー（条件に合わない）の攻撃では選べない
    const a = put(s, 0, 'S01-043', 'battle', true);
    const sp = put(s, 0, 'dm:k-3', 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    expect(s.pending && 'candidates' in s.pending ? s.pending.candidates : []).not.toContain(sp);

    s = newGame();
    const fire = put(s, 0, 'S01-034', 'battle', true); // 火・6000
    const sp2 = put(s, 0, 'dm:k-3', 'hand');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: fire, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'selectCards', candidates: [sp2] });
    s = act(s, { type: 'RESPOND', player: 0, selected: [sp2] });
    expect(s.cards[sp2].zone).toBe('graveyard');
    expect(s.players[0].zones.hand.length).toBe(hand - 1 + 2);
  });

  it('メガ・ラスト・バースト：破壊されたら呪文側を唱えられる', () => {
    let s = newGame();
    const m = put(s, 1, 'dm:k-5', 'battle');
    const sp = put(s, 0, 'dm:k-9', 'hand');
    mana(s, 0, 'S01-031', 1);
    const hand = s.players[1].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[m].zone).toBe('graveyard');
    expect(s.players[1].zones.hand).toHaveLength(hand + 1);
  });

  it('シールド・ゴー：破壊されたら表向きでシールドに', () => {
    let s = newGame();
    const g = put(s, 1, 'dm:k-6', 'battle');
    const sp = put(s, 0, 'dm:k-9', 'hand');
    mana(s, 0, 'S01-031', 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[g]).toMatchObject({ zone: 'shield', faceUp: true });
  });

  it('エクストラEXライフ：シールドが2つ増え、離れる時は1つずつ墓地へ', () => {
    let s = newGame();
    const x = put(s, 0, 'dm:k-7', 'hand');
    mana(s, 0, 'S01-031', 1);
    const shields = s.players[0].zones.shield.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: x });
    expect(s.players[0].zones.shield).toHaveLength(shields + 2);
  });

  it('G-NEO進化：離れる時、かわりに下のカードが離れる', () => {
    let s = newGame();
    const b = put(s, 1, 'S01-031', 'battle');
    const n = put(s, 1, 'dm:k-8', 'hand');
    s.cards[n].zone = 'battle';
    s.players[1].zones.hand.splice(s.players[1].zones.hand.indexOf(n), 1);
    s.players[1].zones.battle.splice(s.players[1].zones.battle.indexOf(b), 1, n);
    s.cards[b].zone = 'battle';
    s.cards[n].under = [b];
    const sp = put(s, 0, 'dm:k-9', 'hand');
    mana(s, 0, 'S01-031', 1);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[n].zone).toBe('battle');
    expect(s.cards[n].under).toEqual([]);
    expect(s.cards[b].zone).toBe('graveyard');
  });
});

describe('シンパシー', () => {
  it('種族の並びと W・シンパシー', () => {
    expect(parseAbilityText('シンパシー：自分のジャイアント、ミステリー・トーテム、またはスノーフェアリーのクリーチャー', 'creature').selfCost).toEqual({
      amount: 1,
      per: { who: 'self', zone: 'battle', filter: { races: ['ジャイアント', 'ミステリー・トーテム', 'スノーフェアリー'] } },
      unit: 1,
      min: 1,
    });
    expect(parseAbilityText('W・シンパシー：自分のアースイーター・クリーチャーまたはジャイアント・クリーチャー', 'creature').selfCost).toMatchObject({
      amount: 2,
      per: { filter: { races: ['アースイーター', 'ジャイアント'] } },
    });
  });
});
});

// ════════════════════════ abilityWords.test.ts ════════════════════════
describe('abilityWords', () => {
// 能力語の続き：シールドをブレイクした時・メクレイドの誘発・真・エスケープ／マナ武装・∞／バラエティ・ブレイカー・サイクロン・シビルカウントなど
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({ ...base, name, race: o.race ?? 'テスト', civilization: o.civ ?? '火', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities });
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });

const C = {
  vanilla: mk('w-1', [], { power: '1000' }),
  cost2: mk('w-2', [], { power: '1000', cost: '2' }),
  cost3: mk('w-3', [], { power: '1000', cost: '3' }),
  breakDraw: mk('w-10', ['このクリーチャーがシールドをブレイクした時、カードを１枚引く。']),
  otherBreak: mk('w-11', ['自分の他のクリーチャーがシールドをブレイクした時、カードを１枚引く。']),
  escape: mk('w-12', ['真・エスケープ（このクリーチャーが離れる時、かわりに自分のシールドを２つ手札に加えてもよい。ただし、その「S・トリガー」は使えない）']),
  armed: mk('w-13', ['マナ武装 ３：自分のクリーチャーが離れる時、自分のマナゾーンに光のカードが３枚以上あれば、かわりに自分のシールドを２つ手札に加えてもよい。その「S・トリガー」は使えない。'], { civ: '光' }),
  infinity: mk('w-14', ['∞ブレイカー（「∞ ブレイカー」を持つクリーチャーは、相手のシールドを好きな数ブレイクできる）']),
  variety: mk('w-15', ['バラエティ・ブレイカー（このクリーチャーは、コストが異なる自分のクリーチャーの数、シールドをブレイクする）'], { cost: '5' }),
  cyclone: mk('w-16', ['サイクロン(このターン、この呪文を唱える直前にクリーチャーを召喚していれば、この呪文を唱えた後、墓地に置くかわりに自分の手札に戻す)', 'カードを１枚引く。'], { type: '呪文', power: '' }),
  civil: mk('w-17', ['シビルカウント２：自分の火のクリーチャーまたは火のタマシードが合計２つ以上あれば、このクリーチャーは「スピードアタッカー」を得、バトル中パワーが+5000される。']),
  toGrave: mk('w-18', ['このカードが墓地に置かれた時、その直前にバトルゾーンにあれば、カードを１枚引く。']),
  grSpell: mk('w-19', ['GR召喚を２回する。このターン、それらのGRクリーチャーに「スピードアタッカー」と「ブロッカー」を与える。'], { type: '呪文', power: '' }),
  gr: mk('w-20', [], { type: 'GRクリーチャー', power: '2000' }),
  marshal: mk('w-21', ['マーシャル・タッチ（このクリーチャーがバトルゾーンに出た時、自分の他のクリーチャーを１体、バトルゾーンから手札に戻してもよい。そうしたら、 このクリーチャーの g能力を使う）', '▶ g カードを２枚引く。']),
  bara: mk('w-22', ['バラバラエティ３：自分のクリーチャーすべてに「スピードアタッカー」を与える。（コストが異なる自分のエレメントが３つ以上あれば、このクリーチャーにこの能力を与える）']),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => C.vanilla.id);
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
/** 入力待ちを、はい（accept）または最初の候補で進める */
function settle(s: GameState, accept = true): GameState {
  for (let i = 0; i < 20 && s.pending; i++) {
    const p = s.pending;
    if (p.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: p.player, selected: p.candidates.slice(0, Math.max(p.min, 1)) });
    else if (p.kind === 'chooseMode') s = act(s, { type: 'RESPOND', player: p.player, selected: ['0'] });
    else s = act(s, { type: 'RESPOND', player: p.player, selected: [], accept });
  }
  return s;
}
const newGame = (deck = filler) => createGame({ players: [{ name: 'A', deck }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
});

describe('シールドをブレイクした時', () => {
  it('このクリーチャーがブレイクした時と、自分の他のクリーチャーがブレイクした時に誘発する', () => {
    let s = newGame();
    const a = put(s, 0, C.breakDraw.id, 'battle');
    put(s, 0, C.otherBreak.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'ATTACK', player: 0, attacker: a, target: { kind: 'player' } });
    s = settle(s, false);
    // 自分の能力で1枚、他のクリーチャーの能力で1枚
    expect(s.players[0].zones.hand.length).toBe(hand + 2);
  });
});

describe('置換', () => {
  it('真・エスケープ：離れるかわりにシールドを2つ手札に加える', () => {
    let s = newGame();
    const e = put(s, 0, C.escape.id, 'battle');
    const shields = s.players[0].zones.shield.length;
    s.queue.push({ kind: 'leave', iid: e, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.cards[e].zone).toBe('battle');
    expect(s.players[0].zones.shield.length).toBe(shields - 2);
  });
  it('マナ武装：マナゾーンに光のカードが足りなければ置換しない', () => {
    let s = newGame();
    const e = put(s, 0, C.armed.id, 'battle');
    put(s, 0, C.armed.id, 'mana');
    s.queue.push({ kind: 'leave', iid: e, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.cards[e].zone).toBe('graveyard');
    // 光が3枚あれば置換できる
    s = newGame();
    const e2 = put(s, 0, C.armed.id, 'battle');
    for (let i = 0; i < 3; i++) put(s, 0, C.armed.id, 'mana');
    s.queue.push({ kind: 'leave', iid: e2, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.cards[e2].zone).toBe('battle');
  });
});

describe('ブレイカー', () => {
  it('∞ブレイカーはシールドをすべてブレイクし、バラエティ・ブレイカーはコストの種類の数だけブレイクする', () => {
    const s = newGame();
    expect(breakerCount(s, reg, put(s, 0, C.infinity.id, 'battle'))).toBeGreaterThanOrEqual(5);
    const s2 = newGame();
    const v = put(s2, 0, C.variety.id, 'battle');
    expect(breakerCount(s2, reg, v)).toBe(1);
    put(s2, 0, C.cost2.id, 'battle');
    put(s2, 0, C.cost3.id, 'battle');
    put(s2, 0, C.cost3.id, 'battle');
    expect(breakerCount(s2, reg, v)).toBe(3);
  });
});

describe('呪文・常在', () => {
  it('サイクロン：直前にクリーチャーを召喚していれば、唱えた後に手札に戻る', () => {
    let s = newGame();
    const c = put(s, 0, C.vanilla.id, 'hand');
    const sp = put(s, 0, C.cyclone.id, 'hand');
    for (let i = 0; i < 2; i++) put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: c });
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    s = settle(s);
    expect(s.cards[sp].zone).toBe('hand');
    // 直前が召喚でなければ墓地へ
    let t = newGame();
    const sp2 = put(t, 0, C.cyclone.id, 'hand');
    put(t, 0, C.vanilla.id, 'mana');
    t = act(t, { type: 'PLAY_CARD', player: 0, iid: sp2 });
    t = settle(t);
    expect(t.cards[sp2].zone).toBe('graveyard');
  });
  it('シビルカウント：条件を満たすとスピードアタッカーを得、バトル中だけパワーが上がる', () => {
    let s = newGame();
    const c = put(s, 0, C.civil.id, 'battle');
    expect(keywords(s, reg, c).speedAttacker).toBeFalsy();
    put(s, 0, C.vanilla.id, 'battle');
    expect(keywords(s, reg, c).speedAttacker).toBe(true);
    expect(power(s, reg, c)).toBe(3000);
    const d = put(s, 1, C.vanilla.id, 'battle');
    s.cards[d].tapped = true;
    s = act(s, { type: 'ATTACK', player: 0, attacker: c, target: { kind: 'creature', iid: d } });
    expect(s.log.some((l) => /8000/.test(typeof l === 'string' ? l : l.text))).toBe(true);
  });
  it('バラバラエティ：コストが異なるエレメントが3つ以上あれば、自分のクリーチャーすべてにスピードアタッカーを与える', () => {
    const s = newGame();
    const b = put(s, 0, C.bara.id, 'battle');
    const v = put(s, 0, C.cost2.id, 'battle');
    expect(keywords(s, reg, v).speedAttacker).toBeFalsy();
    put(s, 0, C.cost3.id, 'battle');
    expect(keywords(s, reg, v).speedAttacker).toBe(true);
    expect(keywords(s, reg, b).speedAttacker).toBe(true);
  });
  it('バトルゾーンから墓地に置かれた時に誘発する（手札から捨てた時は誘発しない）', () => {
    let s = newGame();
    const g = put(s, 0, C.toGrave.id, 'battle');
    const hand = s.players[0].zones.hand.length;
    s.queue.push({ kind: 'leave', iid: g, to: 'graveyard', cause: 'destroy' });
    new Ctx(s, reg).run();
    s = settle(s);
    expect(s.players[0].zones.hand.length).toBe(hand + 1);
  });
  it('GR召喚で出したクリーチャーに、このターン能力を与える', () => {
    let s = newGame([...filler.slice(0, 37), C.gr.id, C.gr.id, C.gr.id]);
    const sp = put(s, 0, C.grSpell.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    s = settle(s);
    const grs = s.players[0].zones.battle.filter((x) => s.cards[x].cardId === C.gr.id);
    expect(grs).toHaveLength(2);
    for (const g of grs) expect(keywords(s, reg, g)).toMatchObject({ speedAttacker: true, blocker: true });
  });
  it('マーシャル・タッチ：他のクリーチャーを手札に戻したら、記号つきの能力を使う', () => {
    let s = newGame();
    put(s, 0, C.vanilla.id, 'battle');
    const m = put(s, 0, C.marshal.id, 'hand');
    put(s, 0, C.vanilla.id, 'mana');
    const hand = s.players[0].zones.hand.length;
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: m });
    s = settle(s);
    // 手札：出したカード -1、戻したクリーチャー +1、引いた2枚 +2
    expect(s.players[0].zones.hand.length).toBe(hand + 2);
  });
});
});

// ════════════════════════ autoMore.test.ts ════════════════════════
describe('autoMore', () => {
// 手動処理だった能力を自動にした分のテスト（条件つきで「〜」を得る、ハンティング、すべてのバトルに勝つ、パワーを0にするなど）
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const face = (name: string, abilities: string[], o: O = {}) => ({
  ...base,
  name,
  race: o.race ?? 'テスト',
  civilization: o.civ ?? '火',
  type: o.type ?? 'クリーチャー',
  power: o.power ?? '3000',
  cost: o.cost ?? '1',
  abilities,
});
const mk = (id: string, abilities: string[], o: O = {}) => convertOfficialCard({ id, detailUrl: '', faces: [face(id, abilities, o)] });

const C = {
  fireSa: mk('a-1', ['バトルゾーンに自分の他の火のクリーチャーがあれば、このクリーチャーは「スピードアタッカー」を得る。']),
  manaBuff: mk('a-2', ['自分のマナゾーンに火のカードが３枚以上あれば、このクリーチャーのパワーは+4000され、「W・ブレイカー」を得る。']),
  hunter: mk('a-3', ['ハンティング(バトル中、このクリーチャーのパワーは、バトルゾーンにある自分のハンター１体につき+1000される)'], { race: 'ヒューマノイド/ハンター', power: '3000' }),
  winner: mk('a-4', ['このクリーチャーはすべてのバトルに勝つ。'], { power: '1000' }),
  battleBuff: mk('a-5', ['バトル中、このクリーチャーのパワーを+4000する。'], { power: '2000' }),
  zero: mk('a-6', ['相手のクリーチャーを１体選ぶ。このターン、そのクリーチャーのパワーを０にする。（パワーが０以下のクリーチャーは破壊される）'], { type: '呪文', power: '' }),
  big: mk('a-7', [], { power: '5000' }),
  raceCost: mk('a-8', ['自分のマフィ・ギャングを召喚するコストを１少なくする。ただし、コストは０以下にならない。']),
  mafia: mk('a-9', [], { race: 'マフィ・ギャング', cost: '4', civ: '闇' }),
  knight: mk('a-10', ['自分の他のナイトに「スピードアタッカー」を与える。'], { race: 'ナイト' }),
  knight2: mk('a-11', [], { race: 'ナイト' }),
  sasa3: mk('a-13', ['ササゲール３（ディスペクターを召喚する時、コストを３少なくしてもよい。そうしたら、このクリーチャーを破壊する。そのディスペクターのコストは０以下にはならない）'], { race: 'ディスタス', cost: '3' }),
  sasa4: mk('a-14', ['ササゲール４（自分のディスペクター・クリーチャーの召喚コストを４少なくしてもよい。そうしたら、このエレメントを破壊する。ただしコストは０以下にならない）'], { race: 'ディスタス', cost: '4' }),
  dispecter: mk('a-15', [], { race: 'ディスペクター/テスト', cost: '7', power: '9000' }),
  reveal: mk('a-12', ['自分の山札の上から１枚目を表向きにする。そのカードが呪文であれば、自分の手札に加える。それ以外のカードであれば、自分の墓地に置く。'], { type: '呪文', power: '' }),
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 11, firstPlayer: 0 }, reg);

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('種族の召喚コスト軽減は「N以下にならない」を下限にする', () => {
    expect(parseAbilityText('自分のビートジョッキーを召喚するコストを１少なくする。ただしコストは１以下にならない。', 'creature').statics).toEqual([
      { type: 'costMod', amount: -1, appliesTo: { owner: 'self', filter: { race: 'ビートジョッキー', cardType: 'creature' } }, minCost: 2 },
    ]);
  });
  it('自分の水のハンターは攻撃されない', () => {
    expect(parseAbilityText('自分の水のハンターは攻撃されない。', 'creature').statics[0]).toMatchObject({ type: 'grantKeyword', keywords: { cannotBeAttacked: true } });
  });
});

describe('エンジンで動く', () => {
  it('「他の」火のクリーチャーがいる時だけ「スピードアタッカー」を得る（自分自身は数えない）', () => {
    const s = newGame();
    const a = put(s, 0, C.fireSa.id, 'battle');
    expect(keywords(s, reg, a).speedAttacker).toBeFalsy();
    put(s, 0, C.big.id, 'battle');
    expect(keywords(s, reg, a).speedAttacker).toBe(true);
  });

  it('マナの条件でパワーと「W・ブレイカー」を得る', () => {
    const s = newGame();
    const a = put(s, 0, C.manaBuff.id, 'battle');
    expect(power(s, reg, a)).toBe(3000);
    for (let i = 0; i < 3; i++) put(s, 0, C.big.id, 'mana');
    expect(power(s, reg, a)).toBe(7000);
    expect(keywords(s, reg, a).breaker).toBe(2);
  });

  it('ハンティング：バトル中だけ自分のハンター1体につき+1000（ハンター2体で 3000+2000 → 5000 と相打ち）', () => {
    let s = newGame();
    const h = put(s, 0, C.hunter.id, 'battle', true);
    put(s, 0, C.hunter.id, 'battle');
    const d = put(s, 1, C.big.id, 'battle');
    s.cards[d].tapped = true;
    expect(power(s, reg, h)).toBe(3000);
    s = act(s, { type: 'ATTACK', player: 0, attacker: h, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.cards[h].zone).toBe('graveyard');
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('すべてのバトルに勝つ：パワー1000でも5000に勝つ', () => {
    let s = newGame();
    const w = put(s, 0, C.winner.id, 'battle', true);
    const d = put(s, 1, C.big.id, 'battle');
    s.cards[d].tapped = true;
    s = act(s, { type: 'ATTACK', player: 0, attacker: w, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.cards[w].zone).toBe('battle');
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('バトル中のパワー修正：2000+4000 で 5000 に勝つ', () => {
    let s = newGame();
    const b = put(s, 0, C.battleBuff.id, 'battle', true);
    const d = put(s, 1, C.big.id, 'battle');
    s.cards[d].tapped = true;
    expect(power(s, reg, b)).toBe(2000);
    s = act(s, { type: 'ATTACK', player: 0, attacker: b, target: { kind: 'creature', iid: d } });
    if (s.pending?.kind === 'block') s = act(s, { type: 'RESPOND', player: 1, selected: [] });
    expect(s.cards[b].zone).toBe('battle');
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('パワーを0にする：選んだクリーチャーは破壊される', () => {
    let s = newGame();
    const d = put(s, 1, C.big.id, 'battle');
    const sp = put(s, 0, C.zero.id, 'hand');
    for (let i = 0; i < 2; i++) put(s, 0, C.big.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [d] });
    expect(s.cards[d].zone).toBe('graveyard');
  });

  it('種族の召喚コスト軽減', () => {
    const s = newGame();
    const m = put(s, 0, C.mafia.id, 'hand');
    expect(effectiveCost(s, reg, 0, m)).toBe(4);
    put(s, 0, C.raceCost.id, 'battle');
    expect(effectiveCost(s, reg, 0, m)).toBe(3);
  });

  it('「すべて」のない「自分の他のナイトに〜を与える」', () => {
    const s = newGame();
    const k = put(s, 0, C.knight.id, 'battle');
    const k2 = put(s, 0, C.knight2.id, 'battle');
    expect(keywords(s, reg, k2).speedAttacker).toBe(true);
    expect(keywords(s, reg, k).speedAttacker).toBeFalsy();
  });

  it('ササゲール：破壊したクリーチャーの数だけディスペクターのコストが少なくなる（0以下にならない）', () => {
    const s = newGame();
    const a = put(s, 0, C.sasa3.id, 'battle');
    const b = put(s, 0, C.sasa4.id, 'battle');
    const d = put(s, 0, C.dispecter.id, 'hand');
    const other = put(s, 0, C.big.id, 'hand');
    expect(keywords(s, reg, a).sasageru).toBe(3);
    expect(sasageruCandidates(s, reg, 0, d)).toEqual([a, b]);
    expect(sasageruCandidates(s, reg, 0, other)).toEqual([]);
    expect(effectiveCost(s, reg, 0, d, 'main', [a])).toBe(4);
    expect(effectiveCost(s, reg, 0, d, 'main', [a, b])).toBe(1);
  });

  it('ササゲール：マナが足りない時はササゲールで召喚でき、CPU もそれを選べる', () => {
    let s = newGame();
    const a = put(s, 0, C.sasa3.id, 'battle');
    const b = put(s, 0, C.sasa4.id, 'battle');
    const d = put(s, 0, C.dispecter.id, 'hand');
    for (let i = 0; i < 3; i++) put(s, 0, C.big.id, 'mana');
    // 3マナ：ササゲール4（7→3）だけで足りる
    expect(minimalSacrifice(s, reg, 0, d)).toEqual([b]);
    expect(getLegalActions(s, reg, 0)).toContainEqual({ type: 'PLAY_CARD', player: 0, iid: d, sacrifice: [b] });
    expect(() => act(s, { type: 'PLAY_CARD', player: 0, iid: d })).toThrow(/マナが足りません/);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: d, sacrifice: [b] });
    expect(s.cards[b].zone).toBe('graveyard');
    expect(s.cards[a].zone).toBe('battle');
    expect(s.cards[d].zone).toBe('battle');
    expect(s.players[0].zones.mana.filter((m) => s.cards[m].tapped)).toHaveLength(3);
  });

  it('ササゲール：ササゲールを持たないクリーチャーは破壊に使えない', () => {
    const s = newGame();
    const x = put(s, 0, C.big.id, 'battle');
    const d = put(s, 0, C.dispecter.id, 'hand');
    for (let i = 0; i < 7; i++) put(s, 0, C.big.id, 'mana');
    expect(() => act(s, { type: 'PLAY_CARD', player: 0, iid: d, sacrifice: [x] })).toThrow(/ササゲール/);
  });

  it('「そのカードが呪文であれば手札、それ以外は墓地」', () => {
    let s = newGame();
    const top = put(s, 0, C.big.id, 'deck');
    const sp = put(s, 0, C.reveal.id, 'hand');
    put(s, 0, C.big.id, 'mana');
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: sp });
    expect(s.cards[top].zone).toBe('graveyard');
  });
});
});

// ════════════════════════ resetDiscard.test.ts ════════════════════════
describe('resetDiscard', () => {
// 手札を見て「N枚まで」選んで捨てさせる、各プレイヤーのカードをすべて山札に戻す、「**」や補足説明の後に続く能力語の行
const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type O = { civ?: string; type?: string; power?: string; cost?: string; race?: string };
const mk = (id: string, abilities: string[], o: O = {}) =>
  convertOfficialCard({
    id,
    detailUrl: '',
    faces: [{ ...base, name: id, race: o.race ?? 'テスト', civilization: o.civ ?? '闇', type: o.type ?? 'クリーチャー', power: o.power ?? '3000', cost: o.cost ?? '1', abilities }],
  });

const RESET = '各プレイヤーは、バトルゾーン、手札、シールドゾーン、墓地にある自身のカードをすべて山札に加えてシャッフルする。';
const C = {
  vanilla: mk('r-1', [], { power: '5000' }),
  peek: mk('r-2', ['このクリーチャーがバトルゾーンに出た時、相手の手札を見て３枚まで選び、捨てさせる。', 'W・ブレイカー']),
  reset: mk('r-3', [RESET], { type: '呪文', power: '' }),
  d2: mk('r-4', [
    '自分のターンの終わりに、カードを１枚引いてもよい。（他のD２フィールドがバトルゾーンに出た時、このD２フィールドを自分の墓地に置く）**Dスイッチ：相手のクリーチャーが自分を攻撃する時、このD２フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、水のコスト７以下の呪文を１枚、自分の手札からコストを支払わずに唱えてもよい。',
  ], { type: 'D2フィールド', power: '', civ: '水' }),
};
const reg = buildRegistry([...SAMPLE_CARDS, ...Object.values(C)]);
const filler = Array.from({ length: 40 }, () => 'S01-043');
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
const newGame = () => createGame({ players: [{ name: 'A', deck: filler }, { name: 'B', deck: filler }], seed: 7, firstPlayer: 0 }, reg);
const play = (s: GameState, cardId: string, cost = 1) => {
  const iid = put(s, 0, cardId, 'hand');
  for (let i = 0; i < cost; i++) put(s, 0, C.vanilla.id, 'mana');
  return act(s, { type: 'PLAY_CARD', player: 0, iid });
};

describe('読み取り', () => {
  it('すべて自動処理になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「**」や補足説明の後の能力語は別の行として読む', () => {
    expect(C.d2.abilities?.map((a) => a.when)).toEqual(['onTurnEnd', 'onOtherAttackPlayer']);
    const joined = parseAbilityText('自分のターンの終わりに、カードを１枚引いてもよい。（補足）Dスイッチ：相手のクリーチャーが自分を攻撃する時、このD２フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、カードを１枚引く。', 'creature');
    expect(joined.manualLines).toEqual([]);
    expect(joined.abilities).toHaveLength(2);
  });
});

describe('効果', () => {
  it('相手の手札を見て3枚まで選んで捨てさせる（0〜3枚）', () => {
    let s = newGame();
    const hand = [...s.players[1].zones.hand];
    s = play(s, C.peek.id);
    for (let i = 0; i < 4 && s.pending; i++) {
      if (s.pending.kind === 'selectCards') {
        expect(s.pending).toMatchObject({ min: 0, max: 3 });
        s = act(s, { type: 'RESPOND', player: 0, selected: hand.slice(0, 2) });
      } else s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true });
    }
    expect(s.players[1].zones.graveyard).toEqual(expect.arrayContaining(hand.slice(0, 2)));
    expect(s.players[1].zones.hand).toHaveLength(hand.length - 2);
  });
  it('各プレイヤーのバトルゾーン・手札・シールド・墓地のカードをすべて山札に戻してシャッフルする', () => {
    let s = newGame();
    put(s, 0, C.vanilla.id, 'battle');
    put(s, 1, C.vanilla.id, 'battle');
    put(s, 1, C.vanilla.id, 'graveyard');
    const total = (p: PlayerId) => Object.values(s.cards).filter((c) => c.owner === p).length;
    s = play(s, C.reset.id);
    for (let i = 0; i < 4 && s.pending; i++) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true });
    for (const p of [0, 1] as PlayerId[]) {
      const z = s.players[p].zones;
      expect([z.battle, z.hand, z.shield].map((x) => x.length)).toEqual([0, 0, 0]);
      // 唱えた呪文は最後に墓地へ。マナゾーンはそのまま
      expect(z.graveyard.length).toBe(p === 0 ? 1 : 0);
      expect(z.deck.length + z.graveyard.length + z.mana.length).toBe(total(p));
    }
  });
});
});
