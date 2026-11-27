---
tags: [howto]
updated: 2026-11-27
---
# 公式カード検索・保存・変換

- 取得と HTML 解析：`src/server/dmOfficial.ts`（間隔 400ms、10分キャッシュ）。公式サイトの HTML 構造に依存。
- ローカル版の中継：`src/server/dmApi.ts` + `vitePlugin.ts`（`/dm-api/...`）
- Pages 版の中継：ブックマークレット（`src/ui/officialBridge.ts`、`OfficialBridgePanel` / `BridgeImport`）
- 変換：`src/core/cards/officialConvert.ts` の `convertOfficialCard`。保存済みカードの読み直しは `applyParsedEffects`（古い版で保存した形の直しもここ）
- 保存先：IndexedDB（`src/db`）、画像は `imageCache.ts`、まとめての書き出し／読み込みは `backup.ts`
- デッキ文字列の読み取り：`src/core/deck/deckText.ts`（名前の照合は `normalizeCardName` / `nameMatchScore`）

詳しい使い方は README.md の「公式カード検索と保存」「GitHub Pages で公式カード検索を使う」。
