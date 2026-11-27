---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/officialConvert.ts（333行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カード検索の詳細（OfficialCardDetail）を、デッキ構築・対戦で使うカード定義に変換する。

## トップレベル

- L8 **export** const `OFFICIAL_PREFIX`
- L9 **export** const `OFFICIAL_SET_PREFIX`
- L13 **export** fn `officialCardId`
- L17 **export** fn `officialImageRef`
- L21 fn `parseNumber`
- L27 fn `parseCivs`
- L35 fn `mapType`
- L52 fn `faceText`
- L57 fn `manualEffectCount`
- L72 **export** fn `convertOfficialCard`
- L149 **export** fn `splitTwinName`
- L154 fn `isForbiddenLabel`
- L159 fn `forbiddenSealCount`
- L167 **export** fn `faceKind`
- L179 **export** fn `applyParsedEffects`
- L308 type `AbilitySet`
- L309 fn `hasAny`
- L313 fn `compact`
- L323 fn `twinKeywords`

