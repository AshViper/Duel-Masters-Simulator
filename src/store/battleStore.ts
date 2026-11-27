import { create } from 'zustand';
import { chooseAction, type Difficulty } from '../core/ai/cpu';
import { expandDeck, type Deck } from '../core/deck/rules';
import { applyAction } from '../core/engine/engine';
import { sealForQueries } from '../core/engine/queries';
import { createGame } from '../core/engine/setup';
import type { Action, GameState, PlayerId } from '../core/engine/types';
import { db } from '../db/db';
import { uid, useApp } from './appStore';

export type BattleMode = 'cpu' | 'solo' | 'online';

/**
 * オンライン対戦の通信口。onlineStore が差し込む（循環 import を避けるため）。
 * ホストは状態を送り、ゲストは操作を送る。
 */
export interface NetBridge {
  sendAction: (a: Action) => void;
  broadcast: (state: GameState) => void;
  rematch: () => void;
  leave: () => void;
}
let bridge: NetBridge | null = null;
export const setNetBridge = (b: NetBridge | null) => {
  bridge = b;
};

interface BattleState {
  game: GameState | null;
  mode: BattleMode;
  difficulty: Difficulty;
  deckNames: [string, string];
  saveId: string | null;
  error: string | null;
  recorded: boolean;
  /** この画面で操作する席。CPU戦・オンラインのホストは0、オンラインのゲストは1。1人回しは両方を操作する */
  seat: PlayerId;
  start: (opts: { mode: BattleMode; decks: [Deck, Deck]; difficulty: Difficulty; firstPlayer?: PlayerId }) => void;
  dispatch: (a: Action) => boolean;
  /** オンライン：対戦を始める（ゲストは受け取った状態で始める） */
  startOnline: (game: GameState, deckNames: [string, string], seat: PlayerId) => void;
  /** オンライン（ゲスト）：ホストから届いた状態にする */
  setRemoteState: (game: GameState) => void;
  /** オンライン（ホスト）：ゲストの操作を処理する。エラーなら文言を返す */
  applyRemote: (a: Action) => string | null;
  setError: (message: string) => void;
  rematch: () => void;
  clearError: () => void;
  saveGame: () => Promise<void>;
  /** 再開できなければその理由を返す */
  loadGame: (id: string) => Promise<string | null>;
  quit: () => void;
}

let cpuTimer: ReturnType<typeof setTimeout> | null = null;

/** CPU が操作するプレイヤーか */
export function isCpuTurnPlayer(game: GameState, mode: BattleMode): PlayerId | null {
  if (mode !== 'cpu' || game.gameOverReason !== null) return null;
  const who: PlayerId = game.pending ? game.pending.player : game.activePlayer;
  return game.players[who].isCpu ? who : null;
}

