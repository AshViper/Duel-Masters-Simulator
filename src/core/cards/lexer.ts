// 能力テキストの字句解析：カードの能力の文を「語」に分け、語ごとに品詞（種類）と意味を付ける。
// textParser.ts（正規表現で文の形ごとに読む方式）を、語の並びから組み立てる方式に作り替えるための最初の段。
//   字句解析（この lexer.ts）→ 構文解析（語の並びを「誘発・条件・目的語・動詞」の木にする）→ 効果定義（EffectDef）への変換
// 仕組み：辞書の最長一致。数・カッコ・《カード名》・「かぎかっこ」は専用の読み方をする。辞書にない文字は「未知語」にまとめる。
// 新しい言い回しは、下の辞書の表に1行足せばよい（動詞は活用形を自動で作る）。
import type { Civilization, ZoneName } from './types';
import { ABILITY_WORDS } from './abilityWordList';

// ───────────────────────── 語の種類 ─────────────────────────

/** 動詞の活用形 */
export type VerbForm =
  | 'plain' // 破壊する・引く（言い切り）
  | 'stem' // 破壊・攻撃（する動詞の語幹だけ。「攻撃中」「召喚によって」）
  | 'renyo' // 破壊し・選び・引き（「〜し、〜する」のつなぎ）
  | 'te' // 破壊して・選んで
  | 'ta' // 破壊した・出た（「〜した時」）
  | 'tara' // 破壊したら
  | 'nai' // 破壊しない
  | 'nu' // 破壊せず・支払わず
  | 'nakereba' // 破壊しなければ
  | 'ba' // 破壊すれば・あれば
  | 'passive' // 破壊される
  | 'passiveTa' // 破壊された
  | 'passiveNai' // 破壊されない・ブロックされない
  | 'passiveRenyo' // 破壊され・置かれ（「ブロックされなかった」「されず」の前半）
  | 'passiveTe' // 破壊されて・クロスされて
  | 'passiveNu' // 破壊されず・選ばれず
  | 'causative' // 破壊させる・選ばせる
  | 'causativeRenyo' // 捨てさせ・選ばせ
  | 'tari' // 召喚したり・唱えたり
  | 'can' // 攻撃できる・引ける
  | 'cannot' // 攻撃できない・選べない
  | 'teiru' // タップしている
  | 'teinai'; // タップしていない

export type PlayerWord = 'self' | 'opponent' | 'own' | 'holder' | 'each';
export type NounWord =
  | 'creature' | 'spell' | 'card' | 'shield' | 'element' | 'dragheart' | 'weapon' | 'fortress' | 'crossgear' | 'field' | 'd2field'
  | 'tamaseed' | 'aura' | 'castle' | 'evolution' | 'psychic' | 'gr' | 'player' | 'turn' | 'game' | 'battle' | 'ability' | 'effect'
  | 'number' | 'amount' | 'total' | 'kind' | 'faceUp' | 'faceDown' | 'seal' | 'breaker' | 'evolutionSource' | 'twin' | 'side' | 'way'
  | 'mana' | 'order' | 'condition' | 'dest' | 'need';
export type StatWord = 'cost' | 'power' | 'name' | 'civilization' | 'race';
export type CompareWord = '>=' | '<=' | '<' | '>' | 'more' | 'less' | 'big' | 'small' | 'most' | 'same' | 'different' | 'except';
export type QuantWord = 'all' | 'any' | 'either' | 'each' | 'every' | 'whichever';
export type DemoWord = 'this' | 'that' | 'it' | 'they' | 'other' | 'among' | 'thisWay' | 'so';
export type RelWord = 'top' | 'bottom' | 'topmost' | 'bottommost' | 'in' | 'among' | 'side' | 'left' | 'right' | 'before' | 'after' | 'justBefore' | 'justAfter' | 'rest';
export type TimeWord = 'start' | 'end' | 'first' | 'last' | 'next' | 'same';
export type ConjWord = 'or' | 'and' | 'then' | 'ifDone' | 'ifNotDone' | 'instead' | 'however' | 'also';
export type AuxWord = 'when' | 'if' | 'case' | 'while' | 'may' | 'not' | 'ifPossible' | 'koto' | 'eachTime' | 'keep' | 'per' | 'until' | 'manner';
export type AdvWord = 'more' | 'immediately' | 'firstTime' | 'again' | 'yet' | 'random' | 'together';
export type AdjWord = 'new' | 'original';
/** 形容詞の形：大きく（adv）・大きければ（ba）・大きかった（ta）。言い切り（大きい）は form なし */
export type AdjForm = 'adv' | 'ba' | 'ta';

