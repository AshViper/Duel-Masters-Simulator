---
tags: [howto]
updated: 2026-11-27
---
# テスト

- ユニット：Vitest（`npm test`、1ファイルだけなら `npx vitest run src/core/cards/xxx.test.ts`）
- UI：Playwright（`npm run test:e2e`、`e2e/smoke.spec.ts`）
- エンジンのテスト用の架空カードは `src/core/testing/fixtureCards.ts`（アプリには入れない）

## どのテストに何があるか
ファイルごとの describe 一覧は [[codemap/_index]] の表（「中身」の列）にある。大きいテストは地図に describe と行番号がある。
- 能力の読み取りと動作：`src/core/cards/` の5つのファイル（2026-11-27 にまとめた。元のファイルごとに `describe('元のファイル名', …)` で包んである）
  - `cards.basic.test.ts`：読み取りの基本（textParser・compose・triggers・effects・keywords2・abilityWords・autoMore・resetDiscard）
  - `cards.engine.test.ts`：エンジンで動くこと（engineMore・mechanics・manualBatch・evolveSpec・tamaseed・dokindam・madogu）
  - `cards.special.test.ts`：超次元・超魂・禁断・ジェニーのデッキ（hyperspatial・soulPsychic・forbidden・jennyDeck）
  - `cards.decks.test.ts`：デッキ・保存したカード・行定義（deckCards・savedCards・savedDefs）
  - `cards.newParser.test.ts`：新しい読み取り（lexer・grammar）
  - 1つの describe だけ動かす：`npx vitest run src/core/cards/cards.engine.test.ts -t mechanics`
- 新しいテストは、内容に合うファイルの中の、合う describe に足す（ファイルを増やさない）
- エンジンの基本（ターン・攻撃・勝敗・手動処理）：`src/core/engine/engine.test.ts`
- 常在・置換・誘発：`src/core/engine/effects.test.ts`、処理順：`order.test.ts`

## 読み取りを確かめる使い捨てテスト
`src/core/cards/__scratch.test.ts` のような使い捨てのファイルを作り、文を並べて `splitAbilityLines` / `parseAbilityText` の結果を console.log する
（`npx vitest run src/core/cards/__scratch.test.ts --silent=false`）。見たい項目（`manualLines`、`abilities` など）だけ出す。終わったら必ず消す（コミットしない）。
