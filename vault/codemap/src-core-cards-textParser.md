---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4501行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L265 **export** fn `lineDefKey`
- L272 fn `findLineDef`
- L282 fn `stripIcons`
- L287 fn `normalizeKeepSpace`
- L411 **export** fn `applyKeywordLine`
- L471 type `ParsedTrigger`
- L494 fn `parseOtherTrigger`
- L525 fn `parseTrigger`
- L612 fn `stripOptional`
- L628 fn `parseMods`
- L710 fn `civList`
- L714 fn `setRaces`
- L729 fn `parseObject`
- L797 type `Zone`
- L798 type `VerbRule`
- L844 fn `parseSelfVerb`
- L862 fn `parseTargeted`
- L906 fn `parseGrant`
- L928 fn `parseSubject`
- L956 fn `refTarget`
- L962 fn `refAnyZone`
- L968 fn `choosesCards`
- L974 fn `parseRefSentence`
- L1046 fn `parseSentence`
- L1529 fn `splitClauses`
- L1546 interface `Group`
- L1552 fn `flattenGroups`
- L1557 fn `hasRealEffect`
- L1567 fn `parseBothCondition`
- L1599 fn `parseBody`
- L2021 fn `pushGroup`
- L2030 fn `parseLook`
- L2166 fn `parseLookMulti`
- L2230 fn `parseRevealAll`
- L2249 fn `parseRevealIf`
- L2276 fn `parsePickWhat`
- L2336 fn `parsePer`
- L2358 fn `parseSelfCost`
- L2371 fn `parseStatic`
- L2681 fn `parseFromReminder`
- L2736 fn `mergeParsed`
- L2748 fn `parseGateTrigger`
- L2771 fn `parseZoneGate`
- L2794 fn `parseGrantFrame`
- L2803 **export** fn `splitAbilityLines`
- L2856 **export** fn `parseAbilityText`
- L3113 fn `parseOverloadBody`
- L3131 fn `readByGrammar`
- L3138 fn `mergeGrammar`
- L3147 type `Snapshot`
- L3148 fn `snapshot`
- L3152 fn `restore`
- L3165 fn `parseAwakenLink`
- L3173 fn `splitCondition`
- L3471 fn `parseLine`
- L4105 fn `isUnsafe`
- L4110 fn `selfKeywordStatic`
- L4118 fn `parseMark`
- L4206 fn `parseAltPlay`
- L4267 fn `evolveFilter`
- L4289 fn `parseEvolveSpec`
- L4328 fn `sClassZones`
- L4344 fn `parseSwapCondition`
- L4372 fn `parseReplacement`
- L4484 **export** fn `explainManual`

