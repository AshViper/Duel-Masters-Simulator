// ゲーム状態を読むだけの関数群（状態を変更しない）。UI・AI・エンジンで共用する。
// 常在効果（パワー修正・キーワード付与・コスト増減・召喚制限）はここで計算する。
import type { CardRegistry } from '../cards/registry';
import {
  isCreatureType,
  manaCivilizations,
  playFace,
  type Applies,
  type CardDefinition,
  type CardFilter,
  type Civilization,
  type Condition,
  type Keywords,
  type PlayFace,
  type Quantity,
  type StaticAbility,
  type TargetSpec,
} from '../cards/types';
import { other, type AttackTarget, type CardInstance, type GameState, type PlayerId } from './types';

// ───────────────────────── 問い合わせのキャッシュ ─────────────────────────
// 画面の描画では、同じ盤面に対して同じ問い合わせ（パワー・コスト・使えるか・攻撃先）を何度もする。
// 盤面（GameState）はアクションのたびに新しく作られるので、「もう変更しない」と印を付けた状態に限り結果を覚える。
// エンジンの処理中の状態（その場で書き換える）には印がないので、いつも計算し直す。
const sealedStates = new WeakSet<GameState>();
const queryCaches = new WeakMap<GameState, Map<string, unknown>>();

/** この状態はもう書き換えないと宣言し、問い合わせの結果を覚えるようにする（対戦画面・CPU 用） */
export function sealForQueries(state: GameState): void {
  sealedStates.add(state);
}

function cached<T>(state: GameState, key: string, fn: () => T): T {
  if (!sealedStates.has(state)) return fn();
  let m = queryCaches.get(state);
  if (!m) queryCaches.set(state, (m = new Map()));
  if (m.has(key)) return m.get(key) as T;
  const v = fn();
  m.set(key, v);
  return v;
}

export function def(state: GameState, reg: CardRegistry, iid: string): CardDefinition {
  const inst = state.cards[iid];
  const d = inst && reg[inst.cardId];
  if (!d) throw new Error(`unknown card ${iid}`);
  if (inst.flipped && d.forbidden) return forbiddenDef(d);
  const base = inst.flipped && d.psychic ? psychicBackDef(d) : inst.hyper && d.hyperForm ? hyperDef(d) : d;
  // 超魂X：下にあるカードの能力も持つ
  if (inst.zone === 'battle' && inst.under.length) {
    const souls = inst.under.map((u) => state.cards[u] && reg[state.cards[u].cardId]).filter((u): u is CardDefinition => !!u?.soul);
    if (souls.length) return withSouls(base, souls);
  }
  return base;
}

const psychicCache = new WeakMap<CardDefinition, CardDefinition>();
/** サイキック・クリーチャーの裏面（覚醒・覚醒リンクした後）のカード定義 */
export function psychicBackDef(d: CardDefinition): CardDefinition {
  let f = psychicCache.get(d);
  if (!f) {
    const c = d.psychic!.back;
    f = { id: d.id, imageUrl: d.imageUrl, imageRef: d.imageRef ? `${d.imageRef}:b` : undefined, set: d.set, rarity: d.rarity, ...c, power: c.power ?? 0, type: 'creature', support: d.support, psychic: d.psychic };
    psychicCache.set(d, f);
  }
  return f;
}

const soulCache = new WeakMap<CardDefinition, Map<string, CardDefinition>>();
/** 超魂X の能力を加えたカード定義 */
function withSouls(d: CardDefinition, souls: CardDefinition[]): CardDefinition {
  const key = souls.map((x) => x.id).join('|');
  let m = soulCache.get(d);
  if (!m) soulCache.set(d, (m = new Map()));
  let out = m.get(key);
  if (!out) {
    out = { ...d };
    for (const x of souls) {
      const so = x.soul!;
      out.keywords = mergeKeywords(out.keywords ?? {}, so.keywords);
      out.abilities = [...(out.abilities ?? []), ...(so.abilities ?? [])];
      out.statics = [...(out.statics ?? []), ...(so.statics ?? [])];
      out.replacements = [...(out.replacements ?? []), ...(so.replacements ?? [])];
    }
    m.set(key, out);
  }
  return out;
}

