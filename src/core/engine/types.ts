import type { EffectDef, Keywords, StaticAbility, ZoneName } from '../cards/types';

export type PlayerId = 0 | 1;
export const other = (p: PlayerId): PlayerId => (p === 0 ? 1 : 0);

/** 対戦中のカード個体。同名カードでも iid で個別に識別する。 */
export interface CardInstance {
  iid: string;
  cardId: string;
  owner: PlayerId;
  zone: ZoneName;
  tapped: boolean;
  /** 召喚酔い判定用：バトルゾーンに出たターン番号 */
  enteredTurn: number;
  /** ターン終了時に消えるパワー修正 */
  powerModTurn: number;
  /** バトルゾーンを離れるまで続くパワーの増減（プラチナ・ドライブ） */
  powerModLasting?: number;
  /** ターン終了時に消えるキーワード能力 */
  keywordsTurn?: Keywords;
  /** 進化クリーチャーの下にあるカード */
  under: string[];
  /** シールドが表向きかどうか（公開情報） */
  faceUp: boolean;
  /** EXライフで置いたシールド */
  exLifeShield?: string;
  /** エクストラEXライフで置いたシールド（2つ目以降） */
  exLifeShields?: string[];
  /** ハイパーモード中（次の持ち主のターンのはじめまで） */
  hyper?: boolean;
  /** 次の player のターンのはじめまで有効なキーワード能力 */
  keywordsUntil?: { keywords: Keywords; player: PlayerId };
  /** 「ゲーム中で一度」の能力を使った */
  usedOnce?: boolean;
  /** 無月の門で選んでいる途中の素材（step: 何番目の選択か） */
  gateProgress?: { step: number; picks: string[] };
  /** 次の player のターンのはじめまでのパワー修正 */
  powerModUntil?: { amount: number; player: PlayerId };
  /** このカードに付いている封印（seal ゾーンのカード。最後が一番上） */
  seals?: string[];
  /** 禁断の鼓動がクリーチャー側に裏返った（禁断解放した）／サイキック・クリーチャーが裏返った（覚醒リンク） */
  flipped?: boolean;
  /** 最後に攻撃したターン（「そのターンこのクリーチャーが攻撃していたら」） */
  attackedTurn?: number;
  /** 進化ではないクリーチャーの上に置いて（進化して）出た */
  evolvedOnNonEvolution?: boolean;
  /** Dスイッチを使った（D2フィールドを上下逆さまにした） */
  dSwitched?: boolean;
  /** このカード（ドラグハート・ウエポン）を装備しているクリーチャー */
  equippedTo?: string;
  /** コストを支払わずに出た（「そのクリーチャーがコストを支払わずに出ていたら」） */
  enteredFree?: boolean;
  /** このターン（turn）の終わりにバトルゾーンを離れる（B・A・D・J・O・E・アビスラッシュ） */
  leaveAtTurnEnd?: { turn: number; how: 'destroy' | 'deckBottom' | 'deckBottomDraw' };
  /** 覚醒リンクでこのクリーチャーとリンクしているサイキック・セル（バトルゾーンの一覧には入らない） */
  links?: string[];
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  isCpu: boolean;
  zones: Record<ZoneName, string[]>;
  chargedThisTurn: boolean;
  /** 残りの追加ターン数 */
  extraTurns: number;
  /** このターンに引いたカードの枚数 */
  drawnThisTurn?: number;
  /** このターンに唱えた呪文の数 */
  spellsThisTurn?: number;
  /** このターンに出したクリーチャーの数 */
  creaturesThisTurn?: number;
  /** 次の自分のターンのはじめに支払うマナ（逆転撃。支払えなければ負ける） */
  debts?: { amount: number; source: string }[];
  /** このターンに召喚したクリーチャーの数 */
  summonsThisTurn?: number;
  /** このターンに使ったカード（「各ターン、1体目の」の判定用） */
  playedThisTurn?: string[];
  /** このターンに、このプレイヤーのクリーチャーがコストを支払わずに出た数 */
  freeEntriesThisTurn?: number;
  /** このターンに、このプレイヤーのクリーチャーが攻撃した回数 */
  attacksThisTurn?: number;
  /** このターンに、このプレイヤーのクリーチャーがバトルに勝った回数 */
  battleWinsThisTurn?: number;
  /** このターンにブレイクされたこのプレイヤーのシールドの数 */
  shieldsBrokenThisTurn?: number;
}

export type Phase = 'start' | 'draw' | 'charge' | 'main' | 'attack' | 'end';

export const PHASE_LABEL: Record<Phase, string> = {
  start: 'ターン開始',
  draw: 'ドロー',
  charge: 'マナチャージ',
  main: 'メイン',
  attack: '攻撃',
  end: 'ターン終了',
};

