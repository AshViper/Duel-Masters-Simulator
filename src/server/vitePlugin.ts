import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { fetchOfficialDetail, fetchOfficialImage, fetchOfficialOptions, resolveCardName, searchOfficial, type OfficialSearchQuery } from './dmOfficial';

/**
 * 公式カード検索の中継。開発サーバー（npm run dev）とプレビュー（npm run preview）で動く。
 *   POST /dm-api/search   本文: OfficialSearchQuery(JSON)
 *   GET  /dm-api/detail?id=dm24rp1-001
 *   GET  /dm-api/resolve?name=ロジック・サークル   書かれたカード名から公式カードの候補を探す
 *   GET  /dm-api/options
 *   GET  /dm-api/image?path=/wp-content/card/cardimage/dm24rp1-001.jpg
 */
export function dmOfficialPlugin(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/dm-api/')) return next();
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    try {
      if (url.pathname === '/dm-api/search' && req.method === 'POST') {
        const q = JSON.parse((await readBody(req)) || '{}') as OfficialSearchQuery;
        return send(200, await searchOfficial(q));
      }
      if (url.pathname === '/dm-api/detail') return send(200, await fetchOfficialDetail(url.searchParams.get('id') ?? ''));
      if (url.pathname === '/dm-api/resolve') return send(200, await resolveCardName((url.searchParams.get('name') ?? '').slice(0, 100)));
      if (url.pathname === '/dm-api/options') return send(200, await fetchOfficialOptions());
      if (url.pathname === '/dm-api/image') {
        const img = await fetchOfficialImage(url.searchParams.get('path') ?? '');
        res.statusCode = 200;
        res.setHeader('Content-Type', img.contentType);
        res.setHeader('Cache-Control', 'no-store');
        return res.end(Buffer.from(img.bytes));
      }
      return send(404, { error: 'not found' });
    } catch (e) {
      return send(502, { error: (e as Error).message });
    }
  };
  return {
    name: 'dm-official-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => void handler(req, res, next));
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => {
      data += c;
      if (data.length > 10_000) reject(new Error('too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
