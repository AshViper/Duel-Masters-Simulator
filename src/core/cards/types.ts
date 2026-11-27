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

/** field：D2フィールドなど。唱えるとバトルゾーンに置かれ、クリーチャーではない */
/** tamaseed：タマシード。呪文でもクリーチャーでもない独自の種類で、使うとバトルゾーンに置かれる */
export const CARD_TYPES = ['creature', 'evolution', 'spell', 'field', 'tamaseed'] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  creature: 'クリーチャー',
  evolution: '進化クリーチャー',
  spell: '呪文',
  field: 'フィールド',
  tamaseed: 'タマシード',
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
  /** いずれかの文明を持つ（「光または自然の」） */
  civilizations?: Civilization[];
  cardType?: CardType;
  race?: string;
  /** いずれかの種族を持つ（「AまたはB」） */
  races?: string[];
  /** 進化ではない */
  nonEvolution?: boolean;
  /** ツインパクト */
  twinpact?: boolean;
  /** 指定のキーワード能力を持つ（「「ブロッカー」を持つ」） */
  hasKeyword?: keyof Keywords;
  /** 多色 */
  multicolor?: boolean;
  tapped?: boolean;
  untapped?: boolean;
  /** 効果の発生源自身を除く */
  excludeSelf?: boolean;
  /** 進化クリーチャー */
  evolution?: boolean;
  /** 持ち主のクリーチャーの中で一番パワーが大きい（highest）／小さい（lowest） */
  extremePower?: 'highest' | 'lowest';
  /** 効果の発生源（このクリーチャー）とパワー・コストを比べる（「このクリーチャーよりパワーが小さい」） */
  relativeToSource?: { stat: 'power' | 'cost'; cmp: 'less' | 'greater' };
  /** 名前にこの文字列を含む（「名前に《ボルメテウス》とある」） */
  nameIncludes?: string;
  /** コストが持ち主のマナゾーンのカードの枚数より大きい（「相手のマナゾーンにあるカードの枚数よりコストが大きい相手のクリーチャー」） */
  costAboveOwnerMana?: boolean;
  /** 直前に選んだ（動かした）カードとコストを比べる：eq 同じ／le 以下（「その捨てたカードと同じコストの」「そのクリーチャー以下のコストの」） */
  refCost?: 'eq' | 'le';
  /** 直前に選んだ（動かした）カードと同じ文明を持つ（「その捨てたカードと同じ文明を持つ」） */
  refCivs?: boolean;
  /** 選んだ数字と同じコスト（「数字を1つ選ぶ。その数字と同じコストの〜」） */
  costIsChosenNumber?: boolean;
  /** 効果の発生源自身だけ（「このクリーチャーに封印を付ける」） */
  selfOnly?: boolean;
  /** 裏向きのカード（マナゾーンの裏向きのカード、裏向きのシールド） */
  faceDown?: boolean;
  /** 表向きのカード（バトルゾーンのカード、表向きのシールドなど） */
  faceUp?: boolean;
  /** カードの種類名にこの文字列を含む（「ミリオン・フレイム」など、エンジンの種類にない種類） */
  typeLabelIncludes?: string;
  /** このうちのどれかに合うもの（「呪文または名前に《X》とあるカード」） */
  anyOf?: CardFilter[];
  /** この条件に合わないもの（「闇ではない」「ドラゴンではない」「多色ではない」） */
  not?: CardFilter;
  /** このターンにバトルゾーンに出た（「出たターン」） */
  enteredThisTurn?: boolean;
  /** 「このクリーチャーがバトルゾーンに出た時」で始まる能力（出た時の誘発）を持つ */
  hasOnSummonAbility?: boolean;
  /** クロスギアがクロスされている（「クロスギアをクロスしているクリーチャー」） */
  crossed?: boolean;
  /** 効果の発生源（クロスギア）をクロスしたクリーチャーと同じ種族を持つ */
  sameRaceAsEquipped?: boolean;
  /** 効果の発生源（クロスギア）をクロスしたクリーチャーと同じ名前 */
  sameNameAsEquipped?: boolean;
  /** コストが、発生源の持ち主から数えた数以下（「自分のマナゾーンにあるカードの枚数以下のコストを持つ」） */
  maxCostCount?: Quantity;
  /** 効果の発生源（このクリーチャー）がバトルゾーンを離れた時に、その下にあったカード（「下にあったカード」） */
  wasUnderSource?: boolean;
  /** コストが、直前に選んだカードのコストの合計以下（「そのJトルネードされたクリーチャーのコストの合計以下のコストを持つ」） */
  maxCostSumOfChosen?: boolean;
  /** その出来事の能力を持つ（キズナ：[P] 能力を持つクリーチャー） */
  hasAbilityWhen?: TriggerEvent;
  /**
   * 誘発の原因になったカードと比べる（「こうして捨てたカード以下のコストの」「それよりパワーの小さい」）。
   * エンジンが誘発の時に maxCost / maxPower に置き換える（置き換えられなければ何にも合わない）
   */
  subjectRel?: { stat: 'cost' | 'power'; cmp: 'le' | 'lt' };
  /** 誘発の原因になったクリーチャーと同じ種族を持つ（エンジンが races に置き換える） */
  sameRaceAsSubject?: boolean;
  /** このターンに破壊された */
  destroyedThisTurn?: boolean;
}

/** 効果の対象指定 */
export interface TargetSpec {
  /** パワーの合計が、効果の発生源（このクリーチャー）のパワー以下になるように選ぶ */
  maxTotalPowerOfSource?: boolean;
  owner: 'self' | 'opponent' | 'any';
  zone: 'battle' | 'mana' | 'shield' | 'graveyard' | 'hand' | 'deck' | 'hyperspatial';
  /** 'all' は条件に合うものすべて（選択なし） */
  count: number | 'all';
  /** 選んだカードのコストの合計の上限（「コストの合計がN以下になるように」） */
  maxTotalCost?: number;
  /** 直前に選んだ（捨てた）カードのコスト以下だけ（「こうして捨てた手札以下のコストを持つ〜」） */
  maxCostOfChosen?: boolean;
  /** 持ち主のマナゾーンのカードの枚数以上のコストを持つものだけ（「自身のマナゾーンにあるカードの枚数以上のコストを持つ」） */
  minCostOwnerMana?: boolean;
  /** 選んだカードのパワーの合計の上限（「パワーの合計がN以下になるよう」） */
  maxTotalPower?: number;
  /** true なら 0〜count 枚の範囲で選べる（「〜まで」） */
  upTo?: boolean;
  filter?: CardFilter;
  /** 誰が選ぶか。owner は「相手は自分の〜を選ぶ」 */
  chooser?: 'controller' | 'owner';
  /**
   * 選ばずに決まった相手を指す：event は誘発の原因になったカード（「相手のクリーチャーが出た時、そのクリーチャーは〜」）、
   * chosen は同じ能力で直前に選んだ（動かした）カード（「〜を1体選び、タップする。それはアンタップしない」）
   */
  ref?: 'event' | 'chosen';
  /** エンジン内部用：ref: 'event' を誘発の時に決めたカード */
  iids?: string[];
  /** ref で指すカードの中から選ぶ（「その中からカードを1枚」）。選んでも「直前に選んだカード」は変えない */
  refPick?: boolean;
  /** ref で指すカードが、どのゾーンにあってもよい（「その呪文を相手の墓地から唱える」「選んだ呪文を唱える」） */
  anyZone?: boolean;
  /** zone のほかに選べるゾーン（「自分の手札または墓地から」） */
  extraZones?: TargetSpec['zone'][];
  /** エレメント（バトルゾーンのクリーチャー以外のカード＝フィールド・タマシード・クロスギア・ドラグハートなども含む）から選ぶ */
  element?: boolean;
  /** 候補からこの数だけ選んで残し、残りすべてに行う（「3枚ずつ選び、残りを墓地に置く」）。count は 'all' にする */
  keep?: number;
}

/** 数を数える式（条件判定用） */
export interface Quantity {
  /** any: 両方のプレイヤー */
  who: 'self' | 'opponent' | 'any';
  /** under: 効果の発生源（このクリーチャー）の下にあるカード */
  zone: 'battle' | 'mana' | 'shield' | 'graveyard' | 'hand' | 'deck' | 'under';
  filter?: CardFilter;
  /** バトルゾーンを数える時、クリーチャー以外（タマシード・フィールド）も数える */
  withPermanents?: boolean;
  /** 枚数ではなく、異なるコストの種類を数える（「コストが異なる自分のクリーチャー1体につき」） */
  distinctCost?: boolean;
}

