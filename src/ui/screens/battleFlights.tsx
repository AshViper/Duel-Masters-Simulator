import { useLayoutEffect, useRef, useState } from 'react';
import type { CardDefinition, ZoneName } from '../../core/cards/types';
import { def as cardDef } from '../../core/engine/queries';
import type { CardInstance, GameState, PlayerId } from '../../core/engine/types';
import { useApp } from '../../store/appStore';
import { CardView } from '../components/CardView';
import { LookOwnerContext } from '../cardLooks';

/**
 * カードが動いた時の演出：盤面が変わるたびに、ゾーンが変わったカードを、元の場所から行き先まで飛ばして見せる。
 * 効果で山札からシールドへ・マナから手札へ・墓地からバトルゾーンへ…など、何がどこへ動いたかが一目で分かるようにする。
 * ・元の場所：直前の盤面でのそのカードの位置（見えていなければ、そのゾーンの置き場）
 * ・行き先：新しい盤面でのそのカードの位置（山札・墓地などは置き場）。飛んでいる間は行き先のカードを隠し、着いたら光らせる
 * ・見えないカード（山札・相手の手札・裏向きのシールド）どうしの移動は裏向きで飛ばす
 * ・破壊は battleFx の残像（砕ける演出）で見せるので、ここでは飛ばさない
 */

interface Box {
  x: number;
  y: number;
  /** 回転していない時のカードの幅（タップ中でも縦向きの幅） */
  w: number;
}

interface Flight {
  id: number;
  iid: string;
  /** 行き先での持ち主（オンラインで相手のカードの見た目を使うため） */
  owner: number;
  card?: CardDefinition;
  from: Box;
  to: Box;
  delay: number;
  label: string;
  /** 着いた時に光らせるクラス */
  land: string;
  /** 行き先がカードではなく置き場（山札・墓地・相手の手札など） */
  toAnchor?: string;
}

const FLY_MS = 620;
const STAGGER_MS = 120;
/** 一度に飛ばす枚数の上限（それより多い時は、山札をまとめて動かすなどの大きな処理なので飛ばさない） */
const MAX_FLIGHTS = 12;

const ZONE_TO: Partial<Record<ZoneName, string>> = {
  hand: '手札へ',
  battle: 'バトルゾーンへ',
  mana: 'マナへ',
  shield: 'シールドへ',
  graveyard: '墓地へ',
  deck: '山札へ',
  hyperspatial: '超次元へ',
  grZone: '超GRへ',
};

/** ゾーンの置き場（カードが見えていない時の位置） */
const anchorId = (p: PlayerId, zone: ZoneName) =>
  ({ battle: `battle-${p}`, hand: `hand-${p}`, mana: `mana-${p}`, shield: `shields-${p}`, deck: `pile-${p}-deck`, graveyard: `pile-${p}-graveyard`, hyperspatial: `pile-${p}-hyperspatial` } as Partial<Record<ZoneName, string>>)[zone] ?? `plate-${p}`;

const boxOf = (el: HTMLElement): Box => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: el.offsetWidth || Math.min(r.width, r.height) };
};

let seq = 0;

