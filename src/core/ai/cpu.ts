// CPU AI。ゲーム状態を見て合法なアクションを1つ返す（1回の呼び出しで1手）。
import type { CardRegistry } from '../cards/registry';
import { playFace } from '../cards/types';
import { getLegalActions } from '../engine/legal';
import { blockersFor, breakerCount, def, power } from '../engine/queries';
import { other, type Action, type GameState, type PlayerId } from '../engine/types';

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'EASY：基本的な合法行動',
  normal: 'NORMAL：盤面とマナを考慮',
  hard: 'HARD：攻守の状況を考慮',
};

/** CPU が今取るべきアクション。何もすることがなければ null */
export function chooseAction(state: GameState, reg: CardRegistry, me: PlayerId, level: Difficulty, rand: () => number = Math.random): Action | null {
  if (state.gameOverReason !== null) return null;
  const p = state.pending;
  if (p) return p.player === me ? respond(state, reg, me, level, rand) : null;
  if (state.activePlayer !== me) return null;
  const legal = getLegalActions(state, reg, me);
  if (legal.length === 0) return null;
  return level === 'easy' ? easyTurn(legal, rand) : smartTurn(state, reg, me, legal, level);
}

function pick<T>(xs: T[], rand: () => number): T {
  return xs[Math.floor(rand() * xs.length)];
}

// ─────────────── 選択への応答 ───────────────
function respond(state: GameState, reg: CardRegistry, me: PlayerId, level: Difficulty, rand: () => number): Action {
  const p = state.pending!;
  if (p.kind === 'confirm') return { type: 'RESPOND', player: me, accept: level === 'easy' ? rand() < 0.8 : true };

  if (p.kind === 'block') {
    const atk = p.attacker;
    const ap = power(state, reg, atk);
    const shields = state.players[me].zones.shield.length;
    const attackingMe = state.combat?.target.kind === 'player';
    if (level === 'easy') return { type: 'RESPOND', player: me, selected: rand() < 0.5 ? [pick(p.blockers, rand)] : [] };
    const byPower = [...p.blockers].sort((a, b) => power(state, reg, b) - power(state, reg, a));
    const winner = byPower.find((b) => power(state, reg, b) > ap);
    const lethal = attackingMe && shields === 0;
    const dangerous = attackingMe && (breakerCount(state, reg, atk) >= 2 || shields <= 2);
    if (winner) return { type: 'RESPOND', player: me, selected: [winner] };
    if (lethal || (level === 'hard' && dangerous)) {
      // 負けるブロックでも、一番安いブロッカーで止める
      const cheapest = [...p.blockers].sort((a, b) => def(state, reg, a).cost - def(state, reg, b).cost)[0];
      return { type: 'RESPOND', player: me, selected: [cheapest] };
    }
    return { type: 'RESPOND', player: me, selected: [] };
  }

  if (p.kind === 'chooseMode') {
    // S・トリガーの面選択は「使う」側、モード選択は先頭（EASY はランダム）
    const i = level === 'easy' ? Math.floor(rand() * p.options.length) : 0;
    return { type: 'RESPOND', player: me, selected: [String(i)] };
  }

  // selectCards
  if (level === 'easy') {
    const shuffled = [...p.candidates].sort(() => rand() - 0.5);
    const n = p.min + Math.floor(rand() * (p.max - p.min + 1));
    return { type: 'RESPOND', player: me, selected: shuffled.slice(0, n) };
  }
  const value = (iid: string) => {
    const inst = state.cards[iid];
    const d = def(state, reg, iid);
    // 裏向きのシールドや相手の手札は中身を見ない
    if ((inst.zone === 'shield' && !inst.faceUp) || (inst.zone === 'hand' && inst.owner !== me)) return 1;
    return inst.zone === 'battle' ? power(state, reg, iid) / 1000 + d.cost : d.cost;
  };
  // 得になる度合い：不利な効果は相手の強いカード・自分の弱いカードを、有利な効果はその逆を選ぶ
  const gain = (iid: string) => {
    const mine = state.cards[iid].owner === me;
    const v = value(iid);
    return p.harmful ? (mine ? -v : v) : mine ? v : -v;
  };
  const ordered = [...p.candidates].sort((a, b) => gain(b) - gain(a));
  const good = ordered.filter((c) => gain(c) > 0).length;
  const n = Math.max(p.min, Math.min(p.max, good));
  return { type: 'RESPOND', player: me, selected: ordered.slice(0, n) };
}