export type Condition =
  /** rightPlus: 右辺に足す数（「相手のクリーチャーが自分より4体以上多く」） */
  | { type: 'compare'; left: Quantity; op: '>' | '>=' | '<' | '<=' | '=='; right: Quantity | number; rightPlus?: number }
  /** 直前に選んだ（動かした）カードが、すべて異なる名前 */
  | { type: 'chosenDistinctNames' }
  /** 直前の「その中から選ぶ」効果で、何も選ばなかった（「こうして実行しなければ」） */
  | { type: 'didNot' }
  | { type: 'not'; condition: Condition }
  | { type: 'and'; conditions: Condition[] }
  | { type: 'or'; conditions: Condition[] }
  /** このクリーチャーがこのターンに攻撃していた */
  | { type: 'attackedThisTurn' }
  /** このカード自身が進化クリーチャー（「これが進化クリーチャーなら」） */
  | { type: 'selfIsEvolution' }
  /** このターンにそのプレイヤーが呪文を唱えていた（「そのターン自分が呪文を唱えていれば」） */
  | { type: 'castThisTurn'; who: 'self' | 'opponent' }
  /**
   * このターンに、そのプレイヤーが min 回以上〜した（attacks: クリーチャーが攻撃した、draws: カードを引いた、played: filter に合うカードを使った）
   * 「このターンに他のクリーチャーが攻撃していなければ」「このターンに自分がカードを2枚以上引いていなければ」は not で包む
   */
  | { type: 'turnTally'; what: 'attacks' | 'draws' | 'played'; who: 'self' | 'opponent'; min: number; filter?: CardFilter }
  /** このターン、クリーチャーを召喚していれば */
  | { type: 'summonedThisTurn'; who: 'self' | 'opponent' }
  /** このターンにそのプレイヤーのシールドが min 個以上ブレイクされた */
  | { type: 'shieldsBrokenThisTurn'; who: 'self' | 'opponent'; min: number }
  /** このクリーチャーが、このターンに出た（「このクリーチャーが出たターン、〜」） */
  | { type: 'selfEnteredThisTurn' }
  /** 誘発の原因になったクリーチャーが、コストを支払わずに出ていた（iid はエンジンが誘発の時に入れる） */
  | { type: 'subjectEnteredFree'; iid?: string }
  /** このターンに出たクリーチャーの数が min 以上（who: 誰のクリーチャーか） */
  | { type: 'enteredThisTurn'; who: 'self' | 'opponent' | 'any'; min: number }
  /** このターンに、そのプレイヤーのクリーチャーがコストを支払わずに出ていた */
  | { type: 'enteredFreeThisTurn'; who: 'self' | 'opponent' }
  /** いまの攻撃が、このターン最初の攻撃（ターンプレイヤーのクリーチャーによる攻撃の1回目） */
  | { type: 'firstAttackThisTurn' }
  /** いまの攻撃が、このターンのN回目の攻撃（ターンプレイヤーのクリーチャーによる） */
  | { type: 'nthAttackThisTurn'; n: number }
  /** このターン、そのプレイヤーが名前に name を含むクリーチャーをバトルゾーンに出した */
  | { type: 'enteredNamedThisTurn'; who: 'self' | 'opponent'; name: string }
  /** このクリーチャーにクロスギアがクロスされている（any: 自分のクリーチャーのどれかにクロスされている。min: クロスされている数） */
  | { type: 'crossed'; any?: boolean; min?: number }
  /** このカード（クロスギア）がクリーチャーにクロスされている（「このカードがどのクリーチャーにもクロスされていない時」は not で包む） */
  | { type: 'gearAttached' }
  /**
   * クリーチャーの出方：self ならこのクリーチャー、そうでなければ誘発の原因になったクリーチャー（iid はエンジンが誘発の時に入れる）。
   * summoned: 召喚で出た／from: そのゾーンから出た（notFrom: そのゾーン以外から出た）
   */
  | { type: 'entry'; self?: boolean; iid?: string; summoned?: boolean; from?: ZoneName[]; notFrom?: ZoneName[] }
  /** このクリーチャーが攻撃中 */
  | { type: 'selfAttacking' }
  /** バトルゾーンにあるカード（両方のプレイヤー）の文明の種類が min 以上（「バトルゾーンに5文明すべてのカードがそろっていれば」） */
  | { type: 'civsInBattle'; min: number }
  /** シールド・フォースで選んだシールドが、まだシールドゾーンにある */
  | { type: 'shieldForce' }
  /** このクリーチャーがG・リンクしている */
  | { type: 'godLinked' }
  /** このクリーチャーのパワーを比べる（「そのパワーが0より大きければ」） */
  | { type: 'selfPower'; op: '>' | '>=' | '<='; value: number }
  /** このクリーチャーがタップしている */
  | { type: 'selfTapped' }
  /** このターンに、そのプレイヤーのクリーチャーがバトルに勝っていた */
  | { type: 'wonBattleThisTurn'; who: 'self' | 'opponent' }
  /** いまが相手のターン（S・トリガーで使った時の追加能力の判定用） */
  | { type: 'opponentTurn' }
  /** いまが追加ターン（「追加ターン中でなければ」） */
  | { type: 'inExtraTurn' }
  /** このクリーチャーの下に min 枚以上カードがある */
  | { type: 'underCount'; min: number }
  /** このターンに、そのプレイヤーがマナゾーンのカードをタップせずにクリーチャーを出すか呪文を唱えていた */
  | { type: 'playedFreeThisTurn'; who: 'self' | 'opponent' }
  /** このクリーチャーが「革命チェンジ」で出ていた */
  | { type: 'enteredByRevolution' }
  /** このターンに、その名前の能力をすでに使っていた（「そのターン中に他の「ファイナル革命」をまだ使っていなければ」は not で包む） */
  | { type: 'usedThisTurn'; key: string }
  /** 直前に選んだ（動かした）カードが条件に合う（「自分の山札の上から1枚目をマナゾーンに置く。それがドラゴンなら、〜」） */
  | { type: 'chosenMatches'; filter: CardFilter };

/** 効果でカードを動かす先（deckTop / deckBottom は山札の上 / 下） */
/** under: 効果の発生源（このクリーチャー）の下に置く */
/** shieldTop: 表向きにして、持ち主のシールド1つの上に置く（シールドがなければ表向きの新しいシールドにする） */
export type MoveDest = 'hand' | 'mana' | 'graveyard' | 'shield' | 'deckTop' | 'deckBottom' | 'battle' | 'under' | 'shieldTop' | 'hyperspatial';

