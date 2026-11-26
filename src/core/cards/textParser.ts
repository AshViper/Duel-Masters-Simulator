// 公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。
// よく使われる定型文だけを読み取り、読み取れない文が1つでもある能力は丸ごと「手動処理」にする
// （一部だけ自動処理すると、カードの処理が間違ったまま進んでしまうため）。
// 誘発のタイミングだけ分かる能力は、その時にログで手動処理を促す（manual 効果）。
import type {
  Applies,
  CardFilter,
  Civilization,
  Condition,
  Quantity,
  ReplacementAbility,
  EffectDef,
  Keywords,
  StaticAbility,
  TargetSpec,
  TriggeredAbility,
  TriggerEvent,
} from './types';

export interface ParsedAbilities {
  keywords: Keywords;
  abilities: TriggeredAbility[];
  statics: StaticAbility[];
  /** 進化元の条件 */
  evolvesFrom?: { race?: string; civilization?: Civilization };
  /** NEO進化の進化元 */
  neoEvolution?: CardFilter;
  /** このカード自身のコスト軽減 */
  selfCost?: { amount: number; per: Quantity; unit: number; min: number };
  /** ハイパー化のコスト */
  hyper?: { count: number; excludeSelf: boolean; filter?: CardFilter };
  /** 侵略・革命チェンジ */
  attackSwap?: { kind: 'invasion' | 'revolution'; filter: CardFilter };
  /** 置換効果（「破壊される時、かわりに〜」） */
  replacements: ReplacementAbility[];
  /** 自動処理できなかった能力の行 */
  manualLines: string[];
  /** 自動処理できた能力の行（キーワード以外） */
  parsedLines: string[];
}

const CIV: Record<string, Civilization> = { 光: 'light', 水: 'water', 闇: 'darkness', 火: 'fire', 自然: 'nature' };

/** 全角→半角、空白除去、カッコ内の補足説明（リマインダー）を除く */
export function normalizeText(s: string): string {
  let t = s.normalize('NFKC').replace(/[\s　]+/g, '').replace(/[−‐－–]/g, '-').replace(/️/g, '');
  // 入れ子のカッコにも対応して内側から消す
  for (let i = 0; i < 3; i++) t = t.replace(/\([^()]*\)/g, '');
  return t
    .replace(/することができない/g, 'できない')
    .replace(/_(?=\d)/g, '-')
    .replace(/そのターン、そのクリーチャー/g, 'このターン、そのクリーチャー')
    .replace(/^このクリーチャーをバトルゾーンに出した時/, 'このクリーチャーが出た時')
    .replace(/ひとつ/g, '1つ')
    .replace(/ふたつ/g, '2つ')
    .replace(/みっつ/g, '3つ')
    .replace(/自分自身の/g, '自身の');
}

/** 能力の頭に付くアイコン（{2W} W・ブレイカーなど、キーワードの名前と同じ意味のもの） */
const PLAIN_ICON = /\{(?:\d?[WTQ]|PP|GS|ST|SST)\}/g;
function stripIcons(t: string): string {
  return t.replace(PLAIN_ICON, '');
}

/** normalizeText と同じだが、語の区切りの空白を1つ残す（キーワードが並んだ行の判定用） */
function normalizeKeepSpace(s: string): string {
  let t = s.normalize('NFKC').replace(/[−‐－–]/g, '-').replace(/️/g, '');
  for (let i = 0; i < 3; i++) t = t.replace(/\([^()]*\)/g, '');
  return stripIcons(t).replace(/[\s　]+/g, ' ').trim();
}

/** 能力1行がキーワード能力なら Keywords に反映して true を返す */
export function applyKeywordLine(line: string, kw: Keywords): boolean {
  const t = stripIcons(normalizeText(line)).replace(/。$/, '').replace(/^このクリーチャーは、/, 'このクリーチャーは');
  if (!t) return false;
  // 「ブロッカー W・ブレイカー」のように1行に並んだキーワード
  const words = normalizeKeepSpace(line).split(' ').filter(Boolean);
  if (words.length > 1) {
    const tmp: Keywords = {};
    if (words.every((w) => applyKeywordLine(w, tmp))) return !!Object.assign(kw, tmp);
  }
  if (t === 'マッハファイター') return (kw.machFighter = true);
  if (t === 'パワード・ブレイカー') return (kw.poweredBreaker = true);
  if (t === 'チャージャー') return (kw.charger = true);
  if (t === 'EXライフ') return (kw.exLife = true);
  if (t === 'ガードマン') return (kw.guardman = true);
  if (t === 'スーパーガードマン') return (kw.superGuardman = true);
  if (/^マナゾーンに置く時、このカードはタップして置く$/.test(t)) return (kw.manaTapped = true);
  if (/^自分の山札の最後の1枚を引く時、ゲームに負けるかわりに勝つ$/.test(t)) return (kw.winOnLastDraw = true);
  if (t === 'ジャストダイバー') return (kw.justDiver = true);
  const spellUt = t.match(/^コスト(\d+)以下の呪文(?:の効果)?によって、相手がクリーチャーを選ぶ時、このクリーチャーは選べない$/);
  if (spellUt) {
    kw.untargetableBySpellCost = Number(spellUt[1]);
    return true;
  }
  if (/^このカードがバトルゾーン以外のゾーンにあれば、自分はゲームに負ける$/.test(t)) return (kw.loseIfNotInBattle = true);
  if (t === 'G・ストライク') return (kw.gStrike = true);
  if (t === 'このクリーチャーはブロックできない') return (kw.cannotBlock = true);
  if (t === 'このクリーチャーは攻撃されない') return (kw.cannotBeAttacked = true);
  if (t === '相手はこのクリーチャーを選べない' || t === 'このクリーチャーは相手に選ばれない') return (kw.untargetable = true);
  if (t === 'このクリーチャーは攻撃もブロックもできない') return !!Object.assign(kw, { cannotAttack: true, cannotBlock: true });
  if (t === 'このクリーチャーがシールドをブレイクする時、相手はそのシールドを手札に加えるかわりに墓地に置く') return (kw.shieldBurn = true);
  if (t === 'ブロッカー') return (kw.blocker = true);
  if (t === 'S・トリガー' || t === 'S·トリガー' || t === 'スーパー・S・トリガー') return (kw.shieldTrigger = true);
  if (t === 'スピードアタッカー') return (kw.speedAttacker = true);
  if (t === 'スレイヤー') return (kw.slayer = true);
  if (t === 'W・ブレイカー') return !!(kw.breaker = 2);
  if (t === 'T・ブレイカー') return !!(kw.breaker = 3);
  if (t === 'Q・ブレイカー') return !!(kw.breaker = 4);
  if (t === 'ワールド・ブレイカー') return !!(kw.breaker = 99);
  const pa = t.match(/^パワーアタッカー\+(\d+)$/);
  if (pa) return !!(kw.powerAttacker = Number(pa[1]));
  if (t === 'このクリーチャーは相手プレイヤーを攻撃できない') return (kw.cannotAttackPlayers = true);
  if (t === 'このクリーチャーは攻撃できない') return (kw.cannotAttack = true);
  if (t === 'このクリーチャーはブロックされない') return (kw.unblockable = true);
  if (t === 'このクリーチャーはアンタップしているクリーチャーを攻撃できる') return (kw.attackUntapped = true);
  if (t === 'このクリーチャーはバトルに勝った時、破壊される' || t === 'このクリーチャーがバトルに勝った時、このクリーチャーを破壊する') return (kw.suicideOnWin = true);
  return false;
}

// ───────────────────────── 誘発タイミング ─────────────────────────

/** 「このクリーチャーが」に続く1つの出来事 */
const SELF_EVENTS: [RegExp, TriggerEvent][] = [
  [/^(?:召喚によって)?(?:バトルゾーンに)?出た時/, 'onSummon'],
  [/^攻撃する時/, 'onAttack'],
  [/^破壊された時/, 'onDestroyed'],
  [/^(?:バトルゾーンを)?離れた時/, 'onLeave'],
  [/^ブロックした時/, 'onBlock'],
  [/^禁断解放した時/, 'onUnleash'],
  [/^バトルに勝った時/, 'onBattleWin'],
];
/** 主語なしで書ける出来事（「〜時または自分のターンのはじめに」） */
const TURN_EVENTS: [RegExp, TriggerEvent][] = [
  [/^自分のターンのはじめに/, 'onTurnStart'],
  [/^自分のターンの終わりに/, 'onTurnEnd'],
];

