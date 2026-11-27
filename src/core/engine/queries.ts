// ゲーム状態を読むだけの関数群（状態を変更しない）。UI・AI・エンジンで共用する。
// 常在効果（パワー修正・キーワード付与・コスト増減・召喚制限）はここで計算する。
import type { CardRegistry } from '../cards/registry';
import {
  isCreatureType,
  isNonCreaturePermanent,
  manaCivilizations,
  playFace,
  type AltPlay,
  type Applies,
  type EvolveSpec,
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
    if (souls.length) return withSurvivors(state, reg, iid, withSouls(base, souls));
  }
  return inst.zone === 'battle' ? withSurvivors(state, reg, iid, base) : base;
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

/** サバイバー：自分の他のサバイバーの {S} 能力も持つ */
function withSurvivors(state: GameState, reg: CardRegistry, iid: string, d: CardDefinition): CardDefinition {
  if (!d.races.some((r) => r.includes('サバイバー'))) return d;
  const inst = state.cards[iid];
  const givers: CardDefinition[] = [];
  for (const o of state.players[inst.owner].zones.battle) {
    if (o === iid || state.cards[o].seals?.length) continue;
    const od = reg[state.cards[o].cardId];
    if (od?.survivor && od.races.some((r) => r.includes('サバイバー'))) givers.push({ ...od, id: `S:${od.id}`, soul: od.survivor });
  }
  return givers.length ? withSouls(d, givers) : d;
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
  // フィールド（D2フィールドなど）・タマシードはバトルゾーンにあってもクリーチャーではない
  return state.players[player].zones.battle.filter((iid) => !isIgnored(state, reg, iid) && !isNonCreaturePermanent(def(state, reg, iid).type));
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
  if (sf && (sf.zones as string[]).includes(inst.zone) && (!sf.condition || evalCondition(state, reg, player, sf.condition, true, iid))) return true;
  return zoneSummonSource(state, reg, player, iid) !== null;
}

