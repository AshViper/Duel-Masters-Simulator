// 能力の文ごとの効果定義。
// 能力テキストの読み取り（textParser）が読めない文に、エンジンの部品（EffectDef など）で書いた定義を持たせる。
// キーはカードに書かれた能力の文（1つの能力。選択肢は「▶」でつなぐ）。全角・半角、空白、カッコの補足説明の違いは無視して照合する。
// 同じ文を持つカードすべてに効く。読み取りより優先するので、読み取りが間違う文の直しにも使える。
import { TRIGGER_EVENTS, type HandTrigger, type AltPlay, type Condition, type Keywords, type ReplacementAbility, type StaticAbility, type TriggeredAbility } from './types';

export interface LineDef {
  keywords?: Keywords;
  /** 誘発能力。呪文の効果は when: 'onCast' */
  abilities?: TriggeredAbility[];
  statics?: StaticAbility[];
  replacements?: ReplacementAbility[];
  altPlays?: AltPlay[];
  /** 手札にある間の誘発（相手のターンの終わりに、条件を満たしていればコストを支払わずに使う） */
  handTriggers?: HandTrigger[];
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

/** 自分のシールドが1つもない */
const noShield: Condition = { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 };

/** 直前に墓地に置いた（選んだ）カードの中から選ぶ対象 */
const fromChosen = (filter?: { maxCost: number }) => ({ owner: 'self' as const, zone: 'graveyard' as const, count: 1, upTo: true, ref: 'chosen' as const, refPick: true, ...(filter ? { filter } : {}) });

/** アプリに入っている定義。新しい定義はここに足す */
export const BUILT_IN_LINE_DEFS: LineDefs = {
  '各ターン、このクリーチャーの最初の攻撃の終わりに、このクリーチャーをアンタップし、一番上のカードを破壊する。': {
    note: '覇帝なき侵略 レッドゾーンF',
    abilities: [{ when: 'onAttackEnd', oncePerTurn: true, effects: [{ type: 'selfAction', action: 'untap' }, { type: 'destroyTopCard' }] }],
  },
  'このクリーチャーが出た時、自分の山札の上から4枚を墓地に置く。それがすべて異なる名前なら、その中からコスト7以下のカードを1枚、コストを支払わずに実行してもよい。こうして実行しなければ、その中からカードを1枚、自分の手札に戻してもよい。': {
    note: 'ボルメテウス・ホワイト・ドラゴン・ネクサス',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          { type: 'deckTopTo', count: 4, to: 'graveyard' },
          {
            type: 'conditional',
            condition: { type: 'chosenDistinctNames' },
            then: [
              { type: 'playFree', target: fromChosen({ maxCost: 7 }) },
              { type: 'conditional', condition: { type: 'didNot' }, then: [{ type: 'move', target: fromChosen(), to: 'hand' }] },
            ],
          },
        ],
      },
    ],
  },
  '相手のクリーチャーを2体選ぶ。相手はその中から1体選んで手札に戻し、もう1体を破壊する。その後、カードを2枚、相手のマナゾーンから選ぶ。相手はその中から1枚選んで手札に戻し、もう1枚を墓地に置く。': {
    note: '英知と追撃の宝剣',
    abilities: [
      {
        when: 'onCast',
        effects: [
          { type: 'splitFate', target: { owner: 'opponent', zone: 'battle', count: 2 } },
          { type: 'splitFate', target: { owner: 'opponent', zone: 'mana', count: 2 } },
        ],
      },
    ],
  },
  'このクリーチャーが攻撃する時、コスト7以下の、呪文またはミリオン・フレイムを1つ、自分の手札または墓地からコストを支払わずに実行してもよい。こうして呪文を唱えたなら、それを唱えた後、墓地のかわりに山札の下に置く。': {
    note: 'ネオ・ボルメテウス・ホワイト・ドラゴン',
    abilities: [
      {
        when: 'onAttack',
        effects: [{ type: 'playFromHandFree', filter: { maxCost: 7, anyOf: [{ cardType: 'spell' }, { typeLabelIncludes: 'ミリオン・フレイム' }] }, zones: ['hand', 'graveyard'], spellAfter: 'deckBottom' }],
      },
    ],
  },
  '相手のターンの終わりに、その相手のクリーチャーが自分より4体以上多く、自分の《ブルー・インパルス》がなければ、このクリーチャーをコストを支払わずに召喚してもよい。': {
    note: 'ブルー・インパルス',
    handTriggers: [
      {
        when: 'opponentTurnEnd',
        condition: {
          type: 'and',
          conditions: [
            { type: 'compare', left: { who: 'opponent', zone: 'battle' }, op: '>=', right: { who: 'self', zone: 'battle' }, rightPlus: 4 },
            { type: 'not', condition: { type: 'compare', left: { who: 'self', zone: 'battle', filter: { nameIncludes: 'ブルー・インパルス' } }, op: '>=', right: 1 } },
          ],
        },
      },
    ],
  },
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
  '次の中から2回選ぶ。（同じものを選んでもよい）▶相手は自身の手札を1枚選んで捨てる。▶コスト4以下の闇のクリーチャー1体またはコスト4以下の闇のオーラを1枚、自分の墓地からバトルゾーンに出す。▶相手のクリーチャーを1体選ぶ。このターン、そのクリーチャーのパワーを-4000する。': {
    note: '絶望と反魂と滅殺の決断（オーラは付ける自分のクリーチャーを選んで出す）',
    abilities: [
      {
        when: 'onCast',
        effects: [
          {
            type: 'chooseOne',
            times: 2,
            options: [
              { label: '相手は自身の手札を1枚選んで捨てる', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'hand', count: 1, chooser: 'owner' }, to: 'graveyard' }] },
              {
                label: 'コスト4以下の闇のクリーチャー1体またはコスト4以下の闇のオーラを1枚、自分の墓地からバトルゾーンに出す',
                effects: [
                  {
                    type: 'move',
                    target: { owner: 'self', zone: 'graveyard', count: 1, filter: { maxCost: 4, civilization: 'darkness', anyOf: [{ cardType: 'creature' }, { typeLabelIncludes: 'オーラ' }] } },
                    to: 'battle',
                  },
                ],
              },
              { label: '相手のクリーチャーを1体選ぶ。このターン、そのクリーチャーのパワーを-4000する', effects: [{ type: 'powerMod', target: { owner: 'opponent', zone: 'battle', count: 1 }, amount: -4000 }] },
            ],
          },
        ],
      },
    ],
  },
  'このクリーチャーがバトルゾーンに出たとき、自分の山札を上から5枚、表向きにしてもよい。その中の光と闇のカードをすべて自分の手札に加え、それ以外のカードを自分の墓地に置く。': {
    note: 'アクアン（「光と闇のカード」は光のカードと闇のカード。多色はどちらかがあれば手札へ）',
    abilities: [
      {
        when: 'onSummon',
        optional: true,
        effects: [{ type: 'lookAtTop', count: 5, pickCount: 5, pickFilter: { civilizations: ['light', 'darkness'] }, pickTo: 'hand', restTo: 'graveyard', pickAll: true }],
      },
    ],
  },
  '自分の手札から呪文を唱えた時、その呪文を自分の墓地からもう1度、コストを支払わずに唱えてもよい。この能力は各ターン1度しか使えない。': {
    note: '龍素記号ｗD サイクルペディア（呪文を唱え終えて墓地に置かれた後に解決する。墓地になければ唱えられない）',
    abilities: [
      {
        when: 'onSpellCast',
        who: 'self',
        castFrom: 'hand',
        optional: true,
        oncePerTurn: true,
        oncePerTurnOnUse: true,
        effects: [{ type: 'playFree', target: { owner: 'self', zone: 'graveyard', count: 1, ref: 'event' } }],
      },
    ],
  },
  'このクリーチャーが出た時、相手のクリーチャーを1体選ぶ。その選んだクリーチャーを相手の手札に戻してもよい。その後、その選んだクリーチャーのコスト以下のクリーチャーを1体、自分の墓地から出す。': {
    note: '終末縫合王 ザ=キラー・キーナリー（手札に戻さなくても、選んだクリーチャーのコスト以下を出す）',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          { type: 'choose', target: { owner: 'opponent', zone: 'battle', count: 1 } },
          { type: 'optional', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1, ref: 'chosen' }, to: 'hand' }] },
          { type: 'move', target: { owner: 'self', zone: 'graveyard', count: 1, filter: { cardType: 'creature', refCost: 'le' } }, to: 'battle' },
        ],
      },
    ],
  },
  '革命0：自分のシールドが1つもなければ、バトル中、このクリーチャーのパワーを+10000し、このクリーチャーがバトルに勝った時、アンタップする。': {
    note: '王道の革命 ドギラゴン',
    statics: [{ type: 'powerMod', amount: 10000, appliesTo: { owner: 'self', onlySelf: true }, battleOnly: true, condition: noShield }],
    abilities: [{ when: 'onBattleWin', condition: noShield, effects: [{ type: 'selfAction', action: 'untap' }] }],
  },
  'このクリーチャーを別のクリーチャーの上に重ねた時、相手のクリーチャーを1体選び、持ち主の墓地かマナゾーンに置く、または手札に戻す。': {
    note: 'SSS級天災 デッドダムド（選んでから、置く場所を選ぶ）',
    abilities: [
      {
        when: 'onStacked',
        effects: [
          { type: 'choose', target: { owner: 'opponent', zone: 'battle', count: 1 } },
          {
            type: 'ifChosen',
            then: [
          {
            type: 'chooseOne',
            options: [
              { label: '持ち主の墓地に置く', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1, ref: 'chosen' }, to: 'graveyard' }] },
              { label: '持ち主のマナゾーンに置く', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1, ref: 'chosen' }, to: 'mana' }] },
              { label: '持ち主の手札に戻す', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1, ref: 'chosen' }, to: 'hand' }] },
            ],
          },
            ],
          },
        ],
      },
    ],
  },
  '自分がゲームに負ける時または相手がゲームに勝つ時、これが相手のターンで、自分のマナゾーンに闇のカードと火のカードがそれぞれ1枚以上あれば、かわりに自分の手札にあるこのカードを相手に見せ、山札の下に置いてもよい。': {
    note: '一王二命三眼槍（負けないほうが必ず得なので、条件を満たせば確認せずに使う）',
    replacements: [
      {
        event: 'loseFromHand',
        subject: 'self',
        instead: 'toDeckBottom',
        optional: true,
        condition: {
          type: 'and',
          conditions: [
            { type: 'opponentTurn' },
            { type: 'compare', left: { who: 'self', zone: 'mana', filter: { civilization: 'darkness' } }, op: '>=', right: 1 },
            { type: 'compare', left: { who: 'self', zone: 'mana', filter: { civilization: 'fire' } }, op: '>=', right: 1 },
          ],
        },
      },
    ],
  },
  '自分の墓地から呪文を唱えた時、唱えた後で、墓地のかわりに山札の下に置く。': {
    note: '龍素記号ｗD サイクルペディア',
    statics: [{ type: 'graveCastToDeckBottom' }],
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
    for (const f of ['abilities', 'statics', 'replacements', 'altPlays', 'handTriggers']) {
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
