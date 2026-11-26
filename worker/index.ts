// GitHub Pages 版から公式カード検索を使うための中継（Cloudflare Worker）。
// 中身は Vite のサーバーと同じ src/server/dmApi.ts。ここでは CORS だけを足す。
// 公開手順は README の「GitHub Pages で公式カード検索を使う」を参照。

import { handleDmApi } from '../src/server/dmApi';

interface Env {
  /** 呼び出しを許すサイトのオリジン（カンマ区切り）。例: https://ashviper.github.io */
  ALLOWED_ORIGINS?: string;
}

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function allowedOrigin(origin: string | null, env: Env): string | null {
  if (!origin) return null;
  const list = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) || LOCAL_ORIGIN.test(origin) ? origin : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request.headers.get('Origin'), env);
    const cors: Record<string, string> = origin
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
      : { Vary: 'Origin' };
    // 許可していないサイトからの呼び出しは断る（公式サーバーへの負荷を、使う人の分だけに抑える）
    if (request.headers.get('Origin') && !origin) return new Response('forbidden origin', { status: 403, headers: cors });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const out = await handleDmApi(new URL(request.url), request.method, async () => (await request.text()).slice(0, 10_001));
    if (!out) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
    const headers: Record<string, string> = { ...cors, 'Content-Type': out.contentType };
    if (out.cacheControl) headers['Cache-Control'] = out.cacheControl;
    return new Response(out.body as BodyInit, { status: out.status, headers });
  },
};