/** 「自分のターンに一度、魔導具クリーチャーを1体、自分の墓地から召喚してもよい」：召喚を許している常在効果の発生源 */
export function zoneSummonSource(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string | null {
  const inst = state.cards[iid];
  if (!inst || inst.owner !== player || !isCreatureType(def(state, reg, iid).type)) return null;
  for (const a of activeStatics(state, reg)) {
    const st = a.static;
    if (st.type !== 'summonFromZone' || a.controller !== player || st.zone !== inst.zone) continue;
    if (st.oncePerTurn && (state.activePlayer !== player || state.usedThisTurn?.includes(`sfz:${a.source}`))) continue;
    if (matchFilter(state, reg, iid, st.filter)) return a.source;
  }
  return null;
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
  if (f.not && matchFilter(state, reg, iid, f.not, source, noPower)) return false;
  if (f.anyOf && !f.anyOf.some((x) => matchFilter(state, reg, iid, x, source, noPower))) return false;
  if (f.selfOnly && iid !== source) return false;
  if (f.faceDown && inst.faceUp !== false) return false;
  // 表向きのカード：バトルゾーンのカードと、表向きにしたシールドなど
  if (f.faceUp && !(inst.zone === 'battle' || inst.faceUp === true)) return false;
  if (f.enteredThisTurn && !(inst.zone === 'battle' && inst.enteredTurn === state.turn)) return false;
  if (f.hasOnSummonAbility && !(d.abilities ?? []).some((a) => a.when === 'onSummon')) return false;
  if (f.typeLabelIncludes && !(d.typeLabel ?? '').includes(f.typeLabelIncludes)) return false;
  if (f.crossed && !gearsOn(state, reg, iid).length) return false;
  // 「これをクロスしたクリーチャーと同じ種族の」：発生源のクロスギアをクロスしたクリーチャーと比べる
  if (f.sameRaceAsEquipped) {
    const host = source ? state.cards[source]?.equippedTo : undefined;
    if (!host || !state.cards[host] || state.cards[host].zone !== 'battle') return false;
    const races = def(state, reg, host).races;
    if (!d.races.some((r) => races.includes(r))) return false;
  }
  // 「自分のマナゾーンにあるカードの枚数以下のコストを持つ」：発生源の持ち主から数える
  if (f.maxCostCount) {
    const owner = source && state.cards[source] ? state.cards[source].owner : inst.owner;
    if (d.cost > countQuantity(state, reg, owner, f.maxCostCount, true, source)) return false;
  }
  if (f.wasUnderSource && !(source && state.cards[source]?.formerUnder?.includes(iid))) return false;
  if (f.hasAbilityWhen && !(d.abilities ?? []).some((a) => a.when === f.hasAbilityWhen)) return false;
  if (f.maxCostSumOfChosen) {
    const sum = (state.lastChosen ?? []).filter((x) => state.cards[x]).reduce((a, x) => a + def(state, reg, x).cost, 0);
    if (d.cost > sum) return false;
  }
  if (f.sameNameAsEquipped) {
    const host = source ? state.cards[source]?.equippedTo : undefined;
    if (!host || !state.cards[host] || def(state, reg, host).name !== d.name) return false;
  }
  if (f.costIsChosenNumber && d.cost !== state.chosenNumber) return false;
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
  if (f.nameIncludes && !d.name.replace(/\s/g, '').includes(f.nameIncludes.replace(/\s/g, ''))) return false;
  // 「このクリーチャーよりパワーが小さい」：効果の発生源と比べる
  if (f.relativeToSource && source && state.cards[source]) {
    const val = (x: string) => (f.relativeToSource!.stat === 'cost' ? def(state, reg, x).cost : state.cards[x].zone === 'battle' && !noPower ? power(state, reg, x) : (def(state, reg, x).power ?? 0));
    const mine = val(iid);
    const theirs = val(source);
    if (f.relativeToSource.cmp === 'less' ? !(mine < theirs) : !(mine > theirs)) return false;
  }
  // 一番パワーが大きい／小さい：持ち主のクリーチャーの中で比べる（同じパワーならすべて）
  if (f.extremePower && inst.zone === 'battle') {
    const pw = (x: string) => (noPower ? (def(state, reg, x).power ?? 0) : power(state, reg, x));
    const all = battleCards(state, reg, inst.owner).map(pw);
    const target = f.extremePower === 'highest' ? Math.max(...all) : Math.min(...all);
    if (pw(iid) !== target) return false;
  }
  if (f.maxCost !== undefined && d.cost > f.maxCost) return false;
  if (f.minCost !== undefined && d.cost < f.minCost) return false;
  if (f.costAboveOwnerMana && !(d.cost > state.players[inst.owner].zones.mana.length)) return false;
  // 「その捨てたカードと同じコストの」：直前に選んだ（動かした）カードと比べる。なければ合うものはない
  if (f.refCost || f.refCivs) {
    const refs = (state.lastChosen ?? []).filter((x) => state.cards[x]);
    if (!refs.length) return false;
    const rd = def(state, reg, refs[0]);
    if (f.refCost === 'eq' && d.cost !== rd.cost) return false;
    if (f.refCost === 'le' && d.cost > rd.cost) return false;
    if (f.refCivs && !refs.some((x) => def(state, reg, x).civilizations.some((c) => c !== 'zero' && d.civilizations.includes(c)))) return false;
  }
  if (f.tapped && !inst.tapped) return false;
  if (f.untapped && inst.tapped) return false;
  if (f.maxPower !== undefined || f.minPower !== undefined) {
    const p = inst.zone === 'battle' && !noPower ? power(state, reg, iid) : (d.power ?? 0);
    if (f.maxPower !== undefined && p > f.maxPower) return false;
    if (f.minPower !== undefined && p < f.minPower) return false;
  }
  return true;
}

/** 「攻撃するかわりに、タップして次の能力を使ってもよい」を、いま使えるか（攻撃できる状態で、能力を持つかクロスしたギアが持つ） */
export function canTapAbility(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): boolean {
  if (!canAttackWith(state, reg, player, iid)) return false;
  if ((def(state, reg, iid).abilities ?? []).some((a) => a.when === 'onTapAbility' && !a.viaEquip)) return true;
  return state.players[player].zones.battle.some((b) => state.cards[b].equippedTo === iid && (def(state, reg, b).abilities ?? []).some((a) => a.when === 'onTapAbility' && a.viaEquip));
}

/** このクリーチャーにクロスされているクロスギア */
export function gearsOn(state: GameState, reg: CardRegistry, iid: string): string[] {
  return [...state.players[0].zones.battle, ...state.players[1].zones.battle].filter((b) => state.cards[b].equippedTo === iid && isCrossGear(reg[state.cards[b].cardId]));
}

/** 使う面（ツインパクトの呪文側を含む）が条件に合うか */
function matchFace(face: PlayFace, d: CardDefinition, f: CardFilter | undefined): boolean {
  if (!f) return true;
  if (f.not && matchFace(face, d, f.not)) return false;
  if (f.anyOf && !f.anyOf.some((x) => matchFace(face, d, x))) return false;
  if (f.cardType && (f.cardType === 'creature' ? !isCreatureType(face.type) : face.type !== f.cardType)) return false;
  if (f.civilization && !face.civilizations.includes(f.civilization)) return false;
  if (f.civilizations && !f.civilizations.some((c) => face.civilizations.includes(c))) return false;
  if (f.race && (face.side === 'twin' || !d.races.some((r) => r.includes(f.race!)))) return false;
  if (f.races && (face.side === 'twin' || !f.races.some((x) => d.races.some((r) => r.includes(x))))) return false;
  if (f.nonEvolution && face.type === 'evolution') return false;
  if (f.twinpact && !d.twin) return false;
  if (f.multicolor && face.civilizations.length < 2) return false;
  if (f.nameIncludes && !face.name.replace(/\s/g, '').includes(f.nameIncludes.replace(/\s/g, ''))) return false;
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
  for (const t of state.turnStatics ?? []) if (t.onlyDuringTurnOf === undefined || t.onlyDuringTurnOf === state.activePlayer) out.push(t);
  return out;
}

function ownerMatches(owner: Applies['owner'], controller: PlayerId, target: PlayerId): boolean {
  return owner === 'any' || (owner === 'self') === (controller === target);
}

function appliesToCreature(state: GameState, reg: CardRegistry, a: ActiveStatic, applies: Applies, iid: string): boolean {
  const inst = state.cards[iid];
  // 「これを装備したクリーチャー」：発生源のウエポンを装備しているクリーチャーだけ
  if (applies.equipped) return state.cards[a.source]?.equippedTo === iid;
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
  // 「相手のカードによる攻撃できない効果を無視して攻撃できる」：相手が与えた攻撃の制限を外す
  const free = inst.zone === 'battle' && ignoresAttackLocks(state, reg, iid);
  const until = inst.keywordsUntil;
  let kw = mergeKeywords(mergeKeywords({ ...(def(state, reg, iid).keywords ?? {}) }, inst.keywordsTurn), until && free && until.player !== inst.owner ? withoutAttackLocks(until.keywords) : until?.keywords);
  if (inst.zone !== 'battle') return kw;
  for (const a of activeStatics(state, reg)) {
    if (a.static.type === 'grantKeyword' && appliesToCreature(state, reg, a, a.static.appliesTo, iid))
      kw = mergeKeywords(kw, free && a.controller !== inst.owner ? withoutAttackLocks(a.static.keywords) : a.static.keywords);
  }
  return kw;
}

const ATTACK_LOCKS: (keyof Keywords)[] = ['cannotAttack', 'cannotAttackPlayers', 'cannotAttackCreatures', 'noAttackOnEnterTurn'];
/** 「攻撃できない」系の制限を除いたキーワード */
export function withoutAttackLocks(kw: Keywords): Keywords {
  const out = { ...kw };
  for (const k of ATTACK_LOCKS) delete out[k];
  return out;
}
/** 相手のカードによる「攻撃できない」効果を無視できるクリーチャーか */
export function ignoresAttackLocks(state: GameState, reg: CardRegistry, iid: string): boolean {
  return activeStatics(state, reg).some((a) => a.static.type === 'ignoreAttackLocks' && appliesToCreature(state, reg, a, a.static.appliesTo, iid));
}

export function power(state: GameState, reg: CardRegistry, iid: string): number {
  return cached(state, `pw:${iid}`, () => powerImpl(state, reg, iid));
}

function powerImpl(state: GameState, reg: CardRegistry, iid: string): number {
  const inst = state.cards[iid];
  const d = def(state, reg, iid);
  let p = (d.power ?? 0) + inst.powerModTurn + (inst.powerModUntil?.amount ?? 0) + (inst.powerModLasting ?? 0);
  if (inst.zone !== 'battle') return Math.max(0, p);
  const attacking = state.combat?.attacker === iid;
  // バトル中：攻撃しているか、ブロックしたか、攻撃されているクリーチャー
  const cb = state.combat;
  const battling = !!cb && (cb.attacker === iid || cb.blocker === iid || (cb.target.kind === 'creature' && cb.target.iid === iid));
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type === 'powerMod' && (!s.attackingOnly || attacking) && (!s.battleOnly || battling) && appliesToCreature(state, reg, a, s.appliesTo, iid))
      p += s.perCount ? s.amount * countQuantity(state, reg, a.controller, s.perCount, true, a.source) : s.amount;
  }
  if (attacking) p += keywords(state, reg, iid).powerAttacker ?? 0;
  // 付いているオーラのパワー
  for (const pl of state.players) for (const b of pl.zones.battle) if (state.cards[b].equippedTo === iid && isAura(reg[state.cards[b].cardId])) p += reg[state.cards[b].cardId]?.power ?? 0;
  return Math.max(0, p);
}

