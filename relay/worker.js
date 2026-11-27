// 公式カード検索（https://dm.takaratomy.co.jp/card/）の中継。GitHub Pages 版はここ経由で公式を読む。
// 公式はほかのサイトからの読み取り（CORS）を許可していないので、この中継が代わりに取得して CORS ヘッダーを付けて返す。
//   https://<この Worker>/card/...            → https://dm.takaratomy.co.jp/card/...
//   https://<この Worker>/wp-content/card/... → カード画像
// それ以外のパスは取りに行かない。呼んでよいのは ALLOWED_ORIGINS のアプリだけ。Cookie は送らない。
// GET はエッジで10分キャッシュして、公式への負荷を減らす。解析・間隔制御はアプリ側（src/server/dmOfficial.ts）。
const DM = 'https://dm.takaratomy.co.jp';
const PATH_OK = /^\/(card\/|wp-content\/card\/)/;
const CACHE_SECONDS = 600;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] ?? '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === '/' ) return new Response('dm-sim-relay ok', { headers: cors });
    // ブラウザ以外（Origin なし）や、許可していないサイトからは受けない
    if (!allowed.includes(origin)) return new Response('forbidden origin', { status: 403, headers: cors });
    if (!PATH_OK.test(url.pathname)) return new Response('not allowed', { status: 404, headers: cors });
    if (request.method !== 'GET' && request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: cors });

    const target = DM + url.pathname + url.search;
    const cache = caches.default;
    const cacheKey = new Request(target, { method: 'GET' });
    if (request.method === 'GET') {
      const hit = await cache.match(cacheKey);
      if (hit) return withHeaders(hit, cors);
    }
    const headers = { 'User-Agent': 'Mozilla/5.0 (dm-sim relay)', Referer: DM + '/card/' };
    for (const k of ['Content-Type', 'X-Requested-With']) {
      const v = request.headers.get(k);
      if (v) headers[k] = v;
    }
    const body = request.method === 'POST' ? await request.text() : undefined;
    if (body && body.length > 20000) return new Response('too large', { status: 413, headers: cors });
    const res = await fetch(target, { method: request.method, headers, body, redirect: 'follow' });
    const out = new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
    });
    if (request.method === 'GET' && res.ok) ctx.waitUntil(cache.put(cacheKey, out.clone()));
    return withHeaders(out, cors);
  },
};

function withHeaders(res, extra) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}
