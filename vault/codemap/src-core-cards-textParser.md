---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4552行）

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
- L495 fn `parseOtherTrigger`
- L526 fn `parseTrigger`
- L621 fn `stripOptional`
- L637 fn `parseMods`
- L719 fn `civList`
- L723 fn `setRaces`
- L738 fn `parseObject`
- L806 type `Zone`
- L807 type `VerbRule`
- L853 fn `parseSelfVerb`
- L871 fn `parseTargeted`
- L915 fn `parseGrant`
- L937 fn `parseSubject`
- L965 fn `refTarget`
- L971 fn `refAnyZone`
- L977 fn `choosesCards`
- L983 fn `parseRefSentence`
- L1056 fn `parseSentence`
- L1548 fn `splitClauses`
- L1565 interface `Group`
- L1571 fn `flattenGroups`
- L1576 fn `hasRealEffect`
- L1586 fn `parseBothCondition`
- L1618 fn `parseBody`
- L2040 fn `pushGroup`
- L2049 fn `parseLook`
- L2185 fn `parseLookMulti`
- L2249 fn `parseRevealAll`
- L2268 fn `parseRevealIf`
- L2295 fn `parsePickWhat`
- L2355 fn `parsePer`
- L2377 fn `parseSelfCost`
- L2390 fn `parseStatic`
- L2706 fn `parseFromReminder`
- L2761 fn `mergeParsed`
- L2773 fn `parseGateTrigger`
- L2796 fn `parseZoneGate`
- L2819 fn `parseGrantFrame`
- L2828 **export** fn `splitAbilityLines`
- L2881 **export** fn `parseAbilityText`
- L3138 fn `parseOverloadBody`
- L3156 fn `readByGrammar`
- L3163 fn `mergeGrammar`
- L3172 type `Snapshot`
- L3173 fn `snapshot`
- L3177 fn `restore`
- L3190 fn `parseAwakenLink`
- L3198 fn `splitCondition`
- L3498 fn `parseLine`
- L4148 fn `isUnsafe`
- L4153 fn `selfKeywordStatic`
- L4161 fn `parseMark`
- L4249 fn `parseAltPlay`
- L4310 fn `evolveFilter`
- L4332 fn `parseEvolveSpec`
- L4371 fn `sClassZones`
- L4387 fn `parseSwapCondition`
- L4423 fn `parseReplacement`
- L4535 **export** fn `explainManual`