export type Token = { text: string; start: number; end: number } & (
  | { kind: 'player'; player: PlayerWord }
  | { kind: 'zone'; zone: ZoneName | 'any' }
  | { kind: 'noun'; noun: NounWord }
  | { kind: 'stat'; stat: StatWord }
  | { kind: 'civ'; civ: Civilization | 'multi' | 'mono' | 'colorless' }
  | { kind: 'number'; n: number; sign?: '+' | '-' }
  | { kind: 'count'; n: number; unit: string; ordinal?: boolean }
  | { kind: 'compare'; op: CompareWord; form?: AdjForm }
  | { kind: 'quant'; quant: QuantWord }
  | { kind: 'demo'; demo: DemoWord }
  | { kind: 'rel'; rel: RelWord }
  | { kind: 'time'; time: TimeWord }
  | { kind: 'adv'; adv: AdvWord }
  | { kind: 'adj'; adj: AdjWord }
  | { kind: 'verb'; lemma: string; form: VerbForm }
  | { kind: 'aux'; aux: AuxWord }
  | { kind: 'conj'; conj: ConjWord }
  | { kind: 'particle'; p: string }
  | { kind: 'keyword'; keyword: string }
  | { kind: 'punct'; p: string }
  | { kind: 'cardName'; name: string }
  | { kind: 'quote'; children: Token[] }
  | { kind: 'reminder'; children: Token[] }
  | { kind: 'icon'; icon: string }
  | { kind: 'label'; label: string }
  | { kind: 'word'; script: 'katakana' | 'kanji' | 'hiragana' | 'latin' | 'other' }
);
export type TokenKind = Token['kind'];

/** 辞書の値（位置と表記を除いた部分） */
type Entry = Token extends infer T ? (T extends Token ? Omit<T, 'text' | 'start' | 'end'> : never) : never;

// ───────────────────────── 辞書 ─────────────────────────

