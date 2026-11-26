// カードの基本情報（カードデータ）の型定義。
// 対戦中の個体情報は engine/types.ts の CardInstance で別に管理する。

export const CIVILIZATIONS = ['light', 'water', 'darkness', 'fire', 'nature', 'zero'] as const;
export type Civilization = (typeof CIVILIZATIONS)[number];

export const CIV_LABEL: Record<Civilization, string> = {
  light: '光',
  water: '水',
  darkness: '闇',
  fire: '火',
  nature: '自然',
  zero: '無色',
};

export const CARD_TYPES = ['creature', 'evolution', 'spell'] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  creature: 'クリーチャー',
  evolution: '進化クリーチャー',
  spell: '呪文',
};

/** 効果の自動処理対応状況。manual のカードはエンジンが勝手に処理しない。 */
export type SupportLevel = 'full' | 'partial' | 'manual';

export const SUPPORT_LABEL: Record<SupportLevel, string> = {
  full: '自動処理対応',
  partial: '一部手動',
  manual: '手動処理',
};

export type ZoneName = 'deck' | 'hand' | 'mana' | 'shield' | 'battle' | 'graveyard' | 'hyperspatial' | 'grZone' | 'seal';

export const ZONE_LABEL: Record<ZoneName, string> = {
  deck: '山札',
  hand: '手札',
  mana: 'マナゾーン',
  shield: 'シールドゾーン',
  battle: 'バトルゾーン',
  graveyard: '墓地',
  hyperspatial: '超次元ゾーン',
  grZone: '超GRゾーン',
  seal: '封印',
};

/** カードの絞り込み条件（効果の対象・常在効果の範囲などで共用） */
export interface CardFilter {
  maxPower?: number;
  minPower?: number;
  maxCost?: number;
  minCost?: number;
  civilization?: Civilization;
  cardType?: CardType;
  race?: string;
  /** いずれかの種族を持つ（「AまたはB」） */
  races?: string[];
  /** 進化ではない */
  nonEvolution?: boolean;
  /** 多色 */
  multicolor?: boolean;
  tapped?: boolean;
  untapped?: boolean;
  /** 効果の発生源自身を除く */
  excludeSelf?: boolean;
}

/** 効果の対象指定 */
export interface TargetSpec {
  owner: 'self' | 'opponent' | 'any';
  zone: 'battle' | 'mana' | 'shield' | 'graveyard' | 'hand' | 'deck';
  /** 'all' は条件に合うものすべて（選択なし） */
  count: number | 'all';
  /** true なら 0〜count 枚の範囲で選べる（「〜まで」） */
  upTo?: boolean;
  filter?: CardFilter;
  /** 誰が選ぶか。owner は「相手は自分の〜を選ぶ」 */
  chooser?: 'controller' | 'owner';
}

/** 数を数える式（条件判定用） */
export interface Quantity {
  who: 'self' | 'opponent';
  zone: 'battle' | 'mana' | 'shield' | 'graveyard' | 'hand' | 'deck';
  filter?: CardFilter;
}

export type Condition =
  | { type: 'compare'; left: Quantity; op: '>' | '>=' | '<' | '<=' | '=='; right: Quantity | number }
  | { type: 'not'; condition: Condition }
  | { type: 'and'; conditions: Condition[] };

