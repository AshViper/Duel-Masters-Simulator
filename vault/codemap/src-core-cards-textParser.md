---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3783行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L210 **export** fn `lineDefKey`
- L217 fn `findLineDef`
- L227 fn `stripIcons`
- L232 fn `normalizeKeepSpace`
- L349 **export** fn `applyKeywordLine`
- L406 type `ParsedTrigger`
- L428 fn `parseOtherTrigger`
- L459 fn `parseTrigger`
- L540 fn `stripOptional`
- L556 fn `parseMods`
- L624 fn `civList`
- L628 fn `setRaces`
- L643 fn `parseObject`
- L711 type `Zone`
- L712 type `VerbRule`
- L754 fn `parseSelfVerb`
- L772 fn `parseTargeted`
- L810 fn `parseGrant`
- L828 fn `parseSubject`
- L856 fn `refTarget`
- L862 fn `refAnyZone`
- L868 fn `choosesCards`
- L874 fn `parseRefSentence`
- L934 fn `parseSentence`
- L1313 fn `splitClauses`
- L1330 interface `Group`
- L1336 fn `flattenGroups`
- L1341 fn `hasRealEffect`
- L1351 fn `parseBothCondition`
- L1383 fn `parseBody`
- L1724 fn `pushGroup`
- L1733 fn `parseLook`
- L1863 fn `parseLookMulti`
- L1926 fn `parseRevealIf`
- L1949 fn `parsePickWhat`
- L1990 fn `parsePer`
- L2012 fn `parseSelfCost`
- L2025 fn `parseStatic`
- L2303 fn `parseFromReminder`
- L2358 fn `mergeParsed`
- L2370 fn `parseGateTrigger`
- L2393 fn `parseZoneGate`
- L2416 fn `parseGrantFrame`
- L2425 **export** fn `splitAbilityLines`
- L2476 **export** fn `parseAbilityText`
- L2669 fn `parseOverloadBody`
- L2687 fn `readByGrammar`
- L2692 fn `mergeGrammar`
- L2701 type `Snapshot`
- L2702 fn `snapshot`
- L2706 fn `restore`
- L2719 fn `parseAwakenLink`
- L2727 fn `splitCondition`
- L2950 fn `parseLine`
- L3490 fn `isUnsafe`
- L3495 fn `selfKeywordStatic`
- L3503 fn `parseMark`
- L3567 fn `parseAltPlay`
- L3596 fn `evolveFilter`
- L3618 fn `parseEvolveSpec`
- L3657 fn `sClassZones`
- L3673 fn `parseSwapCondition`
- L3695 fn `parseReplacement`
- L3766 **export** fn `explainManual`

