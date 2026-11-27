---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4191行）

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
- L464 `turnSwitch`
- L501 `chargeMana`
- L514 `playCard`
- L599 `playAlt`
- L614 `payAlt`
- L656 `battleBonus`
- L670 `attack`
- L692 `respond`
- L715 `run`
- L736 `insertFront`
- L740 `flushTriggers`
- L761 `offerHandTriggers`
- L796 `gateCandidates`
- L803 `gateReady`
- L813 `fireZoneGates`
- L829 `execZoneGate`
- L872 `addTrigger`
- L877 `execPickTrigger`
- L900 `takeResponse`
- L906 `effectTasks`
- L911 `exec`
- L1568 `execShieldTrigger`
- L1603 `conditionalTrigger`
- L1609 `execAttackSwap`
- L1676 `stackFromBattle`
- L1707 `execCommandUnseal`
- L1737 `sealCard`
- L1752 `afterSealRemoved`
- L1768 `crossGear`
- L1775 `checkForcedAttack`
- L1780 `execLeave`
- L2059 `payCandidates`
- L2094 `execEffect`
- L3076 `useFree`
- L3088 `playFree`
- L3112 `execMove`
- L3171 `popTop`
- L3190 `faceUpShields`
- L3196 `removeFromShield`
- L3214 `placeOnShield`
- L3238 `putUnder`
- L3255 `setTapped`
- L3263 `moveTo`
- L3272 `putIntoBattle`
- L3292 `lookAtTop`
- L3381 `awakenLink`
- L3412 `unlink`
- L3434 `removeOwnSeals`
- L3463 `soulRaid`
- L3495 `withTargets`
- L3630 `abilityTasks`
- L3638 `triggerFrom`
- L3674 `triggerOthers`
- L3682 `whoMatches`
- L3687 `emit`
- L3897 `random`
- L3903 `shuffle`
- L3912 `topOfDeck`
- L3917 `draw`
- L3936 `deckToGrave`
- L3942 `moveCard`
- L4065 `checkStateBased`
- L4108 `gameOver`
- L4126 `sendUnderToDeckBottom`
- L4138 `avertLossUnder`
- L4154 `avertLoss`
- L4179 `name`
- L4187 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:217 · CROSS:219 · HYPERIZE:231 · CONCEDE:240 · MANUAL_MOVE:243 · MANUAL_TAP:254 · MANUAL_DRAW:259 · MANUAL_SHUFFLE:264 · MANUAL_POWER:269 · MANUAL_LOG:274 · NEXT_PHASE:284 · END_TURN:287 · CHARGE_MANA:290 · PLAY_CARD:292 · ATTACK:295 · TAP_ABILITY:297

### runPhase
start:379 · draw:419 · end:429

### exec
phase:914 · turnSwitch:918 · effect:922 · confirmOptional:935 · castSpell:950 · spellToGrave:962 · enterBattle:1025 · leave:1245 · commandUnseal:1248 · attackSwap:1251 · attackSwapOrder:1254 · pickTrigger:1267 · abilityEnd:1270 · kirifudash:1273 · attackEnd:1288 · linkRelease:1305 · hyperize:1323 · blockStep:1344 · attackResolve:1363 · battle:1387 · battleWon:1430 · beforeBreak:1434 · breakShields:1442 · shieldTrigger:1546 · orderShieldTriggers:1549

### execLeave
stay:1854 · shedUnder:1856 · underToDeckBottom:1871 · unflip:1881 · shedTop:1890 · seal:1902 · escape:1911 · destroySelf:1921 · faceUpShieldToGrave:1924 · avertCost:1942 · payCards:1975 · destroyOther:2005

### execEffect
draw:2101 · addManaFromDeck:2116 · addShieldFromDeck:2118 · choose:2120 · nextSummonDiscount:2125 · markUsed:2129 · deckTopTo:2132 · revealUntilSameCost:2158 · discardRandom:2179 · destroyDuplicates:2202 · seal:2220 · discardUnder:2224 · optional:2263 · opponentMay:2266 · ifChosen:2270 · repeat:2275 · chooseDest:2290 · revealUntil:2309 · attachGear:2335 · buzzRenda:2365 · upToTimes:2394 · magibomber:2404 · manual:2436 · extraTurn:2448 · skipRestOfTurn:2452 · useOnce:2461 · zoneGate:2464 · dSwitchFlip:2466 · winGame:2472 · breakShields:2476 · selfAction:2479 · turnStatic:2524 · playFree:2540 · flipSelf:2544 · destroyTopCard:2564 · splitFate:2579 · castSelfTwin:2610 · castOwnTwin:2615 · atTurnEnd:2633 · useAbilityOf:2646 · swapGraveMana:2664 · shieldForce:2673 · dynamo:2689 · shieldPlus:2699 · handPlay:2741 · grSummon:2769 · afterAttack:2780 · chooseNumber:2788 · lookAtHand:2798 · tapOrUntap:2803 · fight:2821 · fightPair:2829 · gachinko:2866 · conditional:2885 · chooseOne:2890 · lookAtTop:2913 · powerMod:2915 · grantKeyword:2933 · move:2953 · bounce:2956 · toHand:2957 · shieldToHand:2958 · graveyardToHand:2959 · toMana:2960 · toGraveyard:2961 · toShield:2962 · toDeckBottom:2963 · toDeckTop:2964 · putIntoBattle:2965 · destroy:2967 · tap:2971 · untap:2973 · putSelfIntoBattle:2980 · shuffleDeck:2987 · graveyardToDeck:2993 · revealTopCard:3000 · playRevealed:3016 · soulRaid:3030 · removeOwnSeals:3032 · awakenLink:3034 · shieldGamble:3037 · playFromHandFree:3057

### execMove
battle:3132 · under:3139 · deckTop:3142 · deckBottom:3147 · shieldTop:3149

### emit
CARD_DRAWN:3692 · CREATURE_SUMMONED:3697 · CREATURE_DESTROYED:3755 · CARD_MOVED:3773 · CREATURE_LEFT:3782 · ATTACK_DECLARED:3793 · CREATURE_TAPPED:3803 · SHIELD_LEFT:3808 · UNDER_LEFT:3820 · CARD_TARGETED:3827 · BLOCKED:3830 · BATTLE_WON:3835 · TURN_STARTED:3848 · TURN_ENDED:3851 · BROKE_SHIELDS:3854 · SHIELD_BROKEN:3858 · SHIELD_ADDED:3863 · CARD_DISCARDED:3867 · CARD_PLAYED:3878 · SPELL_CAST:3885