/** 構造化された効果定義 */
export type EffectDef =
  /** upTo: 0〜count 枚の範囲で引く枚数を選ぶ（「N枚まで引く」） */
  | { type: 'draw'; count: number; upTo?: boolean }
  | { type: 'addManaFromDeck'; count: number }
  | { type: 'addShieldFromDeck'; count: number }
  /** 山札の上から N 枚を指定ゾーンへ（墓地肥やし・マナ加速など） */
  | { type: 'deckTopTo'; count: number; to: 'graveyard' | 'mana' | 'shield' | 'hand'; who?: 'self' | 'opponent' }
  | { type: 'destroy'; target: TargetSpec }
  | { type: 'bounce'; target: TargetSpec }
  | { type: 'tap'; target: TargetSpec }
  | { type: 'untap'; target: TargetSpec }
  | { type: 'toMana'; target: TargetSpec }
  | { type: 'toHand'; target: TargetSpec }
  | { type: 'toGraveyard'; target: TargetSpec }
  | { type: 'toShield'; target: TargetSpec }
  | { type: 'toDeckBottom'; target: TargetSpec }
  | { type: 'shieldToHand'; target: TargetSpec }
  | { type: 'graveyardToHand'; target: TargetSpec }
  /** 指定ゾーンのクリーチャーをバトルゾーンに出す（コストを払わない） */
  | { type: 'putIntoBattle'; target: TargetSpec }
  | { type: 'discardRandom'; count: number }
  /** 山札の上から count 枚を見て、条件に合うものを pickCount 枚まで pickTo へ。残りは restTo へ */
  | {
      type: 'lookAtTop';
      count: number;
      pickCount: number;
      pickFilter?: CardFilter;
      pickTo: 'hand' | 'battle' | 'mana' | 'shield';
      restTo: 'deckBottom' | 'graveyard' | 'mana' | 'shuffle';
      /** 条件に合うものをすべて選ぶ（選択なし） */
      pickAll?: boolean;
      /** 選べるなら必ず pickCount 枚選ぶ（「〜てもよい」でない） */
      mustPick?: boolean;
      /** opponent：相手に選ばせる */
      chooser?: 'opponent';
    }
  /** 手札のカードを山札の上に置く（選んだ順に上へ） */
  | { type: 'toDeckTop'; target: TargetSpec }
  | { type: 'shuffleDeck' }
  /** 自分の墓地のカードをすべて山札に加えてシャッフルする */
  | { type: 'graveyardToDeck' }
  /** 山札の上から1枚目を公開し、クリーチャーなら出してもよい／呪文なら唱えてもよい／それ以外は otherwise へ */
  | { type: 'revealTopCard'; ifCreature?: 'battle'; ifSpell?: 'cast'; otherwise?: 'mana' }
  /** 相手に自分のシールドを1つ選ばせて見る。呪文ならコストを支払わずに唱えてもよい（ラッキー・ダーツ） */
  | { type: 'shieldGamble' }
  /** 手札から条件に合うカードを1枚、コストを支払わずに使ってもよい（maxCostHandSize: コストが手札の枚数以下） */
  | { type: 'playFromHandFree'; filter?: CardFilter; maxCostHandSize?: boolean }
  /** エンジン内部用：公開したカードを出す／唱える（てもよい）。しなければそのまま */
  | { type: 'playRevealed'; iid: string; as: 'creature' | 'spell' }
  /** 相手のシールドをブレイクする（S・トリガー可） */
  | { type: 'breakShields'; count: number }
  | { type: 'extraTurn' }
  /** 効果の発生源（このクリーチャー）自身に対する処理 */
  | { type: 'selfAction'; action: 'destroy' | 'toHand' | 'toMana' | 'tap' | 'untap' }
  /** ターン終了時まで、パワーを変更する */
  | { type: 'powerMod'; target: TargetSpec | 'self'; amount: number }
  /** ターン終了時まで、キーワード能力を与える */
  | { type: 'grantKeyword'; target: TargetSpec | 'self'; keywords: Keywords }
  /** ターン終了時まで有効な常在効果（例：このターン、相手のクリーチャーは攻撃できない） */
  | { type: 'turnStatic'; static: StaticAbility }
  | { type: 'conditional'; condition: Condition; then: EffectDef[]; else?: EffectDef[] }
  /** モード選択（「次の中から1つ選ぶ」） */
  | { type: 'chooseOne'; options: { label: string; effects: EffectDef[] }[] }
  /** エンジンでは処理しない。ログに出してプレイヤーの手動操作に委ねる */
  | { type: 'manual'; text: string };

export const TRIGGER_EVENTS = [
  'onSummon',
  'onDestroyed',
  'onAttack',
  'onCast',
  'onTurnStart',
  'onTurnEnd',
  'onBlock',
  'onBattleWin',
  'onOtherSummon',
  'onLeave',
  'onShieldBroken',
] as const;
export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

export interface TriggeredAbility {
  when: TriggerEvent;
  effects: EffectDef[];
  /** 任意効果（「〜してもよい」） */
  optional?: boolean;
  /** onOtherSummon / onShieldBroken の対象プレイヤー（既定は self） */
  who?: 'self' | 'opponent' | 'any';
  /** onOtherSummon で出たクリーチャーの条件 */
  filter?: CardFilter;
  /** 発動条件（「〜なら」） */
  condition?: Condition;
}

/** 常在効果がかかる範囲 */
export interface Applies {
  owner: 'self' | 'opponent' | 'any';
  excludeSelf?: boolean;
  filter?: CardFilter;
}

/** 常在効果（バトルゾーンにある間、または turnStatic でターン終了まで有効） */
export type StaticAbility = (
  | { type: 'powerMod'; amount: number; appliesTo: Applies; attackingOnly?: boolean }
  | { type: 'grantKeyword'; keywords: Keywords; appliesTo: Applies }
  /** 手札のカードのコストを増減する。コストは minCost（既定1）未満にならない */
  | { type: 'costMod'; amount: number; appliesTo: Applies; minCost?: number }
  | { type: 'cannotSummon'; who: 'self' | 'opponent' | 'both'; filter?: CardFilter }
  | { type: 'cannotCast'; who: 'self' | 'opponent' | 'both'; filter?: CardFilter }
) & {
  /** 有効なターン（「自分のターン中」= self）。省略時は常に有効 */
  duringTurn?: 'self' | 'opponent';
};

