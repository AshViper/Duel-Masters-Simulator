---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1181行）

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
- L725 **export** fn `attackTargets`
- L729 fn `attackTargetsImpl`
- L761 **export** fn `blockersFor`
- L782 **export** fn `targetCandidates`
- L809 **export** fn `countQuantity`
- L822 **export** fn `evalCondition`
- L945 fn `simpleSpec`
- L950 **export** fn `multiEvolveSpec`
- L955 **export** fn `evolveSourceCandidates`
- L968 **export** fn `validEvolveSources`
- L978 **export** fn `defaultEvolveSources`
- L991 **export** fn `evolutionBases`
- L1007 fn `matchesEvolvesFrom`
- L1015 **export** fn `canBeEvolutionSource`
- L1028 **export** fn `choosePayment`
- L1035 **export** fn `payMana`
- L1058 fn `assignCivs`
- L1076 **export** fn `altCost`
- L1085 **export** fn `altPayment`
- L1090 **export** fn `altUsable`
- L1104 **export** fn `canPlayAlt`
- L1112 **export** fn `fushigiCandidates`
- L1116 **export** fn `canPlay`
- L1120 fn `canPlayImpl`
- L1140 **export** fn `untappedManaCount`
- L1144 **export** fn `isIdle`
- L1148 **export** fn `instancesIn`
- L1153 **export** fn `attackSwapCandidates`
- L1177 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:824 · and:826 · or:828 · compare:830 · attackedThisTurn:835 · selfIsEvolution:837 · summonedThisTurn:843 · castThisTurn:845 · turnTally:847 · chosenDistinctNames:857 · didNot:861 · enteredFreeThisTurn:863 · nthAttackThisTurn:865 · enteredNamedThisTurn:867 · firstAttackThisTurn:869 · crossed:871 · entry:875 · godLinked:884 · shieldForce:886 · selfPower:890 · selfAttacking:895 · civsInBattle:897 · gearAttached:902 · selfTapped:906 · wonBattleThisTurn:908 · selfEnteredThisTurn:910 · subjectEnteredFree:912 · enteredThisTurn:914 · underCount:918 · opponentTurn:920 · inExtraTurn:922 · shieldsBrokenThisTurn:924 · playedFreeThisTurn:926 · enteredByRevolution:930 · usedThisTurn:932 · chosenMatches:934

