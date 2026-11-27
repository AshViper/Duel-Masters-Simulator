// ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、
// 内部では効果処理キュー（state.queue）を順に解決し、プレイヤー入力が必要になったら
// state.pending を立てて中断する。RESPOND アクションで再開する。
// 自動フェイズ（開始・ドロー・終了）もキューのタスクとして進めるので、
// 「ターンのはじめに」などの誘発能力が次のフェイズより先に解決される。
import type { CardRegistry } from '../cards/registry';
import { asMove, MOVE_DEST, type MoveEffect } from '../cards/effects';
import {
  type AltPlay,
  type HandTrigger,
  type Condition,
  type CardFilter,
  type ZoneGate,
  type CardDefinition,
  CIV_LABEL,
  isCreatureType,
  isNonCreaturePermanent,
  manaCivilizations,
  playFace,
  ZONE_LABEL,
  type EffectDef,
  type ReplacementAbility,
  type TargetSpec,
  type TriggeredAbility,
  type StaticAbility,
  type ZoneName,
} from '../cards/types';
import {
  attackTargets,
  blockersFor,
  cannotLeaveNow,
  canTapAbility,
  handProtected,
  gearsOn,
  cannotLose,
  forcedAttackers,
  breakerCount,
  choosePayment,
  def,
  effectiveCost,
  evalCondition,
  countQuantity,
  entryBlocked,
  canCross,
  isCrossGear,
  isGrCard,
  multiEvolveSpec,
  validEvolveSources,
  defaultEvolveSources,
  evolveSourceCandidates,
  ignoresAttackLocks,
  withoutAttackLocks,
  altCost,
  altPayment,
  altUsable,
  canPlayAlt,
  evolutionBases,
  isIdle,
  isUntargetable,
  hyperizeCandidates,
  activeStatics,
  attackSwapCandidates,
  canBeEvolutionSource,
  battleAndFields,
  canSummonFromZone,
  zoneSummonSource,
  sasageruCandidates,
  usesHyperEnergy,
  sClassCards,
  battleCards,
  isIgnored,
  keywords,
  matchFilter,
  playLimitReached,
  playRestriction,
  power,
  targetCandidates,
} from './queries';
import { nextRandom } from './rng';
import {
  INTERACTIVE_PHASES,
  other,
  type Action,
  type AttackTarget,
  type GameEvent,
  type GameState,
  type LeaveCause,
  type Phase,
  type PlayerId,
  type Task,
  type TriggerGroup,
} from './types';

export interface ApplyResult {
  state: GameState;
  error?: string;
}

export function applyAction(state: GameState, action: Action, reg: CardRegistry): ApplyResult {
  const ctx = new Ctx(structuredClone(state), reg);
  try {
    ctx.handle(action);
  } catch (e) {
    if (e instanceof IllegalAction) return { state, error: e.message };
    throw e;
  }
  ctx.s.lastEvents = ctx.events;
  return { state: ctx.s };
}

export class IllegalAction extends Error {}

interface Response {
  selected?: string[];
  accept?: boolean;
}

const INSTEAD_LABEL: Record<ReplacementAbility['instead'], string> = {
  toHand: '手札に戻す',
  toMana: 'マナゾーンに置く',
  toShield: 'シールドに加える',
  toDeckBottom: '山札の下に置く',
  toDeckTop: '山札の上に置く',
  destroySelf: 'このクリーチャーを破壊する',
  shedTop: '一番上のカードだけを離す',
  unflip: '表面に裏返してとどまる',
  stay: 'バトルゾーンにとどまる',
  escape: '自分のシールドを1つ手札に加える',
  shedUnder: '下のカードすべてを離す',
  seal: '封印を付ける',
  destroyOther: '自分の他のクリーチャーを1体破壊する',
  faceUpShieldToGrave: 'シールドゾーンにある表向きのカードを1枚墓地に置く',
  avertCost: '表向きのカードを破壊するか、シールドを墓地に置く',
  underToDeckBottom: '下に重ねたカードを山札の下に置く',
};

/** 効果の中の「誘発の原因になったカード」（ref: 'event'）を、実際のカードに決める */
/** カードを選ぶ（動かす）効果：後に続く「そうしたら」が、選んだかどうかを見る */
const CHOOSING_EFFECTS = new Set<EffectDef['type']>(['move', 'destroy', 'tap', 'untap', 'discardUnder', 'discardRandom', 'bounce', 'toHand', 'toGraveyard', 'toMana', 'toShield', 'toDeckBottom', 'toDeckTop', 'shieldToHand', 'graveyardToHand', 'putIntoBattle', 'seal', 'choose']);

/** 山札を見て選んだカードの行き先（選ぶ時の説明用） */
const LOOK_DEST_LABEL = { hand: '手札へ', battle: 'バトルゾーンへ', mana: 'マナゾーンへ', shield: 'シールドゾーンへ', graveyard: '墓地へ', deckBottom: '山札の下へ', none: 'この後の効果で使う' } as const;

/** 順番を選ぶ時に出す、能力のかんたんな説明 */
const EFFECT_HINT: Partial<Record<EffectDef['type'], string>> = {
  draw: 'カードを引く',
  destroy: '破壊する',
  move: 'カードを動かす',
  tap: 'タップする',
  untap: 'アンタップする',
  powerMod: 'パワーを変える',
  grantKeyword: '能力を与える',
  lookAtTop: '山札を見る',
  deckTopTo: '山札の上から置く',
  discardRandom: '手札を捨てさせる',
  breakShields: 'シールドをブレイクする',
  chooseOne: '次の中から選ぶ',
  fight: 'バトルさせる',
  seal: '封印を付ける',
  playFromHandFree: 'コストを支払わずに使う',
  extraTurn: '追加ターン',
};
function describeTrigger(g: TriggerGroup): string {
  const t = g.tasks[0];
  if (t.kind === 'commandUnseal') return '封印を外す';
  const e = t.kind === 'effect' ? t.effect : t.kind === 'confirmOptional' ? t.effects[0] : undefined;
  if (!e) return '能力';
  if (e.type === 'manual') return e.text.slice(0, 24);
  return `${EFFECT_HINT[e.type] ?? '能力'}${t.kind === 'confirmOptional' ? '（使ってもよい）' : ''}`;
}

/** 条件の中の「そのクリーチャー（誘発の原因）」に、誘発したクリーチャーを入れる */
function bindCondition(c: Condition, subject: string | undefined): Condition {
  if (c.type === 'subjectEnteredFree' || (c.type === 'entry' && !c.self)) return { ...c, iid: subject };
  if (c.type === 'not') return { ...c, condition: bindCondition(c.condition, subject) };
  if (c.type === 'and' || c.type === 'or') return { ...c, conditions: c.conditions.map((x) => bindCondition(x, subject)) };
  return c;
}

function bindEvent(effects: EffectDef[], subject: string | undefined): EffectDef[] {
  return effects.map((e): EffectDef => {
    let out = e;
    if ('target' in out && typeof out.target === 'object' && out.target.ref === 'event') out = { ...out, target: { ...out.target, iids: subject ? [subject] : [] } } as EffectDef;
    if (out.type === 'conditional')
      out = {
        ...out,
        condition: bindCondition(out.condition, subject),
        then: bindEvent(out.then, subject),
        ...(out.else ? { else: bindEvent(out.else, subject) } : {}),
      };
    if (out.type === 'optional') out = { ...out, effects: bindEvent(out.effects, subject) };
    if (out.type === 'chooseOne') out = { ...out, options: out.options.map((o) => ({ ...o, effects: bindEvent(o.effects, subject) })) };
    if (out.type === 'gachinko') out = { ...out, then: bindEvent(out.then, subject) };
    return out;
  });
}

export class Ctx {
  events: GameEvent[] = [];
  private response: Response | null = null;

  constructor(
    public s: GameState,
    public reg: CardRegistry,
  ) {
    s.turnStatics ??= [];
    for (const p of s.players) p.extraTurns ??= 0;
  }

  // ───────────────────────── 入口 ─────────────────────────
  handle(a: Action): void {
    const s = this.s;
    if (s.gameOverReason !== null && a.type !== 'MANUAL_LOG') throw new IllegalAction('対戦は終了しています');
    switch (a.type) {
      case 'RESPOND':
        return this.respond(a.player, { selected: a.selected, accept: a.accept });
      case 'CROSS': {
        if (!canCross(s, this.reg, a.player, a.iid, a.target)) throw new IllegalAction('クロスできません');
        const pay = choosePayment(s, this.reg, a.player, a.iid, a.manaIids);
        if (!pay) throw new IllegalAction('マナが足りません');
        if (s.phase === 'charge') {
          s.phase = 'main';
          this.emit({ type: 'PHASE_CHANGED', phase: 'main' });
        }
        for (const m of pay) s.cards[m].tapped = true;
        this.crossGear(a.iid, a.target, a.player, `（${pay.length}マナ）`);
        return this.run();
      }
      case 'HYPERIZE': {
        if (!hyperizeCandidates(s, this.reg, a.player, a.iid)) throw new IllegalAction('ハイパー化できません');
        if (s.phase === 'charge') {
          s.phase = 'main';
          this.emit({ type: 'PHASE_CHANGED', phase: 'main' });
        }
        s.queue.push({ kind: 'hyperize', player: a.player, iid: a.iid });
        return this.run();
      }
      case 'CONCEDE':
        this.log(`${s.players[a.player].name} が投了しました`, a.player);
        return this.gameOver(other(a.player), '投了');
      case 'MANUAL_MOVE':
        if (!a.raw && this.manualMoveByRule(a.player, a.iid, a.to, a.toTop ?? true)) return;
        return this.manual(a.player, () => {
          const from = s.cards[a.iid]?.zone;
          if (!from) throw new IllegalAction('カードがありません');
          // 名前は動かす前に取る（リンクしたサイキックは裏返った名前）。移動先は実際の行き先（サイキックは超次元ゾーンに戻る）
          const name = this.name(a.iid);
          this.moveCard(a.iid, a.to, { toTop: a.toTop ?? true });
          const to = s.cards[a.iid].zone;
          return `${name} を ${ZONE_LABEL[from]} → ${ZONE_LABEL[to]} に移動${to !== a.to ? `（${ZONE_LABEL[a.to]}のかわりに）` : ''}`;
        });
      case 'MANUAL_TAP':
        return this.manual(a.player, () => {
          s.cards[a.iid].tapped = a.tapped;
          return `${this.name(a.iid)} を${a.tapped ? 'タップ' : 'アンタップ'}`;
        });
      case 'MANUAL_DRAW':
        return this.manual(a.player, () => {
          this.draw(a.target, 1);
          return `${s.players[a.target].name} がカードを1枚引く`;
        });
      case 'MANUAL_SHUFFLE':
        return this.manual(a.player, () => {
          this.shuffle(a.target);
          return `${s.players[a.target].name} の山札をシャッフル`;
        });
      case 'MANUAL_POWER':
        return this.manual(a.player, () => {
          s.cards[a.iid].powerModTurn += a.amount;
          return `${this.name(a.iid)} のパワー ${a.amount >= 0 ? '+' : ''}${a.amount}（ターン終了まで）`;
        });
      case 'MANUAL_LOG':
        s.log.push({ turn: s.turn, player: a.player, text: a.text, manual: true });
        return;
    }

    // ここから先はターンプレイヤーの通常アクション
    if (a.player !== s.activePlayer) throw new IllegalAction('自分のターンではありません');
    if (!isIdle(s)) throw new IllegalAction('処理中の効果があります');

    switch (a.type) {
      case 'NEXT_PHASE':
        if (s.phase === 'attack') this.checkForcedAttack(a.player);
        return this.enterPhase(this.nextPhase(s.phase));
      case 'END_TURN':
        this.checkForcedAttack(a.player);
        return this.enterPhase('end');
      case 'CHARGE_MANA':
        return this.chargeMana(a.player, a.iid);
      case 'PLAY_CARD':
        if (a.alt !== undefined) return this.playAlt(a.player, a.iid, a.alt, a.manaIids, a.sacrifice ?? []);
        return this.playCard(a.player, a.iid, a.evolveOn, a.manaIids, a.side ?? 'main', a.sacrifice ?? [], a.evolveFrom);
      case 'ATTACK':
        return this.attack(a.player, a.attacker, a.target);
      case 'TAP_ABILITY': {
        if (!['charge', 'main', 'attack'].includes(s.phase) || !canTapAbility(s, this.reg, a.player, a.iid)) throw new IllegalAction('この能力は使えません');
        if (s.phase !== 'attack') {
          s.phase = 'attack';
          this.emit({ type: 'PHASE_CHANGED', phase: 'attack' });
        }
        s.cards[a.iid].tapped = true;
        this.emit({ type: 'CREATURE_TAPPED', iid: a.iid });
        this.log(`${this.name(a.iid)} は攻撃するかわりにタップして能力を使う`, a.player);
        this.triggerFrom(a.iid, 'onTapAbility');
        return this.run();
      }
    }
  }

  /**
   * 手動移動をルールどおりの処理として行う（バトルゾーンに出す・破壊する・手札に戻す・捨てるなど）。
   * 「出た時」「破壊された時」などが誘発し、置換効果も使われる。誘発した能力は、手動で処理中の能力が終わってから解決する。
   * 能力が関わらない移動（マナ→シールドなど）や、ほかの入力待ちの途中は false を返し、そのまま置き直す。
   */
  private manualMoveByRule(player: PlayerId, iid: string, to: ZoneName, toTop: boolean): boolean {
    const s = this.s;
    const inst = s.cards[iid];
    if (!inst) throw new IllegalAction('カードがありません');
    if (s.pending && s.pending.kind !== 'manualStep') return false;
    const from = inst.zone;
    const d = def(s, this.reg, iid);
    let tasks: Task[] = [];
    let text = '';
    if (from === 'battle' && to !== 'battle') {
      const cause: LeaveCause = to === 'graveyard' ? 'destroy' : 'effect';
      tasks = [{ kind: 'leave', iid, to, cause, toTop }];
      text = `${this.name(iid)} を${to === 'graveyard' ? '破壊' : `${ZONE_LABEL[to]}に置く`}`;
    } else if (to === 'battle' && from !== 'battle') {
      // 進化クリーチャーは進化元を選べないので、そのまま置き直す
      if (d.type === 'evolution' || !(isCreatureType(d.type) || isNonCreaturePermanent(d.type))) return false;
      tasks = [{ kind: 'enterBattle', player: inst.owner, iid }];
      text = `${this.name(iid)} をバトルゾーンに出す`;
    } else if (from === 'hand' && to === 'graveyard') {
      this.moveCard(iid, 'graveyard');
      this.emit({ type: 'CARD_DISCARDED', player: inst.owner, iid });
      text = `${d.name} を捨てる`;
    } else return false;
    s.log.push({ turn: s.turn, player, text: `［手動］${text}`, manual: true });
    if (s.pending) {
      // 手動処理の能力の途中：入力待ちを外して先に処理し、そのあと同じ能力の入力待ちに戻る
      s.pending = null;
      s.manualResume = true;
    }
    this.insertFront(...tasks);
    this.run();
    return true;
  }

  private manual(player: PlayerId, fn: () => string): void {
    const text = fn();
    this.s.log.push({ turn: this.s.turn, player, text: `［手動］${text}`, manual: true });
    // 山札切れ・パワー0以下の破壊を確認する（入力待ち中は処理を進めない）
    this.run();
  }

  // ───────────────────────── ターン進行 ─────────────────────────
  nextPhase(p: Phase): Phase {
    const order = this.s.config.phaseOrder;
    const i = order.indexOf(p);
    return order[(i + 1) % order.length];
  }

  /** フェイズに入る。自動フェイズはキュー経由で順に進む */
  enterPhase(phase: Phase): void {
    this.s.queue.push({ kind: 'phase', phase });
    this.run();
  }

  /** フェイズの処理。自動フェイズなら次に進むタスクを積む */
  private runPhase(phase: Phase): void {
    const s = this.s;
    const pl = s.activePlayer;
    s.phase = phase;
    this.emit({ type: 'PHASE_CHANGED', phase });
    if (INTERACTIVE_PHASES.includes(phase)) return;
    switch (phase) {
      case 'start': {
        const P = s.players[pl];
        // 「次の自分のターンのはじめまで」の効果はここで終わる
        s.turnStatics = s.turnStatics.filter((t) => t.untilNextTurnOf !== pl);
        for (const c of Object.values(s.cards)) {
          if (c.keywordsUntil?.player === pl) delete c.keywordsUntil;
          if (c.powerModUntil?.player === pl) delete c.powerModUntil;
          // ハイパーモードは次の自分のターンのはじめまで
          if (c.hyper && c.owner === pl) delete c.hyper;
        }
        // 「次の相手のターンのはじめに、それらはアンタップしない」マナもタップしたまま
        for (const iid of P.zones.mana) if (!s.cards[iid].keywordsUntil?.keywords.noUntap) s.cards[iid].tapped = false;
        // 「自分のターンのはじめにアンタップしない」クリーチャーはタップしたまま
        for (const iid of P.zones.battle) if (!keywords(s, this.reg, iid).noUntap) s.cards[iid].tapped = false;
        P.chargedThisTurn = false;
        // 逆転撃など：「次の自分のターンのはじめに{N}を支払う。支払えなければ、自分はゲームに負ける」
        for (const debt of P.debts ?? []) {
          const free = P.zones.mana.filter((m) => !s.cards[m].tapped);
          if (free.length < debt.amount) {
            this.log(`${debt.source}：${debt.amount}マナを支払えなかった`, pl);
            delete P.debts;
            return this.gameOver(other(pl), `${debt.source} の支払いができなかった`);
          }
          for (const m of free.slice(0, debt.amount)) s.cards[m].tapped = true;
          this.log(`${debt.source}：マナを${debt.amount}枚タップして支払った`, pl);
        }
        delete P.debts;
        this.log(`── ターン${s.turn}：${P.name} ──`, pl);
        this.emit({ type: 'TURN_STARTED', player: pl, turn: s.turn });
        // ギャラクシールド：表向きで自分のシールドゾーンにあれば、コストを支払ったものとして召喚する
        for (const sh of [...P.zones.shield]) {
          const sd = def(s, this.reg, sh);
          if (!s.cards[sh].faceUp || !sd.galaxyReturn || sd.type === 'spell' || sd.type === 'evolution') continue;
          this.log(`${sd.name} をシールドゾーンから召喚する（コストを支払ったものとして）`, pl);
          s.queue.push({ kind: 'enterBattle', player: pl, iid: sh, paid: true, ...(isCreatureType(sd.type) ? { summoned: true } : {}) });
        }
        break;
      }
      case 'draw': {
        const skip = s.turn === 1 && pl === s.firstPlayer && !s.config.firstPlayerDrawsOnFirstTurn;
        if (!skip) this.draw(pl, 1);
        break;
      }
      case 'end':
        this.emit({ type: 'TURN_ENDED', player: pl, turn: s.turn });
        // 無月の門・絶など：「各ターンの終わりに」「自分のターンの終わりに」（ターンプレイヤーから）
        this.fireZoneGates(pl, 'turnEnd');
        this.fireZoneGates(pl, 'ownTurnEnd');
        this.fireZoneGates(other(pl), 'turnEnd');
        // 手札にある間の誘発：「相手のターンの終わりに、〜していれば、この呪文をコストを支払わずに唱えてもよい」
        for (const hp of [pl, other(pl)]) {
          for (const h of [...s.players[hp].zones.hand]) {
            const hd = def(s, this.reg, h);
            for (const ht of hd.handTriggers ?? []) {
              const timing = ht.when === 'anyTurnEnd' || (ht.when === 'opponentTurnEnd' && hp !== pl) || (ht.when === 'ownTurnEnd' && hp === pl);
              if (!timing || (ht.condition && !evalCondition(s, this.reg, hp, ht.condition, false, h))) continue;
              this.addTrigger(hp, h, this.effectTasks(hp, h, [{ type: 'playRevealed', iid: h, as: isCreatureType(hd.type) ? 'creature' : 'spell' }]));
            }
          }
        }
        // 「このターンの終わりに破壊する／山札の下に置く」（B・A・D・J・O・E・アビスラッシュ）
        for (const b of [...s.players[0].zones.battle, ...s.players[1].zones.battle]) {
          const l = s.cards[b].leaveAtTurnEnd;
          if (!l || l.turn !== s.turn) continue;
          if (l.how === 'destroy') s.queue.push({ kind: 'leave', iid: b, to: 'graveyard', cause: 'destroy' });
          else s.queue.push({ kind: 'leave', iid: b, to: 'deck', cause: 'effect', toTop: false });
          if (l.how === 'deckBottomDraw') s.queue.push(...this.effectTasks(s.cards[b].owner, b, [{ type: 'draw', count: 1 }]));
        }
        // 終了時の誘発を解決してからターンを渡す
        s.queue.push({ kind: 'turnSwitch' });
        return;
    }
    s.queue.push({ kind: 'phase', phase: this.nextPhase(phase) });
  }

  private turnSwitch(): void {
    const s = this.s;
    for (const c of Object.values(s.cards)) {
      c.powerModTurn = 0;
      delete c.keywordsTurn;
    }
    // 「次の自分のターンの終わりまで」は、効果を使ったターンより後の、そのプレイヤーのターンの終わりで終わる
    s.turnStatics = s.turnStatics.filter(
      (t) => t.forGame || t.untilNextTurnOf !== undefined || (t.untilTurnEndOf !== undefined && !(t.untilTurnEndOf === s.activePlayer && s.turn > (t.fromTurn ?? 0))),
    );
    s.usedThisTurn = [];
    for (const p of s.players) {
      p.drawnThisTurn = 0;
      p.spellsThisTurn = 0;
      p.creaturesThisTurn = 0;
      p.enteredNamesThisTurn = [];
      p.summonsThisTurn = 0;
      p.playedThisTurn = [];
      p.shieldsBrokenThisTurn = 0;
      p.battleWinsThisTurn = 0;
      p.freeEntriesThisTurn = 0;
      p.freeSpellsThisTurn = 0;
      p.attacksThisTurn = 0;
    }
    const P = s.players[s.activePlayer];
    s.inExtraTurn = P.extraTurns > 0;
    if (P.extraTurns > 0) {
      P.extraTurns -= 1;
      this.log(`${P.name} の追加ターン`, P.id);
    } else {
      s.activePlayer = other(s.activePlayer);
    }
    s.turn += 1;
    s.queue.push({ kind: 'phase', phase: s.config.phaseOrder[0] });
  }

  // ───────────────────────── 基本アクション ─────────────────────────
  private chargeMana(player: PlayerId, iid: string): void {
    const s = this.s;
    if (s.phase !== 'charge') throw new IllegalAction('マナチャージはマナチャージステップで行います');
    if (s.players[player].chargedThisTurn) throw new IllegalAction('このターンは既にマナチャージしています');
    const inst = s.cards[iid];
    if (!inst || inst.owner !== player || inst.zone !== 'hand') throw new IllegalAction('手札のカードを選んでください');
    this.moveCard(iid, 'mana');
    s.players[player].chargedThisTurn = true;
    this.log(`${this.name(iid)} をマナチャージ`, player);
    this.emit({ type: 'MANA_CHARGED', player, iid });
    this.run();
  }