/** 置換効果（「〜する時、かわりに…」） */
export interface ReplacementAbility {
  /** destroyed: 破壊される時 / leaveBattle: バトルゾーンを離れる時（破壊・バウンス・マナ送りなど） */
  event: 'destroyed' | 'leaveBattle';
  /** self: このクリーチャー / otherOwn: 自分の他のクリーチャー / anyOwn: 自分のクリーチャー */
  subject: 'self' | 'otherOwn' | 'anyOwn';
  filter?: CardFilter;
  /** destroySelf: かわりにこのクリーチャーを破壊する（セイバー） / stay: とどまる */
  instead: 'toHand' | 'toMana' | 'toShield' | 'toDeckBottom' | 'destroySelf' | 'stay';
  optional?: boolean;
}

export interface Keywords {
  blocker?: boolean;
  shieldTrigger?: boolean;
  speedAttacker?: boolean;
  /** シールドをブレイクする枚数（W・ブレイカー=2、T・ブレイカー=3） */
  breaker?: number;
  cannotAttackPlayers?: boolean;
  cannotAttack?: boolean;
  /** 攻撃中のみパワー加算 */
  powerAttacker?: number;
  /** バトルに負けた場合、相手も破壊する */
  slayer?: boolean;
  /** バトルに勝ったら破壊される */
  suicideOnWin?: boolean;
  /** ブロックされない */
  unblockable?: boolean;
  /** アンタップされているクリーチャーも攻撃できる */
  attackUntapped?: boolean;
  /** ブロックできない */
  cannotBlock?: boolean;
  /** マッハファイター：出たターンでも相手のクリーチャー（アンタップ含む）を攻撃できる */
  machFighter?: boolean;
  /** パワード・ブレイカー：パワー6000ごとにブレイク数+1 */
  poweredBreaker?: boolean;
  /** チャージャー：唱えた後、墓地のかわりにマナゾーンに置く */
  charger?: boolean;
  /** 相手に選ばれない */
  untargetable?: boolean;
  /** 攻撃されない */
  cannotBeAttacked?: boolean;
  /** ジャストダイバー：出た時から次の自分のターンのはじめまで、相手に選ばれず攻撃されない */
  justDiver?: boolean;
  /** G・ストライク：シールドから手札に加える時、相手のクリーチャーを1体選んでもよい。このターンそれは攻撃できない */
  gStrike?: boolean;
  /** ブレイクしたシールドを、相手は手札に加えるかわりに墓地に置く */
  shieldBurn?: boolean;
  /** EXライフ：出る時に山札の上から1枚をシールド化し、離れる時かわりにそのシールドを墓地に置く */
  exLife?: boolean;
  /** マナゾーンにタップして置かれる */
  manaTapped?: boolean;
  /** 山札の最後の1枚を引く時、ゲームに負けるかわりに勝つ */
  winOnLastDraw?: boolean;
}

/** ツインパクトの呪文側 */
export interface TwinSide {
  name: string;
  cost: number;
  civilizations: Civilization[];
  text: string;
  keywords?: Pick<Keywords, 'shieldTrigger' | 'charger' | 'manaTapped'>;
  abilities?: TriggeredAbility[];
}

export interface CardDefinition {
  id: string;
  name: string;
  /** 読み仮名（検索用、任意） */
  reading?: string;
  imageUrl?: string;
  /** ブラウザに保存した画像のキー（IndexedDB の images テーブル） */
  imageRef?: string;
  cost: number;
  civilizations: Civilization[];
  type: CardType;
  /** 元のカードの種類名（エンジンの CardType にない種類を表示するため） */
  typeLabel?: string;
  races: string[];
  power?: number;
  text: string;
  set?: string;
  rarity?: string;
  keywords?: Keywords;
  abilities?: TriggeredAbility[];
  statics?: StaticAbility[];
  replacements?: ReplacementAbility[];
  /** ツインパクトの呪文側 */
  twin?: TwinSide;
  /** 進化元の条件（種族名 or 文明） */
  evolvesFrom?: { race?: string; civilization?: Civilization };
  support: SupportLevel;
}

export function isCreatureType(t: CardType): boolean {
  return t === 'creature' || t === 'evolution';
}

/** マナゾーンに置いた時の文明（ツインパクトは両面の文明を持つ） */
export function manaCivilizations(d: CardDefinition): Civilization[] {
  return d.twin ? [...new Set([...d.civilizations, ...d.twin.civilizations])] : d.civilizations;
}

/** 使うカードの面（通常面 or ツインパクトの呪文側） */
export interface PlayFace {
  name: string;
  cost: number;
  civilizations: Civilization[];
  type: CardType;
  abilities: TriggeredAbility[];
  side: 'main' | 'twin';
}

export function playFace(d: CardDefinition, side: 'main' | 'twin' = 'main'): PlayFace {
  if (side === 'twin' && d.twin) {
    return { name: d.twin.name, cost: d.twin.cost, civilizations: d.twin.civilizations, type: 'spell', abilities: d.twin.abilities ?? [], side };
  }
  return { name: d.name, cost: d.cost, civilizations: d.civilizations, type: d.type, abilities: d.abilities ?? [], side: 'main' };
}
