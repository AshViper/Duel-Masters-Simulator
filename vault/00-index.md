---
tags: [moc]
---
# Duel-Masters-Simulator ナレッジ

このフォルダは Obsidian の Vault。Claude の外部記憶でもある（読み方は リポジトリ直下の `CLAUDE.md`）。

## まず読む
- [[status]] … 今の状況・やりかけ・次の候補
- [[architecture]] … 全体の構成とデータの流れ（1画面で分かる版）

## やり方（howto）
- [[howto/add-ability]] … 新しい能力語・能力の文を自動処理にする
- [[howto/testing]] … テストの置き場所・書き方・読み取りの確かめ方
- [[howto/official-cards]] … 公式カード検索・保存・変換まわり
- [[howto/text-parser-rewrite]] … 能力テキストの読み取りの作り替え（字句解析・構文解析）

## 記録
- [[decisions]] … 方針の決定（なぜそうしたか）
- `log/` … 日ごとの作業ログ（新しい順に見る）

## コード地図・レポート（自動生成）
- [[codemap/_index]] … 全ファイルの行数と中身。大きいファイルは関数・メソッドの行番号つき
- `reports/lexer-report.md` … 字句解析のレポート（`npm run lexer:report`、大きいので grep で引く）

## 既存の設計資料（リポジトリの design/）
- `design/app-ui.md` … アプリ全体・デッキ構築の画面デザイン
- `design/battle-ui.md` … 対戦画面のデザイン（配色・寸法・アニメーション）
- `design/ability-coverage.md` … 能力語352種の対応状況（大きいので grep で引く）
