---
tags: [codemap, generated]
generated: 2026-11-27
---
# コード地図（73ファイル）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

250行以上のファイルは「地図」に関数・メソッドと行番号がある。小さいファイルは直接読んでよい。

| ファイル | 行 | 中身（先頭コメント / export / describe） | 地図 |
|---|---|---|---|
| `e2e/smoke.spec.ts` | 18 |  |  |
| `src/core/ai/cpu.ts` | 170 | CPU AI。ゲーム状態を見て合法なアクションを1つ返す（1回の呼び出しで1手）。 |  |
| `src/core/cards/abilityWordList.ts` | 35 | 能力語の一覧（design/ability-coverage.md の「特殊能力」352種から作った、並びは文字コード順）。 |  |
| `src/core/cards/cards.basic.test.ts` | 1313 | textParser / 能力テキストの読み取り / 読み取った効果がエンジンで動く / 能力テキストの読み取り（公式の書式・キーワード・フィルター） | [[codemap/src-core-cards-cards.basic.test\|地図]] |
| `src/core/cards/cards.decks.test.ts` | 539 | deckCards / デッキのカードがすべて自動処理になる / savedCards / 読み取り | [[codemap/src-core-cards-cards.decks.test\|地図]] |
| `src/core/cards/cards.engine.test.ts` | 2301 | engineMore / 読み取り / エンジンで動く / 別のコストでの使い方 | [[codemap/src-core-cards-cards.engine.test\|地図]] |
| `src/core/cards/cards.newParser.test.ts` | 758 | lexer / 語に分ける / 動詞の活用 / カッコ・カード名・能力語 | [[codemap/src-core-cards-cards.newParser.test\|地図]] |
| `src/core/cards/cards.special.test.ts` | 1167 | hyperspatial / 読み取り / 覚醒・解除 / ドラグハート | [[codemap/src-core-cards-cards.special.test\|地図]] |
| `src/core/cards/effects.ts` | 51 | 移動先ごとの情報。新しい移動先を足す時はここと MoveDest に1行足すだけで、 |  |
| `src/core/cards/grammar.ts` | 1367 | 能力テキストの構文解析：字句解析（lexer.ts）で分けた語の並びを、誘発・条件・目的語・動詞の部品として読み、効果定義を組み立てる。 | [[codemap/src-core-cards-grammar\|地図]] |
| `src/core/cards/lexer.ts` | 467 | 能力テキストの字句解析：カードの能力の文を「語」に分け、語ごとに品詞（種類）と意味を付ける。 | [[codemap/src-core-cards-lexer\|地図]] |
| `src/core/cards/lineDefs.ts` | 204 | 能力の文ごとの効果定義。 |  |
| `src/core/cards/officialConvert.ts` | 329 | 公式カード検索の詳細（OfficialCardDetail）を、デッキ構築・対戦で使うカード定義に変換する。 | [[codemap/src-core-cards-officialConvert\|地図]] |
| `src/core/cards/registry.ts` | 82 | カードIDからカード定義を引く辞書。エンジン・UI 共通で使う。 |  |
| `src/core/cards/textParser.ts` | 3227 | 公式カードの能力テキスト（日本語）を、エンジンが処理できる効果定義に変換する。 | [[codemap/src-core-cards-textParser\|地図]] |
| `src/core/cards/types.ts` | 926 | カードの基本情報（カードデータ）の型定義。 | [[codemap/src-core-cards-types\|地図]] |
| `src/core/deck/deckText.test.ts` | 105 | parseDeckText / カード名の照合 / deckToText |  |
| `src/core/deck/deckText.ts` | 184 | AI やメモで書いたデッキリスト（表・箇条書き）のテキストから「カード名と枚数」を読み取る。 |  |
| `src/core/deck/rules.test.ts` | 47 | デッキ構成チェック / カード検索 |  |
| `src/core/deck/rules.ts` | 98 | デッキ構成ルール。フォーマットごとに差し替えられる。 |  |
| `src/core/engine/effects.test.ts` | 398 | 常在効果 / 置換効果 / 誘発タイミング / ツインパクト | [[codemap/src-core-engine-effects.test\|地図]] |
| `src/core/engine/engine.test.ts` | 333 | ゲーム開始 / ターン進行 / 召喚・呪文 / 攻撃 | [[codemap/src-core-engine-engine.test\|地図]] |
| `src/core/engine/engine.ts` | 3606 | ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、 | [[codemap/src-core-engine-engine\|地図]] |
| `src/core/engine/legal.ts` | 58 | 入力待ちでない時にターンプレイヤーが取れる合法アクションの一覧。 |  |
| `src/core/engine/order.test.ts` | 148 | 効果の処理順 / 置換効果が2つ以上ある時 |  |
| `src/core/engine/queries.ts` | 998 | ゲーム状態を読むだけの関数群（状態を変更しない）。UI・AI・エンジンで共用する。 | [[codemap/src-core-engine-queries\|地図]] |
| `src/core/engine/rng.ts` | 10 | 決定的な乱数（mulberry32）。状態を GameState に保存するので保存・復元・リプレイで再現できる。 |  |
| `src/core/engine/setup.ts` | 109 | PlayerSetup, NewGameOptions, createGame |  |
| `src/core/engine/types.ts` | 328 | 対戦中のカード個体。同名カードでも iid で個別に識別する。 | [[codemap/src-core-engine-types\|地図]] |
| `src/core/print/proxyPdf.test.ts` | 59 | proxyLayout / buildPdf |  |
| `src/core/print/proxyPdf.ts` | 184 | プロキシカード印刷用の A4 レイアウトと、最小限の PDF 書き出し（外部ライブラリなし）。 |  |
| `src/core/testing/abilitySamples.ts` | 67 | 能力テキストの例文集（ユーザーが挙げた実際のカードの文）。 |  |
| `src/core/testing/fixtureCards.ts` | 243 | テスト専用のカード（アプリには含めない）。 |  |
| `src/db/backup.test.ts` | 40 | backup |  |
| `src/db/backup.ts` | 101 | カード・画像・デッキを1つの JSON ファイルに書き出し、別のブラウザ（GitHub Pages 版など）で読み込む。 |  |
| `src/db/db.ts` | 67 | SettingRow, MatchRecord, SavedGame, ImageRow, AppDB, db |  |
| `src/db/imageCache.ts` | 125 | IndexedDB に保存した画像を object URL にして表示する。 |  |
| `src/main.tsx` | 14 |  |  |
| `src/net/peer.ts` | 100 | PeerJS の薄いラッパー。シグナリングには PeerJS の公開サーバー（0.peerjs.com）を使い、 |  |
| `src/net/protocol.test.ts` | 49 | online protocol helpers |  |
| `src/net/protocol.ts` | 73 | オンライン対戦（PeerJS）でやり取りするメッセージ。 |  |
| `src/server/dmApi.ts` | 43 | 公式カード検索の中継の本体（Vite のサーバーと、Pages 版のブラウザ内ブリッジで共有する）。 |  |
| `src/server/dmOfficial.test.ts` | 103 | 公式カード検索の解析 / 公式カードの変換 / 画像の中継 |  |
| `src/server/dmOfficial.ts` | 321 | デュエル・マスターズ公式カード検索（https://dm.takaratomy.co.jp/card/）の | [[codemap/src-server-dmOfficial\|地図]] |
| `src/server/vitePlugin.ts` | 39 | 公式カード検索の中継。開発サーバー（npm run dev）とプレビュー（npm run preview）で動く。経路は dmApi.ts を参照。 |  |
| `src/store/appStore.ts` | 180 | 保存済みの公式カードは、読み込むたびに能力テキストを読み直す（読み取りの改良を反映するため） |  |
| `src/store/battleStore.ts` | 188 | BattleMode, NetBridge, setNetBridge, isCpuTurnPlayer, useBattle |  |
| `src/store/officialCards.ts` | 144 | isOfficialSaved, saveOfficialCard, repairBackImages, saveOfficialCards, deleteAllOfficialC |  |
| `src/store/onlineStore.ts` | 293 | OnlineRole, OnlineStatus, useOnline | [[codemap/src-store-onlineStore\|地図]] |
| `src/ui/App.tsx` | 74 | App |  |
| `src/ui/components/AppShell.tsx` | 48 | アプリ全体の枠組み（design/app-ui.md）：左ナビ 64px ＋ 上部バー 48px ＋ メイン。対戦画面だけは枠なしの全画面。 |  |
| `src/ui/components/BridgeImport.tsx` | 54 | ブックマークレットを押したページ（公式の検索結果・カード詳細）に出ていたカードを、自動で保存する。 |  |
| `src/ui/components/CardDetail.tsx` | 93 | 公式カードのうち、自動処理できず手動で処理する能力の行 |  |
| `src/ui/components/CardFilter.tsx` | 62 | カード検索フォーム（デッキ構築・図鑑で共用）。2列にまとめて縦に伸ばさない |  |
| `src/ui/components/CardView.tsx` | 111 | CIV_COLOR, civGradient, CardSize, CardView |  |
| `src/ui/components/DeckPicker.tsx` | 94 | デッキの代表カード（指定したカード、なければコストが一番高いカード）と文明ごとの枚数 |  |
| `src/ui/components/DeckTextImport.tsx` | 225 | DeckTextImport |  |
| `src/ui/components/OfficialBridgePanel.tsx` | 52 | 中継サーバーのない版（GitHub Pages）で、公式サイトとつなぐ手順とブックマークレットを出す。 |  |
| `src/ui/components/OfficialPicker.tsx` | 170 | OfficialPicker |  |
| `src/ui/components/ProxyPrintDialog.tsx` | 77 | ProxyPrintDialog |  |
| `src/ui/officialApi.ts` | 45 | 公式カード検索の中継（/dm-api/*）を呼ぶ小さなヘルパー |  |
| `src/ui/officialBridge.ts` | 171 | 中継サーバーのない環境（GitHub Pages 版）で公式カード検索を使うための「ブリッジ」。 |  |
| `src/ui/proxyPrint.ts` | 201 | デッキからプロキシ印刷用の A4 PDF を作る。 |  |
| `src/ui/screens/Battle.tsx` | 1047 | BattleScreen | [[codemap/src-ui-screens-Battle\|地図]] |
| `src/ui/screens/BattleSetup.tsx` | 103 | BattleSetupScreen |  |
| `src/ui/screens/DeckBuilder.tsx` | 373 | DeckBuilderScreen | [[codemap/src-ui-screens-DeckBuilder\|地図]] |
| `src/ui/screens/Home.tsx` | 148 | HomeScreen, DeckListScreen |  |
| `src/ui/screens/Library.tsx` | 159 | LibraryScreen |  |
| `src/ui/screens/Menus.tsx` | 223 | SettingsScreen, HistoryScreen |  |
| `src/ui/screens/OfficialSearch.tsx` | 294 | OfficialSearchScreen | [[codemap/src-ui-screens-OfficialSearch\|地図]] |
| `src/ui/screens/Online.tsx` | 133 | OnlineScreen |  |
| `src/ui/screens/battleDrag.ts` | 92 | ドラッグの落とし先。盤面の要素に data-drop="zone:0:mana" / "card:<iid>" / "plate:1" で付ける |  |
| `src/ui/screens/battleFx.tsx` | 329 | ActionFx | [[codemap/src-ui-screens-battleFx\|地図]] |