/** 構造化された効果定義 */
export type EffectDef =
  /** upTo: 0〜count 枚の範囲で引く枚数を選ぶ（「N枚まで引く」） */
  | { type: 'draw'; count: number; upTo?: boolean }
  | { type: 'addManaFromDeck'; count: number }
  | { type: 'addShieldFromDeck'; count: number }
  /** 山札の上から N 枚を指定ゾーンへ（墓地肥やし・マナ加速など） */
  /** who: chosenOwner は直前に選んだカードの持ち主の山札（「そのプレイヤーは自身の山札の上から〜」）。shieldTop は表向きにして自分のシールド1つの上に置く */
  | { type: 'deckTopTo'; count: number; to: 'graveyard' | 'mana' | 'shield' | 'hand' | 'under' | 'shieldTop'; who?: 'self' | 'opponent' | 'chosenOwner'; tapped?: boolean }
  /** カードを選ぶだけ（動かさない）。選んだカードは後の文の「それ」「その2体」で指す。reveal: 選んだカードを見る（シールドなど） */
  | { type: 'choose'; target: TargetSpec; reveal?: boolean }
  /** その名前の能力をこのターンに使ったことを記録する（usedThisTurn で調べる） */
  | { type: 'markUsed'; key: string }
  /** 「このターン、次に召喚する自分のクリーチャーのコストをN少なくする」。grant はそのクリーチャーがこのターン得る能力 */
  | { type: 'nextSummonDiscount'; amount: number; min: number; grant?: Partial<Keywords> }
  /** 「相手は〜してもよい」：相手が選んで、相手が行う（effects は相手から見た効果） */
  | { type: 'opponentMay'; effects: EffectDef[] }
  | { type: 'destroy'; target: TargetSpec }
  /**
   * カードを動かす共通の効果：対象（どこの・どのカードを・何枚）を移動先へ。
   * 手札に戻す・マナ送り・墓地送り・シールド化・山札の上/下・バトルゾーンに出す はすべてこれで表す。
   * tapped: タップして置く。faceUp: 表向きで置く（シールドゾーン）。grant: バトルゾーンに出したクリーチャーに与える能力
   */
  /** withGears: そのクリーチャーにクロスされているクロスギアも同じところへ（「そのクリーチャーとそれにクロスされているクロスギアをすべて」） */
  | { type: 'move'; target: TargetSpec; to: MoveDest; tapped?: boolean; faceUp?: boolean; grant?: { keywords: Keywords; untilNextTurn?: boolean }; withGears?: boolean }
  /**
   * 選んだクロスギアを、コストを支払わずにクロスする。to: self はこのクリーチャーに、choose は自分のクリーチャーを1つずつ選んで。
   * iids: エンジン内部用（クロス先を聞いているクロスギア）
   */
  | { type: 'attachGear'; target: TargetSpec; to: 'self' | 'choose'; iids?: string[] }
  | { type: 'tap'; target: TargetSpec }
  | { type: 'untap'; target: TargetSpec }
  /** @deprecated 旧形式（保存済みのデータ用）。エンジンが move に読み替える */
  | { type: 'bounce' | 'toHand' | 'toGraveyard' | 'toShield' | 'toDeckBottom' | 'toDeckTop' | 'shieldToHand' | 'graveyardToHand'; target: TargetSpec }
  /** @deprecated 旧形式。move（to: 'mana'）に読み替える */
  | { type: 'toMana'; target: TargetSpec; tapped?: boolean }
  /** @deprecated 旧形式。move（to: 'battle'）に読み替える */
  | { type: 'putIntoBattle'; target: TargetSpec; grant?: { keywords: Keywords; untilNextTurn?: boolean } }
  /** ツインパクトの呪文側を唱えた後、このカードをバトルゾーンに出す（「このカードを出す」） */
  | { type: 'putSelfIntoBattle' }
  /** 手札を見ないで選んで捨てさせる（self: 自分の手札を相手に選ばせる。perChosen: 直前に選んだ（捨てた）カード1枚につき count 枚） */
  | { type: 'discardRandom'; count: number; self?: boolean; perChosen?: boolean }
  /** 山札の上から count 枚を見て、条件に合うものを pickCount 枚まで pickTo へ。残りは restTo へ */
  | {
      type: 'lookAtTop';
      count: number;
      pickCount: number;
      pickFilter?: CardFilter;
      /** none: 選ぶだけで動かさない（後の文の「選んだ呪文を唱える」で使う） */
      pickTo: 'hand' | 'battle' | 'mana' | 'shield' | 'graveyard' | 'deckBottom' | 'none';
      /** 選んだカードをタップして置く（マナゾーン） */
      pickTapped?: boolean;
      /** 選んだカードを表向きで置く（シールドゾーン） */
      pickFaceUp?: boolean;
      /** 行き先をもう1つから選べる（「手札に加えるかマナゾーンに置く」） */
      pickToAlt?: 'hand' | 'mana' | 'shield';
      /** 続けて選ぶ分（「1枚をシールド化し、1枚をマナゾーンに置き、残りを〜」の2つ目以降） */
      more?: { pickCount: number; pickFilter?: CardFilter; pickTo: 'hand' | 'battle' | 'mana' | 'shield' | 'graveyard'; mustPick?: boolean; pickTapped?: boolean }[];
      /** エンジン内部用：見ているカード（続けて選ぶ時の残り） */
      from?: string[];
      /** top: 山札の上に残す */
      restTo: 'deckBottom' | 'graveyard' | 'mana' | 'shuffle' | 'top';
      /** 相手の山札を見る（「相手の山札を見る。その中から1枚選び、持ち主の墓地に置いてもよい」） */
      deckOf?: 'opponent';
      /** 条件に合うものをすべて選ぶ（選択なし） */
      pickAll?: boolean;
      /** 選んだカードのコストの合計の上限（「コストの合計が6以下になるように好きな数選び」） */
      pickMaxTotalCost?: number;
      /** 選べるなら必ず pickCount 枚選ぶ（「〜てもよい」でない） */
      mustPick?: boolean;
      /** opponent：相手に選ばせる */
      chooser?: 'opponent';
    }
  /** 山札をシャッフルする（both: 両方のプレイヤー） */
  | { type: 'shuffleDeck'; both?: boolean }
  /** 自分の墓地のカードをすべて山札に加えてシャッフルする */
  | { type: 'graveyardToDeck' }
  /** 山札の上から1枚目を公開し、クリーチャーなら出してもよい／呪文なら唱えてもよい／それ以外は otherwise へ */
  | { type: 'revealTopCard'; ifCreature?: 'battle'; ifSpell?: 'cast'; otherwise?: 'mana' }
  /** 相手に自分のシールドを1つ選ばせて見る。呪文ならコストを支払わずに唱えてもよい（ラッキー・ダーツ） */
  | { type: 'shieldGamble' }
  /** 超魂レイド：山札の上から3枚を表向きにし、このクリーチャーの進化元になれるカードを1枚この下に置いてもよい。残りは山札の下へ */
  | { type: 'soulRaid' }
  /** 覚醒リンク：条件のクリーチャーがそろっていれば、このクリーチャーと裏返してリンクする */
  | { type: 'awakenLink' }
  /** 自分の封印を count 枚まで墓地に置く（封印の付いたカードを選び、その封印から外す） */
  | { type: 'removeOwnSeals'; count: number }
  /**
   * 手札から条件に合うカードを1枚、コストを支払わずに使ってもよい（maxCostHandSize: コストが手札の枚数以下）。
   * zones: 手札以外からも使える（「自分の手札または墓地から」）。spellAfter: 唱えた呪文を墓地のかわりに置く場所（山札の下・手札）
   */
  | { type: 'playFromHandFree'; filter?: CardFilter; maxCostHandSize?: boolean; zones?: Array<'hand' | 'graveyard'>; spellAfter?: 'deckBottom' | 'hand' }
  /** 同じ名前のカードが2枚以上あるものをすべて、バトルゾーンなら破壊し、マナゾーンなら持ち主の墓地に置く */
  | { type: 'destroyDuplicates'; zone: 'battle' | 'mana' }
  /** エンジン内部用：公開したカードを出す／唱える（てもよい）。しなければそのまま */
  | { type: 'playRevealed'; iid: string; as: 'creature' | 'spell' }
  /** 相手のシールドをブレイクする（S・トリガー可） */
  /** self: 自分のシールドをブレイクする（G・ブレイカーの「その攻撃の後、自分のシールドをすべてブレイクする」） */
  | { type: 'breakShields'; count: number; self?: boolean }
  | { type: 'extraTurn' }
  /** ターンの残りをとばす（攻撃・ターンの終わりの処理をせず、すぐに次のターンを始める） */
  | { type: 'skipRestOfTurn' }
  /** そのプレイヤー（効果の持ち主）がゲームに勝つ */
  | { type: 'winGame' }
  /** Dスイッチ：このD2フィールドを上下逆さまにする（ゲーム中に一度） */
  | { type: 'dSwitchFlip' }
  /** 手札・墓地にあるこのカードの「ゾーンからの誘発」（zoneGates の gate 番目）を処理する */
  | { type: 'zoneGate'; gate: number }
  /** 「ゲーム中で一度」の能力を使ったことを記録する */
  | { type: 'useOnce' }
  /**
   * 効果の発生源（このクリーチャー）自身に対する処理。移動先（MoveDest）なら move と同じ移動をする。
   * 'toHand' / 'toMana' は旧形式（'hand' / 'mana' と同じ）。tapped: タップして置く
   */
  | { type: 'selfAction'; action: 'destroy' | 'tap' | 'untap' | 'toHand' | 'toMana' | Exclude<MoveDest, 'battle' | 'under' | 'shieldTop'>; tapped?: boolean }
  /** ターン終了時まで、パワーを変更する */
  | { type: 'powerMod'; target: TargetSpec | 'self'; amount: number; untilNextTurn?: boolean; untilLeave?: boolean; perCount?: Quantity }
  /** ターン終了時まで、キーワード能力を与える */
  /** untilNextTurn: 次の自分のターンのはじめまで（省略時はこのターン） */
  | { type: 'grantKeyword'; target: TargetSpec | 'self'; keywords: Keywords; untilNextTurn?: boolean }
  /** ターン終了時まで有効な常在効果（例：このターン、相手のクリーチャーは攻撃できない） */
  /** onlyOpponentTurn: 相手のターンの間だけ有効（「次の相手のターン中、」） */
  /** untilNextTurnEnd: 次の自分のターンの終わりまで */
  /** forGame: 残りのゲーム中ずっと有効（「残りのゲーム中、〜」） */
  | { type: 'turnStatic'; static: StaticAbility; untilNextTurn?: boolean; untilNextTurnEnd?: boolean; onlyOpponentTurn?: boolean; forGame?: boolean }
  /**
   * コストが同じカードが count 枚出るまで、自分の山札の上からカードを表向きにする。表向きにしたカードは山札の上に残り、
   * 後の文の「表向きにしたカード」で指せる（lastChosen）。山札をすべて表向きにした（そろわなかった）時は lastDid が true
   */
  | { type: 'revealUntilSameCost'; count: number }
  | { type: 'conditional'; condition: Condition; then: EffectDef[]; else?: EffectDef[] }
  /** モード選択（「次の中から1つ選ぶ」） */
  /** times: 選ぶ回数（「次の中から2回選ぶ」）。distinct: 同じものは選べない */
  /** bothIf: この条件を満たしていれば、すべての選択肢を選んでもよい（「〜があれば、両方選んでもよい」） */
  | { type: 'chooseOne'; options: { label: string; effects: EffectDef[] }[]; times?: number; distinct?: boolean; bothIf?: Condition }
  /** 効果の途中の「〜してもよい」：使うかどうかを聞いてから行う（選択肢の中など） */
  | { type: 'optional'; effects: EffectDef[]; /** 「そうしなければ、〜」：使わなかった時に行う効果 */ otherwise?: EffectDef[] }
  /**
   * このクリーチャーと選んだクリーチャーをバトルさせる。
   * fighter: chosen なら、このクリーチャーのかわりに直前に選んだ（出した）クリーチャーがバトルする
   */
  | { type: 'fight'; target: TargetSpec; fighter?: 'chosen' }
  /** 選んだ2体をバトルさせる（「クリーチャーを2体選ぶ。その2体をバトルさせる」） */
  /** eachSide: 自分と相手のクリーチャーを1体ずつ選ぶ（mine: エンジン内部用、選んだ自分のクリーチャー） */
  | { type: 'fightPair'; target: TargetSpec; eachSide?: boolean; mine?: string }
  /** ガチンコ・ジャッジ：互いに山札の上を公開し、自分のコストが相手以上なら勝ち（then を処理）。公開したカードは山札の下へ */
  /** power: パワー・ガチンコ・ジャッジ（パワーを比べる）。lose: 負けた時の処理（「自分が負けたら、〜」） */
  | { type: 'gachinko'; then: EffectDef[]; power?: boolean; lose?: EffectDef[] }
  /** エンジンでは処理しない。ログに出してプレイヤーの手動操作に委ねる */
  /** 封印を1つ付ける（封印は、付けられるカードの持ち主の山札の上から1枚目を裏向きで重ねる） */
  | { type: 'seal'; target: TargetSpec }
  /** メテオバーン：このクリーチャーの下にあるカードを count 枚墓地に置く（置いたカードを「選んだカード」として覚える） */
  | { type: 'discardUnder'; count: number }
  /** 直前の効果でカードを1枚以上選んだ（動かした）時だけ続きを処理する（「〜してもよい。そうしたら、〜」）。n: エンジン内部用（選んだ枚数） */
  | { type: 'ifChosen'; then: EffectDef[]; n?: number }
  /** マジボンバーN：山札の上から1枚目を見て、コストN以下のクリーチャーを1体、手札または山札の上から出してもよい */
  | { type: 'magibomber'; maxCost: number }
  /**
   * シールド・プラス：自分の山札の上から count 枚を、裏向きのまま自分のシールド1つの下に置く（重ねた束を1つのシールドと数える）。
   * upTo: count 枚まで。each: 自分の各シールドの下に1枚ずつ（スーパー・シールド・プラス）
   */
  | { type: 'shieldPlus'; count: number; upTo?: boolean; each?: boolean }
  /** エンジン内部用：手札（墓地）にあるカードを、コストを支払わずに使うか聞く（手札にある間の誘発） */
  | { type: 'handPlay'; iid: string; endOfTurn?: 'deckBottom'; ninja?: boolean; spellAfter?: 'deckBottom'; onceKey?: string; debt?: number }
  /** GR召喚：自分の超GRゾーンの上から count 枚を、1枚ずつ召喚する */
  | { type: 'grSummon'; count: number }
  /** 「その攻撃の後、〜」：いまの攻撃が終わった後に行う */
  | { type: 'afterAttack'; effects: EffectDef[] }
  /** 数字を1つ選ぶ（後の文の「その数字と同じコストの」で使う） */
  | { type: 'chooseNumber' }
  /**
   * このカードを裏返す（覚醒・龍解・解除・ループ覚醒）。
   * to: back は裏面（コストの大きいほう・クリーチャー側）、front は表面、toggle はいまと反対の面。untap: 裏返した後アンタップする
   */
  | { type: 'flipSelf'; to: 'back' | 'front' | 'toggle'; untap?: boolean }
  /** このクリーチャーの一番上のカードを破壊する（下のカードがクリーチャーとして残る） */
  | { type: 'destroyTopCard' }
  /**
   * 選んだカードの中から、持ち主が1枚選んで手札に戻し、残りを破壊する（マナゾーンのカードは墓地に置く）。
   * picked: エンジン内部用（選んだカード）
   */
  | { type: 'splitFate'; target: TargetSpec; picked?: string[] }
  /** このカードの呪文側を、コストを支払わずに唱える（ラスト・バースト：破壊された後、墓地などにあるこのカード） */
  | { type: 'castSelfTwin' }
  /** このカードの呪文側を、バトルゾーンに置いたままコストを支払わずに唱える（スマッシュ・バースト） */
  /** target: 「自分のツインパクトクリーチャー1体の呪文側を」：選んだクリーチャーの呪文側（なければこのクリーチャー） */
  | { type: 'castOwnTwin'; target?: TargetSpec }
  /** 対象のカードを、コストを支払わずに使う（唱える・出す）。「その呪文を」「選んだ呪文を」は target.ref で指す */
  | { type: 'playFree'; target: TargetSpec }
  /** 相手の手札を見る */
  | { type: 'lookAtHand' }
  /** 選んだクリーチャーを、それぞれタップまたはアンタップする。iid: エンジン内部用（どちらにするか聞いているクリーチャー） */
  | { type: 'tapOrUntap'; target: TargetSpec; iid?: string }
  /** エンジン内部用：山札から選んだカードの行き先を、1枚ずつ2つの中から選ぶ */
  | { type: 'chooseDest'; iids: string[]; options: ('hand' | 'battle' | 'mana' | 'shield' | 'graveyard')[] }
  /**
   * 条件に合うカードが count 枚出るまで、山札の上から表向きにする。出たカードを to へ、残りを restTo へ
   * （「ファイアー・バードが3体出るまで表向きにし、その3体を出す。その後、山札をシャッフルする」）
   */
  | { type: 'revealUntil'; filter: CardFilter; count: number; to: 'hand' | 'battle'; restTo: 'graveyard' | 'shuffle' | 'deckBottom' }
  /** 「次の能力をN回まで使う」：使うかどうかを1回ずつ聞く */
  | { type: 'upToTimes'; times: number; effects: EffectDef[] }
  /**
   * バズレンダ：出た時に [OL] 能力（effects）を1回と、追加で cost を支払った回数使う。
   * 追加の支払いは、コストを支払って出た時だけ、この効果を処理する時に回数を選んでマナをタップする
   */
  | { type: 'buzzRenda'; cost: number; effects: EffectDef[] }
  /** ダイナモ：自分の他のダイナモ1体を選び、そのターンの終わりまで、このクリーチャーのパワーと能力を加える */
  | { type: 'dynamo' }
  /** シールド・フォース：自分のシールドを1つ選んでもよい（選んだシールドがある間、{l} 能力が働く） */
  | { type: 'shieldForce' }
  /** 自分の墓地にあるカードすべてと、マナゾーンにあるカードすべてを入れ替える */
  | { type: 'swapGraveMana' }
  /** G・リンク：このクリーチャーを、つながる自分のゴッドにリンクしてもよい */
  | { type: 'godLink' }
  /** ゴッドのリンクをすべて外す（who: そのゴッドの持ち主） */
  | { type: 'godUnlink'; who: 'self' | 'opponent' | 'any' }
  /** このターンの終わりに effects を行う（「このターンの終わりに、自分のクリーチャーを1体破壊する」） */
  | { type: 'atTurnEnd'; effects: EffectDef[] }
  /**
   * 選んだクリーチャーの能力を1つ使う（「その〜の「このクリーチャーが出た時」で始まる能力を1つ使う」、キズナの [P] 能力、Jビッグ）。
   * jbig: 「Jビッグ」の能力は使わない
   */
  | { type: 'useAbilityOf'; target: TargetSpec; when: TriggerEvent; jbig?: boolean }
  /**
   * 「〜1体につき、〜する」：数えた数だけ effects を行う（引く枚数・選ぶ数は掛け算にする）。
   * per: 'chosen' は直前の効果で選んだ（動かした）カードの数（「こうして破壊したクリーチャー1体につき」）。n: エンジン内部用
   */
  | { type: 'repeat'; per: Quantity | 'chosen'; unit: number; effects: EffectDef[]; n?: number }
  | { type: 'manual'; text: string };

