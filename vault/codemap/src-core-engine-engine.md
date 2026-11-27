---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4627行）

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
- L1705 `execShieldTrigger`
- L1740 `conditionalTrigger`
- L1746 `execAttackSwap`
- L1815 `stackFromBattle`
- L1846 `execCommandUnseal`
- L1876 `sealCard`
- L1891 `afterSealRemoved`
- L1907 `crossGear`
- L1914 `godLinkHeads`
- L1927 `linkGod`
- L1937 `checkForcedAttack`
- L1942 `execLeave`
- L2250 `payCandidates`
- L2290 `execEffect`
- L3429 `useFree`
- L3441 `playFree`
- L3466 `execMove`
- L3526 `popTop`
- L3545 `faceUpShields`
- L3551 `removeFromShield`
- L3569 `placeOnShield`
- L3593 `putUnder`
- L3610 `setTapped`
- L3618 `moveTo`
- L3627 `putIntoBattle`
- L3647 `lookAtTop`
- L3746 `awakenLink`
- L3777 `unlink`
- L3799 `removeOwnSeals`
- L3828 `soulRaid`
- L3860 `withTargets`
- L3995 `abilityTasks`
- L4009 `triggerFrom`
- L4053 `triggerOthers`
- L4061 `whoMatches`
- L4066 `emit`
- L4312 `random`
- L4318 `shuffle`
- L4327 `topOfDeck`
- L4332 `draw`
- L4351 `deckToGrave`
- L4357 `moveCard`
- L4485 `checkStateBased`
- L4528 `gameOver`
- L4546 `sendUnderToDeckBottom`
- L4561 `avertLossFromHand`
- L4574 `avertLossUnder`
- L4590 `avertLoss`
- L4615 `name`
- L4623 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:245 · CROSS:247 · HYPERIZE:259 · CONCEDE:268 · MANUAL_MOVE:271 · MANUAL_TAP:282 · MANUAL_DRAW:287 · MANUAL_SHUFFLE:292 · MANUAL_POWER:297 · MANUAL_LOG:302 · NEXT_PHASE:312 · END_TURN:315 · CHARGE_MANA:318 · PLAY_CARD:320 · ATTACK:323 · TAP_ABILITY:325

### runPhase
start:407 · draw:457 · end:467

### exec
phase:982 · turnSwitch:986 · effect:990 · denyTriggers:1006 · confirmOptional:1026 · castSpell:1041 · spellToGrave:1056 · enterBattle:1129 · leave:1368 · commandUnseal:1371 · attackSwap:1374 · attackSwapOrder:1377 · pickTrigger:1390 · abilityEnd:1393 · kirifudash:1396 · attackEnd:1411 · linkRelease:1432 · hyperize:1450 · blockStep:1471 · attackResolve:1491 · battle:1515 · battleWon:1567 · beforeBreak:1571 · breakShields:1579 · shieldTrigger:1683 · orderShieldTriggers:1686

### execLeave
stay:2045 · shedUnder:2047 · underToDeckBottom:2062 · unflip:2072 · shedTop:2081 · seal:2093 · escape:2102 · destroySelf:2112 · faceUpShieldToGrave:2115 · avertCost:2133 · payCards:2166 · destroyOther:2196

### execEffect
draw:2297 · addManaFromDeck:2312 · addShieldFromDeck:2314 · choose:2316 · nextSummonDiscount:2321 · markUsed:2325 · deckTopTo:2328 · revealUntilSameCost:2355 · discardRandom:2376 · destroyDuplicates:2399 · seal:2417 · discardUnder:2421 · optional:2460 · opponentMay:2463 · ifChosen:2467 · repeat:2472 · chooseDest:2487 · revealTopAll:2506 · revealUntil:2533 · attachGear:2565 · buzzRenda:2595 · upToTimes:2624 · magibomber:2634 · manual:2666 · extraTurn:2678 · skipRestOfTurn:2682 · useOnce:2691 · zoneGate:2694 · dSwitchFlip:2696 · winGame:2702 · breakShields:2706 · selfAction:2709 · turnStatic:2754 · playFree:2770 · flipSelf:2774 · destroyTopCard:2794 · splitFate:2809 · castSelfTwin:2840 · castOwnTwin:2845 · atTurnEnd:2863 · useAbilityOf:2876 · godLink:2904 · godUnlink:2919 · swapGraveMana:2937 · shieldForce:2946 · dynamo:2962 · shieldPlus:2972 · handPlay:3014 · grSummon:3044 · afterAttack:3055 · chooseNumber:3063 · lookAtHand:3073 · tapOrUntap:3078 · fight:3096 · fightPair:3104 · gachinko:3141 · conditional:3161 · chooseOne:3166 · lookAtTop:3189 · powerMod:3191 · grantKeyword:3209 · move:3229 · bounce:3232 · toHand:3233 · shieldToHand:3234 · graveyardToHand:3235 · toMana:3236 · toGraveyard:3237 · toShield:3238 · toDeckBottom:3239 · toDeckTop:3240 · putIntoBattle:3241 · destroy:3243 · tap:3247 · untap:3249 · putSelfIntoBattle:3256 · shuffleDeck:3263 · graveToDeckBottom:3269 · graveyardToDeck:3292 · refreshHandShields:3322 · revealTopCard:3353 · playRevealed:3369 · soulRaid:3383 · removeOwnSeals:3385 · awakenLink:3387 · shieldGamble:3390 · playFromHandFree:3410

### execMove
battle:3486 · under:3494 · deckTop:3497 · deckBottom:3502 · shieldTop:3504

### emit
CARD_DRAWN:4071 · CREATURE_SUMMONED:4076 · CREATURE_DESTROYED:4151 · CARD_MOVED:4176 · CREATURE_LEFT:4190 · ATTACK_DECLARED:4201 · CREATURE_TAPPED:4211 · SHIELD_LEFT:4216 · UNDER_LEFT:4228 · CARD_TARGETED:4235 · BLOCKED:4238 · BATTLE_WON:4243 · TURN_STARTED:4256 · TURN_ENDED:4259 · BROKE_SHIELDS:4262 · SHIELD_BROKEN:4266 · SHIELD_ADDED:4271 · CARD_DISCARDED:4275 · CARD_PLAYED:4293 · SPELL_CAST:4300

