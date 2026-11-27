---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4159行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L249 **export** fn `lineDefKey`
- L256 fn `findLineDef`
- L266 fn `stripIcons`
- L271 fn `normalizeKeepSpace`
- L393 **export** fn `applyKeywordLine`
- L452 type `ParsedTrigger`
- L475 fn `parseOtherTrigger`
- L506 fn `parseTrigger`
- L593 fn `stripOptional`
- L609 fn `parseMods`
- L685 fn `civList`
- L689 fn `setRaces`
- L704 fn `parseObject`
- L772 type `Zone`
- L773 type `VerbRule`
- L819 fn `parseSelfVerb`
- L837 fn `parseTargeted`
- L881 fn `parseGrant`
- L899 fn `parseSubject`
- L927 fn `refTarget`
- L933 fn `refAnyZone`
- L939 fn `choosesCards`
- L945 fn `parseRefSentence`
- L1012 fn `parseSentence`
- L1458 fn `splitClauses`
- L1475 interface `Group`
- L1481 fn `flattenGroups`
- L1486 fn `hasRealEffect`
- L1496 fn `parseBothCondition`
- L1528 fn `parseBody`
- L1882 fn `pushGroup`
- L1891 fn `parseLook`
- L2021 fn `parseLookMulti`
- L2084 fn `parseRevealIf`
- L2107 fn `parsePickWhat`
- L2158 fn `parsePer`
- L2180 fn `parseSelfCost`
- L2193 fn `parseStatic`
- L2486 fn `parseFromReminder`
- L2541 fn `mergeParsed`
- L2553 fn `parseGateTrigger`
- L2576 fn `parseZoneGate`
- L2599 fn `parseGrantFrame`
- L2608 **export** fn `splitAbilityLines`
- L2659 **export** fn `parseAbilityText`
- L2916 fn `parseOverloadBody`
- L2934 fn `readByGrammar`
- L2939 fn `mergeGrammar`
- L2948 type `Snapshot`
- L2949 fn `snapshot`
- L2953 fn `restore`
- L2966 fn `parseAwakenLink`
- L2974 fn `splitCondition`
- L3232 fn `parseLine`
- L3813 fn `isUnsafe`
- L3818 fn `selfKeywordStatic`
- L3826 fn `parseMark`
- L3896 fn `parseAltPlay`
- L3925 fn `evolveFilter`
- L3947 fn `parseEvolveSpec`
- L3986 fn `sClassZones`
- L4002 fn `parseSwapCondition`
- L4030 fn `parseReplacement`
- L4142 **export** fn `explainManual`

