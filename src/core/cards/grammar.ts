// 能力テキストの構文解析：字句解析（lexer.ts）で分けた語の並びを、誘発・条件・目的語・動詞の部品として読み、効果定義を組み立てる。
// textParser.ts（正規表現で文の形ごとに読む方式）を置き換えるための2段目。いまは textParser で読めなかった行だけをここで読む。
// 部品：
//   誘発（〜した時、）parseTrigger ／ 条件（〜あれば、〜なら、）parseConditions ／ 名詞句（相手のコスト5以下のクリーチャー）parseNP ／
//   目的語（〜を1体まで、自分の手札から）parseObject ／ 動詞句（墓地に置く・コストを支払わずに召喚する）resolveVerb
// 読めない語の並びがあれば null を返す（誤って自動処理しないため。呼んだ側で手動処理にする）。
import type { CardFilter, Civilization, Condition, EffectDef, HandTrigger, Keywords, MoveDest, Quantity, ReplacementAbility, StaticAbility, TargetSpec, TriggeredAbility, TriggerEvent } from './types';
import { tokenize, type Token } from './lexer';

/** 構文解析の結果（textParser の ParsedAbilities の一部と同じ形） */
export interface GrammarResult {
  keywords: Keywords;
  abilities: TriggeredAbility[];
  statics: StaticAbility[];
  replacements: ReplacementAbility[];
  handTriggers: HandTrigger[];
  /** このカード自身の召喚コストを「〜1体につき」少なくする */
  selfCost?: { amount: number; per: Quantity; unit: number; min: number };
}

type Kind = 'creature' | 'spell';
type Zone = TargetSpec['zone'];

// ───────────────────────── 語を読む道具 ─────────────────────────

class Cur {
  constructor(
    public ts: Token[],
    public i = 0,
  ) {}
  get done(): boolean {
    return this.i >= this.ts.length;
  }
  peek(o = 0): Token | undefined {
    return this.ts[this.i + o];
  }
  text(o = 0): string | undefined {
    return this.ts[this.i + o]?.text;
  }
  /** 表記の並びが続いていれば読み進めて true */
  lit(...xs: string[]): boolean {
    for (let k = 0; k < xs.length; k++) if (this.ts[this.i + k]?.text !== xs[k]) return false;
    this.i += xs.length;
    return true;
  }
  /** いずれかの並びが続いていれば読み進めて true */
  any(...seqs: string[][]): boolean {
    return seqs.some((q) => this.lit(...q));
  }
  /** その種類の語なら読み進めて返す */
  kind<K extends Token['kind']>(k: K, pred?: (t: Extract<Token, { kind: K }>) => boolean): Extract<Token, { kind: K }> | null {
    const t = this.ts[this.i];
    if (!t || t.kind !== k || (pred && !pred(t as Extract<Token, { kind: K }>))) return null;
    this.i++;
    return t as Extract<Token, { kind: K }>;
  }
  verb(lemma: string | string[], forms?: string[]): Extract<Token, { kind: 'verb' }> | null {
    const ls = Array.isArray(lemma) ? lemma : [lemma];
    return this.kind('verb', (t) => ls.includes(t.lemma) && (!forms || forms.includes(t.form)));
  }
  /** 試しに読む：失敗したら位置を戻す */
  try<T>(fn: () => T | null | undefined | false): T | null {
    const at = this.i;
    const r = fn();
    if (r === null || r === undefined || r === false) {
      this.i = at;
      return null;
    }
    return r;
  }
  rest(): Token[] {
    return this.ts.slice(this.i);
  }
}

/** 語の並びを、区切りの語（。）で分ける */
function splitBy(ts: Token[], p: string): Token[][] {
  const out: Token[][] = [[]];
  for (const t of ts) {
    if (t.kind === 'punct' && t.p === p) out.push([]);
    else out[out.length - 1].push(t);
  }
  return out.filter((x) => x.length);
}

const textOf = (ts: Token[]) => ts.map((t) => t.text).join('');
const PLAYER: Record<string, 'self' | 'opponent'> = { 自分: 'self', 相手: 'opponent' };

// ───────────────────────── 名詞句 ─────────────────────────

interface NP {
  owner?: 'self' | 'opponent' | 'any';
  zone?: Zone;
  /** 名詞：creature / card / shield / spell / player */
  noun: string;
  filter: CardFilter;
  /** この（自分自身）・それ／その（直前に選んだ）・誘発の原因 */
  ref?: 'this' | 'chosen';
}

const ZONE_OF: Record<string, Zone | undefined> = { battle: 'battle', mana: 'mana', shield: 'shield', graveyard: 'graveyard', hand: 'hand', deck: 'deck', hyperspatial: 'hyperspatial' };

/** 「自分の墓地にある」「バトルゾーンにある」「いずれかのシールドゾーンにある」 */
function parseZoneAt(c: Cur): { owner?: 'self' | 'opponent' | 'any'; zone: Zone } | null {
  return c.try(() => {
    let owner: 'self' | 'opponent' | 'any' | undefined;
    const p = c.kind('player', (t) => t.player === 'self' || t.player === 'opponent');
    if (p) {
      if (!c.lit('の')) return null;
      owner = PLAYER[p.text];
    } else if (c.lit('いずれか', 'の')) owner = 'any';
    const z = c.kind('zone');
    if (!z || !ZONE_OF[z.zone]) return null;
    if (!c.lit('に', 'ある')) return null;
    c.lit('、');
    return { owner, zone: ZONE_OF[z.zone]! };
  });
}

function addCost(f: CardFilter, n: number, op: string): boolean {
  if (op === '<=') f.maxCost = n;
  else if (op === '>=') f.minCost = n;
  else return false;
  return true;
}