const PLAYERS: [string, PlayerWord][] = [['自分', 'self'], ['相手', 'opponent'], ['自身', 'own'], ['持ち主', 'holder'], ['各プレイヤー', 'each']];
const ZONES: [string, ZoneName | 'any'][] = [
  ['バトルゾーン', 'battle'], ['マナゾーン', 'mana'], ['シールドゾーン', 'shield'], ['墓地', 'graveyard'], ['手札', 'hand'], ['山札', 'deck'],
  ['超次元ゾーン', 'hyperspatial'], ['超GRゾーン', 'grZone'], ['ゾーン', 'any'],
];
const NOUNS: [string, NounWord][] = [
  ['クリーチャー', 'creature'], ['呪文', 'spell'], ['カード', 'card'], ['シールド', 'shield'], ['エレメント', 'element'],
  ['ドラグハート', 'dragheart'], ['ドラグハート・ウエポン', 'weapon'], ['ウエポン', 'weapon'], ['ドラグハート・フォートレス', 'fortress'], ['フォートレス', 'fortress'],
  ['クロスギア', 'crossgear'], ['フィールド', 'field'], ['D2フィールド', 'd2field'], ['タマシード', 'tamaseed'], ['オーラ', 'aura'], ['城', 'castle'],
  ['進化クリーチャー', 'evolution'], ['サイキック・クリーチャー', 'psychic'], ['GRクリーチャー', 'gr'], ['プレイヤー', 'player'], ['ターン', 'turn'],
  ['ゲーム', 'game'], ['バトル', 'battle'], ['能力', 'ability'], ['効果', 'effect'], ['数字', 'number'], ['枚数', 'amount'], ['数', 'amount'],
  ['合計', 'total'], ['種類', 'kind'], ['表向き', 'faceUp'], ['裏向き', 'faceDown'], ['封印', 'seal'], ['ブレイカー', 'breaker'],
  ['進化元', 'evolutionSource'], ['ツインパクト', 'twin'], ['側', 'side'], ['ほう', 'side'], ['方法', 'way'], ['マナ', 'mana'],
  ['順序', 'order'], ['順番', 'order'], ['条件', 'condition'], ['先', 'dest'], ['場所', 'dest'], ['必要', 'need'],
];
const STATS: [string, StatWord][] = [['コスト', 'cost'], ['パワー', 'power'], ['名前', 'name'], ['文明', 'civilization'], ['種族', 'race']];
const CIVS: [string, Civilization | 'multi' | 'mono' | 'colorless'][] = [
  ['光', 'light'], ['水', 'water'], ['闇', 'darkness'], ['火', 'fire'], ['自然', 'nature'], ['ゼロ', 'zero'], ['無色', 'colorless'], ['多色', 'multi'], ['単色', 'mono'],
];
const COMPARES: [string, CompareWord][] = [
  ['以上', '>='], ['以下', '<='], ['未満', '<'], ['超', '>'], ['一番', 'most'], ['最も', 'most'], ['同じ', 'same'], ['異なる', 'different'],
  ['違う', 'different'], ['以外', 'except'],
];
/** 比べる形容詞（語幹）。大きい・大きく・大きければ・大きかった を自動で作る */
const COMPARE_ADJS: [string, CompareWord][] = [['多', 'more'], ['少な', 'less'], ['大き', 'big'], ['小さ', 'small'], ['高', 'big'], ['低', 'small']];
const ADVS: [string, AdvWord][] = [
  ['もう', 'more'], ['すぐ', 'immediately'], ['すぐに', 'immediately'], ['ただちに', 'immediately'], ['はじめて', 'firstTime'], ['初めて', 'firstTime'],
  ['まだ', 'yet'], ['再び', 'again'], ['ふたたび', 'again'], ['ランダム', 'random'], ['ランダムに', 'random'], ['一緒に', 'together'],
];
const ADJS: [string, AdjWord][] = [['新しい', 'new'], ['新しく', 'new'], ['新た', 'new'], ['元', 'original']];
const QUANTS: [string, QuantWord][] = [
  ['すべて', 'all'], ['全て', 'all'], ['好きな数', 'any'], ['好きな枚数', 'any'], ['いずれか', 'either'], ['どちらか', 'either'], ['各', 'each'],
  ['それぞれ', 'every'], ['好きな', 'whichever'], ['両方', 'all'], ['両者', 'all'],
];
const DEMOS: [string, DemoWord][] = [
  ['この', 'this'], ['これ', 'this'], ['これら', 'this'], ['その', 'that'], ['それ', 'it'], ['それら', 'they'], ['他', 'other'], ['そのうち', 'among'],
  ['こうして', 'thisWay'], ['そう', 'so'], ['こう', 'so'],
];
const RELS: [string, RelWord][] = [
  ['上', 'top'], ['下', 'bottom'], ['一番上', 'topmost'], ['一番下', 'bottommost'], ['中', 'in'], ['うち', 'among'], ['横', 'side'], ['左', 'left'],
  ['右', 'right'], ['前', 'before'], ['後', 'after'], ['直前', 'justBefore'], ['直後', 'justAfter'], ['以降', 'after'], ['残り', 'rest'],
];
const TIMES: [string, TimeWord][] = [['はじめ', 'start'], ['始め', 'start'], ['終わり', 'end'], ['最初', 'first'], ['最後', 'last'], ['次', 'next'], ['同時', 'same']];
const CONJS: [string, ConjWord][] = [
  ['または', 'or'], ['あるいは', 'or'], ['もしくは', 'or'], ['および', 'and'], ['かつ', 'and'], ['その後', 'then'], ['そうしたら', 'ifDone'],
  ['そうした場合', 'ifDone'], ['そうすれば', 'ifDone'], ['そうしなかったら', 'ifNotDone'], ['そうしなければ', 'ifNotDone'], ['そうしない場合', 'ifNotDone'],
  ['そうしなかった場合', 'ifNotDone'], ['かわりに', 'instead'], ['代わりに', 'instead'], ['ただし', 'however'], ['さらに', 'also'],
];
const AUXES: [string, AuxWord][] = [
  ['時', 'when'], ['なら', 'if'], ['ならば', 'if'], ['場合', 'case'], ['間', 'while'], ['もよい', 'may'], ['もいい', 'may'], ['も良い', 'may'],
  ['ない', 'not'], ['なく', 'not'], ['なければ', 'not'], ['なかった', 'not'], ['可能なら', 'ifPossible'], ['可能であれば', 'ifPossible'],
  ['こと', 'koto'], ['たび', 'eachTime'], ['まま', 'keep'], ['につき', 'per'], ['まで', 'until'], ['とき', 'when'], ['よい', 'may'],
  ['よう', 'manner'], ['ように', 'manner'],
];
const PARTICLES = ['を', 'に', 'が', 'は', 'の', 'から', 'へ', 'と', 'で', 'も', 'や', 'より', 'ずつ', 'だけ', 'しか', 'など', 'か', 'として', 'のみ', 'によって', 'において', '付き', 'つき'];

