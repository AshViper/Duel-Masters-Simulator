---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4214行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L253 **export** fn `lineDefKey`
- L260 fn `findLineDef`
- L270 fn `stripIcons`
- L275 fn `normalizeKeepSpace`
- L399 **export** fn `applyKeywordLine`
- L458 type `ParsedTrigger`
- L481 fn `parseOtherTrigger`
- L512 fn `parseTrigger`
- L599 fn `stripOptional`
- L615 fn `parseMods`
- L691 fn `civList`
- L695 fn `setRaces`
- L710 fn `parseObject`
- L778 type `Zone`
- L779 type `VerbRule`
- L825 fn `parseSelfVerb`
- L843 fn `parseTargeted`
- L887 fn `parseGrant`
- L905 fn `parseSubject`
- L933 fn `refTarget`
- L939 fn `refAnyZone`
- L945 fn `choosesCards`
- L951 fn `parseRefSentence`
- L1018 fn `parseSentence`
- L1470 fn `splitClauses`
- L1487 interface `Group`
- L1493 fn `flattenGroups`
- L1498 fn `hasRealEffect`
- L1508 fn `parseBothCondition`
- L1540 fn `parseBody`
- L1894 fn `pushGroup`
- L1903 fn `parseLook`
- L2033 fn `parseLookMulti`
- L2096 fn `parseRevealIf`
- L2119 fn `parsePickWhat`
- L2170 fn `parsePer`
- L2192 fn `parseSelfCost`
- L2205 fn `parseStatic`
- L2508 fn `parseFromReminder`
- L2563 fn `mergeParsed`
- L2575 fn `parseGateTrigger`
- L2598 fn `parseZoneGate`
- L2621 fn `parseGrantFrame`
- L2630 **export** fn `splitAbilityLines`
- L2681 **export** fn `parseAbilityText`
- L2938 fn `parseOverloadBody`
- L2956 fn `readByGrammar`
- L2961 fn `mergeGrammar`
- L2970 type `Snapshot`
- L2971 fn `snapshot`
- L2975 fn `restore`
- L2988 fn `parseAwakenLink`
- L2996 fn `splitCondition`
- L3254 fn `parseLine`
- L3852 fn `isUnsafe`
- L3857 fn `selfKeywordStatic`
- L3865 fn `parseMark`
- L3935 fn `parseAltPlay`
- L3980 fn `evolveFilter`
- L4002 fn `parseEvolveSpec`
- L4041 fn `sClassZones`
- L4057 fn `parseSwapCondition`
- L4085 fn `parseReplacement`
- L4197 **export** fn `explainManual`

