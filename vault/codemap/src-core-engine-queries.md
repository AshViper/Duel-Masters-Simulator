---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1048行）

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
- L484 **export** fn `usesHyperEnergy`
- L492 **export** fn `sasageruCandidates`
- L504 **export** fn `minimalSacrifice`
- L519 **export** fn `playLimitReached`
- L533 **export** fn `isCrossGear`
- L538 **export** fn `isGrCard`
- L543 **export** fn `canCross`
- L553 **export** fn `cannotLeaveNow`
- L561 **export** fn `cannotLose`
- L571 **export** fn `forcedAttackers`
- L576 **export** fn `entryBlocked`
- L586 **export** fn `playRestriction`
- L611 **export** fn `isSummoningSick`
- L620 **export** fn `canAttackWith`
- L624 fn `canAttackWithImpl`
- L636 **export** fn `attackTargets`
- L640 fn `attackTargetsImpl`
- L663 **export** fn `blockersFor`
- L683 **export** fn `targetCandidates`
- L710 **export** fn `countQuantity`
- L720 **export** fn `evalCondition`
- L812 fn `simpleSpec`
- L817 **export** fn `multiEvolveSpec`
- L822 **export** fn `evolveSourceCandidates`
- L835 **export** fn `validEvolveSources`
- L845 **export** fn `defaultEvolveSources`
- L858 **export** fn `evolutionBases`
- L874 fn `matchesEvolvesFrom`
- L882 **export** fn `canBeEvolutionSource`
- L895 **export** fn `choosePayment`
- L902 **export** fn `payMana`
- L925 fn `assignCivs`
- L943 **export** fn `altCost`
- L952 **export** fn `altPayment`
- L957 **export** fn `altUsable`
- L971 **export** fn `canPlayAlt`
- L979 **export** fn `fushigiCandidates`
- L983 **export** fn `canPlay`
- L987 fn `canPlayImpl`
- L1007 **export** fn `untappedManaCount`
- L1011 **export** fn `isIdle`
- L1015 **export** fn `instancesIn`
- L1020 **export** fn `attackSwapCandidates`
- L1044 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:722 · and:724 · or:726 · compare:728 · attackedThisTurn:733 · selfIsEvolution:735 · summonedThisTurn:741 · castThisTurn:743 · turnTally:745 · chosenDistinctNames:755 · didNot:759 · enteredFreeThisTurn:761 · nthAttackThisTurn:763 · enteredNamedThisTurn:765 · firstAttackThisTurn:767 · crossed:769 · selfTapped:773 · wonBattleThisTurn:775 · selfEnteredThisTurn:777 · subjectEnteredFree:779 · enteredThisTurn:781 · underCount:785 · opponentTurn:787 · inExtraTurn:789 · shieldsBrokenThisTurn:791 · playedFreeThisTurn:793 · enteredByRevolution:797 · usedThisTurn:799 · chosenMatches:801

