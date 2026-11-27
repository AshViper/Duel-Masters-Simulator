---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1071行）

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
- L276 **export** fn `gearsOn`
- L281 fn `matchFace`
- L301 **export** interface `ActiveStatic`
- L308 **export** fn `activeStatics`
- L312 fn `activeStaticsImpl`
- L328 fn `ownerMatches`
- L332 fn `appliesToCreature`
- L342 fn `mergeKeywords`
- L354 **export** fn `keywords`
- L358 fn `keywordsImpl`
- L374 **export** fn `withoutAttackLocks`
- L380 **export** fn `ignoresAttackLocks`
- L384 **export** fn `power`
- L388 fn `powerImpl`
- L406 **export** fn `breakerCount`
- L420 fn `justDiving`
- L427 **export** fn `isUntargetable`
- L436 **export** fn `cannotBeAttacked`
- L443 **export** fn `effectiveCost`
- L447 fn `effectiveCostImpl`
- L499 **export** fn `usesHyperEnergy`
- L507 **export** fn `sasageruCandidates`
- L519 **export** fn `minimalSacrifice`
- L534 **export** fn `playLimitReached`
- L548 **export** fn `isCrossGear`
- L553 **export** fn `isGrCard`
- L558 **export** fn `canCross`
- L568 **export** fn `cannotLeaveNow`
- L576 **export** fn `cannotLose`
- L586 **export** fn `forcedAttackers`
- L591 **export** fn `entryBlocked`
- L601 **export** fn `playRestriction`
- L626 **export** fn `isSummoningSick`
- L635 **export** fn `canAttackWith`
- L639 fn `canAttackWithImpl`
- L651 **export** fn `attackTargets`
- L655 fn `attackTargetsImpl`
- L681 **export** fn `blockersFor`
- L702 **export** fn `targetCandidates`
- L729 **export** fn `countQuantity`
- L739 **export** fn `evalCondition`
- L835 fn `simpleSpec`
- L840 **export** fn `multiEvolveSpec`
- L845 **export** fn `evolveSourceCandidates`
- L858 **export** fn `validEvolveSources`
- L868 **export** fn `defaultEvolveSources`
- L881 **export** fn `evolutionBases`
- L897 fn `matchesEvolvesFrom`
- L905 **export** fn `canBeEvolutionSource`
- L918 **export** fn `choosePayment`
- L925 **export** fn `payMana`
- L948 fn `assignCivs`
- L966 **export** fn `altCost`
- L975 **export** fn `altPayment`
- L980 **export** fn `altUsable`
- L994 **export** fn `canPlayAlt`
- L1002 **export** fn `fushigiCandidates`
- L1006 **export** fn `canPlay`
- L1010 fn `canPlayImpl`
- L1030 **export** fn `untappedManaCount`
- L1034 **export** fn `isIdle`
- L1038 **export** fn `instancesIn`
- L1043 **export** fn `attackSwapCandidates`
- L1067 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:741 · and:743 · or:745 · compare:747 · attackedThisTurn:752 · selfIsEvolution:754 · summonedThisTurn:760 · castThisTurn:762 · turnTally:764 · chosenDistinctNames:774 · didNot:778 · enteredFreeThisTurn:780 · nthAttackThisTurn:782 · enteredNamedThisTurn:784 · firstAttackThisTurn:786 · crossed:788 · gearAttached:792 · selfTapped:796 · wonBattleThisTurn:798 · selfEnteredThisTurn:800 · subjectEnteredFree:802 · enteredThisTurn:804 · underCount:808 · opponentTurn:810 · inExtraTurn:812 · shieldsBrokenThisTurn:814 · playedFreeThisTurn:816 · enteredByRevolution:820 · usedThisTurn:822 · chosenMatches:824

