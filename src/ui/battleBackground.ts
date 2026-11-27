import { create } from 'zustand';
import { db } from '../db/db';

// 対戦画面の背景画像（ユーザーが選んだ画像）。IndexedDB の images テーブルに Blob で保存する。
// 公式カード画像のキャッシュと同じテーブルだが、キーが 'ui:' で始まるので混ざらない。

const KEY = 'ui:battle-background';
const DIM_KEY = 'battle.bgDim';
const MAX_SIZE = 20 * 1024 * 1024;

interface BgState {
  url: string | null;
  /** 背景を暗くする強さ 0〜0.8（カードを見やすくするため） */
  dim: number;
  loaded: boolean;
  load: () => Promise<void>;
  setImage: (file: File) => Promise<void>;
  clear: () => Promise<void>;
  setDim: (v: number) => void;
}

const readDim = (): number => {
  const v = Number(localStorage.getItem(DIM_KEY));
  return Number.isFinite(v) && localStorage.getItem(DIM_KEY) !== null ? v : 0.35;
};

export const useBattleBackground = create<BgState>((set, get) => ({
  url: null,
  dim: readDim(),
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    set({ loaded: true });
    const row = await db.images.get(KEY);
    if (row) set({ url: URL.createObjectURL(row.blob) });
  },
  setImage: async (file) => {
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください');
    if (file.size > MAX_SIZE) throw new Error('画像が大きすぎます（20MBまで）');
    await db.images.put({ key: KEY, blob: file, savedAt: Date.now(), source: 'user' });
    const old = get().url;
    if (old) URL.revokeObjectURL(old);
    set({ url: URL.createObjectURL(file), loaded: true });
  },
  clear: async () => {
    await db.images.delete(KEY);
    const old = get().url;
    if (old) URL.revokeObjectURL(old);
    set({ url: null });
  },
  setDim: (v) => {
    localStorage.setItem(DIM_KEY, String(v));
    set({ dim: v });
  },
}));
