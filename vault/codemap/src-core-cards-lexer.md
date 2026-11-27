---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/cards/lexer.ts（472行）

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
- L366 fn `tokenizeNormalized`
- L408 **export** fn `tokenize`
- L415 **export** fn `formatTokens`
- L419 fn `formatToken`
- L451 **export** fn `unknownStats`

## switch の case（`ラベル:行`）

### formatToken
player:421 · zone:422 · noun:423 · stat:424 · civ:425 · number:426 · count:427 · compare:428 · quant:429 · demo:430 · rel:431 · time:432 · adv:433 · adj:434 · verb:435 · aux:436 · conj:437 · particle:438 · keyword:439 · punct:440 · cardName:441 · icon:442 · label:443 · quote:444 · reminder:445 · word:446

