---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1140行）

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
- L425 **export** fn `breakerCount`
- L441 fn `justDiving`
- L448 **export** fn `isUntargetable`
- L457 **export** fn `cannotBeAttacked`
- L464 **export** fn `effectiveCost`
- L468 fn `effectiveCostImpl`
- L520 **export** fn `usesHyperEnergy`
- L528 **export** fn `sasageruCandidates`
- L540 **export** fn `minimalSacrifice`
- L555 **export** fn `playLimitReached`
- L570 **export** fn `isAura`
- L574 **export** fn `isCrossGear`
- L579 **export** fn `isGrCard`
- L584 **export** fn `canCross`
- L594 **export** fn `cannotLeaveNow`
- L604 **export** fn `cannotLose`
- L614 **export** fn `handProtected`
- L619 **export** fn `forcedAttackers`
- L624 **export** fn `entryBlocked`
- L634 **export** fn `playRestriction`
- L661 **export** fn `isSummoningSick`
- L670 **export** fn `canAttackWith`
- L674 fn `canAttackWithImpl`
- L686 **export** fn `attackTargets`
- L690 fn `attackTargetsImpl`
- L722 **export** fn `blockersFor`
- L743 **export** fn `targetCandidates`
- L770 **export** fn `countQuantity`
- L783 **export** fn `evalCondition`
- L904 fn `simpleSpec`
- L909 **export** fn `multiEvolveSpec`
- L914 **export** fn `evolveSourceCandidates`
- L927 **export** fn `validEvolveSources`
- L937 **export** fn `defaultEvolveSources`
- L950 **export** fn `evolutionBases`
- L966 fn `matchesEvolvesFrom`
- L974 **export** fn `canBeEvolutionSource`
- L987 **export** fn `choosePayment`
- L994 **export** fn `payMana`
- L1017 fn `assignCivs`
- L1035 **export** fn `altCost`
- L1044 **export** fn `altPayment`
- L1049 **export** fn `altUsable`
- L1063 **export** fn `canPlayAlt`
- L1071 **export** fn `fushigiCandidates`
- L1075 **export** fn `canPlay`
- L1079 fn `canPlayImpl`
- L1099 **export** fn `untappedManaCount`
- L1103 **export** fn `isIdle`
- L1107 **export** fn `instancesIn`
- L1112 **export** fn `attackSwapCandidates`
- L1136 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:785 · and:787 · or:789 · compare:791 · attackedThisTurn:796 · selfIsEvolution:798 · summonedThisTurn:804 · castThisTurn:806 · turnTally:808 · chosenDistinctNames:818 · didNot:822 · enteredFreeThisTurn:824 · nthAttackThisTurn:826 · enteredNamedThisTurn:828 · firstAttackThisTurn:830 · crossed:832 · entry:836 · shieldForce:845 · selfPower:849 · selfAttacking:854 · civsInBattle:856 · gearAttached:861 · selfTapped:865 · wonBattleThisTurn:867 · selfEnteredThisTurn:869 · subjectEnteredFree:871 · enteredThisTurn:873 · underCount:877 · opponentTurn:879 · inExtraTurn:881 · shieldsBrokenThisTurn:883 · playedFreeThisTurn:885 · enteredByRevolution:889 · usedThisTurn:891 · chosenMatches:893