/** 名詞句を読む */
function parseNP(c: Cur): NP | null {
  return c.try(() => {
    const np: NP = { noun: '', filter: {} };
    // 「そのドラゴン以下のコストを持つ」「その捨てたカードと同じコストの」：直前に選んだ（動かした）カードとコストを比べる
    const refCost = c.try(() => {
      if (!c.lit('その')) return null;
      if (!c.kind('word') && !c.kind('noun')) return null;
      let cmp: 'le' | 'eq';
      if (c.kind('compare', (t) => t.op === '<=') && c.lit('の')) cmp = 'le';
      else if (c.lit('と') && c.kind('compare', (t) => t.op === 'same')) cmp = 'eq';
      else return null;
      if (!c.lit('コスト')) return null;
      if (!(c.try(() => c.lit('を') && c.verb('持つ', ['plain'])) || c.lit('の'))) return null;
      return cmp;
    });
    if (refCost) np.filter.refCost = refCost;
    // この〜（自分自身）
    if (!refCost && c.lit('この')) {
      const n = c.kind('noun');
      if (!n) return null;
      np.ref = 'this';
      np.noun = n.noun;
      return np;
    }
    // それ・その〜・その2体
    if (!refCost && (c.lit('それ') || c.lit('それら'))) {
      np.ref = 'chosen';
      np.noun = 'card';
      return np;
    }
    if (!refCost && c.lit('その')) {
      const cnt = c.kind('count');
      const n = c.kind('noun');
      if (!cnt && !n) return null;
      np.ref = 'chosen';
      np.noun = n?.noun ?? 'creature';
      return np;
    }
    if (c.lit('いずれか', 'の', 'プレイヤー', 'の')) np.owner = 'any';
    // 修飾語（持ち主の「自分の」「相手の」も修飾語の間に来る：「バトルゾーンにある相手のカード」）
    for (let guard = 0; guard < 12; guard++) {
      if (c.lit('、')) continue;
      // 「相手のマナゾーンにあるカードの枚数よりコストが大きい」：持ち主のマナの枚数と比べる
      if (c.try(() => c.kind('player') && c.lit('の', 'マナゾーン', 'に', 'ある', 'カード', 'の', '枚数', 'より', 'コスト', 'が') && c.kind('compare', (t) => t.op === 'big'))) {
        np.filter.costAboveOwnerMana = true;
        continue;
      }
      const at = parseZoneAt(c);
      if (at) {
        np.zone = at.zone;
        if (at.owner) np.owner = at.owner;
        continue;
      }
      const p = c.try(() => {
        const t = c.kind('player', (x) => x.player === 'self' || x.player === 'opponent');
        return t && c.lit('の') ? t : null;
      });
      if (p) {
        np.owner = PLAYER[p.text];
        continue;
      }
      if (c.lit('他', 'の')) {
        np.filter.excludeSelf = true;
        continue;
      }
      // 文明：「闇または火の」「光の」「多色」
      const civs: Civilization[] = [];
      const civ = c.try(() => {
        const first = c.kind('civ');
        if (!first) return null;
        if (first.civ === 'multi') {
          np.filter.multicolor = true;
          return true;
        }
        if (first.civ === 'mono' || first.civ === 'colorless') return null;
        civs.push(first.civ);
        while (c.lit('または') || c.lit('か')) {
          const nx = c.kind('civ');
          if (!nx || nx.civ === 'multi' || nx.civ === 'mono' || nx.civ === 'colorless') return null;
          civs.push(nx.civ);
        }
        c.lit('の');
        return true;
      });
      if (civ) {
        if (civs.length === 1) np.filter.civilization = civs[0];
        else if (civs.length > 1) np.filter.civilizations = civs;
        continue;
      }
      // コスト・パワー：「コスト6以下の」「パワー3000以上の」
      const stat = c.try(() => {
        const st = c.kind('stat', (t) => t.stat === 'cost' || t.stat === 'power');
        const n = c.kind('number');
        const op = c.kind('compare', (t) => t.op === '<=' || t.op === '>=');
        if (!st || !n || !op) return null;
        c.lit('の');
        if (st.stat === 'cost') return addCost(np.filter, n.n, op.op);
        if (op.op === '<=') np.filter.maxPower = n.n;
        else np.filter.minPower = n.n;
        return true;
      });
      if (stat) continue;
      // 「進化ではない」「ドラゴンではない」
      if (c.try(() => c.verb('進化する', ['stem']) && c.lit('で', 'は', 'ない'))) {
        np.filter.nonEvolution = true;
        continue;
      }
      const notRace = c.try(() => {
        const w = c.kind('word', (t) => t.script === 'katakana' || t.script === 'kanji');
        return w && c.lit('で', 'は', 'ない') ? w : null;
      });
      if (notRace) {
        np.filter.not = { race: notRace.text };
        continue;
      }
      if (c.lit('表向き', 'の')) {
        np.filter.faceUp = true;
        continue;
      }
      // 「「このクリーチャーがバトルゾーンに出た時」で始まる能力を持つ」
      const q = c.try(() => {
        const qt = c.kind('quote');
        if (!qt || !c.lit('で', '始まる', '能力', 'を', '持つ')) return null;
        return /出た時$/.test(textOf(qt.children)) ? qt : null;
      });
      if (q) {
        np.filter.hasOnSummonAbility = true;
        continue;
      }
      break;
    }
    // 名詞
    const n = c.kind('noun', (t) => ['creature', 'card', 'shield', 'spell', 'player', 'evolution'].includes(t.noun));
    if (n) {
      np.noun = n.noun === 'evolution' ? 'creature' : n.noun;
      if (n.noun === 'evolution') np.filter.evolution = true;
    } else {
      // 名詞のない「ドルスザク」「ドラゴン」、「ドラゴン・クリーチャー」：種族のクリーチャー
      const w = c.kind('word', (t) => t.script === 'katakana' || t.script === 'kanji');
      if (!w) return null;
      c.try(() => c.lit('・') && c.kind('noun', (t) => t.noun === 'creature'));
      np.noun = 'creature';
      np.filter.race = w.text;
    }
    return np;
  });
}

/** 名詞句を対象指定にする */
function toTarget(np: NP, count: TargetSpec['count'], upTo: boolean, from?: { owner?: 'self' | 'opponent'; zones: Zone[] }): TargetSpec {
  const zone: Zone = from?.zones[0] ?? np.zone ?? (np.noun === 'shield' ? 'shield' : 'battle');
  const owner = from?.owner ?? np.owner ?? (zone === 'battle' ? 'any' : 'self');
  const filter: CardFilter = { ...np.filter };
  if ((np.noun === 'creature' && (zone !== 'battle' || filter.race)) || (np.noun === 'creature' && Object.keys(filter).length === 0 && zone !== 'battle')) filter.cardType = 'creature';
  if (np.noun === 'spell') filter.cardType = 'spell';
  return {
    owner,
    zone,
    count,
    ...(upTo ? { upTo: true } : {}),
    ...(Object.keys(filter).length ? { filter } : {}),
    ...(from && from.zones.length > 1 ? { extraZones: from.zones.slice(1) } : {}),
  };
}

// ───────────────────────── 目的語 ─────────────────────────

interface Obj {
  np: NP;
  count: TargetSpec['count'];
  upTo: boolean;
  from?: { owner?: 'self' | 'opponent'; zones: Zone[] };
}

/** 移動元：「自分の手札または墓地から」「バトルゾーンから」 */
function parseFrom(c: Cur): Obj['from'] | null {
  return c.try(() => {
    let owner: 'self' | 'opponent' | undefined;
    const p = c.try(() => {
      const t = c.kind('player', (x) => x.player === 'self' || x.player === 'opponent');
      return t && c.lit('の') ? t : null;
    });
    if (p) owner = PLAYER[p.text];
    const zones: Zone[] = [];
    const z = c.kind('zone');
    if (!z || !ZONE_OF[z.zone]) return null;
    zones.push(ZONE_OF[z.zone]!);
    while (c.lit('または') || c.lit('と')) {
      const z2 = c.kind('zone');
      if (!z2 || !ZONE_OF[z2.zone]) return null;
      zones.push(ZONE_OF[z2.zone]!);
    }
    if (!c.lit('から')) return null;
    c.lit('、');
    return { owner, zones };
  });
}

/** 数：「1体」「2枚まで」「すべて」「好きな数」 */
function parseCount(c: Cur): { count: TargetSpec['count']; upTo: boolean } | null {
  const n = c.kind('count', (t) => !t.ordinal && ['体', '枚', 'つ'].includes(t.unit));
  if (n) return { count: n.n, upTo: c.lit('まで') };
  if (c.kind('quant', (t) => t.quant === 'all')) return { count: 'all', upTo: false };
  if (c.kind('quant', (t) => t.quant === 'any')) return { count: 99, upTo: true };
  return null;
}

/** 目的語：「相手のクリーチャーを1体」「ドルスザクを４体まで、自分の手札または墓地から」 */
function parseObject(c: Cur): Obj | null {
  return c.try(() => {
    const np = parseNP(c);
    if (!np || !c.lit('を')) return null;
    if (np.ref) return { np, count: 1, upTo: false };
    c.lit('、');
    const cnt = parseCount(c) ?? { count: 1 as TargetSpec['count'], upTo: false };
    c.lit('、');
    const from = parseFrom(c) ?? undefined;
    return { np, count: cnt.count, upTo: cnt.upTo, from };
  });
}

// ───────────────────────── 動詞句 ─────────────────────────

interface VerbPhrase {
  effects: EffectDef[];
  optional: boolean;
}

/** 文の終わりの「〜てもよい」 */
function endMay(c: Cur): boolean {
  return c.kind('aux', (t) => t.aux === 'may') !== null;
}

/** 移動先：「持ち主の墓地に」「自分のシールドゾーンに」「山札の下に」「持ち主のシールド1つの上に」 */
function parseDest(c: Cur): { to: MoveDest; faceDown?: boolean } | null {
  return c.try(() => {
    c.kind('player');
    c.lit('の');
    if (c.try(() => c.lit('シールド') && c.kind('count', (t) => t.n === 1) && c.lit('の', '上', 'に'))) return { to: 'shieldTop' as MoveDest };
    const z = c.kind('zone');
    if (z) {
      if (z.zone === 'deck') {
        if (c.lit('の', '下', 'に') || c.lit('の', '一番下', 'に')) return { to: 'deckBottom' as MoveDest };
        if (c.lit('の', '上', 'に') || c.lit('の', '一番上', 'に')) return { to: 'deckTop' as MoveDest };
        return null;
      }
      if (!c.lit('に')) return null;
      const map: Record<string, MoveDest> = { hand: 'hand', mana: 'mana', graveyard: 'graveyard', shield: 'shield', battle: 'battle' };
      return map[z.zone] ? { to: map[z.zone] } : null;
    }
    // 「シールドに加える」
    if (c.lit('シールド', 'に')) return { to: 'shield' as MoveDest };
    return null;
  });
}

/**
 * 目的語に続く動詞句を読み、効果にする。target は目的語の対象（「それ」は ref: 'chosen'、誘発の原因は ref: 'event'）
 */
