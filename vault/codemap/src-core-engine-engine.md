---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4864行）

> 自動生成（`npm run codemap`）。手で編集しない。行番号は生成時点のもの。ずれていたら再生成するか grep で確かめる。

ゲームエンジン本体。applyAction(state, action) で新しい状態を返す純粋な入口を持ち、

## トップレベル

- L100 **export** interface `ApplyResult`
- L105 **export** fn `applyAction`
- L117 **export** class `IllegalAction`
- L119 interface `Response`
- L171 fn `describeTrigger`
- L181 fn `bindSubjectFilters`
- L207 fn `bindCondition`
- L214 fn `bindEvent`
- L232 **export** class `Ctx`

## メソッド

- L245 `handle`
- L349 `manualMoveByRule`
- L383 `manual`
- L391 `nextPhase`
- L398 `enterPhase`
- L404 `runPhase`
- L508 `turnSwitch`
- L546 `chargeMana`
- L559 `playCard`
- L646 `playAlt`
- L661 `payAlt`
- L707 `battleBonus`
- L721 `attack`
- L747 `respond`
- L770 `run`
- L791 `insertFront`
- L795 `flushTriggers`
- L816 `offerHandTriggers`
- L856 `pickManaToUntap`
- L872 `gateCandidates`
- L879 `gateReady`
- L889 `fireZoneGates`
- L905 `execZoneGate`
- L948 `addTrigger`
- L953 `execPickTrigger`
- L976 `takeResponse`
- L982 `effectTasks`
- L987 `exec`
- L1733 `execShieldTrigger`
- L1774 `conditionalTrigger`
- L1780 `execAttackSwap`
- L1849 `stackFromBattle`
- L1880 `execCommandUnseal`
- L1910 `sealCard`
- L1925 `afterSealRemoved`
- L1941 `crossGear`
- L1948 `godLinkHeads`
- L1961 `linkGod`
- L1971 `checkForcedAttack`
- L1976 `execLeave`
- L2284 `payCandidates`
- L2325 `execEffect`
- L3545 `useFree`
- L3557 `playFree`
- L3582 `execMove`
- L3649 `popTop`
- L3668 `faceUpShields`
- L3674 `removeFromShield`
- L3692 `placeOnShield`
- L3716 `putUnder`
- L3733 `setTapped`
- L3741 `moveTo`
- L3750 `putIntoBattle`
- L3770 `lookAtTop`
- L3875 `awakenLink`
- L3906 `unlink`
- L3928 `removeOwnSeals`
- L3957 `soulRaid`
- L3989 `withTargets`
- L4124 `abilityTasks`
- L4138 `triggerFrom`
- L4184 `triggerOthers`
- L4192 `whoMatches`
- L4197 `emit`
- L4449 `random`
- L4455 `shuffle`
- L4470 `topOfDeck`
- L4475 `draw`
- L4505 `deckToGrave`
- L4511 `moveCard`
- L4655 `deckLockedBy`
- L4660 `checkStateBased`
- L4703 `gameOver`
- L4723 `sendUnderToDeckBottom`
- L4738 `avertLossFromHand`
- L4755 `avertLossDestroySelf`
- L4786 `avertLossDestroyOwn`
- L4811 `avertLossUnder`
- L4827 `avertLoss`
- L4852 `name`
- L4860 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:249 · CROSS:251 · HYPERIZE:263 · CONCEDE:272 · MANUAL_MOVE:275 · MANUAL_TAP:286 · MANUAL_DRAW:291 · MANUAL_SHUFFLE:296 · MANUAL_POWER:301 · MANUAL_LOG:306 · NEXT_PHASE:316 · END_TURN:319 · CHARGE_MANA:322 · PLAY_CARD:324 · ATTACK:327 · TAP_ABILITY:329

### runPhase
start:411 · draw:461 · end:471

