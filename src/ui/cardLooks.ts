import { createContext } from 'react';
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

/**
 * 表示中のカードの持ち主（席）。オンライン対戦で相手の席のカードは、相手が選んだ見た目（remoteLooks）で描く。
 * null（対戦画面の外など）は自分の見た目。
 */
export const LookOwnerContext = createContext<number | null>(null);

const FOILS = new Set<string>(Object.keys(FOIL_LABEL));

/** 相手から届いた見た目を確かめ、使える欄（art・foil）だけ残す */
export function sanitizeLooks(raw: unknown): Record<string, CardLook> {
  const out: Record<string, CardLook> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [name, v] of Object.entries(raw as Record<string, unknown>)) {
    const o = v as Record<string, unknown> | null;
    if (!o || typeof o !== 'object') continue;
    const look: CardLook = {};
    if (typeof o.art === 'string' && o.art) look.art = o.art;
    if (typeof o.foil === 'string' && FOILS.has(o.foil) && o.foil !== 'none') look.foil = o.foil as Foil;
    if (look.art || look.foil) out[name] = look;
  }
  return out;
}

/** 相手に送る見た目：デッキに入っているカード名の分だけ（追加画像の一覧は送らない） */
export function looksForNames(names: Iterable<string>): Record<string, CardLook> {
  const all = useCardLooks.getState().looks;
  const out: Record<string, CardLook> = {};
  for (const n of names) {
    const l = all[n];
    if (!l) continue;
    const look: CardLook = {};
    if (l.art) look.art = l.art;
    if (l.foil && l.foil !== 'none') look.foil = l.foil;
    if (look.art || look.foil) out[n] = look;
  }
  return out;
}

interface LooksState {
  looks: Record<string, CardLook>;
  /** オンライン対戦の相手の見た目と、その席（対戦していなければ null） */
  remoteLooks: Record<string, CardLook> | null;
  remoteSeat: number | null;
  setRemote: (seat: number | null, looks: Record<string, CardLook> | null) => void;
  setArt: (name: string, art: string | undefined) => void;
  setFoil: (name: string, foil: Foil) => void;
  addUpload: (name: string, file: File) => Promise<void>;
  removeUpload: (name: string, key: string) => Promise<void>;
  /** バックアップから読み込む。同じ名前は読み込んだ側で上書きし、追加した画像は両方を残す */
  importLooks: (looks: Record<string, CardLook>) => void;
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
    remoteLooks: null,
    remoteSeat: null,
    setRemote: (seat, looks) => set({ remoteSeat: seat, remoteLooks: looks }),
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
    importLooks: (incoming) => {
      const looks = { ...get().looks };
      for (const [name, l] of Object.entries(incoming)) {
        const uploads = [...new Set([...(looks[name]?.uploads ?? []), ...(l.uploads ?? [])])];
        looks[name] = { ...l, ...(uploads.length ? { uploads } : {}) };
      }
      localStorage.setItem(KEY, JSON.stringify(looks));
      set({ looks });
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
