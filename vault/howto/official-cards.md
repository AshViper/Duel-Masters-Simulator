---
tags: [howto]
updated: 2026-11-27
---
# 公式カード検索・保存・変換

- 取得と HTML 解析：`src/server/dmOfficial.ts`（間隔 400ms、10分キャッシュ）。公式サイトの HTML 構造に依存。
- ローカル版の中継：`src/server/dmApi.ts` + `vitePlugin.ts`（`/dm-api/...`）
- Pages 版の中継（いちばん上）：Cloudflare Worker `relay/worker.js`。アプリは `DEFAULT_RELAY_URL`（officialBridge.ts）へ公式と同じパスで投げる。localhost では使わない（`VITE_DM_RELAY_URL` を付けた時だけ）。中継が 403/429/5xx・届かない時は、スクリプトやタブがあればそちらで取り直し、なければ `relayOk=false` にして案内パネルを出す
  - 確かめ方：`relay/` で `npx wrangler@4 dev --port 8787`、`.env.development.local` に `VITE_DM_RELAY_URL=http://localhost:8787`（*.local は gitignore）。Origin のない curl は 403 になる（`-H "Origin: http://localhost:5173"` を付ける）
- Pages 版の中継（予備）：ユーザースクリプト `public/dm-bridge.user.js`（おすすめ・開くだけで自動接続）か、ブックマークレット。アプリ側はどちらも `src/ui/officialBridge.ts`（`OfficialBridgePanel` / `BridgeImport`）
  - スクリプトは同じページ内で `window.postMessage`（dm-us-ping/hello/fetch/result）。サンドボックスでは `window` が包まれていて `e.source === window` が成り立たないので、オリジンだけで確かめている。転送リスト（transfer）も Firefox の包みで失敗しうるので使わない
  - スクリプトは document-start で hello を送るので、アプリが後から listen しても取りこぼさないよう、アプリ側からも ping を送る
  - 公式ページの「DMシミュへ保存」はアプリを `#dm-import=<nonce>:<ids>` で開く（`readImportHash`）。保存はつながってから始める
  - `@match` は公開 URL（ashviper.github.io/Duel-Masters-Simulator）固定。フォークした時は書き換える
  - 確かめ方：開発サーバーのページで `GM_xmlhttpRequest` の偽物を前に付けてスクリプトを `new Function` で動かす（localhost では案内パネルは出ない）
- 変換：`src/core/cards/officialConvert.ts` の `convertOfficialCard`。保存済みカードの読み直しは `applyParsedEffects`（古い版で保存した形の直しもここ）
- 保存先：IndexedDB（`src/db`）、画像は `imageCache.ts`、まとめての書き出し／読み込みは `backup.ts`
- デッキ文字列の読み取り：`src/core/deck/deckText.ts`（名前の照合は `normalizeCardName` / `nameMatchScore`）

詳しい使い方は README.md の「公式カード検索と保存」「GitHub Pages で公式カード検索を使う」。
