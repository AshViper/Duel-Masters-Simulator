---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3489行）

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
- L2463 fn `parseOverloadBody`
- L2480 fn `readByGrammar`
- L2485 fn `mergeGrammar`
- L2494 type `Snapshot`
- L2495 fn `snapshot`
- L2499 fn `restore`
- L2512 fn `parseAwakenLink`
- L2520 fn `splitCondition`
- L2720 fn `parseLine`
- L3214 fn `isUnsafe`
- L3219 fn `selfKeywordStatic`
- L3227 fn `parseMark`
- L3291 fn `parseAltPlay`
- L3320 fn `evolveFilter`
- L3342 fn `parseEvolveSpec`
- L3381 fn `sClassZones`
- L3397 fn `parseSwapCondition`
- L3419 fn `parseReplacement`
- L3472 **export** fn `explainManual`