export function breakerCount(state: GameState, reg: CardRegistry, iid: string): number {
  const kw = keywords(state, reg, iid);
  let base = kw.breaker ?? 1;
  // クルー・ブレイカー：数えた数だけ多くブレイクする
  for (const a of activeStatics(state, reg)) {
    if (a.static.type === 'breakerBonus' && a.source === iid) base += a.static.amount * Math.floor(countQuantity(state, reg, a.controller, a.static.perCount, true, iid) / a.static.unit);
  }
  // 「パワーが6000以上の時、「W・ブレイカー」を得る」
  if (kw.breakerAtPower && power(state, reg, iid) >= kw.breakerAtPower.min) base = Math.max(base, kw.breakerAtPower.breaker);
  // パワード・ブレイカー：パワー6000ごとに1つ多くブレイクする
  const n = kw.poweredBreaker ? Math.max(base, 1 + Math.floor(power(state, reg, iid) / 6000)) : base;
  // 「クリーチャーは攻撃1回につきシールドを1枚しかブレイクできない」
  return kw.maxBreakPerAttack !== undefined ? Math.min(n, kw.maxBreakPerAttack) : n;
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
/** neo: NEO進化クリーチャーとして（重ねて）召喚する */
export function effectiveCost(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main', sacrifice: string[] = [], neo = false): number {
  return cached(state, `ec:${player}:${iid}:${side}:${sacrifice.join(",")}:${neo}:${state.evolveCountHint ?? ''}`, () => effectiveCostImpl(state, reg, player, iid, side, sacrifice, neo));
}

function effectiveCostImpl(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main', sacrifice: string[] = [], neo = false): number {
  const d = def(state, reg, iid);
  const face = playFace(d, side);
  let cost = face.cost;
  let floor = Math.min(face.cost, 1);
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type !== 'costMod' || !ownerMatches(s.appliesTo.owner, a.controller, player)) continue;
    if (!matchFace(face, d, s.appliesTo.filter)) continue;
    // 「各ターン、1体目の」：このターン、条件に合うカードをまだ使っていない時だけ
    if (s.firstPerTurn && (state.players[player].playedThisTurn ?? []).some((x) => state.cards[x] && matchFace(playFace(def(state, reg, x)), def(state, reg, x), s.appliesTo.filter))) continue;
    cost += s.amount;
    if (s.minCost !== undefined) floor = Math.min(face.cost, Math.max(floor, s.minCost));
  }
  // 「このターン、次に召喚する自分のクリーチャーのコストをN少なくする」
  const nsd = state.players[player].nextSummonDiscount;
  if (nsd && nsd.turn === state.turn && side === 'main' && face.type === 'creature' && state.cards[iid]?.zone === 'hand') {
    cost -= nsd.amount;
    floor = Math.min(face.cost, Math.max(floor, nsd.min));
  }
  // G・ゼロ：条件を満たしていればコストを支払わずに使える
  if (side === 'main' && d.gZero && evalCondition(state, reg, player, d.gZero, true, iid)) return 0;
  // このカード自身のコスト軽減（「〜1枚につき1少なくする」）
  // 条件つきの自分のコスト軽減
  if (side === 'main' && d.condCost && evalCondition(state, reg, player, d.condCost.condition, true, iid)) {
    cost -= d.condCost.amount;
    floor = Math.min(face.cost, Math.max(floor, 1));
  }
  // 「NEO進化クリーチャーとして召喚するなら、召喚コストを2少なくする」
  if (neo && side === 'main' && d.neoCostReduce) {
    cost -= d.neoCostReduce;
    floor = Math.min(face.cost, Math.max(floor, 1));
  }
  if (side === 'main' && d.selfCost) {
    const sc = d.selfCost;
    const cnt = sc.perEvolve ? (state.evolveCountHint ?? evolveSourceCandidates(state, reg, player, iid).length) : countQuantity(state, reg, player, sc.per, true, iid);
    cost -= sc.amount * Math.floor(cnt / sc.unit);
    floor = Math.min(face.cost, Math.max(floor, sc.min));
  }
  // ハイパーエナジー：コストが異なるクリーチャーを1体タップするごとに2少なくする（コストは0以下にならない）
  if (sacrifice.length && usesHyperEnergy(state, reg, iid, side)) {
    cost -= 2 * new Set(sacrifice.map((b) => def(state, reg, b).cost)).size;
    floor = Math.min(face.cost, Math.max(floor, 1));
  } else if (sacrifice.length) {
    // ササゲール：破壊するクリーチャーのササゲールの数だけ少なくする（コストは0以下にならない）
    cost -= sacrifice.reduce((a, b) => a + (keywords(state, reg, b).sasageru ?? 0), 0);
    floor = Math.min(face.cost, Math.max(floor, 1));
  }
  return Math.max(floor, cost);
}

