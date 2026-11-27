---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4611行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L80 **export** const `INFINITE_POWER`
- L85 **export** fn `normalizeText`
- L272 **export** fn `lineDefKey`
- L279 fn `findLineDef`
- L289 fn `stripIcons`
- L294 fn `normalizeKeepSpace`
- L422 **export** fn `applyKeywordLine`
- L482 type `ParsedTrigger`
- L506 fn `parseOtherTrigger`
- L537 fn `parseTrigger`
- L632 fn `stripOptional`
- L648 fn `parseMods`
- L730 fn `civList`
- L734 fn `setRaces`
- L749 fn `parseObject`
- L817 type `Zone`
- L818 type `VerbRule`
- L864 fn `parseSelfVerb`
- L882 fn `parseTargeted`
- L926 fn `parseGrant`
- L948 fn `parseSubject`
- L976 fn `refTarget`
- L982 fn `refAnyZone`
- L988 fn `choosesCards`
- L994 fn `parseRefSentence`
- L1067 fn `parseSentence`
- L1562 fn `splitClauses`
- L1579 interface `Group`
- L1585 fn `flattenGroups`
- L1590 fn `hasRealEffect`
- L1600 fn `parseBothCondition`
- L1632 fn `parseBody`
- L2059 fn `pushGroup`
- L2068 fn `parseLook`
- L2204 fn `parseLookMulti`
- L2268 fn `parseRevealAll`
- L2287 fn `parseRevealIf`
- L2314 fn `parsePickWhat`
- L2374 fn `parsePer`
- L2396 fn `parseSelfCost`
- L2410 fn `parseStatic`
- L2726 fn `parseFromReminder`
- L2781 fn `mergeParsed`
- L2793 fn `parseGateTrigger`
- L2816 fn `parseZoneGate`
- L2839 fn `parseGrantFrame`
- L2848 **export** fn `splitAbilityLines`
- L2901 **export** fn `parseAbilityText`
- L3158 fn `parseOverloadBody`
- L3176 fn `readByGrammar`
- L3183 fn `mergeGrammar`
- L3192 type `Snapshot`
- L3193 fn `snapshot`
- L3197 fn `restore`
- L3210 fn `parseAwakenLink`
- L3218 fn `splitCondition`
- L3518 fn `parseLine`
- L4199 fn `isUnsafe`
- L4204 fn `selfKeywordStatic`
- L4218 fn `parseMark`
- L4306 fn `parseAltPlay`
- L4367 fn `evolveFilter`
- L4390 fn `parseEvolveSpec`
- L4429 fn `sClassZones`
- L4445 fn `parseSwapCondition`
- L4482 fn `parseReplacement`
- L4594 **export** fn `explainManual`

