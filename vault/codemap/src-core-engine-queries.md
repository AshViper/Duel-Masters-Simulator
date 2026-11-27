---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1256行）

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
- L205 fn `hyperDef`
- L222 **export** fn `hyperizeCandidates`
- L235 **export** fn `matchFilter`
- L330 **export** fn `canTapAbility`
- L337 **export** fn `gearsOn`
- L342 fn `matchFace`
- L362 **export** interface `ActiveStatic`
- L369 **export** fn `activeStatics`
- L373 fn `activeStaticsImpl`
- L394 **export** fn `abilitiesIgnored`
- L401 **export** fn `shieldTriggerLocked`
- L409 fn `ownerMatches`
- L413 fn `appliesToCreature`
- L423 fn `mergeKeywords`
- L435 **export** fn `keywords`
- L439 fn `keywordsImpl`
- L456 **export** fn `withoutAttackLocks`
- L462 **export** fn `ignoresAttackLocks`
- L466 **export** fn `power`
- L470 fn `powerImpl`
- L490 **export** fn `breakerCount`
- L508 fn `justDiving`
- L515 **export** fn `isUntargetable`
- L524 **export** fn `cannotBeAttacked`
- L530 **export** fn `oncePerTurnCostMods`
- L551 **export** fn `effectiveCost`
- L555 fn `effectiveCostImpl`
- L610 **export** fn `usesHyperEnergy`
- L618 **export** fn `sasageruCandidates`
- L630 **export** fn `minimalSacrifice`
- L645 **export** fn `playLimitReached`
- L660 **export** fn `isAura`
- L664 **export** fn `isCrossGear`
- L669 **export** fn `isGrCard`
- L674 **export** fn `canCross`
- L684 **export** fn `cannotLeaveNow`
- L694 **export** fn `cannotLose`
- L704 **export** fn `handProtected`
- L709 **export** fn `forcedAttackers`
- L714 **export** fn `entryBlocked`
- L724 **export** fn `playRestriction`
- L751 **export** fn `isSummoningSick`
- L760 **export** fn `canAttackWith`
- L764 fn `canAttackWithImpl`
- L778 **export** fn `attackTargets`
- L782 fn `attackTargetsImpl`
- L816 **export** fn `blockersFor`
- L839 **export** fn `targetCandidates`
- L866 **export** fn `countQuantity`
- L879 **export** fn `evalCondition`
- L1013 fn `simpleSpec`
- L1018 **export** fn `multiEvolveSpec`
- L1023 **export** fn `evolveSourceCandidates`
- L1036 **export** fn `validEvolveSources`
- L1046 **export** fn `defaultEvolveSources`
- L1059 **export** fn `evolutionBases`
- L1075 fn `matchesEvolvesFrom`
- L1084 **export** fn `canBeEvolutionSource`
- L1097 **export** fn `choosePayment`
- L1104 **export** fn `payMana`
- L1127 fn `assignCivs`
- L1145 **export** fn `altCost`
- L1160 **export** fn `altPayment`
- L1165 **export** fn `altUsable`
- L1179 **export** fn `canPlayAlt`
- L1187 **export** fn `fushigiCandidates`
- L1191 **export** fn `canPlay`
- L1195 fn `canPlayImpl`
- L1215 **export** fn `untappedManaCount`
- L1219 **export** fn `isIdle`
- L1223 **export** fn `instancesIn`
- L1228 **export** fn `attackSwapCandidates`
- L1252 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:881 · and:883 · or:885 · compare:887 · attackedThisTurn:892 · selfIsEvolution:894 · summonedThisTurn:900 · castThisTurn:902 · turnTally:904 · chosenDistinctNames:914 · didNot:918 · enteredFreeThisTurn:920 · nthAttackThisTurn:922 · enteredNamedThisTurn:924 · firstAttackThisTurn:926 · crossed:928 · entry:932 · godLinked:941 · shieldForce:943 · selfPower:947 · selfAttacking:952 · civsInBattle:954 · gearAttached:965 · selfTapped:969 · wonBattleThisTurn:971 · selfEnteredThisTurn:973 · subjectEnteredFree:975 · enteredThisTurn:977 · underCount:981 · opponentTurn:983 · inExtraTurn:985 · shieldsBrokenThisTurn:987 · playedFreeThisTurn:989 · enteredByRevolution:993 · usedThisTurn:995 · chosenMatches:997 · firstTapThisTurn:1001