function parseVerbPhrase(c: Cur, target: TargetSpec | 'self', ctx: Ctx): VerbPhrase | null {
  return c.try(() => {
    let free = false;
    let faceUp = false;
    let faceDown = false;
    // 修飾：「コストを支払わずに」「表向きにして」「裏向きにして」
    for (let g = 0; g < 4; g++) {
      if (c.try(() => c.lit('コスト', 'を') && c.verb('支払う', ['nu']) && c.lit('に'))) {
        free = true;
        continue;
      }
      if (c.try(() => c.lit('表向き', 'に') && c.verb('する', ['te', 'renyo']))) {
        faceUp = true;
        c.lit('、');
        continue;
      }
      if (c.try(() => c.lit('裏向き', 'に') && c.verb('する', ['te', 'renyo']))) {
        faceDown = true;
        continue;
      }
      if (c.kind('adv', (t) => t.adv === 'immediately')) continue;
      break;
    }
    const dest = parseDest(c);
    if (dest) {
      if (!c.verb(['置く', '加える', '戻す', '出す'])) return null;
      const optional = endMay(c);
      const to: MoveDest = dest.to === 'shield' && faceUp ? 'shieldTop' : dest.to;
      if (target === 'self') {
        if (to === 'shield' && faceDown) return { effects: [{ type: 'selfAction', action: 'shield' }], optional };
        if (to === 'battle' || to === 'under' || to === 'shieldTop') return null;
        return { effects: [{ type: 'selfAction', action: to }], optional };
      }
      if (to === 'battle' && free) return { effects: [{ type: 'playFree', target }], optional };
      return { effects: [{ type: 'move', target, to }], optional };
    }
    // 「コストを支払わずに召喚する／唱える」
    if (free && c.verb(['召喚する', '唱える', '使う', '出す'])) {
      const optional = endMay(c);
      if (target === 'self') return null;
      return { effects: [{ type: 'playFree', target }], optional };
    }
    if (c.verb('破壊する')) {
      const optional = endMay(c);
      return { effects: [target === 'self' ? { type: 'selfAction', action: 'destroy' } : { type: 'destroy', target }], optional };
    }
    for (const [lemma, type] of [
      ['タップする', 'tap'],
      ['アンタップする', 'untap'],
    ] as const) {
      if (c.verb(lemma)) {
        const optional = endMay(c);
        return { effects: [target === 'self' ? { type: 'selfAction', action: type } : { type, target }], optional };
      }
    }
    if (c.verb('選ぶ')) {
      const optional = endMay(c);
      if (target === 'self') return null;
      return { effects: [{ type: 'choose', target }], optional };
    }
    if (c.verb('見る')) {
      const optional = endMay(c);
      if (target === 'self') return null;
      return { effects: [{ type: 'choose', target, reveal: true }], optional };
    }
    // 「その2体をバトルさせる」：直前に選んだクリーチャーと、相手のクリーチャーをバトルさせる
    if (c.verb('バトルする', ['causative'])) {
      const optional = endMay(c);
      if (!ctx.pendingFight) return null;
      const fighterTarget = ctx.pendingFight;
      ctx.pendingFight = undefined;
      return { effects: [{ type: 'fight', target: fighterTarget, fighter: 'chosen' }], optional };
    }
    void ctx;
    return null;
  });
}

// ───────────────────────── 効果の文 ─────────────────────────

/** 文をまたいで覚えておくこと */
interface Ctx {
  kind: Kind;
  /** 誘発の原因のカードを「それ」で指せる */
  event: boolean;
  /** 「AとBを選ぶ。その2体をバトルさせる」：2体目の対象（1体目は choose で選ぶ） */
  pendingFight?: TargetSpec;
  /** 直前にカードを選んだ（「それ」で指せる） */
  chosen: boolean;
}

interface Group {
  optional: boolean;
  effects: EffectDef[];
}

/** 「それ」の対象：誘発の原因か、直前に選んだカード */
function refTarget(np: NP, ctx: Ctx): TargetSpec {
  if (ctx.event && !ctx.chosen) return { owner: 'any', zone: 'battle', count: 'all', ref: 'event' };
  return { owner: np.owner ?? 'any', zone: np.zone ?? 'battle', count: 'all', ref: 'chosen', anyZone: true };
}

/** 効果の文1つ（「。」まで）を読む。読めなければ null */
function parseEffectSentence(ts: Token[], ctx: Ctx): VerbPhrase | null {
  // 「それがドラゴンなら、〜」：直前に選んだ（動かした）カードが条件に合う時だけ
  const head = new Cur(ts);
  const ifChosen = ctx.chosen
    ? head.try(() => {
        if (!head.lit('それ', 'が')) return null;
        const np = parseNP(head);
        if (!np || np.ref || !head.kind('aux', (t) => t.aux === 'if') || !head.lit('、')) return null;
        return np.filter;
      })
    : null;
  if (ifChosen) {
    const inner = parseEffectSentence(head.rest(), ctx);
    return inner && { effects: [{ type: 'conditional', condition: { type: 'chosenMatches', filter: ifChosen }, then: inner.optional ? [{ type: 'optional', effects: inner.effects }] : inner.effects }], optional: false };
  }
  const c = new Cur(ts);
  const special = parseSpecialSentence(c, ctx);
  if (special) return c.done ? special : null;
  const effects: EffectDef[] = [];
  let optional = false;
  // 節を「〜し、」「〜選び、」でつなぐ
  for (let guard = 0; guard < 6 && !c.done; guard++) {
    const phrase = parseClause(c, ctx);
    if (!phrase) return null;
    // 「〜を1体選び、破壊する」：選ぶだけの節の後に目的語のない節が続けば、選んだカードにまとめる
    const last = effects[effects.length - 1];
    if (last?.type === 'choose' && !last.reveal && phrase.implicit && phrase.effects.length === 1 && 'target' in phrase.effects[0]) {
      const e = phrase.effects[0] as EffectDef & { target: TargetSpec };
      if (e.target.ref === 'chosen') {
        effects[effects.length - 1] = { ...e, target: last.target } as EffectDef;
        optional ||= phrase.optional;
        if (c.lit('、')) continue;
        break;
      }
    }
    effects.push(...phrase.effects);
    optional ||= phrase.optional;
    if (!c.lit('、')) break;
    // 「〜置き、その後、〜」：文の途中のつなぎ
    if (c.kind('conj', (t) => t.conj === 'then')) c.lit('、');
  }
  if (!c.done) return null;
  return effects.length ? { effects, optional } : null;
}

/**
 * 山札の上から置く節：「自分の山札の上から1枚目をタップして自分のマナゾーンに置く」「自分の山札の上からさらにもう1枚、タップしてマナゾーンに置く」
 * 「自分の山札の上から3枚を墓地に置く」
 */
function parseDeckTopClause(c: Cur): VerbPhrase | null {
  return c.try(() => {
    const who = c.kind('player', (t) => t.player === 'self' || t.player === 'opponent');
    if (!who || !c.lit('の', '山札', 'の', '上', 'から')) return null;
    c.kind('conj', (t) => t.conj === 'also');
    c.kind('adv', (t) => t.adv === 'more');
    const n = c.kind('count', (t) => t.unit === '枚');
    if (!n) return null;
    // 「1枚目を」「3枚を」「もう1枚、」
    if (!c.lit('を')) c.lit('、');
    c.lit('、');
    const tapped = !!c.try(() => c.verb('タップする', ['te']));
    c.try(() => c.kind('player') && c.lit('の'));
    const z = c.kind('zone', (t) => ['mana', 'graveyard', 'hand', 'shield'].includes(t.zone));
    if (!z || !c.lit('に') || !c.verb(['置く', '加える'], ['plain', 'renyo', 'te'])) return null;
    const optional = endMay(c);
    const effect: EffectDef = {
      type: 'deckTopTo',
      count: n.ordinal ? 1 : n.n,
      to: z.zone as 'mana' | 'graveyard' | 'hand' | 'shield',
      ...(who.player === 'opponent' ? { who: 'opponent' as const } : {}),
      ...(tapped ? { tapped: true } : {}),
    };
    return { effects: [effect], optional };
  });
}

