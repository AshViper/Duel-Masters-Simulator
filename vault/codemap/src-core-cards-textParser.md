---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4262行）

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
- L1901 fn `pushGroup`
- L1910 fn `parseLook`
- L2042 fn `parseLookMulti`
- L2106 fn `parseRevealAll`
- L2125 fn `parseRevealIf`
- L2148 fn `parsePickWhat`
- L2199 fn `parsePer`
- L2221 fn `parseSelfCost`
- L2234 fn `parseStatic`
- L2537 fn `parseFromReminder`
- L2592 fn `mergeParsed`
- L2604 fn `parseGateTrigger`
- L2627 fn `parseZoneGate`
- L2650 fn `parseGrantFrame`
- L2659 **export** fn `splitAbilityLines`
- L2710 **export** fn `parseAbilityText`
- L2967 fn `parseOverloadBody`
- L2985 fn `readByGrammar`
- L2990 fn `mergeGrammar`
- L2999 type `Snapshot`
- L3000 fn `snapshot`
- L3004 fn `restore`
- L3017 fn `parseAwakenLink`
- L3025 fn `splitCondition`
- L3283 fn `parseLine`
- L3900 fn `isUnsafe`
- L3905 fn `selfKeywordStatic`
- L3913 fn `parseMark`
- L3983 fn `parseAltPlay`
- L4028 fn `evolveFilter`
- L4050 fn `parseEvolveSpec`
- L4089 fn `sClassZones`
- L4105 fn `parseSwapCondition`
- L4133 fn `parseReplacement`
- L4245 **export** fn `explainManual`

