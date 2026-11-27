import { create } from 'zustand';
import { deleteImages, saveImage } from '../db/imageCache';

// カードの見た目の好み（カード名ごと）：どのイラストで表示するか、キラ加工をかけるか。
// 同じカードでも公式には別イラスト版（シークレットなど）が別のカードIDで出ているので、
// 名前で束ねて「この名前のカードはこの絵で表示する」と覚える。表示だけの設定で、対戦の処理には関係しない。
// 好みは localStorage、自分で追加した画像は IndexedDB の images（キー 'ui:art:' で始まる）。

export type Foil = 'none' | 'shine' | 'rainbow' | 'gold';

export const FOIL_LABEL: Record<Foil, string> = {
  none: 'なし',
  shine: 'キラ',
  rainbow: 'ホロ',
  gold: 'ゴールド',
};

export interface CardLook {
  /** 表示に使う画像のキー（未設定ならカード本来の画像） */
  art?: string;
  foil?: Foil;
  /** 自分で追加した画像のキー */
  uploads?: string[];
}

const KEY = 'cardLooks';
const MAX_SIZE = 20 * 1024 * 1024;

function read(): Record<string, CardLook> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

interface LooksState {
  looks: Record<string, CardLook>;
  setArt: (name: string, art: string | undefined) => void;
  setFoil: (name: string, foil: Foil) => void;
  addUpload: (name: string, file: File) => Promise<void>;
  removeUpload: (name: string, key: string) => Promise<void>;
}

export const useCardLooks = create<LooksState>((set, get) => {
  const patch = (name: string, p: Partial<CardLook>) => {
    const cur = { ...get().looks[name], ...p };
    const looks = { ...get().looks };
    // 何も設定がなければ消す
    if (!cur.art && (!cur.foil || cur.foil === 'none') && !cur.uploads?.length) delete looks[name];
    else looks[name] = cur;
    localStorage.setItem(KEY, JSON.stringify(looks));
    set({ looks });
  };
  return {
    looks: read(),
    setArt: (name, art) => patch(name, { art }),
    setFoil: (name, foil) => patch(name, { foil }),
    addUpload: async (name, file) => {
      if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください');
      if (file.size > MAX_SIZE) throw new Error('画像が大きすぎます（20MBまで）');
      const key = `ui:art:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await saveImage(key, file, 'user');
      const uploads = [...(get().looks[name]?.uploads ?? []), key];
      patch(name, { uploads, art: key });
    },
    removeUpload: async (name, key) => {
      await deleteImages([key]);
      const cur = get().looks[name];
      patch(name, { uploads: (cur?.uploads ?? []).filter((k) => k !== key), art: cur?.art === key ? undefined : cur?.art });
    },
  };
});

/** そのカード名の見た目（設定がなければ undefined） */
export function lookOf(name: string | undefined): CardLook | undefined {
  return name ? useCardLooks.getState().looks[name] : undefined;
}
