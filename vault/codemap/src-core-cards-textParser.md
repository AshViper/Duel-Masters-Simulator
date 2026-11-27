---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3980行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L220 **export** fn `lineDefKey`
- L227 fn `findLineDef`
- L237 fn `stripIcons`
- L242 fn `normalizeKeepSpace`
- L363 **export** fn `applyKeywordLine`
- L421 type `ParsedTrigger`
- L444 fn `parseOtherTrigger`
- L475 fn `parseTrigger`
- L556 fn `stripOptional`
- L572 fn `parseMods`
- L641 fn `civList`
- L645 fn `setRaces`
- L660 fn `parseObject`
- L728 type `Zone`
- L729 type `VerbRule`
- L771 fn `parseSelfVerb`
- L789 fn `parseTargeted`
- L827 fn `parseGrant`
- L845 fn `parseSubject`
- L873 fn `refTarget`
- L879 fn `refAnyZone`
- L885 fn `choosesCards`
- L891 fn `parseRefSentence`
- L951 fn `parseSentence`
- L1344 fn `splitClauses`
- L1361 interface `Group`
- L1367 fn `flattenGroups`
- L1372 fn `hasRealEffect`
- L1382 fn `parseBothCondition`
- L1414 fn `parseBody`
- L1762 fn `pushGroup`
- L1771 fn `parseLook`
- L1901 fn `parseLookMulti`
- L1964 fn `parseRevealIf`
- L1987 fn `parsePickWhat`
- L2028 fn `parsePer`
- L2050 fn `parseSelfCost`
- L2063 fn `parseStatic`
- L2356 fn `parseFromReminder`
- L2411 fn `mergeParsed`
- L2423 fn `parseGateTrigger`
- L2446 fn `parseZoneGate`
- L2469 fn `parseGrantFrame`
- L2478 **export** fn `splitAbilityLines`
- L2529 **export** fn `parseAbilityText`
- L2771 fn `parseOverloadBody`
- L2789 fn `readByGrammar`
- L2794 fn `mergeGrammar`
- L2803 type `Snapshot`
- L2804 fn `snapshot`
- L2808 fn `restore`
- L2821 fn `parseAwakenLink`
- L2829 fn `splitCondition`
- L3071 fn `parseLine`
- L3640 fn `isUnsafe`
- L3645 fn `selfKeywordStatic`
- L3653 fn `parseMark`
- L3717 fn `parseAltPlay`
- L3746 fn `evolveFilter`
- L3768 fn `parseEvolveSpec`
- L3807 fn `sClassZones`
- L3823 fn `parseSwapCondition`
- L3851 fn `parseReplacement`
- L3963 **export** fn `explainManual`