/** 節：目的語＋動詞句、または目的語のない動詞句（「持ち主の手札に戻す」「表向きにして〜置く」） */
function parseClause(c: Cur, ctx: Ctx): (VerbPhrase & { implicit: boolean }) | null {
  return c.try(() => {
    const deckTop = parseDeckTopClause(c);
    if (deckTop) {
      ctx.chosen = true;
      return { ...deckTop, implicit: false };
    }
    // 「自分のクリーチャーを1体と、相手のクリーチャーを1体、バトルゾーンから選ぶ」
    const pair = c.try(() => {
      const a = parseNP(c);
      if (!a || !c.lit('を')) return null;
      const ca = parseCount(c);
      if (!ca || !c.lit('と')) return null;
      c.lit('、');
      const b = parseNP(c);
      if (!b || !c.lit('を')) return null;
      const cb = parseCount(c);
      if (!cb) return null;
      c.lit('、');
      const from = parseFrom(c) ?? undefined;
      if (!c.verb('選ぶ')) return null;
      const optional = endMay(c);
      ctx.pendingFight = toTarget(b, cb.count, false, from);
      ctx.chosen = true;
      return { effects: [{ type: 'choose', target: toTarget(a, ca.count, false, from) }] as EffectDef[], optional, implicit: false };
    });
    if (pair) return pair;
    const obj = parseObject(c);
    if (obj) {
      const target: TargetSpec | 'self' = obj.np.ref === 'this' ? 'self' : obj.np.ref === 'chosen' ? refTarget(obj.np, ctx) : toTarget(obj.np, obj.count, obj.upTo, obj.from);
      const vp = parseVerbPhrase(c, target, ctx);
      if (!vp) return null;
      if (vp.effects.some((e) => e.type === 'choose')) ctx.chosen = true;
      return { ...vp, implicit: false };
    }
    // 目的語のない節：直前に選んだカード、または誘発の原因
    const implicit: TargetSpec = ctx.event && !ctx.chosen ? { owner: 'any', zone: 'battle', count: 'all', ref: 'event' } : { owner: 'any', zone: 'battle', count: 'all', ref: 'chosen', anyZone: true };
    const vp = parseVerbPhrase(c, implicit, ctx);
    return vp ? { ...vp, implicit: true } : null;
  });
}

/** 決まった言い方の文：カードを引く・追加ターン・ガチンコ・ジャッジ・山札の上から置く */
function parseSpecialSentence(c: Cur, ctx: Ctx): VerbPhrase | null {
  return c.try((): VerbPhrase | null => {
    // 「カードをN枚引く」
    const draw = c.try(() => {
      if (!c.lit('カード', 'を')) return null;
      const n = c.kind('count', (t) => t.unit === '枚');
      const upTo = c.lit('まで');
      if (!n || !c.verb('引く', ['plain', 'te'])) return null;
      return { effects: [{ type: 'draw', count: n.n, ...(upTo ? { upTo: true } : {}) }] as EffectDef[], optional: endMay(c) };
    });
    if (draw) return draw;
    // 追加ターン：「このターンの後で（に、）自分のターンをもう一度行う」「このターンの後、自分はもう1度ターンを行う」
    const extra = c.try(() => {
      if (!c.lit('この', 'ターン', 'の', '後')) return null;
      c.lit('で') || c.lit('に');
      c.lit('、');
      const head = c.any(['自分', 'の', 'ターン', 'を'], ['自分', 'は']);
      if (!c.kind('adv', (t) => t.adv === 'more') || !c.kind('count', (t) => t.n === 1 && t.unit === '度')) return null;
      if (!head && !c.lit('自分', 'の', 'ターン', 'を')) return null;
      c.lit('ターン', 'を');
      return c.verb(['行う', '追加する'], ['plain']) ? { effects: [{ type: 'extraTurn' }] as EffectDef[], optional: false } : null;
    });
    if (extra) return extra;
    // 「相手とガチンコ・ジャッジする」（勝った時の文は後で then に入れる）
    if (c.try(() => c.lit('相手', 'と', 'ガチンコ・ジャッジ') && c.verb('する', ['plain']))) return { effects: [{ type: 'gachinko', then: [] }], optional: false };
    // 「そのプレイヤーは自身の山札の上から1枚目を裏向きのまま、新しいシールドとしてシールドゾーンに置く」
    const newShield = c.try(() => {
      const who = c.lit('その', 'プレイヤー', 'は') ? 'chosenOwner' : null;
      if (who) {
        if (!c.lit('自身', 'の')) return null;
      } else if (!c.lit('自分', 'の')) return null;
      const opts = parseDeckTopShield(c);
      if (!opts) return null;
      const base = { type: 'deckTopTo' as const, count: 1, ...(who ? { who: 'chosenOwner' as const } : {}) };
      if (opts.length === 1) return { effects: [{ ...base, to: opts[0] }] as EffectDef[], optional: false };
      return {
        effects: [
          {
            type: 'chooseOne',
            options: opts.map((to) => ({ label: to === 'shield' ? '裏向きのまま新しいシールドにする' : '表向きにしてシールド1つの上に置く', effects: [{ ...base, to }] as EffectDef[] })),
          },
        ] as EffectDef[],
        optional: false,
      };
    });
    if (newShield) return newShield;
    void ctx;
    return null;
  });
}

/**
 * 「山札の上から1枚目を（、）裏向きのまま（、）新しいシールドとして（自分の）シールドゾーンに置く（か、表向きにして自分のシールド1つの上に置く）」
 * の「山札の」から後を読み、置き方の一覧を返す
 */
function parseDeckTopShield(c: Cur): ('shield' | 'shieldTop')[] | null {
  return c.try(() => {
    if (!c.lit('山札', 'の', '上', 'から') || !c.kind('count', (t) => t.n === 1 && t.unit === '枚') || !c.lit('を')) return null;
    c.lit('、');
    const out: ('shield' | 'shieldTop')[] = [];
    if (!(c.lit('裏向き', 'の', 'まま') || true)) return null;
    c.lit('、');
    if (!c.try(() => c.kind('adj', (t) => t.adj === 'new') && c.lit('シールド', 'として'))) return null;
    c.try(() => c.kind('player') && c.lit('の'));
    if (!c.lit('シールドゾーン', 'に') || !c.verb('置く', ['plain'])) return null;
    out.push('shield');
    if (c.lit('か')) {
      c.lit('、');
      if (!c.try(() => c.lit('表向き', 'に') && c.verb('する', ['te']))) return null;
      c.try(() => c.kind('player') && c.lit('の'));
      if (!c.lit('シールド') || !c.kind('count', (t) => t.n === 1) || !c.lit('の', '上', 'に') || !c.verb('置く', ['plain'])) return null;
      out.push('shieldTop');
    }
    return out;
  });
}

/** 山札を見る効果の3文：「山札の上からN枚を表向きにする（見る）」「その中から〜を〜選び、〜に出す」「残りを〜山札の下に置く」 */
function parseLookSentences(sentences: Token[][], i: number): { effect: EffectDef; used: number } | null {
  const c1 = new Cur(sentences[i]);
  const count = c1.try(() => {
    if (!c1.lit('自分', 'の', '山札', 'の', '上', 'から')) return null;
    const n = c1.kind('count', (t) => t.unit === '枚' && !t.ordinal);
    if (!n || !c1.lit('を')) return null;
    if (c1.try(() => c1.lit('表向き', 'に') && c1.verb('する', ['plain'])) || c1.verb('見る', ['plain'])) return n.n;
    return null;
  });
  if (count === null || !c1.done || !sentences[i + 1]) return null;
  const c2 = new Cur(sentences[i + 1]);
  const pick = c2.try(() => {
    if (!c2.lit('その', '中', 'から')) return null;
    c2.lit('、');
    const np = parseNP(c2);
    if (!np || !c2.lit('を')) return null;
    c2.lit('、');
    let maxTotal: number | undefined;
    const tot = c2.try(() => {
      if (!c2.lit('コスト', 'の', '合計', 'が')) return null;
      const n = c2.kind('number');
      if (!n || !c2.kind('compare', (t) => t.op === '<=') || !c2.lit('に') || !c2.verb('なる', ['plain']) || !c2.kind('aux', (t) => t.aux === 'manner')) return null;
      return n.n;
    });
    if (tot !== null) maxTotal = tot;
    const cnt = parseCount(c2);
    if (!cnt) return null;
    if (!c2.verb('選ぶ', ['renyo', 'te'])) return null;
    c2.lit('、');
    const dest = parseDest(c2);
    if (!dest || !c2.verb(['出す', '加える', '置く'], ['plain'])) return null;
    const pickTo = dest.to === 'battle' || dest.to === 'hand' || dest.to === 'mana' || dest.to === 'graveyard' ? dest.to : null;
    if (!pickTo || !c2.done) return null;
    const filter = { ...np.filter, ...(np.noun === 'creature' ? { cardType: 'creature' as const } : np.noun === 'spell' ? { cardType: 'spell' as const } : {}) };
    return { pickTo, pickCount: cnt.count === 'all' ? 99 : cnt.count, mustPick: !cnt.upTo, filter, maxTotal };
  });
  if (!pick) return null;
  let restTo: 'deckBottom' | 'graveyard' | 'shuffle' = 'deckBottom';
  let used = 2;
  if (sentences[i + 2]) {
    const c3 = new Cur(sentences[i + 2]);
    const rest = c3.try(() => {
      if (!c3.lit('残り', 'を')) return null;
      c3.lit('好きな', '順序', 'で');
      if (c3.lit('自分', 'の')) void 0;
      if (c3.lit('山札', 'の', '下', 'に') || c3.lit('山札', 'の', '一番下', 'に')) return c3.verb('置く', ['plain']) && c3.done ? 'deckBottom' : null;
      if (c3.lit('墓地', 'に')) return c3.verb('置く', ['plain']) && c3.done ? 'graveyard' : null;
      return null;
    });
    if (rest) {
      restTo = rest;
      used = 3;
    }
  }
  return {
    effect: {
      type: 'lookAtTop',
      count,
      pickCount: pick.pickCount,
      pickFilter: pick.filter,
      pickTo: pick.pickTo,
      restTo,
      ...(pick.mustPick ? { mustPick: true } : {}),
      ...(pick.maxTotal !== undefined ? { pickMaxTotalCost: pick.maxTotal } : {}),
    },
    used,
  };
}

