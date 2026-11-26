import { convertOfficialCard, officialCardId, OFFICIAL_PREFIX } from '../core/cards/officialConvert';
import type { OfficialCardDetail } from '../server/dmOfficial';
import { db } from '../db/db';
import { deleteImages, hasImage, saveImage } from '../db/imageCache';
import { useApp } from './appStore';
import { apiFetch, isProxyMissing, NO_PROXY_MESSAGE } from '../ui/officialApi';

// 公式カードを「デッキ構築・対戦で使えるように」ブラウザへ保存する。
// 公式サーバーへのアクセスは保存する時だけ。保存済みのカードは再取得しない。

export function isOfficialSaved(id: string): boolean {
  return !!useApp.getState().registry[officialCardId(id)];
}

export async function saveOfficialCard(id: string): Promise<'saved' | 'skipped'> {
  const cardId = officialCardId(id);
  const existing = useApp.getState().registry[cardId];
  // 古い版で保存した禁断の鼓動（裏側のパワーが分からない）は保存し直す
  const stale = !!existing?.forbidden && existing.forbidden.creature.power === undefined;
  if (!stale && existing?.imageRef && (await hasImage(existing.imageRef))) return 'skipped';

  const res = await apiFetch(`/dm-api/detail?id=${encodeURIComponent(id)}`);
  if (isProxyMissing(res)) throw new Error(NO_PROXY_MESSAGE);
  const detail = (await res.json()) as OfficialCardDetail & { error?: string };
  if (!res.ok) throw new Error(detail.error ?? `取得に失敗しました（${res.status}）`);
  const card = convertOfficialCard(detail);

  const imageUrl = detail.faces[0]?.imageUrl;
  if (imageUrl && card.imageRef) {
    const path = new URL(imageUrl).pathname;
    const img = await apiFetch(`/dm-api/image?path=${encodeURIComponent(path)}`);
    if (!img.ok) throw new Error(`画像の取得に失敗しました（${img.status}）`);
    await saveImage(card.imageRef, await img.blob(), imageUrl);
  }
  // 禁断の鼓動は、禁断解放した後の面（禁断クリーチャー）の画像も保存する
  const backUrl = card.forbidden ? detail.faces[1]?.imageUrl : undefined;
  if (backUrl && card.imageRef) {
    const img = await apiFetch(`/dm-api/image?path=${encodeURIComponent(new URL(backUrl).pathname)}`);
    if (img.ok) await saveImage(`${card.imageRef}:b`, await img.blob(), backUrl);
  }
  await useApp.getState().importCards([card]);
  return 'saved';
}

/** 複数枚を順番に保存する（公式サーバー側の間隔制御は中継サーバーが行う） */
export async function saveOfficialCards(ids: string[], onProgress: (done: number, total: number, errors: string[]) => void, signal?: { cancelled: boolean }): Promise<{ saved: number; skipped: number; errors: string[] }> {
  let saved = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (signal?.cancelled) break;
    try {
      (await saveOfficialCard(ids[i])) === 'saved' ? saved++ : skipped++;
    } catch (e) {
      errors.push(`${ids[i]}: ${(e as Error).message}`);
    }
    onProgress(i + 1, ids.length, errors);
  }
  return { saved, skipped, errors };
}

/** 保存した公式カードと画像をすべて削除する（デッキからは消さない） */
export async function deleteAllOfficialCards(): Promise<number> {
  const rows = await db.customCards.filter((c) => c.id.startsWith(OFFICIAL_PREFIX)).toArray();
  await db.customCards.bulkDelete(rows.map((r) => r.id));
  await deleteImages(rows.map((r) => r.imageRef).filter((x): x is string => !!x));
  await useApp.getState().init();
  return rows.length;
}
