---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3232行）

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
- L629 type `Zone`
- L630 type `VerbRule`
- L672 fn `parseSelfVerb`
- L690 fn `parseTargeted`
- L722 fn `parseGrant`
- L736 fn `parseSubject`
- L764 fn `refTarget`
- L770 fn `refAnyZone`
- L776 fn `choosesCards`
- L782 fn `parseRefSentence`
- L833 fn `parseSentence`
- L1087 fn `splitClauses`
- L1104 interface `Group`
- L1110 fn `flattenGroups`
- L1115 fn `hasRealEffect`
- L1125 fn `parseBothCondition`
- L1157 fn `parseBody`
- L1453 fn `pushGroup`
- L1462 fn `parseLook`
- L1592 fn `parseLookMulti`
- L1655 fn `parseRevealIf`
- L1678 fn `parsePickWhat`
- L1714 fn `parsePer`
- L1736 fn `parseSelfCost`
- L1747 fn `parseStatic`
- L1981 fn `parseFromReminder`
- L2036 fn `mergeParsed`
- L2048 fn `parseGateTrigger`
- L2071 fn `parseZoneGate`
- L2094 fn `parseGrantFrame`
- L2103 **export** fn `splitAbilityLines`
- L2148 **export** fn `parseAbilityText`
- L2300 fn `readByGrammar`
- L2305 fn `mergeGrammar`
- L2314 type `Snapshot`
- L2315 fn `snapshot`
- L2319 fn `restore`
- L2332 fn `parseAwakenLink`
- L2340 fn `splitCondition`
- L2523 fn `parseLine`
- L2986 fn `isUnsafe`
- L2991 fn `selfKeywordStatic`
- L2999 fn `parseMark`
- L3037 fn `parseAltPlay`
- L3066 fn `evolveFilter`
- L3088 fn `parseEvolveSpec`
- L3127 fn `sClassZones`
- L3143 fn `parseSwapCondition`
- L3165 fn `parseReplacement`
- L3215 **export** fn `explainManual`

