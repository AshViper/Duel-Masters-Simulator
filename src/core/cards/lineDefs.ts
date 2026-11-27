// 能力の文ごとの効果定義。
// 能力テキストの読み取り（textParser）が読めない文に、エンジンの部品（EffectDef など）で書いた定義を持たせる。
// キーはカードに書かれた能力の文（1つの能力。選択肢は「▶」でつなぐ）。全角・半角、空白、カッコの補足説明の違いは無視して照合する。
// 同じ文を持つカードすべてに効く。読み取りより優先するので、読み取りが間違う文の直しにも使える。
import { TRIGGER_EVENTS, type HandTrigger, type AltPlay, type CardFilter, type Condition, type EffectDef, type Keywords, type ReplacementAbility, type StaticAbility, type TriggeredAbility } from './types';

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

/** シビルカウント：自分のその文明のクリーチャーまたはタマシードが合計 n 以上 */
const civilCount = (civilization: 'light' | 'water' | 'darkness' | 'nature', n: number): Condition => ({
  type: 'compare',
  left: { who: 'self', zone: 'battle', withPermanents: true, filter: { civilization, anyOf: [{ cardType: 'creature' }, { cardType: 'tamaseed' }] } },
  op: '>=',
  right: n,
});

/** 自分のシールドが1つもない */
const noShield: Condition = { type: 'compare', left: { who: 'self', zone: 'shield' }, op: '<=', right: 0 };

/** 直前に墓地に置いた（選んだ）カードの中から選ぶ対象 */
const fromChosen = (filter?: { maxCost: number }) => ({ owner: 'self' as const, zone: 'graveyard' as const, count: 1, upTo: true, ref: 'chosen' as const, refPick: true, ...(filter ? { filter } : {}) });

/** 《邪幽 ジャガイスト》：コスト以下のアビス・クリーチャーを墓地から出し、そのターン相手プレイヤーを攻撃でき、攻撃したらターンの終わりに山札の下へ */
const jagaistRevive = (cost: CardFilter): EffectDef => ({
  type: 'move',
  target: { owner: 'self', zone: 'graveyard', count: 1, upTo: true, filter: { race: 'アビス', cardType: 'creature', ...cost } },
  to: 'battle',
  grant: { keywords: { attackPlayersOnEnterTurn: true } },
  endOfTurn: 'deckBottomIfAttacked',
});

/** 進化クリーチャーまたはアビス・クリーチャー */
const EVO_OR_ABYSS: CardFilter = { cardType: 'creature', anyOf: [{ evolution: true }, { race: 'アビス' }] };

