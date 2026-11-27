---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4227行）

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
- L492 `turnSwitch`
- L529 `chargeMana`
- L542 `playCard`
- L627 `playAlt`
- L642 `payAlt`
- L684 `battleBonus`
- L698 `attack`
- L720 `respond`
- L743 `run`
- L764 `insertFront`
- L768 `flushTriggers`
- L789 `offerHandTriggers`
- L824 `gateCandidates`
- L831 `gateReady`
- L841 `fireZoneGates`
- L857 `execZoneGate`
- L900 `addTrigger`
- L905 `execPickTrigger`
- L928 `takeResponse`
- L934 `effectTasks`
- L939 `exec`
- L1596 `execShieldTrigger`
- L1631 `conditionalTrigger`
- L1637 `execAttackSwap`
- L1704 `stackFromBattle`
- L1735 `execCommandUnseal`
- L1765 `sealCard`
- L1780 `afterSealRemoved`
- L1796 `crossGear`
- L1803 `checkForcedAttack`
- L1808 `execLeave`
- L2087 `payCandidates`
- L2122 `execEffect`
- L3104 `useFree`
- L3116 `playFree`
- L3140 `execMove`
- L3199 `popTop`
- L3218 `faceUpShields`
- L3224 `removeFromShield`
- L3242 `placeOnShield`
- L3266 `putUnder`
- L3283 `setTapped`
- L3291 `moveTo`
- L3300 `putIntoBattle`
- L3320 `lookAtTop`
- L3409 `awakenLink`
- L3440 `unlink`
- L3462 `removeOwnSeals`
- L3491 `soulRaid`
- L3523 `withTargets`
- L3658 `abilityTasks`
- L3672 `triggerFrom`
- L3708 `triggerOthers`
- L3716 `whoMatches`
- L3721 `emit`
- L3933 `random`
- L3939 `shuffle`
- L3948 `topOfDeck`
- L3953 `draw`
- L3972 `deckToGrave`
- L3978 `moveCard`
- L4101 `checkStateBased`
- L4144 `gameOver`
- L4162 `sendUnderToDeckBottom`
- L4174 `avertLossUnder`
- L4190 `avertLoss`
- L4215 `name`
- L4223 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:243 · CROSS:245 · HYPERIZE:257 · CONCEDE:266 · MANUAL_MOVE:269 · MANUAL_TAP:280 · MANUAL_DRAW:285 · MANUAL_SHUFFLE:290 · MANUAL_POWER:295 · MANUAL_LOG:300 · NEXT_PHASE:310 · END_TURN:313 · CHARGE_MANA:316 · PLAY_CARD:318 · ATTACK:321 · TAP_ABILITY:323

### runPhase
start:405 · draw:447 · end:457

### exec
phase:942 · turnSwitch:946 · effect:950 · confirmOptional:963 · castSpell:978 · spellToGrave:990 · enterBattle:1053 · leave:1273 · commandUnseal:1276 · attackSwap:1279 · attackSwapOrder:1282 · pickTrigger:1295 · abilityEnd:1298 · kirifudash:1301 · attackEnd:1316 · linkRelease:1333 · hyperize:1351 · blockStep:1372 · attackResolve:1391 · battle:1415 · battleWon:1458 · beforeBreak:1462 · breakShields:1470 · shieldTrigger:1574 · orderShieldTriggers:1577

### execLeave
stay:1882 · shedUnder:1884 · underToDeckBottom:1899 · unflip:1909 · shedTop:1918 · seal:1930 · escape:1939 · destroySelf:1949 · faceUpShieldToGrave:1952 · avertCost:1970 · payCards:2003 · destroyOther:2033

### execEffect
draw:2129 · addManaFromDeck:2144 · addShieldFromDeck:2146 · choose:2148 · nextSummonDiscount:2153 · markUsed:2157 · deckTopTo:2160 · revealUntilSameCost:2186 · discardRandom:2207 · destroyDuplicates:2230 · seal:2248 · discardUnder:2252 · optional:2291 · opponentMay:2294 · ifChosen:2298 · repeat:2303 · chooseDest:2318 · revealUntil:2337 · attachGear:2363 · buzzRenda:2393 · upToTimes:2422 · magibomber:2432 · manual:2464 · extraTurn:2476 · skipRestOfTurn:2480 · useOnce:2489 · zoneGate:2492 · dSwitchFlip:2494 · winGame:2500 · breakShields:2504 · selfAction:2507 · turnStatic:2552 · playFree:2568 · flipSelf:2572 · destroyTopCard:2592 · splitFate:2607 · castSelfTwin:2638 · castOwnTwin:2643 · atTurnEnd:2661 · useAbilityOf:2674 · swapGraveMana:2692 · shieldForce:2701 · dynamo:2717 · shieldPlus:2727 · handPlay:2769 · grSummon:2797 · afterAttack:2808 · chooseNumber:2816 · lookAtHand:2826 · tapOrUntap:2831 · fight:2849 · fightPair:2857 · gachinko:2894 · conditional:2913 · chooseOne:2918 · lookAtTop:2941 · powerMod:2943 · grantKeyword:2961 · move:2981 · bounce:2984 · toHand:2985 · shieldToHand:2986 · graveyardToHand:2987 · toMana:2988 · toGraveyard:2989 · toShield:2990 · toDeckBottom:2991 · toDeckTop:2992 · putIntoBattle:2993 · destroy:2995 · tap:2999 · untap:3001 · putSelfIntoBattle:3008 · shuffleDeck:3015 · graveyardToDeck:3021 · revealTopCard:3028 · playRevealed:3044 · soulRaid:3058 · removeOwnSeals:3060 · awakenLink:3062 · shieldGamble:3065 · playFromHandFree:3085

### execMove
battle:3160 · under:3167 · deckTop:3170 · deckBottom:3175 · shieldTop:3177

### emit
CARD_DRAWN:3726 · CREATURE_SUMMONED:3731 · CREATURE_DESTROYED:3789 · CARD_MOVED:3809 · CREATURE_LEFT:3818 · ATTACK_DECLARED:3829 · CREATURE_TAPPED:3839 · SHIELD_LEFT:3844 · UNDER_LEFT:3856 · CARD_TARGETED:3863 · BLOCKED:3866 · BATTLE_WON:3871 · TURN_STARTED:3884 · TURN_ENDED:3887 · BROKE_SHIELDS:3890 · SHIELD_BROKEN:3894 · SHIELD_ADDED:3899 · CARD_DISCARDED:3903 · CARD_PLAYED:3914 · SPELL_CAST:3921

