---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3874行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L90 **export** interface `ApplyResult`
- L95 **export** fn `applyAction`
- L107 **export** class `IllegalAction`
- L109 interface `Response`
- L159 fn `describeTrigger`
- L168 fn `bindEvent`
- L186 **export** class `Ctx`

## メソッド

- L199 `handle`
- L292 `manualMoveByRule`
- L326 `manual`
- L334 `nextPhase`
- L341 `enterPhase`
- L347 `runPhase`
- L429 `turnSwitch`
- L466 `chargeMana`
- L479 `playCard`
- L564 `playAlt`
- L579 `payAlt`
- L621 `battleBonus`
- L635 `attack`
- L657 `respond`
- L680 `run`
- L701 `insertFront`
- L705 `flushTriggers`
- L726 `offerHandTriggers`
- L761 `gateCandidates`
- L768 `gateReady`
- L778 `fireZoneGates`
- L794 `execZoneGate`
- L837 `addTrigger`
- L842 `execPickTrigger`
- L865 `takeResponse`
- L871 `effectTasks`
- L876 `exec`
- L1496 `execShieldTrigger`
- L1531 `conditionalTrigger`
- L1537 `execAttackSwap`
- L1604 `stackFromBattle`
- L1635 `execCommandUnseal`
- L1665 `sealCard`
- L1680 `afterSealRemoved`
- L1696 `checkForcedAttack`
- L1701 `execLeave`
- L1976 `execEffect`
- L2812 `useFree`
- L2824 `playFree`
- L2848 `execMove`
- L2892 `popTop`
- L2911 `faceUpShields`
- L2917 `removeFromShield`
- L2935 `placeOnShield`
- L2959 `putUnder`
- L2976 `setTapped`
- L2984 `moveTo`
- L2993 `putIntoBattle`
- L3013 `lookAtTop`
- L3100 `awakenLink`
- L3131 `unlink`
- L3153 `removeOwnSeals`
- L3182 `soulRaid`
- L3214 `withTargets`
- L3348 `abilityTasks`
- L3356 `triggerFrom`
- L3392 `triggerOthers`
- L3400 `whoMatches`
- L3405 `emit`
- L3592 `random`
- L3598 `shuffle`
- L3607 `topOfDeck`
- L3612 `draw`
- L3631 `deckToGrave`
- L3637 `moveCard`
- L3748 `checkStateBased`
- L3791 `gameOver`
- L3809 `sendUnderToDeckBottom`
- L3821 `avertLossUnder`
- L3837 `avertLoss`
- L3862 `name`
- L3870 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:203 · CROSS:205 · HYPERIZE:218 · CONCEDE:227 · MANUAL_MOVE:230 · MANUAL_TAP:241 · MANUAL_DRAW:246 · MANUAL_SHUFFLE:251 · MANUAL_POWER:256 · MANUAL_LOG:261 · NEXT_PHASE:271 · END_TURN:274 · CHARGE_MANA:277 · PLAY_CARD:279 · ATTACK:282

### runPhase
start:354 · draw:392 · end:397

### exec
phase:879 · turnSwitch:883 · effect:887 · confirmOptional:900 · castSpell:915 · spellToGrave:927 · enterBattle:990 · leave:1186 · commandUnseal:1189 · attackSwap:1192 · attackSwapOrder:1195 · pickTrigger:1208 · abilityEnd:1211 · kirifudash:1214 · attackEnd:1229 · linkRelease:1245 · hyperize:1263 · blockStep:1284 · attackResolve:1303 · battle:1327 · battleWon:1363 · beforeBreak:1367 · breakShields:1375 · shieldTrigger:1474 · orderShieldTriggers:1477

### execLeave
stay:1775 · shedUnder:1777 · underToDeckBottom:1792 · unflip:1802 · shedTop:1811 · seal:1823 · escape:1832 · destroySelf:1842 · faceUpShieldToGrave:1845 · avertCost:1863 · destroyOther:1896

### execEffect
draw:1983 · addManaFromDeck:1998 · addShieldFromDeck:2000 · choose:2002 · nextSummonDiscount:2007 · markUsed:2011 · deckTopTo:2014 · discardRandom:2040 · destroyDuplicates:2058 · seal:2076 · discardUnder:2080 · optional:2119 · opponentMay:2122 · ifChosen:2126 · repeat:2131 · chooseDest:2146 · revealUntil:2165 · buzzRenda:2191 · upToTimes:2220 · magibomber:2230 · manual:2262 · extraTurn:2274 · skipRestOfTurn:2278 · useOnce:2287 · zoneGate:2290 · dSwitchFlip:2292 · winGame:2298 · breakShields:2302 · selfAction:2305 · turnStatic:2350 · playFree:2365 · flipSelf:2369 · destroyTopCard:2389 · splitFate:2404 · castSelfTwin:2435 · castOwnTwin:2440 · shieldPlus:2453 · handPlay:2495 · grSummon:2523 · afterAttack:2534 · chooseNumber:2542 · lookAtHand:2552 · tapOrUntap:2557 · fight:2575 · fightPair:2583 · gachinko:2602 · conditional:2621 · chooseOne:2626 · lookAtTop:2649 · powerMod:2651 · grantKeyword:2669 · move:2689 · bounce:2692 · toHand:2693 · shieldToHand:2694 · graveyardToHand:2695 · toMana:2696 · toGraveyard:2697 · toShield:2698 · toDeckBottom:2699 · toDeckTop:2700 · putIntoBattle:2701 · destroy:2703 · tap:2707 · untap:2709 · putSelfIntoBattle:2716 · shuffleDeck:2723 · graveyardToDeck:2729 · revealTopCard:2736 · playRevealed:2752 · soulRaid:2766 · removeOwnSeals:2768 · awakenLink:2770 · shieldGamble:2773 · playFromHandFree:2793

### execMove
battle:2853 · under:2860 · deckTop:2863 · deckBottom:2868 · shieldTop:2870

### emit
CARD_DRAWN:3410 · CREATURE_SUMMONED:3415 · CREATURE_DESTROYED:3463 · CARD_MOVED:3481 · CREATURE_LEFT:3485 · ATTACK_DECLARED:3496 · CREATURE_TAPPED:3506 · SHIELD_LEFT:3510 · UNDER_LEFT:3522 · CARD_TARGETED:3529 · BLOCKED:3532 · BATTLE_WON:3537 · TURN_STARTED:3550 · TURN_ENDED:3553 · BROKE_SHIELDS:3556 · SHIELD_BROKEN:3560 · SHIELD_ADDED:3565 · CARD_DISCARDED:3569 · CARD_PLAYED:3573 · SPELL_CAST:3580

