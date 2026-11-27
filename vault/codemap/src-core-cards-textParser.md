---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4437行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L261 **export** fn `lineDefKey`
- L268 fn `findLineDef`
- L278 fn `stripIcons`
- L283 fn `normalizeKeepSpace`
- L407 **export** fn `applyKeywordLine`
- L467 type `ParsedTrigger`
- L490 fn `parseOtherTrigger`
- L521 fn `parseTrigger`
- L608 fn `stripOptional`
- L624 fn `parseMods`
- L706 fn `civList`
- L710 fn `setRaces`
- L725 fn `parseObject`
- L793 type `Zone`
- L794 type `VerbRule`
- L840 fn `parseSelfVerb`
- L858 fn `parseTargeted`
- L902 fn `parseGrant`
- L924 fn `parseSubject`
- L952 fn `refTarget`
- L958 fn `refAnyZone`
- L964 fn `choosesCards`
- L970 fn `parseRefSentence`
- L1037 fn `parseSentence`
- L1512 fn `splitClauses`
- L1529 interface `Group`
- L1535 fn `flattenGroups`
- L1540 fn `hasRealEffect`
- L1550 fn `parseBothCondition`
- L1582 fn `parseBody`
- L1969 fn `pushGroup`
- L1978 fn `parseLook`
- L2114 fn `parseLookMulti`
- L2178 fn `parseRevealAll`
- L2197 fn `parseRevealIf`
- L2224 fn `parsePickWhat`
- L2284 fn `parsePer`
- L2306 fn `parseSelfCost`
- L2319 fn `parseStatic`
- L2629 fn `parseFromReminder`
- L2684 fn `mergeParsed`
- L2696 fn `parseGateTrigger`
- L2719 fn `parseZoneGate`
- L2742 fn `parseGrantFrame`
- L2751 **export** fn `splitAbilityLines`
- L2802 **export** fn `parseAbilityText`
- L3059 fn `parseOverloadBody`
- L3077 fn `readByGrammar`
- L3084 fn `mergeGrammar`
- L3093 type `Snapshot`
- L3094 fn `snapshot`
- L3098 fn `restore`
- L3111 fn `parseAwakenLink`
- L3119 fn `splitCondition`
- L3410 fn `parseLine`
- L4044 fn `isUnsafe`
- L4049 fn `selfKeywordStatic`
- L4057 fn `parseMark`
- L4145 fn `parseAltPlay`
- L4203 fn `evolveFilter`
- L4225 fn `parseEvolveSpec`
- L4264 fn `sClassZones`
- L4280 fn `parseSwapCondition`
- L4308 fn `parseReplacement`
- L4420 **export** fn `explainManual`