/** 直前に選んだ相手の墓地のカード */
const chosenInOppGrave = { owner: 'opponent' as const, zone: 'graveyard' as const, count: 'all' as const, ref: 'chosen' as const, anyZone: true };

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
  // ───── SD1 その2 ─────
  'このクリーチャーがバトルゾーンに出た時、プレイヤーを1人選ぶ。そのプレイヤーは自身の手札をすべて、好きな順序で山札の一番下に置き、その後、その枚数と同じ数、カードを引く。その後、そのプレイヤーは自身のシールドゾーンにあるカードをすべて好きな順序で山札の一番下に置き、その枚数と同じ数のカードを、山札の上から裏向きのまま、それぞれ新しいシールドとしてシールドゾーンに置く。': {
    note: 'Vチャロン（シールドの束は1枚ずつ数える）',
    abilities: [{ when: 'onSummon', effects: [{ type: 'refreshHandShields', who: 'choose' }] }],
  },
  '相手のターン中にこのクリーチャーが自分の手札から捨てられる時、墓地に置くかわりにバトルゾーンに出してもよい。そうした場合、バトルゾーンにあるクリーチャーを1体選び、持ち主の手札に戻してもよい。': {
    note: '斬隠蒼頭龍バイケン（自分のカードで捨てても、相手のターンなら出せる）',
    keywords: { discardToBattle: 'may', discardToBattleThen: [{ type: 'optional', effects: [{ type: 'move', target: { owner: 'any', zone: 'battle', count: 1 }, to: 'hand' }] }] },
  },
  '自分のシノビの「ニンジャ・ストライク」能力を使った時、カードを1枚引いてもよい。': {
    note: '斬隠蒼頭龍バイケン（使うと決めた時に誘発する。このカード自身のニンジャ・ストライクでは、まだ手札にあるので誘発しない）',
    abilities: [{ when: 'onNinjaStrike', who: 'self', filter: { race: 'シノビ' }, optional: true, effects: [{ type: 'draw', count: 1 }] }],
  },
  'このクリーチャーが出た時、自分の山札の上から4枚を見て、その中から《竜皇神 ボルシャック・バクテラス》ではないアーマードを好きな数出す。残りを好きな順序で山札の下に置く。': {
    note: '竜皇神 ボルシャック・バクテラス',
    abilities: [
      {
        when: 'onSummon',
        effects: [{ type: 'lookAtTop', count: 4, pickCount: 4, pickFilter: { race: 'アーマード', not: { nameIncludes: '竜皇神 ボルシャック・バクテラス' } }, pickTo: 'battle', restTo: 'deckBottom' }],
      },
    ],
  },
  '各ターン、はじめて自分のクリーチャーがバトルする時、そのクリーチャーはそのバトルに勝つ。': {
    note: '輝く革命 ボルシャック・フレア（このクリーチャーが出る前のバトルも数える。両方が勝つなら相打ち）',
    statics: [{ type: 'winFirstBattle' }],
  },
  '各ターン、はじめて相手のクリーチャーが出る時、そのクリーチャーはタップして出る。': {
    note: '輝く革命 ボルシャック・フレア（このクリーチャーが出る前に出た相手のクリーチャーも数える）',
    statics: [{ type: 'opponentEntersTapped', firstPerTurn: true }],
  },
  'このクリーチャーの召喚コストを1少なくしてもよい。そうしたら、このターンの終わりに、このクリーチャーを破壊する。': {
    note: '頂上印鑑 パラキン8th（別の使い方として選ぶ）',
    altPlays: [{ name: '召喚コストを1少なくする（ターンの終わりに破壊）', reduce: 1, endOfTurn: 'destroy' }],
  },
  '次の中から2回選ぶ。（同じものを選んでもよい）▶コスト3以下のクリーチャーを1体、自分の手札からバトルゾーンに出す。▶このターン、自分のクリーチャー1体に「スピードアタッカー」を与える。▶自分のクリーチャーを1体選ぶ。このターン、そのクリーチャーの最初の攻撃の終わりに、そのクリーチャーをアンタップする。': {
    note: '瞬閃と疾駆と双撃の決断（このターンにすでに攻撃したクリーチャーには効かない）',
    abilities: [
      {
        when: 'onCast',
        effects: [
          {
            type: 'chooseOne',
            times: 2,
            options: [
              { label: 'コスト3以下のクリーチャーを1体、自分の手札からバトルゾーンに出す', effects: [{ type: 'move', target: { owner: 'self', zone: 'hand', count: 1, filter: { maxCost: 3, cardType: 'creature' } }, to: 'battle' }] },
              { label: 'このターン、自分のクリーチャー1体に「スピードアタッカー」を与える', effects: [{ type: 'grantKeyword', target: { owner: 'self', zone: 'battle', count: 1 }, keywords: { speedAttacker: true } }] },
              {
                label: '自分のクリーチャーを1体選ぶ。このターン、そのクリーチャーの最初の攻撃の終わりに、そのクリーチャーをアンタップする',
                effects: [{ type: 'grantKeyword', target: { owner: 'self', zone: 'battle', count: 1 }, keywords: { untapAtFirstAttackEnd: true } }],
              },
            ],
          },
        ],
      },
    ],
  },
  'このクリーチャーがバトルゾーンに出た時または攻撃する時、自分の山札の上から3枚を見せる。それがすべてコストが同じクリーチャーであれば、バトルゾーンに出す。それ以外なら、好きな順序で山札の一番下に置く。': {
    note: 'ガチャンコ ガチロボ（山札が3枚より少なければ、あるだけ見せる）',
    abilities: (['onSummon', 'onAttack'] as const).map((when) => ({
      when,
      effects: [{ type: 'revealTopAll' as const, count: 3, filter: { cardType: 'creature' as const }, sameCost: true, to: 'battle' as const, restTo: 'deckBottom' as const }],
    })),
  },
  '相手の呪文の効果または相手のクリーチャーの能力によって、このクリーチャーが自分の手札から捨てられる時、墓地に置くかわりに自分のバトルゾーンに置いてもよい。': {
    note: '永遠のリュウセイ・カイザー',
    keywords: { discardToBattle: 'may', discardToBattleCause: 'opponentEffect' },
  },
  '相手の、「このクリーチャーがバトルゾーンに出た時」で始まる能力を持つクリーチャーがバトルゾーンに出た時、そのクリーチャーを持ち主のマナゾーンに置く。': {
    note: '黒豆だんしゃく',
    abilities: [{ when: 'onOtherSummon', who: 'opponent', filter: { hasOnSummonAbility: true }, effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1, ref: 'event' }, to: 'mana' }] }],
  },
  'このクリーチャーが出た時、次のうちいずれか1つを選ぶ。▶他のクリーチャーを1体選び、持ち主の手札に戻す。▶自分の山札の上から2枚を墓地に置き、その後、そのうちのどちらか1枚を手札に戻してもよい。': {
    note: '闇参謀グラン・ギニョール',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          {
            type: 'chooseOne',
            options: [
              { label: '他のクリーチャーを1体選び、持ち主の手札に戻す', effects: [{ type: 'move', target: { owner: 'any', zone: 'battle', count: 1, filter: { excludeSelf: true } }, to: 'hand' }] },
              {
                label: '自分の山札の上から2枚を墓地に置き、その後、そのうちのどちらか1枚を手札に戻してもよい',
                effects: [{ type: 'deckTopTo', count: 2, to: 'graveyard' }, { type: 'move', target: fromChosen(), to: 'hand' }],
              },
            ],
          },
        ],
      },
    ],
  },
  'このクリーチャーがバトルゾーンに出た時、相手は自身の手札から7枚選び、捨てる。': {
    note: 'ニコル・ボーラス（手札が7枚より少なければ、すべて捨てる）',
    abilities: [{ when: 'onSummon', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'hand', count: 7, chooser: 'owner' }, to: 'graveyard' }] }],
  },
  '自分がカードを引く時、自分の山札が0枚なら、かわりにクリーチャーを1体、墓地から出してもよい。': {
    note: '不死鳥縫合 ブラック・ビッグバン（引けなかった1枚ごとに、出すかを選ぶ）',
    statics: [{ type: 'emptyDrawInstead', effects: [{ type: 'move', target: { owner: 'self', zone: 'graveyard', count: 1, upTo: true, filter: { cardType: 'creature' } }, to: 'battle' }] }],
  },
  'このクリーチャーが出た時、自分の山札の上から4枚を見る。その中からコストの合計が9以下になるよう、多色クリーチャーを好きな数選び、出す。残りを好きな順序で山札の下に置く。': {
    note: '勝災電融王 ギュカウツ・マグル',
    abilities: [
      {
        when: 'onSummon',
        effects: [{ type: 'lookAtTop', count: 4, pickCount: 4, pickFilter: { multicolor: true, cardType: 'creature' }, pickMaxTotalCost: 9, pickTo: 'battle', restTo: 'deckBottom' }],
      },
    ],
  },
  '自分のターン中、自分の山札の上から1枚目をいつでも見てもよい。それがクリーチャーなら、召喚してもよい。': {
    note: '斬龍電融 オロチリュウセイ（山札の一覧で上の1枚が見え、そこから召喚できる）',
    statics: [{ type: 'summonFromZone', zone: 'deck', filter: { cardType: 'creature' }, duringTurn: 'self' }],
  },
  'このクリーチャーの攻撃の終わりに、相手とガチンコ・ジャッジする。自分が勝ったら、自分の山札を見る。その中から、《特攻の忠剣ハチ公》を1体、バトルゾーンに出してもよい。その後、山札をシャッフルする。': {
    note: '特攻の忠剣ハチ公',
    abilities: [
      {
        when: 'onAttackEnd',
        effects: [{ type: 'gachinko', then: [{ type: 'lookAtTop', count: 99, pickCount: 1, pickFilter: { nameIncludes: '特攻の忠剣ハチ公' }, pickTo: 'battle', restTo: 'shuffle' }] }],
      },
    ],
  },
  'このクリーチャーを召喚する時、自分の手札を1枚捨ててもよい。そうしたら、このクリーチャーの召喚コストを2少なくする。': {
    note: 'D2V3 終断のレッドトロン（別の使い方として選ぶ）',
    altPlays: [
      {
        name: '手札を1枚捨てて召喚コストを2少なくする',
        reduce: 2,
        condition: { type: 'compare', left: { who: 'self', zone: 'hand' }, op: '>=', right: 2 },
        payFirst: [{ type: 'move', target: { owner: 'self', zone: 'hand', count: 1, filter: { excludeSelf: true } }, to: 'graveyard' }],
      },
    ],
  },
  'このクリーチャーが出た時、これよりパワーが小さい相手のクリーチャーをすべて破壊する。': {
    note: 'ストーム・ハイパーXX（パワーは能力を解決する時に比べる）',
    abilities: [{ when: 'onSummon', effects: [{ type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 'all', filter: { relativeToSource: { stat: 'power', cmp: 'less' } } } }] }],
  },
  '5.S.D.：このクリーチャーがシールドをブレイクする時、相手はそのシールドのカードを手札に加えるかわりに、自身の山札の上から4枚目の位置に、横向きに刺す。': {
    note: 'Q.Q.QX.（山札が3枚以下なら一番下に刺す）',
    keywords: { shieldBreakTo: 'deckFourthSideways' },
  },
  '相手は、自身の山札の横向きのカードを手札に加えた時、ゲームに負ける。': {
    note: 'Q.Q.QX.（引いた時に限らず、山札から手札に加えた時）',
    statics: [{ type: 'sidewaysToHandLoses', who: 'opponent' }],
  },
  '相手は、自身の山札を見たり、順番を入れ替えたりできない。': {
    note: 'Q.Q.QX.（相手の山札はシャッフルされず、相手が自身の山札を見る効果は何もしない）',
    statics: [{ type: 'deckLocked', who: 'opponent' }],
  },
  'このクリーチャーがバトルゾーンを離れた時、相手は自身の山札をシャッフルする。': {
    note: 'Q.Q.QX.',
    abilities: [{ when: 'onLeave', effects: [{ type: 'shuffleDeck', who: 'opponent' }] }],
  },
  '相手のクリーチャーを1体選ぶ。相手はそれを、自身の山札の上から4枚目の位置に、横向きに刺す。': {
    note: '終葬 5.S.D.（Q.Q.QX. の呪文側）',
    abilities: [{ when: 'onCast', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1 }, to: 'deckTop', deckPos: 4, sideways: true }] }],
  },
  'このクリーチャーがバトルゾーンに出たとき、自分の手札からカードを1枚選び、自分のマナゾーンに置いてよい。': {
    note: 'シビレアシダケ（古い書き方）',
    abilities: [{ when: 'onSummon', effects: [{ type: 'move', target: { owner: 'self', zone: 'hand', count: 1, upTo: true }, to: 'mana' }] }],
  },
  '自分のコマンドはすべて「スピードアタッカー」と「マッハファイター」を持ち、ブロックされない。': {
    note: '轟く革命 レッドギラゾーン',
    statics: [{ type: 'grantKeyword', keywords: { speedAttacker: true, machFighter: true, unblockable: true }, appliesTo: { owner: 'self', filter: { race: 'コマンド' } } }],
  },
  '相手のクリーチャーが出た時、相手とガチンコ・ジャッジをする。自分が勝ったら、カードを1枚引き、このターン、相手のクリーチャーはすべて攻撃できない。': {
    note: '「合体」の頂 アクア・TITAAANS',
    abilities: [
      {
        when: 'onOtherSummon',
        who: 'opponent',
        effects: [
          {
            type: 'gachinko',
            then: [{ type: 'draw', count: 1 }, { type: 'turnStatic', static: { type: 'grantKeyword', keywords: { cannotAttack: true }, appliesTo: { owner: 'opponent' } } }],
          },
        ],
      },
    ],
  },
  '自分がゲームに負ける時、または相手が勝つ時、かわりにこのクリーチャーを破壊する。': {
    note: '不敗のダイハード・リュウセイ（任意ではない。破壊してから「破壊された時」を解決するまでの間も、そのターンは負けない）',
    replacements: [{ event: 'lose', subject: 'self', instead: 'destroySelf' }],
  },
  'このクリーチャーが破壊された時、そのターン、自分はゲームに負けず、相手は勝てない。': {
    note: '不敗のダイハード・リュウセイ',
    abilities: [{ when: 'onDestroyed', effects: [{ type: 'turnStatic', static: { type: 'cannotLose', who: 'self' } }] }],
  },
  // ───── SD1 その4 ─────
  '各ターンに一度、自分がゲームに負ける時、かわりに自分のハンターを1つ破壊してもよい。': {
    note: '「必然」の頂 リュウセイ（負けないほうが必ず得なので確認しない。破壊するハンターはコストの小さいものから自動で選ぶ。このクリーチャー自身も選べる）',
    replacements: [{ event: 'lose', subject: 'anyOwn', instead: 'destroyOwn', filter: { race: 'ハンター' }, oncePerTurn: true, optional: true }],
  },
  'このクリーチャーがタップしていれば、相手は「S・トリガー」を使えない。': {
    note: '超神龍バイラス・カースド（S・トリガーを使う時に調べる）',
    statics: [{ type: 'noShieldTrigger', who: 'opponent', condition: { type: 'selfTapped' } }],
  },
  '各ターンに一度、自分の山札からクリーチャーが出た時、そのクリーチャーのコスト以下のアビス・クリーチャーを1体、自分の墓地から出してもよい。そのターン、そのアビスは相手プレイヤーを攻撃でき、そのターン中に攻撃したら、ターンの終わりに山札の下に置く。': {
    note: '邪幽 ジャガイスト（このクリーチャー自身が山札から出た時も。そのクリーチャー＝このクリーチャーならコスト5以下）',
    abilities: [
      { when: 'onSummon', filter: { enteredFrom: 'deck' }, oncePerTurn: true, onceKey: 'deckEnter', effects: [jagaistRevive({ maxCost: 5 })] },
      { when: 'onOtherSummon', who: 'self', filter: { enteredFrom: 'deck' }, oncePerTurn: true, onceKey: 'deckEnter', effects: [jagaistRevive({ subjectRel: { stat: 'cost', cmp: 'le' } })] },
    ],
  },
  '各ターン、はじめて自分の、進化クリーチャーまたはアビス・クリーチャーをタップした時、それをアンタップする。': {
    note: '至高の魂 アビスベル＝ジャシン帝（このクリーチャーが出る前のタップも数える。2回目以降のタップ・2体目以降は何もしない）',
    abilities: [
      { when: 'onTap', condition: { type: 'firstTapThisTurn', filter: EVO_OR_ABYSS }, effects: [{ type: 'selfAction', action: 'untap' }] },
      {
        when: 'onOtherTap',
        who: 'self',
        filter: EVO_OR_ABYSS,
        condition: { type: 'firstTapThisTurn', filter: EVO_OR_ABYSS },
        effects: [{ type: 'untap', target: { owner: 'self', zone: 'battle', count: 'all', ref: 'event' } }],
      },
    ],
  },
  'シビルカウント3：このクリーチャーが攻撃する時、自分の闇のクリーチャーまたは闇のタマシードが合計3つ以上あれば、相手の墓地にあるカードを1枚選んでもよい。そのカードの、出た時にトリガーする能力を、自分が1つ使ってもよい。その後、相手はそのカードを山札の下に置く。': {
    note: '深淵の壊炉 マーダン=ロウ（能力を使わなくても、選んだカードは山札の下へ）',
    abilities: [
      {
        when: 'onAttack',
        condition: {
          type: 'compare',
          left: { who: 'self', zone: 'battle', withPermanents: true, filter: { civilization: 'darkness', anyOf: [{ cardType: 'creature' }, { cardType: 'tamaseed' }] } },
          op: '>=',
          right: 3,
        },
        effects: [
          { type: 'choose', target: { owner: 'opponent', zone: 'graveyard', count: 1, upTo: true } },
          {
            type: 'ifChosen',
            then: [
              {
                type: 'optional',
                effects: [{ type: 'useAbilityOf', target: chosenInOppGrave, when: 'onSummon', thenDeckBottom: true }],
                otherwise: [{ type: 'move', target: chosenInOppGrave, to: 'deckBottom' }],
              },
            ],
          },
        ],
      },
    ],
  },
  '手札が1枚もないプレイヤー1人につき、このクリーチャーのパワーを+5000する。': {
    note: '謀遠 テレスコ=テレス（自分と相手それぞれ、手札が0枚なら+5000）',
    statics: (['self', 'opponent'] as const).map(
      (who): StaticAbility => ({ type: 'powerMod', amount: 5000, appliesTo: { owner: 'self', onlySelf: true }, condition: { type: 'compare', left: { who, zone: 'hand' }, op: '<=', right: 0 } }),
    ),
  },
  'このクリーチャーが出た時、次のうちいずれか1つを選ぶ。▶自分の山札の上から2枚を、タップしてマナゾーンに置く。その後、カードを1枚、自分のマナゾーンから手札に戻す。▶プレイヤーを1人選ぶ。そのプレイヤーは、自身の墓地をシャッフルし、山札の下に置く。▶相手は、自身のコスト5以下の、クリーチャーではないエレメントをすべてマナゾーンに置く。': {
    note: 'ア:エヌ:マクア',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          {
            type: 'chooseOne',
            options: [
              {
                label: '自分の山札の上から2枚をタップしてマナゾーンに置き、その後マナゾーンから1枚を手札に戻す',
                effects: [{ type: 'deckTopTo', count: 2, to: 'mana', tapped: true }, { type: 'move', target: { owner: 'self', zone: 'mana', count: 1 }, to: 'hand' }],
              },
              { label: 'プレイヤーを1人選び、その墓地をシャッフルして山札の下に置く', effects: [{ type: 'graveToDeckBottom', who: 'choose' }] },
              {
                label: '相手のコスト5以下の、クリーチャーではないエレメントをすべてマナゾーンに置く',
                effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 'all', element: true, filter: { maxCost: 5, not: { cardType: 'creature' } } }, to: 'mana' }],
              },
            ],
          },
        ],
      },
    ],
  },
  'このクリーチャーがバトルゾーンに出た時、「シールドいらねえー！」と言ってもよい。そうしたら、そのターン、自分のクリーチャー3体に「G・ブレイカー」を与える。': {
    note: 'めっちゃ！デンヂャラスG3（「言ってもよい」は使うかどうかの確認）',
    abilities: [{ when: 'onSummon', optional: true, effects: [{ type: 'grantKeyword', target: { owner: 'self', zone: 'battle', count: 3 }, keywords: { breaker: 99, gBreaker: true } }] }],
  },
  '「気に入らねぇやつは消す」と言ってもよい。そうしたら、このターン、相手のクリーチャーの能力すべてを無視する。': {
    note: 'ケッシング・ゼロ（めっちゃ！デンヂャラスG3 の呪文側。元から持つ能力を無視する。他のカードから与えられた効果は残る）',
    abilities: [{ when: 'onCast', effects: [{ type: 'optional', effects: [{ type: 'turnStatic', static: { type: 'ignoreAbilities', who: 'opponent' } }] }] }],
  },
  // ── SD1その5 ──
  '相手のクリーチャーが自分を攻撃する時、自分のシールドが1つもなく、自分のマナゾーンに光と自然のカードがあれば、このクリーチャーを手札から出してもよい。': {
    note: 'MMM-ジョーキング（手札にある間の誘発。光のカードと自然のカードがそれぞれ1枚以上）',
    handTriggers: [
      {
        when: 'attackedPlayer',
        condition: {
          type: 'and',
          conditions: [
            noShield,
            { type: 'compare', left: { who: 'self', zone: 'mana', filter: { civilization: 'light' } }, op: '>=', right: 1 },
            { type: 'compare', left: { who: 'self', zone: 'mana', filter: { civilization: 'nature' } }, op: '>=', right: 1 },
          ],
        },
      },
    ],
  },
  'このタマシードが出た時、各プレイヤーは自身のクリーチャーとタマシードを最大1つずつ選び、残りをすべて山札に加えてシャッフルする。その後、各プレイヤーは、こうして山札に加えたカード1枚につき、自身の山札の上から1枚目をシールド化する。': {
    note: 'ジョーカーズの心絵（ターンプレイヤーから選ぶ。重なっている下のカードも山札に加わった枚数に数える）',
    abilities: [{ when: 'onSummon', effects: [{ type: 'keepOneEachToDeck' }] }],
  },
  'このタマシードが出た時、クリーチャー1体またはタマシードを1枚選ぶ。その持ち主は、それを山札の下に置き、カードを1枚引く。': {
    note: 'コーライルの海幻（自分・相手のどちらのものも選べる。このタマシード自身も選べる）',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          { type: 'move', target: { owner: 'any', zone: 'battle', count: 1, element: true, filter: { anyOf: [{ cardType: 'creature' }, { cardType: 'tamaseed' }] } }, to: 'deckBottom' },
          { type: 'draw', count: 1, who: 'chosenOwner' },
        ],
      },
    ],
  },
  'プレイヤーを1人選ぶ。そのプレイヤーは、自身の墓地のカードをすべてシャッフルし、山札の下に置く。': {
    note: '♪なぜ離れ どこへ行くのか 君は今',
    abilities: [{ when: 'onCast', effects: [{ type: 'graveToDeckBottom', who: 'choose' }] }],
  },
  'このタマシードが出た時、プレイヤーを1人選ぶ。そのプレイヤーは、自身の墓地をシャッフルし、山札の下に置く。': {
    note: '環嵐！ホールインワン・ヘラクレス',
    abilities: [{ when: 'onSummon', effects: [{ type: 'graveToDeckBottom', who: 'choose' }] }],
  },
  'このクリーチャーが出た時、コスト5以下のタマシードを1枚またはコスト5以下の呪文を1枚、自分の手札からコストを支払わずに使ってもよい。': {
    note: 'AQ NETWORK',
    abilities: [{ when: 'onSummon', effects: [{ type: 'playFromHandFree', filter: { maxCost: 5, anyOf: [{ cardType: 'tamaseed' }, { cardType: 'spell' }] } }] }],
  },
  'シビルカウント3：自分の水のクリーチャーまたは水のタマシードが合計3つ以上あれば、このクリーチャーに「ブロッカー」を与え、破壊される時、墓地に置くかわりに手札に戻す。': {
    note: 'AQ NETWORK',
    statics: [{ type: 'grantKeyword', keywords: { blocker: true }, appliesTo: { owner: 'self', onlySelf: true }, condition: civilCount('water', 3) }],
    replacements: [{ event: 'destroyed', subject: 'self', instead: 'toHand', condition: civilCount('water', 3) }],
  },
  '次の中から2回選ぶ。（同じものを選んでもよい）▶自分の山札の上から2枚を表向きにする。その中の光と水のカードをすべて手札に加え、残りを好きな順序で山札の下に置く。▶自分の山札の上から1枚目をシールド化する。▶コスト3以下のエレメントを1つ選び、シールド化する。': {
    note: '理想と平和の決断（「光と水のカード」は光のカードと水のカード。エレメントはどちらのプレイヤーのものも選べる）',
    abilities: [
      {
        when: 'onCast',
        effects: [
          {
            type: 'chooseOne',
            times: 2,
            options: [
              {
                label: '山札の上から2枚を表向きにし、光と水のカードをすべて手札に加え、残りを山札の下に置く',
                effects: [{ type: 'lookAtTop', count: 2, pickCount: 2, pickAll: true, pickFilter: { civilizations: ['light', 'water'] }, pickTo: 'hand', restTo: 'deckBottom' }],
              },
              { label: '山札の上から1枚目をシールド化する', effects: [{ type: 'deckTopTo', count: 1, to: 'shield' }] },
              { label: 'コスト3以下のエレメントを1つ選び、シールド化する', effects: [{ type: 'move', target: { owner: 'any', zone: 'battle', count: 1, element: true, filter: { maxCost: 3 } }, to: 'shield' }] },
            ],
          },
        ],
      },
    ],
  },
  '各ターン、はじめて出る相手のクリーチャーは、タップして出る。': {
    note: 'アルカディアス・モモキング（ボルシャック・フレアと同じ。このクリーチャーが出る前に出た相手のクリーチャーも数える）',
    statics: [{ type: 'opponentEntersTapped', firstPerTurn: true }],
  },
  '自分の手札にあるクリーチャーすべてに、「W・シンパシー：パワー12000以上のクリーチャー」を与える。': {
    note: '天風のゲイル・ヴェスパー（元から W・シンパシーを持つカードは、もう1つ得て2つとも効く）',
    statics: [
      { type: 'costMod', amount: -2, appliesTo: { owner: 'self', filter: { cardType: 'creature' } }, perCount: { who: 'self', zone: 'battle', filter: { minPower: 12000 } }, handOnly: true, minCost: 1 },
    ],
  },
  '自分のターンのはじめに、このクリーチャーを自分のマナゾーンから手札に戻してもよい。': {
    note: 'ジーク・ナハトファルター（マナゾーンにある間の誘発）',
    handTriggers: [{ when: 'ownTurnStart', zones: ['mana'], effects: [{ type: 'selfAction', action: 'hand' }] }],
  },
  'このクリーチャーまたは自分の他のパワー12000以上のクリーチャーがバトルゾーンに出た時、自分の山札の上から2枚をマナゾーンに置く。そうしたら、クリーチャーを1体、自分のマナゾーンから手札に戻す。': {
    note: 'ジーク・ナハトファルター',
    abilities: (['onSummon', 'onOtherSummon'] as const).map(
      (when): TriggeredAbility => ({
        when,
        ...(when === 'onOtherSummon' ? { who: 'self' as const, filter: { minPower: 12000 } } : {}),
        effects: [
          { type: 'deckTopTo', count: 2, to: 'mana' },
          { type: 'move', target: { owner: 'self', zone: 'mana', count: 1, filter: { cardType: 'creature' } }, to: 'hand' },
        ],
      }),
    ),
  },
  'このターン、パワー12000以上で攻撃していた自分のクリーチャーがいなければ、このクリーチャーは攻撃できない。': {
    note: 'ヴァム・ウィングダム（攻撃した時のパワーで数える）',
    statics: [
      { type: 'grantKeyword', keywords: { cannotAttack: true }, appliesTo: { owner: 'self', onlySelf: true }, condition: { type: 'not', condition: { type: 'attackedWithPower', who: 'self', min: 12000 } } },
    ],
  },
  '相手は、自身のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーをすべて、自身のマナゾーンに置く。': {
    note: 'ジュラスティック・ハウル（マナゾーンの枚数は効果を使う前に数える）',
    abilities: [{ when: 'onCast', effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 'all', filter: { costAboveOwnerMana: true } }, to: 'mana' }] }],
  },
  '相手のターン中に、相手がコストを支払わずにクリーチャーをバトルゾーンに出した時、このクリーチャーとそのクリーチャーをバトルさせてもよい。': {
    note: 'デスマッチ・ビートル（召喚・効果のどちらでも、コストを支払わずに出たもの）',
    abilities: [
      {
        when: 'onOtherSummon',
        who: 'opponent',
        duringTurn: 'opponent',
        condition: { type: 'subjectEnteredFree' },
        optional: true,
        effects: [{ type: 'fight', target: { owner: 'opponent', zone: 'battle', count: 'all', ref: 'event' } }],
      },
    ],
  },
  'このクリーチャーがバトルゾーンに出た時あるいは自分が名前に《トラップ》とある呪文を唱えた時、自然のコスト6以下のクリーチャーを1体、自分の手札またはマナゾーンからバトルゾーンに出してもよい。': {
    note: 'ナ・チュラルゴ・デンジャー（呪文側の《ナチュラル・トラップ》を唱えた時も）',
    abilities: (['onSummon', 'onSpellCast'] as const).map(
      (when): TriggeredAbility => ({
        when,
        ...(when === 'onSpellCast' ? { who: 'self' as const, filter: { nameIncludes: 'トラップ' } } : {}),
        effects: [
          {
            type: 'move',
            target: { owner: 'self', zone: 'hand', extraZones: ['mana'], count: 1, upTo: true, filter: { civilization: 'nature', maxCost: 6, cardType: 'creature' } },
            to: 'battle',
          },
        ],
      }),
    ),
  },
  // ── SD1 その6 ──
  '相手のターン中、相手が、自身のマナゾーンのカードの枚数よりコストが大きいクリーチャーを出す時、かわりにマナゾーンに置く。': {
    note: 'キャディ・ビートル（召喚でも効果でも。コストは出すクリーチャーの持ち主のマナゾーンの枚数と比べる）',
    statics: [{ type: 'enterInstead', who: 'opponent', filter: { costAboveOwnerMana: true }, to: 'mana', duringTurn: 'opponent' }],
  },
  '相手が自身の手札以外からカードを出す時、かわりにマナゾーンに置く。': {
    note: 'とこしえの超人（クリーチャー以外のカードも）',
    statics: [{ type: 'enterInstead', who: 'opponent', to: 'mana', exceptFromHand: true, anyCard: true }],
  },
  '自分のターン中、ジャイアントを1体、自分のマナゾーンから召喚してもよい。そうしたら、自分の山札の上から1枚目をマナゾーンに置く。': {
    note: 'チアスカーレット アカネ（回数の制限なし）',
    statics: [{ type: 'summonFromZone', zone: 'mana', filter: { cardType: 'creature', race: 'ジャイアント' }, duringTurn: 'self', then: [{ type: 'deckTopTo', count: 1, to: 'mana' }] }],
  },
  '相手のクリーチャーが出て、その能力がトリガーする時、自分のスノーフェアリーが5つ以上あれば、かわりにその能力はトリガーしない。': {
    note: '完璧妖精マリニャンX（スノーフェアリーはクリーチャー以外のカードも数える）',
    statics: [
      {
        type: 'suppressEnterTriggers',
        subjectOnly: true,
        condition: { type: 'compare', left: { who: 'self', zone: 'battle', withPermanents: true, filter: { race: 'スノーフェアリー' } }, op: '>=', right: 5 },
      },
    ],
  },
  '相手はコスト5以下の、クリーチャーではないカードを使えない。': {
    note: '超球の超人（呪文・タマシード・クロスギアなど。ツインパクトは使う面で見る）',
    statics: [{ type: 'cannotUse', who: 'opponent', filter: { maxCost: 5 }, nonCreature: true }],
  },
  '終極宣言：自分のターンのはじめに、自分の手札と同じ枚数のカードを引いてもよい。その後、自分のマナゾーンにあるカードと同じ枚数のカードを、自分の山札の上からマナゾーンに置いてもよい。（「終極宣言」は、ゲーム中に一度だけ使える）': {
    note: '超重竜 ゴルファンタジスタ（「終極宣言」はプレイヤーごとにゲーム中に一度。使うと答えたら使ったことになる）',
    abilities: [
      {
        when: 'onTurnStart',
        onceName: '終極宣言',
        optional: true,
        effects: [
          { type: 'useOnce', name: '終極宣言' },
          { type: 'optional', effects: [{ type: 'repeat', per: { who: 'self', zone: 'hand' }, unit: 1, effects: [{ type: 'draw', count: 1 }] }] },
          { type: 'optional', effects: [{ type: 'repeat', per: { who: 'self', zone: 'mana' }, unit: 1, effects: [{ type: 'deckTopTo', count: 1, to: 'mana' }] }] },
        ],
      },
    ],
  },
  '自分の他のジャイアントが相手のクリーチャーとバトルする時、かわりにこのクリーチャーにバトルさせてもよい。': {
    note: '銀河竜 ゴルファンタジスタ',
    statics: [{ type: 'battleSubstitute', filter: { cardType: 'creature', race: 'ジャイアント' } }],
  },
  '自分のクロスギアをジェネレートしたりクロスするコストは1少なくなる。ただし、コストは0以下にはならない。': {
    note: '竜装 ゴウソク・タキオンアーマー',
    statics: [{ type: 'costMod', amount: -1, appliesTo: { owner: 'self', filter: { typeLabelIncludes: 'クロスギア' } }, minCost: 1 }],
  },
  'このカードがドラゴンまたはサムライにクロスされている時、バトルゾーンにある自分のドラゴンとサムライ・クリーチャーのパワーは+2000され、「スピードアタッカー」を得る。': {
    note: '竜装 ザンゲキ・マッハアーマー',
    statics: ((): StaticAbility[] => {
      const condition: Condition = { type: 'gearAttached', hostFilter: { cardType: 'creature', races: ['ドラゴン', 'サムライ'] } };
      const appliesTo = { owner: 'self' as const, filter: { cardType: 'creature' as const, races: ['ドラゴン', 'サムライ'] } };
      return [
        { type: 'powerMod', amount: 2000, appliesTo, condition },
        { type: 'grantKeyword', keywords: { speedAttacker: true }, appliesTo, condition },
      ];
    })(),
  },
  'このカードは、コストを支払わずに《ボルメテウス・武者・ドラゴン》にクロスしてもよい。': {
    note: '竜装 ザンゲキ・マッハアーマー（名前が《ボルメテウス・武者・ドラゴン》のクリーチャーだけ）',
    statics: [{ type: 'freeCross', filter: { nameEquals: 'ボルメテウス・武者・ドラゴン' } }],
  },
  'このクロスギアをコストを支払わずにサムライ・クリーチャーにクロスしてもよい。': {
    note: '竜牙 リュウジン・ドスファング',
    statics: [{ type: 'freeCross', filter: { cardType: 'creature', race: 'サムライ' } }],
  },
  'このクリーチャーが出た時、自分の火のエレメントの数以下のコストの相手のエレメントを1つ選び、破壊する。その後、自分の光のエレメント1つにつき、カードを1枚引いてもよい。': {
    note: 'ヴァルキリアス・武者・ムサシ「弐天」（エレメントの数は選ぶ時に数える。引く枚数は0枚から選べる）',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          { type: 'destroy', target: { owner: 'opponent', zone: 'battle', count: 1, element: true, filter: { maxCostCount: { who: 'self', zone: 'battle', withPermanents: true, filter: { civilization: 'fire' } } } } },
          { type: 'repeat', per: { who: 'self', zone: 'battle', withPermanents: true, filter: { civilization: 'light' } }, unit: 1, effects: [{ type: 'draw', count: 1, upTo: true }] },
        ],
      },
    ],
  },
  'このクリーチャーが攻撃する時、自分の手札から、自分の手札の枚数以下のコストを持つ進化ではない、サムライまたはアーマードを1枚、コストを支払わずに使ってもよい。': {
    note: 'ヴァルキリアス・武者・ムサシ「弐天」（クロスギアや呪文でもよい。手札の枚数は使うカードも数える）',
    abilities: [{ when: 'onAttack', optional: true, effects: [{ type: 'playFromHandFree', filter: { nonEvolution: true, races: ['サムライ', 'アーマード'] }, maxCostHandSize: true }] }],
  },
  // ── SD1 その7 ──
  '相手のクリーチャーは、出たターン攻撃できない。': {
    note: '聖カオスマントラ（スピードアタッカー・マッハファイターがあっても）',
    statics: [{ type: 'grantKeyword', keywords: { noAttackOnEnterTurn: true }, appliesTo: { owner: 'opponent' } }],
  },
  '相手のクリーチャーは、タップしてバトルゾーンに置かれる。': {
    note: '閃光の神官 ヴェルベット',
    statics: [{ type: 'opponentEntersTapped' }],
  },
  '自分のターンの終わりに、このクリーチャーがアンタップしていたら、自分の手札に戻す。': {
    note: 'グレイト“S-駆”',
    abilities: [{ when: 'onTurnEnd', condition: { type: 'not', condition: { type: 'selfTapped' } }, effects: [{ type: 'selfAction', action: 'hand' }] }],
  },
  'このクリーチャーが出た時、自分のツインパクト・クリーチャーがあれば、山札の上から1枚目をマナゾーンに置く。': {
    note: 'アカシック・ゼノン',
    abilities: [
      { when: 'onSummon', condition: { type: 'compare', left: { who: 'self', zone: 'battle', filter: { twinpact: true } }, op: '>=', right: 1 }, effects: [{ type: 'deckTopTo', count: 1, to: 'mana' }] },
    ],
  },
  'プレイヤーを1人選ぶ。そのプレイヤーは、自身の墓地を山札に加えてシャッフルする。': {
    note: 'オキヨメ・水晶チャージャー（清浄のカルマ インカの呪文側）',
    abilities: [{ when: 'onCast', effects: [{ type: 'graveyardToDeck', who: 'choose' }] }],
  },
  'このカードが離れた時、カードを1枚、自分のマナゾーンから手札に戻す。': {
    note: '晴舞龍 ズンドコ・モモキング（スター進化で一番上のこのカードだけが離れた時も）',
    abilities: [{ when: 'onLeave', effects: [{ type: 'move', target: { owner: 'self', zone: 'mana', count: 1 }, to: 'hand' }] }],
  },
  '各ターンはじめて、自分またはこのクリーチャーが攻撃された時、各相手の手札を1枚ずつ見ないで選び、捨てさせる。': {
    note: '邪光魔縛 ネロマノフ=ルドルフⅠ世（自分への攻撃とこのクリーチャーへの攻撃を合わせて各ターン1回）',
    abilities: [
      { when: 'onAttacked', oncePerTurn: true, onceKey: 'nero-attacked', effects: [{ type: 'discardRandom', count: 1 }] },
      { when: 'onOtherAttackPlayer', who: 'opponent', oncePerTurn: true, onceKey: 'nero-attacked', effects: [{ type: 'discardRandom', count: 1 }] },
    ],
  },
  '相手が、自身のマナゾーンのカードの枚数よりコストが大きいクリーチャーを出す時、相手はそれをかわりにマナゾーンに置き、その後、自分はこのクリーチャーをマナゾーンに置く。': {
    note: 'ベイB セガーレ（召喚でも効果でも、どちらのターンでも）',
    statics: [{ type: 'enterInstead', who: 'opponent', filter: { costAboveOwnerMana: true }, to: 'mana', thenSelfTo: 'mana' }],
  },
  '相手のターン中、相手が自身の手札以外からマナゾーンにカードを置く時、かわりに墓地に置く。': {
    note: '星空に浮かぶニンギョ（相手のカードが相手のマナゾーンに置かれる時。唱えたチャージャー呪文も手札以外から置くものとする）',
    statics: [{ type: 'manaInstead', who: 'opponent', to: 'graveyard', exceptFromHand: true, duringTurn: 'opponent' }],
  },
  '自分のマナゾーンにあるカードは、すべての文明を持つ。': {
    note: '怪盗妖精カサブランカ（裏向きのカードも）',
    statics: [{ type: 'manaAllCivs' }],
  },
  'カードを自分の手札からマナゾーンに置いた時、そのカードをアンタップする。': {
    note: '怪盗妖精カサブランカ（タップして置かれても、置いた後でアンタップする）',
    statics: [{ type: 'manaEntersUntapped', fromHand: true }],
  },
  'このクリーチャーが出た時、自分の光のクリーチャーまたは光のタマシード1つにつき、カードを1枚引いてもよい。': {
    note: 'シェケダン・ドメチアーレ（このクリーチャー自身も数える。引く枚数は0枚から選べる）',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          {
            type: 'repeat',
            per: { who: 'self', zone: 'battle', withPermanents: true, filter: { civilization: 'light', anyOf: [{ cardType: 'creature' }, { cardType: 'tamaseed' }] } },
            unit: 1,
            effects: [{ type: 'draw', count: 1, upTo: true }],
          },
        ],
      },
    ],
  },
  '自分の光のクリーチャーと光のタマシードを使うコストを2少なくする。ただし、コストは0以下にはならない。': {
    note: 'シェケダン・ドメチアーレ',
    statics: [{ type: 'costMod', amount: -2, appliesTo: { owner: 'self', filter: { civilization: 'light', anyOf: [{ cardType: 'creature' }, { cardType: 'tamaseed' }] } }, minCost: 1 }],
  },
  'シビルカウント5：自分の光のクリーチャーまたは光のタマシードが合計5つ以上あれば、このクリーチャーのパワーを+10000し、「T・ブレイカー」と「このクリーチャーが攻撃する時、相手のクリーチャーを1体選んでもよい。相手はそれをシールド化する」を与える。': {
    note: 'シェケダン・ドメチアーレ（与える攻撃する時の能力は、攻撃する時に条件を満たしていれば使える）',
    statics: [
      { type: 'powerMod', amount: 10000, appliesTo: { owner: 'self', onlySelf: true }, condition: civilCount('light', 5) },
      { type: 'grantKeyword', keywords: { breaker: 3 }, appliesTo: { owner: 'self', onlySelf: true }, condition: civilCount('light', 5) },
    ],
    abilities: [
      { when: 'onAttack', condition: civilCount('light', 5), effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 1, upTo: true }, to: 'shield' }] },
    ],
  },
  '相手のターン中に、相手のクリーチャーが相手のマナゾーンのカードをタップせずに出た時、それをシールド化してもよい。': {
    note: 'ヴェネラック-F5（召喚でも効果でも、コストを支払わずに出たもの）',
    abilities: [
      {
        when: 'onOtherSummon',
        who: 'opponent',
        duringTurn: 'opponent',
        condition: { type: 'subjectEnteredFree' },
        optional: true,
        effects: [{ type: 'move', target: { owner: 'opponent', zone: 'battle', count: 'all', ref: 'event' }, to: 'shield' }],
      },
    ],
  },
  'シールドゾーンから自分の手札に加えられる呪文はすべて、「S・トリガー」を得る。': {
    note: '天雷龍姫エリザベス（シールドがブレイクされた時。ツインパクトは呪文側が得る）',
    statics: [{ type: 'shieldSpellsTrigger' }],
  },
  '各ターンに一度、自分のツインパクト・クリーチャーが攻撃する時、そのクリーチャーの呪文側を、バトルゾーンに置いたままコストを支払わずに唱えてもよい。': {
    note: 'アカシック・ゼノン（唱えなかった時は数えない。そのターンの他の攻撃でもう一度使える）',
    abilities: [
      {
        when: 'onOtherAttack',
        who: 'self',
        filter: { twinpact: true },
        oncePerTurn: true,
        oncePerTurnOnUse: true,
        onceKey: 'zenon-twin',
        optional: true,
        effects: [{ type: 'castOwnTwin', target: { owner: 'self', zone: 'battle', count: 'all', ref: 'event' } }],
      },
    ],
  },
  'このクリーチャーが出た時、自分のマナゾーンにあるクリーチャーを1体選ぶ。このターン、そのクリーチャーをマナゾーンから召喚してもよい。': {
    note: '冒険妖精ポレキチ（コストは支払う。選んだクリーチャーだけ）',
    abilities: [
      {
        when: 'onSummon',
        effects: [
          { type: 'choose', target: { owner: 'self', zone: 'mana', count: 1, filter: { cardType: 'creature' } } },
          { type: 'turnStatic', static: { type: 'summonFromZone', zone: 'mana', chosenOnly: true } },
        ],
      },
    ],
  },
  'このクリーチャーが攻撃する時、自分のマナゾーンにあるツインパクトカードの枚数よりコストの小さいクリーチャーを1体、自分のマナゾーンから出してもよい。': {
    note: '全虹帝 ミノガミ（枚数は出すクリーチャーを選ぶ時に数える。選ぶクリーチャー自身も数える）',
    abilities: [
      {
        when: 'onAttack',
        effects: [
          {
            type: 'move',
            target: { owner: 'self', zone: 'mana', count: 1, upTo: true, filter: { cardType: 'creature', costBelowCount: { who: 'self', zone: 'mana', filter: { twinpact: true } } } },
            to: 'battle',
          },
        ],
      },
    ],
  },
  '自分のターンの終わりに、自分のコスト4以下のクリーチャーを手札と墓地から最大1体ずつ出してもよい。次の自分のターンのはじめまで、それらに「ブロッカー」を与える。': {
    note: '千羽忍革 ボジソワカ（手札から1体、墓地から1体を、それぞれ出さなくてもよい）',
    abilities: [
      {
        when: 'onTurnEnd',
        effects: (['hand', 'graveyard'] as const).map(
          (zone): EffectDef => ({
            type: 'move',
            target: { owner: 'self', zone, count: 1, upTo: true, filter: { cardType: 'creature', maxCost: 4 } },
            to: 'battle',
            grant: { keywords: { blocker: true }, untilNextTurn: true },
          }),
        ),
      },
    ],
  },
  'このクリーチャーが攻撃する時、自分の山札の上から3枚を表向きにする。それらがすべて異なるコストなら、その中から、コスト9以下のエレメントを好きな数、コストを支払わずに使ってもよい。残りをすべてマナゾーンに置く。': {
    note: '五輪の求道者 清永（エレメントは呪文以外。ツインパクトは両方のコストを持つものとして比べ、クリーチャー側を使う）',
    abilities: [{ when: 'onAttack', effects: [{ type: 'revealTopUse', count: 3, distinctCost: true, filter: { maxCost: 9, not: { cardType: 'spell' } }, restTo: 'mana' }] }],
  },
  '自分の山札の上から6枚を表向きにする。その中から進化クリーチャーをすべて自分の手札に加え、それ以外のカードを好きな順で自分の山札の一番下に戻す。': {
    note: '進化設計図',
    abilities: [{ when: 'onCast', effects: [{ type: 'lookAtTop', count: 6, pickCount: 6, pickAll: true, pickFilter: { cardType: 'creature', evolution: true }, pickTo: 'hand', restTo: 'deckBottom' }] }],
  },
  '飛行': {
    note: '極楽鳥（「飛行」を持たないクリーチャーから攻撃もブロックもされない）',
    keywords: { flying: true },
  },
  'このクリーチャーはシールドをブレイクできない。': {
    note: '極楽鳥（攻撃でブレイクするシールドの数が0になる。シールドがなければとどめは刺せる）',
    keywords: { maxBreakPerAttack: 0 },
  },
  'このクリーチャーを、自分のマナゾーンにあり、すべての文明を持つかのようにタップしてもよい。': {
    note: '極楽鳥（コストの支払いに使える。出たターンにも使える）',
    keywords: { tapAsMana: true },
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
