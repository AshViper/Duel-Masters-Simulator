// 公式カード検索の中継（/dm-api/*）を呼ぶ小さなヘルパー
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const json = await res.json().catch(() => ({ error: `通信に失敗しました（${res.status}）` }));
  if (!res.ok) throw new Error(json.error ?? `エラー ${res.status}`);
  return json as T;
}