/** ハイパーエナジーを持つカードか（このカードを使う時、コストが異なる自分のクリーチャーをタップしてコストを少なくできる） */
export function usesHyperEnergy(state: GameState, reg: CardRegistry, iid: string, side: 'main' | 'twin' = 'main'): boolean {
  return side === 'main' && !!def(state, reg, iid).keywords?.hyperEnergy;
}

/**
 * カードを使う時にコストを少なくするために使える自分のクリーチャー。
 * ササゲール：ディスペクターを召喚する時に破壊できるクリーチャー／ハイパーエナジー：タップできるアンタップのクリーチャー
 */
export function sasageruCandidates(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main'): string[] {
  if (side !== 'main') return [];
  if (usesHyperEnergy(state, reg, iid, side)) return battleCards(state, reg, player).filter((b) => b !== iid && !state.cards[b].tapped);
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
  const hyper = usesHyperEnergy(state, reg, iid);
  const cands = [...sasageruCandidates(state, reg, player, iid)].sort((a, b) => (keywords(state, reg, b).sasageru ?? 0) - (keywords(state, reg, a).sasageru ?? 0));
  const chosen: string[] = [];
  for (const c of cands) {
    // ハイパーエナジーはコストが異なるクリーチャーだけ数える
    if (hyper && chosen.some((x) => def(state, reg, x).cost === def(state, reg, c).cost)) continue;
    chosen.push(c);
    if (choosePayment(state, reg, player, iid, undefined, 'main', chosen) !== null) return chosen;
  }
  return null;
}

/** このプレイヤーが、このターンにこれ以上クリーチャーを出せない／呪文を唱えられないなら理由を返す（「各ターン1体までしか」） */
export function playLimitReached(state: GameState, reg: CardRegistry, player: PlayerId, what: 'spell' | 'creature'): string | null {
  const P = state.players[player];
  const used = what === 'spell' ? (P.spellsThisTurn ?? 0) : (P.creaturesThisTurn ?? 0);
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type !== 'playLimit' || s.what !== what) continue;
    const hit = s.who === 'both' || (s.who === 'self') === (a.controller === player);
    if (hit && used >= s.max) return `${def(state, reg, a.source).name} の効果で、このターンはこれ以上${what === 'spell' ? '呪文を唱えられません' : 'クリーチャーを出せません'}`;
  }
  return null;
}

/** 召喚・呪文の禁止を受けているなら理由を返す */
/** クロスギアか */
/** オーラか（自分のクリーチャーに付けて、書かれたパワーを加える） */
export function isAura(d: CardDefinition | undefined): boolean {
  return !!d && d.type === 'field' && /オーラ/.test(d.typeLabel ?? '');
}

export function isCrossGear(d: CardDefinition | undefined): boolean {
  return !!d && /クロスギア/.test(d.typeLabel ?? '');
}

/** GRクリーチャーか（超GRゾーンで始まり、バトルゾーンを離れたら超GRゾーンの下に戻る） */
export function isGrCard(d: CardDefinition | undefined): boolean {
  return !!d && /GR/.test(d.typeLabel ?? '');
}

/** クロスギア gear を、自分のクリーチャー target にクロスできるか（コストを支払える・自分のメインステップ） */
export function canCross(state: GameState, reg: CardRegistry, player: PlayerId, gear: string, target: string): boolean {
  if (!isIdle(state) || state.activePlayer !== player) return false;
  if (state.phase !== 'charge' && state.phase !== 'main') return false;
  const g = state.cards[gear];
  if (!g || g.owner !== player || g.zone !== 'battle' || !isCrossGear(reg[g.cardId])) return false;
  if (g.equippedTo === target || !battleCards(state, reg, player).includes(target)) return false;
  return choosePayment(state, reg, player, gear) !== null;
}

/** 「このクリーチャーは離れない」「破壊以外の方法で離れない」：いまバトルゾーンを離れられないか */
export function cannotLeaveNow(state: GameState, reg: CardRegistry, iid: string, destroy: boolean): boolean {
  const inst = state.cards[iid];
  if (!inst || inst.zone !== 'battle') return false;
  const kw = keywords(state, reg, iid);
  // 「パワーが0以下の間離れない」「パワーが0以下の間破壊されず」
  if ((kw.stayAtZeroPower || (kw.immortalAtZeroPower && destroy)) && power(state, reg, iid) <= 0) return true;
  return !!kw.cannotLeave || (!!kw.cannotLeaveExceptDestroy && !destroy);
}

/** 「自分はゲームに負けない」：そのプレイヤーがいま負けないか（deckOut: 山札切れで負ける時） */
export function cannotLose(state: GameState, reg: CardRegistry, player: PlayerId, deckOut: boolean): string | null {
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type !== 'cannotLose' || (s.deckOutOnly && !deckOut)) continue;
    if (s.who === 'both' || (s.who === 'self') === (a.controller === player)) return a.source;
  }
  return null;
}

/** 「相手の呪文の効果やクリーチャーの能力によって、自分の手札は捨てられない」 */
export function handProtected(state: GameState, reg: CardRegistry, player: PlayerId): string | null {
  return activeStatics(state, reg).find((a) => a.static.type === 'handProtected' && a.controller === player)?.source ?? null;
}

/** 「可能なら毎ターン攻撃する」：まだ攻撃できるのに攻撃していないクリーチャー */
export function forcedAttackers(state: GameState, reg: CardRegistry, player: PlayerId): string[] {
  return battleCards(state, reg, player).filter((iid) => keywords(state, reg, iid).mustAttack && attackTargets(state, reg, player, iid).length > 0);
}

/** 「〜を出せない」：このクリーチャーをバトルゾーンに出せない理由（出せるなら null） */
export function entryBlocked(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string | null {
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type !== 'cannotEnter') continue;
    const hit = s.who === 'both' || (s.who === 'self') === (a.controller === player);
    if (hit && a.source !== iid && matchFilter(state, reg, iid, s.filter, a.source, true)) return `${def(state, reg, a.source).name} の効果で出せません`;
  }
  return null;
}

