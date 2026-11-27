---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/grammar.ts（1467行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

能力テキストの構文解析：字句解析（lexer.ts）で分けた語の並びを、誘発・条件・目的語・動詞の部品として読み、効果定義を組み立てる。

## トップレベル

- L12 **export** fn `setSentenceFallback`
- L17 **export** interface `GrammarResult`
- L27 type `Kind`
- L28 type `Zone`
- L32 class `Cur`
- L83 fn `splitBy`
- L97 interface `NP`
- L110 fn `parseZoneAt`
- L126 fn `addCost`
- L134 fn `parseNP`
- L301 fn `toTarget`
- L323 interface `Obj`
- L331 fn `parseFrom`
- L355 fn `parseCount`
- L364 fn `parseObject`
- L379 interface `VerbPhrase`
- L385 fn `endMay`
- L390 fn `parseDest`
- L415 fn `parseVerbPhrase`
- L507 interface `Ctx`
- L517 interface `Group`
- L523 fn `refTarget`
- L529 fn `parseEffectSentence`
- L578 fn `parseDeckTopClause`
- L606 fn `parseClause`
- L660 fn `parseSpecialSentence`
- L717 fn `parseDeckTopShield`
- L740 fn `parseLookSentences`
- L810 fn `parseEffectSentences`
- L853 fn `flatten`
- L860 interface `Trig`
- L878 fn `parseTrigger`
- L974 interface `Cond`
- L983 fn `parseOneCondition`
- L1063 fn `parseConditions`
- L1086 fn `parseRestriction`
- L1098 fn `parseDuration`
- L1109 fn `parseRestrictionSentence`
- L1122 fn `parseEnterInstead`
- L1158 fn `parseInsteadBody`
- L1187 fn `parseReplacementSentence`
- L1216 fn `parsePer`
- L1231 fn `parseSelfCost`
- L1273 fn `parsePlaySelf`
- L1289 **export** fn `parseByGrammar`
- L1340 fn `merge`
- L1350 fn `parseReminderAsAbility`
- L1366 fn `readAbility`

## メソッド

- L40 `peek`
- L43 `text`
- L47 `lit`
- L53 `any`
- L68 `try`
- L77 `rest`