// ─────────────── 自分のターン ───────────────
function easyTurn(legal: Action[], rand: () => number): Action {
  const charge = legal.filter((a) => a.type === 'CHARGE_MANA');
  if (charge.length) return pick(charge, rand);
  const play = legal.filter((a) => a.type === 'PLAY_CARD');
  if (play.length && rand() < 0.8) return pick(play, rand);
  const atk = legal.filter((a) => a.type === 'ATTACK');
  if (atk.length && rand() < 0.7) return pick(atk, rand);
  return legal.find((a) => a.type === 'END_TURN')!;
}

function smartTurn(state: GameState, reg: CardRegistry, me: PlayerId, legal: Action[], level: Difficulty): Action {
  const P = state.players[me];
  const opp = other(me);

  // 1) マナチャージ
  const charges = legal.filter((a): a is Extract<Action, { type: 'CHARGE_MANA' }> => a.type === 'CHARGE_MANA');
  if (charges.length) {
    const manaCivs = new Set(P.zones.mana.flatMap((m) => def(state, reg, m).civilizations));
    const manaCount = P.zones.mana.length;
    const score = (iid: string) => {
      const d = def(state, reg, iid);
      let s = 0;
      if (d.civilizations.some((c) => !manaCivs.has(c))) s += 3; // 文明を揃える
      if (d.cost > manaCount + 3) s += 2; // 当分使えない高コスト
      if (d.cost === manaCount + 1) s -= 3; // 次に使える札は残す
      if (d.keywords?.shieldTrigger) s -= 1;
      return s;
    };
    // マナが十分なら手札を温存（HARD のみ）
    if (!(level === 'hard' && manaCount >= 7 && P.zones.hand.length <= 2)) {
      const best = [...charges].sort((a, b) => score(b.iid) - score(a.iid))[0];
      return best;
    }
  }

  // 2) 召喚・呪文：コストの高いものから
  const plays = legal.filter((a): a is Extract<Action, { type: 'PLAY_CARD' }> => a.type === 'PLAY_CARD');
  if (plays.length) {
    const cost = (a: (typeof plays)[number]) => playFace(def(state, reg, a.iid), a.side ?? 'main').cost;
    const useful = plays.filter((a) => isUsefulPlay(state, reg, me, a.iid, a.side ?? 'main'));
    const best = useful.sort((a, b) => cost(b) - cost(a))[0];
    if (best) return best;
  }

  // 3) 攻撃
  const attacks = legal.filter((a): a is Extract<Action, { type: 'ATTACK' }> => a.type === 'ATTACK');
  const oppShields = state.players[opp].zones.shield.length;
  for (const a of attacks) {
    // とどめを刺せるならプレイヤーへ
    if (a.target.kind === 'player' && oppShields === 0 && blockersFor(state, reg, opp, a.attacker).length === 0) return a;
  }
  const creatureHits = attacks.filter((a) => a.target.kind === 'creature' && power(state, reg, a.attacker) + (def(state, reg, a.attacker).keywords?.powerAttacker ?? 0) > power(state, reg, (a.target as { iid: string }).iid));
  if (creatureHits.length) {
    return creatureHits.sort((a, b) => power(state, reg, (b.target as { iid: string }).iid) - power(state, reg, (a.target as { iid: string }).iid))[0];
  }
  const playerHits = attacks.filter((a) => a.target.kind === 'player');
  for (const a of playerHits) {
    const blockers = blockersFor(state, reg, opp, a.attacker);
    const myPower = power(state, reg, a.attacker) + (def(state, reg, a.attacker).keywords?.powerAttacker ?? 0);
    const safe = blockers.every((b) => power(state, reg, b) < myPower);
    if (level === 'hard') {
      // 相手の反撃が怖い時はブロッカー持ちを残す
      const oppAttackers = state.players[opp].zones.battle.length;
      if (def(state, reg, a.attacker).keywords?.blocker && oppAttackers >= 2 && P.zones.shield.length <= 2) continue;
    }
    if (safe || blockers.length === 0) return a;
  }
  return legal.find((a) => a.type === 'END_TURN')!;
}

/** 対象がいない除去呪文などを無駄撃ちしない */
function isUsefulPlay(state: GameState, reg: CardRegistry, me: PlayerId, iid: string, side: 'main' | 'twin'): boolean {
  const face = playFace(def(state, reg, iid), side);
  if (face.type !== 'spell') return true;
  const oppBattle = state.players[other(me)].zones.battle.length;
  const needsOppCreature = face.abilities.some((ab) =>
    ab.effects.some((e) => 'target' in e && typeof e.target === 'object' && e.target.zone === 'battle' && e.target.owner !== 'self'),
  );
  if (needsOppCreature && oppBattle === 0) return false;
  return true;
}
