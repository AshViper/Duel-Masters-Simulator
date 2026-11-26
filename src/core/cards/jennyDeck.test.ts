// デスパペット（ジェニー）デッキの能力：各プレイヤーが自身のカードを選ぶ・残して墓地へ、山札から墓地への置換、
// 各ターンの出せる数、逆転撃、－∞、「〜ず、」の能力、次の相手のターン中だけの常在効果、超次元ゾーンへ置く呪文、S-MAX進化など
import { describe, expect, it } from 'vitest';
import { Ctx, applyAction } from '../engine/engine';
import { keywords, power } from '../engine/queries';
import { createGame } from '../engine/setup';
import type { Action, GameState, PlayerId } from '../engine/types';
import { SAMPLE_CARDS } from '../testing/fixtureCards';
import { convertOfficialCard } from './officialConvert';
import { buildRegistry } from './registry';
import type { ZoneName } from './types';

const base = { packName: '(T 1/1)', imageUrl: '', rarity: 'C', mana: '1', illustrator: '', flavor: '' };
type F = { name?: string; civ?: string; type?: string; power?: string; cost?: string; race?: string; abilities: string[] };
const face = (id: string, f: F) => ({ ...base, name: f.name ?? id, race: f.race ?? 'デスパペット', civilization: f.civ ?? '闇', type: f.type ?? 'クリーチャー', power: f.power ?? '2000', cost: f.cost ?? '2', abilities: f.abilities });
const mk = (id: string, ...faces: F[]) => convertOfficialCard({ id, detailUrl: '', faces: faces.map((f) => face(id, f)) });

