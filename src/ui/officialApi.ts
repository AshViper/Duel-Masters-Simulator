// 公式カード検索の中継（/dm-api/*）を呼ぶ小さなヘルパー

/**
 * 中継の場所。ローカル版（npm run dev / preview）は同じサーバーの /dm-api/ を使う。
 * GitHub Pages 版は、ビルド時の VITE_DM_API_BASE（Cloudflare Worker の URL）を使う。
 */
const API_BASE = ((import.meta.env.VITE_DM_API_BASE as string | undefined) ?? '').trim().replace(/\/+$/, '');

/** 中継サーバーがない環境（中継を設定せずに静的ホスティングした版）で出すメッセージ */
export const NO_PROXY_MESSAGE =
  '公式カード検索の中継が見つかりません。ローカル版（npm run dev / npm run preview）で使うか、中継（worker/）を公開して VITE_DM_API_BASE を設定してビルドしてください。手順は README の「GitHub Pages で公式カード検索を使う」にあります。';

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