/** 効果の文を順に読み、まとまり（任意かどうか）に分ける */
function parseEffectSentences(sentences: Token[][], ctx: Ctx): Group[] | null {
  const groups: Group[] = [];
  for (let i = 0; i < sentences.length; i++) {
    let ts = sentences[i];
    const look = parseLookSentences(sentences, i);
    if (look) {
      groups.push({ optional: false, effects: [look.effect] });
      i += look.used - 1;
      continue;
    }
    // 文頭のつなぎ：「その後、」「そうしたら、」「自分が勝ったら、」
    const c = new Cur(ts);
    let link: 'then' | 'ifDone' | 'win' | null = null;
    if (c.kind('conj', (t) => t.conj === 'then')) link = 'then';
    else if (c.kind('conj', (t) => t.conj === 'ifDone')) link = 'ifDone';
    else if (c.try(() => c.lit('自分', 'が') && c.verb('勝つ', ['tara']))) link = 'win';
    if (link) {
      c.lit('、');
      ts = c.rest();
    }
    const vp = parseEffectSentence(ts, ctx);
    if (!vp) return null;
    const last = groups[groups.length - 1];
    // 「自分が勝ったら、〜」：直前のガチンコ・ジャッジの then
    if (link === 'win') {
      const g = last?.effects[last.effects.length - 1];
      if (!g || g.type !== 'gachinko' || vp.optional) return null;
      g.then.push(...vp.effects);
      continue;
    }
    // 「そうしたら、〜」・「それ」「その2体」を指す文：直前の任意のまとまりに続ける
    const refersChosen = vp.effects.some((e) => (e.type === 'fight' && e.fighter === 'chosen') || ('target' in e && typeof e.target === 'object' && e.target.ref === 'chosen'));
    if (last && (link === 'ifDone' || (refersChosen && last.optional && link !== 'then'))) {
      if (vp.optional) last.effects.push({ type: 'optional', effects: vp.effects });
      else last.effects.push(...vp.effects);
      continue;
    }
    groups.push({ optional: vp.optional, effects: vp.effects });
  }
  return groups.length ? groups : null;
}

/** まとまりを1つの効果の並びにする（任意のまとまりは optional で包む） */
function flatten(groups: Group[]): { effects: EffectDef[]; optional: boolean } {
  if (groups.length === 1) return groups[0];
  return { effects: groups.flatMap((g) => (g.optional ? [{ type: 'optional', effects: g.effects } as EffectDef] : g.effects)), optional: false };
}

// ───────────────────────── 誘発 ─────────────────────────

interface Trig {
  when: TriggerEvent;
  who?: 'self' | 'opponent' | 'any';
  filter?: CardFilter;
  condition?: Condition;
  /** 誘発の原因のカードを「それ」で指せる */
  event?: boolean;
  /** 手札にある間の誘発にもなる時の種類 */
  hand?: HandTrigger['when'];
}

/** 文頭の誘発（「〜時、」「〜に、」まで）を読む */
function parseTrigger(c: Cur): Trig | null {
  return c.try((): Trig | null => {
    // 「このクリーチャーの攻撃の終わりに」
    if (c.lit('この', 'クリーチャー', 'の') && c.verb('攻撃する', ['stem']) && c.lit('の', '終わり', 'に', '、')) return { when: 'onAttackEnd' };
    return null;
  }) ??
    c.try((): Trig | null => {
      // 「各ブレイクの前に」（このクリーチャーの）
      c.lit('この', 'クリーチャー', 'の');
      if (c.kind('quant', (t) => t.quant === 'each') && c.verb('ブレイクする', ['stem']) && c.lit('の', '前', 'に', '、')) return { when: 'onBeforeBreak' };
      return null;
    }) ??
    c.try((): Trig | null => {
      // 「自分のターンの終わりに」「相手のターンの終わりに」
      const p = c.kind('player', (t) => t.player === 'self' || t.player === 'opponent');
      if (!p || !c.lit('の', 'ターン', 'の')) return null;
      const tm = c.kind('time', (t) => t.time === 'start' || t.time === 'end');
      if (!tm || !c.lit('に', '、')) return null;
      const when: TriggerEvent = tm.time === 'start' ? 'onTurnStart' : 'onTurnEnd';
      const who = PLAYER[p.text];
      return { when, ...(who === 'opponent' ? { who } : {}), ...(when === 'onTurnEnd' ? { hand: who === 'opponent' ? 'opponentTurnEnd' : 'ownTurnEnd' } : {}) } as Trig;
    }) ??
    c.try((): Trig | null => {
      // 「このクリーチャーが（バトルゾーンに）出た時」「このクリーチャーをバトルゾーンに出した時」「このクリーチャーが「革命チェンジ」によって出た時」「このクリーチャーが攻撃する時」
      if (!c.lit('この', 'クリーチャー')) return null;
      if (c.lit('を')) {
        c.lit('バトルゾーン', 'に');
        return c.verb('出す', ['ta']) && c.lit('時', '、') ? { when: 'onSummon' } : null;
      }
      if (!c.lit('が')) return null;
      if (c.verb('攻撃する', ['plain']) && c.lit('時', '、')) return { when: 'onAttack' };
      let condition: Condition | undefined;
      const q = c.kind('quote');
      if (q) {
        if (textOf(q.children) !== '革命チェンジ' || !c.lit('によって')) return null;
        condition = { type: 'enteredByRevolution' };
      }
      c.lit('バトルゾーン', 'に');
      if (!c.verb('出る', ['ta']) || !c.lit('時', '、')) return null;
      return { when: 'onSummon', ...(condition ? { condition } : {}) };
    }) ??
    c.try((): Trig | null => {
      // 「相手のクリーチャーが出た時」「クリーチャーが攻撃する時」
      const p = c.try(() => {
        const t = c.kind('player', (x) => x.player === 'self' || x.player === 'opponent');
        return t && c.lit('の') ? t : null;
      });
      if (!c.lit('クリーチャー', 'が')) return null;
      const who = p ? PLAYER[p.text] : 'any';
      if (c.verb('攻撃する', ['plain']) && c.lit('時', '、')) return { when: 'onOtherAttack', who, event: true, ...(who === 'any' ? { hand: 'anyAttack' } : {}) } as Trig;
      c.lit('バトルゾーン', 'に');
      if (c.verb('出る', ['ta']) && c.lit('時', '、')) return { when: 'onOtherSummon', who, event: true };
      return null;
    });
}

// ───────────────────────── 条件 ─────────────────────────

const noShieldPlayer: Condition = {
  type: 'or',
  conditions: [
    { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 },
    { type: 'compare', left: { who: 'opponent', zone: 'shield' }, op: '<=', right: 0 },
  ],
};

interface Cond {
  condition?: Condition;
  /** 「それが〜クリーチャーなら」：誘発の原因のカードの条件 */
  eventFilter?: CardFilter;
  /** 「そのターン中に他の「X」をまだ使っていなければ」：使った記録を付ける */
  markUsed?: string;
}

