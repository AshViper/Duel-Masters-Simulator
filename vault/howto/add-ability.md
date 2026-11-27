---
tags: [howto]
updated: 2026-11-27
---
# 新しい能力を自動処理にする

対象の能力語の今の状態は `grep -n '能力語名' design/ability-coverage.md` で調べる（ファイル全体は読まない）。

## 手順（コードの構造から整理した流れ）

1. **今どう読まれているか確かめる**
   使い捨てのテスト（例 `src/core/cards/__scratch.test.ts`。終わったら消す）で `splitAbilityLines` と `parseAbilityText` の結果を出す → [[testing]]
2. **どこで直すか決める**
   - 1枚だけの特殊な文・読み間違いの修正 → `lineDefs.ts` の `BUILT_IN_LINE_DEFS` に文と定義を足す（いちばん安全）
   - 多くのカードに出る言い回し → 新しく足す形は `grammar.ts`（語の組み立て。[[text-parser-rewrite]]）。今の textParser で読めている形を直す時は `textParser.ts`
     - キーワード行は `applyKeywordLine`、誘発の言い方は `parseTrigger` / `parseOtherTrigger`、文の本体は `parseSentence` / `parseBody`、常在は `parseStatic`、置換は `parseReplacement`、別の出し方は `parseAltPlay`、1行の振り分けは `parseLine`
     - 行番号は [[codemap/src-core-cards-textParser]] で調べる
3. **今ある部品で書けないなら、部品を足す**
   - `types.ts` の `EffectDef`（または `StaticAbility` / `ReplacementAbility` / `Keywords` / `TRIGGER_EVENTS`）に型を足す
   - `engine.ts` の `execEffect` の switch に case を足す（場所は [[codemap/src-core-engine-engine]] の「execEffect」）。誘発なら `emit`、離れる時の置換なら `execLeave`
   - パワー・キーワード・コストなど「読むだけ」の計算は `queries.ts`
   - 選択肢の説明に出す文言は `engine.ts` 先頭の `EFFECT_HINT` などの表
4. **テストを足す**：「読み取り」と「エンジンで動く」の2つ。`src/core/cards/cards.*.test.ts` の合う describe に足す（ファイルは増やさない → [[testing]]）
5. `npm test` → `npm run typecheck` → 関数を足したなら `npm run codemap`
6. `design/ability-coverage.md` の該当行を更新し、[[status]] と作業ログに一言残す

## 落とし穴（分かったら追記する）
- 読めない行は必ず「手動処理」に落とすこと。誤って自動処理するより安全、という方針（[[decisions]]）。
- 公式テキストの記号には異体字セレクタ（U+FE0E / U+FE0F）が付くことがある（「▶︎」）。正規表現の文字クラスに入れるか、先に消す
- 「〜時」を自分自身と他に分けて2つの誘発にする時、「各ターンに1度」は `onceKey` で合わせて数える
