---
tags: [report, generated]
generated: 2026-11-27
---
# 字句解析レポート

> 自動生成（`npm run lexer:report`）。大きいので Claude は grep で引く。

- テストに書かれたカードの文 418 行・18267 文字のうち、辞書にない文字 419（2.3%）

## 辞書にない語（多い順）

...(9) · ドラゴン(7) · 魔導具(7) · コマンド(6) · ハンター(5) · じゃんけん(4) · アビス(3) · ディスペクター(3) · S(3) · サイキック(3) · ジョーカーズ(2) · ビートジョッキー(2) · リキッド・ピープル(2) · ジャイアント(2) · スノーフェアリー(2) · 補足(2) · エグザイル(2) · テスト(2) · ▼(2) · エイリアン(2) · ―(2) · 束(2) · シノビ(2) · 紅蓮族(2) · 手動(2) · そ(1) · サムライ(1) · ミステリー・トーテム(1) · アースイーター(1) · マフィ・ギャング(1) · ナイト(1) · 逆(1) · さま(1) · さ(1) · あ(1) · ハイパーモード(1) · ブルー・インパルス(1) · 真実(1) · 極(1) · めよ(1) · ジョニー(1) · !(1) · 正(1) · 文(1) · 無限大(1) · 級(1) · 謎(1) · レクスターズ(1) · ゼニス(1) · エンジェル・コマンド(1) · **(1) · ?(1) · 表(1) · 裏(1) · 者(1) · 龍(1) · そこ(1) · す(1) · 現在(1) · 支払(1) · え(1)

## 例文集（src/core/testing/abilitySamples.ts）

★は今の読み取り（textParser と grammar）でも、クリーチャーとしても呪文としても手動処理になる行。

- ドルスザクを４体まで、自分の手札または墓地からコストを支払わずに召喚してもよい。
  - `ドルスザク[?katakana] を[p] 4体[count:4体] まで[aux:until] 、 自分[player:self] の[p] 手札[zone:hand] または[conj:or] 墓地[zone:graveyard] から[p] コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 召喚して[verb:召喚する/te] もよい[aux:may] 。`
- このターンの後で自分のターンをもう一度行う。
  - `この[demo:this] ターン[noun:turn] の[p] 後[rel:after] で[p] 自分[player:self] の[p] ターン[noun:turn] を[p] もう[adv:more] 1度[count:1度] 行う[verb:行う/plain] 。`
- スーパー・S・トリガー（このクリーチャーを自分のシールドゾーンから手札に加える時、コストを支払わずにすぐ召喚してもよい。その時自分のシールドが１つもなければ、このクリーチャーにxB能力を与える）
  - `スーパー・S・トリガー[kw] (この[demo:this] クリーチャー[noun:creature] を[p] 自分[player:self] の[p] シールドゾーン[zone:shield] から[p] 手札[zone:hand] に[p] 加える[verb:加える/plain] 時[aux:when] 、 コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] すぐ[adv:immediately] 召喚して[verb:召喚する/te] もよい[aux:may] 。 その[demo:that] 時[aux:when] 自分[player:self] の[p] シールド[noun:shield] が[p] 1つ[count:1つ] も[p] なければ[aux:not] 、 この[demo:this] クリーチャー[noun:creature] に[p] xB[label] 能力[noun:ability] を[p] 与える[verb:与える/plain])`
- カードを１枚引く。
  - `カード[noun:card] を[p] 1枚[count:1枚] 引く[verb:引く/plain] 。`
- xB次の自分のターンの終わりまで、相手のクリーチャーは攻撃もブロックもできない。
  - `xB[label] 次[time:next] の[p] 自分[player:self] の[p] ターン[noun:turn] の[p] 終わり[time:end] まで[aux:until] 、 相手[player:opponent] の[p] クリーチャー[noun:creature] は[p] 攻撃[verb:攻撃する/stem] も[p] ブロック[verb:ブロックする/stem] も[p] できない[verb:できる/nai] 。`
- {GS} G・ストライク（このカードを自分のシールドゾーンから手札に加える時、表向きにし、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）
  - `{GS}[icon] G・ストライク[kw] (この[demo:this] カード[noun:card] を[p] 自分[player:self] の[p] シールドゾーン[zone:shield] から[p] 手札[zone:hand] に[p] 加える[verb:加える/plain] 時[aux:when] 、 表向き[noun:faceUp] に[p] し[verb:する/renyo] 、 相手[player:opponent] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] 選んで[verb:選ぶ/te] もよい[aux:may] 。 この[demo:this] ターン[noun:turn] 、 その[demo:that] クリーチャー[noun:creature] は[p] 攻撃できない[verb:攻撃する/cannot])`
- ジャストダイバー（このクリーチャーが出た時、次の自分のターンのはじめまで、このクリーチャーは相手に選ばれず、攻撃されない）
  - `ジャストダイバー[kw] (この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 次[time:next] の[p] 自分[player:self] の[p] ターン[noun:turn] の[p] はじめ[time:start] まで[aux:until] 、 この[demo:this] クリーチャー[noun:creature] は[p] 相手[player:opponent] に[p] 選ばれず[verb:選ぶ/passiveNu] 、 攻撃されない[verb:攻撃する/passiveNai])`
- 相手のクリーチャーが出た時、それが相手のマナゾーンにあるカードの枚数よりコストが大きいクリーチャーなら、持ち主の手札に戻してもよい。
  - `相手[player:opponent] の[p] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 それ[demo:it] が[p] 相手[player:opponent] の[p] マナゾーン[zone:mana] に[p] ある[verb:ある/plain] カード[noun:card] の[p] 枚数[noun:amount] より[p] コスト[stat:cost] が[p] 大きい[cmp:big] クリーチャー[noun:creature] なら[aux:if] 、 持ち主[player:holder] の[p] 手札[zone:hand] に[p] 戻して[verb:戻す/te] もよい[aux:may] 。`
- 無月の門：自分の魔導具をバトルゾーンに出した時、自分の魔導具をバトルゾーンと墓地から２つずつ選び、このクリーチャーを自分の手札または墓地からそれら４枚の上にコストを支払わずに召喚してもよい。
  - `無月の門[kw] : 自分[player:self] の[p] 魔導具[?kanji] を[p] バトルゾーン[zone:battle] に[p] 出した[verb:出す/ta] 時[aux:when] 、 自分[player:self] の[p] 魔導具[?kanji] を[p] バトルゾーン[zone:battle] と[p] 墓地[zone:graveyard] から[p] 2つ[count:2つ] ずつ[p] 選び[verb:選ぶ/renyo] 、 この[demo:this] クリーチャー[noun:creature] を[p] 自分[player:self] の[p] 手札[zone:hand] または[conj:or] 墓地[zone:graveyard] から[p] それら[demo:they] 4枚[count:4枚] の[p] 上[rel:top] に[p] コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 召喚して[verb:召喚する/te] もよい[aux:may] 。`
- W・ブレイカー
  - `W・ブレイカー[kw]`
- このクリーチャーがバトルゾーンに出た時、相手のシールドを２つブレイクする。その後、自分のシールドを２つブレイクする。
  - `この[demo:this] クリーチャー[noun:creature] が[p] バトルゾーン[zone:battle] に[p] 出た[verb:出る/ta] 時[aux:when] 、 相手[player:opponent] の[p] シールド[noun:shield] を[p] 2つ[count:2つ] ブレイクする[verb:ブレイクする/plain] 。 その後[conj:then] 、 自分[player:self] の[p] シールド[noun:shield] を[p] 2つ[count:2つ] ブレイクする[verb:ブレイクする/plain] 。`
- 自分のシールドが１つもなければ、このクリーチャーに「ブロッカー」を与える。
  - `自分[player:self] の[p] シールド[noun:shield] が[p] 1つ[count:1つ] も[p] なければ[aux:not] 、 この[demo:this] クリーチャー[noun:creature] に[p] 「ブロッカー[kw]」 を[p] 与える[verb:与える/plain] 。`
- いずれかのプレイヤーのシールドを１つ見る。それを持ち主の墓地に置いてもよい。そうしたら、そのプレイヤーは自身の山札の上から１枚目を裏向きのまま、新しいシールドとしてシールドゾーンに置く。
  - `いずれか[quant:either] の[p] プレイヤー[noun:player] の[p] シールド[noun:shield] を[p] 1つ[count:1つ] 見る[verb:見る/plain] 。 それ[demo:it] を[p] 持ち主[player:holder] の[p] 墓地[zone:graveyard] に[p] 置いて[verb:置く/te] もよい[aux:may] 。 そうしたら[conj:ifDone] 、 その[demo:that] プレイヤー[noun:player] は[p] 自身[player:own] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 1枚目[count:1枚目] を[p] 裏向き[noun:faceDown] の[p] まま[aux:keep] 、 新しい[adj:new] シールド[noun:shield] として[p] シールドゾーン[zone:shield] に[p] 置く[verb:置く/plain] 。`
- カードを１枚引く。
  - `カード[noun:card] を[p] 1枚[count:1枚] 引く[verb:引く/plain] 。`
- このクリーチャーをバトルゾーンに出した時、自分のクリーチャーを１体と、相手のクリーチャーを１体、バトルゾーンから選んでもよい。その２体をバトルさせる。
  - `この[demo:this] クリーチャー[noun:creature] を[p] バトルゾーン[zone:battle] に[p] 出した[verb:出す/ta] 時[aux:when] 、 自分[player:self] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] と[p] 、 相手[player:opponent] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] 、 バトルゾーン[zone:battle] から[p] 選んで[verb:選ぶ/te] もよい[aux:may] 。 その[demo:that] 2体[count:2体] を[p] バトルさせる[verb:バトルする/causative] 。`
- T・ブレイカー（このクリーチャーはシールドを３枚ブレイクする）
  - `T・ブレイカー[kw] (この[demo:this] クリーチャー[noun:creature] は[p] シールド[noun:shield] を[p] 3枚[count:3枚] ブレイクする[verb:ブレイクする/plain])`
- ドラゴンではないクリーチャーがバトルゾーンに出る時、バトルゾーンに出るかわりに持ち主の墓地に置かれる
  - `ドラゴン[?katakana] で[p] は[p] ない[aux:not] クリーチャー[noun:creature] が[p] バトルゾーン[zone:battle] に[p] 出る[verb:出る/plain] 時[aux:when] 、 バトルゾーン[zone:battle] に[p] 出る[verb:出る/plain] かわりに[conj:instead] 持ち主[player:holder] の[p] 墓地[zone:graveyard] に[p] 置かれる[verb:置く/passive]`
