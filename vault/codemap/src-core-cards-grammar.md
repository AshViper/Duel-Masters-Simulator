---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/grammar.ts（1478行）

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
- L579 fn `parseDeckTopClause`
- L607 fn `parseClause`
- L661 fn `parseSpecialSentence`
- L718 fn `parseDeckTopShield`
- L741 fn `parseLookSentences`
- L811 fn `parseEffectSentences`
- L854 fn `flatten`
- L861 interface `Trig`
- L879 fn `parseTrigger`
- L975 interface `Cond`
- L984 fn `parseOneCondition`
- L1067 fn `parseConditions`
- L1090 fn `parseRestriction`
- L1102 fn `parseDuration`
- L1113 fn `parseRestrictionSentence`
- L1126 fn `parseEnterInstead`
- L1169 fn `parseInsteadBody`
- L1198 fn `parseReplacementSentence`
- L1227 fn `parsePer`
- L1242 fn `parseSelfCost`
- L1284 fn `parsePlaySelf`
- L1300 **export** fn `parseByGrammar`
- L1351 fn `merge`
- L1361 fn `parseReminderAsAbility`
- L1377 fn `readAbility`

## メソッド

- L40 `peek`
- L43 `text`
- L47 `lit`
- L53 `any`
- L68 `try`
- L77 `rest`

