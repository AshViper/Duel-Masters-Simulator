---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4385行）

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
- L1504 fn `splitClauses`
- L1521 interface `Group`
- L1527 fn `flattenGroups`
- L1532 fn `hasRealEffect`
- L1542 fn `parseBothCondition`
- L1574 fn `parseBody`
- L1949 fn `pushGroup`
- L1958 fn `parseLook`
- L2090 fn `parseLookMulti`
- L2154 fn `parseRevealAll`
- L2173 fn `parseRevealIf`
- L2196 fn `parsePickWhat`
- L2247 fn `parsePer`
- L2269 fn `parseSelfCost`
- L2282 fn `parseStatic`
- L2592 fn `parseFromReminder`
- L2647 fn `mergeParsed`
- L2659 fn `parseGateTrigger`
- L2682 fn `parseZoneGate`
- L2705 fn `parseGrantFrame`
- L2714 **export** fn `splitAbilityLines`
- L2765 **export** fn `parseAbilityText`
- L3022 fn `parseOverloadBody`
- L3040 fn `readByGrammar`
- L3047 fn `mergeGrammar`
- L3056 type `Snapshot`
- L3057 fn `snapshot`
- L3061 fn `restore`
- L3074 fn `parseAwakenLink`
- L3082 fn `splitCondition`
- L3373 fn `parseLine`
- L3992 fn `isUnsafe`
- L3997 fn `selfKeywordStatic`
- L4005 fn `parseMark`
- L4093 fn `parseAltPlay`
- L4151 fn `evolveFilter`
- L4173 fn `parseEvolveSpec`
- L4212 fn `sClassZones`
- L4228 fn `parseSwapCondition`
- L4256 fn `parseReplacement`
- L4368 **export** fn `explainManual`