export const TRIGGER_EVENTS = [
  'onSummon',
  /** 各ターン、自分のN体目のクリーチャー（このクリーチャー自身を含む）が出た時 */
  'onOwnNthEnter',
  /** 自分（または相手）の他のクリーチャーがバトルに勝った時 */
  'onOtherBattleWin',
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
  /** カードを引いた時（who で誰が引いたか、minDrawCount でそのターン何枚目以降か） */
  'onDraw',
  /** 他のクリーチャーが攻撃する時・破壊された時・離れた時（who・filter で絞る） */
  'onOtherAttack',
  /** 他のクリーチャーがプレイヤーを攻撃する時（「相手のクリーチャーが自分を攻撃する時」） */
  'onOtherAttackPlayer',
  'onOtherDestroyed',
  'onOtherLeave',
  /** このクリーチャーの攻撃の終わりに */
  'onAttackEnd',
  /** このクリーチャーが禁断解放した時 */
  'onUnleash',
  /** このクリーチャーがタップした時（攻撃・効果） */
  'onTap',
  /** このクリーチャーが攻撃された時 */
  'onAttacked',
  /** このクリーチャーが相手に選ばれた時（相手の能力の対象として選ばれた） */
  'onTargeted',
  /** カードがシールドゾーンに置かれた時（who で誰のシールドゾーンか） */
  'onShieldAdded',
  /** 手札を捨てた時（who で誰が捨てたか） */
  'onDiscard',
  /** カードを使った（実行した）時（who で誰が使ったか） */
  'onPlay',
  /** 呪文を唱えた時（who で誰が唱えたか） */
  'onSpellCast',
  /** シンカパワー：このクリーチャーが進化する時（上に進化クリーチャーが置かれた時。効果は進化した後のクリーチャーが使う） */
  'onEvolved',
  /** カードがこのクリーチャーの下を離れた時（メテオバーンなどで、下のカードだけが離れた時） */
  'onUnderLeft',
  /** カードが自分のクリーチャーの下を離れた時（このクリーチャー自身も含む） */
  'onOwnUnderLeft',
  /** カードがシールドゾーンを離れた時（who で誰のシールドゾーンか） */
  'onShieldLeft',
  /** このクリーチャーがシールドをブレイクした時（1回のブレイクで1度） */
  'onBreak',
  /** 他のクリーチャーがシールドをブレイクした時（who・filter で絞る） */
  'onOtherBreak',
  /** このクリーチャーがバトルゾーンから墓地に置かれた時（「このカードが墓地に置かれた時、その直前にバトルゾーンにあれば」） */
  'onToGraveFromBattle',
  /** このクリーチャーが覚醒した時・龍解した時（裏返ってクリーチャー側・コストの大きい側になった時） */
  'onAwaken',
  /** このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時 */
  'onUnblocked',
  /** このクリーチャーにクロスギアをクロスした時 */
  'onCrossed',
  /** 「（このクリーチャーで）攻撃するかわりに、タップして次の能力を使ってもよい」の能力（TAP_ABILITY で使う） */
  'onTapAbility',
  /** このクリーチャーの各ブレイクの前に（攻撃によるブレイクを1つずつに分け、その前に誘発する） */
  'onBeforeBreak',
  /** このクリーチャーの「EXライフ」シールドが離れた時 */
  'onExLifeLeft',
  /** このカード自身がゾーンを移った時（movedFrom → movedTo。「手札からマナゾーンに置いた時」「超次元ゾーンに置かれた時」）。移った先のゾーンにある間に誘発する */
  'onSelfMoved',
  /** 自分のマナゾーンにカードが置かれた時（スペース・チャージ。filter は置かれたカード） */
  'onManaPut',
  /** 他のクリーチャーの攻撃の終わりに */
  'onOtherAttackEnd',
  /** 他のクリーチャーがタップした時 */
  'onOtherTap',
  /** これ（オーラ）をクリーチャーに付けた時 */
  'onAttached',
  /** [P] 能力（キズナで使う。出来事では誘発しない） */
  'onLabelP',
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
  /** 各ターンに1度だけ */
  oncePerTurn?: boolean;
  /** onDraw：そのターンに引いた枚数がこれ以上の時だけ（「2枚目以降のカードを引いた時」） */
  minDrawCount?: number;
  /** onOwnNthEnter：そのターンの何体目のクリーチャーが出た時か */
  nthEnter?: number;
  /** 発動条件（「〜なら」） */
  condition?: Condition;
  /** onSelfMoved：移る前・移った後のゾーン（どちらも省略できる） */
  movedFrom?: ZoneName;
  movedTo?: ZoneName;
  /** onOtherSummon：召喚以外の方法（効果など）で出た時だけ（「相手が召喚以外の方法でクリーチャーを出した時」） */
  byEffect?: boolean;
  /** onSummon：進化ではないクリーチャーの上に置いた（進化した）時だけ */
  evolvedOnNonEvolution?: boolean;
  /** Dスイッチ：ゲーム中に一度だけ（使ったら二度と聞かない） */
  dSwitch?: boolean;
  /** ゲーム中に一度だけ（使ったら二度と誘発しない。effects の useOnce で使ったことを記録する） */
  oncePerGame?: boolean;
  /** このターンの時だけ誘発する（「相手のターンにこのクリーチャーが出た時」は opponent） */
  duringTurn?: 'self' | 'opponent';
  /** 「これを装備したクリーチャーが〜時」：装備先のクリーチャーに起きた出来事で誘発する（ドラグハート・ウエポン） */
  viaEquip?: boolean;
}

