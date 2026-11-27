---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4574行）

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
- L2045 fn `pushGroup`
- L2054 fn `parseLook`
- L2190 fn `parseLookMulti`
- L2254 fn `parseRevealAll`
- L2273 fn `parseRevealIf`
- L2300 fn `parsePickWhat`
- L2360 fn `parsePer`
- L2382 fn `parseSelfCost`
- L2395 fn `parseStatic`
- L2711 fn `parseFromReminder`
- L2766 fn `mergeParsed`
- L2778 fn `parseGateTrigger`
- L2801 fn `parseZoneGate`
- L2824 fn `parseGrantFrame`
- L2833 **export** fn `splitAbilityLines`
- L2886 **export** fn `parseAbilityText`
- L3143 fn `parseOverloadBody`
- L3161 fn `readByGrammar`
- L3168 fn `mergeGrammar`
- L3177 type `Snapshot`
- L3178 fn `snapshot`
- L3182 fn `restore`
- L3195 fn `parseAwakenLink`
- L3203 fn `splitCondition`
- L3503 fn `parseLine`
- L4170 fn `isUnsafe`
- L4175 fn `selfKeywordStatic`
- L4183 fn `parseMark`
- L4271 fn `parseAltPlay`
- L4332 fn `evolveFilter`
- L4354 fn `parseEvolveSpec`
- L4393 fn `sClassZones`
- L4409 fn `parseSwapCondition`
- L4445 fn `parseReplacement`
- L4557 **export** fn `explainManual`