/** プレイヤーが操作するフェイズ（それ以外は自動で進む） */
export const INTERACTIVE_PHASES: Phase[] = ['charge', 'main', 'attack'];

export interface GameConfig {
  /** ターン進行の順序。能力やフォーマットで差し替えられるようハードコードしない */
  phaseOrder: Phase[];
  initialShields: number;
  initialHand: number;
  /** 先攻1ターン目のドローを行うか */
  firstPlayerDrawsOnFirstTurn: boolean;
}

export const DEFAULT_CONFIG: GameConfig = {
  phaseOrder: ['start', 'draw', 'charge', 'main', 'attack', 'end'],
  initialShields: 5,
  initialHand: 5,
  firstPlayerDrawsOnFirstTurn: false,
};

/** ゲーム内イベント。誘発能力の検出やログ・UI演出に使う */
export type GameEvent =
  | { type: 'TURN_STARTED'; player: PlayerId; turn: number }
  | { type: 'TURN_ENDED'; player: PlayerId; turn: number }
  | { type: 'PHASE_CHANGED'; phase: Phase }
  | { type: 'CARD_DRAWN'; player: PlayerId; iid: string }
  | { type: 'MANA_CHARGED'; player: PlayerId; iid: string }
  | { type: 'CARD_PLAYED'; player: PlayerId; iid: string }
  /** バトルゾーンに出た（召喚・効果で出した両方） */
  | { type: 'CREATURE_SUMMONED'; player: PlayerId; iid: string; summoned?: boolean }
  | { type: 'SPELL_CAST'; player: PlayerId; iid: string }
  | { type: 'CREATURE_DESTROYED'; player: PlayerId; iid: string }
  | { type: 'CREATURE_LEFT'; player: PlayerId; iid: string; to: ZoneName }
  | { type: 'ATTACK_DECLARED'; player: PlayerId; attacker: string; target: AttackTarget }
  | { type: 'BLOCKED'; blocker: string; attacker: string }
  /** バトルゾーンのクリーチャーがタップした（攻撃・効果） */
  | { type: 'CREATURE_TAPPED'; iid: string }
  /** バトルゾーンのクリーチャーが相手の能力で選ばれた（by: 選んだ能力の持ち主） */
  | { type: 'CARD_TARGETED'; iid: string; by: PlayerId }
  | { type: 'BATTLE_WON'; winner: string; loser: string }
  | { type: 'SHIELD_BROKEN'; player: PlayerId; iid: string }
  /** クリーチャー iid がシールドをブレイクした（1回のブレイクで1度。player はそのクリーチャーの持ち主） */
  | { type: 'BROKE_SHIELDS'; player: PlayerId; iid: string }
  /** カードがシールドゾーンに置かれた（player: そのシールドゾーンの持ち主） */
  | { type: 'SHIELD_ADDED'; player: PlayerId; iid: string }
  /** 手札を捨てた（効果で手札から墓地へ） */
  | { type: 'CARD_DISCARDED'; player: PlayerId; iid: string }
  | { type: 'CARD_MOVED'; iid: string; from: ZoneName; to: ZoneName }
  /** カードがシールドゾーンを離れた（player: そのシールドゾーンの持ち主） */
  | { type: 'SHIELD_LEFT'; player: PlayerId; iid: string }
  /** クリーチャー（iid）の下にあったカード（card）が、その下を離れた */
  | { type: 'UNDER_LEFT'; iid: string; card: string }
  | { type: 'GAME_OVER'; winner: PlayerId | null; reason: string };

export type AttackTarget = { kind: 'player' } | { kind: 'creature'; iid: string };

/** バトルゾーンを離れる理由 */
export type LeaveCause = 'destroy' | 'effect';

/** 効果処理キューのタスク。ここに積まれたものを順に解決し、入力待ちで中断・再開する */
/** 誘発した能力1つ分の処理 */
export interface TriggerGroup {
  controller: PlayerId;
  source: string;
  tasks: Task[];
}

