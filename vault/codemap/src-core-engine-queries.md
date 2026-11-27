---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1000行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲーム状態を読むだけの関数群（状態を変更しない）。UI・AI・エンジンで共用する。

## トップレベル

- L32 **export** fn `sealForQueries`
- L36 fn `cached`
- L46 **export** fn `def`
- L62 **export** fn `psychicBackDef`
- L74 fn `withSouls`
- L94 fn `withSurvivors`
- L108 **export** fn `forbiddenDef`
- L132 **export** fn `isIgnored`
- L140 **export** fn `battleCards`
- L146 **export** fn `battleAndFields`
- L151 **export** fn `canSummonFromZone`
- L160 **export** fn `zoneSummonSource`
- L174 fn `hyperDef`
- L191 **export** fn `hyperizeCandidates`
- L204 **export** fn `matchFilter`
- L268 fn `matchFace`
- L288 **export** interface `ActiveStatic`
- L295 **export** fn `activeStatics`
- L299 fn `activeStaticsImpl`
- L315 fn `ownerMatches`
- L319 fn `appliesToCreature`
- L329 fn `mergeKeywords`
- L341 **export** fn `keywords`
- L345 fn `keywordsImpl`
- L361 **export** fn `withoutAttackLocks`
- L367 **export** fn `ignoresAttackLocks`
- L371 **export** fn `power`
- L375 fn `powerImpl`
- L393 **export** fn `breakerCount`
- L405 fn `justDiving`
- L412 **export** fn `isUntargetable`
- L421 **export** fn `cannotBeAttacked`
- L428 **export** fn `effectiveCost`
- L432 fn `effectiveCostImpl`
- L477 **export** fn `usesHyperEnergy`
- L485 **export** fn `sasageruCandidates`
- L497 **export** fn `minimalSacrifice`
- L512 **export** fn `playLimitReached`
- L526 **export** fn `isCrossGear`
- L531 **export** fn `isGrCard`
- L536 **export** fn `canCross`
- L546 **export** fn `entryBlocked`
- L556 **export** fn `playRestriction`
- L581 **export** fn `isSummoningSick`
- L590 **export** fn `canAttackWith`
- L594 fn `canAttackWithImpl`
- L606 **export** fn `attackTargets`
- L610 fn `attackTargetsImpl`
- L629 **export** fn `blockersFor`
- L649 **export** fn `targetCandidates`
- L676 **export** fn `countQuantity`
- L686 **export** fn `evalCondition`
- L764 fn `simpleSpec`
- L769 **export** fn `multiEvolveSpec`
- L774 **export** fn `evolveSourceCandidates`
- L787 **export** fn `validEvolveSources`
- L797 **export** fn `defaultEvolveSources`
- L810 **export** fn `evolutionBases`
- L826 fn `matchesEvolvesFrom`
- L834 **export** fn `canBeEvolutionSource`
- L847 **export** fn `choosePayment`
- L854 **export** fn `payMana`
- L877 fn `assignCivs`
- L895 **export** fn `altCost`
- L904 **export** fn `altPayment`
- L909 **export** fn `altUsable`
- L923 **export** fn `canPlayAlt`
- L931 **export** fn `fushigiCandidates`
- L935 **export** fn `canPlay`
- L939 fn `canPlayImpl`
- L959 **export** fn `untappedManaCount`
- L963 **export** fn `isIdle`
- L967 **export** fn `instancesIn`
- L972 **export** fn `attackSwapCandidates`
- L996 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:688 · and:690 · or:692 · compare:694 · attackedThisTurn:699 · selfIsEvolution:701 · summonedThisTurn:707 · castThisTurn:709 · chosenDistinctNames:711 · didNot:715 · enteredFreeThisTurn:717 · firstAttackThisTurn:719 · crossed:721 · selfTapped:725 · wonBattleThisTurn:727 · selfEnteredThisTurn:729 · subjectEnteredFree:731 · enteredThisTurn:733 · underCount:737 · opponentTurn:739 · inExtraTurn:741 · shieldsBrokenThisTurn:743 · playedFreeThisTurn:745 · enteredByRevolution:749 · usedThisTurn:751 · chosenMatches:753

