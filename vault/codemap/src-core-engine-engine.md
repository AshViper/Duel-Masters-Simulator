---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4459行）

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
- L696 `battleBonus`
- L710 `attack`
- L732 `respond`
- L755 `run`
- L776 `insertFront`
- L780 `flushTriggers`
- L801 `offerHandTriggers`
- L836 `pickManaToUntap`
- L852 `gateCandidates`
- L859 `gateReady`
- L869 `fireZoneGates`
- L885 `execZoneGate`
- L928 `addTrigger`
- L933 `execPickTrigger`
- L956 `takeResponse`
- L962 `effectTasks`
- L967 `exec`
- L1660 `execShieldTrigger`
- L1695 `conditionalTrigger`
- L1701 `execAttackSwap`
- L1768 `stackFromBattle`
- L1799 `execCommandUnseal`
- L1829 `sealCard`
- L1844 `afterSealRemoved`
- L1860 `crossGear`
- L1867 `godLinkHeads`
- L1880 `linkGod`
- L1890 `checkForcedAttack`
- L1895 `execLeave`
- L2203 `payCandidates`
- L2242 `execEffect`
- L3317 `useFree`
- L3329 `playFree`
- L3353 `execMove`
- L3413 `popTop`
- L3432 `faceUpShields`
- L3438 `removeFromShield`
- L3456 `placeOnShield`
- L3480 `putUnder`
- L3497 `setTapped`
- L3505 `moveTo`
- L3514 `putIntoBattle`
- L3534 `lookAtTop`
- L3627 `awakenLink`
- L3658 `unlink`
- L3680 `removeOwnSeals`
- L3709 `soulRaid`
- L3741 `withTargets`
- L3876 `abilityTasks`
- L3890 `triggerFrom`
- L3926 `triggerOthers`
- L3934 `whoMatches`
- L3939 `emit`
- L4165 `random`
- L4171 `shuffle`
- L4180 `topOfDeck`
- L4185 `draw`
- L4204 `deckToGrave`
- L4210 `moveCard`
- L4333 `checkStateBased`
- L4376 `gameOver`
- L4394 `sendUnderToDeckBottom`
- L4406 `avertLossUnder`
- L4422 `avertLoss`
- L4447 `name`
- L4455 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:244 · CROSS:246 · HYPERIZE:258 · CONCEDE:267 · MANUAL_MOVE:270 · MANUAL_TAP:281 · MANUAL_DRAW:286 · MANUAL_SHUFFLE:291 · MANUAL_POWER:296 · MANUAL_LOG:301 · NEXT_PHASE:311 · END_TURN:314 · CHARGE_MANA:317 · PLAY_CARD:319 · ATTACK:322 · TAP_ABILITY:324

### runPhase
start:406 · draw:456 · end:466

### exec
phase:970 · turnSwitch:974 · effect:978 · denyTriggers:991 · confirmOptional:1011 · castSpell:1026 · spellToGrave:1038 · enterBattle:1101 · leave:1336 · commandUnseal:1339 · attackSwap:1342 · attackSwapOrder:1345 · pickTrigger:1358 · abilityEnd:1361 · kirifudash:1364 · attackEnd:1379 · linkRelease:1396 · hyperize:1414 · blockStep:1435 · attackResolve:1455 · battle:1479 · battleWon:1522 · beforeBreak:1526 · breakShields:1534 · shieldTrigger:1638 · orderShieldTriggers:1641

### execLeave
stay:1998 · shedUnder:2000 · underToDeckBottom:2015 · unflip:2025 · shedTop:2034 · seal:2046 · escape:2055 · destroySelf:2065 · faceUpShieldToGrave:2068 · avertCost:2086 · payCards:2119 · destroyOther:2149

### execEffect
draw:2249 · addManaFromDeck:2264 · addShieldFromDeck:2266 · choose:2268 · nextSummonDiscount:2273 · markUsed:2277 · deckTopTo:2280 · revealUntilSameCost:2306 · discardRandom:2327 · destroyDuplicates:2350 · seal:2368 · discardUnder:2372 · optional:2411 · opponentMay:2414 · ifChosen:2418 · repeat:2423 · chooseDest:2438 · revealTopAll:2457 · revealUntil:2484 · attachGear:2510 · buzzRenda:2540 · upToTimes:2569 · magibomber:2579 · manual:2611 · extraTurn:2623 · skipRestOfTurn:2627 · useOnce:2636 · zoneGate:2639 · dSwitchFlip:2641 · winGame:2647 · breakShields:2651 · selfAction:2654 · turnStatic:2699 · playFree:2715 · flipSelf:2719 · destroyTopCard:2739 · splitFate:2754 · castSelfTwin:2785 · castOwnTwin:2790 · atTurnEnd:2808 · useAbilityOf:2821 · godLink:2849 · godUnlink:2864 · swapGraveMana:2882 · shieldForce:2891 · dynamo:2907 · shieldPlus:2917 · handPlay:2959 · grSummon:2987 · afterAttack:2998 · chooseNumber:3006 · lookAtHand:3016 · tapOrUntap:3021 · fight:3039 · fightPair:3047 · gachinko:3084 · conditional:3103 · chooseOne:3108 · lookAtTop:3131 · powerMod:3133 · grantKeyword:3151 · move:3171 · bounce:3174 · toHand:3175 · shieldToHand:3176 · graveyardToHand:3177 · toMana:3178 · toGraveyard:3179 · toShield:3180 · toDeckBottom:3181 · toDeckTop:3182 · putIntoBattle:3183 · destroy:3185 · tap:3189 · untap:3191 · putSelfIntoBattle:3198 · shuffleDeck:3205 · graveToDeckBottom:3211 · graveyardToDeck:3234 · revealTopCard:3241 · playRevealed:3257 · soulRaid:3271 · removeOwnSeals:3273 · awakenLink:3275 · shieldGamble:3278 · playFromHandFree:3298

### execMove
battle:3373 · under:3381 · deckTop:3384 · deckBottom:3389 · shieldTop:3391

### emit
CARD_DRAWN:3944 · CREATURE_SUMMONED:3949 · CREATURE_DESTROYED:4021 · CARD_MOVED:4041 · CREATURE_LEFT:4050 · ATTACK_DECLARED:4061 · CREATURE_TAPPED:4071 · SHIELD_LEFT:4076 · UNDER_LEFT:4088 · CARD_TARGETED:4095 · BLOCKED:4098 · BATTLE_WON:4103 · TURN_STARTED:4116 · TURN_ENDED:4119 · BROKE_SHIELDS:4122 · SHIELD_BROKEN:4126 · SHIELD_ADDED:4131 · CARD_DISCARDED:4135 · CARD_PLAYED:4146 · SPELL_CAST:4153

