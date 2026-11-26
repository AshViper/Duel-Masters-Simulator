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

import { useSyncExternalStore } from 'react';
import { DM_ORIGIN, setOfficialFetcher, type OfficialFetcher } from '../server/dmOfficial';

const WINDOW_NAME = 'dm-card-simulator';
const TIMEOUT_MS = 20000;

let bridge: Window | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: { status: number; bytes: ArrayBuffer; contentType: string }) => void; reject: (e: Error) => void }>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function isBridgeConnected(): boolean {
  return !!bridge && !bridge.closed;
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

const bridgeFetcher: OfficialFetcher = (url, init) =>
  new Promise((resolve, reject) => {
    if (!bridge || bridge.closed) {
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
    bridge.postMessage({ type: 'dm-fetch', id, url, method: init.method ?? 'GET', body: init.body, headers }, DM_ORIGIN);
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

function onMessage(e: MessageEvent) {
  if (e.origin !== DM_ORIGIN || !e.source) return;
  const m = e.data as { type?: string; id?: number; status?: number; contentType?: string; bytes?: ArrayBuffer; error?: string; req?: unknown } | null;
  if (m?.type === 'dm-bridge-hello') {
    bridge = e.source as Window;
    bridge.postMessage({ type: 'dm-bridge-ack' }, DM_ORIGIN);
    const req = takeNewRequest(m.req);
    if (req) importRequest = req;
    notify();
    return;
  }
  if (m?.type === 'dm-fetch-result' && typeof m.id === 'number') {
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.reject(new Error(`公式サイトから取得できませんでした: ${m.error}`));
    else p.resolve({ status: m.status ?? 0, bytes: m.bytes ?? new ArrayBuffer(0), contentType: m.contentType ?? '' });
  }
}

let started = false;
/** アプリの起動時に一度呼ぶ。ブックマークレットから開かれていれば、開いたタブに接続を頼む */
export function initOfficialBridge(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  setOfficialFetcher(bridgeFetcher);
  window.addEventListener('message', onMessage);
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