const forbiddenCache = new WeakMap<CardDefinition, CardDefinition>();
/** 禁断解放した後のカード定義（禁断クリーチャー側） */
export function forbiddenDef(d: CardDefinition): CardDefinition {
  let f = forbiddenCache.get(d);
  if (!f) {
    const c = d.forbidden!.creature;
    f = {
      id: d.id,
      imageUrl: d.imageUrl,
      // 裏側の画像（公式から保存したものは「…:b」に入っている。なければ文字で表示する）
      imageRef: d.imageRef ? `${d.imageRef}:b` : undefined,
      set: d.set,
      rarity: d.rarity,
      ...c,
      type: 'creature',
      support: d.support,
    };
    forbiddenCache.set(d, f);
  }
  return f;
}

/**
 * 両プレイヤーが無視するバトルゾーンのカード：封印されているクリーチャーと、裏返る前の禁断の鼓動。
 * クリーチャーとして数えず、攻撃・ブロック・選択・能力の対象にならない。
 */
export function isIgnored(state: GameState, reg: CardRegistry, iid: string): boolean {
  const inst = state.cards[iid];
  if (!inst || inst.zone !== 'battle') return false;
  if (inst.seals?.length) return true;
  return !!reg[inst.cardId]?.forbidden && !inst.flipped;
}

/** バトルゾーンのカードのうち、無視されないもの（ふつうのクリーチャー） */
export function battleCards(state: GameState, reg: CardRegistry, player: PlayerId): string[] {
  // フィールド（D2フィールドなど）はバトルゾーンにあってもクリーチャーではない
  return state.players[player].zones.battle.filter((iid) => !isIgnored(state, reg, iid) && def(state, reg, iid).type !== 'field');
}

/** バトルゾーンの、無視されないクリーチャーとフィールド（常在効果・置換効果の発生源） */
export function battleAndFields(state: GameState, reg: CardRegistry, player: PlayerId): string[] {
  return state.players[player].zones.battle.filter((iid) => !isIgnored(state, reg, iid));
}

/** 手札以外から召喚できるか（「このクリーチャーを自分の墓地から召喚してもよい」） */
export function canSummonFromZone(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): boolean {
  const inst = state.cards[iid];
  if (!inst || inst.owner !== player || inst.zone === 'hand') return false;
  const sf = def(state, reg, iid).summonFrom;
  if (!sf || !(sf.zones as string[]).includes(inst.zone)) return false;
  return !sf.condition || evalCondition(state, reg, player, sf.condition, true, iid);
}

const hyperCache = new WeakMap<CardDefinition, CardDefinition>();
/** ハイパーモードのカード定義（元の能力＋ハイパーモードで加わる能力） */
function hyperDef(d: CardDefinition): CardDefinition {
  let h = hyperCache.get(d);
  if (!h) {
    const f = d.hyperForm!;
    h = {
      ...d,
      keywords: { ...(d.keywords ?? {}), ...(f.keywords ?? {}) },
      abilities: [...(d.abilities ?? []), ...(f.abilities ?? [])],
      statics: [...(d.statics ?? []), ...(f.statics ?? [])],
      replacements: [...(d.replacements ?? []), ...(f.replacements ?? [])],
    };
    hyperCache.set(d, h);
  }
  return h;
}