- スピードアタッカーパワーアタッカー+5000このクリーチャーが攻撃する時、相手とガチンコ・ジャッジする。自分が勝ったら、このターンの後にもう一度自分のターンを行う。(ガチンコ・ジャッジ：各プレイヤーは自身の山札の上から１枚目を見せ、それを一番下に置く。そのカードのコストが相手以上であれば、自分の勝ちとする)
  - `スピードアタッカー[kw] パワーアタッカー[kw] +5000[num:+5000] この[demo:this] クリーチャー[noun:creature] が[p] 攻撃する[verb:攻撃する/plain] 時[aux:when] 、 相手[player:opponent] と[p] ガチンコ・ジャッジ[kw] する[verb:する/plain] 。 自分[player:self] が[p] 勝ったら[verb:勝つ/tara] 、 この[demo:this] ターン[noun:turn] の[p] 後[rel:after] に[p] もう[adv:more] 1度[count:1度] 自分[player:self] の[p] ターン[noun:turn] を[p] 行う[verb:行う/plain] 。 (ガチンコ・ジャッジ[kw] : 各プレイヤー[player:each] は[p] 自身[player:own] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 1枚目[count:1枚目] を[p] 見せ[verb:見せる/renyo] 、 それ[demo:it] を[p] 一番下[rel:bottommost] に[p] 置く[verb:置く/plain] 。 その[demo:that] カード[noun:card] の[p] コスト[stat:cost] が[p] 相手[player:opponent] 以上[cmp:>=] で[p] あれば[verb:ある/ba] 、 自分[player:self] の[p] 勝ち[verb:勝つ/renyo] と[p] する[verb:する/plain])`
- 革命チェンジ：光または火のコスト５以上のドラゴン
  - `革命チェンジ[kw] : 光[civ:light] または[conj:or] 火[civ:fire] の[p] コスト[stat:cost] 5[num:5] 以上[cmp:>=] の[p] ドラゴン[?katakana]`
- ブロッカー
  - `ブロッカー[kw]`
- T・ブレイカー
  - `T・ブレイカー[kw]`
- 自分のターンの終わりに、自分の多色クリーチャーをすべて、アンタップする。
  - `自分[player:self] の[p] ターン[noun:turn] の[p] 終わり[time:end] に[p] 、 自分[player:self] の[p] 多色[civ:multi] クリーチャー[noun:creature] を[p] すべて[quant:all] 、 アンタップする[verb:アンタップする/plain] 。`
- ファイナル革命：このクリーチャーが「革命チェンジ」によってバトルゾーンに出た時、そのターン中に他の「ファイナル革命」をまだ使っていなければ、自分の山札の上から４枚を表向きにする。その中から進化ではない多色クリーチャーを、コストの合計が６以下になるように好きな数選び、バトルゾーンに出す。残りを好きな順序で山札の下に置く。
  - `ファイナル革命[kw] : この[demo:this] クリーチャー[noun:creature] が[p] 「革命チェンジ[kw]」 によって[p] バトルゾーン[zone:battle] に[p] 出た[verb:出る/ta] 時[aux:when] 、 その[demo:that] ターン[noun:turn] 中[rel:in] に[p] 他[demo:other] の[p] 「ファイナル革命[kw]」 を[p] まだ[adv:yet] 使って[verb:使う/te] いなければ[verb:いる/nakereba] 、 自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 4枚[count:4枚] を[p] 表向き[noun:faceUp] に[p] する[verb:する/plain] 。 その[demo:that] 中[rel:in] から[p] 進化[verb:進化する/stem] で[p] は[p] ない[aux:not] 多色[civ:multi] クリーチャー[noun:creature] を[p] 、 コスト[stat:cost] の[p] 合計[noun:total] が[p] 6[num:6] 以下[cmp:<=] に[p] なる[verb:なる/plain] ように[aux:manner] 好きな数[quant:any] 選び[verb:選ぶ/renyo] 、 バトルゾーン[zone:battle] に[p] 出す[verb:出す/plain] 。 残り[rel:rest] を[p] 好きな[quant:whichever] 順序[noun:order] で[p] 山札[zone:deck] の[p] 下[rel:bottom] に[p] 置く[verb:置く/plain] 。`
- ドラゴン・W・ブレイカー（このクリーチャーはシールドを２つブレイクする。各ブレイクの前に、自分の山札の上から１枚目を、裏向きのまま新しいシールドとして自分のシールドゾーンに置くか、表向きにして自分のシールド１つの上に置く）
  - `ドラゴン・W・ブレイカー[kw] (この[demo:this] クリーチャー[noun:creature] は[p] シールド[noun:shield] を[p] 2つ[count:2つ] ブレイクする[verb:ブレイクする/plain] 。 各[quant:each] ブレイク[verb:ブレイクする/stem] の[p] 前[rel:before] に[p] 、 自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 1枚目[count:1枚目] を[p] 、 裏向き[noun:faceDown] の[p] まま[aux:keep] 新しい[adj:new] シールド[noun:shield] として[p] 自分[player:self] の[p] シールドゾーン[zone:shield] に[p] 置く[verb:置く/plain] か[p] 、 表向き[noun:faceUp] に[p] して[verb:する/te] 自分[player:self] の[p] シールド[noun:shield] 1つ[count:1つ] の[p] 上[rel:top] に[p] 置く[verb:置く/plain])`
- このクリーチャーがバトルゾーンに出た時、バトルゾーンにある相手のカードを１枚選び、表向きにして持ち主のシールド１つの上に置く。
  - `この[demo:this] クリーチャー[noun:creature] が[p] バトルゾーン[zone:battle] に[p] 出た[verb:出る/ta] 時[aux:when] 、 バトルゾーン[zone:battle] に[p] ある[verb:ある/plain] 相手[player:opponent] の[p] カード[noun:card] を[p] 1枚[count:1枚] 選び[verb:選ぶ/renyo] 、 表向き[noun:faceUp] に[p] して[verb:する/te] 持ち主[player:holder] の[p] シールド[noun:shield] 1つ[count:1つ] の[p] 上[rel:top] に[p] 置く[verb:置く/plain] 。`
- 自分のクリーチャーがバトルゾーンを離れる時、かわりにいずれかのシールドゾーンにある表向きのカードを１枚選び、持ち主の墓地に置いてもよい
  - `自分[player:self] の[p] クリーチャー[noun:creature] が[p] バトルゾーン[zone:battle] を[p] 離れる[verb:離れる/plain] 時[aux:when] 、 かわりに[conj:instead] いずれか[quant:either] の[p] シールドゾーン[zone:shield] に[p] ある[verb:ある/plain] 表向き[noun:faceUp] の[p] カード[noun:card] を[p] 1枚[count:1枚] 選び[verb:選ぶ/renyo] 、 持ち主[player:holder] の[p] 墓地[zone:graveyard] に[p] 置いて[verb:置く/te] もよい[aux:may]`
- 相手のターンの終わりに、相手がそのターン中、マナゾーンのカードをタップせずに、クリーチャーを出すか呪文を唱えていて、バトルゾーンに自分の 《流星のガイアッシュ・カイザー》がなければ、このクリーチャーをコストを支払わずに召喚してもよい。
  - `相手[player:opponent] の[p] ターン[noun:turn] の[p] 終わり[time:end] に[p] 、 相手[player:opponent] が[p] その[demo:that] ターン[noun:turn] 中[rel:in] 、 マナゾーン[zone:mana] の[p] カード[noun:card] を[p] タップせず[verb:タップする/nu] に[p] 、 クリーチャー[noun:creature] を[p] 出す[verb:出す/plain] か[p] 呪文[noun:spell] を[p] 唱えて[verb:唱える/te] いて[verb:いる/te] 、 バトルゾーン[zone:battle] に[p] 自分[player:self] の[p] 《流星のガイアッシュ・カイザー》[name] が[p] なければ[aux:not] 、 この[demo:this] クリーチャー[noun:creature] を[p] コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 召喚して[verb:召喚する/te] もよい[aux:may] 。`
- W・ブレイカー
  - `W・ブレイカー[kw]`
- このクリーチャーが出た時、カードを２枚引く。
  - `この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 カード[noun:card] を[p] 2枚[count:2枚] 引く[verb:引く/plain] 。`
- 自分のコスト10以上のクリーチャーの召喚コストを４少なくする。ただし、コストは０以下にはならない。
  - `自分[player:self] の[p] コスト[stat:cost] 10[num:10] 以上[cmp:>=] の[p] クリーチャー[noun:creature] の[p] 召喚[verb:召喚する/stem] コスト[stat:cost] を[p] 4[num:4] 少なく[cmp:less/adv] する[verb:する/plain] 。 ただし[conj:however] 、 コスト[stat:cost] は[p] 0[num:0] 以下[cmp:<=] に[p] は[p] ならない[verb:なる/nai] 。`
- 相手のクリーチャーは出たターン、自分を攻撃できない。
  - `相手[player:opponent] の[p] クリーチャー[noun:creature] は[p] 出た[verb:出る/ta] ターン[noun:turn] 、 自分[player:self] を[p] 攻撃できない[verb:攻撃する/cannot] 。`
- CRY-S-MAX進化：自分がゲームに負ける時またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊するか、自分のシールドを１つ墓地に置いてもよい。（このクリーチャーは進化元を必要としない。自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す）
  - `CRY-S-MAX進化[kw] : 自分[player:self] が[p] ゲーム[noun:game] に[p] 負ける[verb:負ける/plain] 時[aux:when] または[conj:or] この[demo:this] クリーチャー[noun:creature] が[p] 離れる[verb:離れる/plain] 時[aux:when] 、 かわりに[conj:instead] 自分[player:self] の[p] 表向き[noun:faceUp] の[p] カード[noun:card] を[p] 3枚[count:3枚] 破壊する[verb:破壊する/plain] か[p] 、 自分[player:self] の[p] シールド[noun:shield] を[p] 1つ[count:1つ] 墓地[zone:graveyard] に[p] 置いて[verb:置く/te] もよい[aux:may] 。 (この[demo:this] クリーチャー[noun:creature] は[p] 進化元[noun:evolutionSource] を[p] 必要[noun:need] と[p] しない[verb:する/nai] 。 自分[player:self] の[p] S-MAX進化[kw] クリーチャー[noun:creature] が[p] 2体[count:2体] 以上[cmp:>=] あれば[verb:ある/ba] 、 そのうち[demo:among] の[p] 1体[count:1体] を[p] 残し[verb:残す/renyo] 、 残り[rel:rest] を[p] すべて[quant:all] 手札[zone:hand] に[p] 戻す[verb:戻す/plain])`
