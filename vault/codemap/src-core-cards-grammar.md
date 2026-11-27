---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/grammar.ts（1371行）

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
- L299 interface `Obj`
- L307 fn `parseFrom`
- L331 fn `parseCount`
- L340 fn `parseObject`
- L355 interface `VerbPhrase`
- L361 fn `endMay`
- L366 fn `parseDest`
- L391 fn `parseVerbPhrase`
- L472 interface `Ctx`
- L482 interface `Group`
- L488 fn `refTarget`
- L494 fn `parseEffectSentence`
- L543 fn `parseDeckTopClause`
- L571 fn `parseClause`
- L614 fn `parseSpecialSentence`
- L669 fn `parseDeckTopShield`
- L692 fn `parseLookSentences`
- L762 fn `parseEffectSentences`
- L805 fn `flatten`
- L812 interface `Trig`
- L824 fn `parseTrigger`
- L890 interface `Cond`
- L899 fn `parseOneCondition`
- L979 fn `parseConditions`
- L1002 fn `parseRestriction`
- L1014 fn `parseDuration`
- L1025 fn `parseRestrictionSentence`
- L1038 fn `parseEnterInstead`
- L1074 fn `parseInsteadBody`
- L1103 fn `parseReplacementSentence`
- L1132 fn `parsePer`
- L1147 fn `parseSelfCost`
- L1189 fn `parsePlaySelf`
- L1205 **export** fn `parseByGrammar`
- L1256 fn `merge`
- L1266 fn `parseReminderAsAbility`
- L1282 fn `readAbility`

## メソッド

- L34 `peek`
- L37 `text`
- L41 `lit`
- L47 `any`
- L62 `try`
- L71 `rest`

