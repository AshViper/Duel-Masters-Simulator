import { create } from 'zustand';
import { deleteImages, saveImage, useCachedImage } from '../db/imageCache';
import defaultBack from './assets/battle/card-back.webp';

// スリーブ（カードの裏面の見た目）。
// - 選べるもの：標準の裏面・色柄のプリセット・自分で追加した画像（IndexedDB images、キー 'ui:sleeve:'）
// - 全体の標準は localStorage、デッキごとの指定は Deck.sleeve（デッキと一緒に保存・バックアップされる）
// - 表示は CSS 変数 --sleeve（background-image の値）。対戦画面ではプレイヤーごとの .side に付ける
// 表示だけの設定で、対戦の処理には関係しない。

export const STD_SLEEVE = 'std';

/** 色柄のプリセット（id → background-image の値） */
export const SLEEVE_PRESETS: { id: string; label: string; css: string }[] = [
  { id: 'preset:crimson', label: '赤', css: 'radial-gradient(circle at 50% 45%, #ff7a5c 0 12%, transparent 13%), repeating-linear-gradient(45deg, #7a1020 0 6px, #5a0a18 6px 12px)' },
  { id: 'preset:azure', label: '青', css: 'radial-gradient(circle at 50% 45%, #9fe0ff 0 12%, transparent 13%), repeating-linear-gradient(135deg, #123a7a 0 6px, #0c2b5c 6px 12px)' },
  { id: 'preset:emerald', label: '緑', css: 'radial-gradient(circle at 50% 45%, #b6ffb0 0 12%, transparent 13%), repeating-linear-gradient(45deg, #135c35 0 6px, #0d4428 6px 12px)' },
  { id: 'preset:violet', label: '紫', css: 'radial-gradient(circle at 50% 45%, #e1b8ff 0 12%, transparent 13%), repeating-linear-gradient(135deg, #4a2275 0 6px, #36185a 6px 12px)' },
  { id: 'preset:gold', label: '金', css: 'radial-gradient(circle at 50% 45%, #fff3b0 0 10%, transparent 11%), linear-gradient(135deg, #8a6418, #e8c25a 45%, #9b7220 55%, #f3d77a)' },
  { id: 'preset:black', label: '黒', css: 'repeating-linear-gradient(45deg, #1a1a1f 0 4px, #101014 4px 8px), linear-gradient(#000, #222)' },
  { id: 'preset:white', label: '白', css: 'radial-gradient(circle at 50% 45%, #c9d6e8 0 12%, transparent 13%), repeating-linear-gradient(45deg, #f2f4f8 0 6px, #dfe4ec 6px 12px)' },
  { id: 'preset:rainbow', label: '虹', css: 'linear-gradient(135deg, #ff4d6d, #ffb84d, #f6ff4d, #4dff88, #4dc3ff, #9a4dff)' },
];

const KEY = 'sleeves';
const MAX_SIZE = 20 * 1024 * 1024;

export function isSleeveImage(id: string | undefined): id is string {
  return !!id && id.startsWith('ui:sleeve:');
}

interface Saved {
  /** 全体の標準のスリーブ */
  current: string;
  /** 自分で追加した画像のキー */
  uploads: string[];
}

function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
    return { current: typeof v.current === 'string' ? v.current : STD_SLEEVE, uploads: Array.isArray(v.uploads) ? v.uploads.filter((k) => typeof k === 'string') : [] };
  } catch {
    return { current: STD_SLEEVE, uploads: [] };
  }
}

interface SleeveState extends Saved {
  setCurrent: (id: string) => void;
  addUpload: (file: File) => Promise<string>;
  removeUpload: (key: string) => Promise<void>;
  /** バックアップから読み込む（追加した画像は両方残す） */
  importSaved: (s: Partial<Saved>) => void;
}

export const useSleeves = create<SleeveState>((set, get) => {
  const save = (p: Partial<Saved>) => {
    const next = { current: get().current, uploads: get().uploads, ...p };
    localStorage.setItem(KEY, JSON.stringify(next));
    set(next);
  };
  return {
    ...read(),
    setCurrent: (id) => save({ current: id }),
    addUpload: async (file) => {
      if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください');
      if (file.size > MAX_SIZE) throw new Error('画像が大きすぎます（20MBまで）');
      const key = `ui:sleeve:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await saveImage(key, file, 'user');
      save({ uploads: [...get().uploads, key] });
      return key;
    },
    removeUpload: async (key) => {
      await deleteImages([key]);
      save({ uploads: get().uploads.filter((k) => k !== key), current: get().current === key ? STD_SLEEVE : get().current });
    },
    importSaved: (s) => {
      const uploads = [...new Set([...get().uploads, ...(s.uploads ?? []).filter((k) => typeof k === 'string')])];
      save({ uploads, ...(typeof s.current === 'string' ? { current: s.current } : {}) });
    },
  };
});

/** スリーブの id を background-image の値にする（画像が見つからなければ標準） */
export function useSleeveCss(id: string | undefined): string {
  const img = useCachedImage(isSleeveImage(id) ? id : undefined);
  if (img) return `url("${img}")`;
  const preset = SLEEVE_PRESETS.find((p) => p.id === id);
  return preset ? preset.css : `url("${defaultBack}")`;
}

/** デッキのスリーブ（指定がなければ全体の標準） */
export function useDeckSleeve(deckSleeve: string | undefined): string {
  const current = useSleeves((s) => s.current);
  return useSleeveCss(deckSleeve ?? current);
}
