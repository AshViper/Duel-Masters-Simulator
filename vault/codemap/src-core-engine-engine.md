---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4712行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L97 **export** interface `ApplyResult`
- L102 **export** fn `applyAction`
- L114 **export** class `IllegalAction`
- L116 interface `Response`
- L167 fn `describeTrigger`
- L177 fn `bindSubjectFilters`
- L203 fn `bindCondition`
- L210 fn `bindEvent`
- L228 **export** class `Ctx`

## メソッド

- L241 `handle`
- L345 `manualMoveByRule`
- L379 `manual`
- L387 `nextPhase`
- L394 `enterPhase`
- L400 `runPhase`
- L502 `turnSwitch`
- L540 `chargeMana`
- L553 `playCard`
- L640 `playAlt`
- L655 `payAlt`
- L701 `battleBonus`
- L715 `attack`
- L739 `respond`
- L762 `run`
- L783 `insertFront`
- L787 `flushTriggers`
- L808 `offerHandTriggers`
- L848 `pickManaToUntap`
- L864 `gateCandidates`
- L871 `gateReady`
- L881 `fireZoneGates`
- L897 `execZoneGate`
- L940 `addTrigger`
- L945 `execPickTrigger`
- L968 `takeResponse`
- L974 `effectTasks`
- L979 `exec`
- L1710 `execShieldTrigger`
- L1745 `conditionalTrigger`
- L1751 `execAttackSwap`
- L1820 `stackFromBattle`
- L1851 `execCommandUnseal`
- L1881 `sealCard`
- L1896 `afterSealRemoved`
- L1912 `crossGear`
- L1919 `godLinkHeads`
- L1932 `linkGod`
- L1942 `checkForcedAttack`
- L1947 `execLeave`
- L2255 `payCandidates`
- L2295 `execEffect`
- L3441 `useFree`
- L3453 `playFree`
- L3478 `execMove`
- L3545 `popTop`
- L3564 `faceUpShields`
- L3570 `removeFromShield`
- L3588 `placeOnShield`
- L3612 `putUnder`
- L3629 `setTapped`
- L3637 `moveTo`
- L3646 `putIntoBattle`
- L3666 `lookAtTop`
- L3771 `awakenLink`
- L3802 `unlink`
- L3824 `removeOwnSeals`
- L3853 `soulRaid`
- L3885 `withTargets`
- L4020 `abilityTasks`
- L4034 `triggerFrom`
- L4078 `triggerOthers`
- L4086 `whoMatches`
- L4091 `emit`
- L4337 `random`
- L4343 `shuffle`
- L4358 `topOfDeck`
- L4363 `draw`
- L4393 `deckToGrave`
- L4399 `moveCard`
- L4543 `deckLockedBy`
- L4548 `checkStateBased`
- L4591 `gameOver`
- L4611 `sendUnderToDeckBottom`
- L4626 `avertLossFromHand`
- L4643 `avertLossDestroySelf`
- L4659 `avertLossUnder`
- L4675 `avertLoss`
- L4700 `name`
- L4708 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:245 · CROSS:247 · HYPERIZE:259 · CONCEDE:268 · MANUAL_MOVE:271 · MANUAL_TAP:282 · MANUAL_DRAW:287 · MANUAL_SHUFFLE:292 · MANUAL_POWER:297 · MANUAL_LOG:302 · NEXT_PHASE:312 · END_TURN:315 · CHARGE_MANA:318 · PLAY_CARD:320 · ATTACK:323 · TAP_ABILITY:325

### runPhase
start:407 · draw:457 · end:467

### exec
phase:982 · turnSwitch:986 · effect:990 · denyTriggers:1006 · confirmOptional:1026 · castSpell:1041 · spellToGrave:1056 · enterBattle:1129 · leave:1368 · commandUnseal:1371 · attackSwap:1374 · attackSwapOrder:1377 · pickTrigger:1390 · abilityEnd:1393 · kirifudash:1396 · attackEnd:1411 · linkRelease:1432 · hyperize:1450 · blockStep:1471 · attackResolve:1491 · battle:1515 · battleWon:1567 · beforeBreak:1571 · breakShields:1579 · shieldTrigger:1688 · orderShieldTriggers:1691

### execLeave
stay:2050 · shedUnder:2052 · underToDeckBottom:2067 · unflip:2077 · shedTop:2086 · seal:2098 · escape:2107 · destroySelf:2117 · faceUpShieldToGrave:2120 · avertCost:2138 · payCards:2171 · destroyOther:2201

### execEffect
draw:2302 · addManaFromDeck:2317 · addShieldFromDeck:2319 · choose:2321 · nextSummonDiscount:2326 · markUsed:2330 · deckTopTo:2333 · revealUntilSameCost:2360 · discardRandom:2381 · destroyDuplicates:2404 · seal:2422 · discardUnder:2426 · optional:2465 · opponentMay:2468 · ifChosen:2472 · repeat:2477 · chooseDest:2492 · revealTopAll:2511 · revealUntil:2538 · attachGear:2570 · buzzRenda:2600 · upToTimes:2629 · magibomber:2639 · manual:2671 · extraTurn:2683 · skipRestOfTurn:2687 · useOnce:2696 · zoneGate:2699 · dSwitchFlip:2701 · winGame:2707 · breakShields:2711 · selfAction:2714 · turnStatic:2759 · playFree:2775 · flipSelf:2779 · destroyTopCard:2799 · splitFate:2814 · castSelfTwin:2845 · castOwnTwin:2850 · atTurnEnd:2868 · useAbilityOf:2881 · godLink:2909 · godUnlink:2924 · swapGraveMana:2942 · shieldForce:2951 · dynamo:2967 · shieldPlus:2977 · handPlay:3019 · grSummon:3049 · afterAttack:3060 · chooseNumber:3068 · lookAtHand:3078 · tapOrUntap:3083 · fight:3101 · fightPair:3109 · gachinko:3146 · conditional:3166 · chooseOne:3171 · lookAtTop:3194 · powerMod:3196 · grantKeyword:3214 · move:3234 · bounce:3237 · toHand:3238 · shieldToHand:3239 · graveyardToHand:3240 · toMana:3241 · toGraveyard:3242 · toShield:3243 · toDeckBottom:3244 · toDeckTop:3245 · putIntoBattle:3246 · destroy:3248 · tap:3252 · untap:3254 · putSelfIntoBattle:3261 · shuffleDeck:3268 · graveToDeckBottom:3275 · graveyardToDeck:3298 · refreshHandShields:3328 · revealTopCard:3359 · playRevealed:3381 · soulRaid:3395 · removeOwnSeals:3397 · awakenLink:3399 · shieldGamble:3402 · playFromHandFree:3422

### execMove
battle:3498 · under:3506 · deckTop:3509 · deckBottom:3521 · shieldTop:3523

### emit
CARD_DRAWN:4096 · CREATURE_SUMMONED:4101 · CREATURE_DESTROYED:4176 · CARD_MOVED:4201 · CREATURE_LEFT:4215 · ATTACK_DECLARED:4226 · CREATURE_TAPPED:4236 · SHIELD_LEFT:4241 · UNDER_LEFT:4253 · CARD_TARGETED:4260 · BLOCKED:4263 · BATTLE_WON:4268 · TURN_STARTED:4281 · TURN_ENDED:4284 · BROKE_SHIELDS:4287 · SHIELD_BROKEN:4291 · SHIELD_ADDED:4296 · CARD_DISCARDED:4300 · CARD_PLAYED:4318 · SPELL_CAST:4325