type VerbClass = 'suru' | 'ichidan' | 'godan' | 'aru';
/** 動詞の表：見出し語と活用の種類。活用形はすべて自動で作る（する動詞は語幹だけで書く） */
const VERBS: [string, VerbClass][] = [
  // する動詞（語幹）
  ...(
    [
      '', '破壊', '召喚', '攻撃', 'ブロック', 'ブレイク', 'タップ', 'アンタップ', 'シャッフル', '実行', '使用', '進化', '覚醒', '龍解', '解除', '選択',
      '追加', '移動', '公開', '発動', '無視', 'クロス', 'ジェネレート', '装備', '指定', '宣言', '勝利', '誘発', 'トリガー', '禁断解放', '予想', '確認',
      '再構築', '生成', 'リンク', '合体', '回復', '減少', '増加', '敗北', '退化', 'チャージ', 'バトル', '化', '変更', '開始', '終了', '付与',
      '軽減', '処理', '適用', '登場', '交換', '解放',
    ] as const
  ).map((s): [string, VerbClass] => [s, 'suru']),
  // 一段動詞（「る」で終わる見出し語）
  ...(
    [
      '捨てる', '加える', '唱える', '見る', '見せる', '与える', '得る', '負ける', '離れる', '入れる', '入れ替える', '付ける', '置き換える', '続ける',
      '終える', '受ける', '変える', '決める', '数える', '比べる', '答える', '出る', '並べる', 'できる', 'いる', '超える', '揃える', '向ける',
      '重ねる', '含める', '見つける', '止める', '求める',
    ] as const
  ).map((s): [string, VerbClass] => [s, 'ichidan']),
  // 五段動詞
  ...(
    [
      '引く', '置く', '戻す', '出す', '選ぶ', '支払う', '払う', '失う', '持つ', '勝つ', '残る', '外す', '裏返す', '減らす', '増やす', '行う', '使う',
      'なる', 'とどまる', '加わる', '足す', '言う', '抜く', '移す', '送る', '渡す', '続く', '変わる', '終わる', '始まる', '扱う', '従う', '向く',
      '含む', '合う', '満たす', '取る', '取り除く', '入る', '決まる', '残す', '選び直す', '探す', '張る', 'みなす',
    ] as const
  ).map((s): [string, VerbClass] => [s, 'godan']),
  ['ある', 'aru'],
];

/** 五段動詞の語尾 → [あ段, い段, え段, て形, た形] */
const GODAN: Record<string, [string, string, string, string, string]> = {
  く: ['か', 'き', 'け', 'いて', 'いた'],
  す: ['さ', 'し', 'せ', 'して', 'した'],
  ぶ: ['ば', 'び', 'べ', 'んで', 'んだ'],
  う: ['わ', 'い', 'え', 'って', 'った'],
  つ: ['た', 'ち', 'て', 'って', 'った'],
  る: ['ら', 'り', 'れ', 'って', 'った'],
  む: ['ま', 'み', 'め', 'んで', 'んだ'],
  ぐ: ['が', 'ぎ', 'げ', 'いで', 'いだ'],
};

