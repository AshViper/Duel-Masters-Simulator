---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/ui/officialBridge.ts（259行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

中継サーバーのない環境（GitHub Pages 版）で公式カード検索を使うための「ブリッジ」。

## トップレベル

- L41 **export** fn `isBridgeConnected`
- L46 **export** type `BridgeKind`
- L47 fn `bridgeKind`
- L52 **export** fn `useBridgeKind`
- L63 **export** fn `useBridgeConnected`
- L122 **export** interface `BridgeImportRequest`
- L130 fn `takeNewRequest`
- L142 **export** fn `useBridgeImportRequest`
- L152 **export** fn `clearBridgeImportRequest`
- L157 type `BridgeMessage`
- L159 fn `settle`
- L167 fn `onMessage`
- L190 fn `readImportHash`
- L203 **export** fn `initOfficialBridge`
- L227 **export** fn `bookmarkletHref`