/** 文頭の誘発条件を読む。「このクリーチャーが出た時または攻撃する時、」のような組み合わせにも対応 */
function parseTrigger(t: string): { when: TriggerEvent[]; who?: TriggeredAbility['who']; filter?: CardFilter; minDrawCount?: number; oncePerTurn?: boolean; rest: string } | null {
  // 「各ターンに1度、〜時、」
  const once = t.match(/^各ターンに(?:1|一)度、(.+)$/);
  if (once) {
    const r = parseTrigger(once[1]);
    return r && { ...r, oncePerTurn: true };
  }
  if (t.startsWith('このクリーチャーの攻撃の終わりに、')) return { when: ['onAttackEnd'], rest: t.slice('このクリーチャーの攻撃の終わりに、'.length) };
  // 「相手のクリーチャーが攻撃する時」「自分の他のドラゴンが破壊された時」
  const ev = t.match(/^(自分|相手)の(他の)?、?(.+?)が(攻撃する|破壊された|(?:バトルゾーンを)?離れた)時、(.+)$/);
  if (ev) {
    const filter: CardFilter = {};
    if (!parseSubject(ev[3], filter)) return null;
    const when: TriggerEvent = ev[4] === '攻撃する' ? 'onOtherAttack' : ev[4] === '破壊された' ? 'onOtherDestroyed' : 'onOtherLeave';
    return { when: [when], who: ev[1] === '自分' ? 'self' : 'opponent', ...(Object.keys(filter).length ? { filter } : {}), rest: ev[5] };
  }
  let m = t.match(/^(自分|相手)の(他の)?(.*?)クリーチャーが(?:バトルゾーンに)?出た時、(.+)$/);
  if (m) {
    const filter: CardFilter = {};
    if (!parseMods(m[3], filter)) return null;
    const self = m[1] === '自分';
    // 「自分のクリーチャーが出た時」はこのクリーチャー自身が出た時にも誘発する
    const when: TriggerEvent[] = self && !m[2] && matchesOwnFilter(filter) ? ['onSummon', 'onOtherSummon'] : ['onOtherSummon'];
    if (self && !m[2] && !matchesOwnFilter(filter)) return null;
    return { when, who: self ? 'self' : 'opponent', ...(Object.keys(filter).length ? { filter } : {}), rest: m[4] };
  }
  // 「相手がそのターン2枚目以降のカードを引いた時」「自分がカードを引いた時」
  m = t.match(/^(自分|相手)が(?:そのターン)?(?:(\d+)枚目以降の)?カードを引いた時、(.+)$/);
  if (m) return { when: ['onDraw'], who: m[1] === '自分' ? 'self' : 'opponent', ...(m[2] ? { minDrawCount: n(m[2]) } : {}), rest: m[3] };
  m = t.match(/^相手のターンの(はじめ|終わり)に、(.+)$/);
  if (m) return { when: [m[1] === 'はじめ' ? 'onTurnStart' : 'onTurnEnd'], who: 'opponent', rest: m[2] };
  let rest = t;
  const when: TriggerEvent[] = [];
  let subject = false;
  for (;;) {
    if (!subject && when.length === 0) {
      const sm = rest.match(/^このクリーチャーが?/);
      if (sm && SELF_EVENTS.some(([re]) => re.test(rest.slice(sm[0].length)))) {
        rest = rest.slice(sm[0].length);
        subject = true;
      }
    }
    const list = subject ? [...SELF_EVENTS, ...TURN_EVENTS] : TURN_EVENTS;
    const hit = list.find(([re]) => re.test(rest));
    if (!hit) return null;
    rest = rest.slice(rest.match(hit[0])![0].length);
    if (!when.includes(hit[1])) when.push(hit[1]);
    const sep = rest.match(/^、?または、?(?:このクリーチャーが)?/);
    if (sep) {
      rest = rest.slice(sep[0].length);
      continue;
    }
    if (!rest.startsWith('、')) return null;
    return { when, rest: rest.slice(1) };
  }
}

/** 「自分のクリーチャーが出た時」の条件に、このクリーチャー自身が合うかは分からないので、条件なしの時だけ自分も含める */
function matchesOwnFilter(filter: CardFilter): boolean {
  return Object.keys(filter).length === 0;
}

// ───────────────────────── 文の読み取り ─────────────────────────

/** 「〜てもよい」を普通の動詞に戻す */
function stripOptional(s: string): { text: string; optional: boolean } {
  const m = s.match(/^(.*?)(て|で)もよい$/);
  if (!m) return { text: s, optional: false };
  const body = m[1];
  const ends: [string, string][] = [
    ['引い', '引く'], ['置い', '置く'], ['戻し', '戻す'], ['出し', '出す'], ['加え', '加える'], ['捨て', '捨てる'],
    ['し', 'する'], ['見', '見る'], ['選ん', '選ぶ'], ['唱え', '唱える'],
  ];
  for (const [a, b] of ends) if (body.endsWith(a)) return { text: body.slice(0, -a.length) + b, optional: true };
  return { text: s, optional: false };
}

const n = (s: string) => Number(s);

/** 対象の修飾語（「パワー3000以下の」「タップしている」など）を CardFilter にする。読めなければ null */
function parseMods(mods: string, filter: CardFilter): boolean {
  let m = civList(mods).replace(/、/g, '');
  const rules: [RegExp, (x: RegExpMatchArray) => void][] = [
    [/^他の/, () => (filter.excludeSelf = true)],
    [/^パワー(\d+)以下の/, (x) => (filter.maxPower = n(x[1]))],
    [/^パワー(\d+)以上の/, (x) => (filter.minPower = n(x[1]))],
    [/^コスト(\d+)以下の/, (x) => (filter.maxCost = n(x[1]))],
    [/^コスト(\d+)以上の/, (x) => (filter.minCost = n(x[1]))],
    [/^タップしている/, () => (filter.tapped = true)],
    [/^アンタップしている/, () => (filter.untapped = true)],
    [/^(光|水|闇|火|自然)の/, (x) => (filter.civilization = CIV[x[1]])],
    [/^((?:光|水|闇|火|自然)(?:または(?:光|水|闇|火|自然))+)の/, (x) => (filter.civilizations = x[1].split('または').map((c) => CIV[c]))],
    [/^進化ではない/, () => (filter.nonEvolution = true)],
    [/^ツインパクト/, () => (filter.twinpact = true)],
    [/^無色の/, () => (filter.civilization = 'zero')],
    [/^進化クリーチャー以外の/, () => (filter.nonEvolution = true)],
    [/^多色の?/, () => (filter.multicolor = true)],
    // 種族：「ドラゴン・」「アビス・」（後ろに クリーチャー/カード が続く）。「AまたはB・」もある
    [/^([^、のをにがで「」・]+(?:・[^、のをにがで「」・]+)*?)・$/, (x) => setRaces(filter, x[1])],
  ];
  while (m) {
    const r = rules.find(([re]) => re.test(m));
    if (!r) return false;
    const x = m.match(r[0])!;
    r[1](x);
    m = m.slice(x[0].length);
  }
  return true;
}

/** 「水、闇、または火」→「水または闇または火」 */
function civList(s: string): string {
  return s.replace(/(光|水|闇|火|自然)、(?:または)?(?=光|水|闇|火|自然)/g, '$1または');
}

function setRaces(filter: CardFilter, text: string): void {
  const races = text.split('または');
  if (races.length === 1) filter.race = races[0];
  else filter.races = races;
}

const ZONE_WORD: Record<string, TargetSpec['zone']> = { 墓地: 'graveyard', マナゾーン: 'mana', 手札: 'hand', シールドゾーン: 'shield', 山札: 'deck' };

/** 移動元・場所の言い方 */
const FROM_RE = /(自分|相手)の(墓地|マナゾーン|手札|シールドゾーン)(?:から|にある|の(?=[^、]*?(?:カード|クリーチャー|呪文)を))、?/;

/**
 * 対象の言い方（目的語）を読む：「相手の、パワー3000以下のクリーチャーを1体」「コスト5以下のドラゴンを2体まで、自分の墓地から」
 * 「自分のマナゾーンにあるカードを好きな数」など。残りの動詞部分も返す
 */