/** 動詞の活用形を作る：表記 → 活用形 */
export function conjugate(lemma: string, cls: VerbClass): [string, VerbForm][] {
  if (cls === 'suru') {
    const s = lemma;
    const forms: [string, VerbForm][] = [
      [s + 'する', 'plain'], [s + 'し', 'renyo'], [s + 'して', 'te'], [s + 'した', 'ta'], [s + 'したら', 'tara'], [s + 'しない', 'nai'],
      [s + 'せず', 'nu'], [s + 'しなければ', 'nakereba'], [s + 'すれば', 'ba'], [s + 'される', 'passive'], [s + 'された', 'passiveTa'],
      [s + 'されない', 'passiveNai'], [s + 'され', 'passiveRenyo'], [s + 'されて', 'passiveTe'], [s + 'されず', 'passiveNu'], [s + 'させる', 'causative'], [s + 'させ', 'causativeRenyo'],
      [s + 'したり', 'tari'], [s + 'できる', 'can'], [s + 'できない', 'cannot'], [s + 'している', 'teiru'], [s + 'していない', 'teinai'],
    ];
    return s ? [[s, 'stem'], ...forms] : forms.filter(([, f]) => f !== 'can' && f !== 'cannot');
  }
  if (cls === 'aru') {
    return [['ある', 'plain'], ['あり', 'renyo'], ['あって', 'te'], ['あった', 'ta'], ['あったら', 'tara'], ['あれば', 'ba'], ['あったり', 'tari']];
  }
  if (cls === 'ichidan') {
    const s = lemma.slice(0, -1);
    return [
      [lemma, 'plain'], [s, 'renyo'], [s + 'て', 'te'], [s + 'た', 'ta'], [s + 'たら', 'tara'], [s + 'ない', 'nai'], [s + 'ず', 'nu'],
      [s + 'なければ', 'nakereba'], [s + 'れば', 'ba'], [s + 'られる', 'passive'], [s + 'られた', 'passiveTa'], [s + 'られない', 'passiveNai'],
      [s + 'られ', 'passiveRenyo'], [s + 'られて', 'passiveTe'], [s + 'られず', 'passiveNu'], [s + 'させる', 'causative'], [s + 'させ', 'causativeRenyo'], [s + 'たり', 'tari'],
      [s + 'れる', 'can'], [s + 'れない', 'cannot'], [s + 'ている', 'teiru'], [s + 'ていない', 'teinai'],
    ];
  }
  const s = lemma.slice(0, -1);
  const row = GODAN[lemma.slice(-1)];
  if (!row) throw new Error(`五段動詞の語尾が分からない: ${lemma}`);
  const [a, i, e, te, ta] = row;
  // 「行く」だけ て形が「行って」
  const [teF, taF] = lemma === '行く' ? ['って', 'った'] : [te, ta];
  return [
    [lemma, 'plain'], [s + i, 'renyo'], [s + teF, 'te'], [s + taF, 'ta'], [s + taF + 'ら', 'tara'], [s + a + 'ない', 'nai'], [s + a + 'ず', 'nu'],
    [s + a + 'なければ', 'nakereba'], [s + e + 'ば', 'ba'], [s + a + 'れる', 'passive'], [s + a + 'れた', 'passiveTa'], [s + a + 'れない', 'passiveNai'],
    [s + a + 'れ', 'passiveRenyo'], [s + a + 'れて', 'passiveTe'], [s + a + 'れず', 'passiveNu'], [s + a + 'せる', 'causative'], [s + a + 'せ', 'causativeRenyo'], [s + taF + 'り', 'tari'],
    [s + e + 'る', 'can'], [s + e + 'ない', 'cannot'], [s + teF + 'いる', 'teiru'], [s + teF + 'いない', 'teinai'],
  ];
}

/** 能力の頭に付くアイコン（{2W} など） */
const ICON_RE = /^\{[^{}]{1,6}\}/;