/** 常在効果がかかる範囲 */
export interface Applies {
  owner: 'self' | 'opponent' | 'any';
  excludeSelf?: boolean;
  /** このクリーチャー自身だけ */
  onlySelf?: boolean;
  /** これ（ドラグハート・ウエポン）を装備したクリーチャーだけ */
  equipped?: boolean;
  filter?: CardFilter;
}

/** 常在効果（バトルゾーンにある間、または turnStatic でターン終了まで有効） */
export type StaticAbility = (
  /** perCount: amount を「〜1枚につき」の数だけ掛ける */
  | { type: 'powerMod'; amount: number; appliesTo: Applies; attackingOnly?: boolean; perCount?: Quantity; battleOnly?: boolean }
  | { type: 'grantKeyword'; keywords: Keywords; appliesTo: Applies }
  /**
   * 手札のカードのコストを増減する。コストは minCost（既定1）未満にならない。
   * firstPerTurn: 各ターン、条件に合うカードを使うまでの1枚目だけ（「各ターン、自分の闇のクリーチャー1体目の」）
   */
  | { type: 'costMod'; amount: number; appliesTo: Applies; minCost?: number; firstPerTurn?: boolean }
  /** 自分のターンに1枚目のカードを引く時、もう1枚余分に引いてもよい */
  | { type: 'extraTurnDraw' }
  /** 誰も、自身のマナゾーンの呪文カードをアンタップできない */
  | { type: 'manaSpellsStayTapped' }
  /** 相手のクリーチャーが出て、相手のクリーチャーの能力がトリガーする時、かわりにその能力はトリガーしない */
  | { type: 'suppressEnterTriggers' }
  /** 自分は、このクリーチャーよりパワーが小さいクリーチャーに攻撃されない（プレイヤーへの攻撃を防ぐ） */
  | { type: 'protectFromWeaker' }
  | { type: 'cannotSummon'; who: 'self' | 'opponent' | 'both'; filter?: CardFilter }
  | { type: 'cannotCast'; who: 'self' | 'opponent' | 'both'; filter?: CardFilter }
  /** カードをマナゾーンにタップして置く（「相手はカードをマナゾーンに置く時、タップして置く」） */
  | { type: 'manaEntersTapped'; who: 'self' | 'opponent' | 'both' }
  /** 各ターンに使える（出せる）数の上限（「相手は各ターン1回までしか呪文を唱えられない」「各ターン1体までしかクリーチャーを出せない」） */
  /** what: attack/block は「各ターン1度しか、クリーチャーで攻撃もブロックもできない」（ガードマンはブロックに数えない） */
  | { type: 'playLimit'; who: 'self' | 'opponent' | 'both'; what: 'spell' | 'creature' | 'attack' | 'block'; max: number }
  /** 自分のターンのはじめに、マナゾーンのカードを max 枚までしかアンタップできない（卍月 ガ・リュザーク 卍） */
  | { type: 'manaUntapLimit'; who: 'self' | 'opponent' | 'both'; max: number }
  /** 召喚以外の方法でクリーチャーが出る時、かわりに墓地に置く（who: そのクリーチャーを出すプレイヤー） */
  | { type: 'nonSummonEntryToGrave'; who: 'self' | 'opponent' | 'both' }
  /** 山札から手札以外のゾーンに置かれる時、かわりに墓地に置く（カレイコの黒像） */
  | { type: 'deckToGraveInstead'; who: 'self' | 'opponent' | 'both' }
  /** 条件に合うクリーチャーを出せない（召喚も、効果で出すこともできない。「相手は多色ではないクリーチャーを出せない」） */
  | { type: 'cannotEnter'; who: 'self' | 'opponent' | 'both'; filter?: CardFilter }
  /** 相手のカードによる「攻撃できない」効果を無視して攻撃できる */
  | { type: 'ignoreAttackLocks'; appliesTo: Applies }
  /** このクリーチャーは、数えた数 unit ごとに amount だけ多くシールドをブレイクする（クルー・ブレイカー） */
  | { type: 'breakerBonus'; amount: number; perCount: Quantity; unit: number }
  /** 条件に合うクリーチャーを、そのゾーンから召喚してもよい（「自分のターンに一度、魔導具クリーチャーを1体、自分の墓地から召喚してもよい」） */
  | { type: 'summonFromZone'; zone: 'graveyard' | 'mana'; filter?: CardFilter; oncePerTurn?: boolean }
  /** 自分の（filter に合う）呪文を唱えた後、墓地に置くかわりにこのフィールドの下に置いて draw 枚引いてもよい（卍 新世壊 卍） */
  | { type: 'spellToUnder'; filter?: CardFilter; draw: number }
  /** 自分の（filter に合う）呪文を唱えられなくする効果を無視する */
  | { type: 'ignoreCastLocks'; filter?: CardFilter }
  /** 条件に合う相手のクリーチャーはタップしてバトルゾーンに出る */
  | { type: 'opponentEntersTapped'; filter?: CardFilter }
  /**
   * 条件に合うクリーチャーがバトルゾーンに出る時、かわりに持ち主の to に置く（召喚でも効果でも）。
   * who: そのクリーチャーの持ち主（「相手の〜クリーチャーが出る時、相手はかわりにマナゾーンに置く」）
   */
  /** exceptFromHand: 手札から出る時は置き換えない（「手札以外のどこからでもバトルゾーンに出る時」） */
  | { type: 'enterInstead'; who: 'self' | 'opponent' | 'both'; filter?: CardFilter; to: 'graveyard' | 'mana' | 'hand'; exceptFromHand?: boolean }
  /**
   * そのプレイヤーはゲームに負けない（「自分はゲームに負けない」「相手はゲームに勝てない」はどちらも who: self）。
   * deckOutOnly: 山札がなくなった時だけ（「自分の山札にカードがなくなっても、自分はゲームに負けない」）
   */
  | { type: 'cannotLose'; who: 'self' | 'opponent' | 'both'; deckOutOnly?: boolean }
  /** 相手の呪文の効果やクリーチャーの能力によって、自分の手札は捨てられない */
  | { type: 'handProtected' }
  /** 条件に合う自分のカードは、マナゾーンにアンタップして置かれる（「自分のスノーフェアリー・カードをマナゾーンに置いた時、それをアンタップする」） */
  | { type: 'manaEntersUntapped'; filter?: CardFilter }
  /** 持ち主の zones 以外からはバトルゾーンに出ない（「相手のエレメントは、相手の手札以外から出ない」。who: カードの持ち主） */
  | { type: 'entryOnlyFrom'; who: 'self' | 'opponent' | 'both'; filter?: CardFilter; zones: Array<'hand' | 'deck'> }
) & {
  /** 有効なターン（「自分のターン中」= self）。省略時は常に有効 */
  duringTurn?: 'self' | 'opponent';
  /** 有効になる条件（「〜があれば」） */
  condition?: Condition;
};

