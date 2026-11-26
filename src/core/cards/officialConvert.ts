// 公式カード検索の詳細（OfficialCardDetail）を、デッキ構築・対戦で使うカード定義に変換する。
// 能力テキストのうち、確実に読み取れるキーワード能力だけを自動処理にし、
// それ以外の能力は「手動処理」として残す（誤って自動処理しないため）。
import type { OfficialCardDetail, OfficialCardFace } from '../../server/dmOfficial';
import type { CardDefinition, CardType, Civilization, Keywords, SupportLevel, TwinSide } from './types';

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

/** 能力1行がキーワード能力なら Keywords に反映して true を返す */
function applyKeywordLine(line: string, kw: Keywords): boolean {
  const t = line.normalize('NFKC').replace(/\s+/g, '').replace(/[（(].*[）)]$/, '');
  if (t === 'ブロッカー') return (kw.blocker = true);
  if (t === 'S・トリガー' || t === 'S·トリガー') return (kw.shieldTrigger = true);
  if (t === 'スピードアタッカー') return (kw.speedAttacker = true);
  if (t === 'スレイヤー') return (kw.slayer = true);
  if (t === 'W・ブレイカー') return !!(kw.breaker = 2);
  if (t === 'T・ブレイカー') return !!(kw.breaker = 3);
  if (t === 'Q・ブレイカー') return !!(kw.breaker = 4);
  const pa = t.match(/^パワーアタッカー\+(\d+)$/);
  if (pa) return !!(kw.powerAttacker = Number(pa[1]));
  if (t === 'このクリーチャーは相手プレイヤーを攻撃できない。') return (kw.cannotAttackPlayers = true);
  if (t === 'このクリーチャーは攻撃できない。') return (kw.cannotAttack = true);
  if (t === 'このクリーチャーはブロックされない。') return (kw.unblockable = true);
  if (t === 'このクリーチャーはアンタップしているクリーチャーを攻撃できる。') return (kw.attackUntapped = true);
  return false;
}

function analyzeAbilities(lines: string[]): { keywords: Keywords; rest: string[] } {
  const keywords: Keywords = {};
  const rest = lines.filter((l) => !applyKeywordLine(l, keywords));
  return { keywords, rest };
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
  const { keywords, rest } = analyzeAbilities(main.abilities);
  const set = main.packName.match(/\(?\s*([A-Za-z0-9-]+)/)?.[1];

  let twin: TwinSide | undefined;
  let twinRest: string[] = [];
  const spellFace = d.faces[1];
  if (spellFace) {
    const tk = analyzeAbilities(spellFace.abilities);
    twinRest = tk.rest;
    twin = {
      name: spellFace.name,
      cost: parseNumber(spellFace.cost) ?? 0,
      civilizations: parseCivs(spellFace.civilization || main.civilization),
      text: faceText(spellFace),
      keywords: tk.keywords.shieldTrigger ? { shieldTrigger: true } : undefined,
    };
  }

  const manualLines = [...rest, ...twinRest];
  const hasKeywords = Object.keys(keywords).length > 0;
  const support: SupportLevel = manualLines.length === 0 ? 'full' : hasKeywords ? 'partial' : 'manual';

  return {
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
    keywords: hasKeywords ? keywords : undefined,
    twin,
    support,
  };
}
