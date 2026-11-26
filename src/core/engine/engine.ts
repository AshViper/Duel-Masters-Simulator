// ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、
// 内部では効果処理キュー（state.queue）を順に解決し、プレイヤー入力が必要になったら
// state.pending を立てて中断する。RESPOND アクションで再開する。
// 自動フェイズ（開始・ドロー・終了）もキューのタスクとして進めるので、
// 「ターンのはじめに」などの誘発能力が次のフェイズより先に解決される。
import type { CardRegistry } from '../cards/registry';
import {
  CIV_LABEL,
  isCreatureType,
  manaCivilizations,
  playFace,
  ZONE_LABEL,
  type EffectDef,
  type ReplacementAbility,
  type TargetSpec,
  type TriggeredAbility,
  type ZoneName,
} from '../cards/types';
import {
  attackTargets,
  blockersFor,
  breakerCount,
  choosePayment,
  def,
  effectiveCost,
  evalCondition,
  evolutionBases,
  isIdle,
  isUntargetable,
  keywords,
  matchFilter,
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
  destroySelf: 'このクリーチャーを破壊する',
  stay: 'バトルゾーンにとどまる',
};

export class Ctx {
  events: GameEvent[] = [];
  private triggered: Task[] = [];
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
      case 'CONCEDE':
        this.log(`${s.players[a.player].name} が投了しました`, a.player);
        return this.gameOver(other(a.player), '投了');
      case 'MANUAL_MOVE':
        return this.manual(a.player, () => {
          const from = s.cards[a.iid]?.zone;
          if (!from) throw new IllegalAction('カードがありません');
          this.moveCard(a.iid, a.to, { toTop: a.toTop ?? true });
          return `${this.name(a.iid)} を ${ZONE_LABEL[from]} → ${ZONE_LABEL[a.to]} に移動`;
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
        return this.enterPhase(this.nextPhase(s.phase));
      case 'END_TURN':
        return this.enterPhase('end');
      case 'CHARGE_MANA':
        return this.chargeMana(a.player, a.iid);
      case 'PLAY_CARD':
        return this.playCard(a.player, a.iid, a.evolveOn, a.manaIids, a.side ?? 'main');
      case 'ATTACK':
        return this.attack(a.player, a.attacker, a.target);
    }
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
        for (const iid of [...P.zones.battle, ...P.zones.mana]) s.cards[iid].tapped = false;
        P.chargedThisTurn = false;
        this.log(`── ターン${s.turn}：${P.name} ──`, pl);
        this.emit({ type: 'TURN_STARTED', player: pl, turn: s.turn });
        break;
      }
      case 'draw': {
        const skip = s.turn === 1 && pl === s.firstPlayer && !s.config.firstPlayerDrawsOnFirstTurn;
        if (!skip) this.draw(pl, 1);
        break;
      }
      case 'end':
        this.emit({ type: 'TURN_ENDED', player: pl, turn: s.turn });
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
    s.turnStatics = [];
    const P = s.players[s.activePlayer];
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

