---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4106行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L245 **export** fn `lineDefKey`
- L252 fn `findLineDef`
- L262 fn `stripIcons`
- L267 fn `normalizeKeepSpace`
- L389 **export** fn `applyKeywordLine`
- L448 type `ParsedTrigger`
- L471 fn `parseOtherTrigger`
- L502 fn `parseTrigger`
- L583 fn `stripOptional`
- L599 fn `parseMods`
- L673 fn `civList`
- L677 fn `setRaces`
- L692 fn `parseObject`
- L760 type `Zone`
- L761 type `VerbRule`
- L803 fn `parseSelfVerb`
- L821 fn `parseTargeted`
- L859 fn `parseGrant`
- L877 fn `parseSubject`
- L905 fn `refTarget`
- L911 fn `refAnyZone`
- L917 fn `choosesCards`
- L923 fn `parseRefSentence`
- L990 fn `parseSentence`
- L1436 fn `splitClauses`
- L1453 interface `Group`
- L1459 fn `flattenGroups`
- L1464 fn `hasRealEffect`
- L1474 fn `parseBothCondition`
- L1506 fn `parseBody`
- L1860 fn `pushGroup`
- L1869 fn `parseLook`
- L1999 fn `parseLookMulti`
- L2062 fn `parseRevealIf`
- L2085 fn `parsePickWhat`
- L2126 fn `parsePer`
- L2148 fn `parseSelfCost`
- L2161 fn `parseStatic`
- L2454 fn `parseFromReminder`
- L2509 fn `mergeParsed`
- L2521 fn `parseGateTrigger`
- L2544 fn `parseZoneGate`
- L2567 fn `parseGrantFrame`
- L2576 **export** fn `splitAbilityLines`
- L2627 **export** fn `parseAbilityText`
- L2884 fn `parseOverloadBody`
- L2902 fn `readByGrammar`
- L2907 fn `mergeGrammar`
- L2916 type `Snapshot`
- L2917 fn `snapshot`
- L2921 fn `restore`
- L2934 fn `parseAwakenLink`
- L2942 fn `splitCondition`
- L3191 fn `parseLine`
- L3760 fn `isUnsafe`
- L3765 fn `selfKeywordStatic`
- L3773 fn `parseMark`
- L3843 fn `parseAltPlay`
- L3872 fn `evolveFilter`
- L3894 fn `parseEvolveSpec`
- L3933 fn `sClassZones`
- L3949 fn `parseSwapCondition`
- L3977 fn `parseReplacement`
- L4089 **export** fn `explainManual`

