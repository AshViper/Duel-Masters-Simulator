---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3811行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L210 **export** fn `lineDefKey`
- L217 fn `findLineDef`
- L227 fn `stripIcons`
- L232 fn `normalizeKeepSpace`
- L351 **export** fn `applyKeywordLine`
- L408 type `ParsedTrigger`
- L430 fn `parseOtherTrigger`
- L461 fn `parseTrigger`
- L542 fn `stripOptional`
- L558 fn `parseMods`
- L626 fn `civList`
- L630 fn `setRaces`
- L645 fn `parseObject`
- L713 type `Zone`
- L714 type `VerbRule`
- L756 fn `parseSelfVerb`
- L774 fn `parseTargeted`
- L812 fn `parseGrant`
- L830 fn `parseSubject`
- L858 fn `refTarget`
- L864 fn `refAnyZone`
- L870 fn `choosesCards`
- L876 fn `parseRefSentence`
- L936 fn `parseSentence`
- L1318 fn `splitClauses`
- L1335 interface `Group`
- L1341 fn `flattenGroups`
- L1346 fn `hasRealEffect`
- L1356 fn `parseBothCondition`
- L1388 fn `parseBody`
- L1729 fn `pushGroup`
- L1738 fn `parseLook`
- L1868 fn `parseLookMulti`
- L1931 fn `parseRevealIf`
- L1954 fn `parsePickWhat`
- L1995 fn `parsePer`
- L2017 fn `parseSelfCost`
- L2030 fn `parseStatic`
- L2308 fn `parseFromReminder`
- L2363 fn `mergeParsed`
- L2375 fn `parseGateTrigger`
- L2398 fn `parseZoneGate`
- L2421 fn `parseGrantFrame`
- L2430 **export** fn `splitAbilityLines`
- L2481 **export** fn `parseAbilityText`
- L2697 fn `parseOverloadBody`
- L2715 fn `readByGrammar`
- L2720 fn `mergeGrammar`
- L2729 type `Snapshot`
- L2730 fn `snapshot`
- L2734 fn `restore`
- L2747 fn `parseAwakenLink`
- L2755 fn `splitCondition`
- L2978 fn `parseLine`
- L3518 fn `isUnsafe`
- L3523 fn `selfKeywordStatic`
- L3531 fn `parseMark`
- L3595 fn `parseAltPlay`
- L3624 fn `evolveFilter`
- L3646 fn `parseEvolveSpec`
- L3685 fn `sClassZones`
- L3701 fn `parseSwapCondition`
- L3723 fn `parseReplacement`
- L3794 **export** fn `explainManual`

