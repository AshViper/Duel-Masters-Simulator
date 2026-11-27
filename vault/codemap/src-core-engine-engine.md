---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3659行）

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
- L280 `manual`
- L288 `nextPhase`
- L295 `enterPhase`
- L301 `runPhase`
- L382 `turnSwitch`
- L418 `chargeMana`
- L431 `playCard`
- L513 `playAlt`
- L528 `payAlt`
- L566 `battleBonus`
- L580 `attack`
- L602 `respond`
- L625 `run`
- L646 `insertFront`
- L650 `flushTriggers`
- L671 `offerHandTriggers`
- L701 `gateCandidates`
- L708 `gateReady`
- L718 `fireZoneGates`
- L734 `execZoneGate`
- L777 `addTrigger`
- L782 `execPickTrigger`
- L805 `takeResponse`
- L811 `effectTasks`
- L816 `exec`
- L1409 `execShieldTrigger`
- L1444 `conditionalTrigger`
- L1450 `execAttackSwap`
- L1517 `stackFromBattle`
- L1548 `execCommandUnseal`
- L1578 `sealCard`
- L1593 `afterSealRemoved`
- L1608 `execLeave`
- L1868 `execEffect`
- L2653 `useFree`
- L2665 `playFree`
- L2689 `execMove`
- L2733 `popTop`
- L2752 `faceUpShields`
- L2758 `removeFromShield`
- L2776 `placeOnShield`
- L2800 `putUnder`
- L2817 `setTapped`
- L2825 `moveTo`
- L2834 `putIntoBattle`
- L2849 `lookAtTop`
- L2936 `awakenLink`
- L2967 `unlink`
- L2989 `removeOwnSeals`
- L3018 `soulRaid`
- L3050 `withTargets`
- L3179 `abilityTasks`
- L3187 `triggerFrom`
- L3223 `triggerOthers`
- L3231 `whoMatches`
- L3236 `emit`
- L3405 `random`
- L3411 `shuffle`
- L3420 `topOfDeck`
- L3425 `draw`
- L3444 `deckToGrave`
- L3450 `moveCard`
- L3561 `checkStateBased`
- L3603 `gameOver`
- L3622 `avertLoss`
- L3647 `name`
- L3655 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:199 · CROSS:201 · HYPERIZE:214 · CONCEDE:223 · MANUAL_MOVE:226 · MANUAL_TAP:236 · MANUAL_DRAW:241 · MANUAL_SHUFFLE:246 · MANUAL_POWER:251 · MANUAL_LOG:256 · NEXT_PHASE:266 · END_TURN:268 · CHARGE_MANA:270 · PLAY_CARD:272 · ATTACK:275

### runPhase
start:308 · draw:345 · end:350

### exec
phase:819 · turnSwitch:823 · effect:827 · confirmOptional:840 · castSpell:851 · spellToGrave:863 · enterBattle:926 · leave:1106 · commandUnseal:1109 · attackSwap:1112 · attackSwapOrder:1115 · pickTrigger:1128 · abilityEnd:1131 · kirifudash:1134 · attackEnd:1149 · linkRelease:1158 · hyperize:1176 · blockStep:1197 · attackResolve:1216 · battle:1240 · battleWon:1276 · beforeBreak:1280 · breakShields:1288 · shieldTrigger:1387 · orderShieldTriggers:1390

### execLeave
stay:1677 · shedUnder:1679 · unflip:1694 · shedTop:1703 · seal:1715 · escape:1724 · destroySelf:1734 · faceUpShieldToGrave:1737 · avertCost:1755 · destroyOther:1788

### execEffect
draw:1875 · addManaFromDeck:1890 · addShieldFromDeck:1892 · choose:1894 · markUsed:1899 · deckTopTo:1902 · discardRandom:1928 · destroyDuplicates:1946 · seal:1964 · discardUnder:1968 · optional:2007 · opponentMay:2010 · ifChosen:2014 · repeat:2019 · chooseDest:2034 · revealUntil:2053 · upToTimes:2079 · magibomber:2089 · manual:2121 · extraTurn:2132 · useOnce:2136 · zoneGate:2139 · dSwitchFlip:2141 · winGame:2147 · breakShields:2151 · selfAction:2154 · turnStatic:2193 · playFree:2208 · flipSelf:2212 · destroyTopCard:2232 · splitFate:2247 · castSelfTwin:2278 · castOwnTwin:2283 · shieldPlus:2296 · handPlay:2338 · grSummon:2366 · afterAttack:2377 · chooseNumber:2385 · lookAtHand:2395 · tapOrUntap:2400 · fight:2418 · fightPair:2426 · gachinko:2445 · conditional:2464 · chooseOne:2469 · lookAtTop:2492 · powerMod:2494 · grantKeyword:2510 · move:2530 · bounce:2533 · toHand:2534 · shieldToHand:2535 · graveyardToHand:2536 · toMana:2537 · toGraveyard:2538 · toShield:2539 · toDeckBottom:2540 · toDeckTop:2541 · putIntoBattle:2542 · destroy:2544 · tap:2548 · untap:2550 · putSelfIntoBattle:2557 · shuffleDeck:2564 · graveyardToDeck:2570 · revealTopCard:2577 · playRevealed:2593 · soulRaid:2607 · removeOwnSeals:2609 · awakenLink:2611 · shieldGamble:2614 · playFromHandFree:2634

### execMove
battle:2694 · under:2701 · deckTop:2704 · deckBottom:2709 · shieldTop:2711

### emit
CARD_DRAWN:3241 · CREATURE_SUMMONED:3246 · CREATURE_DESTROYED:3280 · CREATURE_LEFT:3298 · ATTACK_DECLARED:3309 · CREATURE_TAPPED:3319 · SHIELD_LEFT:3323 · UNDER_LEFT:3335 · CARD_TARGETED:3342 · BLOCKED:3345 · BATTLE_WON:3350 · TURN_STARTED:3363 · TURN_ENDED:3366 · BROKE_SHIELDS:3369 · SHIELD_BROKEN:3373 · SHIELD_ADDED:3378 · CARD_DISCARDED:3382 · CARD_PLAYED:3386 · SPELL_CAST:3393

