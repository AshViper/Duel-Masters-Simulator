---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4515行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L265 **export** fn `lineDefKey`
- L272 fn `findLineDef`
- L282 fn `stripIcons`
- L287 fn `normalizeKeepSpace`
- L411 **export** fn `applyKeywordLine`
- L471 type `ParsedTrigger`
- L495 fn `parseOtherTrigger`
- L526 fn `parseTrigger`
- L613 fn `stripOptional`
- L629 fn `parseMods`
- L711 fn `civList`
- L715 fn `setRaces`
- L730 fn `parseObject`
- L798 type `Zone`
- L799 type `VerbRule`
- L845 fn `parseSelfVerb`
- L863 fn `parseTargeted`
- L907 fn `parseGrant`
- L929 fn `parseSubject`
- L957 fn `refTarget`
- L963 fn `refAnyZone`
- L969 fn `choosesCards`
- L975 fn `parseRefSentence`
- L1048 fn `parseSentence`
- L1532 fn `splitClauses`
- L1549 interface `Group`
- L1555 fn `flattenGroups`
- L1560 fn `hasRealEffect`
- L1570 fn `parseBothCondition`
- L1602 fn `parseBody`
- L2024 fn `pushGroup`
- L2033 fn `parseLook`
- L2169 fn `parseLookMulti`
- L2233 fn `parseRevealAll`
- L2252 fn `parseRevealIf`
- L2279 fn `parsePickWhat`
- L2339 fn `parsePer`
- L2361 fn `parseSelfCost`
- L2374 fn `parseStatic`
- L2686 fn `parseFromReminder`
- L2741 fn `mergeParsed`
- L2753 fn `parseGateTrigger`
- L2776 fn `parseZoneGate`
- L2799 fn `parseGrantFrame`
- L2808 **export** fn `splitAbilityLines`
- L2861 **export** fn `parseAbilityText`
- L3118 fn `parseOverloadBody`
- L3136 fn `readByGrammar`
- L3143 fn `mergeGrammar`
- L3152 type `Snapshot`
- L3153 fn `snapshot`
- L3157 fn `restore`
- L3170 fn `parseAwakenLink`
- L3178 fn `splitCondition`
- L3478 fn `parseLine`
- L4119 fn `isUnsafe`
- L4124 fn `selfKeywordStatic`
- L4132 fn `parseMark`
- L4220 fn `parseAltPlay`
- L4281 fn `evolveFilter`
- L4303 fn `parseEvolveSpec`
- L4342 fn `sClassZones`
- L4358 fn `parseSwapCondition`
- L4386 fn `parseReplacement`
- L4498 **export** fn `explainManual`

