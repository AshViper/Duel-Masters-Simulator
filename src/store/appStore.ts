import { create } from 'zustand';
import { buildRegistry, type CardRegistry } from '../core/cards/registry';
import type { CardDefinition } from '../core/cards/types';
import { applyParsedEffects, OFFICIAL_PREFIX } from '../core/cards/officialConvert';
import { setUserLineDefs, type LineDefs } from '../core/cards/lineDefs';

/** 保存済みの公式カードは、読み込むたびに能力テキストを読み直す（読み取りの改良を反映するため） */
function withParsedEffects(cards: CardDefinition[]): CardDefinition[] {
  return cards.map((c) => (c.id.startsWith(OFFICIAL_PREFIX) ? applyParsedEffects(c) : c));
}

/** オンライン対戦中に相手から受け取ったカード。手元のカードを読み直しても辞書から消さない（消すと盤面が描けない） */
let battleCards: CardDefinition[] = [];
function registryOf(cards: CardDefinition[]): CardRegistry {
  const reg = buildRegistry(cards);
  // 同じ ID のカードは受け取った定義を正とする（エンジンはホストで動くため）
  for (const c of battleCards) reg[c.id] = c;
  return reg;
}
/** 対戦用のカードを辞書に重ねる（null で外して手元の辞書に戻す） */
export function setBattleCards(cards: CardDefinition[] | null): void {
  battleCards = cards ?? [];
  useApp.setState({ registry: registryOf(useApp.getState().cards) });
}
import { DEFAULT_FORMAT, type Deck, type DeckFormat } from '../core/deck/rules';
import { db } from '../db/db';

export type Screen = 'home' | 'decks' | 'builder' | 'library' | 'setup' | 'battle' | 'settings' | 'history' | 'official' | 'online';

export interface Settings {
  cpuDelayMs: number;
  confirmEndTurn: boolean;
  format: DeckFormat;
  /** オンライン対戦で相手に見せる名前 */
  playerName: string;
  /** 利用者が取り込んだ、能力の文ごとの効果定義（読めない能力を自動処理にする） */
  lineDefs?: LineDefs;
}

const DEFAULT_SETTINGS: Settings = { cpuDelayMs: 700, confirmEndTurn: false, format: DEFAULT_FORMAT, playerName: '' };