/** 置換効果（「〜する時、かわりに…」） */
export interface ReplacementAbility {
  /** destroyed: 破壊される時 / leaveBattle: バトルゾーンを離れる時（破壊・バウンス・マナ送りなど） */
  event: 'destroyed' | 'leaveBattle';
  /** self: このクリーチャー / otherOwn: 自分の他のクリーチャー / anyOwn: 自分のクリーチャー / equipped: これ（クロスギア・ウエポン）をクロス・装備したクリーチャー */
  subject: 'self' | 'otherOwn' | 'anyOwn' | 'equipped';
  filter?: CardFilter;
  /** destroySelf: かわりにこのクリーチャーを破壊する（セイバー） / stay: とどまる */
  /** escape: かわりに自分のシールドを1つ手札に加える（エスケープ）。shedUnder: かわりに下のカードすべてが離れる（G-NEO進化） */
  /** seal: かわりにそのクリーチャーに封印を付ける（Dの禁断 ドキンダムエリア） */
  /** destroyOther: かわりに自分の他のクリーチャーを1体破壊する */
  /** unflip: かわりに表面（コストの小さいほう・フォートレス側）に裏返してとどまる（解除・龍回避） */
  /** shedTop: かわりに一番上のカードが離れる（スター進化。下のカードがクリーチャーとして残る） */
  /** faceUpShieldToGrave: かわりにいずれかのシールドゾーンにある表向きのカードを1枚、持ち主の墓地に置く */
  /** avertCost: かわりに自分の表向きのカードを count 枚破壊するか、自分のシールドを shieldAlt 個墓地に置く（CRY-S-MAX進化） */
  /** payCards: かわりに自分のカードを動かす（pay。「かわりにカードを3枚、自分のマナゾーンから墓地に置いてもよい」） */
  instead: 'toHand' | 'toMana' | 'toShield' | 'toDeckBottom' | 'toDeckTop' | 'destroySelf' | 'stay' | 'escape' | 'shedUnder' | 'seal' | 'destroyOther' | 'shedTop' | 'unflip' | 'faceUpShieldToGrave' | 'avertCost' | 'underToDeckBottom' | 'payCards';
  pay?: { from: 'mana' | 'hand' | 'graveyard' | 'deckTop'; count: number; filter?: CardFilter; to: 'graveyard' | 'deckBottom' | 'deckShuffle' };
  /** 各ターンに1度だけ */
  oncePerTurn?: boolean;
  /** avertCost：かわりに墓地に置いてもよいシールドの数 */
  shieldAlt?: number;
  optional?: boolean;
  /** escape：手札に加えるシールドの数（既定1。足りなければ置換しない） */
  count?: number;
  /** destroyOther：クリーチャー以外の自分のカード（タマシード・フィールドなど）も選べる（「自分の表向きのカード」） */
  anyCard?: boolean;
  /** underToDeckBottom：自分がゲームに負ける時にも、かわりに使う（《大魔王 ウラギリダムス》） */
  alsoLose?: boolean;
  /** この条件を満たす時だけ置換する（マナ武装：「自分のマナゾーンに光のカードが5枚以上あれば」） */
  condition?: Condition;
}

