---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4066行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L239 **export** fn `lineDefKey`
- L246 fn `findLineDef`
- L256 fn `stripIcons`
- L261 fn `normalizeKeepSpace`
- L383 **export** fn `applyKeywordLine`
- L442 type `ParsedTrigger`
- L465 fn `parseOtherTrigger`
- L496 fn `parseTrigger`
- L577 fn `stripOptional`
- L593 fn `parseMods`
- L663 fn `civList`
- L667 fn `setRaces`
- L682 fn `parseObject`
- L750 type `Zone`
- L751 type `VerbRule`
- L793 fn `parseSelfVerb`
- L811 fn `parseTargeted`
- L849 fn `parseGrant`
- L867 fn `parseSubject`
- L895 fn `refTarget`
- L901 fn `refAnyZone`
- L907 fn `choosesCards`
- L913 fn `parseRefSentence`
- L980 fn `parseSentence`
- L1409 fn `splitClauses`
- L1426 interface `Group`
- L1432 fn `flattenGroups`
- L1437 fn `hasRealEffect`
- L1447 fn `parseBothCondition`
- L1479 fn `parseBody`
- L1827 fn `pushGroup`
- L1836 fn `parseLook`
- L1966 fn `parseLookMulti`
- L2029 fn `parseRevealIf`
- L2052 fn `parsePickWhat`
- L2093 fn `parsePer`
- L2115 fn `parseSelfCost`
- L2128 fn `parseStatic`
- L2421 fn `parseFromReminder`
- L2476 fn `mergeParsed`
- L2488 fn `parseGateTrigger`
- L2511 fn `parseZoneGate`
- L2534 fn `parseGrantFrame`
- L2543 **export** fn `splitAbilityLines`
- L2594 **export** fn `parseAbilityText`
- L2851 fn `parseOverloadBody`
- L2869 fn `readByGrammar`
- L2874 fn `mergeGrammar`
- L2883 type `Snapshot`
- L2884 fn `snapshot`
- L2888 fn `restore`
- L2901 fn `parseAwakenLink`
- L2909 fn `splitCondition`
- L3151 fn `parseLine`
- L3720 fn `isUnsafe`
- L3725 fn `selfKeywordStatic`
- L3733 fn `parseMark`
- L3803 fn `parseAltPlay`
- L3832 fn `evolveFilter`
- L3854 fn `parseEvolveSpec`
- L3893 fn `sClassZones`
- L3909 fn `parseSwapCondition`
- L3937 fn `parseReplacement`
- L4049 **export** fn `explainManual`

