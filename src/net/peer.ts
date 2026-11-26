import Peer, { type DataConnection } from 'peerjs';
import { peerIdOf, type NetMessage } from './protocol';

// PeerJS の薄いラッパー。シグナリングには PeerJS の公開サーバー（0.peerjs.com）を使い、
// 対戦データはブラウザ同士の DataChannel（P2P）で直接流れる。

/** 1本の接続。相手へ送る・切る・受け取るだけを出す */
export interface Link {
  send: (m: NetMessage) => void;
  close: () => void;
}

export interface LinkEvents {
  onMessage: (m: NetMessage) => void;
  onClose: () => void;
}

export function wrapConnection(conn: DataConnection, ev: LinkEvents): Link {
  let closed = false;
  const fireClose = () => {
    if (closed) return;
    closed = true;
    ev.onClose();
  };
  conn.on('data', (d) => ev.onMessage(d as NetMessage));
  conn.on('close', fireClose);
  conn.on('error', fireClose);
  return {
    send: (m) => {
      if (conn.open) void conn.send(m);
    },
    close: () => {
      closed = true;
      conn.close();
    },
  };
}

const ERROR_TEXT: Record<string, string> = {
  'unavailable-id': 'この部屋コードは使用中です。もう一度作り直してください',
  'peer-unavailable': '部屋が見つかりません。部屋コードを確認してください',
  network: 'シグナリングサーバーに接続できません。インターネット接続を確認してください',
  'server-error': 'シグナリングサーバーでエラーが発生しました',
  'socket-error': 'シグナリングサーバーとの通信でエラーが発生しました',
  'browser-incompatible': 'このブラウザは P2P 通信（WebRTC）に対応していません',
  webrtc: 'P2P 接続に失敗しました（回線によっては接続できないことがあります）',
};

export const peerErrorText = (type: string, fallback: string) => ERROR_TEXT[type] ?? fallback;

/** 部屋を開く。開けたら Peer を返し、以後の接続は onConnection に渡す */
export function openRoom(code: string, onConnection: (conn: DataConnection) => void): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(peerIdOf(code));
    let opened = false;
    peer.on('open', () => {
      opened = true;
      resolve(peer);
    });
    peer.on('connection', onConnection);
    // シグナリングが切れても P2P の接続は生きている。再接続を待ち受けられるようにつなぎ直す
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
    peer.on('error', (e) => {
      if (!opened) {
        peer.destroy();
        reject(new Error(peerErrorText(e.type, e.message)));
      }
    });
  });
}

/** 部屋に入る。接続できたら Peer と接続を返す */
export function joinRoom(code: string, timeoutMs = 15000): Promise<{ peer: Peer; conn: DataConnection }> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    let done = false;
    const fail = (msg: string) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      peer.destroy();
      reject(new Error(msg));
    };
    const timer = setTimeout(() => fail('接続がタイムアウトしました（回線によっては P2P 接続できないことがあります）'), timeoutMs);
    peer.on('error', (e) => fail(peerErrorText(e.type, e.message)));
    peer.on('open', () => {
      const conn = peer.connect(peerIdOf(code), { reliable: true });
      conn.on('open', () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ peer, conn });
      });
      conn.on('error', (e) => fail(e.message));
    });
  });
}