  private playCard(player: PlayerId, iid: string, evolveOn: string | undefined, manaIids: string[] | undefined, side: 'main' | 'twin', sacrifice: string[] = [], evolveFrom?: string[]): void {
    const s = this.s;
    const inst = s.cards[iid];
    if (!inst || inst.owner !== player || (inst.zone !== 'hand' && !(side === 'main' && canSummonFromZone(s, this.reg, player, iid)))) throw new IllegalAction('手札のカードを選んでください');
    // 「自分のターンに一度、〜を自分の墓地から召喚してもよい」：使ったことを記録する（カード自身の能力で召喚できる時は使わない）
    const ownSf = def(s, this.reg, iid).summonFrom;
    const zoneSrc = inst.zone !== 'hand' && !(ownSf && (ownSf.zones as string[]).includes(inst.zone)) ? zoneSummonSource(s, this.reg, player, iid) : null;
    if (s.phase !== 'charge' && s.phase !== 'main') throw new IllegalAction('カードはメインステップで使います');
    const d = def(s, this.reg, iid);
    if (side === 'twin' && !d.twin) throw new IllegalAction('ツインパクトではありません');
    const face = playFace(d, side);
    const restricted = playRestriction(s, this.reg, player, iid, side);
    if (restricted) throw new IllegalAction(restricted);
    if (zoneSrc) (s.usedThisTurn ??= []).push(`sfz:${zoneSrc}`);
    // マナ進化・墓地進化・進化V/GV・デッキ進化など：進化元を何枚も、バトルゾーン以外からも選ぶ
    const mspec = side === 'main' ? multiEvolveSpec(d) : undefined;
    if (mspec) {
      evolveOn = undefined;
      if (mspec.deckTop) {
        evolveFrom = undefined;
        if (s.players[player].zones.deck.length < mspec.deckTop.count) throw new IllegalAction('山札が足りません');
      } else if (evolveFrom?.length) {
        if (!validEvolveSources(s, this.reg, player, iid, evolveFrom)) throw new IllegalAction('その進化元には重ねられません');
      } else if (!mspec.optional) {
        // 選ぶ余地がなければ自動で決める
        const auto = defaultEvolveSources(s, this.reg, player, iid);
        if (!auto) throw new IllegalAction('進化元がそろっていません');
        if (mspec.atLeast || evolveSourceCandidates(s, this.reg, player, iid).length > auto.length) throw new IllegalAction('進化元を選んでください');
        evolveFrom = auto;
      }
    } else evolveFrom = undefined;
    if (mspec) {
      // 進化元は上で確かめた
    } else if (face.type !== 'evolution' && evolveOn) {
      // NEO進化：重ねて召喚する
      if (side !== 'main' || !evolutionBases(s, this.reg, player, iid).includes(evolveOn)) throw new IllegalAction('そのクリーチャーには進化できません');
    } else if (face.type === 'evolution') {
      const bases = evolutionBases(s, this.reg, player, iid);
      if (bases.length === 0) throw new IllegalAction('進化元のクリーチャーがいません');
      if (!evolveOn) {
        if (bases.length > 1) throw new IllegalAction('進化元を選んでください');
        evolveOn = bases[0];
      }
      if (!bases.includes(evolveOn)) throw new IllegalAction('そのクリーチャーには進化できません');
    }
    // ササゲール：破壊するクリーチャーは、ササゲールを持つ自分のクリーチャー（進化元にはできない）
    // ハイパーエナジー：タップするクリーチャーは、コストが異なるアンタップの自分のクリーチャー
    const hyperEnergy = usesHyperEnergy(s, this.reg, iid, side);
    if (sacrifice.length) {
      const cands = sasageruCandidates(s, this.reg, player, iid, side);
      const what = hyperEnergy ? 'ハイパーエナジーでタップ' : 'ササゲールで破壊';
      if (new Set(sacrifice).size !== sacrifice.length || sacrifice.some((x) => !cands.includes(x) || x === evolveOn)) throw new IllegalAction(`${what}できないクリーチャーが含まれています`);
      if (hyperEnergy && new Set(sacrifice.map((x) => def(s, this.reg, x).cost)).size !== sacrifice.length) throw new IllegalAction('ハイパーエナジーでは、コストが異なるクリーチャーをタップします');
    }
    // NEO進化クリーチャーとして（重ねて）召喚する
    const neo = (!!evolveOn || !!evolveFrom?.length) && face.type !== 'evolution';
    // 「進化元1体につきコストを少なくする」：選んだ進化元の数でコストを決める
    if (d.selfCost?.perEvolve) s.evolveCountHint = evolveFrom?.length ?? (evolveOn ? 1 : 0);
    const cost = effectiveCost(s, this.reg, player, iid, side, sacrifice, neo);
    const pay = choosePayment(s, this.reg, player, iid, manaIids, side, sacrifice, neo);
    delete s.evolveCountHint;
    if (!pay) throw new IllegalAction(`マナが足りません（コスト${cost}・${face.civilizations.map((c) => CIV_LABEL[c]).join('/')}）`);
    if (s.phase === 'charge') {
      s.phase = 'main';
      this.emit({ type: 'PHASE_CHANGED', phase: 'main' });
    }
    for (const m of pay) s.cards[m].tapped = true;
    if (sacrifice.length && hyperEnergy) {
      this.log(`ハイパーエナジー：${sacrifice.map((x) => this.name(x)).join('・')} をタップして、${face.name} のコストを${2 * sacrifice.length}少なくする`, player);
      for (const x of sacrifice) this.setTapped(x, player);
    } else if (sacrifice.length) {
      const total = sacrifice.reduce((a, b) => a + (keywords(s, this.reg, b).sasageru ?? 0), 0);
      this.log(`ササゲール：${sacrifice.map((x) => this.name(x)).join('・')} を破壊して、${face.name} のコストを${total}少なくする`, player);
      // コストの支払いとして破壊する（召喚より先に）
      s.queue.push(...sacrifice.map((x): Task => ({ kind: 'leave', iid: x, to: 'graveyard', cause: 'destroy' })));
    }
    const verb = face.type === 'spell' ? '唱える' : face.type === 'field' ? 'バトルゾーンに出す' : face.type === 'tamaseed' ? '使う' : inst.zone === 'hand' ? '召喚' : `${inst.zone === 'graveyard' ? '墓地' : 'マナゾーン'}から召喚`;
    this.log(`${face.name} を${verb}（${cost}マナ）`, player);
    this.emit({ type: 'CARD_PLAYED', player, iid });
    s.queue.push(face.type === 'spell' ? { kind: 'castSpell', player, iid, side, paid: cost > 0 } : { kind: 'enterBattle', player, iid, evolveOn, ...(evolveFrom?.length ? { evolveFrom } : {}), ...(mspec?.deckTop ? { evolveDeck: mspec.deckTop } : {}), paid: cost > 0, ...(isCreatureType(face.type) ? { summoned: true } : {}) });
    this.run();
  }

  /** バトル中だけ加わるパワー（「バトル中、パワーを+N」・ハンティング） */
  /** 別のコストでカードを使う（リサイクル・ギャラクシールド・フシギバース・B・A・D など） */
  private playAlt(player: PlayerId, iid: string, idx: number, manaIids: string[] | undefined, sacrifice: string[]): void {
    const s = this.s;
    const inst = s.cards[iid];
    const alt = inst && inst.owner === player ? def(s, this.reg, iid).altPlays?.[idx] : undefined;
    if (!alt) throw new IllegalAction('その使い方はできません');
    if (!canPlayAlt(s, this.reg, player, iid, idx, sacrifice)) throw new IllegalAction(`${alt.name}は今は使えません`);
    if (s.phase === 'charge') {
      s.phase = 'main';
      this.emit({ type: 'PHASE_CHANGED', phase: 'main' });
    }
    this.payAlt(player, iid, alt, manaIids, sacrifice);
    this.run();
  }

  /** 別のコストを支払い、カードを使う処理をキューに積む */
  private payAlt(player: PlayerId, iid: string, alt: AltPlay, manaIids: string[] | undefined, sacrifice: string[], front = false): void {
    const s = this.s;
    const inst = s.cards[iid];
    const d = def(s, this.reg, iid);
    const pay = altPayment(s, this.reg, player, iid, alt, manaIids, sacrifice);
    if (!pay) throw new IllegalAction(`マナが足りません（${alt.name}）`);
    const cost = altCost(s, this.reg, player, iid, alt, sacrifice);
    for (const m of pay) s.cards[m].tapped = true;
    this.log(`${d.name} を${alt.name}で使う（${cost}マナ）`, player);
    const tasks: Task[] = [];
    // フシギバース：自分のクリーチャーを1体タップしてマナゾーンに置く
    if (alt.fushigi && sacrifice[0]) tasks.push({ kind: 'leave', iid: sacrifice[0], to: 'mana', cause: 'effect', tapped: true });
    this.emit({ type: 'CARD_PLAYED', player, iid });
    if (alt.toShield) {
      // ギャラクシールド：表向きでシールドゾーンに置く
      this.moveCard(iid, 'shield');
      inst.faceUp = true;
      this.log(`${d.name} を表向きでシールドゾーンに置いた`, player);
    } else if (alt.toHyperspatial) {
      // パンドラ・シフト：超次元ゾーンに置く（「超次元ゾーンに置かれた時」の能力が誘発する）
      this.moveCard(iid, 'hyperspatial');
      this.log(`${d.name} を超次元ゾーンに置いた`, player);
    } else if (d.type === 'spell') {
      // 唱え終わったら墓地（または山札の下）へ置くため、いったん手札を経由する
      if (inst.zone !== 'hand') this.moveCard(iid, 'hand');
      tasks.push({ kind: 'castSpell', player, iid, side: 'main', ...(alt.spellAfter ? { after: alt.spellAfter } : {}) });
    } else {
      tasks.push({
        kind: 'enterBattle',
        player,
        iid,
        ...(isCreatureType(d.type) ? { summoned: true } : {}),
        paid: true,
        ...(alt.endOfTurn ? { endOfTurn: alt.endOfTurn } : {}),
        ...(alt.speed ? { grant: { keywords: { speedAttacker: true }, by: player } } : {}),
      });
    }
    if (alt.then) tasks.push(...this.effectTasks(player, iid, alt.then));
    if (front) this.insertFront(...tasks);
    else s.queue.push(...tasks);
  }

  private battleBonus(iid: string, opp: string): number {
    const kw = keywords(this.s, this.reg, iid);
    let bonus = kw.battlePower ?? 0;
    // パワード・ブロッカー：ブロック中だけ
    if (kw.blockPower && this.s.combat?.blocker === iid) bonus += kw.blockPower;
    // 「ゼニスとバトル中、パワーを+N」
    if (kw.battlePowerVs && def(this.s, this.reg, opp).races.some((r) => (kw.battlePowerVs!.races ?? [kw.battlePowerVs!.race]).some((x) => r.includes(x)))) bonus += kw.battlePowerVs.amount;
    if (kw.hunting) {
      const owner = this.s.cards[iid].owner;
      bonus += 1000 * battleCards(this.s, this.reg, owner).filter((b) => def(this.s, this.reg, b).races.some((r) => r.includes('ハンター'))).length;
    }
    return bonus;
  }

  private attack(player: PlayerId, attacker: string, target: AttackTarget): void {
    const s = this.s;
    const legal = attackTargets(s, this.reg, player, attacker);
    const ok = legal.some((t) => t.kind === target.kind && (t.kind === 'player' || (target.kind === 'creature' && t.iid === target.iid)));
    if (!ok) throw new IllegalAction('その攻撃はできません');
    if (s.phase !== 'attack') {
      s.phase = 'attack';
      this.emit({ type: 'PHASE_CHANGED', phase: 'attack' });
    }
    s.cards[attacker].tapped = true;
    s.cards[attacker].attackedTurn = s.turn;
    s.players[player].attacksThisTurn = (s.players[player].attacksThisTurn ?? 0) + 1;
    this.emit({ type: 'CREATURE_TAPPED', iid: attacker });
    const sClass = sClassCards(s, this.reg, player);
    s.combat = { attacker, attackingPlayer: player, target, ...(sClass.length ? { sClassEligible: sClass } : {}) };
    const tname = target.kind === 'player' ? s.players[other(player)].name : this.name(target.iid);
    this.log(`${this.name(attacker)} が ${tname} を攻撃`, player);
    this.emit({ type: 'ATTACK_DECLARED', player, attacker, target });
    s.queue.push({ kind: 'attackSwap', player }, { kind: 'kirifudash', player, timing: 'ownAttack' }, { kind: 'blockStep', attacker, defender: other(player) }, { kind: 'attackResolve', attacker }, { kind: 'attackEnd', attacker });
    this.run();
  }

  private respond(player: PlayerId, r: Response): void {
    const p = this.s.pending;
    if (!p) throw new IllegalAction('選択待ちではありません');
    if (p.player !== player) throw new IllegalAction('相手の選択待ちです');
    if (p.kind === 'selectCards') {
      const sel = r.selected ?? [];
      if (new Set(sel).size !== sel.length || sel.some((x) => !p.candidates.includes(x))) throw new IllegalAction('選択できないカードが含まれています');
      if (sel.length < p.min || sel.length > p.max) throw new IllegalAction(p.min === p.max ? `${p.min}枚選んでください` : `${p.min}〜${p.max}枚選んでください`);
    } else if (p.kind === 'block') {
      const sel = r.selected ?? [];
      if (sel.length > 1 || sel.some((x) => !p.blockers.includes(x))) throw new IllegalAction('ブロックできないクリーチャーです');
    } else if (p.kind === 'chooseMode') {
      const i = Number(r.selected?.[0]);
      if (!Number.isInteger(i) || i < 0 || i >= p.options.length) throw new IllegalAction('選択肢を選んでください');
    } else if (r.accept === undefined) {
      throw new IllegalAction('はい／いいえを選んでください');
    }
    this.s.pending = null;
    this.response = r;
    this.run();
  }

  // ───────────────────────── 効果処理キュー ─────────────────────────
  run(): void {
    const s = this.s;
    this.flushTriggers();
    let guard = 0;
    while (!s.pending && s.gameOverReason === null && s.queue.length > 0) {
      if (++guard > 2000) throw new Error('queue loop');
      const task = s.queue.shift()!;
      const waiting = this.exec(task);
      if (waiting) {
        s.queue.unshift(task);
        break;
      }
      this.flushTriggers();
      this.checkStateBased();
    }
    this.response = null;
    this.checkStateBased();
    // パワー0以下で破壊が積まれたら続けて処理する
    if (!s.pending && s.gameOverReason === null && s.queue.length > 0 && s.queue[0].kind === 'leave') this.run();
  }

  private insertFront(...tasks: Task[]): void {
    this.s.queue.unshift(...tasks);
  }

  private flushTriggers(): void {
    const s = this.s;
    if (!s.waiting?.length) return;
    // ルール：解決中の能力（呪文）が終わるまで、次の能力は解決しない。S・トリガーは待っている能力より先に使う
    if (s.queue.some((t) => t.kind === 'abilityEnd' || t.kind === 'shieldTrigger' || t.kind === 'orderShieldTriggers' || t.kind === 'pickTrigger')) return;
    // ルール：カードを使う処理（呪文を唱える・バトルゾーンに出す）の途中でも割り込まない。「唱えた時」などは呪文の解決後
    if (s.queue[0]?.kind === 'castSpell' || s.queue[0]?.kind === 'enterBattle') return;
    // ルール：侵略・革命チェンジなども「攻撃する時」の能力と同じタイミング。どちらを先にするかはターンプレイヤーが選ぶ
    const head = s.queue[0];
    if (s.combat?.swapFirst || s.queue.some((t) => t.kind === 'attackSwapOrder')) return;
    if (head?.kind === 'attackSwap' && !head.ordered && s.combat && attackSwapCandidates(s, this.reg, head.player, s.combat.attacker).length) {
      if (s.waiting.some((g) => g.controller === s.activePlayer)) this.insertFront({ kind: 'attackSwapOrder', player: head.player });
      else s.combat.swapFirst = true;
      return;
    }
    // ルール：ターンプレイヤーの能力をすべて解決してから、相手の能力を解決する
    const player = s.waiting.some((g) => g.controller === s.activePlayer) ? s.activePlayer : other(s.activePlayer);
    this.insertFront({ kind: 'pickTrigger', player });
  }

  /** 手札（墓地）にある間の誘発：条件に合うカードごとに、使うか聞く処理を解決待ちに加える */
  private offerHandTriggers(player: PlayerId, match: (ht: HandTrigger, iid: string) => boolean): void {
    const s = this.s;
    for (const z of ['hand', 'graveyard'] as const) {
      for (const h of [...s.players[player].zones[z]]) {
        for (const ht of def(s, this.reg, h).handTriggers ?? []) {
          if (!(ht.zones ?? ['hand']).includes(z) || !match(ht, h)) continue;
          if (ht.condition && !evalCondition(s, this.reg, player, ht.condition, false, h)) continue;
          if (ht.oncePerAttack && s.combat?.ninjaUsed?.includes(player)) continue;
          if (ht.onceKey && s.combat?.usedKeys?.includes(`${player}:${ht.onceKey}`)) continue;
          if (ht.afterAttack) {
            // 攻撃の後：その攻撃の「攻撃の終わり」のあとに、出す処理を積む
            s.afterAttackPlays = [...(s.afterAttackPlays ?? []), { player, iid: h }];
            continue;
          }
          this.addTrigger(
            player,
            h,
            this.effectTasks(player, h, [
              {
                type: 'handPlay',
                iid: h,
                ...(ht.endOfTurn ? { endOfTurn: ht.endOfTurn } : {}),
                ...(ht.oncePerAttack ? { ninja: true } : {}),
                ...(ht.spellAfter ? { spellAfter: ht.spellAfter } : {}),
                ...(ht.onceKey ? { onceKey: ht.onceKey } : {}),
                ...(ht.debt ? { debt: ht.debt } : {}),
              },
            ]),
          );
        }
      }
    }
  }

  /** 無月の門などの素材の候補：自分のバトルゾーン（フィールドを含む）・墓地の、条件に合うカード */
  private gateCandidates(player: PlayerId, self: string, filter: CardFilter, zone: 'battle' | 'graveyard'): string[] {
    const s = this.s;
    const list = zone === 'battle' ? battleAndFields(s, this.reg, player) : s.players[player].zones.graveyard;
    return list.filter((x) => x !== self && matchFilter(s, this.reg, x, filter));
  }

  /** pending: これから墓地に置かれるカード（唱えている呪文。誘発を解決する時には墓地にある） */
  private gateReady(player: PlayerId, iid: string, g: ZoneGate, pending?: string): boolean {
    const m = g.materials;
    if (!m) return true;
    const b = this.gateCandidates(player, iid, m.filter, 'battle').length;
    const extra = pending && this.s.cards[pending]?.zone !== 'graveyard' && matchFilter(this.s, this.reg, pending, m.filter) ? 1 : 0;
    const gr = this.gateCandidates(player, iid, m.filter, 'graveyard').length + extra;
    return m.total !== undefined ? b + gr >= m.total : b >= (m.battle ?? 0) && gr >= (m.graveyard ?? 0);
  }

  /** 手札・墓地にあるカードの「ゾーンからの誘発」（無月の門・ドゥベルなど）を、出来事に合わせて解決待ちに加える */
  private fireZoneGates(player: PlayerId, on: ZoneGate['on'][number], subject?: string): void {
    const s = this.s;
    for (const z of ['hand', 'graveyard'] as const) {
      for (const h of [...s.players[player].zones[z]]) {
        if (h === subject) continue;
        (def(s, this.reg, h).zoneGates ?? []).forEach((g, gate) => {
          if (!g.on.includes(on) || !g.zones.includes(z)) return;
          if (subject && g.subject && !matchFilter(s, this.reg, subject, g.subject)) return;
          if (!this.gateReady(player, h, g, on === 'spell' ? subject : undefined)) return;
          this.addTrigger(player, h, this.effectTasks(player, h, [{ type: 'optional', effects: [{ type: 'zoneGate', gate }] }]));
        });
      }
    }
  }

  /** 無月の門：素材を選び、その上にこのクリーチャーを重ねて召喚する。素材がなければそのまま出す */
  private execZoneGate(controller: PlayerId, source: string, gate: number): boolean {
    const s = this.s;
    const inst = s.cards[source];
    const g = def(s, this.reg, source).zoneGates?.[gate];
    if (!inst || !g || !(g.zones as string[]).includes(inst.zone)) return false;
    const m = g.materials;
    if (!m) {
      this.insertFront({ kind: 'enterBattle', player: controller, iid: source, ...(g.tapped ? { tapped: true } : {}) });
      this.log(`${this.name(source)} の能力：${inst.zone === 'graveyard' ? '墓地' : '手札'}からバトルゾーンに出す`, controller);
      return false;
    }
    const steps: { zones: ('battle' | 'graveyard')[]; n: number }[] =
      m.total !== undefined ? [{ zones: ['battle', 'graveyard'], n: m.total }] : [{ zones: ['battle'], n: m.battle ?? 0 }, { zones: ['graveyard'], n: m.graveyard ?? 0 }];
    const prog = (inst.gateProgress ??= { step: 0, picks: [] });
    while (prog.step < steps.length) {
      const st = steps[prog.step];
      const cands = st.zones.flatMap((z) => this.gateCandidates(controller, source, m.filter, z)).filter((x) => !prog.picks.includes(x));
      if (cands.length < st.n) {
        delete inst.gateProgress;
        this.log(`${this.name(source)}：重ねるカードが足りない`, controller);
        return false;
      }
      if (cands.length > st.n) {
        const r = this.takeResponse();
        const sel = r?.selected?.filter((x) => cands.includes(x)) ?? [];
        if (!r || sel.length !== st.n) {
          const where = st.zones.length > 1 ? 'バトルゾーンと墓地' : st.zones[0] === 'battle' ? 'バトルゾーン' : '墓地';
          s.pending = { kind: 'selectCards', player: controller, source, prompt: `${g.label}：${this.name(source)} の下に重ねるカードを${where}から${st.n}枚選んでください`, candidates: cands, min: st.n, max: st.n };
          return true;
        }
        prog.picks.push(...sel);
      } else prog.picks.push(...cands);
      prog.step++;
    }
    const picks = prog.picks;
    delete inst.gateProgress;
    this.log(`${this.name(source)} の${g.label}：${picks.length}枚の上に重ねて召喚`, controller);
    this.insertFront({ kind: 'enterBattle', player: controller, iid: source, evolveFrom: picks, summoned: true, paid: true });
    if (g.mugetsu) this.fireZoneGates(controller, 'gateUsed', source);
    return false;
  }

  /** 誘発した能力を、解決待ちに加える */
  private addTrigger(controller: PlayerId, source: string, tasks: Task[]): void {
    if (tasks.length) (this.s.waiting ??= []).push({ controller, source, tasks });
  }

  /** 解決待ちの能力から1つ選んで解決を始める。同時に待っている自分の能力が2つ以上あれば、その持ち主が順番を選ぶ */
  private execPickTrigger(player: PlayerId): boolean {
    const s = this.s;
    const all = s.waiting ?? [];
    const mine = all.filter((g) => g.controller === player);
    if (!mine.length) return false;
    let pick = mine[0];
    // 同じカードの同じ能力どうしは、どれから処理しても同じなので聞かない
    const key = (g: TriggerGroup) => `${s.cards[g.source]?.cardId}|${JSON.stringify(g.tasks).split(g.source).join('#')}`;
    if (new Set(mine.map(key)).size > 1) {
      const r = this.takeResponse();
      if (!r) {
        const labels = mine.map((g) => `${this.name(g.source)}：${describeTrigger(g)}`);
        const options = labels.map((l, i) => (labels.filter((x) => x === l).length > 1 ? `${l}（${labels.slice(0, i + 1).filter((x) => x === l).length}つ目）` : l));
        s.pending = { kind: 'chooseMode', player, source: mine[0].source, prompt: '同時に誘発した能力があります。先に処理する能力を選んでください', options };
        return true;
      }
      pick = mine[Number(r.selected?.[0])] ?? pick;
    }
    s.waiting = all.filter((g) => g !== pick);
    this.insertFront(...pick.tasks, { kind: 'abilityEnd' });
    return false;
  }

  private takeResponse(): Response | null {
    const r = this.response;
    this.response = null;
    return r;
  }

  private effectTasks(controller: PlayerId, source: string, effects: EffectDef[]): Task[] {
    return effects.map((effect): Task => ({ kind: 'effect', controller, source, effect }));
  }

  /** 入力待ちになったら true */
  private exec(task: Task): boolean {
    const s = this.s;
    switch (task.kind) {
      case 'phase':
        this.runPhase(task.phase);
        return false;

      case 'turnSwitch':
        this.turnSwitch();
        return false;

      case 'effect': {
        const waiting = this.execEffect(task.controller, task.source, task.effect);
        // 「〜してもよい。そうしたら、〜」：選んだ枚数を、続きの効果（ifChosen）にこの時点で覚えさせる
        // （間に他の誘発が入って「直前に選んだカード」が変わっても影響しないように）
        if (!waiting && CHOOSING_EFFECTS.has(task.effect.type)) {
          const bound = (x: EffectDef) => (x.type === 'ifChosen' || (x.type === 'repeat' && x.per === 'chosen')) && x.n !== undefined;
          const next = s.queue.find((t) => t.kind === 'effect' && t.source === task.source && t.controller === task.controller && !bound(t.effect));
          if (next?.kind === 'effect' && (next.effect.type === 'ifChosen' || (next.effect.type === 'repeat' && next.effect.per === 'chosen')))
            next.effect = { ...next.effect, n: (s.lastChosen ?? []).length };
        }
        return waiting;
      }

      case 'confirmOptional': {
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'confirm', player: task.controller, source: task.source, prompt: `${this.name(task.source)} の能力を使いますか？` };
          return true;
        }
        if (r.accept) this.insertFront(...this.effectTasks(task.controller, task.source, task.effects));
        else {
          this.log(`${this.name(task.source)} の能力を使わなかった`, task.controller);
          // 「そうしなければ、〜」
          if (task.otherwise) this.insertFront(...this.effectTasks(task.controller, task.source, task.otherwise));
        }
        return false;
      }

      case 'castSpell': {
        const face = playFace(def(s, this.reg, task.iid), task.side);
        // マナゾーンのカードをタップせずに唱えた呪文を数える（「マナゾーンのカードをタップせずに、〜呪文を唱えていて」）
        if (!task.paid) s.players[task.player].freeSpellsThisTurn = (s.players[task.player].freeSpellsThisTurn ?? 0) + 1;
        this.emit({ type: 'SPELL_CAST', player: task.player, iid: task.iid });
        const tasks: Task[] = [];
        for (const ab of face.abilities) if (ab.when === 'onCast') tasks.push(...this.abilityTasks(ab, task.player, task.iid));
        // 呪文の効果をすべて処理し終えるまで、途中で誘発した能力は解決を待つ
        this.insertFront(...tasks, { kind: 'spellToGrave', iid: task.iid, side: task.side, ...(task.after ? { after: task.after } : {}) }, { kind: 'abilityEnd' });
        return false;
      }

      case 'spellToGrave': {
        if (s.cards[task.iid]?.zone !== 'hand') return false;
        // 「それを唱えた後、墓地のかわりに山札の下に置く」
        // 「唱えた後、墓地に置くかわりに自分の手札に加える」（唱えている間は手札を経由しているので、そのまま残す）
        if (task.after === 'hand') {
          this.log(`${this.name(task.iid)} を手札に加えた`, s.cards[task.iid].owner);
          return false;
        }
        if (task.after === 'deckBottom') {
          this.moveCard(task.iid, 'deck', { toTop: false });
          this.log(`${this.name(task.iid)} を山札の下に置いた`, s.cards[task.iid].owner);
          return false;
        }
        // 卍 新世壊 卍：「自分の魔導具呪文を唱えた時、唱えた後で墓地に置くかわりに、このフィールドの下に置いてカードを1枚引いてもよい」
        {
          const owner = s.cards[task.iid].owner;
          const host = activeStatics(s, this.reg).find((a) => a.static.type === 'spellToUnder' && a.controller === owner && s.cards[a.source]?.zone === 'battle' && matchFilter(s, this.reg, task.iid, a.static.filter));
          if (host && host.static.type === 'spellToUnder') {
            const r = this.takeResponse();
            if (!r) {
              s.pending = { kind: 'confirm', player: owner, source: host.source, prompt: `${this.name(task.iid)} を墓地に置くかわりに ${this.name(host.source)} の下に置いて、カードを${host.static.draw}枚引きますか？` };
              return true;
            }
            if (r.accept) {
              const list = s.players[owner].zones.hand;
              const k = list.indexOf(task.iid);
              if (k >= 0) list.splice(k, 1);
              s.cards[task.iid].zone = 'battle';
              s.cards[task.iid].faceUp = true;
              s.cards[host.source].under.push(task.iid);
              this.log(`${this.name(task.iid)} を ${this.name(host.source)} の下に置いた`, owner);
              this.draw(owner, host.static.draw);
              return false;
            }
          }
        }
        const d = def(s, this.reg, task.iid);
        // チャージャー：墓地のかわりにマナゾーンに置く
        const kw = task.side === 'twin' ? d.twin?.keywords : d.keywords;
        const charger = kw?.charger || kw?.crystalCharger;
        // サイクロンなど：唱えた後、墓地のかわりに手札に戻す（afterSummon：この呪文の直前に使ったカードが召喚したクリーチャー）
        if (kw?.spellToHand) {
          const played = s.players[s.cards[task.iid].owner].playedThisTurn ?? [];
          const before = played[played.lastIndexOf(task.iid) - 1];
          const ok = kw.spellToHand === 'always' || (!!before && s.cards[before]?.zone === 'battle' && isCreatureType(def(s, this.reg, before).type));
          if (ok) {
            this.moveCard(task.iid, 'hand');
            this.log(`${this.name(task.iid)} を、唱えた後に手札に戻した`, s.cards[task.iid].owner);
            return false;
          }
        }
        if (kw?.spellToHyperspatial) {
          this.moveCard(task.iid, 'hyperspatial');
          this.log(`${this.name(task.iid)} を、唱えた後に超次元ゾーンに置いた`, s.cards[task.iid].owner);
          return false;
        }
        this.moveCard(task.iid, charger ? 'mana' : 'graveyard');
        // 水晶チャージャー：裏向きでマナゾーンに置く（文明を持たないマナになる）
        if (kw?.crystalCharger) s.cards[task.iid].faceUp = false;
        if (charger) this.log(`${this.name(task.iid)} を${kw?.crystalCharger ? '裏向きにして' : ''}マナゾーンに置いた（${kw?.crystalCharger ? '水晶' : ''}チャージャー）`, s.cards[task.iid].owner);
        return false;
      }

