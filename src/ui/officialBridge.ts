// 中継サーバーのない環境（GitHub Pages 版）で公式カード検索を使うための「ブリッジ」。
//
// 公式サイトはほかのサイトからの読み取り（CORS）を許可していないので、アプリからは直接取得できない。
// そこで、公式カード検索のタブでブックマークレットを押してもらい、そのタブに取得を代わりにしてもらう。
//   1. ブックマークレットがこのアプリを別ウィンドウで開き、hello を送る（そのページに出ているカードの ID も添える）
//   2. アプリは ack を返し、以後の公式への取得を dm-fetch としてそのタブへ頼む
//   3. タブは同じオリジンなので取得でき、結果（バイト列）を返す
//   4. 添えられたカードは、アプリが自動で保存する（BridgeImport.tsx）
// 解析・キャッシュ・間隔制御はアプリ側（dmOfficial.ts）で行う。どちらもメッセージの送り主のオリジンを確かめる。
// ブックマークレットは公式の /card/ と /wp-content/card/ 以外は取得しない。
//
// もう一つの経路：ユーザースクリプト（public/dm-bridge.user.js、Tampermonkey など）を入れていれば、
// アプリを開くだけで自動でつながる（公式のタブは要らない）。同じページの中で window.postMessage でやりとりする。
//   アプリ → dm-us-ping / dm-us-fetch、スクリプト → dm-us-hello / dm-us-result
// 公式サイトのページでスクリプトが出す「DMシミュへ保存」ボタンは、アプリを #dm-import=<nonce>:<id,id,...> で開く。

import { useSyncExternalStore } from 'react';
import { DM_ORIGIN, setOfficialFetcher, type OfficialFetcher } from '../server/dmOfficial';

// いちばん手軽な経路：中継サーバー（relay/worker.js、Cloudflare Workers）。
// 公開版（localhost 以外）では何もしなくてもこれでつながる。中継が使えない時だけ、下のユーザースクリプト・ブックマークレットを使う。
// 開発中に中継を試すには VITE_DM_RELAY_URL を指定して npm run dev する。
const DEFAULT_RELAY_URL = 'https://dm-sim-relay.REPLACE_ME.workers.dev';
const RELAY_URL: string = ((import.meta.env.VITE_DM_RELAY_URL as string | undefined) ??
  (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(globalThis.location?.hostname ?? 'localhost') || DEFAULT_RELAY_URL.includes('REPLACE_ME') ? '' : DEFAULT_RELAY_URL)
).replace(/\/$/, '');
/** 中継が使えるか（失敗したら false にして、ほかの経路の案内を出す） */
let relayOk = !!RELAY_URL;

const WINDOW_NAME = 'dm-card-simulator';
const TIMEOUT_MS = 20000;

let bridge: Window | null = null;
/** ユーザースクリプトが入っているか（入っていればアプリを開くだけでつながる） */
let userscript = false;
let seq = 0;
const pending = new Map<number, { resolve: (v: { status: number; bytes: ArrayBuffer; contentType: string }) => void; reject: (e: Error) => void }>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function isBridgeConnected(): boolean {
  return relayOk || userscript || (!!bridge && !bridge.closed);
}

/** どの経路でつながっているか */
export type BridgeKind = 'relay' | 'userscript' | 'tab' | null;
function bridgeKind(): BridgeKind {
  if (relayOk) return 'relay';
  if (userscript) return 'userscript';
  return bridge && !bridge.closed ? 'tab' : null;
}
export function useBridgeKind(): BridgeKind {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    bridgeKind,
  );
}

/** ブリッジの接続状態を React で使う */
export function useBridgeConnected(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    isBridgeConnected,
  );
}

/** 中継サーバー経由。届かなければ、ほかの経路（スクリプト・公式タブ）があればそちらで取り直す */
const relayFetcher: OfficialFetcher = async (url, init) => {
  if (relayOk) {
    const u = new URL(url);
    if (u.origin !== DM_ORIGIN) throw new Error('許可していない URL です');
    try {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(init.headers ?? {})) if (/^(content-type|x-requested-with)$/i.test(k)) headers[k] = v;
      const res = await fetch(RELAY_URL + u.pathname + u.search, { method: init.method ?? 'GET', body: init.body, headers, credentials: 'omit' });
      if (res.status !== 403 && res.status !== 429 && res.status < 500) {
        return { status: res.status, bytes: await res.arrayBuffer(), contentType: res.headers.get('content-type') ?? '' };
      }
      console.warn(`公式カード検索の中継が ${res.status} を返しました`);
    } catch (e) {
      console.warn('公式カード検索の中継に届きません', e);
    }
    if (userscript || (bridge && !bridge.closed)) return bridgeFetcher(url, init);
    relayOk = false;
    notify();
    throw new Error('公式カード検索の中継に届きませんでした。「公式サイトとつなぐ」の手順でつないでください。');
  }
  return bridgeFetcher(url, init);
};

