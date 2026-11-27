---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（994行）

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
- L758 fn `simpleSpec`
- L763 **export** fn `multiEvolveSpec`
- L768 **export** fn `evolveSourceCandidates`
- L781 **export** fn `validEvolveSources`
- L791 **export** fn `defaultEvolveSources`
- L804 **export** fn `evolutionBases`
- L820 fn `matchesEvolvesFrom`
- L828 **export** fn `canBeEvolutionSource`
- L841 **export** fn `choosePayment`
- L848 **export** fn `payMana`
- L871 fn `assignCivs`
- L889 **export** fn `altCost`
- L898 **export** fn `altPayment`
- L903 **export** fn `altUsable`
- L917 **export** fn `canPlayAlt`
- L925 **export** fn `fushigiCandidates`
- L929 **export** fn `canPlay`
- L933 fn `canPlayImpl`
- L953 **export** fn `untappedManaCount`
- L957 **export** fn `isIdle`
- L961 **export** fn `instancesIn`
- L966 **export** fn `attackSwapCandidates`
- L990 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:686 · and:688 · or:690 · compare:692 · attackedThisTurn:697 · selfIsEvolution:699 · summonedThisTurn:705 · castThisTurn:707 · chosenDistinctNames:709 · didNot:713 · enteredFreeThisTurn:715 · firstAttackThisTurn:717 · crossed:719 · selfTapped:723 · wonBattleThisTurn:725 · selfEnteredThisTurn:727 · subjectEnteredFree:729 · enteredThisTurn:731 · underCount:735 · opponentTurn:737 · inExtraTurn:739 · shieldsBrokenThisTurn:741 · playedFreeThisTurn:743 · enteredByRevolution:747 · usedThisTurn:749

