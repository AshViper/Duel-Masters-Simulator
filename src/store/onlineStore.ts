import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { create } from 'zustand';
import { buildRegistry } from '../core/cards/registry';
import type { CardDefinition } from '../core/cards/types';
import { expandDeck, isDeckLegal, type Deck } from '../core/deck/rules';
import { createGame } from '../core/engine/setup';
import { canShowImage, getImageBlob, putTempImage } from '../db/imageCache';
import { joinRoom, openRoom, wrapConnection, type Link } from '../net/peer';
import {
  deckCardDefs,
  imageKeysOf,
  newRoomCode,
  normalizeRoomCode,
  PROTOCOL_VERSION,
  type NetMessage,
} from '../net/protocol';
import { setBattleCards, useApp } from './appStore';
import { setNetBridge, useBattle } from './battleStore';
import { isSleeveImage, useSleeves } from '../ui/sleeves';
import { looksForNames, sanitizeLooks, useCardLooks, type CardLook } from '../ui/cardLooks';

export type OnlineRole = 'host' | 'guest';
export type OnlineStatus =
  | 'idle'
  /** ホスト：部屋を開いている */
  | 'opening'
  /** ホスト：相手を待っている */
  | 'waiting'
  /** ゲスト：接続中 */
  | 'connecting'
  /** 対戦中（接続あり） */
  | 'playing'
  /** 対戦中に接続が切れた */
  | 'disconnected'
  | 'error';

interface OnlineState {
  role: OnlineRole | null;
  status: OnlineStatus;
  code: string;
  message: string;
  opponentName: string;
  /** 自分のデッキ（再戦・再接続で使う） */
  deck: Deck | null;
  host: (deck: Deck) => Promise<void>;
  join: (code: string, deck: Deck) => Promise<void>;
  /** ゲスト：切断後に同じ部屋へ入り直す */
  reconnect: () => Promise<void>;
  leave: () => void;
}

let peer: Peer | null = null;
let link: Link | null = null;
/** ホストが覚えておく相手のデッキ（再戦用） */
let guestDeck: Deck | null = null;
let guestCards: CardDefinition[] = [];
/** ホストが覚えておく相手のスリーブ */
let guestSleeve: string | undefined;

/** 相手に見せる自分のスリーブ（デッキの指定、なければ全体の標準） */
const mySleeve = (deck: Deck): string => deck.sleeve ?? useSleeves.getState().current;

/** ホストが覚えておく相手のカードの見た目 */
let guestLooks: Record<string, CardLook> = {};

/** 相手に見せる自分のカードの見た目（デッキのカード名の分だけ） */
const myLooks = (deck: Deck, registry: Record<string, CardDefinition>) => looksForNames(new Set(deckCardDefs(deck, registry).map((c) => c.name)));

/** 相手の見た目を表示に使い、絵が手元になければ送ってもらう */
async function applyRemoteLooks(seat: number, looks: Record<string, CardLook>): Promise<void> {
  useCardLooks.getState().setRemote(seat, looks);
  const keys: string[] = [];
  for (const k of new Set(Object.values(looks).flatMap((l) => (l.art ? [l.art] : [])))) if (!(await canShowImage(k))) keys.push(k);
  if (keys.length) link?.send({ t: 'needImages', keys });
}

/** 相手のスリーブが自分の画像なら、手元にない時だけ送ってもらう */
async function requestSleeveImage(sleeve: string | undefined): Promise<void> {
  if (isSleeveImage(sleeve) && !(await canShowImage(sleeve))) link?.send({ t: 'needImages', keys: [sleeve] });
}

const myName = (fallback: string) => useApp.getState().settings.playerName.trim() || fallback;

/** 対戦用の辞書に切り替える（手元のカード＋相手から受け取ったカード） */
function applyBattleRegistry(cards: CardDefinition[]): void {
  setBattleCards(cards);
}

/** 手元の辞書に戻す */
function restoreRegistry(): void {
  setBattleCards(null);
}

