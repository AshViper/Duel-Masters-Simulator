// 公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。
// よく使われる定型文だけを読み取り、読み取れない文が1つでもある能力は丸ごと「手動処理」にする
// （一部だけ自動処理すると、カードの処理が間違ったまま進んでしまうため）。
// 誘発のタイミングだけ分かる能力は、その時にログで手動処理を促す（manual 効果）。
import type {
  AltPlay,
  EvolveSpec,
  Applies,
  AttackSwap,
  CardFilter,
  Civilization,
  Condition,
  Quantity,
  ReplacementAbility,
  EffectDef,
  Keywords,
  MoveDest,
  StaticAbility,
  TargetSpec,
  TriggeredAbility,
  TriggerEvent,
} from './types';
import { move } from './effects';
import { allLineDefs, type LineDef } from './lineDefs';

export interface ParsedAbilities {
  keywords: Keywords;
  abilities: TriggeredAbility[];
  statics: StaticAbility[];
  /** 進化元の条件 */
  evolvesFrom?: { race?: string; civilization?: Civilization };
  /** NEO進化の進化元 */
  neoEvolution?: CardFilter;
  /** G・ゼロの条件 */
  gZero?: Condition;
  /** シールドゾーンにある時に「S・トリガー」を得る条件 */
  shieldTriggerIf?: Condition;
  /** このカード自身のコスト軽減 */
  selfCost?: { amount: number; per: Quantity; unit: number; min: number };
  /** ハイパー化のコスト */
  hyper?: { count: number; excludeSelf: boolean; filter?: CardFilter };
  /** 侵略・革命チェンジ */
  attackSwap?: AttackSwap;
  /** 置換効果（「破壊される時、かわりに〜」） */
  replacements: ReplacementAbility[];
  /** 条件つきの自分のコスト軽減 */
  condCost?: { amount: number; condition: Condition };
  /** 手札以外から召喚できる */
  summonFrom?: { zones: Array<'graveyard' | 'mana'>; condition?: Condition };
  /** 超魂X：このカードが下にあるクリーチャーにも与える能力 */
  soul?: Pick<ParsedAbilities, 'keywords' | 'abilities' | 'statics' | 'replacements'>;
  /** サバイバー：自分の他のサバイバーにも与える能力（{S} の付いた能力） */
  survivor?: Pick<ParsedAbilities, 'keywords' | 'abilities' | 'statics' | 'replacements'>;
  /** 別のコストでの使い方（リサイクル・キリフダッシュ・ギャラクシールドなど） */
  altPlays?: AltPlay[];
  /** 自分のターンのはじめに、表向きで自分のシールドゾーンにあれば召喚する */
  galaxyReturn?: boolean;
  /** 進化元の指定（マナ進化・墓地進化・進化V/GV・スター進化など） */
  evolveSpec?: EvolveSpec;
  /** NEO進化クリーチャーとして召喚する時のコスト軽減 */
  neoCostReduce?: number;
  /** 手札にある間の誘発 */
  handTriggers?: { when: 'opponentTurnEnd'; condition?: Condition }[];
  /** 覚醒リンクの条件 */
  awakenLink?: { names: string[]; timing: 'turnStart' | 'always' };
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
    .replace(/^この(クリーチャー|ドラグハート)をバトルゾーンに出した時/, 'この$1が出た時')
    .replace(/ひとつ/g, '1つ')
    .replace(/ふたつ/g, '2つ')
    .replace(/みっつ/g, '3つ')
    .replace(/自分自身の/g, '自身の')
    // 言い方の違いをそろえる
    .replace(/バトルゾーンにある(?=自分の|相手の)/g, '')
    .replace(/バトルで勝った時/g, 'バトルに勝った時')
    .replace(/相手がこのクリーチャーを選んだ時/g, 'このクリーチャーが相手に選ばれた時')
    .replace(/パワーは([+-]\d+)される/g, 'パワーを$1する')
    .replace(/(\d+)(体|枚|つ)でもあれば/g, '$1$2以上あれば')
    .replace(/クリーチャー(\d+)体選び/g, 'クリーチャーを$1体選び')
    .replace(/墓地のかわりに/g, '墓地に置くかわりに')
    .replace(/コストが(\d+)以(上|下)の/g, 'コスト$1以$2の')
    .replace(/このクリーチャーの「EXライフ」シールドが離れた時/g, 'このクリーチャーがEXライフシールドを失った時')
    .replace(/(自分|相手)のマナゾーンに(\d+)枚以上カードがあれば/g, '$1のマナゾーンにカードが$2枚以上あれば')
    .replace(/を無限の数、?/g, 'をすべて')
    .replace(/カードをもう(\d+)枚/g, 'カードを$1枚')
    // 「攻撃またはブロックした時」＝「攻撃する時、またはブロックした時」
    .replace(/が攻撃またはブロックした時/g, 'が攻撃する時、またはブロックした時')
    .replace(/カードをさらに(\d+)枚引/g, 'カードを$1枚引')
    // 「相手のシールドが2枚以下ならば」＝「相手のシールドが2つ以下なら」
    .replace(/シールドが(\d+)枚(以下|以上)/g, 'シールドが$1つ$2')
    .replace(/ならば、/g, 'なら、')
    // 「このカードを墓地から手札に戻す」（このクリーチャーが破壊された時）
    .replace(/このカードを(?:自分の)?墓地から/g, 'このクリーチャーを自分の墓地から')
    // 「このクリーチャーは、出たターンの間、ブロックされない」：出たターンだけの条件
    .replace(/各プレイヤーは(\d+)枚ずつカードを引いてもよい/g, 'カードを$1枚引いてもよい。相手はカードを$1枚引いてもよい')
    .replace(/^このクリーチャーは、?(?:バトルゾーンに)?出たターンの間、/, 'このクリーチャーが出たターン、このクリーチャーは')
    // 「バトルゾーンにあるエイリアンはすべて〜」：両方のプレイヤーの
    .replace(/^バトルゾーンにある(?!自分|相手|他|、)([^、。]+?はすべて)/, 'すべての$1')
    // 「その数字と同じコストを持つ相手のクリーチャー」＝「相手の、その数字と同じコストを持つクリーチャー」
    .replace(/((?:その|選んだ)数字と同じコスト(?:の|を持つ))(相手|自分)の/g, '$2の、$1')
    // 「コストを支払わずに自分の手札から唱える」＝「自分の手札からコストを支払わずに唱える」
    .replace(/コストを支払わずに、?(自分の(?:手札|墓地)(?:または(?:手札|墓地))?から)/g, '$1コストを支払わずに')
    // 「山札の上から10枚を表向きにし、その中から〜」「4枚を見て、そのうちの〜」は2つの文として読む
    .replace(/(山札(?:の上|を、?上)から\d+枚(?:目まで)?を)見て、(?=その)/g, '$1見る。')
    .replace(/表向きにし、(?=その(?:中|うち|\d+体))/g, '表向きにする。')
    // 「相手のマナゾーンにあるカードの枚数よりコストが大きい相手のクリーチャー」：持ち主のマナの枚数と比べる修飾語にまとめる
    .replace(/(?:相手|自分)のマナゾーンにあるカードの枚数よりコストが大きい(相手|自分)の/g, '$1のコストがマナ枚数より大きい');
}

/** 能力の文ごとの効果定義（lineDefs.ts）を、照合用にそろえたキーで引く表。定義が変わったら作り直す */
let lineDefTable: { revision: number; map: Map<string, LineDef> } | null = null;

/** 照合用のキー：全角・半角、空白、カッコの補足説明の違いをなくす。選択肢は「▶」でつなぐ */
export function lineDefKey(line: string, options: string[] = []): string {
  return [...line.split(/[▶►]/), ...options]
    .map((x) => stripIcons(normalizeText(x)).replace(/。$/, ''))
    .filter(Boolean)
    .join('▶');
}

function findLineDef(line: string, options: string[]): LineDef | undefined {
  const { defs, revision } = allLineDefs();
  if (!lineDefTable || lineDefTable.revision !== revision) {
    lineDefTable = { revision, map: new Map(Object.entries(defs).map(([k, v]) => [lineDefKey(k), v])) };
  }
  return lineDefTable.map.get(lineDefKey(line, options));
}

/** 能力の頭に付くアイコン（{2W} W・ブレイカーなど、キーワードの名前と同じ意味のもの） */
const PLAIN_ICON = /\{(?:\d?[WTQ]|PP|GS|ST|SST|SG|STP)\}/g;
function stripIcons(t: string): string {
  return t.replace(PLAIN_ICON, '');
}

/** normalizeText と同じだが、語の区切りの空白を1つ残す（キーワードが並んだ行の判定用） */
function normalizeKeepSpace(s: string): string {
  let t = s.normalize('NFKC').replace(/[−‐－–]/g, '-').replace(/️/g, '');
  for (let i = 0; i < 3; i++) t = t.replace(/\([^()]*\)/g, '');
  return stripIcons(t).replace(/[\s　]+/g, ' ').trim();
}

/**
 * キーワード能力・決まった言い方の能力の表：言い方（完全一致の文字列・その候補・正規表現）→ 付く Keywords。
 * 言い方の揺れは候補を足し、新しいキーワードは1行足す（エンジンが Keywords を見て処理する）。
 * 「このクリーチャーは、」は「このクリーチャーは」にそろえてから引く
 */
const KEYWORD_LINES: [string | string[] | RegExp, Keywords | ((m: RegExpMatchArray | string[]) => Keywords)][] = [
  ['マッハファイター', { machFighter: true }],
  ['パワード・ブレイカー', { poweredBreaker: true }],
  ['チャージャー', { charger: true }],
  ['EXライフ', { exLife: true }],
  ['エクストラEXライフ', { extraExLife: true }],
  ['メガ・ラスト・バースト', { megaLastBurst: true }],
  ['シールド・ゴー', { shieldGo: true }],
  ['ガードマン', { guardman: true }],
  ['スーパーガードマン', { superGuardman: true }],
  ['マナゾーンに置く時、このカードはタップして置く', { manaTapped: true }],
  ['自分の山札の最後の1枚を引く時、ゲームに負けるかわりに勝つ', { winOnLastDraw: true }],
  ['ジャストダイバー', { justDiver: true }],
  [/^コスト(\d+)以下の呪文(?:の効果)?によって、相手がクリーチャーを選ぶ時、このクリーチャーは選べない$/, (m) => ({ untargetableBySpellCost: Number(m[1]) })],
  ['このカードがバトルゾーン以外のゾーンにあれば、自分はゲームに負ける', { loseIfNotInBattle: true }],
  ['G・ストライク', { gStrike: true }],
  ['このクリーチャーはブロックできない', { cannotBlock: true }],
  ['このクリーチャーは攻撃されない', { cannotBeAttacked: true }],
  [['相手はこのクリーチャーを選べない', 'このクリーチャーは相手に選ばれない'], { untargetable: true }],
  ['このクリーチャーは攻撃もブロックもできない', { cannotAttack: true, cannotBlock: true }],
  ['このクリーチャーがシールドをブレイクする時、相手はそのシールドを手札に加えるかわりに墓地に置く', { shieldBurn: true }],
  ['ブロッカー', { blocker: true }],
  [['S・トリガー', 'S·トリガー', 'スーパー・S・トリガー', 'S・トリガー・プラス'], { shieldTrigger: true }],
  ['スピードアタッカー', { speedAttacker: true }],
  ['スレイヤー', { slayer: true }],
  ['W・ブレイカー', { breaker: 2 }],
  ['T・ブレイカー', { breaker: 3 }],
  ['Q・ブレイカー', { breaker: 4 }],
  ['ワールド・ブレイカー', { breaker: 99 }],
  [/^パワーアタッカー\+(\d+)$/, (m) => ({ powerAttacker: Number(m[1]) })],
  ['このクリーチャーは相手プレイヤーを攻撃できない', { cannotAttackPlayers: true }],
  ['このクリーチャーはクリーチャーを攻撃できない', { cannotAttackCreatures: true }],
  ['このクリーチャーは攻撃できない', { cannotAttack: true }],
  ['このクリーチャーはブロックされない', { unblockable: true }],
  [['このクリーチャーはアンタップしているクリーチャーを攻撃できる', 'このクリーチャーはアンタップされているクリーチャーを攻撃できる'], { attackUntapped: true }],
  ['このクリーチャーはすべてのバトルに勝つ', { winsAllBattles: true }],
  ['このクリーチャーは自分のターンのはじめにアンタップしない', { noUntap: true }],
  ['ハンティング', { hunting: true }],
  [/^ササゲール(\d+)$/, (m) => ({ sasageru: Number(m[1]) })],
  [/^(?:バトル中、このクリーチャーのパワーを\+(\d+)する|このクリーチャーのパワーは、?バトル中、?\+(\d+)される)$/, (m) => ({ battlePower: Number(m[1] ?? m[2]) })],
  [['このクリーチャーはバトルに勝った時、破壊される', 'このクリーチャーがバトルに勝った時、このクリーチャーを破壊する'], { suicideOnWin: true }],
  ['相手がクリーチャーを選ぶなら、可能ならこのクリーチャーを選ぶ', { lure: true }],
  ['このクリーチャーの攻撃中、相手は「G・ストライク」を使えない', { noGStrikeAgainst: true }],
  ['水晶チャージャー', { crystalCharger: true }],
  ['ハイパーエナジー', { hyperEnergy: true }],
  ['Zラッシュ', { zRush: true }],
  // ∞パワーアタッカー：攻撃中、パワーが無限大になる
  ['攻撃中、このクリーチャーのパワーは無限大になる', { powerAttacker: 1_000_000_000 }],
  // 補足説明の言い方：「このクリーチャーはシールドを6つブレイクする」（H・ブレイカーなど）、Evoチャージャー
  [/^このクリーチャーはシールドを(\d+)(?:つ|枚)?ブレイクする$/, (m) => ({ breaker: Number(m[1]) })],
  ['この呪文を唱えた後、墓地に置くかわりに自分のマナゾーンに置く', { charger: true }],
  ['相手のターンに相手のクリーチャーが出て、その能力がトリガーした時、自分もその能力を使ってもよい', { mimicEnemySummon: true }],
  [['相手が自分のクリーチャーを選ぶ時、相手は可能ならこのクリーチャーを選ぶ', '相手が自分のクリーチャーを選ぶ時、可能ならこのクリーチャーを選ぶ'], { lure: true }],
  [
    /^(?:相手のクリーチャーが攻撃する(?:なら|時)、|相手のクリーチャーは、?|このクリーチャーがタップされている間、相手の攻撃クリーチャーは)可能(?:なら|であれば)このクリーチャーを攻撃する$/,
    { attackLure: true },
  ],
  [/^このクリーチャーは(?:パワーがこのクリーチャーより小さい|このクリーチャーよりパワーが小さい)クリーチャーにブロックされない$/, { unblockableBySmaller: true }],
  ['このクリーチャーはこれよりコストが小さいクリーチャーに攻撃されない', { cannotBeAttackedBySmallerCost: true }],
  ['バトルゾーンに置く時、このカードはタップして置く', { entersTapped: true }],
  [/^(?:パワード・ブロッカー\+(\d+)|ブロック中、このクリーチャーのパワーを\+(\d+)する)$/, (m) => ({ blockPower: Number(m[1] ?? m[2]) })],
  [/^(.+?)とバトル中、このクリーチャーのパワーを\+(\d+)する$/, (m) => ({ battlePowerVs: { race: m[1].replace(/・?クリーチャー$/, ''), amount: Number(m[2]) } })],
];

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
  for (const [match, value] of KEYWORD_LINES) {
    const m = typeof match === 'string' ? (t === match ? [t] : null) : Array.isArray(match) ? (match.includes(t) ? [t] : null) : t.match(match);
    if (m) return !!Object.assign(kw, typeof value === 'function' ? value(m) : value);
  }
  return false;
}

// ───────────────────────── 誘発タイミング ─────────────────────────

/**
 * 誘発の出来事の表：言い方 → このクリーチャー自身に起きた時（self）／他のクリーチャーに起きた時（other）。
 * 新しいタイミングはここに1行足し、エンジンの emit でその出来事を誘発させるだけでよい。
 * ownIncludesSelf: 「自分のクリーチャーが〜時」（「他の」なし）はこのクリーチャー自身にも誘発する
 */
const EVENTS: { re: RegExp; self?: TriggerEvent; other?: TriggerEvent; ownIncludesSelf?: boolean }[] = [
  { re: /^(?:召喚によって)?(?:バトルゾーンに)?出た時/, self: 'onSummon', other: 'onOtherSummon', ownIncludesSelf: true },
  { re: /^攻撃する時/, self: 'onAttack', other: 'onOtherAttack' },
  { re: /^破壊された時/, self: 'onDestroyed', other: 'onOtherDestroyed' },
  { re: /^(?:バトルゾーンを)?離れた時/, self: 'onLeave', other: 'onOtherLeave' },
  { re: /^ブロック(?:した|する)時/, self: 'onBlock' },
  { re: /^進化する時/, self: 'onEvolved' },
  { re: /^(?:龍解|覚醒)した時/, self: 'onAwaken' },
  { re: /^相手プレイヤーを攻撃してブロックされなかった時/, self: 'onUnblocked' },
  { re: /^EXライフシールドを失った時/, self: 'onExLifeLeft' },
  { re: /^禁断解放した時/, self: 'onUnleash' },
  { re: /^バトルに勝った時/, self: 'onBattleWin', other: 'onOtherBattleWin' },
  { re: /^タップした時/, self: 'onTap' },
  { re: /^攻撃された時/, self: 'onAttacked' },
  { re: /^相手に選ばれた時/, self: 'onTargeted' },
];
/** 「このクリーチャーが」に続く1つの出来事 */
const SELF_EVENTS: [RegExp, TriggerEvent][] = EVENTS.filter((e) => e.self).map((e) => [e.re, e.self!]);
/** 主語なしで書ける出来事（「〜時または自分のターンのはじめに」） */
const TURN_EVENTS: [RegExp, TriggerEvent][] = [
  [/^自分のターンのはじめに/, 'onTurnStart'],
  [/^自分のターンの終わりに/, 'onTurnEnd'],
];

/** subject: 誘発の原因になったカードがある（本文の「そのクリーチャー」で指せる） */
type ParsedTrigger = { when: TriggerEvent[]; who?: TriggeredAbility['who']; filter?: CardFilter; minDrawCount?: number; oncePerTurn?: boolean; subject?: boolean; duringTurn?: 'self' | 'opponent'; rest: string };

/**
 * プレイヤーが主語の誘発：「相手がカードを実行した時」「相手が自身の手札を1枚捨てた時」「カードが自分のシールドゾーンに置かれた時」。
 * 新しい言い方はここに1行足し、エンジンの emit でその出来事を誘発させる。subject: 原因のカードを「それ」で指せる
 */
const PLAYER_EVENTS: { re: RegExp; when: TriggerEvent; filter?: CardFilter }[] = [
  { re: /^(自分|相手)がカードを(?:実行|使用)した時、/, when: 'onPlay' },
  { re: /^(自分|相手)が呪文を唱えた時、/, when: 'onSpellCast' },
  { re: /^(自分|相手)が(?:自身の)?手札を(?:1枚)?捨てた時、/, when: 'onDiscard' },
  { re: /^(自分|相手)が手札から呪文を捨てた時、/, when: 'onDiscard', filter: { cardType: 'spell' } },
  { re: /^カードが(自分|相手)のシールドゾーンに置かれた時、/, when: 'onShieldAdded' },
  { re: /^カードが(自分|相手)のシールドゾーンを離れた時、/, when: 'onShieldLeft' },
];

/**
 * 他のクリーチャーが主語の誘発：「自分の他のドラゴンが破壊された時、」「相手のクリーチャーが攻撃する時、」
 * 「このクリーチャーまたは自分のコスト6以上のクリーチャーが出た時、」（orSelf）
 */
