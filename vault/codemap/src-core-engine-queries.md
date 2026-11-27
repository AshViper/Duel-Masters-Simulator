---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1285行）

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
- L353 **export** fn `canTapAbility`
- L360 **export** fn `gearsOn`
- L365 **export** fn `matchFace`
- L385 **export** interface `ActiveStatic`
- L392 **export** fn `activeStatics`
- L396 fn `activeStaticsImpl`
- L417 **export** fn `abilitiesIgnored`
- L424 **export** fn `shieldTriggerLocked`
- L432 fn `ownerMatches`
- L436 fn `appliesToCreature`
- L446 fn `mergeKeywords`
- L458 **export** fn `keywords`
- L462 fn `keywordsImpl`
- L479 **export** fn `withoutAttackLocks`
- L485 **export** fn `ignoresAttackLocks`
- L489 **export** fn `power`
- L493 fn `powerImpl`
- L513 **export** fn `breakerCount`
- L531 fn `justDiving`
- L538 **export** fn `isUntargetable`
- L547 **export** fn `cannotBeAttacked`
- L553 **export** fn `oncePerTurnCostMods`
- L574 **export** fn `effectiveCost`
- L578 fn `effectiveCostImpl`
- L635 **export** fn `usesHyperEnergy`
- L643 **export** fn `sasageruCandidates`
- L655 **export** fn `minimalSacrifice`
- L670 **export** fn `playLimitReached`
- L685 **export** fn `isAura`
- L689 **export** fn `isCrossGear`
- L694 **export** fn `isGrCard`
- L699 **export** fn `canCross`
- L709 **export** fn `cannotLeaveNow`
- L719 **export** fn `cannotLose`
- L729 **export** fn `handProtected`
- L734 **export** fn `forcedAttackers`
- L739 **export** fn `entryBlocked`
- L749 **export** fn `playRestriction`
- L776 **export** fn `isSummoningSick`
- L785 **export** fn `canAttackWith`
- L789 fn `canAttackWithImpl`
- L803 **export** fn `attackTargets`
- L807 fn `attackTargetsImpl`
- L841 **export** fn `blockersFor`
- L864 **export** fn `targetCandidates`
- L891 **export** fn `countQuantity`
- L904 **export** fn `evalCondition`
- L1042 fn `simpleSpec`
- L1047 **export** fn `multiEvolveSpec`
- L1052 **export** fn `evolveSourceCandidates`
- L1065 **export** fn `validEvolveSources`
- L1075 **export** fn `defaultEvolveSources`
- L1088 **export** fn `evolutionBases`
- L1104 fn `matchesEvolvesFrom`
- L1113 **export** fn `canBeEvolutionSource`
- L1126 **export** fn `choosePayment`
- L1133 **export** fn `payMana`
- L1156 fn `assignCivs`
- L1174 **export** fn `altCost`
- L1189 **export** fn `altPayment`
- L1194 **export** fn `altUsable`
- L1208 **export** fn `canPlayAlt`
- L1216 **export** fn `fushigiCandidates`
- L1220 **export** fn `canPlay`
- L1224 fn `canPlayImpl`
- L1244 **export** fn `untappedManaCount`
- L1248 **export** fn `isIdle`
- L1252 **export** fn `instancesIn`
- L1257 **export** fn `attackSwapCandidates`
- L1281 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:906 · and:908 · or:910 · compare:912 · attackedThisTurn:917 · selfIsEvolution:919 · summonedThisTurn:925 · castThisTurn:927 · turnTally:929 · chosenDistinctNames:939 · didNot:943 · enteredFreeThisTurn:945 · nthAttackThisTurn:947 · enteredNamedThisTurn:949 · firstAttackThisTurn:951 · crossed:953 · entry:957 · godLinked:966 · shieldForce:968 · selfPower:972 · selfAttacking:977 · civsInBattle:979 · gearAttached:990 · selfTapped:994 · wonBattleThisTurn:996 · selfEnteredThisTurn:998 · attackedWithPower:1000 · subjectEnteredFree:1004 · enteredThisTurn:1006 · underCount:1010 · opponentTurn:1012 · inExtraTurn:1014 · shieldsBrokenThisTurn:1016 · playedFreeThisTurn:1018 · enteredByRevolution:1022 · usedThisTurn:1024 · chosenMatches:1026 · firstTapThisTurn:1030

