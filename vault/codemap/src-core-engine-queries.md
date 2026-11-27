---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1131行）

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
- L286 **export** fn `canTapAbility`
- L293 **export** fn `gearsOn`
- L298 fn `matchFace`
- L318 **export** interface `ActiveStatic`
- L325 **export** fn `activeStatics`
- L329 fn `activeStaticsImpl`
- L345 fn `ownerMatches`
- L349 fn `appliesToCreature`
- L359 fn `mergeKeywords`
- L371 **export** fn `keywords`
- L375 fn `keywordsImpl`
- L391 **export** fn `withoutAttackLocks`
- L397 **export** fn `ignoresAttackLocks`
- L401 **export** fn `power`
- L405 fn `powerImpl`
- L423 **export** fn `breakerCount`
- L439 fn `justDiving`
- L446 **export** fn `isUntargetable`
- L455 **export** fn `cannotBeAttacked`
- L462 **export** fn `effectiveCost`
- L466 fn `effectiveCostImpl`
- L518 **export** fn `usesHyperEnergy`
- L526 **export** fn `sasageruCandidates`
- L538 **export** fn `minimalSacrifice`
- L553 **export** fn `playLimitReached`
- L567 **export** fn `isCrossGear`
- L572 **export** fn `isGrCard`
- L577 **export** fn `canCross`
- L587 **export** fn `cannotLeaveNow`
- L597 **export** fn `cannotLose`
- L607 **export** fn `handProtected`
- L612 **export** fn `forcedAttackers`
- L617 **export** fn `entryBlocked`
- L627 **export** fn `playRestriction`
- L652 **export** fn `isSummoningSick`
- L661 **export** fn `canAttackWith`
- L665 fn `canAttackWithImpl`
- L677 **export** fn `attackTargets`
- L681 fn `attackTargetsImpl`
- L713 **export** fn `blockersFor`
- L734 **export** fn `targetCandidates`
- L761 **export** fn `countQuantity`
- L774 **export** fn `evalCondition`
- L895 fn `simpleSpec`
- L900 **export** fn `multiEvolveSpec`
- L905 **export** fn `evolveSourceCandidates`
- L918 **export** fn `validEvolveSources`
- L928 **export** fn `defaultEvolveSources`
- L941 **export** fn `evolutionBases`
- L957 fn `matchesEvolvesFrom`
- L965 **export** fn `canBeEvolutionSource`
- L978 **export** fn `choosePayment`
- L985 **export** fn `payMana`
- L1008 fn `assignCivs`
- L1026 **export** fn `altCost`
- L1035 **export** fn `altPayment`
- L1040 **export** fn `altUsable`
- L1054 **export** fn `canPlayAlt`
- L1062 **export** fn `fushigiCandidates`
- L1066 **export** fn `canPlay`
- L1070 fn `canPlayImpl`
- L1090 **export** fn `untappedManaCount`
- L1094 **export** fn `isIdle`
- L1098 **export** fn `instancesIn`
- L1103 **export** fn `attackSwapCandidates`
- L1127 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:776 · and:778 · or:780 · compare:782 · attackedThisTurn:787 · selfIsEvolution:789 · summonedThisTurn:795 · castThisTurn:797 · turnTally:799 · chosenDistinctNames:809 · didNot:813 · enteredFreeThisTurn:815 · nthAttackThisTurn:817 · enteredNamedThisTurn:819 · firstAttackThisTurn:821 · crossed:823 · entry:827 · shieldForce:836 · selfPower:840 · selfAttacking:845 · civsInBattle:847 · gearAttached:852 · selfTapped:856 · wonBattleThisTurn:858 · selfEnteredThisTurn:860 · subjectEnteredFree:862 · enteredThisTurn:864 · underCount:868 · opponentTurn:870 · inExtraTurn:872 · shieldsBrokenThisTurn:874 · playedFreeThisTurn:876 · enteredByRevolution:880 · usedThisTurn:882 · chosenMatches:884

