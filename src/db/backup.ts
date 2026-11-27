import { parseCardJson } from '../core/cards/registry';
import type { CardDefinition } from '../core/cards/types';
import type { Deck } from '../core/deck/rules';
import { db } from './db';
import { saveImage } from './imageCache';

// カード・画像・デッキを1つの JSON ファイルに書き出し、別のブラウザ（GitHub Pages 版など）で読み込む。
// サーバーを使わず、ブラウザだけでデータを移すための仕組み。

export const BACKUP_FORMAT = 'card-duel-backup';
export const BACKUP_VERSION = 1;

export interface BackupImage {
  key: string;
  /** MIME タイプ（image/jpeg など） */
  type: string;
  source: string;
  /** Base64 */
  data: string;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  cards: CardDefinition[];
  decks: Deck[];
  images: BackupImage[];
  /** カード名ごとの見た目（ui/cardLooks.ts の CardLook）。古いファイルにはない */
  looks?: Record<string, BackupLook>;
  /** スリーブ（ui/sleeves.ts）：全体の標準と追加した画像のキー。デッキごとの指定はデッキに入っている */
  sleeves?: BackupSleeves;
}

export interface BackupSleeves {
  current?: string;
  uploads?: string[];
}

function parseSleeves(raw: unknown): BackupSleeves | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const out: BackupSleeves = {};
  if (typeof o.current === 'string' && o.current) out.current = o.current;
  if (Array.isArray(o.uploads)) out.uploads = o.uploads.filter((k): k is string => typeof k === 'string' && !!k);
  return out;
}

/** カードの見た目（ui/cardLooks.ts の CardLook と同じ形。db から ui を読まないようにここでも定義する） */
export interface BackupLook {
  art?: string;
  foil?: 'none' | 'shine' | 'rainbow' | 'gold';
  uploads?: string[];
}

const FOILS = new Set(['none', 'shine', 'rainbow', 'gold']);

/** 見た目の項目を確かめ、使える欄だけ残す（どの欄もなければ飛ばす） */
function parseLooks(raw: unknown): { looks: Record<string, BackupLook>; bad: number } {
  const looks: Record<string, BackupLook> = {};
  let bad = 0;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { looks, bad: raw === undefined ? 0 : 1 };
  for (const [name, v] of Object.entries(raw as Record<string, unknown>)) {
    const o = v as Record<string, unknown> | null;
    if (!o || typeof o !== 'object') {
      bad++;
      continue;
    }
    const look: BackupLook = {};
    if (typeof o.art === 'string' && o.art) look.art = o.art;
    if (typeof o.foil === 'string' && FOILS.has(o.foil)) look.foil = o.foil as BackupLook['foil'];
    if (Array.isArray(o.uploads)) {
      const ups = o.uploads.filter((k): k is string => typeof k === 'string' && !!k);
      if (ups.length) look.uploads = ups;
    }
    if (Object.keys(look).length) looks[name] = look;
    else bad++;
  }
  return { looks, bad };
}

export function isBackupFile(raw: unknown): boolean {
  return (raw as { format?: unknown })?.format === BACKUP_FORMAT;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(s);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

function isDeck(o: unknown): o is Deck {
  const d = o as Partial<Deck>;
  return (
    typeof d?.id === 'string' &&
    !!d.id &&
    typeof d.name === 'string' &&
    typeof d.formatId === 'string' &&
    !!d.cards &&
    typeof d.cards === 'object' &&
    Object.values(d.cards).every((n) => Number.isInteger(n) && (n as number) > 0)
  );
}

function isImage(o: unknown): o is BackupImage {
  const i = o as Partial<BackupImage>;
  return typeof i?.key === 'string' && !!i.key && typeof i.type === 'string' && typeof i.data === 'string';
}

/** 読み込んだ JSON を検証する。不正な項目は飛ばしてエラーに数える */
export function parseBackup(raw: unknown): { cards: CardDefinition[]; decks: Deck[]; images: BackupImage[]; looks: Record<string, BackupLook>; sleeves?: BackupSleeves; errors: string[] } {
  const o = raw as Partial<BackupFile>;
  if (!isBackupFile(raw)) return { cards: [], decks: [], images: [], looks: {}, errors: ['バックアップファイルではありません'] };
  if (typeof o.version !== 'number' || o.version > BACKUP_VERSION)
    return { cards: [], decks: [], images: [], looks: {}, errors: ['このアプリより新しい形式のファイルです。アプリを更新してください'] };
  const { cards, errors } = parseCardJson(Array.isArray(o.cards) ? o.cards : []);
  const deckList = Array.isArray(o.decks) ? o.decks : [];
  const decks = deckList.filter(isDeck);
  if (decks.length < deckList.length) errors.push(`デッキ ${deckList.length - decks.length}件が不正なため飛ばしました`);
  const imageList = Array.isArray(o.images) ? o.images : [];
  const images = imageList.filter(isImage);
  if (images.length < imageList.length) errors.push(`画像 ${imageList.length - images.length}件が不正なため飛ばしました`);
  const { looks, bad } = parseLooks(o.looks);
  if (bad) errors.push(`見た目の設定 ${bad}件が不正なため飛ばしました`);
  return { cards, decks, images, looks, sleeves: parseSleeves(o.sleeves), errors };
}

/** ブラウザ内のカード・画像・デッキをまとめる。looks はカードの見た目の設定（localStorage にあるので呼び出し側が渡す） */
export async function buildBackup(looks: Record<string, BackupLook> = {}, sleeves?: BackupSleeves): Promise<BackupFile> {
  const [cards, decks, rows] = await Promise.all([db.customCards.toArray(), db.decks.toArray(), db.images.toArray()]);
  const images: BackupImage[] = [];
  for (const r of rows) {
    images.push({ key: r.key, type: r.blob.type || 'application/octet-stream', source: r.source, data: bytesToBase64(new Uint8Array(await r.blob.arrayBuffer())) });
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: Date.now(), cards, decks, images, looks, ...(sleeves ? { sleeves } : {}) };
}

/** バックアップを書き込む。同じ ID のカード・デッキ・画像は上書きする */
export async function restoreBackup(b: { cards: CardDefinition[]; decks: Deck[]; images: BackupImage[] }): Promise<void> {
  for (const img of b.images) await saveImage(img.key, new Blob([base64ToBytes(img.data)], { type: img.type }), img.source);
  await db.transaction('rw', db.customCards, db.decks, async () => {
    if (b.cards.length) await db.customCards.bulkPut(b.cards);
    if (b.decks.length) await db.decks.bulkPut(b.decks);
  });
}
