---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3996行）

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
- L2904 `useFree`
- L2916 `playFree`
- L2940 `execMove`
- L2999 `popTop`
- L3018 `faceUpShields`
- L3024 `removeFromShield`
- L3042 `placeOnShield`
- L3066 `putUnder`
- L3083 `setTapped`
- L3091 `moveTo`
- L3100 `putIntoBattle`
- L3120 `lookAtTop`
- L3209 `awakenLink`
- L3240 `unlink`
- L3262 `removeOwnSeals`
- L3291 `soulRaid`
- L3323 `withTargets`
- L3457 `abilityTasks`
- L3465 `triggerFrom`
- L3501 `triggerOthers`
- L3509 `whoMatches`
- L3514 `emit`
- L3711 `random`
- L3717 `shuffle`
- L3726 `topOfDeck`
- L3731 `draw`
- L3750 `deckToGrave`
- L3756 `moveCard`
- L3870 `checkStateBased`
- L3913 `gameOver`
- L3931 `sendUnderToDeckBottom`
- L3943 `avertLossUnder`
- L3959 `avertLoss`
- L3984 `name`
- L3992 `log`

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
draw:2018 · addManaFromDeck:2033 · addShieldFromDeck:2035 · choose:2037 · nextSummonDiscount:2042 · markUsed:2046 · deckTopTo:2049 · revealUntilSameCost:2075 · discardRandom:2096 · destroyDuplicates:2119 · seal:2137 · discardUnder:2141 · optional:2180 · opponentMay:2183 · ifChosen:2187 · repeat:2192 · chooseDest:2207 · revealUntil:2226 · attachGear:2252 · buzzRenda:2282 · upToTimes:2311 · magibomber:2321 · manual:2353 · extraTurn:2365 · skipRestOfTurn:2369 · useOnce:2378 · zoneGate:2381 · dSwitchFlip:2383 · winGame:2389 · breakShields:2393 · selfAction:2396 · turnStatic:2441 · playFree:2457 · flipSelf:2461 · destroyTopCard:2481 · splitFate:2496 · castSelfTwin:2527 · castOwnTwin:2532 · shieldPlus:2545 · handPlay:2587 · grSummon:2615 · afterAttack:2626 · chooseNumber:2634 · lookAtHand:2644 · tapOrUntap:2649 · fight:2667 · fightPair:2675 · gachinko:2694 · conditional:2713 · chooseOne:2718 · lookAtTop:2741 · powerMod:2743 · grantKeyword:2761 · move:2781 · bounce:2784 · toHand:2785 · shieldToHand:2786 · graveyardToHand:2787 · toMana:2788 · toGraveyard:2789 · toShield:2790 · toDeckBottom:2791 · toDeckTop:2792 · putIntoBattle:2793 · destroy:2795 · tap:2799 · untap:2801 · putSelfIntoBattle:2808 · shuffleDeck:2815 · graveyardToDeck:2821 · revealTopCard:2828 · playRevealed:2844 · soulRaid:2858 · removeOwnSeals:2860 · awakenLink:2862 · shieldGamble:2865 · playFromHandFree:2885

### execMove
battle:2960 · under:2967 · deckTop:2970 · deckBottom:2975 · shieldTop:2977

### emit
CARD_DRAWN:3519 · CREATURE_SUMMONED:3524 · CREATURE_DESTROYED:3582 · CARD_MOVED:3600 · CREATURE_LEFT:3604 · ATTACK_DECLARED:3615 · CREATURE_TAPPED:3625 · SHIELD_LEFT:3629 · UNDER_LEFT:3641 · CARD_TARGETED:3648 · BLOCKED:3651 · BATTLE_WON:3656 · TURN_STARTED:3669 · TURN_ENDED:3672 · BROKE_SHIELDS:3675 · SHIELD_BROKEN:3679 · SHIELD_ADDED:3684 · CARD_DISCARDED:3688 · CARD_PLAYED:3692 · SPELL_CAST:3699

