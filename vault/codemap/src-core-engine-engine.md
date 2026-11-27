---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4225行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L95 **export** interface `ApplyResult`
- L100 **export** fn `applyAction`
- L112 **export** class `IllegalAction`
- L114 interface `Response`
- L165 fn `describeTrigger`
- L175 fn `bindSubjectFilters`
- L201 fn `bindCondition`
- L208 fn `bindEvent`
- L226 **export** class `Ctx`

## メソッド

- L239 `handle`
- L343 `manualMoveByRule`
- L377 `manual`
- L385 `nextPhase`
- L392 `enterPhase`
- L398 `runPhase`
- L490 `turnSwitch`
- L527 `chargeMana`
- L540 `playCard`
- L625 `playAlt`
- L640 `payAlt`
- L682 `battleBonus`
- L696 `attack`
- L718 `respond`
- L741 `run`
- L762 `insertFront`
- L766 `flushTriggers`
- L787 `offerHandTriggers`
- L822 `gateCandidates`
- L829 `gateReady`
- L839 `fireZoneGates`
- L855 `execZoneGate`
- L898 `addTrigger`
- L903 `execPickTrigger`
- L926 `takeResponse`
- L932 `effectTasks`
- L937 `exec`
- L1594 `execShieldTrigger`
- L1629 `conditionalTrigger`
- L1635 `execAttackSwap`
- L1702 `stackFromBattle`
- L1733 `execCommandUnseal`
- L1763 `sealCard`
- L1778 `afterSealRemoved`
- L1794 `crossGear`
- L1801 `checkForcedAttack`
- L1806 `execLeave`
- L2085 `payCandidates`
- L2120 `execEffect`
- L3102 `useFree`
- L3114 `playFree`
- L3138 `execMove`
- L3197 `popTop`
- L3216 `faceUpShields`
- L3222 `removeFromShield`
- L3240 `placeOnShield`
- L3264 `putUnder`
- L3281 `setTapped`
- L3289 `moveTo`
- L3298 `putIntoBattle`
- L3318 `lookAtTop`
- L3407 `awakenLink`
- L3438 `unlink`
- L3460 `removeOwnSeals`
- L3489 `soulRaid`
- L3521 `withTargets`
- L3656 `abilityTasks`
- L3670 `triggerFrom`
- L3706 `triggerOthers`
- L3714 `whoMatches`
- L3719 `emit`
- L3931 `random`
- L3937 `shuffle`
- L3946 `topOfDeck`
- L3951 `draw`
- L3970 `deckToGrave`
- L3976 `moveCard`
- L4099 `checkStateBased`
- L4142 `gameOver`
- L4160 `sendUnderToDeckBottom`
- L4172 `avertLossUnder`
- L4188 `avertLoss`
- L4213 `name`
- L4221 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:243 · CROSS:245 · HYPERIZE:257 · CONCEDE:266 · MANUAL_MOVE:269 · MANUAL_TAP:280 · MANUAL_DRAW:285 · MANUAL_SHUFFLE:290 · MANUAL_POWER:295 · MANUAL_LOG:300 · NEXT_PHASE:310 · END_TURN:313 · CHARGE_MANA:316 · PLAY_CARD:318 · ATTACK:321 · TAP_ABILITY:323

### runPhase
start:405 · draw:445 · end:455

### exec
phase:940 · turnSwitch:944 · effect:948 · confirmOptional:961 · castSpell:976 · spellToGrave:988 · enterBattle:1051 · leave:1271 · commandUnseal:1274 · attackSwap:1277 · attackSwapOrder:1280 · pickTrigger:1293 · abilityEnd:1296 · kirifudash:1299 · attackEnd:1314 · linkRelease:1331 · hyperize:1349 · blockStep:1370 · attackResolve:1389 · battle:1413 · battleWon:1456 · beforeBreak:1460 · breakShields:1468 · shieldTrigger:1572 · orderShieldTriggers:1575

### execLeave
stay:1880 · shedUnder:1882 · underToDeckBottom:1897 · unflip:1907 · shedTop:1916 · seal:1928 · escape:1937 · destroySelf:1947 · faceUpShieldToGrave:1950 · avertCost:1968 · payCards:2001 · destroyOther:2031

### execEffect
draw:2127 · addManaFromDeck:2142 · addShieldFromDeck:2144 · choose:2146 · nextSummonDiscount:2151 · markUsed:2155 · deckTopTo:2158 · revealUntilSameCost:2184 · discardRandom:2205 · destroyDuplicates:2228 · seal:2246 · discardUnder:2250 · optional:2289 · opponentMay:2292 · ifChosen:2296 · repeat:2301 · chooseDest:2316 · revealUntil:2335 · attachGear:2361 · buzzRenda:2391 · upToTimes:2420 · magibomber:2430 · manual:2462 · extraTurn:2474 · skipRestOfTurn:2478 · useOnce:2487 · zoneGate:2490 · dSwitchFlip:2492 · winGame:2498 · breakShields:2502 · selfAction:2505 · turnStatic:2550 · playFree:2566 · flipSelf:2570 · destroyTopCard:2590 · splitFate:2605 · castSelfTwin:2636 · castOwnTwin:2641 · atTurnEnd:2659 · useAbilityOf:2672 · swapGraveMana:2690 · shieldForce:2699 · dynamo:2715 · shieldPlus:2725 · handPlay:2767 · grSummon:2795 · afterAttack:2806 · chooseNumber:2814 · lookAtHand:2824 · tapOrUntap:2829 · fight:2847 · fightPair:2855 · gachinko:2892 · conditional:2911 · chooseOne:2916 · lookAtTop:2939 · powerMod:2941 · grantKeyword:2959 · move:2979 · bounce:2982 · toHand:2983 · shieldToHand:2984 · graveyardToHand:2985 · toMana:2986 · toGraveyard:2987 · toShield:2988 · toDeckBottom:2989 · toDeckTop:2990 · putIntoBattle:2991 · destroy:2993 · tap:2997 · untap:2999 · putSelfIntoBattle:3006 · shuffleDeck:3013 · graveyardToDeck:3019 · revealTopCard:3026 · playRevealed:3042 · soulRaid:3056 · removeOwnSeals:3058 · awakenLink:3060 · shieldGamble:3063 · playFromHandFree:3083

### execMove
battle:3158 · under:3165 · deckTop:3168 · deckBottom:3173 · shieldTop:3175

### emit
CARD_DRAWN:3724 · CREATURE_SUMMONED:3729 · CREATURE_DESTROYED:3787 · CARD_MOVED:3807 · CREATURE_LEFT:3816 · ATTACK_DECLARED:3827 · CREATURE_TAPPED:3837 · SHIELD_LEFT:3842 · UNDER_LEFT:3854 · CARD_TARGETED:3861 · BLOCKED:3864 · BATTLE_WON:3869 · TURN_STARTED:3882 · TURN_ENDED:3885 · BROKE_SHIELDS:3888 · SHIELD_BROKEN:3892 · SHIELD_ADDED:3897 · CARD_DISCARDED:3901 · CARD_PLAYED:3912 · SPELL_CAST:3919