export type Task =
  | { kind: 'effect'; controller: PlayerId; source: string; effect: EffectDef }
  /** 任意効果の実行確認（承認されたら effects をキュー先頭に積む） */
  | { kind: 'confirmOptional'; controller: PlayerId; source: string; effects: EffectDef[] }
  | { kind: 'blockStep'; attacker: string; defender: PlayerId }
  | { kind: 'attackResolve'; attacker: string }
  /** byAttack: 攻撃によるブレイク（効果のブレイクではない） */
  | { kind: 'breakShields'; breaker: PlayerId; source: string; defender: PlayerId; count: number; byAttack?: boolean; split?: boolean; chosen?: string[]; saverAsked?: boolean }
  /** 「各ブレイクの前に」の能力を誘発させる */
  | { kind: 'beforeBreak'; source: string; defender: PlayerId }
  | { kind: 'shieldTrigger'; player: PlayerId; iid: string }
  | { kind: 'battle'; attacker: string; defender: string }
  | { kind: 'battleWon'; winner: string; loser: string }
  /** after: 唱えた後、墓地のかわりに置く場所 */
  | { kind: 'castSpell'; player: PlayerId; iid: string; side: 'main' | 'twin'; after?: 'deckBottom' | 'hand' }
  /** summoned: 召喚で出る（効果で「出す」のではない） */
  | { kind: 'enterBattle'; player: PlayerId; iid: string; evolveFrom?: string[]; evolveDeck?: { count: number; creatureOnly?: boolean }; evolveOn?: string; tapped?: boolean; replaceAttacker?: boolean; summoned?: boolean; paid?: boolean; equipTo?: string; endOfTurn?: 'destroy' | 'deckBottom' | 'deckBottomDraw'; grant?: { keywords: Keywords; untilNextTurn?: boolean; by: PlayerId } }
  /** 呪文を解決し終えたら墓地へ */
  | { kind: 'spellToGrave'; iid: string; side?: 'main' | 'twin'; after?: 'deckBottom' | 'hand' }
  | { kind: 'hyperize'; player: PlayerId; iid: string }
  /** リンク解除：表に戻ったセルのうち1枚を選んで超次元ゾーンに戻す */
  | { kind: 'linkRelease'; player: PlayerId; name: string; cells: string[]; destroyed: boolean }
  /** コマンドが出た時、その持ち主は同じ文明を持つ自身のカードから封印を1つ墓地に置く */
  | { kind: 'commandUnseal'; player: PlayerId; command: string }
  /** 攻撃の終わり */
  | { kind: 'attackEnd'; attacker: string; broke?: boolean }
  /** 侵略・革命チェンジを使うか聞く */
  | { kind: 'attackSwap'; player: PlayerId }
  /** 解決を待っている誘発能力のうち、player のものを1つ選んで解決を始める（2つ以上あれば順番を選ぶ） */
  | { kind: 'pickTrigger'; player: PlayerId }
  /** 能力（呪文）1つの解決の終わりの印。これがキューにある間は、新しく誘発した能力は解決を待つ */
  | { kind: 'abilityEnd' }
  /** キリフダッシュを使うか聞く（攻撃の終わり、その攻撃でシールドをブレイクしていた時） */
  /** timing: 聞くタイミング（省略時はキリフダッシュ。ownAttack は D・D・D） */
  | { kind: 'kirifudash'; player: PlayerId; timing?: 'ownAttack' }
  /** バトルゾーンから離れる（置換効果をここで適用） */
  /** chosen: 置換効果が2つ以上ある時に、離れるカードの持ち主が選んだもの（'ex' は EXライフ） */
  /** confirmed: 使うと答えた任意の置換効果（続けて対象を選ぶ時に、もう一度聞かない） */
  | { kind: 'leave'; tapped?: boolean; iid: string; to: ZoneName; cause: LeaveCause; toTop?: boolean; replaced?: string[]; confirmed?: string; chosen?: string }
  /** 自動フェイズを進める（開始時誘発などを解決してから次へ） */
  | { kind: 'phase'; phase: Phase }
  /** ターン終了時の後片付けと手番の交代（追加ターンを含む） */
  | { kind: 'turnSwitch' };

/** プレイヤーの入力待ち */
export type Pending =
  | {
      kind: 'selectCards';
      player: PlayerId;
      prompt: string;
      candidates: string[];
      min: number;
      max: number;
      /** 対象にとって不利な効果か（CPU の選び方に使う） */
      harmful?: boolean;
      /** 効果の発生源（判断パネルに表示する） */
      source?: string;
      /** 選ぶ本人に中身を見せる非公開のカード（山札・相手が選ぶ自分のシールドなど） */
      reveal?: boolean;
    }
  | { kind: 'confirm'; player: PlayerId; prompt: string; source?: string }
  | { kind: 'chooseMode'; player: PlayerId; prompt: string; options: string[]; source?: string }
  | { kind: 'block'; player: PlayerId; attacker: string; blockers: string[] }
  /** 自動処理できない能力。プレイヤーが手動で処理して「処理完了」を押すまで止まる */
  | { kind: 'manualStep'; player: PlayerId; prompt: string; text: string; source?: string };