- マッハファイター
  - `マッハファイター[kw]`
- スレイヤー
  - `スレイヤー[kw]`
- W・ブレイカー
  - `W・ブレイカー[kw]`
- 鬼エンド：このクリーチャーの攻撃の終わりに、シールドが１つもないプレイヤーがいれば、このクリーチャーをアンタップする。
  - `鬼エンド[kw] : この[demo:this] クリーチャー[noun:creature] の[p] 攻撃[verb:攻撃する/stem] の[p] 終わり[time:end] に[p] 、 シールド[noun:shield] が[p] 1つ[count:1つ] も[p] ない[aux:not] プレイヤー[noun:player] が[p] いれば[verb:いる/ba] 、 この[demo:this] クリーチャー[noun:creature] を[p] アンタップする[verb:アンタップする/plain] 。`
- S・トリガー(この呪文をシールドゾーンから手札に加える時、コストを支払わずにすぐ唱えてもよい)
  - `S・トリガー[kw] (この[demo:this] 呪文[noun:spell] を[p] シールドゾーン[zone:shield] から[p] 手札[zone:hand] に[p] 加える[verb:加える/plain] 時[aux:when] 、 コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] すぐ[adv:immediately] 唱えて[verb:唱える/te] もよい[aux:may])`
- このターン、クリーチャーは攻撃することができない。
  - `この[demo:this] ターン[noun:turn] 、 クリーチャー[noun:creature] は[p] 攻撃する[verb:攻撃する/plain] こと[aux:koto] が[p] できない[verb:できる/nai] 。`
- この呪文を裏向きにしてシールドに加える。その後、自分のシールドを１枚選び、墓地に置く。
  - `この[demo:this] 呪文[noun:spell] を[p] 裏向き[noun:faceDown] に[p] して[verb:する/te] シールド[noun:shield] に[p] 加える[verb:加える/plain] 。 その後[conj:then] 、 自分[player:self] の[p] シールド[noun:shield] を[p] 1枚[count:1枚] 選び[verb:選ぶ/renyo] 、 墓地[zone:graveyard] に[p] 置く[verb:置く/plain] 。`
- Q・ブレイカー
  - `Q・ブレイカー[kw]`
- 相手の「このクリーチャーがバトルゾーンに出た時」で始まる能力を持つクリーチャーがバトルゾーンに出る時、相手はかわりにそのクリーチャーをマナゾーンに置く。
  - `相手[player:opponent] の[p] 「この[demo:this] クリーチャー[noun:creature] が[p] バトルゾーン[zone:battle] に[p] 出た[verb:出る/ta] 時[aux:when]」 で[p] 始まる[verb:始まる/plain] 能力[noun:ability] を[p] 持つ[verb:持つ/plain] クリーチャー[noun:creature] が[p] バトルゾーン[zone:battle] に[p] 出る[verb:出る/plain] 時[aux:when] 、 相手[player:opponent] は[p] かわりに[conj:instead] その[demo:that] クリーチャー[noun:creature] を[p] マナゾーン[zone:mana] に[p] 置く[verb:置く/plain] 。`
- 自分のターン中、クリーチャーを１体、自分のマナゾーンから召喚してもよい。
  - `自分[player:self] の[p] ターン[noun:turn] 中[rel:in] 、 クリーチャー[noun:creature] を[p] 1体[count:1体] 、 自分[player:self] の[p] マナゾーン[zone:mana] から[p] 召喚して[verb:召喚する/te] もよい[aux:may] 。`
- 鬼エンド：クリーチャーが攻撃する時、シールドが１つもないプレイヤーがいて、自分のマナゾーンに闇と火文明があれば、この呪文を自分の手札からコストを支払わずに唱えてもよい。
  - `鬼エンド[kw] : クリーチャー[noun:creature] が[p] 攻撃する[verb:攻撃する/plain] 時[aux:when] 、 シールド[noun:shield] が[p] 1つ[count:1つ] も[p] ない[aux:not] プレイヤー[noun:player] が[p] いて[verb:いる/te] 、 自分[player:self] の[p] マナゾーン[zone:mana] に[p] 闇[civ:darkness] と[p] 火[civ:fire] 文明[stat:civilization] が[p] あれば[verb:ある/ba] 、 この[demo:this] 呪文[noun:spell] を[p] 自分[player:self] の[p] 手札[zone:hand] から[p] コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 唱えて[verb:唱える/te] もよい[aux:may] 。`
- 自分の山札の上から４枚を墓地に置く。こうして墓地に置いたカードの中から、闇または火の、コスト６以下の、進化ではないクリーチャーを１体出す。その後、相手のクリーチャーを１体選んでもよい。その２体をバトルさせる。
  - `自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 4枚[count:4枚] を[p] 墓地[zone:graveyard] に[p] 置く[verb:置く/plain] 。 こうして[demo:thisWay] 墓地[zone:graveyard] に[p] 置いた[verb:置く/ta] カード[noun:card] の[p] 中[rel:in] から[p] 、 闇[civ:darkness] または[conj:or] 火[civ:fire] の[p] 、 コスト[stat:cost] 6[num:6] 以下[cmp:<=] の[p] 、 進化[verb:進化する/stem] で[p] は[p] ない[aux:not] クリーチャー[noun:creature] を[p] 1体[count:1体] 出す[verb:出す/plain] 。 その後[conj:then] 、 相手[player:opponent] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] 選んで[verb:選ぶ/te] もよい[aux:may] 。 その[demo:that] 2体[count:2体] を[p] バトルさせる[verb:バトルする/causative] 。`
- 相手のクリーチャー１体につき、このクリーチャーの召喚コストを１少なくする。ただし、コストは０以下にならない。
  - `相手[player:opponent] の[p] クリーチャー[noun:creature] 1体[count:1体] につき[aux:per] 、 この[demo:this] クリーチャー[noun:creature] の[p] 召喚[verb:召喚する/stem] コスト[stat:cost] を[p] 1[num:1] 少なく[cmp:less/adv] する[verb:する/plain] 。 ただし[conj:however] 、 コスト[stat:cost] は[p] 0[num:0] 以下[cmp:<=] に[p] ならない[verb:なる/nai] 。`
- スピードアタッカー（このクリーチャーは召喚酔いしない）
  - `スピードアタッカー[kw] (この[demo:this] クリーチャー[noun:creature] は[p] 召喚酔い[noun:sickness] しない[verb:する/nai])`
- T・ブレイカー（このクリーチャーはシールドを３つブレイクする）
  - `T・ブレイカー[kw] (この[demo:this] クリーチャー[noun:creature] は[p] シールド[noun:shield] を[p] 3つ[count:3つ] ブレイクする[verb:ブレイクする/plain])`
- このクリーチャーが出た時、相手のパワー13000以下のクリーチャーをすべて破壊する。
  - `この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 相手[player:opponent] の[p] パワー[stat:power] 13000[num:13000] 以下[cmp:<=] の[p] クリーチャー[noun:creature] を[p] すべて[quant:all] 破壊する[verb:破壊する/plain] 。`
- S・トリガー
  - `S・トリガー[kw]`
- ブロッカー（このクリーチャーをタップして、相手クリーチャーの攻撃先をこのクリーチャーに変更してもよい）
  - `ブロッカー[kw] (この[demo:this] クリーチャー[noun:creature] を[p] タップして[verb:タップする/te] 、 相手[player:opponent] クリーチャー[noun:creature] の[p] 攻撃[verb:攻撃する/stem] 先[noun:dest] を[p] この[demo:this] クリーチャー[noun:creature] に[p] 変更して[verb:変更する/te] もよい[aux:may])`
- このクリーチャーが出た時、自分の山札の上から１枚目をタップして自分のマナゾーンに置き、その後、ドラゴン・クリーチャーを１体、自分のマナゾーンから手札に戻す。そのドラゴン以下のコストを持つ相手のクリーチャーを１体選び、持ち主の手札に戻す。
  - `この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 1枚目[count:1枚目] を[p] タップして[verb:タップする/te] 自分[player:self] の[p] マナゾーン[zone:mana] に[p] 置き[verb:置く/renyo] 、 その後[conj:then] 、 ドラゴン[?katakana] ・ クリーチャー[noun:creature] を[p] 1体[count:1体] 、 自分[player:self] の[p] マナゾーン[zone:mana] から[p] 手札[zone:hand] に[p] 戻す[verb:戻す/plain] 。 その[demo:that] ドラゴン[?katakana] 以下[cmp:<=] の[p] コスト[stat:cost] を[p] 持つ[verb:持つ/plain] 相手[player:opponent] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] 選び[verb:選ぶ/renyo] 、 持ち主[player:holder] の[p] 手札[zone:hand] に[p] 戻す[verb:戻す/plain] 。`
- このクリーチャーが出た時、自分の山札の上から１枚目をタップしてマナゾーンに置く。それがドラゴンなら、自分の山札の上からさらにもう１枚、タップしてマナゾーンに置く。
  - `この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] 、 自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 1枚目[count:1枚目] を[p] タップして[verb:タップする/te] マナゾーン[zone:mana] に[p] 置く[verb:置く/plain] 。 それ[demo:it] が[p] ドラゴン[?katakana] なら[aux:if] 、 自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] さらに[conj:also] もう[adv:more] 1枚[count:1枚] 、 タップして[verb:タップする/te] マナゾーン[zone:mana] に[p] 置く[verb:置く/plain] 。`
- 相手がクリーチャーを選ぶ時、このクリーチャーは選べない。（ただし、このクリーチャーを攻撃またはブロックしてもよい）
  - `相手[player:opponent] が[p] クリーチャー[noun:creature] を[p] 選ぶ[verb:選ぶ/plain] 時[aux:when] 、 この[demo:this] クリーチャー[noun:creature] は[p] 選べない[verb:選ぶ/cannot] 。 (ただし[conj:however] 、 この[demo:this] クリーチャー[noun:creature] を[p] 攻撃[verb:攻撃する/stem] または[conj:or] ブロックして[verb:ブロックする/te] もよい[aux:may])`
