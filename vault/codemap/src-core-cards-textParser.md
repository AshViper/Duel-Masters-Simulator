---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4310行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L257 **export** fn `lineDefKey`
- L264 fn `findLineDef`
- L274 fn `stripIcons`
- L279 fn `normalizeKeepSpace`
- L403 **export** fn `applyKeywordLine`
- L462 type `ParsedTrigger`
- L485 fn `parseOtherTrigger`
- L516 fn `parseTrigger`
- L603 fn `stripOptional`
- L619 fn `parseMods`
- L696 fn `civList`
- L700 fn `setRaces`
- L715 fn `parseObject`
- L783 type `Zone`
- L784 type `VerbRule`
- L830 fn `parseSelfVerb`
- L848 fn `parseTargeted`
- L892 fn `parseGrant`
- L914 fn `parseSubject`
- L942 fn `refTarget`
- L948 fn `refAnyZone`
- L954 fn `choosesCards`
- L960 fn `parseRefSentence`
- L1027 fn `parseSentence`
- L1482 fn `splitClauses`
- L1499 interface `Group`
- L1505 fn `flattenGroups`
- L1510 fn `hasRealEffect`
- L1520 fn `parseBothCondition`
- L1552 fn `parseBody`
- L1919 fn `pushGroup`
- L1928 fn `parseLook`
- L2060 fn `parseLookMulti`
- L2124 fn `parseRevealAll`
- L2143 fn `parseRevealIf`
- L2166 fn `parsePickWhat`
- L2217 fn `parsePer`
- L2239 fn `parseSelfCost`
- L2252 fn `parseStatic`
- L2561 fn `parseFromReminder`
- L2616 fn `mergeParsed`
- L2628 fn `parseGateTrigger`
- L2651 fn `parseZoneGate`
- L2674 fn `parseGrantFrame`
- L2683 **export** fn `splitAbilityLines`
- L2734 **export** fn `parseAbilityText`
- L2991 fn `parseOverloadBody`
- L3009 fn `readByGrammar`
- L3016 fn `mergeGrammar`
- L3025 type `Snapshot`
- L3026 fn `snapshot`
- L3030 fn `restore`
- L3043 fn `parseAwakenLink`
- L3051 fn `splitCondition`
- L3316 fn `parseLine`
- L3935 fn `isUnsafe`
- L3940 fn `selfKeywordStatic`
- L3948 fn `parseMark`
- L4018 fn `parseAltPlay`
- L4076 fn `evolveFilter`
- L4098 fn `parseEvolveSpec`
- L4137 fn `sClassZones`
- L4153 fn `parseSwapCondition`
- L4181 fn `parseReplacement`
- L4293 **export** fn `explainManual`

