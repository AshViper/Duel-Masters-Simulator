---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4786行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L99 **export** interface `ApplyResult`
- L104 **export** fn `applyAction`
- L116 **export** class `IllegalAction`
- L118 interface `Response`
- L170 fn `describeTrigger`
- L180 fn `bindSubjectFilters`
- L206 fn `bindCondition`
- L213 fn `bindEvent`
- L231 **export** class `Ctx`

## メソッド

- L244 `handle`
- L348 `manualMoveByRule`
- L382 `manual`
- L390 `nextPhase`
- L397 `enterPhase`
- L403 `runPhase`
- L507 `turnSwitch`
- L545 `chargeMana`
- L558 `playCard`
- L645 `playAlt`
- L660 `payAlt`
- L706 `battleBonus`
- L720 `attack`
- L744 `respond`
- L767 `run`
- L788 `insertFront`
- L792 `flushTriggers`
- L813 `offerHandTriggers`
- L853 `pickManaToUntap`
- L869 `gateCandidates`
- L876 `gateReady`
- L886 `fireZoneGates`
- L902 `execZoneGate`
- L945 `addTrigger`
- L950 `execPickTrigger`
- L973 `takeResponse`
- L979 `effectTasks`
- L984 `exec`
- L1730 `execShieldTrigger`
- L1771 `conditionalTrigger`
- L1777 `execAttackSwap`
- L1846 `stackFromBattle`
- L1877 `execCommandUnseal`
- L1907 `sealCard`
- L1922 `afterSealRemoved`
- L1938 `crossGear`
- L1945 `godLinkHeads`
- L1958 `linkGod`
- L1968 `checkForcedAttack`
- L1973 `execLeave`
- L2281 `payCandidates`
- L2322 `execEffect`
- L3483 `useFree`
- L3495 `playFree`
- L3520 `execMove`
- L3587 `popTop`
- L3606 `faceUpShields`
- L3612 `removeFromShield`
- L3630 `placeOnShield`
- L3654 `putUnder`
- L3671 `setTapped`
- L3679 `moveTo`
- L3688 `putIntoBattle`
- L3708 `lookAtTop`
- L3813 `awakenLink`
- L3844 `unlink`
- L3866 `removeOwnSeals`
- L3895 `soulRaid`
- L3927 `withTargets`
- L4062 `abilityTasks`
- L4076 `triggerFrom`
- L4122 `triggerOthers`
- L4130 `whoMatches`
- L4135 `emit`
- L4383 `random`
- L4389 `shuffle`
- L4404 `topOfDeck`
- L4409 `draw`
- L4439 `deckToGrave`
- L4445 `moveCard`
- L4589 `deckLockedBy`
- L4594 `checkStateBased`
- L4637 `gameOver`
- L4657 `sendUnderToDeckBottom`
- L4672 `avertLossFromHand`
- L4689 `avertLossDestroySelf`
- L4708 `avertLossDestroyOwn`
- L4733 `avertLossUnder`
- L4749 `avertLoss`
- L4774 `name`
- L4782 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:248 · CROSS:250 · HYPERIZE:262 · CONCEDE:271 · MANUAL_MOVE:274 · MANUAL_TAP:285 · MANUAL_DRAW:290 · MANUAL_SHUFFLE:295 · MANUAL_POWER:300 · MANUAL_LOG:305 · NEXT_PHASE:315 · END_TURN:318 · CHARGE_MANA:321 · PLAY_CARD:323 · ATTACK:326 · TAP_ABILITY:328

### runPhase
start:410 · draw:460 · end:470

### exec
phase:987 · turnSwitch:991 · effect:995 · denyTriggers:1011 · confirmOptional:1031 · castSpell:1046 · spellToGrave:1061 · enterBattle:1134 · leave:1373 · commandUnseal:1376 · attackSwap:1379 · attackSwapOrder:1382 · pickTrigger:1395 · abilityEnd:1398 · kirifudash:1401 · attackEnd:1416 · linkRelease:1441 · hyperize:1459 · blockStep:1480 · attackResolve:1500 · battle:1524 · battleWon:1576 · beforeBreak:1580 · breakShields:1588 · shieldTrigger:1708 · orderShieldTriggers:1711

### execLeave
stay:2076 · shedUnder:2078 · underToDeckBottom:2093 · unflip:2103 · shedTop:2112 · seal:2124 · escape:2133 · destroySelf:2143 · faceUpShieldToGrave:2146 · avertCost:2164 · payCards:2197 · destroyOther:2227

### execEffect
draw:2329 · addManaFromDeck:2344 · addShieldFromDeck:2346 · choose:2348 · nextSummonDiscount:2353 · markUsed:2357 · deckTopTo:2360 · revealUntilSameCost:2387 · discardRandom:2408 · destroyDuplicates:2431 · seal:2449 · discardUnder:2453 · optional:2492 · opponentMay:2495 · sBack:2499 · ifChosen:2509 · repeat:2514 · chooseDest:2529 · revealTopAll:2548 · revealUntil:2575 · attachGear:2607 · buzzRenda:2637 · upToTimes:2666 · magibomber:2676 · manual:2708 · extraTurn:2720 · skipRestOfTurn:2724 · useOnce:2733 · zoneGate:2736 · dSwitchFlip:2738 · winGame:2744 · breakShields:2748 · selfAction:2751 · turnStatic:2796 · playFree:2812 · flipSelf:2816 · destroyTopCard:2836 · splitFate:2851 · castSelfTwin:2882 · castOwnTwin:2887 · atTurnEnd:2905 · useAbilityOf:2918 · godLink:2951 · godUnlink:2966 · swapGraveMana:2984 · shieldForce:2993 · dynamo:3009 · shieldPlus:3019 · handPlay:3061 · grSummon:3091 · afterAttack:3102 · chooseNumber:3110 · lookAtHand:3120 · tapOrUntap:3125 · fight:3143 · fightPair:3151 · gachinko:3188 · conditional:3208 · chooseOne:3213 · lookAtTop:3236 · powerMod:3238 · grantKeyword:3256 · move:3276 · bounce:3279 · toHand:3280 · shieldToHand:3281 · graveyardToHand:3282 · toMana:3283 · toGraveyard:3284 · toShield:3285 · toDeckBottom:3286 · toDeckTop:3287 · putIntoBattle:3288 · destroy:3290 · tap:3294 · untap:3296 · putSelfIntoBattle:3303 · shuffleDeck:3310 · graveToDeckBottom:3317 · graveyardToDeck:3340 · refreshHandShields:3370 · revealTopCard:3401 · playRevealed:3423 · soulRaid:3437 · removeOwnSeals:3439 · awakenLink:3441 · shieldGamble:3444 · playFromHandFree:3464

### execMove
battle:3540 · under:3548 · deckTop:3551 · deckBottom:3563 · shieldTop:3565

### emit
CARD_DRAWN:4140 · CREATURE_SUMMONED:4145 · CREATURE_DESTROYED:4220 · CARD_MOVED:4245 · CREATURE_LEFT:4259 · ATTACK_DECLARED:4270 · CREATURE_TAPPED:4280 · SHIELD_LEFT:4287 · UNDER_LEFT:4299 · CARD_TARGETED:4306 · BLOCKED:4309 · BATTLE_WON:4314 · TURN_STARTED:4327 · TURN_ENDED:4330 · BROKE_SHIELDS:4333 · SHIELD_BROKEN:4337 · SHIELD_ADDED:4342 · CARD_DISCARDED:4346 · CARD_PLAYED:4364 · SPELL_CAST:4371