- 相手のターン中に、相手が召喚以外の方法でクリーチャーをバトルゾーンに出した時、そのクリーチャーを持ち主の手札に戻してもよい。
  - `相手[player:opponent] の[p] ターン[noun:turn] 中[rel:in] に[p] 、 相手[player:opponent] が[p] 召喚[verb:召喚する/stem] 以外[cmp:except] の[p] 方法[noun:way] で[p] クリーチャー[noun:creature] を[p] バトルゾーン[zone:battle] に[p] 出した[verb:出す/ta] 時[aux:when] 、 その[demo:that] クリーチャー[noun:creature] を[p] 持ち主[player:holder] の[p] 手札[zone:hand] に[p] 戻して[verb:戻す/te] もよい[aux:may] 。`
- {GS} G・ストライク
  - `{GS}[icon] G・ストライク[kw]`
- シンカライズ：このタマシードがクリーチャーであるかのように、この上に進化クリーチャーを置いてもよい。
  - `シンカライズ[kw] : この[demo:this] タマシード[noun:tamaseed] が[p] クリーチャー[noun:creature] で[p] ある[verb:ある/plain] か[p] の[p] ように[aux:manner] 、 この[demo:this] 上[rel:top] に[p] 進化クリーチャー[noun:evolution] を[p] 置いて[verb:置く/te] もよい[aux:may] 。`
- このタマシードが出た時、自分の手札を１枚捨て、カードを３枚まで引き、もう一度自分の手札を１枚捨てる。
  - `この[demo:this] タマシード[noun:tamaseed] が[p] 出た[verb:出る/ta] 時[aux:when] 、 自分[player:self] の[p] 手札[zone:hand] を[p] 1枚[count:1枚] 捨て[verb:捨てる/renyo] 、 カード[noun:card] を[p] 3枚[count:3枚] まで[aux:until] 引き[verb:引く/renyo] 、 もう[adv:more] 1度[count:1度] 自分[player:self] の[p] 手札[zone:hand] を[p] 1枚[count:1枚] 捨てる[verb:捨てる/plain] 。`
- このタマシードを自分の手札からマナゾーンに置いた時、アンタップする。
  - `この[demo:this] タマシード[noun:tamaseed] を[p] 自分[player:self] の[p] 手札[zone:hand] から[p] マナゾーン[zone:mana] に[p] 置いた[verb:置く/ta] 時[aux:when] 、 アンタップする[verb:アンタップする/plain] 。`
- S・トリガー（このクリーチャーをシールドゾーンから手札に加える時、コストを支払わずにすぐ召喚してもよい）
  - `S・トリガー[kw] (この[demo:this] クリーチャー[noun:creature] を[p] シールドゾーン[zone:shield] から[p] 手札[zone:hand] に[p] 加える[verb:加える/plain] 時[aux:when] 、 コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] すぐ[adv:immediately] 召喚して[verb:召喚する/te] もよい[aux:may])`
- このクリーチャーをバトルゾーンに出した時、ターンの残りをとばす。（次のプレイヤーのターンをすぐに始める）
  - `この[demo:this] クリーチャー[noun:creature] を[p] バトルゾーン[zone:battle] に[p] 出した[verb:出す/ta] 時[aux:when] 、 ターン[noun:turn] の[p] 残り[rel:rest] を[p] とばす[verb:とばす/plain] 。 (次[time:next] の[p] プレイヤー[noun:player] の[p] ターン[noun:turn] を[p] すぐに[adv:immediately] 始める[verb:始める/plain])`
- ジャストダイバー
  - `ジャストダイバー[kw]`
- スピードアタッカー
  - `スピードアタッカー[kw]`
- 自分のターンのはじめに、このクリーチャーを自分の超次元ゾーンに置いてもよい。そうしたら、《再興王女プリン》ではないエイリアン・クリーチャーを１体、自分の超次元ゾーンから出す。
  - `自分[player:self] の[p] ターン[noun:turn] の[p] はじめ[time:start] に[p] 、 この[demo:this] クリーチャー[noun:creature] を[p] 自分[player:self] の[p] 超次元ゾーン[zone:hyperspatial] に[p] 置いて[verb:置く/te] もよい[aux:may] 。 そうしたら[conj:ifDone] 、 《再興王女プリン》[name] で[p] は[p] ない[aux:not] エイリアン[?katakana] ・ クリーチャー[noun:creature] を[p] 1体[count:1体] 、 自分[player:self] の[p] 超次元ゾーン[zone:hyperspatial] から[p] 出す[verb:出す/plain] 。`
- パンドラ・シフト：（このカードを使うコストの代わりに、 [wf02]を支払ってもよい。そうしたら、このカードを自分の超次元ゾーンに置く。
  - `パンドラ・シフト[kw] : (この[demo:this] カード[noun:card] を[p] 使う[verb:使う/plain] コスト[stat:cost] の[p] 代わりに[conj:instead] 、 [wf02][icon] を[p] 支払って[verb:支払う/te] もよい[aux:may] 。 そうしたら[conj:ifDone] 、 この[demo:this] カード[noun:card] を[p] 自分[player:self] の[p] 超次元ゾーン[zone:hyperspatial] に[p] 置く[verb:置く/plain] 。)`
- このクリーチャーを自分の超次元ゾーンから召喚してもよい。
  - `この[demo:this] クリーチャー[noun:creature] を[p] 自分[player:self] の[p] 超次元ゾーン[zone:hyperspatial] から[p] 召喚して[verb:召喚する/te] もよい[aux:may] 。`
- スピードアタッカー
  - `スピードアタッカー[kw]`
- W・ブレイカー
  - `W・ブレイカー[kw]`
- このクリーチャーが出た時または自分の超次元ゾーンに置かれた時、カードを２枚引く。その後、自分の手札を１枚捨てる。
  - `この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] 時[aux:when] または[conj:or] 自分[player:self] の[p] 超次元ゾーン[zone:hyperspatial] に[p] 置かれた[verb:置く/passiveTa] 時[aux:when] 、 カード[noun:card] を[p] 2枚[count:2枚] 引く[verb:引く/plain] 。 その後[conj:then] 、 自分[player:self] の[p] 手札[zone:hand] を[p] 1枚[count:1枚] 捨てる[verb:捨てる/plain] 。`
- 自分のクリーチャーが攻撃する時、このクリーチャーが自分の手札にあり、その攻撃がこのターン２度目のクリーチャーによる攻撃で、このターン自分の《龍装者 バルチュリス》をバトルゾーンに出していなければ、攻撃の後、このクリーチャーをバトルゾーンに出してもよい。
  - `自分[player:self] の[p] クリーチャー[noun:creature] が[p] 攻撃する[verb:攻撃する/plain] 時[aux:when] 、 この[demo:this] クリーチャー[noun:creature] が[p] 自分[player:self] の[p] 手札[zone:hand] に[p] あり[verb:ある/renyo] 、 その[demo:that] 攻撃[verb:攻撃する/stem] が[p] この[demo:this] ターン[noun:turn] 2度[count:2度] 目[p] の[p] クリーチャー[noun:creature] に[p] よる[verb:よる/plain] 攻撃[verb:攻撃する/stem] で[p] 、 この[demo:this] ターン[noun:turn] 自分[player:self] の[p] 《龍装者バルチュリス》[name] を[p] バトルゾーン[zone:battle] に[p] 出して[verb:出す/te] いなければ[verb:いる/nakereba] 、 攻撃[verb:攻撃する/stem] の[p] 後[rel:after] 、 この[demo:this] クリーチャー[noun:creature] を[p] バトルゾーン[zone:battle] に[p] 出して[verb:出す/te] もよい[aux:may] 。`
- スピードアタッカー（このクリーチャーは召喚酔いしない）
  - `スピードアタッカー[kw] (この[demo:this] クリーチャー[noun:creature] は[p] 召喚酔い[noun:sickness] しない[verb:する/nai])`

## 未対応の能力語の文の分かれ方（design/ability-coverage.md の「未対応」）

### CRY-S-MAX進化
理由：能力語を知らない

### DL-Sys
理由：能力語を知らない

### Dスイッチ
理由：能力語を知らない

### Evoチャージャー
理由：補足説明の文が読めない：この呪文を唱えた後、墓地に置くかわりに自分のマナゾーンに置く

`この[demo:this] 呪文[noun:spell] を[p] 唱えた[verb:唱える/ta] 後[rel:after] 、 墓地[zone:graveyard] に[p] 置く[verb:置く/plain] かわりに[conj:instead] 自分[player:self] の[p] マナゾーン[zone:mana] に[p] 置く[verb:置く/plain]`

### G.R.D.
理由：能力語を知らない

### GR召喚
理由：文が読めない：このターン、それらのGRクリーチャーに「スピードアタッカー」と「スレイヤー」と「ブロッカー」を与える

`この[demo:this] ターン[noun:turn] 、 それら[demo:they] の[p] GRクリーチャー[noun:gr] に[p] 「スピードアタッカー[kw]」 と[p] 「スレイヤー[kw]」 と[p] 「ブロッカー[kw]」 を[p] 与える[verb:与える/plain]`

### G・L・ゲート
理由：能力語を知らない

### G・リンク
理由：誘発・常在の言い方が読めない：G・リンク《起源神プロトン》の左横、《起源神エレクトロン》の右横、または《起源神ニュートロン》の上側。

`G・リンク[kw] 《起源神プロトン》[name] の[p] 左[rel:left] 横[rel:side] 、 《起源神エレクトロン》[name] の[p] 右[rel:right] 横[rel:side] 、 または[conj:or] 《起源神ニュートロン》[name] の[p] 上[rel:top] 側[noun:side] 。`

### Jクライム
理由：補足説明の文が読めない：これと自分の墓地にあるコスト8以下のジョーカーズ・クリーチャー1体を入れ替えてもよい

`これ[demo:this] と[p] 自分[player:self] の[p] 墓地[zone:graveyard] に[p] ある[verb:ある/plain] コスト[stat:cost] 8[num:8] 以下[cmp:<=] の[p] ジョーカーズ[?katakana] ・ クリーチャー[noun:creature] 1体[count:1体] を[p] 入れ替えて[verb:入れ替える/te] もよい[aux:may]`

### Jチェンジ
理由：補足説明の文が読めない：これと自分のマナゾーンにあるコスト8以下のジョーカーズ・クリーチャー1体を入れ替えてもよい

`これ[demo:this] と[p] 自分[player:self] の[p] マナゾーン[zone:mana] に[p] ある[verb:ある/plain] コスト[stat:cost] 8[num:8] 以下[cmp:<=] の[p] ジョーカーズ[?katakana] ・ クリーチャー[noun:creature] 1体[count:1体] を[p] 入れ替えて[verb:入れ替える/te] もよい[aux:may]`

