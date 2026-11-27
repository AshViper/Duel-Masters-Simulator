import Dexie, { type Table } from 'dexie';
import type { CardDefinition } from '../core/cards/types';
import type { Deck } from '../core/deck/rules';
import type { GameState, LogEntry, PlayerId } from '../core/engine/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

export interface MatchRecord {
  id?: number;
  playedAt: number;
  mode: 'cpu' | 'solo' | 'online';
  deckNames: [string, string];
  winner: PlayerId | null;
  reason: string;
  turns: number;
  log: LogEntry[];
}

export interface SavedGame {
  id: string;
  savedAt: number;
  title: string;
  mode: 'cpu' | 'solo';
  difficulty: string;
  state: GameState;
  /** 各プレイヤーのデッキのスリーブ（表示用。古い保存にはない） */
  sleeves?: [string | undefined, string | undefined];
}

/** 画像キャッシュ（公式カード画像など）。ブラウザ内にだけ保存する */
export interface ImageRow {
  key: string;
  blob: Blob;
  savedAt: number;
  /** 取得元（確認用） */
  source: string;
}

/**
 * IndexedDB。スキーマを変える時は version を上げ、必要なら upgrade() で移行処理を書く。
 */
export class AppDB extends Dexie {
  decks!: Table<Deck, string>;
  customCards!: Table<CardDefinition, string>;
  settings!: Table<SettingRow, string>;
  matches!: Table<MatchRecord, number>;
  savedGames!: Table<SavedGame, string>;
  images!: Table<ImageRow, string>;

  constructor(name = 'card-duel-simulator') {
    super(name);
    this.version(1).stores({
      decks: 'id, name, updatedAt',
      customCards: 'id, name, cost, type, set',
      settings: 'key',
      matches: '++id, playedAt',
      savedGames: 'id, savedAt',
    });
    // v2: 画像キャッシュを追加（既存データはそのまま）
    this.version(2).stores({ images: 'key, savedAt' });
    // 例: this.version(3).stores({...}).upgrade(tx => tx.table('decks').toCollection().modify(d => { d.formatId ??= 'standard'; }));
  }
}

export const db = new AppDB();