interface AppState {
  screen: Screen;
  ready: boolean;
  cards: CardDefinition[];
  registry: CardRegistry;
  decks: Deck[];
  editingDeckId: string | null;
  /** デッキ構築を開いた時に「テキストから取り込み」を開く */
  /** デッキ構築を開いた時に「テキストから作成」を開く。文字列なら、その内容を貼り付けた状態で読み取る */
  pendingTextImport: boolean | string;
  settings: Settings;
  recentDeckIds: string[];
  go: (s: Screen) => void;
  init: () => Promise<void>;
  saveDeck: (d: Deck) => Promise<void>;
  deleteDeck: (id: string) => Promise<void>;
  duplicateDeck: (id: string) => Promise<Deck | undefined>;
  newDeck: (name?: string) => Promise<Deck>;
  editDeck: (id: string) => void;
  importCards: (cards: CardDefinition[]) => Promise<void>;
  clearCustomCards: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  touchRecent: (deckId: string) => Promise<void>;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** 以前のバージョンで同梱していた仮のカード（S01-001 など）の ID */
const LEGACY_SAMPLE_ID = /^S0\d-\d{3}$/;

/**
 * 仮のカードを使っていたデータの掃除（1回だけ）。
 * 仮のカードだけでできたデッキは削除し、他のカードと混ざったデッキからは仮のカードだけを抜く。
 * 仮のカードを含む中断データは読み込めないので削除する。
 */
async function removeLegacySampleData(): Promise<void> {
  if (await db.settings.get('removedSampleCards')) return;
  await db.transaction('rw', db.decks, db.savedGames, db.settings, async () => {
    for (const d of await db.decks.toArray()) {
      const ids = Object.keys(d.cards);
      const legacy = ids.filter((id) => LEGACY_SAMPLE_ID.test(id));
      if (legacy.length === 0) continue;
      if (legacy.length === ids.length) await db.decks.delete(d.id);
      else {
        const cards = { ...d.cards };
        for (const id of legacy) delete cards[id];
        await db.decks.put({ ...d, cards, updatedAt: Date.now() });
      }
    }
    for (const g of await db.savedGames.toArray()) {
      if (Object.values(g.state.cards).some((c) => LEGACY_SAMPLE_ID.test(c.cardId))) await db.savedGames.delete(g.id);
    }
    await db.settings.delete('seededSampleDecks');
    await db.settings.put({ key: 'removedSampleCards', value: true });
  });
}

export const useApp = create<AppState>((set, get) => ({
  screen: 'home',
  ready: false,
  cards: [],
  registry: {},
  decks: [],
  editingDeckId: null,
  pendingTextImport: false,
  settings: DEFAULT_SETTINGS,
  recentDeckIds: [],

  go: (screen) => set({ screen }),

  init: async () => {
    await removeLegacySampleData();
    const [custom, decks, settingsRow, recentRow] = await Promise.all([
      db.customCards.toArray(),
      db.decks.orderBy('updatedAt').reverse().toArray(),
      db.settings.get('settings'),
      db.settings.get('recentDecks'),
    ]);
    const settings: Settings = { ...DEFAULT_SETTINGS, ...((settingsRow?.value as Partial<Settings>) ?? {}) };
    // 能力を読み直す前に、取り込んである効果定義を使えるようにする
    setUserLineDefs(settings.lineDefs);
    const cards = withParsedEffects(custom);
    const deckIds = new Set(decks.map((d) => d.id));
    set({
      cards,
      registry: registryOf(cards),
      decks,
      settings,
      recentDeckIds: ((recentRow?.value as string[]) ?? []).filter((id) => deckIds.has(id)),
      ready: true,
    });
  },

  saveDeck: async (d) => {
    const deck = { ...d, updatedAt: Date.now() };
    await db.decks.put(deck);
    const others = get().decks.filter((x) => x.id !== d.id);
    set({ decks: [deck, ...others] });
  },

  deleteDeck: async (id) => {
    await db.decks.delete(id);
    set({ decks: get().decks.filter((d) => d.id !== id), recentDeckIds: get().recentDeckIds.filter((x) => x !== id) });
  },

  duplicateDeck: async (id) => {
    const src = get().decks.find((d) => d.id === id);
    if (!src) return;
    const now = Date.now();
    const copy: Deck = { ...src, id: uid(), name: `${src.name}（コピー）`, cards: { ...src.cards }, createdAt: now, updatedAt: now };
    await get().saveDeck(copy);
    return copy;
  },

  newDeck: async (name) => {
    const now = Date.now();
    const d: Deck = { id: uid(), name: name ?? '新しいデッキ', cards: {}, formatId: 'standard', createdAt: now, updatedAt: now };
    await get().saveDeck(d);
    set({ editingDeckId: d.id, screen: 'builder' });
    return d;
  },

  editDeck: (id) => set({ editingDeckId: id, screen: 'builder' }),

  importCards: async (cards) => {
    await db.customCards.bulkPut(cards);
    const all = withParsedEffects(await db.customCards.toArray());
    set({ cards: all, registry: registryOf(all) });
  },

  clearCustomCards: async () => {
    await db.customCards.clear();
    set({ cards: [], registry: registryOf([]) });
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    await db.settings.put({ key: 'settings', value: settings });
    set({ settings });
    // 効果定義が変わったら、保存済みのカードの能力を読み直す
    if ('lineDefs' in patch) {
      setUserLineDefs(settings.lineDefs);
      const all = withParsedEffects(await db.customCards.toArray());
      set({ cards: all, registry: registryOf(all) });
    }
  },

  touchRecent: async (deckId) => {
    const recent = [deckId, ...get().recentDeckIds.filter((x) => x !== deckId)].slice(0, 5);
    await db.settings.put({ key: 'recentDecks', value: recent });
    set({ recentDeckIds: recent });
  },
}));