### Jトルネード
理由：文が読めない：Jトルネードを2回までする

`Jトルネード[kw] を[p] 2回[count:2回] まで[aux:until] する[verb:する/plain]`

### J無月の門
理由：能力語を知らない

### L・ゲート
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーが破壊される時、墓地に置くかわりに、グレートメカオーを1体、自分の墓地から手札に戻してもよい。そうした場

`この[demo:this] クリーチャー[noun:creature] が[p] 破壊される[verb:破壊する/passive] 時[aux:when] 、 墓地[zone:graveyard] に[p] 置く[verb:置く/plain] かわりに[conj:instead] 、 グレートメカオー[?katakana] を[p] 1体[count:1体] 、 自分[player:self] の[p] 墓地[zone:graveyard] から[p] 手札[zone:hand] に[p] 戻して[verb:戻す/te] もよい[aux:may] 。 そう[demo:so] した[verb:する/ta] 場[?kanji]`

### OVERハイパー化
理由：能力語を知らない

### O・ドライブ
理由：補足説明の記号つきの文

### P侵略
理由：能力語を知らない

### P革命チェンジ
理由：能力語を知らない

### S-MAX進化
理由：能力語を知らない

### SSS級侵略 [天災]
理由：能力語を知らない

### SSS級侵略[覇道]
理由：能力語を知らない

### S・トリガーX
理由：補足説明の誘発・常在の言い方が読めない：このクロスギアをシールドゾーンから手札に加える時、コストを支払わずにすぐジェネレートし、自分のクリーチャー1体にクロスし

`この[demo:this] クロスギア[noun:crossgear] を[p] シールドゾーン[zone:shield] から[p] 手札[zone:hand] に[p] 加える[verb:加える/plain] 時[aux:when] 、 コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] すぐ[adv:immediately] ジェネレートし[verb:ジェネレートする/renyo] 、 自分[player:self] の[p] クリーチャー[noun:creature] 1体[count:1体] に[p] クロスし[verb:クロスする/renyo]`

### S・バック
理由：補足説明の誘発・常在の言い方が読めない：指定のカードを自分のシールドゾーンから手札に加える時、そのカードを捨ててもよい。そうしたら、コストを支払わずにこのカード

`指定[verb:指定する/stem] の[p] カード[noun:card] を[p] 自分[player:self] の[p] シールドゾーン[zone:shield] から[p] 手札[zone:hand] に[p] 加える[verb:加える/plain] 時[aux:when] 、 その[demo:that] カード[noun:card] を[p] 捨てて[verb:捨てる/te] もよい[aux:may] 。 そうしたら[conj:ifDone] 、 コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] この[demo:this] カード[noun:card]`

### S革命チェンジ
理由：補足説明の誘発・常在の言い方が読めない：自分の指定のクリーチャーが攻撃する時、そのクリーチャーと、手札または表向きでシールドゾーンにあるこのクリーチャーを入れ替

`自分[player:self] の[p] 指定[verb:指定する/stem] の[p] クリーチャー[noun:creature] が[p] 攻撃する[verb:攻撃する/plain] 時[aux:when] 、 その[demo:that] クリーチャー[noun:creature] と[p] 、 手札[zone:hand] または[conj:or] 表向き[noun:faceUp] で[p] シールドゾーン[zone:shield] に[p] ある[verb:ある/plain] この[demo:this] クリーチャー[noun:creature] を[p] 入れ[verb:入れる/renyo] 替[?kanji]`

### W・シンパシー
理由：誘発・常在の言い方が読めない：自分の手札にあるクリーチャーすべてに「W・シンパシー:自分のシールドゾーンにある表向きのカード」を与える。

`自分[player:self] の[p] 手札[zone:hand] に[p] ある[verb:ある/plain] クリーチャー[noun:creature] すべて[quant:all] に[p] 「W・シンパシー[kw] : 自分[player:self] の[p] シールドゾーン[zone:shield] に[p] ある[verb:ある/plain] 表向き[noun:faceUp] の[p] カード[noun:card]」 を[p] 与える[verb:与える/plain] 。`

### W・シールド・プラス
理由：記号つきの文

### W・マジボンバー
理由：補足説明の文が読めない：自分の山札の上から2枚を見る

`自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 2枚[count:2枚] を[p] 見る[verb:見る/plain]`

### ∞ ブレイカー
理由：補足説明の誘発・常在の言い方が読めない：「∞ブレイカー」を持つクリーチャーは、相手のシールドを好きな数ブレイクできる

`「∞ブレイカー[kw]」 を[p] 持つ[verb:持つ/plain] クリーチャー[noun:creature] は[p] 、 相手[player:opponent] の[p] シールド[noun:shield] を[p] 好きな数[quant:any] ブレイクできる[verb:ブレイクする/can]`

### ∞ソウルシフト
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーを召喚する時、このクリーチャーのコストを、その進化元クリーチャーのコストの合計分少なくする。ただし、コス

`この[demo:this] クリーチャー[noun:creature] を[p] 召喚する[verb:召喚する/plain] 時[aux:when] 、 この[demo:this] クリーチャー[noun:creature] の[p] コスト[stat:cost] を[p] 、 その[demo:that] 進化元[noun:evolutionSource] クリーチャー[noun:creature] の[p] コスト[stat:cost] の[p] 合計[noun:total] 分[?kanji] 少なく[cmp:less/adv] する[verb:する/plain] 。 ただし[conj:however] 、 コス[?katakana]`

### でんぢゃらスイッチ
理由：能力語を知らない

### アッパー・ゴー
理由：能力語を知らない

### アビスラッシュ
理由：誘発・常在の言い方が読めない：アビスラッシュ

`アビスラッシュ[kw]`

### エイジ・ブレイカー
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーは、自分の年齢の10の位の数字の数、シールドをブレイクする

`この[demo:this] クリーチャー[noun:creature] は[p] 、 自分[player:self] の[p] 年齢[?kanji] の[p] 10[num:10] の[p] 位[?kanji] の[p] 数字[noun:number] の[p] 数[noun:amount] 、 シールド[noun:shield] を[p] ブレイクする[verb:ブレイクする/plain]`

### エターナル・Κ
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーが離れる時、かわりに自分のマナゾーンにある裏向きのカードを3枚、表向きにしてもよい

`この[demo:this] クリーチャー[noun:creature] が[p] 離れる[verb:離れる/plain] 時[aux:when] 、 かわりに[conj:instead] 自分[player:self] の[p] マナゾーン[zone:mana] に[p] ある[verb:ある/plain] 裏向き[noun:faceDown] の[p] カード[noun:card] を[p] 3枚[count:3枚] 、 表向き[noun:faceUp] に[p] して[verb:する/te] もよい[aux:may]`

### オレ進化
理由：能力語を知らない

### キズナ
理由：補足説明の記号つきの文

### キズナコンプ
理由：誘発・常在の言い方が読めない：キズナコンプPいずれかの墓地から、コスト7以下の呪文を1枚、コストを支払わずに唱えてもよい。唱えた後、その呪文を墓地に置

`キズナコンプ[kw] P[?latin] いずれか[quant:either] の[p] 墓地[zone:graveyard] から[p] 、 コスト[stat:cost] 7[num:7] 以下[cmp:<=] の[p] 呪文[noun:spell] を[p] 1枚[count:1枚] 、 コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 唱えて[verb:唱える/te] もよい[aux:may] 。 唱えた[verb:唱える/ta] 後[rel:after] 、 その[demo:that] 呪文[noun:spell] を[p] 墓地[zone:graveyard] に[p] 置[?kanji]`

### キズナプラス
理由：誘発・常在の言い方が読めない：キズナプラスPこのターン、自分のクリーチャー1体はシールドをさらに1つブレイクする。

`キズナプラス[kw] P[?latin] この[demo:this] ターン[noun:turn] 、 自分[player:self] の[p] クリーチャー[noun:creature] 1体[count:1体] は[p] シールド[noun:shield] を[p] さらに[conj:also] 1つ[count:1つ] ブレイクする[verb:ブレイクする/plain] 。`

### キッカー
理由：補足説明の記号つきの文

### キリフダReVo
理由：能力語を知らない

### キング・ナイト・マジック
理由：補足説明の文が読めない：自分のナイト1つにつき、この呪文のk能力を追加で1回使ってもよい

`自分[player:self] の[p] ナイト[?katakana] 1つ[count:1つ] につき[aux:per] 、 この[demo:this] 呪文[noun:spell] の[p] k[label] 能力[noun:ability] を[p] 追加[verb:追加する/stem] で[p] 1回[count:1回] 使って[verb:使う/te] もよい[aux:may]`

### クリスターナル・Κ
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーが離れる時、または自分がゲームに負ける時、かわりに自分のマナゾーンにある裏向きのカードを3枚、表向きにし

`この[demo:this] クリーチャー[noun:creature] が[p] 離れる[verb:離れる/plain] 時[aux:when] 、 または[conj:or] 自分[player:self] が[p] ゲーム[noun:game] に[p] 負ける[verb:負ける/plain] 時[aux:when] 、 かわりに[conj:instead] 自分[player:self] の[p] マナゾーン[zone:mana] に[p] ある[verb:ある/plain] 裏向き[noun:faceDown] の[p] カード[noun:card] を[p] 3枚[count:3枚] 、 表向き[noun:faceUp] に[p] し[verb:する/renyo]`

### クロスギア
理由：誘発・常在の言い方が読めない：これをクロスしたクリーチャーが離れる時、かわりにこのクロスギアを外してもよい。

`これ[demo:this] を[p] クロスした[verb:クロスする/ta] クリーチャー[noun:creature] が[p] 離れる[verb:離れる/plain] 時[aux:when] 、 かわりに[conj:instead] この[demo:this] クロスギア[noun:crossgear] を[p] 外して[verb:外す/te] もよい[aux:may] 。`

### ゴッドスレイヤー
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーがゴッドとバトルする時、バトルの後、そのゴッドを破壊する

`この[demo:this] クリーチャー[noun:creature] が[p] ゴッド[?katakana] と[p] バトルする[verb:バトルする/plain] 時[aux:when] 、 バトル[noun:battle] の[p] 後[rel:after] 、 その[demo:that] ゴッド[?katakana] を[p] 破壊する[verb:破壊する/plain]`

### サイキック・チャンス
理由：能力語を知らない

