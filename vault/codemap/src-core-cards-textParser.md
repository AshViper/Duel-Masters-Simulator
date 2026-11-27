---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4018行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L228 **export** fn `lineDefKey`
- L235 fn `findLineDef`
- L245 fn `stripIcons`
- L250 fn `normalizeKeepSpace`
- L372 **export** fn `applyKeywordLine`
- L430 type `ParsedTrigger`
- L453 fn `parseOtherTrigger`
- L484 fn `parseTrigger`
- L565 fn `stripOptional`
- L581 fn `parseMods`
- L650 fn `civList`
- L654 fn `setRaces`
- L669 fn `parseObject`
- L737 type `Zone`
- L738 type `VerbRule`
- L780 fn `parseSelfVerb`
- L798 fn `parseTargeted`
- L836 fn `parseGrant`
- L854 fn `parseSubject`
- L882 fn `refTarget`
- L888 fn `refAnyZone`
- L894 fn `choosesCards`
- L900 fn `parseRefSentence`
- L967 fn `parseSentence`
- L1382 fn `splitClauses`
- L1399 interface `Group`
- L1405 fn `flattenGroups`
- L1410 fn `hasRealEffect`
- L1420 fn `parseBothCondition`
- L1452 fn `parseBody`
- L1800 fn `pushGroup`
- L1809 fn `parseLook`
- L1939 fn `parseLookMulti`
- L2002 fn `parseRevealIf`
- L2025 fn `parsePickWhat`
- L2066 fn `parsePer`
- L2088 fn `parseSelfCost`
- L2101 fn `parseStatic`
- L2394 fn `parseFromReminder`
- L2449 fn `mergeParsed`
- L2461 fn `parseGateTrigger`
- L2484 fn `parseZoneGate`
- L2507 fn `parseGrantFrame`
- L2516 **export** fn `splitAbilityLines`
- L2567 **export** fn `parseAbilityText`
- L2809 fn `parseOverloadBody`
- L2827 fn `readByGrammar`
- L2832 fn `mergeGrammar`
- L2841 type `Snapshot`
- L2842 fn `snapshot`
- L2846 fn `restore`
- L2859 fn `parseAwakenLink`
- L2867 fn `splitCondition`
- L3109 fn `parseLine`
- L3678 fn `isUnsafe`
- L3683 fn `selfKeywordStatic`
- L3691 fn `parseMark`
- L3755 fn `parseAltPlay`
- L3784 fn `evolveFilter`
- L3806 fn `parseEvolveSpec`
- L3845 fn `sClassZones`
- L3861 fn `parseSwapCondition`
- L3889 fn `parseReplacement`
- L4001 **export** fn `explainManual`

