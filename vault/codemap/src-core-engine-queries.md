---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（998行）

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
- L674 **export** fn `countQuantity`
- L684 **export** fn `evalCondition`
- L762 fn `simpleSpec`
- L767 **export** fn `multiEvolveSpec`
- L772 **export** fn `evolveSourceCandidates`
- L785 **export** fn `validEvolveSources`
- L795 **export** fn `defaultEvolveSources`
- L808 **export** fn `evolutionBases`
- L824 fn `matchesEvolvesFrom`
- L832 **export** fn `canBeEvolutionSource`
- L845 **export** fn `choosePayment`
- L852 **export** fn `payMana`
- L875 fn `assignCivs`
- L893 **export** fn `altCost`
- L902 **export** fn `altPayment`
- L907 **export** fn `altUsable`
- L921 **export** fn `canPlayAlt`
- L929 **export** fn `fushigiCandidates`
- L933 **export** fn `canPlay`
- L937 fn `canPlayImpl`
- L957 **export** fn `untappedManaCount`
- L961 **export** fn `isIdle`
- L965 **export** fn `instancesIn`
- L970 **export** fn `attackSwapCandidates`
- L994 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:686 · and:688 · or:690 · compare:692 · attackedThisTurn:697 · selfIsEvolution:699 · summonedThisTurn:705 · castThisTurn:707 · chosenDistinctNames:709 · didNot:713 · enteredFreeThisTurn:715 · firstAttackThisTurn:717 · crossed:719 · selfTapped:723 · wonBattleThisTurn:725 · selfEnteredThisTurn:727 · subjectEnteredFree:729 · enteredThisTurn:731 · underCount:735 · opponentTurn:737 · inExtraTurn:739 · shieldsBrokenThisTurn:741 · playedFreeThisTurn:743 · enteredByRevolution:747 · usedThisTurn:749 · chosenMatches:751