/** ハイパー化のためにタップできるクリーチャー。ハイパー化できなければ null */
export function hyperizeCandidates(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string[] | null {
  const inst = state.cards[iid];
  if (!inst || inst.owner !== player || inst.zone !== 'battle' || inst.hyper) return null;
  if (state.activePlayer !== player || (state.phase !== 'main' && state.phase !== 'charge') || state.pending) return null;
  const h = reg[inst.cardId]?.hyper;
  if (!h) return null;
  const cands = battleCards(state, reg, player).filter((b) => !state.cards[b].tapped && !(h.excludeSelf && b === iid) && matchFilter(state, reg, b, h.filter, iid));
  return cands.length >= h.count ? cands : null;
}

// ───────────────────────── 絞り込み ─────────────────────────

/** カード（バトルゾーン以外も可）が条件に合うか。noPower なら現在パワーではなく元のパワーで判定（常在効果の循環防止） */
export function matchFilter(state: GameState, reg: CardRegistry, iid: string, f: CardFilter | undefined, source?: string, noPower = false): boolean {
  if (!f) return true;
  const inst = state.cards[iid];
  const d = def(state, reg, iid);
  if (f.excludeSelf && iid === source) return false;
  if (f.cardType && (f.cardType === 'creature' ? !isCreatureType(d.type) : d.type !== f.cardType)) return false;
  if (f.civilization && !d.civilizations.includes(f.civilization)) return false;
  if (f.civilizations && !f.civilizations.some((c) => d.civilizations.includes(c))) return false;
  if (f.race && !d.races.some((r) => r.includes(f.race!))) return false;
  if (f.races && !f.races.some((x) => d.races.some((r) => r.includes(x)))) return false;
  if (f.nonEvolution && (d.type === 'evolution' || (inst.zone === 'battle' && inst.under.length > 0))) return false;
  if (f.twinpact && !d.twin) return false;
  // 常在効果の中からは元の能力で判定する（循環防止）
  if (f.hasKeyword && !(inst.zone === 'battle' && !noPower ? keywords(state, reg, iid) : (d.keywords ?? {}))[f.hasKeyword]) return false;
  if (f.multicolor && d.civilizations.length < 2) return false;
  if (f.evolution && d.type !== 'evolution') return false;
  // 一番パワーが大きい／小さい：持ち主のクリーチャーの中で比べる（同じパワーならすべて）
  if (f.extremePower && inst.zone === 'battle') {
    const pw = (x: string) => (noPower ? (def(state, reg, x).power ?? 0) : power(state, reg, x));
    const all = battleCards(state, reg, inst.owner).map(pw);
    const target = f.extremePower === 'highest' ? Math.max(...all) : Math.min(...all);
    if (pw(iid) !== target) return false;
  }
  if (f.maxCost !== undefined && d.cost > f.maxCost) return false;
  if (f.minCost !== undefined && d.cost < f.minCost) return false;
  if (f.tapped && !inst.tapped) return false;
  if (f.untapped && inst.tapped) return false;
  if (f.maxPower !== undefined || f.minPower !== undefined) {
    const p = inst.zone === 'battle' && !noPower ? power(state, reg, iid) : (d.power ?? 0);
    if (f.maxPower !== undefined && p > f.maxPower) return false;
    if (f.minPower !== undefined && p < f.minPower) return false;
  }
  return true;
}

/** 使う面（ツインパクトの呪文側を含む）が条件に合うか */
function matchFace(face: PlayFace, d: CardDefinition, f: CardFilter | undefined): boolean {
  if (!f) return true;
  if (f.cardType && (f.cardType === 'creature' ? !isCreatureType(face.type) : face.type !== f.cardType)) return false;
  if (f.civilization && !face.civilizations.includes(f.civilization)) return false;
  if (f.civilizations && !f.civilizations.some((c) => face.civilizations.includes(c))) return false;
  if (f.race && (face.side === 'twin' || !d.races.some((r) => r.includes(f.race!)))) return false;
  if (f.races && (face.side === 'twin' || !f.races.some((x) => d.races.some((r) => r.includes(x))))) return false;
  if (f.nonEvolution && face.type === 'evolution') return false;
  if (f.twinpact && !d.twin) return false;
  if (f.multicolor && face.civilizations.length < 2) return false;
  if (f.maxCost !== undefined && face.cost > f.maxCost) return false;
  if (f.minCost !== undefined && face.cost < f.minCost) return false;
  return true;
}

// ───────────────────────── 常在効果 ─────────────────────────

export interface ActiveStatic {
  controller: PlayerId;
  source: string;
  static: StaticAbility;
}

/** いま有効な常在効果（バトルゾーンのカード＋ターン終了まで有効なもの） */
export function activeStatics(state: GameState, reg: CardRegistry): ActiveStatic[] {
  return cached(state, 'statics', () => activeStaticsImpl(state, reg));
}

function activeStaticsImpl(state: GameState, reg: CardRegistry): ActiveStatic[] {
  const out: ActiveStatic[] = [];
  for (const p of state.players) {
    for (const iid of battleAndFields(state, reg, p.id)) {
      for (const s of def(state, reg, iid).statics ?? []) {
        if (s.duringTurn && (s.duringTurn === 'self') !== (state.activePlayer === p.id)) continue;
        // 条件つきの常在効果（循環を避けるため、条件はパワーを見ずに数える）
        if (s.condition && !evalCondition(state, reg, p.id, s.condition, true, iid)) continue;
        out.push({ controller: p.id, source: iid, static: s });
      }
    }
  }
  for (const t of state.turnStatics ?? []) out.push(t);
  return out;
}

function ownerMatches(owner: Applies['owner'], controller: PlayerId, target: PlayerId): boolean {
  return owner === 'any' || (owner === 'self') === (controller === target);
}

function appliesToCreature(state: GameState, reg: CardRegistry, a: ActiveStatic, applies: Applies, iid: string): boolean {
  const inst = state.cards[iid];
  if (!ownerMatches(applies.owner, a.controller, inst.owner)) return false;
  if (applies.excludeSelf && iid === a.source) return false;
  if (applies.onlySelf && iid !== a.source) return false;
  return matchFilter(state, reg, iid, applies.filter, a.source, true);
}

function mergeKeywords(base: Keywords, add: Keywords | undefined): Keywords {
  if (!add) return base;
  const out: Keywords = { ...base };
  for (const [k, v] of Object.entries(add) as [keyof Keywords, Keywords[keyof Keywords]][]) {
    if (k === 'breaker') out.breaker = Math.max(out.breaker ?? 1, v as number);
    else if (k === 'powerAttacker') out.powerAttacker = (out.powerAttacker ?? 0) + (v as number);
    else if (v) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** 現在のキーワード能力（元の能力＋ターン中の付与＋常在効果） */
export function keywords(state: GameState, reg: CardRegistry, iid: string): Keywords {
  return cached(state, `kw:${iid}`, () => keywordsImpl(state, reg, iid));
}

function keywordsImpl(state: GameState, reg: CardRegistry, iid: string): Keywords {
  const inst = state.cards[iid];
  let kw = mergeKeywords(mergeKeywords({ ...(def(state, reg, iid).keywords ?? {}) }, inst.keywordsTurn), inst.keywordsUntil?.keywords);
  if (inst.zone !== 'battle') return kw;
  for (const a of activeStatics(state, reg)) {
    if (a.static.type === 'grantKeyword' && appliesToCreature(state, reg, a, a.static.appliesTo, iid)) kw = mergeKeywords(kw, a.static.keywords);
  }
  return kw;
}

export function power(state: GameState, reg: CardRegistry, iid: string): number {
  return cached(state, `pw:${iid}`, () => powerImpl(state, reg, iid));
}

function powerImpl(state: GameState, reg: CardRegistry, iid: string): number {
  const inst = state.cards[iid];
  const d = def(state, reg, iid);
  let p = (d.power ?? 0) + inst.powerModTurn;
  if (inst.zone !== 'battle') return Math.max(0, p);
  const attacking = state.combat?.attacker === iid;
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type === 'powerMod' && (!s.attackingOnly || attacking) && appliesToCreature(state, reg, a, s.appliesTo, iid))
      p += s.perCount ? s.amount * countQuantity(state, reg, a.controller, s.perCount, true, a.source) : s.amount;
  }
  if (attacking) p += keywords(state, reg, iid).powerAttacker ?? 0;
  return Math.max(0, p);
}

export function breakerCount(state: GameState, reg: CardRegistry, iid: string): number {
  const kw = keywords(state, reg, iid);
  const base = kw.breaker ?? 1;
  // パワード・ブレイカー：パワー6000ごとに1つ多くブレイクする
  return kw.poweredBreaker ? Math.max(base, 1 + Math.floor(power(state, reg, iid) / 6000)) : base;
}

/** ジャストダイバーが有効か（出てから次の自分のターンのはじめまで） */
function justDiving(state: GameState, inst: CardInstance): boolean {
  if (state.turn === inst.enteredTurn) return true;
  // 出たターンの次のターンが相手のターンなら、そのターン中も有効
  return state.turn === inst.enteredTurn + 1 && state.activePlayer !== inst.owner;
}

/** 相手に選ばれないか */
export function isUntargetable(state: GameState, reg: CardRegistry, iid: string, spellCost?: number): boolean {
  const inst = state.cards[iid];
  if (!inst || inst.zone !== 'battle') return false;
  const kw = keywords(state, reg, iid);
  if (spellCost !== undefined && kw.untargetableBySpellCost !== undefined && spellCost <= kw.untargetableBySpellCost) return true;
  return !!kw.untargetable || (!!kw.justDiver && justDiving(state, inst));
}

/** 攻撃されないか */
export function cannotBeAttacked(state: GameState, reg: CardRegistry, iid: string): boolean {
  const kw = keywords(state, reg, iid);
  return !!kw.cannotBeAttacked || (!!kw.justDiver && justDiving(state, state.cards[iid]));
}

/** 常在効果込みのコスト */
export function effectiveCost(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main', sacrifice: string[] = []): number {
  return cached(state, `ec:${player}:${iid}:${side}:${sacrifice.join(",")}`, () => effectiveCostImpl(state, reg, player, iid, side, sacrifice));
}

function effectiveCostImpl(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main', sacrifice: string[] = []): number {
  const d = def(state, reg, iid);
  const face = playFace(d, side);
  let cost = face.cost;
  let floor = Math.min(face.cost, 1);
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type !== 'costMod' || !ownerMatches(s.appliesTo.owner, a.controller, player)) continue;
    if (!matchFace(face, d, s.appliesTo.filter)) continue;
    cost += s.amount;
    if (s.minCost !== undefined) floor = Math.min(face.cost, Math.max(floor, s.minCost));
  }
  // G・ゼロ：条件を満たしていればコストを支払わずに使える
  if (side === 'main' && d.gZero && evalCondition(state, reg, player, d.gZero, true, iid)) return 0;
  // このカード自身のコスト軽減（「〜1枚につき1少なくする」）
  if (side === 'main' && d.selfCost) {
    const sc = d.selfCost;
    cost -= sc.amount * Math.floor(countQuantity(state, reg, player, sc.per, true, iid) / sc.unit);
    floor = Math.min(face.cost, Math.max(floor, sc.min));
  }
  // ササゲール：破壊するクリーチャーのササゲールの数だけ少なくする（コストは0以下にならない）
  if (sacrifice.length) {
    cost -= sacrifice.reduce((a, b) => a + (keywords(state, reg, b).sasageru ?? 0), 0);
    floor = Math.min(face.cost, Math.max(floor, 1));
  }
  return Math.max(floor, cost);
}