const bridgeFetcher: OfficialFetcher = (url, init) =>
  new Promise((resolve, reject) => {
    if (!userscript && (!bridge || bridge.closed)) {
      bridge = null;
      notify();
      return reject(new Error('公式サイトのタブとの接続が切れました。公式カード検索のページでブックマークレットをもう一度押してください。'));
    }
    const id = ++seq;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('公式サイトのタブから応答がありません。公式カード検索のページでブックマークレットをもう一度押してください。'));
    }, TIMEOUT_MS);
    pending.set(id, {
      resolve: (v) => (clearTimeout(timer), resolve(v)),
      reject: (e) => (clearTimeout(timer), reject(e)),
    });
    // User-Agent / Referer はブラウザでは指定できないので送らない
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(init.headers ?? {})) if (/^(content-type|x-requested-with)$/i.test(k)) headers[k] = v;
    const msg = { id, url, method: init.method ?? 'GET', body: init.body, headers };
    if (userscript) return window.postMessage({ type: 'dm-us-fetch', ...msg }, location.origin);
    bridge!.postMessage({ type: 'dm-fetch', ...msg }, DM_ORIGIN);
  });

/** ブックマークレットを押したページに出ていたカード（自動で保存する） */
export interface BridgeImportRequest {
  nonce: string;
  ids: string[];
}
let importRequest: BridgeImportRequest | null = null;
const HANDLED_KEY = 'dm-bridge-handled';

/** 同じ押下を二度保存しない（hello は ack まで繰り返し届き、再読み込みでも届く） */
function takeNewRequest(req: unknown): BridgeImportRequest | null {
  const r = req as Partial<BridgeImportRequest> | null;
  if (!r || typeof r.nonce !== 'string' || !Array.isArray(r.ids)) return null;
  const ids = r.ids.filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id)).slice(0, 100);
  if (ids.length === 0) return null;
  const handled: string[] = JSON.parse(sessionStorage.getItem(HANDLED_KEY) ?? '[]');
  if (handled.includes(r.nonce) || importRequest?.nonce === r.nonce) return null;
  sessionStorage.setItem(HANDLED_KEY, JSON.stringify([...handled, r.nonce].slice(-20)));
  return { nonce: r.nonce, ids };
}

/** まだ処理していない自動保存の依頼 */
export function useBridgeImportRequest(): BridgeImportRequest | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => importRequest,
  );
}

export function clearBridgeImportRequest(): void {
  importRequest = null;
  notify();
}

type BridgeMessage = { type?: string; id?: number; status?: number; contentType?: string; bytes?: ArrayBuffer; error?: string; req?: unknown } | null;

function settle(m: NonNullable<BridgeMessage>) {
  const p = pending.get(m.id!);
  if (!p) return;
  pending.delete(m.id!);
  if (m.error) p.reject(new Error(`公式サイトから取得できませんでした: ${m.error}`));
  else p.resolve({ status: m.status ?? 0, bytes: m.bytes ?? new ArrayBuffer(0), contentType: m.contentType ?? '' });
}

function onMessage(e: MessageEvent) {
  const m = e.data as BridgeMessage;
  // ユーザースクリプト（同じページ）から
  if (e.origin === location.origin) {
    if (m?.type === 'dm-us-hello' && !userscript) {
      userscript = true;
      notify();
    } else if (m?.type === 'dm-us-result' && typeof m.id === 'number') settle(m);
    return;
  }
  if (e.origin !== DM_ORIGIN || !e.source) return;
  if (m?.type === 'dm-bridge-hello') {
    bridge = e.source as Window;
    bridge.postMessage({ type: 'dm-bridge-ack' }, DM_ORIGIN);
    const req = takeNewRequest(m.req);
    if (req) importRequest = req;
    notify();
    return;
  }
  if (m?.type === 'dm-fetch-result' && typeof m.id === 'number') settle(m);
}

