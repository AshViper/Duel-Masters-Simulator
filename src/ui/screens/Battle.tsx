import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import { CARD_TYPE_LABEL, CIV_LABEL, CIVILIZATIONS, manaCivilizations, ZONE_LABEL, type CardDefinition, type ZoneName } from '../../core/cards/types';
import { getLegalActions } from '../../core/engine/legal';
import { attackTargets, canAttackWith, canPlay, choosePayment, effectiveCost, evolutionBases, hyperizeCandidates, isIdle, isIgnored, keywords as cardKeywords, minimalSacrifice, sasageruCandidates, sealForQueries, def as cardDef, power, untappedManaCount } from '../../core/engine/queries';
import { other, PHASE_LABEL, type Action, type GameState, type PlayerId } from '../../core/engine/types';
import { useApp } from '../../store/appStore';
import { isCpuTurnPlayer, useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { CardDetail, Modal } from '../components/CardDetail';
import { CardView, CIV_COLOR, type CardSize } from '../components/CardView';
import { create } from 'zustand';
import '../battle.css';
import { dropKey, parseDropKey, resolveDrop, type DropResult, type DropTarget } from './battleDrag';
import { ActionFx } from './battleFx';

const CIV_ORDER = CIVILIZATIONS;

/** ドラッグ中の状態。active になるまで（少し動かすまで）はクリック扱い */
interface DragState {
  iid: string;
  /** 掴んだ時のカードの中心（攻撃の矢印の始点） */
  ox: number;
  oy: number;
  over: DropTarget | null;
}

// 軽量化：マウスの動きに合わせて頻繁に変わる値は、盤面全体ではなくそれを使う部品だけが読む小さなストアに置く
/** カーソルを合わせているカード（右のプレビューだけが読む） */
const useHoverCard = create<{ iid: string | null }>(() => ({ iid: null }));
const setHover = (iid: string | null) => {
  if (useHoverCard.getState().iid !== iid) useHoverCard.setState({ iid });
};
/** ドラッグ中の指先の位置と傾き（ドラッグの影と矢印だけが読む） */
const useDragPos = create<{ x: number; y: number; tilt: number }>(() => ({ x: 0, y: 0, tilt: 0 }));
const DRAG_THRESHOLD = 6;

const MOVE_TARGETS: ZoneName[] = ['hand', 'battle', 'mana', 'shield', 'graveyard', 'deck'];

export function BattleScreen() {
  const { game, mode, dispatch, error, clearError, saveGame, quit, start, deckNames, seat, rematch } = useBattle();
  const net = useOnline();
  /** 画面の下側に置く（自分の）プレイヤー。1人回しはプレイヤー1が下 */
  const me: PlayerId = mode === 'solo' ? 0 : seat;
  const opp = other(me);
  const { registry, decks } = useApp();
  const [attacker, setAttacker] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [inspect, setInspect] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  /** ドラッグの直後に発生するクリックを無視する */
  const suppressClick = useRef(false);
  const [detail, setDetail] = useState<CardDefinition | null>(null);
  const [zoneView, setZoneView] = useState<{ player: PlayerId; zone: ZoneName } | null>(null);
  const [evolve, setEvolve] = useState<{ iid: string; bases: string[]; neo?: boolean; sacrifice?: string[] } | null>(null);
  /** ササゲール：ディスペクターを召喚する時に破壊するクリーチャーを選ぶ */
  const [sasa, setSasa] = useState<{ iid: string; cands: string[]; chosen: string[] } | null>(null);
  const [toast, setToast] = useState('');
  const [banner, setBanner] = useState<{ text: string; key: number } | null>(null);
  const [flash, setFlash] = useState<PlayerId | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  /** ドラッグ中のリスナーから最新の盤面で判定・実行するための入口（毎回の描画で差し替える） */
  const live = useRef<{ resolve: (iid: string, t: DropTarget) => DropResult | null; run: (r: DropResult) => void } | null>(null);

  useEffect(() => {
    setSelection([]);
  }, [game?.pending]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [game?.log.length]);
  // ターンが変わったら中央にバナーを出す
  const turnKey = game ? `${game.turn}:${game.activePlayer}` : '';
  useEffect(() => {
    if (!game || game.gameOverReason) return;
    const p = game.players[game.activePlayer];
    const text = mode === 'solo' ? `${p.name} のターン` : game.activePlayer === me ? 'あなたのターン' : mode === 'cpu' ? 'CPU のターン' : `${p.name} のターン`;
    setBanner({ text, key: Date.now() });
    const t = setTimeout(() => setBanner(null), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnKey]);
  // シールドがブレイクされたら揺らす
  useEffect(() => {
    const ev = game?.lastEvents.find((e) => e.type === 'SHIELD_BROKEN');
    if (!ev || ev.type !== 'SHIELD_BROKEN') return;
    setFlash(ev.player);
    const t = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(t);
  }, [game?.lastEvents]);
  // 対戦画面を離れたらプレビューを消す
  useEffect(() => () => setHover(null), []);
  useEffect(() => {
    if (!error) return;
    setToast(error);
    const t = setTimeout(() => {
      setToast('');
      clearError();
    }, 2500);
    return () => clearTimeout(t);
  }, [error, clearError]);

  // 表示中の盤面はもう書き換えないので、パワー・コストなどの問い合わせ結果を覚えて描画を軽くする
  if (game) sealForQueries(game);
  const legal = useMemo(() => (game ? getLegalActions(game, registry, game.activePlayer) : []), [game, registry]);
  if (!game) return null;

  const g: GameState = game;
  const canControl = (p: PlayerId) => mode === 'solo' || p === me;
  const cpuThinking = isCpuTurnPlayer(g, mode) !== null;
  const pending = g.pending && canControl(g.pending.player) ? g.pending : null;
  const act = (a: Action) => dispatch(a);
  const def = (iid: string) => cardDef(g, registry, iid);
  const keywordsOf = (iid: string) => cardKeywords(g, registry, iid);
  const active = g.activePlayer;
  const myTurnControl = canControl(active) && isIdle(g);

  const attackTargetsOf = (iid: string) => attackTargets(g, registry, g.cards[iid].owner, iid);
  const isAttackTarget = (iid: string) => !!attacker && attackTargetsOf(attacker).some((t) => t.kind === 'creature' && t.iid === iid);
  const canAttackPlayer = !!attacker && attackTargetsOf(attacker).some((t) => t.kind === 'player');

  function play(iid: string, sacrifice?: string[]) {
    const owner = g.cards[iid].owner;
    const d = def(iid);
    // ササゲール：破壊できるクリーチャーがいれば、先に選ぶ（使わないことも選べる）
    if (!sacrifice) {
      const cands = sasageruCandidates(g, registry, owner, iid);
      if (cands.length) return setSasa({ iid, cands, chosen: minimalSacrifice(g, registry, owner, iid) ?? [] });
    }
    const sac = sacrifice ?? [];
    const extra = sac.length ? { sacrifice: sac } : {};
    if (d.type === 'evolution') {
      const bases = evolutionBases(g, registry, owner, iid).filter((b) => !sac.includes(b));
      if (bases.length > 1) return setEvolve({ iid, bases, sacrifice: sac });
    }
    // NEO進化：重ねるか、そのまま召喚するかを選ぶ
    if (d.neoEvolution) {
      const bases = evolutionBases(g, registry, owner, iid).filter((b) => !sac.includes(b));
      if (bases.length > 0) return setEvolve({ iid, bases, neo: true, sacrifice: sac });
    }
    act({ type: 'PLAY_CARD', player: owner, iid, ...extra });
  }

  function onCardClick(iid: string, e: MouseEvent) {
    e.stopPropagation();
    if (suppressClick.current) return;
    const inst = g.cards[iid];
    if (pending?.kind === 'selectCards' && pending.candidates.includes(iid)) {
      setSelection((s) => (s.includes(iid) ? s.filter((x) => x !== iid) : s.length < pending.max ? [...s, iid] : s));
      return;
    }
    if (pending?.kind === 'block' && pending.blockers.includes(iid)) {
      act({ type: 'RESPOND', player: pending.player, selected: [iid] });
      return;
    }
    if (attacker && isAttackTarget(iid)) {
      act({ type: 'ATTACK', player: g.cards[attacker].owner, attacker, target: { kind: 'creature', iid } });
      setAttacker(null);
      return;
    }
    if (myTurnControl && inst.owner === active && inst.zone === 'battle' && canAttackWith(g, registry, active, iid)) {
      setAttacker(attacker === iid ? null : iid);
      return;
    }
    if (inst.zone === 'shield' || (inst.zone === 'hand' && !canControl(inst.owner))) return;
    setInspect(iid);
  }

  /** 右クリック：カードの詳細（手動操作もここから） */
  function onContext(iid: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setInspect(iid);
  }

  function attackPlayer() {
    if (!attacker || !canAttackPlayer) return;
    act({ type: 'ATTACK', player: g.cards[attacker].owner, attacker, target: { kind: 'player' } });
    setAttacker(null);
  }

  // ─── ドラッグ操作（ポインターで掴んで、盤面の落とし先に離す） ───
  live.current = {
    resolve: (iid, t) => resolveDrop(g, registry, iid, t, canControl),
    run: (r) => {
      setAttacker(null);
      if (r.run.type === 'play') play(r.run.iid);
      else act(r.run.action);
    },
  };
  const dropResultOf = (t: DropTarget) => (drag ? resolveDrop(g, registry, drag.iid, t, canControl) : null);

  function onCardPointerDown(iid: string, e: ReactPointerEvent) {
    if (e.button !== 0 || !canControl(g.cards[iid].owner)) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    let lastX = sx;
    let tilt = 0;
    let over: DropTarget | null = null;
    let started = false;
    const dropKeyOf = (t: DropTarget | null) => (t ? dropKey(t) : '');
    const move = (ev: PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return;
        active = true;
        setHover(null);
      }
      // 横に動かした勢いで少し傾ける
      tilt = Math.max(-14, Math.min(14, tilt * 0.6 + (ev.clientX - lastX) * 0.9));
      lastX = ev.clientX;
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-drop]') as HTMLElement | null;
      const next = parseDropKey(el?.dataset.drop);
      useDragPos.setState({ x: ev.clientX, y: ev.clientY, tilt });
      // 盤面（落とし先の光り方）を描き直すのは、ドラッグを始めた時と落とし先が変わった時だけ
      if (!started || dropKeyOf(next) !== dropKeyOf(over)) {
        started = true;
        over = next;
        setDrag({ iid, ox: rect.left + rect.width / 2, oy: rect.top + rect.height / 2, over });
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!active) return;
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      setDrag(null);
      const r = over && live.current?.resolve(iid, over);
      if (r) live.current?.run(r);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /** ドラッグ中の落とし先の見た目（置ける／今乗っている） */
  const dropState = (t: DropTarget): string => {
    if (!drag) return '';
    const r = dropResultOf(t);
    if (!r) return ' drop-no';
    const on = drag.over && dropKey(drag.over) === dropKey(t);
    return ` drop-ok drop-${r.tone}` + (on ? ' drop-over' : '');
  };
  const dropProps = (p: PlayerId, zone: ZoneName) => {
    const t: DropTarget = { kind: 'zone', player: p, zone };
    const st = dropState(t).trim();
    return { 'data-drop': dropKey(t), 'data-dropstate': st || undefined, 'data-droplabel': st.includes('drop-over') ? dropResultOf(t)?.label : undefined };
  };

  // ─── ゾーン描画 ───
  const highlightOf = (iid: string): 'target' | 'attacker' | 'playable' | 'ready' | null => {
    if (pending?.kind === 'selectCards' && pending.candidates.includes(iid)) return 'target';
    if (pending?.kind === 'block' && pending.blockers.includes(iid)) return 'target';
    if (attacker === iid) return 'attacker';
    if (attacker && isAttackTarget(iid)) return 'target';
    const inst = g.cards[iid];
    if (myTurnControl && inst.owner === active) {
      if (inst.zone === 'hand' && (canPlay(g, registry, active, iid) || canPlay(g, registry, active, iid, 'twin'))) return 'playable';
      if (inst.zone === 'battle' && !attacker && canAttackWith(g, registry, active, iid)) return 'ready';
    }
    return null;
  };

  const renderCard = (iid: string, size: CardSize, opts: { hidden?: boolean } = {}) => {
    const inst = g.cards[iid];
    const d = def(iid);
    return (
      <CardView
        key={iid}
        card={d}
        faceDown={opts.hidden}
        size={size}
        tapped={inst.tapped}
        power={inst.zone === 'battle' && d.type !== 'field' && !isIgnored(g, registry, iid) ? power(g, registry, iid) : undefined}
        cost={inst.zone === 'hand' ? effectiveCost(g, registry, inst.owner, iid) : undefined}
        selected={selection.includes(iid)}
        highlight={highlightOf(iid)}
        onClick={(e) => onCardClick(iid, e)}
        onContextMenu={(e) => onContext(iid, e)}
        onHover={opts.hidden ? undefined : (on) => setHover(on ? iid : null)}
        onPointerDown={canControl(inst.owner) ? (e) => onCardPointerDown(iid, e) : undefined}
        dropId={dropKey({ kind: 'card', iid })}
        className={(drag?.iid === iid ? 'drag-source' : '') + (drag && drag.iid !== iid ? dropState({ kind: 'card', iid }) : '') || undefined}
        badge={
          inst.seals?.length ? (
            <span className="under-badge seal-badge" title="封印されている間、両プレイヤーはこのカードを無視する">封印 ×{inst.seals.length}</span>
          ) : inst.under.length > 0 ? (
            <span className="under-badge">進化 +{inst.under.length}</span>
          ) : undefined
        }
        dimmed={inst.zone === 'battle' && !!inst.seals?.length}
        testId={`card-${iid}`}
      />
    );
  };

  const side = (p: PlayerId) => {
    const P = g.players[p];
    const top = p !== me;
    const handHidden = !canControl(p);
    const targetable = canAttackPlayer && !!attacker && g.cards[attacker].owner !== p;
    const untapped = untappedManaCount(g, p);
    const manaCivs = CIV_ORDER.map((c) => ({ c, n: P.zones.mana.filter((m) => !g.cards[m].tapped && manaCivilizations(def(m)).includes(c)).length })).filter((x) => x.n > 0);
    const graveTop = P.zones.graveyard[P.zones.graveyard.length - 1];
    const hyperTop = P.zones.hyperspatial[P.zones.hyperspatial.length - 1];
    // 超次元ゾーンを使うプレイヤー（サイキック・クリーチャーを持っている）だけ置き場を出す。空になっても消さない
    const usesHyper = !!hyperTop || Object.values(g.cards).some((c) => c.owner === p && !!registry[c.cardId]?.psychic);

    const plate = (
      <div
        className={'plate' + (g.activePlayer === p ? ' active' : '') + (targetable ? ' targetable' : '') + dropState({ kind: 'plate', player: p })}
        onClick={() => targetable && attackPlayer()}
        data-drop={dropKey({ kind: 'plate', player: p })}
        data-testid={`plate-${p}`}
      >
        <div className="plate-avatar">{P.name.slice(0, 1)}</div>
        <div className="plate-body">
          <div className="plate-name">
            {P.name}
            {g.activePlayer === p && <span className="plate-turn">TURN</span>}
          </div>
          <div className="plate-stats">
            <span>盾<b>{P.zones.shield.length}</b></span>
            <span>手札<b>{P.zones.hand.length}</b></span>
            <span>マナ<b>{untapped}/{P.zones.mana.length}</b></span>
          </div>
        </div>
        {targetable && <div className="plate-target">プレイヤーを攻撃</div>}
      </div>
    );
    const shields = (
      <div
        className={'zone shields' + (targetable ? ' hl-zone' : '') + (flash === p ? ' hit' : '')}
        onClick={() => targetable && attackPlayer()}
        {...dropProps(p, 'shield')}
        data-testid={`shields-${p}`}
      >
        <span className="zone-label">シールド</span>
        <div className="shield-row" style={{ ['--n' as string]: Math.max(2, P.zones.shield.length) }}>
          {P.zones.shield.map((iid) => renderCard(iid, 'xs', { hidden: !g.cards[iid].faceUp }))}
          {P.zones.shield.length === 0 && <span className="zone-empty">なし</span>}
        </div>
      </div>
    );
    const mana = (
      <div className="zone mana" {...dropProps(p, 'mana')} data-testid={`mana-${p}`}>
        <span className="zone-label">
          マナ <b>{untapped}</b>/{P.zones.mana.length}
          <span className="mana-civs">
            {manaCivs.map(({ c, n }) => (
              <i key={c} style={{ background: CIV_COLOR[c] }} title={`${CIV_LABEL[c]} ${n}`}>{n}</i>
            ))}
          </span>
        </span>
        <div className="mana-row" style={{ ['--n' as string]: Math.max(2, P.zones.mana.length) }}>{P.zones.mana.map((iid) => renderCard(iid, 'xs'))}</div>
      </div>
    );
    const piles = (
      <div className={'piles' + (usesHyper ? ' has-hyper' : '')}>
        <button className="pile deck-pile" onClick={() => setZoneView({ player: p, zone: 'deck' })} onContextMenu={(e) => { e.preventDefault(); setZoneView({ player: p, zone: 'deck' }); }} {...dropProps(p, 'deck')} data-testid={`pile-${p}-deck`} title="山札">
          <span className="pile-stack" />
          <span className="pile-count">{P.zones.deck.length}</span>
          <span className="pile-label">山札</span>
        </button>
        <button className="pile grave-pile" onClick={() => setZoneView({ player: p, zone: 'graveyard' })} onContextMenu={(e) => { e.preventDefault(); setZoneView({ player: p, zone: 'graveyard' }); }} {...dropProps(p, 'graveyard')} data-testid={`pile-${p}-graveyard`} title="墓地">
          {graveTop ? <span className="pile-top">{renderCard(graveTop, 'xs')}</span> : <span className="pile-stack empty" />}
          <span className="pile-count">{P.zones.graveyard.length}</span>
          <span className="pile-label">墓地</span>
        </button>
        {/* 超次元ゾーン：サイキック・クリーチャーなどを入れている時だけ出す（公開ゾーン） */}
        {usesHyper && (
          <button className="pile hyper-pile" onClick={() => setZoneView({ player: p, zone: 'hyperspatial' })} onContextMenu={(e) => { e.preventDefault(); setZoneView({ player: p, zone: 'hyperspatial' }); }} data-testid={`pile-${p}-hyperspatial`} title="超次元ゾーン">
            {hyperTop ? <span className="pile-top">{renderCard(hyperTop, 'xs')}</span> : <span className="pile-stack empty" />}
            <span className="pile-count">{P.zones.hyperspatial.length}</span>
            <span className="pile-label">超次元</span>
          </button>
        )}
      </div>
    );
    const field = (
      <div className={'zone field' + (top ? ' opp' : ' mine')} {...dropProps(p, 'battle')} data-testid={`battle-${p}`}>
        <div className="field-cards" style={{ ['--n' as string]: Math.max(1, P.zones.battle.length), ['--nt' as string]: P.zones.battle.filter((iid) => g.cards[iid].tapped).length }}>
          {P.zones.battle.map((iid) => renderCard(iid, 'fd'))}
          {P.zones.battle.length === 0 && <span className="zone-empty">バトルゾーン</span>}
        </div>
      </div>
    );
    const hand = (
      <div className={'zone hand' + (handHidden ? ' hidden-hand' : '') + (top ? ' opp' : '')} {...dropProps(p, 'hand')} data-testid={`hand-${p}`}>
        <div className="hand-fan" style={{ ['--n' as string]: Math.max(2, P.zones.hand.length) }}>{P.zones.hand.map((iid) => renderCard(iid, handHidden ? 'xs' : 'hd', { hidden: handHidden }))}</div>
      </div>
    );
    const row = (
      <div className="side-row">
        {plate}
        {shields}
        {mana}
        {piles}
      </div>
    );
    return (
      <div className={'side ' + (top ? 'top' : 'bottom')}>
        {top ? (
          <>
            {hand}
            {row}
            {field}
          </>
        ) : (
          <>
            {field}
            {row}
            {hand}
          </>
        )}
      </div>
    );
  };

  const canNext = legal.some((a) => a.type === 'NEXT_PHASE') && canControl(active);
  const over = g.gameOverReason !== null;
  const hint = pending
    ? null
    : attacker
      ? '攻撃先を選んでください（タップ状態のクリーチャー、またはシールド）。もう一度クリックで取り消し'
      : cpuThinking
        ? 'CPU 思考中…'
        : g.pending
          ? '相手が選択中…'
          : mode === 'online' && active !== me
            ? '相手のターンです'
            : myTurnControl
            ? g.phase === 'charge' && !g.players[active].chargedThisTurn
              ? '手札を1枚マナゾーンへドラッグしてチャージできます'
              : g.phase === 'attack'
                ? '光っているクリーチャーを相手のクリーチャー・シールドへドラッグして攻撃'
                : '光っているカードをバトルゾーンへドラッグして使えます'
            : '';

  return (
    <div className={'battle-screen' + (drag ? ' is-dragging' : '')} onContextMenu={(e) => e.preventDefault()}>
      <div className="board">
        {side(opp)}
        <div className="center-bar">
          <div className="turn-badge">
            <small>TURN</small>
            {g.turn}
          </div>
          <div className="phase-track">
            {g.config.phaseOrder.map((ph) => (
              <span key={ph} className={'phase' + (g.phase === ph ? ' on' : '') + (g.config.phaseOrder.indexOf(ph) < g.config.phaseOrder.indexOf(g.phase) ? ' done' : '')}>{PHASE_LABEL[ph]}</span>
            ))}
          </div>
          <div className="center-hint">{hint}</div>
          <button className="ghost-btn" disabled={!canNext} onClick={() => act({ type: 'NEXT_PHASE', player: active })} data-testid="next-phase">次へ ›</button>
          <button className="end-turn-btn" disabled={!canNext} onClick={() => { setAttacker(null); act({ type: 'END_TURN', player: active }); }} data-testid="end-turn">ターン終了</button>
        </div>
        {side(me)}
      </div>

      <aside className="side-panel">
        <HoverPreview g={g} canControl={canControl} />
        <ol className="log" ref={logRef} data-testid="log">
          {g.log.map((l, i) =>
            l.text.startsWith('──') ? (
              <li key={i} className="log-turn">{l.text.replace(/─/g, '').trim()}</li>
            ) : (
              <li key={i} className={(l.manual ? 'manual ' : '') + (l.player === 1 ? 'p1' : l.player === 0 ? 'p0' : 'sys')}>{l.text}</li>
            ),
          )}
        </ol>
        <div className="panel-tools">
          <button onClick={() => act({ type: 'MANUAL_DRAW', player: canControl(active) ? active : me, target: canControl(active) ? active : me })} title="手動でカードを1枚引く">ドロー</button>
          <button onClick={() => act({ type: 'MANUAL_SHUFFLE', player: me, target: me })} title="自分の山札をシャッフル">シャッフル</button>
          <button
            onClick={() => {
              const t = prompt('ログにメモを残す');
              if (t) act({ type: 'MANUAL_LOG', player: me, text: `［メモ］${t}` });
            }}
          >
            メモ
          </button>
          {mode !== 'online' && <button onClick={() => void saveGame().then(() => setToast('保存しました'))}>中断保存</button>}
          <button className="danger" onClick={() => confirm('投了しますか？') && act({ type: 'CONCEDE', player: mode === 'solo' ? active : me })}>投了</button>
          <button onClick={() => confirm(mode === 'online' ? '対戦を終了してホームに戻りますか？（相手との接続も切れます）' : 'ホームに戻りますか？（保存していない進行は失われます）') && quit()}>ホーム</button>
        </div>
        <p className="muted tiny-help">ドラッグ：チャージ・召喚・攻撃・移動　右クリック：カードの詳細と手動操作　クリック：判断の選択</p>
      </aside>
      <ActionFx g={g} me={me} solo={mode === 'solo'} />
      {pending && (
        <DecisionPanel
          g={g}
          selection={selection}
          setSelection={setSelection}
          act={act}
          renderCard={renderCard}
          canControl={canControl}
          openZone={(player, zone) => setZoneView({ player, zone })}
        />
      )}
      {banner && (
        <div className={'turn-banner' + (mode !== 'solo' && g.activePlayer !== me ? ' enemy' : '')} key={banner.key}>
          <div className="turn-banner-frame">
            <small>TURN {g.turn}</small>
            <span>{banner.text}</span>
          </div>
        </div>
      )}
      {mode === 'online' && (net.status === 'disconnected' || net.status === 'connecting') && (
        <div className="net-banner" data-testid="net-banner">
          <span>{net.status === 'connecting' ? '再接続しています…' : net.message}</span>
          {net.role === 'guest' && net.status === 'disconnected' && <button onClick={() => void net.reconnect()}>再接続</button>}
        </div>
      )}

      {drag &&<DragLayer g={g} drag={drag} result={drag.over ? dropResultOf(drag.over) : null} attackMode={g.cards[drag.iid]?.zone === 'battle' && attackTargetsOf(drag.iid).length > 0} />}
      {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
      {zoneView && (
        <ZoneViewer
          g={g}
          {...zoneView}
          onClose={() => setZoneView(null)}
          renderCard={renderCard}
          canControl={canControl}
          act={act}
        />
      )}
      {/* 右クリックの詳細は、山札・墓地・超次元ゾーンの一覧から開くこともあるので、一覧より手前に出す */}
      {inspect && g.cards[inspect] && (
        <Inspector
          g={g}
          iid={inspect}
          onClose={() => setInspect(null)}
          act={(a) => { setInspect(null); return act(a); }}
          play={(iid) => { setInspect(null); play(iid); }}
          canControl={canControl}
        />
      )}
      {evolve && (
        <Modal onClose={() => setEvolve(null)}>
          <h3>{evolve.neo ? 'NEO進化：重ねるクリーチャーを選んでください' : '進化元を選んでください'}</h3>
          <div className="zone-cards wrap">
            {evolve.bases.map((b) => (
              <CardView key={b} card={def(b)} size="sm" onClick={() => { act({ type: 'PLAY_CARD', player: g.cards[evolve.iid].owner, iid: evolve.iid, evolveOn: b, ...(evolve.sacrifice?.length ? { sacrifice: evolve.sacrifice } : {}) }); setEvolve(null); }} />
            ))}
          </div>
          {evolve.neo && (
            <button onClick={() => { act({ type: 'PLAY_CARD', player: g.cards[evolve.iid].owner, iid: evolve.iid, ...(evolve.sacrifice?.length ? { sacrifice: evolve.sacrifice } : {}) }); setEvolve(null); }}>
              進化せずに召喚する
            </button>
          )}
        </Modal>
      )}
      {sasa && g.cards[sasa.iid]?.zone === 'hand' && (() => {
        const owner = g.cards[sasa.iid].owner;
        const cost = effectiveCost(g, registry, owner, sasa.iid, 'main', sasa.chosen);
        const payable = choosePayment(g, registry, owner, sasa.iid, undefined, 'main', sasa.chosen) !== null;
        const toggle = (b: string) => setSasa({ ...sasa, chosen: sasa.chosen.includes(b) ? sasa.chosen.filter((x) => x !== b) : [...sasa.chosen, b] });
        return (
          <Modal onClose={() => setSasa(null)}>
            <h3>ササゲール：{def(sasa.iid).name} を召喚する時に破壊するクリーチャー</h3>
            <p className="muted small">選んだクリーチャーのササゲールの数だけコストが少なくなります（0以下にはなりません）。選ばずに召喚することもできます。</p>
            <div className="zone-cards wrap">
              {sasa.cands.map((b) => (
                <div key={b} className={'sasa-pick' + (sasa.chosen.includes(b) ? ' on' : '')}>
                  <CardView card={def(b)} size="sm" onClick={() => toggle(b)} />
                  <span>ササゲール{keywordsOf(b).sasageru}</span>
                </div>
              ))}
            </div>
            <button className="primary" disabled={!payable} onClick={() => { const chosen = sasa.chosen; setSasa(null); play(sasa.iid, chosen); }} data-testid="sasageru-play">
              {sasa.chosen.length ? `${sasa.chosen.length}体を破壊して召喚（コスト${cost}）` : `ササゲールを使わずに召喚（コスト${cost}）`}{payable ? '' : '：マナが足りません'}
            </button>
          </Modal>
        );
      })()}
      {toast && <div className="toast">{toast}</div>}
      {over && (
        <div className="modal-backdrop">
          <div className={'modal result' + (mode !== 'solo' && g.winner !== null ? (g.winner === me ? ' win' : ' lose') : ' win')} data-testid="result">
            <div className="result-kicker">{mode !== 'solo' && g.winner !== null ? (g.winner === me ? 'VICTORY' : 'DEFEAT') : 'GAME SET'}</div>
            <h2>{g.winner === null ? '引き分け' : mode !== 'solo' ? (g.winner === me ? '勝利！' : '敗北…') : `${g.players[g.winner].name} の勝利`}</h2>
            <p>{g.gameOverReason}（{g.turn}ターン）</p>
            <div className="row center">
              {mode === 'online' ? (
                <button className="primary" disabled={net.status !== 'playing'} onClick={rematch} data-testid="rematch">
                  {seat === 0 ? 'もう一度' : '再戦を申し込む'}
                </button>
              ) : (
              <button
                className="primary"
                onClick={() => {
                  const ds = deckNames.map((n) => decks.find((d) => d.name === n));
                  if (ds[0] && ds[1]) start({ mode, decks: [ds[0], ds[1]], difficulty: useBattle.getState().difficulty });
                }}
              >
                もう一度
              </button>
              )}
              <button onClick={quit}>ホームへ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 右クリックで開くカードの詳細。ルール上の操作と手動操作のボタンもここにまとめる */
function Inspector({ g, iid, onClose, act, play, canControl }: {
  g: GameState;
  iid: string;
  onClose: () => void;
  act: (a: Action) => boolean;
  play: (iid: string) => void;
  canControl: (p: PlayerId) => boolean;
}) {
  const registry = useApp((s) => s.registry);
  const inst = g.cards[iid];
  const owner = inst.owner;
  const controllable = canControl(owner) || canControl(other(owner));
  const actor: PlayerId = canControl(owner) ? owner : canControl(other(owner)) ? other(owner) : 0;
  const d = cardDef(g, registry, iid);
  const hidden = (inst.zone === 'shield' && !inst.faceUp) || (inst.zone === 'hand' && !canControl(owner)) || inst.zone === 'deck';
  type Item = { label: string; run: () => void; disabled?: boolean; primary?: boolean };
  const rule: Item[] = [];
  const manual: Item[] = [];
  if (inst.zone === 'hand' && canControl(owner)) {
    const chargeOk = g.activePlayer === owner && g.phase === 'charge' && !g.players[owner].chargedThisTurn && isIdle(g);
    rule.push({ label: d.type === 'spell' ? '唱える' : d.type === 'field' ? 'バトルゾーンに出す' : '召喚する', run: () => play(iid), disabled: !canPlay(g, registry, owner, iid), primary: true });
    if (d.twin) {
      rule.push({ label: `「${d.twin.name}」を唱える`, run: () => act({ type: 'PLAY_CARD', player: owner, iid, side: 'twin' }), disabled: !canPlay(g, registry, owner, iid, 'twin') });
    }
    rule.push({ label: 'マナチャージ', run: () => act({ type: 'CHARGE_MANA', player: owner, iid }), disabled: !chargeOk });
  }
  // 墓地・マナゾーンから召喚できるクリーチャー（「このクリーチャーを自分の墓地から召喚してもよい」）
  if (inst.zone !== 'hand' && d.summonFrom && (d.summonFrom.zones as string[]).includes(inst.zone) && canControl(owner)) {
    rule.push({ label: `${inst.zone === 'graveyard' ? '墓地' : 'マナゾーン'}から召喚する`, run: () => play(iid), disabled: !canPlay(g, registry, owner, iid), primary: true });
  }
  if (inst.zone === 'battle' && d.hyper && !inst.hyper) {
    rule.push({ label: 'ハイパー化する', run: () => act({ type: 'HYPERIZE', player: owner, iid }), disabled: !canControl(owner) || !hyperizeCandidates(g, registry, owner, iid) });
  }
  if (controllable) {
    manual.push({ label: inst.tapped ? 'アンタップ' : 'タップ', run: () => act({ type: 'MANUAL_TAP', player: actor, iid, tapped: !inst.tapped }) });
    if (inst.zone === 'battle') {
      manual.push({ label: 'パワー +1000', run: () => act({ type: 'MANUAL_POWER', player: actor, iid, amount: 1000 }) });
      manual.push({ label: 'パワー −1000', run: () => act({ type: 'MANUAL_POWER', player: actor, iid, amount: -1000 }) });
    }
    for (const z of MOVE_TARGETS) {
      if (z === inst.zone) continue;
      manual.push({ label: `${ZONE_LABEL[z]}へ${z === 'deck' ? '（上）' : ''}`, run: () => act({ type: 'MANUAL_MOVE', player: actor, iid, to: z }) });
    }
    manual.push({ label: '山札の下へ', run: () => act({ type: 'MANUAL_MOVE', player: actor, iid, to: 'deck', toTop: false }) });
  }
  const where = `${g.players[owner].name} の${ZONE_LABEL[inst.zone]}`;
  const stateLine = [
    inst.zone === 'battle' && !isIgnored(g, registry, iid) ? `現在のパワー ${power(g, registry, iid)}` : null,
    inst.tapped ? 'タップ中' : null,
    inst.under.length ? `進化元 ${inst.under.length}枚` : null,
    inst.seals?.length ? `封印 ${inst.seals.length}枚` : null,
  ].filter(Boolean).join('・');
  const buttons = (
    <div className="inspect-ops" data-testid="inspector">
      <div className="inspect-where">{where}{stateLine && <span>　{stateLine}</span>}</div>
      {rule.length > 0 && (
        <div className="inspect-group">
          <h4>操作</h4>
          <div className="inspect-buttons">
            {rule.map((it) => <button key={it.label} className={it.primary ? 'primary' : ''} disabled={it.disabled} onClick={it.run}>{it.label}</button>)}
          </div>
        </div>
      )}
      {manual.length > 0 && (
        <div className="inspect-group">
          <h4>手動操作</h4>
          <div className="inspect-buttons manual">
            {manual.map((it) => <button key={it.label} disabled={it.disabled} onClick={it.run}>{it.label}</button>)}
          </div>
        </div>
      )}
    </div>
  );
  if (hidden) {
    return (
      <Modal onClose={onClose}>
        <div className="detail">
          <CardView faceDown size="lg" />
          <div className="detail-info">
            <h2>{inst.zone === 'shield' ? 'シールド' : '非公開のカード'}</h2>
            {buttons}
          </div>
        </div>
      </Modal>
    );
  }
  return <CardDetail card={d} onClose={onClose} actions={buttons} />;
}

/** ドラッグ中に指についてくるカード・攻撃の矢印・何が起きるかのラベル */
/** 右のプレビュー：カーソルを合わせたカードを大きく見せる（ホバーで盤面全体を描き直さないよう、ここだけがホバーを読む） */
function HoverPreview({ g, canControl }: { g: GameState; canControl: (p: PlayerId) => boolean }) {
  const registry = useApp((s) => s.registry);
  const hover = useHoverCard((s) => s.iid);
  const inst = hover ? g.cards[hover] : undefined;
  // 隠れたカード（相手の手札・裏向きのシールド・山札）は見せない
  const visible = !!inst && !(inst.zone === 'shield' && !inst.faceUp) && !(inst.zone === 'hand' && !canControl(inst.owner)) && inst.zone !== 'deck';
  if (!visible) {
    return (
      <div className="preview" data-testid="preview">
        <p className="muted small preview-empty">カードにカーソルを合わせると拡大表示します</p>
      </div>
    );
  }
  const d = cardDef(g, registry, hover!);
  const p = inst!.zone === 'battle' && !isIgnored(g, registry, hover!) ? power(g, registry, hover!) : undefined;
  return (
    <div className="preview" data-testid="preview">
      <CardView card={d} size="md" power={p} />
      <div className="preview-info">
        <div className="preview-head">
          <div className="preview-name">{d.name}</div>
          <div className="muted small">
            {d.typeLabel ?? CARD_TYPE_LABEL[d.type]}・コスト{d.cost}
            {p !== undefined && `・パワー${p}`}
          </div>
        </div>
        <div className="preview-text">{d.text}</div>
      </div>
    </div>
  );
}

function DragLayer({ g, drag, result, attackMode }: { g: GameState; drag: DragState; result: DropResult | null; attackMode: boolean }) {
  const registry = useApp((s) => s.registry);
  const { x, y, tilt } = useDragPos();
  const inst = g.cards[drag.iid];
  if (!inst) return null;
  const d = cardDef(g, registry, drag.iid);
  const tone = result?.tone ?? 'none';
  return (
    <div className={'drag-layer tone-' + tone}>
      {attackMode && (() => {
        // 始点から指先へ、少し持ち上げたベジェ曲線の矢印
        const mx = (drag.ox + x) / 2;
        const my = (drag.oy + y) / 2 - Math.min(160, Math.hypot(x - drag.ox, y - drag.oy) * 0.35);
        const d = `M ${drag.ox} ${drag.oy} Q ${mx} ${my} ${x} ${y}`;
        return (
          <svg className="attack-arrow" width="100%" height="100%">
            <defs>
              <marker id="arrow-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" />
              </marker>
            </defs>
            <path className="arrow-glow" d={d} />
            <path className="arrow-line" d={d} markerEnd="url(#arrow-head)" />
            <circle className="arrow-origin" cx={drag.ox} cy={drag.oy} r="7" />
          </svg>
        );
      })()}
      {!attackMode && (
        <div className="drag-ghost" style={{ left: x, top: y, transform: `translate(-50%, -60%) rotate(${tilt}deg)` }}>
          <CardView card={d} size="hd" faceDown={inst.zone === 'shield' && !inst.faceUp} />
        </div>
      )}
      <div className="drag-chip" style={{ left: x, top: y }}>
        {result ? result.label : attackMode ? '攻撃先へドラッグ' : '置き場所へドラッグ'}
      </div>
    </div>
  );
}

/**
 * 判断パネル：プレイヤーの判断が必要な場面（はい／いいえ・モード選択・カードの選択・ブロック・自動処理できない能力）を
 * 盤面の上の専用パネルでまとめて扱う。発生源のカードと能力の文を一緒に見せる。
 */
function DecisionPanel({ g, selection, setSelection, act, renderCard, canControl, openZone }: {
  g: GameState;
  selection: string[];
  setSelection: (s: string[]) => void;
  act: (a: Action) => boolean;
  renderCard: (iid: string, size: CardSize, opts?: { hidden?: boolean }) => ReactElement;
  canControl: (p: PlayerId) => boolean;
  openZone: (player: PlayerId, zone: ZoneName) => void;
}) {
  const registry = useApp((s) => s.registry);
  const [collapsed, setCollapsed] = useState(false);
  const p = g.pending!;
  const who = g.players[p.player].name;
  const sourceId = p.kind === 'block' ? p.attacker : p.source;
  const source = sourceId && g.cards[sourceId] ? cardDef(g, registry, sourceId) : undefined;
  // 発生源が相手の伏せたシールドなどなら見せない
  const sourceHidden = !!sourceId && ((g.cards[sourceId].zone === 'shield' && !g.cards[sourceId].faceUp) || (g.cards[sourceId].zone === 'hand' && !canControl(g.cards[sourceId].owner)));
  const respond = (r: { accept?: boolean; selected?: string[] }) => act({ type: 'RESPOND', player: p.player, ...r });

  const title =
    p.kind === 'manualStep' ? '手動で処理する能力' : p.kind === 'block' ? 'ブロックの判断' : p.kind === 'selectCards' ? 'カードを選ぶ' : p.kind === 'chooseMode' ? '選択' : '確認';

  let body: ReactElement;
  if (p.kind === 'confirm') {
    body = (
      <>
        <p className="decision-prompt">{p.prompt}</p>
        <div className="row">
          <button className="primary" onClick={() => respond({ accept: true })} data-testid="pending-yes">はい</button>
          <button onClick={() => respond({ accept: false })} data-testid="pending-no">いいえ</button>
        </div>
      </>
    );
  } else if (p.kind === 'block') {
    body = (
      <>
        <p className="decision-prompt">
          {cardDef(g, registry, p.attacker).name}（パワー{power(g, registry, p.attacker)}）が攻撃しています。ブロックするクリーチャーを選んでください。
        </p>
        <div className="zone-cards wrap decision-cards">{p.blockers.map((b) => renderCard(b, 'sm'))}</div>
        <button onClick={() => respond({ selected: [] })} data-testid="no-block">ブロックしない</button>
      </>
    );
  } else if (p.kind === 'chooseMode') {
    body = (
      <>
        <p className="decision-prompt">{p.prompt}</p>
        <div className="col-buttons">
          {p.options.map((o, i) => (
            <button key={i} className={i === 0 ? 'primary' : ''} onClick={() => respond({ selected: [String(i)] })} data-testid={`mode-${i}`}>
              {o}
            </button>
          ))}
        </div>
      </>
    );
  } else if (p.kind === 'manualStep') {
    const me = p.player;
    body = (
      <>
        <p className="decision-prompt">{p.prompt}</p>
        <blockquote className="decision-text">{p.text}</blockquote>
        <p className="muted small">
          この能力は自動で処理できません。下の道具や、盤面のカードの右クリック（手動移動・タップ・パワー修正）で処理し、終わったら「処理完了」を押してください。
        </p>
        <div className="decision-tools">
          <button onClick={() => act({ type: 'MANUAL_DRAW', player: me, target: me })}>1枚引く</button>
          <button onClick={() => act({ type: 'MANUAL_SHUFFLE', player: me, target: me })}>山札をシャッフル</button>
          <button onClick={() => openZone(me, 'deck')}>山札を見る</button>
          <button onClick={() => openZone(me, 'graveyard')}>墓地を見る</button>
          <button onClick={() => openZone(me, 'mana')}>マナを見る</button>
          <button onClick={() => openZone(other(me), 'graveyard')}>相手の墓地</button>
        </div>
        <div className="row">
          <button className="primary" onClick={() => respond({ accept: true })} data-testid="manual-done">処理完了</button>
        </div>
      </>
    );
  } else {
    // 山札・相手に選ばせる自分のカードの中身は、選ぶ本人（効果で見ている人）に見せる
    const hidden = (iid: string) => {
      const c = g.cards[iid];
      if (c.zone === 'deck') return !canControl(p.player);
      return (c.zone === 'shield' && !c.faceUp) || (c.zone === 'hand' && !canControl(c.owner));
    };
    body = (
      <>
        <p className="decision-prompt">{p.prompt}</p>
        <p className="muted small">
          {selection.length} / {p.max}枚選択中{p.min < p.max ? `（${p.min}枚以上）` : ''}。下の一覧か盤面のカードをクリックしてください。
        </p>
        <div className="zone-cards wrap decision-cards">{p.candidates.map((c) => renderCard(c, 'sm', { hidden: hidden(c) }))}</div>
        <div className="row">
          <button className="primary" disabled={selection.length < p.min || selection.length > p.max} onClick={() => respond({ selected: selection })} data-testid="pending-ok">
            決定
          </button>
          <button onClick={() => setSelection([])}>選び直す</button>
          {p.min === 0 && selection.length === 0 && <span className="muted small">選ばずに決定もできます</span>}
        </div>
      </>
    );
  }

  return (
    <div className={'decision-panel' + (collapsed ? ' collapsed' : '') + (p.kind === 'manualStep' ? ' manual' : '')} data-testid="pending" onClick={(e) => e.stopPropagation()}>
      <div className="decision-head">
        <span className="decision-badge">{title}</span>
        <span className="decision-who">{who} の判断</span>
        <button className="ghost-btn" onClick={() => setCollapsed(!collapsed)} title="盤面を見るために小さくする">
          {collapsed ? '開く' : '小さくする'}
        </button>
      </div>
      {!collapsed && (
        <div className="decision-main">
          {source && !sourceHidden && (
            <div className="decision-source">
              <CardView card={source} size="sm" />
              <div className="decision-source-name">{source.name}</div>
              <div className="decision-source-text">{source.text}</div>
            </div>
          )}
          <div className="decision-body">{body}</div>
        </div>
      )}
    </div>
  );
}

function ZoneViewer({ g, player, zone, onClose, renderCard, canControl, act }: {
  g: GameState;
  player: PlayerId;
  zone: ZoneName;
  onClose: () => void;
  renderCard: (iid: string, size: CardSize, opts?: { hidden?: boolean }) => ReactElement;
  canControl: (p: PlayerId) => boolean;
  act: (a: Action) => boolean;
}) {
  const [reveal, setReveal] = useState(false);
  const list = g.players[player].zones[zone];
  const hidden = zone === 'deck' && !reveal;
  return (
    <Modal onClose={onClose} wide>
      <h3>
        {g.players[player].name} の{ZONE_LABEL[zone]}（{list.length}枚）
      </h3>
      {zone === 'deck' && canControl(player) && !reveal && (
        <button
          onClick={() => {
            setReveal(true);
            act({ type: 'MANUAL_LOG', player, text: `［手動］${g.players[player].name} が山札を確認` });
          }}
        >
          山札の中身を見る（手動処理・ログに残ります）
        </button>
      )}
      {!hidden && <p className="muted small">右クリックで手動移動できます。{zone === 'deck' ? '右端が山札の上です。' : ''}</p>}
      <div className="zone-cards wrap">{hidden ? <p className="muted">非公開</p> : list.map((iid) => renderCard(iid, 'sm'))}</div>
    </Modal>
  );
}