/** ディスペクターを召喚する時に、ササゲールで破壊できる自分のクリーチャー */
export function sasageruCandidates(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main'): string[] {
  if (side !== 'main') return [];
  const d = def(state, reg, iid);
  if (!isCreatureType(d.type) || !d.races.some((r) => r.includes('ディスペクター'))) return [];
  return battleCards(state, reg, player).filter((b) => b !== iid && (keywords(state, reg, b).sasageru ?? 0) > 0);
}

/**
 * ササゲールを使わないと払えない時に、破壊するクリーチャーを少なく選ぶ（ササゲールの数が大きいものから）。
 * 使わずに払えるなら []、使っても払えなければ null
 */
export function minimalSacrifice(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string[] | null {
  if (choosePayment(state, reg, player, iid) !== null) return [];
  const cands = [...sasageruCandidates(state, reg, player, iid)].sort((a, b) => (keywords(state, reg, b).sasageru ?? 0) - (keywords(state, reg, a).sasageru ?? 0));
  const chosen: string[] = [];
  for (const c of cands) {
    chosen.push(c);
    if (choosePayment(state, reg, player, iid, undefined, 'main', chosen) !== null) return chosen;
  }
  return null;
}

/** 召喚・呪文の禁止を受けているなら理由を返す */
export function playRestriction(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main'): string | null {
  const d = def(state, reg, iid);
  const face = playFace(d, side);
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type !== 'cannotSummon' && s.type !== 'cannotCast') continue;
    if ((s.type === 'cannotSummon') !== isCreatureType(face.type)) continue;
    const hit = s.who === 'both' || (s.who === 'self') === (a.controller === player);
    if (hit && matchFace(face, d, s.filter)) return `${def(state, reg, a.source).name} の効果で${s.type === 'cannotSummon' ? '召喚' : '呪文を唱えることが'}できません`;
  }
  return null;
}

