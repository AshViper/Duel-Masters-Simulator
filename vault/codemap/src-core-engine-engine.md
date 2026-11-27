---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4998行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L102 **export** interface `ApplyResult`
- L107 **export** fn `applyAction`
- L119 **export** class `IllegalAction`
- L121 interface `Response`
- L173 fn `describeTrigger`
- L183 fn `bindSubjectFilters`
- L209 fn `bindCondition`
- L216 fn `bindEvent`
- L234 **export** class `Ctx`

## メソッド

- L247 `handle`
- L352 `manualMoveByRule`
- L386 `manual`
- L394 `nextPhase`
- L401 `enterPhase`
- L407 `runPhase`
- L511 `turnSwitch`
- L549 `chargeMana`
- L562 `playCard`
- L654 `playAlt`
- L669 `payAlt`
- L729 `battleBonus`
- L743 `attack`
- L769 `respond`
- L792 `run`
- L813 `insertFront`
- L817 `flushTriggers`
- L838 `offerHandTriggers`
- L884 `pickManaToUntap`
- L900 `gateCandidates`
- L907 `gateReady`
- L917 `fireZoneGates`
- L933 `execZoneGate`
- L976 `addTrigger`
- L981 `execPickTrigger`
- L1004 `takeResponse`
- L1010 `effectTasks`
- L1015 `exec`
- L1783 `execShieldTrigger`
- L1828 `spellTriggerGranted`
- L1835 `conditionalTrigger`
- L1841 `execAttackSwap`
- L1910 `stackFromBattle`
- L1941 `execCommandUnseal`
- L1971 `sealCard`
- L1986 `afterSealRemoved`
- L2002 `crossGear`
- L2009 `godLinkHeads`
- L2022 `linkGod`
- L2032 `checkForcedAttack`
- L2037 `execLeave`
- L2345 `payCandidates`
- L2386 `execEffect`
- L3660 `useFree`
- L3678 `playFree`
- L3703 `execMove`
- L3770 `popTop`
- L3789 `faceUpShields`
- L3795 `removeFromShield`
- L3813 `placeOnShield`
- L3837 `putUnder`
- L3854 `setTapped`
- L3862 `moveTo`
- L3871 `putIntoBattle`
- L3891 `lookAtTop`
- L3996 `awakenLink`
- L4027 `unlink`
- L4049 `removeOwnSeals`
- L4078 `soulRaid`
- L4110 `withTargets`
- L4245 `abilityTasks`
- L4259 `triggerFrom`
- L4306 `triggerOthers`
- L4314 `whoMatches`
- L4319 `emit`
- L4571 `random`
- L4577 `shuffle`
- L4592 `topOfDeck`
- L4597 `draw`
- L4627 `deckToGrave`
- L4634 `moveCard`
- L4789 `deckLockedBy`
- L4794 `checkStateBased`
- L4837 `gameOver`
- L4857 `sendUnderToDeckBottom`
- L4872 `avertLossFromHand`
- L4889 `avertLossDestroySelf`
- L4920 `avertLossDestroyOwn`
- L4945 `avertLossUnder`
- L4961 `avertLoss`
- L4986 `name`
- L4994 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:251 · CROSS:253 · HYPERIZE:266 · CONCEDE:275 · MANUAL_MOVE:278 · MANUAL_TAP:289 · MANUAL_DRAW:294 · MANUAL_SHUFFLE:299 · MANUAL_POWER:304 · MANUAL_LOG:309 · NEXT_PHASE:319 · END_TURN:322 · CHARGE_MANA:325 · PLAY_CARD:327 · ATTACK:330 · TAP_ABILITY:332

### runPhase
start:414 · draw:464 · end:474

