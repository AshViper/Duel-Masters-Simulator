---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3607行）

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
- L1217 fn `splitClauses`
- L1234 interface `Group`
- L1240 fn `flattenGroups`
- L1245 fn `hasRealEffect`
- L1255 fn `parseBothCondition`
- L1287 fn `parseBody`
- L1620 fn `pushGroup`
- L1629 fn `parseLook`
- L1759 fn `parseLookMulti`
- L1822 fn `parseRevealIf`
- L1845 fn `parsePickWhat`
- L1886 fn `parsePer`
- L1908 fn `parseSelfCost`
- L1921 fn `parseStatic`
- L2199 fn `parseFromReminder`
- L2254 fn `mergeParsed`
- L2266 fn `parseGateTrigger`
- L2289 fn `parseZoneGate`
- L2312 fn `parseGrantFrame`
- L2321 **export** fn `splitAbilityLines`
- L2366 **export** fn `parseAbilityText`
- L2559 fn `parseOverloadBody`
- L2577 fn `readByGrammar`
- L2582 fn `mergeGrammar`
- L2591 type `Snapshot`
- L2592 fn `snapshot`
- L2596 fn `restore`
- L2609 fn `parseAwakenLink`
- L2617 fn `splitCondition`
- L2823 fn `parseLine`
- L3329 fn `isUnsafe`
- L3334 fn `selfKeywordStatic`
- L3342 fn `parseMark`
- L3406 fn `parseAltPlay`
- L3435 fn `evolveFilter`
- L3457 fn `parseEvolveSpec`
- L3496 fn `sClassZones`
- L3512 fn `parseSwapCondition`
- L3534 fn `parseReplacement`
- L3590 **export** fn `explainManual`