// ───────────────────────── 攻撃・ブロック ─────────────────────────

export function isSummoningSick(state: GameState, reg: CardRegistry, iid: string): boolean {
  const inst = state.cards[iid];
  const d = def(state, reg, iid);
  // 進化クリーチャー（NEO進化で重ねたものを含む）は召喚酔いしない
  if (keywords(state, reg, iid).speedAttacker || d.type === 'evolution' || inst.under.length > 0) return false;
  return inst.enteredTurn >= state.turn;
}

/** 攻撃可能なクリーチャーか（状態・召喚酔い・攻撃制限） */
export function canAttackWith(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): boolean {
  return cached(state, `ca:${player}:${iid}`, () => canAttackWithImpl(state, reg, player, iid));
}

function canAttackWithImpl(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): boolean {
  const inst = state.cards[iid];
  if (!inst || inst.owner !== player || inst.zone !== 'battle' || inst.tapped) return false;
  if (!battleCards(state, reg, player).includes(iid)) return false;
  const kw = keywords(state, reg, iid);
  if (kw.cannotAttack) return false;
  // マッハファイターは出たターンでもクリーチャーを攻撃できる
  return !isSummoningSick(state, reg, iid) || (!!kw.machFighter && inst.enteredTurn === state.turn);
}

export function attackTargets(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): AttackTarget[] {
  return cached(state, `at:${player}:${iid}`, () => attackTargetsImpl(state, reg, player, iid));
}