export interface Keywords {
  blocker?: boolean;
  shieldTrigger?: boolean;
  speedAttacker?: boolean;
  /** シールドをブレイクする枚数（W・ブレイカー=2、T・ブレイカー=3） */
  breaker?: number;
  cannotAttackPlayers?: boolean;
  cannotAttack?: boolean;
  /** クリーチャーを攻撃できない（プレイヤーは攻撃できる） */
  cannotAttackCreatures?: boolean;
  /** 自分のターンのはじめにアンタップしない */
  noUntap?: boolean;
  /** 攻撃中のみパワー加算 */
  powerAttacker?: number;
  /** バトルに負けた場合、相手も破壊する */
  slayer?: boolean;
  /** バトルに勝ったら破壊される */
  suicideOnWin?: boolean;
  /** すべてのバトルに勝つ */
  winsAllBattles?: boolean;
  /** バトル中だけパワーに加える */
  battlePower?: number;
  /** ハンティング：バトル中、自分のハンター1体につきパワー+1000 */
  hunting?: boolean;
  /** ササゲールN：ディスペクターを召喚する時、このクリーチャーを破壊してコストをN少なくしてもよい */
  sasageru?: number;
  /** ハイパーエナジー：このカードを使う時、コストが異なる自分のクリーチャーを好きな数タップし、1体につきコストを2少なくする */
  hyperEnergy?: boolean;
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
  /** 唱えた後、墓地のかわりに手札に戻す（afterSummon：サイクロン。この呪文の直前にクリーチャーを召喚していれば） */
  spellToHand?: 'always' | 'afterSummon';
  /** S-MAX進化クリーチャー（2体以上あれば1体を残して手札に戻す） */
  sMax?: boolean;
  /** 自分がゲームに負ける時、かわりに自分の表向きのカードをこの数だけ破壊してもよい（鬼S-MAX進化） */
  avertLoss?: number;
  /** avertLoss のかわりに、自分のシールドをこの数だけ墓地に置いてもよい（CRY-S-MAX進化） */
  avertLossShield?: number;
  /** ブレイクしたシールドを手札に加えるかわりに置く場所（墓地は shieldBurn） */
  shieldBreakTo?: 'deckBottom' | 'deckTop';
  /** shieldBreakTo の後、各プレイヤーはその数だけカードを引く */
  shieldBreakEachDraws?: boolean;
  /** 唱えた後、墓地のかわりに自分の超次元ゾーンに置く */
  spellToHyperspatial?: boolean;
  /** 水晶チャージャー：唱えた後、墓地のかわりに裏向きでマナゾーンに置く */
  crystalCharger?: boolean;
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
  /** EXライフ：出る時に山札の上から1枚（エクストラEXライフは2枚）をシールド化し、離れる時かわりにそのシールドを1つ墓地に置く */
  exLife?: boolean;
  extraExLife?: boolean;
  /** メガ・ラスト・バースト：離れて手札・マナ・墓地に置かれた時、呪文側をコストを支払わずに唱えてもよい */
  megaLastBurst?: boolean;
  /** シールド・ゴー：破壊された時、墓地から表向きでシールド化する。表向きでシールドゾーンを離れる時、かわりに墓地に置く */
  shieldGo?: boolean;
  /** マナゾーンにタップして置かれる */
  manaTapped?: boolean;
  /** ガードマン：相手のクリーチャーが自分の他のクリーチャーを攻撃する時、攻撃先をこのクリーチャーに変更できる */
  guardman?: boolean;
  /** スーパーガードマン：相手のクリーチャーが攻撃する時、攻撃先をこのクリーチャーに変更できる */
  superGuardman?: boolean;
  /** 山札の最後の1枚を引く時、ゲームに負けるかわりに勝つ */
  winOnLastDraw?: boolean;
  /** コストN以下の呪文によって、相手がクリーチャーを選ぶ時、このクリーチャーは選べない */
  untargetableBySpellCost?: number;
  /** このカードがバトルゾーン以外のゾーンにあれば、持ち主はゲームに負ける */
  loseIfNotInBattle?: boolean;
  /** 出たターンに攻撃できない（スピードアタッカー・マッハファイターがあっても） */
  noAttackOnEnterTurn?: boolean;
  /** ターンのはじめ以外ではアンタップしない（効果でアンタップされない） */
  untapOnlyAtTurnStart?: boolean;
  /** 相手がクリーチャーを選ぶなら、可能ならこのクリーチャーを選ぶ */
  lure?: boolean;
  /** このクリーチャーの攻撃中、相手は「G・ストライク」を使えない */
  noGStrikeAgainst?: boolean;
  /** シールド・セイバー：自分のシールドがブレイクされる時、かわりにこのクリーチャーを破壊してもよい */
  shieldSaver?: boolean;
  /** ウェーブストライカーを持つ（数えるための印） */
  waveStriker?: boolean;
  /** シンカライズ：クリーチャーであるかのように、この上に進化クリーチャーを置いてもよい（タマシード） */
  shinkarize?: boolean;
  /** Zラッシュ：シールドが離れたら、次の自分のターンのはじめまでハイパーモードになる */
  zRush?: boolean;
  /** 相手のターンに相手のクリーチャーが出て、その能力がトリガーした時、自分もその能力を使ってもよい */
  mimicEnemySummon?: boolean;
  /** 相手のクリーチャーが攻撃するなら、可能ならこのクリーチャーを攻撃する */
  attackLure?: boolean;
  /** このクリーチャーよりパワーが小さいクリーチャーにブロックされない */
  unblockableBySmaller?: boolean;
  /** このクリーチャーよりコストが小さいクリーチャーに攻撃されない */
  cannotBeAttackedBySmallerCost?: boolean;
  /** バトルゾーンにタップして置かれる */
  entersTapped?: boolean;
  /** ブロック中だけパワーに加える（パワード・ブロッカー） */
  blockPower?: number;
  /** 条件（種族）に合うクリーチャーとのバトル中だけパワーに加える（「ゼニスとバトル中、パワーを+N」） */
  battlePowerVs?: { race: string; races?: string[]; amount: number };
  /** バトルゾーンを離れない（破壊・手札に戻すなど、どの方法でも。パワー0以下でも破壊されない） */
  cannotLeave?: boolean;
  /** 破壊以外の方法でバトルゾーンを離れない */
  cannotLeaveExceptDestroy?: boolean;
  /** 可能なら毎ターン攻撃する（攻撃できる間はターンを終われない） */
  mustAttack?: boolean;
  /** 攻撃するなら、可能ならクリーチャーを攻撃する */
  attackCreaturesIfAble?: boolean;
  /** 召喚以外の方法でバトルゾーンに出ない */
  summonOnly?: boolean;
  /** 攻撃1回にブレイクできるシールドの数の上限（「クリーチャーは攻撃1回につきシールドを1枚しかブレイクできない」） */
  maxBreakPerAttack?: number;
  /** パワーN以下のクリーチャーに攻撃もブロックもされない */
  immuneToPowerAtMost?: number;
  /** パワーN以下のクリーチャーとのバトル中、破壊されない */
  battleImmuneVsPowerAtMost?: number;
  /** クロスギアがクロスされた、タップされていないクリーチャーを攻撃できる */
  attackUntappedCrossed?: boolean;
  /** パワーが0以下の間、破壊されず、すべてのバトルに勝つ */
  immortalAtZeroPower?: boolean;
  /** パワーが0以下の間、バトルゾーンを離れない */
  stayAtZeroPower?: boolean;
  /** 各ターン、相手のクリーチャーがはじめて攻撃するなら、可能ならこのクリーチャーを攻撃する */
  attackLureFirst?: boolean;
  /** 出したターン、アンタップしているクリーチャーを攻撃できる */
  untappedTargetsOnEnterTurn?: boolean;
  /** パワーが min 以上の時、シールドを breaker 枚ブレイクする（「パワーが6000以上の時、「W・ブレイカー」を得る」） */
  breakerAtPower?: { min: number; breaker: number };
  /** マナゾーンにアンタップして置かれる（「このカードを自分の手札からマナゾーンに置いた時、アンタップする」） */
  manaUntapped?: boolean;
  /** ダイナモ：タップして、このクリーチャーのパワーと能力を自分の他のダイナモ1体に加える */
  dynamo?: boolean;
  /** この呪文を唱えられなくする効果を無視する */
  ignoreCastLocksSelf?: boolean;
  /** G・リンク：出す時、つながるゴッドにリンクしてもよい（左・右・中央） */
  gLink?: 'left' | 'right' | 'center';
  /** シールドをさらに N 枚ブレイクする（「このクリーチャーがリンクしていれば、シールドをさらに1枚ブレイクする」） */
  extraBreak?: number;
  /** 相手のターンに手札から捨てられる時、墓地に置くかわりにバトルゾーンに出す（may: 出してもよい） */
  discardToBattle?: 'always' | 'may';
}

/** 禁断の鼓動の裏側（禁断クリーチャー） */
export interface ForbiddenSide {
  /** ゲーム開始時に付ける封印の数 */
  seals: number;
  creature: Pick<CardDefinition, 'name' | 'cost' | 'civilizations' | 'races' | 'power' | 'text' | 'typeLabel' | 'keywords' | 'abilities' | 'statics' | 'replacements'>;
}

/** ツインパクトの呪文側 */
export interface TwinSide {
  name: string;
  cost: number;
  civilizations: Civilization[];
  text: string;
  keywords?: Pick<Keywords, 'shieldTrigger' | 'charger' | 'crystalCharger' | 'manaTapped' | 'spellToHand' | 'spellToHyperspatial'>;
  abilities?: TriggeredAbility[];
}

/** 侵略・革命チェンジ・アタック・チャンス（攻撃する時に使う） */
export interface AttackSwap {
  kind: 'invasion' | 'revolution' | 'attackChance';
  filter: CardFilter;
  /** S級侵略：手札のほかに使えるゾーン（[不死]は墓地、[原始]はマナゾーン、[宇宙]・[轟速]はバトルゾーンなど） */
  zones?: Array<'graveyard' | 'mana' | 'battle'>;
  /** S級侵略：バトルゾーンから重ねる時、このカードだけを移す（[宇宙]。指定がなければ下のカードごと移す） */
  battleCardOnly?: boolean;
}

/**
 * 別のコストでの使い方（リサイクル・キリフダッシュ・ギャラクシールド・フシギバース・B・A・D・J・O・E など）。
 * 新しい能力語は、この形に読み替える1行を読み取り側（ALT_PLAYS）に足す。エンジンは項目を見て処理する
 */
export interface AltPlay {
  /** 画面に出す名前（「リサイクル」など） */
  name: string;
  /** 決まったコスト（マナの記号 [ww04] の数字）。なければ元のコストから reduce を引く */
  cost?: number;
  /** 支払いに必要な文明（マナの記号の文字）。なければカードの文明 */
  civilizations?: Civilization[];
  /** 元のコストから少なくする数（B・A・D、J・O・E） */
  reduce?: number;
  /** reduce を「〜unit体につき」で掛ける（無月の影罪：自分の墓地にあるマフィ・ギャング1体につき1少なく） */
  reducePer?: { per: Quantity; unit: number };
  /** 少なくした後のコストの下限（省略時は1） */
  min?: number;
  /** 使う時にカードがあるゾーン（省略時は手札） */
  from?: 'graveyard';
  /** 使える条件（「自分の墓地にカードが6枚以上あれば」） */
  condition?: Condition;
  /** 呪文：唱えた後、墓地のかわりに置く場所 */
  spellAfter?: 'deckBottom';
  /** ギャラクシールド：出す（唱える）かわりに、表向きでシールドゾーンに置く */
  toShield?: boolean;
  /** パンドラ・シフト：出す（唱える）かわりに、自分の超次元ゾーンに置く */
  toHyperspatial?: boolean;
  /** このターンの終わりに：破壊する／山札の下に置く／山札の下に置いてカードを1枚引く */
  endOfTurn?: 'destroy' | 'deckBottom' | 'deckBottomDraw';
  /** 出したターンにも攻撃できる（アビスラッシュ） */
  speed?: boolean;
  /** 使った後に行う効果（「そうしたら、〜」） */
  then?: EffectDef[];
  /** フシギバース：自分のクリーチャーを1体タップしてマナゾーンに置き、そのコストだけ少なくする（min より少なくならない） */
  fushigi?: { min: number };
  /** 使えるタイミング（省略時は自分のメインステップ）。attackEndBreak: 自分のクリーチャーの攻撃の終わりに、その攻撃でシールドをブレイクしていれば（キリフダッシュ） */
  /** ownAttack: 自分のクリーチャーが攻撃する時（D・D・D） */
  timing?: 'attackEndBreak' | 'ownAttack';
}