export function playRestriction(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, side: 'main' | 'twin' = 'main'): string | null {
  const d = def(state, reg, iid);
  const face = playFace(d, side);
  // オーラは付ける自分のクリーチャーがいないと使えない
  if (side === 'main' && isAura(d) && !battleCards(state, reg, player).length) return 'オーラを付ける自分のクリーチャーがいません';
  if (face.type === 'spell' || isCreatureType(face.type)) {
    const limit = playLimitReached(state, reg, player, face.type === 'spell' ? 'spell' : 'creature');
    if (limit) return limit;
  }
  if (isCreatureType(face.type)) {
    const blocked = entryBlocked(state, reg, player, iid);
    if (blocked) return blocked;
  }
  for (const a of activeStatics(state, reg)) {
    const s = a.static;
    if (s.type !== 'cannotSummon' && s.type !== 'cannotCast') continue;
    if ((s.type === 'cannotSummon') !== isCreatureType(face.type)) continue;
    // 卍 新世壊 卍：「自分の魔導具呪文を唱えられなくする能力を無視する」
    if (s.type === 'cannotCast' && (d.keywords?.ignoreCastLocksSelf || activeStatics(state, reg).some((x) => x.static.type === 'ignoreCastLocks' && x.controller === player && matchFace(face, d, x.static.filter)))) continue;
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
  // 「出たターンに攻撃できない」：スピードアタッカー・マッハファイターがあっても
  if (kw.noAttackOnEnterTurn && inst.enteredTurn >= state.turn) return false;
  // マッハファイターは出たターンでもクリーチャーを攻撃できる（「出したターン、アンタップしているクリーチャーを攻撃できる」も）
  return !isSummoningSick(state, reg, iid) || ((!!kw.machFighter || !!kw.untappedTargetsOnEnterTurn) && inst.enteredTurn === state.turn);
}

export function attackTargets(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): AttackTarget[] {
  return cached(state, `at:${player}:${iid}`, () => attackTargetsImpl(state, reg, player, iid));
}

function attackTargetsImpl(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): AttackTarget[] {
  if (!canAttackWith(state, reg, player, iid)) return [];
  const kw = keywords(state, reg, iid);
  const machOnly = isSummoningSick(state, reg, iid);
  const out: AttackTarget[] = [];
  // 「自分は、このクリーチャーよりパワーが小さいクリーチャーに攻撃されない」
  const shielded = activeStatics(state, reg).some((a) => a.static.type === 'protectFromWeaker' && a.controller === other(player) && state.cards[a.source]?.zone === 'battle' && power(state, reg, iid) < power(state, reg, a.source));
  if (!kw.cannotAttackPlayers && !machOnly && !shielded) out.push({ kind: 'player' });
  if (kw.cannotAttackCreatures) return out;
  for (const t of battleCards(state, reg, other(player))) {
    if (cannotBeAttacked(state, reg, t)) continue;
    // 「これよりコストが小さいクリーチャーに攻撃されない」
    if (keywords(state, reg, t).cannotBeAttackedBySmallerCost && def(state, reg, iid).cost < def(state, reg, t).cost) continue;
    // 「パワー2000以下のクリーチャーに攻撃またはブロックされない」
    const immune = keywords(state, reg, t).immuneToPowerAtMost;
    if (immune !== undefined && power(state, reg, iid) <= immune) continue;
    // 「出したターン、アンタップしているクリーチャーを攻撃できる」：出たターンはアンタップのクリーチャーだけ
    if (machOnly && !kw.machFighter) {
      if (!state.cards[t].tapped) out.push({ kind: 'creature', iid: t });
      continue;
    }
    if (state.cards[t].tapped || kw.attackUntapped || machOnly || (kw.attackUntappedCrossed && gearsOn(state, reg, t).length)) out.push({ kind: 'creature', iid: t });
  }
  // 「相手のクリーチャーが攻撃するなら、可能ならこのクリーチャーを攻撃する」：攻撃できるなら攻撃先はそれに限られる
  const firstAttack = (state.players[player].attacksThisTurn ?? 0) === 0;
  const lures = out.filter((t) => t.kind === 'creature' && (keywords(state, reg, t.iid).attackLure || (firstAttack && keywords(state, reg, t.iid).attackLureFirst)));
  if (lures.length) return lures;
  // 「可能ならクリーチャーを攻撃する」：攻撃できるクリーチャーがいれば、プレイヤーは攻撃できない
  if (kw.attackCreaturesIfAble && out.some((t) => t.kind === 'creature')) return out.filter((t) => t.kind === 'creature');
  return out;
}

export function blockersFor(state: GameState, reg: CardRegistry, defender: PlayerId, attacker: string): string[] {
  const akw = keywords(state, reg, attacker);
  const unblockable = !!akw.unblockable;
  const target = state.combat?.target;
  return battleCards(state, reg, defender).filter((b) => {
    if (state.cards[b].tapped) return false;
    const kw = keywords(state, reg, b);
    if (kw.cannotBlock) return false;
    if (akw.immuneToPowerAtMost !== undefined && power(state, reg, b) <= akw.immuneToPowerAtMost) return false;
    // 「このクリーチャーよりパワーが小さいクリーチャーにブロックされない」
    if (akw.unblockableBySmaller && !kw.superGuardman && !kw.guardman && power(state, reg, b) < power(state, reg, attacker)) return false;
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
  const zones = [spec.zone, ...(spec.extraZones ?? [])];
  // 決まった相手（誘発の原因・直前に選んだカード）：まだそのゾーンにあるものだけ
  const fixed = spec.iids ?? (spec.ref === 'chosen' ? (state.lastChosen ?? []) : spec.ref === 'event' ? [] : null);
  if (fixed) {
    return fixed.filter((iid) => {
      const inst = state.cards[iid];
      if (!inst || (!spec.anyZone && !zones.includes(inst.zone as TargetSpec['zone'])) || !owners.includes(inst.owner)) return false;
      if (inst.zone === 'battle' && isIgnored(state, reg, iid)) return false;
      return matchFilter(state, reg, iid, spec.filter, source);
    });
  }
  const out: string[] = [];
  for (const o of owners) {
    for (const zone of zones) {
      // 「エレメント」「バトルゾーンにあるカード」・クリーチャー以外の種類の指定：フィールドなども選べる
      const inBattle = spec.element || (spec.filter?.cardType && isNonCreaturePermanent(spec.filter.cardType)) || spec.filter?.typeLabelIncludes ? battleAndFields(state, reg, o) : battleCards(state, reg, o);
      for (const iid of zone === 'battle' ? inBattle : state.players[o].zones[zone]) {
        if (matchFilter(state, reg, iid, spec.filter, source)) out.push(iid);
      }
    }
  }
  return out;
}

/** 数を数える。noPower なら元のパワーで判定（常在効果の中から呼ぶ時の循環防止）。source は「他の」の判定用 */
export function countQuantity(state: GameState, reg: CardRegistry, controller: PlayerId, q: Quantity, noPower = false, source?: string): number {
  const players: PlayerId[] = q.who === 'self' ? [controller] : q.who === 'opponent' ? [other(controller)] : [controller, other(controller)];
  // フィールド・タマシードを数える時はクリーチャー以外も見る
  const inBattle = (p: PlayerId) => (q.withPermanents || (q.filter?.cardType && isNonCreaturePermanent(q.filter.cardType)) ? battleAndFields(state, reg, p) : battleCards(state, reg, p));
  // 「このクリーチャーの下にあるカード」
  if (q.zone === 'under') return source && state.cards[source] ? state.cards[source].under.filter((iid) => matchFilter(state, reg, iid, q.filter, source, noPower)).length : 0;
  const zone = q.zone;
  const hits = players.flatMap((p) => (zone === 'battle' ? inBattle(p) : state.players[p].zones[zone]).filter((iid) => matchFilter(state, reg, iid, q.filter, source, noPower)));
  // 「コストが異なる〜1体につき」：コストの種類の数
  if (q.distinctCost) return new Set(hits.map((iid) => def(state, reg, iid).cost)).size;
  return hits.length;
}

export function evalCondition(state: GameState, reg: CardRegistry, controller: PlayerId, c: Condition, noPower = false, source?: string): boolean {
  switch (c.type) {
    case 'not':
      return !evalCondition(state, reg, controller, c.condition, noPower, source);
    case 'and':
      return c.conditions.every((x) => evalCondition(state, reg, controller, x, noPower, source));
    case 'or':
      return c.conditions.some((x) => evalCondition(state, reg, controller, x, noPower, source));
    case 'compare': {
      const l = countQuantity(state, reg, controller, c.left, noPower, source);
      const r = (typeof c.right === 'number' ? c.right : countQuantity(state, reg, controller, c.right, noPower, source)) + (c.rightPlus ?? 0);
      return c.op === '>' ? l > r : c.op === '>=' ? l >= r : c.op === '<' ? l < r : c.op === '<=' ? l <= r : l === r;
    }
    case 'attackedThisTurn':
      return !!source && state.cards[source]?.attackedTurn === state.turn;
    case 'selfIsEvolution': {
      const inst = source ? state.cards[source] : undefined;
      if (!inst) return false;
      // NEO進化・G-NEO進化で重ねたクリーチャーも進化クリーチャー
      return def(state, reg, source!).type === 'evolution' || (inst.zone === 'battle' && inst.under.length > 0);
    }
    case 'summonedThisTurn':
      return (state.players[c.who === 'self' ? controller : other(controller)].summonsThisTurn ?? 0) > 0;
    case 'castThisTurn':
      return (state.players[c.who === 'self' ? controller : other(controller)].spellsThisTurn ?? 0) > 0;
    case 'turnTally': {
      const p = state.players[c.who === 'self' ? controller : other(controller)];
      const n =
        c.what === 'attacks'
          ? (p.attacksThisTurn ?? 0)
          : c.what === 'draws'
            ? (p.drawnThisTurn ?? 0)
            : (p.playedThisTurn ?? []).filter((x) => state.cards[x] && matchFace(playFace(def(state, reg, x)), def(state, reg, x), c.filter)).length;
      return n >= c.min;
    }
    case 'chosenDistinctNames': {
      const names = (state.lastChosen ?? []).filter((x) => state.cards[x]).map((x) => def(state, reg, x).name);
      return names.length > 0 && new Set(names).size === names.length;
    }
    case 'didNot':
      return !state.lastDid;
    case 'enteredFreeThisTurn':
      return (state.players[c.who === 'self' ? controller : other(controller)].freeEntriesThisTurn ?? 0) > 0;
    case 'nthAttackThisTurn':
      return (state.players[state.activePlayer].attacksThisTurn ?? 0) === c.n;
    case 'enteredNamedThisTurn':
      return (state.players[c.who === 'self' ? controller : other(controller)].enteredNamesThisTurn ?? []).some((nm) => nm.replace(/\s/g, '').includes(c.name.replace(/\s/g, '')));
    case 'firstAttackThisTurn':
      return (state.players[state.activePlayer].attacksThisTurn ?? 0) === 1;
    case 'crossed': {
      const gears = [...state.players[0].zones.battle, ...state.players[1].zones.battle].filter((b) => state.cards[b].equippedTo && isCrossGear(reg[state.cards[b].cardId]));
      return c.any ? gears.some((b) => state.cards[state.cards[b].equippedTo!]?.owner === controller) : !!source && gears.filter((b) => state.cards[b].equippedTo === source).length >= (c.min ?? 1);
    }
    case 'entry': {
      const who = c.self ? source : c.iid;
      const inst = who ? state.cards[who] : undefined;
      if (!inst || inst.zone !== 'battle') return false;
      if (c.summoned !== undefined && !!inst.enteredBySummon !== c.summoned) return false;
      if (c.from && !(inst.enteredFrom && c.from.includes(inst.enteredFrom))) return false;
      if (c.notFrom && inst.enteredFrom && c.notFrom.includes(inst.enteredFrom)) return false;
      return true;
    }
    case 'shieldForce': {
      const sf = source ? state.cards[source]?.shieldForce : undefined;
      return !!sf && state.cards[sf]?.zone === 'shield';
    }
    case 'selfPower': {
      if (noPower || !source || state.cards[source]?.zone !== 'battle') return false;
      const p = power(state, reg, source);
      return c.op === '>' ? p > c.value : c.op === '>=' ? p >= c.value : p <= c.value;
    }
    case 'selfAttacking':
      return !!source && state.combat?.attacker === source;
    case 'civsInBattle': {
      const civs = new Set<string>();
      for (const p of [0, 1] as PlayerId[]) for (const b of battleAndFields(state, reg, p)) for (const cv of def(state, reg, b).civilizations) if (cv !== 'zero') civs.add(cv);
      return civs.size >= c.min;
    }
    case 'gearAttached': {
      const host = source ? state.cards[source]?.equippedTo : undefined;
      return !!host && state.cards[host]?.zone === 'battle';
    }
    case 'selfTapped':
      return !!source && state.cards[source]?.zone === 'battle' && state.cards[source].tapped;
    case 'wonBattleThisTurn':
      return (state.players[c.who === 'self' ? controller : other(controller)].battleWinsThisTurn ?? 0) > 0;
    case 'selfEnteredThisTurn':
      return !!source && state.cards[source]?.zone === 'battle' && state.cards[source].enteredTurn === state.turn;
    case 'subjectEnteredFree':
      return !!c.iid && state.cards[c.iid]?.zone === 'battle' && !!state.cards[c.iid].enteredFree;
    case 'enteredThisTurn': {
      const ps: PlayerId[] = c.who === 'self' ? [controller] : c.who === 'opponent' ? [other(controller)] : [controller, other(controller)];
      return ps.reduce<number>((a, p) => a + (state.players[p].creaturesThisTurn ?? 0), 0) >= c.min;
    }
    case 'underCount':
      return !!source && (state.cards[source]?.under.length ?? 0) >= c.min;
    case 'opponentTurn':
      return state.activePlayer !== controller;
    case 'inExtraTurn':
      return !!state.inExtraTurn;
    case 'shieldsBrokenThisTurn':
      return (state.players[c.who === 'self' ? controller : other(controller)].shieldsBrokenThisTurn ?? 0) >= c.min;
    case 'playedFreeThisTurn': {
      const P = state.players[c.who === 'self' ? controller : other(controller)];
      return (P.freeEntriesThisTurn ?? 0) + (P.freeSpellsThisTurn ?? 0) > 0;
    }
    case 'enteredByRevolution':
      return !!source && state.cards[source]?.zone === 'battle' && !!state.cards[source].enteredByRevolution;
    case 'usedThisTurn':
      return !!state.usedThisTurn?.includes(`${controller}:${c.key}`);
    case 'chosenMatches': {
      const chosen = (state.lastChosen ?? []).filter((x) => state.cards[x]);
      return chosen.length > 0 && chosen.every((x) => matchFilter(state, reg, x, c.filter, source, noPower));
    }
  }
}

// ───────────────────────── 召喚・支払い ─────────────────────────

/** 進化元として選べるクリーチャー */
/** バトルゾーンのクリーチャー1体だけを進化元にする指定か（ふつうの進化と同じ流れで処理できる） */
function simpleSpec(spec: EvolveSpec | undefined): boolean {
  return !!spec && !spec.deckTop && !spec.eachZone && !spec.atLeast && spec.count === 1 && spec.zones.length === 1 && spec.zones[0] === 'battle';
}

/** 進化元を何枚も・バトルゾーン以外から選ぶ進化の指定（なければ undefined） */
export function multiEvolveSpec(d: CardDefinition): EvolveSpec | undefined {
  return d.evolveSpec && !simpleSpec(d.evolveSpec) ? d.evolveSpec : undefined;
}

/** 進化元にできるカード（multiEvolveSpec のあるカード用） */
export function evolveSourceCandidates(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string[] {
  const spec = multiEvolveSpec(def(state, reg, iid));
  if (!spec || spec.deckTop) return [];
  const out: string[] = [];
  for (const z of spec.zones) {
    const list = z === 'battle' ? [...battleCards(state, reg, player), ...state.players[player].zones.battle.filter((b) => !isCreatureType(def(state, reg, b).type) && def(state, reg, b).keywords?.shinkarize)] : state.players[player].zones[z];
    // 裏向きのシールドは中身を見ずに選ぶので、条件なしの時だけ進化元にできる
    for (const c of list) if (c !== iid && (z === 'shield' && !spec.filter ? true : matchFilter(state, reg, c, spec.filter, iid, true))) out.push(c);
  }
  return out;
}

/** 選んだ進化元が、進化の指定に合っているか */
export function validEvolveSources(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, sources: string[]): boolean {
  const spec = multiEvolveSpec(def(state, reg, iid));
  if (!spec || spec.deckTop) return false;
  const cands = evolveSourceCandidates(state, reg, player, iid);
  if (new Set(sources).size !== sources.length || sources.some((x) => !cands.includes(x))) return false;
  if (spec.eachZone) return sources.length === spec.zones.length && spec.zones.every((z) => sources.filter((x) => state.cards[x].zone === z).length === 1);
  return spec.atLeast ? sources.length >= spec.count : sources.length === spec.count;
}

/** 進化元の選び方の1つ（CPU 用・選ぶ余地がない時用）。そろわなければ null */
export function defaultEvolveSources(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string[] | null {
  const spec = multiEvolveSpec(def(state, reg, iid));
  if (!spec || spec.deckTop) return null;
  const cands = evolveSourceCandidates(state, reg, player, iid);
  if (spec.eachZone) {
    const pick = spec.zones.map((z) => cands.find((x) => state.cards[x].zone === z));
    return pick.every((x): x is string => !!x) ? (pick as string[]) : null;
  }
  // バトルゾーン以外のカードを先に使う
  const sorted = [...cands].sort((a, b) => Number(state.cards[a].zone === 'battle') - Number(state.cards[b].zone === 'battle'));
  return sorted.length >= spec.count ? sorted.slice(0, spec.count) : null;
}

export function evolutionBases(state: GameState, reg: CardRegistry, player: PlayerId, iid: string): string[] {
  const d = def(state, reg, iid);
  if (multiEvolveSpec(d)) return [];
  // 究極進化・スター進化など：バトルゾーンの条件に合う1体
  if (d.evolveSpec) {
    const all = [...battleCards(state, reg, player), ...state.players[player].zones.battle.filter((b) => !isCreatureType(def(state, reg, b).type) && def(state, reg, b).keywords?.shinkarize)];
    return all.filter((b) => b !== iid && matchFilter(state, reg, b, d.evolveSpec!.filter, iid, true));
  }
  // NEO進化：条件に合うクリーチャーの上に重ねてもよい
  // シンカライズ：クリーチャーであるかのように進化元にできるタマシード
  const bases = [...battleCards(state, reg, player), ...state.players[player].zones.battle.filter((b) => !isCreatureType(def(state, reg, b).type) && def(state, reg, b).keywords?.shinkarize)];
  if (d.neoEvolution) return bases.filter((b) => matchFilter(state, reg, b, d.neoEvolution, undefined, true));
  if (d.type !== 'evolution') return [];
  return bases.filter((b) => matchesEvolvesFrom(def(state, reg, b), d));
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
export function choosePayment(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, preferred?: string[], side: 'main' | 'twin' = 'main', sacrifice: string[] = [], neo = false): string[] | null {
  const face = playFace(def(state, reg, iid), side);
  const cost = effectiveCost(state, reg, player, iid, side, sacrifice, neo);
  return payMana(state, reg, player, cost, face.civilizations, preferred);
}

/** コストと必要な文明から、支払うマナを決める（払えなければ null） */
export function payMana(state: GameState, reg: CardRegistry, player: PlayerId, cost: number, needCivs: Civilization[], preferred?: string[]): string[] | null {
  // コスト0（G・ゼロなど）はマナを支払わない
  if (cost === 0) return preferred && preferred.length ? null : [];
  const civs: Civilization[] = needCivs.filter((cv) => cv !== 'zero');
  const untapped = state.players[player].zones.mana.filter((m) => !state.cards[m].tapped);
  // 裏向きのマナ（水晶チャージャー）は文明を持たない
  const mciv = (m: string) => (state.cards[m].faceUp === false ? [] : manaCivilizations(def(state, reg, m)));
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

// ───────────────────────── 別のコストでの使い方 ─────────────────────────

/** 別のコストで使う時に支払うコスト。sacrifice[0] はフシギバースでマナゾーンに置くクリーチャー */
export function altCost(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, alt: AltPlay, sacrifice: string[] = []): number {
  if (alt.cost === undefined) return Math.max(1, effectiveCost(state, reg, player, iid, 'main') - (alt.reduce ?? 0));
  if (alt.fushigi) {
    const sac = sacrifice[0];
    return Math.max(alt.fushigi.min, alt.cost - (sac && state.cards[sac] ? def(state, reg, sac).cost : 0));
  }
  return alt.cost;
}

export function altPayment(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, alt: AltPlay, preferred?: string[], sacrifice: string[] = []): string[] | null {
  return payMana(state, reg, player, altCost(state, reg, player, iid, alt, sacrifice), alt.civilizations ?? def(state, reg, iid).civilizations, preferred);
}

/** その使い方の条件（ゾーン・条件・使用制限・支払い）を満たしているか。タイミングは見ない */
export function altUsable(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, idx: number, sacrifice: string[] = []): boolean {
  const inst = state.cards[iid];
  if (!inst || inst.owner !== player) return false;
  const d = def(state, reg, iid);
  const alt = d.altPlays?.[idx];
  if (!alt || inst.zone !== (alt.from ?? 'hand') || d.type === 'evolution') return false;
  if (alt.condition && !evalCondition(state, reg, player, alt.condition, true, iid)) return false;
  // ギャラクシールドは出す（唱える）わけではないので、召喚・呪文の制限を受けない
  if (!alt.toShield && !alt.toHyperspatial && playRestriction(state, reg, player, iid, 'main')) return false;
  if (alt.fushigi && !(sacrifice[0] && battleCards(state, reg, player).includes(sacrifice[0]))) return false;
  return altPayment(state, reg, player, iid, alt, undefined, sacrifice) !== null;
}

/** 自分のメインステップに、その使い方でカードを使えるか */
export function canPlayAlt(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, idx: number, sacrifice: string[] = []): boolean {
  if (!isIdle(state) || state.activePlayer !== player) return false;
  if (state.phase !== 'charge' && state.phase !== 'main') return false;
  const alt = state.cards[iid] && def(state, reg, iid).altPlays?.[idx];
  return !!alt && !alt.timing && altUsable(state, reg, player, iid, idx, sacrifice);
}

/** フシギバースでマナゾーンに置けるクリーチャー（そのクリーチャーを選べば支払えるもの） */
export function fushigiCandidates(state: GameState, reg: CardRegistry, player: PlayerId, iid: string, idx: number): string[] {
  return battleCards(state, reg, player).filter((b) => canPlayAlt(state, reg, player, iid, idx, [b]));
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
  const mspec = side === 'main' ? multiEvolveSpec(d) : undefined;
  if (mspec && !mspec.optional) {
    if (mspec.deckTop ? state.players[player].zones.deck.length < mspec.deckTop.count : defaultEvolveSources(state, reg, player, iid) === null) return false;
  } else if (side === 'main' && d.type === 'evolution' && !mspec && evolutionBases(state, reg, player, iid).length === 0) return false;
  if (playRestriction(state, reg, player, iid, side)) return false;
  if (choosePayment(state, reg, player, iid, undefined, side) !== null) return true;
  // NEO進化クリーチャーとして召喚すれば払える
  if (side === 'main' && d.neoCostReduce && evolutionBases(state, reg, player, iid).length && choosePayment(state, reg, player, iid, undefined, side, [], true) !== null) return true;
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