function parseObject(s: string): { target: TargetSpec; noun: string; filter: CardFilter; explicitOwner: boolean; verb: string } | null {
  let text = s.replace(/^(相手|自分)の、/, '$1の').replace(/^バトルゾーンにある/, '');
  let owner: TargetSpec['owner'] | undefined;
  let zone: Zone = 'battle';
  let fromZone = false;
  const from = text.match(FROM_RE);
  if (from && from.index! < text.search(/を/)) {
    owner = from[1] === '自分' ? 'self' : 'opponent';
    zone = ZONE_WORD[from[2]];
    fromZone = true;
    text = text.replace(from[0], '');
  }
  const m = text.match(
    /^(相手の|自分の)?(好きな数の)?(.*?)(クリーチャー|エレメント|カード|シールド|呪文|手札)?を、?(?:(\d+)(?:体|枚|つ)(まで)?|(すべて)|(好きな(?:数|枚数)))(?:選び|選んで)?、?(.+)$/,
  );
  if (!m) return null;
  const [, ownerWord, anyPrefix, mods, nounRaw, count, upTo, all, anyCount, verbRaw] = m;
  if (ownerWord === '相手の') owner = 'opponent';
  else if (ownerWord === '自分の') owner = 'self';
  const filter: CardFilter = {};
  let noun = nounRaw ?? '';
  if (!noun) {
    // 名詞のない「ドラゴンを1体」：種族のクリーチャー
    if (!mods || !parseSubject(mods, filter)) return null;
    noun = 'クリーチャー';
  } else if (!parseMods(mods ?? '', filter)) return null;
  if (noun === 'シールド') {
    if (fromZone) return null;
    zone = 'shield';
  } else if (noun === 'クリーチャー' && zone !== 'battle') filter.cardType = 'creature';
  else if (noun === '呪文') {
    filter.cardType = 'spell';
  } else if (noun === '手札') {
    if (fromZone || mods) return null;
    zone = 'hand';
  }
  let verb = verbRaw.replace(/^(?:それら?|そのクリーチャー|それらのクリーチャー)を、?/, '');
  const fromAfter = verb.match(/^(自分|相手)の(墓地|マナゾーン|手札|シールドゾーン)から、?/);
  if (fromAfter && !fromZone) {
    owner = fromAfter[1] === '自分' ? 'self' : 'opponent';
    zone = ZONE_WORD[fromAfter[2]];
    if (noun === 'クリーチャー') filter.cardType = 'creature';
    if (noun === '呪文') filter.cardType = 'spell';
    verb = verb.slice(fromAfter[0].length);
    fromZone = true;
  }
  // 「カード」はどこのカードか分からなければ読まない（バトルゾーンの「エレメント」は誰のものか書いてあれば読む）
  if (noun === 'カード' && zone === 'battle' && !ownerWord) return null;
  if (noun === '呪文' && zone === 'battle') return null;
  const many = !!(anyPrefix || anyCount);
  const target: TargetSpec = {
    owner: owner ?? (zone === 'battle' ? 'any' : 'self'),
    zone,
    count: all ? 'all' : many ? 99 : n(count),
    ...(upTo || many ? { upTo: true } : {}),
    ...(Object.keys(filter).length ? { filter } : {}),
  };
  return { target, noun, filter, explicitOwner: !!ownerWord || fromZone, verb };
}

type Zone = TargetSpec['zone'];
type VerbRule = { re: RegExp; zones: Zone[]; build: (t: TargetSpec, m: RegExpMatchArray) => EffectDef | null };
/** 動詞の一覧。どのゾーンのカードに使えるかと、作る効果 */
const VERBS: VerbRule[] = [
  { re: /^破壊する$/, zones: ['battle'], build: (t) => ({ type: 'destroy', target: t }) },
  { re: /^手札に(?:戻す|加える)$/, zones: ['battle'], build: (t) => ({ type: 'bounce', target: t }) },
  { re: /^手札に(?:戻す|加える)$/, zones: ['shield'], build: (t) => ({ type: 'shieldToHand', target: t }) },
  { re: /^手札に(?:戻す|加える)$/, zones: ['graveyard'], build: (t) => ({ type: 'graveyardToHand', target: t }) },
  { re: /^手札に(?:戻す|加える)$/, zones: ['mana'], build: (t) => ({ type: 'toHand', target: t }) },
  { re: /^タップする$/, zones: ['battle', 'mana'], build: (t) => ({ type: 'tap', target: t }) },
  { re: /^アンタップする$/, zones: ['battle', 'mana'], build: (t) => ({ type: 'untap', target: t }) },
  { re: /^(タップして)?マナゾーンに(?:タップして)?置く$/, zones: ['battle', 'hand', 'graveyard', 'shield', 'deck'], build: (t, m) => ({ type: 'toMana', target: t, ...(m[0].includes('タップして') ? { tapped: true } : {}) }) },
  { re: /^墓地に置く$/, zones: ['battle', 'hand', 'mana', 'shield', 'deck'], build: (t) => ({ type: 'toGraveyard', target: t }) },
  { re: /^捨てる$/, zones: ['hand'], build: (t) => ({ type: 'toGraveyard', target: t }) },
  { re: /^(?:好きな順序で)?山札の(?:一番)?下に(?:置く|戻す)$/, zones: ['battle', 'hand', 'mana', 'graveyard', 'shield'], build: (t) => ({ type: 'toDeckBottom', target: t }) },
  { re: /^(?:好きな順序で)?山札の(?:一番)?上に(?:置く|戻す)$/, zones: ['hand'], build: (t) => ({ type: 'toDeckTop', target: t }) },
  { re: /^(?:裏向きにして)?(?:新しい)?シールド(?:化する|ゾーンに(?:裏向きにして)?置く|に加える|として(?:シールドゾーンに)?(?:置く|加える))$/, zones: ['battle', 'hand', 'graveyard', 'mana'], build: (t) => ({ type: 'toShield', target: t }) },
  { re: /^(?:相手は)?(?:それら?に|そのクリーチャーに)?封印を1つ(?:ずつ)?付ける$/, zones: ['battle'], build: (t) => ({ type: 'seal', target: t }) },
  { re: /^(?:バトルゾーンに)?出す$/, zones: ['hand', 'graveyard', 'mana'], build: (t) => ({ type: 'putIntoBattle', target: { ...t, filter: { ...(t.filter ?? {}), cardType: 'creature' } } }) },
];

/** 「〜を1体選び、破壊する」の形の文を読む */
function parseTargeted(s: string): EffectDef[] | null {
  const o = parseObject(s);
  if (!o) return null;
  const { target, verb } = o;
  const zone = target.zone;
  // 「このターン、そのクリーチャーに「スピードアタッカー」を与える」「次の自分のターンのはじめまで、それは攻撃できない」
  const grant = verb.match(/^(このターン|次の自分のターンのはじめまで)、?(?:それら?|その(?:クリーチャー)?|選んだクリーチャー)?(?:に|は)、?(.+)$/);
  if (grant) {
    const kw = parseGrant(grant[2]);
    return kw && zone === 'battle' ? [{ type: 'grantKeyword', target, keywords: kw, ...(grant[1] !== 'このターン' ? { untilNextTurn: true } : {}) }] : null;
  }
  const pow = verb.match(/^(?:このターン、)?(?:その|それの|それらの)パワーを([+-]\d+)する$/);
  if (pow) return zone === 'battle' ? [{ type: 'powerMod', target, amount: n(pow[1]) }] : null;
  const v = verb.replace(/^(?:持ち主の|自分の|相手の)/, '');
  for (const r of VERBS) {
    if (!r.zones.includes(zone)) continue;
    const m = v.match(r.re);
    if (m) {
      const e = r.build(target, m);
      return e && [e];
    }
  }
  return null;
}

/** 「「A」と「B」を与える」「攻撃もブロックもできない」を Keywords にする */
function parseGrant(t: string): Keywords | null {
  if (t === '攻撃できない') return { cannotAttack: true };
  if (t === 'ブロックできない') return { cannotBlock: true };
  if (t === '攻撃もブロックもできない') return { cannotAttack: true, cannotBlock: true };
  const m = t.match(/^「([^「」]+)」((?:と「[^「」]+」)*)を与える$/);
  if (!m) return null;
  const names = [m[1], ...[...m[2].matchAll(/「([^「」]+)」/g)].map((x) => x[1])];
  const kw: Keywords = {};
  for (const name of names) if (!applyKeywordLine(name, kw)) return null;
  return kw;
}

/** 「自分のドラゴン」「自分の多色クリーチャー」の主語部分を CardFilter にする */
function parseSubject(t: string, filter: CardFilter): boolean {
  if (t.endsWith('クリーチャー')) return parseMods(t.slice(0, -'クリーチャー'.length), filter);
  if (!/^[^、のをにがで「」]+$/.test(t)) return false;
  setRaces(filter, t.replace(/・$/, ''));
  return true;
}