### exec
phase:1018 · turnSwitch:1022 · effect:1026 · denyTriggers:1042 · confirmOptional:1062 · castSpell:1077 · spellToGrave:1092 · enterBattle:1165 · leave:1409 · commandUnseal:1412 · attackSwap:1415 · attackSwapOrder:1418 · pickTrigger:1431 · abilityEnd:1434 · kirifudash:1437 · attackEnd:1452 · linkRelease:1477 · hyperize:1495 · blockStep:1516 · attackResolve:1536 · battle:1560 · battleWon:1628 · beforeBreak:1632 · breakShields:1640 · shieldTrigger:1761 · orderShieldTriggers:1764

### execLeave
stay:2140 · shedUnder:2142 · underToDeckBottom:2157 · unflip:2167 · shedTop:2176 · seal:2188 · escape:2197 · destroySelf:2207 · faceUpShieldToGrave:2210 · avertCost:2228 · payCards:2261 · destroyOther:2291

### execEffect
draw:2393 · addManaFromDeck:2416 · addShieldFromDeck:2418 · choose:2420 · nextSummonDiscount:2425 · markUsed:2429 · deckTopTo:2432 · revealUntilSameCost:2459 · discardRandom:2480 · destroyDuplicates:2503 · seal:2521 · discardUnder:2525 · optional:2564 · opponentMay:2567 · sBack:2571 · ifChosen:2581 · repeat:2586 · chooseDest:2601 · revealTopAll:2620 · revealUntil:2647 · attachGear:2679 · buzzRenda:2709 · upToTimes:2738 · magibomber:2748 · manual:2780 · extraTurn:2792 · skipRestOfTurn:2796 · useOnce:2805 · zoneGate:2810 · dSwitchFlip:2812 · winGame:2818 · breakShields:2822 · selfAction:2825 · turnStatic:2876 · playFree:2894 · flipSelf:2898 · destroyTopCard:2918 · splitFate:2933 · castSelfTwin:2964 · castOwnTwin:2969 · atTurnEnd:2987 · useAbilityOf:3000 · godLink:3033 · godUnlink:3048 · swapGraveMana:3066 · shieldForce:3075 · dynamo:3091 · shieldPlus:3101 · handPlay:3143 · revealTopUse:3173 · ninjaChange:3204 · grSummon:3223 · afterAttack:3234 · chooseNumber:3242 · lookAtHand:3252 · tapOrUntap:3257 · fight:3275 · fightPair:3283 · gachinko:3320 · conditional:3340 · chooseOne:3345 · lookAtTop:3368 · powerMod:3370 · grantKeyword:3388 · move:3408 · bounce:3411 · toHand:3412 · shieldToHand:3413 · graveyardToHand:3414 · toMana:3415 · toGraveyard:3416 · toShield:3417 · toDeckBottom:3418 · toDeckTop:3419 · putIntoBattle:3420 · destroy:3422 · tap:3426 · untap:3428 · putSelfIntoBattle:3435 · shuffleDeck:3442 · graveToDeckBottom:3449 · keepOneEachToDeck:3472 · graveyardToDeck:3517 · refreshHandShields:3547 · revealTopCard:3578 · playRevealed:3600 · soulRaid:3614 · removeOwnSeals:3616 · awakenLink:3618 · shieldGamble:3621 · playFromHandFree:3641

### execMove
battle:3723 · under:3731 · deckTop:3734 · deckBottom:3746 · shieldTop:3748

### emit
CARD_DRAWN:4324 · CREATURE_SUMMONED:4329 · CREATURE_DESTROYED:4404 · CARD_MOVED:4429 · CREATURE_LEFT:4443 · ATTACK_DECLARED:4454 · CREATURE_TAPPED:4464 · SHIELD_LEFT:4471 · UNDER_LEFT:4483 · CARD_TARGETED:4490 · BLOCKED:4493 · BATTLE_WON:4498 · TURN_STARTED:4511 · TURN_ENDED:4514 · BROKE_SHIELDS:4517 · SHIELD_BROKEN:4521 · SHIELD_ADDED:4526 · CARD_DISCARDED:4530 · CARD_PLAYED:4548 · SPELL_CAST:4555