/** 条件の節を1つ読む。cont: 「〜いて、」のように次の条件に続く */
function parseOneCondition(c: Cur): { cond: Cond; cont: boolean } | null {
  return c.try(() => {
    // 「シールドが１つもないプレイヤーがいれば（いて）」
    if (c.lit('シールド', 'が') && c.kind('count', (t) => t.n === 1) && c.lit('も', 'ない', 'プレイヤー', 'が')) {
      const v = c.verb('いる', ['ba', 'te']);
      if (!v || !c.lit('、')) return null;
      return { cond: { condition: noShieldPlayer }, cont: v.form === 'te' };
    }
    return null;
  }) ??
    c.try(() => {
      // 「自分のシールドが１つもなければ」
      const p = c.kind('player', (t) => t.player === 'self' || t.player === 'opponent');
      if (!p || !c.lit('の', 'シールド', 'が') || !c.kind('count', (t) => t.n === 1) || !c.lit('も', 'なければ', '、')) return null;
      return { cond: { condition: { type: 'compare', left: { who: PLAYER[p.text], zone: 'shield' }, op: '<=', right: 0 } as Condition }, cont: false };
    }) ??
    c.try(() => {
      // 「自分のマナゾーンに闇と火文明があれば」
      const p = c.kind('player', (t) => t.player === 'self' || t.player === 'opponent');
      if (!p || !c.lit('の', 'マナゾーン', 'に')) return null;
      const civs: Civilization[] = [];
      for (;;) {
        const cv = c.kind('civ');
        if (!cv || cv.civ === 'multi' || cv.civ === 'mono' || cv.civ === 'colorless') return null;
        civs.push(cv.civ);
        if (!c.lit('と')) break;
      }
      c.lit('文明');
      c.lit('の', 'カード');
      if (!c.lit('が') || !c.verb('ある', ['ba']) || !c.lit('、')) return null;
      const who = PLAYER[p.text];
      const conds: Condition[] = civs.map((civilization) => ({ type: 'compare', left: { who, zone: 'mana', filter: { civilization } }, op: '>=', right: 1 }));
      return { cond: { condition: conds.length === 1 ? conds[0] : { type: 'and', conditions: conds } }, cont: false };
    }) ??
    c.try(() => {
      // 「バトルゾーンに自分の《X》がなければ」
      if (!c.lit('バトルゾーン', 'に')) return null;
      const p = c.kind('player', (t) => t.player === 'self' || t.player === 'opponent');
      if (!p || !c.lit('の')) return null;
      const name = c.kind('cardName');
      if (!name || !c.lit('が', 'なければ', '、')) return null;
      return {
        cond: { condition: { type: 'not', condition: { type: 'compare', left: { who: PLAYER[p.text], zone: 'battle', filter: { nameIncludes: name.name } }, op: '>=', right: 1 } } as Condition },
        cont: false,
      };
    }) ??
    c.try(() => {
      // 「相手がそのターン中、マナゾーンのカードをタップせずに、クリーチャーを出すか呪文を唱えていて」
      const p = c.kind('player', (t) => t.player === 'self' || t.player === 'opponent');
      if (!p || !c.lit('が', 'その', 'ターン', '中')) return null;
      c.lit('に');
      c.lit('、');
      if (!c.lit('マナゾーン', 'の', 'カード', 'を') || !c.verb('タップする', ['nu']) || !c.lit('に')) return null;
      c.lit('、');
      if (!c.lit('クリーチャー', 'を') || !c.verb('出す', ['plain']) || !c.lit('か', '呪文', 'を') || !c.verb('唱える', ['te'])) return null;
      const v = c.verb('いる', ['te', 'ba']);
      if (!v || !c.lit('、')) return null;
      return { cond: { condition: { type: 'playedFreeThisTurn', who: PLAYER[p.text] } as Condition }, cont: v.form === 'te' };
    }) ??
    c.try(() => {
      // 「そのターン中に他の「X」をまだ使っていなければ」
      if (!c.lit('その', 'ターン', '中')) return null;
      c.lit('に');
      if (!c.lit('他', 'の')) return null;
      const q = c.kind('quote');
      if (!q || !c.lit('を') || !c.kind('adv', (t) => t.adv === 'yet') || !c.verb('使う', ['te']) || !c.verb('いる', ['nakereba']) || !c.lit('、')) return null;
      const key = textOf(q.children);
      return { cond: { condition: { type: 'not', condition: { type: 'usedThisTurn', key } } as Condition, markUsed: key }, cont: false };
    }) ??
    c.try(() => {
      // 「それが〜クリーチャーなら」：誘発の原因のカードの条件
      if (!c.lit('それ', 'が')) return null;
      const np = parseNP(c);
      if (!np || np.ref || !c.kind('aux', (t) => t.aux === 'if') || !c.lit('、')) return null;
      const filter: CardFilter = { ...np.filter, ...(np.noun === 'creature' ? { cardType: 'creature' as const } : {}) };
      return { cond: { eventFilter: filter }, cont: false };
    });
}

/** 条件の節を続けて読む（「〜いて、〜あれば、」） */
function parseConditions(c: Cur): Cond | null {
  const conds: Condition[] = [];
  const out: Cond = {};
  for (let g = 0; g < 4; g++) {
    const one = parseOneCondition(c);
    if (!one) return g === 0 ? null : null;
    if (one.cond.condition) conds.push(one.cond.condition);
    if (one.cond.eventFilter) out.eventFilter = one.cond.eventFilter;
    if (one.cond.markUsed) out.markUsed = one.cond.markUsed;
    if (!one.cont) break;
  }
  if (conds.length) out.condition = conds.length === 1 ? conds[0] : { type: 'and', conditions: conds };
  return out;
}

const andCond = (...cs: (Condition | undefined)[]): Condition | undefined => {
  const xs = cs.filter((x): x is Condition => !!x);
  return xs.length === 0 ? undefined : xs.length === 1 ? xs[0] : { type: 'and', conditions: xs };
};

// ───────────────────────── 常在効果・置換効果 ─────────────────────────

/** 攻撃・ブロックの制限：「攻撃できない」「攻撃もブロックもできない」「攻撃することができない」「自分を攻撃できない」 */
function parseRestriction(c: Cur): Keywords | null {
  return c.try(() => {
    const me = c.lit('自分', 'を');
    if (c.verb('攻撃する', ['cannot'])) return me ? { cannotAttackPlayers: true } : { cannotAttack: true };
    if (c.try(() => c.verb('攻撃する', ['plain']) && c.lit('こと', 'が') && c.verb('できる', ['nai']))) return me ? { cannotAttackPlayers: true } : { cannotAttack: true };
    if (!me && c.try(() => c.verb('攻撃する', ['stem']) && c.lit('も') && c.verb('ブロックする', ['stem']) && c.lit('も') && c.verb('できる', ['nai']))) return { cannotAttack: true, cannotBlock: true };
    if (!me && c.verb('ブロックする', ['cannot'])) return { cannotBlock: true };
    return null;
  });
}

/** 期間：「このターン、」「次の自分のターンの終わりまで、」「次の自分のターンのはじめまで、」 */
function parseDuration(c: Cur): 'turn' | 'untilNextTurn' | 'untilNextTurnEnd' | null {
  if (c.lit('この', 'ターン', '、')) return 'turn';
  return c.try(() => {
    if (!c.kind('time', (t) => t.time === 'next') || !c.lit('の', '自分', 'の', 'ターン', 'の')) return null;
    const tm = c.kind('time', (t) => t.time === 'start' || t.time === 'end');
    if (!tm || !c.lit('まで', '、')) return null;
    return tm.time === 'start' ? 'untilNextTurn' : 'untilNextTurnEnd';
  });
}

/** 「〜クリーチャーは（出たターン、）攻撃できない」：主語の名詞句と制限 */
function parseRestrictionSentence(c: Cur): { applies: StaticAbility & { type: 'grantKeyword' } } | null {
  return c.try(() => {
    const np = parseNP(c);
    if (!np || np.ref || np.noun !== 'creature' || !c.lit('は')) return null;
    const filter: CardFilter = { ...np.filter };
    if (c.try(() => c.verb('出る', ['ta']) && c.lit('ターン', '、'))) filter.enteredThisTurn = true;
    const kw = parseRestriction(c);
    if (!kw || !c.done) return null;
    return { applies: { type: 'grantKeyword', keywords: kw, appliesTo: { owner: np.owner ?? 'any', ...(Object.keys(filter).length ? { filter } : {}) } } };
  });
}

