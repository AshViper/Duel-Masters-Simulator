---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3450行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L182 **export** fn `lineDefKey`
- L189 fn `findLineDef`
- L199 fn `stripIcons`
- L204 fn `normalizeKeepSpace`
- L301 **export** fn `applyKeywordLine`
- L357 type `ParsedTrigger`
- L377 fn `parseOtherTrigger`
- L408 fn `parseTrigger`
- L489 fn `stripOptional`
- L505 fn `parseMods`
- L570 fn `civList`
- L574 fn `setRaces`
- L589 fn `parseObject`
- L657 type `Zone`
- L658 type `VerbRule`
- L700 fn `parseSelfVerb`
- L718 fn `parseTargeted`
- L756 fn `parseGrant`
- L774 fn `parseSubject`
- L802 fn `refTarget`
- L808 fn `refAnyZone`
- L814 fn `choosesCards`
- L820 fn `parseRefSentence`
- L872 fn `parseSentence`
- L1161 fn `splitClauses`
- L1178 interface `Group`
- L1184 fn `flattenGroups`
- L1189 fn `hasRealEffect`
- L1199 fn `parseBothCondition`
- L1231 fn `parseBody`
- L1556 fn `pushGroup`
- L1565 fn `parseLook`
- L1695 fn `parseLookMulti`
- L1758 fn `parseRevealIf`
- L1781 fn `parsePickWhat`
- L1817 fn `parsePer`
- L1839 fn `parseSelfCost`
- L1852 fn `parseStatic`
- L2122 fn `parseFromReminder`
- L2177 fn `mergeParsed`
- L2189 fn `parseGateTrigger`
- L2212 fn `parseZoneGate`
- L2235 fn `parseGrantFrame`
- L2244 **export** fn `splitAbilityLines`
- L2289 **export** fn `parseAbilityText`
- L2441 fn `readByGrammar`
- L2446 fn `mergeGrammar`
- L2455 type `Snapshot`
- L2456 fn `snapshot`
- L2460 fn `restore`
- L2473 fn `parseAwakenLink`
- L2481 fn `splitCondition`
- L2681 fn `parseLine`
- L3175 fn `isUnsafe`
- L3180 fn `selfKeywordStatic`
- L3188 fn `parseMark`
- L3252 fn `parseAltPlay`
- L3281 fn `evolveFilter`
- L3303 fn `parseEvolveSpec`
- L3342 fn `sClassZones`
- L3358 fn `parseSwapCondition`
- L3380 fn `parseReplacement`
- L3433 **export** fn `explainManual`

