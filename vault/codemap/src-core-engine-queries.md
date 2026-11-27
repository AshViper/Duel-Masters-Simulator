---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1082行）

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
- L280 **export** fn `canTapAbility`
- L287 **export** fn `gearsOn`
- L292 fn `matchFace`
- L312 **export** interface `ActiveStatic`
- L319 **export** fn `activeStatics`
- L323 fn `activeStaticsImpl`
- L339 fn `ownerMatches`
- L343 fn `appliesToCreature`
- L353 fn `mergeKeywords`
- L365 **export** fn `keywords`
- L369 fn `keywordsImpl`
- L385 **export** fn `withoutAttackLocks`
- L391 **export** fn `ignoresAttackLocks`
- L395 **export** fn `power`
- L399 fn `powerImpl`
- L417 **export** fn `breakerCount`
- L431 fn `justDiving`
- L438 **export** fn `isUntargetable`
- L447 **export** fn `cannotBeAttacked`
- L454 **export** fn `effectiveCost`
- L458 fn `effectiveCostImpl`
- L510 **export** fn `usesHyperEnergy`
- L518 **export** fn `sasageruCandidates`
- L530 **export** fn `minimalSacrifice`
- L545 **export** fn `playLimitReached`
- L559 **export** fn `isCrossGear`
- L564 **export** fn `isGrCard`
- L569 **export** fn `canCross`
- L579 **export** fn `cannotLeaveNow`
- L587 **export** fn `cannotLose`
- L597 **export** fn `forcedAttackers`
- L602 **export** fn `entryBlocked`
- L612 **export** fn `playRestriction`
- L637 **export** fn `isSummoningSick`
- L646 **export** fn `canAttackWith`
- L650 fn `canAttackWithImpl`
- L662 **export** fn `attackTargets`
- L666 fn `attackTargetsImpl`
- L692 **export** fn `blockersFor`
- L713 **export** fn `targetCandidates`
- L740 **export** fn `countQuantity`
- L750 **export** fn `evalCondition`
- L846 fn `simpleSpec`
- L851 **export** fn `multiEvolveSpec`
- L856 **export** fn `evolveSourceCandidates`
- L869 **export** fn `validEvolveSources`
- L879 **export** fn `defaultEvolveSources`
- L892 **export** fn `evolutionBases`
- L908 fn `matchesEvolvesFrom`
- L916 **export** fn `canBeEvolutionSource`
- L929 **export** fn `choosePayment`
- L936 **export** fn `payMana`
- L959 fn `assignCivs`
- L977 **export** fn `altCost`
- L986 **export** fn `altPayment`
- L991 **export** fn `altUsable`
- L1005 **export** fn `canPlayAlt`
- L1013 **export** fn `fushigiCandidates`
- L1017 **export** fn `canPlay`
- L1021 fn `canPlayImpl`
- L1041 **export** fn `untappedManaCount`
- L1045 **export** fn `isIdle`
- L1049 **export** fn `instancesIn`
- L1054 **export** fn `attackSwapCandidates`
- L1078 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:752 · and:754 · or:756 · compare:758 · attackedThisTurn:763 · selfIsEvolution:765 · summonedThisTurn:771 · castThisTurn:773 · turnTally:775 · chosenDistinctNames:785 · didNot:789 · enteredFreeThisTurn:791 · nthAttackThisTurn:793 · enteredNamedThisTurn:795 · firstAttackThisTurn:797 · crossed:799 · gearAttached:803 · selfTapped:807 · wonBattleThisTurn:809 · selfEnteredThisTurn:811 · subjectEnteredFree:813 · enteredThisTurn:815 · underCount:819 · opponentTurn:821 · inExtraTurn:823 · shieldsBrokenThisTurn:825 · playedFreeThisTurn:827 · enteredByRevolution:831 · usedThisTurn:833 · chosenMatches:835