/** スクリプトの「DMシミュへ保存」ボタンから #dm-import=<nonce>:<id,id,...> で開かれた時 */
function readImportHash() {
  const hit = /^#dm-import=([^:]+):(.+)$/.exec(location.hash);
  if (!hit) return;
  history.replaceState(null, '', location.pathname + location.search);
  const req = takeNewRequest({ nonce: decodeURIComponent(hit[1]), ids: decodeURIComponent(hit[2]).split(',') });
  if (req) {
    importRequest = req;
    notify();
  }
}

let started = false;
/** アプリの起動時に一度呼ぶ。ブックマークレットから開かれていれば、開いたタブに接続を頼む */
export function initOfficialBridge(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  setOfficialFetcher(relayFetcher);
  window.addEventListener('message', onMessage);
  // ユーザースクリプトは先に hello を送っていることがあるので、こちらからも呼ぶ
  window.postMessage({ type: 'dm-us-ping' }, location.origin);
  readImportHash();
  window.addEventListener('hashchange', readImportHash);
  // 再読み込みした時も、開いたタブ（window.opener）がブリッジならつなぎ直す
  try {
    window.opener?.postMessage({ type: 'dm-bridge-ping' }, DM_ORIGIN);
  } catch {
    /* opener が公式サイトでなければ何もしない */
  }
  setInterval(() => {
    if (bridge?.closed) {
      bridge = null;
      notify();
    }
  }, 2000);
}

/** 公式カード検索のページで押すブックマークレット（javascript: URL）を作る */
export function bookmarkletHref(appUrl: string = location.origin + location.pathname): string {
  const appOrigin = new URL(appUrl).origin;
  const src = `(()=>{
const A=${JSON.stringify(appOrigin)},U=${JSON.stringify(appUrl)},O=${JSON.stringify(DM_ORIGIN)};
if(location.origin!==O){alert('デュエル・マスターズ公式カード検索（'+O+'/card/）のページで押してください');return}
if(window.__dmBridge){window.__dmBridge.open();return}
const pick=()=>{const s=new Set(),q=new URLSearchParams(location.search);
if(location.pathname.startsWith('/card/detail/')&&q.get('id'))s.add(q.get('id'));
document.querySelectorAll('img.cardImage[data-href]').forEach(i=>{const id=new URL(i.getAttribute('data-href'),location.href).searchParams.get('id');if(id)s.add(id)});
return[...s].filter(x=>/^[A-Za-z0-9_-]+$/.test(x)).slice(0,100)};
let w=null,ok=false,t=0,req=null;
const hello=()=>{clearInterval(t);ok=false;t=setInterval(()=>{if(ok||!w||w.closed)return clearInterval(t);w.postMessage({type:'dm-bridge-hello',req},A)},400)};
const open=()=>{req={nonce:Date.now()+'-'+Math.random().toString(36).slice(2),ids:pick()};w=window.open(U,${JSON.stringify(WINDOW_NAME)});if(!w){alert('ポップアップがブロックされました。このサイトのポップアップを許可してから、もう一度押してください');return}hello()};
window.__dmBridge={open};
addEventListener('message',async e=>{
if(e.origin!==A||!w||e.source!==w)return;
const m=e.data||{};
if(m.type==='dm-bridge-ack'){if(!ok&&!/^\\[接続中\\]/.test(document.title))document.title='[接続中] '+document.title;ok=true;return}
if(m.type==='dm-bridge-ping')return hello();
if(m.type!=='dm-fetch')return;
const r={type:'dm-fetch-result',id:m.id};
try{
const u=new URL(m.url);
if(u.origin!==O||!/^\\/(card\\/|wp-content\\/card\\/)/.test(u.pathname))throw new Error('許可していない URL です');
const res=await fetch(u,{method:m.method==='POST'?'POST':'GET',body:m.method==='POST'?m.body:undefined,headers:m.headers||{},credentials:'omit'});
r.status=res.status;r.contentType=res.headers.get('content-type')||'';r.bytes=await res.arrayBuffer();
w.postMessage(r,A,[r.bytes])
}catch(x){r.error=String(x&&x.message||x);w.postMessage(r,A)}
});
open()})()`;
  return 'javascript:' + encodeURIComponent(src.replace(/\n/g, ''));
}
