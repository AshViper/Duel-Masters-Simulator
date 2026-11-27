---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1126行）

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
- L890 fn `simpleSpec`
- L895 **export** fn `multiEvolveSpec`
- L900 **export** fn `evolveSourceCandidates`
- L913 **export** fn `validEvolveSources`
- L923 **export** fn `defaultEvolveSources`
- L936 **export** fn `evolutionBases`
- L952 fn `matchesEvolvesFrom`
- L960 **export** fn `canBeEvolutionSource`
- L973 **export** fn `choosePayment`
- L980 **export** fn `payMana`
- L1003 fn `assignCivs`
- L1021 **export** fn `altCost`
- L1030 **export** fn `altPayment`
- L1035 **export** fn `altUsable`
- L1049 **export** fn `canPlayAlt`
- L1057 **export** fn `fushigiCandidates`
- L1061 **export** fn `canPlay`
- L1065 fn `canPlayImpl`
- L1085 **export** fn `untappedManaCount`
- L1089 **export** fn `isIdle`
- L1093 **export** fn `instancesIn`
- L1098 **export** fn `attackSwapCandidates`
- L1122 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:775 · and:777 · or:779 · compare:781 · attackedThisTurn:786 · selfIsEvolution:788 · summonedThisTurn:794 · castThisTurn:796 · turnTally:798 · chosenDistinctNames:808 · didNot:812 · enteredFreeThisTurn:814 · nthAttackThisTurn:816 · enteredNamedThisTurn:818 · firstAttackThisTurn:820 · crossed:822 · entry:826 · selfPower:835 · selfAttacking:840 · civsInBattle:842 · gearAttached:847 · selfTapped:851 · wonBattleThisTurn:853 · selfEnteredThisTurn:855 · subjectEnteredFree:857 · enteredThisTurn:859 · underCount:863 · opponentTurn:865 · inExtraTurn:867 · shieldsBrokenThisTurn:869 · playedFreeThisTurn:871 · enteredByRevolution:875 · usedThisTurn:877 · chosenMatches:879