### サイクロン
理由：補足説明の文が読めない：このターン、この呪文を唱える直前にクリーチャーを召喚していれば、この呪文を唱えた後、墓地に置くかわりに自分の手札に戻す

`この[demo:this] ターン[noun:turn] 、 この[demo:this] 呪文[noun:spell] を[p] 唱える[verb:唱える/plain] 直前[rel:justBefore] に[p] クリーチャー[noun:creature] を[p] 召喚して[verb:召喚する/te] いれば[verb:いる/ba] 、 この[demo:this] 呪文[noun:spell] を[p] 唱えた[verb:唱える/ta] 後[rel:after] 、 墓地[zone:graveyard] に[p] 置く[verb:置く/plain] かわりに[conj:instead] 自分[player:self] の[p] 手札[zone:hand] に[p] 戻す[verb:戻す/plain]`

### サイバー・メクレイド
理由：誘発・常在の言い方が読めない：このカードが墓地に置かれた時、その直前にバトルゾーンにあれば、サイバー・メクレイド8する。

`この[demo:this] カード[noun:card] が[p] 墓地[zone:graveyard] に[p] 置かれた[verb:置く/passiveTa] 時[aux:when] 、 その[demo:that] 直前[rel:justBefore] に[p] バトルゾーン[zone:battle] に[p] あれば[verb:ある/ba] 、 サイバー・メクレイド[kw] 8[num:8] する[verb:する/plain] 。`

### サイレントスキル
理由：補足説明の文が読めない：このクリーチャーがタップされていたら、アンタップするかわりに次のi能力を使ってもよい

`この[demo:this] クリーチャー[noun:creature] が[p] タップされて[verb:タップする/passiveTe] いたら[verb:いる/tara] 、 アンタップする[verb:アンタップする/plain] かわりに[conj:instead] 次[time:next] の[p] i[label] 能力[noun:ability] を[p] 使って[verb:使う/te] もよい[aux:may]`

### サバキZ
理由：補足説明の文が読めない：裁きの紋章が自分のシールドゾーンから手札に加えられた時、そのカードを捨ててもよい

`裁[?kanji] き[?hiragana] の[p] 紋章[?kanji] が[p] 自分[player:self] の[p] シールドゾーン[zone:shield] から[p] 手札[zone:hand] に[p] 加えられた[verb:加える/passiveTa] 時[aux:when] 、 その[demo:that] カード[noun:card] を[p] 捨てて[verb:捨てる/te] もよい[aux:may]`

### サムライ・メクレイド
理由：誘発・常在の言い方が読めない：このクロスギアが出た時、またはこれをクロスしたクリーチャーが攻撃する時、サムライ・メクレイド5する。

`この[demo:this] クロスギア[noun:crossgear] が[p] 出た[verb:出る/ta] 時[aux:when] 、 または[conj:or] これ[demo:this] を[p] クロスした[verb:クロスする/ta] クリーチャー[noun:creature] が[p] 攻撃する[verb:攻撃する/plain] 時[aux:when] 、 サムライ・メクレイド[kw] 5[num:5] する[verb:する/plain] 。`

### シビルカウント
理由：能力語を知らない

### シンカパワー
理由：能力語を知らない

### シールド・フォース
理由：補足説明の記号つきの文

### ジャイアント・メクレイド
理由：誘発・常在の言い方が読めない：このクリーチャーとのバトルによって相手クリーチャーが破壊される時、かわりに自分はジャイアント・メクレイド8してもよい。

`この[demo:this] クリーチャー[noun:creature] と[p] の[p] バトル[noun:battle] によって[p] 相手[player:opponent] クリーチャー[noun:creature] が[p] 破壊される[verb:破壊する/passive] 時[aux:when] 、 かわりに[conj:instead] 自分[player:self] は[p] ジャイアント・メクレイド[kw] 8[num:8] して[verb:する/te] もよい[aux:may] 。`

### ジョラゴン・ビッグ１
理由：能力語を知らない

### ジョラゴン・ポップ１
理由：能力語を知らない

### ジョーカーズ・メクレイド
理由：誘発・常在の言い方が読めない：このクリーチャーがシールドをブレイクした時、ジョーカーズ・メクレイド5する。

`この[demo:this] クリーチャー[noun:creature] が[p] シールド[noun:shield] を[p] ブレイクした[verb:ブレイクする/ta] 時[aux:when] 、 ジョーカーズ・メクレイド[kw] 5[num:5] する[verb:する/plain] 。`

### スノーフェアリー・メクレイド
理由：誘発・常在の言い方が読めない：各ターンの終わりに、カードを1枚、自分のマナゾーンから墓地に置いてもよい。そうしたら、スノーフェアリー・メクレイド5する

`各[quant:each] ターン[noun:turn] の[p] 終わり[time:end] に[p] 、 カード[noun:card] を[p] 1枚[count:1枚] 、 自分[player:self] の[p] マナゾーン[zone:mana] から[p] 墓地[zone:graveyard] に[p] 置いて[verb:置く/te] もよい[aux:may] 。 そうしたら[conj:ifDone] 、 スノーフェアリー・メクレイド[kw] 5[num:5] する[verb:する/plain]`

### スペース・チャージ
理由：補足説明の誘発・常在の言い方が読めない：自分のマナゾーンにカードが置かれた時、そのカードの文明に合うq能力を使ってもよい

`自分[player:self] の[p] マナゾーン[zone:mana] に[p] カード[noun:card] が[p] 置かれた[verb:置く/passiveTa] 時[aux:when] 、 その[demo:that] カード[noun:card] の[p] 文明[stat:civilization] に[p] 合う[verb:合う/plain] q[label] 能力[noun:ability] を[p] 使って[verb:使う/te] もよい[aux:may]`

### スリリング・スリー
理由：能力語を知らない

### ソウルシフト
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーの召喚コストを進化元のコストの数だけ少なくする。ただしコストは0以下にならない

`この[demo:this] クリーチャー[noun:creature] の[p] 召喚[verb:召喚する/stem] コスト[stat:cost] を[p] 進化元[noun:evolutionSource] の[p] コスト[stat:cost] の[p] 数[noun:amount] だけ[p] 少なく[cmp:less/adv] する[verb:する/plain] 。 ただし[conj:however] コスト[stat:cost] は[p] 0[num:0] 以下[cmp:<=] に[p] ならない[verb:なる/nai]`

### ターボラッシュ
理由：補足説明の誘発・常在の言い方が読めない：自分の他のクリーチャーがシールドをブレイクした時、そのターンが終わるまで、このクリーチャーは次のr能力を得る

`自分[player:self] の[p] 他[demo:other] の[p] クリーチャー[noun:creature] が[p] シールド[noun:shield] を[p] ブレイクした[verb:ブレイクする/ta] 時[aux:when] 、 その[demo:that] ターン[noun:turn] が[p] 終わる[verb:終わる/plain] まで[aux:until] 、 この[demo:this] クリーチャー[noun:creature] は[p] 次[time:next] の[p] r[label] 能力[noun:ability] を[p] 得る[verb:得る/plain]`

### ダイナモ
理由：記号つきの文

### デュエリスト
理由：カードの種類が未対応

### デュエリスト・リンク
理由：カードの種類が未対応

### トライ・G・リンク
理由：能力語を知らない

### ドラゴン・T・ブレイカー
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーはシールドを3つブレイクする。各ブレイクの前に、自分の山札の上から1枚目を、裏向きのまま新しいシールドと

`この[demo:this] クリーチャー[noun:creature] は[p] シールド[noun:shield] を[p] 3つ[count:3つ] ブレイクする[verb:ブレイクする/plain] 。 各[quant:each] ブレイク[verb:ブレイクする/stem] の[p] 前[rel:before] に[p] 、 自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 1枚目[count:1枚目] を[p] 、 裏向き[noun:faceDown] の[p] まま[aux:keep] 新しい[adj:new] シールド[noun:shield] と[p]`

### ドラゴン・ヨビニオン
理由：誘発・常在の言い方が読めない：自分の手札から召喚によって出た他のドラゴン・クリーチャーすべてに、そのターン「ドラゴン・ヨビニオン」を与える。

`自分[player:self] の[p] 手札[zone:hand] から[p] 召喚[verb:召喚する/stem] によって[p] 出た[verb:出る/ta] 他[demo:other] の[p] ドラゴン[?katakana] ・ クリーチャー[noun:creature] すべて[quant:all] に[p] 、 その[demo:that] ターン[noun:turn] 「ドラゴン・ヨビニオン[kw]」 を[p] 与える[verb:与える/plain] 。`

### ドロン・ゴー
理由：能力語を知らない

### ナイト・マジック
理由：補足説明の文が読めない：この呪文のk能力をもう一度使ってもよい

`この[demo:this] 呪文[noun:spell] の[p] k[label] 能力[noun:ability] を[p] もう[adv:more] 1度[count:1度] 使って[verb:使う/te] もよい[aux:may]`

### ナイト流ジェネレート
理由：補足説明の記号つきの文

### ニンジャ・K
理由：補足説明の記号つきの文

### ニンジャ・チェンジ
理由：補足説明の記号つきの文

### ネクスト・ブレイカー
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーが、表向きのカードを含まないシールドをブレイクする時、かわりに相手はそのシールドのカードをすべて表向きに

`この[demo:this] クリーチャー[noun:creature] が[p] 、 表向き[noun:faceUp] の[p] カード[noun:card] を[p] 含まない[verb:含む/nai] シールド[noun:shield] を[p] ブレイクする[verb:ブレイクする/plain] 時[aux:when] 、 かわりに[conj:instead] 相手[player:opponent] は[p] その[demo:that] シールド[noun:shield] の[p] カード[noun:card] を[p] すべて[quant:all] 表向き[noun:faceUp] に[p]`

### バイオ・K
理由：誘発・常在の言い方が読めない：バイオ・K-自分のティラノ・ドレイクが相手プレイヤーを攻撃してブロックされなかった時、このカードを自分の手札から捨てても

`バイオ・K[kw] - 自分[player:self] の[p] ティラノ・ドレイク[?katakana] が[p] 相手[player:opponent] プレイヤー[noun:player] を[p] 攻撃して[verb:攻撃する/te] ブロックされ[verb:ブロックする/passiveRenyo] なかった[aux:not] 時[aux:when] 、 この[demo:this] カード[noun:card] を[p] 自分[player:self] の[p] 手札[zone:hand] から[p] 捨てて[verb:捨てる/te] も[p]`

