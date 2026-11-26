// 公式カードの能力テキストの読み取りと、読み取った効果がエンジンで実際に動くことのテスト
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { attackTargets, isUntargetable, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import { parseAbilityText } from './textParser';
import type { ZoneName } from './types';

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
    expect(p.abilities).toEqual([
      { when: 'onSummon', effects: [{ type: 'draw', count: 1 }] },
      { when: 'onSummon', optional: true, effects: [{ type: 'move', to: 'graveyard', target: { owner: 'self', zone: 'hand', count: 1 } }] },
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
    // 一部だけ読める文も丸ごと手動にする
    const partial = creature('このクリーチャーがバトルゾーンに出た時、カードを1枚引く。その後、相手の手札を見る。');
    expect(partial.abilities[0].effects[0].type).toBe('manual');
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
