---
tags: [codemap, generated]
generated: 2026-11-27
---
# src/core/engine/engine.ts（4328行）

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
- L493 `turnSwitch`
- L530 `chargeMana`
- L543 `playCard`
- L628 `playAlt`
- L643 `payAlt`
- L685 `battleBonus`
- L699 `attack`
- L721 `respond`
- L744 `run`
- L765 `insertFront`
- L769 `flushTriggers`
- L790 `offerHandTriggers`
- L825 `gateCandidates`
- L832 `gateReady`
- L842 `fireZoneGates`
- L858 `execZoneGate`
- L901 `addTrigger`
- L906 `execPickTrigger`
- L929 `takeResponse`
- L935 `effectTasks`
- L940 `exec`
- L1612 `execShieldTrigger`
- L1647 `conditionalTrigger`
- L1653 `execAttackSwap`
- L1720 `stackFromBattle`
- L1751 `execCommandUnseal`
- L1781 `sealCard`
- L1796 `afterSealRemoved`
- L1812 `crossGear`
- L1819 `godLinkHeads`
- L1832 `linkGod`
- L1842 `checkForcedAttack`
- L1847 `execLeave`
- L2155 `payCandidates`
- L2190 `execEffect`
- L3205 `useFree`
- L3217 `playFree`
- L3241 `execMove`
- L3300 `popTop`
- L3319 `faceUpShields`
- L3325 `removeFromShield`
- L3343 `placeOnShield`
- L3367 `putUnder`
- L3384 `setTapped`
- L3392 `moveTo`
- L3401 `putIntoBattle`
- L3421 `lookAtTop`
- L3510 `awakenLink`
- L3541 `unlink`
- L3563 `removeOwnSeals`
- L3592 `soulRaid`
- L3624 `withTargets`
- L3759 `abilityTasks`
- L3773 `triggerFrom`
- L3809 `triggerOthers`
- L3817 `whoMatches`
- L3822 `emit`
- L4034 `random`
- L4040 `shuffle`
- L4049 `topOfDeck`
- L4054 `draw`
- L4073 `deckToGrave`
- L4079 `moveCard`
- L4202 `checkStateBased`
- L4245 `gameOver`
- L4263 `sendUnderToDeckBottom`
- L4275 `avertLossUnder`
- L4291 `avertLoss`
- L4316 `name`
- L4324 `log`

## switch の case（`ラベル:行`）

### handle
RESPOND:244 · CROSS:246 · HYPERIZE:258 · CONCEDE:267 · MANUAL_MOVE:270 · MANUAL_TAP:281 · MANUAL_DRAW:286 · MANUAL_SHUFFLE:291 · MANUAL_POWER:296 · MANUAL_LOG:301 · NEXT_PHASE:311 · END_TURN:314 · CHARGE_MANA:317 · PLAY_CARD:319 · ATTACK:322 · TAP_ABILITY:324

### runPhase
start:406 · draw:448 · end:458

### exec
phase:943 · turnSwitch:947 · effect:951 · confirmOptional:964 · castSpell:979 · spellToGrave:991 · enterBattle:1054 · leave:1289 · commandUnseal:1292 · attackSwap:1295 · attackSwapOrder:1298 · pickTrigger:1311 · abilityEnd:1314 · kirifudash:1317 · attackEnd:1332 · linkRelease:1349 · hyperize:1367 · blockStep:1388 · attackResolve:1407 · battle:1431 · battleWon:1474 · beforeBreak:1478 · breakShields:1486 · shieldTrigger:1590 · orderShieldTriggers:1593

### execLeave
stay:1950 · shedUnder:1952 · underToDeckBottom:1967 · unflip:1977 · shedTop:1986 · seal:1998 · escape:2007 · destroySelf:2017 · faceUpShieldToGrave:2020 · avertCost:2038 · payCards:2071 · destroyOther:2101

### execEffect
draw:2197 · addManaFromDeck:2212 · addShieldFromDeck:2214 · choose:2216 · nextSummonDiscount:2221 · markUsed:2225 · deckTopTo:2228 · revealUntilSameCost:2254 · discardRandom:2275 · destroyDuplicates:2298 · seal:2316 · discardUnder:2320 · optional:2359 · opponentMay:2362 · ifChosen:2366 · repeat:2371 · chooseDest:2386 · revealUntil:2405 · attachGear:2431 · buzzRenda:2461 · upToTimes:2490 · magibomber:2500 · manual:2532 · extraTurn:2544 · skipRestOfTurn:2548 · useOnce:2557 · zoneGate:2560 · dSwitchFlip:2562 · winGame:2568 · breakShields:2572 · selfAction:2575 · turnStatic:2620 · playFree:2636 · flipSelf:2640 · destroyTopCard:2660 · splitFate:2675 · castSelfTwin:2706 · castOwnTwin:2711 · atTurnEnd:2729 · useAbilityOf:2742 · godLink:2760 · godUnlink:2775 · swapGraveMana:2793 · shieldForce:2802 · dynamo:2818 · shieldPlus:2828 · handPlay:2870 · grSummon:2898 · afterAttack:2909 · chooseNumber:2917 · lookAtHand:2927 · tapOrUntap:2932 · fight:2950 · fightPair:2958 · gachinko:2995 · conditional:3014 · chooseOne:3019 · lookAtTop:3042 · powerMod:3044 · grantKeyword:3062 · move:3082 · bounce:3085 · toHand:3086 · shieldToHand:3087 · graveyardToHand:3088 · toMana:3089 · toGraveyard:3090 · toShield:3091 · toDeckBottom:3092 · toDeckTop:3093 · putIntoBattle:3094 · destroy:3096 · tap:3100 · untap:3102 · putSelfIntoBattle:3109 · shuffleDeck:3116 · graveyardToDeck:3122 · revealTopCard:3129 · playRevealed:3145 · soulRaid:3159 · removeOwnSeals:3161 · awakenLink:3163 · shieldGamble:3166 · playFromHandFree:3186

### execMove
battle:3261 · under:3268 · deckTop:3271 · deckBottom:3276 · shieldTop:3278

### emit
CARD_DRAWN:3827 · CREATURE_SUMMONED:3832 · CREATURE_DESTROYED:3890 · CARD_MOVED:3910 · CREATURE_LEFT:3919 · ATTACK_DECLARED:3930 · CREATURE_TAPPED:3940 · SHIELD_LEFT:3945 · UNDER_LEFT:3957 · CARD_TARGETED:3964 · BLOCKED:3967 · BATTLE_WON:3972 · TURN_STARTED:3985 · TURN_ENDED:3988 · BROKE_SHIELDS:3991 · SHIELD_BROKEN:3995 · SHIELD_ADDED:4000 · CARD_DISCARDED:4004 · CARD_PLAYED:4015 · SPELL_CAST:4022