### exec
phase:990 · turnSwitch:994 · effect:998 · denyTriggers:1014 · confirmOptional:1034 · castSpell:1049 · spellToGrave:1064 · enterBattle:1137 · leave:1376 · commandUnseal:1379 · attackSwap:1382 · attackSwapOrder:1385 · pickTrigger:1398 · abilityEnd:1401 · kirifudash:1404 · attackEnd:1419 · linkRelease:1444 · hyperize:1462 · blockStep:1483 · attackResolve:1503 · battle:1527 · battleWon:1579 · beforeBreak:1583 · breakShields:1591 · shieldTrigger:1711 · orderShieldTriggers:1714

### execLeave
stay:2079 · shedUnder:2081 · underToDeckBottom:2096 · unflip:2106 · shedTop:2115 · seal:2127 · escape:2136 · destroySelf:2146 · faceUpShieldToGrave:2149 · avertCost:2167 · payCards:2200 · destroyOther:2230

### execEffect
draw:2332 · addManaFromDeck:2355 · addShieldFromDeck:2357 · choose:2359 · nextSummonDiscount:2364 · markUsed:2368 · deckTopTo:2371 · revealUntilSameCost:2398 · discardRandom:2419 · destroyDuplicates:2442 · seal:2460 · discardUnder:2464 · optional:2503 · opponentMay:2506 · sBack:2510 · ifChosen:2520 · repeat:2525 · chooseDest:2540 · revealTopAll:2559 · revealUntil:2586 · attachGear:2618 · buzzRenda:2648 · upToTimes:2677 · magibomber:2687 · manual:2719 · extraTurn:2731 · skipRestOfTurn:2735 · useOnce:2744 · zoneGate:2747 · dSwitchFlip:2749 · winGame:2755 · breakShields:2759 · selfAction:2762 · turnStatic:2813 · playFree:2829 · flipSelf:2833 · destroyTopCard:2853 · splitFate:2868 · castSelfTwin:2899 · castOwnTwin:2904 · atTurnEnd:2922 · useAbilityOf:2935 · godLink:2968 · godUnlink:2983 · swapGraveMana:3001 · shieldForce:3010 · dynamo:3026 · shieldPlus:3036 · handPlay:3078 · grSummon:3108 · afterAttack:3119 · chooseNumber:3127 · lookAtHand:3137 · tapOrUntap:3142 · fight:3160 · fightPair:3168 · gachinko:3205 · conditional:3225 · chooseOne:3230 · lookAtTop:3253 · powerMod:3255 · grantKeyword:3273 · move:3293 · bounce:3296 · toHand:3297 · shieldToHand:3298 · graveyardToHand:3299 · toMana:3300 · toGraveyard:3301 · toShield:3302 · toDeckBottom:3303 · toDeckTop:3304 · putIntoBattle:3305 · destroy:3307 · tap:3311 · untap:3313 · putSelfIntoBattle:3320 · shuffleDeck:3327 · graveToDeckBottom:3334 · keepOneEachToDeck:3357 · graveyardToDeck:3402 · refreshHandShields:3432 · revealTopCard:3463 · playRevealed:3485 · soulRaid:3499 · removeOwnSeals:3501 · awakenLink:3503 · shieldGamble:3506 · playFromHandFree:3526

### execMove
battle:3602 · under:3610 · deckTop:3613 · deckBottom:3625 · shieldTop:3627

### emit
CARD_DRAWN:4202 · CREATURE_SUMMONED:4207 · CREATURE_DESTROYED:4282 · CARD_MOVED:4307 · CREATURE_LEFT:4321 · ATTACK_DECLARED:4332 · CREATURE_TAPPED:4342 · SHIELD_LEFT:4349 · UNDER_LEFT:4361 · CARD_TARGETED:4368 · BLOCKED:4371 · BATTLE_WON:4376 · TURN_STARTED:4389 · TURN_ENDED:4392 · BROKE_SHIELDS:4395 · SHIELD_BROKEN:4399 · SHIELD_ADDED:4404 · CARD_DISCARDED:4408 · CARD_PLAYED:4426 · SPELL_CAST:4433

