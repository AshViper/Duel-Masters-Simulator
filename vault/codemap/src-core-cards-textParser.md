---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4211行）

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
- L1467 fn `splitClauses`
- L1484 interface `Group`
- L1490 fn `flattenGroups`
- L1495 fn `hasRealEffect`
- L1505 fn `parseBothCondition`
- L1537 fn `parseBody`
- L1891 fn `pushGroup`
- L1900 fn `parseLook`
- L2030 fn `parseLookMulti`
- L2093 fn `parseRevealIf`
- L2116 fn `parsePickWhat`
- L2167 fn `parsePer`
- L2189 fn `parseSelfCost`
- L2202 fn `parseStatic`
- L2505 fn `parseFromReminder`
- L2560 fn `mergeParsed`
- L2572 fn `parseGateTrigger`
- L2595 fn `parseZoneGate`
- L2618 fn `parseGrantFrame`
- L2627 **export** fn `splitAbilityLines`
- L2678 **export** fn `parseAbilityText`
- L2935 fn `parseOverloadBody`
- L2953 fn `readByGrammar`
- L2958 fn `mergeGrammar`
- L2967 type `Snapshot`
- L2968 fn `snapshot`
- L2972 fn `restore`
- L2985 fn `parseAwakenLink`
- L2993 fn `splitCondition`
- L3251 fn `parseLine`
- L3849 fn `isUnsafe`
- L3854 fn `selfKeywordStatic`
- L3862 fn `parseMark`
- L3932 fn `parseAltPlay`
- L3977 fn `evolveFilter`
- L3999 fn `parseEvolveSpec`
- L4038 fn `sClassZones`
- L4054 fn `parseSwapCondition`
- L4082 fn `parseReplacement`
- L4194 **export** fn `explainManual`