const BOLME = ['ブロッカー', 'W・ブレイカー', 'このクリーチャーはブロックされず、相手に選ばれない。', 'このクリーチャーが出た時、次の自分のターンのはじめまで、相手のクリーチャーはすべて、攻撃もブロックもできない。', 'Zラッシュ（シールドが離れたら、次の自分のターンのはじめまで、このクリーチャーのハイパーモードを解放する）'];
const C = {
  akaivu: mk('jd-1', { abilities: ['W・ブレイカー', 'このクリーチャーが出た時、自分のエレメントを１つ破壊する。その後、各プレイヤーは自身のエレメントを１つ選び、破壊する。'], power: '8000' }),
  jenimoon: mk(
    'jd-2',
    { name: '弾手人形ジェニムーン', abilities: ['ブロッカー', 'このクリーチャーは攻撃できない。', 'このクリーチャーが出た時、相手は自身の手札を１枚選んで捨てる。'], power: '1000' },
    { name: '月のダンスを見においで', type: '呪文', cost: '5', race: '', power: '', abilities: ['S・トリガー', '相手のクリーチャーを１体選び、破壊する。', 'この呪文を唱えた後、墓地のかわりに自分の超次元ゾーンに置く。'] },
  ),
  kareiko: mk('jd-3', { type: 'タマシード', race: 'オラクル/レクスターズ', power: '', cost: '3', abilities: ['シンカライズ：このタマシードがクリーチャーであるかのように、この上に進化クリーチャーを置いてもよい。', 'いずれかのプレイヤーの山札から、手札以外のゾーンにカードが置かれる時、かわりにそのプレイヤーは、そのカードを墓地に置く。'] }),
  kurin: mk('jd-4', { civ: '水', cost: '3', power: '3000', abilities: ['ジャストダイバー', '各ターンに１度、自分のデスパペットが出た時、カードを１枚引いてもよい。', '各ターン、相手はクリーチャーを２体までしか出せない。'] }),
  gyakuten: mk('jd-5', {
    type: '呪文',
    race: '',
    power: '',
    cost: '4',
    abilities: ['逆転撃{dd03}：クリーチャーが自分を攻撃する時、その攻撃中にまだ「逆転撃」を使っていなければ、この呪文を自分の手札からコストを支払わずに唱えてもよい。そうしたら、次の自分のターンのはじめに{dd03}を支払う。支払えなければ、自分はゲームに負ける。', '相手のクリーチャーを１体選ぶ。このターン、そのクリーチャーのパワーを －∞ する。（パワー０以下のクリーチャーは破壊される）'],
  }),
  bolme: mk(
    'jd-6',
    { name: 'ボルメテウス', type: 'ドリーム・クリーチャー', race: 'エクスドリーマー', civ: '水', cost: '5', power: '7000', abilities: BOLME },
    { name: 'ボルメテウス', type: 'ドリーム・クリーチャー', race: 'エクスドリーマー', civ: '水', cost: '5', power: '12000', abilities: [...BOLME, 'T・ブレイカー', 'このクリーチャーが相手のシールドをブレイクする時、そのシールドを手札に加えるかわりに持ち主の山札の下に置く。その後、各プレイヤーはこうして置かれたシールドの数、カードを引く。'] },
  ),
  brain: mk('jd-7', {
    type: '呪文',
    civ: '水/闇',
    race: '',
    power: '',
    cost: '6',
    abilities: ['S・トリガー', '次のうちいずれか１つを選ぶ。自分のクリーチャーまたはタマシードの中に水と闇があれば、かわりに両方選んでもよい。\n▶カードを３枚引き、その後、１枚捨てる。\n▶コスト８以下のクリーチャーを１体、自分の墓地から出す。'],
  }),
  crymax: mk('jd-8', {
    type: 'S-MAX進化クリーチャー',
    race: 'デモニオ/鬼レクスターズ',
    cost: '7',
    power: '13000',
    abilities: ['鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。（このクリーチャーは進化元を必要としない。自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す）', 'T・ブレイカー', 'このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。'],
  }),
  vt: mk('jd-9', {
    race: 'マジック・アウトレイジMAX',
    civ: '水',
    cost: '8',
    power: '12000',
    abilities: ['ジャストダイバー', 'T・ブレイカー', 'このクリーチャーが出た時、相手のパワー5000以下のクリーチャーをすべて、持ち主の手札に戻す。次の相手のターン中、相手はパワー5000以下のクリーチャーを出せない。'],
  }),
  vamiria: mk(
    'jd-10',
    { name: 'ヴァミリア', civ: '水/闇', cost: '3', power: '3000', abilities: ['ブロッカー'] },
    { name: 'ヴァミリア', civ: '水/闇', cost: '3', power: '6000', abilities: ['ブロッカー', '相手がカードを引いた時、それがそのターンに相手が引く１枚目でなければ、相手は自身の手札を１枚選んで捨てる。'] },
  ),
  seed: mk('jd-13', { type: 'タマシード', race: 'テスト', power: '', cost: '2', abilities: [] }),
  small: mk('jd-11', { race: 'テスト', civ: '火', cost: '1', power: '3000', abilities: [] }),
  water: mk('jd-12', { race: 'テスト', civ: '光/水/闇/火/自然', cost: '1', power: '1000', abilities: [] }),
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
const mana = (s: GameState, p: PlayerId, n: number) => {
  // 多色のマナはタップして置かれるので、アンタップしておく
  for (let i = 0; i < n; i++) s.cards[put(s, p, C.water.id, 'mana')].tapped = false;
};
const play = (s: GameState, iid: string, m: number) => {
  mana(s, 0, m);
  return act(s, { type: 'PLAY_CARD', player: 0, iid });
};

describe('読み取り', () => {
  it('デッキのカードがすべて自動になる', () => {
    for (const c of Object.values(C)) expect([c.id, c.support]).toEqual([c.id, 'full']);
  });
  it('「ブロックされず、相手に選ばれない」は2つのキーワード', () => {
    expect(C.bolme.keywords).toMatchObject({ unblockable: true, untargetable: true, blocker: true });
  });
});

describe('各プレイヤーが自身のカードを選ぶ', () => {
  it('アカイブ：自分のエレメントを1つ破壊し、その後、各プレイヤーは自身のエレメントを1つ選んで破壊する', () => {
    let s = newGame();
    const mine = [put(s, 0, C.small.id, 'battle'), put(s, 0, C.small.id, 'battle')];
    const theirs = [put(s, 1, C.small.id, 'battle'), put(s, 1, C.small.id, 'battle')];
    const ak = put(s, 0, C.akaivu.id, 'hand');
    s = play(s, ak, 2);
    // 自分のエレメント（アカイブ自身を含む3つ）から1つ
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, min: 1, max: 1 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [mine[0]] });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0 });
    s = act(s, { type: 'RESPOND', player: 0, selected: [mine[1]] });
    // 相手は自身のエレメントを選ぶ
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, selected: [theirs[1]] });
    expect(mine.map((x) => s.cards[x].zone)).toEqual(['graveyard', 'graveyard']);
    expect(theirs.map((x) => s.cards[x].zone)).toEqual(['battle', 'graveyard']);
    expect(s.cards[ak].zone).toBe('battle');
  });

  it('CRYMAX ジャオウガ：各プレイヤーはシールドを3つ選んで残し、残りを墓地に置く', () => {
    let s = newGame();
    const jo = put(s, 0, C.crymax.id, 'hand');
    s = play(s, jo, 7);
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 0, min: 3, max: 3 });
    const keep0 = s.players[0].zones.shield.slice(0, 3);
    s = act(s, { type: 'RESPOND', player: 0, selected: keep0 });
    expect(s.pending).toMatchObject({ kind: 'selectCards', player: 1, min: 3, max: 3 });
    const keep1 = s.players[1].zones.shield.slice(1, 4);
    s = act(s, { type: 'RESPOND', player: 1, selected: keep1 });
    expect([...s.players[0].zones.shield].sort()).toEqual([...keep0].sort());
    expect([...s.players[1].zones.shield].sort()).toEqual([...keep1].sort());
    expect(s.players[1].zones.graveyard).toHaveLength(2);
  });
});

