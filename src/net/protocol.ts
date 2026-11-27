import type { CardRegistry } from '../core/cards/registry';
import type { CardDefinition } from '../core/cards/types';
import type { Deck } from '../core/deck/rules';
import type { Action, GameState } from '../core/engine/types';

// オンライン対戦（PeerJS）でやり取りするメッセージ。
// ホスト（部屋を作った側）がエンジンを動かし、ゲストは Action を送って GameState を受け取る。
// ホストは常にプレイヤー0、ゲストは常にプレイヤー1。

export const PROTOCOL_VERSION = 1;

export type NetMessage =
  /** ゲスト → ホスト：参加。自分のデッキとそのカード定義を送る */
  | { t: 'hello'; v: number; name: string; deck: Deck; cards: CardDefinition[]; /** 使うスリーブ（ui/sleeves.ts の id。画像なら needImages で取りに来る）。古い版は送らない */ sleeve?: string }
  /** ホスト → ゲスト：対戦開始（再接続時の再開も兼ねる）。両デッキのカード定義を送る */
  | { t: 'start'; state: GameState; cards: CardDefinition[]; deckNames: [string, string]; /** 各プレイヤーのスリーブ。古い版は送らない */ sleeves?: [string | undefined, string | undefined] }
  /** ゲスト → ホスト：操作 */
  | { t: 'action'; action: Action }
  /** ホスト → 両者：最新の状態 */
  | { t: 'state'; state: GameState }
  /** ホスト → ゲスト：操作が通らなかった、または参加できなかった */
  | { t: 'error'; message: string; fatal?: boolean }
  /** 相手に足りない画像を頼む */
  | { t: 'needImages'; keys: string[] }
  /** 画像1枚 */
  | { t: 'image'; key: string; mime: string; data: ArrayBuffer }
  /** ゲスト → ホスト：再戦の申し込み */
  | { t: 'rematch' };

/** デッキに入っているカードの定義（ツインパクトなども定義ごと送る） */
export function deckCardDefs(deck: Deck, registry: CardRegistry): CardDefinition[] {
  return Object.keys(deck.cards)
    .map((id) => registry[id])
    .filter((c): c is CardDefinition => !!c);
}

/** デッキの中で手元に定義がないカード ID */
export function missingCardIds(deck: Deck, registry: CardRegistry): string[] {
  return Object.keys(deck.cards).filter((id) => !registry[id]);
}

/**
 * 対戦用の辞書。手元の辞書に相手のカードを重ねる。
 * 同じ ID のカードはホストが送った定義を正とする（エンジンはホストで動くため）。
 */
export function mergeRegistry(base: CardRegistry, cards: CardDefinition[]): CardRegistry {
  const reg: CardRegistry = { ...base };
  for (const c of cards) reg[c.id] = c;
  return reg;
}

/** カード定義が参照している画像キー */
export function imageKeysOf(cards: CardDefinition[]): string[] {
  return [...new Set(cards.flatMap((c) => ((c.forbidden || c.psychic) && c.imageRef ? [c.imageRef, `${c.imageRef}:b`] : [c.imageRef])).filter((k): k is string => !!k))];
}

const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';

/** 部屋コード（紛らわしい文字を除いた6文字） */
export function newRoomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}

/** 入力された部屋コードを正規化する（空白・大文字を許す） */
export function normalizeRoomCode(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** PeerJS の ID。公開サーバーで他のアプリと衝突しないよう接頭辞を付ける */
export const peerIdOf = (code: string) => `card-duel-sim-${code}`;
