---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4157行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L95 **export** interface `ApplyResult`
- L100 **export** fn `applyAction`
- L112 **export** class `IllegalAction`
- L114 interface `Response`
- L165 fn `describeTrigger`
- L175 fn `bindCondition`
- L182 fn `bindEvent`
- L200 **export** class `Ctx`

## メソッド

- L213 `handle`
- L317 `manualMoveByRule`
- L351 `manual`
- L359 `nextPhase`
- L366 `enterPhase`
- L372 `runPhase`
- L461 `turnSwitch`
- L498 `chargeMana`
- L511 `playCard`
- L596 `playAlt`
- L611 `payAlt`
- L653 `battleBonus`
- L667 `attack`
- L689 `respond`
- L712 `run`
- L733 `insertFront`
- L737 `flushTriggers`
- L758 `offerHandTriggers`
- L793 `gateCandidates`
- L800 `gateReady`
- L810 `fireZoneGates`
- L826 `execZoneGate`
- L869 `addTrigger`
- L874 `execPickTrigger`
- L897 `takeResponse`
- L903 `effectTasks`
- L908 `exec`
- L1565 `execShieldTrigger`
- L1600 `conditionalTrigger`
- L1606 `execAttackSwap`
- L1673 `stackFromBattle`
- L1704 `execCommandUnseal`
- L1734 `sealCard`
- L1749 `afterSealRemoved`
- L1765 `crossGear`
- L1772 `checkForcedAttack`
- L1777 `execLeave`
- L2056 `payCandidates`
- L2091 `execEffect`
- L3042 `useFree`
- L3054 `playFree`
- L3078 `execMove`
- L3137 `popTop`
- L3156 `faceUpShields`
- L3162 `removeFromShield`
- L3180 `placeOnShield`
- L3204 `putUnder`
- L3221 `setTapped`
- L3229 `moveTo`
- L3238 `putIntoBattle`
- L3258 `lookAtTop`
- L3347 `awakenLink`
- L3378 `unlink`
- L3400 `removeOwnSeals`
- L3429 `soulRaid`
- L3461 `withTargets`
- L3596 `abilityTasks`
- L3604 `triggerFrom`
- L3640 `triggerOthers`
- L3648 `whoMatches`
- L3653 `emit`
- L3863 `random`
- L3869 `shuffle`
- L3878 `topOfDeck`
- L3883 `draw`
- L3902 `deckToGrave`
- L3908 `moveCard`
- L4031 `checkStateBased`
- L4074 `gameOver`
- L4092 `sendUnderToDeckBottom`
- L4104 `avertLossUnder`
- L4120 `avertLoss`
- L4145 `name`
- L4153 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:217 · CROSS:219 · HYPERIZE:231 · CONCEDE:240 · MANUAL_MOVE:243 · MANUAL_TAP:254 · MANUAL_DRAW:259 · MANUAL_SHUFFLE:264 · MANUAL_POWER:269 · MANUAL_LOG:274 · NEXT_PHASE:284 · END_TURN:287 · CHARGE_MANA:290 · PLAY_CARD:292 · ATTACK:295 · TAP_ABILITY:297

### runPhase
start:379 · draw:419 · end:429

### exec
phase:911 · turnSwitch:915 · effect:919 · confirmOptional:932 · castSpell:947 · spellToGrave:959 · enterBattle:1022 · leave:1242 · commandUnseal:1245 · attackSwap:1248 · attackSwapOrder:1251 · pickTrigger:1264 · abilityEnd:1267 · kirifudash:1270 · attackEnd:1285 · linkRelease:1302 · hyperize:1320 · blockStep:1341 · attackResolve:1360 · battle:1384 · battleWon:1427 · beforeBreak:1431 · breakShields:1439 · shieldTrigger:1543 · orderShieldTriggers:1546

### execLeave
stay:1851 · shedUnder:1853 · underToDeckBottom:1868 · unflip:1878 · shedTop:1887 · seal:1899 · escape:1908 · destroySelf:1918 · faceUpShieldToGrave:1921 · avertCost:1939 · payCards:1972 · destroyOther:2002

### execEffect
draw:2098 · addManaFromDeck:2113 · addShieldFromDeck:2115 · choose:2117 · nextSummonDiscount:2122 · markUsed:2126 · deckTopTo:2129 · revealUntilSameCost:2155 · discardRandom:2176 · destroyDuplicates:2199 · seal:2217 · discardUnder:2221 · optional:2260 · opponentMay:2263 · ifChosen:2267 · repeat:2272 · chooseDest:2287 · revealUntil:2306 · attachGear:2332 · buzzRenda:2362 · upToTimes:2391 · magibomber:2401 · manual:2433 · extraTurn:2445 · skipRestOfTurn:2449 · useOnce:2458 · zoneGate:2461 · dSwitchFlip:2463 · winGame:2469 · breakShields:2473 · selfAction:2476 · turnStatic:2521 · playFree:2537 · flipSelf:2541 · destroyTopCard:2561 · splitFate:2576 · castSelfTwin:2607 · castOwnTwin:2612 · swapGraveMana:2630 · shieldForce:2639 · dynamo:2655 · shieldPlus:2665 · handPlay:2707 · grSummon:2735 · afterAttack:2746 · chooseNumber:2754 · lookAtHand:2764 · tapOrUntap:2769 · fight:2787 · fightPair:2795 · gachinko:2832 · conditional:2851 · chooseOne:2856 · lookAtTop:2879 · powerMod:2881 · grantKeyword:2899 · move:2919 · bounce:2922 · toHand:2923 · shieldToHand:2924 · graveyardToHand:2925 · toMana:2926 · toGraveyard:2927 · toShield:2928 · toDeckBottom:2929 · toDeckTop:2930 · putIntoBattle:2931 · destroy:2933 · tap:2937 · untap:2939 · putSelfIntoBattle:2946 · shuffleDeck:2953 · graveyardToDeck:2959 · revealTopCard:2966 · playRevealed:2982 · soulRaid:2996 · removeOwnSeals:2998 · awakenLink:3000 · shieldGamble:3003 · playFromHandFree:3023

### execMove
battle:3098 · under:3105 · deckTop:3108 · deckBottom:3113 · shieldTop:3115

### emit
CARD_DRAWN:3658 · CREATURE_SUMMONED:3663 · CREATURE_DESTROYED:3721 · CARD_MOVED:3739 · CREATURE_LEFT:3748 · ATTACK_DECLARED:3759 · CREATURE_TAPPED:3769 · SHIELD_LEFT:3774 · UNDER_LEFT:3786 · CARD_TARGETED:3793 · BLOCKED:3796 · BATTLE_WON:3801 · TURN_STARTED:3814 · TURN_ENDED:3817 · BROKE_SHIELDS:3820 · SHIELD_BROKEN:3824 · SHIELD_ADDED:3829 · CARD_DISCARDED:3833 · CARD_PLAYED:3844 · SPELL_CAST:3851

