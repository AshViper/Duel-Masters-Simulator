import { useState } from 'react';
import { DIFFICULTY_LABEL, type Difficulty } from '../../core/ai/cpu';
import { deckCountLabel, isDeckLegal } from '../../core/deck/rules';
import type { PlayerId } from '../../core/engine/types';
import { useApp } from '../../store/appStore';
import { useBattle, type BattleMode } from '../../store/battleStore';
import { Header } from './Menus';

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

  const deckSelect = (value: string, onChange: (v: string) => void, testId: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}>
      {decks.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}（{deckCountLabel(d, registry)}{isDeckLegal(d, settings.format, registry) ? '' : '・ルール違反'}）
        </option>
      ))}
    </select>
  );

  return (
    <div className="screen">
      <Header title="対戦開始" />
      <div className="setup">
        <div className="mode-tabs">
          <button className={mode === 'cpu' ? 'on' : ''} onClick={() => setMode('cpu')} data-testid="mode-cpu">CPU対戦</button>
          <button className={mode === 'solo' ? 'on' : ''} onClick={() => setMode('solo')} data-testid="mode-solo">1人回し（両方を操作）</button>
          <button onClick={() => go('online')} data-testid="mode-online">オンライン対戦</button>
        </div>
        <label>
          {mode === 'cpu' ? 'あなたのデッキ' : 'プレイヤー1のデッキ'}
          {deckSelect(mine, setMine, 'deck-0')}
        </label>
        <label>
          {mode === 'cpu' ? 'CPUのデッキ' : 'プレイヤー2のデッキ'}
          {deckSelect(theirs, setTheirs, 'deck-1')}
        </label>
        {mode === 'cpu' && (
          <label>
            難易度
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
              {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
            </select>
          </label>
        )}
        <label>
          先攻
          <select value={first} onChange={(e) => setFirst(e.target.value as typeof first)}>
            <option value="random">ランダム</option>
            <option value="0">{mode === 'cpu' ? 'あなた' : 'プレイヤー1'}</option>
            <option value="1">{mode === 'cpu' ? 'CPU' : 'プレイヤー2'}</option>
          </select>
        </label>
        {decks.length === 0 && <p className="muted">デッキがありません。公式カード検索でカードを保存し、デッキ構築で40枚のデッキを作ってください。</p>}
        {decks.length > 0 && !ok && <p className="ng">構築ルールを満たすデッキを選んでください（デッキ構築画面で確認できます）</p>}
        <button
          className="primary big"
          disabled={!ok}
          data-testid="start-battle"
          onClick={() => {
            void touchRecent(d0!.id);
            start({ mode, decks: [d0!, d1!], difficulty, firstPlayer: first === 'random' ? undefined : (Number(first) as PlayerId) });
          }}
        >
          対戦開始
        </button>
      </div>
    </div>
  );
}
