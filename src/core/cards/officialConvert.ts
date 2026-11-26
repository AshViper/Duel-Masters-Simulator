// 公式カード検索の詳細（OfficialCardDetail）を、デッキ構築・対戦で使うカード定義に変換する。
// 能力テキストは textParser で読み取り、定型文の能力は自動処理にする。
// 読み取れない能力は「手動処理」として残す（誤って自動処理しないため）。
import type { OfficialCardDetail, OfficialCardFace } from '../../server/dmOfficial';
import { isCreatureType, type CardDefinition, type CardType, type Civilization, type ForbiddenSide, type PsychicSide, type SupportLevel, type TwinSide } from './types';
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
  // D2フィールドなどのフィールド（禁断フィールドは禁断の鼓動として別に扱う）
  if (label.includes('フィールド') && !isForbiddenLabel(label)) return 'field';
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
  // 禁断の鼓動：2面目は禁断解放した後の禁断クリーチャー
  const forbiddenFace = isForbiddenLabel(typeLabel) && d.faces[1] ? d.faces[1] : undefined;
  const forbidden: ForbiddenSide | undefined = forbiddenFace
    ? {
        seals: forbiddenSealCount(faceText(main)) ?? 0,
        creature: {
          name: forbiddenFace.name,
          cost: parseNumber(forbiddenFace.cost) ?? 0,
          civilizations: parseCivs(forbiddenFace.civilization || main.civilization),
          races: forbiddenFace.race ? forbiddenFace.race.split(/[/／]/).map((r) => r.trim()).filter(Boolean) : [],
          power: parseNumber(forbiddenFace.power) ?? 0,
          text: faceText(forbiddenFace),
          typeLabel: forbiddenFace.type || '禁断クリーチャー',
        },
      }
    : undefined;
  // サイキック・クリーチャー：2面目は覚醒・覚醒リンクした後のクリーチャー
  const psychicFace = !hyperFace && !forbiddenFace && /サイキック/.test(typeLabel) && d.faces[1] && /クリーチャー/.test(d.faces[1].type) ? d.faces[1] : undefined;
  const psychic: PsychicSide | undefined = psychicFace
    ? {
        back: {
          name: psychicFace.name,
          cost: parseNumber(psychicFace.cost) ?? 0,
          civilizations: parseCivs(psychicFace.civilization || main.civilization),
          races: psychicFace.race ? psychicFace.race.split(/[/／]/).map((r) => r.trim()).filter(Boolean) : [],
          power: parseNumber(psychicFace.power) ?? 0,
          text: faceText(psychicFace),
          typeLabel: psychicFace.type || 'サイキック・スーパー・クリーチャー',
        },
      }
    : undefined;
  const spellFace = hyperFace || forbiddenFace || psychicFace ? undefined : d.faces[1];
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
    ...(forbidden ? { forbidden } : {}),
    ...(psychic ? { psychic } : {}),
    support: 'manual',
  });
}

function isForbiddenLabel(label: string | undefined): boolean {
  return !!label && /禁断の鼓動|禁断フィールド/.test(label);
}

/** 「この鼓動は、ゲーム開始時、封印を6つ付けてバトルゾーンに置く」の封印の数 */
function forbiddenSealCount(text: string): number | undefined {
  const m = text.normalize('NFKC').match(/ゲーム開始時、?封印を(\d+)つ付けてバトルゾーンに置く/);
  return m ? Number(m[1]) : undefined;
}

/** 禁断の鼓動の面で、エンジンが処理する決まった文（開始時の封印・離れない・禁断解放） */
const FORBIDDEN_RULE_LINES = [/^この(?:鼓動|フィールド)は、?ゲーム開始時、?封印を\d+つ付けてバトルゾーンに置く。?$/, /^この(?:鼓動|フィールド)はバトルゾーンを離れない。?$/, /^禁断解放/];

