---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4449行）

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
- L3307 `useFree`
- L3319 `playFree`
- L3343 `execMove`
- L3403 `popTop`
- L3422 `faceUpShields`
- L3428 `removeFromShield`
- L3446 `placeOnShield`
- L3470 `putUnder`
- L3487 `setTapped`
- L3495 `moveTo`
- L3504 `putIntoBattle`
- L3524 `lookAtTop`
- L3617 `awakenLink`
- L3648 `unlink`
- L3670 `removeOwnSeals`
- L3699 `soulRaid`
- L3731 `withTargets`
- L3866 `abilityTasks`
- L3880 `triggerFrom`
- L3916 `triggerOthers`
- L3924 `whoMatches`
- L3929 `emit`
- L4155 `random`
- L4161 `shuffle`
- L4170 `topOfDeck`
- L4175 `draw`
- L4194 `deckToGrave`
- L4200 `moveCard`
- L4323 `checkStateBased`
- L4366 `gameOver`
- L4384 `sendUnderToDeckBottom`
- L4396 `avertLossUnder`
- L4412 `avertLoss`
- L4437 `name`
- L4445 `log`

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
draw:2249 · addManaFromDeck:2264 · addShieldFromDeck:2266 · choose:2268 · nextSummonDiscount:2273 · markUsed:2277 · deckTopTo:2280 · revealUntilSameCost:2306 · discardRandom:2327 · destroyDuplicates:2350 · seal:2368 · discardUnder:2372 · optional:2411 · opponentMay:2414 · ifChosen:2418 · repeat:2423 · chooseDest:2438 · revealTopAll:2457 · revealUntil:2484 · attachGear:2510 · buzzRenda:2540 · upToTimes:2569 · magibomber:2579 · manual:2611 · extraTurn:2623 · skipRestOfTurn:2627 · useOnce:2636 · zoneGate:2639 · dSwitchFlip:2641 · winGame:2647 · breakShields:2651 · selfAction:2654 · turnStatic:2699 · playFree:2715 · flipSelf:2719 · destroyTopCard:2739 · splitFate:2754 · castSelfTwin:2785 · castOwnTwin:2790 · atTurnEnd:2808 · useAbilityOf:2821 · godLink:2839 · godUnlink:2854 · swapGraveMana:2872 · shieldForce:2881 · dynamo:2897 · shieldPlus:2907 · handPlay:2949 · grSummon:2977 · afterAttack:2988 · chooseNumber:2996 · lookAtHand:3006 · tapOrUntap:3011 · fight:3029 · fightPair:3037 · gachinko:3074 · conditional:3093 · chooseOne:3098 · lookAtTop:3121 · powerMod:3123 · grantKeyword:3141 · move:3161 · bounce:3164 · toHand:3165 · shieldToHand:3166 · graveyardToHand:3167 · toMana:3168 · toGraveyard:3169 · toShield:3170 · toDeckBottom:3171 · toDeckTop:3172 · putIntoBattle:3173 · destroy:3175 · tap:3179 · untap:3181 · putSelfIntoBattle:3188 · shuffleDeck:3195 · graveToDeckBottom:3201 · graveyardToDeck:3224 · revealTopCard:3231 · playRevealed:3247 · soulRaid:3261 · removeOwnSeals:3263 · awakenLink:3265 · shieldGamble:3268 · playFromHandFree:3288

### execMove
battle:3363 · under:3371 · deckTop:3374 · deckBottom:3379 · shieldTop:3381

### emit
CARD_DRAWN:3934 · CREATURE_SUMMONED:3939 · CREATURE_DESTROYED:4011 · CARD_MOVED:4031 · CREATURE_LEFT:4040 · ATTACK_DECLARED:4051 · CREATURE_TAPPED:4061 · SHIELD_LEFT:4066 · UNDER_LEFT:4078 · CARD_TARGETED:4085 · BLOCKED:4088 · BATTLE_WON:4093 · TURN_STARTED:4106 · TURN_ENDED:4109 · BROKE_SHIELDS:4112 · SHIELD_BROKEN:4116 · SHIELD_ADDED:4121 · CARD_DISCARDED:4125 · CARD_PLAYED:4136 · SPELL_CAST:4143

