import { useState } from 'react';
import { DIFFICULTY_LABEL, type Difficulty } from '../../core/ai/cpu';
import { isDeckLegal } from '../../core/deck/rules';
import type { PlayerId } from '../../core/engine/types';
import { useApp } from '../../store/appStore';
import { useBattle, type BattleMode } from '../../store/battleStore';
import { DeckPicker } from '../components/DeckPicker';
import { Header } from './Menus';

const MODES: { mode: BattleMode | 'online'; icon: string; label: string; desc: string; testId: string }[] = [
  { mode: 'cpu', icon: '⚔', label: 'CPU対戦', desc: 'コンピューターと対戦', testId: 'mode-cpu' },
  { mode: 'solo', icon: '⟲', label: '1人回し', desc: '両方のプレイヤーを操作', testId: 'mode-solo' },
  { mode: 'online', icon: '⇄', label: 'オンライン', desc: '部屋コードで友達と', testId: 'mode-online' },
];

/** 対戦開始：設定（左）｜自分のデッキ｜VS｜相手のデッキ */
export function BattleSetupScreen() {
  const { decks, registry, settings, touchRecent, go } = useApp();
  const start = useBattle((s) => s.start);
  const [mode, setMode] = useState<BattleMode>('cpu');
  const [mine, setMine] = useState(decks[0]?.id ?? '');
  const [theirs, setTheirs] = useState(decks[1]?.id ?? decks[0]?.id ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [first, setFirst] = useState<'random' | '0' | '1'>('random');
  const d0 = decks.find((d) => d.id === mine);
  const d1 = decks.find((d) => d.id === theirs);
  const legal = (id?: string) => {
    const d = decks.find((x) => x.id === id);
    return !!d && isDeckLegal(d, settings.format, registry);
  };
  const ok = d0 && d1 && legal(mine) && legal(theirs);
  const cpu = mode === 'cpu';

  return (
    <div className="screen fill">
      <Header title="対戦開始" sub={<span className="muted">デッキと対戦方法を選んでください</span>} />
      <div className="setup-body">
        <section className="panel setup-config">
          <div className="panel-title">対戦方法</div>
          <div className="mode-cards">
            {MODES.map((m) => (
              <button
                key={m.mode}
                className={'mode-card' + (m.mode === mode ? ' on' : '')}
                onClick={() => (m.mode === 'online' ? go('online') : setMode(m.mode))}
                data-testid={m.testId}
              >
                <span className="mode-card-icon" aria-hidden>{m.icon}</span>
                <b>{m.label}</b>
                <small>{m.desc}</small>
              </button>
            ))}
          </div>

          {cpu && (
            <>
              <div className="panel-title">CPU の強さ</div>
              <div className="segmented col">
                {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => {
                  const [name, desc] = DIFFICULTY_LABEL[d].split('：');
                  return (
                    <button key={d} className={d === difficulty ? 'on' : ''} onClick={() => setDifficulty(d)} data-testid={`difficulty-${d}`}>
                      <b>{name}</b>
                      <small>{desc}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="panel-title">先攻</div>
          <div className="segmented">
            {([['random', 'ランダム'], ['0', cpu ? 'あなた' : 'プレイヤー1'], ['1', cpu ? 'CPU' : 'プレイヤー2']] as const).map(([v, l]) => (
              <button key={v} className={first === v ? 'on' : ''} onClick={() => setFirst(v)}>{l}</button>
            ))}
          </div>

          <div className="setup-config-foot">
            {decks.length === 0 && <p className="muted small">デッキがありません。公式カード検索でカードを保存し、デッキ構築で40枚のデッキを作ってください。</p>}
            {decks.length > 0 && !ok && <p className="ng small">構築ルールを満たすデッキを選んでください（デッキ構築画面で確認できます）</p>}
            <button
              className="gold start-btn"
              disabled={!ok}
              data-testid="start-battle"
              onClick={() => {
                void touchRecent(d0!.id);
                start({ mode, decks: [d0!, d1!], difficulty, firstPlayer: first === 'random' ? undefined : (Number(first) as PlayerId) });
              }}
            >
              ⚔ 対戦開始
            </button>
          </div>
        </section>

        <DeckPicker label={cpu ? 'あなたのデッキ' : 'プレイヤー1のデッキ'} value={mine} onChange={setMine} testId="deck-0" />
        <div className="vs-mark" aria-hidden>VS</div>
        <DeckPicker label={cpu ? 'CPU のデッキ' : 'プレイヤー2のデッキ'} value={theirs} onChange={setTheirs} testId="deck-1" accent="red" />
      </div>
    </div>
  );
}
