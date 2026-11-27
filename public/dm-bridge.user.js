// ==UserScript==
// @name         DMシミュ 公式サイト自動接続
// @namespace    https://ashviper.github.io/Duel-Masters-Simulator/
// @version      1.0.0
// @description  デュエマ シミュレーター（GitHub Pages 版）を開くだけで、公式カード検索につながるようにする。公式サイトのページには「DMシミュへ保存」ボタンを出す。
// @match        https://ashviper.github.io/Duel-Masters-Simulator/*
// @match        https://dm.takaratomy.co.jp/card/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      dm.takaratomy.co.jp
// @run-at       document-start
// @updateURL    https://ashviper.github.io/Duel-Masters-Simulator/dm-bridge.user.js
// @downloadURL  https://ashviper.github.io/Duel-Masters-Simulator/dm-bridge.user.js
// ==/UserScript==

// 仕組み（アプリ側は src/ui/officialBridge.ts）
// - アプリのページでは、アプリからの dm-us-fetch を受けて公式サイトへ取得し、dm-us-result で返す。
//   ユーザースクリプトの取得（GM_xmlhttpRequest）は CORS の制限を受けないので、公式のタブは要らない。
//   取得するのは公式の /card/ と /wp-content/card/ だけ。Cookie は送らない。
// - 公式カード検索のページでは、そのページのカードをアプリに保存するボタンを出す（アプリを #dm-import=... で開く）。
(() => {
  'use strict';
  const APP = 'https://ashviper.github.io/Duel-Masters-Simulator/';
  const DM = 'https://dm.takaratomy.co.jp';
  const VERSION = '1.0.0';

  if (location.origin === DM) {
    addSaveButton();
    return;
  }

  const gmRequest = (opts) => {
    if (typeof GM_xmlhttpRequest === 'function') return GM_xmlhttpRequest(opts);
    if (typeof GM !== 'undefined' && GM.xmlHttpRequest) return GM.xmlHttpRequest(opts);
    throw new Error('GM_xmlhttpRequest が使えません');
  };
  const post = (m) => window.postMessage(m, location.origin);
  const hello = () => post({ type: 'dm-us-hello', version: VERSION });

  window.addEventListener('message', (e) => {
    // サンドボックスでは window が包まれていて e.source と比べられないので、オリジンだけ確かめる
    if (e.origin !== location.origin) return;
    const m = e.data || {};
    if (m.type === 'dm-us-ping') return hello();
    if (m.type !== 'dm-us-fetch' || typeof m.id !== 'number') return;
    const fail = (error) => post({ type: 'dm-us-result', id: m.id, error });
    let u;
    try {
      u = new URL(m.url);
    } catch {
      return fail('URL が正しくありません');
    }
    if (u.origin !== DM || !/^\/(card\/|wp-content\/card\/)/.test(u.pathname)) return fail('許可していない URL です');
    const headers = { Referer: DM + '/card/' };
    for (const [k, v] of Object.entries(m.headers || {})) if (/^(content-type|x-requested-with)$/i.test(k)) headers[k] = String(v);
    try {
      gmRequest({
        method: m.method === 'POST' ? 'POST' : 'GET',
        url: u.href,
        data: m.method === 'POST' ? m.body : undefined,
        headers,
        responseType: 'arraybuffer',
        anonymous: true,
        timeout: 15000,
        onload: (r) => {
          const ct = /^content-type:\s*(.*)$/im.exec(r.responseHeaders || '');
          const bytes = r.response instanceof ArrayBuffer ? r.response : new ArrayBuffer(0);
          window.postMessage({ type: 'dm-us-result', id: m.id, status: r.status, contentType: ct ? ct[1].trim() : '', bytes }, location.origin);
        },
        onerror: () => fail('通信に失敗しました'),
        ontimeout: () => fail('時間切れです'),
      });
    } catch (x) {
      fail(String((x && x.message) || x));
    }
  });
  hello();

  function addSaveButton() {
    const pick = () => {
      const s = new Set();
      const q = new URLSearchParams(location.search);
      if (location.pathname.startsWith('/card/detail/') && q.get('id')) s.add(q.get('id'));
      document.querySelectorAll('img.cardImage[data-href]').forEach((i) => {
        const id = new URL(i.getAttribute('data-href'), location.href).searchParams.get('id');
        if (id) s.add(id);
      });
      return [...s].filter((x) => /^[A-Za-z0-9_-]+$/.test(x)).slice(0, 100);
    };
    const add = () => {
      if (!document.body || document.getElementById('dm-sim-save')) return;
      const b = document.createElement('button');
      b.id = 'dm-sim-save';
      b.textContent = 'DMシミュへ保存';
      b.title = 'このページに出ているカード（最大100枚）をデュエマ シミュレーターに保存します';
      b.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;padding:10px 16px;border:0;border-radius:8px;background:#1d5a3a;color:#fff;font-size:14px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)';
      b.onclick = () => {
        const ids = pick();
        if (!ids.length) return alert('このページにはカードが見つかりませんでした（検索結果かカードの詳細ページで押してください）');
        const nonce = Date.now() + '-' + Math.random().toString(36).slice(2);
        window.open(APP + '#dm-import=' + nonce + ':' + ids.join(','), 'dm-card-simulator');
      };
      document.body.appendChild(b);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
    else add();
  }
})();