/** 辞書：表記 → 値。同じ表記は先に入れたものを使う（名詞・動詞を能力語より優先する） */
const DICT = new Map<string, Entry>();
function add(surface: string, e: Entry): void {
  const key = normalizeForLexer(surface);
  if (key && !DICT.has(key)) DICT.set(key, e);
}
for (const [s, player] of PLAYERS) add(s, { kind: 'player', player });
for (const [s, zone] of ZONES) add(s, { kind: 'zone', zone });
for (const [s, noun] of NOUNS) add(s, { kind: 'noun', noun });
for (const [s, stat] of STATS) add(s, { kind: 'stat', stat });
for (const [s, civ] of CIVS) add(s, { kind: 'civ', civ });
for (const [s, op] of COMPARES) add(s, { kind: 'compare', op });
for (const [s, op] of COMPARE_ADJS) {
  add(s + 'い', { kind: 'compare', op });
  add(s + 'く', { kind: 'compare', op, form: 'adv' });
  add(s + 'ければ', { kind: 'compare', op, form: 'ba' });
  add(s + 'かった', { kind: 'compare', op, form: 'ta' });
}
for (const [s, adv] of ADVS) add(s, { kind: 'adv', adv });
for (const [s, adj] of ADJS) add(s, { kind: 'adj', adj });
for (const [s, quant] of QUANTS) add(s, { kind: 'quant', quant });
for (const [s, demo] of DEMOS) add(s, { kind: 'demo', demo });
for (const [s, rel] of RELS) add(s, { kind: 'rel', rel });
for (const [s, time] of TIMES) add(s, { kind: 'time', time });
for (const [s, conj] of CONJS) add(s, { kind: 'conj', conj });
for (const [s, aux] of AUXES) add(s, { kind: 'aux', aux });
for (const p of PARTICLES) add(p, { kind: 'particle', p });
for (const [lemma, cls] of VERBS) {
  const head = cls === 'suru' ? lemma + 'する' : lemma;
  for (const [s, form] of conjugate(lemma, cls)) add(s, { kind: 'verb', lemma: head, form });
}
for (const w of ABILITY_WORDS) add(w, { kind: 'keyword', keyword: normalizeForLexer(w) });
for (const p of ['、', '。', '・', ':', ';', '/', '▶', '■', '●', '⇒', '→', '-', '[', ']']) add(p, { kind: 'punct', p });
const MAX_LEN = Math.max(...[...DICT.keys()].map((k) => k.length));

// ───────────────────────── 読み取り ─────────────────────────

/** 字句解析の前にそろえる：全角・半角、空白、ダッシュ、「ひとつ」などの言い方 */
export function normalizeForLexer(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/[−‐－–—]/g, '-')
    .replace(/️/g, '')
    .replace(/[\s　]+/g, '')
    .replace(/ひとつ/g, '1つ')
    .replace(/ふたつ/g, '2つ')
    .replace(/みっつ/g, '3つ')
    .replace(/一度/g, '1度')
    .replace(/自分自身/g, '自身');
}

const isKatakana = (c: string | undefined) => !!c && /[゠-ヿ]/.test(c) && c !== '・';
const scriptOf = (c: string): Extract<Token, { kind: 'word' }>['script'] =>
  /[゠-ヿ]/.test(c) ? 'katakana' : /[一-鿿々]/.test(c) ? 'kanji' : /[぀-ゟ]/.test(c) ? 'hiragana' : /[A-Za-z]/.test(c) ? 'latin' : 'other';

const COUNT_UNITS = ['体目', '枚目', 'つ目', '番目', '回目', 'ターン目', '体', '枚', 'つ', '回', '度', '人', '倍'];
const NUM_RE = /^([+-])?(\d+|∞)/;

/** 対になるカッコの終わりの位置（入れ子に対応）。見つからなければ -1 */
function closing(s: string, from: number, open: string, close: string): number {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close && --depth === 0) return i;
  }
  return -1;
}

/** 位置 i から始まる2文字以上の辞書の語があるか */
function dictWordAt(s: string, i: number): boolean {
  for (let len = Math.min(MAX_LEN, s.length - i); len >= 2; len--) if (DICT.has(s.substr(i, len))) return true;
  return false;
}

