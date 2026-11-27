import { convertOfficialCard, officialCardId, OFFICIAL_PREFIX, splitTwinName } from '../core/cards/officialConvert';
import type { OfficialCardDetail } from '../server/dmOfficial';
import { db } from '../db/db';
import { deleteImages, hasImage, saveImage, setMissingImageHandler } from '../db/imageCache';
import { useApp } from './appStore';
import { apiFetch, isProxyMissing, needsBridge, NO_PROXY_MESSAGE } from '../ui/officialApi';
import { isBridgeConnected } from '../ui/officialBridge';
import type { CardDefinition } from '../core/cards/types';

// 公式カードを「デッキ構築・対戦で使えるように」ブラウザへ保存する。
// 公式サーバーへのアクセスは保存する時だけ。保存済みのカードは再取得しない。

export function isOfficialSaved(id: string): boolean {
  return !!useApp.getState().registry[officialCardId(id)];
}

export async function saveOfficialCard(id: string): Promise<'saved' | 'skipped'> {
  const cardId = officialCardId(id);
  const existing = useApp.getState().registry[cardId];
  const stale = !!existing && isStaleOfficial(existing);
  if (!stale && existing?.imageRef && (await hasImage(existing.imageRef)) && !(await backImageMissing(existing))) return 'skipped';

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
  // 禁断の鼓動・サイキック・クリーチャーは、裏返った後の面の画像も保存する
  const backUrl = card.forbidden || card.psychic ? detail.faces[1]?.imageUrl : undefined;
  if (backUrl && card.imageRef) {
    const img = await apiFetch(`/dm-api/image?path=${encodeURIComponent(new URL(backUrl).pathname)}`);
    if (img.ok) await saveImage(`${card.imageRef}:b`, await img.blob(), backUrl);
  }
  await useApp.getState().importCards([card]);
  return 'saved';
}

/** 古い版で保存した禁断の鼓動・サイキック・クリーチャー（裏側のパワーが分からない）。公式から保存し直す必要がある */
function isStaleOfficial(card: CardDefinition): boolean {
  // 空白なしの「A/B」の名前を分けられなかった版で保存したツインパクト：呪文側がハイパーモードと取り違えられて消えている
  if (!card.twin && card.hyperText && card.type !== 'spell' && splitTwinName(card.name)) return true;
  return (!!card.forbidden && card.forbidden.creature.power === undefined) || (!!card.psychic && card.psychic.back.power === undefined) || (!!card.twin && /サイキック/.test(card.typeLabel ?? ''));
}

/** 裏返る面（禁断クリーチャー・サイキックの裏面）がある公式カードで、裏面の画像が保存されていないか */
async function backImageMissing(card: CardDefinition): Promise<boolean> {
  return !!(card.forbidden || card.psychic) && !!card.imageRef && !(await hasImage(`${card.imageRef}:b`));
}

/** 1枚分の修理：古い版で保存したカードは保存し直し、裏面の画像だけ無いカードは画像を取り直す。直せたら true */
const fixing = new Map<string, Promise<boolean>>();
function repairCard(card: CardDefinition): Promise<boolean> {
  let p = fixing.get(card.id);
  if (!p) {
    p = (async () => {
      try {
        // 古い版で保存したカードは、裏側のパワーなどが欠けている（禁断解放した途端に破壊されるなど）ので、まるごと保存し直す
        if (isStaleOfficial(card)) return (await saveOfficialCard(card.id.slice(OFFICIAL_PREFIX.length))) === 'saved';
        if (!(await backImageMissing(card))) return false;
        const res = await apiFetch(`/dm-api/detail?id=${encodeURIComponent(card.id.slice(OFFICIAL_PREFIX.length))}`);
        if (!res.ok || isProxyMissing(res)) return false;
        const detail = (await res.json()) as OfficialCardDetail;
        const backUrl = detail.faces[1]?.imageUrl;
        if (!backUrl) return false;
        const img = await apiFetch(`/dm-api/image?path=${encodeURIComponent(new URL(backUrl).pathname)}`);
        if (!img.ok) return false;
        await saveImage(`${card.imageRef}:b`, await img.blob(), backUrl);
        return true;
      } catch {
        // 通信できない時は次の機会（起動・中継の接続・表示）にまた試す
        return false;
      } finally {
        fixing.delete(card.id);
      }
    })();
    fixing.set(card.id, p);
  }
  return p;
}

function canReachOfficial(): boolean {
  return !needsBridge() || isBridgeConnected();
}

/**
 * 保存済みの公式カードのうち、裏面の画像がないもの（保存時に取得に失敗したなど）の画像だけを取り直す。
 * 古い版で保存した禁断・サイキックのカードは、カードごと保存し直す。
 * 起動時と中継がつながった時に裏で動かす。中継がない環境（ブリッジ未接続）や失敗した時は何もしない。
 */
let repairing = false;
export async function repairBackImages(): Promise<number> {
  if (repairing || !canReachOfficial()) return 0;
  repairing = true;
  let fixed = 0;
  try {
    const cards = Object.values(useApp.getState().registry).filter((c) => c.id.startsWith(OFFICIAL_PREFIX));
    for (const card of cards) if (await repairCard(card)) fixed++;
  } finally {
    repairing = false;
  }
  return fixed;
}

// 裏面の画像（「…:b」）を表示しようとして無かった時は、その場でそのカードの画像を取りに行く。
// 取れたら saveImage が表示中のカードに知らせる
setMissingImageHandler((key) => {
  if (!key.endsWith(':b') || !canReachOfficial()) return;
  const front = key.slice(0, -2);
  const card = Object.values(useApp.getState().registry).find((c) => c.imageRef === front && c.id.startsWith(OFFICIAL_PREFIX));
  if (card) void repairCard(card);
});

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
