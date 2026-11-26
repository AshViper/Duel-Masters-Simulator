// 公式カード検索の中継（/dm-api/*）を呼ぶ小さなヘルパー

import { handleDmApi } from '../server/dmApi';
import { isBridgeConnected } from './officialBridge';

/**
 * 中継の場所。ローカル版（npm run dev / preview）は同じサーバーの /dm-api/ を使う。
 * ビルド時に VITE_DM_API_BASE（Cloudflare Worker などの URL）があればそれを使う。
 * どちらもない GitHub Pages 版は、公式サイトのタブをブリッジにする（officialBridge.ts）。
 */
const API_BASE = ((import.meta.env.VITE_DM_API_BASE as string | undefined) ?? '').trim().replace(/\/+$/, '');

/** 中継サーバーがない環境（中継を設定せずに静的ホスティングした版）で出すメッセージ */
export const NO_PROXY_MESSAGE =
  '公式サイトとつながっていません。「公式サイトとつなぐ」の手順（公式カード検索の画面にあります）で、公式サイトのページからブックマークレットを押してください。';

/** サーバーの中継がない環境か（GitHub Pages など。ブリッジの案内を出す） */
export function needsBridge(): boolean {
  return !API_BASE && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
}

const UNREACHABLE_MESSAGE = '公式カード検索の中継に接続できませんでした。時間をおいて再度お試しください。';

/** /dm-api/... を実際に呼ぶ URL にする */
export function apiUrl(path: string): string {
  return API_BASE + path;
}

/** 中継のレスポンスが JSON でなければ（静的ホスティングの 404 ページなど）中継がないと判断する */
export function isProxyMissing(res: Response): boolean {
  return !(res.headers.get('Content-Type') ?? '').includes('application/json') && !res.ok;
}

/** 中継を呼ぶ。接続できない時（Worker が止まっている・CORS で断られた）も分かるメッセージにする */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (isBridgeConnected()) {
    // 公式サイトのタブ経由で取得し、ローカル版の中継と同じ形の Response にする
    const out = await handleDmApi(new URL(path, location.origin), init?.method ?? 'GET', async () => String(init?.body ?? ''));
    if (!out) throw new Error('not found');
    return new Response(out.body as BodyInit, { status: out.status, headers: { 'Content-Type': out.contentType } });
  }
  if (needsBridge()) throw new Error(NO_PROXY_MESSAGE);
  try {
    return await fetch(apiUrl(path), init);
  } catch {
    throw new Error(API_BASE ? UNREACHABLE_MESSAGE : NO_PROXY_MESSAGE);
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (isProxyMissing(res)) throw new Error(NO_PROXY_MESSAGE);
  const json = await res.json().catch(() => ({ error: `通信に失敗しました（${res.status}）` }));
  if (!res.ok) throw new Error(json.error ?? `エラー ${res.status}`);
  return json as T;
}
