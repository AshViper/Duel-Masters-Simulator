// 公式カード検索の中継（/dm-api/*）を呼ぶ小さなヘルパー
// ローカル版（npm run dev / preview）は同じサーバーの /dm-api/ を使う。
// サーバーのない GitHub Pages 版は、公式サイトのタブをブリッジにする（officialBridge.ts）。

import { handleDmApi } from '../server/dmApi';
import { isBridgeConnected } from './officialBridge';

/** 中継サーバーがない環境（GitHub Pages など）で、ブリッジにつながっていない時のメッセージ */
export const NO_PROXY_MESSAGE =
  '公式サイトとつながっていません。「公式サイトとつなぐ」の手順（公式カード検索の画面にあります）で、公式サイトのページからブックマークレットを押してください。';

/** サーバーの中継がない環境か（GitHub Pages など。ブリッジの案内を出す） */
export function needsBridge(): boolean {
  return !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
}

/** 中継のレスポンスが JSON でなければ（静的ホスティングの 404 ページなど）中継がないと判断する */
export function isProxyMissing(res: Response): boolean {
  return !(res.headers.get('Content-Type') ?? '').includes('application/json') && !res.ok;
}

/** 中継を呼ぶ。ブリッジにつながっていればそちらを使う */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (isBridgeConnected()) {
    // 公式サイトのタブ経由で取得し、ローカル版の中継と同じ形の Response にする
    const out = await handleDmApi(new URL(path, location.origin), init?.method ?? 'GET', async () => String(init?.body ?? ''));
    if (!out) throw new Error('not found');
    return new Response(out.body as BodyInit, { status: out.status, headers: { 'Content-Type': out.contentType } });
  }
  if (needsBridge()) throw new Error(NO_PROXY_MESSAGE);
  try {
    return await fetch(path, init);
  } catch {
    throw new Error(NO_PROXY_MESSAGE);
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (isProxyMissing(res)) throw new Error(NO_PROXY_MESSAGE);
  const json = await res.json().catch(() => ({ error: `通信に失敗しました（${res.status}）` }));
  if (!res.ok) throw new Error(json.error ?? `エラー ${res.status}`);
  return json as T;
}
