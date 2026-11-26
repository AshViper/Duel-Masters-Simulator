// デュエル・マスターズ公式カード検索（https://dm.takaratomy.co.jp/card/）の
// 検索結果・カード詳細ページを読み取り、表示用の JSON に変換する。
// ・データは保存しない（ディスク・IndexedDB に書かない）。表示のためにその都度取得する。
// ・公式サーバーへの負荷を抑えるため、リクエストは直列化して間隔を空け、短時間だけメモリにキャッシュする。
// ブラウザからは CORS で直接取得できないため、Vite の開発サーバー上の中継（vitePlugin.ts）から呼ぶ。

import { fallbackKeywords, nameMatchScore, searchKeywords } from '../core/deck/deckText';

export const DM_ORIGIN = 'https://dm.takaratomy.co.jp';
const CARD_URL = `${DM_ORIGIN}/card/`;

export interface OfficialSearchQuery {
  keyword?: string;
  /** card_name / card_ruby / card_text / race / flavor / illustrator_name */
  keywordTypes?: string[];
  /** 光 / 水 / 闇 / 火 / 自然 / ゼロ */
  civilizations?: string[];
  costMin?: number;
  costMax?: number;
  powerMin?: number;
  powerMax?: number;
  cardtype?: string;
  race?: string;
  rarity?: string;
  ability?: string;
  products?: string;
  format?: string;
  twinpact?: string;
  sort?: string;
  page?: number;
}

export interface OfficialCardThumb {
  id: string;
  thumbUrl: string;
  detailUrl: string;
}

export interface OfficialSearchResult {
  cards: OfficialCardThumb[];
  page: number;
  lastPage: number;
}

export interface OfficialCardFace {
  name: string;
  packName: string;
  imageUrl: string;
  type: string;
  civilization: string;
  rarity: string;
  power: string;
  cost: string;
  mana: string;
  race: string;
  illustrator: string;
  abilities: string[];
  flavor: string;
}

export interface OfficialCardDetail {
  id: string;
  detailUrl: string;
  productUrl?: string;
  /** ツインパクトなどは複数の面を持つ */
  faces: OfficialCardFace[];
}

export interface SelectOption {
  value: string;
  label: string;
}

export type OfficialOptions = Record<string, SelectOption[]>;

// ───────────────────────── HTML 解析（純粋関数） ─────────────────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9#]+);/gi, (m, n) => ENTITIES[n] ?? m);
}

