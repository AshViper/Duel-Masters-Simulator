import type { CardRegistry } from '../cards/registry';
import { attackTargets, canPlay, def, evolutionBases, isIdle } from './queries';
import type { Action, GameState, PlayerId } from './types';

/**
 * 入力待ちでない時にターンプレイヤーが取れる合法アクションの一覧。
 * （pending への応答は AI / UI がそれぞれ候補から組み立てる）
 */
export function getLegalActions(state: GameState, reg: CardRegistry, player: PlayerId): Action[] {
  if (!isIdle(state) || state.activePlayer !== player) return [];
  const out: Action[] = [];
  const P = state.players[player];
  if (state.phase === 'charge' && !P.chargedThisTurn) {
    for (const iid of P.zones.hand) out.push({ type: 'CHARGE_MANA', player, iid });
  }
  if (state.phase === 'charge' || state.phase === 'main') {
    for (const iid of P.zones.hand) {
      if (!canPlay(state, reg, player, iid, 'main')) continue;
      if (def(state, reg, iid).type === 'evolution') {
        for (const b of evolutionBases(state, reg, player, iid)) out.push({ type: 'PLAY_CARD', player, iid, evolveOn: b });
      } else out.push({ type: 'PLAY_CARD', player, iid });
    }
    // ツインパクトの呪文側
    for (const iid of P.zones.hand) {
      if (def(state, reg, iid).twin && canPlay(state, reg, player, iid, 'twin')) out.push({ type: 'PLAY_CARD', player, iid, side: 'twin' });
    }
  }
  if (state.phase === 'charge' || state.phase === 'main' || state.phase === 'attack') {
    for (const iid of P.zones.battle) {
      for (const target of attackTargets(state, reg, player, iid)) out.push({ type: 'ATTACK', player, attacker: iid, target });
    }
  }
  out.push({ type: 'NEXT_PHASE', player }, { type: 'END_TURN', player });
  return out;
}