/**
 * 手札にある間の誘発：その時に条件を満たしていれば、このカードをコストを支払わずに使ってもよい。
 * when: opponentTurnEnd 相手のターンの終わり／ownTurnEnd 自分のターンの終わり／anyTurnEnd 各ターンの終わり／
 *       ownDestroyed 自分のクリーチャー（filter に合うもの）が破壊された時
 */
/**
 * 手札・墓地にある間の誘発で、このカードをバトルゾーンに出す（無月の門・ドゥベルなど）。
 * on: enter=自分の（subject に合う）クリーチャーが出た時 / summon=召喚した時 / spell=呪文を唱えた時 /
 *     turnEnd=各ターンの終わりに / ownTurnEnd=自分のターンの終わりに / gateUsed=自分の「無月の門」能力を使った時
 * materials があれば、そのカードを選んで、その上に重ねて召喚する（無月の門）。なければそのまま出す
 */
export interface ZoneGate {
  label: string;
  on: ('enter' | 'summon' | 'spell' | 'turnEnd' | 'ownTurnEnd' | 'gateUsed')[];
  subject?: CardFilter;
  zones: ('hand' | 'graveyard')[];
  /** battle と graveyard は各ゾーンから選ぶ数（「2つずつ」）、total は2つのゾーンから合計で選ぶ数 */
  materials?: { filter: CardFilter; battle?: number; graveyard?: number; total?: number };
  tapped?: boolean;
  /** 無月の門の能力（使った時に gateUsed を誘発する） */
  mugetsu?: boolean;
}

export interface HandTrigger {
  /**
   * opponentAttackOrBlock: 相手のクリーチャーが攻撃またはブロックした時（ニンジャ・ストライク）
   * anyAttack: クリーチャーが攻撃する時（鬼エンド）／ownAttack: 自分のクリーチャー（filter に合うもの）が攻撃する時（アタック・チャンスR）
   */
  when: 'opponentTurnEnd' | 'ownTurnEnd' | 'anyTurnEnd' | 'ownDestroyed' | 'ownSummon' | 'ownTurnStart' | 'opponentAttackOrBlock' | 'anyAttack' | 'ownAttack' | 'attackedPlayer';
  condition?: Condition;
  filter?: CardFilter;
  /** 手札のほかに使えるゾーン（アタック・チャンスR は墓地からも） */
  zones?: ('hand' | 'graveyard')[];
  /** 出したクリーチャーを、そのターンの終わりに山札の下に置く（ニンジャ・ストライク） */
  endOfTurn?: 'deckBottom';
  /** 攻撃の後（攻撃の終わりに）出す。攻撃の最中には出さない */
  afterAttack?: boolean;
  /** 1回の攻撃につき、1人1回だけ（「その攻撃中にニンジャ・ストライクを使っていなければ」） */
  oncePerAttack?: boolean;
  /** 唱えた呪文を墓地のかわりに置く場所 */
  spellAfter?: 'deckBottom';
  /** 1回の攻撃につき、この名前の能力は1人1回だけ（「その攻撃中にまだ「逆転撃」を使っていなければ」） */
  onceKey?: string;
  /** 使ったら、次の自分のターンのはじめにこの数のマナを支払う。支払えなければ負ける（逆転撃） */
  debt?: number;
}

/**
 * 進化元の指定（マナ進化・墓地進化・手札進化・シールド進化・デッキ進化・進化V/GV・究極進化・スター進化・超無限進化 など）。
 * 「どのゾーンの・どんなカードを・何枚」を1つの形で表す。新しい進化の種類は、読み取りでこの形にするだけでよい
 */
export interface EvolveSpec {
  /** 進化元にできるカードのあるゾーン */
  zones: ('battle' | 'mana' | 'graveyard' | 'hand' | 'shield')[];
  /** 進化元の条件 */
  filter?: CardFilter;
  /** 必要な枚数（進化V は2、進化GV は3） */
  count: number;
  /** count 枚以上（超無限進化） */
  atLeast?: boolean;
  /** 各ゾーンから1枚ずつ選ぶ（進化GV・Ω） */
  eachZone?: boolean;
  /** 重ねずに出してもよい（NEO進化の仲間） */
  optional?: boolean;
  /** 山札の上から count 枚を進化元にする（デッキ進化）。creatureOnly: クリーチャーでなければ出せずに手札に戻る */
  deckTop?: { count: number; creatureOnly?: boolean };
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
  /** 侵略（invasion）・革命チェンジ（revolution）：攻撃中の自分のクリーチャーが filter に合えば、手札から使える */
  attackSwap?: AttackSwap;
  /** G・ゼロ：条件を満たしていればコストを支払わずに使える */
  gZero?: Condition;
  /** 条件を満たしていれば、シールドゾーンにあるこのカードは「S・トリガー」を持つ */
  shieldTriggerIf?: Condition;
  /** このカード自身の召喚コストを「〜1枚につきN」少なくする。コストは min 未満にならない */
  selfCost?: { amount: number; per: Quantity; unit: number; min: number; /** 進化元にするカードの数を数える（「進化元クリーチャー1体につき」） */ perEvolve?: boolean };
  /** 条件を満たす時、このカード自身のコストを amount 少なくする（「〜があれば、このクリーチャーの召喚コストを3少なくする」） */
  condCost?: { amount: number; condition: Condition };
  /** ハイパー化：自分のクリーチャーを count 体タップして、次の自分のターンのはじめまでハイパーモードになる */
  hyper?: { count: number; excludeSelf: boolean; filter?: CardFilter };
  /** ハイパーモードの面にだけある能力の文（公式の2面目から） */
  hyperText?: string;
  /** ハイパーモードで加わる能力（hyperText を読み取ったもの） */
  hyperForm?: Pick<CardDefinition, 'keywords' | 'abilities' | 'statics' | 'replacements'>;
  /** 進化元の指定（バトルゾーンのクリーチャー1体以外の進化）。あれば evolvesFrom より優先する */
  evolveSpec?: EvolveSpec;
  /** NEO進化クリーチャーとして召喚する（重ねて召喚する）なら、召喚コストをこの数だけ少なくする */
  neoCostReduce?: number;
  /** NEO進化：このクリーチャーを、条件に合う自分のクリーチャーの上に重ねて召喚してもよい */
  neoEvolution?: CardFilter;
  /** 禁断の鼓動：ゲーム開始時に封印を付けてバトルゾーンに置き、封印がすべてなくなったら creature 側に裏返す（禁断解放） */
  forbidden?: ForbiddenSide;
  /** 手札以外から召喚できる（「このクリーチャーを自分の墓地から召喚してもよい」）。condition を満たす時だけ */
  summonFrom?: { zones: Array<'graveyard' | 'mana' | 'hyperspatial'>; condition?: Condition };
  /** 超魂X：これがクリーチャーの下にあれば、そのクリーチャーにも与える能力 */
  soul?: Pick<CardDefinition, 'keywords' | 'abilities' | 'statics' | 'replacements'>;
  /** 別のコストでの使い方 */
  altPlays?: AltPlay[];
  /** 手札にある間の誘発：相手のターンの終わりに、条件を満たしていれば、コストを支払わずに使ってもよい */
  handTriggers?: HandTrigger[];
  /** 手札・墓地にある間の誘発でバトルゾーンに出る（無月の門など） */
  zoneGates?: ZoneGate[];
  /** 自分のターンのはじめに、表向きで自分のシールドゾーンにあれば、コストを支払ったものとして召喚する（ギャラクシールド） */
  galaxyReturn?: boolean;
  /** サバイバー：自分の他のサバイバーすべてにも与える能力（{S} の付いた能力） */
  survivor?: Pick<CardDefinition, 'keywords' | 'abilities' | 'statics' | 'replacements'>;
  /** サイキック・クリーチャー：裏面（覚醒・覚醒リンクした後のクリーチャー）と覚醒リンクの条件 */
  psychic?: PsychicSide;
  support: SupportLevel;
}

/** サイキック・クリーチャーの裏面 */
export interface PsychicSide {
  back: ForbiddenSide['creature'];
  /** 覚醒リンク：バトルゾーンに自分のこれらの名前のクリーチャーがあれば、このクリーチャーと裏返してリンクする */
  link?: { names: string[]; timing: 'turnStart' | 'always' };
}

export function isCreatureType(t: CardType): boolean {
  return t === 'creature' || t === 'evolution';
}

/** バトルゾーンに置かれるが、クリーチャーではないカード（フィールド・タマシード） */
export function isNonCreaturePermanent(t: CardType): boolean {
  return t === 'field' || t === 'tamaseed';
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
