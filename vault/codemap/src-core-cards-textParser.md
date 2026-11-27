---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/textParser.ts（4170行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。

## トップレベル

- L29 **export** interface `ParsedAbilities`
- L78 **export** const `INFINITE_POWER`
- L83 **export** fn `normalizeText`
- L249 **export** fn `lineDefKey`
- L256 fn `findLineDef`
- L266 fn `stripIcons`
- L271 fn `normalizeKeepSpace`
- L395 **export** fn `applyKeywordLine`
- L454 type `ParsedTrigger`
- L477 fn `parseOtherTrigger`
- L508 fn `parseTrigger`
- L595 fn `stripOptional`
- L611 fn `parseMods`
- L687 fn `civList`
- L691 fn `setRaces`
- L706 fn `parseObject`
- L774 type `Zone`
- L775 type `VerbRule`
- L821 fn `parseSelfVerb`
- L839 fn `parseTargeted`
- L883 fn `parseGrant`
- L901 fn `parseSubject`
- L929 fn `refTarget`
- L935 fn `refAnyZone`
- L941 fn `choosesCards`
- L947 fn `parseRefSentence`
- L1014 fn `parseSentence`
- L1463 fn `splitClauses`
- L1480 interface `Group`
- L1486 fn `flattenGroups`
- L1491 fn `hasRealEffect`
- L1501 fn `parseBothCondition`
- L1533 fn `parseBody`
- L1887 fn `pushGroup`
- L1896 fn `parseLook`
- L2026 fn `parseLookMulti`
- L2089 fn `parseRevealIf`
- L2112 fn `parsePickWhat`
- L2163 fn `parsePer`
- L2185 fn `parseSelfCost`
- L2198 fn `parseStatic`
- L2491 fn `parseFromReminder`
- L2546 fn `mergeParsed`
- L2558 fn `parseGateTrigger`
- L2581 fn `parseZoneGate`
- L2604 fn `parseGrantFrame`
- L2613 **export** fn `splitAbilityLines`
- L2664 **export** fn `parseAbilityText`
- L2921 fn `parseOverloadBody`
- L2939 fn `readByGrammar`
- L2944 fn `mergeGrammar`
- L2953 type `Snapshot`
- L2954 fn `snapshot`
- L2958 fn `restore`
- L2971 fn `parseAwakenLink`
- L2979 fn `splitCondition`
- L3237 fn `parseLine`
- L3824 fn `isUnsafe`
- L3829 fn `selfKeywordStatic`
- L3837 fn `parseMark`
- L3907 fn `parseAltPlay`
- L3936 fn `evolveFilter`
- L3958 fn `parseEvolveSpec`
- L3997 fn `sClassZones`
- L4013 fn `parseSwapCondition`
- L4041 fn `parseReplacement`
- L4153 **export** fn `explainManual`