describe('常在効果', () => {
  it('カレイコの黒像：山札から手札以外のゾーンに置かれるカードは墓地へ', () => {
    let s = newGame();
    put(s, 0, C.kareiko.id, 'battle');
    const ctx = new Ctx(s, reg);
    const top = s.players[1].zones.deck[s.players[1].zones.deck.length - 1];
    ctx.moveCard(top, 'mana');
    expect(s.cards[top].zone).toBe('graveyard');
    const top2 = s.players[0].zones.deck[s.players[0].zones.deck.length - 1];
    ctx.moveCard(top2, 'hand');
    expect(s.cards[top2].zone).toBe('hand');
    void act;
  });

  it('クリン・ラビィ：相手は各ターン2体までしかクリーチャーを出せない', () => {
    let s = newGame();
    put(s, 1, C.kurin.id, 'battle');
    const hs = [put(s, 0, C.small.id, 'hand'), put(s, 0, C.small.id, 'hand'), put(s, 0, C.small.id, 'hand')];
    mana(s, 0, 3);
    for (const h of hs.slice(0, 2)) s = act(s, { type: 'PLAY_CARD', player: 0, iid: h });
    expect(applyAction(s, { type: 'PLAY_CARD', player: 0, iid: hs[2] }, reg).error).toBeTruthy();
  });

  it('5000VT：出た時に小さいクリーチャーを戻し、次の相手のターン中だけ出せない', () => {
    let s = newGame();
    const o = put(s, 1, C.small.id, 'battle');
    s = play(s, put(s, 0, C.vt.id, 'hand'), 8);
    expect(s.cards[o].zone).toBe('hand');
    s = act(s, { type: 'END_TURN', player: 0 });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    mana(s, 1, 1);
    expect(applyAction(s, { type: 'PLAY_CARD', player: 1, iid: o }, reg).error).toBeTruthy();
    s = act(s, { type: 'END_TURN', player: 1 });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    s = act(s, { type: 'END_TURN', player: 0 });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    s = act(s, { type: 'PLAY_CARD', player: 1, iid: o });
    expect(s.cards[o].zone).toBe('battle');
  });

  it('ボルメテウス：出た時、次の自分のターンのはじめまで相手のクリーチャーは攻撃もブロックもできない', () => {
    let s = newGame();
    const o = put(s, 1, C.small.id, 'battle');
    s = play(s, put(s, 0, C.bolme.id, 'hand'), 5);
    expect(keywords(s, reg, o)).toMatchObject({ cannotAttack: true, cannotBlock: true });
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(keywords(s, reg, o).cannotAttack).toBe(true);
  });
});

describe('逆転撃と－∞', () => {
  function attacked() {
    let s = newGame();
    const atk = put(s, 0, C.small.id, 'battle');
    const sp = put(s, 1, C.gyakuten.id, 'hand');
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    return { s, atk, sp };
  }
  it('クリーチャーが自分を攻撃する時に唱え、パワーを－∞して破壊する。次の自分のターンのはじめに3マナ支払う', () => {
    let { s, atk, sp } = attacked();
    expect(s.cards[atk].zone).toBe('graveyard');
    expect(s.cards[sp].zone).toBe('graveyard');
    mana(s, 1, 4);
    for (const m of s.players[1].zones.mana) s.cards[m].tapped = true;
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.gameOverReason).toBeNull();
    expect(s.players[1].zones.mana.filter((m) => s.cards[m].tapped)).toHaveLength(3);
  });
  it('支払えなければ負ける', () => {
    let { s } = attacked();
    s = act(s, { type: 'END_TURN', player: 0 });
    expect(s.winner).toBe(0);
  });
  it('－∞は数で表しても、どんな大きなパワーでも0以下', () => {
    const s = newGame();
    const big = put(s, 0, C.vt.id, 'battle');
    s.cards[big].powerModTurn = -999999999;
    expect(power(s, reg, big)).toBeLessThanOrEqual(0);
  });
});

