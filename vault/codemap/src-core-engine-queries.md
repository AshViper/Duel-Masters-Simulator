---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1185行）

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
- L323 **export** fn `canTapAbility`
- L330 **export** fn `gearsOn`
- L335 fn `matchFace`
- L355 **export** interface `ActiveStatic`
- L362 **export** fn `activeStatics`
- L366 fn `activeStaticsImpl`
- L382 fn `ownerMatches`
- L386 fn `appliesToCreature`
- L396 fn `mergeKeywords`
- L408 **export** fn `keywords`
- L412 fn `keywordsImpl`
- L428 **export** fn `withoutAttackLocks`
- L434 **export** fn `ignoresAttackLocks`
- L438 **export** fn `power`
- L442 fn `powerImpl`
- L462 **export** fn `breakerCount`
- L480 fn `justDiving`
- L487 **export** fn `isUntargetable`
- L496 **export** fn `cannotBeAttacked`
- L503 **export** fn `effectiveCost`
- L507 fn `effectiveCostImpl`
- L559 **export** fn `usesHyperEnergy`
- L567 **export** fn `sasageruCandidates`
- L579 **export** fn `minimalSacrifice`
- L594 **export** fn `playLimitReached`
- L609 **export** fn `isAura`
- L613 **export** fn `isCrossGear`
- L618 **export** fn `isGrCard`
- L623 **export** fn `canCross`
- L633 **export** fn `cannotLeaveNow`
- L643 **export** fn `cannotLose`
- L653 **export** fn `handProtected`
- L658 **export** fn `forcedAttackers`
- L663 **export** fn `entryBlocked`
- L673 **export** fn `playRestriction`
- L700 **export** fn `isSummoningSick`
- L709 **export** fn `canAttackWith`
- L713 fn `canAttackWithImpl`
- L727 **export** fn `attackTargets`
- L731 fn `attackTargetsImpl`
- L763 **export** fn `blockersFor`
- L786 **export** fn `targetCandidates`
- L813 **export** fn `countQuantity`
- L826 **export** fn `evalCondition`
- L949 fn `simpleSpec`
- L954 **export** fn `multiEvolveSpec`
- L959 **export** fn `evolveSourceCandidates`
- L972 **export** fn `validEvolveSources`
- L982 **export** fn `defaultEvolveSources`
- L995 **export** fn `evolutionBases`
- L1011 fn `matchesEvolvesFrom`
- L1019 **export** fn `canBeEvolutionSource`
- L1032 **export** fn `choosePayment`
- L1039 **export** fn `payMana`
- L1062 fn `assignCivs`
- L1080 **export** fn `altCost`
- L1089 **export** fn `altPayment`
- L1094 **export** fn `altUsable`
- L1108 **export** fn `canPlayAlt`
- L1116 **export** fn `fushigiCandidates`
- L1120 **export** fn `canPlay`
- L1124 fn `canPlayImpl`
- L1144 **export** fn `untappedManaCount`
- L1148 **export** fn `isIdle`
- L1152 **export** fn `instancesIn`
- L1157 **export** fn `attackSwapCandidates`
- L1181 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:828 · and:830 · or:832 · compare:834 · attackedThisTurn:839 · selfIsEvolution:841 · summonedThisTurn:847 · castThisTurn:849 · turnTally:851 · chosenDistinctNames:861 · didNot:865 · enteredFreeThisTurn:867 · nthAttackThisTurn:869 · enteredNamedThisTurn:871 · firstAttackThisTurn:873 · crossed:875 · entry:879 · godLinked:888 · shieldForce:890 · selfPower:894 · selfAttacking:899 · civsInBattle:901 · gearAttached:906 · selfTapped:910 · wonBattleThisTurn:912 · selfEnteredThisTurn:914 · subjectEnteredFree:916 · enteredThisTurn:918 · underCount:922 · opponentTurn:924 · inExtraTurn:926 · shieldsBrokenThisTurn:928 · playedFreeThisTurn:930 · enteredByRevolution:934 · usedThisTurn:936 · chosenMatches:938

