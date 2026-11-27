---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4914行）

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
- L878 `pickManaToUntap`
- L894 `gateCandidates`
- L901 `gateReady`
- L911 `fireZoneGates`
- L927 `execZoneGate`
- L970 `addTrigger`
- L975 `execPickTrigger`
- L998 `takeResponse`
- L1004 `effectTasks`
- L1009 `exec`
- L1774 `execShieldTrigger`
- L1815 `conditionalTrigger`
- L1821 `execAttackSwap`
- L1890 `stackFromBattle`
- L1921 `execCommandUnseal`
- L1951 `sealCard`
- L1966 `afterSealRemoved`
- L1982 `crossGear`
- L1989 `godLinkHeads`
- L2002 `linkGod`
- L2012 `checkForcedAttack`
- L2017 `execLeave`
- L2325 `payCandidates`
- L2366 `execEffect`
- L3588 `useFree`
- L3606 `playFree`
- L3631 `execMove`
- L3698 `popTop`
- L3717 `faceUpShields`
- L3723 `removeFromShield`
- L3741 `placeOnShield`
- L3765 `putUnder`
- L3782 `setTapped`
- L3790 `moveTo`
- L3799 `putIntoBattle`
- L3819 `lookAtTop`
- L3924 `awakenLink`
- L3955 `unlink`
- L3977 `removeOwnSeals`
- L4006 `soulRaid`
- L4038 `withTargets`
- L4173 `abilityTasks`
- L4187 `triggerFrom`
- L4234 `triggerOthers`
- L4242 `whoMatches`
- L4247 `emit`
- L4499 `random`
- L4505 `shuffle`
- L4520 `topOfDeck`
- L4525 `draw`
- L4555 `deckToGrave`
- L4561 `moveCard`
- L4705 `deckLockedBy`
- L4710 `checkStateBased`
- L4753 `gameOver`
- L4773 `sendUnderToDeckBottom`
- L4788 `avertLossFromHand`
- L4805 `avertLossDestroySelf`
- L4836 `avertLossDestroyOwn`
- L4861 `avertLossUnder`
- L4877 `avertLoss`
- L4902 `name`
- L4910 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:251 · CROSS:253 · HYPERIZE:266 · CONCEDE:275 · MANUAL_MOVE:278 · MANUAL_TAP:289 · MANUAL_DRAW:294 · MANUAL_SHUFFLE:299 · MANUAL_POWER:304 · MANUAL_LOG:309 · NEXT_PHASE:319 · END_TURN:322 · CHARGE_MANA:325 · PLAY_CARD:327 · ATTACK:330 · TAP_ABILITY:332

### runPhase
start:414 · draw:464 · end:474

### exec
phase:1012 · turnSwitch:1016 · effect:1020 · denyTriggers:1036 · confirmOptional:1056 · castSpell:1071 · spellToGrave:1086 · enterBattle:1159 · leave:1401 · commandUnseal:1404 · attackSwap:1407 · attackSwapOrder:1410 · pickTrigger:1423 · abilityEnd:1426 · kirifudash:1429 · attackEnd:1444 · linkRelease:1469 · hyperize:1487 · blockStep:1508 · attackResolve:1528 · battle:1552 · battleWon:1620 · beforeBreak:1624 · breakShields:1632 · shieldTrigger:1752 · orderShieldTriggers:1755

### execLeave
stay:2120 · shedUnder:2122 · underToDeckBottom:2137 · unflip:2147 · shedTop:2156 · seal:2168 · escape:2177 · destroySelf:2187 · faceUpShieldToGrave:2190 · avertCost:2208 · payCards:2241 · destroyOther:2271

### execEffect
draw:2373 · addManaFromDeck:2396 · addShieldFromDeck:2398 · choose:2400 · nextSummonDiscount:2405 · markUsed:2409 · deckTopTo:2412 · revealUntilSameCost:2439 · discardRandom:2460 · destroyDuplicates:2483 · seal:2501 · discardUnder:2505 · optional:2544 · opponentMay:2547 · sBack:2551 · ifChosen:2561 · repeat:2566 · chooseDest:2581 · revealTopAll:2600 · revealUntil:2627 · attachGear:2659 · buzzRenda:2689 · upToTimes:2718 · magibomber:2728 · manual:2760 · extraTurn:2772 · skipRestOfTurn:2776 · useOnce:2785 · zoneGate:2790 · dSwitchFlip:2792 · winGame:2798 · breakShields:2802 · selfAction:2805 · turnStatic:2856 · playFree:2872 · flipSelf:2876 · destroyTopCard:2896 · splitFate:2911 · castSelfTwin:2942 · castOwnTwin:2947 · atTurnEnd:2965 · useAbilityOf:2978 · godLink:3011 · godUnlink:3026 · swapGraveMana:3044 · shieldForce:3053 · dynamo:3069 · shieldPlus:3079 · handPlay:3121 · grSummon:3151 · afterAttack:3162 · chooseNumber:3170 · lookAtHand:3180 · tapOrUntap:3185 · fight:3203 · fightPair:3211 · gachinko:3248 · conditional:3268 · chooseOne:3273 · lookAtTop:3296 · powerMod:3298 · grantKeyword:3316 · move:3336 · bounce:3339 · toHand:3340 · shieldToHand:3341 · graveyardToHand:3342 · toMana:3343 · toGraveyard:3344 · toShield:3345 · toDeckBottom:3346 · toDeckTop:3347 · putIntoBattle:3348 · destroy:3350 · tap:3354 · untap:3356 · putSelfIntoBattle:3363 · shuffleDeck:3370 · graveToDeckBottom:3377 · keepOneEachToDeck:3400 · graveyardToDeck:3445 · refreshHandShields:3475 · revealTopCard:3506 · playRevealed:3528 · soulRaid:3542 · removeOwnSeals:3544 · awakenLink:3546 · shieldGamble:3549 · playFromHandFree:3569

### execMove
battle:3651 · under:3659 · deckTop:3662 · deckBottom:3674 · shieldTop:3676

### emit
CARD_DRAWN:4252 · CREATURE_SUMMONED:4257 · CREATURE_DESTROYED:4332 · CARD_MOVED:4357 · CREATURE_LEFT:4371 · ATTACK_DECLARED:4382 · CREATURE_TAPPED:4392 · SHIELD_LEFT:4399 · UNDER_LEFT:4411 · CARD_TARGETED:4418 · BLOCKED:4421 · BATTLE_WON:4426 · TURN_STARTED:4439 · TURN_ENDED:4442 · BROKE_SHIELDS:4445 · SHIELD_BROKEN:4449 · SHIELD_ADDED:4454 · CARD_DISCARDED:4458 · CARD_PLAYED:4476 · SPELL_CAST:4483

