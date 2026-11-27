---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4022行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L231 **export** fn `lineDefKey`
- L238 fn `findLineDef`
- L248 fn `stripIcons`
- L253 fn `normalizeKeepSpace`
- L375 **export** fn `applyKeywordLine`
- L434 type `ParsedTrigger`
- L457 fn `parseOtherTrigger`
- L488 fn `parseTrigger`
- L569 fn `stripOptional`
- L585 fn `parseMods`
- L654 fn `civList`
- L658 fn `setRaces`
- L673 fn `parseObject`
- L741 type `Zone`
- L742 type `VerbRule`
- L784 fn `parseSelfVerb`
- L802 fn `parseTargeted`
- L840 fn `parseGrant`
- L858 fn `parseSubject`
- L886 fn `refTarget`
- L892 fn `refAnyZone`
- L898 fn `choosesCards`
- L904 fn `parseRefSentence`
- L971 fn `parseSentence`
- L1386 fn `splitClauses`
- L1403 interface `Group`
- L1409 fn `flattenGroups`
- L1414 fn `hasRealEffect`
- L1424 fn `parseBothCondition`
- L1456 fn `parseBody`
- L1804 fn `pushGroup`
- L1813 fn `parseLook`
- L1943 fn `parseLookMulti`
- L2006 fn `parseRevealIf`
- L2029 fn `parsePickWhat`
- L2070 fn `parsePer`
- L2092 fn `parseSelfCost`
- L2105 fn `parseStatic`
- L2398 fn `parseFromReminder`
- L2453 fn `mergeParsed`
- L2465 fn `parseGateTrigger`
- L2488 fn `parseZoneGate`
- L2511 fn `parseGrantFrame`
- L2520 **export** fn `splitAbilityLines`
- L2571 **export** fn `parseAbilityText`
- L2813 fn `parseOverloadBody`
- L2831 fn `readByGrammar`
- L2836 fn `mergeGrammar`
- L2845 type `Snapshot`
- L2846 fn `snapshot`
- L2850 fn `restore`
- L2863 fn `parseAwakenLink`
- L2871 fn `splitCondition`
- L3113 fn `parseLine`
- L3682 fn `isUnsafe`
- L3687 fn `selfKeywordStatic`
- L3695 fn `parseMark`
- L3759 fn `parseAltPlay`
- L3788 fn `evolveFilter`
- L3810 fn `parseEvolveSpec`
- L3849 fn `sClassZones`
- L3865 fn `parseSwapCondition`
- L3893 fn `parseReplacement`
- L4005 **export** fn `explainManual`

