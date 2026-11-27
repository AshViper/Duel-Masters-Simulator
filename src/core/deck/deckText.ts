// AI やメモで書いたデッキリスト（表・箇条書き）のテキストから「カード名と枚数」を読み取る。
// 例:
//   | 《水上第九院 シャコガイル》 | 4 | フィニッシャー |    （Markdown の表）
//   《ロジック・サークル》\t4\t山札上操作              （画面の表をコピーした時のタブ区切り）
//   4 ロジック・サークル / ロジック・サークル ×4 / ロジック・サークル 4枚

export interface DeckTextEntry {
  name: string;
  count: number;
  /** 元の行（画面に出す用） */
  line: string;
  /** 枚数が書かれていなかったので 1 枚とみなした */
  countGuessed?: boolean;
}

export interface DeckTextParseResult {
  entries: DeckTextEntry[];
  /** 読み取らなかった行（見出し・合計・空行以外） */
  skipped: string[];
}

/** 見出し・合計などカード名ではないセル */
const NOT_CARD = /^(カード名?|名前|枚数|役割|備考|用途|合計|計|小計|総数|total|card|name|count|qty|role)$/i;

const COUNT_CELL = /^[x×]?\s*(\d{1,2})\s*(枚|x|×)?$/i;

function cleanName(s: string): string {
  return s
    .replace(/^[\s\-*・●■◆□◇>#]+/, '') // 箇条書きの記号
    .replace(/^\d+[.)]\s+/, '') // 番号付きリストの「1.」
    .replace(/[*_`]/g, '')
    .replace(/^[「『《【]|[」』》】]$/g, '')
    .trim();
}

function parseCells(cells: string[], line: string): DeckTextEntry | null {
  const cs = cells.map((c) => c.normalize('NFKC').trim()).filter(Boolean);
  if (cs.length === 0) return null;
  const bracket = line.match(/《([^》]+)》/);
  let name = bracket ? bracket[1].trim() : '';
  let count: number | undefined;
  for (const c of cs) {
    const m = c.match(COUNT_CELL);
    if (m && count === undefined) count = Number(m[1]);
    else if (!name && !m) name = cleanName(c);
  }
  if (!name || NOT_CARD.test(name.replace(/\s/g, ''))) return null;
  if (count === undefined) return bracket ? { name, count: 1, line, countGuessed: true } : null;
  return count > 0 ? { name, count, line } : null;
}

function parsePlain(raw: string): DeckTextEntry | null {
  const line = raw.trim();
  const n = line.normalize('NFKC');
  const bracket = line.match(/《([^》]+)》/);
  if (bracket) {
    const rest = n.replace(/《[^》]+》/, ' ');
    const m = rest.match(/(?:[x×]\s*(\d{1,2})|(\d{1,2})\s*(?:枚|[x×])|(?:^|\s)(\d{1,2})(?:\s|$))/i);
    const name = bracket[1].trim();
    if (!m) return { name, count: 1, line, countGuessed: true };
    return { name, count: Number(m[1] ?? m[2] ?? m[3]), line };
  }
  // 「4 カード名」「4x カード名」「4枚 カード名」
  let m = n.match(/^[\s\-*・●]*(\d{1,2})\s*(?:枚|[x×])?\s+(.+)$/i);
  if (m) return { name: cleanName(m[2]), count: Number(m[1]), line };
  // 「カード名 4」「カード名 ×4」「カード名 x4」「カード名 4枚」「カード名：4」
  m = n.match(/^(.+?)\s*(?:[:：]\s*|\s+|(?=[x×]))[x×]?\s*(\d{1,2})\s*枚?$/i);
  if (m) return { name: cleanName(m[1]), count: Number(m[2]), line };
  m = n.match(/^(.+?)\s*[x×]\s*(\d{1,2})$/i);
  if (m) return { name: cleanName(m[1]), count: Number(m[2]), line };
  return null;
}

export function parseDeckText(text: string): DeckTextParseResult {
  const entries: DeckTextEntry[] = [];
  const skipped: string[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\|?[\s:|-]+\|?$/.test(line) && line.includes('-')) continue; // Markdown の表の区切り行
    if (/^#+\s/.test(line) && !line.includes('《')) continue; // Markdown の見出し（書き出したデッキリストの「## 超次元ゾーン」など）
    let entry: DeckTextEntry | null;
    if (line.includes('\t')) entry = parseCells(line.split('\t'), line);
    else if (line.startsWith('|') || (line.match(/\|/g)?.length ?? 0) >= 2) entry = parseCells(line.replace(/^\||\|$/g, '').split('|'), line);
    else entry = parsePlain(line);
    const cells = line.split(/[	|]/).map((c) => c.normalize('NFKC').replace(/[*\s]/g, ''));
    if (entry && !NOT_CARD.test(entry.name.replace(/\s/g, ''))) entries.push(entry);
    else if (cells.every((c) => !c || NOT_CARD.test(c))) continue; // 表の見出し
    else if (!/^(合計|計|総数|total)/i.test(line.normalize('NFKC').replace(/^[|\s*#]+/, ''))) skipped.push(line);
  }
  return { entries, skipped };
}

/** デッキ構成をテキストにする（parseDeckText でそのまま読み戻せる形）。超次元ゾーンのカードは別の見出しに分ける。 */
export function deckToText(
  deck: { name: string; cards: Record<string, number> },
  registry: Record<string, { name: string; cost?: number; psychic?: unknown } | undefined>,
): string {
  const rows = Object.entries(deck.cards)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => ({ id, n, card: registry[id] }))
    .sort((a, b) => (a.card?.cost ?? 99) - (b.card?.cost ?? 99) || (a.card?.name ?? a.id).localeCompare(b.card?.name ?? b.id, 'ja'));
  const section = (title: string, list: typeof rows) => {
    const total = list.reduce((a, r) => a + r.n, 0);
    return [`## ${title}（${total}枚）`, ...list.map((r) => `《${r.card?.name ?? r.id}》×${r.n}`)].join('\n');
  };
  const main = rows.filter((r) => !r.card?.psychic);
  const hyper = rows.filter((r) => r.card?.psychic);
  const parts = [`# ${deck.name}`, section('メインデッキ', main)];
  if (hyper.length) parts.push(section('超次元ゾーン', hyper));
  return parts.join('\n\n') + '\n';
}

// ───────────────────────── カード名の照合 ─────────────────────────

/** 比較用にカード名を正規化する（全角半角・空白・中黒・括弧・パック名の違いを吸収） */
export function normalizeCardName(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\([A-Za-z0-9-]+\s[^)]*\)\s*$/, '') // 公式の「(DMRP05 18/93)」
    .replace(/[《》「」『』【】]/g, '')
    .replace(/[・･·•]/g, '')
    .replace(/[／/]/g, '/')
    .replace(/[\s　]/g, '')
    .replace(/[〜~]/g, '~')
    .replace(/[ｰ−‐－―]/g, 'ー')
    .toLowerCase();
}

