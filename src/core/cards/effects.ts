import type { EffectDef, MoveDest, TargetSpec } from './types';

export type MoveEffect = Extract<EffectDef, { type: 'move' }>;

/**
 * 移動先ごとの情報。新しい移動先を足す時はここと MoveDest に1行足すだけで、
 * テキストの読み取り（textParser の動詞表）とエンジン（move の処理）の両方が使えるようになる。
 * harmful: 対象のカードにとって不利な移動か（CPU が相手のカードを選ぶ時に使う）
 */
export const MOVE_DEST: Record<MoveDest, { verb: string; harmful: (from: TargetSpec['zone']) => boolean }> = {
  hand: { verb: '手札に戻す', harmful: (from) => from === 'battle' },
  mana: { verb: 'マナゾーンに置く', harmful: (from) => from !== 'deck' },
  graveyard: { verb: '墓地に置く', harmful: () => true },
  shield: { verb: 'シールドに加える', harmful: (from) => from === 'battle' },
  deckTop: { verb: '山札の上に置く', harmful: () => false },
  deckBottom: { verb: '山札の下に置く', harmful: () => true },
  battle: { verb: 'バトルゾーンに出す', harmful: () => false },
  under: { verb: 'クリーチャーの下に置く', harmful: () => false },
  shieldTop: { verb: '表向きにしてシールドの上に置く', harmful: (from) => from === 'battle' },
  hyperspatial: { verb: '超次元ゾーンに置く', harmful: (from) => from === 'battle' },
};

/** 旧形式の移動系の効果 → move の移動先 */
const LEGACY_MOVE: Partial<Record<EffectDef['type'], MoveDest>> = {
  bounce: 'hand',
  toHand: 'hand',
  shieldToHand: 'hand',
  graveyardToHand: 'hand',
  toMana: 'mana',
  toGraveyard: 'graveyard',
  toShield: 'shield',
  toDeckBottom: 'deckBottom',
  toDeckTop: 'deckTop',
  putIntoBattle: 'battle',
};

/** 移動系の効果なら move の形にそろえて返す（旧形式も読み替える）。それ以外は null */
export function asMove(e: EffectDef): MoveEffect | null {
  if (e.type === 'move') return e;
  const to = LEGACY_MOVE[e.type];
  if (!to || !('target' in e) || typeof e.target !== 'object') return null;
  return {
    type: 'move',
    target: e.target,
    to,
    ...('tapped' in e && e.tapped ? { tapped: true } : {}),
    ...('grant' in e && e.grant ? { grant: e.grant } : {}),
  };
}

export const move = (target: TargetSpec, to: MoveDest, extra: Partial<Pick<MoveEffect, 'tapped' | 'grant'>> = {}): MoveEffect => ({ type: 'move', target, to, ...extra });