### バイオ・T
理由：誘発・常在の言い方が読めない：バイオ・T-自分のリキッド・ピープルが攻撃して、バトルが始まった時、このカードを自分の手札から捨ててもよい。そうした場合

`バイオ・T[kw] - 自分[player:self] の[p] リキッド・ピープル[?katakana] が[p] 攻撃して[verb:攻撃する/te] 、 バトル[noun:battle] が[p] 始まった[verb:始まる/ta] 時[aux:when] 、 この[demo:this] カード[noun:card] を[p] 自分[player:self] の[p] 手札[zone:hand] から[p] 捨てて[verb:捨てる/te] もよい[aux:may] 。 そうした場合[conj:ifDone]`

### バズレンダ
理由：補足説明の記号つきの文

### バラエティ・ブレイカー
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーは、コストが異なる自分のクリーチャーの数、シールドをブレイクする

`この[demo:this] クリーチャー[noun:creature] は[p] 、 コスト[stat:cost] が[p] 異なる[cmp:different] 自分[player:self] の[p] クリーチャー[noun:creature] の[p] 数[noun:amount] 、 シールド[noun:shield] を[p] ブレイクする[verb:ブレイクする/plain]`

### バラバラエティ
理由：能力語を知らない

### パワー・ガチンコ・ジャッジ
理由：文が読めない：こうして自分が表向きにしたクリーチャーを山札の下に置くかわりにコストを支払わずに召喚してもよい

`こうして[demo:thisWay] 自分[player:self] が[p] 表向き[noun:faceUp] に[p] した[verb:する/ta] クリーチャー[noun:creature] を[p] 山札[zone:deck] の[p] 下[rel:bottom] に[p] 置く[verb:置く/plain] かわりに[conj:instead] コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] 召喚して[verb:召喚する/te] もよい[aux:may]`

### パンドラ・シフト
理由：能力語を知らない

### ビビッドロー
理由：補足説明の記号つきの文

### ファイナル革命
理由：能力語を知らない

### フォートE
理由：補足説明の文が読めない：ドラゴンを自分のマナゾーンでタップしてこのクリーチャーを召喚していた場合、このクリーチャーは次の能力を得る

`ドラゴン[?katakana] を[p] 自分[player:self] の[p] マナゾーン[zone:mana] で[p] タップして[verb:タップする/te] この[demo:this] クリーチャー[noun:creature] を[p] 召喚して[verb:召喚する/te] いた[verb:いる/ta] 場合[aux:case] 、 この[demo:this] クリーチャー[noun:creature] は[p] 次[time:next] の[p] 能力[noun:ability] を[p] 得る[verb:得る/plain]`

### フュリー・チャージ
理由：能力語を知らない

### フリー・クロス
理由：能力語を知らない

### ブレイク・ボーナス
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーの攻撃が終わった時、その攻撃中にブレイクしたシールド1枚につき、次のb能力を1回使ってもよい

`この[demo:this] クリーチャー[noun:creature] の[p] 攻撃[verb:攻撃する/stem] が[p] 終わった[verb:終わる/ta] 時[aux:when] 、 その[demo:that] 攻撃[verb:攻撃する/stem] 中[rel:in] に[p] ブレイクした[verb:ブレイクする/ta] シールド[noun:shield] 1枚[count:1枚] につき[aux:per] 、 次[time:next] の[p] b[label] 能力[noun:ability] を[p] 1回[count:1回] 使って[verb:使う/te] もよい[aux:may]`

### プラチナ・ドライブ
理由：文が読めない：プラチナ・ドライブ-自分のクリーチャー1体のパワーは、バトルゾーンを離れるまで、+1000される

`プラチナ・ドライブ[kw] - 自分[player:self] の[p] クリーチャー[noun:creature] 1体[count:1体] の[p] パワー[stat:power] は[p] 、 バトルゾーン[zone:battle] を[p] 離れる[verb:離れる/plain] まで[aux:until] 、 +1000[num:+1000] される[verb:する/passive]`

### ホーリー・フィールド
理由：補足説明の文が読めない：自分のシールドの数が相手以上であれば、このクリーチャーは次の能力を得る

`自分[player:self] の[p] シールド[noun:shield] の[p] 数[noun:amount] が[p] 相手[player:opponent] 以上[cmp:>=] で[p] あれば[verb:ある/ba] 、 この[demo:this] クリーチャー[noun:creature] は[p] 次[time:next] の[p] 能力[noun:ability] を[p] 得る[verb:得る/plain]`

### ホールド・ナッシング・バック！
理由：能力語を知らない

### マジック・メクレイド
理由：誘発・常在の言い方が読めない：各ターンの終わりに、このターン中に自分が呪文を唱え、クリーチャーを召喚していれば、マジック・メクレイド8する。

`各[quant:each] ターン[noun:turn] の[p] 終わり[time:end] に[p] 、 この[demo:this] ターン[noun:turn] 中[rel:in] に[p] 自分[player:self] が[p] 呪文[noun:spell] を[p] 唱え[verb:唱える/renyo] 、 クリーチャー[noun:creature] を[p] 召喚して[verb:召喚する/te] いれば[verb:いる/ba] 、 マジック・メクレイド[kw] 8[num:8] する[verb:する/plain] 。`

### マスターB・A・D
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーを、コストを2少なくし、さらに、このターンに召喚した自分の他の火のクリーチャー1体につき追加で2少なくし

`この[demo:this] クリーチャー[noun:creature] を[p] 、 コスト[stat:cost] を[p] 2[num:2] 少なく[cmp:less/adv] し[verb:する/renyo] 、 さらに[conj:also] 、 この[demo:this] ターン[noun:turn] に[p] 召喚した[verb:召喚する/ta] 自分[player:self] の[p] 他[demo:other] の[p] 火[civ:fire] の[p] クリーチャー[noun:creature] 1体[count:1体] につき[aux:per] 追加[verb:追加する/stem] で[p] 2[num:2] 少なく[cmp:less/adv] し[verb:する/renyo]`

### マスターG・O・D・S
理由：文が読めない：マスターG・O・D・S

`マスターG・O・D・S[kw]`

### マスターJGR
理由：能力語を知らない

### マスターJトルネード
理由：能力語を知らない

### マスター・W・メラビート
理由：能力語を知らない

### マスター・ブラスター
理由：補足説明の文が読めない：バトルゾーンまたはマナゾーンに自分のジョーカーズが合計4枚以上あれば、相手のカードを1枚選ぶ

`バトルゾーン[zone:battle] または[conj:or] マナゾーン[zone:mana] に[p] 自分[player:self] の[p] ジョーカーズ[?katakana] が[p] 合計[noun:total] 4枚[count:4枚] 以上[cmp:>=] あれば[verb:ある/ba] 、 相手[player:opponent] の[p] カード[noun:card] を[p] 1枚[count:1枚] 選ぶ[verb:選ぶ/plain]`

### マスター・マッハファイター
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーが出たターン、このクリーチャーはタップまたはアンタップしているクリーチャーを攻撃できる。このターン、この

`この[demo:this] クリーチャー[noun:creature] が[p] 出た[verb:出る/ta] ターン[noun:turn] 、 この[demo:this] クリーチャー[noun:creature] は[p] タップ[verb:タップする/stem] または[conj:or] アンタップしている[verb:アンタップする/teiru] クリーチャー[noun:creature] を[p] 攻撃できる[verb:攻撃する/can] 。 この[demo:this] ターン[noun:turn] 、 この[demo:this]`

### マスター・メラビート
理由：能力語を知らない

### マスター必殺トルネード
理由：能力語を知らない

### マナドライブ
理由：能力語を知らない

### マナ武装
理由：能力語を知らない

### マナ爆誕
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーを自分のマナゾーンから、コスト6を支払って召喚してもよい

`この[demo:this] クリーチャー[noun:creature] を[p] 自分[player:self] の[p] マナゾーン[zone:mana] から[p] 、 コスト[stat:cost] 6[num:6] を[p] 支払って[verb:支払う/te] 召喚して[verb:召喚する/te] もよい[aux:may]`

### マーシャル・タッチ
理由：補足説明の文が読めない：自分の他のクリーチャーを1体、バトルゾーンから手札に戻してもよい

`自分[player:self] の[p] 他[demo:other] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] 、 バトルゾーン[zone:battle] から[p] 手札[zone:hand] に[p] 戻して[verb:戻す/te] もよい[aux:may]`

### ミノまじかる
理由：能力語を知らない

### ムゲンクライム
理由：補足説明の記号つきの文

### メカ・メクレイド
理由：誘発・常在の言い方が読めない：各ターンに一度、自分のシールドゾーンにカードを置いた時、メカ・メクレイド5する。

`各[quant:each] ターン[noun:turn] に[p] 1度[count:1度] 、 自分[player:self] の[p] シールドゾーン[zone:shield] に[p] カード[noun:card] を[p] 置いた[verb:置く/ta] 時[aux:when] 、 メカ・メクレイド[kw] 5[num:5] する[verb:する/plain] 。`

### メガメテオバーン
理由：能力語を知らない

### メクレイド
理由：誘発・常在の言い方が読めない：このクリーチャーがシールドをブレイクした時、ジョーカーズ・メクレイド5する。

`この[demo:this] クリーチャー[noun:creature] が[p] シールド[noun:shield] を[p] ブレイクした[verb:ブレイクする/ta] 時[aux:when] 、 ジョーカーズ・メクレイド[kw] 5[num:5] する[verb:する/plain] 。`

### メテオバーン
理由：能力語を知らない

### ラビリンス
理由：能力語を知らない

### ランチャーE
理由：補足説明の文が読めない：この呪文を唱える時、自分の、タップされていない、種族にドラゴンとある進化ではないクリーチャーを好きな数タップする

`この[demo:this] 呪文[noun:spell] を[p] 唱える[verb:唱える/plain] 時[aux:when] 、 自分[player:self] の[p] 、 タップされて[verb:タップする/passiveTe] いない[verb:いる/nai] 、 種族[stat:race] に[p] ドラゴン[?katakana] と[p] ある[verb:ある/plain] 進化[verb:進化する/stem] で[p] は[p] ない[aux:not] クリーチャー[noun:creature] を[p] 好きな数[quant:any] タップする[verb:タップする/plain]`

### レインボーナス
理由：能力語を知らない

### ワンダブル
理由：補足説明の文が読めない：このカードのコストを両方支払って、両方の呪文を使ってもよい

