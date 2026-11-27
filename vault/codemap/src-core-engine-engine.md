---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4354行）

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
- L3231 `useFree`
- L3243 `playFree`
- L3267 `execMove`
- L3326 `popTop`
- L3345 `faceUpShields`
- L3351 `removeFromShield`
- L3369 `placeOnShield`
- L3393 `putUnder`
- L3410 `setTapped`
- L3418 `moveTo`
- L3427 `putIntoBattle`
- L3447 `lookAtTop`
- L3536 `awakenLink`
- L3567 `unlink`
- L3589 `removeOwnSeals`
- L3618 `soulRaid`
- L3650 `withTargets`
- L3785 `abilityTasks`
- L3799 `triggerFrom`
- L3835 `triggerOthers`
- L3843 `whoMatches`
- L3848 `emit`
- L4060 `random`
- L4066 `shuffle`
- L4075 `topOfDeck`
- L4080 `draw`
- L4099 `deckToGrave`
- L4105 `moveCard`
- L4228 `checkStateBased`
- L4271 `gameOver`
- L4289 `sendUnderToDeckBottom`
- L4301 `avertLossUnder`
- L4317 `avertLoss`
- L4342 `name`
- L4350 `log`

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
draw:2223 · addManaFromDeck:2238 · addShieldFromDeck:2240 · choose:2242 · nextSummonDiscount:2247 · markUsed:2251 · deckTopTo:2254 · revealUntilSameCost:2280 · discardRandom:2301 · destroyDuplicates:2324 · seal:2342 · discardUnder:2346 · optional:2385 · opponentMay:2388 · ifChosen:2392 · repeat:2397 · chooseDest:2412 · revealUntil:2431 · attachGear:2457 · buzzRenda:2487 · upToTimes:2516 · magibomber:2526 · manual:2558 · extraTurn:2570 · skipRestOfTurn:2574 · useOnce:2583 · zoneGate:2586 · dSwitchFlip:2588 · winGame:2594 · breakShields:2598 · selfAction:2601 · turnStatic:2646 · playFree:2662 · flipSelf:2666 · destroyTopCard:2686 · splitFate:2701 · castSelfTwin:2732 · castOwnTwin:2737 · atTurnEnd:2755 · useAbilityOf:2768 · godLink:2786 · godUnlink:2801 · swapGraveMana:2819 · shieldForce:2828 · dynamo:2844 · shieldPlus:2854 · handPlay:2896 · grSummon:2924 · afterAttack:2935 · chooseNumber:2943 · lookAtHand:2953 · tapOrUntap:2958 · fight:2976 · fightPair:2984 · gachinko:3021 · conditional:3040 · chooseOne:3045 · lookAtTop:3068 · powerMod:3070 · grantKeyword:3088 · move:3108 · bounce:3111 · toHand:3112 · shieldToHand:3113 · graveyardToHand:3114 · toMana:3115 · toGraveyard:3116 · toShield:3117 · toDeckBottom:3118 · toDeckTop:3119 · putIntoBattle:3120 · destroy:3122 · tap:3126 · untap:3128 · putSelfIntoBattle:3135 · shuffleDeck:3142 · graveyardToDeck:3148 · revealTopCard:3155 · playRevealed:3171 · soulRaid:3185 · removeOwnSeals:3187 · awakenLink:3189 · shieldGamble:3192 · playFromHandFree:3212

### execMove
battle:3287 · under:3294 · deckTop:3297 · deckBottom:3302 · shieldTop:3304

### emit
CARD_DRAWN:3853 · CREATURE_SUMMONED:3858 · CREATURE_DESTROYED:3916 · CARD_MOVED:3936 · CREATURE_LEFT:3945 · ATTACK_DECLARED:3956 · CREATURE_TAPPED:3966 · SHIELD_LEFT:3971 · UNDER_LEFT:3983 · CARD_TARGETED:3990 · BLOCKED:3993 · BATTLE_WON:3998 · TURN_STARTED:4011 · TURN_ENDED:4014 · BROKE_SHIELDS:4017 · SHIELD_BROKEN:4021 · SHIELD_ADDED:4026 · CARD_DISCARDED:4030 · CARD_PLAYED:4041 · SPELL_CAST:4048

