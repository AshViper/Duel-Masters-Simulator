---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1145行）

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
- L291 **export** fn `canTapAbility`
- L298 **export** fn `gearsOn`
- L303 fn `matchFace`
- L323 **export** interface `ActiveStatic`
- L330 **export** fn `activeStatics`
- L334 fn `activeStaticsImpl`
- L350 fn `ownerMatches`
- L354 fn `appliesToCreature`
- L364 fn `mergeKeywords`
- L376 **export** fn `keywords`
- L380 fn `keywordsImpl`
- L396 **export** fn `withoutAttackLocks`
- L402 **export** fn `ignoresAttackLocks`
- L406 **export** fn `power`
- L410 fn `powerImpl`
- L430 **export** fn `breakerCount`
- L446 fn `justDiving`
- L453 **export** fn `isUntargetable`
- L462 **export** fn `cannotBeAttacked`
- L469 **export** fn `effectiveCost`
- L473 fn `effectiveCostImpl`
- L525 **export** fn `usesHyperEnergy`
- L533 **export** fn `sasageruCandidates`
- L545 **export** fn `minimalSacrifice`
- L560 **export** fn `playLimitReached`
- L575 **export** fn `isAura`
- L579 **export** fn `isCrossGear`
- L584 **export** fn `isGrCard`
- L589 **export** fn `canCross`
- L599 **export** fn `cannotLeaveNow`
- L609 **export** fn `cannotLose`
- L619 **export** fn `handProtected`
- L624 **export** fn `forcedAttackers`
- L629 **export** fn `entryBlocked`
- L639 **export** fn `playRestriction`
- L666 **export** fn `isSummoningSick`
- L675 **export** fn `canAttackWith`
- L679 fn `canAttackWithImpl`
- L691 **export** fn `attackTargets`
- L695 fn `attackTargetsImpl`
- L727 **export** fn `blockersFor`
- L748 **export** fn `targetCandidates`
- L775 **export** fn `countQuantity`
- L788 **export** fn `evalCondition`
- L909 fn `simpleSpec`
- L914 **export** fn `multiEvolveSpec`
- L919 **export** fn `evolveSourceCandidates`
- L932 **export** fn `validEvolveSources`
- L942 **export** fn `defaultEvolveSources`
- L955 **export** fn `evolutionBases`
- L971 fn `matchesEvolvesFrom`
- L979 **export** fn `canBeEvolutionSource`
- L992 **export** fn `choosePayment`
- L999 **export** fn `payMana`
- L1022 fn `assignCivs`
- L1040 **export** fn `altCost`
- L1049 **export** fn `altPayment`
- L1054 **export** fn `altUsable`
- L1068 **export** fn `canPlayAlt`
- L1076 **export** fn `fushigiCandidates`
- L1080 **export** fn `canPlay`
- L1084 fn `canPlayImpl`
- L1104 **export** fn `untappedManaCount`
- L1108 **export** fn `isIdle`
- L1112 **export** fn `instancesIn`
- L1117 **export** fn `attackSwapCandidates`
- L1141 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:790 · and:792 · or:794 · compare:796 · attackedThisTurn:801 · selfIsEvolution:803 · summonedThisTurn:809 · castThisTurn:811 · turnTally:813 · chosenDistinctNames:823 · didNot:827 · enteredFreeThisTurn:829 · nthAttackThisTurn:831 · enteredNamedThisTurn:833 · firstAttackThisTurn:835 · crossed:837 · entry:841 · shieldForce:850 · selfPower:854 · selfAttacking:859 · civsInBattle:861 · gearAttached:866 · selfTapped:870 · wonBattleThisTurn:872 · selfEnteredThisTurn:874 · subjectEnteredFree:876 · enteredThisTurn:878 · underCount:882 · opponentTurn:884 · inExtraTurn:886 · shieldsBrokenThisTurn:888 · playedFreeThisTurn:890 · enteredByRevolution:894 · usedThisTurn:896 · chosenMatches:898

