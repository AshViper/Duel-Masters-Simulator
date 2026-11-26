import { describe, expect, it } from 'vitest';
import worker from '../../worker/index';

const env = { ALLOWED_ORIGINS: 'https://ashviper.github.io' };
const req = (path: string, init: RequestInit & { origin?: string } = {}) =>
  new Request(`https://proxy.example${path}`, { ...init, headers: { ...(init.origin ? { Origin: init.origin } : {}), ...(init.headers as Record<string, string>) } });

describe('公式カード検索の中継（Worker）', () => {
  it('許可したサイトのプリフライトに CORS ヘッダーを返す', async () => {
    const res = await worker.fetch(req('/dm-api/search', { method: 'OPTIONS', origin: 'https://ashviper.github.io' }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://ashviper.github.io');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });

  it('localhost は常に許可する', async () => {
    const res = await worker.fetch(req('/dm-api/search', { method: 'OPTIONS', origin: 'http://localhost:5173' }), env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('許可していないサイトからは断る', async () => {
    const res = await worker.fetch(req('/dm-api/options', { origin: 'https://evil.example' }), env);
    expect(res.status).toBe(403);
  });

  it('/dm-api/ 以外と不正な引数は公式へ取りに行かずに返す', async () => {
    expect((await worker.fetch(req('/other', { origin: 'https://ashviper.github.io' }), env)).status).toBe(404);
    const bad = await worker.fetch(req('/dm-api/image?path=/etc/passwd', { origin: 'https://ashviper.github.io' }), env);
    expect(bad.status).toBe(502);
    expect(bad.headers.get('Access-Control-Allow-Origin')).toBe('https://ashviper.github.io');
    expect((await bad.json()).error).toBe('不正な画像パスです');
  });
});