function attackTargetsImpl(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): AttackTarget[] {
  if (!canAttackWith(state, reg, player, iid)) return [];
  const kw = keywords(state, reg, iid);
  const machOnly = isSummoningSick(state, reg, iid);
  const out: AttackTarget[] = [];
  if (!kw.cannotAttackPlayers && !machOnly) out.push({ kind: 'player' });
  for (const t of battleCards(state, reg, other(player))) {
    if (cannotBeAttacked(state, reg, t)) continue;
    if (state.cards[t].tapped || kw.attackUntapped || machOnly) out.push({ kind: 'creature', iid: t });
  }
  return out;
}

export function blockersFor(state: GameState, reg: CardRegistry, defender: PlayerId, attacker: string): string[] {
  const unblockable = !!keywords(state, reg, attacker).unblockable;
  const target = state.combat?.target;
  return battleCards(state, reg, defender).filter((b) => {
    if (state.cards[b].tapped) return false;
    const kw = keywords(state, reg, b);
    if (kw.cannotBlock) return false;
    // ガードマンは「ブロック」ではなく攻撃先の変更なので、ブロックされないクリーチャーにも使える
    if (kw.superGuardman) return true;
    if (kw.guardman && target?.kind === 'creature' && target.iid !== b) return true;
    return !!kw.blocker && !unblockable;
  });
}

// ───────────────────────── 効果の対象・条件 ─────────────────────────

/** 効果の対象候補 */
export function targetCandidates(state: GameState, reg: CardRegistry, controller: PlayerId, spec: TargetSpec, source?: string): string[] {
  const owners: PlayerId[] = spec.owner === 'self' ? [controller] : spec.owner === 'opponent' ? [other(controller)] : [controller, other(controller)];
  const out: string[] = [];
  for (const o of owners) {
    for (const iid of spec.zone === 'battle' ? battleCards(state, reg, o) : state.players[o].zones[spec.zone]) {
      if (matchFilter(state, reg, iid, spec.filter, source)) out.push(iid);
    }
  }
  return out;
}

