---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1317行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲーム状態を読むだけの関数群（状態を変更しない）。UI・AI・エンジンで共用する。

## トップレベル

- L32 **export** fn `sealForQueries`
- L36 fn `cached`
- L46 **export** fn `def`
- L67 fn `creatureIfMet`
- L78 fn `asTamaseed`
- L86 fn `withGodLinks`
- L107 **export** fn `godLinkKinds`
- L114 **export** fn `psychicBackDef`
- L126 fn `withSouls`
- L146 fn `withSurvivors`
- L160 **export** fn `forbiddenDef`
- L184 **export** fn `isIgnored`
- L192 **export** fn `battleCards`
- L198 **export** fn `battleAndFields`
- L203 **export** fn `canSummonFromZone`
- L212 **export** fn `zoneSummonSource`
- L228 fn `hyperDef`
- L245 **export** fn `hyperizeCandidates`
- L258 **export** fn `matchFilter`
- L354 **export** fn `canTapAbility`
- L361 **export** fn `gearsOn`
- L366 **export** fn `matchFace`
- L388 **export** interface `ActiveStatic`
- L395 **export** fn `activeStatics`
- L399 fn `activeStaticsImpl`
- L420 **export** fn `abilitiesIgnored`
- L427 **export** fn `shieldTriggerLocked`
- L435 fn `ownerMatches`
- L439 fn `appliesToCreature`
- L449 fn `mergeKeywords`
- L461 **export** fn `keywords`
- L465 fn `keywordsImpl`
- L482 **export** fn `withoutAttackLocks`
- L488 **export** fn `ignoresAttackLocks`
- L492 **export** fn `power`
- L496 fn `powerImpl`
- L516 **export** fn `breakerCount`
- L534 fn `justDiving`
- L541 **export** fn `isUntargetable`
- L550 **export** fn `cannotBeAttacked`
- L556 **export** fn `oncePerTurnCostMods`
- L577 **export** fn `effectiveCost`
- L581 fn `effectiveCostImpl`
- L638 **export** fn `usesHyperEnergy`
- L646 **export** fn `sasageruCandidates`
- L658 **export** fn `minimalSacrifice`
- L673 **export** fn `playLimitReached`
- L688 **export** fn `isAura`
- L692 **export** fn `isCrossGear`
- L697 **export** fn `isGrCard`
- L702 **export** fn `canCross`
- L712 **export** fn `cannotLeaveNow`
- L722 **export** fn `cannotLose`
- L732 **export** fn `handProtected`
- L737 **export** fn `forcedAttackers`
- L742 **export** fn `entryBlocked`
- L753 **export** fn `useBlocked`
- L769 **export** fn `freeCross`
- L774 **export** fn `crossCost`
- L778 **export** fn `playRestriction`
- L808 **export** fn `isSummoningSick`
- L817 **export** fn `canAttackWith`
- L821 fn `canAttackWithImpl`
- L835 **export** fn `attackTargets`
- L839 fn `attackTargetsImpl`
- L873 **export** fn `blockersFor`
- L896 **export** fn `targetCandidates`
- L923 **export** fn `countQuantity`
- L936 **export** fn `evalCondition`
- L1074 fn `simpleSpec`
- L1079 **export** fn `multiEvolveSpec`
- L1084 **export** fn `evolveSourceCandidates`
- L1097 **export** fn `validEvolveSources`
- L1107 **export** fn `defaultEvolveSources`
- L1120 **export** fn `evolutionBases`
- L1136 fn `matchesEvolvesFrom`
- L1145 **export** fn `canBeEvolutionSource`
- L1158 **export** fn `choosePayment`
- L1165 **export** fn `payMana`
- L1188 fn `assignCivs`
- L1206 **export** fn `altCost`
- L1221 **export** fn `altPayment`
- L1226 **export** fn `altUsable`
- L1240 **export** fn `canPlayAlt`
- L1248 **export** fn `fushigiCandidates`
- L1252 **export** fn `canPlay`
- L1256 fn `canPlayImpl`
- L1276 **export** fn `untappedManaCount`
- L1280 **export** fn `isIdle`
- L1284 **export** fn `instancesIn`
- L1289 **export** fn `attackSwapCandidates`
- L1313 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:938 · and:940 · or:942 · compare:944 · attackedThisTurn:949 · selfIsEvolution:951 · summonedThisTurn:957 · castThisTurn:959 · turnTally:961 · chosenDistinctNames:971 · didNot:975 · enteredFreeThisTurn:977 · nthAttackThisTurn:979 · enteredNamedThisTurn:981 · firstAttackThisTurn:983 · crossed:985 · entry:989 · godLinked:998 · shieldForce:1000 · selfPower:1004 · selfAttacking:1009 · civsInBattle:1011 · gearAttached:1022 · selfTapped:1026 · wonBattleThisTurn:1028 · selfEnteredThisTurn:1030 · attackedWithPower:1032 · subjectEnteredFree:1036 · enteredThisTurn:1038 · underCount:1042 · opponentTurn:1044 · inExtraTurn:1046 · shieldsBrokenThisTurn:1048 · playedFreeThisTurn:1050 · enteredByRevolution:1054 · usedThisTurn:1056 · chosenMatches:1058 · firstTapThisTurn:1062

