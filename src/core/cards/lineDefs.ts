// 能力の文ごとの効果定義。
// 能力テキストの読み取り（textParser）が読めない文に、エンジンの部品（EffectDef など）で書いた定義を持たせる。
// キーはカードに書かれた能力の文（1つの能力。選択肢は「▶」でつなぐ）。全角・半角、空白、カッコの補足説明の違いは無視して照合する。
// 同じ文を持つカードすべてに効く。読み取りより優先するので、読み取りが間違う文の直しにも使える。
import { TRIGGER_EVENTS, type AltPlay, type Condition, type Keywords, type ReplacementAbility, type StaticAbility, type TriggeredAbility } from './types';

export interface LineDef {
  keywords?: Keywords;
  /** 誘発能力。呪文の効果は when: 'onCast' */
  abilities?: TriggeredAbility[];
  statics?: StaticAbility[];
  replacements?: ReplacementAbility[];
  altPlays?: AltPlay[];
  /** メモ（どのカードの文か、など。処理には使わない） */
  note?: string;
}

export type LineDefs = Record<string, LineDef>;

const has = (who: 'self' | 'opponent', zone: 'hand' | 'mana' | 'shield'): Condition => ({ type: 'compare', left: { who: 'opponent', zone }, op: '>', right: { who, zone } });
/** 自分のクリーチャーまたはタマシードの中に、その文明がある */
const ownCiv = (civilization: 'water' | 'darkness'): Condition => ({
  type: 'or',
  conditions: [
    { type: 'compare', left: { who: 'self', zone: 'battle', filter: { civilization } }, op: '>=', right: 1 },
    { type: 'compare', left: { who: 'self', zone: 'battle', filter: { civilization, cardType: 'tamaseed' } }, op: '>=', right: 1 },
  ],
});

/** アプリに入っている定義。新しい定義はここに足す */
export const BUILT_IN_LINE_DEFS: LineDefs = {
  'このクリーチャーが出た時、自分の、リキッド・ピープルまたはハンター1つにつき、相手のクリーチャーを1体選んでもよい。次の自分のターンのはじめまで、それらは攻撃もブロックもできない。': {
    note: 'アクア・スターガール',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          {
            type: 'repeat',
            per: { who: 'self', zone: 'battle', filter: { races: ['リキッド・ピープル', 'ハンター'] } },
            unit: 1,
            effects: [{ type: 'grantKeyword', target: { owner: 'opponent', zone: 'battle', count: 1, upTo: true }, keywords: { cannotAttack: true, cannotBlock: true }, untilNextTurn: true }],
          },
        ],
      },
    ],
  },
  'このクリーチャーをバトルゾーンに出した時、自分の手札を3枚まで裏向きにしてシールドに加え、その後、同じ枚数のシールドを自分の手札に戻す。': {
    note: 'マーシャル・クイーン',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          { type: 'move', target: { owner: 'self', zone: 'hand', count: 3, upTo: true }, to: 'shield' },
          { type: 'repeat', per: 'chosen', unit: 1, effects: [{ type: 'move', target: { owner: 'self', zone: 'shield', count: 1 }, to: 'hand' }] },
        ],
      },
    ],
  },
  'このクリーチャーが出た時、相手の手札が自分のより多ければ、カードを1枚引く。相手のマナゾーンのカードが自分のより多ければ、自分の山札の上から1枚目をタップしてマナゾーンに置く。相手のシールドが自分のより多ければ、自分の山札の上から1枚目をシールド化する。': {
    note: '富力！ルベル&フォース',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          { type: 'conditional', condition: has('self', 'hand'), then: [{ type: 'draw', count: 1 }] },
          { type: 'conditional', condition: has('self', 'mana'), then: [{ type: 'deckTopTo', count: 1, to: 'mana', tapped: true }] },
          { type: 'conditional', condition: has('self', 'shield'), then: [{ type: 'deckTopTo', count: 1, to: 'shield' }] },
        ],
      },
    ],
  },
  '次の中から1回選ぶ。自分のクリーチャーまたはタマシードの中に水と闇があれば、両方選んでもよい。▶カードを3枚引き、自分の手札を1枚捨てる。▶コスト8以下のクリーチャーを1体、自分の墓地から出す。': {
    note: 'ブレイン・スラッシュ',
    abilities: [
      {
        when: 'onCast',
        effects: [
          {
            type: 'chooseOne',
            bothIf: { type: 'and', conditions: [ownCiv('water'), ownCiv('darkness')] },
            options: [
              { label: 'カードを3枚引き、自分の手札を1枚捨てる', effects: [{ type: 'draw', count: 3 }, { type: 'move', target: { owner: 'self', zone: 'hand', count: 1 }, to: 'graveyard' }] },
              { label: 'コスト8以下のクリーチャーを1体、自分の墓地から出す', effects: [{ type: 'move', target: { owner: 'self', zone: 'graveyard', count: 1, filter: { maxCost: 8, cardType: 'creature' } }, to: 'battle' }] },
            ],
          },
        ],
      },
    ],
  },
};

/** 利用者が設定画面から取り込んだ定義（アプリに入っている定義より優先する） */
let userDefs: LineDefs = {};
/** 定義が変わるたびに増える番号（読み取り側が照合用の表を作り直す合図） */
let revision = 0;

export function setUserLineDefs(defs: LineDefs | undefined): void {
  userDefs = defs ?? {};
  revision++;
}

export function allLineDefs(): { defs: LineDefs; revision: number } {
  return { defs: { ...BUILT_IN_LINE_DEFS, ...userDefs }, revision };
}

/** 取り込む JSON の形を確かめる。使える定義と、直す必要のある点を返す */
export function validateLineDefs(value: unknown): { defs: LineDefs; errors: string[] } {
  const errors: string[] = [];
  const defs: LineDefs = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { defs, errors: ['全体を { "能力の文": { … } } の形にしてください'] };
  const whens = new Set<string>(TRIGGER_EVENTS);
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const short = key.length > 20 ? `${key.slice(0, 20)}…` : key;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push(`「${short}」：値を { … } の形にしてください`);
      continue;
    }
    const d = raw as Record<string, unknown>;
    let ok = true;
    for (const f of ['abilities', 'statics', 'replacements', 'altPlays']) {
      if (d[f] !== undefined && !Array.isArray(d[f])) {
        errors.push(`「${short}」：${f} は配列にしてください`);
        ok = false;
      }
    }
    for (const ab of (Array.isArray(d.abilities) ? d.abilities : []) as Record<string, unknown>[]) {
      if (!ab || typeof ab.when !== 'string' || !whens.has(ab.when)) {
        errors.push(`「${short}」：abilities の when が正しくありません（${String(ab?.when)}）`);
        ok = false;
      } else if (!Array.isArray(ab.effects) || ab.effects.some((e) => !e || typeof (e as { type?: unknown }).type !== 'string')) {
        errors.push(`「${short}」：abilities の effects は、type を持つ効果の配列にしてください`);
        ok = false;
      }
    }
    if (ok) defs[key] = d as LineDef;
  }
  return { defs, errors };
}
