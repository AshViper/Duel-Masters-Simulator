---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1199行）

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
- L957 fn `simpleSpec`
- L962 **export** fn `multiEvolveSpec`
- L967 **export** fn `evolveSourceCandidates`
- L980 **export** fn `validEvolveSources`
- L990 **export** fn `defaultEvolveSources`
- L1003 **export** fn `evolutionBases`
- L1019 fn `matchesEvolvesFrom`
- L1027 **export** fn `canBeEvolutionSource`
- L1040 **export** fn `choosePayment`
- L1047 **export** fn `payMana`
- L1070 fn `assignCivs`
- L1088 **export** fn `altCost`
- L1103 **export** fn `altPayment`
- L1108 **export** fn `altUsable`
- L1122 **export** fn `canPlayAlt`
- L1130 **export** fn `fushigiCandidates`
- L1134 **export** fn `canPlay`
- L1138 fn `canPlayImpl`
- L1158 **export** fn `untappedManaCount`
- L1162 **export** fn `isIdle`
- L1166 **export** fn `instancesIn`
- L1171 **export** fn `attackSwapCandidates`
- L1195 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:830 · and:832 · or:834 · compare:836 · attackedThisTurn:841 · selfIsEvolution:843 · summonedThisTurn:849 · castThisTurn:851 · turnTally:853 · chosenDistinctNames:863 · didNot:867 · enteredFreeThisTurn:869 · nthAttackThisTurn:871 · enteredNamedThisTurn:873 · firstAttackThisTurn:875 · crossed:877 · entry:881 · godLinked:890 · shieldForce:892 · selfPower:896 · selfAttacking:901 · civsInBattle:903 · gearAttached:914 · selfTapped:918 · wonBattleThisTurn:920 · selfEnteredThisTurn:922 · subjectEnteredFree:924 · enteredThisTurn:926 · underCount:930 · opponentTurn:932 · inExtraTurn:934 · shieldsBrokenThisTurn:936 · playedFreeThisTurn:938 · enteredByRevolution:942 · usedThisTurn:944 · chosenMatches:946