describe('呪文', () => {
  it('ブレイン・スラッシュ：水と闇があれば両方選べる。「1枚捨てる」は自分の手札', () => {
    let s = newGame();
    put(s, 0, C.vamiria.id, 'battle');
    const g = put(s, 0, C.small.id, 'graveyard');
    s = play(s, put(s, 0, C.brain.id, 'hand'), 6);
    expect(s.pending).toMatchObject({ kind: 'chooseMode', player: 0 });
    expect((s.pending as { options: string[] }).options.length).toBe(3);
    s = act(s, { type: 'RESPOND', player: 0, selected: ['2'] });
    for (let i = 0; i < 5 && s.pending; i++) s = act(s, { type: 'RESPOND', player: 0, accept: true, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min || 1) : undefined });
    expect(s.cards[g].zone).toBe('battle');
    expect(s.players[0].zones.graveyard.length).toBeGreaterThanOrEqual(2);
  });

  it('月のダンスを見においで：唱えた後は超次元ゾーンへ', () => {
    let s = newGame();
    const o = put(s, 1, C.small.id, 'battle');
    const tw = put(s, 0, C.jenimoon.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: tw, side: 'twin' });
    expect(s.cards[o].zone).toBe('graveyard');
    expect(s.cards[tw].zone).toBe('hyperspatial');
  });
});

describe('S-MAX進化', () => {
  it('負ける時、かわりに自分の表向きのカードを3枚破壊する', () => {
    let s = newGame();
    const jo = put(s, 1, C.crymax.id, 'battle');
    const others = [put(s, 1, C.small.id, 'battle'), put(s, 1, C.small.id, 'battle'), put(s, 1, C.seed.id, 'battle')];
    for (const sh of [...s.players[1].zones.shield]) new Ctx(s, reg).moveCard(sh, 'graveyard');
    const atk = put(s, 0, C.small.id, 'battle');
    s = act(s, { type: 'ATTACK', player: 0, attacker: atk, target: { kind: 'player' } });
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: false, selected: [] });
    expect(s.gameOverReason).toBeNull();
    expect(others.map((x) => s.cards[x].zone)).toEqual(['graveyard', 'graveyard', 'graveyard']);
    expect(s.cards[jo].zone).toBe('battle');
  });

  it('離れる時、かわりに他の表向きのカードを3枚破壊してもよい', () => {
    let s = newGame();
    const jo = put(s, 1, C.crymax.id, 'battle');
    const others = [put(s, 1, C.small.id, 'battle'), put(s, 1, C.small.id, 'battle'), put(s, 1, C.seed.id, 'battle')];
    const tw = put(s, 0, C.jenimoon.id, 'hand');
    mana(s, 0, 5);
    s = act(s, { type: 'PLAY_CARD', player: 0, iid: tw, side: 'twin' });
    if (s.pending?.kind === 'selectCards') s = act(s, { type: 'RESPOND', player: 0, selected: [jo] });
    expect(s.pending).toMatchObject({ kind: 'confirm', player: 1 });
    s = act(s, { type: 'RESPOND', player: 1, accept: true });
    expect(s.cards[jo].zone).toBe('battle');
    expect(others.map((x) => s.cards[x].zone)).toEqual(['graveyard', 'graveyard', 'graveyard']);
  });

  it('S-MAX進化クリーチャーは1体しか残らない', () => {
    let s = newGame();
    const a = put(s, 0, C.crymax.id, 'battle');
    const b = put(s, 0, C.crymax.id, 'hand');
    s = play(s, b, 7);
    while (s.pending) s = act(s, { type: 'RESPOND', player: s.pending.player, accept: true, selected: s.pending.kind === 'selectCards' ? s.pending.candidates.slice(0, s.pending.min) : undefined });
    expect(s.cards[a].zone).toBe('hand');
    expect(s.cards[b].zone).toBe('battle');
  });
});

describe('ハイパーモード', () => {
  it('ボルメテウス：ブレイクしたシールドを山札の下に置き、各プレイヤーはその数引く', () => {
    expect(C.bolme.hyperForm?.keywords).toMatchObject({ shieldBreakTo: 'deckBottom', shieldBreakEachDraws: true });
  });
  it('ヴァミリア：相手がそのターン2枚目以降を引いた時に誘発する', () => {
    expect(C.vamiria.hyperForm?.abilities?.[0]).toMatchObject({ when: 'onDraw', who: 'opponent', minDrawCount: 2 });
  });
});