export function CardFlights({ g, canSee }: { g: GameState; canSee: (p: PlayerId) => boolean }) {
  const registry = useApp((s) => s.registry);
  const [flights, setFlights] = useState<Flight[]>([]);
  const prev = useRef<{ g: GameState; cards: Map<string, Box>; anchors: Map<string, Box> } | null>(null);
  const canSeeRef = useRef(canSee);
  canSeeRef.current = canSee;

  useLayoutEffect(() => {
    const cards = new Map<string, Box>();
    document.querySelectorAll<HTMLElement>('.board [data-testid^="card-"]').forEach((el) => cards.set(el.dataset.testid!.slice(5), boxOf(el)));
    const anchors = new Map<string, Box>();
    for (const p of [0, 1] as PlayerId[]) {
      for (const z of ['battle', 'hand', 'mana', 'shield', 'deck', 'graveyard', 'hyperspatial', 'grZone'] as ZoneName[]) {
        const el = document.querySelector<HTMLElement>(`.board [data-testid="${anchorId(p, z)}"]`);
        if (el) {
          const b = boxOf(el);
          // 置き場はカードより大きいので、幅はその場所のカードくらいにする
          anchors.set(`${p}-${z}`, { ...b, w: Math.min(b.w, 70) });
        }
      }
    }
    const before = prev.current;
    prev.current = { g, cards, anchors };
    if (!before || before.g === g) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const destroyed = new Set(g.lastEvents.flatMap((e) => (e.type === 'CREATURE_DESTROYED' ? [e.iid] : [])));
    const moved = Object.values(g.cards).filter((c) => {
      const was = before.g.cards[c.iid];
      return was && (was.zone !== c.zone || was.owner !== c.owner) && !destroyed.has(c.iid);
    });
    if (!moved.length || moved.length > MAX_FLIGHTS) return;

    const visible = (c: CardInstance) =>
      c.zone === 'battle' || c.zone === 'mana' || c.zone === 'graveyard' || c.zone === 'hyperspatial' ? true : c.zone === 'hand' ? canSeeRef.current(c.owner) : c.zone === 'shield' ? !!c.faceUp : false;
    const out: Flight[] = [];
    moved.forEach((c) => {
      const was = before.g.cards[c.iid];
      const from = before.cards.get(c.iid) ?? before.anchors.get(`${was.owner}-${was.zone}`);
      const toCard = cards.get(c.iid);
      const toAnchor = toCard ? undefined : anchorId(c.owner, c.zone);
      const to = toCard ?? anchors.get(`${c.owner}-${c.zone}`);
      if (!from || !to) return;
      const show = visible(was) || visible(c);
      out.push({
        id: ++seq,
        iid: c.iid,
        owner: c.owner,
        card: show && registry[c.cardId] ? cardDef(g, registry, c.iid) : undefined,
        from,
        to,
        delay: out.length * STAGGER_MS,
        label: ZONE_TO[c.zone] ?? '',
        land: c.zone === 'battle' ? 'fx-enter' : 'fx-land',
        toAnchor,
      });
    });
    if (!out.length) return;
    // 着くまでは行き先のカードを隠す（描かれる前に隠すので、ちらつかない）
    for (const f of out) {
      if (f.toAnchor) continue;
      const el = document.querySelector<HTMLElement>(`.board [data-testid="card-${f.iid}"]`);
      if (el) el.style.opacity = '0';
    }
    setFlights((xs) => [...xs, ...out]);
  }, [g, registry]);

  const landed = (f: Flight) => {
    setFlights((xs) => xs.filter((x) => x.id !== f.id));
    const el = document.querySelector<HTMLElement>(f.toAnchor ? `.board [data-testid="${f.toAnchor}"]` : `.board [data-testid="card-${f.iid}"]`);
    if (!el) return;
    if (!f.toAnchor) el.style.opacity = '';
    const cls = f.toAnchor ? 'fx-pile' : f.land;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1200);
  };

  return (
    <>
      {flights.map((f) => (
        <FlyingCard key={f.id} f={f} onDone={() => landed(f)} />
      ))}
    </>
  );
}

function FlyingCard({ f, onDone }: { f: Flight; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useLayoutEffect(() => {
    const el = ref.current;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    // アニメーションが使えない環境・止まった時も、必ず行き先を見せる
    const safety = setTimeout(finish, f.delay + FLY_MS + 400);
    if (!el || typeof el.animate !== 'function') return () => clearTimeout(safety);
    const dx = f.to.x - f.from.x;
    const dy = f.to.y - f.from.y;
    const lift = Math.min(120, 30 + Math.hypot(dx, dy) * 0.18);
    const s = f.to.w / f.from.w;
    const anim = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.0, offset: 0 },
        { transform: 'translate(-50%, -50%) scale(1.12)', opacity: 1, offset: 0.12 },
        { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - lift}px)) scale(${(1 + s) / 2 + 0.12})`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${s})`, opacity: 1, offset: 1 },
      ],
      { duration: FLY_MS, delay: f.delay, easing: 'cubic-bezier(0.45, 0.05, 0.25, 1)', fill: 'both' },
    );
    anim.onfinish = finish;
    return () => {
      clearTimeout(safety);
      anim.cancel();
    };
  }, [f]);
  return (
    <div ref={ref} className="fx-fly" style={{ left: f.from.x, top: f.from.y, ['--gw' as string]: `${f.from.w}px` }}>
      <LookOwnerContext.Provider value={f.owner}>
        <CardView card={f.card} faceDown={!f.card} size="fd" />
      </LookOwnerContext.Provider>
      {f.label && <span className="fx-fly-label">{f.label}</span>}
    </div>
  );
}