/** 「〜クリーチャーがバトルゾーンに出る時、（バトルゾーンに出る）かわりに持ち主の墓地に置かれる」「相手はかわりにそのクリーチャーをマナゾーンに置く」 */
function parseEnterInstead(c: Cur): StaticAbility | null {
  return c.try(() => {
    const np = parseNP(c);
    if (!np || np.ref || np.noun !== 'creature' || !c.lit('が', 'バトルゾーン', 'に') || !c.verb('出る', ['plain']) || !c.lit('時', '、')) return null;
    let to: 'graveyard' | 'mana' | null = null;
    const passive = c.try(() => {
      c.try(() => c.lit('バトルゾーン', 'に') && c.verb('出る', ['plain']));
      if (!c.kind('conj', (t) => t.conj === 'instead')) return null;
      c.lit('、');
      c.lit('持ち主', 'の');
      const z = c.kind('zone', (t) => t.zone === 'graveyard' || t.zone === 'mana');
      if (!z || !c.lit('に') || !c.verb('置く', ['passive', 'plain'])) return null;
      return z.zone as 'graveyard' | 'mana';
    });
    if (passive) to = passive;
    else {
      const active = c.try(() => {
        c.try(() => c.kind('player') && c.lit('は'));
        if (!c.kind('conj', (t) => t.conj === 'instead')) return null;
        c.lit('、');
        if (!c.lit('その', 'クリーチャー', 'を')) return null;
        c.lit('持ち主', 'の');
        const z = c.kind('zone', (t) => t.zone === 'graveyard' || t.zone === 'mana');
        if (!z || !c.lit('に') || !c.verb('置く', ['plain'])) return null;
        return z.zone as 'graveyard' | 'mana';
      });
      if (active) to = active;
    }
    if (!to || !c.done) return null;
    const filter: CardFilter = { ...np.filter, cardType: 'creature' };
    const who = np.owner === 'self' ? 'self' : np.owner === 'opponent' ? 'opponent' : 'both';
    return { type: 'enterInstead', who, filter, to } as StaticAbility;
  });
}

/** 置換効果の「かわりに」の後：決まった形だけ */
function parseInsteadBody(c: Cur): Pick<ReplacementAbility, 'instead' | 'count' | 'shieldAlt' | 'optional'> | null {
  return (
    c.try(() => {
      // 「いずれかのシールドゾーンにある表向きのカードを1枚選び、持ち主の墓地に置いてもよい」
      if (!c.lit('いずれか', 'の', 'シールドゾーン', 'に', 'ある', '表向き', 'の', 'カード', 'を') || !c.kind('count', (t) => t.n === 1)) return null;
      if (!c.verb('選ぶ', ['renyo']) || !c.lit('、', '持ち主', 'の', '墓地', 'に') || !c.verb('置く', ['te', 'plain'])) return null;
      const optional = endMay(c);
      return c.done ? { instead: 'faceUpShieldToGrave' as const, ...(optional ? { optional } : {}) } : null;
    }) ??
    c.try(() => {
      // 「自分の表向きのカードを3枚破壊するか、自分のシールドを1つ墓地に置いてもよい」
      if (!c.lit('自分', 'の', '表向き', 'の', 'カード', 'を')) return null;
      const n = c.kind('count', (t) => t.unit === '枚');
      if (!n || !c.verb('破壊する', ['plain'])) return null;
      let shieldAlt: number | undefined;
      if (c.lit('か')) {
        c.lit('、');
        if (!c.lit('自分', 'の', 'シールド', 'を')) return null;
        const m = c.kind('count');
        if (!m || !c.lit('墓地', 'に') || !c.verb('置く', ['te', 'plain'])) return null;
        shieldAlt = m.n;
      } else return null;
      const optional = endMay(c);
      return c.done ? { instead: 'avertCost' as const, count: n.n, shieldAlt, ...(optional ? { optional } : {}) } : null;
    })
  );
}

/** 置換効果の文：「自分のクリーチャーがバトルゾーンを離れる時、かわりに〜」「自分がゲームに負ける時またはこのクリーチャーが離れる時、かわりに〜」 */
function parseReplacementSentence(c: Cur, out: GrammarResult): boolean {
  return !!c.try(() => {
    let loss = false;
    if (c.lit('自分', 'が', 'ゲーム', 'に') && c.verb('負ける', ['plain']) && c.lit('時')) {
      loss = true;
      if (!c.lit('または')) return null;
      c.lit('、');
    }
    let subject: ReplacementAbility['subject'];
    if (c.lit('この', 'クリーチャー', 'が')) subject = 'self';
    else if (c.lit('自分', 'の', 'クリーチャー', 'が')) subject = 'anyOwn';
    else if (c.lit('自分', 'の', '他', 'の', 'クリーチャー', 'が')) subject = 'otherOwn';
    else return null;
    c.lit('バトルゾーン', 'を');
    if (!c.verb('離れる', ['plain']) || !c.lit('時', '、') || !c.kind('conj', (t) => t.conj === 'instead')) return null;
    c.lit('、');
    const body = parseInsteadBody(c);
    if (!body) return null;
    out.replacements.push({ event: 'leaveBattle', subject, ...body });
    if (loss) {
      if (body.instead !== 'avertCost') return null;
      out.keywords.avertLoss = body.count;
      if (body.shieldAlt) out.keywords.avertLossShield = body.shieldAlt;
    }
    return true;
  });
}

/** 「〜1体につき」：数える名詞句と単位 */
function parsePer(c: Cur): { per: Quantity; unit: number } | null {
  return c.try(() => {
    const np = parseNP(c);
    const n = c.kind('count', (t) => !t.ordinal && ['体', '枚', 'つ'].includes(t.unit));
    if (!np || np.ref || !n || !c.kind('aux', (t) => t.aux === 'per')) return null;
    const zone = (np.zone ?? (np.noun === 'shield' ? 'shield' : 'battle')) as Quantity['zone'];
    const filter: CardFilter = { ...np.filter, ...(np.noun === 'spell' ? { cardType: 'spell' as const } : np.noun === 'creature' && zone !== 'battle' ? { cardType: 'creature' as const } : {}) };
    return { per: { who: np.owner ?? 'any', zone, ...(Object.keys(filter).length ? { filter } : {}) }, unit: n.n };
  });
}

/**
 * 「相手のクリーチャー1体につき、このクリーチャーの召喚コストを1少なくする。ただし、コストは0以下にならない。」
 * 「このクリーチャーの召喚コストを、クリーチャー1体につき1少なくする」
 */
function parseSelfCost(sentences: Token[][]): GrammarResult['selfCost'] | null {
  if (sentences.length > 2) return null;
  const c = new Cur(sentences[0]);
  const r = c.try(() => {
    let per = parsePer(c);
    if (per) c.lit('、');
    if (!c.lit('この') || !c.kind('noun', (t) => t.noun === 'creature' || t.noun === 'card') || !c.lit('の')) return null;
    c.verb(['召喚する', '実行する'], ['stem']);
    if (!c.lit('コスト', 'を')) return null;
    c.lit('、');
    if (!per) per = parsePer(c);
    if (!per) return null;
    const n = c.kind('number');
    if (!n || !c.kind('compare', (t) => t.op === 'less' && t.form === 'adv') || !c.verb('する', ['plain']) || !c.done) return null;
    return { amount: n.n, per };
  });
  if (!r) return null;
  let min = 1;
  if (sentences[1]) {
    const d = new Cur(sentences[1]);
    const m = d.try(() => {
      if (!d.kind('conj', (t) => t.conj === 'however')) return null;
      d.lit('、');
      if (!d.lit('コスト', 'は')) return null;
      const n = d.kind('number');
      const op = d.kind('compare', (t) => t.op === '<=' || t.op === 'less');
      if (!n || !op) return null;
      d.lit('に');
      d.lit('は');
      if (!d.verb('なる', ['nai']) || !d.done) return null;
      // 「0以下にならない」なら1まで、「2より少なくならない」なら2まで
      return op.op === '<=' ? n.n + 1 : n.n;
    });
    if (m === null) return null;
    min = m;
  }
  return { amount: r.amount, per: r.per.per, unit: r.per.unit, min };
}

// ───────────────────────── 1行を読む ─────────────────────────

/** 「この呪文を（自分の手札から）コストを支払わずに唱えてもよい」「このクリーチャーをコストを支払わずに召喚してもよい」 */
function parsePlaySelf(c: Cur): boolean {
  return !!c.try(() => {
    if (!c.lit('この') || !c.kind('noun', (t) => t.noun === 'spell' || t.noun === 'creature') || !c.lit('を')) return null;
    c.lit('自分', 'の', '手札', 'から');
    if (!c.lit('コスト', 'を') || !c.verb('支払う', ['nu']) || !c.lit('に') || !c.verb(['唱える', '召喚する', '出す', '使う'], ['te'])) return null;
    return endMay(c) && c.done;
  });
}

