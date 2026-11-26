import { ZONE_LABEL, type ZoneName } from '../../core/cards/types';
import type { CardRegistry } from '../../core/cards/registry';
import { attackTargets, canPlay, def, evolutionBases, isIdle } from '../../core/engine/queries';
import { other, type Action, type GameState, type PlayerId } from '../../core/engine/types';

/** ドラッグの落とし先。盤面の要素に data-drop="zone:0:mana" / "card:<iid>" / "plate:1" で付ける */
export type DropTarget = { kind: 'zone'; player: PlayerId; zone: ZoneName } | { kind: 'card'; iid: string } | { kind: 'plate'; player: PlayerId };

/** charge＝マナ（緑） play＝召喚・進化（シアン） attack＝クリーチャーへ攻撃（赤） break＝プレイヤーへ攻撃（金） manual＝手動移動 */
export type DropTone = 'charge' | 'play' | 'attack' | 'break' | 'manual';

export interface DropResult {
  label: string;
  tone: DropTone;
  /** play は進化元・NEO進化の選択が要るので画面側で処理する */
  run: { type: 'action'; action: Action } | { type: 'play'; iid: string };
}

export const dropKey = (t: DropTarget): string => (t.kind === 'zone' ? `zone:${t.player}:${t.zone}` : t.kind === 'card' ? `card:${t.iid}` : `plate:${t.player}`);

export function parseDropKey(s: string | undefined | null): DropTarget | null {
  if (!s) return null;
  const [kind, a, b] = s.split(':');
  if (kind === 'zone') return { kind, player: Number(a) as PlayerId, zone: b as ZoneName };
  if (kind === 'card') return { kind, iid: a };
  if (kind === 'plate') return { kind, player: Number(a) as PlayerId };
  return null;
}

/**
 * カード iid を落とし先 t に落とした時に何が起きるか。何も起きないなら null。
 * 攻撃 → 召喚・マナチャージ（ルール上の操作） → 手動移動 の順に判定する。
 */
export function resolveDrop(g: GameState, reg: CardRegistry, iid: string, t: DropTarget, canControl: (p: PlayerId) => boolean): DropResult | null {
  const inst = g.cards[iid];
  if (!inst || !canControl(inst.owner)) return null;
  const owner = inst.owner;
  const opp = other(owner);

  // 攻撃
  if (inst.zone === 'battle' && isIdle(g) && g.activePlayer === owner) {
    const targets = attackTargets(g, reg, owner, iid);
    if (t.kind === 'card' && targets.some((x) => x.kind === 'creature' && x.iid === t.iid)) {
      return { label: `${def(g, reg, t.iid).name} を攻撃`, tone: 'attack', run: { type: 'action', action: { type: 'ATTACK', player: owner, attacker: iid, target: { kind: 'creature', iid: t.iid } } } };
    }
    // カードの上に落とした時は、そのカードのゾーンに落としたものとして見る（シールドのカードの上など）
    const tc = t.kind === 'card' ? g.cards[t.iid] : undefined;
    const tz = t.kind === 'zone' ? t : tc ? { player: tc.owner, zone: tc.zone } : null;
    const atPlayer = (t.kind === 'plate' && t.player === opp) || (!!tz && tz.player === opp && (tz.zone === 'shield' || (tz.zone === 'battle' && t.kind === 'zone')));
    if (atPlayer && targets.some((x) => x.kind === 'player')) {
      const label = g.players[opp].zones.shield.length > 0 ? 'シールドブレイク' : 'ダイレクトアタック';
      return { label, tone: 'break', run: { type: 'action', action: { type: 'ATTACK', player: owner, attacker: iid, target: { kind: 'player' } } } };
    }
  }
  if (t.kind === 'plate') return null;

  // カードの上に落とした時：進化元なら進化、それ以外はそのカードのゾーンに落としたことにする
  let zoneT: { player: PlayerId; zone: ZoneName };
  if (t.kind === 'card') {
    const tc = g.cards[t.iid];
    if (!tc || t.iid === iid) return null;
    if (inst.zone === 'hand' && tc.zone === 'battle' && canPlay(g, reg, owner, iid) && evolutionBases(g, reg, owner, iid).includes(t.iid)) {
      const d = def(g, reg, iid);
      if (d.type === 'evolution' || d.neoEvolution) {
        return { label: `${def(g, reg, t.iid).name} に進化`, tone: 'play', run: { type: 'action', action: { type: 'PLAY_CARD', player: owner, iid, evolveOn: t.iid } } };
      }
    }
    zoneT = { player: tc.owner, zone: tc.zone };
  } else zoneT = t;

  // 自分のゾーンにだけ動かせる
  if (zoneT.player !== owner || zoneT.zone === inst.zone) return null;

  if (inst.zone === 'hand') {
    if (zoneT.zone === 'mana' && g.activePlayer === owner && g.phase === 'charge' && !g.players[owner].chargedThisTurn && isIdle(g)) {
      return { label: 'マナチャージ', tone: 'charge', run: { type: 'action', action: { type: 'CHARGE_MANA', player: owner, iid } } };
    }
    if (zoneT.zone === 'battle') {
      const d = def(g, reg, iid);
      if (canPlay(g, reg, owner, iid)) return { label: d.type === 'spell' ? '唱える' : d.type === 'tamaseed' ? '使う' : '召喚する', tone: 'play', run: { type: 'play', iid } };
      if (d.twin && canPlay(g, reg, owner, iid, 'twin')) {
        return { label: `「${d.twin.name}」を唱える`, tone: 'play', run: { type: 'action', action: { type: 'PLAY_CARD', player: owner, iid, side: 'twin' } } };
      }
    }
  }
  return {
    label: `${ZONE_LABEL[zoneT.zone]}へ移動（手動）`,
    tone: 'manual',
    run: { type: 'action', action: { type: 'MANUAL_MOVE', player: owner, iid, to: zoneT.zone } },
  };
}