/** 1つの文を効果にする。読めなければ null */
function parseSentence(s: string): EffectDef[] | null {
  let m: RegExpMatchArray | null;
  const draw = (count: string, upTo?: string): EffectDef => ({ type: 'draw', count: n(count), ...(upTo ? { upTo: true } : {}) });
  if ((m = s.match(/^(?:自分の山札から)?カードを(\d+)枚(まで)?引(?:く|き)$/))) return [draw(m[1], m[2])];
  if ((m = s.match(/^(?:自分の山札から)?カードを(\d+)枚(まで)?引き、(.+)$/))) {
    const rest = parseSentence(m[3]);
    return rest && [draw(m[1], m[2]), ...rest];
  }
  if ((m = s.match(/^自分の手札を(\d+)枚、?(?:好きな順序で)?(?:自分の)?山札の上に(?:置く|戻す)$/))) return [{ type: 'toDeckTop', target: { owner: 'self', zone: 'hand', count: n(m[1]) } }];
  if (/^自分の墓地にある(?:カードを)?すべて(?:の)?(?:カードを)?(?:自分の)?山札に(?:加え|戻し)、(?:山札を)?シャッフルする$/.test(s) || s === '自分の墓地にあるカードをすべて山札に加え、シャッフルする')
    return [{ type: 'graveyardToDeck' }];
  if ((m = s.match(/^自分の手札を(\d+)枚捨て、(.+)$/))) {
    const rest = parseSentence(m[2]);
    return rest && [{ type: 'toGraveyard', target: { owner: 'self', zone: 'hand', count: n(m[1]) } }, ...rest];
  }
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?(?:まで)?を?、?(?:タップして)?(?:自分の)?マナゾーンに置く$/))) return [{ type: 'deckTopTo', count: n(m[1]), to: 'mana' }];
  if ((m = s.match(/^(相手は自身|自分)の手札をすべて捨てる$/)))
    return [{ type: 'toGraveyard', target: { owner: m[1] === '自分' ? 'self' : 'opponent', zone: 'hand', count: 'all' } }];
  if ((m = s.match(/^(?:このターン、)?このクリーチャーに(「.+」を与える)$/))) {
    const kw = parseGrant(m[1]);
    return kw && [{ type: 'grantKeyword', target: 'self', keywords: kw }];
  }
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?を墓地に置く$/))) return [{ type: 'deckTopTo', count: n(m[1]), to: 'graveyard' }];
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?を手札に加える$/))) return [{ type: 'deckTopTo', count: n(m[1]), to: 'hand' }];
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?を(?:裏向きのまま、?)?(?:新しい)?シールド(?:として(?:シールドゾーンに置く|加える)|ゾーンに(?:置く|加える)|に加える|化する)$/)))
    return [{ type: 'deckTopTo', count: n(m[1]), to: 'shield' }];
  if ((m = s.match(/^相手の山札の上から(\d+)枚(?:目)?を墓地に置く$/))) return [{ type: 'deckTopTo', count: n(m[1]), to: 'graveyard', who: 'opponent' }];
  if ((m = s.match(/^相手の手札を(?:(\d+)枚見ないで|見ないで(\d+)枚)選び、捨てさせる$/))) return [{ type: 'discardRandom', count: n(m[1] ?? m[2]) }];
  if ((m = s.match(/^自分の手札を(\d+)枚相手に見ないで選ばせ、捨てる$/))) return [{ type: 'discardRandom', count: n(m[1]), self: true }];
  // 「このターン、自分のクリーチャー1体のパワーを+2000する」
  if ((m = s.match(/^(?:このターン、)?(自分|相手)の(.*?)クリーチャー(\d+)体のパワーを([+-]\d+)する$/))) {
    const filter: CardFilter = {};
    if (!parseMods(m[2], filter)) return null;
    return [{ type: 'powerMod', target: { owner: m[1] === '自分' ? 'self' : 'opponent', zone: 'battle', count: n(m[3]), ...(Object.keys(filter).length ? { filter } : {}) }, amount: n(m[4]) }];
  }
  // 「コスト5以下の呪文を1枚、自分の手札からコストを支払わずに唱える」
  if ((m = s.match(/^(.*?)(呪文|クリーチャー|カード)を1(?:枚|体)、?自分の手札からコストを支払わずに(?:唱える|召喚する|使う|実行する|出す|バトルゾーンに出す)$/))) {
    const filter: CardFilter = m[2] === 'カード' ? {} : { cardType: m[2] === '呪文' ? 'spell' : 'creature' };
    if (!parseMods(m[1], filter)) return null;
    return [{ type: 'playFromHandFree', ...(Object.keys(filter).length ? { filter } : {}) }];
  }
  if ((m = s.match(/^相手は自身の手札を(\d+)枚選び、捨てる$/)))
    return [{ type: 'toGraveyard', target: { owner: 'opponent', zone: 'hand', count: n(m[1]), chooser: 'owner' } }];
  if ((m = s.match(/^(?:自分の)?手札を(\d+)枚(?:選び、)?捨て(?:る)?$/))) return [{ type: 'toGraveyard', target: { owner: 'self', zone: 'hand', count: n(m[1]) } }];
  // 「相手は自身のクリーチャーを1体選び、破壊する」：相手が選ぶ
  if ((m = s.match(/^相手は、?自身の([^、。]*?を\d+(?:体|つ|枚)(?:選び|選んで)、?.+)$/))) {
    const r = parseTargeted(`相手の${m[1]}`);
    return r && r.map((e) => ('target' in e && typeof e.target === 'object' ? ({ ...e, target: { ...e.target, chooser: 'owner' } } as EffectDef) : e));
  }
  if ((m = s.match(/^相手のシールドを(\d+)つブレイクする$/))) return [{ type: 'breakShields', count: n(m[1]) }];
  // 「相手は自身のクリーチャーすべてに封印を1つ付ける」（ドキンダムX）
  if ((m = s.match(/^(?:相手は、?自身|(相手|自分))の(.*?)クリーチャーすべてに(?:、?それぞれ)?封印を1つ(?:ずつ)?付ける$/))) {
    const filter: CardFilter = {};
    if (!parseMods(m[2], filter)) return null;
    const owner = m[1] === '自分' ? 'self' : 'opponent';
    return [{ type: 'seal', target: { owner, zone: 'battle', count: 'all', ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  if ((m = s.match(/^(?:このターン、)?このクリーチャーのパワーを\+(\d+)する$/))) return [{ type: 'powerMod', target: 'self', amount: n(m[1]) }];
  if (s === 'このクリーチャーをアンタップする') return [{ type: 'selfAction', action: 'untap' }];
  if (s === 'このクリーチャーをタップする') return [{ type: 'selfAction', action: 'tap' }];
  if (s === 'このクリーチャーを破壊する') return [{ type: 'selfAction', action: 'destroy' }];
  if (/^このクリーチャーを(?:持ち主の)?手札に戻す$/.test(s)) return [{ type: 'selfAction', action: 'toHand' }];
  if (s === 'このクリーチャーをマナゾーンに置く') return [{ type: 'selfAction', action: 'toMana' }];
  if (s === 'このターンの後、自分のターンを追加する' || s === 'このターンの後にもう一度自分のターンを行う') return [{ type: 'extraTurn' }];
  // 「このターン、相手は呪文を唱えられない」「次の自分のターンのはじめまで、相手のクリーチャーは攻撃できない」
  if ((m = s.match(/^(このターン|次の自分のターンのはじめまで)、(.+)$/))) {
    const st = parseStatic(m[2]);
    return st && st.map((x) => ({ type: 'turnStatic' as const, static: x, ...(m![1] !== 'このターン' ? { untilNextTurn: true } : {}) }));
  }
  if ((m = s.match(/^自分は、?(.+)$/))) return parseSentence(m[1]);
  return parseTargeted(s) ?? splitClauses(s);
}

/** 文中の「〜し、」「〜き、」で続く動詞の形（連用形）と、言い切りの形 */
const CONTINUATIVE: [string, string][] = [
  ['アンタップし', 'アンタップする'], ['タップし', 'タップする'], ['破壊し', '破壊する'], ['シャッフルし', 'シャッフルする'],
  ['引き', '引く'], ['置き', '置く'], ['戻し', '戻す'], ['出し', '出す'], ['加え', '加える'], ['捨て', '捨てる'],
  ['見せ', '見せる'], ['唱え', '唱える'], ['与え', '与える'], ['し', 'する'],
];

/**
 * 「AをBし、CをDする」を「AをBする」「CをDする」の2つに分けて読む。
 * 両方とも読めた時だけ使う（左から順に区切りを試す）
 */
function splitClauses(s: string): EffectDef[] | null {
  for (let i = s.indexOf('、'); i > 0; i = s.indexOf('、', i + 1)) {
    const left = s.slice(0, i);
    if (/(?:選び|選んで|見ないで)$/.test(left)) continue;
    const c = CONTINUATIVE.find(([a]) => left.endsWith(a));
    if (!c) continue;
    const l = parseSentence(left.slice(0, -c[0].length) + c[1]);
    if (!l) continue;
    const r = parseSentence(s.slice(i + 1));
    if (r) return [...l, ...r];
  }
  return null;
}

/** 最後に読めなかった文（explainManual 用） */
let failedAt: string | null = null;

interface Group {
  optional: boolean;
  effects: EffectDef[];
}

/** 能力の本文（誘発条件を除いた部分）を読む。読めなければ null */
function parseBody(body: string, options: string[]): Group[] | null {
  const sentences = body
    .replace(/シャッフルし、(?:その後|そのあと)、/g, 'シャッフルし、')
    .split('。')
    .map((x) => x.trim())
    .filter(Boolean)
    .flatMap((x) => x.split(/、?(?:その後|そのあと)、/).filter(Boolean));
  const groups: Group[] = [];
  for (let i = 0; i < sentences.length; i++) {
    let s = sentences[i];
    failedAt = s;
    // 「ただし、その「S・トリガー」は使えない」：シールドを手札に加える効果ではもともと使えない
    if (/^ただし、その「S・トリガー」は使えない$/.test(s)) continue;
    let chain = false;
    const so = s.match(/^(?:そうしたら|そしたら)、(.+)$/);
    if (so) {
      if (!groups.length || !groups[groups.length - 1].optional) return null;
      s = so[1];
      chain = true;
    }
    // 山札を見て選ぶ（2〜3文で1つの効果）
    const look = s.match(/^自分の山札(?:の上から|(?:のカード)?を、?上から)(\d+)枚(?:目まで|目)?を?(?:見る|表向きにする)$/);
    const search = s === '自分の山札を見る';
    if (look || search) {
      // 1枚だけ公開して「それが〜なら…」
      const one = look && look[1] === '1' ? parseRevealIf(sentences.slice(i + 1)) : null;
      if (one) {
        i += one.used;
        pushGroup(groups, false, [one.effect], chain);
        continue;
      }
      const r = parseLook(look ? n(look[1]) : 99, sentences.slice(i + 1));
      if (!r) return null;
      i += r.used;
      pushGroup(groups, r.optional, [r.effect], chain);
      continue;
    }
    // 「自分の山札から呪文を1枚さがして相手に見せ、自分の手札に加える。そのあと、山札をシャッフルする」
    const find = s.match(/^自分の山札から、?(.*?)を(\d+)(?:枚|体)(?:まで)?(?:さがして|探して|選び)、?(?:相手に見せ(?:てから)?、?)?(?:自分の)?手札に加え(?:る|てもよい)$/);
    if (find) {
      const pickFilter: CardFilter = {};
      if (!parsePickWhat(find[1], pickFilter)) return null;
      if (sentences[i + 1] === '山札をシャッフルする') i++;
      pushGroup(groups, false, [{ type: 'lookAtTop', count: 99, pickCount: n(find[2]), ...(Object.keys(pickFilter).length ? { pickFilter } : {}), pickTo: 'hand', restTo: 'shuffle' }], chain);
      continue;
    }
    // 「自分の山札をシャッフルし、上から1枚目をすべてのプレイヤーに見せる。そのカードがクリーチャーであれば、出してもよい…」
    if (/^自分の山札をシャッフルし、上から1枚目を(?:すべてのプレイヤーに見せる|表向きにする)$/.test(s)) {
      const e: Extract<EffectDef, { type: 'revealTopCard' }> = { type: 'revealTopCard' };
      let j = i + 1;
      for (; j < sentences.length; j++) {
        const x = sentences[j];
        if (/^(?:そのカードが|それが)?クリーチャーであれば、(?:それを)?(?:バトルゾーンに)?出してもよい$/.test(x)) e.ifCreature = 'battle';
        else if (/^(?:そのカードが|それが)?呪文であれば、コストを支払わずに唱えてもよい$/.test(x)) e.ifSpell = 'cast';
        else if (/^(?:そのカードが|それが)?クリーチャーでなければ、(?:それを)?(?:自分の)?マナゾーンに置く$/.test(x)) e.otherwise = 'mana';
        else break;
      }
      if (j === i + 1) return null;
      i = j - 1;
      pushGroup(groups, false, [{ type: 'shuffleDeck' }, e], chain);
      continue;
    }
    // ラッキー・ダーツ：「自分のシールドを1枚相手に選ばせ、見る。それが呪文であれば…唱えてもよい。唱えない場合や…元の場所に戻す」
    if (/^自分のシールドを1(?:枚|つ)相手に選ばせ、見る$/.test(s) && /^それが呪文であれば、?コストを支払わずに(?:すぐ)?唱えてもよい$/.test(sentences[i + 1] ?? '')) {
      i += /元の場所に戻す$/.test(sentences[i + 2] ?? '') ? 2 : 1;
      pushGroup(groups, false, [{ type: 'shieldGamble' }], chain);
      continue;
    }
    // 「自分の手札にあるカードの枚数以下のコストを持つ水のカードを1枚選んでもよい。そうしたら、そのカードを自分の手札からコストを支払わずに使う」
    const free = s.match(/^自分の手札にある(カードの枚数以下のコストを持つ)?(.*?)カードを1枚選んでもよい$/);
    if (free && /^そうしたら、そのカードを(?:自分の)?手札からコストを支払わずに(?:使う|使ってもよい)$/.test(sentences[i + 1] ?? '')) {
      const filter: CardFilter = {};
      if (!parseMods(free[2], filter)) return null;
      i++;
      pushGroup(groups, false, [{ type: 'playFromHandFree', ...(Object.keys(filter).length ? { filter } : {}), ...(free[1] ? { maxCostHandSize: true } : {}) }], chain);
      continue;
    }
    // 「次の中から1つ選ぶ」：▶ の行が選択肢
    const modes = s.match(/^次の(?:中から|うち)(?:いずれか)?(\d+(?:つ|回)|ひとつ|ふたつ|みっつ)を?選ぶ$/);
    if (modes) {
      if (options.length < 2) return null;
      const times = ({ ひとつ: 1, ふたつ: 2, みっつ: 3 } as Record<string, number>)[modes[1]] ?? parseInt(modes[1], 10);
      const repeat = sentences[i + 1] === '同じものを選んでもよい';
      if (repeat) i++;
      const opts: { label: string; effects: EffectDef[] }[] = [];
      for (const o of options) {
        const g = parseBody(o, []);
        if (!g || g.some((x) => x.optional)) return null;
        opts.push({ label: o.replace(/。$/, ''), effects: g.flatMap((x) => x.effects) });
      }
      pushGroup(groups, false, [{ type: 'chooseOne', options: opts, ...(times > 1 ? { times, ...(repeat ? {} : { distinct: true }) } : {}) }], chain);
      options = [];
      continue;
    }
    // 「相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる」
    const fight = s.match(/^(相手の)(.*?)クリーチャーを1体選(ぶ|んでもよい)$/);
    if (fight && /^その(?:選んだ)?クリーチャーとこのクリーチャーをバトルさせる$/.test(sentences[i + 1] ?? '')) {
      const filter: CardFilter = {};
      if (!parseMods(fight[2], filter)) return null;
      i++;
      pushGroup(groups, fight[3] !== 'ぶ', [{ type: 'fight', target: { owner: 'opponent', zone: 'battle', count: 1, ...(Object.keys(filter).length ? { filter } : {}) } }], chain);
      continue;
    }
    // 「相手とガチンコ・ジャッジする。自分が勝ったら、〜」
    const gj = stripOptional(s);
    if (gj.text === '相手とガチンコ・ジャッジする') {
      const won = (sentences[i + 1] ?? '').match(/^(?:自分が)?勝った(?:ら|場合)、(.+)$/);
      if (!won) return null;
      const then = parseSentence(won[1]);
      if (!then) return null;
      i++;
      pushGroup(groups, gj.optional, [{ type: 'gachinko', then }], chain);
      continue;
    }
    // 「自分の山札の上から1枚を表向きにする。それがドラゴンなら出す。それ以外なら山札の下に置く」
    const one = s.match(/^自分の山札の上から1枚目?を(?:表向きにする|見る)$/);
    if (one) {
      const r = parseRevealIf(sentences.slice(i + 1));
      if (r) {
        i += r.used;
        pushGroup(groups, false, [r.effect], chain);
        continue;
      }
    }
    // 「〜を1体選ぶ。このターン、そのクリーチャーのパワーを-3000する」：2文で1つの効果
    const pick = s.match(/^(.+を\d+(?:体|枚|つ)(?:まで)?)選ぶ$/);
    if (pick && sentences[i + 1]) {
      const verb = sentences[i + 1]
        .replace(/^(?:相手|自分)は、?(?=(?:その|それ))/, '')
        .replace(/^(このターン、)?(?:その|選んだ)(?:クリーチャー|カード|エレメント|シールド)(?:を|の)/, (_, turn) => (turn ? `${turn}その` : ''))
        .replace(/^それら?を/, '')
        .replace(/^(?:自身|持ち主)の/, '');
      const { text, optional } = stripOptional(verb);
      const effects = parseSentence(`${pick[1]}選び、${text}`);
      if (!effects) return null;
      i++;
      pushGroup(groups, optional, effects, chain);
      continue;
    }
    const { text, optional } = stripOptional(s);
    const effects = parseSentence(text);
    if (!effects) return null;
    pushGroup(groups, optional, effects, chain);
  }
  if (options.length) return null;
  return groups;
}

function pushGroup(groups: Group[], optional: boolean, effects: EffectDef[], chain: boolean): void {
  const last = groups[groups.length - 1];
  if (chain || (last && !optional && !last.optional)) last.effects.push(...effects);
  else groups.push({ optional, effects });
}

/** 「山札の上からN枚を見る」に続く文を読む */
function parseLook(count: number, next: string[]): { effect: EffectDef; used: number; optional: boolean } | null {
  const first = next[0];
  if (!first) return null;
  const { text, optional } = stripOptional(first);
  const DEST = '(手札に加え(?:る)?|(?:バトルゾーンに)?出(?:し|す)|(?:タップして)?マナゾーンに置(?:き|く)|墓地に置(?:き|く)|シールド化(?:し|する))';
  let pickAll = false;
  let chooser: 'opponent' | undefined;
  let what: string, pc: string, dest: string, restInline: string | undefined;
  // 「その中の水のカードをすべて自分の手札に加え、それ以外のカードを自分の墓地に置く」
  const all = text.match(new RegExp(`^その中(?:の|から)、?(.*?)をすべて、?(?:相手に見せてから)?(?:自分の)?${DEST}(?:、(.+))?$`));
  const any = text.match(new RegExp(`^その中から、?(?:(.*?)を好きな(?:数|枚数)|好きな数の(.*?)を)、?(?:選んで)?(?:表向きにして(?:から)?|相手に見せてから)?、?(?:自分の)?${DEST}(?:、(.+))?$`));
  if (all) {
    [, what, dest, restInline] = all;
    pc = String(count);
    pickAll = true;
  } else if (any) {
    what = any[1] ?? any[2] ?? '';
    [, , , dest, restInline] = any;
    pc = String(count);
  } else {
    const m = text.match(new RegExp(`^(?:その中から|そのうちの|その中の)、?(.*?)(\\d+)(?:枚|体)(?:まで)?(?:選び|を)?、?(相手に選ばせ、?)?(?:表向きにして(?:から)?|相手に見せてから|相手に見せて)?、?(?:自分の)?${DEST}(?:、(.+))?$`));
    if (!m) return null;
    let opp: string | undefined;
    [, what, pc, opp, dest, restInline] = m;
    if (opp) chooser = 'opponent';
  }
  const pickFilter: CardFilter = {};
  if (!parsePickWhat(what.replace(/を$/, ''), pickFilter)) return null;
  const pickTo = dest.startsWith('手札') ? 'hand' : dest.startsWith('バトル') || dest.startsWith('出') ? 'battle' : dest.includes('マナ') ? 'mana' : dest.startsWith('墓地') ? null : 'shield';
  if (!pickTo) return null;
  let used = 1;
  let restText = restInline;
  if (!restText && next[1] && /^(?:残り|もう\d+枚|それ以外のカード)を/.test(next[1])) {
    restText = next[1];
    used = 2;
  }
  let restTo: Extract<EffectDef, { type: 'lookAtTop' }>['restTo'];
  const REST = '^(?:残り(?:の\\d+枚)?|もう\\d+枚|それ以外のカード)を(?:好きな順序で)?(?:自分の)?';
  if (count === 99) {
    if (restText && !/^山札をシャッフルする$/.test(restText)) return null;
    if (!restText && next[1] === '山札をシャッフルする') used = 2;
    restTo = 'shuffle';
  } else if (!restText) return null;
  else if (new RegExp(`${REST}山札の(?:一番)?下に(?:置く|戻す)$`).test(restText)) restTo = 'deckBottom';
  else if (new RegExp(`${REST}墓地に置く$`).test(restText)) restTo = 'graveyard';
  else if (new RegExp(`${REST}(?:タップして)?マナゾーンに置く$`).test(restText)) restTo = 'mana';
  else if (new RegExp(`${REST}山札に戻して(?:山札を)?シャッフルする$`).test(restText)) restTo = 'shuffle';
  else return null;
  return {
    effect: {
      type: 'lookAtTop',
      count,
      pickCount: n(pc),
      ...(Object.keys(pickFilter).length ? { pickFilter } : {}),
      pickTo,
      restTo,
      ...(pickAll ? { pickAll: true } : !optional && count !== 99 ? { mustPick: true } : {}),
      ...(chooser ? { chooser } : {}),
    },
    used,
    optional: false,
  };
}

/** 山札の上1枚を公開し「それが〜なら…」する文 */
function parseRevealIf(next: string[]): { effect: EffectDef; used: number } | null {
  const m = (next[0] ?? '').match(/^それが(.+?)(?:なら|であれば)、?(?:それを)?(.+)$/);
  if (!m) return null;
  const filter: CardFilter = {};
  if (!parsePickWhat(m[1], filter) && !parseSubject(m[1], filter)) return null;
  const { text, optional } = stripOptional(m[2]);
  const TO: Record<string, 'hand' | 'battle' | 'mana' | null> = { 出す: 'battle', バトルゾーンに出す: 'battle', 手札に加える: 'hand', マナゾーンに置く: 'mana' };
  const pickTo = TO[text.replace(/^自分の/, '')];
  if (!pickTo) return null;
  let used = 1;
  let restTo: Extract<EffectDef, { type: 'lookAtTop' }>['restTo'] = 'top';
  const rest = (next[1] ?? '').match(/^(?:それ以外なら|それ以外の場合|こうして(?:出さ|加え|置か)なければ)、?(?:表向きにしたカードを)?(?:自分の)?(山札の(?:一番)?下に置く|墓地に置く|マナゾーンに置く)$/);
  if (rest) {
    restTo = rest[1].startsWith('山札') ? 'deckBottom' : rest[1].startsWith('墓地') ? 'graveyard' : 'mana';
    used = 2;
  }
  return {
    effect: { type: 'lookAtTop', count: 1, pickCount: 1, ...(Object.keys(filter).length ? { pickFilter: filter } : {}), pickTo, restTo, ...(optional ? {} : { pickAll: true }) },
    used,
  };
}

/** 「水のカード」「進化クリーチャー以外のクリーチャー」など、選ぶカードの条件を読む（空なら条件なし） */
function parsePickWhat(w: string, filter: CardFilter): boolean {
  if (!w) return true;
  const wm = w.match(/^(.*?)(クリーチャー|呪文|カード)$/);
  if (!wm || !parseMods(wm[1], filter)) return false;
  if (wm[2] === 'クリーチャー') filter.cardType = 'creature';
  if (wm[2] === '呪文') filter.cardType = 'spell';
  return true;
}

// ───────────────────────── 常在効果 ─────────────────────────

/** 「自分の墓地にある呪文1枚につき」「バトルゾーンにある他のクリーチャー1体につき」を数え方にする */
function parsePer(t: string): { per: Quantity; unit: number } | null {
  const m = t.match(/^(自分の|相手の|すべての|バトルゾーンにある(?:自分の|相手の)?)?(?:(墓地|マナゾーン|手札|シールドゾーン)(?:にある|の))?(他の)?(.*?)(カード|クリーチャー|呪文|エレメント)?(\d+)(?:枚|体|つ)につき$/);
  if (!m) return null;
  const [, whoWord, zoneWord, other, mods, noun, unit] = m;
  const filter: CardFilter = {};
  if (!noun) {
    if (!mods || !parseSubject(mods, filter)) return null;
  } else if (!parseMods(mods ?? '', filter)) return null;
  if (other) filter.excludeSelf = true;
  const zone = zoneWord ? ZONE_WORD[zoneWord] : 'battle';
  if (noun === 'クリーチャー' && zone !== 'battle') filter.cardType = 'creature';
  if (noun === '呪文') filter.cardType = 'spell';
  const who: Quantity['who'] = whoWord?.includes('自分') ? 'self' : whoWord?.includes('相手') ? 'opponent' : 'any';
  return { per: { who, zone: zone as Quantity['zone'], ...(Object.keys(filter).length ? { filter } : {}) }, unit: n(unit) };
}

/** 「このクリーチャーの召喚コストを、クリーチャー1体につき1少なくする。ただしコストは2以下にならない」 */
function parseSelfCost(t: string): ParsedAbilities['selfCost'] | null {
  const m =
    t.match(/^このクリーチャーの召喚コストを、(.+?につき)(\d+)少なくする(?:。ただし、?コストは(\d+)(以下|より少なく)(?:には|に)?ならない)?$/) ??
    t.match(/^(.+?につき)、?このクリーチャーの召喚コストは(\d+)少なくなる(?:。ただし、?コストは(\d+)(以下|より少なく)(?:には|に)?ならない)?$/);
  if (!m) return null;
  const p = parsePer(m[1]);
  if (!p) return null;
  const min = m[3] === undefined ? 1 : m[4] === '以下' ? n(m[3]) + 1 : n(m[3]);
  return { amount: n(m[2]), per: p.per, unit: p.unit, min };
}

function parseStatic(t: string): StaticAbility[] | null {
  // 「このクリーチャーのパワーを、自分の墓地にある呪文1枚につき+3000する」
  let per =
    t.match(/^このクリーチャーのパワーを、(.+?につき)([+-]\d+)する$/) ??
    t.match(/^このクリーチャーのパワーは、(.+?につき)([+-]\d+)される$/) ??
    t.match(/^(.+?につき)、?このクリーチャーのパワーを([+-]\d+)する$/);
  if (per) {
    const p = parsePer(per[1]);
    if (!p || p.unit !== 1) return null;
    return [{ type: 'powerMod', amount: n(per[2]), appliesTo: { owner: 'self', onlySelf: true }, perCount: p.per }];
  }
  // 「〜があれば、このクリーチャーは攻撃されない」：条件つきの常在効果
  const cond = splitCondition(t);
  if (cond.condition && cond.body) {
    const inner = parseStatic(cond.body) ?? selfKeywordStatic(cond.body);
    return inner && inner.map((x) => ({ ...x, condition: cond.condition }));
  }
  // 「自分のターン中、相手は呪文を唱えられない」
  const during = t.match(/^(自分|相手)のターン中、(.+)$/);
  if (during) {
    const inner = parseStatic(during[2]);
    return inner && inner.map((x) => ({ ...x, duringTurn: during[1] === '自分' ? 'self' : 'opponent' }));
  }
  const owner = (w: string): Applies['owner'] => (w === '自分' ? 'self' : 'opponent');
  // 「自分の他のクリーチャーすべてのパワーを+5000し、「スピードアタッカー」を与える」「自分のドラゴンすべてに「スピードアタッカー」を与える」
  let g = t.match(/^(自分|相手)の(他の)?(.+?)すべて(?:のパワーを([+-]\d+)し、|に、?)(「.+」を与え)(る|、それらはすべてブロックされない)$/);
  if (g) {
    const filter: CardFilter = {};
    if (!parseSubject(g[3], filter)) return null;
    const kw = parseGrant(g[5] + 'る');
    if (!kw) return null;
    if (g[6] !== 'る') kw.unblockable = true;
    const appliesTo: Applies = { owner: owner(g[1]), ...(g[2] ? { excludeSelf: true } : {}), ...(Object.keys(filter).length ? { filter } : {}) };
    return [...(g[4] ? [{ type: 'powerMod' as const, amount: n(g[4]), appliesTo }] : []), { type: 'grantKeyword', keywords: kw, appliesTo }];
  }
  // 「自分のリキッド・ピープルはブロックされない」
  g = t.match(/^(自分|相手)の(他の)?(.+?)は、?(?:すべて)?(ブロックされない|攻撃できない|ブロックできない|自分を攻撃できない)$/);
  if (g) {
    const filter: CardFilter = {};
    if (!parseSubject(g[3], filter)) return null;
    const KW: Record<string, Keywords> = {
      ブロックされない: { unblockable: true },
      攻撃できない: { cannotAttack: true },
      ブロックできない: { cannotBlock: true },
      // 相手のクリーチャーが「自分（このカードの持ち主）を攻撃できない」＝プレイヤーを攻撃できない
      自分を攻撃できない: { cannotAttackPlayers: true },
    };
    if (g[4] === '自分を攻撃できない' && g[1] !== '相手') return null;
    const kw = KW[g[4]];
    return [{ type: 'grantKeyword', keywords: kw, appliesTo: { owner: owner(g[1]), ...(g[2] ? { excludeSelf: true } : {}), ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  let m = t.match(/^(自分|相手)の(他の)?(.*?)クリーチャーすべてのパワーを([+-]\d+)する$/);
  if (m) {
    const filter: CardFilter = {};
    if (!parseMods(m[3], filter)) return null;
    return [{ type: 'powerMod', amount: n(m[4]), appliesTo: { owner: m[1] === '自分' ? 'self' : 'opponent', ...(m[2] ? { excludeSelf: true } : {}), ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  m = t.match(/^このクリーチャーのパワーは、?攻撃中、?\+(\d+)される$/);
  if (m) return null;
  if (t === '相手は呪文を唱えられない') return [{ type: 'cannotCast', who: 'opponent' }];
  if (/^相手はカードをマナゾーンに置く時、タップして置く$/.test(t) || t === '相手のカードはマナゾーンにタップして置かれる') return [{ type: 'manaEntersTapped', who: 'opponent' }];
  m = t.match(/^相手はコスト(\d+)(以下|以上)の呪文を唱えられない$/);
  if (m) return [{ type: 'cannotCast', who: 'opponent', filter: m[2] === '以下' ? { maxCost: n(m[1]) } : { minCost: n(m[1]) } }];
  m = t.match(/^(自分|相手)の(.*?)(クリーチャー|呪文|カード)(?:の召喚|を召喚する|の唱える|を唱える|を実行する|の)?コストを(\d+)(多く|少なく)する(?:。ただし、?コストは0以下に(?:は)?ならない)?$/);
  if (m) {
    const filter: CardFilter = m[3] === 'カード' ? {} : { cardType: m[3] === '呪文' ? 'spell' : 'creature' };
    if (!parseMods(m[2], filter)) return null;
    return [{ type: 'costMod', amount: m[5] === '多く' ? n(m[4]) : -n(m[4]), appliesTo: { owner: owner(m[1]), ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  return null;
}

// ───────────────────────── 入口 ─────────────────────────

/** 能力テキストの段落を、1つの能力ごとにまとめる（途中で改行された文をつなぎ、▶ の選択肢を前の能力に付ける） */
export function splitAbilityLines(text: string): { line: string; options: string[] }[] {
  const paras = text
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const out: { line: string; options: string[] }[] = [];
  for (const raw of paras) {
    const last = out[out.length - 1];
    // 「次のうちいずれかひとつを選ぶ。 ▼カードを1枚引く。 ▼…」のように同じ行に並んだ選択肢
    const parts = raw.split(/\s*[▼▽]\s*/).map((x) => x.trim()).filter(Boolean);
    const p = parts[0] ?? raw;
    if (/^[▶►■・▼▽]/.test(raw.normalize('NFKC').replace(/️/g, '').trim()) && last) {
      last.options.push(...(parts.length > 1 ? parts : [raw.replace(/^[\s▶►■・▼▽️]+/, '')]));
      continue;
    }
    if (parts.length > 1) {
      out.push({ line: p, options: parts.slice(1) });
      continue;
    }
    if (last && !last.options.length && /[、,]$/.test(normalizeText(last.line))) {
      last.line += p;
      continue;
    }
    out.push({ line: p, options: [] });
  }
  return out;
}

/**
 * 能力テキストを読み取る。
 * @param kind creature: クリーチャー（誘発・常在） / spell: 呪文（誘発のない文は唱えた時の効果） / other: その他（キーワードのみ）
 */
export function parseAbilityText(text: string, kind: 'creature' | 'spell' | 'other'): ParsedAbilities {
  const result: ParsedAbilities = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
  for (const { line, options } of splitAbilityLines(text)) {
    // 補足説明（カッコ書き）だけの行は能力ではない
    if (!stripIcons(normalizeText(line)) && !options.length) continue;
    if (applyKeywordLine(line, result.keywords)) continue;
    const ok = parseLine(line, options, kind, result);
    (ok ? result.parsedLines : result.manualLines).push([line, ...options.map((o) => `▶${o}`)].join('\n'));
  }
  return result;
}

/** 本文の先頭の「〜があれば、」「〜なら、」を条件にする */
function splitCondition(body: string): { body: string | null; condition?: Condition } {
  const who = (w: string) => (w === '自分' ? 'self' : 'opponent') as Quantity['who'];
  let m = body.match(/^(?:バトルゾーンに)?(自分|相手)の(.+?)が(?:(\d+)(?:体|つ)以上)?(あれば|なければ)、(.+)$/);
  if (m && !/^(?:マナゾーン|墓地|手札|山札|シールド)/.test(m[2])) {
    const filter: CardFilter = {};
    // 「他の」は数える時に自分自身を除けないので手動
    if (!parseSubject(m[2], filter) || filter.excludeSelf) return { body: null };
    const left: Quantity = { who: who(m[1]), zone: 'battle', ...(Object.keys(filter).length ? { filter } : {}) };
    const cond: Condition = { type: 'compare', left, op: '>=', right: m[3] ? n(m[3]) : 1 };
    return { body: m[5], condition: m[4] === 'なければ' ? { type: 'not', condition: cond } : cond };
  }
  m = body.match(/^(自分|相手)のシールドが(\d+)つ(以下|以上)なら、(.+)$/);
  if (m) return { body: m[4], condition: { type: 'compare', left: { who: who(m[1]), zone: 'shield' }, op: m[3] === '以下' ? '<=' : '>=', right: n(m[2]) } };
  m = body.match(/^(自分|相手)の(マナゾーン|墓地|手札)に(.*?)(カード|クリーチャー|呪文)が(\d+)枚以上(あれば|なければ)、(.+)$/);
  if (m) {
    const filter: CardFilter = m[4] === 'カード' ? {} : { cardType: m[4] === '呪文' ? 'spell' : 'creature' };
    if (!parseMods(m[3], filter)) return { body: null };
    const left: Quantity = { who: who(m[1]), zone: ZONE_WORD[m[2]] as Quantity['zone'], ...(Object.keys(filter).length ? { filter } : {}) };
    const cond: Condition = { type: 'compare', left, op: '>=', right: n(m[5]) };
    return { body: m[7], condition: m[6] === 'なければ' ? { type: 'not', condition: cond } : cond };
  }
  m = body.match(/^(自分|相手)の手札が(\d+)枚(以上|以下)(?:なら|あれば)、(.+)$/);
  if (m) return { body: m[4], condition: { type: 'compare', left: { who: who(m[1]), zone: 'hand' }, op: m[3] === '以下' ? '<=' : '>=', right: n(m[2]) } };
  return { body };
}

function parseLine(line: string, options: string[], kind: 'creature' | 'spell' | 'other', out: ParsedAbilities): boolean {
  const t = normalizeText(line);
  const opts = options.map(normalizeText);
  if (kind === 'other') return false;
  // 進化元：「進化：自分の火のクリーチャー1体の上に置く」「進化：自分のドラゴン1体の上に置く」
  const evo = t.match(/^進化[:\-—―ー](?:進化ではない、?)?(?:自分の)?(?:(光|水|闇|火|自然)の)?(.*?)1体の上に置く。?$/);
  if (evo) {
    const race = evo[2] === 'クリーチャー' ? undefined : evo[2].replace(/・?クリーチャー$/, '');
    if (race === '') return false;
    out.evolvesFrom = { ...(evo[1] ? { civilization: CIV[evo[1]] } : {}), ...(race ? { race } : {}) };
    return true;
  }
  // ハイパー化：「ハイパー化：自分の他のクリーチャーを1体タップする」
  const hy = t.match(/^ハイパー化[:：]自分の(他の)?(.*?)クリーチャーを(\d+)体タップする。?$/);
  if (hy && kind === 'creature') {
    const filter: CardFilter = {};
    if (!parseMods(hy[2], filter)) return false;
    out.hyper = { count: n(hy[3]), excludeSelf: !!hy[1], ...(Object.keys(filter).length ? { filter } : {}) };
    return true;
  }
  // NEO進化：「NEO進化：水、闇、または火のクリーチャー1体の上に置いてもよい」
  const neo = t.match(/^NEO進化[:：](?:自分の)?(.+?)1体の上に置いてもよい。?$/);
  if (neo && kind === 'creature') {
    const filter = parseSwapCondition(neo[1].replace(/^((?:(?:光|水|闇|火|自然)、)+)/, (x) => x));
    if (!filter) return false;
    out.neoEvolution = filter;
    return true;
  }
  if (t === 'エスケープ' && kind === 'creature') {
    out.replacements.push({ event: 'destroyed', subject: 'self', instead: 'escape', optional: true });
    return true;
  }
  // 侵略・革命チェンジ：「侵略：火のコマンド」「革命チェンジ：多色のコスト5以上のドラゴン」
  const swap = t.match(/^(侵略|革命チェンジ)[:：](.+?)。?$/);
  if (swap && kind === 'creature') {
    const filter = parseSwapCondition(swap[2]);
    if (!filter) return false;
    out.attackSwap = { kind: swap[1] === '侵略' ? 'invasion' : 'revolution', filter };
    return true;
  }
  const selfCost = parseSelfCost(t.replace(/。$/, ''));
  if (selfCost) {
    out.selfCost = selfCost;
    return true;
  }
  const replacement = parseReplacement(t.replace(/。$/, ''));
  if (replacement && kind === 'creature') {
    out.replacements.push(replacement);
    return true;
  }
  // 能力語（「鬼タイム：」など）や特殊な記号・カード名の指定を含む文は手動
  const unsafe = /[:：\[{「]/.test(t.replace(/「[^「」]+」(?:と「[^「」]+」)*を与え|「S・トリガー」は使えない/g, ''));
  const trig = kind === 'creature' ? parseTrigger(t) : null;
  if (trig || kind === 'spell') {
    const whens: TriggerEvent[] = trig ? trig.when : ['onCast'];
    const extra = { ...(trig?.who ? { who: trig.who } : {}), ...(trig?.filter ? { filter: trig.filter } : {}), ...(trig?.minDrawCount ? { minDrawCount: trig.minDrawCount } : {}), ...(trig?.oncePerTurn ? { oncePerTurn: true } : {}) };
    const { body, condition } = splitCondition(trig ? trig.rest : t);
    const groups = unsafe || body === null ? null : parseBody(body, opts);
    for (const when of whens) {
      if (!groups) {
        // タイミングは分かるので、その時にログで手動処理を促す
        const text = [line, ...options.map((o) => `▶${o}`)].join(' ').replace(/\s+/g, ' ');
        out.abilities.push({ when, effects: [{ type: 'manual', text }], ...extra });
        continue;
      }
      for (const g of groups) out.abilities.push({ when, effects: g.effects, ...(g.optional ? { optional: true } : {}), ...(condition ? { condition } : {}), ...extra });
    }
    return !!groups;
  }
  if (unsafe) return false;
  const st = parseStatic(t.replace(/。$/, ''));
  if (st) {
    out.statics.push(...st);
    return true;
  }
  return false;
}

/** 「このクリーチャーは攻撃できない」などを、このクリーチャーだけにかかる常在効果にする（条件つきで使う） */
function selfKeywordStatic(t: string): StaticAbility[] | null {
  const kw: Keywords = {};
  if (!applyKeywordLine(t, kw)) return null;
  return [{ type: 'grantKeyword', keywords: kw, appliesTo: { owner: 'self', onlySelf: true } }];
}

/** 侵略・革命チェンジの条件「火のコスト3以上の、コマンドまたはドラゴン」を読む */
function parseSwapCondition(text: string): CardFilter | null {
  const t = civList(text).replace(/、/g, '').replace(/・?クリーチャー$/, '');
  const filter: CardFilter = {};
  const k = t.lastIndexOf('の');
  const mods = k >= 0 ? t.slice(0, k + 1) : '';
  const tail = k >= 0 ? t.slice(k + 1) : t;
  // 「ジョーカーズまたはレクスターズの、クリーチャー」
  const racesOnly = mods.match(/^([^のをにがで「」光水闇火自然]+)の$/);
  if (racesOnly && (!tail || tail === 'クリーチャー')) {
    setRaces(filter, racesOnly[1]);
    return filter;
  }
  if (!parseMods(mods, filter)) return null;
  if (tail && tail !== 'クリーチャー') {
    if (!/^[^、のをにがで「」]+$/.test(tail)) return null;
    setRaces(filter, tail);
  }
  return filter;
}

/** 「このクリーチャーが破壊される時、墓地に置くかわりに自分のマナゾーンに置く」 */
function parseReplacement(t: string): ReplacementAbility | null {
  const m = t.match(/^このクリーチャーが(破壊される|バトルゾーンを離れる|離れる)時、(?:墓地に置く)?かわりに、?(.+)$/);
  if (!m) return null;
  const { text, optional } = stripOptional(m[2].replace(/^(?:自分の|持ち主の)/, ''));
  const INSTEAD: Record<string, ReplacementAbility['instead']> = {
    手札に戻す: 'toHand',
    手札に加える: 'toHand',
    マナゾーンに置く: 'toMana',
    山札の下に置く: 'toDeckBottom',
    山札の一番下に置く: 'toDeckBottom',
    シールド化する: 'toShield',
    バトルゾーンにとどまる: 'stay',
    とどまる: 'stay',
  };
  const instead = INSTEAD[text];
  if (!instead) return null;
  return { event: m[1] === '破壊される' ? 'destroyed' : 'leaveBattle', subject: 'self', instead, ...(optional ? { optional: true } : {}) };
}

/** 能力の行が手動になる理由（読み取りの改良のための調査用） */
export function explainManual(line: string, kind: 'creature' | 'spell' | 'other', options: string[] = []): string {
  const t = normalizeText(line);
  if (kind === 'other') return 'other-type';
  const label = t.match(/^([^、。:：]{1,20})[:：]/);
  if (label) return `label:${label[1].replace(/\d+/g, 'N')}`;
  if (/[\[{「]/.test(t.replace(/「[^「」]+」(?:と「[^「」]+」)*を与え|「S・トリガー」は使えない/g, ''))) return 'mark';
  const trig = kind === 'creature' ? parseTrigger(t) : null;
  if (!trig && kind === 'creature') return `static:${t}`;
  const { body } = splitCondition(trig ? trig.rest : t);
  if (body === null) return 'condition';
  failedAt = null;
  const g = parseBody(body, options.map(normalizeText));
  return g ? 'ok' : `sentence:${failedAt ?? '?'}`;
}
