---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1148行）

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
- L294 **export** fn `canTapAbility`
- L301 **export** fn `gearsOn`
- L306 fn `matchFace`
- L326 **export** interface `ActiveStatic`
- L333 **export** fn `activeStatics`
- L337 fn `activeStaticsImpl`
- L353 fn `ownerMatches`
- L357 fn `appliesToCreature`
- L367 fn `mergeKeywords`
- L379 **export** fn `keywords`
- L383 fn `keywordsImpl`
- L399 **export** fn `withoutAttackLocks`
- L405 **export** fn `ignoresAttackLocks`
- L409 **export** fn `power`
- L413 fn `powerImpl`
- L433 **export** fn `breakerCount`
- L449 fn `justDiving`
- L456 **export** fn `isUntargetable`
- L465 **export** fn `cannotBeAttacked`
- L472 **export** fn `effectiveCost`
- L476 fn `effectiveCostImpl`
- L528 **export** fn `usesHyperEnergy`
- L536 **export** fn `sasageruCandidates`
- L548 **export** fn `minimalSacrifice`
- L563 **export** fn `playLimitReached`
- L578 **export** fn `isAura`
- L582 **export** fn `isCrossGear`
- L587 **export** fn `isGrCard`
- L592 **export** fn `canCross`
- L602 **export** fn `cannotLeaveNow`
- L612 **export** fn `cannotLose`
- L622 **export** fn `handProtected`
- L627 **export** fn `forcedAttackers`
- L632 **export** fn `entryBlocked`
- L642 **export** fn `playRestriction`
- L669 **export** fn `isSummoningSick`
- L678 **export** fn `canAttackWith`
- L682 fn `canAttackWithImpl`
- L694 **export** fn `attackTargets`
- L698 fn `attackTargetsImpl`
- L730 **export** fn `blockersFor`
- L751 **export** fn `targetCandidates`
- L778 **export** fn `countQuantity`
- L791 **export** fn `evalCondition`
- L912 fn `simpleSpec`
- L917 **export** fn `multiEvolveSpec`
- L922 **export** fn `evolveSourceCandidates`
- L935 **export** fn `validEvolveSources`
- L945 **export** fn `defaultEvolveSources`
- L958 **export** fn `evolutionBases`
- L974 fn `matchesEvolvesFrom`
- L982 **export** fn `canBeEvolutionSource`
- L995 **export** fn `choosePayment`
- L1002 **export** fn `payMana`
- L1025 fn `assignCivs`
- L1043 **export** fn `altCost`
- L1052 **export** fn `altPayment`
- L1057 **export** fn `altUsable`
- L1071 **export** fn `canPlayAlt`
- L1079 **export** fn `fushigiCandidates`
- L1083 **export** fn `canPlay`
- L1087 fn `canPlayImpl`
- L1107 **export** fn `untappedManaCount`
- L1111 **export** fn `isIdle`
- L1115 **export** fn `instancesIn`
- L1120 **export** fn `attackSwapCandidates`
- L1144 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:793 · and:795 · or:797 · compare:799 · attackedThisTurn:804 · selfIsEvolution:806 · summonedThisTurn:812 · castThisTurn:814 · turnTally:816 · chosenDistinctNames:826 · didNot:830 · enteredFreeThisTurn:832 · nthAttackThisTurn:834 · enteredNamedThisTurn:836 · firstAttackThisTurn:838 · crossed:840 · entry:844 · shieldForce:853 · selfPower:857 · selfAttacking:862 · civsInBattle:864 · gearAttached:869 · selfTapped:873 · wonBattleThisTurn:875 · selfEnteredThisTurn:877 · subjectEnteredFree:879 · enteredThisTurn:881 · underCount:885 · opponentTurn:887 · inExtraTurn:889 · shieldsBrokenThisTurn:891 · playedFreeThisTurn:893 · enteredByRevolution:897 · usedThisTurn:899 · chosenMatches:901

