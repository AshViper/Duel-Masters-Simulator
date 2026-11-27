---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4385行）

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
- L2216 `execEffect`
- L3258 `useFree`
- L3270 `playFree`
- L3294 `execMove`
- L3353 `popTop`
- L3372 `faceUpShields`
- L3378 `removeFromShield`
- L3396 `placeOnShield`
- L3420 `putUnder`
- L3437 `setTapped`
- L3445 `moveTo`
- L3454 `putIntoBattle`
- L3474 `lookAtTop`
- L3567 `awakenLink`
- L3598 `unlink`
- L3620 `removeOwnSeals`
- L3649 `soulRaid`
- L3681 `withTargets`
- L3816 `abilityTasks`
- L3830 `triggerFrom`
- L3866 `triggerOthers`
- L3874 `whoMatches`
- L3879 `emit`
- L4091 `random`
- L4097 `shuffle`
- L4106 `topOfDeck`
- L4111 `draw`
- L4130 `deckToGrave`
- L4136 `moveCard`
- L4259 `checkStateBased`
- L4302 `gameOver`
- L4320 `sendUnderToDeckBottom`
- L4332 `avertLossUnder`
- L4348 `avertLoss`
- L4373 `name`
- L4381 `log`

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
draw:2223 · addManaFromDeck:2238 · addShieldFromDeck:2240 · choose:2242 · nextSummonDiscount:2247 · markUsed:2251 · deckTopTo:2254 · revealUntilSameCost:2280 · discardRandom:2301 · destroyDuplicates:2324 · seal:2342 · discardUnder:2346 · optional:2385 · opponentMay:2388 · ifChosen:2392 · repeat:2397 · chooseDest:2412 · revealTopAll:2431 · revealUntil:2458 · attachGear:2484 · buzzRenda:2514 · upToTimes:2543 · magibomber:2553 · manual:2585 · extraTurn:2597 · skipRestOfTurn:2601 · useOnce:2610 · zoneGate:2613 · dSwitchFlip:2615 · winGame:2621 · breakShields:2625 · selfAction:2628 · turnStatic:2673 · playFree:2689 · flipSelf:2693 · destroyTopCard:2713 · splitFate:2728 · castSelfTwin:2759 · castOwnTwin:2764 · atTurnEnd:2782 · useAbilityOf:2795 · godLink:2813 · godUnlink:2828 · swapGraveMana:2846 · shieldForce:2855 · dynamo:2871 · shieldPlus:2881 · handPlay:2923 · grSummon:2951 · afterAttack:2962 · chooseNumber:2970 · lookAtHand:2980 · tapOrUntap:2985 · fight:3003 · fightPair:3011 · gachinko:3048 · conditional:3067 · chooseOne:3072 · lookAtTop:3095 · powerMod:3097 · grantKeyword:3115 · move:3135 · bounce:3138 · toHand:3139 · shieldToHand:3140 · graveyardToHand:3141 · toMana:3142 · toGraveyard:3143 · toShield:3144 · toDeckBottom:3145 · toDeckTop:3146 · putIntoBattle:3147 · destroy:3149 · tap:3153 · untap:3155 · putSelfIntoBattle:3162 · shuffleDeck:3169 · graveyardToDeck:3175 · revealTopCard:3182 · playRevealed:3198 · soulRaid:3212 · removeOwnSeals:3214 · awakenLink:3216 · shieldGamble:3219 · playFromHandFree:3239

### execMove
battle:3314 · under:3321 · deckTop:3324 · deckBottom:3329 · shieldTop:3331

### emit
CARD_DRAWN:3884 · CREATURE_SUMMONED:3889 · CREATURE_DESTROYED:3947 · CARD_MOVED:3967 · CREATURE_LEFT:3976 · ATTACK_DECLARED:3987 · CREATURE_TAPPED:3997 · SHIELD_LEFT:4002 · UNDER_LEFT:4014 · CARD_TARGETED:4021 · BLOCKED:4024 · BATTLE_WON:4029 · TURN_STARTED:4042 · TURN_ENDED:4045 · BROKE_SHIELDS:4048 · SHIELD_BROKEN:4052 · SHIELD_ADDED:4057 · CARD_DISCARDED:4061 · CARD_PLAYED:4072 · SPELL_CAST:4079