  private playCard(player: PlayerId, iid: string, evolveOn: string | undefined, manaIids: string[] | undefined, side: 'main' | 'twin'): void {
    const s = this.s;
    const inst = s.cards[iid];
    if (!inst || inst.owner !== player || inst.zone !== 'hand') throw new IllegalAction('手札のカードを選んでください');
    if (s.phase !== 'charge' && s.phase !== 'main') throw new IllegalAction('カードはメインステップで使います');
    const d = def(s, this.reg, iid);
    if (side === 'twin' && !d.twin) throw new IllegalAction('ツインパクトではありません');
    const face = playFace(d, side);
    const restricted = playRestriction(s, this.reg, player, iid, side);
    if (restricted) throw new IllegalAction(restricted);
    if (face.type === 'evolution') {
      const bases = evolutionBases(s, this.reg, player, iid);
      if (bases.length === 0) throw new IllegalAction('進化元のクリーチャーがいません');
      if (!evolveOn) {
        if (bases.length > 1) throw new IllegalAction('進化元を選んでください');
        evolveOn = bases[0];
      }
      if (!bases.includes(evolveOn)) throw new IllegalAction('そのクリーチャーには進化できません');
    }
    const cost = effectiveCost(s, this.reg, player, iid, side);
    const pay = choosePayment(s, this.reg, player, iid, manaIids, side);
    if (!pay) throw new IllegalAction(`マナが足りません（コスト${cost}・${face.civilizations.map((c) => CIV_LABEL[c]).join('/')}）`);
    if (s.phase === 'charge') {
      s.phase = 'main';
      this.emit({ type: 'PHASE_CHANGED', phase: 'main' });
    }
    for (const m of pay) s.cards[m].tapped = true;
    this.log(`${face.name} を${face.type === 'spell' ? '唱える' : '召喚'}（${cost}マナ）`, player);
    this.emit({ type: 'CARD_PLAYED', player, iid });
    s.queue.push(face.type === 'spell' ? { kind: 'castSpell', player, iid, side } : { kind: 'enterBattle', player, iid, evolveOn });
    this.run();
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
    s.combat = { attacker, attackingPlayer: player, target };
    const tname = target.kind === 'player' ? s.players[other(player)].name : this.name(target.iid);
    this.log(`${this.name(attacker)} が ${tname} を攻撃`, player);
    this.emit({ type: 'ATTACK_DECLARED', player, attacker, target });
    s.queue.push({ kind: 'blockStep', attacker, defender: other(player) }, { kind: 'attackResolve', attacker });
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
    if (this.triggered.length === 0) return;
    const t = this.triggered;
    this.triggered = [];
    this.insertFront(...t);
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

      case 'effect':
        return this.execEffect(task.controller, task.source, task.effect);

      case 'confirmOptional': {
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'confirm', player: task.controller, source: task.source, prompt: `${this.name(task.source)} の能力を使いますか？` };
          return true;
        }
        if (r.accept) this.insertFront(...this.effectTasks(task.controller, task.source, task.effects));
        else this.log(`${this.name(task.source)} の能力を使わなかった`, task.controller);
        return false;
      }

      case 'castSpell': {
        const face = playFace(def(s, this.reg, task.iid), task.side);
        this.emit({ type: 'SPELL_CAST', player: task.player, iid: task.iid });
        const tasks: Task[] = [];
        for (const ab of face.abilities) if (ab.when === 'onCast') tasks.push(...this.abilityTasks(ab, task.player, task.iid));
        this.insertFront(...tasks, { kind: 'spellToGrave', iid: task.iid, side: task.side });
        return false;
      }

      case 'spellToGrave': {
        if (s.cards[task.iid]?.zone !== 'hand') return false;
        const d = def(s, this.reg, task.iid);
        // チャージャー：墓地のかわりにマナゾーンに置く
        const charger = task.side === 'twin' ? d.twin?.keywords?.charger : d.keywords?.charger;
        this.moveCard(task.iid, charger ? 'mana' : 'graveyard');
        if (charger) this.log(`${this.name(task.iid)} をマナゾーンに置いた（チャージャー）`, s.cards[task.iid].owner);
        return false;
      }

      case 'enterBattle': {
        const inst = s.cards[task.iid];
        if (!inst || inst.zone === 'battle') return false;
        if (task.evolveOn) {
          const base = s.cards[task.evolveOn];
          if (!base || base.zone !== 'battle') {
            this.log(`進化元がいないため ${this.name(task.iid)} は出せなかった`, task.player);
            return false;
          }
          const bz = s.players[base.owner].zones.battle;
          bz.splice(bz.indexOf(task.evolveOn), 1);
          const baseTapped = base.tapped;
          const under = [task.evolveOn, ...base.under];
          base.under = [];
          base.tapped = false;
          this.moveCard(task.iid, 'battle');
          inst.under = under;
          // 進化クリーチャーは進化元のタップ状態を引き継ぐ
          inst.tapped = baseTapped;
          this.log(`${this.name(task.evolveOn)} が ${this.name(task.iid)} に進化`, task.player);
        } else {
          this.moveCard(task.iid, 'battle');
        }
        // EXライフ：山札の上から1枚をシールド化する
        const deck = s.players[inst.owner].zones.deck;
        if (def(s, this.reg, task.iid).keywords?.exLife && deck.length) {
          const top = deck[deck.length - 1];
          this.moveCard(top, 'shield');
          inst.exLifeShield = top;
          this.log(`${this.name(task.iid)} のEXライフ：山札の上から1枚をシールド化`, inst.owner);
        }
        this.emit({ type: 'CREATURE_SUMMONED', player: task.player, iid: task.iid });
        return false;
      }

      case 'leave':
        return this.execLeave(task);

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
        this.insertFront({ kind: 'breakShields', breaker: c.attackingPlayer, source: task.attacker, defender, count: breakerCount(s, this.reg, task.attacker) });
        return false;
      }

      case 'battle': {
        const { attacker, defender } = task;
        const alive = (i: string) => s.cards[i]?.zone === 'battle';
        if (!alive(attacker) || !alive(defender)) {
          s.combat = null;
          return false;
        }
        const pa = power(s, this.reg, attacker);
        const pd = power(s, this.reg, defender);
        s.combat = null;
        this.log(`バトル：${this.name(attacker)}(${pa}) vs ${this.name(defender)}(${pd})`, s.cards[attacker].owner);
        const losers: string[] = [];
        if (pa >= pd) losers.push(defender);
        if (pd >= pa) losers.push(attacker);
        // スレイヤー：負けた時、相手も破壊 ／ 勝ったら自壊
        const kw = (i: string) => def(s, this.reg, i).keywords ?? {};
        for (const [me, opp] of [[attacker, defender], [defender, attacker]] as const) {
          if (losers.includes(me) && !losers.includes(opp) && kw(me).slayer) losers.push(opp);
          if (!losers.includes(me) && losers.includes(opp) && kw(me).suicideOnWin) losers.push(me);
        }
        const leaves = losers.map((l): Task => ({ kind: 'leave', iid: l, to: 'graveyard', cause: 'destroy' }));
        // 「バトルに勝った時」は負けた側の破壊を処理してから誘発させる
        const winner = pa > pd ? attacker : pd > pa ? defender : null;
        this.insertFront(...leaves, ...(winner && !losers.includes(winner) ? [{ kind: 'battleWon', winner, loser: winner === attacker ? defender : attacker } as Task] : []));
        return false;
      }

      case 'battleWon':
        if (s.cards[task.winner]?.zone === 'battle') this.emit({ type: 'BATTLE_WON', winner: task.winner, loser: task.loser });
        return false;

      case 'breakShields': {
        const shields = s.players[task.defender].zones.shield;
        const n = Math.min(task.count, shields.length);
        if (n === 0) return false;
        let chosen: string[];
        if (shields.length <= n) chosen = [...shields];
        else {
          const r = this.takeResponse();
          if (!r) {
            s.pending = { kind: 'selectCards', player: task.breaker, prompt: `ブレイクするシールドを${n}枚選んでください`, candidates: [...shields], min: n, max: n, harmful: true };
            return true;
          }
          chosen = r.selected ?? [];
        }
        const triggers: Task[] = [];
        // ブレイクしたシールドを手札に加えるかわりに墓地に置く
        const burn = s.cards[task.source]?.zone === 'battle' && !!keywords(s, this.reg, task.source).shieldBurn;
        for (const sh of chosen) {
          this.moveCard(sh, burn ? 'graveyard' : 'hand');
          this.emit({ type: 'SHIELD_BROKEN', player: task.defender, iid: sh });
          if (burn) continue;
          const d = def(s, this.reg, sh);
          if (d.keywords?.shieldTrigger || d.twin?.keywords?.shieldTrigger) triggers.push({ kind: 'shieldTrigger', player: task.defender, iid: sh });
          // G・ストライク：相手のクリーチャーを1体選んでもよい。このターン、そのクリーチャーは攻撃できない
          if (d.keywords?.gStrike) {
            triggers.push({
              kind: 'confirmOptional',
              controller: task.defender,
              source: sh,
              effects: [{ type: 'grantKeyword', target: { owner: 'opponent', zone: 'battle', count: 1 }, keywords: { cannotAttack: true } }],
            });
          }
        }
        this.log(`シールドを${chosen.length}枚ブレイク（残り${shields.length}枚）${burn ? '：墓地に置いた' : ''}`, task.breaker);
        this.insertFront(...triggers);
        return false;
      }

      case 'shieldTrigger':
        return this.execShieldTrigger(task.player, task.iid);
    }
  }

  private execShieldTrigger(player: PlayerId, iid: string): boolean {
    const s = this.s;
    const inst = s.cards[iid];
    if (!inst || inst.zone !== 'hand') return false;
    const d = def(s, this.reg, iid);
    const sides = (['main', 'twin'] as const).filter((side) => (side === 'main' ? d.keywords?.shieldTrigger : d.twin?.keywords?.shieldTrigger));
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
    this.insertFront(face.type === 'spell' ? { kind: 'castSpell', player, iid, side } : { kind: 'enterBattle', player, iid, evolveOn });
    return false;
  }

  /** バトルゾーンを離れる処理。置換効果があればここで適用する */
  private execLeave(task: Extract<Task, { kind: 'leave' }>): boolean {
    const s = this.s;
    const inst = s.cards[task.iid];
    if (!inst || inst.zone !== 'battle') return false;
    // EXライフ：離れるかわりに、そのシールドを墓地に置く
    if (inst.exLifeShield && s.cards[inst.exLifeShield]?.zone === 'shield') {
      const sh = inst.exLifeShield;
      delete inst.exLifeShield;
      this.moveCard(sh, 'graveyard');
      this.log(`${this.name(task.iid)} はEXライフのシールドを墓地に置いて、バトルゾーンにとどまった`, inst.owner);
      return false;
    }
    const replaced = task.replaced ?? [];
    const rep = this.findReplacement(task.iid, task.cause, replaced);
    if (rep) {
      const { source, ability, key } = rep;
      const owner = s.cards[source].owner;
      if (ability.optional) {
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
        case 'destroySelf':
          this.insertFront({ kind: 'leave', iid: source, to: 'graveyard', cause: 'destroy', replaced: [...replaced, key] });
          return false;
        default: {
          const to: ZoneName = ability.instead === 'toHand' ? 'hand' : ability.instead === 'toMana' ? 'mana' : ability.instead === 'toShield' ? 'shield' : 'deck';
          this.moveCard(task.iid, to, { toTop: ability.instead !== 'toDeckBottom' });
          this.emit({ type: 'CREATURE_LEFT', player: inst.owner, iid: task.iid, to });
          return false;
        }
      }
    }
    if (task.cause === 'destroy') this.log(`${this.name(task.iid)} は破壊された`, inst.owner);
    this.moveCard(task.iid, task.to, { toTop: task.toTop ?? true });
    if (task.cause === 'destroy') this.emit({ type: 'CREATURE_DESTROYED', player: inst.owner, iid: task.iid });
    this.emit({ type: 'CREATURE_LEFT', player: inst.owner, iid: task.iid, to: task.to });
    return false;
  }

  private findReplacement(iid: string, cause: LeaveCause, used: string[]): { source: string; ability: ReplacementAbility; key: string } | null {
    const s = this.s;
    const owner = s.cards[iid].owner;
    // 自分自身の置換効果を優先し、次に自分の他のクリーチャーのもの
    const sources = [iid, ...s.players[owner].zones.battle.filter((x) => x !== iid)];
    for (const src of sources) {
      const reps = def(s, this.reg, src).replacements ?? [];
      for (let i = 0; i < reps.length; i++) {
        const ab = reps[i];
        const key = `${src}:${i}`;
        if (used.includes(key)) continue;
        if (ab.event === 'destroyed' && cause !== 'destroy') continue;
        const subjectOk = ab.subject === 'self' ? src === iid : ab.subject === 'otherOwn' ? src !== iid : true;
        if (!subjectOk || !matchFilter(s, this.reg, iid, ab.filter, src)) continue;
        if (ab.instead === 'destroySelf' && src === iid) continue;
        return { source: src, ability: ab, key };
      }
    }
    return null;
  }

  // ───────────────────────── 効果 ─────────────────────────
  private execEffect(controller: PlayerId, source: string, e: EffectDef): boolean {
    const s = this.s;
    const opp = other(controller);
    switch (e.type) {
      case 'draw':
        this.draw(controller, e.count);
        this.log(`カードを${e.count}枚引く`, controller);
        return false;
      case 'addManaFromDeck':
        return this.execEffect(controller, source, { type: 'deckTopTo', count: e.count, to: 'mana' });
      case 'addShieldFromDeck':
        return this.execEffect(controller, source, { type: 'deckTopTo', count: e.count, to: 'shield' });
      case 'deckTopTo': {
        const who = e.who === 'opponent' ? opp : controller;
        for (let i = 0; i < e.count; i++) {
          const top = this.topOfDeck(who);
          if (!top) break;
          this.moveCard(top, e.to);
          const shown = e.to === 'shield' || e.to === 'hand' ? '1枚' : this.name(top);
          this.log(`${s.players[who].name} の山札の上から${shown}を${ZONE_LABEL[e.to]}へ`, controller);
        }
        return false;
      }
      case 'discardRandom':
        for (let i = 0; i < e.count; i++) {
          const hand = s.players[opp].zones.hand;
          if (hand.length === 0) break;
          const pick = hand[Math.floor(this.random() * hand.length)];
          this.moveCard(pick, 'graveyard');
          this.log(`${s.players[opp].name} の手札から ${this.name(pick)} を捨てさせた`, controller);
        }
        return false;
      case 'manual':
        s.log.push({ turn: s.turn, player: controller, text: `［要手動処理］${this.name(source)}：${e.text}`, manual: true });
        return false;
      case 'extraTurn':
        s.players[controller].extraTurns += 1;
        this.log('このターンの後、もう一度自分のターンを行う', controller);
        return false;
      case 'breakShields':
        this.insertFront({ kind: 'breakShields', breaker: controller, source, defender: opp, count: e.count });
        return false;
      case 'selfAction': {
        const inst = s.cards[source];
        if (inst?.zone !== 'battle') return false;
        if (e.action === 'tap' || e.action === 'untap') {
          inst.tapped = e.action === 'tap';
          this.log(`${this.name(source)} を${e.action === 'tap' ? 'タップ' : 'アンタップ'}`, controller);
          return false;
        }
        const to: ZoneName = e.action === 'toHand' ? 'hand' : e.action === 'toMana' ? 'mana' : 'graveyard';
        this.insertFront({ kind: 'leave', iid: source, to, cause: e.action === 'destroy' ? 'destroy' : 'effect' });
        return false;
      }
      case 'turnStatic':
        s.turnStatics.push({ controller, source, static: e.static });
        this.log(`${this.name(source)} の効果がこのターンの間有効`, controller);
        return false;
      case 'conditional': {
        const ok = evalCondition(s, this.reg, controller, e.condition);
        this.insertFront(...this.effectTasks(controller, source, ok ? e.then : (e.else ?? [])));
        return false;
      }
      case 'chooseOne': {
        const r = this.takeResponse();
        if (!r) {
          s.pending = { kind: 'chooseMode', player: controller, source, prompt: `${this.name(source)}：次の中から1つ選ぶ`, options: e.options.map((o) => o.label) };
          return true;
        }
        const opt = e.options[Number(r.selected?.[0])];
        this.log(`${this.name(source)}：「${opt.label}」を選んだ`, controller);
        this.insertFront(...this.effectTasks(controller, source, opt.effects));
        return false;
      }
      case 'lookAtTop':
        return this.lookAtTop(controller, source, e);
      case 'powerMod': {
        const apply = (iid: string) => {
          s.cards[iid].powerModTurn += e.amount;
          this.log(`${this.name(iid)} のパワー${e.amount >= 0 ? '+' : ''}${e.amount}`, controller);
        };
        if (e.target === 'self') {
          if (s.cards[source]?.zone === 'battle') apply(source);
          return false;
        }
        return this.withTargets(controller, source, e.target, `パワー${e.amount >= 0 ? '+' : ''}${e.amount}する`, e.amount < 0, apply);
      }
      case 'grantKeyword': {
        const apply = (iid: string) => {
          s.cards[iid].keywordsTurn = { ...(s.cards[iid].keywordsTurn ?? {}), ...e.keywords };
          this.log(`${this.name(iid)} はこのターン能力を得た`, controller);
        };
        if (e.target === 'self') {
          if (s.cards[source]?.zone === 'battle') apply(source);
          return false;
        }
        return this.withTargets(controller, source, e.target, '能力を与える', false, apply);
      }
      case 'destroy':
        return this.withTargets(controller, source, e.target, '破壊する', true, (iid) =>
          s.cards[iid].zone === 'battle' ? { kind: 'leave', iid, to: 'graveyard', cause: 'destroy' } : this.moveCard(iid, 'graveyard'),
        );
      case 'bounce':
      case 'toHand':
      case 'shieldToHand':
      case 'graveyardToHand':
        return this.withTargets(controller, source, e.target, '手札に戻す', e.target.zone === 'battle', (iid) => this.moveTo(iid, 'hand', controller));
      case 'toMana':
        return this.withTargets(controller, source, e.target, 'マナゾーンに置く', e.target.zone !== 'deck', (iid) => this.moveTo(iid, 'mana', controller));
      case 'toGraveyard':
        return this.withTargets(controller, source, e.target, '墓地に置く', true, (iid) => this.moveTo(iid, 'graveyard', controller));
      case 'toShield':
        return this.withTargets(controller, source, e.target, 'シールドに加える', e.target.zone === 'battle', (iid) => this.moveTo(iid, 'shield', controller));
      case 'toDeckBottom':
        return this.withTargets(controller, source, e.target, '山札の下に置く', true, (iid) => this.moveTo(iid, 'deck', controller, false));
      case 'tap':
        return this.withTargets(controller, source, e.target, 'タップする', true, (iid) => {
          s.cards[iid].tapped = true;
          this.log(`${this.name(iid)} をタップ`, controller);
        });
      case 'untap':
        return this.withTargets(controller, source, e.target, 'アンタップする', false, (iid) => {
          s.cards[iid].tapped = false;
          this.log(`${this.name(iid)} をアンタップ`, controller);
        });
      case 'putIntoBattle':
        return this.withTargets(controller, source, e.target, 'バトルゾーンに出す', false, (iid) => this.putIntoBattle(iid, controller));
    }
  }

  /** ゾーン移動。バトルゾーンから離れる場合は置換効果を通すタスクにする */
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
    if (!isCreatureType(d.type) || d.type === 'evolution') {
      this.log(`${d.name} はバトルゾーンに出せない`, controller);
      return;
    }
    this.log(`${d.name} をバトルゾーンに出す`, controller);
    return { kind: 'enterBattle', player: this.s.cards[iid].owner, iid };
  }

  private lookAtTop(controller: PlayerId, source: string, e: Extract<EffectDef, { type: 'lookAtTop' }>): boolean {
    const s = this.s;
    const deck = s.players[controller].zones.deck;
    const top = deck.slice(-e.count).reverse();
    if (top.length === 0) return false;
    const candidates = top.filter((iid) => matchFilter(s, this.reg, iid, e.pickFilter, source));
    let picked: string[] = [];
    if (candidates.length > 0) {
      const r = this.takeResponse();
      if (!r) {
        s.pending = {
          kind: 'selectCards',
          player: controller,
          prompt: `${this.name(source)}：山札の上から${top.length}枚を見て、${Math.min(e.pickCount, candidates.length)}枚まで選ぶ`,
          candidates,
          min: 0,
          max: Math.min(e.pickCount, candidates.length),
        };
        return true;
      }
      picked = r.selected ?? [];
    }
    const followUps: Task[] = [];
    for (const iid of picked) {
      if (e.pickTo === 'battle') {
        const t = this.putIntoBattle(iid, controller);
        if (t) {
          // 出すまでは手札を経由しないよう、山札から直接出す
          followUps.push(t);
          continue;
        }
      }
      this.moveCard(iid, e.pickTo === 'battle' ? 'hand' : e.pickTo);
      this.log(`山札から${e.pickTo === 'shield' ? 'カード1枚' : this.name(iid)}を${ZONE_LABEL[e.pickTo === 'battle' ? 'hand' : e.pickTo]}へ`, controller);
    }
    const rest = top.filter((iid) => !picked.includes(iid));
    if (e.restTo === 'shuffle') this.shuffle(controller);
    else {
      for (const iid of rest) {
        if (e.restTo === 'deckBottom') this.moveCard(iid, 'deck', { toTop: false });
        else this.moveCard(iid, e.restTo);
      }
      if (rest.length) this.log(`残り${rest.length}枚を${e.restTo === 'deckBottom' ? '山札の下' : ZONE_LABEL[e.restTo]}へ`, controller);
    }
    this.insertFront(...followUps);
    return false;
  }

  /** 対象を選んで fn を適用する。選択が必要なら pending を立てて true を返す */
  private withTargets(controller: PlayerId, source: string, spec: TargetSpec, verb: string, harmful: boolean, fn: (iid: string) => Task | void): boolean {
    const s = this.s;
    const candidates = targetCandidates(s, this.reg, controller, spec, source).filter(
      (c) =>
        (c !== source || spec.zone !== 'hand') &&
        // 「相手に選ばれない」クリーチャーは、相手が選ぶ効果の候補にしない（「すべて」は選ばないので対象になる）
        !(spec.count !== 'all' && spec.chooser !== 'owner' && s.cards[c].owner !== controller && isUntargetable(s, this.reg, c)),
    );
    if (candidates.length === 0) {
      this.log(`${this.name(source)}：対象がいません`, controller);
      return false;
    }
    let chosen: string[];
    if (spec.count === 'all') chosen = candidates;
    else {
      const n = Math.min(spec.count, candidates.length);
      if (!spec.upTo && candidates.length <= spec.count) chosen = candidates;
      else {
        const r = this.takeResponse();
        if (!r) {
          const chooser = spec.chooser === 'owner' ? s.cards[candidates[0]].owner : controller;
          s.pending = {
            kind: 'selectCards',
            player: chooser,
            prompt: `${this.name(source)}：${spec.upTo ? `${n}枚まで` : `${n}枚`}選んで${verb}`,
            candidates,
            min: spec.upTo ? 0 : n,
            max: n,
            harmful,
          };
          return true;
        }
        chosen = r.selected ?? [];
      }
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
  private abilityTasks(ab: TriggeredAbility, controller: PlayerId, source: string): Task[] {
    if (ab.condition && !evalCondition(this.s, this.reg, controller, ab.condition)) return [];
    if (ab.optional) return [{ kind: 'confirmOptional', controller, source, effects: ab.effects }];
    return this.effectTasks(controller, source, ab.effects);
  }

  private triggerFrom(iid: string, when: TriggeredAbility['when'], extra?: (ab: TriggeredAbility) => boolean): void {
    const inst = this.s.cards[iid];
    if (!inst) return;
    const d = def(this.s, this.reg, iid);
    if (!isCreatureType(d.type)) return;
    for (const ab of d.abilities ?? []) {
      if (ab.when !== when || (extra && !extra(ab))) continue;
      this.triggered.push(...this.abilityTasks(ab, inst.owner, iid));
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
      case 'CREATURE_SUMMONED':
        this.triggerFrom(e.iid, 'onSummon');
        for (const other_ of battleAll()) {
          if (other_ === e.iid) continue;
          this.triggerFrom(other_, 'onOtherSummon', (ab) => this.whoMatches(ab.who, s.cards[other_].owner, e.player) && matchFilter(s, this.reg, e.iid, ab.filter));
        }
        break;
      case 'CREATURE_DESTROYED':
        this.triggerFrom(e.iid, 'onDestroyed');
        break;
      case 'CREATURE_LEFT':
        this.triggerFrom(e.iid, 'onLeave');
        break;
      case 'ATTACK_DECLARED':
        this.triggerFrom(e.attacker, 'onAttack');
        break;
      case 'BLOCKED':
        this.triggerFrom(e.blocker, 'onBlock');
        break;
      case 'BATTLE_WON':
        this.triggerFrom(e.winner, 'onBattleWin');
        break;
      case 'TURN_STARTED':
        for (const iid of s.players[e.player].zones.battle) this.triggerFrom(iid, 'onTurnStart');
        break;
      case 'TURN_ENDED':
        for (const iid of s.players[e.player].zones.battle) this.triggerFrom(iid, 'onTurnEnd');
        break;
      case 'SHIELD_BROKEN':
        for (const iid of battleAll()) this.triggerFrom(iid, 'onShieldBroken', (ab) => this.whoMatches(ab.who, s.cards[iid].owner, e.player));
        break;
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
      this.emit({ type: 'CARD_DRAWN', player, iid: top });
    }
  }

  moveCard(iid: string, to: ZoneName, opts: { toTop?: boolean } = {}): void {
    const s = this.s;
    const inst = s.cards[iid];
    const from = inst.zone;
    const owner = s.players[inst.owner];
    const fromList = owner.zones[from];
    const idx = fromList.indexOf(iid);
    if (idx >= 0) fromList.splice(idx, 1);
    const under = from === 'battle' && to !== 'battle' ? inst.under : [];
    if (from === 'battle' && to !== 'battle') inst.under = [];
    inst.zone = to;
    inst.tapped = false;
    inst.powerModTurn = 0;
    delete inst.keywordsTurn;
    delete inst.exLifeShield;
    inst.faceUp = to !== 'shield' && to !== 'deck';
    if (to === 'battle') inst.enteredTurn = s.turn;
    // 多色カードはタップしてマナゾーンに置かれる
    if (to === 'mana' && manaCivilizations(def(s, this.reg, iid)).length > 1) inst.tapped = true;
    if (to === 'deck' && opts.toTop === false) owner.zones.deck.unshift(iid);
    else owner.zones[to].push(iid);
    this.emit({ type: 'CARD_MOVED', iid, from, to });
    // 進化元のカードも同じゾーンへ
    for (const u of under) {
      s.cards[u].zone = 'battle';
      this.moveCard(u, to, opts);
    }
  }

  checkStateBased(): void {
    const s = this.s;
    if (s.gameOverReason !== null) return;
    const out = ([0, 1] as PlayerId[]).filter((p) => s.players[p].zones.deck.length === 0);
    if (out.length === 1) {
      this.log(`${s.players[out[0]].name} の山札が0枚になった`, out[0]);
      this.gameOver(other(out[0]), '山札切れ');
    } else if (out.length === 2) {
      this.gameOver(null, '両者山札切れ（引き分け）');
    }
    if (s.gameOverReason !== null || s.pending) return;
    // パワー0以下のクリーチャーは破壊される（入力待ちの間は、中断中のタスクより前に割り込ませない）
    const queued = new Set(s.queue.flatMap((t) => (t.kind === 'leave' ? [t.iid] : [])));
    const dead = [...s.players[0].zones.battle, ...s.players[1].zones.battle].filter((iid) => !queued.has(iid) && power(s, this.reg, iid) <= 0);
    if (dead.length) this.insertFront(...dead.map((iid): Task => ({ kind: 'leave', iid, to: 'graveyard', cause: 'destroy' })));
  }

  gameOver(winner: PlayerId | null, reason: string): void {
    const s = this.s;
    if (s.gameOverReason !== null) return;
    s.winner = winner;
    s.gameOverReason = reason;
    s.pending = null;
    s.queue = [];
    s.combat = null;
    this.log(winner === null ? `引き分け（${reason}）` : `${s.players[winner].name} の勝利！（${reason}）`, winner);
    this.emit({ type: 'GAME_OVER', winner, reason });
  }

  name(iid: string): string {
    const inst = this.s.cards[iid];
    return inst ? (this.reg[inst.cardId]?.name ?? inst.cardId) : iid;
  }

  log(text: string, player: PlayerId | null): void {
    this.s.log.push({ turn: this.s.turn, player, text });
  }
}
