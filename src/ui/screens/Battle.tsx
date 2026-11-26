import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type ReactElement } from 'react';
import { CARD_TYPE_LABEL, CIV_LABEL, CIVILIZATIONS, manaCivilizations, ZONE_LABEL, type CardDefinition, type ZoneName } from '../../core/cards/types';
import { getLegalActions } from '../../core/engine/legal';
import { attackTargets, canAttackWith, canPlay, effectiveCost, evolutionBases, isIdle, power, untappedManaCount } from '../../core/engine/queries';
import { other, PHASE_LABEL, type Action, type GameState, type PlayerId } from '../../core/engine/types';
import { useApp } from '../../store/appStore';
import { isCpuTurnPlayer, useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { CardDetail, Modal } from '../components/CardDetail';
import { CardView, CIV_COLOR, type CardSize } from '../components/CardView';

const CIV_ORDER = CIVILIZATIONS;

interface Menu {
  iid: string;
  x: number;
  y: number;
  manual: boolean;
}

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
  const [menu, setMenu] = useState<Menu | null>(null);
  const [detail, setDetail] = useState<CardDefinition | null>(null);
  const [zoneView, setZoneView] = useState<{ player: PlayerId; zone: ZoneName } | null>(null);
  const [evolve, setEvolve] = useState<{ iid: string; bases: string[] } | null>(null);
  const [toast, setToast] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; key: number } | null>(null);
  const [flash, setFlash] = useState<PlayerId | null>(null);
  const logRef = useRef<HTMLOListElement>(null);

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
  // 隠れたカードやゾーン移動したカードのプレビューは消す
  useEffect(() => {
    if (hover && game && !game.cards[hover]) setHover(null);
  }, [game, hover]);
  useEffect(() => {
    if (!error) return;
    setToast(error);
    const t = setTimeout(() => {
      setToast('');
      clearError();
    }, 2500);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const legal = useMemo(() => (game ? getLegalActions(game, registry, game.activePlayer) : []), [game, registry]);
  if (!game) return null;

  const g: GameState = game;
  const canControl = (p: PlayerId) => mode === 'solo' || p === me;
  const cpuThinking = isCpuTurnPlayer(g, mode) !== null;
  const pending = g.pending && canControl(g.pending.player) ? g.pending : null;
  const act = (a: Action) => {
    setMenu(null);
    return dispatch(a);
  };
  const def = (iid: string) => registry[g.cards[iid].cardId];
  const active = g.activePlayer;
  const myTurnControl = canControl(active) && isIdle(g);

  const attackTargetsOf = (iid: string) => attackTargets(g, registry, g.cards[iid].owner, iid);
  const isAttackTarget = (iid: string) => !!attacker && attackTargetsOf(attacker).some((t) => t.kind === 'creature' && t.iid === iid);
  const canAttackPlayer = !!attacker && attackTargetsOf(attacker).some((t) => t.kind === 'player');

  function play(iid: string) {
    const owner = g.cards[iid].owner;
    const d = def(iid);
    if (d.type === 'evolution') {
      const bases = evolutionBases(g, registry, owner, iid);
      if (bases.length > 1) return setEvolve({ iid, bases });
    }
    act({ type: 'PLAY_CARD', player: owner, iid });
  }

  function onCardClick(iid: string, e: MouseEvent) {
    e.stopPropagation();
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
    if (inst.zone === 'hand' && canControl(inst.owner)) {
      setMenu({ iid, x: e.clientX, y: e.clientY, manual: false });
      return;
    }
    if (inst.zone === 'shield' || (inst.zone === 'hand' && !canControl(inst.owner))) return;
    setDetail(def(iid));
  }

  function onContext(iid: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ iid, x: e.clientX, y: e.clientY, manual: true });
  }

  function attackPlayer() {
    if (!attacker || !canAttackPlayer) return;
    act({ type: 'ATTACK', player: g.cards[attacker].owner, attacker, target: { kind: 'player' } });
    setAttacker(null);
  }

  // ─── ドラッグ＆ドロップ ───
  const onDragStart = (iid: string) => (e: DragEvent) => e.dataTransfer.setData('text/iid', iid);
  const onDrop = (p: PlayerId, zone: ZoneName) => (e: DragEvent) => {
    e.preventDefault();
    const iid = e.dataTransfer.getData('text/iid');
    const inst = g.cards[iid];
    if (!inst || inst.owner !== p) return;
    if (inst.zone === 'hand' && zone === 'mana' && g.phase === 'charge' && !g.players[p].chargedThisTurn && g.activePlayer === p) {
      act({ type: 'CHARGE_MANA', player: p, iid });
    } else if (inst.zone === 'hand' && zone === 'battle' && g.activePlayer === p) {
      play(iid);
    } else if (inst.zone !== zone) {
      act({ type: 'MANUAL_MOVE', player: p, iid, to: zone });
    }
  };
  const dropProps = (p: PlayerId, zone: ZoneName) => (canControl(p) ? { onDragOver: (e: DragEvent) => e.preventDefault(), onDrop: onDrop(p, zone) } : {});

  // ─── ゾーン描画 ───
  const highlightOf = (iid: string): 'target' | 'attacker' | 'playable' | null => {
    if (pending?.kind === 'selectCards' && pending.candidates.includes(iid)) return 'target';
    if (pending?.kind === 'block' && pending.blockers.includes(iid)) return 'target';
    if (attacker === iid) return 'attacker';
    if (attacker && isAttackTarget(iid)) return 'target';
    const inst = g.cards[iid];
    if (myTurnControl && inst.owner === active) {
      if (inst.zone === 'hand' && (canPlay(g, registry, active, iid) || canPlay(g, registry, active, iid, 'twin'))) return 'playable';
      if (inst.zone === 'battle' && !attacker && canAttackWith(g, registry, active, iid)) return 'playable';
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
        power={inst.zone === 'battle' ? power(g, registry, iid) : undefined}
        cost={inst.zone === 'hand' ? effectiveCost(g, registry, inst.owner, iid) : undefined}
        selected={selection.includes(iid)}
        highlight={highlightOf(iid)}
        onClick={(e) => onCardClick(iid, e)}
        onContextMenu={(e) => onContext(iid, e)}
        onHover={opts.hidden ? undefined : (on) => setHover(on ? iid : null)}
        draggable={canControl(inst.owner)}
        onDragStart={onDragStart(iid)}
        badge={inst.under.length > 0 ? <span className="under-badge">進化 +{inst.under.length}</span> : undefined}
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

    const plate = (
      <div className={'plate' + (g.activePlayer === p ? ' active' : '') + (targetable ? ' targetable' : '')} onClick={() => targetable && attackPlayer()} data-testid={`plate-${p}`}>
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
      <div className="piles">
        <button className="pile deck-pile" onClick={() => setZoneView({ player: p, zone: 'deck' })} {...dropProps(p, 'deck')} data-testid={`pile-${p}-deck`} title="山札">
          <span className="pile-stack" />
          <span className="pile-count">{P.zones.deck.length}</span>
          <span className="pile-label">山札</span>
        </button>
        <button className="pile grave-pile" onClick={() => setZoneView({ player: p, zone: 'graveyard' })} {...dropProps(p, 'graveyard')} data-testid={`pile-${p}-graveyard`} title="墓地">
          {graveTop ? <span className="pile-top">{renderCard(graveTop, 'xs')}</span> : <span className="pile-stack empty" />}
          <span className="pile-count">{P.zones.graveyard.length}</span>
          <span className="pile-label">墓地</span>
        </button>
      </div>
    );
    const field = (
      <div className={'zone field' + (top ? ' opp' : ' mine')} {...dropProps(p, 'battle')} data-testid={`battle-${p}`}>
        <div className="field-cards">
          {P.zones.battle.map((iid) => renderCard(iid, 'fd'))}
          {P.zones.battle.length === 0 && <span className="zone-empty">バトルゾーン</span>}
        </div>
      </div>
    );
    const hand = (
      <div className={'zone hand' + (handHidden ? ' hidden-hand' : '') + (top ? ' opp' : '')} data-testid={`hand-${p}`}>
        <div className="hand-fan">{P.zones.hand.map((iid) => renderCard(iid, handHidden ? 'xs' : 'hd', { hidden: handHidden }))}</div>
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
  const hoverInst = hover ? g.cards[hover] : undefined;
  const hoverVisible = hoverInst && !(hoverInst.zone === 'shield' && !hoverInst.faceUp) && !(hoverInst.zone === 'hand' && !canControl(hoverInst.owner)) && hoverInst.zone !== 'deck';
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
              ? '手札を1枚マナに置けます（ドラッグ／クリック）'
              : g.phase === 'attack'
                ? '光っているクリーチャーで攻撃できます'
                : '光っているカードを使えます'
            : '';

  return (
    <div className="battle-screen" onClick={() => { setMenu(null); }}>
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
        <div className="preview" data-testid="preview">
          {hoverVisible ? (
            <>
              <CardView card={def(hover!)} size="md" power={hoverInst!.zone === 'battle' ? power(g, registry, hover!) : undefined} />
              <div className="preview-info">
                <div className="preview-name">{def(hover!).name}</div>
                <div className="muted small">
                  {def(hover!).typeLabel ?? CARD_TYPE_LABEL[def(hover!).type]}・コスト{def(hover!).cost}
                  {hoverInst!.zone === 'battle' && `・パワー${power(g, registry, hover!)}`}
                </div>
                <div className="preview-text">{def(hover!).text}</div>
              </div>
            </>
          ) : (
            <p className="muted small preview-empty">カードにカーソルを合わせると拡大表示します</p>
          )}
        </div>
        {pending && <PendingPanel g={g} selection={selection} setSelection={setSelection} act={act} renderCard={renderCard} canControl={canControl} />}
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
        <p className="muted tiny-help">クリック：選択・攻撃／手札はメニュー　右クリック：手動操作　手札はマナ・バトルゾーンへドラッグ可</p>
      </aside>
      {banner && <div className="turn-banner" key={banner.key}>{banner.text}</div>}
      {mode === 'online' && (net.status === 'disconnected' || net.status === 'connecting') && (
        <div className="net-banner" data-testid="net-banner">
          <span>{net.status === 'connecting' ? '再接続しています…' : net.message}</span>
          {net.role === 'guest' && net.status === 'disconnected' && <button onClick={() => void net.reconnect()}>再接続</button>}
        </div>
      )}

      {menu && (
        <div className="ctx-menu" style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - (menu.manual ? 380 : 140)) }} onClick={(e) => e.stopPropagation()}>
          <MenuItems
            g={g}
            iid={menu.iid}
            manual={menu.manual}
            act={act}
            play={(iid) => { setMenu(null); play(iid); }}
            showDetail={() => { setDetail(def(menu.iid)); setMenu(null); }}
            canControl={canControl}
          />
        </div>
      )}
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
      {evolve && (
        <Modal onClose={() => setEvolve(null)}>
          <h3>進化元を選んでください</h3>
          <div className="zone-cards wrap">
            {evolve.bases.map((b) => (
              <CardView key={b} card={def(b)} size="sm" onClick={() => { act({ type: 'PLAY_CARD', player: g.cards[evolve.iid].owner, iid: evolve.iid, evolveOn: b }); setEvolve(null); }} />
            ))}
          </div>
        </Modal>
      )}
      {toast && <div className="toast">{toast}</div>}
      {over && (
        <div className="modal-backdrop">
          <div className="modal result" data-testid="result">
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

function MenuItems({ g, iid, manual, act, play, showDetail, canControl }: {
  g: GameState;
  iid: string;
  manual: boolean;
  act: (a: Action) => boolean;
  play: (iid: string) => void;
  showDetail: () => void;
  canControl: (p: PlayerId) => boolean;
}) {
  const registry = useApp((s) => s.registry);
  const inst = g.cards[iid];
  const owner = inst.owner;
  const actor: PlayerId = canControl(owner) ? owner : canControl(other(owner)) ? other(owner) : 0;
  const d = registry[inst.cardId];
  const items: { label: string; run: () => void; disabled?: boolean }[] = [];
  if (!manual && inst.zone === 'hand') {
    const chargeOk = g.activePlayer === owner && g.phase === 'charge' && !g.players[owner].chargedThisTurn && isIdle(g);
    items.push({ label: d.type === 'spell' ? '唱える' : '召喚する', run: () => play(iid), disabled: !canPlay(g, registry, owner, iid) });
    if (d.twin) {
      items.push({ label: `呪文側「${d.twin.name}」を唱える`, run: () => act({ type: 'PLAY_CARD', player: owner, iid, side: 'twin' }), disabled: !canPlay(g, registry, owner, iid, 'twin') });
    }
    items.push({ label: 'マナチャージ', run: () => act({ type: 'CHARGE_MANA', player: owner, iid }), disabled: !chargeOk });
  }
  items.push({ label: '詳細を見る', run: showDetail });
  if (manual || inst.zone !== 'hand') {
    items.push({ label: inst.tapped ? 'アンタップ（手動）' : 'タップ（手動）', run: () => act({ type: 'MANUAL_TAP', player: actor, iid, tapped: !inst.tapped }) });
    if (inst.zone === 'battle') {
      items.push({ label: 'パワー +1000（手動）', run: () => act({ type: 'MANUAL_POWER', player: actor, iid, amount: 1000 }) });
      items.push({ label: 'パワー −1000（手動）', run: () => act({ type: 'MANUAL_POWER', player: actor, iid, amount: -1000 }) });
    }
    for (const z of MOVE_TARGETS) {
      if (z === inst.zone) continue;
      items.push({ label: `${ZONE_LABEL[z]}へ移動${z === 'deck' ? '（上）' : ''}（手動）`, run: () => act({ type: 'MANUAL_MOVE', player: actor, iid, to: z }) });
    }
    items.push({ label: '山札の下へ移動（手動）', run: () => act({ type: 'MANUAL_MOVE', player: actor, iid, to: 'deck', toTop: false }) });
  }
  return (
    <>
      <div className="ctx-title">{inst.zone === 'shield' && !inst.faceUp && !canControl(owner) ? 'シールド' : d.name}</div>
      {items.map((it) => (
        <button key={it.label} disabled={it.disabled} onClick={it.run}>{it.label}</button>
      ))}
    </>
  );
}

function PendingPanel({ g, selection, setSelection, act, renderCard, canControl }: {
  g: GameState;
  selection: string[];
  setSelection: (s: string[]) => void;
  act: (a: Action) => boolean;
  renderCard: (iid: string, size: CardSize, opts?: { hidden?: boolean }) => ReactElement;
  canControl: (p: PlayerId) => boolean;
}) {
  const registry = useApp((s) => s.registry);
  const p = g.pending!;
  if (p.kind === 'confirm') {
    return (
      <div className="pending-box" data-testid="pending">
        <p>{p.prompt}</p>
        {p.source && renderCard(p.source, 'sm')}
        <div className="row">
          <button className="primary" onClick={() => act({ type: 'RESPOND', player: p.player, accept: true })} data-testid="pending-yes">はい</button>
          <button onClick={() => act({ type: 'RESPOND', player: p.player, accept: false })} data-testid="pending-no">いいえ</button>
        </div>
      </div>
    );
  }
  if (p.kind === 'block') {
    return (
      <div className="pending-box" data-testid="pending">
        <p>
          {registry[g.cards[p.attacker].cardId].name}（パワー{power(g, registry, p.attacker)}）が攻撃しています。ブロックしますか？
        </p>
        <div className="zone-cards wrap">{p.blockers.map((b) => renderCard(b, 'sm'))}</div>
        <button onClick={() => act({ type: 'RESPOND', player: p.player, selected: [] })} data-testid="no-block">ブロックしない</button>
      </div>
    );
  }
  if (p.kind === 'chooseMode') {
    return (
      <div className="pending-box" data-testid="pending">
        <p>{p.prompt}</p>
        {p.source && renderCard(p.source, 'sm')}
        <div className="col-buttons">
          {p.options.map((o, i) => (
            <button key={i} className={i === 0 ? 'primary' : ''} onClick={() => act({ type: 'RESPOND', player: p.player, selected: [String(i)] })} data-testid={`mode-${i}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  // 山札の中身は選ぶ本人（効果で見ている人）には見せる
  const hidden = (iid: string) => {
    const c = g.cards[iid];
    return (c.zone === 'shield' && !c.faceUp) || (c.zone === 'hand' && !canControl(c.owner)) || (c.zone === 'deck' && !canControl(p.player));
  };
  return (
    <div className="pending-box" data-testid="pending">
      <p>{p.prompt}</p>
      <p className="muted small">{selection.length} / {p.max}枚選択中（盤面か下の一覧をクリック）</p>
      <div className="zone-cards wrap">{p.candidates.map((c) => renderCard(c, 'xs', { hidden: hidden(c) }))}</div>
      <div className="row">
        <button className="primary" disabled={selection.length < p.min || selection.length > p.max} onClick={() => act({ type: 'RESPOND', player: p.player, selected: selection })} data-testid="pending-ok">決定</button>
        <button onClick={() => setSelection([])}>選び直す</button>
      </div>
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
