---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1130行）

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
- L285 **export** fn `canTapAbility`
- L292 **export** fn `gearsOn`
- L297 fn `matchFace`
- L317 **export** interface `ActiveStatic`
- L324 **export** fn `activeStatics`
- L328 fn `activeStaticsImpl`
- L344 fn `ownerMatches`
- L348 fn `appliesToCreature`
- L358 fn `mergeKeywords`
- L370 **export** fn `keywords`
- L374 fn `keywordsImpl`
- L390 **export** fn `withoutAttackLocks`
- L396 **export** fn `ignoresAttackLocks`
- L400 **export** fn `power`
- L404 fn `powerImpl`
- L422 **export** fn `breakerCount`
- L438 fn `justDiving`
- L445 **export** fn `isUntargetable`
- L454 **export** fn `cannotBeAttacked`
- L461 **export** fn `effectiveCost`
- L465 fn `effectiveCostImpl`
- L517 **export** fn `usesHyperEnergy`
- L525 **export** fn `sasageruCandidates`
- L537 **export** fn `minimalSacrifice`
- L552 **export** fn `playLimitReached`
- L566 **export** fn `isCrossGear`
- L571 **export** fn `isGrCard`
- L576 **export** fn `canCross`
- L586 **export** fn `cannotLeaveNow`
- L596 **export** fn `cannotLose`
- L606 **export** fn `handProtected`
- L611 **export** fn `forcedAttackers`
- L616 **export** fn `entryBlocked`
- L626 **export** fn `playRestriction`
- L651 **export** fn `isSummoningSick`
- L660 **export** fn `canAttackWith`
- L664 fn `canAttackWithImpl`
- L676 **export** fn `attackTargets`
- L680 fn `attackTargetsImpl`
- L712 **export** fn `blockersFor`
- L733 **export** fn `targetCandidates`
- L760 **export** fn `countQuantity`
- L773 **export** fn `evalCondition`
- L894 fn `simpleSpec`
- L899 **export** fn `multiEvolveSpec`
- L904 **export** fn `evolveSourceCandidates`
- L917 **export** fn `validEvolveSources`
- L927 **export** fn `defaultEvolveSources`
- L940 **export** fn `evolutionBases`
- L956 fn `matchesEvolvesFrom`
- L964 **export** fn `canBeEvolutionSource`
- L977 **export** fn `choosePayment`
- L984 **export** fn `payMana`
- L1007 fn `assignCivs`
- L1025 **export** fn `altCost`
- L1034 **export** fn `altPayment`
- L1039 **export** fn `altUsable`
- L1053 **export** fn `canPlayAlt`
- L1061 **export** fn `fushigiCandidates`
- L1065 **export** fn `canPlay`
- L1069 fn `canPlayImpl`
- L1089 **export** fn `untappedManaCount`
- L1093 **export** fn `isIdle`
- L1097 **export** fn `instancesIn`
- L1102 **export** fn `attackSwapCandidates`
- L1126 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:775 · and:777 · or:779 · compare:781 · attackedThisTurn:786 · selfIsEvolution:788 · summonedThisTurn:794 · castThisTurn:796 · turnTally:798 · chosenDistinctNames:808 · didNot:812 · enteredFreeThisTurn:814 · nthAttackThisTurn:816 · enteredNamedThisTurn:818 · firstAttackThisTurn:820 · crossed:822 · entry:826 · shieldForce:835 · selfPower:839 · selfAttacking:844 · civsInBattle:846 · gearAttached:851 · selfTapped:855 · wonBattleThisTurn:857 · selfEnteredThisTurn:859 · subjectEnteredFree:861 · enteredThisTurn:863 · underCount:867 · opponentTurn:869 · inExtraTurn:871 · shieldsBrokenThisTurn:873 · playedFreeThisTurn:875 · enteredByRevolution:879 · usedThisTurn:881 · chosenMatches:883

