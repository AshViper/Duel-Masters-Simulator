import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ZONE_LABEL, type CardDefinition, type ZoneName } from '../../core/cards/types';
import { def as cardDef } from '../../core/engine/queries';
import type { GameEvent, GameState, PlayerId } from '../../core/engine/types';
import { useApp } from '../../store/appStore';
import { CardView } from '../components/CardView';

/**
 * 行動の演出。盤面が変わるたびに、直前の行動で起きたイベント（GameState.lastEvents）を読んで
 * ・何が起きたかのテロップ（右側に積む。自分は青、相手は赤）
 * ・カードそのものの光り方（召喚・攻撃・ブロック・タップなど。DOM に一時的なクラスを付ける）
 * ・攻撃の矢印、破壊・バウンスで消えたカードの残像、唱えた呪文の大写し
 * を出す。CPU・オンラインの相手の行動も同じ仕組みで見える。盤面全体は描き直さない。
 */

type FxTone = 'summon' | 'spell' | 'charge' | 'attack' | 'block' | 'battle' | 'break' | 'destroy' | 'leave' | 'draw' | 'trigger';

interface FeedItem {
  id: number;
  tone: FxTone;
  player: PlayerId | null;
  title: string;
  text?: string;
  card?: CardDefinition;
}

interface Ghost {
  id: number;
  card?: CardDefinition;
  faceDown?: boolean;
  x: number;
  y: number;
  w: number;
  kind: 'destroy' | 'leave';
  label: string;
}

interface Arrow {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: 'attack' | 'block';
}

interface Spotlight {
  id: number;
  card: CardDefinition;
  player: PlayerId;
  label: string;
}

let seq = 0;
const FEED_MS = 2600;
const FEED_MAX = 5;