      case 'enterBattle': {
        const inst = s.cards[task.iid];
        if (!inst || inst.zone === 'battle') return false;
        const fromZone = inst.zone;
        const entering = def(s, this.reg, task.iid);
        // 「山札から手札以外のゾーンに置かれる時、かわりに墓地に置く」
        if (inst.zone === 'deck' && this.deckToGrave(inst.owner)) {
          this.moveCard(task.iid, 'graveyard');
          this.log(`${entering.name} はバトルゾーンに出るかわりに墓地に置かれた`, inst.owner);
          return false;
        }
        // 「このクリーチャーは、召喚以外の方法で出ない」「相手のエレメントは、相手の手札以外から出ない」：元の場所に残る
        if (!task.summoned && entering.keywords?.summonOnly) {
          this.log(`${entering.name} は召喚以外の方法では出ない`, inst.owner);
          return false;
        }
        const onlyFrom = activeStatics(s, this.reg).find(
          (a) =>
            a.static.type === 'entryOnlyFrom' &&
            (a.static.who === 'both' || (a.static.who === 'self') === (a.controller === inst.owner)) &&
            !(a.static.zones as string[]).includes(inst.zone) &&
            matchFilter(s, this.reg, task.iid, a.static.filter, a.source, true),
        );
        if (onlyFrom) {
          this.log(`${def(s, this.reg, onlyFrom.source).name} の効果：${entering.name} はバトルゾーンに出ない`, inst.owner);
          return false;
        }
        if (isCreatureType(entering.type) && !task.summoned) {
          // 「各ターン1体までしかクリーチャーを出せない」（召喚は使う前に確かめている）
          const limit = playLimitReached(s, this.reg, task.player, 'creature');
          if (limit) {
            this.log(`${entering.name}：${limit}`, task.player);
            return false;
          }
          // 「〜を出せない」：出せないクリーチャーは元の場所に残る
          const blocked = entryBlocked(s, this.reg, task.player, task.iid);
          if (blocked) {
            this.log(`${entering.name}：${blocked}`, task.player);
            return false;
          }
          // 「召喚以外の方法で出る時、かわりに墓地に置く」
          const grave = activeStatics(s, this.reg).find(
            (a) => a.static.type === 'nonSummonEntryToGrave' && (a.static.who === 'both' || (a.static.who === 'self') === (a.controller === task.player)),
          );
          if (grave) {
            this.moveCard(task.iid, 'graveyard');
            this.log(`${def(s, this.reg, grave.source).name} の効果：${entering.name} はバトルゾーンに出るかわりに墓地に置かれた`, grave.controller);
            return false;
          }
        }
        // 「〜クリーチャーがバトルゾーンに出る時、かわりに持ち主の墓地（マナゾーン）に置く」（召喚でも効果でも）
        if (isCreatureType(entering.type)) {
          const ins = activeStatics(s, this.reg).find(
            (a) =>
              a.static.type === 'enterInstead' &&
              (a.static.who === 'both' || (a.static.who === 'self') === (a.controller === inst.owner)) &&
              matchFilter(s, this.reg, task.iid, a.static.filter, a.source),
          );
          if (ins && ins.static.type === 'enterInstead') {
            const to = ins.static.to;
            this.moveCard(task.iid, to);
            this.log(`${def(s, this.reg, ins.source).name} の効果：${entering.name} はバトルゾーンに出るかわりに${ZONE_LABEL[to]}に置かれた`, ins.controller);
            return false;
          }
        }
        if (task.evolveFrom?.length || task.evolveDeck) {
          // 進化元を何枚も・バトルゾーン以外からも重ねる進化
          let sources = (task.evolveFrom ?? []).filter((x) => s.cards[x] && x !== task.iid);
          if (task.evolveDeck) {
            const deckNow = s.players[inst.owner].zones.deck;
            sources = deckNow.slice(-task.evolveDeck.count).reverse();
            if (task.evolveDeck.creatureOnly) {
              const top = sources[0];
              this.log(`山札の上から ${top ? this.name(top) : 'なし'} を表向きにした`, task.player);
              if (!top || !isCreatureType(def(s, this.reg, top).type)) {
                this.log(`クリーチャーではないので、${this.name(task.iid)} は出せずに手札に残る`, task.player);
                return false;
              }
            }
          }
          if (!sources.length) {
            this.log(`進化元がないため ${this.name(task.iid)} は出せなかった`, task.player);
            return false;
          }
          const under: string[] = [];
          let tapped = false;
          const evolvedDefs: CardDefinition[] = [];
          for (const x of sources) {
            const xi = s.cards[x];
            if (xi.zone === 'battle') {
              evolvedDefs.push(def(s, this.reg, x));
              const bz = s.players[xi.owner].zones.battle;
              const k = bz.indexOf(x);
              if (k >= 0) bz.splice(k, 1);
              tapped ||= xi.tapped;
              under.push(x, ...xi.under);
              xi.under = [];
            } else {
              const list = s.players[xi.owner].zones[xi.zone];
              const k = list.indexOf(x);
              if (k >= 0) list.splice(k, 1);
              // 下にあるカードは、ゾーンの一覧には入れずにクリーチャーに持たせる
              xi.zone = 'battle';
              under.push(x);
            }
            xi.tapped = false;
          }
          this.moveCard(task.iid, 'battle');
          inst.under = under;
          inst.tapped = tapped;
          this.log(`${this.name(task.iid)} を、進化元${sources.length}枚の上に重ねて出した`, task.player);
          for (const ed of evolvedDefs) for (const ab of ed.abilities ?? []) if (ab.when === 'onEvolved') this.addTrigger(inst.owner, task.iid, this.abilityTasks(ab, inst.owner, task.iid));
        } else if (task.evolveOn) {
          const base = s.cards[task.evolveOn];
          if (!base || base.zone !== 'battle') {
            this.log(`進化元がいないため ${this.name(task.iid)} は出せなかった`, task.player);
            return false;
          }
          const bz = s.players[base.owner].zones.battle;
          bz.splice(bz.indexOf(task.evolveOn), 1);
          const baseTapped = base.tapped;
          const baseNonEvo = def(s, this.reg, task.evolveOn).type !== 'evolution' && base.under.length === 0;
          const evolvedDef = def(s, this.reg, task.evolveOn);
          const under = [task.evolveOn, ...base.under];
          base.under = [];
          base.tapped = false;
          this.moveCard(task.iid, 'battle');
          inst.under = under;
          // 進化クリーチャーは進化元のタップ状態を引き継ぐ
          inst.tapped = baseTapped;
          if (baseNonEvo) inst.evolvedOnNonEvolution = true;
          this.log(`${this.name(task.evolveOn)} が ${this.name(task.iid)} に進化`, task.player);
          // 装備していたウエポンは、進化したクリーチャーが引き継ぐ
          for (const w of s.players[inst.owner].zones.battle) if (s.cards[w].equippedTo === task.evolveOn) s.cards[w].equippedTo = task.iid;
          // シンカパワー：「このクリーチャーが進化する時」。進化した後のクリーチャーが使う
          for (const ab of evolvedDef.abilities ?? []) if (ab.when === 'onEvolved') this.addTrigger(inst.owner, task.iid, this.abilityTasks(ab, inst.owner, task.iid));
        } else {
          this.moveCard(task.iid, 'battle');
        }
        if (task.tapped) inst.tapped = true;
        if (task.endOfTurn) inst.leaveAtTurnEnd = { turn: s.turn, how: task.endOfTurn };
        inst.enteredFree = !task.paid;
        inst.enteredBySummon = !!task.summoned;
        inst.enteredFrom = fromZone;
        inst.enteredByRevolution = !!task.byRevolution;
        if (!task.paid && isCreatureType(def(s, this.reg, task.iid).type)) s.players[inst.owner].freeEntriesThisTurn = (s.players[inst.owner].freeEntriesThisTurn ?? 0) + 1;
        // 出したクリーチャーに能力を与える
        if (task.grant) {
          if (task.grant.untilNextTurn) inst.keywordsUntil = { keywords: { ...(inst.keywordsUntil?.keywords ?? {}), ...task.grant.keywords }, player: task.grant.by };
          else inst.keywordsTurn = { ...(inst.keywordsTurn ?? {}), ...task.grant.keywords };
        }
        // 侵略・革命チェンジで出たクリーチャーが攻撃を続ける
        if (task.replaceAttacker && s.combat) {
          s.combat.attacker = task.iid;
          for (const t of s.queue) if (t.kind === 'blockStep' || t.kind === 'attackResolve' || t.kind === 'attackEnd') t.attacker = task.iid;
        }
        // EXライフ：山札の上から1枚をシールド化する
        const deck = s.players[inst.owner].zones.deck;
        const exKw = def(s, this.reg, task.iid).keywords;
        const exCount = exKw?.extraExLife ? 2 : exKw?.exLife ? 1 : 0;
        for (let i = 0; i < exCount && deck.length; i++) {
          const top = deck[deck.length - 1];
          this.moveCard(top, 'shield');
          if (!inst.exLifeShield) inst.exLifeShield = top;
          else inst.exLifeShields = [...(inst.exLifeShields ?? []), top];
        }
        if (exCount) this.log(`${this.name(task.iid)} の${exCount > 1 ? 'エクストラ' : ''}EXライフ：山札の上から${exCount}枚をシールド化`, inst.owner);
        const enteredDef = def(s, this.reg, task.iid);
        if (enteredDef.type === 'field') {
          // D2フィールド：他のD2フィールドがバトルゾーンに出たら、前のものを持ち主の墓地に置く
          if (enteredDef.typeLabel?.includes('D2')) {
            for (const p of [0, 1] as PlayerId[]) {
              for (const b of [...s.players[p].zones.battle]) {
                if (b === task.iid) continue;
                const bd = def(s, this.reg, b);
                if (bd.type === 'field' && bd.typeLabel?.includes('D2')) {
                  this.moveCard(b, 'graveyard');
                  this.log(`${bd.name} を墓地に置いた（新しいD2フィールドが出たため）`, s.cards[b].owner);
                }
              }
            }
          }
          if (task.equipTo && s.cards[task.equipTo]?.zone === 'battle') {
            inst.equippedTo = task.equipTo;
            this.log(`${enteredDef.name} を ${this.name(task.equipTo)} に装備した`, task.player);
          }
          // 「このドラグハートが出た時」「このフィールドが出た時」
          this.triggerFrom(task.iid, 'onSummon');
          return false;
        }
        // タマシードはクリーチャーではないので、召喚としては扱わない（「このタマシードが出た時」だけ誘発する）
        if (enteredDef.type === 'tamaseed') {
          this.triggerFrom(task.iid, 'onSummon');
          return false;
        }
        this.emit({ type: 'CREATURE_SUMMONED', player: task.player, iid: task.iid, ...(task.summoned ? { summoned: true } : {}) });
        return false;
      }

      case 'leave':
        return this.execLeave(task);

      case 'commandUnseal':
        return this.execCommandUnseal(task.player, task.command);

      case 'attackSwap':
        return this.execAttackSwap(task.player);

