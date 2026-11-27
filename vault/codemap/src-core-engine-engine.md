---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4563行）

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
- L697 `battleBonus`
- L711 `attack`
- L733 `respond`
- L756 `run`
- L777 `insertFront`
- L781 `flushTriggers`
- L802 `offerHandTriggers`
- L842 `pickManaToUntap`
- L858 `gateCandidates`
- L865 `gateReady`
- L875 `fireZoneGates`
- L891 `execZoneGate`
- L934 `addTrigger`
- L939 `execPickTrigger`
- L962 `takeResponse`
- L968 `effectTasks`
- L973 `exec`
- L1686 `execShieldTrigger`
- L1721 `conditionalTrigger`
- L1727 `execAttackSwap`
- L1796 `stackFromBattle`
- L1827 `execCommandUnseal`
- L1857 `sealCard`
- L1872 `afterSealRemoved`
- L1888 `crossGear`
- L1895 `godLinkHeads`
- L1908 `linkGod`
- L1918 `checkForcedAttack`
- L1923 `execLeave`
- L2231 `payCandidates`
- L2271 `execEffect`
- L3377 `useFree`
- L3389 `playFree`
- L3414 `execMove`
- L3474 `popTop`
- L3493 `faceUpShields`
- L3499 `removeFromShield`
- L3517 `placeOnShield`
- L3541 `putUnder`
- L3558 `setTapped`
- L3566 `moveTo`
- L3575 `putIntoBattle`
- L3595 `lookAtTop`
- L3694 `awakenLink`
- L3725 `unlink`
- L3747 `removeOwnSeals`
- L3776 `soulRaid`
- L3808 `withTargets`
- L3943 `abilityTasks`
- L3957 `triggerFrom`
- L4001 `triggerOthers`
- L4009 `whoMatches`
- L4014 `emit`
- L4253 `random`
- L4259 `shuffle`
- L4268 `topOfDeck`
- L4273 `draw`
- L4292 `deckToGrave`
- L4298 `moveCard`
- L4421 `checkStateBased`
- L4464 `gameOver`
- L4482 `sendUnderToDeckBottom`
- L4497 `avertLossFromHand`
- L4510 `avertLossUnder`
- L4526 `avertLoss`
- L4551 `name`
- L4559 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:244 · CROSS:246 · HYPERIZE:258 · CONCEDE:267 · MANUAL_MOVE:270 · MANUAL_TAP:281 · MANUAL_DRAW:286 · MANUAL_SHUFFLE:291 · MANUAL_POWER:296 · MANUAL_LOG:301 · NEXT_PHASE:311 · END_TURN:314 · CHARGE_MANA:317 · PLAY_CARD:319 · ATTACK:322 · TAP_ABILITY:324

### runPhase
start:406 · draw:456 · end:466

### exec
phase:976 · turnSwitch:980 · effect:984 · denyTriggers:1000 · confirmOptional:1020 · castSpell:1035 · spellToGrave:1050 · enterBattle:1123 · leave:1362 · commandUnseal:1365 · attackSwap:1368 · attackSwapOrder:1371 · pickTrigger:1384 · abilityEnd:1387 · kirifudash:1390 · attackEnd:1405 · linkRelease:1422 · hyperize:1440 · blockStep:1461 · attackResolve:1481 · battle:1505 · battleWon:1548 · beforeBreak:1552 · breakShields:1560 · shieldTrigger:1664 · orderShieldTriggers:1667

### execLeave
stay:2026 · shedUnder:2028 · underToDeckBottom:2043 · unflip:2053 · shedTop:2062 · seal:2074 · escape:2083 · destroySelf:2093 · faceUpShieldToGrave:2096 · avertCost:2114 · payCards:2147 · destroyOther:2177

### execEffect
draw:2278 · addManaFromDeck:2293 · addShieldFromDeck:2295 · choose:2297 · nextSummonDiscount:2302 · markUsed:2306 · deckTopTo:2309 · revealUntilSameCost:2336 · discardRandom:2357 · destroyDuplicates:2380 · seal:2398 · discardUnder:2402 · optional:2441 · opponentMay:2444 · ifChosen:2448 · repeat:2453 · chooseDest:2468 · revealTopAll:2487 · revealUntil:2514 · attachGear:2546 · buzzRenda:2576 · upToTimes:2605 · magibomber:2615 · manual:2647 · extraTurn:2659 · skipRestOfTurn:2663 · useOnce:2672 · zoneGate:2675 · dSwitchFlip:2677 · winGame:2683 · breakShields:2687 · selfAction:2690 · turnStatic:2735 · playFree:2751 · flipSelf:2755 · destroyTopCard:2775 · splitFate:2790 · castSelfTwin:2821 · castOwnTwin:2826 · atTurnEnd:2844 · useAbilityOf:2857 · godLink:2885 · godUnlink:2900 · swapGraveMana:2918 · shieldForce:2927 · dynamo:2943 · shieldPlus:2953 · handPlay:2995 · grSummon:3023 · afterAttack:3034 · chooseNumber:3042 · lookAtHand:3052 · tapOrUntap:3057 · fight:3075 · fightPair:3083 · gachinko:3120 · conditional:3140 · chooseOne:3145 · lookAtTop:3168 · powerMod:3170 · grantKeyword:3188 · move:3208 · bounce:3211 · toHand:3212 · shieldToHand:3213 · graveyardToHand:3214 · toMana:3215 · toGraveyard:3216 · toShield:3217 · toDeckBottom:3218 · toDeckTop:3219 · putIntoBattle:3220 · destroy:3222 · tap:3226 · untap:3228 · putSelfIntoBattle:3235 · shuffleDeck:3242 · graveToDeckBottom:3248 · graveyardToDeck:3271 · revealTopCard:3301 · playRevealed:3317 · soulRaid:3331 · removeOwnSeals:3333 · awakenLink:3335 · shieldGamble:3338 · playFromHandFree:3358

### execMove
battle:3434 · under:3442 · deckTop:3445 · deckBottom:3450 · shieldTop:3452

### emit
CARD_DRAWN:4019 · CREATURE_SUMMONED:4024 · CREATURE_DESTROYED:4099 · CARD_MOVED:4124 · CREATURE_LEFT:4138 · ATTACK_DECLARED:4149 · CREATURE_TAPPED:4159 · SHIELD_LEFT:4164 · UNDER_LEFT:4176 · CARD_TARGETED:4183 · BLOCKED:4186 · BATTLE_WON:4191 · TURN_STARTED:4204 · TURN_ENDED:4207 · BROKE_SHIELDS:4210 · SHIELD_BROKEN:4214 · SHIELD_ADDED:4219 · CARD_DISCARDED:4223 · CARD_PLAYED:4234 · SPELL_CAST:4241

