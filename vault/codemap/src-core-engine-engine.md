---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4129行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L94 **export** interface `ApplyResult`
- L99 **export** fn `applyAction`
- L111 **export** class `IllegalAction`
- L113 interface `Response`
- L164 fn `describeTrigger`
- L174 fn `bindCondition`
- L181 fn `bindEvent`
- L199 **export** class `Ctx`

## メソッド

- L212 `handle`
- L316 `manualMoveByRule`
- L350 `manual`
- L358 `nextPhase`
- L365 `enterPhase`
- L371 `runPhase`
- L460 `turnSwitch`
- L497 `chargeMana`
- L510 `playCard`
- L595 `playAlt`
- L610 `payAlt`
- L652 `battleBonus`
- L666 `attack`
- L688 `respond`
- L711 `run`
- L732 `insertFront`
- L736 `flushTriggers`
- L757 `offerHandTriggers`
- L792 `gateCandidates`
- L799 `gateReady`
- L809 `fireZoneGates`
- L825 `execZoneGate`
- L868 `addTrigger`
- L873 `execPickTrigger`
- L896 `takeResponse`
- L902 `effectTasks`
- L907 `exec`
- L1544 `execShieldTrigger`
- L1579 `conditionalTrigger`
- L1585 `execAttackSwap`
- L1652 `stackFromBattle`
- L1683 `execCommandUnseal`
- L1713 `sealCard`
- L1728 `afterSealRemoved`
- L1744 `crossGear`
- L1751 `checkForcedAttack`
- L1756 `execLeave`
- L2035 `payCandidates`
- L2070 `execEffect`
- L3021 `useFree`
- L3033 `playFree`
- L3057 `execMove`
- L3116 `popTop`
- L3135 `faceUpShields`
- L3141 `removeFromShield`
- L3159 `placeOnShield`
- L3183 `putUnder`
- L3200 `setTapped`
- L3208 `moveTo`
- L3217 `putIntoBattle`
- L3237 `lookAtTop`
- L3326 `awakenLink`
- L3357 `unlink`
- L3379 `removeOwnSeals`
- L3408 `soulRaid`
- L3440 `withTargets`
- L3575 `abilityTasks`
- L3583 `triggerFrom`
- L3619 `triggerOthers`
- L3627 `whoMatches`
- L3632 `emit`
- L3842 `random`
- L3848 `shuffle`
- L3857 `topOfDeck`
- L3862 `draw`
- L3881 `deckToGrave`
- L3887 `moveCard`
- L4003 `checkStateBased`
- L4046 `gameOver`
- L4064 `sendUnderToDeckBottom`
- L4076 `avertLossUnder`
- L4092 `avertLoss`
- L4117 `name`
- L4125 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:216 · CROSS:218 · HYPERIZE:230 · CONCEDE:239 · MANUAL_MOVE:242 · MANUAL_TAP:253 · MANUAL_DRAW:258 · MANUAL_SHUFFLE:263 · MANUAL_POWER:268 · MANUAL_LOG:273 · NEXT_PHASE:283 · END_TURN:286 · CHARGE_MANA:289 · PLAY_CARD:291 · ATTACK:294 · TAP_ABILITY:296

### runPhase
start:378 · draw:418 · end:428

### exec
phase:910 · turnSwitch:914 · effect:918 · confirmOptional:931 · castSpell:946 · spellToGrave:958 · enterBattle:1021 · leave:1221 · commandUnseal:1224 · attackSwap:1227 · attackSwapOrder:1230 · pickTrigger:1243 · abilityEnd:1246 · kirifudash:1249 · attackEnd:1264 · linkRelease:1281 · hyperize:1299 · blockStep:1320 · attackResolve:1339 · battle:1363 · battleWon:1406 · beforeBreak:1410 · breakShields:1418 · shieldTrigger:1522 · orderShieldTriggers:1525

### execLeave
stay:1830 · shedUnder:1832 · underToDeckBottom:1847 · unflip:1857 · shedTop:1866 · seal:1878 · escape:1887 · destroySelf:1897 · faceUpShieldToGrave:1900 · avertCost:1918 · payCards:1951 · destroyOther:1981

### execEffect
draw:2077 · addManaFromDeck:2092 · addShieldFromDeck:2094 · choose:2096 · nextSummonDiscount:2101 · markUsed:2105 · deckTopTo:2108 · revealUntilSameCost:2134 · discardRandom:2155 · destroyDuplicates:2178 · seal:2196 · discardUnder:2200 · optional:2239 · opponentMay:2242 · ifChosen:2246 · repeat:2251 · chooseDest:2266 · revealUntil:2285 · attachGear:2311 · buzzRenda:2341 · upToTimes:2370 · magibomber:2380 · manual:2412 · extraTurn:2424 · skipRestOfTurn:2428 · useOnce:2437 · zoneGate:2440 · dSwitchFlip:2442 · winGame:2448 · breakShields:2452 · selfAction:2455 · turnStatic:2500 · playFree:2516 · flipSelf:2520 · destroyTopCard:2540 · splitFate:2555 · castSelfTwin:2586 · castOwnTwin:2591 · swapGraveMana:2609 · shieldForce:2618 · dynamo:2634 · shieldPlus:2644 · handPlay:2686 · grSummon:2714 · afterAttack:2725 · chooseNumber:2733 · lookAtHand:2743 · tapOrUntap:2748 · fight:2766 · fightPair:2774 · gachinko:2811 · conditional:2830 · chooseOne:2835 · lookAtTop:2858 · powerMod:2860 · grantKeyword:2878 · move:2898 · bounce:2901 · toHand:2902 · shieldToHand:2903 · graveyardToHand:2904 · toMana:2905 · toGraveyard:2906 · toShield:2907 · toDeckBottom:2908 · toDeckTop:2909 · putIntoBattle:2910 · destroy:2912 · tap:2916 · untap:2918 · putSelfIntoBattle:2925 · shuffleDeck:2932 · graveyardToDeck:2938 · revealTopCard:2945 · playRevealed:2961 · soulRaid:2975 · removeOwnSeals:2977 · awakenLink:2979 · shieldGamble:2982 · playFromHandFree:3002

### execMove
battle:3077 · under:3084 · deckTop:3087 · deckBottom:3092 · shieldTop:3094

### emit
CARD_DRAWN:3637 · CREATURE_SUMMONED:3642 · CREATURE_DESTROYED:3700 · CARD_MOVED:3718 · CREATURE_LEFT:3727 · ATTACK_DECLARED:3738 · CREATURE_TAPPED:3748 · SHIELD_LEFT:3753 · UNDER_LEFT:3765 · CARD_TARGETED:3772 · BLOCKED:3775 · BATTLE_WON:3780 · TURN_STARTED:3793 · TURN_ENDED:3796 · BROKE_SHIELDS:3799 · SHIELD_BROKEN:3803 · SHIELD_ADDED:3808 · CARD_DISCARDED:3812 · CARD_PLAYED:3823 · SPELL_CAST:3830