function parseOtherTrigger(t: string): ParsedTrigger | null {
  // 「自分の他のエンジェル・コマンドをバトルゾーンに出した時」＝「〜が出た時」
  t = t.replace(/^((?:自分|相手)の[^、。]+?)を(?:バトルゾーンに)?出した時、/, '$1が出た時、');
  const orSelf = t.startsWith('このクリーチャーまたは');
  const body = orSelf ? t.slice('このクリーチャーまたは'.length) : t;
  const head = body.match(/^(?:(自分|相手)の)?(他の)?、?/)!;
  const owner = head[1];
  // 持ち主の書いていない「クリーチャーが破壊された時」「他のクリーチャーが離れた時」は両方のプレイヤーのクリーチャー
  if (!owner && !orSelf && !/^(?:他の)?[^、。この]*クリーチャーが/.test(body)) return null;
  for (let i = body.indexOf('が', head[0].length); i > 0; i = body.indexOf('が', i + 1)) {
    const after = body.slice(i + 1);
    const ev = EVENTS.find((e) => e.other && e.re.test(after));
    if (!ev) continue;
    const rest = after.slice(after.match(ev.re)![0].length);
    if (!rest.startsWith('、')) continue;
    const filter: CardFilter = {};
    if (!parseSubject(body.slice(head[0].length, i), filter)) return null;
    if (head[2]) filter.excludeSelf = true;
    const who: TriggeredAbility['who'] = owner === '自分' ? 'self' : owner === '相手' ? 'opponent' : 'any';
    const f = Object.keys(filter).length ? { filter } : {};
    if (orSelf) return { when: [ev.self!, ev.other!], who, ...f, subject: true, rest: rest.slice(1) };
    // 「自分のクリーチャーが出た時」：このクリーチャー自身も含む。条件つきだと自身が合うか分からないので読まない
    if (ev.ownIncludesSelf && owner !== '相手' && !head[2]) {
      return { when: [ev.self!, ev.other!], who, ...f, subject: true, rest: rest.slice(1) };
    }
    return { when: [ev.other!], who, ...f, subject: true, rest: rest.slice(1) };
  }
  return null;
}

