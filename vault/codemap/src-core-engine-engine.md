---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3845行）

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
- L2783 `useFree`
- L2795 `playFree`
- L2819 `execMove`
- L2863 `popTop`
- L2882 `faceUpShields`
- L2888 `removeFromShield`
- L2906 `placeOnShield`
- L2930 `putUnder`
- L2947 `setTapped`
- L2955 `moveTo`
- L2964 `putIntoBattle`
- L2984 `lookAtTop`
- L3071 `awakenLink`
- L3102 `unlink`
- L3124 `removeOwnSeals`
- L3153 `soulRaid`
- L3185 `withTargets`
- L3319 `abilityTasks`
- L3327 `triggerFrom`
- L3363 `triggerOthers`
- L3371 `whoMatches`
- L3376 `emit`
- L3563 `random`
- L3569 `shuffle`
- L3578 `topOfDeck`
- L3583 `draw`
- L3602 `deckToGrave`
- L3608 `moveCard`
- L3719 `checkStateBased`
- L3762 `gameOver`
- L3780 `sendUnderToDeckBottom`
- L3792 `avertLossUnder`
- L3808 `avertLoss`
- L3833 `name`
- L3841 `log`

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
draw:1983 · addManaFromDeck:1998 · addShieldFromDeck:2000 · choose:2002 · nextSummonDiscount:2007 · markUsed:2011 · deckTopTo:2014 · discardRandom:2040 · destroyDuplicates:2058 · seal:2076 · discardUnder:2080 · optional:2119 · opponentMay:2122 · ifChosen:2126 · repeat:2131 · chooseDest:2146 · revealUntil:2165 · upToTimes:2191 · magibomber:2201 · manual:2233 · extraTurn:2245 · skipRestOfTurn:2249 · useOnce:2258 · zoneGate:2261 · dSwitchFlip:2263 · winGame:2269 · breakShields:2273 · selfAction:2276 · turnStatic:2321 · playFree:2336 · flipSelf:2340 · destroyTopCard:2360 · splitFate:2375 · castSelfTwin:2406 · castOwnTwin:2411 · shieldPlus:2424 · handPlay:2466 · grSummon:2494 · afterAttack:2505 · chooseNumber:2513 · lookAtHand:2523 · tapOrUntap:2528 · fight:2546 · fightPair:2554 · gachinko:2573 · conditional:2592 · chooseOne:2597 · lookAtTop:2620 · powerMod:2622 · grantKeyword:2640 · move:2660 · bounce:2663 · toHand:2664 · shieldToHand:2665 · graveyardToHand:2666 · toMana:2667 · toGraveyard:2668 · toShield:2669 · toDeckBottom:2670 · toDeckTop:2671 · putIntoBattle:2672 · destroy:2674 · tap:2678 · untap:2680 · putSelfIntoBattle:2687 · shuffleDeck:2694 · graveyardToDeck:2700 · revealTopCard:2707 · playRevealed:2723 · soulRaid:2737 · removeOwnSeals:2739 · awakenLink:2741 · shieldGamble:2744 · playFromHandFree:2764

### execMove
battle:2824 · under:2831 · deckTop:2834 · deckBottom:2839 · shieldTop:2841

### emit
CARD_DRAWN:3381 · CREATURE_SUMMONED:3386 · CREATURE_DESTROYED:3434 · CARD_MOVED:3452 · CREATURE_LEFT:3456 · ATTACK_DECLARED:3467 · CREATURE_TAPPED:3477 · SHIELD_LEFT:3481 · UNDER_LEFT:3493 · CARD_TARGETED:3500 · BLOCKED:3503 · BATTLE_WON:3508 · TURN_STARTED:3521 · TURN_ENDED:3524 · BROKE_SHIELDS:3527 · SHIELD_BROKEN:3531 · SHIELD_ADDED:3536 · CARD_DISCARDED:3540 · CARD_PLAYED:3544 · SPELL_CAST:3551