/** 手元で表示できない画像を相手に頼む */
async function requestMissingImages(cards: CardDefinition[]): Promise<void> {
  const keys: string[] = [];
  for (const k of imageKeysOf(cards)) if (!(await canShowImage(k))) keys.push(k);
  if (keys.length > 0) link?.send({ t: 'needImages', keys });
}

async function sendImages(keys: string[]): Promise<void> {
  for (const key of keys) {
    const blob = await getImageBlob(key);
    if (!blob) continue;
    link?.send({ t: 'image', key, mime: blob.type, data: await blob.arrayBuffer() });
  }
}

function handleCommon(m: NetMessage): boolean {
  if (m.t === 'needImages') {
    void sendImages(m.keys);
    return true;
  }
  if (m.t === 'image') {
    putTempImage(m.key, new Blob([m.data], { type: m.mime }));
    return true;
  }
  return false;
}

export const useOnline = create<OnlineState>((set, get) => {
  /** ホスト：新しい対戦を作って相手に送る */
  const startHostGame = () => {
    const { deck } = get();
    if (!deck || !guestDeck || !link) return;
    const registry = useApp.getState().registry;
    const game = createGame(
      {
        players: [
          { name: myName('ホスト'), deck: expandDeck(deck) },
          { name: get().opponentName, deck: expandDeck(guestDeck) },
        ],
      },
      registry,
    );
    const cards = [...guestCards, ...deckCardDefs(deck, registry)];
    const deckNames: [string, string] = [deck.name, guestDeck.name];
    const sleeves: [string, string | undefined] = [mySleeve(deck), guestSleeve];
    link.send({ t: 'start', state: game, cards, deckNames, sleeves, looks: [myLooks(deck, buildRegistry(useApp.getState().cards)), guestLooks] });
    useBattle.getState().startOnline(game, deckNames, 0, sleeves);
  };

  const hostMessage = (m: NetMessage) => {
    if (handleCommon(m)) return;
    const battle = useBattle.getState();
    switch (m.t) {
      case 'hello': {
        if (m.v !== PROTOCOL_VERSION) {
          link?.send({ t: 'error', message: 'アプリのバージョンが違うため対戦できません。両方とも最新にしてください', fatal: true });
          return;
        }
        const { deck } = get();
        if (!deck) return;
        // 同じ ID のカードはホストの定義を正とする
        const base = useApp.getState();
        const hostCards = deckCardDefs(deck, buildRegistry(base.cards));
        applyBattleRegistry([...m.cards, ...hostCards]);
        const registry = useApp.getState().registry;
        if (!isDeckLegal(m.deck, base.settings.format, registry)) {
          link?.send({ t: 'error', message: '相手（ホスト）の構築ルールを満たしていないデッキです', fatal: true });
          restoreRegistry();
          return;
        }
        guestDeck = m.deck;
        guestCards = m.cards;
        guestSleeve = typeof m.sleeve === 'string' ? m.sleeve : undefined;
        set({ opponentName: m.name, status: 'playing', message: '' });
        void requestMissingImages(m.cards);
        void requestSleeveImage(guestSleeve);
        guestLooks = sanitizeLooks(m.looks);
        void applyRemoteLooks(1, guestLooks);
        // 対戦中の再接続なら続きから
        if (battle.mode === 'online' && battle.game && battle.game.gameOverReason === null) {
          link?.send({ t: 'start', state: battle.game, cards: [...m.cards, ...hostCards], deckNames: battle.deckNames, sleeves: battle.sleeves, looks: [myLooks(deck, buildRegistry(base.cards)), guestLooks] });
          return;
        }
        startHostGame();
        return;
      }
      case 'action': {
        const err = battle.applyRemote(m.action);
        if (err) link?.send({ t: 'error', message: err });
        return;
      }
      case 'rematch':
        if (battle.game?.gameOverReason !== null) startHostGame();
        return;
    }
  };

  const guestMessage = (m: NetMessage) => {
    if (handleCommon(m)) return;
    switch (m.t) {
      case 'start':
        applyBattleRegistry(m.cards);
        set({ status: 'playing', message: '', opponentName: m.state.players[0].name });
        useBattle.getState().startOnline(m.state, m.deckNames, 1, m.sleeves);
        void requestMissingImages(m.cards);
        void requestSleeveImage(m.sleeves?.[0]);
        void applyRemoteLooks(0, sanitizeLooks(m.looks?.[0]));
        return;
      case 'state':
        useBattle.getState().setRemoteState(m.state);
        return;
      case 'error':
        if (m.fatal) {
          set({ status: 'error', message: m.message });
          link?.close();
          link = null;
        } else useBattle.getState().setError(m.message);
        return;
    }
  };

  const onLinkClosed = () => {
    link = null;
    const inBattle = useBattle.getState().mode === 'online' && useBattle.getState().game !== null;
    const { role, status } = get();
    if (status === 'error' || status === 'idle') return;
    if (inBattle) set({ status: 'disconnected', message: role === 'host' ? '相手との接続が切れました。再接続を待っています' : 'ホストとの接続が切れました' });
    else if (role === 'host') set({ status: 'waiting', message: '' });
    else set({ status: 'error', message: 'ホストとの接続が切れました' });
  };

  const onHostConnection = (conn: DataConnection) => {
    // 対戦相手は1人だけ。古い接続が残っていたら（切断の検知が遅れた再接続など）新しい方に置き換える
    const old = link;
    link = null;
    old?.close();
    link = wrapConnection(conn, { onMessage: hostMessage, onClose: onLinkClosed });
  };

  const connectAsGuest = async (code: string) => {
    const { deck, status: before } = get();
    if (!deck) return;
    set({ status: 'connecting', message: '' });
    try {
      const r = await joinRoom(code);
      peer = r.peer;
      link = wrapConnection(r.conn, { onMessage: guestMessage, onClose: onLinkClosed });
      const registry = buildRegistry(useApp.getState().cards);
      link.send({ t: 'hello', v: PROTOCOL_VERSION, name: myName('ゲスト'), deck, cards: deckCardDefs(deck, registry), sleeve: mySleeve(deck), looks: myLooks(deck, registry) });
    } catch (e) {
      // 対戦中の再接続に失敗したら、対戦画面のまま再接続をやり直せるようにする
      set({ status: before === 'disconnected' ? 'disconnected' : 'error', message: (e as Error).message });
    }
  };

  setNetBridge({
    sendAction: (action) => {
      if (link) link.send({ t: 'action', action });
      else useBattle.getState().setError('相手と接続されていません');
    },
    broadcast: (state) => link?.send({ t: 'state', state }),
    rematch: () => {
      if (get().role === 'host') startHostGame();
      else link?.send({ t: 'rematch' });
    },
    leave: () => get().leave(),
  });

  return {
    role: null,
    status: 'idle',
    code: '',
    message: '',
    opponentName: '',
    deck: null,

    host: async (deck) => {
      get().leave();
      set({ role: 'host', status: 'opening', deck, message: '', opponentName: '' });
      // 部屋コードが衝突したら作り直す
      for (let i = 0; i < 3; i++) {
        const code = newRoomCode();
        try {
          peer = await openRoom(code, onHostConnection);
          set({ code, status: 'waiting' });
          return;
        } catch (e) {
          if (i === 2 || !(e as Error).message.includes('使用中')) {
            set({ status: 'error', message: (e as Error).message });
            return;
          }
        }
      }
    },

    join: async (input, deck) => {
      get().leave();
      const code = normalizeRoomCode(input);
      if (!code) {
        set({ status: 'error', message: '部屋コードを入力してください' });
        return;
      }
      set({ role: 'guest', code, deck, opponentName: '' });
      await connectAsGuest(code);
    },

    reconnect: async () => {
      const { role, code } = get();
      if (role !== 'guest' || !code) return;
      link?.close();
      link = null;
      peer?.destroy();
      peer = null;
      await connectAsGuest(code);
    },

    leave: () => {
      const l = link;
      link = null;
      l?.close();
      peer?.destroy();
      peer = null;
      guestDeck = null;
      guestCards = [];
      guestSleeve = undefined;
      guestLooks = {};
      useCardLooks.getState().setRemote(null, null);
      if (get().role) restoreRegistry();
      set({ role: null, status: 'idle', code: '', message: '', opponentName: '' });
    },
  };
});
