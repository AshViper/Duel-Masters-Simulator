---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4630行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L80 **export** const `INFINITE_POWER`
- L85 **export** fn `normalizeText`
- L273 **export** fn `lineDefKey`
- L280 fn `findLineDef`
- L290 fn `stripIcons`
- L295 fn `normalizeKeepSpace`
- L423 **export** fn `applyKeywordLine`
- L483 type `ParsedTrigger`
- L507 fn `parseOtherTrigger`
- L538 fn `parseTrigger`
- L633 fn `stripOptional`
- L649 fn `parseMods`
- L731 fn `civList`
- L735 fn `setRaces`
- L750 fn `parseObject`
- L818 type `Zone`
- L819 type `VerbRule`
- L865 fn `parseSelfVerb`
- L883 fn `parseTargeted`
- L927 fn `parseGrant`
- L949 fn `parseSubject`
- L977 fn `refTarget`
- L983 fn `refAnyZone`
- L989 fn `choosesCards`
- L995 fn `parseRefSentence`
- L1068 fn `parseSentence`
- L1563 fn `splitClauses`
- L1580 interface `Group`
- L1586 fn `flattenGroups`
- L1591 fn `hasRealEffect`
- L1601 fn `parseBothCondition`
- L1633 fn `parseBody`
- L2060 fn `pushGroup`
- L2069 fn `parseLook`
- L2205 fn `parseLookMulti`
- L2269 fn `parseRevealAll`
- L2288 fn `parseRevealIf`
- L2315 fn `parsePickWhat`
- L2375 fn `parsePer`
- L2397 fn `parseSelfCost`
- L2411 fn `parseStatic`
- L2730 fn `parseFromReminder`
- L2785 fn `mergeParsed`
- L2797 fn `parseGateTrigger`
- L2820 fn `parseZoneGate`
- L2843 fn `parseGrantFrame`
- L2852 **export** fn `splitAbilityLines`
- L2905 **export** fn `parseAbilityText`
- L3162 fn `parseOverloadBody`
- L3180 fn `readByGrammar`
- L3187 fn `mergeGrammar`
- L3196 type `Snapshot`
- L3197 fn `snapshot`
- L3201 fn `restore`
- L3214 fn `parseAwakenLink`
- L3222 fn `splitCondition`
- L3522 fn `parseLine`
- L4211 fn `isUnsafe`
- L4216 fn `selfKeywordStatic`
- L4230 fn `parseMark`
- L4318 fn `parseAltPlay`
- L4379 fn `evolveFilter`
- L4402 fn `parseEvolveSpec`
- L4441 fn `sClassZones`
- L4457 fn `parseSwapCondition`
- L4501 fn `parseReplacement`
- L4613 **export** fn `explainManual`

