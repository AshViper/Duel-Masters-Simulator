---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1193行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲーム状態を読むだけの関数群（状態を変更しない）。UI・AI・エンジンで共用する。

## トップレベル

- L32 **export** fn `sealForQueries`
- L36 fn `cached`
- L46 **export** fn `def`
- L63 fn `withGodLinks`
- L84 **export** fn `godLinkKinds`
- L91 **export** fn `psychicBackDef`
- L103 fn `withSouls`
- L123 fn `withSurvivors`
- L137 **export** fn `forbiddenDef`
- L161 **export** fn `isIgnored`
- L169 **export** fn `battleCards`
- L175 **export** fn `battleAndFields`
- L180 **export** fn `canSummonFromZone`
- L189 **export** fn `zoneSummonSource`
- L203 fn `hyperDef`
- L220 **export** fn `hyperizeCandidates`
- L233 **export** fn `matchFilter`
- L325 **export** fn `canTapAbility`
- L332 **export** fn `gearsOn`
- L337 fn `matchFace`
- L357 **export** interface `ActiveStatic`
- L364 **export** fn `activeStatics`
- L368 fn `activeStaticsImpl`
- L384 fn `ownerMatches`
- L388 fn `appliesToCreature`
- L398 fn `mergeKeywords`
- L410 **export** fn `keywords`
- L414 fn `keywordsImpl`
- L430 **export** fn `withoutAttackLocks`
- L436 **export** fn `ignoresAttackLocks`
- L440 **export** fn `power`
- L444 fn `powerImpl`
- L464 **export** fn `breakerCount`
- L482 fn `justDiving`
- L489 **export** fn `isUntargetable`
- L498 **export** fn `cannotBeAttacked`
- L505 **export** fn `effectiveCost`
- L509 fn `effectiveCostImpl`
- L561 **export** fn `usesHyperEnergy`
- L569 **export** fn `sasageruCandidates`
- L581 **export** fn `minimalSacrifice`
- L596 **export** fn `playLimitReached`
- L611 **export** fn `isAura`
- L615 **export** fn `isCrossGear`
- L620 **export** fn `isGrCard`
- L625 **export** fn `canCross`
- L635 **export** fn `cannotLeaveNow`
- L645 **export** fn `cannotLose`
- L655 **export** fn `handProtected`
- L660 **export** fn `forcedAttackers`
- L665 **export** fn `entryBlocked`
- L675 **export** fn `playRestriction`
- L702 **export** fn `isSummoningSick`
- L711 **export** fn `canAttackWith`
- L715 fn `canAttackWithImpl`
- L729 **export** fn `attackTargets`
- L733 fn `attackTargetsImpl`
- L765 **export** fn `blockersFor`
- L788 **export** fn `targetCandidates`
- L815 **export** fn `countQuantity`
- L828 **export** fn `evalCondition`
- L951 fn `simpleSpec`
- L956 **export** fn `multiEvolveSpec`
- L961 **export** fn `evolveSourceCandidates`
- L974 **export** fn `validEvolveSources`
- L984 **export** fn `defaultEvolveSources`
- L997 **export** fn `evolutionBases`
- L1013 fn `matchesEvolvesFrom`
- L1021 **export** fn `canBeEvolutionSource`
- L1034 **export** fn `choosePayment`
- L1041 **export** fn `payMana`
- L1064 fn `assignCivs`
- L1082 **export** fn `altCost`
- L1097 **export** fn `altPayment`
- L1102 **export** fn `altUsable`
- L1116 **export** fn `canPlayAlt`
- L1124 **export** fn `fushigiCandidates`
- L1128 **export** fn `canPlay`
- L1132 fn `canPlayImpl`
- L1152 **export** fn `untappedManaCount`
- L1156 **export** fn `isIdle`
- L1160 **export** fn `instancesIn`
- L1165 **export** fn `attackSwapCandidates`
- L1189 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:830 · and:832 · or:834 · compare:836 · attackedThisTurn:841 · selfIsEvolution:843 · summonedThisTurn:849 · castThisTurn:851 · turnTally:853 · chosenDistinctNames:863 · didNot:867 · enteredFreeThisTurn:869 · nthAttackThisTurn:871 · enteredNamedThisTurn:873 · firstAttackThisTurn:875 · crossed:877 · entry:881 · godLinked:890 · shieldForce:892 · selfPower:896 · selfAttacking:901 · civsInBattle:903 · gearAttached:908 · selfTapped:912 · wonBattleThisTurn:914 · selfEnteredThisTurn:916 · subjectEnteredFree:918 · enteredThisTurn:920 · underCount:924 · opponentTurn:926 · inExtraTurn:928 · shieldsBrokenThisTurn:930 · playedFreeThisTurn:932 · enteredByRevolution:936 · usedThisTurn:938 · chosenMatches:940