/** タグを除去してテキストにする（<br> は改行） */
export function htmlToText(html: string): string {
  return decodeEntities(html.replace(/\r/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

const abs = (path: string) => (path.startsWith('http') ? path : DM_ORIGIN + path);

export function parseSearchResult(html: string): OfficialSearchResult {
  const cards: OfficialCardThumb[] = [];
  const seen = new Set<string>();
  const re = /<img[^>]*class=['"]cardImage['"][^>]*data-href=['"]\/card\/detail\/\?id=([^'"]+)['"][^>]*src=['"]([^'"]+)['"]/g;
  for (const m of html.matchAll(re)) {
    const id = decodeEntities(m[1]);
    if (seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, thumbUrl: abs(m[2]), detailUrl: `${DM_ORIGIN}/card/detail/?id=${encodeURIComponent(id)}` });
  }
  const pager = html.match(/<div class="wp-pagenavi">([\s\S]*?)<\/div>/)?.[1] ?? '';
  const current = Number(pager.match(/<span class="current">(\d+)<\/span>/)?.[1] ?? 1);
  const pages = [...pager.matchAll(/data-page="(\d+)"/g)].map((m) => Number(m[1]));
  const lastPage = cards.length > 0 ? Math.max(current, ...pages) : 0;
  return { cards, page: current, lastPage };
}

function td(block: string, cls: string): string {
  const m = block.match(new RegExp(`<td[^>]*class=['"]${cls}(?:\\s[^'"]*)?['"][^>]*>([\\s\\S]*?)</td>`));
  return m ? htmlToText(m[1]) : '';
}

export function parseCardDetail(html: string, id: string): OfficialCardDetail {
  const blocks = html.split(/<div class=['"]card-itself['"]>/).slice(1);
  const faces: OfficialCardFace[] = blocks.map((block) => {
    const nameHtml = block.match(/<h3 class=['"]card-name['"]>([\s\S]*?)<\/h3>/)?.[1] ?? '';
    const packName = htmlToText(nameHtml.match(/<span class=['"]packname['"]>([\s\S]*?)<\/span>/)?.[1] ?? '');
    const name = htmlToText(nameHtml.replace(/<span class=['"]packname['"]>[\s\S]*?<\/span>/, ''));
    const img = block.match(/<div class="card-img">\s*<img src="([^"]+)"/)?.[1];
    const skillsHtml = block.match(/<td[^>]*class=['"]skills[^'"]*['"][^>]*>([\s\S]*?)<\/td>/)?.[1] ?? '';
    const abilities = [...skillsHtml.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => htmlToText(m[1])).filter(Boolean);
    return {
      name,
      packName,
      imageUrl: img ? abs(img) : '',
      type: td(block, 'type'),
      civilization: td(block, 'civil'),
      rarity: td(block, 'rarelity'),
      power: td(block, 'power'),
      cost: td(block, 'cost'),
      mana: td(block, 'mana'),
      race: td(block, 'race'),
      illustrator: td(block, 'illusttxt'),
      abilities: abilities.length ? abilities : skillsHtml ? [htmlToText(skillsHtml)].filter(Boolean) : [],
      flavor: td(block, 'flavor'),
    };
  });
  const productUrl = html.match(/<div class='card_package'>\s*<a href="([^"]+)"/)?.[1];
  return { id, detailUrl: `${DM_ORIGIN}/card/detail/?id=${encodeURIComponent(id)}`, productUrl, faces };
}

/** 検索フォームの選択肢（カードの種類・レアリティ・商品名など）を読み取る */
export function parseOptions(html: string): OfficialOptions {
  // 並び順の select は検索フォームの外（#sort-area）にあるので、ページ全体から読む
  const form = html;
  const out: OfficialOptions = {};
  for (const m of form.matchAll(/<select name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    out[m[1]] = [...m[2].matchAll(/<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)]
      .map((o) => ({ value: decodeEntities(o[1]), label: htmlToText(o[2]) }))
      .filter((o) => o.value !== '');
  }
  return out;
}

/** 公式フォームと同じ形式（name[]=値）の POST 本文を作る */
export function buildSearchBody(q: OfficialSearchQuery): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v))) p.append(k, String(v));
  };
  set('keyword', q.keyword?.trim());
  if (q.keyword?.trim()) for (const t of q.keywordTypes ?? []) p.append('keyword_type[]', t);
  for (const c of q.civilizations ?? []) p.append('culture[]', c);
  set('cost_lower', q.costMin);
  set('cost_upper', q.costMax);
  set('power_lower', q.powerMin);
  set('power_upper', q.powerMax);
  set('cardtype', q.cardtype);
  set('race', q.race);
  set('rarity', q.rarity);
  set('ability', q.ability);
  set('products', q.products);
  set('format', q.format);
  set('twinpact', q.twinpact);
  set('sort', q.sort);
  set('pagenum', Math.max(1, Math.floor(q.page ?? 1)));
  return p;
}

// ───────────────────────── 取得（サーバー側） ─────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const MIN_INTERVAL_MS = 400;
const cache = new Map<string, { at: number; value: unknown }>();
let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return value;
}

/** 公式サイトから1件取得する方法。サーバーでは fetch、ブラウザ（GitHub Pages 版）では公式サイトのタブ経由に差し替える */
export interface OfficialFetchInit {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}
export type OfficialFetcher = (url: string, init: OfficialFetchInit) => Promise<{ status: number; bytes: ArrayBuffer; contentType: string }>;

const serverFetcher: OfficialFetcher = async (url, init) => {
  const res = await fetch(url, {
    method: init.method,
    body: init.body,
    headers: { 'User-Agent': 'Mozilla/5.0 (local card viewer)', Referer: CARD_URL, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status, bytes: await res.arrayBuffer(), contentType: res.headers.get('content-type') ?? 'application/octet-stream' };
};
let fetcher: OfficialFetcher = serverFetcher;

export function setOfficialFetcher(f: OfficialFetcher): void {
  fetcher = f;
}

/** 公式サーバーへのリクエストを1本ずつ、間隔を空けて送る */
function politeFetchRaw(url: string, init: OfficialFetchInit = {}): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const run = async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    const res = await fetcher(url, init);
    if (res.status < 200 || res.status >= 300) throw new Error(`公式サイトが ${res.status} を返しました`);
    return { bytes: res.bytes, contentType: res.contentType || 'application/octet-stream' };
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

async function politeFetch(url: string, init?: OfficialFetchInit): Promise<string> {
  return new TextDecoder('utf-8').decode((await politeFetchRaw(url, init)).bytes);
}

/** 公式のカード画像のパスか（中継で任意の URL を取りに行かないための制限） */
export function isCardImagePath(path: string): boolean {
  return /^\/wp-content\/card\/(cardimage|cardthumb)\/[A-Za-z0-9_-]+\.(jpg|png)$/.test(path);
}

/** カード画像を取得する（保存はブラウザ側の IndexedDB で行う） */
export function fetchOfficialImage(path: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  if (!isCardImagePath(path)) return Promise.reject(new Error('不正な画像パスです'));
  return politeFetchRaw(DM_ORIGIN + path);
}

export function searchOfficial(q: OfficialSearchQuery): Promise<OfficialSearchResult> {
  const body = buildSearchBody(q);
  return cached(`s:${body.toString()}`, async () =>
    parseSearchResult(
      await politeFetch(CARD_URL, {
        method: 'POST',
        body: body.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      }),
    ),
  );
}

export function fetchOfficialDetail(id: string): Promise<OfficialCardDetail> {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return Promise.reject(new Error('不正なカードIDです'));
  return cached(`d:${id}`, async () => parseCardDetail(await politeFetch(`${CARD_URL}detail/?id=${encodeURIComponent(id)}`), id));
}

export function fetchOfficialOptions(): Promise<OfficialOptions> {
  return cached('options', async () => parseOptions(await politeFetch(CARD_URL)));
}

// ───────────────────────── カード名 → 公式カード ─────────────────────────

export interface ResolvedCandidate {
  id: string;
  /** 公式の表記（ツインパクトは「A / B」）。パック名は除く */
  name: string;
  thumbUrl: string;
  /** 3: 完全一致 / 2: ツインパクトの片面 / 1: 部分一致 / 0: 不一致 */
  score: number;
}

const MAX_DETAILS_PER_NAME = 8;

/**
 * 書かれたカード名から公式カードを探す。検索結果には名前が載らないので、候補の詳細を読んで名前を照合する。
 * 完全一致が見つかればそこで止める（公式へのリクエストを減らすため）。
 */
export function resolveCardName(name: string): Promise<{ name: string; candidates: ResolvedCandidate[] }> {
  return cached(`r:${name}`, async () => {
    const found = new Map<string, ResolvedCandidate>();
    let checked = 0;
    const keywords = searchKeywords(name);
    const fallback = fallbackKeywords(name);
    for (let k = 0; k < keywords.length; k++) {
      const keyword = keywords[k];
      const result = await searchOfficial({ keyword, keywordTypes: ['card_name'], page: 1 });
      for (const c of result.cards) {
        if (found.has(c.id) || checked >= MAX_DETAILS_PER_NAME) continue;
        checked++;
        const d = await fetchOfficialDetail(c.id);
        const faces = d.faces.map((f) => f.name.replace(/\([A-Za-z0-9-]+\s[^)]*\)\s*$/, '').trim());
        const full = faces[0] ?? c.id;
        found.set(c.id, { id: c.id, name: full, thumbUrl: c.thumbUrl, score: nameMatchScore(name, full, faces) });
      }
      const best = Math.max(0, ...[...found.values()].map((c) => c.score));
      if (best === 3) break;
      // 書かれた名前では何も一致しない時だけ、名前の前半・後半でも探す
      if (k === keywords.length - 1 && best === 0 && fallback.length) keywords.push(...fallback.filter((f) => !keywords.includes(f)).splice(0));
    }
    const candidates = [...found.values()].filter((c) => c.score > 0).sort((a, b) => b.score - a.score);
    return { name, candidates };
  });
}
