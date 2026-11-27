---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4023行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L94 **export** interface `ApplyResult`
- L99 **export** fn `applyAction`
- L111 **export** class `IllegalAction`
- L113 interface `Response`
- L163 fn `describeTrigger`
- L173 fn `bindCondition`
- L180 fn `bindEvent`
- L198 **export** class `Ctx`

## メソッド

- L211 `handle`
- L315 `manualMoveByRule`
- L349 `manual`
- L357 `nextPhase`
- L364 `enterPhase`
- L370 `runPhase`
- L452 `turnSwitch`
- L489 `chargeMana`
- L502 `playCard`
- L587 `playAlt`
- L602 `payAlt`
- L644 `battleBonus`
- L658 `attack`
- L680 `respond`
- L703 `run`
- L724 `insertFront`
- L728 `flushTriggers`
- L749 `offerHandTriggers`
- L784 `gateCandidates`
- L791 `gateReady`
- L801 `fireZoneGates`
- L817 `execZoneGate`
- L860 `addTrigger`
- L865 `execPickTrigger`
- L888 `takeResponse`
- L894 `effectTasks`
- L899 `exec`
- L1524 `execShieldTrigger`
- L1559 `conditionalTrigger`
- L1565 `execAttackSwap`
- L1632 `stackFromBattle`
- L1663 `execCommandUnseal`
- L1693 `sealCard`
- L1708 `afterSealRemoved`
- L1724 `crossGear`
- L1731 `checkForcedAttack`
- L1736 `execLeave`
- L2011 `execEffect`
- L2919 `useFree`
- L2931 `playFree`
- L2955 `execMove`
- L3014 `popTop`
- L3033 `faceUpShields`
- L3039 `removeFromShield`
- L3057 `placeOnShield`
- L3081 `putUnder`
- L3098 `setTapped`
- L3106 `moveTo`
- L3115 `putIntoBattle`
- L3135 `lookAtTop`
- L3224 `awakenLink`
- L3255 `unlink`
- L3277 `removeOwnSeals`
- L3306 `soulRaid`
- L3338 `withTargets`
- L3472 `abilityTasks`
- L3480 `triggerFrom`
- L3516 `triggerOthers`
- L3524 `whoMatches`
- L3529 `emit`
- L3738 `random`
- L3744 `shuffle`
- L3753 `topOfDeck`
- L3758 `draw`
- L3777 `deckToGrave`
- L3783 `moveCard`
- L3897 `checkStateBased`
- L3940 `gameOver`
- L3958 `sendUnderToDeckBottom`
- L3970 `avertLossUnder`
- L3986 `avertLoss`
- L4011 `name`
- L4019 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:215 · CROSS:217 · HYPERIZE:229 · CONCEDE:238 · MANUAL_MOVE:241 · MANUAL_TAP:252 · MANUAL_DRAW:257 · MANUAL_SHUFFLE:262 · MANUAL_POWER:267 · MANUAL_LOG:272 · NEXT_PHASE:282 · END_TURN:285 · CHARGE_MANA:288 · PLAY_CARD:290 · ATTACK:293 · TAP_ABILITY:295

### runPhase
start:377 · draw:415 · end:420

### exec
phase:902 · turnSwitch:906 · effect:910 · confirmOptional:923 · castSpell:938 · spellToGrave:950 · enterBattle:1013 · leave:1212 · commandUnseal:1215 · attackSwap:1218 · attackSwapOrder:1221 · pickTrigger:1234 · abilityEnd:1237 · kirifudash:1240 · attackEnd:1255 · linkRelease:1271 · hyperize:1289 · blockStep:1310 · attackResolve:1329 · battle:1353 · battleWon:1391 · beforeBreak:1395 · breakShields:1403 · shieldTrigger:1502 · orderShieldTriggers:1505

### execLeave
stay:1810 · shedUnder:1812 · underToDeckBottom:1827 · unflip:1837 · shedTop:1846 · seal:1858 · escape:1867 · destroySelf:1877 · faceUpShieldToGrave:1880 · avertCost:1898 · destroyOther:1931

### execEffect
draw:2018 · addManaFromDeck:2033 · addShieldFromDeck:2035 · choose:2037 · nextSummonDiscount:2042 · markUsed:2046 · deckTopTo:2049 · revealUntilSameCost:2075 · discardRandom:2096 · destroyDuplicates:2119 · seal:2137 · discardUnder:2141 · optional:2180 · opponentMay:2183 · ifChosen:2187 · repeat:2192 · chooseDest:2207 · revealUntil:2226 · attachGear:2252 · buzzRenda:2282 · upToTimes:2311 · magibomber:2321 · manual:2353 · extraTurn:2365 · skipRestOfTurn:2369 · useOnce:2378 · zoneGate:2381 · dSwitchFlip:2383 · winGame:2389 · breakShields:2393 · selfAction:2396 · turnStatic:2441 · playFree:2457 · flipSelf:2461 · destroyTopCard:2481 · splitFate:2496 · castSelfTwin:2527 · castOwnTwin:2532 · dynamo:2550 · shieldPlus:2560 · handPlay:2602 · grSummon:2630 · afterAttack:2641 · chooseNumber:2649 · lookAtHand:2659 · tapOrUntap:2664 · fight:2682 · fightPair:2690 · gachinko:2709 · conditional:2728 · chooseOne:2733 · lookAtTop:2756 · powerMod:2758 · grantKeyword:2776 · move:2796 · bounce:2799 · toHand:2800 · shieldToHand:2801 · graveyardToHand:2802 · toMana:2803 · toGraveyard:2804 · toShield:2805 · toDeckBottom:2806 · toDeckTop:2807 · putIntoBattle:2808 · destroy:2810 · tap:2814 · untap:2816 · putSelfIntoBattle:2823 · shuffleDeck:2830 · graveyardToDeck:2836 · revealTopCard:2843 · playRevealed:2859 · soulRaid:2873 · removeOwnSeals:2875 · awakenLink:2877 · shieldGamble:2880 · playFromHandFree:2900

### execMove
battle:2975 · under:2982 · deckTop:2985 · deckBottom:2990 · shieldTop:2992

### emit
CARD_DRAWN:3534 · CREATURE_SUMMONED:3539 · CREATURE_DESTROYED:3597 · CARD_MOVED:3615 · CREATURE_LEFT:3624 · ATTACK_DECLARED:3635 · CREATURE_TAPPED:3645 · SHIELD_LEFT:3649 · UNDER_LEFT:3661 · CARD_TARGETED:3668 · BLOCKED:3671 · BATTLE_WON:3676 · TURN_STARTED:3689 · TURN_ENDED:3692 · BROKE_SHIELDS:3695 · SHIELD_BROKEN:3699 · SHIELD_ADDED:3704 · CARD_DISCARDED:3708 · CARD_PLAYED:3719 · SPELL_CAST:3726

