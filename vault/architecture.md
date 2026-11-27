---
tags: [architecture]
updated: 2026-11-27
---
# 構成とデータの流れ

詳しい説明は README.md にある。ここは要点だけ。

## レイヤー

```
UI (src/ui)  ──Action──▶  store (src/store, Zustand)  ──applyAction──▶  engine (src/core/engine)
   ▲                                   │                                      │
   └──────────── GameState ◀───────────┘◀──────────── 新しい GameState ◀──────┘
カード定義: src/core/cards（types / textParser / lineDefs / officialConvert / registry）
保存: src/db（IndexedDB・Dexie）  通信: src/net（PeerJS）  公式取得: src/server（Vite 中継 / ブックマークレット）
```

## エンジン（`src/core/engine/engine.ts`）
- 入口は `applyAction(state, action, reg)`。中で `Ctx` を作り `handle(action)` → `run()` でキューを回す。違反は `IllegalAction` を投げ、元の状態と `error` を返す。
- **キュー**：`state.queue` の `Task` を `exec(task)` が1つずつ解決。選択が要る時は `state.pending` を立てて止まり、`RESPOND` で再開。
- **効果**：`EffectDef` は `execEffect` の巨大な switch（`type` ごとの case）で処理。対象選びは `withTargets`。
- **誘発**：`emit(event)` がイベントごとに `triggerFrom` / `triggerOthers` で誘発能力を積む。
- **離れる時の置換**：`execLeave`。状態起因処理は `checkStateBased`、勝敗は `gameOver`。
- 状態を変えない問い合わせ（パワー・キーワード・コスト・攻撃先・対象候補・条件判定）は `queries.ts`。
- 乱数はシード付き（`rng.ts`）なので同じ操作で同じ対戦になる。

## カード（`src/core/cards`）
- `types.ts`：`CardDefinition`、`EffectDef`（効果の部品）、`TriggerEvent`、`StaticAbility`、`ReplacementAbility`、`Keywords` などの型。
- `lexer.ts`：能力テキストの字句解析（語に分けて品詞を付ける）。`grammar.ts`：構文解析（語の並び→効果定義）。textParser で読めなかった行を読む → [[howto/text-parser-rewrite]]
- `textParser.ts`：公式の能力テキスト（日本語）→ 効果定義。入口 `parseAbilityText(text, kind)`、1行ごとの本体は `parseLine`（巨大な正規表現の分岐）。読めない行は `manualLines` に入り「手動処理」になる。
- `lineDefs.ts`：パーサーで読めない／読み間違える**文そのもの**に、手書きの効果定義を当てる表（`BUILT_IN_LINE_DEFS`）。パーサーより優先。
- `officialConvert.ts`：公式の詳細 → `CardDefinition`。`applyParsedEffects` で保存済みカードも読み直す。`support` は full / partial / manual。

## 画面（`src/ui`）
- 画面の切り替えは `appStore` の `Screen`。対戦は `screens/Battle.tsx`（大きい）＋ `battleDrag.ts` / `battleFx.tsx`。
- 対戦の状態は `battleStore`（mode: cpu / solo / online）。オンラインは `onlineStore` + `net/peer.ts`（ホストがエンジンを動かす）。

## 関連
- [[howto/add-ability]] / [[codemap/_index]]
