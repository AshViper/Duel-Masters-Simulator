---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3584行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L192 **export** fn `lineDefKey`
- L199 fn `findLineDef`
- L209 fn `stripIcons`
- L214 fn `normalizeKeepSpace`
- L315 **export** fn `applyKeywordLine`
- L372 type `ParsedTrigger`
- L392 fn `parseOtherTrigger`
- L423 fn `parseTrigger`
- L504 fn `stripOptional`
- L520 fn `parseMods`
- L588 fn `civList`
- L592 fn `setRaces`
- L607 fn `parseObject`
- L675 type `Zone`
- L676 type `VerbRule`
- L718 fn `parseSelfVerb`
- L736 fn `parseTargeted`
- L774 fn `parseGrant`
- L792 fn `parseSubject`
- L820 fn `refTarget`
- L826 fn `refAnyZone`
- L832 fn `choosesCards`
- L838 fn `parseRefSentence`
- L890 fn `parseSentence`
- L1196 fn `splitClauses`
- L1213 interface `Group`
- L1219 fn `flattenGroups`
- L1224 fn `hasRealEffect`
- L1234 fn `parseBothCondition`
- L1266 fn `parseBody`
- L1599 fn `pushGroup`
- L1608 fn `parseLook`
- L1738 fn `parseLookMulti`
- L1801 fn `parseRevealIf`
- L1824 fn `parsePickWhat`
- L1865 fn `parsePer`
- L1887 fn `parseSelfCost`
- L1900 fn `parseStatic`
- L2176 fn `parseFromReminder`
- L2231 fn `mergeParsed`
- L2243 fn `parseGateTrigger`
- L2266 fn `parseZoneGate`
- L2289 fn `parseGrantFrame`
- L2298 **export** fn `splitAbilityLines`
- L2343 **export** fn `parseAbilityText`
- L2536 fn `parseOverloadBody`
- L2554 fn `readByGrammar`
- L2559 fn `mergeGrammar`
- L2568 type `Snapshot`
- L2569 fn `snapshot`
- L2573 fn `restore`
- L2586 fn `parseAwakenLink`
- L2594 fn `splitCondition`
- L2800 fn `parseLine`
- L3306 fn `isUnsafe`
- L3311 fn `selfKeywordStatic`
- L3319 fn `parseMark`
- L3383 fn `parseAltPlay`
- L3412 fn `evolveFilter`
- L3434 fn `parseEvolveSpec`
- L3473 fn `sClassZones`
- L3489 fn `parseSwapCondition`
- L3511 fn `parseReplacement`
- L3567 **export** fn `explainManual`