/** キーワードの名前と同じ意味のアイコン（{2W} W・ブレイカーなど。textParser の stripIcons と同じもの） */
const PLAIN_ICON = /^(?:\d?[WTQ]|PP|GS|ST|SST|SG|STP)$/;

/**
 * 能力1行を読む。kind はカードの種類（呪文の効果は「唱えた時」、クリーチャーは誘発・常在・置換）。
 * keywordLine: キーワード能力の1行を読む関数（textParser の applyKeywordLine）
 */
export function parseByGrammar(line: string, kind: Kind, keywordLine: (text: string, kw: Keywords) => boolean): GrammarResult | null {
  const out: GrammarResult = { keywords: {}, abilities: [], statics: [], replacements: [], handTriggers: [] };
  const all = tokenize(line);
  // 意味の分からないアイコン（{l} など。条件つきの能力を表すことがある）や、行の頭のラベルが残っている行は読まない
  if (all.some((t) => (t.kind === 'icon' && !PLAIN_ICON.test(t.icon)) || t.kind === 'label')) return null;
  let ts = all.filter((t) => t.kind !== 'icon');
  // 最後の補足説明（カッコ）は、キーワードの説明でなければ読まない
  const tail = ts[ts.length - 1];
  const reminder = tail?.kind === 'reminder' ? tail : null;
  if (reminder) ts = ts.slice(0, -1);
  // 区切りなしで並んだキーワード（「スピードアタッカーパワーアタッカー+5000」）を先に読む
  let label: string | null = null;
  for (;;) {
    const t = ts[0];
    if (!t || t.kind !== 'keyword') break;
    // 「ファイナル革命：」：能力語の見出し
    if (ts[1]?.kind === 'punct' && ts[1].p === ':') {
      label = t.keyword;
      ts = ts.slice(2);
      break;
    }
    const num = ts[1]?.kind === 'number' ? ts[1] : null;
    const kw: Keywords = {};
    if (num && keywordLine(t.text + num.text, kw)) {
      Object.assign(out.keywords, kw);
      ts = ts.slice(2);
      continue;
    }
    if (keywordLine(t.text, kw)) {
      Object.assign(out.keywords, kw);
      ts = ts.slice(1);
      continue;
    }
    // 知らないキーワードに補足説明が付いている：補足説明を能力として読む（「ドラゴン・W・ブレイカー（〜）」）
    if (ts.length === 1 && reminder) {
      const inner = parseReminderAsAbility(reminder.children, kind, keywordLine);
      if (!inner) return null;
      merge(out, inner);
      return out;
    }
    return null;
  }
  if (!ts.length) return Object.keys(out.keywords).length ? out : null;
  // CRY-S-MAX進化などの「S-MAX進化」：進化元を必要としない（補足説明の内容）
  if (label && /S-MAX進化$/.test(label)) out.keywords.sMax = true;
  const body = readAbility(ts, kind, label);
  if (!body) return null;
  merge(out, body);
  return out;
}

function merge(out: GrammarResult, r: GrammarResult): void {
  if (r.selfCost) out.selfCost = r.selfCost;
  Object.assign(out.keywords, r.keywords);
  out.abilities.push(...r.abilities);
  out.statics.push(...r.statics);
  out.replacements.push(...r.replacements);
  out.handTriggers.push(...r.handTriggers);
}

/** 補足説明の文を、キーワード能力か能力として1文ずつ読む */
function parseReminderAsAbility(children: Token[], kind: Kind, keywordLine: (text: string, kw: Keywords) => boolean): GrammarResult | null {
  const out: GrammarResult = { keywords: {}, abilities: [], statics: [], replacements: [], handTriggers: [] };
  for (const s of splitBy(children, '。')) {
    const kw: Keywords = {};
    if (keywordLine(textOf(s), kw)) {
      Object.assign(out.keywords, kw);
      continue;
    }
    const r = readAbility(s, kind, null);
    if (!r) return null;
    merge(out, r);
  }
  return out;
}

/** 能力の本文（キーワード・見出しを除いた語の並び）を読む */
function readAbility(ts: Token[], kind: Kind, label: string | null): GrammarResult | null {
  const out: GrammarResult = { keywords: {}, abilities: [], statics: [], replacements: [], handTriggers: [] };
  const sentences = splitBy(ts, '。');
  if (!sentences.length) return null;
  const first = new Cur(sentences[0]);
  // 置換効果（クリーチャー）
  if (kind === 'creature' && sentences.length === 1 && parseReplacementSentence(new Cur(sentences[0]), out)) return out;
  // このクリーチャーの召喚コストを「〜1体につき」少なくする
  if (kind === 'creature') {
    const sc = parseSelfCost(sentences);
    if (sc) {
      out.selfCost = sc;
      return out;
    }
  }
  // 常在効果（クリーチャー）：「〜は攻撃できない」「〜が出る時、かわりに〜」「自分のターン中、クリーチャーを1体、自分のマナゾーンから召喚してもよい」
  if (kind === 'creature' && sentences.length === 1) {
    const r = parseRestrictionSentence(new Cur(sentences[0]));
    if (r) {
      out.statics.push(r.applies);
      return out;
    }
    const ei = parseEnterInstead(new Cur(sentences[0]));
    if (ei) {
      out.statics.push(ei);
      return out;
    }
    const sz = new Cur(sentences[0]);
    const summonZone = sz.try(() => {
      if (!sz.lit('自分', 'の', 'ターン', '中', '、', 'クリーチャー', 'を') || !sz.kind('count', (t) => t.n === 1)) return null;
      sz.lit('、');
      if (!sz.lit('自分', 'の')) return null;
      const z = sz.kind('zone', (t) => t.zone === 'mana' || t.zone === 'graveyard');
      if (!z || !sz.lit('から') || !sz.verb('召喚する', ['te']) || !endMay(sz) || !sz.done) return null;
      return z.zone as 'mana' | 'graveyard';
    });
    if (summonZone) {
      out.statics.push({ type: 'summonFromZone', zone: summonZone, filter: { cardType: 'creature' }, oncePerTurn: true, duringTurn: 'self' });
      return out;
    }
  }
  // 誘発
  const trig = parseTrigger(first);
  if (!trig && kind === 'creature') return null;
  // 条件
  const cond = parseConditions(first);
  const rest = [first.rest(), ...sentences.slice(1)];
  // 手札にある間の誘発：「この呪文を（自分の手札から）コストを支払わずに唱えてもよい」
  if (trig?.hand && rest.length === 1 && parsePlaySelf(new Cur(rest[0]))) {
    out.handTriggers.push({ when: trig.hand, ...(cond?.condition ? { condition: cond.condition } : {}) });
    return out;
  }
  // 期間つきの制限（呪文・誘発の効果）：「このターン、クリーチャーは攻撃することができない」「次の自分のターンの終わりまで、相手のクリーチャーは攻撃もブロックもできない」
  const ctx: Ctx = { kind, event: !!trig?.event, chosen: false };
  let effects: EffectDef[] | null = null;
  let optional = false;
  if (rest.length === 1) {
    const dc = new Cur(rest[0]);
    const timed = dc.try(() => {
      const d = parseDuration(dc);
      if (!d) return null;
      const r = parseRestrictionSentence(new Cur(dc.rest()));
      if (!r) return null;
      return [{ type: 'turnStatic', static: r.applies, ...(d === 'untilNextTurn' ? { untilNextTurn: true } : d === 'untilNextTurnEnd' ? { untilNextTurnEnd: true } : {}) } as EffectDef];
    });
    if (timed) effects = timed;
  }
  if (!effects) {
    const groups = parseEffectSentences(rest, ctx);
    if (!groups) return null;
    const flat = flatten(groups);
    effects = flat.effects;
    optional = flat.optional;
  }
  if (cond?.markUsed) effects = [{ type: 'markUsed', key: cond.markUsed }, ...effects];
  const when: TriggerEvent = trig?.when ?? 'onCast';
  const filter = trig?.filter || cond?.eventFilter ? { ...(trig?.filter ?? {}), ...(cond?.eventFilter ?? {}) } : undefined;
  const condition = andCond(trig?.condition, cond?.condition);
  out.abilities.push({
    when,
    effects,
    ...(optional ? { optional: true } : {}),
    ...(trig?.who ? { who: trig.who } : {}),
    ...(filter ? { filter } : {}),
    ...(condition ? { condition } : {}),
  });
  void label;
  return out;
}
