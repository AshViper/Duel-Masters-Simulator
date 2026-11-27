---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4522行）

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
- L1682 `execShieldTrigger`
- L1717 `conditionalTrigger`
- L1723 `execAttackSwap`
- L1790 `stackFromBattle`
- L1821 `execCommandUnseal`
- L1851 `sealCard`
- L1866 `afterSealRemoved`
- L1882 `crossGear`
- L1889 `godLinkHeads`
- L1902 `linkGod`
- L1912 `checkForcedAttack`
- L1917 `execLeave`
- L2225 `payCandidates`
- L2264 `execEffect`
- L3368 `useFree`
- L3380 `playFree`
- L3405 `execMove`
- L3465 `popTop`
- L3484 `faceUpShields`
- L3490 `removeFromShield`
- L3508 `placeOnShield`
- L3532 `putUnder`
- L3549 `setTapped`
- L3557 `moveTo`
- L3566 `putIntoBattle`
- L3586 `lookAtTop`
- L3685 `awakenLink`
- L3716 `unlink`
- L3738 `removeOwnSeals`
- L3767 `soulRaid`
- L3799 `withTargets`
- L3934 `abilityTasks`
- L3948 `triggerFrom`
- L3984 `triggerOthers`
- L3992 `whoMatches`
- L3997 `emit`
- L4228 `random`
- L4234 `shuffle`
- L4243 `topOfDeck`
- L4248 `draw`
- L4267 `deckToGrave`
- L4273 `moveCard`
- L4396 `checkStateBased`
- L4439 `gameOver`
- L4457 `sendUnderToDeckBottom`
- L4469 `avertLossUnder`
- L4485 `avertLoss`
- L4510 `name`
- L4518 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:244 · CROSS:246 · HYPERIZE:258 · CONCEDE:267 · MANUAL_MOVE:270 · MANUAL_TAP:281 · MANUAL_DRAW:286 · MANUAL_SHUFFLE:291 · MANUAL_POWER:296 · MANUAL_LOG:301 · NEXT_PHASE:311 · END_TURN:314 · CHARGE_MANA:317 · PLAY_CARD:319 · ATTACK:322 · TAP_ABILITY:324

### runPhase
start:406 · draw:456 · end:466

### exec
phase:976 · turnSwitch:980 · effect:984 · denyTriggers:1000 · confirmOptional:1020 · castSpell:1035 · spellToGrave:1050 · enterBattle:1123 · leave:1358 · commandUnseal:1361 · attackSwap:1364 · attackSwapOrder:1367 · pickTrigger:1380 · abilityEnd:1383 · kirifudash:1386 · attackEnd:1401 · linkRelease:1418 · hyperize:1436 · blockStep:1457 · attackResolve:1477 · battle:1501 · battleWon:1544 · beforeBreak:1548 · breakShields:1556 · shieldTrigger:1660 · orderShieldTriggers:1663

### execLeave
stay:2020 · shedUnder:2022 · underToDeckBottom:2037 · unflip:2047 · shedTop:2056 · seal:2068 · escape:2077 · destroySelf:2087 · faceUpShieldToGrave:2090 · avertCost:2108 · payCards:2141 · destroyOther:2171

### execEffect
draw:2271 · addManaFromDeck:2286 · addShieldFromDeck:2288 · choose:2290 · nextSummonDiscount:2295 · markUsed:2299 · deckTopTo:2302 · revealUntilSameCost:2328 · discardRandom:2349 · destroyDuplicates:2372 · seal:2390 · discardUnder:2394 · optional:2433 · opponentMay:2436 · ifChosen:2440 · repeat:2445 · chooseDest:2460 · revealTopAll:2479 · revealUntil:2506 · attachGear:2538 · buzzRenda:2568 · upToTimes:2597 · magibomber:2607 · manual:2639 · extraTurn:2651 · skipRestOfTurn:2655 · useOnce:2664 · zoneGate:2667 · dSwitchFlip:2669 · winGame:2675 · breakShields:2679 · selfAction:2682 · turnStatic:2727 · playFree:2743 · flipSelf:2747 · destroyTopCard:2767 · splitFate:2782 · castSelfTwin:2813 · castOwnTwin:2818 · atTurnEnd:2836 · useAbilityOf:2849 · godLink:2877 · godUnlink:2892 · swapGraveMana:2910 · shieldForce:2919 · dynamo:2935 · shieldPlus:2945 · handPlay:2987 · grSummon:3015 · afterAttack:3026 · chooseNumber:3034 · lookAtHand:3044 · tapOrUntap:3049 · fight:3067 · fightPair:3075 · gachinko:3112 · conditional:3131 · chooseOne:3136 · lookAtTop:3159 · powerMod:3161 · grantKeyword:3179 · move:3199 · bounce:3202 · toHand:3203 · shieldToHand:3204 · graveyardToHand:3205 · toMana:3206 · toGraveyard:3207 · toShield:3208 · toDeckBottom:3209 · toDeckTop:3210 · putIntoBattle:3211 · destroy:3213 · tap:3217 · untap:3219 · putSelfIntoBattle:3226 · shuffleDeck:3233 · graveToDeckBottom:3239 · graveyardToDeck:3262 · revealTopCard:3292 · playRevealed:3308 · soulRaid:3322 · removeOwnSeals:3324 · awakenLink:3326 · shieldGamble:3329 · playFromHandFree:3349

### execMove
battle:3425 · under:3433 · deckTop:3436 · deckBottom:3441 · shieldTop:3443

### emit
CARD_DRAWN:4002 · CREATURE_SUMMONED:4007 · CREATURE_DESTROYED:4079 · CARD_MOVED:4104 · CREATURE_LEFT:4113 · ATTACK_DECLARED:4124 · CREATURE_TAPPED:4134 · SHIELD_LEFT:4139 · UNDER_LEFT:4151 · CARD_TARGETED:4158 · BLOCKED:4161 · BATTLE_WON:4166 · TURN_STARTED:4179 · TURN_ENDED:4182 · BROKE_SHIELDS:4185 · SHIELD_BROKEN:4189 · SHIELD_ADDED:4194 · CARD_DISCARDED:4198 · CARD_PLAYED:4209 · SPELL_CAST:4216

