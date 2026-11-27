---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3213行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L166 **export** fn `lineDefKey`
- L173 fn `findLineDef`
- L183 fn `stripIcons`
- L188 fn `normalizeKeepSpace`
- L278 **export** fn `applyKeywordLine`
- L334 type `ParsedTrigger`
- L354 fn `parseOtherTrigger`
- L385 fn `parseTrigger`
- L464 fn `stripOptional`
- L479 fn `parseMods`
- L542 fn `civList`
- L546 fn `setRaces`
- L561 fn `parseObject`
- L626 type `Zone`
- L627 type `VerbRule`
- L669 fn `parseSelfVerb`
- L687 fn `parseTargeted`
- L719 fn `parseGrant`
- L733 fn `parseSubject`
- L761 fn `refTarget`
- L767 fn `refAnyZone`
- L773 fn `choosesCards`
- L779 fn `parseRefSentence`
- L830 fn `parseSentence`
- L1082 fn `splitClauses`
- L1099 interface `Group`
- L1105 fn `flattenGroups`
- L1110 fn `hasRealEffect`
- L1120 fn `parseBothCondition`
- L1152 fn `parseBody`
- L1448 fn `pushGroup`
- L1457 fn `parseLook`
- L1587 fn `parseLookMulti`
- L1650 fn `parseRevealIf`
- L1673 fn `parsePickWhat`
- L1707 fn `parsePer`
- L1729 fn `parseSelfCost`
- L1740 fn `parseStatic`
- L1974 fn `parseFromReminder`
- L2029 fn `mergeParsed`
- L2041 fn `parseGateTrigger`
- L2064 fn `parseZoneGate`
- L2087 fn `parseGrantFrame`
- L2096 **export** fn `splitAbilityLines`
- L2141 **export** fn `parseAbilityText`
- L2282 fn `readByGrammar`
- L2287 fn `mergeGrammar`
- L2295 type `Snapshot`
- L2296 fn `snapshot`
- L2300 fn `restore`
- L2313 fn `parseAwakenLink`
- L2321 fn `splitCondition`
- L2504 fn `parseLine`
- L2967 fn `isUnsafe`
- L2972 fn `selfKeywordStatic`
- L2980 fn `parseMark`
- L3018 fn `parseAltPlay`
- L3047 fn `evolveFilter`
- L3069 fn `parseEvolveSpec`
- L3108 fn `sClassZones`
- L3124 fn `parseSwapCondition`
- L3146 fn `parseReplacement`
- L3196 **export** fn `explainManual`

