---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（3923行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L216 **export** fn `lineDefKey`
- L223 fn `findLineDef`
- L233 fn `stripIcons`
- L238 fn `normalizeKeepSpace`
- L358 **export** fn `applyKeywordLine`
- L416 type `ParsedTrigger`
- L439 fn `parseOtherTrigger`
- L470 fn `parseTrigger`
- L551 fn `stripOptional`
- L567 fn `parseMods`
- L636 fn `civList`
- L640 fn `setRaces`
- L655 fn `parseObject`
- L723 type `Zone`
- L724 type `VerbRule`
- L766 fn `parseSelfVerb`
- L784 fn `parseTargeted`
- L822 fn `parseGrant`
- L840 fn `parseSubject`
- L868 fn `refTarget`
- L874 fn `refAnyZone`
- L880 fn `choosesCards`
- L886 fn `parseRefSentence`
- L946 fn `parseSentence`
- L1339 fn `splitClauses`
- L1356 interface `Group`
- L1362 fn `flattenGroups`
- L1367 fn `hasRealEffect`
- L1377 fn `parseBothCondition`
- L1409 fn `parseBody`
- L1757 fn `pushGroup`
- L1766 fn `parseLook`
- L1896 fn `parseLookMulti`
- L1959 fn `parseRevealIf`
- L1982 fn `parsePickWhat`
- L2023 fn `parsePer`
- L2045 fn `parseSelfCost`
- L2058 fn `parseStatic`
- L2348 fn `parseFromReminder`
- L2403 fn `mergeParsed`
- L2415 fn `parseGateTrigger`
- L2438 fn `parseZoneGate`
- L2461 fn `parseGrantFrame`
- L2470 **export** fn `splitAbilityLines`
- L2521 **export** fn `parseAbilityText`
- L2737 fn `parseOverloadBody`
- L2755 fn `readByGrammar`
- L2760 fn `mergeGrammar`
- L2769 type `Snapshot`
- L2770 fn `snapshot`
- L2774 fn `restore`
- L2787 fn `parseAwakenLink`
- L2795 fn `splitCondition`
- L3037 fn `parseLine`
- L3596 fn `isUnsafe`
- L3601 fn `selfKeywordStatic`
- L3609 fn `parseMark`
- L3673 fn `parseAltPlay`
- L3702 fn `evolveFilter`
- L3724 fn `parseEvolveSpec`
- L3763 fn `sClassZones`
- L3779 fn `parseSwapCondition`
- L3801 fn `parseReplacement`
- L3906 **export** fn `explainManual`

