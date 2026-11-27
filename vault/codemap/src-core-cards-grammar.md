---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/grammar.ts（1235行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

能力テキストの構文解析：字句解析（lexer.ts）で分けた語の並びを、誘発・条件・目的語・動詞の部品として読み、効果定義を組み立てる。

## トップレベル

- L11 **export** interface `GrammarResult`
- L19 type `Kind`
- L20 type `Zone`
- L24 class `Cur`
- L75 fn `splitBy`
- L89 interface `NP`
- L102 fn `parseZoneAt`
- L118 fn `addCost`
- L126 fn `parseNP`
- L261 fn `toTarget`
- L279 interface `Obj`
- L287 fn `parseFrom`
- L311 fn `parseCount`
- L320 fn `parseObject`
- L335 interface `VerbPhrase`
- L341 fn `endMay`
- L346 fn `parseDest`
- L371 fn `parseVerbPhrase`
- L452 interface `Ctx`
- L462 interface `Group`
- L468 fn `refTarget`
- L474 fn `parseEffectSentence`
- L504 fn `parseClause`
- L542 fn `parseSpecialSentence`
- L597 fn `parseDeckTopShield`
- L620 fn `parseLookSentences`
- L690 fn `parseEffectSentences`
- L733 fn `flatten`
- L740 interface `Trig`
- L752 fn `parseTrigger`
- L818 interface `Cond`
- L827 fn `parseOneCondition`
- L907 fn `parseConditions`
- L930 fn `parseRestriction`
- L942 fn `parseDuration`
- L953 fn `parseRestrictionSentence`
- L966 fn `parseEnterInstead`
- L1002 fn `parseInsteadBody`
- L1031 fn `parseReplacementSentence`
- L1062 fn `parsePlaySelf`
- L1078 **export** fn `parseByGrammar`
- L1129 fn `merge`
- L1138 fn `parseReminderAsAbility`
- L1154 fn `readAbility`

## メソッド

- L32 `peek`
- L35 `text`
- L39 `lit`
- L45 `any`
- L60 `try`
- L69 `rest`

