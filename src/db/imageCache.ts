import { useEffect, useState } from 'react';
import { db } from './db';

// IndexedDB に保存した画像を object URL にして表示する。
// 一度読んだ画像はメモリ上の URL を使い回すので、対戦中・デッキ構築中に公式サーバーへアクセスしない。

const urls = new Map<string, string>();
const loading = new Map<string, Promise<string | null>>();

export async function getImageUrl(key: string): Promise<string | null> {
  const hit = urls.get(key);
  if (hit) return hit;
  let p = loading.get(key);
  if (!p) {
    p = db.images.get(key).then((row) => {
      if (!row) return null;
      const url = URL.createObjectURL(row.blob);
      urls.set(key, url);
      return url;
    });
    loading.set(key, p);
    void p.finally(() => loading.delete(key));
  }
  return p;
}

const listeners = new Map<string, Set<(url: string) => void>>();

/**
 * 保存せずにメモリ上だけで使う画像（オンライン対戦で相手から受け取った画像）。
 * 表示待ちの CardView にも知らせる。
 */
export function putTempImage(key: string, blob: Blob): void {
  if (urls.has(key)) return;
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  for (const fn of listeners.get(key) ?? []) fn(url);
  listeners.delete(key);
}

/** 画像を表示できるか（保存済み、またはメモリ上にある） */
export async function canShowImage(key: string): Promise<boolean> {
  return urls.has(key) || (await hasImage(key));
}

/** 保存済み画像の Blob（相手に送る用） */
export async function getImageBlob(key: string): Promise<Blob | null> {
  return (await db.images.get(key))?.blob ?? null;
}

export async function saveImage(key: string, blob: Blob, source: string): Promise<void> {
  await db.images.put({ key, blob, savedAt: Date.now(), source });
  const old = urls.get(key);
  if (old) URL.revokeObjectURL(old);
  urls.delete(key);
}

export async function hasImage(key: string): Promise<boolean> {
  return (await db.images.where('key').equals(key).count()) > 0;
}

export async function deleteImages(keys: string[]): Promise<void> {
  await db.images.bulkDelete(keys);
  for (const k of keys) {
    const u = urls.get(k);
    if (u) URL.revokeObjectURL(u);
    urls.delete(k);
  }
}

export async function imageCacheStats(): Promise<{ count: number; bytes: number }> {
  let bytes = 0;
  let count = 0;
  await db.images.each((r) => {
    count++;
    bytes += r.blob.size;
  });
  return { count, bytes };
}

/** 保存済み画像の URL（なければ null） */
export function useCachedImage(key: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(key ? (urls.get(key) ?? null) : null);
  useEffect(() => {
    let alive = true;
    if (!key) {
      setUrl(null);
      return;
    }
    const hit = urls.get(key);
    if (hit) {
      setUrl(hit);
      return;
    }
    // まだ無い画像は、相手から届いた時（putTempImage）に表示する
    const onArrive = (u: string) => alive && setUrl(u);
    let set = listeners.get(key);
    if (!set) listeners.set(key, (set = new Set()));
    set.add(onArrive);
    void getImageUrl(key).then((u) => alive && setUrl(u ?? urls.get(key) ?? null));
    return () => {
      alive = false;
      listeners.get(key)?.delete(onArrive);
    };
  }, [key]);
  return url;
}
