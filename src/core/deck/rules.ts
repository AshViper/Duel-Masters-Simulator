import type { CardRegistry } from '../cards/registry';

/** デッキ構成ルール。フォーマットごとに差し替えられる。 */
export interface DeckFormat {
  id: string;
  name: string;
  deckSize: number;
  maxCopies: number;
  /** 殿堂（1枚まで）・プレミアム殿堂（0枚）など、カードIDごとの上限 */
  restricted: Record<string, number>;
  /** 殿堂ペアなど：組み合わせのうち1種類までしか入れられない */
  restrictedPairs: string[][];
}

export const DEFAULT_FORMAT: DeckFormat = {
  id: 'standard',
  name: 'スタンダード（40枚・同名4枚まで）',
  deckSize: 40,
  maxCopies: 4,
  restricted: {},
  restrictedPairs: [],
};

export interface Deck {
  id: string;
  name: string;
  /** cardId → 枚数 */
  cards: Record<string, number>;
  formatId: string;
  createdAt: number;
  updatedAt: number;
}

export function deckCount(deck: Pick<Deck, 'cards'>): number {
  return Object.values(deck.cards).reduce((a, b) => a + b, 0);
}

export interface DeckIssue {
  level: 'error' | 'warning';
  message: string;
}

export function validateDeck(deck: Pick<Deck, 'cards'>, format: DeckFormat, registry: CardRegistry): DeckIssue[] {
  const issues: DeckIssue[] = [];
  const total = deckCount(deck);
  if (total !== format.deckSize) issues.push({ level: 'error', message: `デッキは${format.deckSize}枚にしてください（現在${total}枚）` });
  for (const [id, n] of Object.entries(deck.cards)) {
    const card = registry[id];
    const label = card?.name ?? id;
    if (!card) issues.push({ level: 'error', message: `未登録のカードが含まれています: ${id}` });
    const limit = format.restricted[id] ?? format.maxCopies;
    if (n > limit) {
      const kind = limit === 0 ? 'プレミアム殿堂' : limit === 1 ? '殿堂' : '枚数制限';
      issues.push({ level: 'error', message: `${label} は${kind}のため${limit}枚までです（${n}枚）` });
    }
    if (card?.support === 'manual') issues.push({ level: 'warning', message: `${label} の効果は手動処理です` });
  }
  for (const pair of format.restrictedPairs) {
    const used = pair.filter((id) => (deck.cards[id] ?? 0) > 0);
    if (used.length > 1) issues.push({ level: 'error', message: `殿堂ペア: ${used.map((id) => registry[id]?.name ?? id).join(' / ')} は同時に入れられません` });
  }
  return issues;
}

export function isDeckLegal(deck: Pick<Deck, 'cards'>, format: DeckFormat, registry: CardRegistry): boolean {
  return validateDeck(deck, format, registry).every((i) => i.level !== 'error');
}

/** デッキを cardId の配列（40要素）に展開する */
export function expandDeck(deck: Pick<Deck, 'cards'>): string[] {
  const out: string[] = [];
  for (const [id, n] of Object.entries(deck.cards)) for (let i = 0; i < n; i++) out.push(id);
  return out;
}