/** 数を数える。noPower なら元のパワーで判定（常在効果の中から呼ぶ時の循環防止）。source は「他の」の判定用 */
export function countQuantity(state: GameState, reg: CardRegistry, controller: PlayerId, q: Quantity, noPower = false, source?: string): number {
  const players: PlayerId[] = q.who === 'self' ? [controller] : q.who === 'opponent' ? [other(controller)] : [controller, other(controller)];
  // フィールドを数える時はクリーチャー以外も見る
  const inBattle = (p: PlayerId) => (q.filter?.cardType === 'field' ? battleAndFields(state, reg, p) : battleCards(state, reg, p));
  return players.reduce<number>((sum, p) => sum + (q.zone === 'battle' ? inBattle(p) : state.players[p].zones[q.zone]).filter((iid) => matchFilter(state, reg, iid, q.filter, source, noPower)).length, 0);
}

export function evalCondition(state: GameState, reg: CardRegistry, controller: PlayerId, c: Condition, noPower = false, source?: string): boolean {
  switch (c.type) {
    case 'not':
      return !evalCondition(state, reg, controller, c.condition, noPower, source);
    case 'and':
      return c.conditions.every((x) => evalCondition(state, reg, controller, x, noPower, source));
    case 'compare': {
      const l = countQuantity(state, reg, controller, c.left, noPower, source);
      const r = typeof c.right === 'number' ? c.right : countQuantity(state, reg, controller, c.right, noPower, source);
      return c.op === '>' ? l > r : c.op === '>=' ? l >= r : c.op === '<' ? l < r : c.op === '<=' ? l <= r : l === r;
    }
    case 'attackedThisTurn':
      return !!source && state.cards[source]?.attackedTurn === state.turn;
  }
}

// ───────────────────────── 召喚・支払い ─────────────────────────

