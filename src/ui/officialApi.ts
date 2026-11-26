// 公式カード検索の中継（/dm-api/*）を呼ぶ小さなヘルパー

/** 中継サーバーがない環境（GitHub Pages などの静的ホスティング）で出すメッセージ */
export const NO_PROXY_MESSAGE =
  '公式カード検索は、ローカルで起動した版（npm run dev / npm run preview）でのみ使えます。ローカル版で保存したカードは、カード図鑑の「バックアップ」で書き出して、この版で読み込めます。';

/** 中継のレスポンスが JSON でなければ（静的ホスティングの 404 ページなど）中継がないと判断する */
export function isProxyMissing(res: Response): boolean {
  return !(res.headers.get('Content-Type') ?? '').includes('application/json') && !res.ok;
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (isProxyMissing(res)) throw new Error(NO_PROXY_MESSAGE);
  const json = await res.json().catch(() => ({ error: `通信に失敗しました（${res.status}）` }));
  if (!res.ok) throw new Error(json.error ?? `エラー ${res.status}`);
  return json as T;
}
