---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4190行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L251 **export** fn `lineDefKey`
- L258 fn `findLineDef`
- L268 fn `stripIcons`
- L273 fn `normalizeKeepSpace`
- L397 **export** fn `applyKeywordLine`
- L456 type `ParsedTrigger`
- L479 fn `parseOtherTrigger`
- L510 fn `parseTrigger`
- L597 fn `stripOptional`
- L613 fn `parseMods`
- L689 fn `civList`
- L693 fn `setRaces`
- L708 fn `parseObject`
- L776 type `Zone`
- L777 type `VerbRule`
- L823 fn `parseSelfVerb`
- L841 fn `parseTargeted`
- L885 fn `parseGrant`
- L903 fn `parseSubject`
- L931 fn `refTarget`
- L937 fn `refAnyZone`
- L943 fn `choosesCards`
- L949 fn `parseRefSentence`
- L1016 fn `parseSentence`
- L1465 fn `splitClauses`
- L1482 interface `Group`
- L1488 fn `flattenGroups`
- L1493 fn `hasRealEffect`
- L1503 fn `parseBothCondition`
- L1535 fn `parseBody`
- L1889 fn `pushGroup`
- L1898 fn `parseLook`
- L2028 fn `parseLookMulti`
- L2091 fn `parseRevealIf`
- L2114 fn `parsePickWhat`
- L2165 fn `parsePer`
- L2187 fn `parseSelfCost`
- L2200 fn `parseStatic`
- L2503 fn `parseFromReminder`
- L2558 fn `mergeParsed`
- L2570 fn `parseGateTrigger`
- L2593 fn `parseZoneGate`
- L2616 fn `parseGrantFrame`
- L2625 **export** fn `splitAbilityLines`
- L2676 **export** fn `parseAbilityText`
- L2933 fn `parseOverloadBody`
- L2951 fn `readByGrammar`
- L2956 fn `mergeGrammar`
- L2965 type `Snapshot`
- L2966 fn `snapshot`
- L2970 fn `restore`
- L2983 fn `parseAwakenLink`
- L2991 fn `splitCondition`
- L3249 fn `parseLine`
- L3844 fn `isUnsafe`
- L3849 fn `selfKeywordStatic`
- L3857 fn `parseMark`
- L3927 fn `parseAltPlay`
- L3956 fn `evolveFilter`
- L3978 fn `parseEvolveSpec`
- L4017 fn `sClassZones`
- L4033 fn `parseSwapCondition`
- L4061 fn `parseReplacement`
- L4173 **export** fn `explainManual`

