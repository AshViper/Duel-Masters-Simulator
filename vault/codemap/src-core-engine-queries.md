---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1087行）

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
- L597 **export** fn `handProtected`
- L602 **export** fn `forcedAttackers`
- L607 **export** fn `entryBlocked`
- L617 **export** fn `playRestriction`
- L642 **export** fn `isSummoningSick`
- L651 **export** fn `canAttackWith`
- L655 fn `canAttackWithImpl`
- L667 **export** fn `attackTargets`
- L671 fn `attackTargetsImpl`
- L697 **export** fn `blockersFor`
- L718 **export** fn `targetCandidates`
- L745 **export** fn `countQuantity`
- L755 **export** fn `evalCondition`
- L851 fn `simpleSpec`
- L856 **export** fn `multiEvolveSpec`
- L861 **export** fn `evolveSourceCandidates`
- L874 **export** fn `validEvolveSources`
- L884 **export** fn `defaultEvolveSources`
- L897 **export** fn `evolutionBases`
- L913 fn `matchesEvolvesFrom`
- L921 **export** fn `canBeEvolutionSource`
- L934 **export** fn `choosePayment`
- L941 **export** fn `payMana`
- L964 fn `assignCivs`
- L982 **export** fn `altCost`
- L991 **export** fn `altPayment`
- L996 **export** fn `altUsable`
- L1010 **export** fn `canPlayAlt`
- L1018 **export** fn `fushigiCandidates`
- L1022 **export** fn `canPlay`
- L1026 fn `canPlayImpl`
- L1046 **export** fn `untappedManaCount`
- L1050 **export** fn `isIdle`
- L1054 **export** fn `instancesIn`
- L1059 **export** fn `attackSwapCandidates`
- L1083 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:757 · and:759 · or:761 · compare:763 · attackedThisTurn:768 · selfIsEvolution:770 · summonedThisTurn:776 · castThisTurn:778 · turnTally:780 · chosenDistinctNames:790 · didNot:794 · enteredFreeThisTurn:796 · nthAttackThisTurn:798 · enteredNamedThisTurn:800 · firstAttackThisTurn:802 · crossed:804 · gearAttached:808 · selfTapped:812 · wonBattleThisTurn:814 · selfEnteredThisTurn:816 · subjectEnteredFree:818 · enteredThisTurn:820 · underCount:824 · opponentTurn:826 · inExtraTurn:828 · shieldsBrokenThisTurn:830 · playedFreeThisTurn:832 · enteredByRevolution:836 · usedThisTurn:838 · chosenMatches:840

