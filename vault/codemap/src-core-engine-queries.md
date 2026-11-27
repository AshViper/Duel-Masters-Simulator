---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1113行）

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
- L433 fn `justDiving`
- L440 **export** fn `isUntargetable`
- L449 **export** fn `cannotBeAttacked`
- L456 **export** fn `effectiveCost`
- L460 fn `effectiveCostImpl`
- L512 **export** fn `usesHyperEnergy`
- L520 **export** fn `sasageruCandidates`
- L532 **export** fn `minimalSacrifice`
- L547 **export** fn `playLimitReached`
- L561 **export** fn `isCrossGear`
- L566 **export** fn `isGrCard`
- L571 **export** fn `canCross`
- L581 **export** fn `cannotLeaveNow`
- L591 **export** fn `cannotLose`
- L601 **export** fn `handProtected`
- L606 **export** fn `forcedAttackers`
- L611 **export** fn `entryBlocked`
- L621 **export** fn `playRestriction`
- L646 **export** fn `isSummoningSick`
- L655 **export** fn `canAttackWith`
- L659 fn `canAttackWithImpl`
- L671 **export** fn `attackTargets`
- L675 fn `attackTargetsImpl`
- L707 **export** fn `blockersFor`
- L728 **export** fn `targetCandidates`
- L755 **export** fn `countQuantity`
- L765 **export** fn `evalCondition`
- L877 fn `simpleSpec`
- L882 **export** fn `multiEvolveSpec`
- L887 **export** fn `evolveSourceCandidates`
- L900 **export** fn `validEvolveSources`
- L910 **export** fn `defaultEvolveSources`
- L923 **export** fn `evolutionBases`
- L939 fn `matchesEvolvesFrom`
- L947 **export** fn `canBeEvolutionSource`
- L960 **export** fn `choosePayment`
- L967 **export** fn `payMana`
- L990 fn `assignCivs`
- L1008 **export** fn `altCost`
- L1017 **export** fn `altPayment`
- L1022 **export** fn `altUsable`
- L1036 **export** fn `canPlayAlt`
- L1044 **export** fn `fushigiCandidates`
- L1048 **export** fn `canPlay`
- L1052 fn `canPlayImpl`
- L1072 **export** fn `untappedManaCount`
- L1076 **export** fn `isIdle`
- L1080 **export** fn `instancesIn`
- L1085 **export** fn `attackSwapCandidates`
- L1109 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:767 · and:769 · or:771 · compare:773 · attackedThisTurn:778 · selfIsEvolution:780 · summonedThisTurn:786 · castThisTurn:788 · turnTally:790 · chosenDistinctNames:800 · didNot:804 · enteredFreeThisTurn:806 · nthAttackThisTurn:808 · enteredNamedThisTurn:810 · firstAttackThisTurn:812 · crossed:814 · entry:818 · selfAttacking:827 · civsInBattle:829 · gearAttached:834 · selfTapped:838 · wonBattleThisTurn:840 · selfEnteredThisTurn:842 · subjectEnteredFree:844 · enteredThisTurn:846 · underCount:850 · opponentTurn:852 · inExtraTurn:854 · shieldsBrokenThisTurn:856 · playedFreeThisTurn:858 · enteredByRevolution:862 · usedThisTurn:864 · chosenMatches:866

