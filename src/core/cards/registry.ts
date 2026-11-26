import { CARD_TYPES, CIVILIZATIONS, type CardDefinition, type Civilization, type CardType } from './types';

/** カードIDからカード定義を引く辞書。エンジン・UI 共通で使う。 */
export type CardRegistry = Record<string, CardDefinition>;

export function buildRegistry(cards: CardDefinition[]): CardRegistry {
  const reg: CardRegistry = {};
  for (const card of cards) reg[card.id] = card;
  return reg;
}

export interface CardQuery {
  name?: string;
  text?: string;
  civilizations?: Civilization[];
  /** true なら指定文明をすべて含むカードのみ。false なら1つでも含めばよい */
  civMatchAll?: boolean;
  costMin?: number;
  costMax?: number;
  race?: string;
  types?: CardType[];
  set?: string;
  rarity?: string;
  keyword?: string;
}

const norm = (s: string) => s.normalize('NFKC').toLowerCase();

export function searchCards(cards: CardDefinition[], q: CardQuery): CardDefinition[] {
  const name = q.name ? norm(q.name) : '';
  const text = q.text ? norm(q.text) : '';
  const race = q.race ? norm(q.race) : '';
  const kw = q.keyword ? norm(q.keyword) : '';
  return cards
    .filter((card) => {
      if (name && !norm(card.name).includes(name) && !(card.reading && norm(card.reading).includes(name))) return false;
      if (text && !norm(card.text).includes(text)) return false;
      if (race && !card.races.some((r) => norm(r).includes(race))) return false;
      if (kw && !norm(card.text).includes(kw) && !norm(card.name).includes(kw)) return false;
      if (q.civilizations && q.civilizations.length > 0) {
        const ok = q.civMatchAll
          ? q.civilizations.every((cv) => card.civilizations.includes(cv))
          : q.civilizations.some((cv) => card.civilizations.includes(cv));
        if (!ok) return false;
      }
      if (q.costMin !== undefined && card.cost < q.costMin) return false;
      if (q.costMax !== undefined && card.cost > q.costMax) return false;
      if (q.types && q.types.length > 0 && !q.types.includes(card.type)) return false;
      if (q.set && card.set !== q.set) return false;
      if (q.rarity && card.rarity !== q.rarity) return false;
      return true;
    })
    .sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
}

/** インポートされた JSON を検証してカード定義に変換する。不正な要素はエラー一覧に入る。 */
export function parseCardJson(raw: unknown): { cards: CardDefinition[]; errors: string[] } {
  const errors: string[] = [];
  const cards: CardDefinition[] = [];
  const list = Array.isArray(raw) ? raw : (raw as { cards?: unknown })?.cards;
  if (!Array.isArray(list)) return { cards, errors: ['配列、または { "cards": [...] } 形式の JSON を指定してください'] };
  list.forEach((item, i) => {
    const o = item as Partial<CardDefinition>;
    const where = `#${i + 1}`;
    if (typeof o?.id !== 'string' || !o.id) return errors.push(`${where}: id がありません`);
    if (typeof o.name !== 'string' || !o.name) return errors.push(`${where}: name がありません`);
    if (typeof o.cost !== 'number') return errors.push(`${where} ${o.name}: cost が数値ではありません`);
    if (!Array.isArray(o.civilizations) || o.civilizations.some((cv) => !CIVILIZATIONS.includes(cv)))
      return errors.push(`${where} ${o.name}: civilizations が不正です`);
    if (!CARD_TYPES.includes(o.type as CardType)) return errors.push(`${where} ${o.name}: type が不正です`);
    // 効果定義がないカードは誤って自動処理しないよう manual 扱いにする
    const hasEffects = (o.abilities?.length ?? 0) > 0 || !!o.keywords;
    cards.push({
      races: [],
      text: '',
      ...o,
      support: o.support ?? (hasEffects ? 'partial' : 'manual'),
    } as CardDefinition);
  });
  return { cards, errors };
}
