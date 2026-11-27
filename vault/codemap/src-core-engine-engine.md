---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4412行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L96 **export** interface `ApplyResult`
- L101 **export** fn `applyAction`
- L113 **export** class `IllegalAction`
- L115 interface `Response`
- L166 fn `describeTrigger`
- L176 fn `bindSubjectFilters`
- L202 fn `bindCondition`
- L209 fn `bindEvent`
- L227 **export** class `Ctx`

## メソッド

- L240 `handle`
- L344 `manualMoveByRule`
- L378 `manual`
- L386 `nextPhase`
- L393 `enterPhase`
- L399 `runPhase`
- L501 `turnSwitch`
- L539 `chargeMana`
- L552 `playCard`
- L637 `playAlt`
- L652 `payAlt`
- L694 `battleBonus`
- L708 `attack`
- L730 `respond`
- L753 `run`
- L774 `insertFront`
- L778 `flushTriggers`
- L799 `offerHandTriggers`
- L834 `pickManaToUntap`
- L850 `gateCandidates`
- L857 `gateReady`
- L867 `fireZoneGates`
- L883 `execZoneGate`
- L926 `addTrigger`
- L931 `execPickTrigger`
- L954 `takeResponse`
- L960 `effectTasks`
- L965 `exec`
- L1638 `execShieldTrigger`
- L1673 `conditionalTrigger`
- L1679 `execAttackSwap`
- L1746 `stackFromBattle`
- L1777 `execCommandUnseal`
- L1807 `sealCard`
- L1822 `afterSealRemoved`
- L1838 `crossGear`
- L1845 `godLinkHeads`
- L1858 `linkGod`
- L1868 `checkForcedAttack`
- L1873 `execLeave`
- L2181 `payCandidates`
- L2220 `execEffect`
- L3285 `useFree`
- L3297 `playFree`
- L3321 `execMove`
- L3380 `popTop`
- L3399 `faceUpShields`
- L3405 `removeFromShield`
- L3423 `placeOnShield`
- L3447 `putUnder`
- L3464 `setTapped`
- L3472 `moveTo`
- L3481 `putIntoBattle`
- L3501 `lookAtTop`
- L3594 `awakenLink`
- L3625 `unlink`
- L3647 `removeOwnSeals`
- L3676 `soulRaid`
- L3708 `withTargets`
- L3843 `abilityTasks`
- L3857 `triggerFrom`
- L3893 `triggerOthers`
- L3901 `whoMatches`
- L3906 `emit`
- L4118 `random`
- L4124 `shuffle`
- L4133 `topOfDeck`
- L4138 `draw`
- L4157 `deckToGrave`
- L4163 `moveCard`
- L4286 `checkStateBased`
- L4329 `gameOver`
- L4347 `sendUnderToDeckBottom`
- L4359 `avertLossUnder`
- L4375 `avertLoss`
- L4400 `name`
- L4408 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:244 · CROSS:246 · HYPERIZE:258 · CONCEDE:267 · MANUAL_MOVE:270 · MANUAL_TAP:281 · MANUAL_DRAW:286 · MANUAL_SHUFFLE:291 · MANUAL_POWER:296 · MANUAL_LOG:301 · NEXT_PHASE:311 · END_TURN:314 · CHARGE_MANA:317 · PLAY_CARD:319 · ATTACK:322 · TAP_ABILITY:324

### runPhase
start:406 · draw:456 · end:466

### exec
phase:968 · turnSwitch:972 · effect:976 · confirmOptional:989 · castSpell:1004 · spellToGrave:1016 · enterBattle:1079 · leave:1314 · commandUnseal:1317 · attackSwap:1320 · attackSwapOrder:1323 · pickTrigger:1336 · abilityEnd:1339 · kirifudash:1342 · attackEnd:1357 · linkRelease:1374 · hyperize:1392 · blockStep:1413 · attackResolve:1433 · battle:1457 · battleWon:1500 · beforeBreak:1504 · breakShields:1512 · shieldTrigger:1616 · orderShieldTriggers:1619

### execLeave
stay:1976 · shedUnder:1978 · underToDeckBottom:1993 · unflip:2003 · shedTop:2012 · seal:2024 · escape:2033 · destroySelf:2043 · faceUpShieldToGrave:2046 · avertCost:2064 · payCards:2097 · destroyOther:2127

### execEffect
draw:2227 · addManaFromDeck:2242 · addShieldFromDeck:2244 · choose:2246 · nextSummonDiscount:2251 · markUsed:2255 · deckTopTo:2258 · revealUntilSameCost:2284 · discardRandom:2305 · destroyDuplicates:2328 · seal:2346 · discardUnder:2350 · optional:2389 · opponentMay:2392 · ifChosen:2396 · repeat:2401 · chooseDest:2416 · revealTopAll:2435 · revealUntil:2462 · attachGear:2488 · buzzRenda:2518 · upToTimes:2547 · magibomber:2557 · manual:2589 · extraTurn:2601 · skipRestOfTurn:2605 · useOnce:2614 · zoneGate:2617 · dSwitchFlip:2619 · winGame:2625 · breakShields:2629 · selfAction:2632 · turnStatic:2677 · playFree:2693 · flipSelf:2697 · destroyTopCard:2717 · splitFate:2732 · castSelfTwin:2763 · castOwnTwin:2768 · atTurnEnd:2786 · useAbilityOf:2799 · godLink:2817 · godUnlink:2832 · swapGraveMana:2850 · shieldForce:2859 · dynamo:2875 · shieldPlus:2885 · handPlay:2927 · grSummon:2955 · afterAttack:2966 · chooseNumber:2974 · lookAtHand:2984 · tapOrUntap:2989 · fight:3007 · fightPair:3015 · gachinko:3052 · conditional:3071 · chooseOne:3076 · lookAtTop:3099 · powerMod:3101 · grantKeyword:3119 · move:3139 · bounce:3142 · toHand:3143 · shieldToHand:3144 · graveyardToHand:3145 · toMana:3146 · toGraveyard:3147 · toShield:3148 · toDeckBottom:3149 · toDeckTop:3150 · putIntoBattle:3151 · destroy:3153 · tap:3157 · untap:3159 · putSelfIntoBattle:3166 · shuffleDeck:3173 · graveToDeckBottom:3179 · graveyardToDeck:3202 · revealTopCard:3209 · playRevealed:3225 · soulRaid:3239 · removeOwnSeals:3241 · awakenLink:3243 · shieldGamble:3246 · playFromHandFree:3266

### execMove
battle:3341 · under:3348 · deckTop:3351 · deckBottom:3356 · shieldTop:3358

### emit
CARD_DRAWN:3911 · CREATURE_SUMMONED:3916 · CREATURE_DESTROYED:3974 · CARD_MOVED:3994 · CREATURE_LEFT:4003 · ATTACK_DECLARED:4014 · CREATURE_TAPPED:4024 · SHIELD_LEFT:4029 · UNDER_LEFT:4041 · CARD_TARGETED:4048 · BLOCKED:4051 · BATTLE_WON:4056 · TURN_STARTED:4069 · TURN_ENDED:4072 · BROKE_SHIELDS:4075 · SHIELD_BROKEN:4079 · SHIELD_ADDED:4084 · CARD_DISCARDED:4088 · CARD_PLAYED:4099 · SPELL_CAST:4106

