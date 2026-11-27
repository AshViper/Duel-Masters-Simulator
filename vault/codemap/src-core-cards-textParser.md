---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4372行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L259 **export** fn `lineDefKey`
- L266 fn `findLineDef`
- L276 fn `stripIcons`
- L281 fn `normalizeKeepSpace`
- L405 **export** fn `applyKeywordLine`
- L464 type `ParsedTrigger`
- L487 fn `parseOtherTrigger`
- L518 fn `parseTrigger`
- L605 fn `stripOptional`
- L621 fn `parseMods`
- L698 fn `civList`
- L702 fn `setRaces`
- L717 fn `parseObject`
- L785 type `Zone`
- L786 type `VerbRule`
- L832 fn `parseSelfVerb`
- L850 fn `parseTargeted`
- L894 fn `parseGrant`
- L916 fn `parseSubject`
- L944 fn `refTarget`
- L950 fn `refAnyZone`
- L956 fn `choosesCards`
- L962 fn `parseRefSentence`
- L1029 fn `parseSentence`
- L1497 fn `splitClauses`
- L1514 interface `Group`
- L1520 fn `flattenGroups`
- L1525 fn `hasRealEffect`
- L1535 fn `parseBothCondition`
- L1567 fn `parseBody`
- L1942 fn `pushGroup`
- L1951 fn `parseLook`
- L2083 fn `parseLookMulti`
- L2147 fn `parseRevealAll`
- L2166 fn `parseRevealIf`
- L2189 fn `parsePickWhat`
- L2240 fn `parsePer`
- L2262 fn `parseSelfCost`
- L2275 fn `parseStatic`
- L2585 fn `parseFromReminder`
- L2640 fn `mergeParsed`
- L2652 fn `parseGateTrigger`
- L2675 fn `parseZoneGate`
- L2698 fn `parseGrantFrame`
- L2707 **export** fn `splitAbilityLines`
- L2758 **export** fn `parseAbilityText`
- L3015 fn `parseOverloadBody`
- L3033 fn `readByGrammar`
- L3040 fn `mergeGrammar`
- L3049 type `Snapshot`
- L3050 fn `snapshot`
- L3054 fn `restore`
- L3067 fn `parseAwakenLink`
- L3075 fn `splitCondition`
- L3360 fn `parseLine`
- L3979 fn `isUnsafe`
- L3984 fn `selfKeywordStatic`
- L3992 fn `parseMark`
- L4080 fn `parseAltPlay`
- L4138 fn `evolveFilter`
- L4160 fn `parseEvolveSpec`
- L4199 fn `sClassZones`
- L4215 fn `parseSwapCondition`
- L4243 fn `parseReplacement`
- L4355 **export** fn `explainManual`

