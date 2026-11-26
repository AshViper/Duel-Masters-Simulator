import { convertOfficialCard, officialCardId, OFFICIAL_PREFIX } from '../core/cards/officialConvert';
import type { OfficialCardDetail } from '../server/dmOfficial';
import { db } from '../db/db';
import { deleteImages, hasImage, saveImage } from '../db/imageCache';
import { useApp } from './appStore';
import { isProxyMissing, NO_PROXY_MESSAGE } from '../ui/officialApi';

// 公式カードを「デッキ構築・対戦で使えるように」ブラウザへ保存する。
// 公式サーバーへのアクセスは保存する時だけ。保存済みのカードは再取得しない。

export function isOfficialSaved(id: string): boolean {
  return !!useApp.getState().registry[officialCardId(id)];
}

export async function saveOfficialCard(id: string): Promise<'saved' | 'skipped'> {
  const cardId = officialCardId(id);
  const existing = useApp.getState().registry[cardId];
  if (existing?.imageRef && (await hasImage(existing.imageRef))) return 'skipped';

  const res = await fetch(`/dm-api/detail?id=${encodeURIComponent(id)}`);
  if (isProxyMissing(res)) throw new Error(NO_PROXY_MESSAGE);
  const detail = (await res.json()) as OfficialCardDetail & { error?: string };
  if (!res.ok) throw new Error(detail.error ?? `取得に失敗しました（${res.status}）`);
  const card = convertOfficialCard(detail);

  const imageUrl = detail.faces[0]?.imageUrl;
  if (imageUrl && card.imageRef) {
    const path = new URL(imageUrl).pathname;
    const img = await fetch(`/dm-api/image?path=${encodeURIComponent(path)}`);
    if (!img.ok) throw new Error(`画像の取得に失敗しました（${img.status}）`);
    await saveImage(card.imageRef, await img.blob(), imageUrl);
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
