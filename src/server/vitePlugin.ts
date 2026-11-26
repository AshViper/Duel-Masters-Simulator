import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { handleDmApi } from './dmApi';

/** 公式カード検索の中継。開発サーバー（npm run dev）とプレビュー（npm run preview）で動く。経路は dmApi.ts を参照。 */
export function dmOfficialPlugin(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const out = await handleDmApi(url, req.method ?? 'GET', () => readBody(req));
    if (!out) return next();
    res.statusCode = out.status;
    res.setHeader('Content-Type', out.contentType);
    if (out.cacheControl) res.setHeader('Cache-Control', out.cacheControl);
    res.end(typeof out.body === 'string' ? out.body : Buffer.from(out.body));
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
