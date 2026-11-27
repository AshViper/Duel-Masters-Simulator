---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3514行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L185 **export** fn `lineDefKey`
- L192 fn `findLineDef`
- L202 fn `stripIcons`
- L207 fn `normalizeKeepSpace`
- L308 **export** fn `applyKeywordLine`
- L364 type `ParsedTrigger`
- L384 fn `parseOtherTrigger`
- L415 fn `parseTrigger`
- L496 fn `stripOptional`
- L512 fn `parseMods`
- L578 fn `civList`
- L582 fn `setRaces`
- L597 fn `parseObject`
- L665 type `Zone`
- L666 type `VerbRule`
- L708 fn `parseSelfVerb`
- L726 fn `parseTargeted`
- L764 fn `parseGrant`
- L782 fn `parseSubject`
- L810 fn `refTarget`
- L816 fn `refAnyZone`
- L822 fn `choosesCards`
- L828 fn `parseRefSentence`
- L880 fn `parseSentence`
- L1169 fn `splitClauses`
- L1186 interface `Group`
- L1192 fn `flattenGroups`
- L1197 fn `hasRealEffect`
- L1207 fn `parseBothCondition`
- L1239 fn `parseBody`
- L1564 fn `pushGroup`
- L1573 fn `parseLook`
- L1703 fn `parseLookMulti`
- L1766 fn `parseRevealIf`
- L1789 fn `parsePickWhat`
- L1825 fn `parsePer`
- L1847 fn `parseSelfCost`
- L1860 fn `parseStatic`
- L2136 fn `parseFromReminder`
- L2191 fn `mergeParsed`
- L2203 fn `parseGateTrigger`
- L2226 fn `parseZoneGate`
- L2249 fn `parseGrantFrame`
- L2258 **export** fn `splitAbilityLines`
- L2303 **export** fn `parseAbilityText`
- L2477 fn `parseOverloadBody`
- L2494 fn `readByGrammar`
- L2499 fn `mergeGrammar`
- L2508 type `Snapshot`
- L2509 fn `snapshot`
- L2513 fn `restore`
- L2526 fn `parseAwakenLink`
- L2534 fn `splitCondition`
- L2740 fn `parseLine`
- L3236 fn `isUnsafe`
- L3241 fn `selfKeywordStatic`
- L3249 fn `parseMark`
- L3313 fn `parseAltPlay`
- L3342 fn `evolveFilter`
- L3364 fn `parseEvolveSpec`
- L3403 fn `sClassZones`
- L3419 fn `parseSwapCondition`
- L3441 fn `parseReplacement`
- L3497 **export** fn `explainManual`

