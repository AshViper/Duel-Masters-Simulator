---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/lexer.ts（467行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

能力テキストの字句解析：カードの能力の文を「語」に分け、語ごとに品詞（種類）と意味を付ける。

## トップレベル

- L12 **export** type `VerbForm`
- L37 **export** type `PlayerWord`
- L38 **export** type `NounWord`
- L43 **export** type `StatWord`
- L44 **export** type `CompareWord`
- L45 **export** type `QuantWord`
- L46 **export** type `DemoWord`
- L47 **export** type `RelWord`
- L48 **export** type `TimeWord`
- L49 **export** type `ConjWord`
- L50 **export** type `AuxWord`
- L51 **export** type `AdvWord`
- L52 **export** type `AdjWord`
- L54 **export** type `AdjForm`
- L56 **export** type `Token`
- L84 **export** type `TokenKind`
- L87 type `Entry`
- L147 type `VerbClass`
- L191 **export** fn `conjugate`
- L233 fn `add`
- L269 **export** fn `normalizeForLexer`
- L290 fn `closing`
- L300 fn `dictWordAt`
- L306 fn `readAt`
- L361 fn `tokenizeNormalized`
- L403 **export** fn `tokenize`
- L410 **export** fn `formatTokens`
- L414 fn `formatToken`
- L446 **export** fn `unknownStats`

## switch の case（`ラベル:行`）

### formatToken
player:416 · zone:417 · noun:418 · stat:419 · civ:420 · number:421 · count:422 · compare:423 · quant:424 · demo:425 · rel:426 · time:427 · adv:428 · adj:429 · verb:430 · aux:431 · conj:432 · particle:433 · keyword:434 · punct:435 · cardName:436 · icon:437 · label:438 · quote:439 · reminder:440 · word:441

