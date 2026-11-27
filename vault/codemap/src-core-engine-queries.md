---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1222行）

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
- L504 **export** fn `oncePerTurnCostMods`
- L525 **export** fn `effectiveCost`
- L529 fn `effectiveCostImpl`
- L583 **export** fn `usesHyperEnergy`
- L591 **export** fn `sasageruCandidates`
- L603 **export** fn `minimalSacrifice`
- L618 **export** fn `playLimitReached`
- L633 **export** fn `isAura`
- L637 **export** fn `isCrossGear`
- L642 **export** fn `isGrCard`
- L647 **export** fn `canCross`
- L657 **export** fn `cannotLeaveNow`
- L667 **export** fn `cannotLose`
- L677 **export** fn `handProtected`
- L682 **export** fn `forcedAttackers`
- L687 **export** fn `entryBlocked`
- L697 **export** fn `playRestriction`
- L724 **export** fn `isSummoningSick`
- L733 **export** fn `canAttackWith`
- L737 fn `canAttackWithImpl`
- L751 **export** fn `attackTargets`
- L755 fn `attackTargetsImpl`
- L787 **export** fn `blockersFor`
- L810 **export** fn `targetCandidates`
- L837 **export** fn `countQuantity`
- L850 **export** fn `evalCondition`
- L979 fn `simpleSpec`
- L984 **export** fn `multiEvolveSpec`
- L989 **export** fn `evolveSourceCandidates`
- L1002 **export** fn `validEvolveSources`
- L1012 **export** fn `defaultEvolveSources`
- L1025 **export** fn `evolutionBases`
- L1041 fn `matchesEvolvesFrom`
- L1050 **export** fn `canBeEvolutionSource`
- L1063 **export** fn `choosePayment`
- L1070 **export** fn `payMana`
- L1093 fn `assignCivs`
- L1111 **export** fn `altCost`
- L1126 **export** fn `altPayment`
- L1131 **export** fn `altUsable`
- L1145 **export** fn `canPlayAlt`
- L1153 **export** fn `fushigiCandidates`
- L1157 **export** fn `canPlay`
- L1161 fn `canPlayImpl`
- L1181 **export** fn `untappedManaCount`
- L1185 **export** fn `isIdle`
- L1189 **export** fn `instancesIn`
- L1194 **export** fn `attackSwapCandidates`
- L1218 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:852 · and:854 · or:856 · compare:858 · attackedThisTurn:863 · selfIsEvolution:865 · summonedThisTurn:871 · castThisTurn:873 · turnTally:875 · chosenDistinctNames:885 · didNot:889 · enteredFreeThisTurn:891 · nthAttackThisTurn:893 · enteredNamedThisTurn:895 · firstAttackThisTurn:897 · crossed:899 · entry:903 · godLinked:912 · shieldForce:914 · selfPower:918 · selfAttacking:923 · civsInBattle:925 · gearAttached:936 · selfTapped:940 · wonBattleThisTurn:942 · selfEnteredThisTurn:944 · subjectEnteredFree:946 · enteredThisTurn:948 · underCount:952 · opponentTurn:954 · inExtraTurn:956 · shieldsBrokenThisTurn:958 · playedFreeThisTurn:960 · enteredByRevolution:964 · usedThisTurn:966 · chosenMatches:968

