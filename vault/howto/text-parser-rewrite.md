---
tags: [howto, parser]
updated: 2026-11-27
---
# 能力テキストの読み取りの作り替え（字句解析 → 構文解析 → 効果定義）

`textParser.ts`（正規表現で文の形ごとに読む方式、約3200行）を、語の並びから組み立てる方式に**作り替える**（[[decisions]] 2026-11-27）。

## 段階
1. **字句解析** `src/core/cards/lexer.ts` … できた（2026-11-27）
2. **構文解析＋効果定義への変換** `src/core/cards/grammar.ts` … 最初の版ができた（2026-11-27）。いまは **textParser で読めなかった行と、一部だけ読めて手動の効果が残った行** を読む（`parseAbilityText` の最後の受け皿。`readByGrammar`）。grammar で全部読めたら textParser の結果を取り消して置き換える
3. grammar で読める形を広げ、読める範囲の textParser の正規表現を消していく
4. 既存のテスト（`src/core/cards/*.test.ts`）がすべて grammar で通るようになったら、textParser を置き換える

## 構文解析（grammar.ts）の作り
- 入口 `parseByGrammar(line, kind, applyKeywordLine)` → `GrammarResult`（keywords / abilities / statics / replacements / handTriggers）。読めない語が残れば null（呼んだ側で手動処理）
- 部品：誘発 `parseTrigger`、条件 `parseConditions`（「〜いて、〜あれば、」をつなぐ）、名詞句 `parseNP`、目的語 `parseObject`、移動先 `parseDest`、動詞句 `parseVerbPhrase`、文のまとまり `parseEffectSentences`（任意・「そうしたら」・「その後」・「自分が勝ったら」）
- 決まった形：追加ターン・カードを引く・ガチンコ・山札から新しいシールド（`parseSpecialSentence`）、山札を見る3文（`parseLookSentences`）、攻撃の制限・期間（`parseRestriction` `parseDuration`）、出る時の置換（`parseEnterInstead`）、離れる時の置換（`parseReplacementSentence`）、手札にある間の誘発（`parsePlaySelf`）
- 行の頭の「能力語：」は見出しとして外して本文を読む。知らないキーワード＋補足説明は、補足説明を能力として読む
- 意味の分からないアイコン（{l} など）や行頭のラベルが残る行は読まない
- `Cur.try(() => …)` で読みかけを戻す。`c.lit(a) && c.kind(b)` のように2つ以上つなぐ時は必ず `c.try` で包む（途中で失敗すると語を消費したままになる）

## 字句解析の使い方
- `tokenize(line)` → `Token[]`。`formatTokens(tokens)` で `相手[player:opponent] の[p] クリーチャー[noun:creature] …` の1行にして確かめる
- 語の種類（`kind`）：player / zone / noun / stat / civ / number / count / compare / quant / demo / rel / time / adv / adj / verb / aux / conj / particle / keyword / punct / cardName / quote / reminder / icon / word（未知語）
- 動詞は `{ lemma: '破壊する', form: 'renyo' }` のように見出し語と活用形を持つ。活用形は `VerbForm`（plain / renyo / te / ta / cannot / passiveNai / causative …）
- カッコ（補足説明）・「」は中身も語に分けて `children` に入る
- 能力語は `abilityWordList.ts`（352語）から1語にまとめる

## 辞書の足し方
- `lexer.ts` の表（`NOUNS` `VERBS` `AUXES` など）に1行足す。動詞は見出し語と活用の種類（suru / ichidan / godan）だけ書けば活用形は自動
- 同じ表記はファイルの上の表が優先（名詞・動詞 ＞ 能力語）
- 辞書にないカタカナ語は1語の `word` として残す（種族名・カード名の候補。構文解析で「〜の〇〇を」の位置から種族と判断する予定）

## 確かめ方
- `npx vitest run src/core/cards/cards.newParser.test.ts -t lexer`（テストのカード文で未知語 5% 未満を確認）
- `npm run lexer:report` → `vault/reports/lexer-report.md`（未知語の多い順・未対応の能力語の文の分かれ方）。**大きいので grep で引く**

## 構文解析の目標の文
ユーザーが挙げた文は **`src/core/testing/abilitySamples.ts`（例文集）** にまとめてある。新しい例文は末尾に足す。
- 字句解析のテストで、例文の未知語が種族名（`SAMPLE_RACES`）だけであることを確かめている
- `npm run lexer:report` のレポートの「例文集」に、各行の分かれ方と、今の読み取り（textParser＋grammar）でも手動になる行（★）が出る。grammar を入れる前は44行中21行が★、入れた後は0行
- その21行の読み取りとエンジンでの動作は `src/core/cards/cards.newParser.test.ts` の grammar で確かめている

正解をメモしておく文（ほかは構文解析を作る時に決める）：
- 「ドルスザクを４体まで、自分の手札または墓地からコストを支払わずに召喚してもよい。」
  → 任意で `playFree`、target `{ owner: 'self', zone: 'hand', extraZones: ['graveyard'], count: 4, upTo: true, filter: { race: 'ドルスザク', cardType: 'creature' } }`
- 「このターンの後で自分のターンをもう一度行う。」→ `extraTurn`（textParser の正規表現は「後に／後、」と「もう一度自分のターン」の語順しか読めない）
- 「xB次の自分のターンの終わりまで、〜」はラベル xB の能力の本文。同じカードの「このクリーチャーにxB能力を与える」と対になる

## 落とし穴
- grammar を足す時は、今まで手動だった行を誤って自動処理にしていないか確かめる（全テスト＋ `design/ability-coverage.md` の未対応の文を流す）
- 英字1〜3文字の能力のラベル（xB、a、k など）は `label`。「〜能力」の前か、行の頭で後ろが日本語の時だけ。能力語（GR召喚など）のほうが長ければそちらを使う
- 漢字の種族名（魔導具・紅蓮族など）も辞書に入れず `word` のまま。名詞の位置に来たら種族として扱う
- カタカナ語の途中では切らないが、能力語の後ろに辞書の語が続く時は切る（区切りが抜けた「スピードアタッカーパワーアタッカー+5000」）
- 一段動詞の連用形は語幹だけ（「加え」「見」）なので、短い表記が他の語の途中に当たることがある。おかしな切れ方を見つけたらテストに足す
- 「まで」は aux:until 1つで、「2枚まで」（〜まで選べる）と「ターンの終わりまで」（期間）の区別は構文解析でする
- 「中」は rel:in。「その中から」「攻撃中」「ターン中」の区別は構文解析でする