/** 位置 i から読める候補のうち一番長いもの */
function readAt(s: string, i: number, base: number): Token | null {
  const c = s[i];
  // カッコ類：中身も字句解析する
  if (c === '(' || c === '「' || c === '《') {
    const close = c === '(' ? ')' : c === '「' ? '」' : '》';
    const end = closing(s, i, c, close);
    if (end > 0) {
      const inner = s.slice(i + 1, end);
      const text = s.slice(i, end + 1);
      const at = { text, start: base + i, end: base + end + 1 };
      if (c === '《') return { ...at, kind: 'cardName', name: inner };
      const children = tokenizeNormalized(inner, base + i + 1);
      return c === '(' ? { ...at, kind: 'reminder', children } : { ...at, kind: 'quote', children };
    }
  }
  const icon = s.slice(i).match(ICON_RE);
  if (icon) return { text: icon[0], start: base + i, end: base + i + icon[0].length, kind: 'icon', icon: icon[0].slice(1, -1) };

  let best: Token | null = null;
  // 能力のラベル：「xB能力を与える」の xB、ラベルで始まる行「xB次の自分のターンの〜」（その能力の本文）。
  // 英字1〜3文字で、後ろが「能力」か、行の頭で後ろが日本語の時。「GR召喚」「Zラッシュ」など長い辞書の語があればそちらを使う
  const label = s.slice(i).match(/^[A-Za-z]{1,3}(?=能力|[^\x00-\x7F・])/);
  if (label && (s.startsWith('能力', i + label[0].length) || (i === 0 && base === 0))) {
    best = { kind: 'label', label: label[0], text: label[0], start: base + i, end: base + i + label[0].length };
  }
  // 辞書の最長一致
  for (let len = Math.min(MAX_LEN, s.length - i); len > 0; len--) {
    const surface = s.substr(i, len);
    const e = DICT.get(surface);
    if (!e) continue;
    // カタカナの語は、すぐ後ろにカタカナが続くなら別の長い語の一部（種族名など）なので使わない。
    // ただし能力語の後ろに辞書の語が続く時は、区切りが抜けて並んだもの（「スピードアタッカーパワーアタッカー+5000」）として切る
    if (isKatakana(surface[surface.length - 1]) && isKatakana(s[i + len]) && !(e.kind === 'keyword' && dictWordAt(s, i + len))) continue;
    if (!best || len > best.end - best.start) best = { ...e, text: surface, start: base + i, end: base + i + len } as Token;
    break;
  }
  // 数・数量：「3」「+3000」「1体」「2枚目」「∞」
  const num = s.slice(i).match(NUM_RE);
  if (num) {
    let len = num[0].length;
    const n = num[2] === '∞' ? Infinity : Number(num[2]);
    const unit = COUNT_UNITS.find((u) => s.startsWith(u, i + len));
    let tok: Token;
    if (unit && !num[1]) {
      len += unit.length;
      const ordinal = unit.length > 1 && unit.endsWith('目');
      tok = { kind: 'count', n, unit: ordinal ? unit.slice(0, -1) : unit, ...(ordinal ? { ordinal } : {}), text: s.substr(i, len), start: base + i, end: base + i + len };
    } else {
      tok = { kind: 'number', n, ...(num[1] ? { sign: num[1] as '+' | '-' } : {}), text: s.substr(i, len), start: base + i, end: base + i + len };
    }
    if (!best || tok.end > best.end) best = tok;
  }
  return best;
}

