# Claude への指示（このリポジトリ）

デュエマのデッキ構築・対戦シミュレーター（React + TypeScript + Vite）。
**知識は `vault/`（Obsidian の Vault）に置いてある。コードを読む前に、まず vault を見る。**

## 読む順番（コンテキストを節約する）

1. `vault/00-index.md` … 全体の入口（ここから必要なノートだけ開く）
2. `vault/status.md` … 今の状況・やりかけ・次にやること
3. 作業に関係する `vault/howto/*.md` / `vault/architecture.md`
4. コードの場所は `vault/codemap/_index.md` → 各ファイルの「地図」で **行番号を調べてから、その範囲だけ読む**

## やってはいけないこと

- `src/core/engine/engine.ts`（約3400行）、`src/core/cards/textParser.ts`（約3200行）、`src/core/cards/types.ts`、`src/core/engine/queries.ts`、`src/core/cards/cards.engine.test.ts`、`src/ui/screens/Battle.tsx`、`*.css` を**丸ごと読まない**。地図か `grep -n` で場所を決めて、`offset/limit` で数十〜百行ずつ読む。
- `design/ability-coverage.md`（30KB）と `vault/reports/*.md` を丸ごと読まない。能力語は `grep -n '能力語名' design/ability-coverage.md` で引く。
- `node_modules/` `dist/` を検索対象に入れない。

## 作業の終わりにやること

- 分かったこと・決めたことを vault に書く（コードを読めば分かることは書かない。「なぜ」「落とし穴」「やりかけ」を書く）。
  - その日の作業 → `vault/log/YYYY-MM-DD.md`（テンプレート: `vault/_templates/log.md`、数行でよい）
  - 方針の決定 → `vault/decisions.md` に1項目追加
  - 状況の変化 → `vault/status.md` を更新
- 関数を足した・大きく動かした時は `npm run codemap` で地図を作り直す。

## コマンド

`npm test`（Vitest）/ `npm run typecheck` / `npm run build` / `npm run test:e2e` / `npm run codemap`
