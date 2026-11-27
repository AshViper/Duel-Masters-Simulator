---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3933行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L92 **export** interface `ApplyResult`
- L97 **export** fn `applyAction`
- L109 **export** class `IllegalAction`
- L111 interface `Response`
- L161 fn `describeTrigger`
- L170 fn `bindEvent`
- L188 **export** class `Ctx`

## メソッド

- L201 `handle`
- L305 `manualMoveByRule`
- L339 `manual`
- L347 `nextPhase`
- L354 `enterPhase`
- L360 `runPhase`
- L442 `turnSwitch`
- L479 `chargeMana`
- L492 `playCard`
- L577 `playAlt`
- L592 `payAlt`
- L634 `battleBonus`
- L648 `attack`
- L670 `respond`
- L693 `run`
- L714 `insertFront`
- L718 `flushTriggers`
- L739 `offerHandTriggers`
- L774 `gateCandidates`
- L781 `gateReady`
- L791 `fireZoneGates`
- L807 `execZoneGate`
- L850 `addTrigger`
- L855 `execPickTrigger`
- L878 `takeResponse`
- L884 `effectTasks`
- L889 `exec`
- L1509 `execShieldTrigger`
- L1544 `conditionalTrigger`
- L1550 `execAttackSwap`
- L1617 `stackFromBattle`
- L1648 `execCommandUnseal`
- L1678 `sealCard`
- L1693 `afterSealRemoved`
- L1709 `crossGear`
- L1716 `checkForcedAttack`
- L1721 `execLeave`
- L1996 `execEffect`
- L2862 `useFree`
- L2874 `playFree`
- L2898 `execMove`
- L2949 `popTop`
- L2968 `faceUpShields`
- L2974 `removeFromShield`
- L2992 `placeOnShield`
- L3016 `putUnder`
- L3033 `setTapped`
- L3041 `moveTo`
- L3050 `putIntoBattle`
- L3070 `lookAtTop`
- L3159 `awakenLink`
- L3190 `unlink`
- L3212 `removeOwnSeals`
- L3241 `soulRaid`
- L3273 `withTargets`
- L3407 `abilityTasks`
- L3415 `triggerFrom`
- L3451 `triggerOthers`
- L3459 `whoMatches`
- L3464 `emit`
- L3651 `random`
- L3657 `shuffle`
- L3666 `topOfDeck`
- L3671 `draw`
- L3690 `deckToGrave`
- L3696 `moveCard`
- L3807 `checkStateBased`
- L3850 `gameOver`
- L3868 `sendUnderToDeckBottom`
- L3880 `avertLossUnder`
- L3896 `avertLoss`
- L3921 `name`
- L3929 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:205 · CROSS:207 · HYPERIZE:219 · CONCEDE:228 · MANUAL_MOVE:231 · MANUAL_TAP:242 · MANUAL_DRAW:247 · MANUAL_SHUFFLE:252 · MANUAL_POWER:257 · MANUAL_LOG:262 · NEXT_PHASE:272 · END_TURN:275 · CHARGE_MANA:278 · PLAY_CARD:280 · ATTACK:283 · TAP_ABILITY:285

### runPhase
start:367 · draw:405 · end:410

### exec
phase:892 · turnSwitch:896 · effect:900 · confirmOptional:913 · castSpell:928 · spellToGrave:940 · enterBattle:1003 · leave:1199 · commandUnseal:1202 · attackSwap:1205 · attackSwapOrder:1208 · pickTrigger:1221 · abilityEnd:1224 · kirifudash:1227 · attackEnd:1242 · linkRelease:1258 · hyperize:1276 · blockStep:1297 · attackResolve:1316 · battle:1340 · battleWon:1376 · beforeBreak:1380 · breakShields:1388 · shieldTrigger:1487 · orderShieldTriggers:1490

### execLeave
stay:1795 · shedUnder:1797 · underToDeckBottom:1812 · unflip:1822 · shedTop:1831 · seal:1843 · escape:1852 · destroySelf:1862 · faceUpShieldToGrave:1865 · avertCost:1883 · destroyOther:1916

### execEffect
draw:2003 · addManaFromDeck:2018 · addShieldFromDeck:2020 · choose:2022 · nextSummonDiscount:2027 · markUsed:2031 · deckTopTo:2034 · discardRandom:2060 · destroyDuplicates:2078 · seal:2096 · discardUnder:2100 · optional:2139 · opponentMay:2142 · ifChosen:2146 · repeat:2151 · chooseDest:2166 · revealUntil:2185 · attachGear:2211 · buzzRenda:2241 · upToTimes:2270 · magibomber:2280 · manual:2312 · extraTurn:2324 · skipRestOfTurn:2328 · useOnce:2337 · zoneGate:2340 · dSwitchFlip:2342 · winGame:2348 · breakShields:2352 · selfAction:2355 · turnStatic:2400 · playFree:2415 · flipSelf:2419 · destroyTopCard:2439 · splitFate:2454 · castSelfTwin:2485 · castOwnTwin:2490 · shieldPlus:2503 · handPlay:2545 · grSummon:2573 · afterAttack:2584 · chooseNumber:2592 · lookAtHand:2602 · tapOrUntap:2607 · fight:2625 · fightPair:2633 · gachinko:2652 · conditional:2671 · chooseOne:2676 · lookAtTop:2699 · powerMod:2701 · grantKeyword:2719 · move:2739 · bounce:2742 · toHand:2743 · shieldToHand:2744 · graveyardToHand:2745 · toMana:2746 · toGraveyard:2747 · toShield:2748 · toDeckBottom:2749 · toDeckTop:2750 · putIntoBattle:2751 · destroy:2753 · tap:2757 · untap:2759 · putSelfIntoBattle:2766 · shuffleDeck:2773 · graveyardToDeck:2779 · revealTopCard:2786 · playRevealed:2802 · soulRaid:2816 · removeOwnSeals:2818 · awakenLink:2820 · shieldGamble:2823 · playFromHandFree:2843

### execMove
battle:2910 · under:2917 · deckTop:2920 · deckBottom:2925 · shieldTop:2927

### emit
CARD_DRAWN:3469 · CREATURE_SUMMONED:3474 · CREATURE_DESTROYED:3522 · CARD_MOVED:3540 · CREATURE_LEFT:3544 · ATTACK_DECLARED:3555 · CREATURE_TAPPED:3565 · SHIELD_LEFT:3569 · UNDER_LEFT:3581 · CARD_TARGETED:3588 · BLOCKED:3591 · BATTLE_WON:3596 · TURN_STARTED:3609 · TURN_ENDED:3612 · BROKE_SHIELDS:3615 · SHIELD_BROKEN:3619 · SHIELD_ADDED:3624 · CARD_DISCARDED:3628 · CARD_PLAYED:3632 · SPELL_CAST:3639