export interface LogEntry {
  turn: number;
  player: PlayerId | null;
  text: string;
  manual?: boolean;
}

export interface CombatState {
  /** この攻撃中に「ニンジャ・ストライク」の仲間を使ったプレイヤー */
  ninjaUsed?: PlayerId[];
  /** この攻撃中に使った「〜を使っていなければ」の能力（「プレイヤー:能力名」） */
  usedKeys?: string[];
  attacker: string;
  attackingPlayer: PlayerId;
  target: AttackTarget;
  /** ブロックしたクリーチャー */
  blocker?: string;
  /** S級侵略：攻撃する時に墓地・マナゾーン・バトルゾーンにあったS級侵略のカード */
  sClassEligible?: string[];
}

/** ターン終了まで有効な常在効果 */
export interface TurnStatic {
  controller: PlayerId;
  source: string;
  static: StaticAbility;
  /** 次のこのプレイヤーのターンのはじめまで有効（省略時はターン終了まで） */
  untilNextTurnOf?: PlayerId;
  /** このプレイヤーのターンの間だけ有効（「次の相手のターン中」） */
  onlyDuringTurnOf?: PlayerId;
}

export interface GameState {
  config: GameConfig;
  rngState: number;
  nextIid: number;
  turn: number;
  activePlayer: PlayerId;
  firstPlayer: PlayerId;
  phase: Phase;
  players: [PlayerState, PlayerState];
  cards: Record<string, CardInstance>;
  queue: Task[];
  /** 誘発して、解決を待っている能力（ターンプレイヤーのものから、1つずつキューに移して解決する） */
  waiting?: TriggerGroup[];
  pending: Pending | null;
  combat: CombatState | null;
  turnStatics: TurnStatic[];
  /** このターンに使った「各ターンに1度」の能力（カードID:能力の番号） */
  usedThisTurn?: string[];
  /** 直前の「その中から選ぶ」効果で、1枚以上選んだか（「こうして実行しなければ」の判定用） */
  lastDid?: boolean;
  /** 効果で選んだ数字（「数字を1つ選ぶ」） */
  chosenNumber?: number;
  /** いまのターンが追加ターン */
  inExtraTurn?: boolean;
  /** 効果で直前に選んだ（動かした）カード（「それ」「その捨てたカード」で指す） */
  lastChosen?: string[];
  log: LogEntry[];
  winner: PlayerId | null;
  gameOverReason: string | null;
  /** 直近の action で発生したイベント（UI演出用） */
  lastEvents: GameEvent[];
}

export type Action =
  | { type: 'NEXT_PHASE'; player: PlayerId }
  | { type: 'END_TURN'; player: PlayerId }
  | { type: 'CHARGE_MANA'; player: PlayerId; iid: string }
  /** sacrifice：ササゲールで破壊する／ハイパーエナジーでタップする自分のクリーチャー（コストを少なくする） */
  /** alt: 別のコストでの使い方（カード定義の altPlays の番号）。フシギバースは sacrifice[0] がマナゾーンに置くクリーチャー */
  /** evolveFrom: 進化元にするカード（マナ進化・墓地進化・進化V/GV など、バトルゾーンの1体以外を進化元にする時） */
  | { type: 'PLAY_CARD'; player: PlayerId; iid: string; evolveFrom?: string[]; evolveOn?: string; manaIids?: string[]; side?: 'main' | 'twin'; sacrifice?: string[]; alt?: number }
  | { type: 'ATTACK'; player: PlayerId; attacker: string; target: AttackTarget }
  | { type: 'RESPOND'; player: PlayerId; selected?: string[]; accept?: boolean }
  /** 手動処理：任意のカードを任意のゾーンへ移動 */
  | { type: 'MANUAL_MOVE'; player: PlayerId; iid: string; to: ZoneName; toTop?: boolean }
  | { type: 'MANUAL_TAP'; player: PlayerId; iid: string; tapped: boolean }
  | { type: 'MANUAL_DRAW'; player: PlayerId; target: PlayerId }
  | { type: 'MANUAL_SHUFFLE'; player: PlayerId; target: PlayerId }
  | { type: 'MANUAL_POWER'; player: PlayerId; iid: string; amount: number }
  | { type: 'MANUAL_LOG'; player: PlayerId; text: string }
  | { type: 'CONCEDE'; player: PlayerId }
  /** ハイパー化する（タップするクリーチャーは判断パネルで選ぶ） */
  | { type: 'HYPERIZE'; player: PlayerId; iid: string }
  /** クロスギアを、コストを支払って自分のクリーチャーにクロスする（付け替える） */
  | { type: 'CROSS'; player: PlayerId; iid: string; target: string; manaIids?: string[] };