const cardEl = (iid: string) => document.querySelector<HTMLElement>(`.board [data-testid="card-${iid}"]`);
const center = (el: Element | null) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** 要素に演出用のクラスを一時的に付ける（アニメーションが終わったら外す） */
function pulse(el: Element | null, cls: string, ms = 1100) {
  if (!el) return;
  el.classList.remove(cls);
  // 同じクラスを付け直してもアニメーションが最初から動くように、一度レイアウトを確定させる
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

const LEAVE_LABEL: Partial<Record<ZoneName, string>> = {
  hand: '手札へ',
  mana: 'マナへ',
  deck: '山札へ',
  shield: 'シールドへ',
  graveyard: '墓地へ',
  hyperspatial: '超次元へ',
};

export function ActionFx({ g, me, solo }: { g: GameState; me: PlayerId; solo: boolean }) {
  const registry = useApp((s) => s.registry);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const prev = useRef<GameState | null>(null);
  /** 直前の盤面でのバトルゾーンのカードの位置（離れたカードの残像を出す場所） */
  const rects = useRef(new Map<string, { x: number; y: number; w: number }>());
  /** 1つ前の盤面での位置。レイアウト効果（位置の記録）は通常の効果より先に動くので、こちらを読む */
  const prevRects = useRef(new Map<string, { x: number; y: number; w: number }>());

  useEffect(() => {
    const before = prev.current;
    prev.current = g;
    if (!before || before === g || g.lastEvents === before.lastEvents || g.lastEvents.length === 0) return;
    const name = (iid: string) => (g.cards[iid] ? cardDef(g, registry, iid).name : '');
    const defOf = (iid: string) => (g.cards[iid] ? cardDef(g, registry, iid) : undefined);
    const who = (p: PlayerId | null) => (p === null ? '' : solo ? g.players[p].name : p === me ? 'あなた' : g.players[p].name);
    const newLogs = g.log.slice(before.log.length).map((l) => l.text);
    const items: Omit<FeedItem, 'id'>[] = [];
    const newGhosts: Ghost[] = [];
    const later: (() => void)[] = [];
    const draws: Record<number, number> = {};
    const breaks: Record<number, number> = {};
    let spotted = false;

    for (const e of g.lastEvents as GameEvent[]) {
      switch (e.type) {
        case 'CREATURE_SUMMONED': {
          const d = defOf(e.iid);
          items.push({ tone: 'summon', player: e.player, title: d?.type === 'field' ? '設置' : '召喚', text: `${who(e.player)}：${name(e.iid)}`, card: d });
          later.push(() => pulse(cardEl(e.iid), 'fx-enter', 1300));
          break;
        }
        case 'CARD_PLAYED': {
          const trig = newLogs.some((t) => t.startsWith('S・トリガー') && t.includes(name(e.iid)));
          if (trig) {
            const d = defOf(e.iid);
            items.push({ tone: 'trigger', player: e.player, title: 'S・トリガー！', text: `${who(e.player)}：${name(e.iid)}`, card: d });
            if (d) {
              spotted = true;
              setSpot({ id: ++seq, card: d, player: e.player, label: 'S・トリガー！' });
            }
          }
          break;
        }
        case 'SPELL_CAST': {
          const d = defOf(e.iid);
          items.push({ tone: 'spell', player: e.player, title: '呪文', text: `${who(e.player)}：${name(e.iid)}`, card: d });
          if (d && !spotted) setSpot({ id: ++seq, card: d, player: e.player, label: '呪文' });
          break;
        }
        case 'MANA_CHARGED':
          items.push({ tone: 'charge', player: e.player, title: 'マナチャージ', text: `${who(e.player)}：${name(e.iid)}`, card: defOf(e.iid) });
          later.push(() => pulse(cardEl(e.iid), 'fx-charge', 1100));
          break;
        case 'ATTACK_DECLARED': {
          const target = e.target.kind === 'player' ? `${who(e.player === 0 ? 1 : 0)}（プレイヤー）` : name(e.target.iid);
          items.push({ tone: 'attack', player: e.player, title: '攻撃', text: `${name(e.attacker)} → ${target}`, card: defOf(e.attacker) });
          const tgt = e.target;
          later.push(() => {
            const a = cardEl(e.attacker);
            pulse(a, 'fx-attack', 1200);
            const def = e.player === 0 ? 1 : 0;
            const t = tgt.kind === 'player' ? document.querySelector(`.board [data-testid="shields-${def}"] .shield-row`) ?? document.querySelector(`.board [data-testid="plate-${def}"]`) : cardEl(tgt.iid);
            if (tgt.kind === 'creature') pulse(t, 'fx-targeted', 1200);
            else pulse(document.querySelector(`.board [data-testid="plate-${def}"]`), 'fx-targeted', 1200);
            const from = center(a);
            const to = center(t);
            if (from && to) setArrows((xs) => [...xs, { id: ++seq, from, to, kind: 'attack' }]);
          });
          break;
        }
        case 'BLOCKED': {
          const p = g.cards[e.blocker]?.owner ?? null;
          items.push({ tone: 'block', player: p, title: 'ブロック', text: `${name(e.blocker)} が ${name(e.attacker)} をブロック`, card: defOf(e.blocker) });
          later.push(() => {
            const b = cardEl(e.blocker);
            pulse(b, 'fx-block', 1200);
            const from = center(b);
            const to = center(cardEl(e.attacker));
            if (from && to) setArrows((xs) => [...xs, { id: ++seq, from, to, kind: 'block' }]);
          });
          break;
        }
        case 'BATTLE_WON': {
          // 破壊より先に「バトル」を見せる
          const at = items.findIndex((x) => x.tone === 'destroy');
          items.splice(at < 0 ? items.length : at, 0, { tone: 'battle', player: g.cards[e.winner]?.owner ?? null, title: 'バトル', text: `${name(e.winner)} の勝ち（${name(e.loser)}）`, card: defOf(e.winner) });
          later.push(() => pulse(cardEl(e.winner), 'fx-win', 1100));
          break;
        }
        case 'SHIELD_BROKEN':
          breaks[e.player] = (breaks[e.player] ?? 0) + 1;
          break;
        case 'CREATURE_DESTROYED':
          items.push({ tone: 'destroy', player: e.player, title: '破壊', text: `${who(e.player)}の ${name(e.iid)}`, card: defOf(e.iid) });
          break;
        case 'CREATURE_LEFT': {
          const r = prevRects.current.get(e.iid);
          const destroyed = g.lastEvents.some((x) => x.type === 'CREATURE_DESTROYED' && x.iid === e.iid);
          if (r) newGhosts.push({ id: ++seq, card: defOf(e.iid), x: r.x, y: r.y, w: r.w, kind: destroyed ? 'destroy' : 'leave', label: destroyed ? '破壊' : (LEAVE_LABEL[e.to] ?? ZONE_LABEL[e.to]) });
          if (!destroyed && e.to !== 'graveyard') {
            items.push({ tone: 'leave', player: e.player, title: LEAVE_LABEL[e.to] ?? ZONE_LABEL[e.to], text: `${who(e.player)}の ${name(e.iid)}`, card: defOf(e.iid) });
          } else if (!destroyed) {
            items.push({ tone: 'destroy', player: e.player, title: '墓地へ', text: `${who(e.player)}の ${name(e.iid)}`, card: defOf(e.iid) });
          }
          break;
        }
        case 'CARD_DRAWN':
          draws[e.player] = (draws[e.player] ?? 0) + 1;
          break;
        default:
          break;
      }
    }
    // 効果でタップ・アンタップされたクリーチャー（攻撃・ブロック・ターンはじめのアンタップは除く）
    if (!g.lastEvents.some((x) => x.type === 'TURN_STARTED' || x.type === 'ATTACK_DECLARED')) {
      const blockers = new Set(g.lastEvents.flatMap((x) => (x.type === 'BLOCKED' ? [x.blocker] : [])));
      const changed: Record<string, string[]> = {};
      for (const p of [0, 1] as PlayerId[]) {
        for (const iid of g.players[p].zones.battle) {
          const was = before.cards[iid];
          if (!was || was.zone !== 'battle' || was.tapped === g.cards[iid].tapped || blockers.has(iid)) continue;
          const k = `${p}:${g.cards[iid].tapped ? 'tap' : 'untap'}`;
          (changed[k] ??= []).push(iid);
          later.push(() => pulse(cardEl(iid), 'fx-tapped', 1000));
        }
      }
      for (const [k, list] of Object.entries(changed)) {
        const [p, kind] = k.split(':');
        const pid = Number(p) as PlayerId;
        items.push({ tone: 'leave', player: pid, title: kind === 'tap' ? 'タップ' : 'アンタップ', text: `${who(pid)}の ${list.map(name).join('、')}`, card: list.length === 1 ? defOf(list[0]) : undefined });
      }
    }
    // ドロー（ターンはじめの1枚は流れで分かるので出さない）・シールドブレイクはまとめて1行に
    for (const k of Object.keys(draws)) {
      const p = Number(k) as PlayerId;
      const n = draws[p];
      const turnDraw = n === 1 && g.lastEvents.some((x) => x.type === 'TURN_STARTED' || (x.type === 'PHASE_CHANGED' && x.phase === 'draw'));
      if (!turnDraw) items.push({ tone: 'draw', player: p, title: 'ドロー', text: `${who(p)}が ${n}枚引いた` });
      later.push(() => pulse(document.querySelector(`.board [data-testid="pile-${p}-deck"]`), 'fx-pile', 900));
    }
    for (const k of Object.keys(breaks)) {
      const p = Number(k) as PlayerId;
      items.splice(Math.max(0, items.findIndex((x) => x.tone === 'attack') + 1), 0, { tone: 'break', player: p === 0 ? 1 : 0, title: `シールドブレイク ×${breaks[p]}`, text: `${who(p)}のシールド 残り${g.players[p].zones.shield.length}枚` });
      later.push(() => pulse(document.querySelector(`.board [data-testid="hand-${p}"]`), 'fx-pile', 900));
    }

    if (items.length) {
      const stamped = items.map((it) => ({ ...it, id: ++seq }));
      setFeed((f) => [...f, ...stamped].slice(-FEED_MAX));
      const ids = new Set(stamped.map((x) => x.id));
      setTimeout(() => setFeed((f) => f.filter((x) => !ids.has(x.id))), FEED_MS + stamped.length * 250);
    }
    if (newGhosts.length) {
      setGhosts((xs) => [...xs, ...newGhosts]);
      const ids = new Set(newGhosts.map((x) => x.id));
      setTimeout(() => setGhosts((xs) => xs.filter((x) => !ids.has(x.id))), 1000);
    }
    // 新しい盤面が描かれてから、カードの位置を測って光らせる
    if (later.length) requestAnimationFrame(() => later.forEach((f) => f()));
  }, [g, registry, me, solo]);

  // バトルゾーンのカードの位置を覚えておく（次の行動で離れた時に残像を出すため）
  useLayoutEffect(() => {
    const m = new Map<string, { x: number; y: number; w: number }>();
    for (const p of [0, 1] as PlayerId[]) {
      for (const iid of g.players[p].zones.battle) {
        const el = cardEl(iid);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        // タップ中は90度回っているので、短い辺を幅にする
        m.set(iid, { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.min(r.width, r.height) });
      }
    }
    prevRects.current = rects.current;
    rects.current = m;
  }, [g]);

  // 矢印・大写しは一定時間で消す
  useEffect(() => {
    if (!arrows.length) return;
    const t = setTimeout(() => setArrows((xs) => xs.slice(1)), 1100);
    return () => clearTimeout(t);
  }, [arrows]);
  useEffect(() => {
    if (!spot) return;
    const t = setTimeout(() => setSpot(null), 1500);
    return () => clearTimeout(t);
  }, [spot]);

  const side = (p: PlayerId | null) => (p === null ? 'sys' : solo ? (p === 0 ? 'p0' : 'p1') : p === me ? 'mine' : 'theirs');

  return (
    <div className="fx-layer" aria-live="polite">
      {arrows.length > 0 && (
        <svg className="fx-arrows" width="100%" height="100%">
          <defs>
            <marker id="fx-head-attack" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#ff5a4e" />
            </marker>
            <marker id="fx-head-block" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#5dd9f5" />
            </marker>
          </defs>
          {arrows.map((a) => {
            const mx = (a.from.x + a.to.x) / 2;
            const my = (a.from.y + a.to.y) / 2 - Math.min(140, Math.hypot(a.to.x - a.from.x, a.to.y - a.from.y) * 0.3);
            const d = `M ${a.from.x} ${a.from.y} Q ${mx} ${my} ${a.to.x} ${a.to.y}`;
            return (
              <g key={a.id} className={'fx-arrow ' + a.kind}>
                <path className="fx-arrow-glow" d={d} pathLength={1} />
                <path className="fx-arrow-line" d={d} pathLength={1} markerEnd={`url(#fx-head-${a.kind})`} />
                <circle className="fx-arrow-hit" cx={a.to.x} cy={a.to.y} r="10" />
              </g>
            );
          })}
        </svg>
      )}
      {ghosts.map((gh) => (
        <div key={gh.id} className={'fx-ghost ' + gh.kind} style={{ left: gh.x, top: gh.y, ['--gw' as string]: `${gh.w}px` }}>
          <CardView card={gh.card} faceDown={!gh.card} size="fd" />
          <span className="fx-ghost-label">{gh.label}</span>
        </div>
      ))}
      {spot && (
        <div key={spot.id} className={'fx-spot ' + side(spot.player)}>
          <CardView card={spot.card} size="md" />
          <span className="fx-spot-label">{spot.label}</span>
        </div>
      )}
      <ol className="fx-feed" data-testid="action-feed">
        {feed.map((it) => (
          <li key={it.id} className={`fx-item tone-${it.tone} ${side(it.player)}`}>
            {it.card ? <CardView card={it.card} size="xs" /> : <span className="fx-item-icon" />}
            <div className="fx-item-body">
              <b>{it.title}</b>
              {it.text && <span>{it.text}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
