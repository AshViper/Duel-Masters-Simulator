---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/grammar.ts（1367行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

能力テキストの構文解析：字句解析（lexer.ts）で分けた語の並びを、誘発・条件・目的語・動詞の部品として読み、効果定義を組み立てる。

## トップレベル

- L11 **export** interface `GrammarResult`
- L21 type `Kind`
- L22 type `Zone`
- L26 class `Cur`
- L77 fn `splitBy`
- L91 interface `NP`
- L104 fn `parseZoneAt`
- L120 fn `addCost`
- L128 fn `parseNP`
- L277 fn `toTarget`
- L295 interface `Obj`
- L303 fn `parseFrom`
- L327 fn `parseCount`
- L336 fn `parseObject`
- L351 interface `VerbPhrase`
- L357 fn `endMay`
- L362 fn `parseDest`
- L387 fn `parseVerbPhrase`
- L468 interface `Ctx`
- L478 interface `Group`
- L484 fn `refTarget`
- L490 fn `parseEffectSentence`
- L539 fn `parseDeckTopClause`
- L567 fn `parseClause`
- L610 fn `parseSpecialSentence`
- L665 fn `parseDeckTopShield`
- L688 fn `parseLookSentences`
- L758 fn `parseEffectSentences`
- L801 fn `flatten`
- L808 interface `Trig`
- L820 fn `parseTrigger`
- L886 interface `Cond`
- L895 fn `parseOneCondition`
- L975 fn `parseConditions`
- L998 fn `parseRestriction`
- L1010 fn `parseDuration`
- L1021 fn `parseRestrictionSentence`
- L1034 fn `parseEnterInstead`
- L1070 fn `parseInsteadBody`
- L1099 fn `parseReplacementSentence`
- L1128 fn `parsePer`
- L1143 fn `parseSelfCost`
- L1185 fn `parsePlaySelf`
- L1201 **export** fn `parseByGrammar`
- L1252 fn `merge`
- L1262 fn `parseReminderAsAbility`
- L1278 fn `readAbility`

## メソッド

- L34 `peek`
- L37 `text`
- L41 `lit`
- L47 `any`
- L62 `try`
- L71 `rest`