`この[demo:this] カード[noun:card] の[p] コスト[stat:cost] を[p] 両方[quant:all] 支払って[verb:支払う/te] 、 両方[quant:all] の[p] 呪文[noun:spell] を[p] 使って[verb:使う/te] もよい[aux:may]`

### 中央G・リンク
理由：補足説明の記号つきの文

### 仁義
理由：誘発・常在の言い方が読めない：仁義このターン、自分のクリーチャー1体は「パワーアタッカー+5000」を得、シールドをさらに1枚ブレイクする。

`仁義[kw] この[demo:this] ターン[noun:turn] 、 自分[player:self] の[p] クリーチャー[noun:creature] 1体[count:1体] は[p] 「パワーアタッカー[kw] +5000[num:+5000]」 を[p] 得[verb:得る/renyo] 、 シールド[noun:shield] を[p] さらに[conj:also] 1枚[count:1枚] ブレイクする[verb:ブレイクする/plain] 。`

### 侍マジック
理由：補足説明の誘発・常在の言い方が読めない：このカードをジェネレートした時、バトルゾーンに自分のサムライ・クリーチャーがあれば、自分の山札を見る。その中から《流牙シ

`この[demo:this] カード[noun:card] を[p] ジェネレートした[verb:ジェネレートする/ta] 時[aux:when] 、 バトルゾーン[zone:battle] に[p] 自分[player:self] の[p] サムライ[?katakana] ・ クリーチャー[noun:creature] が[p] あれば[verb:ある/ba] 、 自分[player:self] の[p] 山札[zone:deck] を[p] 見る[verb:見る/plain] 。 その[demo:that] 中[rel:in] から[p] 《[?other] 流牙[?kanji] シ[?katakana]`

### 侍流ジェネレート
理由：補足説明の文が読めない：クロスギアを1つ、自分の手札からコストを支払わずにジェネレートしてもよい

`クロスギア[noun:crossgear] を[p] 1つ[count:1つ] 、 自分[player:self] の[p] 手札[zone:hand] から[p] コスト[stat:cost] を[p] 支払わず[verb:支払う/nu] に[p] ジェネレートして[verb:ジェネレートする/te] もよい[aux:may]`

### 右G・リンク
理由：補足説明の記号つきの文

### 右G・リンクOMG
理由：能力語を知らない

### 右G・リンク・ガルド
理由：能力語を知らない

### 合体龍解
理由：能力語を知らない

### 地獄返霊
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーが攻撃する時、またはその能力を使った時、自分の墓地からカードを4枚、好きな順序で山札の一番下に置いてもよ

`この[demo:this] クリーチャー[noun:creature] が[p] 攻撃する[verb:攻撃する/plain] 時[aux:when] 、 または[conj:or] その[demo:that] 能力[noun:ability] を[p] 使った[verb:使う/ta] 時[aux:when] 、 自分[player:self] の[p] 墓地[zone:graveyard] から[p] カード[noun:card] を[p] 4枚[count:4枚] 、 好きな[quant:whichever] 順序[noun:order] で[p] 山札[zone:deck] の[p] 一番下[rel:bottommost] に[p] 置いて[verb:置く/te] も[p] よ[?hiragana]`

### 多色マナ武装
理由：能力語を知らない

### 左G・リンク
理由：補足説明の記号つきの文

### 左G・リンクOMG
理由：能力語を知らない

### 左G・リンク・ガルド
理由：能力語を知らない

### 幸せスイッチ
理由：能力語を知らない

### 極限ファイナル革命
理由：能力語を知らない

### 殲滅返霊
理由：誘発・常在の言い方が読めない：殲滅返霊4相手は、バトルゾーンまたは手札から自身のカードを1枚選び、山札の一番下に置く。

`殲滅返霊[kw] 4[num:4] 相手[player:opponent] は[p] 、 バトルゾーン[zone:battle] または[conj:or] 手札[zone:hand] から[p] 自身[player:own] の[p] カード[noun:card] を[p] 1枚[count:1枚] 選び[verb:選ぶ/renyo] 、 山札[zone:deck] の[p] 一番下[rel:bottommost] に[p] 置く[verb:置く/plain] 。`

### 水晶ソウル
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーを召喚する時、自分のマナゾーンにある裏向きのカードのマナの数字は3になる

`この[demo:this] クリーチャー[noun:creature] を[p] 召喚する[verb:召喚する/plain] 時[aux:when] 、 自分[player:self] の[p] マナゾーン[zone:mana] に[p] ある[verb:ある/plain] 裏向き[noun:faceDown] の[p] カード[noun:card] の[p] マナ[noun:mana] の[p] 数字[noun:number] は[p] 3[num:3] に[p] なる[verb:なる/plain]`

### 深淵送り
理由：文が読めない：相手のクリーチャーを1体まで選び、深淵送りにする

`相手[player:opponent] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] まで[aux:until] 選び[verb:選ぶ/renyo] 、 深淵送り[kw] に[p] する[verb:する/plain]`

### 激流連鎖
理由：補足説明の文が読めない：自分の山札の上から2枚を見る

`自分[player:self] の[p] 山札[zone:deck] の[p] 上[rel:top] から[p] 2枚[count:2枚] を[p] 見る[verb:見る/plain]`

### 灼熱ドロン・ゴー
理由：能力語を知らない

### 無敵虹帝
理由：能力語を知らない

### 無月の大罪
理由：補足説明の誘発・常在の言い方が読めない：このオーラの実行コストを4少なくしてもよい。そうしたら、このターンの終わりに、自分のクリーチャーを1体破壊する

`この[demo:this] オーラ[noun:aura] の[p] 実行[verb:実行する/stem] コスト[stat:cost] を[p] 4[num:4] 少なく[cmp:less/adv] して[verb:する/te] もよい[aux:may] 。 そうしたら[conj:ifDone] 、 この[demo:this] ターン[noun:turn] の[p] 終わり[time:end] に[p] 、 自分[player:self] の[p] クリーチャー[noun:creature] を[p] 1体[count:1体] 破壊する[verb:破壊する/plain]`

### 無月の門99
理由：能力語を知らない

### 無月の門・終
理由：能力語を知らない

### 爆進ダブル
理由：補足説明の文が読めない：この効果を両方とも選んでもよい

`この[demo:this] 効果[noun:effect] を[p] 両方[quant:all] と[p] も[p] 選んで[verb:選ぶ/te] もよい[aux:may]`

### 真・エスケープ
理由：補足説明の誘発・常在の言い方が読めない：このクリーチャーが離れる時、かわりに自分のシールドを2つ手札に加えてもよい。ただし、その「S・トリガー」は使えない

`この[demo:this] クリーチャー[noun:creature] が[p] 離れる[verb:離れる/plain] 時[aux:when] 、 かわりに[conj:instead] 自分[player:self] の[p] シールド[noun:shield] を[p] 2つ[count:2つ] 手札[zone:hand] に[p] 加えて[verb:加える/te] もよい[aux:may] 。 ただし[conj:however] 、 その[demo:that] 「S・トリガー[kw]」 は[p] 使えない[verb:使う/cannot]`

### 禁断スター進化
理由：能力語を知らない

### 禁断機動
理由：能力語を知らない

### 禁断爆発
理由：カードの種類が未対応

### 禁断解放
理由：カードの種類が未対応

### 罠金乱舞
理由：能力語を知らない

### 罪・無月の∞罪
理由：能力語を知らない

### 罪・無月の影罪
理由：補足説明の誘発・常在の言い方が読めない：自分の墓地にあるマフィ・ギャング1体につき、このクリーチャーの召喚コストを1少なくしてもよい。そうしたら、このターンの終

`自分[player:self] の[p] 墓地[zone:graveyard] に[p] ある[verb:ある/plain] マフィ・ギャング[?katakana] 1体[count:1体] につき[aux:per] 、 この[demo:this] クリーチャー[noun:creature] の[p] 召喚[verb:召喚する/stem] コスト[stat:cost] を[p] 1[num:1] 少なく[cmp:less/adv] して[verb:する/te] もよい[aux:may] 。 そうしたら[conj:ifDone] 、 この[demo:this] ターン[noun:turn] の[p] 終[?kanji]`

### 虹帝双極
理由：能力語を知らない

### 超天フィーバー
理由：能力語を知らない

### 超無限GR進化
理由：能力語を知らない

### 跳次元召喚
理由：誘発・常在の言い方が読めない：各ターンに1度、相手の超次元ゾーンにカードが置かれた時、跳次元召喚4する。

`各[quant:each] ターン[noun:turn] に[p] 1度[count:1度] 、 相手[player:opponent] の[p] 超次元ゾーン[zone:hyperspatial] に[p] カード[noun:card] が[p] 置かれた[verb:置く/passiveTa] 時[aux:when] 、 跳次元召喚[kw] 4[num:4] する[verb:する/plain] 。`

### 輪廻∞
理由：能力語を知らない

### 返霊
理由：補足説明の文が読めない：そうした場合、このクリーチャーのd能力を使う

`そうした場合[conj:ifDone] 、 この[demo:this] クリーチャー[noun:creature] の[p] d[label] 能力[noun:ability] を[p] 使う[verb:使う/plain]`

### 逆転撃
理由：能力語を知らない

### 闇ステルス
理由：誘発・常在の言い方が読めない：このクリーチャーのパワーは+4000され、「闇ステルス」を得る。

`この[demo:this] クリーチャー[noun:creature] の[p] パワー[stat:power] は[p] +4000[num:+4000] され[verb:する/passiveRenyo] 、 「闇ステルス[kw]」 を[p] 得る[verb:得る/plain] 。`

### 零龍卍誕
理由：文が読めない：このクリーチャーが零龍卍誕した時、そのターン、相手のクリーチャーすべてのパワーを0にする

`この[demo:this] クリーチャー[noun:creature] が[p] 零龍卍誕[kw] した[verb:する/ta] 時[aux:when] 、 その[demo:that] ターン[noun:turn] 、 相手[player:opponent] の[p] クリーチャー[noun:creature] すべて[quant:all] の[p] パワー[stat:power] を[p] 0[num:0] に[p] する[verb:する/plain]`

### 革命
理由：能力語を知らない

### 革命チェンジ
理由：能力語を知らない

### 革命０トリガー
理由：能力語を知らない

### 飛行
理由：補足説明の記号つきの文

### 鬼タイム
理由：能力語を知らない

### 龍魂回避
理由：能力語を知らない

### 龍魂解放
理由：能力語を知らない

### ５.S.D.
理由：能力語を知らない
