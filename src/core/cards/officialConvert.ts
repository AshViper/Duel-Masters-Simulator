// 公式カード検索の詳細（OfficialCardDetail）を、デッキ構築・対戦で使うカード定義に変換する。
// 能力テキストは textParser で読み取り、定型文の能力は自動処理にする。
// 読み取れない能力は「手動処理」として残す（誤って自動処理しないため）。
import type { OfficialCardDetail, OfficialCardFace } from '../../server/dmOfficial';
import { isCreatureType, type CardDefinition, type CardType, type Civilization, type SupportLevel, type TwinSide } from './types';
import { parseAbilityText, type ParsedAbilities } from './textParser';

export const OFFICIAL_PREFIX = 'dm:';
export const OFFICIAL_SET_PREFIX = '公式 ';

const CIV_MAP: Record<string, Civilization> = { 光: 'light', 水: 'water', 闇: 'darkness', 火: 'fire', 自然: 'nature', ゼロ: 'zero', 無色: 'zero' };

export function officialCardId(id: string): string {
  return OFFICIAL_PREFIX + id;
}

export function officialImageRef(id: string): string {
  return `${OFFICIAL_PREFIX}img:${id}`;
}

function parseNumber(s: string): number | undefined {
  const m = s.normalize('NFKC').match(/-?\d+/);
  if (m) return Number(m[0]);
  return s.includes('∞') ? 99 : undefined;
}

function parseCivs(s: string): Civilization[] {
  const civs = s
    .split(/[/／・]/)
    .map((x) => CIV_MAP[x.trim()])
    .filter((x): x is Civilization => !!x);
  return civs.length ? [...new Set(civs)] : ['zero'];
}

function mapType(label: string, hasPower: boolean): CardType {
  if (label.includes('進化')) return hasPower ? 'evolution' : 'spell';
  if (label.includes('呪文')) return 'spell';
  if (label.includes('クリーチャー') || hasPower) return 'creature';
  return 'spell';
}

function faceText(f: OfficialCardFace): string {
  return f.abilities.join('\n');
}

export function convertOfficialCard(d: OfficialCardDetail): CardDefinition {
  const main = d.faces[0];
  if (!main) throw new Error('カード情報を読み取れませんでした');
  const power = parseNumber(main.power);
  const typeLabel = main.type || '不明';
  const type = mapType(typeLabel, power !== undefined);
  const set = main.packName.match(/\(?\s*([A-Za-z0-9-]+)/)?.[1];

  // ハイパー化のカードは、2面目が同じ名前のクリーチャー（ハイパーモード）
  const hyperFace = d.faces[1] && d.faces[1].name === main.name && /クリーチャー/.test(d.faces[1].type) ? d.faces[1] : undefined;
  const hyperText = hyperFace ? hyperFace.abilities.filter((a) => !main.abilities.includes(a)).join('\n') : undefined;
  const spellFace = hyperFace ? undefined : d.faces[1];
  const twin: TwinSide | undefined = spellFace
    ? {
        name: spellFace.name,
        cost: parseNumber(spellFace.cost) ?? 0,
        civilizations: parseCivs(spellFace.civilization || main.civilization),
        text: faceText(spellFace),
      }
    : undefined;

  return applyParsedEffects({
    id: officialCardId(d.id),
    name: main.name,
    imageRef: officialImageRef(d.id),
    cost: parseNumber(main.cost) ?? 0,
    civilizations: parseCivs(main.civilization),
    type,
    typeLabel,
    races: main.race ? main.race.split(/[/／]/).map((r) => r.trim()).filter(Boolean) : [],
    power: type === 'spell' ? undefined : (power ?? 0),
    text: faceText(main),
    set: set ? OFFICIAL_SET_PREFIX + set : `${OFFICIAL_SET_PREFIX}その他`,
    rarity: main.rarity || undefined,
    twin,
    ...(hyperText !== undefined ? { hyperText } : {}),
    support: 'manual',
  });
}

export function faceKind(card: CardDefinition): 'creature' | 'spell' | 'other' {
  if (isCreatureType(card.type) && card.power !== undefined) return 'creature';
  if (card.type === 'spell' && (!card.typeLabel || card.typeLabel.includes('呪文'))) return 'spell';
  return 'other';
}

/**
 * 公式カードの能力テキストを読み直して、キーワード・誘発能力・常在効果・対応状況を付け直す。
 * 保存済みのカードも読み込み時にこれを通すので、読み取りが改良されると自動で反映される。
 */
export function applyParsedEffects(card: CardDefinition): CardDefinition {
  // 以前の版で、ハイパーモードの面をツインパクトの呪文側として保存したカードを直す
  if (card.twin && card.twin.name === card.name) {
    const mainLines = new Set(card.text.split('\n'));
    card = { ...card, hyperText: card.twin.text.split('\n').filter((l) => !mainLines.has(l)).join('\n'), twin: undefined };
  }
  const main = parseAbilityText(card.text, faceKind(card));
  const hyperParsed = card.hyperText !== undefined ? parseAbilityText(card.hyperText, 'creature') : undefined;
  let twin = card.twin;
  let twinParsed: ParsedAbilities | undefined;
  if (twin) {
    twinParsed = parseAbilityText(twin.text, 'spell');
    twin = {
      ...twin,
      keywords: twinKeywords(twinParsed.keywords),
      abilities: twinParsed.abilities.length ? twinParsed.abilities : undefined,
    };
  }
  const manual = main.manualLines.length + (twinParsed?.manualLines.length ?? 0) + (hyperParsed?.manualLines.length ?? 0);
  const auto =
    Object.keys(main.keywords).length +
    main.parsedLines.length +
    (twinParsed ? Object.keys(twinParsed.keywords).length + twinParsed.parsedLines.length : 0) +
    (hyperParsed ? Object.keys(hyperParsed.keywords).length + hyperParsed.parsedLines.length : 0);
  const support: SupportLevel = manual === 0 ? 'full' : auto > 0 ? 'partial' : 'manual';
  return {
    ...card,
    keywords: Object.keys(main.keywords).length ? main.keywords : undefined,
    abilities: main.abilities.length ? main.abilities : undefined,
    statics: main.statics.length ? main.statics : undefined,
    evolvesFrom: card.type === 'evolution' ? main.evolvesFrom : card.evolvesFrom,
    replacements: main.replacements.length ? main.replacements : undefined,
    attackSwap: main.attackSwap,
    neoEvolution: main.neoEvolution,
    hyper: main.hyper,
    selfCost: main.selfCost,
    hyperForm: hyperParsed
      ? {
          keywords: Object.keys(hyperParsed.keywords).length ? hyperParsed.keywords : undefined,
          abilities: hyperParsed.abilities.length ? hyperParsed.abilities : undefined,
          statics: hyperParsed.statics.length ? hyperParsed.statics : undefined,
          replacements: hyperParsed.replacements.length ? hyperParsed.replacements : undefined,
        }
      : undefined,
    twin,
    support,
  };
}

/** ツインパクトの呪文側で使うキーワード */
function twinKeywords(kw: ParsedAbilities['keywords']): TwinSide['keywords'] {
  const out: NonNullable<TwinSide['keywords']> = {};
  if (kw.shieldTrigger) out.shieldTrigger = true;
  if (kw.charger) out.charger = true;
  if (kw.manaTapped) out.manaTapped = true;
  return Object.keys(out).length ? out : undefined;
}