/** 進化元として選べるクリーチャー */
export function evolutionBases(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string[] {
  const d = def(state, reg, iid);
  // NEO進化：条件に合うクリーチャーの上に重ねてもよい
  if (d.neoEvolution) return battleCards(state, reg, player).filter((b) => matchFilter(state, reg, b, d.neoEvolution, undefined, true));
  if (d.type !== 'evolution') return [];
  return battleCards(state, reg, player).filter((b) => matchesEvolvesFrom(def(state, reg, b), d));
}

function matchesEvolvesFrom(bd: CardDefinition, d: CardDefinition): boolean {
  const cond = d.evolvesFrom ?? {};
  if (cond.race && !bd.races.includes(cond.race)) return false;
  if (cond.civilization && !bd.civilizations.includes(cond.civilization)) return false;
  return true;
}

/** カード iid が、クリーチャー top の進化元になれるか（超魂レイド：山札のカードを下に置く時の判定） */
export function canBeEvolutionSource(state: GameState, reg: CardRegistry, iid: string, top: string): boolean {
  const d = def(state, reg, top);
  const cd = def(state, reg, iid);
  if (!isCreatureType(cd.type)) return false;
  if (d.neoEvolution) return matchFilter(state, reg, iid, d.neoEvolution, undefined, true);
  if (d.type === 'evolution') return matchesEvolvesFrom(cd, d);
  return false;
}

/**
 * コストの支払いに使うマナを決める。払えなければ null。
 * 各文明について1枚ずつ別々のマナを割り当てる（小さな二部マッチング）。
 */
export function choosePayment(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, preferred?: string[], side: 'main' | 'twin' = 'main', sacrifice: string[] = []): string[] | null {
  const face = playFace(def(state, reg, iid), side);
  const cost = effectiveCost(state, reg, player, iid, side, sacrifice);
  // コスト0（G・ゼロなど）はマナを支払わない
  if (cost === 0) return preferred && preferred.length ? null : [];
  const civs: Civilization[] = face.civilizations.filter((cv) => cv !== 'zero');
  const untapped = state.players[player].zones.mana.filter((m) => !state.cards[m].tapped);
  const mciv = (m: string) => manaCivilizations(def(state, reg, m));
  if (preferred) {
    if (preferred.length !== cost || preferred.some((m) => !untapped.includes(m)) || new Set(preferred).size !== preferred.length) return null;
    return assignCivs(civs, preferred, mciv) ? preferred : null;
  }
  if (untapped.length < cost) return null;
  // 単色のマナを優先して使う
  const sorted = [...untapped].sort((a, b) => mciv(a).length - mciv(b).length);
  const assigned = assignCivs(civs, sorted, mciv);
  if (!assigned || assigned.length > cost) return null;
  const rest = untapped.filter((m) => !assigned.includes(m));
  // 残りは「このカードに不要な文明」のマナから使う
  const useless = (m: string) => (mciv(m).some((cv) => civs.includes(cv)) ? 0 : 1);
  rest.sort((a, b) => useless(b) - useless(a));
  return [...assigned, ...rest.slice(0, cost - assigned.length)];
}

function assignCivs(civs: Civilization[], mana: string[], mciv: (m: string) => Civilization[]): string[] | null {
  const used: string[] = [];
  const dfs = (i: number): boolean => {
    if (i === civs.length) return true;
    for (const m of mana) {
      if (used.includes(m) || !mciv(m).includes(civs[i])) continue;
      used.push(m);
      if (dfs(i + 1)) return true;
      used.pop();
    }
    return false;
  };
  return dfs(0) ? used : null;
}

export function canPlay(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main'): boolean {
  return cached(state, `cp:${player}:${iid}:${side}`, () => canPlayImpl(state, reg, player, iid, side));
}

function canPlayImpl(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main'): boolean {
  if (!isIdle(state) || state.activePlayer !== player) return false;
  if (state.phase !== 'charge' && state.phase !== 'main') return false;
  const inst = state.cards[iid];
  if (!inst || inst.owner !== player) return false;
  if (inst.zone !== 'hand' && !(side === 'main' && canSummonFromZone(state, reg, player, iid))) return false;
  const d = def(state, reg, iid);
  if (side === 'twin' && !d.twin) return false;
  if (side === 'main' && d.type === 'evolution' && evolutionBases(state, reg, player, iid).length === 0) return false;
  if (playRestriction(state, reg, player, iid, side)) return false;
  if (choosePayment(state, reg, player, iid, undefined, side) !== null) return true;
  // ササゲールを使えば払える
  return side === 'main' && minimalSacrifice(state, reg, player, iid) !== null;
}

export function untappedManaCount(state: GameState, player: PlayerId): number {
  return state.players[player].zones.mana.filter((m) => !state.cards[m].tapped).length;
}

export function isIdle(state: GameState): boolean {
  return state.gameOverReason === null && !state.pending && state.queue.length === 0 && !state.combat;
}

export function instancesIn(state: GameState, player: PlayerId, zone: keyof GameState['players'][0]['zones']): CardInstance[] {
  return state.players[player].zones[zone].map((iid) => state.cards[iid]);
}

/** 攻撃中のクリーチャー attacker に対して、手札から侵略・革命チェンジできるカード（S級侵略は墓地・マナゾーン・バトルゾーンからも） */
export function attackSwapCandidates(state: GameState, reg: CardRegistry, player: PlayerId, attacker: string): string[] {
  if (state.cards[attacker]?.zone !== 'battle' || state.cards[attacker].owner !== player) return [];
  const z = state.players[player].zones;
  const ok = (iid: string) => {
    const sw = def(state, reg, iid).attackSwap;
    return !!sw && matchFilter(state, reg, attacker, sw.filter, undefined, true);
  };
  const out = z.hand.filter(ok);
  // S級侵略：攻撃する時にそのゾーンにあったカードだけ（攻撃時の能力で置かれたカードは使えない）
  const eligible = state.combat ? (state.combat.sClassEligible ?? []) : undefined;
  for (const zone of ['graveyard', 'mana', 'battle'] as const) {
    for (const iid of z[zone]) {
      const sw = def(state, reg, iid).attackSwap;
      if (sw?.kind !== 'invasion' || !sw.zones?.includes(zone) || iid === attacker) continue;
      if (eligible && !eligible.includes(iid)) continue;
      // 封印されているクリーチャーは使えない
      if (zone === 'battle' && state.cards[iid].seals?.length) continue;
      if (ok(iid)) out.push(iid);
    }
  }
  return out;
}

/** S級侵略で手札以外から使える可能性のあるカード（攻撃する時点で記録する） */
export function sClassCards(state: GameState, reg: CardRegistry, player: PlayerId): string[] {
  const z = state.players[player].zones;
  return (['graveyard', 'mana', 'battle'] as const).flatMap((zone) => z[zone].filter((iid) => def(state, reg, iid).attackSwap?.zones?.includes(zone)));
}