export function faceKind(card: CardDefinition): 'creature' | 'spell' | 'other' {
  if (isCreatureType(card.type) && card.power !== undefined) return 'creature';
  // フィールドの能力（常在・置換・ターンのはじめ）はクリーチャーと同じ書き方
  if (card.type === 'field') return 'creature';
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
  // 以前の版で、禁断の鼓動の裏側（禁断クリーチャー）をツインパクトの呪文側として保存したカードを直す
  // （パワー・種族は残っていないので、公式から保存し直すと正しくなる）
  if (card.twin && !card.forbidden && isForbiddenLabel(card.typeLabel)) {
    const t = card.twin;
    card = {
      ...card,
      twin: undefined,
      forbidden: { seals: forbiddenSealCount(card.text) ?? 0, creature: { name: t.name, cost: t.cost, civilizations: t.civilizations, races: [], power: undefined, text: t.text, typeLabel: '禁断クリーチャー' } },
    };
  }
  // 以前の版でフィールドを呪文として保存したカードを直す
  if (card.type === 'spell' && card.typeLabel?.includes('フィールド') && !isForbiddenLabel(card.typeLabel)) card = { ...card, type: 'field' };
  // 禁断の鼓動：決まった文はエンジンが処理し、裏側（禁断クリーチャー）の能力も読む
  const isForbidden = !!card.forbidden;
  const mainText = isForbidden
    ? card.text
        .split('\n')
        .filter((l) => !FORBIDDEN_RULE_LINES.some((re) => re.test(l.normalize('NFKC').trim())))
        .join('\n')
    : card.text;
  const main = parseAbilityText(mainText, faceKind(card));
  const fParsed = card.forbidden ? parseAbilityText(card.forbidden.creature.text, 'creature') : undefined;
  const forbidden: ForbiddenSide | undefined = card.forbidden
    ? {
        seals: card.forbidden.seals || (forbiddenSealCount(card.text) ?? 0),
        creature: {
          ...card.forbidden.creature,
          keywords: Object.keys(fParsed!.keywords).length ? fParsed!.keywords : undefined,
          abilities: fParsed!.abilities.length ? fParsed!.abilities : undefined,
          statics: fParsed!.statics.length ? fParsed!.statics : undefined,
          replacements: fParsed!.replacements.length ? fParsed!.replacements : undefined,
        },
      }
    : undefined;
  const hyperParsed = card.hyperText !== undefined ? parseAbilityText(card.hyperText, 'creature') : undefined;
  // 以前の版で、サイキック・クリーチャーの裏面をツインパクトの呪文側として保存したカードを直す（パワーは公式から保存し直すと入る）
  if (card.twin && !card.psychic && /サイキック/.test(card.typeLabel ?? '')) {
    const t = card.twin;
    card = { ...card, twin: undefined, psychic: { back: { name: t.name, cost: t.cost, civilizations: t.civilizations, races: [], power: undefined, text: t.text, typeLabel: 'サイキック・スーパー・クリーチャー' } } };
  }
  const pParsed = card.psychic ? parseAbilityText(card.psychic.back.text, 'creature') : undefined;
  const psychic: PsychicSide | undefined = card.psychic
    ? {
        back: {
          ...card.psychic.back,
          keywords: Object.keys(pParsed!.keywords).length ? pParsed!.keywords : undefined,
          abilities: pParsed!.abilities.length ? pParsed!.abilities : undefined,
          statics: pParsed!.statics.length ? pParsed!.statics : undefined,
          replacements: pParsed!.replacements.length ? pParsed!.replacements : undefined,
        },
        ...(main.awakenLink ? { link: main.awakenLink } : {}),
      }
    : undefined;
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
  const manual = main.manualLines.length + (twinParsed?.manualLines.length ?? 0) + (hyperParsed?.manualLines.length ?? 0) + (fParsed?.manualLines.length ?? 0) + (pParsed?.manualLines.length ?? 0);
  const auto =
    (isForbidden ? 1 : 0) +
    (fParsed ? Object.keys(fParsed.keywords).length + fParsed.parsedLines.length : 0) +
    Object.keys(main.keywords).length +
    main.parsedLines.length +
    (twinParsed ? Object.keys(twinParsed.keywords).length + twinParsed.parsedLines.length : 0) +
    (hyperParsed ? Object.keys(hyperParsed.keywords).length + hyperParsed.parsedLines.length : 0) +
    (pParsed ? Object.keys(pParsed.keywords).length + pParsed.parsedLines.length : 0);
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
    gZero: main.gZero,
    hyperForm: hyperParsed
      ? {
          keywords: Object.keys(hyperParsed.keywords).length ? hyperParsed.keywords : undefined,
          abilities: hyperParsed.abilities.length ? hyperParsed.abilities : undefined,
          statics: hyperParsed.statics.length ? hyperParsed.statics : undefined,
          replacements: hyperParsed.replacements.length ? hyperParsed.replacements : undefined,
        }
      : undefined,
    twin,
    forbidden,
    psychic,
    summonFrom: main.summonFrom,
    soul: main.soul && hasAny(main.soul) ? compact(main.soul) : undefined,
    support,
  };
}

type AbilitySet = NonNullable<ParsedAbilities['soul']>;
function hasAny(a: AbilitySet): boolean {
  return Object.keys(a.keywords).length > 0 || a.abilities.length > 0 || a.statics.length > 0 || a.replacements.length > 0;
}
/** 空の項目を省いた能力のまとまり */
function compact(a: AbilitySet): NonNullable<CardDefinition['soul']> {
  return {
    keywords: Object.keys(a.keywords).length ? a.keywords : undefined,
    abilities: a.abilities.length ? a.abilities : undefined,
    statics: a.statics.length ? a.statics : undefined,
    replacements: a.replacements.length ? a.replacements : undefined,
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