export const useBattle = create<BattleState>((set, get) => {
  const scheduleCpu = () => {
    if (cpuTimer) clearTimeout(cpuTimer);
    const { game, mode, difficulty } = get();
    if (!game) return;
    const who = isCpuTurnPlayer(game, mode);
    if (who === null) return;
    cpuTimer = setTimeout(() => {
      cpuTimer = null;
      const g = get().game;
      if (!g) return;
      // ストアの盤面は書き換えないので、CPU の問い合わせも結果を覚えて速くする
      sealForQueries(g);
      const a = chooseAction(g, useApp.getState().registry, who, difficulty);
      if (a) get().dispatch(a);
    }, useApp.getState().settings.cpuDelayMs);
  };

  const recordIfOver = async () => {
    const { game, mode, deckNames, recorded } = get();
    if (!game || game.gameOverReason === null || recorded) return;
    set({ recorded: true });
    await db.matches.add({ playedAt: Date.now(), mode, deckNames, winner: game.winner, reason: game.gameOverReason, turns: game.turn, log: game.log });
  };

  return {
    game: null,
    mode: 'cpu',
    difficulty: 'normal',
    deckNames: ['', ''],
    saveId: null,
    error: null,
    recorded: false,
    seat: 0,

    start: ({ mode, decks, difficulty, firstPlayer }) => {
      const registry = useApp.getState().registry;
      const game = createGame(
        {
          players: [
            { name: mode === 'cpu' ? 'あなた' : 'プレイヤー1', deck: expandDeck(decks[0]) },
            { name: mode === 'cpu' ? 'CPU' : 'プレイヤー2', deck: expandDeck(decks[1]), isCpu: mode === 'cpu' },
          ],
          firstPlayer,
        },
        registry,
      );
      set({ game, mode, difficulty, deckNames: [decks[0].name, decks[1].name], saveId: uid(), error: null, recorded: false, seat: 0 });
      useApp.getState().go('battle');
      scheduleCpu();
    },

    dispatch: (a) => {
      const { game: g, mode, seat } = get();
      if (!g) return false;
      if (mode === 'online' && seat === 1) {
        // ゲストはホストに送るだけ。結果は状態として返ってくる
        bridge?.sendAction(a);
        return true;
      }
      const r = applyAction(g, a, useApp.getState().registry);
      if (r.error) {
        set({ error: r.error });
        return false;
      }
      set({ game: r.state, error: null });
      if (mode === 'online') bridge?.broadcast(r.state);
      void recordIfOver();
      scheduleCpu();
      return true;
    },

    startOnline: (game, deckNames, seat) => {
      if (cpuTimer) clearTimeout(cpuTimer);
      set({ game, mode: 'online', difficulty: 'normal', deckNames, saveId: null, error: null, recorded: game.gameOverReason !== null, seat });
      useApp.getState().go('battle');
    },

    setRemoteState: (game) => {
      set({ game });
      void recordIfOver();
    },

    applyRemote: (a) => {
      const { game: g, mode, seat } = get();
      if (!g || mode !== 'online' || seat !== 0) return '対戦が始まっていません';
      // ゲストが操作できるのはプレイヤー1だけ
      if (a.player !== 1) return '相手のプレイヤーは操作できません';
      const r = applyAction(g, a, useApp.getState().registry);
      if (r.error) return r.error;
      set({ game: r.state });
      bridge?.broadcast(r.state);
      void recordIfOver();
      return null;
    },

    setError: (message) => set({ error: message }),

    rematch: () => bridge?.rematch(),

    clearError: () => set({ error: null }),

    saveGame: async () => {
      const { game, mode, difficulty, saveId, deckNames } = get();
      // オンライン対戦は中断保存しない（再開には相手が必要なため）
      if (!game || !saveId || mode === 'online') return;
      await db.savedGames.put({ id: saveId, savedAt: Date.now(), title: `${deckNames[0]} vs ${deckNames[1]}（ターン${game.turn}）`, mode, difficulty, state: game });
    },

    loadGame: async (id) => {
      const row = await db.savedGames.get(id);
      if (!row) return '中断した対戦が見つかりません';
      // 保存した後にカードを消した・取り込み直したなどで、手元にないカードがあると表示できない
      const registry = useApp.getState().registry;
      const missing = [...new Set(Object.values(row.state.cards).map((c) => c.cardId).filter((id) => !registry[id]))];
      if (missing.length) return `この対戦で使っていたカードが ${missing.length}種 手元にないため再開できません（${missing.slice(0, 3).join('、')}${missing.length > 3 ? ' など' : ''}）`;
      set({ game: row.state, mode: row.mode, seat: 0, difficulty: row.difficulty as Difficulty, saveId: row.id, error: null, recorded: row.state.gameOverReason !== null, deckNames: row.title.split(' vs ') as [string, string] });
      useApp.getState().go('battle');
      scheduleCpu();
      return null;
    },

    quit: () => {
      if (cpuTimer) clearTimeout(cpuTimer);
      const online = get().mode === 'online';
      // 先に盤面を消す（オンラインの退室で相手のカードが辞書から消えるため、盤面が残っていると描画できない）
      set({ game: null });
      if (online) bridge?.leave();
      useApp.getState().go('home');
    },
  };
});