/**
 * 書かれた名前と、カードの名前（ツインパクトは「A / B」と各面）の一致度。
 * 3: 完全一致 / 2: ツインパクトの片面と一致 / 1: 部分一致 / 0: 不一致
 */
export function nameMatchScore(query: string, cardName: string, faceNames: string[] = []): number {
  const q = normalizeCardName(query);
  const full = normalizeCardName(cardName);
  if (!q) return 0;
  if (q === full) return 3;
  const halves = new Set([...full.split('/'), ...faceNames.flatMap((f) => normalizeCardName(f).split('/'))].filter(Boolean));
  if (halves.has(q)) return 2;
  if (full.includes(q) || q.includes(full)) return 1;
  for (const n of [full, ...halves]) if (similarity(q, n) >= 0.6) return 1;
  return 0;
}

/** 2文字ずつの組（bigram）の一致度 0〜1。書き間違い（ミラクル→ミクル など）を拾う */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2));
  const ga = grams(a);
  const gb = grams(b);
  if (ga.length === 0 || gb.length === 0) return a === b ? 1 : 0;
  const pool = [...gb];
  let hit = 0;
  for (const g of ga) {
    const i = pool.indexOf(g);
    if (i >= 0) {
      hit++;
      pool.splice(i, 1);
    }
  }
  return (2 * hit) / (ga.length + gb.length);
}

// 公式のカード名検索は「書いた文字列をそのまま含む名前」を探す。空白で区切ると「どれかを含む」になり、新しいカード順に並ぶ。
// 中黒の有無・全角半角が違うと 0 件になる。そこで名前を語に分けて別々に検索し、珍しい語を含むカードから順に詳細を確かめる。

/** 公式検索に投げる語（空白・ツインパクトの「／」で区切る） */
export function nameParts(name: string): string[] {
  const parts = name
    .replace(/[《》]/g, '')
    .split(/[\s　／/]+/)
    .map((p) => p.trim())
    .filter((p) => [...p].length >= 2);
  return [...new Set(parts)];
}

/** 語で 0 件だった時に使う、記号で区切った断片（全角半角をそろえる） */
export function nameFragments(part: string): string[] {
  const frags = part
    .normalize('NFKC')
    .split(/[・･·•=＝+＋!！?？「」『』【】()（）〈〉<>＜＞~〜"“”'’,，、。.:：;；\-‐−–—#＃&＆]+/)
    .filter((p) => [...p].length >= 2);
  return [...new Set(frags)];
}

/** 断片でも 0 件だった時に使う前半・後半（書き間違い・中黒の書き忘れに備える） */
export function nameHalves(s: string): string[] {
  const cs = [...s];
  if (cs.length < 4) return [];
  const half = Math.ceil(cs.length / 2);
  return [...new Set([cs.slice(0, half).join(''), cs.slice(-half).join('')])];
}