/** 文頭の誘発条件を読む。「このクリーチャーが出た時または攻撃する時、」のような組み合わせにも対応 */
function parseTrigger(t: string): ParsedTrigger | null {
  // 「各ターンに1度、〜時、」
  const once = t.match(/^各ターンに(?:1|一)度、(.+)$/);
  if (once) {
    const r = parseTrigger(once[1]);
    return r && { ...r, oncePerTurn: true };
  }
  // 「各ターン、このクリーチャーがはじめて攻撃する時、」「各ターン、はじめて相手のクリーチャーがタップした時、」
  const first = t.match(/^各ターン、(.*?)はじめて、?(.+)$/) ?? t.match(/^各ターン、(このクリーチャーの)最初の(攻撃の終わりに、.+)$/);
  if (first) {
    const r = parseTrigger(first[1] + first[2]);
    return r && { ...r, oncePerTurn: true };
  }
  // 「カードがこのクリーチャーの下を離れた時、」「カードが自分のクリーチャーの下を離れた時、」
  const under = t.match(/^カードが(この|自分の)クリーチャーの下を離れた時、(.+)$/);
  if (under) return { when: [under[1] === 'この' ? 'onUnderLeft' : 'onOwnUnderLeft'], rest: under[2] };
  // 「このクリーチャーの各ブレイクの前に、」
  const bb = t.match(/^(?:このクリーチャーの)?各ブレイクの前に、(.+)$/);
  if (bb) return { when: ['onBeforeBreak'], rest: bb[1] };
  if (t.startsWith('このクリーチャーの攻撃の終わりに、')) return { when: ['onAttackEnd'], rest: t.slice('このクリーチャーの攻撃の終わりに、'.length) };
  // 「相手のターンにこのクリーチャーが出た時、」
  const turnOf = t.match(/^(自分|相手)のターン(?:中)?に、?(この(?:クリーチャー|タマシード)が.+)$/);
  if (turnOf) {
    const r = parseTrigger(turnOf[2]);
    return r && { ...r, duringTurn: turnOf[1] === '自分' ? 'self' : 'opponent' };
  }
  // 「自分が、コスト5以上の、クリーチャーではないカードを実行した時、」：使ったカードの条件つき
  const played = t.match(/^(自分|相手)が、?(.+?)(カード|クリーチャー|呪文)を(?:実行|使用)した時、(.+)$/);
  if (played && played[2] !== '') {
    const filter: CardFilter = played[3] === 'カード' ? {} : { cardType: played[3] === '呪文' ? 'spell' : 'creature' };
    if (parseMods(played[2], filter)) return { when: ['onPlay'], who: played[1] === '自分' ? 'self' : 'opponent', filter, subject: true, rest: played[4] };
  }
  for (const pe of PLAYER_EVENTS) {
    const pm = t.match(pe.re);
    if (pm) return { when: [pe.when], who: pm[1] === '自分' ? 'self' : 'opponent', ...(pe.filter ? { filter: pe.filter } : {}), subject: true, rest: t.slice(pm[0].length) };
  }
  const other = parseOtherTrigger(t);
  if (other) return other;
  let m: RegExpMatchArray | null;
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
      // タマシードの「このタマシードが出た時」も同じ
      const sm = rest.match(/^この(?:クリーチャー|タマシード|ドラグハート|フィールド|D2フィールド)(?:が|を(?=バトルゾーンに出した時))?/);
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

// ───────────────────────── 文の読み取り ─────────────────────────

/** 「〜てもよい」を普通の動詞に戻す */
function stripOptional(s: string): { text: string; optional: boolean } {
  const m = s.match(/^(.*?)(て|で)もよい$/);
  if (!m) return { text: s, optional: false };
  const body = m[1];
  const ends: [string, string][] = [
    ['引い', '引く'], ['置い', '置く'], ['戻し', '戻す'], ['出し', '出す'], ['加え', '加える'], ['捨て', '捨てる'],
    ['し', 'する'], ['見', '見る'], ['選ん', '選ぶ'], ['唱え', '唱える'], ['させ', 'させる'],
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
    [/^コスト(\d+)の/, (x) => (filter.minCost = filter.maxCost = n(x[1]))],
    [/^タップしている/, () => (filter.tapped = true)],
    [/^アンタップしている/, () => (filter.untapped = true)],
    [/^(光|水|闇|火|自然)の/, (x) => (filter.civilization = CIV[x[1]])],
    [/^((?:光|水|闇|火|自然)(?:または(?:光|水|闇|火|自然))+)の/, (x) => (filter.civilizations = x[1].split('または').map((c) => CIV[c]))],
    [/^進化(?:クリーチャー)?で(?:は)?ない/, () => (filter.nonEvolution = true)],
    [/^クリーチャーではない/, () => (filter.not = { cardType: 'creature' })],
    [/^サイキックではない/, () => undefined],
    // 「闇ではない」「多色ではない」「ドラゴンではない」：その条件に合わないもの
    [/^(光|水|闇|火|自然|無色|多色)ではない/, (x) => (filter.not = x[1] === '多色' ? { multicolor: true } : { civilization: x[1] === '無色' ? 'zero' : CIV[x[1]] })],
    [/^([^、のをにがで「」]+?)ではない/, (x) => (filter.not = { race: x[1].replace(/・?クリーチャー$/, '') })],
    [/^種族に([^、のをにがで「」]+?)とある/, (x) => (filter.race = x[1])],
    [/^(?:その|選んだ)数字と同じコスト(?:の|を持つ)/, () => (filter.costIsChosenNumber = true)],
    [/^ツインパクト/, () => (filter.twinpact = true)],
    [/^サイキック以外の/, () => (filter.not = { typeLabelIncludes: 'サイキック' })],
    [/^「([^「」]+)」(?:を持つ|付きの|つきの)/, (x) => {
      const kw: Keywords = {};
      if (!applyKeywordLine(x[1], kw) || Object.keys(kw).length !== 1) throw new Error('unknown keyword');
      filter.hasKeyword = Object.keys(kw)[0] as keyof Keywords;
    }],
    [/^無色の/, () => (filter.civilization = 'zero')],
    [/^進化クリーチャー以外の/, () => (filter.nonEvolution = true)],
    [/^多色の?/, () => (filter.multicolor = true)],
    [/^進化(?=$)/, () => (filter.evolution = true)],
    [/^(?:一番パワーが|パワーが一番)(大きい|小さい)/, (x) => (filter.extremePower = x[1] === '大きい' ? 'highest' : 'lowest')],
    [/^これより(パワー|コスト)が(小さい|大きい)/, (x) => (filter.relativeToSource = { stat: x[1] === 'パワー' ? 'power' : 'cost', cmp: x[2] === '小さい' ? 'less' : 'greater' })],
    [/^このクリーチャーより(パワー|コスト)が(小さい|大きい)/, (x) => (filter.relativeToSource = { stat: x[1] === 'パワー' ? 'power' : 'cost', cmp: x[2] === '小さい' ? 'less' : 'greater' })],
    [/^名前に《([^》]+)》とある/, (x) => (filter.nameIncludes = x[1])],
    [/^コストがマナ枚数より大きい/, () => (filter.costAboveOwnerMana = true)],
    // 直前に選んだ（捨てた・戻した）カードと比べる
    [/^(?:その捨てたカード|それ|そのクリーチャー|そのカード)と(?:同じコストの|コストが同じ)/, () => (filter.refCost = 'eq')],
    [/^(?:その捨てたカード|それ|そのクリーチャー)以下のコストの/, () => (filter.refCost = 'le')],
    [/^(?:その捨てたカード|それ|そのクリーチャー)と同じ文明を持つ/, () => (filter.refCivs = true)],
    // 「サイキック・クリーチャー」：超次元ゾーンから出すクリーチャー（種族ではない）
    [/^サイキック・(?:スーパー・)?$/, () => undefined],
    // 種族：「ドラゴン・」「アビス・」（後ろに クリーチャー/カード が続く）。「AまたはB・」もある
    [/^([^、のをにがで「」・]+(?:・[^、のをにがで「」・]+)*?)・$/, (x) => setRaces(filter, x[1])],
  ];
  while (m) {
    const r = rules.find(([re]) => re.test(m));
    if (!r) return false;
    const x = m.match(r[0])!;
    try {
      r[1](x);
    } catch {
      return false;
    }
    m = m.slice(x[0].length);
  }
  return true;
}

/** 「水、闇、または火」→「水または闇または火」 */
function civList(s: string): string {
  return s.replace(/(光|水|闇|火|自然)、(?:または)?(?=光|水|闇|火|自然)/g, '$1または');
}

function setRaces(filter: CardFilter, text: string): void {
  const races = text.split('または').map((r) => r.replace(/・?(?:クリーチャー|カード)$/, ''));
  if (races.length === 1) filter.race = races[0];
  else filter.races = races;
}

const ZONE_WORD: Record<string, TargetSpec['zone']> = { 墓地: 'graveyard', マナゾーン: 'mana', 手札: 'hand', シールドゾーン: 'shield', 山札: 'deck', 超次元ゾーン: 'hyperspatial' };

/** 移動元・場所の言い方 */
const FROM_RE = /(自分|相手)の(墓地|マナゾーン|手札|シールドゾーン|超次元ゾーン)(?:から|にある|の(?=[^、]*?(?:カード|クリーチャー|呪文)を))、?/;

/**
 * 対象の言い方（目的語）を読む：「相手の、パワー3000以下のクリーチャーを1体」「コスト5以下のドラゴンを2体まで、自分の墓地から」
 * 「自分のマナゾーンにあるカードを好きな数」など。残りの動詞部分も返す
 */
function parseObject(s: string): { target: TargetSpec; noun: string; filter: CardFilter; explicitOwner: boolean; verb: string } | null {
  let text = s.replace(/^(相手|自分)の、/, '$1の').replace(/^バトルゾーンにある、?/, '');
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
    /^(相手の|自分の)?(好きな数の)?(.*?)(クリーチャー|エレメント|カード|シールド|呪文|手札|ドラグハート)?を、?(?:(\d+)(?:体|枚|つ)(まで)?|(すべて)|(好きな(?:数|枚数)))(?:選び|選んで)?、?(.+)$/,
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
  // ドラグハート：カードの種類で絞る（クリーチャーではない）
  if (noun === 'ドラグハート') filter.typeLabelIncludes = 'ドラグハート';
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
  const fromAfter = verb.match(/^(自分|相手)の(墓地|マナゾーン|手札|シールドゾーン|超次元ゾーン)(?:または(墓地|マナゾーン|手札))?から、?/);
  let extraZones: TargetSpec['zone'][] | undefined;
  if (fromAfter && !fromZone) {
    owner = fromAfter[1] === '自分' ? 'self' : 'opponent';
    zone = ZONE_WORD[fromAfter[2]];
    if (fromAfter[3]) extraZones = [ZONE_WORD[fromAfter[3]]];
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
    ...(extraZones ? { extraZones } : {}),
  };
  return { target, noun, filter, explicitOwner: !!ownerWord || fromZone, verb };
}

type Zone = TargetSpec['zone'];
type VerbRule = { re: RegExp; zones: Zone[]; build: (t: TargetSpec, m: RegExpMatchArray) => EffectDef | null };

/**
 * 移動の言い方の表：言い方 → 移動先と、動かせる元のゾーン。
 * 新しい言い方・新しい元のゾーンはこの表に1行（または from に1語）足すだけで、エンジンの変更はいらない
 * （エンジンは move 1つで全部の移動を処理する）。
 * tapped: この言い方が「タップして置く」を含む。creatureOnly: クリーチャーだけが対象（「出す」）
 */
const MOVE_VERBS: { re: RegExp; to: MoveDest; from: Zone[]; tapped?: RegExp; creatureOnly?: boolean }[] = [
  { re: /^手札に(?:戻す|加える)$/, to: 'hand', from: ['battle', 'shield', 'graveyard', 'mana'] },
  { re: /^(?:タップして)?マナゾーンに(?:タップして)?置く$/, to: 'mana', from: ['battle', 'hand', 'graveyard', 'shield', 'deck'], tapped: /タップして/ },
  { re: /^墓地に置く$/, to: 'graveyard', from: ['battle', 'hand', 'mana', 'shield', 'deck'] },
  { re: /^捨てる$/, to: 'graveyard', from: ['hand'] },
  { re: /^(?:好きな順序で)?山札の(?:一番)?下に(?:置く|戻す)$/, to: 'deckBottom', from: ['battle', 'hand', 'mana', 'graveyard', 'shield'] },
  { re: /^(?:好きな順序で)?山札の(?:一番)?上に(?:置く|戻す)$/, to: 'deckTop', from: ['battle', 'hand', 'mana', 'graveyard', 'shield'] },
  {
    re: /^(?:裏向きにして)?(?:新しい)?シールド(?:化する|ゾーンに(?:裏向きにして)?置く|に加える|として(?:シールドゾーンに)?(?:置く|加える))$/,
    to: 'shield',
    from: ['battle', 'hand', 'graveyard', 'mana'],
  },
  { re: /^(?:バトルゾーンに)?出す$/, to: 'battle', from: ['hand', 'graveyard', 'mana', 'hyperspatial'], creatureOnly: true },
  { re: /^(?:表向きで|表向きにして|裏向きにして)?、?このクリーチャーの下に(?:重ねて)?置く$/, to: 'under', from: ['hand', 'graveyard', 'mana'] },
];

/** 移動以外の動詞の一覧。どのゾーンのカードに使えるかと、作る効果 */
const VERBS: VerbRule[] = [
  { re: /^破壊する$/, zones: ['battle'], build: (t) => ({ type: 'destroy', target: t }) },
  { re: /^タップする$/, zones: ['battle', 'mana'], build: (t) => ({ type: 'tap', target: t }) },
  { re: /^アンタップする$/, zones: ['battle', 'mana'], build: (t) => ({ type: 'untap', target: t }) },
  { re: /^(?:それぞれ)?タップまたはアンタップする$/, zones: ['battle'], build: (t) => ({ type: 'tapOrUntap', target: t }) },
  { re: /^(?:相手は)?(?:それら?に|そのクリーチャーに)?封印を1つ(?:ずつ)?付ける$/, zones: ['battle'], build: (t) => ({ type: 'seal', target: t }) },
  ...MOVE_VERBS.map(
    (r): VerbRule => ({
      re: r.re,
      zones: r.from,
      build: (t, m) =>
        move(r.creatureOnly && !t.filter?.typeLabelIncludes ? { ...t, filter: { ...(t.filter ?? {}), cardType: 'creature' } } : t, r.to, r.tapped?.test(m[0]) ? { tapped: true } : {}),
    }),
  ),
];

/** 「このクリーチャーを〜」の動詞部分：移動の言い方の表（MOVE_VERBS）をそのまま使う */
function parseSelfVerb(verb: string): EffectDef | null {
  // 「（このクリーチャーを）自分の墓地から手札に戻す」：破壊された後の墓地のこのカード
  const v = verb.replace(/^(?:自分の)?墓地から、?/, '').replace(/^(?:持ち主の|自分の)/, '');
  if (v === '破壊する') return { type: 'selfAction', action: 'destroy' };
  if (v === 'タップする') return { type: 'selfAction', action: 'tap' };
  if (v === 'アンタップする') return { type: 'selfAction', action: 'untap' };
  for (const r of MOVE_VERBS) {
    if (r.to === 'battle' || r.to === 'under' || !r.from.includes('battle')) continue;
    const m = v.match(r.re);
    if (m) return { type: 'selfAction', action: r.to, ...(r.tapped?.test(m[0]) ? { tapped: true } : {}) };
  }
  return null;
}

/** 「パワーを0にする」をパワー修正で表す時の下げ幅 */
const POWER_ZERO = 1_000_000;

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
  // 「このターン、そのクリーチャーのパワーを0にする」：どれだけ大きく下げても0で止まるので、十分に大きく下げる
  if (/^(?:このターン、)?(?:その|それの|それらの)パワーを0にする$/.test(verb)) return zone === 'battle' ? [{ type: 'powerMod', target, amount: -POWER_ZERO }] : null;
  if (/^(?:その(?:選んだ)?クリーチャーと)?このクリーチャー(?:と|を)(?:その(?:選んだ)?クリーチャーと)?バトルさせる$/.test(verb)) return zone === 'battle' ? [{ type: 'fight', target }] : null;
  // 「裏向きにして持ち主のシールドに加える」：行き先の持ち主の書き方は、どこにあっても読み飛ばす
  const v = verb.replace(/(?:持ち主の|自分の|相手の|自身の)/g, '');
  for (const r of VERBS) {
    if (!r.zones.includes(zone) || (target.extraZones ?? []).some((z) => !r.zones.includes(z))) continue;
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
  if (t === 'アンタップしない') return { noUntap: true };
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
  // 「水のハンター」「コスト5以上のドラゴン」：修飾語＋種族
  const k = t.lastIndexOf('の');
  if (k > 0 && /^[^、のをにがで「」]+$/.test(t.slice(k + 1))) {
    const tmp: CardFilter = {};
    if (!parseMods(t.slice(0, k + 1), tmp)) return false;
    Object.assign(filter, tmp);
    setRaces(filter, t.slice(k + 1).replace(/・$/, ''));
    return true;
  }
  if (!/^[^、のをにがで「」]+$/.test(t)) return false;
  setRaces(filter, t.replace(/・$/, ''));
  return true;
}

/**
 * 「それ」「そのクリーチャー」が指すもの：同じ能力で前に選んだカードがあればそれ（chosen）、
 * なければ誘発の原因になったカード（event：「相手のクリーチャーが出た時、そのクリーチャーは〜」）
 */
const refCtx = { event: false, chosen: false };

function refTarget(): TargetSpec | null {
  const ref = refCtx.chosen ? 'chosen' : refCtx.event ? 'event' : null;
  return ref && { owner: 'any', zone: 'battle', count: 'all', ref };
}

/** 「その呪文」「選んだカード」：どのゾーンにあっても指す */
function refAnyZone(): TargetSpec | null {
  const t = refTarget();
  return t && { ...t, anyZone: true };
}

/** 効果がカードを選ぶ（動かす）か：後の文の「それ」が指せる */
function choosesCards(e: EffectDef): boolean {
  if (e.type === 'discardRandom' || e.type === 'discardUnder' || e.type === 'deckTopTo' || e.type === 'lookAtTop') return true;
  return 'target' in e && typeof e.target === 'object' && !e.target.ref;
}

/** 「それ」「そのクリーチャー」が主語・目的語の文 */
function parseRefSentence(s: string): EffectDef[] | null {
  let m = s.match(/^(このターン|次の自分のターンのはじめまで)、(?:その(?:クリーチャー)?|それ)は、?(.+)$/);
  if (m) {
    const target = refTarget();
    const kw = parseGrant(m[2]);
    return target && kw && [{ type: 'grantKeyword', target, keywords: kw, ...(m[1] !== 'このターン' ? { untilNextTurn: true } : {}) }];
  }
  // 「次の相手のターンのはじめに、それらはアンタップしない」
  if (/^(?:次の相手のターンのはじめに、(?:それら?|その(?:クリーチャー)?|それらのクリーチャー)は|(?:それら?|そのクリーチャー|それらのクリーチャー)は、?次の相手のターンのはじめに)アンタップ(?:し|され)ない$/.test(s)) {
    const target = refTarget();
    return target && [{ type: 'grantKeyword', target, keywords: { noUntap: true }, untilNextTurn: true }];
  }
  // 「次の自分のターンのはじめまで、そのクリーチャーのパワーを+4000し、「ブロッカー」を与える」
  m = s.match(/^(このターン|次の自分のターンのはじめまで)、(?:その(?:クリーチャー)?|それ)のパワーを([+-]\d+)し、(「.+」を与え)る$/);
  if (m) {
    const target = refTarget();
    const kw = parseGrant(`${m[3]}る`);
    const until = m[1] !== 'このターン' ? { untilNextTurn: true } : {};
    return target && kw && [{ type: 'powerMod', target, amount: n(m[2]), ...until }, { type: 'grantKeyword', target, keywords: kw, ...until }];
  }
  // 「このターン、そのクリーチャーのパワーを-3000する」「そのクリーチャーのパワーを0にする」
  m = s.match(/^(?:このターン、)?(?:その(?:クリーチャー)?|それ)のパワーを(?:([+-]\d+)する|(0)にする)$/);
  if (m) {
    const target = refTarget();
    return target && [{ type: 'powerMod', target, amount: m[2] ? -POWER_ZERO : n(m[1]) }];
  }
  m = s.match(/^(?:相手は、?)?(?:それ|そのクリーチャー)を、?(.+)$/);
  if (m) {
    const target = refTarget();
    if (!target) return null;
    const v = m[1].replace(/^(?:持ち主の|自分の|相手の|自身の)/, '');
    for (const r of VERBS) {
      if (!r.zones.includes('battle')) continue;
      const vm = v.match(r.re);
      if (vm) {
        const e = r.build(target, vm);
        return e && [e];
      }
    }
  }
  return null;
}

/** 1つの文を効果にする。読めなければ null */
function parseSentence(s: string): EffectDef[] | null {
  let m: RegExpMatchArray | null;
  s = s.replace(/^(一番パワーが(?:大きい|小さい)|このクリーチャーより(?:パワー|コスト)が(?:小さい|大きい)|(?:その捨てたカード|そのクリーチャー|それ)(?:と同じコストの|以下のコストの|と同じ文明を持つ、?))(相手|自分)の/, '$2の$1');
  s = s.replace(/^そのターン、/, 'このターン、');
  const ref = parseRefSentence(s);
  if (ref) return ref;
  if (s === '数字を1つ選ぶ') return [{ type: 'chooseNumber' }];
  // 覚醒・龍解・解除・ループ覚醒：このカードを裏返す
  if (/^この(?:クリーチャー|ドラグハート)を、?(?:コスト(?:が|の)大きいほうに|クリーチャー側に)裏返す$/.test(s)) return [{ type: 'flipSelf', to: 'back' }];
  if (/^このドラグハートを、?クリーチャー側に裏返し、アンタップする$/.test(s)) return [{ type: 'flipSelf', to: 'back', untap: true }];
  if (/^この(?:クリーチャー|ドラグハート)を、?(?:コスト(?:が|の)小さいほうに|フォートレス側に|ウエポン側に)裏返す$/.test(s)) return [{ type: 'flipSelf', to: 'front' }];
  if (/^このクリーチャーを、?《[^》]+》のほうに裏返す$/.test(s)) return [{ type: 'flipSelf', to: 'toggle' }];
  // メテオバーン覚醒：「このクリーチャーの下にあるカードをすべて墓地に置く」
  if (/^このクリーチャーの下にあるカードをすべて、?(?:自分の)?墓地に置く$/.test(s)) return [{ type: 'discardUnder', count: 0 }];
  // メクレイド：「アビス・メクレイド5する」＝山札の上から3枚を見て、コスト5以下のアビスを1枚（W・メクレイドは2枚まで）、コストを支払わずに使ってもよい。残りは山札の下
  if ((m = s.match(/^(?:自分は)?(.+?)・(W・)?メクレイド(\d+|∞)する$/))) {
    const pickFilter: CardFilter = { race: m[1], ...(m[3] === '∞' ? {} : { maxCost: n(m[3]) }) };
    return [
      { type: 'lookAtTop', count: 3, pickCount: m[2] ? 2 : 1, pickFilter, pickTo: 'none', restTo: 'deckBottom' },
      { type: 'playFree', target: { owner: 'self', zone: 'deck', count: 'all', ref: 'chosen', anyZone: true } },
    ];
  }
  // ラスト・バースト：「このカードの呪文側をコストを支払わずに唱える」
  if (/^このカードの呪文側を、?コストを支払わずに唱える$/.test(s)) return [{ type: 'castSelfTwin' }];
  // フレンド・バーストなど：「このクリーチャーの呪文側を、バトルゾーンに置いたままコストを支払わずに唱える」
  if (/^この(?:クリーチャー|カード)の呪文側を、?バトルゾーンに置いたまま、?コストを支払わずに唱える$/.test(s)) return [{ type: 'castOwnTwin' }];
  // 「その呪文を相手の墓地からコストを支払わずに唱える」「選んだ呪文があればコストを支払わずに唱える」：前の文のカードを使う
  if (/^(?:その|選んだ|それらの)(?:呪文|クリーチャー|カード)(?:があれば、?|を)(?:(?:自分|相手)の(?:墓地|手札|マナゾーン|山札)から)?、?コストを支払わずに(?:唱える|実行する|召喚する|出す|使う)$/.test(s)) {
    const target = refAnyZone();
    return target && [{ type: 'playFree', target }];
  }
  // 「それと同じ枚数のカードを自分のマナゾーンから手札に戻す」：前の文で動かした枚数だけ
  if ((m = s.match(/^(?:それ|その枚数|こうして[^、]*?の)と同じ(?:枚数|数)(?:の|だけ)、?(.+?)を、?(.+)$/))) {
    const one = refCtx.chosen ? (parseSentence(`${m[1]}を1枚、${m[2]}`) ?? parseSentence(`${m[1]}を1体、${m[2]}`)) : null;
    if (one) return [{ type: 'repeat', per: 'chosen', unit: 1, effects: one }];
  }
  // 「自分の山札の上から1枚を表向きにしてこのクリーチャーの下に置く」
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?を、?(?:表向きにして|裏向きのまま)?、?このクリーチャーの下に置く$/))) return [{ type: 'deckTopTo', count: n(m[1]), to: 'under' }];
  // 「自分の手札を1枚表向きにして、新しいシールドとしてシールドゾーンに置く」
  if ((m = s.match(/^自分の手札を(\d+)枚、?表向きにして、?(?:新しい)?シールドとして(?:自分の)?シールドゾーンに(?:置く|加える)$/)))
    return [{ type: 'move', target: { owner: 'self', zone: 'hand', count: n(m[1]) }, to: 'shield', faceUp: true }];
  if (s === '相手の手札を見る') return [{ type: 'lookAtHand' }];
  // 「その中にある、選んだ数字と同じコストを持つカード1枚につき」：直前に見た相手の手札の中
  s = s.replace(/^その中にある、?(?=(?:その|選んだ)数字)/, '相手の手札にある');
  // 「進化クリーチャーではない、種族にドラゴンとある自分のクリーチャーを1体、〜」：持ち主より前に書かれた条件を後ろへ
  const pre = s.match(/^(.+?)、?(自分|相手)の(クリーチャー|カード|エレメント)を(.+)$/);
  if (pre && !/^(?:自分|相手|この|その|それ)/.test(pre[1]) && !/[をにがは]/.test(pre[1].replace(/種族に|名前に/g, '')) && parseMods(pre[1].replace(/、$/, ''), {})) s = `${pre[2]}の${pre[1]}${pre[3]}を${pre[4]}`;
  // 「パワーの合計が13000以下になるよう、相手のクリーチャーを好きな数選び、破壊する」
  if ((m = s.match(/^パワーの合計が(\d+)以下になるよう(?:に)?、?(.+)$/))) {
    const r = parseSentence(m[2]);
    const e = r?.length === 1 ? r[0] : null;
    if (!e || !('target' in e) || typeof e.target !== 'object' || e.target.count === 'all') return null;
    return [{ ...e, target: { ...e.target, maxTotalPower: n(m[1]) } } as EffectDef];
  }
  // 「クリーチャーすべてに封印を1つ付ける」「このクリーチャーに封印を3つ付ける」
  if (/^クリーチャーすべてに(?:、?それぞれ)?封印を1つ(?:ずつ)?付ける$/.test(s)) return [{ type: 'seal', target: { owner: 'any', zone: 'battle', count: 'all' } }];
  if ((m = s.match(/^このクリーチャーに封印を(\d+)つ付ける$/)))
    return Array.from({ length: n(m[1]) }, (): EffectDef => ({ type: 'seal', target: { owner: 'self', zone: 'battle', count: 'all', filter: { selfOnly: true } } }));
  // 「このターン、このクリーチャーはアンタップしているクリーチャーを攻撃できる」：このクリーチャーにキーワードを与える
  if ((m = s.match(/^(このターン|次の自分のターンのはじめまで)、(このクリーチャーは.+)$/))) {
    const kw: Keywords = {};
    if (applyKeywordLine(m[2], kw)) return [{ type: 'grantKeyword', target: 'self', keywords: kw, ...(m[1] !== 'このターン' ? { untilNextTurn: true } : {}) }];
  }
  // 「各プレイヤーは自身のシールドを1枚ずつ選び、持ち主の墓地に置く」：それぞれ自分のカードを選ぶ
  if ((m = s.match(/^各プレイヤーは、?自身の(.+?)を(\d+)(枚|体|つ)ずつ選び、(.+)$/))) {
    const mine = parseTargeted(`自分の${m[1]}を${m[2]}${m[3]}選び、${m[4]}`);
    const theirs = parseTargeted(`相手の${m[1]}を${m[2]}${m[3]}選び、${m[4]}`);
    if (!mine || !theirs) return null;
    return [...mine, ...theirs.map((e) => ('target' in e && typeof e.target === 'object' ? ({ ...e, target: { ...e.target, chooser: 'owner' } } as EffectDef) : e))];
  }
  // 「各プレイヤー1人につき、そのプレイヤーのエレメントを1つまで選び、持ち主のマナゾーンに置く」：自分のものと相手のものをそれぞれ選ぶ
  if ((m = s.match(/^各プレイヤー1人につき、そのプレイヤーの(.+)$/))) {
    const mine = parseTargeted(`自分の${m[1]}`);
    const theirs = parseTargeted(`相手の${m[1]}`);
    return mine && theirs && [...mine, ...theirs];
  }
  // 「自分の手札を2枚まで捨て、その枚数より1枚多くカードを引く」
  if ((m = s.match(/^(.+)、その枚数より(\d+)枚多くカードを引く$/))) {
    const c = CONTINUATIVE.find(([a]) => m![1].endsWith(a));
    const left = c ? parseSentence(m[1].slice(0, -c[0].length) + c[1]) : null;
    return left && left.length === 1 && choosesCards(left[0]) ? [...left, { type: 'repeat', per: 'chosen', unit: 1, effects: [{ type: 'draw', count: 1 }] }, { type: 'draw', count: n(m[2]) }] : null;
  }
  // 「こうして戻したのと同じ枚数のカードを、自分の山札の上からタップしてマナゾーンに置く」
  if ((m = s.match(/^こうして[^、]*?のと同じ(?:枚数|数)のカードを、?自分の山札の上から(タップして)?(?:自分の)?マナゾーンに(タップして)?置く$/))) {
    if (!refCtx.chosen) return null;
    return [{ type: 'repeat', per: 'chosen', unit: 1, effects: [{ type: 'deckTopTo', count: 1, to: 'mana', ...(m[1] || m[2] ? { tapped: true } : {}) }] }];
  }
  // 「自分のタップしているクリーチャー1体につき、カードを1枚引く」「こうして破壊したクリーチャー1体につき、カードを2枚引く」
  if ((m = s.match(/^(こうして[^、]*?(?:カード|クリーチャー|シールド)1(?:枚|体|つ)につき|[^、]+?\d+(?:枚|体|つ)につき)、?(.+)$/))) {
    const chosen = m[1].startsWith('こうして');
    if (chosen && !refCtx.chosen) return null;
    const p = chosen ? null : parsePer(m[1]);
    const body = parseSentence(m[2].replace(/^(\d+)枚、カードを引く$/, 'カードを$1枚引く'));
    if (body && (chosen || p)) return [{ type: 'repeat', per: chosen ? 'chosen' : p!.per, unit: chosen ? 1 : p!.unit, effects: body }];
  }
  // 「相手の手札を見て1枚選び、捨てさせる」：中身を見て選ぶ
  if ((m = s.match(/^相手の手札を見て(\d+)枚選び、捨てさせる$/))) return [move({ owner: 'opponent', zone: 'hand', count: n(m[1]) }, 'graveyard')];
  // 「こうして捨てたカード1枚につき、相手の手札を1枚見ないで選び、捨てさせる」
  if ((m = s.match(/^こうして捨てたカード1枚につき、相手の手札を(?:(\d+)枚見ないで|見ないで(\d+)枚)選び、捨てさせる$/))) return [{ type: 'discardRandom', count: n(m[1] ?? m[2]), perChosen: true }];
  // 天使と悪魔の墳墓：「バトルゾーンに同じ名前のクリーチャーが2体以上あれば、それらをすべて破壊する」
  if (/^バトルゾーンに同じ名前のクリーチャーが2体以上あれば、それらをすべて破壊する$/.test(s)) return [{ type: 'destroyDuplicates', zone: 'battle' }];
  if (/^マナゾーンに同じ名前のカードが2枚以上あれば、それらをすべて(?:持ち主の)?墓地に置く$/.test(s)) return [{ type: 'destroyDuplicates', zone: 'mana' }];
  // 「自分の他のクリーチャーをすべて山札に加えてシャッフルする」
  if ((m = s.match(/^(.+?をすべて)、?(?:自分の|持ち主の)?山札に(?:加えて|戻して)シャッフルする$/))) {
    const r = parseTargeted(`${m[1]}山札の下に置く`);
    return r && [...r, { type: 'shuffleDeck' }];
  }
  // メテオバーン：「このクリーチャーの下にあるカードを1枚墓地に置く」
  if ((m = s.match(/^このクリーチャーの下にあるカードを(\d+)枚(?:選び、)?(?:自分の)?墓地に置く$/))) return [{ type: 'discardUnder', count: n(m[1]) }];
  // ツインパクトの呪文側：「このカードを出す」
  if (/^このカードを(?:バトルゾーンに)?出す$/.test(s)) return [{ type: 'putSelfIntoBattle' }];
  // 「このゲームに参加しているプレイヤー1人につき、カードを1枚引く」（2人対戦）
  if ((m = s.match(/^このゲームに参加しているプレイヤー1人につき、カードを(\d+)枚引く$/))) return [{ type: 'draw', count: 2 * n(m[1]) }];
  // 出た時の「アンタップする」：このクリーチャー
  if (s === 'アンタップする') return [{ type: 'selfAction', action: 'untap' }];
  const draw = (count: string, upTo?: string): EffectDef => ({ type: 'draw', count: n(count), ...(upTo ? { upTo: true } : {}) });
  // 「コストの合計が9以下になるように、相手のクリーチャーを2体まで選び、破壊する」
  if ((m = s.match(/^(.*?)コストの合計が(\d+)以下になるように、?(.+)$/))) {
    const r = parseSentence(m[1].replace(/、$/, '') + m[3]);
    const e = r?.length === 1 ? r[0] : null;
    if (!e || !('target' in e) || typeof e.target !== 'object' || e.target.count === 'all') return null;
    return [{ ...e, target: { ...e.target, maxTotalCost: n(m[2]) } } as EffectDef];
  }
  if ((m = s.match(/^(?:自分の山札から)?カードを(\d+)枚(まで)?引(?:く|き)$/))) return [draw(m[1], m[2])];
  if ((m = s.match(/^(?:自分の山札から)?カードを(\d+)枚(まで)?引き、(.+)$/))) {
    const rest = parseSentence(m[3]);
    return rest && [draw(m[1], m[2]), ...rest];
  }
  if ((m = s.match(/^自分の手札を(\d+)枚、?(?:好きな順序で)?(?:自分の)?山札の上に(?:置く|戻す)$/))) return [move({ owner: 'self', zone: 'hand', count: n(m[1]) }, 'deckTop')];
  if (/^自分の墓地にある(?:カードを)?すべて(?:の)?(?:カードを)?(?:自分の)?山札に(?:加え|戻し)、(?:山札を)?シャッフルする$/.test(s) || s === '自分の墓地にあるカードをすべて山札に加え、シャッフルする')
    return [{ type: 'graveyardToDeck' }];
  if ((m = s.match(/^自分の手札を(\d+)枚捨て、(.+)$/))) {
    const rest = parseSentence(m[2]);
    return rest && [move({ owner: 'self', zone: 'hand', count: n(m[1]) }, 'graveyard'), ...rest];
  }
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?(?:まで)?を?、?(タップして)?(?:自分の)?マナゾーンに(タップして)?置く$/)))
    return [{ type: 'deckTopTo', count: n(m[1]), to: 'mana', ...(m[2] || m[3] ? { tapped: true } : {}) }];
  // 「相手は自身の山札の上から1枚をシールド化してもよい」「相手はカードを1枚引いてもよい」：相手が選んで行う
  if ((m = s.match(/^相手は、?(.+(?:て|で)もよい)$/))) {
    const so = stripOptional(m[1].replace(/自身の/g, '自分の'));
    const inner = so.optional ? parseSentence(so.text) : null;
    return inner && [{ type: 'opponentMay', effects: inner }];
  }
  if ((m = s.match(/^(相手は自身|自分)の手札をすべて捨てる$/)))
    return [move({ owner: m[1] === '自分' ? 'self' : 'opponent', zone: 'hand', count: 'all' }, 'graveyard')];
  if ((m = s.match(/^(?:このターン、)?このクリーチャーに(「.+」を与える)$/))) {
    const kw = parseGrant(m[1]);
    return kw && [{ type: 'grantKeyword', target: 'self', keywords: kw }];
  }
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?を墓地に置く$/))) return [{ type: 'deckTopTo', count: n(m[1]), to: 'graveyard' }];
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?を手札に加える$/))) return [{ type: 'deckTopTo', count: n(m[1]), to: 'hand' }];
  if ((m = s.match(/^自分の山札の上から(\d+)枚(?:目)?を(?:裏向きのまま、?)?(?:新しい)?シールド(?:として(?:自分の)?(?:シールドゾーンに置く|加える)|ゾーンに(?:置く|加える)|に加える|化する)$/)))
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
    return [move({ owner: 'opponent', zone: 'hand', count: n(m[1]), chooser: 'owner' }, 'graveyard')];
  if ((m = s.match(/^(?:自分の)?手札を(\d+)枚(?:選び、)?捨て(?:る)?$/))) return [move({ owner: 'self', zone: 'hand', count: n(m[1]) }, 'graveyard')];
  // 「相手は自身のクリーチャーを1体選び、破壊する」：相手が選ぶ
  if ((m = s.match(/^相手は、?自身の([^、。]*?を\d+(?:体|つ|枚)(?:選び|選んで)、?.+)$/))) {
    const r = parseTargeted(`相手の${m[1]}`);
    return r && r.map((e) => ('target' in e && typeof e.target === 'object' ? ({ ...e, target: { ...e.target, chooser: 'owner' } } as EffectDef) : e));
  }
  if ((m = s.match(/^(?:このクリーチャーは)?相手のシールドを(\d+)つブレイクする$/))) return [{ type: 'breakShields', count: n(m[1]) }];
  // 「相手は自身のクリーチャーすべてに封印を1つ付ける」（ドキンダムX）
  if ((m = s.match(/^(?:相手は、?自身|(相手|自分))の(.*?)クリーチャーすべてに(?:、?それぞれ)?封印を1つ(?:ずつ)?付ける$/))) {
    const filter: CardFilter = {};
    if (!parseMods(m[2], filter)) return null;
    const owner = m[1] === '自分' ? 'self' : 'opponent';
    return [{ type: 'seal', target: { owner, zone: 'battle', count: 'all', ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  if ((m = s.match(/^(?:このターン、)?このクリーチャーのパワーを\+(\d+)する$/))) return [{ type: 'powerMod', target: 'self', amount: n(m[1]) }];
  if ((m = s.match(/^このクリーチャーを、?(.+)$/))) {
    const self = parseSelfVerb(m[1]);
    if (self) return [self];
  }
  if (/^このターンの後(?:に|、)?(?:もう一度)?自分のターンを(?:追加する|行う)$/.test(s)) return [{ type: 'extraTurn' }];
  if (s === '自分はゲームに勝つ' || s === 'ゲームに勝つ') return [{ type: 'winGame' }];
  // 「そのクリーチャーとこのクリーチャーを破壊する」：それぞれを読む
  if ((m = s.match(/^(そのクリーチャー|このクリーチャー)と(そのクリーチャー|このクリーチャー)を(.+)$/)) && m[1] !== m[2]) {
    const a = parseSentence(`${m[1]}を${m[3]}`);
    const b = parseSentence(`${m[2]}を${m[3]}`);
    return a && b ? [...a, ...b] : null;
  }
  // 「このターン、相手は呪文を唱えられない」「次の自分のターンのはじめまで、相手のクリーチャーは攻撃できない」
  if ((m = s.replace(/^次の、?相手のターンの終わりまで、/, '次の自分のターンのはじめまで、').match(/^(このターン|次の自分のターンのはじめまで)、(.+)$/))) {
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

/** 文のまとまりを1列の効果にする。途中の「〜してもよい」は、聞いてから行う効果（optional）にする */
function flattenGroups(groups: Group[]): EffectDef[] {
  return groups.flatMap((g) => (g.optional ? [{ type: 'optional', effects: g.effects } as EffectDef] : g.effects));
}

/** 「〜があれば、両方選んでもよい」の条件 */
function parseBothCondition(text: string): Condition | null {
  // 「バトルゾーンに自分の闇のクリーチャーと火のクリーチャーがそれぞれ1体以上あれば」
  const pair = text.match(/^(?:バトルゾーンに)?自分の(.+?)と(.+?)がそれぞれ(\d+)体以上あれば$/);
  if (pair) {
    const conds: Condition[] = [];
    for (const w of [pair[1], pair[2]]) {
      const filter: CardFilter = {};
      if (!parseSubject(w, filter)) return null;
      conds.push({ type: 'compare', left: { who: 'self', zone: 'battle', filter }, op: '>=', right: n(pair[3]) });
    }
    return { type: 'and', conditions: conds };
  }
  const c = splitCondition(`${text}、x`);
  return c.condition && c.body === 'x' ? c.condition : null;
}

/** 能力の本文（誘発条件を除いた部分）を読む。読めなければ null */
function parseBody(body: string, options: string[]): Group[] | null {
  const sentences = body
    .replace(/シャッフルし、(?:その後|そのあと)、/g, 'シャッフルし、')
    .split('。')
    .map((x) => x.trim())
    .filter(Boolean)
    .flatMap((x) => {
      // 「〜を墓地に置き、その後、〜」：前の部分は言い切りの形に直す
      const parts = x.split(/、?(?:その後|そのあと)、/).filter(Boolean);
      return parts.map((p, k) => {
        if (k === parts.length - 1) return p;
        const c = CONTINUATIVE.find(([a]) => p.endsWith(a));
        return c ? p.slice(0, -c[0].length) + c[1] : p;
      });
    });
  const groups: Group[] = [];
  const outerChosen = refCtx.chosen;
  for (let i = 0; i < sentences.length; i++) {
    let s = sentences[i];
    failedAt = s;
    refCtx.chosen = outerChosen || groups.some((g) => g.effects.some(choosesCards));
    // 「ただし、その「S・トリガー」は使えない」：シールドを手札に加える効果ではもともと使えない
    if (/^(?:ただし、)?その「S・トリガー」は使えない$/.test(s)) continue;
    // 「このようにして山札を見た場合、シャッフルする」：山札を見る効果がシャッフルまで行う
    if (/^このようにして山札を見た場合、(?:山札を)?シャッフルする$/.test(s)) continue;
    let chain = false;
    const so = s.match(/^(?:そうしたら|そしたら|そうした場合)、(.+)$/);
    if (so) {
      if (!groups.length || !groups[groups.length - 1].optional) return null;
      s = so[1];
      chain = true;
    }
    // 山札を見て選ぶ（2〜3文で1つの効果）
    // 「自分の山札をシャッフルし、上から5枚を表向きにする」：シャッフルしてから見る
    const shuffled = s.match(/^自分の山札をシャッフルし、(上から(?!1枚)\d+枚を(?:見る|表向きにする))$/);
    if (shuffled) {
      pushGroup(groups, false, [{ type: 'shuffleDeck' }], chain);
      s = `自分の山札の${shuffled[1]}`;
    }
    // 「〜が3体出るまで表向きにする。その3体を出す。（その後、山札をシャッフルする）」
    const untilS = stripOptional(s);
    const until =
      untilS.text.match(/^自分の山札の上から、?(.+?)が(?:(\d+)体)?出るまで、?(?:表向きにする|カードをすべてのプレイヤーに見せる)$/) ??
      untilS.text.match(/^(.+?)が()出るまで、自分の山札の上からカードをすべてのプレイヤーに見せる$/);
    if (until) {
      const filter: CardFilter = {};
      if (!parsePickWhat(until[1], filter)) return null;
      const then = (sentences[i + 1] ?? '').match(/^その(?:\d+体|カード|クリーチャー)を(?:自分の)?(手札に加える|(?:バトルゾーンに)?出す|(?:バトルゾーンに)?出し、残りを(?:自分の)?墓地に置く)$/);
      if (!then) return null;
      i++;
      let restTo: 'graveyard' | 'shuffle' | 'deckBottom' = then[1].includes('墓地') ? 'graveyard' : 'deckBottom';
      if (!then[1].includes('墓地')) {
        // 「その後、山札をシャッフルする」／「残りをシャッフルし、山札の下に置く」
        if (sentences[i + 1] === '山札をシャッフルする') restTo = 'shuffle';
        else if (/^残りを(?:シャッフルし、?|シャッフルして、?)?(?:自分の)?山札の(?:一番)?下に置く$/.test(sentences[i + 1] ?? '')) restTo = 'deckBottom';
        else return null;
        i++;
      }
      pushGroup(groups, untilS.optional, [{ type: 'revealUntil', filter, count: until[2] ? n(until[2]) : 1, to: then[1].startsWith('手札') ? 'hand' : 'battle', restTo }], chain);
      continue;
    }
    // 「次の能力を3回まで使う」：▶ の行がその能力
    const upTo = s.match(/^次の能力を(\d+)回まで使う$/);
    if (upTo && options.length === 1) {
      const g = parseBody(options[0], []);
      if (!g || g.some((x) => x.optional)) return null;
      pushGroup(groups, false, [{ type: 'upToTimes', times: n(upTo[1]), effects: g.flatMap((x) => x.effects) }], chain);
      options = [];
      continue;
    }
    // 「山札の上から2枚を見る。その後、それらを好きな順序で山札の上または下に置く」：下に置くカードを選び、残りは上に残す
    const order = s.match(/^自分の山札の上から(\d+)枚(?:目まで)?を見る$/);
    if (order && /^(?:それら|そのカード)を、?好きな順序で(?:自分の)?山札の上(?:または|か)下に(?:置く|戻す)$/.test(sentences[i + 1] ?? '')) {
      i++;
      pushGroup(groups, false, [{ type: 'lookAtTop', count: n(order[1]), pickCount: n(order[1]), pickTo: 'deckBottom', restTo: 'top' }], chain);
      continue;
    }
    const lookS = stripOptional(s);
    const look = lookS.text.match(/^自分の山札(?:の上から|(?:のカード)?を、?上から)(\d+)枚(?:目まで|目)?を?(?:見る|表向きにする)$/);
    const search = s === '自分の山札を見る';
    if (look || search) {
      // 1枚だけ公開して「それが〜なら…」
      // 「山札の上から1枚目を見る。それが呪文であれば、コストを支払わずに唱えてもよい」
      if (look && look[1] === '1' && /^(?:それ|そのカード)が呪文(?:であれば|なら)、?コストを支払わずに唱えてもよい$/.test(sentences[i + 1] ?? '')) {
        i++;
        pushGroup(groups, false, [{ type: 'revealTopCard', ifSpell: 'cast' }], chain);
        continue;
      }
      const one = look && look[1] === '1' ? parseRevealIf(sentences.slice(i + 1)) : null;
      if (one) {
        i += one.used;
        pushGroup(groups, false, [one.effect], chain);
        continue;
      }
      const r = parseLook(look ? n(look[1]) : 99, sentences.slice(i + 1)) ?? (look ? parseLookMulti(n(look[1]), sentences.slice(i + 1)) : null);
      if (!r) return null;
      i += r.used;
      pushGroup(groups, r.optional || lookS.optional, [r.effect, ...(r.extra ?? [])], chain);
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
        if (/^(?:そのカードが|それが)?クリーチャー(?:であれば|なら)、?(?:それを)?(?:バトルゾーンに)?出してもよい$/.test(x)) e.ifCreature = 'battle';
        else if (/^(?:そのカードが|それが)?呪文(?:であれば|なら)、?コストを支払わずに唱えてもよい$/.test(x)) e.ifSpell = 'cast';
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
    // 「コスト7以下の呪文を1枚、自分の手札または墓地からコストを支払わずに唱えてもよい。それを唱えた後、墓地のかわりに山札の下に置く」
    const freeZ = s.match(/^(.*?)(呪文|クリーチャー|カード)を1(?:枚|体|つ)、?自分の(手札|墓地)(?:または(手札|墓地))?からコストを支払わずに(?:唱える|召喚する|使う|実行する|(?:唱え|召喚し|使っ|実行し)てもよい)$/);
    if (freeZ && (freeZ[3] !== '手札' || freeZ[4])) {
      const filter: CardFilter = freeZ[2] === 'カード' ? {} : { cardType: freeZ[2] === '呪文' ? 'spell' : 'creature' };
      if (!parseMods(freeZ[1], filter)) return null;
      const zones = [freeZ[3], freeZ[4]].filter(Boolean).map((z) => (z === '手札' ? 'hand' : 'graveyard') as 'hand' | 'graveyard');
      // 「それを唱えた後、墓地のかわりに山札の下に置く」「そうした場合、唱えた後、墓地に置くかわりに自分の手札に加える」
      const am = (sentences[i + 1] ?? '').match(/^(?:こうして呪文を唱えたなら、|そうした場合、|そうしたら、)?(?:それを|その呪文を)?唱えた後、墓地(?:の|に置く)かわりに(?:自分の)?(山札の(?:一番)?下に置く|手札に(?:加える|戻す))$/);
      const after = am ? (am[1].startsWith('山札') ? ('deckBottom' as const) : ('hand' as const)) : null;
      if (after) i++;
      pushGroup(groups, false, [{ type: 'playFromHandFree', ...(Object.keys(filter).length ? { filter } : {}), zones, ...(after ? { spellAfter: after } : {}) }], chain);
      continue;
    }
    // 「クリーチャーを2体選ぶ。その2体をバトルさせる」
    const pair = s.match(/^(相手の|自分の)?(.*?)クリーチャーを2体選ぶ$/);
    if (pair && sentences[i + 1] === 'その2体をバトルさせる') {
      const filter: CardFilter = {};
      if (!parseMods(pair[2], filter)) return null;
      i++;
      const owner = pair[1] === '相手の' ? 'opponent' : pair[1] === '自分の' ? 'self' : 'any';
      pushGroup(groups, false, [{ type: 'fightPair', target: { owner, zone: 'battle', count: 2, ...(Object.keys(filter).length ? { filter } : {}) } }], chain);
      continue;
    }
    // 「次の中から1つ選ぶ」：▶ の行が選択肢
    const modes = s.match(/^次の(?:中から|うち)(?:いずれか)?(\d+(?:つ|回)|ひとつ|ふたつ|みっつ)を?選ぶ$/);
    if (modes) {
      if (options.length < 2) return null;
      const times = ({ ひとつ: 1, ふたつ: 2, みっつ: 3 } as Record<string, number>)[modes[1]] ?? parseInt(modes[1], 10);
      const repeat = sentences[i + 1] === '同じものを選んでもよい';
      if (repeat) i++;
      // 「バトルゾーンに自分の闇のクリーチャーと火のクリーチャーがそれぞれ1体以上あれば、両方選んでもよい」
      const bothM = (sentences[i + 1] ?? '').match(/^(.+)、(?:両方|すべて)選んでもよい$/);
      let bothIf: Condition | undefined;
      if (bothM) {
        const c = parseBothCondition(bothM[1]);
        if (!c || times > 1) return null;
        bothIf = c;
        i++;
      }
      const opts: { label: string; effects: EffectDef[] }[] = [];
      for (const o of options) {
        const g = parseBody(o, []);
        if (!g) return null;
        opts.push({ label: o.replace(/。$/, ''), effects: flattenGroups(g) });
      }
      pushGroup(groups, false, [{ type: 'chooseOne', options: opts, ...(times > 1 ? { times, ...(repeat ? {} : { distinct: true }) } : {}), ...(bothIf ? { bothIf } : {}) }], chain);
      options = [];
      continue;
    }
    // 「相手のクリーチャーを1体選んでもよい。その選んだクリーチャーとこのクリーチャーをバトルさせる」
    const fight = s.match(/^(?:バトルゾーンにある)?(相手の)(.*?)クリーチャーを1体選(ぶ|んでもよい)$/);
    // 「その2体をバトルさせる」：前の文で出した（選んだ）クリーチャーと
    const withChosen = sentences[i + 1] === 'その2体をバトルさせる' && refCtx.chosen;
    if (fight && (withChosen || /^(?:その(?:選んだ)?クリーチャーとこのクリーチャー|このクリーチャーとその(?:選んだ)?クリーチャー)をバトルさせる$/.test(sentences[i + 1] ?? ''))) {
      const filter: CardFilter = {};
      if (!parseMods(fight[2], filter)) return null;
      i++;
      pushGroup(groups, fight[3] !== 'ぶ', [{ type: 'fight', target: { owner: 'opponent', zone: 'battle', count: 1, ...(Object.keys(filter).length ? { filter } : {}) }, ...(withChosen ? { fighter: 'chosen' as const } : {}) }], chain);
      continue;
    }
    // 「相手とガチンコ・ジャッジする。自分が勝ったら、〜」
    const gj = stripOptional(s);
    if (gj.text === '相手とガチンコ・ジャッジする' || gj.text === '相手とパワー・ガチンコ・ジャッジする') {
      const won = (sentences[i + 1] ?? '').match(/^(?:自分が)?(勝った|負けた)(?:ら|場合)、(.+)$/);
      if (!won) return null;
      let result = parseSentence(won[2]);
      let used = 1;
      if (!result) {
        // 勝った時の処理がいくつもの文に分かれている：残りの文をまとめて読む
        const rest = parseBody([won[2], ...sentences.slice(i + 2)].join('。'), []);
        if (!rest || rest.some((g) => g.optional)) return null;
        result = rest.flatMap((g) => g.effects);
        used = sentences.length - i - 1;
      }
      i += used;
      const power = gj.text.includes('パワー') ? { power: true } : {};
      pushGroup(groups, gj.optional, [won[1] === '勝った' ? { type: 'gachinko', then: result, ...power } : { type: 'gachinko', then: [], lose: result, ...power }], chain);
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
    // 「数字を1つ選ぶ」：カードを選ぶ文ではない
    if (s === '数字を1つ選ぶ') {
      pushGroup(groups, false, [{ type: 'chooseNumber' }], chain);
      continue;
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
    // 「〜を出す。次の自分のターンのはじめまで、そのクリーチャーに「ブロッカー」を与える」
    const give = s.match(/^(このターン|次の自分のターンのはじめまで)、そのクリーチャーに(「.+」を与える)$/);
    const lastG = groups[groups.length - 1];
    const lastE = lastG?.effects[lastG.effects.length - 1];
    if (give && lastE?.type === 'move' && lastE.to === 'battle') {
      const kw = parseGrant(give[2]);
      if (!kw) return null;
      lastE.grant = { keywords: kw, ...(give[1] !== 'このターン' ? { untilNextTurn: true } : {}) };
      continue;
    }
    // 途中の文の条件：「その後、これが進化クリーチャーなら、〜する」
    if (i > 0) {
      const c = splitCondition(s);
      const cb = c.condition && c.body ? stripOptional(c.body) : null;
      const inner = cb ? parseSentence(cb.text) : null;
      if (inner) {
        // 条件つきの「〜してもよい」は、条件を満たした時に使うかどうかを聞く
        pushGroup(groups, false, [{ type: 'conditional', condition: c.condition!, then: cb!.optional ? [{ type: 'optional', effects: inner }] : inner }], chain);
        continue;
      }
    }
    // 「相手は〜してもよい」：選ぶのは相手（自分の任意効果ではない）
    const oppMay = /^相手は、?.+(?:て|で)もよい$/.test(s) ? parseSentence(s) : null;
    if (oppMay) {
      pushGroup(groups, false, oppMay, chain);
      continue;
    }
    const { text, optional } = stripOptional(s);
    const effects = parseSentence(text);
    if (!effects) return null;
    pushGroup(groups, optional, effects, chain);
  }
  if (options.length) return null;
  refCtx.chosen = outerChosen;
  return groups;
}

function pushGroup(groups: Group[], optional: boolean, effects: EffectDef[], chain: boolean): void {
  const last = groups[groups.length - 1];
  // 「〜を1体破壊してもよい。そうしたら、〜」：カードを選ぶ（動かす）効果の続きは、実際に選んだ時だけ行う
  if (chain && choosesCards(last.effects[last.effects.length - 1])) effects = [{ type: 'ifChosen', then: effects }];
  if (chain || (last && !optional && !last.optional)) last.effects.push(...effects);
  else groups.push({ optional, effects });
}

/** 「山札の上からN枚を見る」に続く文を読む */
function parseLook(count: number, next: string[]): { effect: EffectDef; used: number; optional: boolean; extra?: EffectDef[] } | null {
  const first = next[0];
  if (!first) return null;
  const so = stripOptional(first);
  const optional = so.optional;
  let text = so.text;
  // 「手札に加えるかマナゾーンに置く」：行き先を選べる。1つ目の行き先だけの文に直して読む
  let pickToAlt: 'mana' | 'shield' | 'hand' | undefined;
  const alt = text.match(/^(.*?)(手札に加える|マナゾーンに置く)か、?(?:自分の)?(マナゾーンに置|シールド化|手札に加え)(き|く|し|する|る|)(、.+)?$/);
  if (alt) {
    const cont = alt[4] === 'き' || alt[4] === 'し' || alt[4] === '';
    const firstDest = alt[2] === '手札に加える' ? (cont ? '手札に加え' : '手札に加える') : cont ? 'マナゾーンに置き' : 'マナゾーンに置く';
    text = `${alt[1]}${firstDest}${alt[5] ?? ''}`;
    pickToAlt = alt[3].startsWith('マナ') ? 'mana' : alt[3].startsWith('シールド') ? 'shield' : 'hand';
  }
  const DEST = '(手札に加え(?:る)?|(?:バトルゾーンに)?出(?:し|す)|(?:タップして)?(?:自分の)?マナゾーンに置(?:き|く)|墓地に置(?:き|く)|(?:表向きで)?シールド化(?:し|する))';
  // 選ぶ時の決まり文句（「表向きにして」「相手に見せてから」）
  const SHOW = '(?:表向きにして(?:から)?|表向きにし|相手に見せて(?:から)?|相手に見せ)?';
  let pickAll = false;
  let chooser: 'opponent' | undefined;
  let what: string, pc: string, dest: string, restInline: string | undefined;
  const keepM = text.match(/^(?:その中から|そのうちの|その中の)、?(.*?)を?(\d+)(?:枚|体)(?:まで)?選ぶ$/);
  const keep = !!keepM;
  // 「その中の水のカードをすべて自分の手札に加え、それ以外のカードを自分の墓地に置く」
  const all = text.match(new RegExp(`^その中(?:の|から)、?(.*?)をすべて、?${SHOW}、?(?:自分の)?${DEST}(?:、(.+))?$`));
  const any = text.match(new RegExp(`^その中から、?(?:(.*?)を好きな(?:数|枚数)|好きな数の(.*?)を)、?(?:選んで)?${SHOW}、?(?:自分の)?${DEST}(?:、(.+))?$`));
  if (keepM) {
    [, what, pc] = keepM;
    dest = '';
  } else if (all) {
    [, what, dest, restInline] = all;
    pc = String(count);
    pickAll = true;
  } else if (any) {
    what = any[1] ?? any[2] ?? '';
    [, , , dest, restInline] = any;
    pc = String(count);
  } else {
    const m = text.match(new RegExp(`^(?:その中から|そのうちの|その中の)、?(.*?)(\\d+)(?:枚|体)(?:まで)?(?:選び|選んで|を)?、?(相手に選ばせ、?)?${SHOW}、?(?:自分の)?${DEST}(?:、(.+))?$`));
    if (!m) return null;
    let opp: string | undefined;
    [, what, pc, opp, dest, restInline] = m;
    if (opp) chooser = 'opponent';
  }
  const pickFilter: CardFilter = {};
  if (!parsePickWhat(what.replace(/を$/, ''), pickFilter)) return null;
  // 選ぶだけの文（「その中から〜を1枚選んでもよい」）：次の文で残りを片付けてから、選んだカードを使う
  if (keep) {
    const rm = (next[1] ?? '').match(/^残りを(?:好きな順序で)?(?:自分の)?(山札の(?:一番)?下に(?:置き|戻し|置く|戻す)|墓地に置(?:き|く))(?:、(.+))?$/);
    // 続きの文の「選んだ呪文」は、ここで選んだカードを指す
    const wasChosen = refCtx.chosen;
    refCtx.chosen = true;
    const tail = rm?.[2] ? parseSentence(stripOptional(rm[2]).text) : [];
    refCtx.chosen = wasChosen;
    if (!rm || !tail) return null;
    return {
      effect: { type: 'lookAtTop', count, pickCount: n(pc), ...(Object.keys(pickFilter).length ? { pickFilter } : {}), pickTo: 'none', restTo: rm[1].startsWith('山札') ? 'deckBottom' : 'graveyard', ...(optional ? {} : { mustPick: true }) },
      used: 2,
      optional: false,
      ...(tail.length ? { extra: tail } : {}),
    };
  }
  const pickTo = dest.startsWith('手札') ? 'hand' : dest.startsWith('バトル') || dest.startsWith('出') ? 'battle' : dest.includes('マナ') ? 'mana' : dest.startsWith('墓地') ? 'graveyard' : 'shield';
  let used = 1;
  let restText: string | undefined = restInline;
  // 続きが「残りを〜」ではない時（「〜をマナゾーンに置き、自分のマナゾーンから1枚選んで墓地に置く」）は、別の効果として読む
  let extra: EffectDef[] | undefined;
  if (restText && !/^(?:残り|もう\d+枚|それ以外のカード|山札をシャッフルする)/.test(restText)) {
    const x = parseSentence(restText.replace(/^(自分|相手)の(マナゾーン|墓地|手札)から(\d+)枚(?:選んで|選び、?)/, '$1の$2からカードを$3枚選び、'));
    if (!x) return null;
    extra = x;
    restText = undefined;
  }
  if (!restText && next[1] && /^(?:残り|もう\d+枚|それ以外のカード)を/.test(next[1])) {
    restText = next[1];
    used = 2;
  }
  let restTo: Extract<EffectDef, { type: 'lookAtTop' }>['restTo'];
  const REST = '^(?:残り(?:の\\d+枚)?|もう\\d+枚|それ以外のカード)を(?:好きな順序で)?(?:シャッフルして)?(?:自分の)?';
  if (count === 99) {
    if (restText && !/^山札をシャッフルする$/.test(restText)) return null;
    if (!restText && next[1] === '山札をシャッフルする') used = 2;
    restTo = 'shuffle';
  } else if (!restText && next[used] === '山札をシャッフルする') {
    // 「山札の上から7枚を見る。その中から〜を出してもよい。その後、山札をシャッフルする」
    used += 1;
    restTo = 'shuffle';
  }
  // 残りの行き先が書いていなければ、山札の上に残る
  else if (!restText) restTo = 'top';
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
      ...(/タップして/.test(dest) ? { pickTapped: true } : {}),
      ...(/表向きで/.test(dest) ? { pickFaceUp: true } : {}),
      ...(pickToAlt && pickToAlt !== pickTo ? { pickToAlt } : {}),
    },
    used,
    optional: false,
    ...(extra ? { extra } : {}),
  };
}

/** 山札から選んだカードの行き先の言い方（言い切り・連用形） */
const LOOK_DEST: [RegExp, 'hand' | 'battle' | 'mana' | 'shield' | 'graveyard', boolean?][] = [
  [/^(?:自分の)?手札に加え(?:る)?$/, 'hand'],
  [/^(?:バトルゾーンに)?出(?:し|す)$/, 'battle'],
  [/^タップして(?:自分の)?マナゾーンに置(?:き|く)$/, 'mana', true],
  [/^(?:自分の)?マナゾーンに置(?:き|く)$/, 'mana'],
  [/^(?:自分の)?墓地に置(?:き|く)$/, 'graveyard'],
  [/^(?:表向きで|裏向きのまま、?)?(?:新しい)?シールド(?:化(?:し|する)|ゾーンに置(?:き|く)|に加え(?:る)?)$/, 'shield'],
];

/**
 * 「山札の上からN枚を見る」に続く、行き先がいくつもある文：
 * 「その中から1枚をシールド化し、1枚をマナゾーンに置き、残りの1枚を墓地に置く」
 * 「その中からパワー6000以上のクリーチャーを1体と、パワー5000以下のクリーチャーを1体手札に加え、残りを好きな順序で山札の下に置く」
 */
function parseLookMulti(count: number, next: string[]): { effect: EffectDef; used: number; optional: boolean; extra?: EffectDef[] } | null {
  let used = 1;
  let text = next[0] ?? '';
  if (!text) return null;
  if (next[1] && /^(?:残り|もう\d+枚)/.test(next[1])) {
    text += `、${next[1]}`;
    used = 2;
  }
  // 「AとBをそれぞれ1枚まで」「AとBを1枚ずつ選び」→「Aを1枚までと、Bを1枚まで」
  text = text
    .replace(/^((?:その中から|そのうちの|その中の)?、?)(.+?)と(.+?)をそれぞれ(\d+)(枚|体)(まで)?/, '$1$2を$4$5$6と、$3を$4$5$6')
    .replace(/^((?:その中から|そのうちの|その中の)?、?)(.+?)と(.+?)を(\d+)(枚|体)ずつ(?:選び)?/, '$1$2を$4$5と、$3を$4$5');
  const { text: stripped, optional } = stripOptional(text.split('、残り')[0]);
  const body = (text.includes('、残り') ? `${stripped}、残り${text.split('、残り').slice(1).join('、残り')}` : stripped).replace(/^(?:その中から|そのうちの|その中の)、?/, '');
  type Step = { pickCount: number; pickFilter?: CardFilter; pickTo: 'hand' | 'battle' | 'mana' | 'shield' | 'graveyard'; mustPick?: boolean; pickTapped?: boolean };
  const steps: (Omit<Step, 'pickTo'> & { pickTo?: Step['pickTo'] })[] = [];
  let restTo: Extract<EffectDef, { type: 'lookAtTop' }>['restTo'] | null = null;
  for (const clause of body.split(/、(?=残り|もう\d+枚|\d+(?:枚|体)を|[^、]*?を?\d+(?:枚|体))/)) {
    const rest = clause.match(/^(?:残り(?:の\d+枚)?|もう\d+枚)を(?:好きな順序で)?(?:自分の)?(.+)$/);
    if (rest) {
      if (/^山札の(?:一番)?下に(?:置く|戻す)$/.test(rest[1])) restTo = 'deckBottom';
      else if (/^墓地に置く$/.test(rest[1])) restTo = 'graveyard';
      else if (/^(?:タップして)?マナゾーンに置く$/.test(rest[1])) restTo = 'mana';
      else if (/^山札に戻して(?:山札を)?シャッフルする$/.test(rest[1])) restTo = 'shuffle';
      else return null;
      continue;
    }
    if (restTo) return null;
    // 「Aを1体と」（行き先は次の句と同じ）／「Aを1枚、手札に加え」
    const cm = clause.match(/^(.*?)を?(\d+)(?:枚|体)(まで)?(と|を)?、?(?:表向きにして(?:から)?|相手に見せて(?:から)?)?、?(.*)$/);
    if (!cm) return null;
    const pickFilter: CardFilter = {};
    if (!parsePickWhat(cm[1], pickFilter)) return null;
    const step: (typeof steps)[number] = { pickCount: n(cm[2]), ...(Object.keys(pickFilter).length ? { pickFilter } : {}), ...(cm[3] || optional ? {} : { mustPick: true }) };
    if (cm[5]) {
      const d = LOOK_DEST.find(([re]) => re.test(cm[5]));
      if (!d) return null;
      step.pickTo = d[1];
      if (d[2]) step.pickTapped = true;
    } else if (cm[4] !== 'と') return null;
    steps.push(step);
  }
  // 行き先の書いていない句（「Aを1体と」）は、後ろの句と同じ行き先
  for (let k = steps.length - 1; k >= 0; k--) {
    if (!steps[k].pickTo) {
      const nx = steps[k + 1];
      if (!nx?.pickTo) return null;
      steps[k].pickTo = nx.pickTo;
      if (nx.pickTapped) steps[k].pickTapped = true;
    }
  }
  const total = steps.reduce((a, x) => a + x.pickCount, 0);
  if (steps.length < 2 || total > count) return null;
  // 残りの行き先が書いていなければ、全部を選び切る形だけ読む
  if (!restTo) {
    if (total !== count || steps.some((x) => !x.mustPick)) return null;
    restTo = 'top';
  }
  const [first, ...more] = steps as Step[];
  return { effect: { type: 'lookAtTop', count, ...first, restTo, more }, used, optional: false };
}

/** 山札の上1枚を公開し「それが〜なら…」する文 */
function parseRevealIf(next: string[]): { effect: EffectDef; used: number } | null {
  const m = (next[0] ?? '').match(/^(?:それ|そのカード)が(.+?)(?:なら|であれば)、?(?:それを|そのカードを)?(.+)$/);
  if (!m) return null;
  const filter: CardFilter = {};
  if (!parsePickWhat(m[1], filter) && !parseSubject(m[1], filter)) return null;
  const { text, optional } = stripOptional(m[2]);
  const TO: Record<string, 'hand' | 'battle' | 'mana' | null> = { 出す: 'battle', バトルゾーンに出す: 'battle', 手札に加える: 'hand', マナゾーンに置く: 'mana' };
  const pickTo = TO[text.replace(/^自分の/, '')];
  if (!pickTo) return null;
  let used = 1;
  let restTo: Extract<EffectDef, { type: 'lookAtTop' }>['restTo'] = 'top';
  const rest = (next[1] ?? '').match(/^(?:それ以外(?:のカード)?(?:なら|であれば)|それ以外の場合|こうして(?:出さ|加え|置か)なければ)、?(?:表向きにしたカードを)?(?:自分の)?(山札の(?:一番)?下に置く|墓地に置く|マナゾーンに置く)$/);
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
  const tmp: CardFilter = {};
  if (wm && parseMods(wm[1], tmp)) {
    Object.assign(filter, tmp);
    if (wm[2] === 'クリーチャー') filter.cardType = 'creature';
    if (wm[2] === '呪文') filter.cardType = 'spell';
    return true;
  }
  // 名詞のない「ドラゴン」「ドラゴンまたはファイアー・バード」：その種族のカード
  const race: CardFilter = {};
  if (!/クリーチャー|呪文|カード/.test(w) && parseSubject(w, race)) {
    Object.assign(filter, race);
    return true;
  }
  // 「呪文または名前に《ボルメテウス》とあるカード」：どちらかに合うもの
  const parts = w.split('または');
  if (parts.length > 1) {
    const anyOf: CardFilter[] = [];
    for (const p of parts) {
      const f: CardFilter = {};
      if (!p || !parsePickWhat(p, f)) return false;
      anyOf.push(f);
    }
    filter.anyOf = anyOf;
    return true;
  }
  return false;
}

// ───────────────────────── 常在効果 ─────────────────────────

/** 「自分の墓地にある呪文1枚につき」「バトルゾーンにある他のクリーチャー1体につき」を数え方にする */
function parsePer(t: string): { per: Quantity; unit: number } | null {
  // 「コストが異なる自分のクリーチャー1体につき」：コストの種類の数
  if (t.startsWith('コストが異なる')) {
    const r = parsePer(t.slice('コストが異なる'.length));
    return r && { per: { ...r.per, distinctCost: true }, unit: r.unit };
  }
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
    t.match(/^この(?:クリーチャー|カード)の(?:召喚|実行)コスト(?:を|は)、(.+?につき)(\d+)少なく(?:する|なる)(?:。ただし、?コストは(\d+)(以下|より少なく)(?:には|に)?ならない)?$/) ??
    t.match(/^(.+?につき)、?このクリーチャーの召喚コストは(\d+)少なくなる(?:。ただし、?コストは(\d+)(以下|より少なく)(?:には|に)?ならない)?$/);
  if (!m) return null;
  const p = parsePer(m[1]);
  if (!p) return null;
  const min = m[3] === undefined ? 1 : m[4] === '以下' ? n(m[3]) + 1 : n(m[3]);
  return { amount: n(m[2]), per: p.per, unit: p.unit, min };
}

function parseStatic(t: string): StaticAbility[] | null {
  // 「自分のエイリアンはすべて「スレイヤー」を得る」＝「〜すべてに「スレイヤー」を与える」
  t = t.replace(/^(.+?)は、?すべて、?((?:「[^「」]+」と?)+)を得る$/, '$1すべてに$2を与える');
  // 「その数字と同じコストの相手のクリーチャーは〜」：持ち主より前に書かれた条件を後ろへ
  t = t.replace(/^((?:その|選んだ)数字と同じコストの)(相手|自分)の/, '$2の$1');
  // 「相手はクリーチャーで攻撃できない」＝相手のクリーチャーは攻撃できない
  const noAtk = t.match(/^(相手|自分)はクリーチャーで攻撃できない$/);
  if (noAtk) return [{ type: 'grantKeyword', keywords: { cannotAttack: true }, appliesTo: { owner: noAtk[1] === '自分' ? 'self' : 'opponent' } }];
  // 「相手は各ターン1体しかクリーチャーを出せない」「相手は自身のクリーチャーを各ターン2体しかバトルゾーンに出せない」
  const lim = t.match(/^(相手|自分)は、?(?:各ターン(\d+)体(?:まで)?しかクリーチャーを|(?:自身の)?クリーチャーを各ターン(\d+)体(?:まで)?しか)(?:バトルゾーンに)?出せない$/);
  if (lim) return [{ type: 'playLimit', who: lim[1] === '自分' ? 'self' : 'opponent', what: 'creature', max: n(lim[2] ?? lim[3]) }];
  // 「相手は多色ではないクリーチャーを出せない」「自分の他の、名前に《拳銃》とあるエグザイル・クリーチャーをバトルゾーンに出すことはできない」
  const noEnter =
    t.match(/^(相手|自分)は、?(?:自身の)?()(.+?)を(?:バトルゾーンに)?出せない$/) ?? t.match(/^(自分|相手)の(他の)?、?(.+?)を(?:バトルゾーンに)?出すことはできない$/);
  if (noEnter) {
    const filter: CardFilter = {};
    if (!parseSubject(noEnter[3], filter)) return null;
    return [{ type: 'cannotEnter', who: noEnter[1] === '自分' ? 'self' : 'opponent', ...(Object.keys(filter).length ? { filter } : {}) }];
  }
  // 「相手はその数字と同じコストを持つクリーチャーと呪文を召喚したり唱えたりできない」：召喚と呪文の両方を禁じる
  const noBoth = t.match(/^(誰も|相手は|自分は)、?(.*?)クリーチャーと呪文を(?:召喚したり唱えたり|召喚も唱えることも)できない$/);
  if (noBoth) {
    const filter: CardFilter = {};
    if (!parseMods(noBoth[2], filter)) return null;
    const who = noBoth[1] === '誰も' ? 'both' : noBoth[1] === '相手は' ? 'opponent' : 'self';
    return [
      { type: 'cannotSummon', who, filter: { ...filter, cardType: 'creature' } },
      { type: 'cannotCast', who, filter: { ...filter, cardType: 'spell' } },
    ];
  }
  // 「誰もゼニスを召喚できない」「相手は光のクリーチャーを召喚できない」
  const noSummon = t.match(/^(誰も|相手は|自分は)、?(.+?)を召喚できない$/);
  if (noSummon) {
    const filter: CardFilter = {};
    if (!parseSubject(noSummon[2], filter)) return null;
    return [{ type: 'cannotSummon', who: noSummon[1] === '誰も' ? 'both' : noSummon[1] === '相手は' ? 'opponent' : 'self', ...(Object.keys(filter).length ? { filter } : {}) }];
  }
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
  // 「このクリーチャーのパワーを+4000し、「W・ブレイカー」を与える」「このクリーチャーのパワーは+2000され、「W・ブレイカー」を得る」
  const gained = t.match(/^このクリーチャーは、?((?:「[^「」]+」(?:と)?)+)を得る$/) ?? t.match(/^このクリーチャーのパワーは([+-]\d+)され、((?:「[^「」]+」(?:と)?)+)を得る$/);
  const selfBuff = gained
    ? ([gained[0], gained.length > 2 ? gained[1] : '', `${(gained.length > 2 ? gained[2] : gained[1]).replace(/」(?!と)「/g, '」と「')}を与え`] as RegExpMatchArray)
    : (t.match(/^このクリーチャーのパワーを([+-]\d+)(?:し、(「.+」を与え)る|する)$/) ??
      t.match(/^このクリーチャーのパワーは([+-]\d+)される$/) ??
      t.match(/^このクリーチャーに()(「.+」を与え)る$/));
  if (selfBuff) {
    const out: StaticAbility[] = [];
    const appliesTo: Applies = { owner: 'self', onlySelf: true };
    if (selfBuff[1]) out.push({ type: 'powerMod', amount: n(selfBuff[1]), appliesTo });
    if (selfBuff[2]) {
      const kw = parseGrant(selfBuff[2] + 'る');
      if (!kw) return null;
      out.push({ type: 'grantKeyword', keywords: kw, appliesTo });
    }
    return out;
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
  const owner = (w: string | undefined): Applies['owner'] => (w === '自分' ? 'self' : w === '相手' ? 'opponent' : 'any');
  // 「自分の他のクリーチャーすべてのパワーを+5000し、「スピードアタッカー」を与える」「自分のドラゴンすべてに「スピードアタッカー」を与える」
  let g = t.match(/^(?:(自分|相手)の|すべての)?(他の)?(.+?)(?:すべて(?:のパワーを([+-]\d+)し、|に、?)|(?<!すべて)に、?)(「.+」を与え)(る|、それらは(?:すべて)?ブロックされない)$/);
  if (g) {
    const filter: CardFilter = {};
    if (!parseSubject(g[3], filter)) return null;
    const kw = parseGrant(g[5] + 'る');
    if (!kw) return null;
    if (g[6] !== 'る') kw.unblockable = true;
    const appliesTo: Applies = { owner: owner(g[1]), ...(g[2] ? { excludeSelf: true } : {}), ...(Object.keys(filter).length ? { filter } : {}) };
    return [...(g[4] ? [{ type: 'powerMod' as const, amount: n(g[4]), appliesTo }] : []), { type: 'grantKeyword', keywords: kw, appliesTo }];
  }
  // 「自分のリキッド・ピープルはブロックされない」「相手のクリーチャーは、出たターンに攻撃できない」
  g = t.match(/^(自分|相手)の(他の)?(.+?)は、?(?:すべて)?(ブロックされない|攻撃されない|攻撃もブロックもできない|攻撃できない|ブロックできない|自分を攻撃できない|出たターンに攻撃できない|ターンのはじめ以外、?アンタップしない)$/);
  if (g) {
    const filter: CardFilter = {};
    if (!parseSubject(g[3], filter)) return null;
    const KW: Record<string, Keywords> = {
      ブロックされない: { unblockable: true },
      攻撃されない: { cannotBeAttacked: true },
      攻撃できない: { cannotAttack: true },
      ブロックできない: { cannotBlock: true },
      攻撃もブロックもできない: { cannotAttack: true, cannotBlock: true },
      // 相手のクリーチャーが「自分（このカードの持ち主）を攻撃できない」＝プレイヤーを攻撃できない
      自分を攻撃できない: { cannotAttackPlayers: true },
      出たターンに攻撃できない: { noAttackOnEnterTurn: true },
      ターンのはじめ以外アンタップしない: { untapOnlyAtTurnStart: true },
    };
    if (g[4] === '自分を攻撃できない' && g[1] !== '相手') return null;
    const kw = KW[g[4].replace(/、/g, '')];
    return [{ type: 'grantKeyword', keywords: kw, appliesTo: { owner: owner(g[1]), ...(g[2] ? { excludeSelf: true } : {}), ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  let m = t.match(/^(?:(自分|相手)の)?(他の)?(.+?)すべてのパワーを([+-]\d+)する$/);
  if (m) {
    const filter: CardFilter = {};
    if (!parseSubject(m[3], filter)) return null;
    return [{ type: 'powerMod', amount: n(m[4]), appliesTo: { owner: owner(m[1]), ...(m[2] ? { excludeSelf: true } : {}), ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  m = t.match(/^このクリーチャーのパワーは、?攻撃中、?\+(\d+)される$/);
  if (m) return null;
  if (t === '相手は呪文を唱えられない') return [{ type: 'cannotCast', who: 'opponent' }];
  // 「相手は各ターン1回までしか呪文を唱えられない」「相手は各ターン1体までしかクリーチャーを出せない」
  m = t.match(/^(相手|自分)は各ターン(\d+)(?:回|枚)(?:まで)?しか呪文を唱えられない$/);
  if (m) return [{ type: 'playLimit', who: m[1] === '自分' ? 'self' : 'opponent', what: 'spell', max: n(m[2]) }];
  m = t.match(/^(相手|自分)は各ターン(\d+)体までしかクリーチャーを(?:出せない|バトルゾーンに出せない)$/);
  if (m) return [{ type: 'playLimit', who: m[1] === '自分' ? 'self' : 'opponent', what: 'creature', max: n(m[2]) }];
  // ボルメテウス・レッド：「相手のターンに相手のクリーチャーが召喚以外の方法で出る時、相手はかわりにそのクリーチャーを墓地に置く」
  if (/^相手のターンに相手のクリーチャーが召喚以外の方法で(?:バトルゾーンに)?出る時、相手はかわりにそのクリーチャーを墓地に置く$/.test(t))
    return [{ type: 'nonSummonEntryToGrave', who: 'opponent', duringTurn: 'opponent' }];
  // 「各ターン、自分の闇のクリーチャー1体目の召喚コストを1少なくしてもよい」「各ターンに1度、自分の、名前に《X》とあるカードの実行コストを1少なくしてもよい」
  m = t.match(/^各ターン(?:に1度)?、(自分|相手)の、?(.+?)(?:1体目|1枚目)?の(?:召喚|実行|使用)コストを(\d+)少なくしてもよい(?:。ただし、?コストは(\d+)(以下|より少なく)(?:には|に)?ならない)?$/);
  if (m) {
    const filter: CardFilter = {};
    const subj = m[2];
    if (subj.endsWith('カード')) {
      if (!parseMods(subj.slice(0, -'カード'.length), filter)) return null;
    } else if (subj.endsWith('呪文')) {
      if (!parseMods(subj.slice(0, -'呪文'.length), filter)) return null;
      filter.cardType = 'spell';
    } else {
      if (!parseSubject(subj, filter)) return null;
      filter.cardType = 'creature';
    }
    const min = m[4] === undefined ? undefined : m[5] === '以下' ? n(m[4]) + 1 : n(m[4]);
    return [{ type: 'costMod', amount: -n(m[3]), appliesTo: { owner: owner(m[1]), filter }, firstPerTurn: true, ...(min !== undefined && min > 1 ? { minCost: min } : {}) }];
  }
  if (/^相手は、?(?:自身の)?(?:カードを)?マナゾーンに(?:カードを)?置く時、タップして置く$/.test(t) ||t === '相手のカードはマナゾーンにタップして置かれる') return [{ type: 'manaEntersTapped', who: 'opponent' }];
  m = t.match(/^相手はコスト(\d+)(以下|以上)の呪文を唱えられない$/);
  if (m) return [{ type: 'cannotCast', who: 'opponent', filter: m[2] === '以下' ? { maxCost: n(m[1]) } : { minCost: n(m[1]) } }];
  m = t.match(/^(自分|相手)の(.*?)(クリーチャー|呪文|カード)(?:の召喚|を召喚する|の唱える|を唱える|を実行する|の)?コストを(\d+)(多く|少なく)する(?:。ただし、?コストは0以下に(?:は)?ならない)?$/);
  if (m) {
    const filter: CardFilter = m[3] === 'カード' ? {} : { cardType: m[3] === '呪文' ? 'spell' : 'creature' };
    if (!parseMods(m[2], filter)) return null;
    return [{ type: 'costMod', amount: m[5] === '多く' ? n(m[4]) : -n(m[4]), appliesTo: { owner: owner(m[1]), ...(Object.keys(filter).length ? { filter } : {}) } }];
  }
  // 「自分のマフィ・ギャングを召喚するコストを1少なくする。ただし、コストは0以下にならない」「自分のゼニスを召喚するコストは3少なくなる。ただし、コストは5より少なくならない」
  m = t.match(/^(自分|相手)の(.+?)(?:を召喚する|の召喚)コスト(?:を(\d+)(多く|少なく)する|は(\d+)(多く|少なく)なる)(?:。ただし、?コストは(\d+)(以下|より少なく)(?:には|に)?ならない)?$/);
  if (m) {
    const filter: CardFilter = {};
    if (!parseSubject(m[2], filter)) return null;
    filter.cardType = 'creature';
    const amount = n(m[3] ?? m[5]);
    const more = (m[4] ?? m[6]) === '多く';
    // minCost は「これより下がらない」コスト（「N以下にならない」→ N+1）
    const min = m[7] === undefined ? undefined : m[8] === '以下' ? n(m[7]) + 1 : n(m[7]);
    return [{ type: 'costMod', amount: more ? amount : -amount, appliesTo: { owner: owner(m[1]), filter }, ...(min !== undefined && min > 1 ? { minCost: min } : {}) }];
  }
  return null;
}

// ───────────────────────── 入口 ─────────────────────────

/**
 * 知らない能力語を、カッコの補足説明から読む。
 * 能力語の多くは、補足説明に効果がふつうの文で書いてある（「水ステルス（相手のマナゾーンに水のカードが1枚でもあれば、このクリーチャーはブロックされない）」）。
 * 補足説明がすべて読めた時だけ使う。
 * - 「能力語（補足説明）」「能力語：指定（補足説明）」：補足説明をそのまま能力として読む
 * - 「〜時、アビス・メクレイド5する。（アビス・メクレイド5：〜）」：文の中の能力語を、補足説明の内容に置き換えて読む
 */
function parseFromReminder(line: string, options: string[], kind: 'creature' | 'spell' | 'other', out: ParsedAbilities): boolean {
  if (kind === 'other') return false;
  const raw = line.normalize('NFKC').replace(/[\s　]+/g, '').replace(/[−‐－–]/g, '-');
  const tryParse = (text: string): boolean => {
    const tmp: ParsedAbilities = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
    if (!applyKeywordLine(text, tmp.keywords) && !parseLine(text, options, kind, tmp)) return false;
    // タイミングだけ分かって中身が手動、という読み方は使わない
    if (tmp.abilities.some((a) => a.effects.some((e) => e.type === 'manual'))) return false;
    Object.assign(out.keywords, tmp.keywords);
    out.abilities.push(...tmp.abilities);
    out.statics.push(...tmp.statics);
    out.replacements.push(...tmp.replacements);
    for (const k of ['selfCost', 'condCost', 'gZero', 'attackSwap', 'neoEvolution', 'evolvesFrom', 'summonFrom', 'neoCostReduce', 'evolveSpec'] as const) if (tmp[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = tmp[k];
    if (tmp.altPlays) (out.altPlays ??= []).push(...tmp.altPlays);
    if (tmp.handTriggers) (out.handTriggers ??= []).push(...tmp.handTriggers);
    return true;
  };
  // 文の中の能力語を、補足説明の定義に置き換える
  const macro = raw.match(/^(.+?)\(([^():。、]{2,24}):([^()]+)\)$/);
  if (macro && macro[1].includes(`${macro[2]}する`)) {
    const body = macro[3].replace(/。$/, '');
    return tryParse(macro[1].split(`${macro[2]}する`).join(body));
  }
  // 能力語だけの行：補足説明を能力として読む
  const label = raw.match(/^([^()。、]{1,28})\(([^()]+)\)。?$/);
  if (!label) return false;
  if (tryParse(label[2])) return true;
  // 補足説明が、別々の能力を並べた文の時（「シールドを2つブレイクする。出たターン、各ブレイクの前に〜」）：1文ずつ読む。全部読めた時だけ使う
  const parts = label[2].split('。').filter(Boolean);
  if (parts.length < 2) return false;
  const all: ParsedAbilities = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
  const saved = out;
  for (const p of parts) {
    const one: ParsedAbilities = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
    if (!applyKeywordLine(p, one.keywords) && !parseLine(p, [], kind, one)) return false;
    if (one.abilities.some((a) => a.effects.some((e) => e.type === 'manual'))) return false;
    mergeParsed(all, one);
  }
  mergeParsed(saved, all);
  return true;
}

/** 読み取った能力のまとまりを、もう1つに足す */
function mergeParsed(out: ParsedAbilities, tmp: ParsedAbilities): void {
  Object.assign(out.keywords, tmp.keywords);
  out.abilities.push(...tmp.abilities);
  out.statics.push(...tmp.statics);
  out.replacements.push(...tmp.replacements);
  for (const k of ['selfCost', 'condCost', 'gZero', 'attackSwap', 'neoEvolution', 'evolvesFrom', 'summonFrom', 'neoCostReduce', 'evolveSpec'] as const) if (tmp[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = tmp[k];
  if (tmp.altPlays) (out.altPlays ??= []).push(...tmp.altPlays);
  if (tmp.handTriggers) (out.handTriggers ??= []).push(...tmp.handTriggers);
}

/**
 * 「能力語（〜があれば、このクリーチャーは次の能力を得る）」の行：条件を返す（メタモーフ・ノー・チョイス・ウェーブストライカー）。
 * 次の行（頭に r・w などの印が付くこともある）が、その条件つきで得る能力になる
 */
function parseGrantFrame(line: string): { condition: Condition; label: string } | null {
  const raw = line.normalize('NFKC').replace(/[\s　]+/g, '');
  const m = raw.match(/^([^()。、:]{2,20})\((.+?)、?このクリーチャー(?:は次の.?能力を得る|に次の.?能力を与える)\)$/);
  if (!m) return null;
  const c = splitCondition(`${normalizeText(m[2])}、x`);
  return c.condition && c.body === 'x' ? { condition: c.condition, label: m[1] } : null;
}

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
    const parts = raw.split(/\s*(?:[▼▽]|__)\s*/).map((x) => x.trim()).filter(Boolean);
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
  // 超魂X：この行より後の能力は、このカードが下にあるクリーチャーにも与える
  let soul: ParsedAbilities | null = null;
  const empty = (): ParsedAbilities => ({ keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] });
  let pendingFrame: { condition: Condition; line: string } | null = null;
  for (const { line: rawLine, options } of splitAbilityLines(text)) {
    // 条件つきの能力のアイコン：{S} サバイバー、{x+} S・トリガー・プラス、{xB} スーパー・S・トリガー
    const icon = rawLine.normalize('NFKC').trim().match(/^\{(S|x\+|xB)\}\s*([\s\S]*)$/);
    const line = icon ? icon[2] : rawLine;
    const t = stripIcons(normalizeText(line));
    // 補足説明（カッコ書き）だけの行は能力ではない
    if (!t && !options.length) continue;
    // 「〜があれば、このクリーチャーは次の能力を得る」：次の行を、その条件つきの能力として読む
    if (pendingFrame) {
      const frame = pendingFrame;
      pendingFrame = null;
      const tmp = empty();
      const bodyLine = rawLine.normalize('NFKC').trim().replace(/^(?:\{[a-zA-Z]\}|[a-zA-Z](?![a-zA-Z]))\s*/, '');
      const ok = kind !== 'other' && (applyKeywordLine(bodyLine, tmp.keywords) || parseLine(bodyLine, options, kind, tmp)) && !tmp.replacements.length && !tmp.abilities.some((a) => a.effects.some((e) => e.type === 'manual'));
      const key = [rawLine, ...options.map((o) => `▶${o}`)].join('\n');
      if (ok) {
        const and = (c?: Condition): Condition => (c ? { type: 'and', conditions: [frame.condition, c] } : frame.condition);
        if (Object.keys(tmp.keywords).length) result.statics.push({ type: 'grantKeyword', keywords: tmp.keywords, appliesTo: { owner: 'self', onlySelf: true }, condition: frame.condition });
        for (const st of tmp.statics) result.statics.push({ ...st, condition: and(st.condition) });
        for (const ab of tmp.abilities) result.abilities.push({ ...ab, condition: and(ab.condition) });
        result.parsedLines.push(frame.line, key);
      } else result.manualLines.push(frame.line, key);
      continue;
    }
    const frame = kind === 'creature' ? parseGrantFrame(rawLine) : null;
    if (frame) {
      if (frame.label === 'ウェーブストライカー') result.keywords.waveStriker = true;
      pendingFrame = { condition: frame.condition, line: rawLine };
      continue;
    }
    // 能力の文ごとの効果定義があれば、読み取りより優先して使う
    const lineDef = findLineDef(rawLine, options);
    if (lineDef) {
      for (const dst of soul ? [result, soul] : [result]) {
        Object.assign(dst.keywords, lineDef.keywords ?? {});
        dst.abilities.push(...(lineDef.abilities ?? []));
        dst.statics.push(...(lineDef.statics ?? []));
        dst.replacements.push(...(lineDef.replacements ?? []));
      }
      if (lineDef.altPlays?.length) (result.altPlays ??= []).push(...lineDef.altPlays);
      if (lineDef.handTriggers?.length) (result.handTriggers ??= []).push(...lineDef.handTriggers);
      result.parsedLines.push([rawLine, ...options.map((o) => `▶${o}`)].join('\n'));
      continue;
    }
    if (t === 'サバイバー' && result.survivor) {
      result.parsedLines.push(rawLine);
      continue;
    }
    if (icon) {
      const tmp = empty();
      const key = [rawLine, ...options.map((o) => `▶${o}`)].join('\n');
      const ok = applyKeywordLine(line, tmp.keywords) || parseLine(line, options, kind, tmp);
      // {x+}・{xB} は誘発能力（出た時・唱えた時）に条件を足す。ほかの形の能力は読まない
      const onlyAbilities = !Object.keys(tmp.keywords).length && !tmp.statics.length && !tmp.replacements.length;
      if (!ok || (icon[1] !== 'S' && !onlyAbilities)) {
        result.manualLines.push(key);
        continue;
      }
      if (icon[1] === 'S') {
        result.survivor ??= { keywords: {}, abilities: [], statics: [], replacements: [] };
        for (const dst of [result, result.survivor]) {
          Object.assign(dst.keywords, tmp.keywords);
          dst.abilities.push(...tmp.abilities);
          dst.statics.push(...tmp.statics);
          dst.replacements.push(...tmp.replacements);
        }
      } else {
        // S・トリガー・プラス：相手のターンで、そのターンに自分のシールドが2つ以上ブレイクされている
        // スーパー・S・トリガー：相手のターンで、自分のシールドが1つもない
        const extra: Condition =
          icon[1] === 'x+'
            ? { type: 'shieldsBrokenThisTurn', who: 'self', min: 2 }
            : { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 };
        for (const ab of tmp.abilities) {
          const conds: Condition[] = [{ type: 'opponentTurn' }, extra, ...(ab.condition ? [ab.condition] : [])];
          result.abilities.push({ ...ab, condition: { type: 'and', conditions: conds } });
        }
      }
      result.parsedLines.push(key);
      continue;
    }
    // サイキック・スーパー・クリーチャーのルールの文（エンジンが処理する／能力ではない）
    if (/^リンク解除$|^※覚醒リンクするために必要なカード/.test(t)) continue;
    if (t === '超魂X' && kind === 'creature') {
      soul = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
      result.parsedLines.push(line);
      continue;
    }
    if (t === '超魂レイド' && kind === 'creature') {
      result.abilities.push({ when: 'onSummon', effects: [{ type: 'soulRaid' }] });
      result.parsedLines.push(line);
      continue;
    }
    const link = kind === 'creature' ? parseAwakenLink(t) : null;
    if (link) {
      result.awakenLink = link;
      // 「自分のターンのはじめに」はその時だけ。そうでなければ条件がそろった時（出た時・他が出た時・ターンのはじめ）に調べる
      const whens: TriggerEvent[] = link.timing === 'turnStart' ? ['onTurnStart'] : ['onSummon', 'onOtherSummon', 'onTurnStart'];
      for (const when of whens) result.abilities.push({ when, effects: [{ type: 'awakenLink' }], ...(when === 'onOtherSummon' ? { who: 'self' as const } : {}) });
      result.parsedLines.push(line);
      continue;
    }
    if (applyKeywordLine(line, result.keywords)) {
      if (soul) applyKeywordLine(line, soul.keywords);
      continue;
    }
    const ok = parseLine(line, options, kind, result) || parseFromReminder(line, options, kind, result);
    if (soul && !parseLine(line, options, kind, soul)) parseFromReminder(line, options, kind, soul);
    (ok ? result.parsedLines : result.manualLines).push([line, ...options.map((o) => `▶${o}`)].join('\n'));
  }
  if (soul) result.soul = { keywords: soul.keywords, abilities: soul.abilities, statics: soul.statics, replacements: soul.replacements };
  return result;
}

/**
 * 覚醒リンク：「覚醒リンク-自分のターンのはじめに、バトルゾーンに自分の《A》と《B》があれば、そのクリーチャーとこのクリーチャーを裏返しリンクさせる」
 * 「V覚醒リンク?バトルゾーンに自分の《A》と《B》がある時、〜」（いつでも）
 */
function parseAwakenLink(t: string): ParsedAbilities['awakenLink'] | null {
  const m = t.match(/^[A-Z’']{0,3}覚醒リンク[-?ー―:：]?(自分のターンのはじめに、)?(?:または、自分の《[^》]+》が出た時、)?(?:バトルゾーンに)?自分の((?:《[^》]+》と?)+)(?:があれば|がある時)、(?:(?:その|それらの)クリーチャー|それら1体ずつ)とこのクリーチャーを裏返しリンクさせる。?$/);
  if (!m) return null;
  const names = [...m[2].matchAll(/《([^》]+)》/g)].map((x) => x[1]);
  return { names, timing: m[1] ? 'turnStart' : 'always' };
}

/** 本文の先頭の「〜があれば、」「〜なら、」を条件にする */
function splitCondition(body: string): { body: string | null; condition?: Condition } {
  const who = (w: string) => (w === '自分' ? 'self' : 'opponent') as Quantity['who'];
  // シビルカウント：「自分の火のクリーチャーまたは火のタマシードが合計3つ以上あれば、」
  const civil = body.match(/^自分の(光|水|闇|火|自然)のクリーチャーまたは\1のタマシードが合計(\d+)(?:つ|体|枚)以上あれば、(.+)$/);
  if (civil)
    return {
      body: civil[3],
      condition: { type: 'compare', left: { who: 'self', zone: 'battle', withPermanents: true, filter: { civilization: CIV[civil[1]], anyOf: [{ cardType: 'creature' }, { cardType: 'tamaseed' }] } }, op: '>=', right: n(civil[2]) },
    };
  // 水晶武装：「自分のマナゾーンに裏向きのカードが4枚以上あれば、」
  const crystal = body.match(/^(自分|相手)のマナゾーンに裏向きのカードが(\d+)枚以上あれば、(.+)$/);
  if (crystal) return { body: crystal[3], condition: { type: 'compare', left: { who: who(crystal[1]), zone: 'mana', filter: { faceDown: true } }, op: '>=', right: n(crystal[2]) } };
  // マナドライブ：「自分のマナゾーンのカードが3枚以上で闇文明があれば、」
  const drive = body.match(/^自分のマナゾーンのカードが(\d+)枚以上で(光|水|闇|火|自然)文明があれば、(.+)$/);
  if (drive)
    return {
      body: drive[3],
      condition: {
        type: 'and',
        conditions: [
          { type: 'compare', left: { who: 'self', zone: 'mana' }, op: '>=', right: n(drive[1]) },
          { type: 'compare', left: { who: 'self', zone: 'mana', filter: { civilization: CIV[drive[2]] } }, op: '>=', right: 1 },
        ],
      },
    };
  // ノー・チョイス：「手札を1枚も持っていないプレイヤーがひとりでもいれば、」
  const noHand = body.match(/^手札を1枚も持っていないプレイヤーが(?:ひとり|1人)でもいれば、(.+)$/);
  if (noHand)
    return {
      body: noHand[1],
      condition: { type: 'or', conditions: [{ type: 'compare', left: { who: 'self', zone: 'hand' }, op: '<=', right: 0 }, { type: 'compare', left: { who: 'opponent', zone: 'hand' }, op: '<=', right: 0 }] },
    };
  // ウェーブストライカー：「「ウェーブストライカー」を持つクリーチャーが他に2体以上あれば、」
  const wave = body.match(/^「ウェーブストライカー」を持つクリーチャーが他に(\d+)体以上あれば、(.+)$/);
  if (wave) return { body: wave[2], condition: { type: 'compare', left: { who: 'any', zone: 'battle', filter: { hasKeyword: 'waveStriker', excludeSelf: true } }, op: '>=', right: n(wave[1]) } };
  // 「このターン、自分のクリーチャーがバトルに勝っていれば、」
  const wonB = body.match(/^(?:この|その)ターン、?(自分|相手)のクリーチャーがバトルに勝っていれば、(.+)$/);
  if (wonB) return { body: wonB[2], condition: { type: 'wonBattleThisTurn', who: wonB[1] === '自分' ? 'self' : 'opponent' } };
  // 「このクリーチャーが出たターン、各ブレイクの前に、〜」：出たターンだけ
  const enteredTurn = body.match(/^このクリーチャーが(?:バトルゾーンに)?出たターン、(.+)$/);
  if (enteredTurn) return { body: enteredTurn[1], condition: { type: 'selfEnteredThisTurn' } };
  // 「そのクリーチャーがコストを支払わずに出ていたら、」（誘発の原因になったクリーチャー）
  const free = body.match(/^(?:その|それらの)クリーチャーがコストを支払わずに出ていたら、(.+)$/);
  if (free) return { body: free[1], condition: { type: 'subjectEnteredFree' } };
  // 「そのターン、クリーチャーが3体以上出ていれば、」
  const entered = body.match(/^(?:その|この)ターン、?(?:(自分|相手)の)?クリーチャーが(\d+)体以上(?:バトルゾーンに)?出ていれば、(.+)$/);
  if (entered) return { body: entered[3], condition: { type: 'enteredThisTurn', who: entered[1] === '自分' ? 'self' : entered[1] === '相手' ? 'opponent' : 'any', min: n(entered[2]) } };
  // 鬼タイム：「自分と相手のシールドの数が合計6つ以下なら、」
  const oni = body.match(/^自分と相手のシールドの数が合計(\d+)(?:つ|枚)以下なら、(.+)$/);
  if (oni) return { body: oni[2], condition: { type: 'compare', left: { who: 'any', zone: 'shield' }, op: '<=', right: n(oni[1]) } };
  // 「追加ターン中でなければ、」
  const extra = body.match(/^追加ターン中で(なければ|あれば)、(.+)$/);
  if (extra) return { body: extra[2], condition: extra[1] === 'なければ' ? { type: 'not', condition: { type: 'inExtraTurn' } } : { type: 'inExtraTurn' } };
  // 「これが進化クリーチャーなら、」
  const evo = body.match(/^これが進化クリーチャーなら、(.+)$/);
  if (evo) return { body: evo[1], condition: { type: 'selfIsEvolution' } };
  // 「このターンに2つ以上自分のシールドがブレイクされていなければ、」
  const broken = body.match(/^(?:この|その)ターン(?:に|中)?、?(\d+)つ以上(自分|相手)のシールドがブレイクされて(いれば|いなければ)、(.+)$/);
  if (broken) {
    const cond: Condition = { type: 'shieldsBrokenThisTurn', who: broken[2] === '自分' ? 'self' : 'opponent', min: n(broken[1]) };
    return { body: broken[4], condition: broken[3] === 'いなければ' ? { type: 'not', condition: cond } : cond };
  }
  // 「そのターン自分が呪文を唱えていれば、」
  const cast = body.match(/^(?:その|この)ターン、?(自分|相手)が呪文を唱えていれば、(.+)$/);
  if (cast) return { body: cast[2], condition: { type: 'castThisTurn', who: cast[1] === '自分' ? 'self' : 'opponent' } };
  // 「クリーチャーが6体以上あれば、それらをすべて破壊する」（両方のプレイヤーのクリーチャー）
  const anyC = body.match(/^(?:バトルゾーンに)?クリーチャーが(\d+)体以上(あれば|なければ)、(.+)$/);
  if (anyC) {
    const cond: Condition = { type: 'compare', left: { who: 'any', zone: 'battle' }, op: '>=', right: n(anyC[1]) };
    return { body: anyC[3].replace(/^それらを/, 'クリーチャーを'), condition: anyC[2] === 'なければ' ? { type: 'not', condition: cond } : cond };
  }
  // 「バトルゾーンにエンジェル・コマンドが1体以上あれば、」（どちらのプレイヤーのものでも）
  const anyS = body.match(/^バトルゾーンに([^、。]+?)が(\d+)体以上(あれば|なければ)、(.+)$/);
  if (anyS && !/^(?:自分|相手)の/.test(anyS[1])) {
    const filter: CardFilter = {};
    if (parseSubject(anyS[1], filter)) {
      const cond: Condition = { type: 'compare', left: { who: 'any', zone: 'battle', filter }, op: '>=', right: n(anyS[2]) };
      return { body: anyS[4], condition: anyS[3] === 'なければ' ? { type: 'not', condition: cond } : cond };
    }
  }
  // 「そのターンこのクリーチャーが攻撃していたら、破壊する」（目的語のない動詞はこのクリーチャー）
  const atk = body.match(/^(?:その|この)ターン、?このクリーチャーが攻撃していたら、(.+)$/);
  if (atk) return { body: atk[1].replace(/^(破壊する|手札に戻す|マナゾーンに置く)(。?)$/, 'このクリーチャーを$1$2'), condition: { type: 'attackedThisTurn' } };
  // 「バトルゾーンに自分のフィールドがあれば」
  const fld = body.match(/^(?:バトルゾーンに)?(自分|相手)のフィールドが(?:(\d+)つ以上)?(あれば|なければ)、(.+)$/);
  if (fld) {
    const cond: Condition = { type: 'compare', left: { who: who(fld[1]), zone: 'battle', filter: { cardType: 'field' } }, op: '>=', right: fld[2] ? n(fld[2]) : 1 };
    return { body: fld[4], condition: fld[3] === 'なければ' ? { type: 'not', condition: cond } : cond };
  }
  let m = body.match(/^(?:バトルゾーンに)?(自分|相手)の(.+?)が(?:(\d+)(?:体|つ)以上)?(あれば|なければ)、(.+)$/);
  if (m && !/^(?:マナゾーン|墓地|手札|山札|シールド)/.test(m[2])) {
    const filter: CardFilter = {};
    // 「他の」はこのカード自身を数えない（エンジンが条件の判定に発生源を渡す）
    if (!parseSubject(m[2], filter)) return { body: null };
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
  m = body.match(/^(自分|相手)の(マナゾーン|墓地|手札)に(.*?)(カード|クリーチャー|呪文)が(あれば|なければ)、(.+)$/);
  if (m) {
    const filter: CardFilter = m[4] === 'カード' ? {} : { cardType: m[4] === '呪文' ? 'spell' : 'creature' };
    if (!parseMods(m[3], filter)) return { body: null };
    const cond: Condition = { type: 'compare', left: { who: who(m[1]), zone: ZONE_WORD[m[2]] as Quantity['zone'], ...(Object.keys(filter).length ? { filter } : {}) }, op: '>=', right: 1 };
    return { body: m[6], condition: m[5] === 'なければ' ? { type: 'not', condition: cond } : cond };
  }
  m = body.match(/^(自分|相手)の手札が(\d+)枚(以上|以下)(?:なら|あれば)、(.+)$/);
  if (m) return { body: m[4], condition: { type: 'compare', left: { who: who(m[1]), zone: 'hand' }, op: m[3] === '以下' ? '<=' : '>=', right: n(m[2]) } };
  return { body };
}

function parseLine(line: string, options: string[], kind: 'creature' | 'spell' | 'other', out: ParsedAbilities): boolean {
  const t = normalizeText(line);
  const opts = options.map(normalizeText);
  if (kind === 'other') return false;
  // 「このクリーチャーが出たターン、各ブレイクの前に、相手のクリーチャーを1体破壊する」：誘発に「出たターンだけ」の条件を付ける
  // 「このクリーチャーが出たターンに攻撃する時、〜」も同じ
  const turnTrig = t.match(/^このクリーチャーが(?:バトルゾーンに)?出たターン(?:、(各ブレイクの前に、.+)|に(攻撃する時、.+))$/);
  if (turnTrig && kind === 'creature') {
    const tmp: ParsedAbilities = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
    if (!parseLine(turnTrig[1] ?? `このクリーチャーが${turnTrig[2]}`, options, kind, tmp) || tmp.abilities.some((a) => a.effects.some((e) => e.type === 'manual'))) return false;
    for (const ab of tmp.abilities) out.abilities.push({ ...ab, condition: ab.condition ? { type: 'and', conditions: [{ type: 'selfEnteredThisTurn' }, ab.condition] } : { type: 'selfEnteredThisTurn' } });
    return true;
  }
  // 「このクリーチャーをタップして出してもよい」：出た時に、タップするかを選ぶ
  if (/^このクリーチャーを、?タップして(?:バトルゾーンに)?出してもよい。?$/.test(t) && kind === 'creature') {
    out.abilities.push({ when: 'onSummon', optional: true, effects: [{ type: 'selfAction', action: 'tap' }] });
    return true;
  }
  // 「このクリーチャーが破壊された時、自分の墓地から手札に戻す」：目的語のない文はこのクリーチャー
  const bare = t.match(/^(このクリーチャーが(?:破壊された|離れた)時、)((?:自分の)?墓地から手札に戻(?:す|してもよい)。?)$/);
  if (bare && kind === 'creature') return parseLine(`${bare[1]}このクリーチャーを${bare[2].replace(/^(?!自分の)/, '自分の')}`, options, kind, out);
  // クルー・ブレイカー：「このクリーチャーは、自分の他のハンター1体につき、シールドをさらにもう1枚ブレイクする」
  const crew = t.match(/^このクリーチャーは、?(.+?につき)、?シールドをさらに(?:もう)?(\d+)(?:枚|つ)ブレイクする。?$/);
  if (crew && kind === 'creature') {
    const p = parsePer(crew[1]);
    if (!p) return false;
    out.statics.push({ type: 'breakerBonus', amount: n(crew[2]), perCount: p.per, unit: p.unit });
    return true;
  }
  // G・ブレイカー：「このクリーチャーは、相手のシールドをすべてブレイクし、その攻撃の後、自分のシールドをすべてブレイクする」
  if (/^このクリーチャーは、?相手のシールドをすべてブレイクし、その攻撃の後、自分のシールドをすべてブレイクする。?$/.test(t) && kind === 'creature') {
    out.keywords.breaker = 99;
    out.abilities.push({ when: 'onAttackEnd', effects: [{ type: 'breakShields', count: 99, self: true }] });
    return true;
  }
  // 「これを装備したクリーチャーに〜／が〜時、〜」（ドラグハート・ウエポン）：「このクリーチャー」の文として読み、装備先にかかる形にする
  const eq = t.match(/^これを装備したクリーチャー(.+)$/);
  if (eq && kind === 'creature') {
    const tmp: ParsedAbilities = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
    const asSelf = `このクリーチャー${eq[1]}`;
    if (!applyKeywordLine(asSelf, tmp.keywords) && !parseLine(asSelf, options, kind, tmp)) return false;
    const selfRef = (e: EffectDef): boolean => e.type === 'selfAction' || (('target' in e) && e.target === 'self') || e.type === 'manual';
    if (tmp.replacements.length || tmp.abilities.some((a) => a.effects.some(selfRef))) return false;
    if (tmp.statics.some((st) => !('appliesTo' in st) || !st.appliesTo.onlySelf)) return false;
    const appliesTo: Applies = { owner: 'self', equipped: true };
    if (Object.keys(tmp.keywords).length) out.statics.push({ type: 'grantKeyword', keywords: tmp.keywords, appliesTo });
    for (const st of tmp.statics) out.statics.push({ ...st, appliesTo } as StaticAbility);
    for (const ab of tmp.abilities) out.abilities.push({ ...ab, viaEquip: true });
    return true;
  }
  // シンカライズ：このタマシードがクリーチャーであるかのように、この上に進化クリーチャーを置いてもよい
  if (/^シンカライズ(?:[:：].*)?$/.test(t)) {
    out.keywords.shinkarize = true;
    return true;
  }
  // スマッシュ・バースト：攻撃する時、このカードの呪文側を、バトルゾーンに置いたままコストを支払わずに唱えてもよい
  if (/^スマッシュ・バースト。?$/.test(t) && kind === 'creature') {
    out.abilities.push({ when: 'onAttack', optional: true, effects: [{ type: 'castOwnTwin' }] });
    return true;
  }
  if (/^自分のクリーチャーは、?相手のカードによる攻撃できない効果を無視して攻撃できる。?$/.test(t)) {
    out.statics.push({ type: 'ignoreAttackLocks', appliesTo: { owner: 'self' } });
    return true;
  }
  const neoCost = t.match(/^NEO進化クリーチャーとして召喚するなら、このクリーチャーの召喚コストを(\d+)少なくする。?$/);
  if (neoCost && kind === 'creature') {
    out.neoCostReduce = n(neoCost[1]);
    return true;
  }
  // 手札にある間の誘発：「相手のターンの終わりに、そのターン、クリーチャーが3体以上出ていれば、この呪文をコストを支払わずに唱えてもよい」
  const ht = t.match(/^相手のターンの終わりに、(?:(.+)、)?この(?:呪文|クリーチャー|カード)をコストを支払わずに(?:唱え|召喚し|使っ|実行し)てもよい。?$/);
  if (ht) {
    let condition: Condition | undefined;
    if (ht[1]) {
      const c = splitCondition(`${ht[1]}、x`);
      if (!c.condition || c.body !== 'x') return false;
      condition = c.condition;
    }
    (out.handTriggers ??= []).push({ when: 'opponentTurnEnd', ...(condition ? { condition } : {}) });
    return true;
  }
  // 別のコストでの使い方（リサイクル・キリフダッシュ・ギャラクシールド・フシギバース・B・A・D など）
  const alt = parseAltPlay(t, line, kind);
  if (alt) {
    (out.altPlays ??= []).push(alt);
    return true;
  }
  // ギャラクシールドで置いたカード：「自分のターンのはじめに、このクリーチャーが表向きで自分のシールドゾーンにあれば、コストを支払ったものとして召喚する」
  if (/^自分のターンのはじめに、この(?:クリーチャー|カード)が表向きで自分のシールドゾーンにあれば、コストを支払ったものとして(?:召喚|実行)する。?$/.test(t) && kind === 'creature') {
    out.galaxyReturn = true;
    return true;
  }
  // 「バトルゾーンに自分のフィールドがあれば、このクリーチャーを自分の墓地から召喚してもよい」
  const from = t.match(/^(?:(.+)、)?このクリーチャーを(?:自分の)?(墓地|マナゾーン)から召喚してもよい。?$/);
  if (from && kind === 'creature') {
    let condition: Condition | undefined;
    if (from[1]) {
      const c = splitCondition(`${from[1]}、x`);
      if (!c.condition || c.body !== 'x') return false;
      condition = c.condition;
    }
    const zone = from[2] === '墓地' ? 'graveyard' : 'mana';
    out.summonFrom = { zones: [...(out.summonFrom?.zones ?? []), zone], ...(condition ? { condition } : {}) };
    return true;
  }
  // Dスイッチ：「自分のターンのはじめに、このD2フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、自分の封印を6枚まで墓地に置いてもよい」
  const dsw = t.match(/^Dスイッチ[:：]自分のターンのはじめに、このD2フィールドをゲーム中で一度上下逆さまにしてもよい。そうしたら、自分の封印を(\d+)(?:枚|つ)まで墓地に置(?:く|いてもよい)。?$/);
  if (dsw) {
    out.abilities.push({ when: 'onTurnStart', effects: [{ type: 'removeOwnSeals', count: n(dsw[1]) }], optional: true, dSwitch: true });
    return true;
  }
  // 「このクリーチャーを進化ではないクリーチャーの上に置いた時、〜」：進化元が進化ではなかった時の出た時
  const onNonEvo = t.match(/^このクリーチャーを進化ではないクリーチャーの上に置いた時、(.+)$/);
  if (onNonEvo && kind === 'creature') {
    const groups = isUnsafe(onNonEvo[1]) ? null : parseBody(onNonEvo[1], opts);
    if (!groups) return false;
    for (const g of groups) out.abilities.push({ when: 'onSummon', effects: g.effects, evolvedOnNonEvolution: true, ...(g.optional ? { optional: true } : {}) });
    return true;
  }
  // 「自分の墓地に呪文が2枚以上あれば、自分のシールドゾーンにあるこの呪文に「S・トリガー」を与える」
  const stIf = t.match(/^(.+)、自分のシールドゾーンにあるこの(?:呪文|クリーチャー|カード)に「S・トリガー」を与える。?$/);
  if (stIf) {
    const c = splitCondition(`${stIf[1]}、x`);
    if (!c.condition || c.body !== 'x') return false;
    out.shieldTriggerIf = c.condition;
    return true;
  }
  // 「このクリーチャーを召喚する時、自分の手札から進化クリーチャーを1体、相手に見せてもよい。そうしたら、このクリーチャーの召喚コストを2少なくする」
  const show = t.match(/^このクリーチャーを召喚する時、自分の手札から(.+?)を1(?:体|枚)、?相手に見せてもよい。そうしたら、このクリーチャーの召喚コストを(\d+)少なくする(?:。ただし、?コストは0以下に(?:は)?ならない)?。?$/);
  if (show && kind === 'creature') {
    const filter: CardFilter = {};
    if (!parsePickWhat(show[1], filter)) return false;
    out.condCost = { amount: n(show[2]), condition: { type: 'compare', left: { who: 'self', zone: 'hand', filter }, op: '>=', right: 1 } };
    return true;
  }
  // 名前だけの能力語（「マナ武装5：」「鬼タイム：」など）。条件は後ろの文に書いてあるので外して読む
  const label = t.match(/^(?:マナ武装|龍マナ武装|鬼タイム|革命|マナドライブ|シンカパワー|メテオバーン)\d*[:：](.+)$/);
  if (label) return parseLine(label[1], options, kind, out);
  // 知らない能力語でも「能力語：本文」で、本文がふつうの能力としてすべて読めればそれを使う（シビルカウント3：〜、水晶武装4：〜）。
  // カッコの補足説明に条件が書いてある行（バラバラエティなど）は、本文だけでは条件が分からないので読まない
  // （補足説明があっても、条件や「この能力を与える」が書いていなければ読む）
  const condInReminder = /[(（][^()（）]*(?:あれば|なら、|この能力を与える)[^()（）]*[)）]/.test(line.normalize('NFKC'));
  const anyLabel = condInReminder ? null : (t.match(/^[^、。:：「」]{2,14}?\d*(?:\((?:光|水|闇|火|自然)\))?[:：](.{8,})$/) ?? t.match(/^[^、。:：「」-]{0,10}覚醒-(.{8,})$/));
  if (anyLabel && !/^(?:進化|NEO進化|G-NEO進化|侵略|革命チェンジ|シンパシー|G・ゼロ|アタック・チャンス|Dスイッチ|ハイパー化|ウルトラ・セイバー)/.test(t)) {
    const tmp: ParsedAbilities = { keywords: {}, abilities: [], statics: [], replacements: [], manualLines: [], parsedLines: [] };
    if (parseLine(anyLabel[1], options, kind, tmp) && !tmp.abilities.some((a) => a.effects.some((e) => e.type === 'manual'))) {
      mergeParsed(out, tmp);
      return true;
    }
  }
  // G・ゼロ：「G・ゼロ：バトルゾーンに自分の〜があれば、このクリーチャーをコストを支払わずに召喚してもよい」
  const gz = t.match(/^G・ゼロ[:：\-](.+)、この(?:クリーチャー|呪文|カード)を(?:コストを支払わずに|コスト0で)(?:召喚し|唱え|使っ)てもよい。?$/);
  if (gz) {
    const c = splitCondition(`${gz[1]}、x`);
    if (!c.condition || c.body !== 'x') return false;
    out.gZero = c.condition;
    return true;
  }
  // シンパシー：「シンパシー：自分のドラゴン・クリーチャー」その1体につき召喚コストを1（W・シンパシーは2）少なくする
  const sym = t.match(/^(W・)?シンパシー[:：](?:自分の)?(.+?)。?$/);
  if (sym && kind === 'creature') {
    const filter = parseSwapCondition(sym[2]);
    if (!filter) return false;
    out.selfCost = { amount: sym[1] ? 2 : 1, per: { who: 'self', zone: 'battle', ...(Object.keys(filter).length ? { filter } : {}) }, unit: 1, min: 1 };
    return true;
  }
  // アタック・チャンス：「アタック・チャンス：光のパワー4000以上のクリーチャー」
  const ac = t.match(/^アタック・チャンス[:：](.+?)。?$/);
  if (ac) {
    const filter = parseSwapCondition(ac[1]);
    if (!filter) return false;
    out.attackSwap = { kind: 'attackChance', filter };
    return true;
  }
  // G-NEO進化：NEO進化と同じく重ねてもよく、離れる時はかわりに下のカードすべてが離れる
  const gneo = t.match(/^G-NEO進化[:：](?:自分の)?(.+?)1体の上に置いてもよい。?$/);
  if (gneo && kind === 'creature') {
    const filter = parseSwapCondition(gneo[1]);
    if (!filter) return false;
    out.neoEvolution = filter;
    out.replacements.push({ event: 'leaveBattle', subject: 'self', instead: 'shedUnder' });
    return true;
  }
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
  // 進化の種類（マナ進化・墓地進化・手札進化・シールド進化・デッキ進化・進化V/GV・究極進化・スター進化・超無限進化など）
  const es = kind === 'creature' ? parseEvolveSpec(t) : null;
  if (es) {
    out.evolveSpec = es.spec;
    // スター進化：離れる時、かわりに一番上のカードが離れる／G-NEO進化：かわりに下のカードすべてが離れる
    if (es.star) out.replacements.push({ event: 'leaveBattle', subject: 'self', instead: 'shedTop' });
    if (es.gneo) out.replacements.push({ event: 'leaveBattle', subject: 'self', instead: 'shedUnder' });
    return true;
  }
  // S-MAX進化：進化元を必要としない（負ける時の置換は手動）
  if (/^[^:：]{0,6}S-MAX進化[:：]/.test(t) && kind === 'creature') out.evolveSpec = { zones: [], count: 0, optional: true };
  // エターナル・Ω：離れる時、かわりに手札に戻す
  if (/^エターナル・[ΩΩ]。?$/.test(t) && kind === 'creature') {
    out.replacements.push({ event: 'leaveBattle', subject: 'self', instead: 'toHand' });
    return true;
  }
  // マジボンバーN：攻撃する時、山札の上を見て、コストN以下のクリーチャーを手札または山札の上から出してもよい
  const magi = t.match(/^マジボンバー(\d+)。?$/);
  if (magi && kind === 'creature') {
    out.abilities.push({ when: 'onAttack', effects: [{ type: 'magibomber', maxCost: n(magi[1]) }] });
    return true;
  }
  if (t === 'エスケープ' && kind === 'creature') {
    out.replacements.push({ event: 'destroyed', subject: 'self', instead: 'escape', optional: true });
    return true;
  }
  // 侵略・革命チェンジ：「侵略：火のコマンド」「革命チェンジ：多色のコスト5以上のドラゴン」
  const swap = t.match(/^(侵略|革命チェンジ)[:：\-—―ー](.+?)。?$/);
  if (swap && kind === 'creature') {
    const filter = parseSwapCondition(swap[2]);
    if (!filter) return false;
    out.attackSwap = { kind: swap[1] === '侵略' ? 'invasion' : 'revolution', filter };
    return true;
  }
  // S級侵略：「S級侵略[不死]：闇のコマンド（自分の闇のコマンドが攻撃する時、自分の手札または墓地にあるこのクリーチャーをその上に重ねてもよい）」
  const sClass = t.match(/^S級侵略[[「【]([^\]」】]+)[\]」】][:：\-—―ー](.+?)。?$/);
  if (sClass && kind === 'creature') {
    const filter = parseSwapCondition(sClass[2]);
    const from = sClassZones(line, sClass[1]);
    if (!filter || !from) return false;
    out.attackSwap = { kind: 'invasion', filter, zones: from.zones, ...(from.cardOnly ? { battleCardOnly: true } : {}) };
    return true;
  }
  // ウルトラ・セイバー：「名前に《ボルメテウス》とあるクリーチャー」が離れる時、かわりにこのクリーチャーを破壊してもよい
  const us = t.match(/^ウルトラ・セイバー[:：]名前に《([^》]+)》とあるクリーチャー。?$/);
  if (us && kind === 'creature') {
    out.replacements.push({ event: 'leaveBattle', subject: 'otherOwn', filter: { nameIncludes: us[1] }, instead: 'destroySelf', optional: true });
    return true;
  }
  const cc = t.match(/^(.+?)(?:があれば|なら)、このクリーチャーの召喚コストを(\d+)少なくする。?$/);
  if (cc && kind === 'creature') {
    const c = splitCondition(cc[1] + (cc[0].includes('があれば、') ? 'があれば、x' : 'なら、x'));
    if (c.condition && c.body === 'x') {
      out.condCost = { amount: n(cc[2]), condition: c.condition };
      return true;
    }
  }
  const selfCost = parseSelfCost(t.replace(/。$/, ''));
  if (selfCost) {
    out.selfCost = selfCost;
    return true;
  }
  const replacement = parseReplacement(t.replace(/\*+$/, '').replace(/。$/, ''));
  if (replacement && kind === 'creature') {
    out.replacements.push(replacement);
    return true;
  }
  // 能力語（「鬼タイム：」など）や特殊な記号・カード名の指定を含む文は手動
  const unsafe = isUnsafe(t);
  const trig = kind === 'creature' ? parseTrigger(t) : null;
  if (trig || kind === 'spell') {
    const whens: TriggerEvent[] = trig ? trig.when : ['onCast'];
    const extra = {
      ...(trig?.who ? { who: trig.who } : {}),
      ...(trig?.filter ? { filter: trig.filter } : {}),
      ...(trig?.minDrawCount ? { minDrawCount: trig.minDrawCount } : {}),
      ...(trig?.oncePerTurn ? { oncePerTurn: true } : {}),
      ...(trig?.duringTurn ? { duringTurn: trig.duringTurn } : {}),
    };
    const { body, condition } = splitCondition(trig ? trig.rest : t);
    refCtx.event = !!trig?.subject;
    refCtx.chosen = false;
    const groups = unsafe || body === null ? null : parseBody(body, opts);
    refCtx.event = false;
    for (const when of whens) {
      if (!groups) {
        // タイミングは分かるので、その時にログで手動処理を促す
        const text = [line, ...options.map((o) => `▶${o}`)].join(' ').replace(/\s+/g, ' ');
        out.abilities.push({ when, effects: [{ type: 'manual', text }], ...extra });
        continue;
      }
      // カードに書かれた1つの能力は、1つの誘発にまとめる（「Aしてもよい。その後、Bしてもよい」は書かれた順に処理する）
      const merged: Group[] = groups.length > 1 ? [{ optional: false, effects: flattenGroups(groups) }] : groups;
      for (const g of merged) out.abilities.push({ when, effects: g.effects, ...(g.optional ? { optional: true } : {}), ...(condition ? { condition } : {}), ...extra });
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

/** 能力語・特殊な記号・カード名の指定など、読み取りの対象外の書き方を含むか（キーワードの「」は読む） */
function isUnsafe(t: string): boolean {
  return /[:：\[{「]/.test(t.replace(/「[^「」]+」(?:と「[^「」]+」)*を(?:与え|得)|「S・トリガー」は使えない|「[^「」]+」(?:を持つ|付きの|つきの)/g, ''));
}

/** 「このクリーチャーは攻撃できない」などを、このクリーチャーだけにかかる常在効果にする（条件つきで使う） */
function selfKeywordStatic(t: string): StaticAbility[] | null {
  const kw: Keywords = {};
  if (!applyKeywordLine(t, kw)) return null;
  return [{ type: 'grantKeyword', keywords: kw, appliesTo: { owner: 'self', onlySelf: true } }];
}

const MARK_CIV: Record<string, Civilization> = { l: 'light', w: 'water', d: 'darkness', f: 'fire', n: 'nature' };
/** マナの記号 [ww04]：文字が必要な文明、数字がコスト（c は文明を問わない） */
function parseMark(letters: string, digits: string): { cost: number; civilizations: Civilization[] } {
  return { cost: n(digits), civilizations: [...new Set([...letters].map((c) => MARK_CIV[c]).filter(Boolean))] };
}

/**
 * 別のコストで使う能力語の表：言い方 → 使い方（AltPlay）。
 * 新しい能力語はここに1行足す（エンジンは AltPlay の項目を見て処理する）。m[1]・m[2] はマナの記号、または数字
 */
const ALT_PLAYS: { re: RegExp; kinds: ('creature' | 'spell')[]; build: (m: RegExpMatchArray, raw: string) => AltPlay }[] = [
  { re: /^リサイクル\[([a-z]+)(\d+)\]$/, kinds: ['spell'], build: (m) => ({ name: 'リサイクル', ...parseMark(m[1], m[2]), from: 'graveyard', spellAfter: 'deckBottom' }) },
  { re: /^ギャラクシールド\[([a-z]+)(\d+)\]$/, kinds: ['creature', 'spell'], build: (m) => ({ name: 'ギャラクシールド', ...parseMark(m[1], m[2]), toShield: true }) },
  { re: /^キリフダッシュ\[([a-z]+)(\d+)\]$/, kinds: ['creature'], build: (m) => ({ name: 'キリフダッシュ', ...parseMark(m[1], m[2]), timing: 'attackEndBreak' }) },
  {
    re: /^フシギバース\[([a-z]+)(\d+)\]$/,
    kinds: ['creature'],
    build: (m, raw) => {
      // 「ただし、コストは[dn02]より少なくならない」
      const min = raw.match(/コストは\[[a-z]+(\d+)\]より少なくならない/);
      return { name: 'フシギバース', ...parseMark(m[1], m[2]), from: 'graveyard', fushigi: { min: min ? n(min[1]) : 1 } };
    },
  },
  { re: /^D・D・D\[([a-z]+)(\d+)\]$/, kinds: ['creature', 'spell'], build: (m) => ({ name: 'D・D・D', ...parseMark(m[1], m[2]), timing: 'ownAttack' }) },
  { re: /^B・A・D(\d+)$/, kinds: ['creature'], build: (m) => ({ name: 'B・A・D', reduce: n(m[1]), endOfTurn: 'destroy' }) },
  { re: /^J・O・E(\d+)$/, kinds: ['creature'], build: (m) => ({ name: 'J・O・E', reduce: n(m[1]), endOfTurn: 'deckBottomDraw' }) },
  {
    re: /^アビスラッシュ[:：]このクリーチャーを自分の墓地から召喚してもよい。そうしたら、このターン、このクリーチャーはプレイヤーを攻撃でき、ターンの終わりに山札の下に置かれる$/,
    kinds: ['creature'],
    build: () => ({ name: 'アビスラッシュ', from: 'graveyard', speed: true, endOfTurn: 'deckBottom' }),
  },
];

/** 別のコストで使う能力の行を読む。読めなければ null */
function parseAltPlay(t: string, rawLine: string, kind: 'creature' | 'spell'): AltPlay | null {
  const body = t.replace(/。$/, '');
  const raw = rawLine.normalize('NFKC').replace(/\s+/g, '');
  for (const r of ALT_PLAYS) {
    const m = body.match(r.re);
    if (m && r.kinds.includes(kind)) return r.build(m, raw);
  }
  // リサイタル：「この呪文を墓地からコスト5を支払って唱えてもよい。そうして唱えた後、墓地に置くかわりに自分の山札の一番下に置く」
  const recital = body.match(/^この呪文を(?:自分の)?墓地からコスト(\d+)を支払って唱えてもよい(。そうして唱えた後、墓地に置くかわりに(?:自分の)?山札の(?:一番)?下に置く)?$/);
  if (recital && kind === 'spell') return { name: `墓地からコスト${n(recital[1])}で唱える`, cost: n(recital[1]), from: 'graveyard', ...(recital[2] ? { spellAfter: 'deckBottom' as const } : {}) };
  // 「自分の墓地にカードが6枚以上あれば、この呪文を[wdf04]支払って唱えてもよい」「この呪文を[ll04]支払って唱えてもよい。そうしたら、〜」
  const m = body.match(/^(?:(.+)、)?この呪文を\[([a-z]+)(\d+)\]支払って唱えてもよい(?:。そうしたら、(.+))?$/);
  if (!m || kind !== 'spell') return null;
  const alt: AltPlay = { name: `コスト${n(m[3])}で唱える`, ...parseMark(m[2], m[3]) };
  if (m[1]) {
    const c = splitCondition(`${m[1]}、x`);
    if (!c.condition || c.body !== 'x') return null;
    alt.condition = c.condition;
  }
  if (m[4]) {
    refCtx.event = refCtx.chosen = false;
    const groups = parseBody(m[4], []);
    if (!groups || groups.some((g) => g.optional)) return null;
    alt.then = groups.flatMap((g) => g.effects);
  }
  return alt;
}

/** 進化元の条件（「進化クリーチャー」「エイリアン」「火または自然のクリーチャー」「呪文」「カード」）を読む */
function evolveFilter(text: string): CardFilter | null {
  const w = text.replace(/^自分の/, '').replace(/、$/, '');
  if (!w || w === 'カード') return {};
  // 「究極進化クリーチャー」：進化クリーチャーとして扱う
  if (w === '究極進化クリーチャー') return { evolution: true };
  const f: CardFilter = {};
  if (parsePickWhat(w, f)) return f;
  // 「デモニオ、闇、または自然の、クリーチャー」：種族か文明のどれかに合うもの
  const list = w.match(/^(.+?)の?、?クリーチャー$/);
  if (list && /、|または/.test(list[1])) {
    const items = list[1].split(/、(?:または)?|または/).map((x) => x.replace(/の$/, '')).filter(Boolean);
    if (items.every((x) => /^[^、のをにがで「」]+$/.test(x))) return { anyOf: items.map((x) => (CIV[x] ? { civilization: CIV[x] } : { race: x })) };
  }
  return parseSwapCondition(w);
}

const EVOLVE_ZONE: Record<string, EvolveSpec['zones'][number]> = { マナゾーン: 'mana', 墓地: 'graveyard', 手札: 'hand', シールドゾーン: 'shield' };

/**
 * 進化の種類の行を、進化元の指定（EvolveSpec）にする。
 * 能力語（マナ進化・墓地進化V…）ではなく、本文の書き方（どこから・何枚・どんなカード）で読むので、新しい名前の進化でも同じ書き方なら読める
 */
function parseEvolveSpec(t: string): { spec: EvolveSpec; star: boolean; gneo: boolean } | null {
  const lm = t.match(/^(.{0,12}?進化(?:V|GV)?(?:・Ω)?(?:MAX)?)[:：—―ー-](.+?)。?$/);
  if (!lm) return null;
  const label = lm[1];
  const optional = /もよい$/.test(lm[2]) || /NEO/.test(label);
  const body = lm[2].replace(/置いてもよい$/, '置く').replace(/出してもよい$/, '出す');
  const OUT = 'このクリーチャーをその上に重ねつつ(?:バトルゾーンに)?出す';
  const make = (zones: EvolveSpec['zones'], what: string, count: number, extra: Partial<EvolveSpec> = {}): EvolveSpec | null => {
    const f = evolveFilter(what);
    return f && { zones, ...(Object.keys(f).length ? { filter: f } : {}), count, ...extra, ...(optional ? { optional: true } : {}) };
  };
  let m: RegExpMatchArray | null;
  let spec: EvolveSpec | null = null;
  if (new RegExp(`^自分の山札の上から1枚目を表向きにする。そのカードがクリーチャーなら、${OUT}。クリーチャー以外なら、このクリーチャーを自分の手札に戻す$`).test(body)) spec = { zones: [], count: 1, deckTop: { count: 1, creatureOnly: true } };
  else if ((m = body.match(/^このクリーチャーを、自分の山札の上から(\d+)枚の上に重ねつつ(?:バトルゾーンに)?出す$/))) spec = { zones: [], count: n(m[1]), deckTop: { count: n(m[1]) } };
  else if ((m = body.match(new RegExp(`^墓地、マナゾーン、バトルゾーンから自分の(.+?)を1(?:体|枚)ずつ選び、${OUT}$`)))) spec = make(['graveyard', 'mana', 'battle'], m[1], 3, { eachZone: true });
  else if ((m = body.match(new RegExp(`^自分の(.+?)を(\\d+)(?:体|枚)以上、墓地、マナゾーンまたはバトルゾーンから選び、${OUT}$`)))) spec = make(['graveyard', 'mana', 'battle'], m[1], n(m[2]), { atLeast: true });
  else if ((m = body.match(/^バトルゾーンまたは墓地の、?(.+?)(\d+)体の上に重ねつつ(?:バトルゾーンに)?出す$/))) spec = make(['battle', 'graveyard'], m[1], n(m[2]));
  else if ((m = body.match(new RegExp(`^自分のシールドを(\\d+)つ選び、${OUT}$`)))) spec = make(['shield'], '', n(m[1]));
  else if ((m = body.match(/^自分の(マナゾーン|墓地|手札)にある、?(.+?)(\d+)(?:体|枚)の上に重ねつつ(?:バトルゾーンに)?出す$/))) spec = make([EVOLVE_ZONE[m[1]]], m[2], n(m[3]));
  else if ((m = body.match(new RegExp(`^(.+?)を(\\d+)(?:体|枚)(以上)?自分の(マナゾーン|墓地|手札|シールドゾーン)から選び、${OUT}$`)))) spec = make([EVOLVE_ZONE[m[4]]], m[1], n(m[2]), m[3] ? { atLeast: true } : {});
  else if ((m = body.match(/^進化元のカードが\d+枚以上になるように、(?:自分の)?(.+?)1体以上の上に置く$/))) spec = make(['battle'], m[1], 1, { atLeast: true });
  else if ((m = body.match(/^(.+?)(?:いずれか)?(\d+)体を重ねた上に置く$/))) spec = make(['battle'], m[1], n(m[2]));
  else if ((m = body.match(/^(?:自分の)?(.+?)(\d+)体(以上)?の上に置く$/))) spec = make(['battle'], m[1], n(m[2]), m[3] ? { atLeast: true } : {});
  return spec && { spec, star: label.includes('スター'), gneo: label.includes('G-NEO') };
}

/** 補足説明がない時に使う、S級侵略の種類ごとの使えるゾーン */
const S_CLASS_ZONES: Record<string, { zones: NonNullable<AttackSwap['zones']>; cardOnly?: boolean }> = {
  宇宙: { zones: ['battle'], cardOnly: true },
  不死: { zones: ['graveyard'] },
  原始: { zones: ['mana'] },
  轟速: { zones: ['graveyard', 'battle'] },
};

/**
 * S級侵略で手札のほかに使えるゾーンを、補足説明「自分の手札か墓地、またはバトルゾーンにあるこのクリーチャーを」から読む。
 * 補足説明がなければ種類名（[不死] など）から決める。どちらも分からなければ null（手動）
 */
function sClassZones(line: string, variant: string): { zones: NonNullable<AttackSwap['zones']>; cardOnly?: boolean } | null {
  const raw = line.normalize('NFKC').replace(/\s+/g, '');
  const m = raw.match(/\(([^()]*?)にあるこの(カード|クリーチャー)をその(?:クリーチャーの)?上に重ね/);
  if (m) {
    const zones: NonNullable<AttackSwap['zones']> = [];
    if (m[1].includes('墓地')) zones.push('graveyard');
    if (m[1].includes('マナゾーン')) zones.push('mana');
    if (m[1].includes('バトルゾーン')) zones.push('battle');
    // 「このカードを」はカードだけ（下のカードは残る）、「このクリーチャーを」は下のカードごと移す
    return { zones, ...(m[2] === 'カード' && zones.includes('battle') ? { cardOnly: true } : {}) };
  }
  const v = variant.replace(/\(.*\)$/, '');
  return S_CLASS_ZONES[v] ?? null;
}

/** 侵略・革命チェンジの条件「火のコスト3以上の、コマンドまたはドラゴン」を読む */
function parseSwapCondition(text: string): CardFilter | null {
  // 「ジャイアント、ミステリー・トーテム、またはスノーフェアリー」→「…または…または…」（「〜の、」の読点はそのまま消す）
  const t = civList(text).replace(/(?<!の)、(?:または)?/g, 'または').replace(/、/g, '').replace(/・?クリーチャー$/, '');
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
  const seal = t.match(/^自分の(他の)?(.*?)クリーチャーが(破壊される|バトルゾーンを離れる|離れる)時、かわりに(?:そのクリーチャーに)?封印を(?:1つ)?付ける$/);
  if (seal) {
    const filter: CardFilter = {};
    if (!parseMods(seal[2], filter)) return null;
    return { event: seal[3] === '破壊される' ? 'destroyed' : 'leaveBattle', subject: seal[1] ? 'otherOwn' : 'anyOwn', instead: 'seal', ...(Object.keys(filter).length ? { filter } : {}) };
  }
  const m = t.match(/^このクリーチャーが(破壊される|バトルゾーンを離れる|離れる)時、(?:墓地に置く|バトルゾーンを離れる)?かわりに、?(.+)$/);
  if (!m) return null;
  const { text, optional } = stripOptional(m[2].replace(/^(?:自分の|持ち主の)/, ''));
  const INSTEAD: Record<string, ReplacementAbility['instead']> = {
    手札に戻す: 'toHand',
    手札に加える: 'toHand',
    マナゾーンに置く: 'toMana',
    山札の下に置く: 'toDeckBottom',
    山札の一番下に置く: 'toDeckBottom',
    山札の上に置く: 'toDeckTop',
    山札の一番上に置く: 'toDeckTop',
    シールド化する: 'toShield',
    バトルゾーンにとどまる: 'stay',
    とどまる: 'stay',
    他のクリーチャーを1体破壊する: 'destroyOther',
    コストが小さいほうに裏返す: 'unflip',
    フォートレス側に裏返す: 'unflip',
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
  if (isUnsafe(t)) return 'mark';
  const trig = kind === 'creature' ? parseTrigger(t) : null;
  if (!trig && kind === 'creature') return `static:${t}`;
  const { body } = splitCondition(trig ? trig.rest : t);
  if (body === null) return 'condition';
  failedAt = null;
  refCtx.event = !!trig?.subject;
  refCtx.chosen = false;
  const g = parseBody(body, options.map(normalizeText));
  refCtx.event = false;
  return g ? 'ok' : `sentence:${failedAt ?? '?'}`;
}
