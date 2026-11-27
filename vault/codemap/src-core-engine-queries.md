---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1357行）

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
- L230 fn `hyperDef`
- L247 **export** fn `hyperizeCandidates`
- L264 **export** fn `manaHasAllCivs`
- L269 fn `payCivs`
- L275 **export** fn `matchFilter`
- L377 **export** fn `canTapAbility`
- L384 **export** fn `gearsOn`
- L389 **export** fn `matchFace`
- L411 **export** interface `ActiveStatic`
- L418 **export** fn `activeStatics`
- L422 fn `activeStaticsImpl`
- L443 **export** fn `abilitiesIgnored`
- L450 **export** fn `shieldTriggerLocked`
- L458 fn `ownerMatches`
- L462 fn `appliesToCreature`
- L472 fn `mergeKeywords`
- L486 **export** fn `keywords`
- L490 fn `keywordsImpl`
- L507 **export** fn `withoutAttackLocks`
- L513 **export** fn `ignoresAttackLocks`
- L517 **export** fn `power`
- L521 fn `powerImpl`
- L541 **export** fn `breakerCount`
- L559 fn `justDiving`
- L566 **export** fn `isUntargetable`
- L575 **export** fn `cannotBeAttacked`
- L581 **export** fn `oncePerTurnCostMods`
- L602 **export** fn `effectiveCost`
- L606 fn `effectiveCostImpl`
- L663 **export** fn `usesHyperEnergy`
- L671 **export** fn `sasageruCandidates`
- L683 **export** fn `minimalSacrifice`
- L698 **export** fn `playLimitReached`
- L713 **export** fn `isAura`
- L717 **export** fn `isCrossGear`
- L722 **export** fn `isGrCard`
- L727 **export** fn `canCross`
- L737 **export** fn `cannotLeaveNow`
- L747 **export** fn `cannotLose`
- L757 **export** fn `handProtected`
- L762 **export** fn `forcedAttackers`
- L767 **export** fn `entryBlocked`
- L778 **export** fn `useBlocked`
- L794 **export** fn `freeCross`
- L799 **export** fn `crossCost`
- L803 **export** fn `playRestriction`
- L833 **export** fn `isSummoningSick`
- L842 **export** fn `canAttackWith`
- L846 fn `canAttackWithImpl`
- L860 **export** fn `attackTargets`
- L864 fn `attackTargetsImpl`
- L900 **export** fn `blockersFor`
- L925 **export** fn `targetCandidates`
- L952 **export** fn `countQuantity`
- L965 **export** fn `evalCondition`
- L1104 fn `simpleSpec`
- L1109 **export** fn `multiEvolveSpec`
- L1114 **export** fn `evolveSourceCandidates`
- L1127 **export** fn `validEvolveSources`
- L1137 **export** fn `defaultEvolveSources`
- L1150 **export** fn `evolutionBases`
- L1166 fn `matchesEvolvesFrom`
- L1175 **export** fn `canBeEvolutionSource`
- L1188 **export** fn `choosePayment`
- L1195 **export** fn `untappedPaySources`
- L1203 **export** fn `payMana`
- L1228 fn `assignCivs`
- L1246 **export** fn `altCost`
- L1261 **export** fn `altPayment`
- L1266 **export** fn `altUsable`
- L1280 **export** fn `canPlayAlt`
- L1288 **export** fn `fushigiCandidates`
- L1292 **export** fn `canPlay`
- L1296 fn `canPlayImpl`
- L1316 **export** fn `untappedManaCount`
- L1320 **export** fn `isIdle`
- L1324 **export** fn `instancesIn`
- L1329 **export** fn `attackSwapCandidates`
- L1353 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:967 · and:969 · or:971 · compare:973 · attackedThisTurn:978 · selfIsEvolution:980 · summonedThisTurn:986 · castThisTurn:988 · turnTally:990 · chosenDistinctNames:1000 · didNot:1004 · enteredFreeThisTurn:1006 · nthAttackThisTurn:1008 · enteredNamedThisTurn:1010 · firstAttackThisTurn:1012 · crossed:1014 · entry:1018 · godLinked:1027 · shieldForce:1029 · selfPower:1033 · selfAttacking:1038 · civsInBattle:1040 · gearAttached:1052 · selfTapped:1056 · wonBattleThisTurn:1058 · selfEnteredThisTurn:1060 · attackedWithPower:1062 · subjectEnteredFree:1066 · enteredThisTurn:1068 · underCount:1072 · opponentTurn:1074 · inExtraTurn:1076 · shieldsBrokenThisTurn:1078 · playedFreeThisTurn:1080 · enteredByRevolution:1084 · usedThisTurn:1086 · chosenMatches:1088 · firstTapThisTurn:1092

