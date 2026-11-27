---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1347行）

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
- L484 **export** fn `keywords`
- L488 fn `keywordsImpl`
- L505 **export** fn `withoutAttackLocks`
- L511 **export** fn `ignoresAttackLocks`
- L515 **export** fn `power`
- L519 fn `powerImpl`
- L539 **export** fn `breakerCount`
- L557 fn `justDiving`
- L564 **export** fn `isUntargetable`
- L573 **export** fn `cannotBeAttacked`
- L579 **export** fn `oncePerTurnCostMods`
- L600 **export** fn `effectiveCost`
- L604 fn `effectiveCostImpl`
- L661 **export** fn `usesHyperEnergy`
- L669 **export** fn `sasageruCandidates`
- L681 **export** fn `minimalSacrifice`
- L696 **export** fn `playLimitReached`
- L711 **export** fn `isAura`
- L715 **export** fn `isCrossGear`
- L720 **export** fn `isGrCard`
- L725 **export** fn `canCross`
- L735 **export** fn `cannotLeaveNow`
- L745 **export** fn `cannotLose`
- L755 **export** fn `handProtected`
- L760 **export** fn `forcedAttackers`
- L765 **export** fn `entryBlocked`
- L776 **export** fn `useBlocked`
- L792 **export** fn `freeCross`
- L797 **export** fn `crossCost`
- L801 **export** fn `playRestriction`
- L831 **export** fn `isSummoningSick`
- L840 **export** fn `canAttackWith`
- L844 fn `canAttackWithImpl`
- L858 **export** fn `attackTargets`
- L862 fn `attackTargetsImpl`
- L898 **export** fn `blockersFor`
- L923 **export** fn `targetCandidates`
- L950 **export** fn `countQuantity`
- L963 **export** fn `evalCondition`
- L1102 fn `simpleSpec`
- L1107 **export** fn `multiEvolveSpec`
- L1112 **export** fn `evolveSourceCandidates`
- L1125 **export** fn `validEvolveSources`
- L1135 **export** fn `defaultEvolveSources`
- L1148 **export** fn `evolutionBases`
- L1164 fn `matchesEvolvesFrom`
- L1173 **export** fn `canBeEvolutionSource`
- L1186 **export** fn `choosePayment`
- L1193 **export** fn `payMana`
- L1218 fn `assignCivs`
- L1236 **export** fn `altCost`
- L1251 **export** fn `altPayment`
- L1256 **export** fn `altUsable`
- L1270 **export** fn `canPlayAlt`
- L1278 **export** fn `fushigiCandidates`
- L1282 **export** fn `canPlay`
- L1286 fn `canPlayImpl`
- L1306 **export** fn `untappedManaCount`
- L1310 **export** fn `isIdle`
- L1314 **export** fn `instancesIn`
- L1319 **export** fn `attackSwapCandidates`
- L1343 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:965 · and:967 · or:969 · compare:971 · attackedThisTurn:976 · selfIsEvolution:978 · summonedThisTurn:984 · castThisTurn:986 · turnTally:988 · chosenDistinctNames:998 · didNot:1002 · enteredFreeThisTurn:1004 · nthAttackThisTurn:1006 · enteredNamedThisTurn:1008 · firstAttackThisTurn:1010 · crossed:1012 · entry:1016 · godLinked:1025 · shieldForce:1027 · selfPower:1031 · selfAttacking:1036 · civsInBattle:1038 · gearAttached:1050 · selfTapped:1054 · wonBattleThisTurn:1056 · selfEnteredThisTurn:1058 · attackedWithPower:1060 · subjectEnteredFree:1064 · enteredThisTurn:1066 · underCount:1070 · opponentTurn:1072 · inExtraTurn:1074 · shieldsBrokenThisTurn:1076 · playedFreeThisTurn:1078 · enteredByRevolution:1082 · usedThisTurn:1084 · chosenMatches:1086 · firstTapThisTurn:1090

