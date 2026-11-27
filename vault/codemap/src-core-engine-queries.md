---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/queries.ts（1224行）

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
- L327 **export** fn `canTapAbility`
- L334 **export** fn `gearsOn`
- L339 fn `matchFace`
- L359 **export** interface `ActiveStatic`
- L366 **export** fn `activeStatics`
- L370 fn `activeStaticsImpl`
- L386 fn `ownerMatches`
- L390 fn `appliesToCreature`
- L400 fn `mergeKeywords`
- L412 **export** fn `keywords`
- L416 fn `keywordsImpl`
- L432 **export** fn `withoutAttackLocks`
- L438 **export** fn `ignoresAttackLocks`
- L442 **export** fn `power`
- L446 fn `powerImpl`
- L466 **export** fn `breakerCount`
- L484 fn `justDiving`
- L491 **export** fn `isUntargetable`
- L500 **export** fn `cannotBeAttacked`
- L506 **export** fn `oncePerTurnCostMods`
- L527 **export** fn `effectiveCost`
- L531 fn `effectiveCostImpl`
- L585 **export** fn `usesHyperEnergy`
- L593 **export** fn `sasageruCandidates`
- L605 **export** fn `minimalSacrifice`
- L620 **export** fn `playLimitReached`
- L635 **export** fn `isAura`
- L639 **export** fn `isCrossGear`
- L644 **export** fn `isGrCard`
- L649 **export** fn `canCross`
- L659 **export** fn `cannotLeaveNow`
- L669 **export** fn `cannotLose`
- L679 **export** fn `handProtected`
- L684 **export** fn `forcedAttackers`
- L689 **export** fn `entryBlocked`
- L699 **export** fn `playRestriction`
- L726 **export** fn `isSummoningSick`
- L735 **export** fn `canAttackWith`
- L739 fn `canAttackWithImpl`
- L753 **export** fn `attackTargets`
- L757 fn `attackTargetsImpl`
- L789 **export** fn `blockersFor`
- L812 **export** fn `targetCandidates`
- L839 **export** fn `countQuantity`
- L852 **export** fn `evalCondition`
- L981 fn `simpleSpec`
- L986 **export** fn `multiEvolveSpec`
- L991 **export** fn `evolveSourceCandidates`
- L1004 **export** fn `validEvolveSources`
- L1014 **export** fn `defaultEvolveSources`
- L1027 **export** fn `evolutionBases`
- L1043 fn `matchesEvolvesFrom`
- L1052 **export** fn `canBeEvolutionSource`
- L1065 **export** fn `choosePayment`
- L1072 **export** fn `payMana`
- L1095 fn `assignCivs`
- L1113 **export** fn `altCost`
- L1128 **export** fn `altPayment`
- L1133 **export** fn `altUsable`
- L1147 **export** fn `canPlayAlt`
- L1155 **export** fn `fushigiCandidates`
- L1159 **export** fn `canPlay`
- L1163 fn `canPlayImpl`
- L1183 **export** fn `untappedManaCount`
- L1187 **export** fn `isIdle`
- L1191 **export** fn `instancesIn`
- L1196 **export** fn `attackSwapCandidates`
- L1220 **export** fn `sClassCards`

## switch の case（`ラベル:行`）

### evalCondition
not:854 · and:856 · or:858 · compare:860 · attackedThisTurn:865 · selfIsEvolution:867 · summonedThisTurn:873 · castThisTurn:875 · turnTally:877 · chosenDistinctNames:887 · didNot:891 · enteredFreeThisTurn:893 · nthAttackThisTurn:895 · enteredNamedThisTurn:897 · firstAttackThisTurn:899 · crossed:901 · entry:905 · godLinked:914 · shieldForce:916 · selfPower:920 · selfAttacking:925 · civsInBattle:927 · gearAttached:938 · selfTapped:942 · wonBattleThisTurn:944 · selfEnteredThisTurn:946 · subjectEnteredFree:948 · enteredThisTurn:950 · underCount:954 · opponentTurn:956 · inExtraTurn:958 · shieldsBrokenThisTurn:960 · playedFreeThisTurn:962 · enteredByRevolution:966 · usedThisTurn:968 · chosenMatches:970