function tokenizeNormalized(s: string, base: number): Token[] {
  const out: Token[] = [];
  let unknown = '';
  let unknownStart = 0;
  const flush = () => {
    if (!unknown) return;
    // 文字の種類が変わるところで分ける（「ドラゴン」「OMG」「轟速」）
    let j = 0;
    while (j < unknown.length) {
      const sc = scriptOf(unknown[j]);
      let k = j + 1;
      while (k < unknown.length && (unknown[k] === '・' ? sc === 'katakana' && isKatakana(unknown[k + 1]) : scriptOf(unknown[k]) === sc)) k++;
      out.push({ kind: 'word', script: sc, text: unknown.slice(j, k), start: base + unknownStart + j, end: base + unknownStart + k });
      j = k;
      // 語の終わりの「・」（「エグザイル・」＋「クリーチャー」）は区切りにする
      if (unknown[j] === '・') {
        out.push({ kind: 'punct', p: '・', text: '・', start: base + unknownStart + j, end: base + unknownStart + j + 1 });
        j++;
      }
    }
    unknown = '';
  };
  let i = 0;
  while (i < s.length) {
    // 未知のカタカナ語の途中では辞書を引かない（「ドラゴン・ゾンビ」の「ゾンビ」以外が辞書に当たって切れないように）
    const midKatakana = unknown && isKatakana(unknown[unknown.length - 1]) && (isKatakana(s[i]) || (s[i] === '・' && isKatakana(s[i + 1])));
    const tok = midKatakana ? null : readAt(s, i, base);
    if (tok) {
      flush();
      out.push(tok);
      i += tok.end - tok.start;
    } else {
      if (!unknown) unknownStart = i;
      unknown += s[i];
      i++;
    }
  }
  flush();
  return out;
}

/** 能力の文（1行）を語に分ける。位置（start/end）はそろえた後の文字列（normalizeForLexer）の位置 */
export function tokenize(line: string): Token[] {
  return tokenizeNormalized(normalizeForLexer(line), 0);
}

// ───────────────────────── 確かめる道具 ─────────────────────────

/** 語の並びを読みやすい1行にする：「相手[player:opponent] の[p] クリーチャー[noun:creature] …」 */
export function formatTokens(tokens: Token[]): string {
  return tokens.map(formatToken).join(' ');
}

function formatToken(t: Token): string {
  switch (t.kind) {
    case 'player': return `${t.text}[player:${t.player}]`;
    case 'zone': return `${t.text}[zone:${t.zone}]`;
    case 'noun': return `${t.text}[noun:${t.noun}]`;
    case 'stat': return `${t.text}[stat:${t.stat}]`;
    case 'civ': return `${t.text}[civ:${t.civ}]`;
    case 'number': return `${t.text}[num:${t.sign ?? ''}${t.n}]`;
    case 'count': return `${t.text}[count:${t.n}${t.unit}${t.ordinal ? '目' : ''}]`;
    case 'compare': return `${t.text}[cmp:${t.op}${t.form ? '/' + t.form : ''}]`;
    case 'quant': return `${t.text}[quant:${t.quant}]`;
    case 'demo': return `${t.text}[demo:${t.demo}]`;
    case 'rel': return `${t.text}[rel:${t.rel}]`;
    case 'time': return `${t.text}[time:${t.time}]`;
    case 'adv': return `${t.text}[adv:${t.adv}]`;
    case 'adj': return `${t.text}[adj:${t.adj}]`;
    case 'verb': return `${t.text}[verb:${t.lemma}/${t.form}]`;
    case 'aux': return `${t.text}[aux:${t.aux}]`;
    case 'conj': return `${t.text}[conj:${t.conj}]`;
    case 'particle': return `${t.text}[p]`;
    case 'keyword': return `${t.text}[kw]`;
    case 'punct': return t.text;
    case 'cardName': return `${t.text}[name]`;
    case 'icon': return `${t.text}[icon]`;
    case 'label': return `${t.text}[label]`;
    case 'quote': return `「${formatTokens(t.children)}」`;
    case 'reminder': return `(${formatTokens(t.children)})`;
    case 'word': return `${t.text}[?${t.script}]`;
  }
}

/** 未知語の割合（カッコの中も数える）。辞書の足りなさを測るのに使う */
export function unknownStats(tokens: Token[]): { chars: number; unknownChars: number; unknownWords: string[] } {
  let chars = 0;
  let unknownChars = 0;
  const unknownWords: string[] = [];
  const walk = (ts: Token[]) => {
    for (const t of ts) {
      if (t.kind === 'quote' || t.kind === 'reminder') {
        walk(t.children);
        chars += 2;
      } else {
        chars += t.text.length;
        if (t.kind === 'word') {
          unknownChars += t.text.length;
          unknownWords.push(t.text);
        }
      }
    }
  };
  walk(tokens);
  return { chars, unknownChars, unknownWords };
}
