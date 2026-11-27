---
tags: [status]
updated: 2026-11-27
---
# 今の状況

> 作業が終わるたびに更新する。古くなった行は消す（履歴は log/ と git に残る）。

## できていること
- デッキ構築（殿堂・プレミアム殿堂・殿堂ペアのチェック）、CPU 対戦（EASY/NORMAL/HARD）、一人回し、オンライン対戦（PeerJS）
- 公式カード検索・保存（ローカル版は Vite 中継、Pages 版はブックマークレット）
- プロキシPDF（A4・3×3・実寸）、テキストからデッキ作成
- 能力語 352種のうち 200種が自動処理（`design/ability-coverage.md`、2026-11-27 計測。grammar を入れた後は再計測していない）

## やりかけ・気になる点
- **能力テキストの読み取りを作り替え中**（[[howto/text-parser-rewrite]]）。字句解析 `lexer.ts` と構文解析 `grammar.ts` の最初の版ができた。いまは textParser で読めなかった行だけを grammar で読む。次は grammar の読める形を広げ、textParser の正規表現を減らす
- ユーザーの例文で手動だった21行を自動処理にした（エンジンに新しい処理を足した。[[decisions]] 参照）
- 既存テストが2つ落ちている（2026-11-27 確認、lexer を足す前から）：`cards.basic.test.ts` の abilityWords「すべて自動処理になる」（dm:w-16 が partial）、textParser「読めない文は手動…」（manual のはずが draw）。textParser.ts を編集中だった跡と思われる（使い捨ての `__scratch_lines.test.ts` も落ちていたが、2026-11-27 に削除）
- `design/ability-coverage.md` の「未対応」の表は再計測前の一覧のまま（件数は 144 に更新済み）

## 次の候補（README の「未実装」より）
- 超次元・超GR・封印などの特殊ゾーンの処理の残り
- 革命チェンジ・侵略などの特殊な出し方
- 相手の行動に割り込む能力（ニンジャ・ストライクなど）
- リプレイ再生
- 未対応の能力語（144種）