      case 'attackSwapOrder': {
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'chooseMode', player: task.player, prompt: '侵略・革命チェンジなどと「攻撃する時」の能力、どちらを先に処理しますか？', options: ['侵略・革命チェンジなどを先に使う', '「攻撃する時」の能力を先に解決する'] };
          return true;
        }
        const head = s.queue[0];
        if (r.selected?.[0] === '0') {
          if (s.combat) s.combat.swapFirst = true;
        } else if (head?.kind === 'attackSwap') head.ordered = true;
        return false;
      }

      case 'pickTrigger':
        return this.execPickTrigger(task.player);

      case 'abilityEnd':
        return false;

      case 'kirifudash': {
        const usable = (iid: string) => (def(s, this.reg, iid).altPlays ?? []).findIndex((a, i) => a.timing === (task.timing ?? 'attackEndBreak') && altUsable(s, this.reg, task.player, iid, i));
        const cands = s.players[task.player].zones.hand.filter((iid) => usable(iid) >= 0);
        if (!cands.length) return false;
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'selectCards', player: task.player, prompt: task.timing === 'ownAttack' ? 'D・D・D：コストを支払って使うカードを1枚選べます' : 'キリフダッシュ：コストを支払って召喚するクリーチャーを1体選べます', candidates: cands, min: 0, max: 1, reveal: true };
          return true;
        }
        const pick = r.selected?.[0];
        if (!pick || !cands.includes(pick)) return false;
        this.payAlt(task.player, pick, def(s, this.reg, pick).altPlays![usable(pick)], undefined, [], true);
        return false;
      }

      case 'attackEnd': {
        // 「攻撃の後、このクリーチャーをバトルゾーンに出してもよい」（手札にある間の誘発）
        const afters = s.afterAttackPlays ?? [];
        if (afters.length) {
          s.afterAttackPlays = [];
          for (const a of [...afters].reverse()) if (s.cards[a.iid]?.zone === 'hand') this.insertFront(...this.effectTasks(a.player, a.iid, [{ type: 'handPlay', iid: a.iid }]));
        }
        if (task.broke) this.insertFront({ kind: 'kirifudash', player: s.cards[task.attacker]?.owner ?? s.activePlayer });
        // 「このクリーチャーの攻撃の終わりに」
        if (s.cards[task.attacker]?.zone === 'battle') {
          this.triggerFrom(task.attacker, 'onAttackEnd');
          this.flushTriggers();
        }
        return false;
      }

      case 'linkRelease': {
        const cells = task.cells.filter((c) => s.cards[c]?.zone === 'battle');
        if (!cells.length) return false;
        let back = cells[0];
        if (cells.length > 1) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: task.player, prompt: `${task.name} のリンク解除：超次元ゾーンに戻すサイキック・セルを1枚選ぶ（残りはバトルゾーンに残る）`, candidates: cells, min: 1, max: 1 };
            return true;
          }
          if (r.selected?.[0] && cells.includes(r.selected[0])) back = r.selected[0];
        }
        this.log(`${task.name} が${task.destroyed ? '破壊され' : '離れ'}、リンク解除：${this.name(back)} を超次元ゾーンに戻した`, task.player);
        this.moveCard(back, 'hyperspatial');
        this.emit({ type: 'CREATURE_LEFT', player: task.player, iid: back, to: 'hyperspatial' });
        return false;
      }

      case 'hyperize': {
        const inst = s.cards[task.iid];
        const h = this.reg[inst?.cardId]?.hyper;
        if (!inst || inst.zone !== 'battle' || !h) return false;
        const cands = battleCards(s, this.reg, task.player).filter((b) => !s.cards[b].tapped && !(h.excludeSelf && b === task.iid) && matchFilter(s, this.reg, b, h.filter, task.iid));
        if (cands.length < h.count) return false;
        let chosen = cands;
        if (cands.length > h.count) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: task.player, source: task.iid, prompt: `${this.name(task.iid)} をハイパー化：タップするクリーチャーを${h.count}体選んでください`, candidates: cands, min: h.count, max: h.count };
            return true;
          }
          chosen = r.selected ?? [];
        }
        for (const b of chosen) s.cards[b].tapped = true;
        inst.hyper = true;
        this.log(`${this.name(task.iid)} がハイパーモードになった（${chosen.map((b) => this.name(b)).join('・')}をタップ）`, task.player);
        return false;
      }

      case 'blockStep': {
        const blockers = blockersFor(s, this.reg, task.defender, task.attacker);
        if (!s.combat || blockers.length === 0) return false;
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'block', player: task.defender, attacker: task.attacker, blockers };
          return true;
        }
        const b = r.selected?.[0];
        if (b) {
          s.cards[b].tapped = true;
          s.combat.target = { kind: 'creature', iid: b };
          s.combat.blocker = b;
          this.log(`${this.name(b)} がブロック`, task.defender);
          this.emit({ type: 'BLOCKED', blocker: b, attacker: task.attacker });
        }
        return false;
      }

      case 'attackResolve': {
        const c = s.combat;
        s.combat = null;
        if (!c || s.cards[task.attacker]?.zone !== 'battle') return false;
        const defender = other(c.attackingPlayer);
        if (c.target.kind === 'creature') {
          if (s.cards[c.target.iid]?.zone === 'battle') {
            // バトル中はパワーアタッカーを有効にするため combat を戻す
            s.combat = c;
            this.insertFront({ kind: 'battle', attacker: task.attacker, defender: c.target.iid });
          }
          return false;
        }
        if (s.players[defender].zones.shield.length === 0) {
          this.log(`${this.name(task.attacker)} のダイレクトアタック！`, c.attackingPlayer);
          this.gameOver(c.attackingPlayer, 'ダイレクトアタック');
          return false;
        }
        this.insertFront({ kind: 'breakShields', breaker: c.attackingPlayer, source: task.attacker, defender, count: breakerCount(s, this.reg, task.attacker), byAttack: true });
        // 「このクリーチャーが相手プレイヤーを攻撃してブロックされなかった時」：ブレイクの前に解決する
        this.triggerFrom(task.attacker, 'onUnblocked');
        return false;
      }

      case 'battle': {
        const { attacker, defender } = task;
        const alive = (i: string) => s.cards[i]?.zone === 'battle';
        if (!alive(attacker) || !alive(defender)) {
          s.combat = null;
          return false;
        }
        // 「バトル中、パワーを+N」はバトルの時だけ加える
        const pa = power(s, this.reg, attacker) + this.battleBonus(attacker, defender);
        const pd = power(s, this.reg, defender) + this.battleBonus(defender, attacker);
        s.combat = null;
        this.log(`バトル：${this.name(attacker)}(${pa}) vs ${this.name(defender)}(${pd})`, s.cards[attacker].owner);
        const losers: string[] = [];
        // 「すべてのバトルに勝つ」：片方だけが持っていればパワーに関係なくそちらが勝つ（両方なら相打ち）
        // 「パワーが0以下の間、すべてのバトルに勝つ」
        const winsAll = (x: string) => !!keywords(s, this.reg, x).winsAllBattles || (!!keywords(s, this.reg, x).immortalAtZeroPower && power(s, this.reg, x) <= 0);
        const winsA = winsAll(attacker);
        const winsD = winsAll(defender);
        if (winsA || winsD) {
          if (winsA) losers.push(defender);
          if (winsD) losers.push(attacker);
        } else {
          if (pa >= pd) losers.push(defender);
          if (pd >= pa) losers.push(attacker);
        }
        // スレイヤー：負けた時、相手も破壊 ／ 勝ったら自壊
        const kw = (i: string) => def(s, this.reg, i).keywords ?? {};
        for (const [me, opp] of [[attacker, defender], [defender, attacker]] as const) {
          if (losers.includes(me) && !losers.includes(opp) && kw(me).slayer) losers.push(opp);
          if (!losers.includes(me) && losers.includes(opp) && kw(me).suicideOnWin) losers.push(me);
        }
        const leaves = losers.map((l): Task => ({ kind: 'leave', iid: l, to: 'graveyard', cause: 'destroy' }));
        // 「バトルに勝った時」は負けた側の破壊を処理してから誘発させる
        const winner = winsA !== winsD ? (winsA ? attacker : defender) : winsA ? null : pa > pd ? attacker : pd > pa ? defender : null;
        this.insertFront(...leaves, ...(winner && !losers.includes(winner) ? [{ kind: 'battleWon', winner, loser: winner === attacker ? defender : attacker } as Task] : []));
        return false;
      }

      case 'battleWon':
        if (s.cards[task.winner]?.zone === 'battle') this.emit({ type: 'BATTLE_WON', winner: task.winner, loser: task.loser });
        return false;

      case 'beforeBreak':
        // 「このクリーチャーの各ブレイクの前に」：ブレイクするシールドが残っている時だけ
        if (s.cards[task.source]?.zone === 'battle' && s.players[task.defender].zones.shield.length > 0) {
          this.triggerFrom(task.source, 'onBeforeBreak');
          this.flushTriggers();
        }
        return false;

      case 'breakShields': {
        const shields = s.players[task.defender].zones.shield;
        const n = Math.min(task.count, shields.length);
        if (n === 0) return false;
        // 「各ブレイクの前に」の能力を持つクリーチャーの攻撃：1つずつブレイクし、その前に能力を誘発させる
        if (task.byAttack && !task.split && s.cards[task.source]?.zone === 'battle' && (def(s, this.reg, task.source).abilities ?? []).some((ab) => ab.when === 'onBeforeBreak')) {
          const seq: Task[] = [];
          for (let i = 0; i < n; i++) seq.push({ kind: 'beforeBreak', source: task.source, defender: task.defender }, { ...task, count: 1, split: true });
          this.insertFront(...seq);
          return false;
        }
        let chosen: string[];
        if (task.chosen) chosen = task.chosen.filter((x) => shields.includes(x));
        else if (shields.length <= n) chosen = [...shields];
        else {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: task.breaker, prompt: `ブレイクするシールドを${n}枚選んでください`, candidates: [...shields], min: n, max: n, harmful: true };
            return true;
          }
          chosen = r.selected ?? [];
        }
        // シールド・セイバー：ブレイクされるシールド1つのかわりに、そのクリーチャーを破壊してもよい
        const saver = task.saverAsked ? undefined : battleCards(s, this.reg, task.defender).find((b) => keywords(s, this.reg, b).shieldSaver);
        if (saver && chosen.length) {
          const r = this.takeResponse();
          if (!r) {
            // 選んだシールドを覚えて、答えを待つ
            task.chosen = chosen;
            s.pending = { kind: 'confirm', player: task.defender, source: saver, prompt: `シールドがブレイクされる。かわりに ${this.name(saver)} を破壊しますか？（シールド1つを守る）` };
            return true;
          }
          task.saverAsked = true;
          if (r.accept) {
            this.log(`${this.name(saver)} を破壊して、シールド1つを守った`, task.defender);
            this.insertFront({ kind: 'leave', iid: saver, to: 'graveyard', cause: 'destroy' }, { ...task, chosen: chosen.slice(1), count: chosen.length - 1 });
            return false;
          }
        }
        // シールド・プラス：束になったシールドは、下のカードもすべて一緒にブレイクされる
        chosen = chosen.flatMap((sh) => {
          const under = s.cards[sh].under;
          s.cards[sh].under = [];
          for (const u of under) {
            s.cards[u].zone = 'shield';
            shields.push(u);
          }
          return [sh, ...under];
        });
        // 「このクリーチャーがシールドをブレイクした時」：1回のブレイクで1度
        if (chosen.length && s.cards[task.source]?.zone === 'battle') this.emit({ type: 'BROKE_SHIELDS', player: s.cards[task.source].owner, iid: task.source });
        const triggers: Task[] = [];
        // ブレイクしたシールドを手札に加えるかわりに墓地に置く
        const srcKw = s.cards[task.source]?.zone === 'battle' ? keywords(s, this.reg, task.source) : undefined;
        const burn = !!srcKw?.shieldBurn;
        // 「そのシールドを手札に加えるかわりに持ち主の山札の下に置く」
        const toBottom = srcKw?.shieldBreakTo === 'deckBottom';
        let bottomed = 0;
        for (const sh of chosen) {
          if (toBottom) {
            this.moveCard(sh, 'deck', { toTop: false });
            bottomed++;
            continue;
          }
          // シールド・ゴーで表向きのシールドは、手札に加えるかわりに墓地へ
          const goDown = s.cards[sh].faceUp && !!def(s, this.reg, sh).keywords?.shieldGo;
          this.moveCard(sh, burn || goDown ? 'graveyard' : 'hand');
          if (goDown) continue;
          this.emit({ type: 'SHIELD_BROKEN', player: task.defender, iid: sh });
          if (burn) continue;
          const d = def(s, this.reg, sh);
          if (d.keywords?.shieldTrigger || d.twin?.keywords?.shieldTrigger || this.conditionalTrigger(task.defender, sh)) triggers.push({ kind: 'shieldTrigger', player: task.defender, iid: sh });
          // G・ストライク：相手のクリーチャーを1体選んでもよい。このターン、そのクリーチャーは攻撃できない
          // 「このクリーチャーの攻撃中、相手は「G・ストライク」を使えない」
          const noG = task.byAttack && s.cards[task.source]?.zone === 'battle' && !!keywords(s, this.reg, task.source).noGStrikeAgainst;
          if (d.keywords?.gStrike && !noG) {
            triggers.push({
              kind: 'confirmOptional',
              controller: task.defender,
              source: sh,
              effects: [{ type: 'grantKeyword', target: { owner: 'opponent', zone: 'battle', count: 1 }, keywords: { cannotAttack: true } }],
            });
          }
        }
        this.log(`シールドを${chosen.length}枚ブレイク（残り${shields.length}枚）${burn ? '：墓地に置いた' : toBottom ? '：山札の下に置いた' : ''}`, task.breaker);
        // 「その後、各プレイヤーはこうして置かれたシールドの数、カードを引く」
        if (bottomed && srcKw?.shieldBreakEachDraws) {
          for (const p of [task.breaker, task.defender]) this.draw(p, bottomed);
          this.log(`各プレイヤーはカードを${bottomed}枚引く`, task.breaker);
        }
        // キリフダッシュ：この攻撃でシールドをブレイクしたことを、攻撃の終わりの処理に伝える
        if (task.byAttack && chosen.length) for (const t of s.queue) if (t.kind === 'attackEnd') t.broke = true;
        // ルール：S・トリガーが2枚以上あれば、ブレイクされたプレイヤーが使う順番を選ぶ
        const st = triggers.filter((t): t is Extract<Task, { kind: 'shieldTrigger' }> => t.kind === 'shieldTrigger');
        const rest = triggers.filter((t) => t.kind !== 'shieldTrigger');
        this.insertFront(...(st.length > 1 ? [{ kind: 'orderShieldTriggers', player: task.defender, iids: st.map((t) => t.iid) } as Task] : st), ...rest);
        return false;
      }

      case 'shieldTrigger':
        return this.execShieldTrigger(task.player, task.iid);

      case 'orderShieldTriggers': {
        // まだ手札にあるS・トリガーだけ（先に使った能力で手札から離れたものは使えない）
        const left = task.iids.filter((x) => s.cards[x]?.zone === 'hand');
        if (left.length <= 1) {
          this.insertFront(...left.map((iid): Task => ({ kind: 'shieldTrigger', player: task.player, iid })));
          return false;
        }
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'chooseMode', player: task.player, prompt: 'S・トリガーが2枚以上あります。先に処理するカードを選んでください（選んだカードから、使うかどうかを聞きます）', options: left.map((x) => this.name(x)) };
          return true;
        }
        const first = left[Number(r.selected?.[0])] ?? left[0];
        this.insertFront({ kind: 'shieldTrigger', player: task.player, iid: first }, { kind: 'orderShieldTriggers', player: task.player, iids: left.filter((x) => x !== first) });
        return false;
      }
    }
  }

  private execShieldTrigger(player: PlayerId, iid: string): boolean {
    const s = this.s;
    const inst = s.cards[iid];
    if (!inst || inst.zone !== 'hand') return false;
    const d = def(s, this.reg, iid);
    const sides = (['main', 'twin'] as const).filter((side) => (side === 'main' ? d.keywords?.shieldTrigger || this.conditionalTrigger(player, iid) : d.twin?.keywords?.shieldTrigger));
    const r = this.takeResponse();
    if (!r) {
      if (sides.length === 1) s.pending = { kind: 'confirm', player, source: iid, prompt: `S・トリガー「${playFace(d, sides[0]).name}」を使いますか？` };
      else s.pending = { kind: 'chooseMode', player, source: iid, prompt: 'S・トリガーを使いますか？', options: [...sides.map((x) => `${playFace(d, x).name}を使う`), '使わない'] };
      return true;
    }
    const side = sides.length === 1 ? (r.accept ? sides[0] : null) : (sides[Number(r.selected?.[0])] ?? null);
    if (!side) return false;
    const face = playFace(d, side);
    const restricted = playRestriction(s, this.reg, player, iid, side);
    if (restricted) {
      this.log(`${face.name}：${restricted}`, player);
      return false;
    }
    let evolveOn: string | undefined;
    if (face.type === 'evolution') {
      evolveOn = evolutionBases(s, this.reg, player, iid)[0];
      if (!evolveOn) {
        this.log(`${face.name}：進化元がいないため使えません`, player);
        return false;
      }
    }
    this.log(`S・トリガー！ ${face.name}`, player);
    this.emit({ type: 'CARD_PLAYED', player, iid });
    this.insertFront(face.type === 'spell' ? { kind: 'castSpell', player, iid, side } : { kind: 'enterBattle', player, iid, evolveOn, summoned: true });
    return false;
  }

  /** 「〜があれば、自分のシールドゾーンにあるこの呪文に「S・トリガー」を与える」の条件を満たすか */
  private conditionalTrigger(player: PlayerId, iid: string): boolean {
    const cond = def(this.s, this.reg, iid).shieldTriggerIf;
    return !!cond && evalCondition(this.s, this.reg, player, cond, false, iid);
  }

  /** 侵略・革命チェンジ：攻撃中のクリーチャーが条件に合えば、手札のカードを使ってもよい（何度でも） */
  private execAttackSwap(player: PlayerId): boolean {
    const s = this.s;
    const c = s.combat;
    if (c && !this.response && !attackSwapCandidates(s, this.reg, player, c.attacker).length) c.swapFirst = false;
    if (!c || s.cards[c.attacker]?.zone !== 'battle') {
      if (c) c.swapFirst = false;
      return false;
    }
    const candidates = attackSwapCandidates(s, this.reg, player, c.attacker);
    if (!candidates.length) return false;
    const r = this.takeResponse();
    if (!r) {
      s.pending = {
        kind: 'selectCards',
        player,
        source: c.attacker,
        prompt: `${this.name(c.attacker)} の攻撃時に、侵略・革命チェンジ・アタック・チャンスで使うカードを選んでください（使わないなら選ばずに決定）`,
        candidates,
        min: 0,
        max: 1,
      };
      return true;
    }
    const pick = r.selected?.[0];
    if (!pick) {
      c.swapFirst = false;
      return false;
    }
    // 使い終わるまで（もう一度使えるか聞き終わるまで）、待っている能力は解決しない
    c.swapFirst = true;
    const d = def(s, this.reg, pick);
    const old = c.attacker;
    if (d.attackSwap?.kind === 'attackChance') {
      // アタック・チャンス：コストを支払わずに使う
      this.log(`アタック・チャンス！ ${d.name}`, player);
      // 使い終わってから、もう一度使えるカードがないか聞く（insertFront は前に積むので先に積む）
      this.insertFront({ kind: 'attackSwap', player });
      this.playFree(player, pick, isCreatureType(d.type) ? 'creature' : 'spell');
    } else if (d.attackSwap?.kind === 'revolution') {
      // 革命チェンジ：攻撃中のクリーチャーを手札に戻し、このクリーチャーを出して攻撃を続ける
      this.log(`革命チェンジ！ ${this.name(old)} を手札に戻し、${d.name} を出す`, player);
      this.emit({ type: 'CARD_PLAYED', player, iid: pick });
      this.insertFront(
        { kind: 'leave', iid: old, to: 'hand', cause: 'effect' },
        { kind: 'enterBattle', player, iid: pick, tapped: true, replaceAttacker: true, byRevolution: true },
        { kind: 'attackSwap', player },
      );
    } else if (s.cards[pick].zone === 'battle') {
      // S級侵略[宇宙]・[轟速]：バトルゾーンのこのクリーチャーを攻撃中のクリーチャーの上に重ねる（新たに出たことにはならない）
      this.log(`S級侵略！ バトルゾーンの ${d.name} を ${this.name(old)} の上に重ねる`, player);
      this.stackFromBattle(pick, old, !!d.attackSwap?.battleCardOnly);
      this.insertFront({ kind: 'attackSwap', player });
    } else {
      // 侵略：攻撃中のクリーチャーの上に重ねて進化し、攻撃を続ける
      const from = s.cards[pick].zone;
      const fromText = from === 'graveyard' ? '墓地から' : from === 'mana' ? 'マナゾーンから' : '';
      this.log(`${fromText ? 'S級' : ''}侵略！ ${this.name(old)} の上に ${fromText}${d.name} を重ねる`, player);
      this.emit({ type: 'CARD_PLAYED', player, iid: pick });
      this.insertFront({ kind: 'enterBattle', player, iid: pick, evolveOn: old, replaceAttacker: true }, { kind: 'attackSwap', player });
    }
    return false;
  }

  /**
   * S級侵略：バトルゾーンにある top を、攻撃中の attacker の上に重ねて攻撃を続けさせる。
   * cardOnly なら top のカードだけを移し、下にあったカードはバトルゾーンに残る（[宇宙]）。そうでなければ下のカードごと移す（[轟速]）
   */
  private stackFromBattle(top: string, attacker: string, cardOnly: boolean): void {
    const s = this.s;
    const inst = s.cards[top];
    const base = s.cards[attacker];
    const bz = s.players[inst.owner].zones.battle;
    let carried = inst.under;
    if (cardOnly && carried.length) {
      // 下にあったカードの一番上が、そのままバトルゾーンに残る
      const [next, ...rest] = carried;
      s.cards[next].under = rest;
      s.cards[next].tapped = inst.tapped;
      bz.splice(bz.indexOf(top), 1, next);
      carried = [];
    } else {
      bz.splice(bz.indexOf(top), 1);
    }
    // 攻撃中のクリーチャーの位置に、重ねたカードを置く（攻撃中なのでタップ状態を引き継ぐ）
    bz.splice(bz.indexOf(attacker), 1, top);
    inst.under = [...carried, attacker, ...base.under];
    base.under = [];
    inst.tapped = base.tapped;
    if (s.combat) {
      s.combat.attacker = top;
      for (const t of s.queue) if (t.kind === 'blockStep' || t.kind === 'attackResolve' || t.kind === 'attackEnd') t.attacker = top;
    }
  }

  /** バトルゾーンを離れる処理。置換効果があればここで適用する */
  // ───────────────────────── 封印・禁断解放 ─────────────────────────

  /** コマンドが出た時：その持ち主は、コマンドと同じ文明を持つ自身のカードから封印を1つ墓地に置く */
  private execCommandUnseal(player: PlayerId, command: string): boolean {
    const s = this.s;
    const civs = s.cards[command] ? def(s, this.reg, command).civilizations : [];
    const candidates = s.players[player].zones.battle.filter((iid) => s.cards[iid].seals?.length && def(s, this.reg, iid).civilizations.some((c) => civs.includes(c)));
    if (candidates.length === 0) return false;
    let pick = candidates[0];
    if (candidates.length > 1) {
      const r = this.takeResponse();
      if (!r) {
        s.pending = {
          kind: 'selectCards',
          player,
          source: command,
          prompt: `${this.name(command)}（コマンド）：封印を1つ外すカードを選んでください`,
          candidates,
          min: 1,
          max: 1,
        };
        return true;
      }
      pick = r.selected?.[0] ?? pick;
    }
    const seals = s.cards[pick].seals!;
    const seal = seals[seals.length - 1];
    this.log(`${this.name(command)}（コマンド）が出たので、${this.name(pick)} の封印を1つ墓地に置く（残り${seals.length - 1}）`, player);
    this.moveCard(seal, 'graveyard');
    return false;
  }

  /** カードに封印を1つ付ける（持ち主の山札の上から1枚目を裏向きで重ねる） */
  sealCard(iid: string, silent = false): boolean {
    const s = this.s;
    const inst = s.cards[iid];
    const top = this.topOfDeck(inst.owner);
    if (!top) {
      if (!silent) this.log(`山札がないため ${this.name(iid)} に封印を付けられない`, inst.owner);
      return false;
    }
    this.moveCard(top, 'seal');
    (inst.seals ??= []).push(top);
    if (!silent) this.log(`${this.name(iid)} に封印を1つ付けた`, inst.owner);
    return true;
  }

  /** 封印が外れた後の処理：禁断の鼓動なら禁断解放、封印されていたクリーチャーなら元に戻る */
  private afterSealRemoved(holder: string): void {
    const s = this.s;
    const inst = s.cards[holder];
    if (!inst || inst.zone !== 'battle' || inst.seals?.length) return;
    delete inst.seals;
    const d = this.reg[inst.cardId];
    if (d?.forbidden && !inst.flipped) {
      inst.flipped = true;
      this.log(`${d.name} の封印がすべてなくなった。禁断解放！ ${d.forbidden.creature.name} に裏返る`, inst.owner);
      this.triggerFrom(holder, 'onUnleash');
    } else {
      this.log(`${this.name(holder)} の封印がすべてなくなった`, inst.owner);
    }
  }

  /** クロスギアをクリーチャーにクロスする（付け替えもこれ）。「このクリーチャーにクロスギアをクロスする時」を誘発させる */
  private crossGear(gear: string, host: string, player: PlayerId, note = ''): void {
    this.s.cards[gear].equippedTo = host;
    this.log(`${this.name(gear)} を ${this.name(host)} にクロスした${note}`, player);
    this.triggerFrom(host, 'onCrossed');
  }

  /** 「可能なら毎ターン攻撃する」クリーチャーが攻撃できるうちは、攻撃を終われない */
  private checkForcedAttack(player: PlayerId): void {
    const forced = forcedAttackers(this.s, this.reg, player);
    if (forced.length) throw new IllegalAction(`${this.name(forced[0])} は可能なら攻撃しなければなりません`);
  }

  private execLeave(task: Extract<Task, { kind: 'leave' }>): boolean {
    const s = this.s;
    const inst = s.cards[task.iid];
    if (!inst || inst.zone !== 'battle') return false;
    // 「このクリーチャーは離れない」「破壊以外の方法で離れない」
    if (cannotLeaveNow(s, this.reg, task.iid, task.cause === 'destroy')) {
      this.log(`${this.name(task.iid)} はバトルゾーンを離れない`, inst.owner);
      return false;
    }
    const replaced = task.replaced ?? [];
    const exShields = [inst.exLifeShield, ...(inst.exLifeShields ?? [])].filter((x): x is string => !!x && s.cards[x]?.zone === 'shield');
    const reps = this.findReplacements(task.iid, task.cause, replaced);
    // ルール：置換効果が2つ以上ある時は、影響を受けるカードの持ち主がどれを適用するか選ぶ
    const opts = [
      ...(exShields.length ? [{ key: 'ex', label: 'EXライフ：かわりにそのシールドを墓地に置く' }] : []),
      ...reps.map((x) => ({ key: x.key, label: `${this.name(x.source)}：かわりに${INSTEAD_LABEL[x.ability.instead]}${x.ability.optional ? '（使ってもよい）' : ''}` })),
    ];
    let chosen = opts.find((o) => o.key === task.chosen)?.key;
    if (!chosen && opts.length > 1) {
      // どれも「〜してもよい」なら、使わないことも選べる
      const allOptional = !exShields.length && reps.every((x) => x.ability.optional);
      const r = this.takeResponse();
      if (!r) {
        s.pending = {
          kind: 'chooseMode',
          player: inst.owner,
          source: task.iid,
          prompt: `${this.name(task.iid)} が${task.cause === 'destroy' ? '破壊される' : 'バトルゾーンを離れる'}。かわりに行う効果が${opts.length}つあります。適用するものを選んでください`,
          options: [...opts.map((o) => o.label), ...(allOptional ? ['どれも使わない'] : [])],
        };
        return true;
      }
      const idx = Number(r.selected?.[0]);
      if (allOptional && idx === opts.length) {
        this.insertFront({ ...task, chosen: undefined, replaced: [...replaced, ...reps.map((x) => x.key)] });
        return false;
      }
      chosen = (opts[idx] ?? opts[0]).key;
      task.chosen = chosen;
      // 選んだ「〜してもよい」の効果は、使うかどうかをもう一度聞かない
      if (chosen !== 'ex') task.confirmed = chosen;
    }
    // EXライフ：離れるかわりに、そのシールドを墓地に置く
    if (exShields.length && (!chosen || chosen === 'ex')) {
      const sh = exShields[0];
      inst.exLifeShield = exShields[1];
      inst.exLifeShields = exShields.slice(2);
      this.moveCard(sh, 'graveyard');
      this.log(`${this.name(task.iid)} はEXライフのシールドを墓地に置いて、バトルゾーンにとどまった`, inst.owner);
      this.triggerFrom(task.iid, 'onExLifeLeft');
      return false;
    }
    const rep = (chosen ? reps.find((x) => x.key === chosen) : reps[0]) ?? null;
    if (rep) {
      const { source, ability, key } = rep;
      const owner = s.cards[source].owner;
      if (ability.optional && task.confirmed !== key) {
        const r = this.takeResponse();
        if (!r) {
          s.pending = {
            kind: 'confirm',
            player: owner,
            source,
            prompt: `${this.name(task.iid)} が${task.cause === 'destroy' ? '破壊される' : 'バトルゾーンを離れる'}。${this.name(source)} の能力で、かわりに${INSTEAD_LABEL[ability.instead]}？`,
          };
          return true;
        }
        if (!r.accept) {
          this.insertFront({ ...task, replaced: [...replaced, key] });
          return false;
        }
      }
      this.log(`${this.name(source)} の置換効果：${this.name(task.iid)} は${task.cause === 'destroy' ? '破壊されるかわりに' : 'かわりに'}${INSTEAD_LABEL[ability.instead]}`, owner);
      switch (ability.instead) {
        case 'stay':
          return false;
        case 'shedUnder': {
          if (!inst.under.length) {
            this.insertFront({ ...task, replaced: [...replaced, key] });
            return false;
          }
          // G-NEO進化：かわりに下のカードすべてが離れる
          const shed = [...inst.under];
          for (const u of shed) {
            s.cards[u].zone = 'battle';
            this.moveCard(u, task.to);
          }
          inst.under = [];
          for (const u of shed) this.emit({ type: 'UNDER_LEFT', iid: task.iid, card: u });
          return false;
        }
        case 'underToDeckBottom': {
          // 《大魔王 ウラギリダムス》：かわりに下に重ねたカードを山札の下に置き、バトルゾーンにとどまる
          const need = ability.count ?? 5;
          if (inst.under.length < need) {
            this.insertFront({ ...task, replaced: [...replaced, key] });
            return false;
          }
          this.sendUnderToDeckBottom(task.iid, need);
          return false;
        }
        case 'unflip': {
          // 解除・龍回避：裏面の時だけ。表面に裏返してバトルゾーンにとどまる
          if (!inst.flipped) {
            this.insertFront({ ...task, chosen: undefined, replaced: [...replaced, key] });
            return false;
          }
          inst.flipped = false;
          return false;
        }
        case 'shedTop': {
          // スター進化：かわりに一番上のカードが離れ、下のカードがクリーチャーとして残る
          if (!inst.under.length) {
            this.insertFront({ ...task, chosen: undefined, replaced: [...replaced, key] });
            return false;
          }
          this.popTop(task.iid);
          this.moveCard(task.iid, task.to, { toTop: task.toTop ?? true });
          if (task.cause === 'destroy') this.emit({ type: 'CREATURE_DESTROYED', player: inst.owner, iid: task.iid });
          this.emit({ type: 'CREATURE_LEFT', player: inst.owner, iid: task.iid, to: task.to });
          return false;
        }
        case 'seal': {
          // かわりに封印を付ける：山札の上から1枚を封印にし、バトルゾーンにとどまる（封印中は両プレイヤーが無視する）
          if (!s.players[s.cards[task.iid].owner].zones.deck.length) {
            this.insertFront({ ...task, replaced: [...replaced, key] });
            return false;
          }
          this.sealCard(task.iid);
          return false;
        }
        case 'escape': {
          const shields = s.players[owner].zones.shield;
          if (!shields.length) {
            this.insertFront({ ...task, replaced: [...replaced, key] });
            return false;
          }
          // シールドを手札に加える（S・トリガーは使えない）
          for (let k = 0; k < (ability.count ?? 1) && shields.length; k++) this.moveCard(shields[shields.length - 1], 'hand');
          return false;
        }
        case 'destroySelf':
          this.insertFront({ kind: 'leave', iid: source, to: 'graveyard', cause: 'destroy', replaced: [...replaced, key] });
          return false;
        case 'faceUpShieldToGrave': {
          // かわりに、いずれかのシールドゾーンにある表向きのカードを1枚、持ち主の墓地に置く
          const cands = this.faceUpShields();
          let pick = cands[0];
          if (cands.length > 1) {
            const r = this.takeResponse();
            if (!r) {
              task.confirmed = key;
              s.pending = { kind: 'selectCards', player: owner, source, prompt: `${this.name(task.iid)} のかわりに墓地に置く、シールドゾーンの表向きのカードを1枚選んでください`, candidates: cands, min: 1, max: 1 };
              return true;
            }
            pick = r.selected?.[0] ?? pick;
          }
          this.removeFromShield(pick);
          this.moveCard(pick, 'graveyard');
          this.log(`${this.name(pick)} をシールドゾーンから墓地に置いた`, owner);
          return false;
        }
        case 'avertCost': {
          // CRY-S-MAX進化：かわりに自分の表向きのカードを count 枚破壊するか、自分のシールドを shieldAlt 個墓地に置く
          const need = ability.count ?? 3;
          const faceUp = battleAndFields(s, this.reg, owner).filter((x) => x !== task.iid);
          const shields = s.players[owner].zones.shield;
          // 離れようとしているこのクリーチャー自身は数えない
          const canDestroy = faceUp.length >= need;
          const canShield = !!ability.shieldAlt && shields.length >= ability.shieldAlt;
          let mode: 'destroy' | 'shield' | null = canShield && !canDestroy ? 'shield' : canDestroy && !canShield ? 'destroy' : null;
          if (!canDestroy && !canShield) {
            this.insertFront({ ...task, replaced: [...replaced, key] });
            return false;
          }
          if (!mode) {
            const r = this.takeResponse();
            if (!r) {
              task.confirmed = key;
              s.pending = { kind: 'chooseMode', player: owner, source, prompt: `${this.name(task.iid)}：かわりに行うことを選んでください`, options: [`自分の表向きのカードを${need}枚破壊する`, `自分のシールドを${ability.shieldAlt}つ墓地に置く`] };
              return true;
            }
            mode = Number(r.selected?.[0]) === 1 ? 'shield' : 'destroy';
          }
          if (mode === 'shield') {
            for (let k = 0; k < (ability.shieldAlt ?? 1) && shields.length; k++) this.moveCard(shields[shields.length - 1], 'graveyard');
            this.log(`${this.name(task.iid)}：かわりに自分のシールドを${ability.shieldAlt}つ墓地に置いた`, owner);
            return false;
          }
          // 破壊するカードは、コストの小さいものから自動で選ぶ（負ける時の置換 avertLoss と同じ）
          const picks = faceUp.sort((a, b) => def(s, this.reg, a).cost - def(s, this.reg, b).cost).slice(0, need);
          this.log(`${this.name(task.iid)}：かわりに自分の表向きのカードを${need}枚破壊する`, owner);
          this.insertFront(...picks.map((x): Task => ({ kind: 'leave', iid: x, to: 'graveyard', cause: 'destroy', replaced: [...replaced, key] })));
          return false;
        }
        case 'destroyOther': {
          // かわりに自分の他のクリーチャーを1体（N枚）破壊する（足りなければ置換しない）
          const need = ability.count ?? 1;
          const cands = (ability.anyCard ? battleAndFields(s, this.reg, owner) : battleCards(s, this.reg, owner)).filter((x) => x !== task.iid);
          if (cands.length < need) {
            this.insertFront({ ...task, replaced: [...replaced, key] });
            return false;
          }
          let picks = cands.slice(0, need);
          if (cands.length > need) {
            const r = this.takeResponse();
            if (!r) {
              // 使うと答えた後に選ぶ：このタスクをもう一度処理する時は確認を飛ばす
              task.confirmed = key;
              const what = ability.anyCard ? `カードを${need}枚` : `クリーチャーを${need}体`;
              s.pending = { kind: 'selectCards', player: owner, source, prompt: `${this.name(task.iid)} のかわりに破壊する自分の${what}選んでください`, candidates: cands, min: need, max: need, harmful: true };
              return true;
            }
            picks = r.selected?.length ? r.selected : picks;
          }
          this.insertFront(...picks.map((pick): Task => ({ kind: 'leave', iid: pick, to: 'graveyard', cause: 'destroy', replaced: [...replaced, key] })));
          return false;
        }
        default: {
          const to: ZoneName = ability.instead === 'toHand' ? 'hand' : ability.instead === 'toMana' ? 'mana' : ability.instead === 'toShield' ? 'shield' : 'deck';
          this.moveCard(task.iid, to, { toTop: ability.instead !== 'toDeckBottom' });
          this.emit({ type: 'CREATURE_LEFT', player: inst.owner, iid: task.iid, to });
          return false;
        }
      }
    }
    // リンク解除：セルのうち1枚を選んで超次元ゾーンに戻し、残りは裏返してバトルゾーンに残る
    if (inst.links?.length) {
      // 先に表へ戻してから選ばせる（選ぶ時にセルの名前が見えるように）
      const name = this.name(task.iid);
      const cells = this.unlink(task.iid);
      this.insertFront({ kind: 'linkRelease', player: inst.owner, name, cells, destroyed: task.cause === 'destroy' });
      return false;
    }
    if (task.cause === 'destroy') this.log(`${this.name(task.iid)} は破壊された`, inst.owner);
    if (task.shieldTop) {
      this.placeOnShield(task.iid);
      this.emit({ type: 'CREATURE_LEFT', player: inst.owner, iid: task.iid, to: 'shield' });
      return false;
    }
    this.moveCard(task.iid, task.to, { toTop: task.toTop ?? true });
    if (task.tapped && task.to === 'mana') inst.tapped = true;
    if (task.cause === 'destroy') this.emit({ type: 'CREATURE_DESTROYED', player: inst.owner, iid: task.iid });
    this.emit({ type: 'CREATURE_LEFT', player: inst.owner, iid: task.iid, to: task.to });
    return false;
  }

  /** いま適用できる置換効果すべて（自分自身のもの、次に自分の他のカードのものの順） */
  private findReplacements(iid: string, cause: LeaveCause, used: string[]): { source: string; ability: ReplacementAbility; key: string }[] {
    const out: { source: string; ability: ReplacementAbility; key: string }[] = [];
    const s = this.s;
    const owner = s.cards[iid].owner;
    // 自分自身の置換効果を優先し、次に自分の他のクリーチャーのもの
    const sources = [iid, ...battleAndFields(s, this.reg, owner).filter((x) => x !== iid)];
    for (const src of sources) {
      const reps = def(s, this.reg, src).replacements ?? [];
      for (let i = 0; i < reps.length; i++) {
        const ab = reps[i];
        const key = `${src}:${i}`;
        if (used.includes(key)) continue;
        if (ab.event === 'destroyed' && cause !== 'destroy') continue;
        const subjectOk = ab.subject === 'self' ? src === iid : ab.subject === 'otherOwn' ? src !== iid : ab.subject === 'equipped' ? s.cards[src].equippedTo === iid : true;
        if (!subjectOk || !matchFilter(s, this.reg, iid, ab.filter, src)) continue;
        if (ab.instead === 'destroySelf' && src === iid) continue;
        if (ab.condition && !evalCondition(s, this.reg, s.cards[src].owner, ab.condition, false, src)) continue;
        // 真・エスケープ・マナ武装：シールドが足りなければ置換しない
        if (ab.instead === 'escape' && s.players[s.cards[src].owner].zones.shield.length < (ab.count ?? 1)) continue;
        if (ab.instead === 'faceUpShieldToGrave' && !this.faceUpShields().length) continue;
        out.push({ source: src, ability: ab, key });
      }
    }
    return out;
  }

  // ───────────────────────── 効果 ─────────────────────────
  private execEffect(controller: PlayerId, source: string, e: EffectDef): boolean {
    const s = this.s;
    const opp = other(controller);
    // 移動系の効果（旧形式を含む）は move 1つで処理する
    const mv = asMove(e);
    if (mv) e = mv;
    switch (e.type) {
      case 'draw': {
        let count = e.count;
        if (e.upTo) {
          const r = this.takeResponse();
          if (!r) {
            const options = Array.from({ length: e.count + 1 }, (_, i) => `${e.count - i}枚引く`);
            s.pending = { kind: 'chooseMode', player: controller, source, prompt: `${this.name(source)}：カードを何枚引きますか？（山札残り${s.players[controller].zones.deck.length}枚）`, options };
            return true;
          }
          count = e.count - Number(r.selected?.[0] ?? 0);
        }
        this.draw(controller, count);
        this.log(`カードを${count}枚引く`, controller);
        return false;
      }
      case 'addManaFromDeck':
        return this.execEffect(controller, source, { type: 'deckTopTo', count: e.count, to: 'mana' });
      case 'addShieldFromDeck':
        return this.execEffect(controller, source, { type: 'deckTopTo', count: e.count, to: 'shield' });
      case 'choose':
        // 選ぶだけ（動かさない）。選んだカードは後の文の「それ」「その2体」で指す
        return this.withTargets(controller, source, e.target, e.reveal ? '見る' : '選ぶ', false, (iid) => {
          if (e.reveal) this.log(`${this.name(source)}：${this.name(iid)} を見た`, controller);
        });
      case 'nextSummonDiscount':
        s.players[controller].nextSummonDiscount = { amount: e.amount, min: e.min, ...(e.grant ? { grant: e.grant } : {}), turn: s.turn };
        this.log(`このターン、次に召喚するクリーチャーのコストを${e.amount}少なくする`, controller);
        return false;
      case 'markUsed':
        (s.usedThisTurn ??= []).push(`${controller}:${e.key}`);
        return false;
      case 'deckTopTo': {
        // 「そのプレイヤーは自身の山札の上から〜」：直前に選んだカードの持ち主
        const chosenOwner = (s.lastChosen ?? []).map((x) => s.cards[x]?.owner).find((x) => x !== undefined);
        const who = e.who === 'opponent' ? opp : e.who === 'chosenOwner' ? (chosenOwner ?? controller) : controller;
        // 動かしたカードは、後の文の「そのカード」で指せる
        s.lastChosen = [];
        for (let i = 0; i < e.count; i++) {
          const top = this.topOfDeck(who);
          if (!top) break;
          s.lastChosen.push(top);
          if (e.to === 'under' && !this.deckToGrave(who)) {
            this.putUnder(top, source, controller);
            continue;
          }
          if (e.to === 'shieldTop') {
            this.placeOnShield(top);
            continue;
          }
          this.moveCard(top, e.to === 'under' ? 'graveyard' : e.to);
          const to = s.cards[top].zone as keyof typeof ZONE_LABEL;
          if (e.tapped && to === 'mana') s.cards[top].tapped = true;
          const shown = to === 'shield' || to === 'hand' ? '1枚' : this.name(top);
          this.log(`${s.players[who].name} の山札の上から${shown}を${ZONE_LABEL[to] ?? '墓地'}へ`, controller);
        }
        return false;
      }
      case 'revealUntilSameCost': {
        const deck = s.players[controller].zones.deck;
        const revealed: string[] = [];
        const counts = new Map<number, number>();
        let matched = false;
        for (let i = deck.length - 1; i >= 0; i--) {
          const iid = deck[i];
          revealed.push(iid);
          const c = def(s, this.reg, iid).cost;
          counts.set(c, (counts.get(c) ?? 0) + 1);
          if ((counts.get(c) ?? 0) >= e.count) {
            matched = true;
            break;
          }
        }
        this.log(`山札の上から${revealed.length}枚を表向きにした：${revealed.map((x) => this.name(x)).join('、') || 'なし'}${matched ? '' : '（山札をすべて表向きにした）'}`, controller);
        // 後の文の「表向きにしたカード」「こうして山札をすべて表向きにした場合」で使う
        s.lastChosen = revealed;
        s.lastDid = !matched;
        return false;
      }
      case 'discardRandom': {
        const who = e.self ? controller : opp;
        // 「相手の〜によって、自分の手札は捨てられない」
        if (who !== controller && handProtected(s, this.reg, who)) {
          this.log(`${this.name(handProtected(s, this.reg, who)!)} の効果：手札は捨てられない`, who);
          return false;
        }
        const picked: string[] = [];
        // 「こうして捨てたカード1枚につき」
        const times = e.perChosen ? e.count * (s.lastChosen ?? []).length : e.count;
        for (let i = 0; i < times; i++) {
          const hand = s.players[who].zones.hand;
          if (hand.length === 0) break;
          const pick = hand[Math.floor(this.random() * hand.length)];
          this.moveCard(pick, 'graveyard');
          picked.push(pick);
          this.log(`${s.players[who].name} の手札から ${this.name(pick)} を捨てさせた`, controller);
          this.emit({ type: 'CARD_DISCARDED', player: who, iid: pick });
        }
        // 「その捨てたカード」で指す
        s.lastChosen = picked;
        return false;
      }
      case 'destroyDuplicates': {
        // 同じ名前のカードが2枚以上あるものをすべて
        const all = ([0, 1] as PlayerId[]).flatMap((p) => (e.zone === 'battle' ? battleCards(s, this.reg, p) : [...s.players[p].zones.mana]));
        const byName = new Map<string, string[]>();
        for (const iid of all) byName.set(this.name(iid), [...(byName.get(this.name(iid)) ?? []), iid]);
        const hit = [...byName.values()].filter((l) => l.length >= 2).flat();
        if (!hit.length) {
          this.log(`${this.name(source)}：同じ名前の${e.zone === 'battle' ? 'クリーチャー' : 'カード'}はなかった`, controller);
          return false;
        }
        if (e.zone === 'battle') this.insertFront(...hit.map((iid): Task => ({ kind: 'leave', iid, to: 'graveyard', cause: 'destroy' })));
        else
          for (const iid of hit) {
            this.moveCard(iid, 'graveyard');
            this.log(`${this.name(iid)} をマナゾーンから墓地へ`, controller);
          }
        return false;
      }
      case 'seal':
        return this.withTargets(controller, source, e.target, '封印を付ける', true, (iid) => {
          this.sealCard(iid);
        });
      case 'discardUnder': {
        // メテオバーン：下にあるカードを墓地に置く。足りなければ何もしない（続きの「そうしたら」も行わない）
        const inst = s.cards[source];
        const under = inst?.zone === 'battle' ? inst.under : [];
        // count 0：下にあるカードをすべて（メテオバーン覚醒）
        if (e.count === 0) {
          for (const u of [...under]) {
            s.cards[u].zone = 'battle';
            this.moveCard(u, 'graveyard');
            this.emit({ type: 'UNDER_LEFT', iid: source, card: u });
          }
          if (inst) inst.under = [];
          s.lastChosen = [...under];
          return false;
        }
        if (under.length < e.count) {
          this.log(`${this.name(source)}：下にあるカードが足りません`, controller);
          s.lastChosen = [];
          return false;
        }
        let picked = under.slice(0, e.count);
        if (under.length > e.count) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: controller, source, prompt: `${this.name(source)}：下にあるカードを${e.count}枚選んで墓地に置く`, candidates: [...under], min: e.count, max: e.count, reveal: true };
            return true;
          }
          picked = (r.selected ?? picked).filter((x) => under.includes(x));
        }
        for (const u of picked) {
          inst.under = inst.under.filter((x) => x !== u);
          s.cards[u].zone = 'battle';
          this.moveCard(u, 'graveyard');
          this.log(`${this.name(source)} の下の ${this.name(u)} を墓地に置いた`, controller);
          this.emit({ type: 'UNDER_LEFT', iid: source, card: u });
        }
        s.lastChosen = picked;
        return false;
      }
      case 'optional':
        this.insertFront({ kind: 'confirmOptional', controller, source, effects: e.effects, ...(e.otherwise ? { otherwise: e.otherwise } : {}) });
        return false;
      case 'opponentMay':
        // 「相手は〜してもよい」：相手に聞いて、相手が行う
        this.insertFront({ kind: 'confirmOptional', controller: opp, source, effects: e.effects });
        return false;
      case 'ifChosen': {
        const count = e.n ?? (s.lastChosen ?? []).length;
        if (count > 0) this.insertFront(...this.effectTasks(controller, source, e.then));
        return false;
      }
      case 'repeat': {
        const total = e.per === 'chosen' ? (e.n ?? (s.lastChosen ?? []).length) : countQuantity(s, this.reg, controller, e.per, false, source);
        const times = Math.floor(total / e.unit);
        if (times <= 0) return false;
        // 引く枚数・選ぶ数は掛け算にし、それ以外の効果は回数だけくり返す
        const scaled: EffectDef[] = [];
        for (const x of e.effects) {
          if (x.type === 'draw' || x.type === 'deckTopTo' || x.type === 'discardRandom' || x.type === 'breakShields') scaled.push({ ...x, count: x.count * times });
          else if ('target' in x && typeof x.target === 'object' && typeof x.target.count === 'number' && !x.target.ref) scaled.push({ ...x, target: { ...x.target, count: x.target.count * times } } as EffectDef);
          else if (x.type === 'powerMod') scaled.push({ ...x, amount: x.amount * times });
          else for (let i = 0; i < times; i++) scaled.push(x);
        }
        this.insertFront(...this.effectTasks(controller, source, scaled));
        return false;
      }
      case 'chooseDest': {
        const [iid, ...rest] = e.iids;
        if (!iid || s.cards[iid]?.zone !== 'deck') return false;
        const label = (z: (typeof e.options)[number]) => (z === 'hand' ? '手札に加える' : z === 'battle' ? 'バトルゾーンに出す' : z === 'shield' ? 'シールド化する' : `${ZONE_LABEL[z]}に置く`);
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'chooseMode', player: controller, source, prompt: `${this.name(source)}：${this.name(iid)} をどうしますか？`, options: e.options.map(label) };
          return true;
        }
        const to = e.options[Number(r.selected?.[0])] ?? e.options[0];
        const next = rest.length ? this.effectTasks(controller, source, [{ ...e, iids: rest }]) : [];
        const t = to === 'battle' ? this.putIntoBattle(iid, controller) : undefined;
        if (to !== 'battle') {
          this.moveCard(iid, to);
          this.log(`山札から ${this.name(iid)} を${ZONE_LABEL[to]}へ`, controller);
        }
        this.insertFront(...(t ? [t] : []), ...next);
        return false;
      }
      case 'revealUntil': {
        // 条件に合うカードが count 枚出るまで、山札の上から表向きにする
        const deck = s.players[controller].zones.deck;
        const revealed: string[] = [];
        const hits: string[] = [];
        for (let i = deck.length - 1; i >= 0 && hits.length < e.count; i--) {
          revealed.push(deck[i]);
          if (matchFilter(s, this.reg, deck[i], e.filter, source)) hits.push(deck[i]);
        }
        this.log(`山札の上から${revealed.length}枚を表向きにした：${revealed.map((x) => this.name(x)).join('、') || 'なし'}`, controller);
        const tasks: Task[] = [];
        for (const iid of hits) {
          const t = e.to === 'battle' ? this.putIntoBattle(iid, controller) : undefined;
          if (t) tasks.push(t);
          else {
            this.moveCard(iid, 'hand');
            this.log(`${this.name(iid)} を手札に加えた`, controller);
          }
        }
        const rest = revealed.filter((x) => !hits.includes(x));
        if (e.restTo === 'shuffle') this.shuffle(controller);
        else for (const iid of rest) this.moveCard(iid, e.restTo === 'graveyard' ? 'graveyard' : 'deck', { toTop: false });
        if (rest.length && e.restTo !== 'shuffle') this.log(`残り${rest.length}枚を${e.restTo === 'graveyard' ? '墓地' : '山札の下'}へ`, controller);
        this.insertFront(...tasks);
        return false;
      }
      case 'attachGear': {
        // クロス先を1つずつ選ぶ（選んだクロスギアの残りは iids）
        if (e.iids) {
          const [gear, ...rest] = e.iids.filter((g) => s.cards[g]?.zone === 'battle');
          if (!gear) return false;
          const hosts = battleCards(s, this.reg, controller);
          if (!hosts.length) return false;
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: controller, source, prompt: `${this.name(gear)} をクロスするクリーチャーを選んでください`, candidates: hosts, min: 1, max: 1, harmful: false };
            return true;
          }
          const host = r.selected?.[0];
          if (host && hosts.includes(host)) this.crossGear(gear, host, controller);
          if (rest.length) this.insertFront(...this.effectTasks(controller, source, [{ ...e, iids: rest }]));
          return false;
        }
        const picked: string[] = [];
        const waiting = this.withTargets(controller, source, e.target, 'クロスする', false, (iid) => {
          if (s.cards[iid]?.zone === 'battle' && isCrossGear(this.reg[s.cards[iid].cardId])) picked.push(iid);
        });
        if (waiting) return true;
        if (e.to === 'self') {
          if (s.cards[source]?.zone !== 'battle') return false;
          for (const g of picked) this.crossGear(g, source, controller);
          return false;
        }
        if (picked.length) this.insertFront(...this.effectTasks(controller, source, [{ ...e, iids: picked }]));
        return false;
      }
      case 'buzzRenda': {
        const inst = s.cards[source];
        // 追加の支払いは、コストを支払って出た時だけ（コストを支払わずに出た時は [OL] 能力を1回だけ使う）
        const paid = !!inst && inst.zone === 'battle' && inst.enteredTurn === s.turn && !inst.enteredFree;
        const untapped = s.players[controller].zones.mana.filter((m) => !s.cards[m].tapped);
        const max = paid ? Math.min(20, Math.floor(untapped.length / e.cost)) : 0;
        let extra = 0;
        if (max > 0) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = {
              kind: 'chooseMode',
              player: controller,
              source,
              prompt: `${this.name(source)}：バズレンダ。追加で[${e.cost}]を何回支払いますか？（アンタップしているマナ${untapped.length}枚）`,
              options: Array.from({ length: max + 1 }, (_, i) => (i === 0 ? '追加で支払わない' : `${i}回（マナを${i * e.cost}枚タップ）→ 能力を${i + 1}回使う`)),
            };
            return true;
          }
          extra = Math.max(0, Math.min(max, Number(r.selected?.[0] ?? 0)));
          for (const m of untapped.slice(0, extra * e.cost)) s.cards[m].tapped = true;
          if (extra) this.log(`${this.name(source)}：バズレンダで追加で[${e.cost}]を${extra}回支払った`, controller);
        }
        this.log(`${this.name(source)}：[OL]能力を${extra + 1}回使う`, controller);
        const all: EffectDef[] = [];
        for (let i = 0; i <= extra; i++) all.push(...e.effects);
        this.insertFront(...this.effectTasks(controller, source, all));
        return false;
      }
      case 'upToTimes': {
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'confirm', player: controller, source, prompt: `${this.name(source)} の能力を使いますか？（あと${e.times}回まで）` };
          return true;
        }
        if (!r.accept) return false;
        this.insertFront(...this.effectTasks(controller, source, [...e.effects, ...(e.times > 1 ? [{ ...e, times: e.times - 1 }] : [])]));
        return false;
      }
      case 'magibomber': {
        const top = this.topOfDeck(controller);
        const fits = (iid: string) => {
          const d = def(s, this.reg, iid);
          return isCreatureType(d.type) && d.type !== 'evolution' && d.cost <= e.maxCost;
        };
        const cands = [...s.players[controller].zones.hand.filter(fits), ...(top && fits(top) ? [top] : [])];
        if (!cands.length) {
          this.log(`${this.name(source)} のマジボンバー：出せるクリーチャーがありません`, controller);
          return false;
        }
        const r = this.takeResponse();
        if (!r) {
          s.pending = {
            kind: 'selectCards',
            player: controller,
            source,
            prompt: `${this.name(source)} のマジボンバー：山札の上は ${top ? this.name(top) : 'なし'}。コスト${e.maxCost}以下のクリーチャーを1体出してもよい`,
            candidates: cands,
            min: 0,
            max: 1,
            reveal: true,
          };
          return true;
        }
        const pick = r.selected?.[0];
        if (pick && cands.includes(pick)) {
          const t = this.putIntoBattle(pick, controller);
          if (t) this.insertFront(t);
        }
        return false;
      }
      case 'manual': {
        // 自動処理できない能力：判断パネルで手動処理してもらい、「処理完了」まで止める
        const r = this.takeResponse();
        if (!r) {
          if (!s.manualResume) s.log.push({ turn: s.turn, player: controller, text: `［要手動処理］${this.name(source)}：${e.text}`, manual: true });
          s.manualResume = false;
          s.pending = { kind: 'manualStep', player: controller, source, prompt: `${this.name(source)} の能力を手動で処理してください`, text: e.text };
          return true;
        }
        this.log(`${this.name(source)} の能力を手動で処理した`, controller);
        return false;
      }
      case 'extraTurn':
        s.players[controller].extraTurns += 1;
        this.log('このターンの後、もう一度自分のターンを行う', controller);
        return false;
      case 'skipRestOfTurn': {
        // 攻撃・フェイズの続きをやめて、ターンの終わりの処理をせずに次のターンを始める
        this.log('ターンの残りをとばす', controller);
        const stop = new Set(['phase', 'attackSwap', 'attackSwapOrder', 'kirifudash', 'blockStep', 'attackResolve', 'attackEnd', 'turnSwitch']);
        s.queue = s.queue.filter((t) => !stop.has(t.kind));
        s.combat = null;
        s.queue.push({ kind: 'turnSwitch' });
        return false;
      }
      case 'useOnce':
        if (s.cards[source]) s.cards[source].usedOnce = true;
        return false;
      case 'zoneGate':
        return this.execZoneGate(controller, source, e.gate);
      case 'dSwitchFlip': {
        const inst = s.cards[source];
        if (inst) inst.dSwitched = true;
        this.log(`${this.name(source)} を上下逆さまにした（Dスイッチ）`, controller);
        return false;
      }
      case 'winGame':
        this.log(`${this.name(source)} の効果でゲームに勝利`, controller);
        this.gameOver(controller, `${this.name(source)} の効果`);
        return false;
      case 'breakShields':
        this.insertFront({ kind: 'breakShields', breaker: controller, source, defender: e.self ? controller : opp, count: e.count });
        return false;
      case 'selfAction': {
        const inst = s.cards[source];
        // 「このクリーチャーが破壊された時、このクリーチャーを（墓地から）手札に戻す」：墓地にあるこのカードを動かす
        if (inst?.zone === 'graveyard' && e.action !== 'destroy' && e.action !== 'tap' && e.action !== 'untap' && e.action !== 'graveyard') {
          const dest = e.action === 'toHand' ? 'hand' : e.action === 'toMana' ? 'mana' : e.action;
          this.moveCard(source, dest === 'deckTop' || dest === 'deckBottom' ? 'deck' : dest, { toTop: dest !== 'deckBottom' });
          if (dest === 'mana' && e.tapped) inst.tapped = true;
          this.log(`${this.name(source)} を墓地から${ZONE_LABEL[dest === 'deckTop' || dest === 'deckBottom' ? 'deck' : dest] ?? dest}へ`, controller);
          return false;
        }
        // 「この呪文を裏向きにしてシールドに加える」：唱えている呪文（手札を経由している）を動かす
        if (inst?.zone === 'hand' && e.action === 'shield' && playFace(def(s, this.reg, source), 'main').type === 'spell') {
          this.moveCard(source, 'shield');
          inst.faceUp = false;
          this.log(`${this.name(source)} を裏向きにしてシールドに加えた`, controller);
          return false;
        }
        // 「このタマシードを手札からマナゾーンに置いた時、アンタップする」：マナゾーンにあるこのカードを動かす
        if (inst?.zone === 'mana' && e.action === 'untap') {
          inst.tapped = false;
          this.log(`${this.name(source)} をアンタップ`, controller);
          return false;
        }
        if (inst?.zone !== 'battle') return false;
        if (e.action === 'tap') {
          this.setTapped(source, controller);
          return false;
        }
        if (e.action === 'untap') {
          if (!keywords(s, this.reg, source).untapOnlyAtTurnStart) inst.tapped = false;
          this.log(`${this.name(source)} をアンタップ`, controller);
          return false;
        }
        const dest = e.action === 'toHand' ? 'hand' : e.action === 'toMana' ? 'mana' : e.action === 'destroy' ? 'graveyard' : e.action;
        const to: ZoneName = dest === 'deckTop' || dest === 'deckBottom' ? 'deck' : dest;
        this.insertFront({
          kind: 'leave',
          iid: source,
          to,
          cause: e.action === 'destroy' ? 'destroy' : 'effect',
          ...(dest === 'deckBottom' ? { toTop: false } : {}),
          ...(e.tapped ? { tapped: true } : {}),
        });
        return false;
      }
      case 'turnStatic': {
        // 「その数字と同じコストの」：選んだ数字をこの時点で決める（後で別の数字を選んでも変わらないように）
        const num = s.chosenNumber ?? -1;
        const bound = JSON.parse(JSON.stringify(e.static).split('"costIsChosenNumber":true').join(`"minCost":${num},"maxCost":${num}`)) as StaticAbility;
        s.turnStatics.push({
          controller,
          source,
          static: bound,
          ...(e.untilNextTurn ? { untilNextTurnOf: controller } : {}),
          ...(e.untilNextTurnEnd ? { untilTurnEndOf: controller, fromTurn: s.turn } : {}),
          ...(e.onlyOpponentTurn ? { onlyDuringTurnOf: other(controller) } : {}),
          ...(e.forGame ? { forGame: true } : {}),
        });
        this.log(`${this.name(source)} の効果が${e.forGame ? '残りのゲーム中' : e.untilNextTurn ? '次の自分のターンのはじめまで' : e.untilNextTurnEnd ? '次の自分のターンの終わりまで' : 'このターンの間'}有効`, controller);
        return false;
      }
      case 'playFree':
        return this.withTargets(controller, source, e.target, 'コストを支払わずに使う', false, (iid) => {
          this.useFree(controller, iid);
        });
      case 'flipSelf': {
        const inst = s.cards[source];
        const d0 = inst && this.reg[inst.cardId];
        // 両面のあるカード（サイキック・クリーチャー、ドラグハート）だけ。リンク中は裏返さない
        if (!inst || inst.zone !== 'battle' || !d0?.psychic || inst.links?.length) return false;
        const want = e.to === 'toggle' ? !inst.flipped : e.to === 'back';
        if (!!inst.flipped === want) return false;
        const before = this.name(source);
        inst.flipped = want;
        if (e.untap) inst.tapped = false;
        this.log(`${before} を裏返した：${this.name(source)}`, controller);
        // 龍解したウエポンは、装備から外れてクリーチャーになる
        if (want) delete inst.equippedTo;
        if (want) {
          // 表がクリーチャーでないカード（ドラグハート）は、裏返ってクリーチャーになる。このターンに出たものとして扱う
          if (!isCreatureType(d0.type)) inst.enteredTurn = s.turn;
          this.triggerFrom(source, 'onAwaken');
        }
        return false;
      }
      case 'destroyTopCard': {
        const inst = s.cards[source];
        if (inst?.zone !== 'battle') return false;
        // 下にカードがなければ、このクリーチャーが破壊される
        if (!inst.under.length) {
          this.insertFront({ kind: 'leave', iid: source, to: 'graveyard', cause: 'destroy' });
          return false;
        }
        const next = this.popTop(source);
        this.log(`${this.name(source)} の一番上のカードを破壊した（${next ? this.name(next) : ''} が残る）`, controller);
        this.moveCard(source, 'graveyard');
        this.emit({ type: 'CREATURE_DESTROYED', player: inst.owner, iid: source });
        this.emit({ type: 'CREATURE_LEFT', player: inst.owner, iid: source, to: 'graveyard' });
        return false;
      }
      case 'splitFate': {
        if (!e.picked) {
          // まず、効果を使うプレイヤーが選ぶ
          if (this.withTargets(controller, source, e.target, '選ぶ', true, () => undefined)) return true;
          this.insertFront(...this.effectTasks(controller, source, [{ ...e, picked: [...(s.lastChosen ?? [])] }]));
          return false;
        }
        const zones: ZoneName[] = [e.target.zone, ...(e.target.extraZones ?? [])];
        const picked = e.picked.filter((x) => s.cards[x] && zones.includes(s.cards[x].zone));
        if (!picked.length) return false;
        // 次に、持ち主がその中から手札に戻す1枚を選ぶ。残りは破壊（マナゾーンのカードは墓地）
        let keep = picked[0];
        if (picked.length > 1) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: s.cards[picked[0]].owner, source, prompt: `${this.name(source)}：手札に戻すカードを1枚選んでください（残りは${e.target.zone === 'battle' ? '破壊される' : '墓地に置かれる'}）`, candidates: picked, min: 1, max: 1 };
            return true;
          }
          keep = r.selected?.[0] ?? keep;
        }
        const tasks: Task[] = [];
        for (const iid of picked) {
          if (s.cards[iid].zone === 'battle') tasks.push({ kind: 'leave', iid, to: iid === keep ? 'hand' : 'graveyard', cause: iid === keep ? 'effect' : 'destroy' });
          else {
            this.moveCard(iid, iid === keep ? 'hand' : 'graveyard');
            this.log(`${this.name(iid)} を${iid === keep ? '手札に戻した' : '墓地に置いた'}`, controller);
          }
        }
        this.insertFront(...tasks);
        return false;
      }
      case 'castSelfTwin': {
        const d = def(s, this.reg, source);
        if (d.twin && s.cards[source]?.zone !== 'battle') this.playFree(controller, source, 'spell');
        return false;
      }
      case 'castOwnTwin': {
        const d = def(s, this.reg, source);
        if (!d.twin || s.cards[source]?.zone !== 'battle') return false;
        const restricted = playRestriction(s, this.reg, controller, source, 'twin');
        if (restricted) {
          this.log(`${d.twin.name}：${restricted}`, controller);
          return false;
        }
        this.log(`${d.twin.name} を、バトルゾーンに置いたままコストを支払わずに唱える`, controller);
        this.emit({ type: 'SPELL_CAST', player: controller, iid: source });
        this.insertFront(...(d.twin.abilities ?? []).filter((ab) => ab.when === 'onCast').flatMap((ab) => this.abilityTasks(ab, controller, source)));
        return false;
      }
      case 'shieldPlus': {
        const shields = s.players[controller].zones.shield;
        const deck = s.players[controller].zones.deck;
        if (!shields.length || !deck.length) return false;
        const under = (shield: string) => {
          const top = this.topOfDeck(controller);
          if (!top) return;
          deck.splice(deck.indexOf(top), 1);
          // 束の下のカードは、シールドゾーンの一覧には入れずにシールドに持たせる（1つのシールドと数える）
          s.cards[top].zone = 'shield';
          s.cards[top].faceUp = false;
          s.cards[shield].under.push(top);
        };
        if (e.each) {
          for (const sh of shields) under(sh);
          this.log(`山札の上から1枚ずつを、自分の各シールドの下に置いた`, controller);
          return false;
        }
        // 「5枚まで」：先に枚数を選ぶ
        if (e.upTo && e.count > 1) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'chooseMode', player: controller, source, prompt: `${this.name(source)}：シールドの下に置く枚数を選んでください`, options: Array.from({ length: e.count + 1 }, (_, i) => `${e.count - i}枚`) };
            return true;
          }
          const count = e.count - Number(r.selected?.[0] ?? 0);
          if (count > 0) this.insertFront(...this.effectTasks(controller, source, [{ type: 'shieldPlus', count }]));
          return false;
        }
        let target = shields[0];
        if (shields.length > 1) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: controller, source, prompt: `${this.name(source)}：カードを下に置くシールドを1つ選んでください`, candidates: [...shields], min: 1, max: 1 };
            return true;
          }
          target = r.selected?.[0] ?? target;
        }
        for (let i = 0; i < e.count; i++) under(target);
        this.log(`山札の上から${e.count}枚を、シールド1つの下に置いた`, controller);
        return false;
      }
      case 'handPlay': {
        const inst = s.cards[e.iid];
        if (!inst || (inst.zone !== 'hand' && inst.zone !== 'graveyard')) return false;
        if (e.ninja && s.combat?.ninjaUsed?.includes(controller)) return false;
        const key = e.onceKey ? `${controller}:${e.onceKey}` : undefined;
        if (key && s.combat?.usedKeys?.includes(key)) return false;
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'confirm', player: controller, source: e.iid, prompt: `${this.name(e.iid)} を、コストを支払わずに使いますか？` };
          return true;
        }
        if (!r.accept) return false;
        if (e.ninja && s.combat) s.combat.ninjaUsed = [...(s.combat.ninjaUsed ?? []), controller];
        if (key && s.combat) s.combat.usedKeys = [...(s.combat.usedKeys ?? []), key];
        // 逆転撃：次の自分のターンのはじめにマナを支払う
        if (e.debt) {
          const P = s.players[controller];
          P.debts = [...(P.debts ?? []), { amount: e.debt, source: this.name(e.iid) }];
          this.log(`次の自分のターンのはじめに${e.debt}マナを支払う（支払えなければ負ける）`, controller);
        }
        const d = def(s, this.reg, e.iid);
        if (isCreatureType(d.type) && d.type !== 'evolution') {
          this.log(`${d.name} をコストを支払わずに召喚する`, controller);
          this.emit({ type: 'CARD_PLAYED', player: controller, iid: e.iid });
          this.insertFront({ kind: 'enterBattle', player: controller, iid: e.iid, summoned: true, ...(e.endOfTurn ? { endOfTurn: e.endOfTurn } : {}) });
        } else this.useFree(controller, e.iid, e.spellAfter);
        return false;
      }
      case 'grSummon': {
        // 超GRゾーンの上から1枚ずつ召喚する（GRクリーチャーがなければ何もしない）
        const gz = s.players[controller].zones.grZone;
        const tasks: Task[] = [];
        for (const iid of gz.slice(-e.count).reverse()) tasks.push({ kind: 'enterBattle', player: controller, iid, summoned: true });
        if (!tasks.length) this.log(`${this.name(source)}：超GRゾーンにカードがありません`, controller);
        else this.log(`GR召喚を${tasks.length}回する`, controller);
        s.lastChosen = tasks.map((t) => (t.kind === 'enterBattle' ? t.iid : ''));
        this.insertFront(...tasks);
        return false;
      }
      case 'afterAttack': {
        // 「その攻撃の後、〜」：攻撃の終わりの処理の直後に行う。攻撃中でなければすぐ行う
        const k = s.queue.findIndex((t) => t.kind === 'attackEnd');
        const tasks = this.effectTasks(controller, source, e.effects);
        if (k >= 0) s.queue.splice(k + 1, 0, ...tasks);
        else this.insertFront(...tasks);
        return false;
      }
      case 'chooseNumber': {
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'chooseMode', player: controller, source, prompt: `${this.name(source)}：数字を1つ選んでください`, options: Array.from({ length: 16 }, (_, i) => String(i)) };
          return true;
        }
        s.chosenNumber = Number(r.selected?.[0] ?? 0);
        this.log(`${this.name(source)}：数字「${s.chosenNumber}」を選んだ`, controller);
        return false;
      }
      case 'lookAtHand': {
        const hand = s.players[opp].zones.hand;
        this.log(`${s.players[opp].name} の手札を見た：${hand.map((x) => `${this.name(x)}（コスト${def(s, this.reg, x).cost}）`).join('、') || 'なし'}`, controller);
        return false;
      }
      case 'tapOrUntap': {
        // 選んだ後、1体ずつタップするかアンタップするかを聞く
        if (!e.iid)
          return this.withTargets(controller, source, e.target, 'タップまたはアンタップする', false, (iid) => ({ kind: 'effect', controller, source, effect: { ...e, iid } }));
        const inst = s.cards[e.iid];
        if (inst?.zone !== 'battle') return false;
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'chooseMode', player: controller, source, prompt: `${this.name(source)}：${this.name(e.iid)} をどうしますか？`, options: ['タップする', 'アンタップする'] };
          return true;
        }
        if (Number(r.selected?.[0]) === 0) this.setTapped(e.iid, controller);
        else if (!keywords(s, this.reg, e.iid).untapOnlyAtTurnStart) {
          inst.tapped = false;
          this.log(`${this.name(e.iid)} をアンタップ`, controller);
        }
        return false;
      }
      case 'fight': {
        // 「その2体をバトルさせる」：直前に出した（選んだ）クリーチャーがこのクリーチャーのかわりにバトルする
        const fighter = e.fighter === 'chosen' ? (s.lastChosen ?? []).find((x) => s.cards[x]?.zone === 'battle') : source;
        if (!fighter || s.cards[fighter]?.zone !== 'battle') return false;
        return this.withTargets(controller, source, e.target, 'バトルさせる', true, (iid) => {
          if (iid !== fighter) this.insertFront({ kind: 'battle', attacker: fighter, defender: iid });
        });
      }
      case 'fightPair': {
        // 2体を選んでバトルさせる（1体しかいなければバトルしない）
        const r = this.takeResponse();
        const cands = targetCandidates(s, this.reg, controller, e.target, source);
        if (cands.length < 2) {
          this.log(`${this.name(source)}：バトルさせるクリーチャーが2体いません`, controller);
          return false;
        }
        let pair = cands.slice(0, 2);
        if (cands.length > 2) {
          if (!r) {
            s.pending = { kind: 'selectCards', player: controller, source, prompt: `${this.name(source)}：バトルさせるクリーチャーを2体選んでください`, candidates: cands, min: 2, max: 2 };
            return true;
          }
          pair = r.selected ?? pair;
        }
        this.insertFront({ kind: 'battle', attacker: pair[0], defender: pair[1] });
        return false;
      }
      case 'gachinko': {
        // 互いに山札の上を公開してコストを比べ、公開したカードは山札の下へ
        const reveal = (p: PlayerId) => {
          const top = this.topOfDeck(p);
          if (!top) return -1;
          const td = def(s, this.reg, top);
          const cost = e.power ? (isCreatureType(td.type) ? (td.power ?? 0) : 0) : td.cost;
          this.log(`${e.power ? 'パワー・' : ''}ガチンコ・ジャッジ：${s.players[p].name} は ${this.name(top)}（${e.power ? 'パワー' : 'コスト'}${cost}）を公開`, controller);
          this.moveCard(top, 'deck', { toTop: false });
          return cost;
        };
        const mine = reveal(controller);
        const theirs = reveal(opp);
        const win = mine >= 0 && mine >= theirs;
        this.log(`ガチンコ・ジャッジに${win ? '勝った' : '負けた'}`, controller);
        if (win) this.insertFront(...this.effectTasks(controller, source, e.then));
        else if (e.lose) this.insertFront(...this.effectTasks(controller, source, e.lose));
        return false;
      }
      case 'conditional': {
        const ok = evalCondition(s, this.reg, controller, e.condition, false, source);
        this.insertFront(...this.effectTasks(controller, source, ok ? e.then : (e.else ?? [])));
        return false;
      }
      case 'chooseOne': {
        const r = this.takeResponse();
        if (!r) {
          const times = e.times && e.times > 1 ? `（あと${e.times}回）` : '';
          // 「〜があれば、両方選んでもよい」：条件を満たしている時だけ、すべて選ぶ選択肢を足す
          const both = e.bothIf && evalCondition(s, this.reg, controller, e.bothIf, false, source) ? [e.options.length === 2 ? '両方選ぶ' : 'すべて選ぶ'] : [];
          s.pending = { kind: 'chooseMode', player: controller, source, prompt: `${this.name(source)}：次の中から1つ選ぶ${times}`, options: [...e.options.map((o) => o.label), ...both] };
          return true;
        }
        const idx = Number(r.selected?.[0]);
        if (idx === e.options.length && e.bothIf && evalCondition(s, this.reg, controller, e.bothIf, false, source)) {
          this.log(`${this.name(source)}：すべての選択肢を選んだ`, controller);
          this.insertFront(...this.effectTasks(controller, source, e.options.flatMap((o) => o.effects)));
          return false;
        }
        const opt = e.options[idx];
        this.log(`${this.name(source)}：「${opt.label}」を選んだ`, controller);
        const left = (e.times ?? 1) - 1;
        const options = e.distinct ? e.options.filter((_, i) => i !== idx) : e.options;
        const again: EffectDef[] = left > 0 && options.length ? [{ ...e, options, times: left }] : [];
        this.insertFront(...this.effectTasks(controller, source, [...opt.effects, ...again]));
        return false;
      }
      case 'lookAtTop':
        return this.lookAtTop(controller, source, e);
      case 'powerMod': {
        // 「自分の墓地にあるクリーチャー1体につき-1000」：使った時の数で決める
        const amount = e.perCount ? e.amount * countQuantity(s, this.reg, controller, e.perCount, true, source) : e.amount;
        const apply = (iid: string) => {
          const inst = s.cards[iid];
          if (e.untilLeave) inst.powerModLasting = (inst.powerModLasting ?? 0) + amount;
          else if (e.untilNextTurn) {
            const prev = inst.powerModUntil?.player === controller ? inst.powerModUntil.amount : 0;
            inst.powerModUntil = { amount: prev + amount, player: controller };
          } else inst.powerModTurn += amount;
          this.log(`${this.name(iid)} のパワー${amount >= 0 ? '+' : ''}${amount}`, controller);
        };
        if (e.target === 'self') {
          if (s.cards[source]?.zone === 'battle') apply(source);
          return false;
        }
        return this.withTargets(controller, source, e.target, `パワー${e.amount >= 0 ? '+' : ''}${e.amount}する`, e.amount < 0, apply);
      }
      case 'grantKeyword': {
        const apply = (iid: string) => {
          const inst = s.cards[iid];
          if (e.untilNextTurn) {
            const prev = inst.keywordsUntil?.player === controller ? inst.keywordsUntil.keywords : {};
            inst.keywordsUntil = { keywords: { ...prev, ...e.keywords }, player: controller };
            this.log(`${this.name(iid)} は次の${s.players[controller].name}のターンのはじめまで能力を得た`, controller);
          } else {
            // 「相手のカードによる攻撃できない効果を無視して攻撃できる」クリーチャーには、攻撃の制限を与えない
            const add = controller !== inst.owner && inst.zone === 'battle' && ignoresAttackLocks(s, this.reg, iid) ? withoutAttackLocks(e.keywords) : e.keywords;
            inst.keywordsTurn = { ...(inst.keywordsTurn ?? {}), ...add };
            this.log(`${this.name(iid)} はこのターン能力を得た`, controller);
          }
        };
        if (e.target === 'self') {
          if (s.cards[source]?.zone === 'battle') apply(source);
          return false;
        }
        return this.withTargets(controller, source, e.target, '能力を与える', false, apply);
      }
      case 'move':
        return this.execMove(controller, source, e);
      // 旧形式の移動系は上の asMove で move に読み替え済み
      case 'bounce':
      case 'toHand':
      case 'shieldToHand':
      case 'graveyardToHand':
      case 'toMana':
      case 'toGraveyard':
      case 'toShield':
      case 'toDeckBottom':
      case 'toDeckTop':
      case 'putIntoBattle':
        return false;
      case 'destroy':
        return this.withTargets(controller, source, e.target, '破壊する', true, (iid) =>
          s.cards[iid].zone === 'battle' ? { kind: 'leave', iid, to: 'graveyard', cause: 'destroy' } : this.moveCard(iid, 'graveyard'),
        );
      case 'tap':
        return this.withTargets(controller, source, e.target, 'タップする', true, (iid) => this.setTapped(iid, controller));
      case 'untap':
        return this.withTargets(controller, source, e.target, 'アンタップする', false, (iid) => {
          // 「ターンのはじめ以外、アンタップしない」
          if (s.cards[iid].zone === 'battle' && keywords(s, this.reg, iid).untapOnlyAtTurnStart) return;
          s.cards[iid].tapped = false;
          this.log(`${this.name(iid)} をアンタップ`, controller);
        });
      case 'putSelfIntoBattle': {
        // ツインパクトの呪文側を唱えた後、このカードをクリーチャーとしてバトルゾーンに出す（墓地には置かない）
        const inst = s.cards[source];
        if (!inst || inst.zone === 'battle' || !isCreatureType(def(s, this.reg, source).type)) return false;
        this.insertFront({ kind: 'enterBattle', player: inst.owner, iid: source });
        return false;
      }
      case 'shuffleDeck':
        for (const p of e.both ? [controller, other(controller)] : [controller]) {
          this.shuffle(p);
          this.log('山札をシャッフル', p);
        }
        return false;
      case 'graveyardToDeck': {
        const grave = [...s.players[controller].zones.graveyard];
        for (const iid of grave) this.moveCard(iid, 'deck');
        this.shuffle(controller);
        this.log(`墓地のカード${grave.length}枚を山札に加えてシャッフル`, controller);
        return false;
      }
      case 'revealTopCard': {
        const top = this.topOfDeck(controller);
        if (!top) return false;
        const d = def(s, this.reg, top);
        s.cards[top].faceUp = true;
        this.log(`山札の上から ${d.name} を公開`, controller);
        const creature = isCreatureType(d.type) && d.type !== 'evolution';
        const spell = d.type === 'spell' || !!d.twin;
        if (creature && e.ifCreature) this.insertFront(...this.effectTasks(controller, source, [{ type: 'playRevealed', iid: top, as: 'creature' }]));
        else if (spell && e.ifSpell) this.insertFront(...this.effectTasks(controller, source, [{ type: 'playRevealed', iid: top, as: 'spell' }]));
        else if (!creature && e.otherwise === 'mana') {
          this.moveCard(top, 'mana');
          this.log(`${d.name} をマナゾーンに置いた`, controller);
        } else s.cards[top].faceUp = false;
        return false;
      }
      case 'playRevealed': {
        const inst = s.cards[e.iid];
        if (!inst) return false;
        const r = this.takeResponse();
        const what = e.as === 'creature' ? 'バトルゾーンに出します' : 'コストを支払わずに唱えます';
        if (!r) {
          s.pending = { kind: 'confirm', player: controller, source: e.iid, prompt: `${this.name(source)}：${this.name(e.iid)} を${what}か？` };
          return true;
        }
        if (inst.zone === 'deck' || inst.zone === 'shield') inst.faceUp = false;
        if (!r.accept) return false;
        this.playFree(controller, e.iid, e.as);
        return false;
      }
      case 'soulRaid':
        return this.soulRaid(controller, source);
      case 'removeOwnSeals':
        return this.removeOwnSeals(controller, source, e.count);
      case 'awakenLink':
        this.awakenLink(controller, source);
        return false;
      case 'shieldGamble': {
        const shields = s.players[controller].zones.shield;
        if (!shields.length) {
          this.log(`${this.name(source)}：シールドがありません`, controller);
          return false;
        }
        let chosen = shields[0];
        if (shields.length > 1) {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: opp, source, prompt: `${this.name(source)}：相手のシールドを1つ選んでください`, candidates: [...shields], min: 1, max: 1 };
            return true;
          }
          chosen = r.selected?.[0] ?? chosen;
        }
        const d = def(s, this.reg, chosen);
        if (d.type === 'spell' || d.twin) this.insertFront(...this.effectTasks(controller, source, [{ type: 'playRevealed', iid: chosen, as: 'spell' }]));
        else this.log(`${this.name(source)}：シールドは呪文ではなかった（元に戻す）`, controller);
        return false;
      }
      case 'playFromHandFree': {
        const hand = s.players[controller].zones.hand;
        const limit = e.maxCostHandSize ? hand.length : Infinity;
        const pool = (e.zones ?? ['hand']).flatMap((z) => s.players[controller].zones[z]);
        const candidates = pool.filter((iid) => iid !== source && matchFilter(s, this.reg, iid, e.filter, source) && def(s, this.reg, iid).cost <= limit);
        if (!candidates.length) return false;
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'selectCards', player: controller, source, prompt: `${this.name(source)}：コストを支払わずに使うカードを選んでください（使わないなら選ばずに決定）`, candidates, min: 0, max: 1, reveal: true };
          return true;
        }
        const pick = r.selected?.[0];
        if (pick) this.useFree(controller, pick, e.spellAfter);
        return false;
      }
    }
  }

  /** カードの種類に合わせて、コストを支払わずに使う（クリーチャーは出す、呪文は唱える、それ以外はバトルゾーンに置く） */
  private useFree(controller: PlayerId, iid: string, after?: 'deckBottom' | 'hand'): void {
    const d = def(this.s, this.reg, iid);
    if (isNonCreaturePermanent(d.type)) {
      this.log(`${d.name} をコストを支払わずに使う`, controller);
      this.emit({ type: 'CARD_PLAYED', player: controller, iid });
      this.insertFront({ kind: 'enterBattle', player: this.s.cards[iid].owner, iid });
      return;
    }
    this.playFree(controller, iid, isCreatureType(d.type) ? 'creature' : 'spell', after);
  }

  /** コストを支払わずにクリーチャーを出す／呪文を唱える（山札・シールド・手札から） */
  private playFree(controller: PlayerId, iid: string, as: 'creature' | 'spell', after?: 'deckBottom' | 'hand'): void {
    const s = this.s;
    const d = def(s, this.reg, iid);
    s.cards[iid].faceUp = true;
    if (as === 'creature') {
      const t = this.putIntoBattle(iid, controller);
      if (t) this.insertFront(t);
      return;
    }
    const side: 'main' | 'twin' = d.type === 'spell' ? 'main' : 'twin';
    const restricted = playRestriction(s, this.reg, controller, iid, side);
    if (restricted) {
      this.log(`${playFace(d, side).name}：${restricted}`, controller);
      return;
    }
    // 唱え終わったら墓地へ置くため、いったん手札を経由する
    if (s.cards[iid].zone !== 'hand') this.moveCard(iid, 'hand');
    this.log(`${playFace(d, side).name} をコストを支払わずに唱える`, controller);
    this.emit({ type: 'CARD_PLAYED', player: controller, iid });
    this.insertFront({ kind: 'castSpell', player: controller, iid, side, ...(after ? { after } : {}) });
  }

  /** ゾーン移動。バトルゾーンから離れる場合は置換効果を通すタスクにする */
  /** カードを動かす共通の効果。移動先ごとの違いはここだけに書く */
  private execMove(controller: PlayerId, source: string, e: MoveEffect): boolean {
    const s = this.s;
    // 「相手の〜によって、自分の手札は捨てられない」：相手の手札を捨てさせる効果は何もしない
    if (e.to === 'graveyard' && e.target.zone === 'hand' && e.target.owner === 'opponent') {
      const guard = handProtected(s, this.reg, other(controller));
      if (guard) {
        this.log(`${this.name(guard)} の効果：手札は捨てられない`, other(controller));
        return false;
      }
    }
    const info = MOVE_DEST[e.to];
    return this.withTargets(controller, source, e.target, info.verb, info.harmful(e.target.zone), (iid) => {
      // 「そのクリーチャーとそれにクロスされているクロスギアをすべて」：クロスギアも同じところへ
      if (e.withGears && s.cards[iid]?.zone === 'battle') {
        const gearTasks = gearsOn(s, this.reg, iid)
          .map((g) => this.moveTo(g, e.to as ZoneName, controller))
          .filter((t): t is Task => !!t);
        this.insertFront(...gearTasks);
      }
      switch (e.to) {
        case 'battle': {
          let t = this.putIntoBattle(iid, controller);
          // ドラグハート・ウエポン：クリーチャーの能力で出した時は、そのクリーチャーに装備して出す
          const host = s.cards[source];
          if (t && t.kind === 'enterBattle' && /ウエポン/.test(def(s, this.reg, iid).typeLabel ?? '') && host?.zone === 'battle' && isCreatureType(def(s, this.reg, source).type)) t = { ...t, equipTo: source };
          return t && e.grant && t.kind === 'enterBattle' ? { ...t, grant: { ...e.grant, by: controller } } : t;
        }
        case 'under':
          this.putUnder(iid, source, controller);
          return;
        case 'deckTop':
          if (s.cards[iid].zone === 'battle') return this.moveTo(iid, 'deck', controller);
          this.moveCard(iid, 'deck');
          this.log(`${e.target.zone === 'hand' ? 'カード1枚' : this.name(iid)} を山札の上に置いた`, controller);
          return;
        case 'deckBottom':
          return this.moveTo(iid, 'deck', controller, false);
        case 'shieldTop':
          if (s.cards[iid].zone === 'battle') return { kind: 'leave', iid, to: 'shield', cause: 'effect', shieldTop: true };
          this.placeOnShield(iid);
          return;
        default: {
          const fromHand = s.cards[iid].zone === 'hand';
          const t = this.moveTo(iid, e.to, controller);
          if (fromHand && e.to === 'graveyard') this.emit({ type: 'CARD_DISCARDED', player: s.cards[iid].owner, iid });
          if (e.faceUp && e.to === 'shield' && s.cards[iid].zone === 'shield') s.cards[iid].faceUp = true;
          if (!e.tapped) return t;
          if (t && t.kind === 'leave') return { ...t, tapped: true };
          s.cards[iid].tapped = true;
          return t;
        }
      }
    });
  }

  /**
   * 重なったクリーチャーの一番上のカードを外す：すぐ下のカードが、残りのカードを下に持つクリーチャーとして残る（タップの状態は引き継ぐ）。
   * 外したカードはバトルゾーンの一覧から抜けるだけなので、呼んだ側で移動する。残ったカードを返す
   */
  private popTop(top: string): string | null {
    const s = this.s;
    const inst = s.cards[top];
    if (!inst.under.length) return null;
    const [next, ...rest] = inst.under;
    const zone = s.players[inst.owner].zones.battle;
    const k = zone.indexOf(top);
    const n = s.cards[next];
    inst.under = [];
    n.under = rest;
    n.tapped = inst.tapped;
    n.zone = 'battle';
    if (k >= 0) zone.splice(k, 1, next);
    else zone.push(next);
    return next;
  }

  /** カードを、バトルゾーンのクリーチャー（host）の下に置く */
  /** いずれかのシールドゾーンにある表向きのカード（シールドの上に重ねたものを含む） */
  private faceUpShields(): string[] {
    const s = this.s;
    return [...s.players[0].zones.shield, ...s.players[1].zones.shield].filter((x) => s.cards[x]?.faceUp === true);
  }

  /** シールドゾーンの一覧からカードを外す。下に重なっていたカードがあれば、それが新しいシールドになる */
  private removeFromShield(iid: string): void {
    const s = this.s;
    const inst = s.cards[iid];
    const list = s.players[inst.owner].zones.shield;
    const k = list.indexOf(iid);
    if (k < 0) return;
    const [next, ...rest] = inst.under;
    if (next) {
      list[k] = next;
      s.cards[next].under = rest;
      inst.under = [];
    } else list.splice(k, 1);
  }

  /**
   * 表向きにして、持ち主のシールド1つの上に置く（シールドがなければ表向きの新しいシールドにする）。
   * 上に置いたカードがシールドとして数えられ、元のシールドはその下に入る。どのシールドの上に置くかは、重なりが一番少ないものを選ぶ
   */
  private placeOnShield(iid: string): void {
    const s = this.s;
    const inst = s.cards[iid];
    const shields = s.players[inst.owner].zones.shield;
    const host = [...shields].sort((a, b) => s.cards[a].under.length - s.cards[b].under.length)[0];
    if (inst.zone === 'battle') {
      // バトルゾーンを離れる時は、下のカードを墓地に置く
      for (const u of inst.under) this.moveCard(u, 'graveyard');
      inst.under = [];
    }
    this.moveCard(iid, 'shield');
    inst.faceUp = true;
    if (!host) {
      this.log(`${this.name(iid)} を表向きにして新しいシールドとして置いた`, inst.owner);
      return;
    }
    // 一覧の末尾に入ったカードを、元のシールドの場所に入れ替える
    shields.splice(shields.indexOf(iid), 1);
    shields[shields.indexOf(host)] = iid;
    inst.under = [host, ...s.cards[host].under];
    s.cards[host].under = [];
    this.log(`${this.name(iid)} を表向きにしてシールド1つの上に置いた`, inst.owner);
  }

  private putUnder(iid: string, host: string, controller: PlayerId): void {
    const s = this.s;
    const h = s.cards[host];
    const inst = s.cards[iid];
    if (h?.zone !== 'battle' || !inst || inst.zone === 'battle' || iid === host) return;
    const list = s.players[inst.owner].zones[inst.zone];
    const k = list.indexOf(iid);
    if (k >= 0) list.splice(k, 1);
    // 下にあるカードは、ゾーンの一覧には入れずにクリーチャーに持たせる（進化元と同じ扱い）
    inst.zone = 'battle';
    inst.tapped = false;
    inst.faceUp = true;
    h.under.push(iid);
    this.log(`${this.name(iid)} を ${this.name(host)} の下に置いた`, controller);
  }

  /** タップする（効果・攻撃以外）。アンタップ状態からタップした時だけ「タップした時」を誘発させる */
  private setTapped(iid: string, controller: PlayerId): void {
    const inst = this.s.cards[iid];
    const was = inst.tapped;
    inst.tapped = true;
    this.log(`${this.name(iid)} をタップ`, controller);
    if (!was && inst.zone === 'battle') this.emit({ type: 'CREATURE_TAPPED', iid });
  }

  private moveTo(iid: string, to: ZoneName, controller: PlayerId, toTop = true): Task | void {
    const inst = this.s.cards[iid];
    if (inst.zone === 'battle') return { kind: 'leave', iid, to, cause: 'effect', toTop };
    const from = inst.zone;
    const hidden = from === 'shield' || from === 'deck' || to === 'shield';
    this.moveCard(iid, to, { toTop });
    this.log(`${hidden ? 'カード1枚' : this.name(iid)} を${ZONE_LABEL[from]}から${ZONE_LABEL[to]}へ`, controller);
  }

  private putIntoBattle(iid: string, controller: PlayerId): Task | void {
    const d = def(this.s, this.reg, iid);
    // ドラグハート（ウエポン・フォートレス）は、クリーチャーではないがバトルゾーンに出せる
    if (isNonCreaturePermanent(d.type) && /ドラグハート/.test(d.typeLabel ?? '')) {
      this.log(`${d.name} をバトルゾーンに出す`, controller);
      return { kind: 'enterBattle', player: this.s.cards[iid].owner, iid };
    }
    // エレメントを出す効果：フィールド・タマシードもバトルゾーンに出せる
    if (isNonCreaturePermanent(d.type)) {
      this.log(`${d.name} をバトルゾーンに出す`, controller);
      return { kind: 'enterBattle', player: this.s.cards[iid].owner, iid };
    }
    if (!isCreatureType(d.type) || d.type === 'evolution') {
      this.log(`${d.name} はバトルゾーンに出せない`, controller);
      return;
    }
    this.log(`${d.name} をバトルゾーンに出す`, controller);
    return { kind: 'enterBattle', player: this.s.cards[iid].owner, iid };
  }

  private lookAtTop(controller: PlayerId, source: string, e: Extract<EffectDef, { type: 'lookAtTop' }>): boolean {
    const s = this.s;
    // 「相手の山札を見る」：見る山札の持ち主
    const deckOwner = e.deckOf === 'opponent' ? other(controller) : controller;
    const deck = s.players[deckOwner].zones.deck;
    const top = e.from ? e.from.filter((iid) => s.cards[iid]?.zone === 'deck' && s.cards[iid].owner === deckOwner) : deck.slice(-e.count).reverse();
    if (top.length === 0) return false;
    const candidates = top.filter((iid) => matchFilter(s, this.reg, iid, e.pickFilter, source));
    let picked: string[] = [];
    const max = Math.min(e.pickCount, candidates.length);
    if (e.pickAll) picked = candidates;
    else if (candidates.length > 0) {
      const r = this.takeResponse();
      if (!r) {
        const chooser = e.chooser === 'opponent' ? other(controller) : controller;
        s.pending = {
          kind: 'selectCards',
          player: chooser,
          source,
          reveal: true,
          prompt: `${this.name(source)}：${chooser === controller ? '' : '相手の'}山札の上から${top.length}枚${e.chooser === 'opponent' ? 'の中' : 'を見て'}から、${e.pickMaxTotalCost !== undefined ? `コストの合計が${e.pickMaxTotalCost}以下になるように` : ''}${max}枚${e.mustPick ? '' : 'まで'}選ぶ（選んだカードは${LOOK_DEST_LABEL[e.pickTo]}${e.pickToAlt ? `か${LOOK_DEST_LABEL[e.pickToAlt]}` : ''}）`,
          candidates,
          min: e.mustPick ? max : 0,
          max,
        };
        return true;
      }
      picked = r.selected ?? [];
    }
    // 「コストの合計がN以下になるように」：選んだ順に、合計を超えるカードは外す
    if (e.pickMaxTotalCost !== undefined) {
      let sum = 0;
      picked = picked.filter((iid) => {
        const c = def(s, this.reg, iid).cost;
        if (sum + c > e.pickMaxTotalCost!) return false;
        sum += c;
        return true;
      });
    }
    const followUps: Task[] = [];
    // 「手札に加えるかマナゾーンに置く」：行き先は1枚ずつ後で選ぶ
    if (e.pickToAlt && picked.length) followUps.push(...this.effectTasks(controller, source, [{ type: 'chooseDest', iids: picked, options: [e.pickTo === 'deckBottom' || e.pickTo === 'none' ? 'hand' : e.pickTo, e.pickToAlt] }]));
    // 選んだカードは、後の文の「選んだ呪文」「そのカード」で指せる
    s.lastChosen = [...picked];
    for (const iid of e.pickToAlt ? [] : picked) {
      if (e.pickTo === 'none') continue;
      if (e.pickTo === 'deckBottom') {
        this.moveCard(iid, 'deck', { toTop: false });
        this.log('カード1枚を山札の下に置いた', controller);
        continue;
      }
      if (e.pickTo === 'battle') {
        const t = this.putIntoBattle(iid, controller);
        if (t) {
          // 出すまでは手札を経由しないよう、山札から直接出す
          followUps.push(t);
          continue;
        }
      }
      this.moveCard(iid, e.pickTo === 'battle' ? 'hand' : e.pickTo);
      if (e.pickTapped && e.pickTo === 'mana') s.cards[iid].tapped = true;
      if (e.pickFaceUp && e.pickTo === 'shield') s.cards[iid].faceUp = true;
      this.log(`山札から${e.pickTo === 'shield' ? 'カード1枚' : this.name(iid)}を${ZONE_LABEL[e.pickTo === 'battle' ? 'hand' : e.pickTo]}へ`, controller);
    }
    const rest = top.filter((iid) => !picked.includes(iid));
    // 続けて選ぶ分がある：残りのカードから、次の条件で選ぶ
    if (e.more?.length && rest.length) {
      const [next, ...more] = e.more;
      this.insertFront(...followUps, ...this.effectTasks(controller, source, [{ type: 'lookAtTop', count: rest.length, ...next, restTo: e.restTo, from: rest, ...(more.length ? { more } : {}) }]));
      return false;
    }
    if (e.restTo === 'shuffle') this.shuffle(deckOwner);
    else if (e.restTo === 'top') {
      for (const iid of rest) s.cards[iid].faceUp = false;
    } else {
      for (const iid of rest) {
        if (e.restTo === 'deckBottom') this.moveCard(iid, 'deck', { toTop: false });
        else this.moveCard(iid, e.restTo);
      }
      if (rest.length) this.log(`残り${rest.length}枚を${e.restTo === 'deckBottom' ? '山札の下' : ZONE_LABEL[e.restTo]}へ`, controller);
    }
    this.insertFront(...followUps);
    return false;
  }

  /**
   * 覚醒リンク：バトルゾーンに自分の条件のクリーチャー（名前で指定）がそろっていれば、このクリーチャーと裏返してリンクする。
   * リンクしたクリーチャーは1体のサイキック・スーパー・クリーチャーになり、ほかのセルは links に入る
   */
  private awakenLink(controller: PlayerId, source: string): void {
    const s = this.s;
    const inst = s.cards[source];
    const d = inst && this.reg[inst.cardId];
    const link = d?.psychic?.link;
    if (!inst || inst.zone !== 'battle' || inst.flipped || !link || inst.owner !== controller) return;
    const bz = s.players[controller].zones.battle;
    const norm = (x: string) => x.normalize('NFKC').replace(/[\s　]+/g, '');
    const cells: string[] = [];
    for (const name of link.names) {
      const want = norm(name);
      const hit = battleCards(s, this.reg, controller).find(
        (b) => b !== source && !cells.includes(b) && !s.cards[b].flipped && !!this.reg[s.cards[b].cardId]?.psychic && norm(def(s, this.reg, b).name).startsWith(want),
      );
      if (!hit) return;
      cells.push(hit);
    }
    for (const c of cells) {
      bz.splice(bz.indexOf(c), 1);
      // リンクしたセルはバトルゾーンにあるが、一覧には入らず上のクリーチャーの一部になる
      s.cards[c].zone = 'battle';
    }
    // セルのうち1枚でも召喚酔いしていなければ、リンクしたクリーチャーも召喚酔いしない
    inst.enteredTurn = Math.min(inst.enteredTurn, ...cells.map((c) => s.cards[c].enteredTurn));
    inst.tapped = inst.tapped && cells.every((c) => s.cards[c].tapped);
    inst.links = cells;
    inst.flipped = true;
    this.log(`覚醒リンク！ ${[source, ...cells].map((c) => this.reg[s.cards[c].cardId].name).join('・')} が ${def(s, this.reg, source).name} になった`, controller);
  }

  /** リンク解除：リンクしているセルをすべてバトルゾーンに戻して表に返す（keep 以外は残る）。戻したセルの一覧を返す */
  private unlink(top: string): string[] {
    const s = this.s;
    const inst = s.cards[top];
    const cells = inst.links ?? [];
    const bz = s.players[inst.owner].zones.battle;
    delete inst.links;
    delete inst.flipped;
    let at = bz.indexOf(top) + 1;
    for (const c of cells) {
      const ci = s.cards[c];
      ci.zone = 'battle';
      ci.tapped = inst.tapped;
      delete ci.flipped;
      bz.splice(at++, 0, c);
    }
    return [top, ...cells];
  }

  /**
   * 自分の封印を count 枚まで墓地に置く（Dスイッチ）。封印の付いた自分のカードを選び、選んだ順にその封印をすべて外す。
   * 禁断の鼓動の封印がなくなれば禁断解放する
   */
  private removeOwnSeals(controller: PlayerId, source: string, count: number): boolean {
    const s = this.s;
    const src = s.cards[source];
    // Dスイッチ：上下逆さまにする（ゲーム中に一度）
    if (src && this.reg[src.cardId]?.abilities?.some((a) => a.dSwitch)) src.dSwitched = true;
    const holders = s.players[controller].zones.battle.filter((b) => s.cards[b].seals?.length);
    if (!holders.length) {
      this.log(`${this.name(source)}：封印の付いたカードがありません`, controller);
      return false;
    }
    const r = this.takeResponse();
    if (!r) {
      s.pending = { kind: 'selectCards', player: controller, source, prompt: `${this.name(source)}：封印を外すカードを選ぶ（選んだ順に、合わせて${count}枚まで墓地に置く）`, candidates: holders, min: 0, max: holders.length };
      return true;
    }
    let left = count;
    for (const h of r.selected ?? []) {
      if (!holders.includes(h)) continue;
      while (left > 0 && s.cards[h].seals?.length) {
        const top = s.cards[h].seals![s.cards[h].seals!.length - 1];
        this.moveCard(top, 'graveyard');
        left--;
      }
    }
    this.log(`${this.name(source)}：封印を${count - left}枚墓地に置いた`, controller);
    return false;
  }

  /** 超魂レイド：山札の上から3枚を表向きにし、進化元になれるカードを1枚この下に置いてもよい。残りは好きな順序で山札の下へ */
  private soulRaid(controller: PlayerId, source: string): boolean {
    const s = this.s;
    const src = s.cards[source];
    if (!src || src.zone !== 'battle') return false;
    const deck = s.players[controller].zones.deck;
    const top = deck.slice(-3).reverse();
    if (!top.length) return false;
    const candidates = top.filter((iid) => canBeEvolutionSource(s, this.reg, iid, source));
    let picked: string | undefined;
    if (candidates.length) {
      const r = this.takeResponse();
      if (!r) {
        s.pending = { kind: 'selectCards', player: controller, source, reveal: true, prompt: `${this.name(source)}：超魂レイド。山札の上から${top.length}枚のうち、この下に置くカードを1枚まで選ぶ`, candidates, min: 0, max: 1 };
        return true;
      }
      picked = r.selected?.[0];
    }
    this.log(`${this.name(source)} の超魂レイド：山札の上から${top.length}枚を表向きにした（${top.map((i) => this.name(i)).join('・')}）`, controller);
    if (picked) {
      deck.splice(deck.indexOf(picked), 1);
      const p = s.cards[picked];
      p.zone = 'battle';
      p.faceUp = true;
      p.tapped = false;
      src.under.push(picked);
      this.log(`${this.name(picked)} を ${this.name(source)} の下に置いた`, controller);
    }
    for (const iid of top) if (iid !== picked) this.moveCard(iid, 'deck', { toTop: false });
    return false;
  }

  /** 対象を選んで fn を適用する。選択が必要なら pending を立てて true を返す */
  private withTargets(controller: PlayerId, source: string, spec: TargetSpec, verb: string, harmful: boolean, fn: (iid: string) => Task | void): boolean {
    const s = this.s;
    if (spec.maxCostOfChosen) {
      const costs = (s.lastChosen ?? []).filter((x) => s.cards[x]).map((x) => def(s, this.reg, x).cost);
      spec = { ...spec, maxCostOfChosen: undefined, filter: { ...(spec.filter ?? {}), maxCost: costs.length ? Math.max(...costs) : -1 } };
    }
    // 唱えている呪文のコスト（「コスト4以下の呪文によって選べない」の判定用）
    const src = s.cards[source];
    const srcDef = src && src.zone === 'hand' ? def(s, this.reg, source) : undefined;
    const spellCost = srcDef ? (srcDef.type === 'spell' ? srcDef.cost : srcDef.twin?.cost) : undefined;
    const candidates = targetCandidates(s, this.reg, controller, spec, source).filter(
      (c) =>
        (c !== source || spec.zone !== 'hand') &&
        (!spec.minCostOwnerMana || def(s, this.reg, c).cost >= s.players[s.cards[c].owner].zones.mana.length) &&
        // 「相手に選ばれない」クリーチャーは、相手が選ぶ効果の候補にしない（「すべて」は選ばないので対象になる）
        !(spec.count !== 'all' && spec.chooser !== 'owner' && s.cards[c].owner !== controller && isUntargetable(s, this.reg, c, spellCost)),
    );
    if (candidates.length === 0 && spec.refPick) s.lastDid = false;
    if (candidates.length === 0) {
      // 決まった相手（それ・そのクリーチャー）がもういない時は何もしない
      if (!spec.ref && !spec.iids) {
        this.log(`${this.name(source)}：対象がいません`, controller);
        s.lastChosen = [];
      }
      return false;
    }
    let chosen: string[];
    // 「3枚ずつ選び、残りを〜」：残すカードを選び、それ以外に行う
    if (spec.keep !== undefined) {
      if (candidates.length <= spec.keep) {
        s.lastChosen = [];
        return false;
      }
      const r = this.takeResponse();
      if (!r) {
        const chooser = spec.chooser === 'owner' ? s.cards[candidates[0]].owner : controller;
        s.pending = { kind: 'selectCards', player: chooser, source, prompt: `${this.name(source)}：残すカードを${spec.keep}枚選んでください（残りを${verb}）`, candidates, min: spec.keep, max: spec.keep, harmful: false };
        return true;
      }
      const kept = r.selected ?? [];
      const tasks: Task[] = [];
      chosen = candidates.filter((c) => !kept.includes(c));
      s.lastChosen = [...chosen];
      for (const iid of chosen) {
        const t = fn(iid);
        if (t) tasks.push(t);
      }
      this.insertFront(...tasks);
      return false;
    }
    // 「可能ならこのクリーチャーを選ぶ」：相手が選ぶ時、そのクリーチャーを先に選ぶ
    const lures =
      spec.count === 'all' || spec.ref || spec.iids || spec.zone !== 'battle'
        ? []
        : candidates.filter((c) => s.cards[c].owner !== (spec.chooser === 'owner' ? s.cards[c].owner : controller) && keywords(s, this.reg, c).lure);
    if (((spec.ref || spec.iids) && !spec.refPick) || spec.count === 'all') chosen = candidates;
    else if (lures.length >= Math.min(spec.count, candidates.length)) {
      if (lures.length > spec.count) {
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'selectCards', player: controller, source, prompt: `${this.name(source)}：${spec.count}枚選んで${verb}`, candidates: lures, min: spec.count, max: spec.count, harmful };
          return true;
        }
        chosen = r.selected ?? [];
      } else chosen = lures;
    } else {
      const n = Math.min(spec.count, candidates.length);
      const fitsTotal =
        (spec.maxTotalCost === undefined || candidates.reduce((a, c) => a + def(s, this.reg, c).cost, 0) <= spec.maxTotalCost) &&
        (spec.maxTotalPower === undefined || candidates.reduce((a, c) => a + power(s, this.reg, c), 0) <= spec.maxTotalPower);
      if (!spec.upTo && candidates.length <= spec.count && fitsTotal) chosen = candidates;
      else {
        const r = this.takeResponse();
        if (!r) {
          const chooser = spec.chooser === 'owner' ? s.cards[candidates[0]].owner : controller;
          s.pending = {
            kind: 'selectCards',
            player: chooser,
            source,
            prompt: `${this.name(source)}：${spec.maxTotalPower !== undefined ? `パワーの合計が${spec.maxTotalPower}以下になるように` : ''}${spec.maxTotalCost !== undefined ? `コストの合計が${spec.maxTotalCost}以下になるように` : ''}${spec.upTo ? `${n}枚まで` : `${n}枚`}選んで${verb}`,
            candidates,
            min: spec.upTo ? 0 : n,
            max: n,
            harmful,
            // 手札から選ぶ時は中身を見て選ぶ（「相手の手札を見て1枚選び」）
            ...(spec.zone === 'hand' ? { reveal: true } : {}),
          };
          return true;
        }
        chosen = r.selected ?? [];
      }
    }
    // 「コストの合計がN以下になるように」：選んだ順に、合計を超えるカードは外す
    if (spec.maxTotalCost !== undefined) {
      let sum = 0;
      chosen = chosen.filter((iid) => {
        const c = def(s, this.reg, iid).cost;
        if (sum + c > spec.maxTotalCost!) return false;
        sum += c;
        return true;
      });
    }
    // 「パワーの合計がN以下になるよう」：選んだ順に、合計を超えるカードは外す
    if (spec.maxTotalPower !== undefined) {
      let sum = 0;
      chosen = chosen.filter((iid) => {
        const p = power(s, this.reg, iid);
        if (sum + p > spec.maxTotalPower!) return false;
        sum += p;
        return true;
      });
    }
    // 「可能ならこのクリーチャーを選ぶ」：選べる数より少なければ、残りを選んだものに加える
    if (lures.length && spec.count !== 'all' && lures.length < spec.count && !lures.every((l) => chosen.includes(l))) {
      chosen = [...lures, ...chosen.filter((c) => !lures.includes(c))].slice(0, Math.max(chosen.length, lures.length));
    }
    // 「それ」「その捨てたカード」で指すために覚える
    if (!spec.ref && !spec.iids) s.lastChosen = [...chosen];
    // 「その中から選ぶ」：選んだかどうかを覚える（「こうして実行しなければ」）
    if (spec.refPick) s.lastDid = chosen.length > 0;
    // 「相手に選ばれた時」：相手の能力で選ばれたバトルゾーンのクリーチャー（「すべて」は選んでいない）
    if (spec.count !== 'all' && !spec.ref && !spec.iids) {
      for (const iid of chosen) if (s.cards[iid].zone === 'battle' && s.cards[iid].owner !== controller) this.emit({ type: 'CARD_TARGETED', iid, by: controller });
    }
    const tasks: Task[] = [];
    for (const iid of chosen) {
      const t = fn(iid);
      if (t) tasks.push(t);
    }
    this.insertFront(...tasks);
    return false;
  }

  // ───────────────────────── 誘発 ─────────────────────────
  private abilityTasks(ab: TriggeredAbility, controller: PlayerId, source: string, subject?: string): Task[] {
    if (ab.condition && !evalCondition(this.s, this.reg, controller, bindCondition(ab.condition, subject), false, source)) return [];
    const effects = bindEvent(ab.effects, subject);
    if (ab.optional) return [{ kind: 'confirmOptional', controller, source, effects }];
    return this.effectTasks(controller, source, effects);
  }

  /** subject: 誘発の原因になったカード（「そのクリーチャー」） */
  private triggerFrom(iid: string, when: TriggeredAbility['when'], extra?: (ab: TriggeredAbility) => boolean, subject?: string): void {
    const s = this.s;
    const inst = s.cards[iid];
    if (!inst || isIgnored(s, this.reg, iid)) return;
    const d = def(s, this.reg, iid);
    if (!isCreatureType(d.type) && !isNonCreaturePermanent(d.type)) return;
    (d.abilities ?? []).forEach((ab, i) => {
      // 「これを装備したクリーチャーが〜時」は、装備先の出来事でだけ誘発する（下で処理）
      if (ab.viaEquip) return;
      if (ab.when !== when || (extra && !extra(ab))) return;
      // 「進化ではないクリーチャーの上に置いた時」
      if (ab.evolvedOnNonEvolution && !inst.evolvedOnNonEvolution) return;
      // Dスイッチはゲーム中に一度だけ
      if (ab.dSwitch && inst.dSwitched) return;
      if (ab.oncePerGame && inst.usedOnce) return;
      // 「相手のターンにこのクリーチャーが出た時」
      if (ab.duringTurn && (s.activePlayer === inst.owner) !== (ab.duringTurn === 'self')) return;
      // 「各ターンに1度」
      if (ab.oncePerTurn) {
        const key = `${iid}:${i}`;
        s.usedThisTurn ??= [];
        if (s.usedThisTurn.includes(key)) return;
        s.usedThisTurn.push(key);
      }
      this.addTrigger(inst.owner, iid, this.abilityTasks(ab, inst.owner, iid, subject));
    });
    // 装備しているドラグハート・ウエポンの「これを装備したクリーチャーが〜時」
    for (const w of [...s.players[inst.owner].zones.battle]) {
      if (s.cards[w].equippedTo !== iid) continue;
      for (const ab of def(s, this.reg, w).abilities ?? []) {
        if (ab.viaEquip && ab.when === when) this.addTrigger(s.cards[w].owner, w, this.abilityTasks(ab, s.cards[w].owner, w, iid));
      }
    }
  }

  /** 他のクリーチャー（subject）に起きた出来事で、バトルゾーンの他のクリーチャーの能力を誘発させる */
  private triggerOthers(subject: string, when: TriggeredAbility['when'], player: PlayerId): void {
    const s = this.s;
    for (const iid of [...s.players[0].zones.battle, ...s.players[1].zones.battle]) {
      if (iid === subject) continue;
      this.triggerFrom(iid, when, (ab) => this.whoMatches(ab.who, s.cards[iid].owner, player) && matchFilter(s, this.reg, subject, ab.filter, iid), subject);
    }
  }

  private whoMatches(who: TriggeredAbility['who'], abilityOwner: PlayerId, player: PlayerId): boolean {
    const w = who ?? 'self';
    return w === 'any' || (w === 'self') === (abilityOwner === player);
  }

  emit(e: GameEvent): void {
    this.events.push(e);
    const s = this.s;
    const battleAll = () => [...s.players[0].zones.battle, ...s.players[1].zones.battle];
    switch (e.type) {
      case 'CARD_DRAWN': {
        const drawn = s.players[e.player].drawnThisTurn ?? 1;
        for (const iid of battleAll()) this.triggerFrom(iid, 'onDraw', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player) && drawn >= (ab.minDrawCount ?? 1));
        break;
      }
      case 'CREATURE_SUMMONED':
        // 無月の門など：「自分の魔導具をバトルゾーンに出した時」「自分の魔導具クリーチャーを召喚した時」
        // 「次に召喚する自分のクリーチャー」の軽減は、召喚したら使い切る（与える能力はそのクリーチャーに）
        if (e.summoned && s.players[e.player].nextSummonDiscount) {
          const nsd = s.players[e.player].nextSummonDiscount!;
          delete s.players[e.player].nextSummonDiscount;
          if (nsd.turn === s.turn && nsd.grant && s.cards[e.iid]) s.cards[e.iid].keywordsTurn = { ...(s.cards[e.iid].keywordsTurn ?? {}), ...nsd.grant };
        }
        // 手札にある間の誘発：「自分のコマンドまたはドラゴンが出た時、このクリーチャーを自分の手札から出してもよい」
        if (s.cards[e.iid] && s.cards[e.iid].owner === e.player) {
          for (const h of [...s.players[e.player].zones.hand]) {
            for (const ht of def(s, this.reg, h).handTriggers ?? []) {
              if (ht.when !== 'ownSummon' || !matchFilter(s, this.reg, e.iid, ht.filter)) continue;
              if (ht.condition && !evalCondition(s, this.reg, e.player, ht.condition, false, h)) continue;
              this.addTrigger(e.player, h, this.effectTasks(e.player, h, [{ type: 'playRevealed', iid: h, as: 'creature' }]));
            }
          }
        }
        if (s.cards[e.iid]?.owner === e.player) {
          this.fireZoneGates(e.player, 'enter', e.iid);
          if (e.summoned) this.fireZoneGates(e.player, 'summon', e.iid);
        }
        // コマンドが出たら、その持ち主は同じ文明の自身のカードから封印を1つ外す
        if (s.cards[e.iid] && def(s, this.reg, e.iid).races.some((r) => r.includes('コマンド'))) {
          const owner = s.cards[e.iid].owner;
          if (s.players[owner].zones.battle.some((b) => s.cards[b].seals?.length)) this.addTrigger(owner, e.iid, [{ kind: 'commandUnseal', player: owner, command: e.iid }]);
        }
        // 相手の《ブラキオ龍樹》：相手のクリーチャーが出て、その相手のクリーチャーの能力がトリガーする時、かわりにトリガーしない
        const suppressed = activeStatics(s, this.reg).some((a) => a.static.type === 'suppressEnterTriggers' && a.controller === other(e.player));
        // 「自分のパワー6000以上のクリーチャーが出た時」は、条件に合えばこのクリーチャー自身にも誘発する
        if (!suppressed) this.triggerFrom(e.iid, 'onSummon', (ab) => !ab.filter || matchFilter(s, this.reg, e.iid, ab.filter, e.iid));
        // 「相手のターンに相手のクリーチャーが出て、その能力がトリガーした時、自分もその能力を使ってもよい」
        {
          const summoner = s.cards[e.iid]?.owner;
          if (summoner !== undefined && s.activePlayer === summoner && !suppressed) {
            const copier = s.players[other(summoner)].zones.battle.find((x) => !isIgnored(s, this.reg, x) && keywords(s, this.reg, x).mimicEnemySummon);
            if (copier) {
              for (const ab of def(s, this.reg, e.iid).abilities ?? []) {
                if (ab.when !== 'onSummon' || ab.effects.some((x) => x.type === 'manual')) continue;
                if (ab.condition && !evalCondition(s, this.reg, summoner, ab.condition, false, e.iid)) continue;
                this.addTrigger(other(summoner), copier, [{ kind: 'confirmOptional', controller: other(summoner), source: e.iid, effects: bindEvent(ab.effects, e.iid) }]);
              }
            }
          }
        }
        for (const other_ of battleAll()) {
          if (other_ === e.iid || (suppressed && s.cards[other_].owner === e.player)) continue;
          this.triggerFrom(other_, 'onOtherSummon', (ab) => this.whoMatches(ab.who, s.cards[other_].owner, e.player) && (!ab.byEffect || !e.summoned) && matchFilter(s, this.reg, e.iid, ab.filter), e.iid);
        }
        s.players[e.player].creaturesThisTurn = (s.players[e.player].creaturesThisTurn ?? 0) + 1;
        (s.players[e.player].enteredNamesThisTurn ??= []).push(def(s, this.reg, e.iid).name);
        // 「各ターン、自分のN体目のクリーチャーが出た時」（出たクリーチャー自身の能力も含む）
        {
          const count = s.players[e.player].creaturesThisTurn ?? 0;
          for (const b of s.players[e.player].zones.battle) this.triggerFrom(b, 'onOwnNthEnter', (ab) => ab.nthEnter === count, e.iid);
        }
        if (e.summoned) s.players[e.player].summonsThisTurn = (s.players[e.player].summonsThisTurn ?? 0) + 1;
        break;
      case 'CREATURE_DESTROYED':
        // シールド・ゴー：墓地から表向きでシールド化する
        if (s.cards[e.iid]?.zone === 'graveyard' && def(s, this.reg, e.iid).keywords?.shieldGo) {
          this.moveCard(e.iid, 'shield');
          s.cards[e.iid].faceUp = true;
          this.log(`${this.name(e.iid)} のシールド・ゴー：表向きでシールド化`, s.cards[e.iid].owner);
        }
        this.triggerFrom(e.iid, 'onDestroyed');
        this.triggerOthers(e.iid, 'onOtherDestroyed', e.player);
        // 手札にある間の誘発：「自分のエグザイル・クリーチャーが破壊された時、このクリーチャーを自分の手札から出してもよい」（下の CREATURE_SUMMONED にも同じ形）
        for (const h of [...s.players[e.player].zones.hand]) {
          for (const ht of def(s, this.reg, h).handTriggers ?? []) {
            if (ht.when !== 'ownDestroyed' || !s.cards[e.iid] || !matchFilter(s, this.reg, e.iid, ht.filter)) continue;
            if (ht.condition && !evalCondition(s, this.reg, e.player, ht.condition, false, h)) continue;
            this.addTrigger(e.player, h, this.effectTasks(e.player, h, [{ type: 'playRevealed', iid: h, as: 'creature' }]));
          }
        }
        break;
      case 'CARD_MOVED':
        // このカード自身が移った時（「手札からマナゾーンに置いた時」「超次元ゾーンに置かれた時」）：移った先のゾーンにある間の誘発
        if (s.cards[e.iid]?.zone === e.to) this.triggerFrom(e.iid, 'onSelfMoved', (ab) => (!ab.movedTo || ab.movedTo === e.to) && (!ab.movedFrom || ab.movedFrom === e.from));
        break;
      case 'CREATURE_LEFT': {
        // メガ・ラスト・バースト：呪文側をコストを支払わずに唱えてもよい
        const ld = def(s, this.reg, e.iid);
        if (ld.keywords?.megaLastBurst && ld.twin && (e.to === 'hand' || e.to === 'mana' || e.to === 'graveyard') && s.cards[e.iid]?.zone === e.to) {
          this.addTrigger(s.cards[e.iid].owner, e.iid, this.effectTasks(s.cards[e.iid].owner, e.iid, [{ type: 'playRevealed', iid: e.iid, as: 'spell' }]));
        }
        this.triggerFrom(e.iid, 'onLeave');
        this.triggerOthers(e.iid, 'onOtherLeave', e.player);
        if (e.to === 'graveyard' && s.cards[e.iid]?.zone === 'graveyard') this.triggerFrom(e.iid, 'onToGraveFromBattle');
        break;
      }
      case 'ATTACK_DECLARED':
        // 「自分のドラゴンが攻撃する時」は、条件に合えばこのクリーチャー自身の攻撃でも誘発する
        this.triggerFrom(e.attacker, 'onAttack', (ab) => !ab.filter || matchFilter(s, this.reg, e.attacker, ab.filter, e.attacker));
        this.triggerOthers(e.attacker, 'onOtherAttack', e.player);
        if (e.target.kind === 'player') this.triggerOthers(e.attacker, 'onOtherAttackPlayer', e.player);
        if (e.target.kind === 'creature') this.triggerFrom(e.target.iid, 'onAttacked');
        // 手札にある間の誘発：ニンジャ・ストライク（相手の攻撃）、鬼エンド（クリーチャーの攻撃）、アタック・チャンスR（自分の攻撃）
        this.offerHandTriggers(other(e.player), (ht) => ht.when === 'opponentAttackOrBlock' || ht.when === 'anyAttack' || (ht.when === 'attackedPlayer' && e.target.kind === 'player'));
        this.offerHandTriggers(e.player, (ht) => ht.when === 'anyAttack' || (ht.when === 'ownAttack' && matchFilter(s, this.reg, e.attacker, ht.filter)));
        break;
      case 'CREATURE_TAPPED':
        this.triggerFrom(e.iid, 'onTap');
        break;
      // 「カードが自分のシールドゾーンを離れた時」「このクリーチャーの「EXライフ」シールドが離れた時」
      case 'SHIELD_LEFT':
        for (const iid of battleAll()) {
          this.triggerFrom(iid, 'onShieldLeft', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player), e.iid);
          const bi = s.cards[iid];
          if (bi.exLifeShield === e.iid || bi.exLifeShields?.includes(e.iid)) {
            if (bi.exLifeShield === e.iid) bi.exLifeShield = bi.exLifeShields?.shift();
            else bi.exLifeShields = bi.exLifeShields!.filter((x) => x !== e.iid);
            this.triggerFrom(iid, 'onExLifeLeft');
          }
        }
        break;
      // 「カードがこのクリーチャーの下を離れた時」「カードが自分のクリーチャーの下を離れた時」
      case 'UNDER_LEFT': {
        const host = s.cards[e.iid];
        if (host?.zone !== 'battle') break;
        this.triggerFrom(e.iid, 'onUnderLeft', undefined, e.card);
        for (const b of [...s.players[host.owner].zones.battle]) this.triggerFrom(b, 'onOwnUnderLeft', undefined, e.card);
        break;
      }
      case 'CARD_TARGETED':
        this.triggerFrom(e.iid, 'onTargeted');
        break;
      case 'BLOCKED':
        this.triggerFrom(e.blocker, 'onBlock');
        // ニンジャ・ストライク：相手のクリーチャーがブロックした時
        if (s.cards[e.blocker]) this.offerHandTriggers(other(s.cards[e.blocker].owner), (ht) => ht.when === 'opponentAttackOrBlock');
        break;
      case 'BATTLE_WON': {
        if (s.cards[e.winner]) {
          const wp = s.players[s.cards[e.winner].owner];
          wp.battleWinsThisTurn = (wp.battleWinsThisTurn ?? 0) + 1;
        }
        this.triggerFrom(e.winner, 'onBattleWin');
        // 「自分のクリーチャーがバトルに勝った時」：他のクリーチャーと、「他の」でなければ勝ったクリーチャー自身も
        const wOwner = s.cards[e.winner].owner;
        this.triggerOthers(e.winner, 'onOtherBattleWin', wOwner);
        this.triggerFrom(e.winner, 'onOtherBattleWin', (ab) => this.whoMatches(ab.who, wOwner, wOwner) && !ab.filter?.excludeSelf && matchFilter(s, this.reg, e.winner, ab.filter, e.winner));
        break;
      }
      // 「自分のターンのはじめに」(who: self) と「相手のターンのはじめに」(who: opponent)
      case 'TURN_STARTED':
        for (const iid of battleAll()) this.triggerFrom(iid, 'onTurnStart', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player));
        break;
      case 'TURN_ENDED':
        for (const iid of battleAll()) this.triggerFrom(iid, 'onTurnEnd', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player));
        break;
      case 'BROKE_SHIELDS':
        this.triggerFrom(e.iid, 'onBreak');
        this.triggerOthers(e.iid, 'onOtherBreak', e.player);
        break;
      case 'SHIELD_BROKEN':
        s.players[e.player].shieldsBrokenThisTurn = (s.players[e.player].shieldsBrokenThisTurn ?? 0) + 1;
        for (const iid of battleAll()) this.triggerFrom(iid, 'onShieldBroken', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player));
        break;
      // 「カードが自分のシールドゾーンに置かれた時」
      case 'SHIELD_ADDED':
        for (const iid of battleAll()) this.triggerFrom(iid, 'onShieldAdded', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player), e.iid);
        break;
      // 「相手が自身の手札を1枚捨てた時」
      case 'CARD_DISCARDED':
        for (const iid of battleAll()) this.triggerFrom(iid, 'onDiscard', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player) && matchFilter(s, this.reg, e.iid, ab.filter), e.iid);
        break;
      // 「相手がカードを実行した時」
      case 'CARD_PLAYED': {
        const P = s.players[e.player];
        P.playedThisTurn = [...(P.playedThisTurn ?? []), e.iid];
        for (const iid of battleAll()) if (iid !== e.iid) this.triggerFrom(iid, 'onPlay', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player) && matchFilter(s, this.reg, e.iid, ab.filter), e.iid);
        break;
      }
      // 「相手が呪文を唱えた時」
      case 'SPELL_CAST': {
        const P = s.players[e.player];
        P.spellsThisTurn = (P.spellsThisTurn ?? 0) + 1;
        for (const iid of battleAll()) this.triggerFrom(iid, 'onSpellCast', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player), e.iid);
        // 虚無月の門など：「自分の魔導具呪文を唱えた時」
        this.fireZoneGates(e.player, 'spell', e.iid);
        break;
      }
    }
  }

  // ───────────────────────── 低レベル操作 ─────────────────────────
  random(): number {
    const [v, next] = nextRandom(this.s.rngState);
    this.s.rngState = next;
    return v;
  }

  shuffle(player: PlayerId): void {
    const deck = this.s.players[player].zones.deck;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  /** 山札の上は配列の末尾 */
  topOfDeck(player: PlayerId): string | undefined {
    const deck = this.s.players[player].zones.deck;
    return deck[deck.length - 1];
  }

  draw(player: PlayerId, n: number): void {
    for (let i = 0; i < n; i++) {
      const top = this.topOfDeck(player);
      if (!top) break;
      this.moveCard(top, 'hand');
      this.s.players[player].drawnThisTurn = (this.s.players[player].drawnThisTurn ?? 0) + 1;
      this.emit({ type: 'CARD_DRAWN', player, iid: top });
      // 山札の最後の1枚を引く時、負けるかわりに勝つ（シャコガイルなど）
      if (this.s.players[player].zones.deck.length === 0 && this.s.gameOverReason === null) {
        const winner = battleCards(this.s, this.reg, player).find((iid) => keywords(this.s, this.reg, iid).winOnLastDraw);
        if (winner) {
          this.gameOver(player, `${this.name(winner)} の能力で山札の最後の1枚を引いた`);
          return;
        }
      }
    }
  }

  /** 「山札から手札以外のゾーンにカードが置かれる時、かわりに墓地に置く」が、このプレイヤーの山札に効いているか */
  private deckToGrave(player: PlayerId): boolean {
    return activeStatics(this.s, this.reg).some(
      (a) => a.static.type === 'deckToGraveInstead' && (a.static.who === 'both' || (a.static.who === 'self') === (a.controller === player)),
    );
  }

  moveCard(iid: string, to: ZoneName, opts: { toTop?: boolean } = {}): void {
    const s = this.s;
    const inst = s.cards[iid];
    const from = inst.zone;
    // 山札からマナ・シールド・バトルゾーン・超次元ゾーンへ：「かわりに墓地に置く」
    if (from === 'deck' && (to === 'mana' || to === 'shield' || to === 'battle' || to === 'hyperspatial') && this.deckToGrave(inst.owner)) to = 'graveyard';
    // サイキック・クリーチャーはバトルゾーン以外に行く時、超次元ゾーンに戻る
    if (from === 'battle' && to !== 'battle' && this.reg[inst.cardId]?.psychic) {
      // 選ばずに離れた時のリンク解除：このカードだけが戻り、残りのセルはバトルゾーンに残る
      if (inst.links?.length) this.unlink(iid);
      to = 'hyperspatial';
    }
    // GRクリーチャーはバトルゾーン以外に行く時、超GRゾーンの下に戻る
    if (from === 'battle' && to !== 'battle' && isGrCard(this.reg[inst.cardId])) to = 'grZone';
    const owner = s.players[inst.owner];
    const fromList = owner.zones[from];
    const idx = fromList.indexOf(iid);
    if (idx >= 0) fromList.splice(idx, 1);
    // 進化元、またはシールドの束の下のカードは、一緒に動く
    const under = (from === 'battle' && to !== 'battle') || (from === 'shield' && to !== 'shield') ? inst.under : [];
    if (under.length) inst.under = [];
    // バトルゾーンを離れたカードの封印は墓地へ
    const seals = from === 'battle' && to !== 'battle' ? (inst.seals ?? []) : [];
    if (from === 'battle' && to !== 'battle') {
      delete inst.seals;
      delete inst.flipped;
    }
    // 封印が外れたら、付いていたカードから取り除く
    let sealHolder: string | undefined;
    if (from === 'seal' && to !== 'seal') {
      for (const b of [...s.players[0].zones.battle, ...s.players[1].zones.battle]) {
        const list = s.cards[b].seals;
        const k = list?.indexOf(iid) ?? -1;
        if (k >= 0) {
          list!.splice(k, 1);
          sealHolder = b;
          break;
        }
      }
    }
    inst.zone = to;
    inst.tapped = false;
    inst.powerModTurn = 0;
    delete inst.keywordsTurn;
    delete inst.keywordsUntil;
    delete inst.powerModUntil;
    delete inst.powerModLasting;
    delete inst.hyper;
    delete inst.exLifeShield;
    delete inst.exLifeShields;
    delete inst.leaveAtTurnEnd;
    inst.faceUp = to !== 'shield' && to !== 'deck' && to !== 'seal';
    if (to === 'battle') inst.enteredTurn = s.turn;
    // 「バトルゾーンに置く時、このカードはタップして置く」
    if (to === 'battle' && def(s, this.reg, iid).keywords?.entersTapped) inst.tapped = true;
    // 「相手のクリーチャーはタップしてバトルゾーンに出る」
    if (to === 'battle' && isCreatureType(def(s, this.reg, iid).type)) {
      for (const a of activeStatics(s, this.reg)) {
        if (a.static.type === 'opponentEntersTapped' && a.controller !== inst.owner && matchFilter(s, this.reg, iid, a.static.filter)) inst.tapped = true;
      }
    }
    // 多色カードはタップしてマナゾーンに置かれる（「マナゾーンに置いた時、アンタップする」カードは除く）
    const untapIn =
      def(s, this.reg, iid).keywords?.manaUntapped ||
      activeStatics(s, this.reg).some((a) => a.static.type === 'manaEntersUntapped' && a.controller === inst.owner && matchFilter(s, this.reg, iid, a.static.filter, a.source, true));
    if (to === 'mana' && !untapIn && manaCivilizations(def(s, this.reg, iid)).length > 1) inst.tapped = true;
    // 「マナゾーンに置く時、このカードはタップして置く」
    const md = def(s, this.reg, iid);
    if (to === 'mana' && (md.keywords?.manaTapped || md.twin?.keywords?.manaTapped)) inst.tapped = true;
    // 「相手はカードをマナゾーンに置く時、タップして置く」
    if (to === 'mana' && !inst.tapped) {
      for (const a of activeStatics(s, this.reg)) {
        if (a.static.type === 'manaEntersTapped' && (a.static.who === 'both' || (a.static.who === 'self') === (a.controller === inst.owner))) inst.tapped = true;
      }
    }
    if (to === 'deck' && opts.toTop === false) owner.zones.deck.unshift(iid);
    else if (to === 'grZone' && from === 'battle') owner.zones.grZone.unshift(iid);
    else owner.zones[to].push(iid);
    this.emit({ type: 'CARD_MOVED', iid, from, to });
    if (to === 'shield' && from !== 'shield') this.emit({ type: 'SHIELD_ADDED', player: inst.owner, iid });
    // 装備：装備先のクリーチャーが離れたら、ウエポンは超次元ゾーンに戻る
    if (from === 'battle' && to !== 'battle') {
      delete inst.equippedTo;
      for (const w of [...s.players[0].zones.battle, ...s.players[1].zones.battle]) {
        if (s.cards[w].equippedTo !== iid) continue;
        delete s.cards[w].equippedTo;
        // クロスギアは、クロスしていたクリーチャーが離れてもバトルゾーンに残る
        if (isCrossGear(this.reg[s.cards[w].cardId])) continue;
        this.log(`${this.name(w)} は装備先が離れたので超次元ゾーンに戻った`, s.cards[w].owner);
        this.moveCard(w, 'hyperspatial');
      }
    }
    if (from === 'shield' && to !== 'shield') this.emit({ type: 'SHIELD_LEFT', player: inst.owner, iid });
    // Zラッシュ：シールドが離れたら、次の自分のターンのはじめまでハイパーモードになる
    if (from === 'shield' && to !== 'shield') {
      for (const b of [...s.players[0].zones.battle, ...s.players[1].zones.battle]) {
        const bi = s.cards[b];
        if (!bi.hyper && this.reg[bi.cardId]?.keywords?.zRush) {
          bi.hyper = true;
          this.log(`${this.name(b)} のZラッシュ：ハイパーモードを解放`, bi.owner);
        }
      }
    }
    // 進化元のカードも同じゾーンへ
    for (const u of under) {
      s.cards[u].zone = from === 'shield' ? 'shield' : 'battle';
      this.moveCard(u, to, opts);
    }
    for (const x of seals) {
      if (s.cards[x].zone === 'seal') this.moveCard(x, 'graveyard');
    }
    if (sealHolder) this.afterSealRemoved(sealHolder);
  }

  checkStateBased(): void {
    const s = this.s;
    if (s.gameOverReason !== null) return;
    // 「山札がなくなっても、自分はゲームに負けない」
    const out = ([0, 1] as PlayerId[]).filter((p) => s.players[p].zones.deck.length === 0 && !cannotLose(s, this.reg, p, true));
    if (out.length === 1) {
      this.log(`${s.players[out[0]].name} の山札が0枚になった`, out[0]);
      this.gameOver(other(out[0]), '山札切れ');
    } else if (out.length === 2) {
      this.gameOver(null, '両者山札切れ（引き分け）');
    }
    if (s.gameOverReason !== null) return;
    // 「このカードがバトルゾーン以外のゾーンにあれば、自分はゲームに負ける」（ドキンダムXなど）
    const losers = new Set<PlayerId>();
    for (const inst of Object.values(s.cards)) {
      if (inst.zone === 'battle') continue;
      const d = this.reg[inst.cardId];
      const kw = d?.forbidden?.creature.keywords ?? d?.keywords;
      if (kw?.loseIfNotInBattle) {
        if (!losers.has(inst.owner)) this.log(`${d.forbidden?.creature.name ?? d.name} がバトルゾーン以外のゾーンにある`, inst.owner);
        losers.add(inst.owner);
      }
    }
    if (losers.size === 1) return this.gameOver(other([...losers][0]), `${s.players[[...losers][0]].name} の敗北条件`);
    if (losers.size === 2) return this.gameOver(null, '両者の敗北条件（引き分け）');
    // ルール：ルール処理（パワー0以下の破壊など）は、能力・呪文の解決が終わってから行う（「-3000し、その後+3000」の途中で破壊しない）
    if (s.pending || s.queue.some((t) => t.kind === 'abilityEnd')) return;
    // パワー0以下のクリーチャーは破壊される（入力待ちの間は、中断中のタスクより前に割り込ませない）
    // パワーが分からないカード（古い版で保存した禁断クリーチャーなど）は、0とみなして破壊しない
    const queued = new Set(s.queue.flatMap((t) => (t.kind === 'leave' ? [t.iid] : [])));
    const dead = [...battleCards(s, this.reg, 0), ...battleCards(s, this.reg, 1)].filter(
      (iid) => !queued.has(iid) && def(s, this.reg, iid).power !== undefined && power(s, this.reg, iid) <= 0 && !cannotLeaveNow(s, this.reg, iid, true),
    );
    if (dead.length) this.insertFront(...dead.map((iid): Task => ({ kind: 'leave', iid, to: 'graveyard', cause: 'destroy' })));
    // S-MAX進化：自分のS-MAX進化クリーチャーが2体以上あれば、最後に出た1体を残し、残りを手札に戻す
    for (const p of [0, 1] as PlayerId[]) {
      const smax = battleCards(s, this.reg, p).filter((iid) => !queued.has(iid) && !dead.includes(iid) && keywords(s, this.reg, iid).sMax);
      if (smax.length < 2) continue;
      this.log('S-MAX進化クリーチャーが2体以上あるので、1体を残して手札に戻す', p);
      this.insertFront(...smax.slice(0, -1).map((iid): Task => ({ kind: 'leave', iid, to: 'hand', cause: 'effect' })));
    }
  }

  gameOver(winner: PlayerId | null, reason: string): void {
    const s = this.s;
    if (s.gameOverReason !== null) return;
    // 鬼S-MAX進化：「自分がゲームに負ける時、かわりに自分の表向きのカードを3枚破壊してもよい」（投了は除く）
    if (winner !== null && reason !== '投了' && (this.avertLoss(other(winner)) || this.avertLossUnder(other(winner)))) return;
    // 「自分はゲームに負けない」「相手はゲームに勝てない」
    if (winner !== null && reason !== '投了' && cannotLose(s, this.reg, other(winner), reason === '山札切れ')) return;
    s.winner = winner;
    s.gameOverReason = reason;
    s.pending = null;
    s.queue = [];
    s.waiting = [];
    s.combat = null;
    this.log(winner === null ? `引き分け（${reason}）` : `${s.players[winner].name} の勝利！（${reason}）`, winner);
    this.emit({ type: 'GAME_OVER', winner, reason });
  }

  /** このクリーチャーの下に重ねたカードを、古い順に count 枚、山札の下に置く */
  private sendUnderToDeckBottom(iid: string, count: number): void {
    const inst = this.s.cards[iid];
    const moved = inst.under.splice(0, count);
    for (const u of moved) {
      this.s.cards[u].zone = 'battle';
      this.moveCard(u, 'deck', { toTop: false });
      this.emit({ type: 'UNDER_LEFT', iid, card: u });
    }
    this.log(`${this.name(iid)} の下のカードを${moved.length}枚、山札の下に置いた`, inst.owner);
  }

  /** 《大魔王 ウラギリダムス》：自分がゲームに負ける時、かわりに下に重ねたカードを山札の下に置く */
  private avertLossUnder(loser: PlayerId): boolean {
    const s = this.s;
    for (const iid of battleCards(s, this.reg, loser)) {
      const rep = (def(s, this.reg, iid).replacements ?? []).find((r) => r.instead === 'underToDeckBottom' && r.alsoLose && s.cards[iid].under.length >= (r.count ?? 5));
      if (!rep) continue;
      this.log(`${this.name(iid)} の能力：ゲームに負けるかわりに`, loser);
      this.sendUnderToDeckBottom(iid, rep.count ?? 5);
      return true;
    }
    return false;
  }

  /**
   * 負ける時の置換：バトルゾーンにある「自分がゲームに負ける時、かわりに〜を破壊してもよい」を持つクリーチャーで、表向きのカードを破壊する。
   * 破壊するカードは、そのクリーチャー以外のコストの小さいものから自動で選ぶ（負けないほうが必ず得なので確認しない）
   */
  private avertLoss(loser: PlayerId): boolean {
    const s = this.s;
    const queued = new Set(s.queue.flatMap((t) => (t.kind === 'leave' ? [t.iid] : [])));
    const own = battleAndFields(s, this.reg, loser).filter((x) => !queued.has(x));
    for (const iid of battleCards(s, this.reg, loser)) {
      const need = keywords(s, this.reg, iid).avertLoss;
      if (!need || queued.has(iid)) continue;
      // CRY-S-MAX進化：かわりに自分のシールドを墓地に置いてもよい（表向きのカードを残せるので、置けるならこちらを使う）
      const shieldAlt = keywords(s, this.reg, iid).avertLossShield;
      const shields = s.players[loser].zones.shield;
      if (shieldAlt && shields.length >= shieldAlt) {
        this.log(`${this.name(iid)} の能力：ゲームに負けるかわりに、自分のシールドを${shieldAlt}つ墓地に置く`, loser);
        for (let k = 0; k < shieldAlt; k++) this.moveCard(shields[shields.length - 1], 'graveyard');
        return true;
      }
      const others = own.filter((x) => x !== iid).sort((a, b) => def(s, this.reg, a).cost - def(s, this.reg, b).cost);
      const picks = [...others, iid].slice(0, need);
      if (picks.length < need) continue;
      this.log(`${this.name(iid)} の能力：ゲームに負けるかわりに、表向きのカードを${need}枚破壊する`, loser);
      this.insertFront(...picks.map((x): Task => ({ kind: 'leave', iid: x, to: 'graveyard', cause: 'destroy' })));
      return true;
    }
    return false;
  }

  name(iid: string): string {
    const inst = this.s.cards[iid];
    if (!inst) return iid;
    const d = this.reg[inst.cardId];
    if (inst.flipped && d?.forbidden) return d.forbidden.creature.name;
    return d?.name ?? inst.cardId;
  }

  log(text: string, player: PlayerId | null): void {
    this.s.log.push({ turn: this.s.turn, player, text });
  }
}
