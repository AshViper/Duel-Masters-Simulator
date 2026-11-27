---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4664行）

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
- L980 fn `refTarget`
- L986 fn `refAnyZone`
- L992 fn `choosesCards`
- L998 fn `parseRefSentence`
- L1071 fn `parseSentence`
- L1566 fn `splitClauses`
- L1583 interface `Group`
- L1589 fn `flattenGroups`
- L1594 fn `hasRealEffect`
- L1604 fn `parseBothCondition`
- L1636 fn `parseBody`
- L2063 fn `pushGroup`
- L2072 fn `parseLook`
- L2208 fn `parseLookMulti`
- L2272 fn `parseRevealAll`
- L2291 fn `parseRevealIf`
- L2318 fn `parsePickWhat`
- L2378 fn `parsePer`
- L2400 fn `parseSelfCost`
- L2414 fn `parseStatic`
- L2733 fn `parseFromReminder`
- L2788 fn `mergeParsed`
- L2800 fn `parseGateTrigger`
- L2823 fn `parseZoneGate`
- L2846 fn `parseGrantFrame`
- L2855 **export** fn `splitAbilityLines`
- L2908 **export** fn `parseAbilityText`
- L3165 fn `parseOverloadBody`
- L3183 fn `readByGrammar`
- L3190 fn `mergeGrammar`
- L3199 type `Snapshot`
- L3200 fn `snapshot`
- L3204 fn `restore`
- L3217 fn `parseAwakenLink`
- L3225 fn `splitCondition`
- L3525 fn `parseLine`
- L4245 fn `isUnsafe`
- L4250 fn `selfKeywordStatic`
- L4264 fn `parseMark`
- L4352 fn `parseAltPlay`
- L4413 fn `evolveFilter`
- L4436 fn `parseEvolveSpec`
- L4475 fn `sClassZones`
- L4491 fn `parseSwapCondition`
- L4535 fn `parseReplacement`
- L4647 **export** fn `explainManual`

