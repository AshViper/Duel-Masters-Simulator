import { fetchOfficialDetail, fetchOfficialImage, fetchOfficialOptions, resolveCardName, searchOfficial, type OfficialSearchQuery } from './dmOfficial';

/**
 * 公式カード検索の中継の本体（Vite のサーバーと Cloudflare Worker で共有する）。
 *   POST /dm-api/search   本文: OfficialSearchQuery(JSON)
 *   GET  /dm-api/detail?id=dm24rp1-001
 *   GET  /dm-api/resolve?name=ロジック・サークル   書かれたカード名から公式カードの候補を探す
 *   GET  /dm-api/options
 *   GET  /dm-api/image?path=/wp-content/card/cardimage/dm24rp1-001.jpg
 * /dm-api/ で始まらないパスなら null を返す。
 */
export interface DmApiResponse {
  status: number;
  contentType: string;
  body: string | Uint8Array;
  cacheControl?: string;
}

const MAX_BODY = 10_000;

export async function handleDmApi(url: URL, method: string, readBody: () => Promise<string>): Promise<DmApiResponse | null> {
  if (!url.pathname.startsWith('/dm-api/')) return null;
  const json = (status: number, body: unknown): DmApiResponse => ({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) });
  try {
    if (url.pathname === '/dm-api/search' && method === 'POST') {
      const text = await readBody();
      if (text.length > MAX_BODY) return json(413, { error: 'too large' });
      const q = JSON.parse(text || '{}') as OfficialSearchQuery;
      return json(200, await searchOfficial(q));
    }
    if (url.pathname === '/dm-api/detail') return json(200, await fetchOfficialDetail(url.searchParams.get('id') ?? ''));
    if (url.pathname === '/dm-api/resolve') return json(200, await resolveCardName((url.searchParams.get('name') ?? '').slice(0, 100)));
    if (url.pathname === '/dm-api/options') return json(200, await fetchOfficialOptions());
    if (url.pathname === '/dm-api/image') {
      const img = await fetchOfficialImage(url.searchParams.get('path') ?? '');
      return { status: 200, contentType: img.contentType, body: new Uint8Array(img.bytes), cacheControl: 'no-store' };
    }
    return json(404, { error: 'not found' });
  } catch (e) {
    return json(502, { error: (e as Error).message });
  }
}
