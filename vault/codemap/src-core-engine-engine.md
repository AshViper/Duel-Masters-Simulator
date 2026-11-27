---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3705行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L87 **export** interface `ApplyResult`
- L92 **export** fn `applyAction`
- L104 **export** class `IllegalAction`
- L106 interface `Response`
- L155 fn `describeTrigger`
- L164 fn `bindEvent`
- L182 **export** class `Ctx`

## メソッド

- L195 `handle`
- L286 `manualMoveByRule`
- L320 `manual`
- L328 `nextPhase`
- L335 `enterPhase`
- L341 `runPhase`
- L422 `turnSwitch`
- L458 `chargeMana`
- L471 `playCard`
- L553 `playAlt`
- L568 `payAlt`
- L606 `battleBonus`
- L620 `attack`
- L642 `respond`
- L665 `run`
- L686 `insertFront`
- L690 `flushTriggers`
- L711 `offerHandTriggers`
- L741 `gateCandidates`
- L748 `gateReady`
- L758 `fireZoneGates`
- L774 `execZoneGate`
- L817 `addTrigger`
- L822 `execPickTrigger`
- L845 `takeResponse`
- L851 `effectTasks`
- L856 `exec`
- L1449 `execShieldTrigger`
- L1484 `conditionalTrigger`
- L1490 `execAttackSwap`
- L1557 `stackFromBattle`
- L1588 `execCommandUnseal`
- L1618 `sealCard`
- L1633 `afterSealRemoved`
- L1648 `execLeave`
- L1908 `execEffect`
- L2694 `useFree`
- L2706 `playFree`
- L2730 `execMove`
- L2774 `popTop`
- L2793 `faceUpShields`
- L2799 `removeFromShield`
- L2817 `placeOnShield`
- L2841 `putUnder`
- L2858 `setTapped`
- L2866 `moveTo`
- L2875 `putIntoBattle`
- L2895 `lookAtTop`
- L2982 `awakenLink`
- L3013 `unlink`
- L3035 `removeOwnSeals`
- L3064 `soulRaid`
- L3096 `withTargets`
- L3225 `abilityTasks`
- L3233 `triggerFrom`
- L3269 `triggerOthers`
- L3277 `whoMatches`
- L3282 `emit`
- L3451 `random`
- L3457 `shuffle`
- L3466 `topOfDeck`
- L3471 `draw`
- L3490 `deckToGrave`
- L3496 `moveCard`
- L3607 `checkStateBased`
- L3649 `gameOver`
- L3668 `avertLoss`
- L3693 `name`
- L3701 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:199 · CROSS:201 · HYPERIZE:214 · CONCEDE:223 · MANUAL_MOVE:226 · MANUAL_TAP:237 · MANUAL_DRAW:242 · MANUAL_SHUFFLE:247 · MANUAL_POWER:252 · MANUAL_LOG:257 · NEXT_PHASE:267 · END_TURN:269 · CHARGE_MANA:271 · PLAY_CARD:273 · ATTACK:276

### runPhase
start:348 · draw:385 · end:390

### exec
phase:859 · turnSwitch:863 · effect:867 · confirmOptional:880 · castSpell:891 · spellToGrave:903 · enterBattle:966 · leave:1146 · commandUnseal:1149 · attackSwap:1152 · attackSwapOrder:1155 · pickTrigger:1168 · abilityEnd:1171 · kirifudash:1174 · attackEnd:1189 · linkRelease:1198 · hyperize:1216 · blockStep:1237 · attackResolve:1256 · battle:1280 · battleWon:1316 · beforeBreak:1320 · breakShields:1328 · shieldTrigger:1427 · orderShieldTriggers:1430

### execLeave
stay:1717 · shedUnder:1719 · unflip:1734 · shedTop:1743 · seal:1755 · escape:1764 · destroySelf:1774 · faceUpShieldToGrave:1777 · avertCost:1795 · destroyOther:1828

### execEffect
draw:1915 · addManaFromDeck:1930 · addShieldFromDeck:1932 · choose:1934 · markUsed:1939 · deckTopTo:1942 · discardRandom:1968 · destroyDuplicates:1986 · seal:2004 · discardUnder:2008 · optional:2047 · opponentMay:2050 · ifChosen:2054 · repeat:2059 · chooseDest:2074 · revealUntil:2093 · upToTimes:2119 · magibomber:2129 · manual:2161 · extraTurn:2173 · useOnce:2177 · zoneGate:2180 · dSwitchFlip:2182 · winGame:2188 · breakShields:2192 · selfAction:2195 · turnStatic:2234 · playFree:2249 · flipSelf:2253 · destroyTopCard:2273 · splitFate:2288 · castSelfTwin:2319 · castOwnTwin:2324 · shieldPlus:2337 · handPlay:2379 · grSummon:2407 · afterAttack:2418 · chooseNumber:2426 · lookAtHand:2436 · tapOrUntap:2441 · fight:2459 · fightPair:2467 · gachinko:2486 · conditional:2505 · chooseOne:2510 · lookAtTop:2533 · powerMod:2535 · grantKeyword:2551 · move:2571 · bounce:2574 · toHand:2575 · shieldToHand:2576 · graveyardToHand:2577 · toMana:2578 · toGraveyard:2579 · toShield:2580 · toDeckBottom:2581 · toDeckTop:2582 · putIntoBattle:2583 · destroy:2585 · tap:2589 · untap:2591 · putSelfIntoBattle:2598 · shuffleDeck:2605 · graveyardToDeck:2611 · revealTopCard:2618 · playRevealed:2634 · soulRaid:2648 · removeOwnSeals:2650 · awakenLink:2652 · shieldGamble:2655 · playFromHandFree:2675

### execMove
battle:2735 · under:2742 · deckTop:2745 · deckBottom:2750 · shieldTop:2752

### emit
CARD_DRAWN:3287 · CREATURE_SUMMONED:3292 · CREATURE_DESTROYED:3326 · CREATURE_LEFT:3344 · ATTACK_DECLARED:3355 · CREATURE_TAPPED:3365 · SHIELD_LEFT:3369 · UNDER_LEFT:3381 · CARD_TARGETED:3388 · BLOCKED:3391 · BATTLE_WON:3396 · TURN_STARTED:3409 · TURN_ENDED:3412 · BROKE_SHIELDS:3415 · SHIELD_BROKEN:3419 · SHIELD_ADDED:3424 · CARD_DISCARDED:3428 · CARD_PLAYED:3432 · SPELL_CAST:3439

