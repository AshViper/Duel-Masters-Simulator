import type { CardRegistry } from '../cards/registry';
import { attackTargets, canPlay, canPlayAlt, choosePayment, def, evolutionBases, fushigiCandidates, isIdle, minimalSacrifice } from './queries';
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
    // 手札と、墓地などから召喚できるカード（「このクリーチャーを自分の墓地から召喚してもよい」）
    for (const iid of [...P.zones.hand, ...P.zones.graveyard, ...P.zones.mana]) {
      if (!canPlay(state, reg, player, iid, 'main')) continue;
      // ササゲール：使わないと払えない時だけ、少ない数で破壊する
      const sac = minimalSacrifice(state, reg, player, iid) ?? [];
      const extra = sac.length ? { sacrifice: sac } : {};
      if (def(state, reg, iid).type === 'evolution') {
        for (const b of evolutionBases(state, reg, player, iid)) if (!sac.includes(b)) out.push({ type: 'PLAY_CARD', player, iid, evolveOn: b, ...extra });
      } else if (def(state, reg, iid).neoCostReduce && !sac.length && choosePayment(state, reg, player, iid) === null) {
        // NEO進化クリーチャーとして召喚しないと払えない：進化元に重ねる
        const b = evolutionBases(state, reg, player, iid)[0];
        if (b) out.push({ type: 'PLAY_CARD', player, iid, evolveOn: b });
      } else out.push({ type: 'PLAY_CARD', player, iid, ...extra });
    }
    // 別のコストでの使い方（リサイクル・ギャラクシールド・フシギバースなど）
    for (const iid of [...P.zones.hand, ...P.zones.graveyard]) {
      (def(state, reg, iid).altPlays ?? []).forEach((alt, idx) => {
        if (alt.fushigi) {
          const c = fushigiCandidates(state, reg, player, iid, idx);
          if (c.length) out.push({ type: 'PLAY_CARD', player, iid, alt: idx, sacrifice: [c[0]] });
        } else if (canPlayAlt(state, reg, player, iid, idx)) out.push({ type: 'PLAY_CARD', player, iid, alt: idx });
      });
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
