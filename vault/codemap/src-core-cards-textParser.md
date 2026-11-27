---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4593行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L270 **export** fn `lineDefKey`
- L277 fn `findLineDef`
- L287 fn `stripIcons`
- L292 fn `normalizeKeepSpace`
- L420 **export** fn `applyKeywordLine`
- L480 type `ParsedTrigger`
- L504 fn `parseOtherTrigger`
- L535 fn `parseTrigger`
- L630 fn `stripOptional`
- L646 fn `parseMods`
- L728 fn `civList`
- L732 fn `setRaces`
- L747 fn `parseObject`
- L815 type `Zone`
- L816 type `VerbRule`
- L862 fn `parseSelfVerb`
- L880 fn `parseTargeted`
- L924 fn `parseGrant`
- L946 fn `parseSubject`
- L974 fn `refTarget`
- L980 fn `refAnyZone`
- L986 fn `choosesCards`
- L992 fn `parseRefSentence`
- L1065 fn `parseSentence`
- L1560 fn `splitClauses`
- L1577 interface `Group`
- L1583 fn `flattenGroups`
- L1588 fn `hasRealEffect`
- L1598 fn `parseBothCondition`
- L1630 fn `parseBody`
- L2057 fn `pushGroup`
- L2066 fn `parseLook`
- L2202 fn `parseLookMulti`
- L2266 fn `parseRevealAll`
- L2285 fn `parseRevealIf`
- L2312 fn `parsePickWhat`
- L2372 fn `parsePer`
- L2394 fn `parseSelfCost`
- L2408 fn `parseStatic`
- L2724 fn `parseFromReminder`
- L2779 fn `mergeParsed`
- L2791 fn `parseGateTrigger`
- L2814 fn `parseZoneGate`
- L2837 fn `parseGrantFrame`
- L2846 **export** fn `splitAbilityLines`
- L2899 **export** fn `parseAbilityText`
- L3156 fn `parseOverloadBody`
- L3174 fn `readByGrammar`
- L3181 fn `mergeGrammar`
- L3190 type `Snapshot`
- L3191 fn `snapshot`
- L3195 fn `restore`
- L3208 fn `parseAwakenLink`
- L3216 fn `splitCondition`
- L3516 fn `parseLine`
- L4183 fn `isUnsafe`
- L4188 fn `selfKeywordStatic`
- L4202 fn `parseMark`
- L4290 fn `parseAltPlay`
- L4351 fn `evolveFilter`
- L4373 fn `parseEvolveSpec`
- L4412 fn `sClassZones`
- L4428 fn `parseSwapCondition`
- L4464 fn `parseReplacement`
- L4576 **export** fn `explainManual`

