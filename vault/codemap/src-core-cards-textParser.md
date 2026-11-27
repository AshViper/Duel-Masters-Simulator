---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3227行）

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
- L1084 fn `splitClauses`
- L1101 interface `Group`
- L1107 fn `flattenGroups`
- L1112 fn `hasRealEffect`
- L1122 fn `parseBothCondition`
- L1154 fn `parseBody`
- L1450 fn `pushGroup`
- L1459 fn `parseLook`
- L1589 fn `parseLookMulti`
- L1652 fn `parseRevealIf`
- L1675 fn `parsePickWhat`
- L1709 fn `parsePer`
- L1731 fn `parseSelfCost`
- L1742 fn `parseStatic`
- L1976 fn `parseFromReminder`
- L2031 fn `mergeParsed`
- L2043 fn `parseGateTrigger`
- L2066 fn `parseZoneGate`
- L2089 fn `parseGrantFrame`
- L2098 **export** fn `splitAbilityLines`
- L2143 **export** fn `parseAbilityText`
- L2295 fn `readByGrammar`
- L2300 fn `mergeGrammar`
- L2309 type `Snapshot`
- L2310 fn `snapshot`
- L2314 fn `restore`
- L2327 fn `parseAwakenLink`
- L2335 fn `splitCondition`
- L2518 fn `parseLine`
- L2981 fn `isUnsafe`
- L2986 fn `selfKeywordStatic`
- L2994 fn `parseMark`
- L3032 fn `parseAltPlay`
- L3061 fn `evolveFilter`
- L3083 fn `parseEvolveSpec`
- L3122 fn `sClassZones`
- L3138 fn `parseSwapCondition`
- L3160 fn `parseReplacement`
- L3210 **export** fn `explainManual`

