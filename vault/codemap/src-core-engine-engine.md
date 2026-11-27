---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（3969行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L93 **export** interface `ApplyResult`
- L98 **export** fn `applyAction`
- L110 **export** class `IllegalAction`
- L112 interface `Response`
- L162 fn `describeTrigger`
- L171 fn `bindEvent`
- L189 **export** class `Ctx`

## メソッド

- L202 `handle`
- L306 `manualMoveByRule`
- L340 `manual`
- L348 `nextPhase`
- L355 `enterPhase`
- L361 `runPhase`
- L443 `turnSwitch`
- L480 `chargeMana`
- L493 `playCard`
- L578 `playAlt`
- L593 `payAlt`
- L635 `battleBonus`
- L649 `attack`
- L671 `respond`
- L694 `run`
- L715 `insertFront`
- L719 `flushTriggers`
- L740 `offerHandTriggers`
- L775 `gateCandidates`
- L782 `gateReady`
- L792 `fireZoneGates`
- L808 `execZoneGate`
- L851 `addTrigger`
- L856 `execPickTrigger`
- L879 `takeResponse`
- L885 `effectTasks`
- L890 `exec`
- L1510 `execShieldTrigger`
- L1545 `conditionalTrigger`
- L1551 `execAttackSwap`
- L1618 `stackFromBattle`
- L1649 `execCommandUnseal`
- L1679 `sealCard`
- L1694 `afterSealRemoved`
- L1710 `crossGear`
- L1717 `checkForcedAttack`
- L1722 `execLeave`
- L1997 `execEffect`
- L2890 `useFree`
- L2902 `playFree`
- L2926 `execMove`
- L2985 `popTop`
- L3004 `faceUpShields`
- L3010 `removeFromShield`
- L3028 `placeOnShield`
- L3052 `putUnder`
- L3069 `setTapped`
- L3077 `moveTo`
- L3086 `putIntoBattle`
- L3106 `lookAtTop`
- L3195 `awakenLink`
- L3226 `unlink`
- L3248 `removeOwnSeals`
- L3277 `soulRaid`
- L3309 `withTargets`
- L3443 `abilityTasks`
- L3451 `triggerFrom`
- L3487 `triggerOthers`
- L3495 `whoMatches`
- L3500 `emit`
- L3687 `random`
- L3693 `shuffle`
- L3702 `topOfDeck`
- L3707 `draw`
- L3726 `deckToGrave`
- L3732 `moveCard`
- L3843 `checkStateBased`
- L3886 `gameOver`
- L3904 `sendUnderToDeckBottom`
- L3916 `avertLossUnder`
- L3932 `avertLoss`
- L3957 `name`
- L3965 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:206 · CROSS:208 · HYPERIZE:220 · CONCEDE:229 · MANUAL_MOVE:232 · MANUAL_TAP:243 · MANUAL_DRAW:248 · MANUAL_SHUFFLE:253 · MANUAL_POWER:258 · MANUAL_LOG:263 · NEXT_PHASE:273 · END_TURN:276 · CHARGE_MANA:279 · PLAY_CARD:281 · ATTACK:284 · TAP_ABILITY:286

### runPhase
start:368 · draw:406 · end:411

### exec
phase:893 · turnSwitch:897 · effect:901 · confirmOptional:914 · castSpell:929 · spellToGrave:941 · enterBattle:1004 · leave:1200 · commandUnseal:1203 · attackSwap:1206 · attackSwapOrder:1209 · pickTrigger:1222 · abilityEnd:1225 · kirifudash:1228 · attackEnd:1243 · linkRelease:1259 · hyperize:1277 · blockStep:1298 · attackResolve:1317 · battle:1341 · battleWon:1377 · beforeBreak:1381 · breakShields:1389 · shieldTrigger:1488 · orderShieldTriggers:1491

### execLeave
stay:1796 · shedUnder:1798 · underToDeckBottom:1813 · unflip:1823 · shedTop:1832 · seal:1844 · escape:1853 · destroySelf:1863 · faceUpShieldToGrave:1866 · avertCost:1884 · destroyOther:1917

### execEffect
draw:2004 · addManaFromDeck:2019 · addShieldFromDeck:2021 · choose:2023 · nextSummonDiscount:2028 · markUsed:2032 · deckTopTo:2035 · revealUntilSameCost:2061 · discardRandom:2082 · destroyDuplicates:2105 · seal:2123 · discardUnder:2127 · optional:2166 · opponentMay:2169 · ifChosen:2173 · repeat:2178 · chooseDest:2193 · revealUntil:2212 · attachGear:2238 · buzzRenda:2268 · upToTimes:2297 · magibomber:2307 · manual:2339 · extraTurn:2351 · skipRestOfTurn:2355 · useOnce:2364 · zoneGate:2367 · dSwitchFlip:2369 · winGame:2375 · breakShields:2379 · selfAction:2382 · turnStatic:2427 · playFree:2443 · flipSelf:2447 · destroyTopCard:2467 · splitFate:2482 · castSelfTwin:2513 · castOwnTwin:2518 · shieldPlus:2531 · handPlay:2573 · grSummon:2601 · afterAttack:2612 · chooseNumber:2620 · lookAtHand:2630 · tapOrUntap:2635 · fight:2653 · fightPair:2661 · gachinko:2680 · conditional:2699 · chooseOne:2704 · lookAtTop:2727 · powerMod:2729 · grantKeyword:2747 · move:2767 · bounce:2770 · toHand:2771 · shieldToHand:2772 · graveyardToHand:2773 · toMana:2774 · toGraveyard:2775 · toShield:2776 · toDeckBottom:2777 · toDeckTop:2778 · putIntoBattle:2779 · destroy:2781 · tap:2785 · untap:2787 · putSelfIntoBattle:2794 · shuffleDeck:2801 · graveyardToDeck:2807 · revealTopCard:2814 · playRevealed:2830 · soulRaid:2844 · removeOwnSeals:2846 · awakenLink:2848 · shieldGamble:2851 · playFromHandFree:2871

### execMove
battle:2946 · under:2953 · deckTop:2956 · deckBottom:2961 · shieldTop:2963

### emit
CARD_DRAWN:3505 · CREATURE_SUMMONED:3510 · CREATURE_DESTROYED:3558 · CARD_MOVED:3576 · CREATURE_LEFT:3580 · ATTACK_DECLARED:3591 · CREATURE_TAPPED:3601 · SHIELD_LEFT:3605 · UNDER_LEFT:3617 · CARD_TARGETED:3624 · BLOCKED:3627 · BATTLE_WON:3632 · TURN_STARTED:3645 · TURN_ENDED:3648 · BROKE_SHIELDS:3651 · SHIELD_BROKEN:3655 · SHIELD_ADDED:3660 · CARD_DISCARDED:3664 · CARD_PLAYED:3668 · SPELL_CAST:3675

